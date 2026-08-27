import pg from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema.js";

const { Pool } = pg;

let pool;
let db;

const connectDb = async () => {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required. Run `neon env pull --file Server/.env`.");
  }

  if (!pool) {
    pool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: Number(process.env.DATABASE_POOL_MAX || 10),
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
    });
    pool.on("error", (error) => console.error("Unexpected Postgres pool error", error));
    db = drizzle(pool, { schema });
  }

  await pool.query("select 1");
  return db;
};

const getDb = () => {
  if (!db) throw new Error("Database not initialized. Call connectDb first.");
  return db;
};

const getPool = () => {
  if (!pool) throw new Error("Database not initialized. Call connectDb first.");
  return pool;
};

const closeDb = async () => {
  if (pool) await pool.end();
  pool = undefined;
  db = undefined;
};

export { connectDb, getDb, getPool, closeDb };
export default connectDb;
