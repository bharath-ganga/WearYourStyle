import { Product } from "./models/product.model.js";
import connectDb from "./db/postgres.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });

const scrapedDataPath = path.join(__dirname, "../../scraper/scraped_products.json");

const migrateScrapedData = async () => {
  try {
    if (!fs.existsSync(scrapedDataPath)) {
      console.error(`❌ Scraped data not found at ${scrapedDataPath}. Run the scraper first!`);
      process.exit(1);
    }

    const products = JSON.parse(fs.readFileSync(scrapedDataPath, "utf8"));
    console.log(`Found ${products.length} products to migrate...`);

    await connectDb();
    console.log("Connected to Neon Postgres...");

    let count = 0;
    for (const prod of products) {
      await Product.create(prod);
      count++;
      if (count % 10 === 0) console.log(`Migrated ${count} products...`);
    }

    console.log(`✅ Success! Migrated ${count} products to Neon Postgres.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
};

migrateScrapedData();
