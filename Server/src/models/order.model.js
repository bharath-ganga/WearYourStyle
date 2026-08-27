import { randomUUID } from "crypto";
import { desc, eq } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { orders } from "../db/schema.js";

const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toOrder = (row) => row ? {
  ...(row.data || {}), id: row.id, userId: row.userId, status: row.status,
  totalAmount: Number(row.totalAmount), createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt),
} : null;
const splitData = (data) => {
  const { id, userId, status, totalAmount, createdAt, updatedAt, ...rest } = data;
  return { userId, status, totalAmount: totalAmount === undefined ? undefined : String(Number(totalAmount || 0)), data: rest };
};

class Order {
  static async create(orderData) {
    const now = new Date();
    const values = splitData(orderData);
    const [order] = await getDb().insert(orders).values({
      id: orderData.id || randomUUID(), userId: values.userId, status: values.status || "pending",
      totalAmount: values.totalAmount || "0", data: values.data, createdAt: now, updatedAt: now,
    }).returning();
    return toOrder(order);
  }

  static async findByUserId(userId) {
    return (await getDb().select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt))).map(toOrder);
  }

  static async findById(id) {
    const [order] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    return toOrder(order);
  }

  static async getAll() {
    return (await getDb().select().from(orders).orderBy(desc(orders.createdAt))).map(toOrder);
  }

  static async update(id, fields) {
    const [current] = await getDb().select().from(orders).where(eq(orders.id, id)).limit(1);
    if (!current) return null;
    const values = splitData(fields);
    const updateData = { data: { ...(current.data || {}), ...values.data }, updatedAt: new Date() };
    if (values.userId !== undefined) updateData.userId = values.userId;
    if (values.status !== undefined) updateData.status = values.status;
    if (values.totalAmount !== undefined) updateData.totalAmount = values.totalAmount;
    const [order] = await getDb().update(orders).set(updateData).where(eq(orders.id, id)).returning();
    return toOrder(order);
  }

  static async delete(id) {
    await getDb().delete(orders).where(eq(orders.id, id));
    return { id };
  }
}

export { Order };
