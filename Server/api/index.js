import app from "../src/app.js";
import connectDb from "../src/db/firebase.js";
import seedAdmin from "../src/seedAdmin.js";

let cachedDb = null;

export default async (req, res) => {
  try {
    if (!cachedDb) {
      console.log("[Vercel] Connecting to Firestore...");
      cachedDb = await connectDb();
      console.log("[Vercel] Seeding admin account...");
      await seedAdmin();
    }
    return app(req, res);
  } catch (error) {
    console.error("[Vercel] Initialization error:", error);
    res.status(500).json({
      success: false,
      message: "Vercel Serverless Function Initialization Error",
      error: error.message
    });
  }
};
