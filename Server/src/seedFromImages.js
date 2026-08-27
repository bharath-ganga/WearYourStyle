import { Product } from "./models/product.model.js";
import connectDb from "./db/postgres.js";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: "./.env" });

const sourceDir = path.join(__dirname, "../../images");
const targetDir = path.join(__dirname, "../../Client/public/product_images");

// Ensure target directory exists
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// Map folder names to categories and proper names
const categoryMappings = {
    "mens": { category: "Shirts", baseName: "Men's Premium Top" },
    "mens_pant": { category: "Pants", baseName: "Men's Premium Pant" },
    "womens": { category: "Shirts", baseName: "Women's Premium Top" },
    "womens_pants": { category: "Pants", baseName: "Women's Premium Pant" },
    "shoes": { category: "Shoes", baseName: "Premium Footwear" }
};

const copyFile = (sourcePath, targetPath) => {
    fs.copyFileSync(sourcePath, targetPath);
};

const seedDatabase = async () => {
    try {
        await connectDb();
        console.log("Connected to Neon Postgres...");
        
        // 1. Wipe existing products
        const existingProducts = await Product.getAll();
        await Promise.all(existingProducts.map((product) => Product.delete(product.id)));
        console.log(`\n🧹 Cleared ${existingProducts.length} old/dummy products from the database.`);

        // 2. Scan images directory and add them
        const generatedProducts = [];
        const folders = fs.readdirSync(sourceDir);

        for (const folder of folders) {
            const folderPath = path.join(sourceDir, folder);
            if (fs.statSync(folderPath).isDirectory() && categoryMappings[folder]) {
                const settings = categoryMappings[folder];
                const files = fs.readdirSync(folderPath);

                console.log(`Processing folder: ${folder}`);

                for (let i = 0; i < files.length; i++) {
                    const file = files[i];
                    if (file.match(/\.(jpg|jpeg|png|gif|webp|avif)$/i)) {
                        const sourceFile = path.join(folderPath, file);
                        const targetFolder = path.join(targetDir, folder);
                        
                        if (!fs.existsSync(targetFolder)) {
                            fs.mkdirSync(targetFolder, { recursive: true });
                        }

                        // We prefix it so there's no collision, just in case
                        const destFile = `${i}_${file}`;
                        const targetFile = path.join(targetFolder, destFile);
                        
                        copyFile(sourceFile, targetFile);

                        generatedProducts.push({
                            title: `${settings.baseName} - Style ${i + 1}`,
                            imgSource: `/product_images/${folder}/${destFile}`,
                            brand: "WearYourStyle Exclusive",
                            price: Math.floor(Math.random() * (5000 - 1500) + 1500),
                            rating: parseFloat((Math.random() * (5.0 - 4.0) + 4.0).toFixed(1)),
                            category: settings.category,
                            sizes: folder === "shoes" ? ["7", "8", "9", "10", "11"] : ["S", "M", "L", "XL"],
                            colors: ["#000000", "#FFFFFF"],
                            stock: Math.floor(Math.random() * 50) + 10,
                            description: `Authentic ${settings.category.toLowerCase()} from the latest collection.`
                        });
                    }
                }
            }
        }

        console.log(`\n🌱 Seeding ${generatedProducts.length} image-based products...`);
        let count = 0;
        for (const prod of generatedProducts) {
            await Product.create(prod);
            count++;
        }

        console.log(`\n🎉 Success! Added ${count} total items extracted from the images folder and correctly mapped. Visit http://localhost:5173 to see them.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to seed products:", error);
        process.exit(1);
    }
};

seedDatabase();
