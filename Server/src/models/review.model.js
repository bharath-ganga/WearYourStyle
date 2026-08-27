import { getDb } from "../db/firebase.js";

const collection = () => getDb().collection("reviews");

const forProduct = async (productId) => {
  const snapshot = await collection().where("productId", "==", productId).get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })).sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)));
};

const upsert = async ({ productId, userId, userName, rating, comment }) => {
  const existing = await collection().where("productId", "==", productId).where("userId", "==", userId).limit(1).get();
  const data = { productId, userId, userName, rating, comment, createdAt: new Date().toISOString() };
  if (!existing.empty) { await existing.docs[0].ref.set(data, { merge:true }); return { id:existing.docs[0].id, ...data }; }
  const doc = await collection().add(data);
  return { id:doc.id, ...data };
};

export const Review = { forProduct, upsert };
