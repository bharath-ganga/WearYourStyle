import { initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { createRequire } from "module";
import path from "path";
import { fileURLToPath } from "url";

// Helper to use 'require' in ES modules for JSON files
const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Firebase initialization logic
let serviceAccount;

try {
  // Try loading from local file (Dev environment)
  const serviceAccountPath = path.resolve(__dirname, "../../serviceAccountKey.json");
  serviceAccount = require(serviceAccountPath);
} catch (error) {
  // If file missing, construct from environment variables (Production environment)
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    
    // 1. Remove surrounding double or single quotes if they exist
    if ((privateKey.startsWith('"') && privateKey.endsWith('"')) || (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
      privateKey = privateKey.substring(1, privateKey.length - 1);
    }
    
    // 2. Replace literal \n with actual newlines
    privateKey = privateKey.replace(/\\n/g, '\n');
    
    // 3. Ensure the key has the official PEM headers/footers
    if (!privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      privateKey = `-----BEGIN PRIVATE KEY-----\n${privateKey}\n-----END PRIVATE KEY-----`;
    }

    serviceAccount = {
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: privateKey,
    };
  } else {
    console.warn("⚠️ Firebase credentials not found in file or environment variables.");
  }
}

let app;
let db;

const connectDb = async () => {
  try {
    if (!app) {
      const authHeader = serviceAccount ? cert(serviceAccount) : null;
      if (!authHeader) {
          throw new Error("Missing Firebase service account credentials.");
      }
      app = initializeApp({
        credential: authHeader
      });
      db = getFirestore(app);
      console.log("✅ Firebase Firestore connected successfully — WearYourStyle");
    }
    return db;
  } catch (error) {
    console.error("❌ Firebase Firestore connection failed:", error.message);
    throw error;
  }
};

const getDb = () => {
    if (!db) {
        throw new Error("Database not initialized. Call connectDb first.");
    }
    return db;
};

export { getDb, connectDb };
export default connectDb;
