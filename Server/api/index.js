import app from "../src/app.js";
import connectDb from "../src/db/postgres.js";
import { isAllowedOrigin } from "../src/utils/allowedOrigin.js";

let connectionPromise;

export default async (req, res) => {
  // Preflight requests do not need a database connection.
  if (req.method === "OPTIONS") {
    return app(req, res);
  }

  try {
    if (!connectionPromise) connectionPromise = connectDb();
    await connectionPromise;
    return app(req, res);
  } catch (error) {
    connectionPromise = undefined; // Retry after a transient connection failure.
    console.error("[Vercel] Postgres initialization error:", error);
    const origin = req.headers.origin;
    if (origin && isAllowedOrigin(origin)) {
      res.setHeader("Access-Control-Allow-Origin", origin);
      res.setHeader("Access-Control-Allow-Credentials", "true");
      res.setHeader("Vary", "Origin");
    }
    res.status(500).json({
      success: false,
      message: "API database connection unavailable"
    });
  }
};
