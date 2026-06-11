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
    let privateKey = process.env.FIREBASE_PRIVATE_KEY.trim();
    
    // 1. Remove surrounding quotes (single, double, or escaped)
    privateKey = privateKey.replace(/^['"\\"]+|['"\\"]+$/g, '');
    
    // 2. Replace literal \n with actual newlines and remove carriage returns
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
    
    // 3. Isolate the base64 body
    let base64Body = privateKey;
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      const parts = privateKey.split(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/);
      if (parts.length >= 3) {
        base64Body = parts[1].trim();
      }
    }
    
    // 4. Remove all whitespaces/newlines/tabs from the base64 body
    base64Body = base64Body.replace(/[\s\r\n\t]+/g, '');
    
    // 5. Repair prepended 'n' if the key was split/sliced near a '\n'
    if (base64Body.startsWith('nMII')) {
      base64Body = base64Body.substring(1);
    }
    
    // 6. Restore base64 padding if missing
    const padLength = (4 - (base64Body.length % 4)) % 4;
    if (padLength > 0) {
      base64Body += '='.repeat(padLength);
    }
    
    // 7. Reconstruct the PEM key with proper newlines every 64 characters
    const chunks = [];
    for (let i = 0; i < base64Body.length; i += 64) {
      chunks.push(base64Body.substring(i, i + 64));
    }
    
    privateKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;

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
