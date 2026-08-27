import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { products } from "../db/schema.js";

const knownFields = ["title", "imgSource", "brand", "price", "rating", "category", "gender", "sizes", "colors", "stock", "description"];
const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toProduct = (row) => row ? {
  ...(row.metadata || {}), id: row.id, title: row.title, imgSource: row.imgSource, brand: row.brand,
  price: Number(row.price), rating: Number(row.rating), category: row.category, gender: row.gender,
  sizes: row.sizes || [], colors: row.colors || [], stock: row.stock, description: row.description,
  createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt),
} : null;

const splitFields = (data, partial = false) => {
  const record = {};
  for (const key of knownFields) if (Object.hasOwn(data, key)) record[key] = data[key];
  if (Object.hasOwn(record, "price")) record.price = String(Number(record.price || 0));
  if (Object.hasOwn(record, "rating")) record.rating = String(Number(record.rating || 0));
  if (Object.hasOwn(record, "stock")) record.stock = Number.parseInt(record.stock, 10) || 0;
  const metadata = Object.fromEntries(Object.entries(data).filter(([key]) => !knownFields.includes(key) && !["id", "createdAt", "updatedAt"].includes(key)));
  if (!partial || Object.keys(metadata).length) record.metadata = metadata;
  return record;
};

const findById = async (id) => {
  const [product] = await getDb().select().from(products).where(eq(products.id, String(id))).limit(1);
  return toProduct(product);
};
const getAllProducts = async () => (await getDb().select().from(products)).map(toProduct);
const createProduct = async (productData) => {
  const now = new Date();
  const [product] = await getDb().insert(products).values({
    id: productData.id ? String(productData.id) : randomUUID(), ...splitFields(productData),
    title: productData.title || "Untitled product", createdAt: now, updatedAt: now,
  }).returning();
  return toProduct(product);
};
const updateProduct = async (id, fields) => {
  const [row] = await getDb().select().from(products).where(eq(products.id, String(id))).limit(1);
  if (!row) return null;
  const updateData = splitFields(fields, true);
  if (updateData.metadata) updateData.metadata = { ...(row.metadata || {}), ...updateData.metadata };
  updateData.updatedAt = new Date();
  const [product] = await getDb().update(products).set(updateData).where(eq(products.id, String(id))).returning();
  return toProduct(product);
};
const deleteProduct = async (id) => {
  await getDb().delete(products).where(eq(products.id, String(id)));
  return { id };
};

export const Product = { findById, getAll: getAllProducts, create: createProduct, update: updateProduct, delete: deleteProduct };
