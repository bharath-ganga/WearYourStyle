import express from "express"
import cors from 'cors'
import cookieParser from "cookie-parser";
import { fileURLToPath } from 'url'; 
import path from 'path';
import { exec } from 'child_process';
import userRouter from './routes/user.routes.js';
import orderRouter from './routes/order.routes.js';
import adminRouter from './routes/admin.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(cors({
    origin: function (origin, callback) {
        // In development, allow all origins starting with http://localhost or having no origin
        if (!origin || origin.startsWith("http://localhost") || origin.endsWith(".vercel.app")) {
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

import connectDb from './db/firebase.js';

app.get('/', (req, res) => {
    res.send("WearYourStyle - Server is running");
});

app.get('/api/db-debug', async (req, res) => {
    const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
    const safeRawKey = rawKey.length > 30 ? 
        `${rawKey.substring(0, 15)}...[len: ${rawKey.length}]...${rawKey.substring(rawKey.length - 15)}` : 
        rawKey;
    
    let privateKey = rawKey.trim();
    privateKey = privateKey.replace(/^['"\\"]+|['"\\"]+$/g, '');
    privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
    
    let processedKey = privateKey;
    if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
      const parts = privateKey.split(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/);
      if (parts.length >= 3) {
        let base64Body = parts[1].trim();
        base64Body = base64Body.replace(/[\s\t]+/g, '\n');
        processedKey = `-----BEGIN PRIVATE KEY-----\n${base64Body}\n-----END PRIVATE KEY-----`;
      }
    } else {
      processedKey = `-----BEGIN PRIVATE KEY-----\n${processedKey}\n-----END PRIVATE KEY-----`;
    }
    
    const safeProcessedKey = processedKey.length > 30 ? 
        `${processedKey.substring(0, 15)}...[len: ${processedKey.length}]...${processedKey.substring(processedKey.length - 15)}` : 
        processedKey;

    try {
        const rawKey = process.env.FIREBASE_PRIVATE_KEY || "";
        const charCounts = {};
        for (const char of rawKey) {
            charCounts[char] = (charCounts[char] || 0) + 1;
        }

        let privateKey = rawKey.trim();
        privateKey = privateKey.replace(/^['"\\"]+|['"\\"]+$/g, '');
        privateKey = privateKey.replace(/\\n/g, '\n').replace(/\r/g, '');
        
        let base64Body = privateKey;
        if (privateKey.includes('-----BEGIN PRIVATE KEY-----')) {
          const parts = privateKey.split(/-----BEGIN PRIVATE KEY-----|-----END PRIVATE KEY-----/);
          if (parts.length >= 3) {
            base64Body = parts[1].trim();
          }
        }
        
        const beforeStripLen = base64Body.length;
        base64Body = base64Body.replace(/[\s\r\n\t]+/g, '');
        const afterStripLen = base64Body.length;

        const hasLeadingN = base64Body.startsWith('nMII');
        let processedBody = base64Body;
        if (hasLeadingN) {
            processedBody = base64Body.substring(1);
        }

        const modulus4BeforePad = processedBody.length % 4;
        const padLength = (4 - (processedBody.length % 4)) % 4;
        if (padLength > 0) {
            processedBody += '='.repeat(padLength);
        }

        const chunks = [];
        for (let i = 0; i < processedBody.length; i += 64) {
          chunks.push(processedBody.substring(i, i + 64));
        }
        const finalKey = `-----BEGIN PRIVATE KEY-----\n${chunks.join('\n')}\n-----END PRIVATE KEY-----\n`;

        const regexMatch = !!finalKey.match(/-----BEGIN PRIVATE KEY-----\n[\s\S]+\n-----END PRIVATE KEY-----\n?/);

        res.status(200).json({
            status: "diagnostic",
            rawLength: rawKey.length,
            charCounts,
            beforeStripLen,
            afterStripLen,
            hasLeadingN,
            processedBodyLen: processedBody.length,
            modulus4BeforePad,
            padLength,
            regexMatch,
            finalKeyLength: finalKey.length,
            safeFinalKey: `${finalKey.substring(0, 40)}...[len: ${finalKey.length}]...${finalKey.substring(finalKey.length - 40)}`
        });
    } catch (err) {
        res.status(500).json({
            status: "error",
            message: "Diagnostic failed",
            error: err.message,
            stack: err.stack
        });
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


const mlModel = (req, res) => {
    const { imagePath } = req.body;

    if (!imagePath) {
        return res.status(400).send({ error: "No image path provided" });
    }

    const pythonScriptPath = path.resolve(__dirname, "..", "src", "models", "virtualTryOn.py");
    const fullImagePath = path.resolve(__dirname, "..", imagePath);

    console.log(`Running script: ${pythonScriptPath}`);
    console.log(`Using image: ${fullImagePath}`);

    // exec(
    //     `"C:\\Users\\Vivek\\Desktop\\Advanced-E-commerce-main\\Server\\env\\Scripts\\python.exe" "${pythonScriptPath}" --image_path "${fullImagePath}"`,
    //     (err, stdout, stderr) => {
    //         if (err) {
    //             console.error(`Exec error: ${err}`);
    //             console.error(`Stderr: ${stderr}`);
    //             return res.status(500).send({ error: "Error processing the image", details: stderr });
    //         }

    //         console.log(`Stdout: ${stdout}`);
    //         const outputImagePath = stdout.trim();

    //         if (!outputImagePath || !outputImagePath.endsWith(".png")) {
    //             return res.status(500).send({ error: "No valid output generated by the model" });
    //         }

    //         res.send({ overlayedImage: outputImagePath });
    //     }
    // );
    exec(
        `"C:\\Users\\Vivek\\Desktop\\Advanced-E-commerce-main\\Server\\env\\Scripts\\python.exe" "${pythonScriptPath}" --image_path "${fullImagePath}"`,
        (err, stdout, stderr) => {
            if (err) {
                console.error(`Exec error: ${err}`);
                console.error(`Stderr: ${stderr}`);
                return res.status(500).send({ error: "Error processing the image", details: stderr });
            }
    
            console.log(`Stdout: ${stdout}`);
            console.error(`Stderr: ${stderr}`); // Log any Python warnings or errors
    
            const outputImagePath = stdout.trim();
    
            if (!outputImagePath || !outputImagePath.endsWith(".png")) {
                return res.status(500).send({ error: "No valid output generated by the model" });
            }
    
            res.send({ overlayedImage: outputImagePath });
        }
    );    
};

app.post('/mlmodel', mlModel);

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