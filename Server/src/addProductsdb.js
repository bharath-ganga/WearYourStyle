import { Product } from "./models/product.model.js";
import connectDb from "./db/postgres.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });

const imagesFilePath = path.join(__dirname, "../../scraper/images.txt");

const PRODUCT_NAMES = [
    "Gucci Heritage Cotton Polo",
    "Signature Web Stripe T-Shirt",
    "Embroidered Interlocking G Tee",
    "Luxury Oversized Graphic T-Shirt",
    "Gucci Blade Print Cotton Shirt",
    "Classic Monogram Oxford Shirt",
    "Silk Blend Floral Print Shirt",
    "Gucci Logo Print Jersey Tee"
];

const addProducts = async () => {
  try {
    if (!fs.existsSync(imagesFilePath)) {
      console.error(`❌ images.txt not found at ${imagesFilePath}`);
      process.exit(1);
    }

    const imageUrls = fs.readFileSync(imagesFilePath, "utf8")
        .split('\n')
        .map(url => url.trim())
        .filter(url => url.length > 0 && url.startsWith('http'));

    console.log(`Found ${imageUrls.length} images to process...`);

    await connectDb();
    console.log("Connected to Neon Postgres...");

    // Remove existing Gucci products to avoid duplicates if needed, or just add
    // Since this is a specialized script, we just add them.

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      
      // Determine category based on index or heuristic
      // Gucci items are mostly high-end shirts/t-shirts in this list
      const category = i % 2 === 0 ? "Shirts" : "Tshirts";
      
      const productData = {
        imgSource: url,
        title: PRODUCT_NAMES[i % PRODUCT_NAMES.length] + (i >= PRODUCT_NAMES.length ? ` - Vol ${Math.floor(i/PRODUCT_NAMES.length) + 1}` : ""),
        brand: "Gucci",
        price: Math.floor(Math.random() * (85000 - 45000) + 45000), // Proper Premium Pricing
        rating: parseFloat((Math.random() * (5.0 - 4.2) + 4.2).toFixed(1)),
        sizes: ["S", "M", "L", "XL"],
        colors: ["#000000", "#FFFFFF", "#1E392A"], // Black, White, Gucci Green
        stock: Math.floor(Math.random() * 20) + 5,
        category: category,
        description: "Official Gucci luxury apparel. Italian-crafted with premium materials."
      };

      await Product.create(productData);
      console.log(`✅ Added: ${productData.title} (${category})`);
    }

    console.log(`\n🎉 Success! Added ${imageUrls.length} proper products to the database.`);
    process.exit(0);
  } catch (error) {
    console.error("❌ Failed to add products:", error.message);
    process.exit(1);
  }
};

addProducts();
