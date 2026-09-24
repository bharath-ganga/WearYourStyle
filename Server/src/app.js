import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";
import userRouter from './routes/user.routes.js';
import orderRouter from './routes/order.routes.js';
import adminRouter from './routes/admin.routes.js';
import reviewRouter from './routes/review.routes.js';
import { isAllowedOrigin } from './utils/allowedOrigin.js';

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        if (isAllowedOrigin(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"]
}))

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));
app.use(cookieParser());

import connectDb from './db/postgres.js';

app.get('/', (req, res) => {
    res.send("WearYourStyle - Server is running");
});

app.get('/api/health', async (req, res) => {
    try {
        await connectDb();
        res.status(200).json({ status: "ok" });
    } catch (err) {
        console.error("Health check failed:", err);
        res.status(503).json({ status: "unavailable" });
    }
});



import { Product } from "./models/product.model.js";

// Product Routes - Moved up for priority
app.get('/api/products', async (req, res) => {
    console.log("Fetching all products...");
    try {
        const products = await Product.getAll();
        res.status(200).json(products);
    } catch (error) {
         console.error("Error fetching all products:", error);
         res.status(500).json({ error: "Failed to fetch products" });
    }
});

app.get('/api/products/:id', async (req, res) => {
    console.log(`Fetching product by ID: ${req.params.id}`);
    try {
        const product = await Product.findById(req.params.id);
        if (product) {
            console.log(`Product found: ${product.title}`);
            res.status(200).json(product);
        } else {
            console.log(`Product NOT found for ID: ${req.params.id}`);
            res.status(404).json({ error: "Product not found" });
        }
    } catch (error) {
        console.error(`Error fetching product ${req.params.id}:`, error);
        res.status(500).json({ error: "Failed to fetch product" });
    }
});

// Other routes
app.use('/api', userRouter);
app.use('/api/orders', orderRouter);
app.use('/api/admin', adminRouter);
app.use('/api/reviews', reviewRouter);


// Standard Error Handling Middleware
app.use((err, req, res, next) => {
    console.error("🔥 Server Error:", err.message);
    const statusCode = err.statusCode || 500;
    res.status(statusCode).json({
        success: false,
        message: err.message || "Internal Server Error",
        errors: err.errors || []
    });
});

export default app;
