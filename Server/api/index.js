import app from "../src/app.js";
import connectDb from "../src/db/firebase.js";
import seedAdmin from "../src/seedAdmin.js";

let cachedDb = null;

export default async (req, res) => {
  const path = req.url || "";
  const vercelPath = req.headers["x-vercel-forwarded-path"] || req.headers["x-matched-path"] || "";
  
  if (path.includes("db-debug") || vercelPath.includes("db-debug")) {
    return app(req, res);
  }

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
    
    const origin = req.headers.origin;
    if (origin && (origin.startsWith("http://localhost") || origin.endsWith(".vercel.app"))) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
    } else {
      res.setHeader("Access-Control-Allow-Origin", "*");
    }
    res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,PATCH,OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With");

    res.status(500).json({
      success: false,
      message: "Vercel Serverless Function Initialization Error",
      error: error.message
    });
  }
};
