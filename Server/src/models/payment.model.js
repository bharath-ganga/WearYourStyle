import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { payments } from "../db/schema.js";

const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toPayment = (row) => row ? {
  ...(row.data || {}), id: row.id, orderId: row.orderId, amount: Number(row.amount),
  createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt),
} : null;

class Payment {
  static async create(paymentData) {
    const { id, orderId, amount, createdAt, updatedAt, ...data } = paymentData;
    const now = new Date();
    const [payment] = await getDb().insert(payments).values({
      id: id || randomUUID(), orderId, amount: String(Number(amount || 0)), data, createdAt: now, updatedAt: now,
    }).returning();
    return toPayment(payment);
  }

  static async findByOrderId(orderId) {
    const [payment] = await getDb().select().from(payments).where(eq(payments.orderId, orderId)).limit(1);
    return toPayment(payment);
  }

  static async getAll() {
    return (await getDb().select().from(payments)).map(toPayment);
  }
}

export { Payment };
