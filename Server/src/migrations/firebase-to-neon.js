import "dotenv/config";
import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import connectFirebase from "../db/firebase.js";
import { coupons, migrationRuns, migrationUserAliases, orders, payments, products, reviews, users } from "../db/schema.js";

const { Pool } = pg;
const dryRun = process.argv.includes("--dry-run");
const directUrl = process.env.DATABASE_URL_UNPOOLED;

const normalize = (value) => {
  if (value == null) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (Array.isArray(value)) return value.map(normalize);
  if (typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, normalize(item)]));
  }
  return value;
};

const asDate = (value, fallback = new Date()) => {
  const normalized = normalize(value);
  const date = normalized instanceof Date ? normalized : new Date(normalized || fallback);
  return Number.isNaN(date.getTime()) ? fallback : date;
};

const readCollection = async (firestore, name) => {
  const snapshot = await firestore.collection(name).get();
  return snapshot.docs.map((document) => ({ id: document.id, ...normalize(document.data()) }));
};

const uniqueValues = (values) => [...new Map(values.map((value) => [JSON.stringify(value), value])).values()];

const consolidateUsers = (documents) => {
  const groups = new Map();
  for (const document of documents) {
    const email = String(document.email || "").trim().toLowerCase();
    const key = email || `missing-email:${document.id}`;
    groups.set(key, [...(groups.get(key) || []), { ...document, email }]);
  }

  const aliases = new Map();
  const consolidated = [];
  let duplicateUsers = 0;

  for (const group of groups.values()) {
    group.sort((left, right) => {
      const roleDifference = Number(right.role === "admin") - Number(left.role === "admin");
      if (roleDifference) return roleDifference;
      return asDate(right.updatedAt || right.createdAt, new Date(0)) - asDate(left.updatedAt || left.createdAt, new Date(0));
    });

    const canonical = { ...group[0] };
    const oldestFirst = [...group].reverse();
    canonical.addresses = uniqueValues(group.flatMap((user) => Array.isArray(user.addresses) ? user.addresses : []));
    canonical.wishlist = [...new Set(group.flatMap((user) => Array.isArray(user.wishlist) ? user.wishlist.map(String) : []))];
    canonical.stylePreferences = Object.assign({}, ...oldestFirst.map((user) => user.stylePreferences || {}));
    canonical.measurements = Object.assign({}, ...oldestFirst.map((user) => user.measurements || {}));
    canonical.phoneNumber ||= group.find((user) => user.phoneNumber)?.phoneNumber || "";
    canonical.address ||= group.find((user) => user.address)?.address || "";
    canonical.createdAt = new Date(Math.min(...group.map((user) => asDate(user.createdAt, new Date()).getTime())));
    canonical.updatedAt = new Date(Math.max(...group.map((user) => asDate(user.updatedAt || user.createdAt, new Date(0)).getTime())));

    for (const user of group) aliases.set(user.id, canonical.id);
    duplicateUsers += group.length - 1;
    consolidated.push(canonical);
  }

  return { consolidated, aliases, duplicateUsers };
};

const productFields = ["title", "imgSource", "brand", "price", "rating", "category", "gender", "sizes", "colors", "stock", "description"];
const splitProduct = (document) => ({
  id: document.id,
  title: document.title || "Untitled product",
  imgSource: document.imgSource || null,
  brand: document.brand || null,
  price: String(Number(document.price || 0)),
  rating: String(Number(document.rating || 0)),
  category: document.category || null,
  gender: document.gender || null,
  sizes: Array.isArray(document.sizes) ? document.sizes.map(String) : [],
  colors: Array.isArray(document.colors) ? document.colors.map(String) : [],
  stock: Number.parseInt(document.stock, 10) || 0,
  description: document.description || null,
  metadata: Object.fromEntries(Object.entries(document).filter(([key]) => !productFields.includes(key) && !["id", "createdAt", "updatedAt"].includes(key))),
  createdAt: asDate(document.createdAt),
  updatedAt: asDate(document.updatedAt, asDate(document.createdAt)),
});

