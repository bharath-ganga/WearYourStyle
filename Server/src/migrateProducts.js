import { Product } from "./models/product.model.js";
import connectDb from "./db/postgres.js";
import dotenv from "dotenv";

dotenv.config({ path: "./.env" });

const productsToMigrate = [
  {
    id: 1,
    imgSource: "/assets/images/product1.png",
    title: "Active wear",
    brand: "US Polo",
    price: 250.0,
    rating: 4.5,
    sizes: ["S", "M", "L", "XL"],
    colors: ["#3C4242", "#EDD146", "#EB84B0", "#9C1F35"],
    stock: 50
  },
  {
    id: 2,
    imgSource: "/assets/images/product2.png",
    title: "Casual Shirt",
    brand: "Peter England",
    price: 500.0,
    rating: 4.0,
    sizes: ["M", "L", "XL"],
    colors: ["#3C4242", "#EB84B0"],
    stock: 35
  },
  {
    id: 3,
    imgSource: "/assets/images/product3.png",
    title: "Checkered Shirt",
    brand: "Tommy Hilfiger",
    price: 450.0,
    rating: 4.8,
    sizes: ["S", "M", "L"],
    colors: ["#EDD146", "#9C1F35"],
    stock: 20
  },
  {
    id: 4,
    imgSource: "/assets/images/product4.png",
    title: "Designer Top",
    brand: "Levis",
    price: 550.0,
    rating: 4.2,
    sizes: ["XS", "S", "M"],
    colors: ["#3C4242", "#EB84B0", "#9C1F35"],
    stock: 45
  },
  {
    id: 5,
    imgSource: "/assets/images/cart1.png",
    title: "Urban Hoodie",
    brand: "Nike",
    price: 1200.0,
    rating: 4.6,
    sizes: ["M", "L", "XL", "XXL"],
    colors: ["#000000", "#555555"],
    stock: 15
  },
  {
    id: 6,
    imgSource: "/assets/images/cart2.png",
    title: "Graphic T-Shirt",
    brand: "Adidas",
    price: 350.0,
    rating: 4.1,
    sizes: ["S", "M", "L"],
    colors: ["#FFFFFF", "#3C4242"],
    stock: 60
  },
  {
    id: 7,
    imgSource: "/assets/images/cart3.png",
    title: "Slim Fit Joggers",
    brand: "Puma",
    price: 850.0,
    rating: 4.3,
    sizes: ["S", "M", "L", "XL"],
    colors: ["#3C4242", "#000000"],
    stock: 25
  },
  {
    id: 8,
    imgSource: "/assets/images/wishitem1.png",
    title: "Evening Gown",
    brand: "Zara",
    price: 2500.0,
    rating: 4.9,
    sizes: ["S", "M", "L"],
    colors: ["#EB84B0", "#9C1F35"],
    stock: 10
  },
  {
    id: 9,
    imgSource: "/assets/images/wishitem2.png",
    title: "Floral Dress",
    brand: "H&M",
    price: 900.0,
    rating: 4.4,
    sizes: ["XS", "S", "M", "L"],
    colors: ["#EB84B0", "#EDD146"],
    stock: 30
  },
  {
    id: 10,
    imgSource: "/assets/images/wishitem3.png",
    title: "Formal Suit",
    brand: "Raymond",
    price: 5500.0,
    rating: 4.7,
    sizes: ["M", "L", "XL"],
    colors: ["#3C4242", "#000000"],
    stock: 5
  }
];

const migrate = async () => {
  try {
    await connectDb();
    console.log("Connected to Neon Postgres for migration...");

    for (const prod of productsToMigrate) {
      const { id, ...data } = prod;
      await Product.create(data);
      console.log(`Migrated: ${data.title}`);
    }

    console.log("✅ Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Migration failed:", error.message);
    process.exit(1);
  }
};

migrate();
