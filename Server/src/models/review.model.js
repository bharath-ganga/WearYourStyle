import { randomUUID } from "crypto";
import { and, desc, eq } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { reviews } from "../db/schema.js";

const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toReview = (row) => row ? { ...row, createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt) } : null;

const forProduct = async (productId) => (
  await getDb().select().from(reviews).where(eq(reviews.productId, productId)).orderBy(desc(reviews.createdAt))
).map(toReview);

const upsert = async ({ productId, userId, userName, rating, comment }) => {
  const now = new Date();
  const [review] = await getDb().insert(reviews).values({
    id: randomUUID(), productId, userId, userName, rating, comment, createdAt: now, updatedAt: now,
  }).onConflictDoUpdate({
    target: [reviews.productId, reviews.userId],
    set: { userName, rating, comment, updatedAt: now },
  }).returning();
  return toReview(review);
};

export const Review = { forProduct, upsert };
