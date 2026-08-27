import { randomUUID } from "crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { eq, sql } from "drizzle-orm";
import { getDb } from "../db/postgres.js";
import { users } from "../db/schema.js";

const asIso = (value) => value instanceof Date ? value.toISOString() : value;
const toUser = (row) => row ? { ...row, createdAt: asIso(row.createdAt), updatedAt: asIso(row.updatedAt) } : null;

const findById = async (id) => {
  const [user] = await getDb().select().from(users).where(eq(users.id, id)).limit(1);
  return toUser(user);
};

const findByEmail = async (email) => {
  const normalized = String(email || "").trim().toLowerCase();
  const [user] = await getDb().select().from(users).where(sql`lower(${users.email}) = ${normalized}`).limit(1);
  return toUser(user);
};

const createUser = async ({ firstName, lastName, email, password, phoneNumber, address, role = "customer" }) => {
  const now = new Date();
  const [user] = await getDb().insert(users).values({
    id: randomUUID(), firstName, lastName, email: String(email).trim().toLowerCase(),
    password: await bcrypt.hash(password, 10), phoneNumber: phoneNumber || "", address: address || "",
    addresses: [], wishlist: [], stylePreferences: {}, measurements: {}, role,
    refreshToken: null, createdAt: now, updatedAt: now,
  }).returning();
  return toUser(user);
};

const updateUser = async (id, fields) => {
  const allowed = ["firstName", "lastName", "email", "password", "phoneNumber", "address", "addresses", "wishlist", "stylePreferences", "measurements", "role", "refreshToken"];
  const updateData = Object.fromEntries(Object.entries(fields).filter(([key]) => allowed.includes(key)));
  if (Object.hasOwn(updateData, "email")) updateData.email = String(updateData.email).trim().toLowerCase();
  updateData.updatedAt = new Date();
  const [user] = await getDb().update(users).set(updateData).where(eq(users.id, id)).returning();
  return toUser(user);
};

const getAllUsers = async () => (await getDb().select().from(users)).map(toUser);
const isPasswordCorrect = async (plainPassword, hashedPassword) => bcrypt.compare(plainPassword, hashedPassword);
const generateAccessToken = (user) => jwt.sign(
  { id: user.id, email: user.email, firstName: user.firstName, role: user.role },
  process.env.ACCESS_TOKEN_SECRET,
  { expiresIn: process.env.ACCESS_TOKEN_EXPIRY },
);
const generateRefreshToken = (user) => jwt.sign(
  { id: user.id }, process.env.REFRESH_TOKEN_SECRET, { expiresIn: process.env.REFRESH_TOKEN_EXPIRY },
);
const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
};

export const User = {
  findById, findByEmail, create: createUser, update: updateUser, getAll: getAllUsers,
  isPasswordCorrect, generateAccessToken, generateRefreshToken, sanitizeUser,
};