const splitDocument = (document, promoted) => Object.fromEntries(
  Object.entries(document).filter(([key]) => !["id", "createdAt", "updatedAt", ...promoted].includes(key)),
);

const upsertById = async (tx, table, value) => {
  const { id, ...set } = value;
  await tx.insert(table).values(value).onConflictDoUpdate({ target: table.id, set });
};

const main = async () => {
  if (!dryRun && !directUrl) {
    throw new Error("DATABASE_URL_UNPOOLED is required for migration writes");
  }

  const startedAt = new Date();
  const firestore = await connectFirebase();
  const collectionNames = ["users", "products", "orders", "payments", "reviews", "coupons"];
  const source = Object.fromEntries(await Promise.all(
    collectionNames.map(async (name) => [name, await readCollection(firestore, name)]),
  ));
  const sourceCounts = Object.fromEntries(collectionNames.map((name) => [name, source[name].length]));
  const { consolidated, aliases, duplicateUsers } = consolidateUsers(source.users);
  source.users = consolidated;
  const sourceOrderIds = new Set(source.orders.map((order) => String(order.id)));
  const missingOrderUserIds = [...new Set(source.orders.map((order) => String(order.userId || "guest")))]
    .filter((userId) => !aliases.has(userId));
  const missingPaymentOrderIds = [...new Set(source.payments.map((payment) => String(payment.orderId || "unknown")))]
    .filter((orderId) => !sourceOrderIds.has(orderId));
  const needsUnassignedUser = missingPaymentOrderIds.length > 0;
  const counts = {
    ...sourceCounts,
    usersWritten: consolidated.length,
    duplicateUsersConsolidated: duplicateUsers,
    placeholderUsers: missingOrderUserIds.length + Number(needsUnassignedUser),
    placeholderOrders: missingPaymentOrderIds.length,
  };

  console.log("Firestore export summary:", counts);
  if (dryRun) {
    console.log("Dry run complete. No Neon data was changed.");
    return;
  }

  const pool = new Pool({ connectionString: directUrl, max: 1 });
  const db = drizzle(pool);

  try {
    await db.transaction(async (tx) => {
      const existingUsers = await tx.select().from(users);
      const existingUsersByEmail = new Map(existingUsers.map((user) => [user.email.trim().toLowerCase(), user]));

      for (const document of source.users) {
        const existing = existingUsersByEmail.get(document.email);
        const targetId = existing?.id || document.id;
        if (targetId !== document.id) {
          for (const [sourceUserId, mappedTargetId] of aliases) {
            if (mappedTargetId === document.id) aliases.set(sourceUserId, targetId);
          }
        }
        const value = {
          id: targetId,
          firstName: existing?.firstName || document.firstName || "Customer",
          lastName: existing?.lastName || document.lastName || "",
          email: String(document.email || `${document.id}@migrated.invalid`).trim().toLowerCase(),
          password: existing?.password || document.password || "",
          phoneNumber: document.phoneNumber || existing?.phoneNumber || "",
          address: document.address || existing?.address || "",
          addresses: uniqueValues([...(existing?.addresses || []), ...(Array.isArray(document.addresses) ? document.addresses : [])]),
          wishlist: [...new Set([...(existing?.wishlist || []), ...(Array.isArray(document.wishlist) ? document.wishlist.map(String) : [])])],
          stylePreferences: { ...(existing?.stylePreferences || {}), ...(document.stylePreferences || {}) },
          measurements: { ...(existing?.measurements || {}), ...(document.measurements || {}) },
          role: existing?.role === "admin" || document.role === "admin" ? "admin" : "customer",
          refreshToken: existing?.refreshToken || document.refreshToken || null,
          createdAt: existing?.createdAt && existing.createdAt < asDate(document.createdAt) ? existing.createdAt : asDate(document.createdAt),
          updatedAt: existing?.updatedAt && existing.updatedAt > asDate(document.updatedAt, asDate(document.createdAt)) ? existing.updatedAt : asDate(document.updatedAt, asDate(document.createdAt)),
        };
        await upsertById(tx, users, value);
        existingUsersByEmail.set(value.email, value);
      }

      const placeholderPassword = await bcrypt.hash(randomUUID(), 10);
      const placeholderUserIds = [...missingOrderUserIds, ...(needsUnassignedUser ? ["legacy-unassigned"] : [])];
      for (const userId of placeholderUserIds) {
        const now = new Date();
        const value = {
          id: userId,
          firstName: "Legacy",
          lastName: "Customer",
          email: `legacy-${Buffer.from(userId).toString("hex")}@migrated.invalid`,
          password: placeholderPassword,
          phoneNumber: "",
          address: "",
          addresses: [],
          wishlist: [],
          stylePreferences: {},
          measurements: {},
          role: "customer",
          refreshToken: null,
          createdAt: now,
          updatedAt: now,
        };
        await upsertById(tx, users, value);
        aliases.set(userId, userId);
      }

      for (const document of source.products) await upsertById(tx, products, splitProduct(document));

      for (const document of source.orders) {
        await upsertById(tx, orders, {
          id: document.id,
          userId: aliases.get(String(document.userId)) || String(document.userId || "guest"),
          status: document.status || "pending",
          totalAmount: String(Number(document.totalAmount || 0)),
          data: splitDocument(document, ["userId", "status", "totalAmount"]),
          createdAt: asDate(document.createdAt),
          updatedAt: asDate(document.updatedAt, asDate(document.createdAt)),
        });
      }


      for (const orderId of missingPaymentOrderIds) {
        const now = new Date();
        await upsertById(tx, orders, {
          id: orderId,
          userId: "legacy-unassigned",
          status: "Legacy payment record",
          totalAmount: "0",
          data: { migrationNote: "Placeholder created for a Firestore payment whose order document was missing." },
          createdAt: now,
          updatedAt: now,
        });
      }

      for (const document of source.payments) {
        await upsertById(tx, payments, {
          id: document.id,
          orderId: String(document.orderId || "unknown"),
          amount: String(Number(document.amount || 0)),
          data: splitDocument(document, ["orderId", "amount"]),
          createdAt: asDate(document.createdAt),
          updatedAt: asDate(document.updatedAt, asDate(document.createdAt)),
        });
      }

      for (const document of source.reviews) {
        const value = {
          id: document.id,
          productId: String(document.productId),
          userId: aliases.get(String(document.userId)) || String(document.userId),
          userName: document.userName || "Customer",
          rating: Math.min(5, Math.max(1, Number.parseInt(document.rating, 10) || 1)),
          comment: document.comment || "Migrated review",
          createdAt: asDate(document.createdAt),
          updatedAt: asDate(document.updatedAt, asDate(document.createdAt)),
        };
        const { id, ...set } = value;
        await tx.insert(reviews).values(value).onConflictDoUpdate({
          target: [reviews.productId, reviews.userId], set,
        });
      }

      for (const document of source.coupons) {
        await upsertById(tx, coupons, {
          id: document.id,
          code: String(document.code || document.id).trim().toUpperCase(),
          discountPercent: String(Number(document.discountPercent || 0)),
          active: document.active !== false,
          createdAt: asDate(document.createdAt),
          updatedAt: asDate(document.updatedAt, asDate(document.createdAt)),
        });
      }

      for (const [sourceUserId, targetUserId] of aliases) {
        await tx.insert(migrationUserAliases).values({ sourceUserId, targetUserId }).onConflictDoUpdate({
          target: migrationUserAliases.sourceUserId,
          set: { targetUserId, migratedAt: new Date() },
        });
      }

      const completedAt = new Date();
      await tx.insert(migrationRuns).values({
        id: randomUUID(), source: "firebase-firestore", counts, startedAt, completedAt,
      });
    });
    console.log("Firestore to Neon migration completed successfully:", counts);
  } finally {
    await pool.end();
  }
};

main().catch((error) => {
  const cause = error.cause || error;
  console.error("Firestore to Neon migration failed:", {
    message: cause.message,
    code: cause.code,
    constraint: cause.constraint,
    detail: cause.detail,
  });
  process.exitCode = 1;
});
