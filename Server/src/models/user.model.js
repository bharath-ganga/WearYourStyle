import { getDb } from "../db/firebase.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Firestore collection reference
const usersCollection = () => getDb().collection("users");

// Helper: Find user by ID
const findById = async (id) => {
  const doc = await usersCollection().doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
};

// Helper: Find user by email
const findByEmail = async (email) => {
  const snapshot = await usersCollection().where("email", "==", email).limit(1).get();
  if (snapshot.empty) return null;
  const doc = snapshot.docs[0];
  return { id: doc.id, ...doc.data() };
};

// Helper: Create new user
const createUser = async ({ firstName, lastName, email, password, phoneNumber, address, role = "customer" }) => {
  const hashedPassword = await bcrypt.hash(password, 10);
  const now = new Date().toISOString();

  const newUser = {
    firstName,
    lastName,
    email,
    password: hashedPassword,
    phoneNumber: phoneNumber || "",
    address: address || "",
    addresses: [],
    wishlist: [],
    stylePreferences: {},
    measurements: {},
    role,
    refreshToken: null,
    createdAt: now,
    updatedAt: now,
  };

  const docRef = await usersCollection().add(newUser);
  return { id: docRef.id, ...newUser };
};

// Helper: Update user fields by ID
const updateUser = async (id, fields) => {
  const updateData = { ...fields, updatedAt: new Date().toISOString() };
  await usersCollection().doc(id).update(updateData);
  return findById(id);
};

// Helper: Get all users
const getAllUsers = async () => {
  const snapshot = await usersCollection().get();
  return snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
};

// Helper: Check password
const isPasswordCorrect = async (plainPassword, hashedPassword) => {
  return await bcrypt.compare(plainPassword, hashedPassword);
};

// Helper: Generate Access Token
const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user.id, email: user.email, firstName: user.firstName },
    process.env.ACCESS_TOKEN_SECRET,
    { expiresIn: process.env.ACCESS_TOKEN_EXPIRY }
  );
};

// Helper: Generate Refresh Token
const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id },
    process.env.REFRESH_TOKEN_SECRET,
    { expiresIn: process.env.REFRESH_TOKEN_EXPIRY }
  );
};

// Helper: Return user without sensitive fields
const sanitizeUser = (user) => {
  const { password, refreshToken, ...safeUser } = user;
  return safeUser;
};

export const User = {
  findById,
  findByEmail,
  create: createUser,
  update: updateUser,
  getAll: getAllUsers,
  isPasswordCorrect,
  generateAccessToken,
  generateRefreshToken,
  sanitizeUser,
};
