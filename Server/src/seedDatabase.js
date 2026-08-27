import { Product } from "./models/product.model.js";
import connectDb from "./db/postgres.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const properProducts = [
  // Gucci Shirts
  {
    title: "Signature Web Stripe T-Shirt",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1767033076/864626_XJHUF_4162_005_100_0000_Light.jpg",
    brand: "Gucci", price: 74736, rating: 4.8, category: "Tshirts",
    sizes: ["S", "M", "L", "XL"], colors: ["#000000", "#FFFFFF", "#1E392A"], stock: 16
  },
  {
    title: "Silk Blend Floral Print Shirt",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1767117635/864931_XNBCJ_1000_005_100_0000_Light.jpg",
    brand: "Gucci", price: 55622, rating: 5.0, category: "Shirts",
    sizes: ["S", "M", "L", "XL"], colors: ["#000000", "#FFFFFF", "#1E392A"], stock: 5
  },
  {
    title: "Gucci Heritage Cotton Polo",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1767648605/864781_XDDF0_4011_004_100_0000_Light.jpg",
    brand: "Gucci", price: 77073, rating: 4.7, category: "Shirts",
    sizes: ["S", "M", "L", "XL"], colors: ["#000000", "#FFFFFF", "#1E392A"], stock: 19
  },
  {
    title: "Classic Monogram Oxford Shirt",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1767642309/860844_XDDFW_4011_004_100_0000_Light.jpg",
    brand: "Gucci", price: 47810, rating: 4.8, category: "Shirts",
    sizes: ["S", "M", "L", "XL"], colors: ["#000000", "#FFFFFF", "#1E392A"], stock: 13
  },
  
  // High End Shoes
  {
    title: "Gucci Ace Embroidered Sneaker",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1467975612/429446_A38G0_9064_001_100_0000_Light.jpg",
    brand: "Gucci", price: 68500, rating: 4.9, category: "Shoes",
    sizes: ["7", "8", "9", "10", "11"], colors: ["#FFFFFF"], stock: 25
  },
  {
    title: "Balenciaga Triple S Trainers",
    imgSource: "https://balenciaga.dam.kering.com/m/4d370154e156477d/eCom-533882W09E19000_F.jpg",
    brand: "Balenciaga", price: 92000, rating: 4.8, category: "Shoes",
    sizes: ["7", "8", "9", "10", "11"], colors: ["#FFFFFF", "#000000"], stock: 10
  },
  {
    title: "Jordan 1 Retro High Dior",
    imgSource: "https://images.stockx.com/images/Air-Jordan-1-Retro-High-Dior-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1607043976",
    brand: "Nike x Dior", price: 550000, rating: 5.0, category: "Shoes",
    sizes: ["8", "9", "10"], colors: ["#D3D3D3", "#FFFFFF"], stock: 3
  },
  {
    title: "Yeezy Boost 350 V2 Zebra",
    imgSource: "https://images.stockx.com/images/Adidas-Yeezy-Boost-350-V2-Zebra-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1606319894",
    brand: "Adidas", price: 45000, rating: 4.7, category: "Shoes",
    sizes: ["7", "8", "9", "10", "11"], colors: ["#FFFFFF", "#000000"], stock: 15
  },
  {
    title: "Off-White x Nike Air Force 1",
    imgSource: "https://images.stockx.com/images/Nike-Air-Force-1-Low-Off-White-Volt-Product.jpg?fit=fill&bg=FFFFFF&w=700&h=500&fm=webp&auto=compress&q=90&dpr=2&trim=color&updated_at=1607044817",
    brand: "Nike", price: 125000, rating: 4.9, category: "Shoes",
    sizes: ["8", "9", "10"], colors: ["#CCFF00"], stock: 5
  },
  {
    title: "Gucci Screener Leather Sneaker",
    imgSource: "https://media.gucci.com/style/White_Center_0_0_980x980/1539257406/546551_9Y920_9666_001_100_0000_Light.jpg",
    brand: "Gucci", price: 79000, rating: 4.6, category: "Shoes",
    sizes: ["7", "8", "9", "10", "11"], colors: ["#F5F5DC", "#000000"], stock: 12
  }
];

const seedDatabase = async () => {
    try {
        await connectDb();
        console.log("Connected to Neon Postgres...");
        
        // 1. Delete all existing products to clear broken/dummy links
        const existingProducts = await Product.getAll();
        await Promise.all(existingProducts.map((product) => Product.delete(product.id)));
        console.log(`\n🧹 Cleared ${existingProducts.length} old/dummy products from the database.`);

        // 2. Insert fresh products
        console.log(`\n🌱 Seeding ${properProducts.length} premium products...`);
        let count = 0;
        for (const prod of properProducts) {
            await Product.create({
                ...prod,
                description: `Official luxury ${prod.category.toLowerCase()}. Authentic and premium quality.`
            });
            count++;
            console.log(`✅ Added: ${prod.title}`);
        }

        console.log(`\n🎉 Success! Database reset with proper premium products and shoes.`);
        process.exit(0);
    } catch (error) {
        console.error("❌ Failed to seed products:", error);
        process.exit(1);
    }
};

seedDatabase();
