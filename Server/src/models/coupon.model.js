import { randomUUID } from "crypto";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { coupons } from "../db/schema.js";

const defaults = [
  { id: "welcome10", code: "WELCOME10", discountPercent: 10, active: true },
  { id: "style20", code: "STYLE20", discountPercent: 20, active: true },
];
const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toCoupon = (row) => row ? {
  ...row, discountPercent: Number(row.discountPercent), createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt),
} : null;

const getAll = async () => {
  const items = (await getDb().select().from(coupons)).map(toCoupon);
  return items.length ? items : defaults;
};
const findByCode = async (code) => {
  const normalized = String(code || "").trim().toUpperCase();
  const [coupon] = await getDb().select().from(coupons)
    .where(sql`upper(${coupons.code}) = ${normalized} and ${coupons.active} = true`).limit(1);
  if (coupon) return toCoupon(coupon);
  return defaults.find((item) => item.code === normalized && item.active !== false) || null;
};
const create = async (data) => {
  const now = new Date();
  const [coupon] = await getDb().insert(coupons).values({
    id: data.id || randomUUID(), code: String(data.code).trim().toUpperCase(),
    discountPercent: String(Number(data.discountPercent)), active: data.active !== false,
    createdAt: now, updatedAt: now,
  }).returning();
  return toCoupon(coupon);
};
const remove = async (id) => {
  await getDb().delete(coupons).where(eq(coupons.id, id));
  return id;
};

export const Coupon = { getAll, findByCode, create, remove };
