/**
 * admin.controller.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Admin handlers for orders and products.
 *
 * UPGRADED (Step 2):
 *   createProductWithBgRemoval — accepts multipart/form-data with an image file,
 *     runs rembg background removal via Python subprocess, uploads the clean
 *     transparent PNG to Cloudinary, then saves the product to Postgres.
 *
 * PRESERVED (unchanged):
 *   getAllOrders, updateOrderStatus, deleteOrder,
 *   getAllProducts, createProduct, updateProduct, deleteProduct
 */

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import os from "os";

import asyncHandler from "../utils/AsyncHandler.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Payment } from "../models/payment.model.js";
import { uploadToCloudinary } from "../utils/cloudinary.util.js";
import { User } from "../models/user.model.js";
import { getDb } from "../db/postgres.js";
import { orders, products } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";

const execFileAsync = promisify(execFile);

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Returns the Python executable to use for rembg.
 *
 * Priority:
 *   1. REMBG_PYTHON env var  (e.g. C:\...\MlServer\venv\Scripts\python.exe)
 *   2. "python"              (system Python — works if rembg is globally installed)
 *
 * Set REMBG_PYTHON in Server/.env to point at your MlServer venv python if needed:
 *   REMBG_PYTHON=C:\Users\bhara\Desktop\WearYourStyle\MlServer\venv\Scripts\python.exe
 */
const getPythonExe = () => process.env.REMBG_PYTHON || "python";

/**
 * Run rembg on inputPath and write transparent PNG to outputPath.
 * Uses:  python -m rembg i <input> <output>
 */
const runRembg = async (inputPath, outputPath) => {
  const python = getPythonExe();
  try {
    await execFileAsync(python, ["-m", "rembg", "i", inputPath, outputPath], {
      timeout: 60_000, // 60 s max — first run downloads the u2net model (~170 MB)
    });
  } catch (err) {
    // rembg writes status to stderr; actual failure is signalled by non-zero exit
    throw new ApiError(
      500,
      `Background removal failed: ${err.stderr || err.message}`
    );
  }
};

/**
 * Write a buffer to a temp file, run rembg, read result buffer, clean up.
 * Returns the transparent-PNG buffer ready for Cloudinary upload.
 */
const removeBgFromBuffer = async (inputBuffer, originalName) => {
  const ext = path.extname(originalName || "upload.png") || ".png";
  const tmpIn  = path.join(os.tmpdir(), `wys_in_${Date.now()}${ext}`);
  const tmpOut = path.join(os.tmpdir(), `wys_out_${Date.now()}.png`);

  try {
    fs.writeFileSync(tmpIn, inputBuffer);
    await runRembg(tmpIn, tmpOut);

    if (!fs.existsSync(tmpOut)) {
      throw new ApiError(500, "rembg did not produce an output file");
    }

    const resultBuffer = fs.readFileSync(tmpOut);
    return resultBuffer;
  } finally {
    // Always clean up temp files
    [tmpIn, tmpOut].forEach((f) => {
      try { fs.unlinkSync(f); } catch (_) {}
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
//  Orders
// ─────────────────────────────────────────────────────────────────────────────

const getAllOrders = asyncHandler(async (req, res) => {
  const orders   = await Order.getAll();
  const payments = await Payment.getAll();

  const ordersWithPayments = orders.map((order) => {
    const payment = payments.find((p) => p.orderId === order.id);
    return { ...order, paymentDetails: payment || null };
  });

  res.status(200).json({ success: true, data: ordersWithPayments });
});

export const ORDER_STATUSES = ["Order Placed", "Confirmed", "Shipped", "Out for delivery", "Delivered", "Cancelled", "Return requested", "Returned"];
// Once stock has gone back on the shelf the order is closed for further changes.
const RESTOCKING_STATUSES = ["Cancelled", "Returned"];

const updateOrderStatus = asyncHandler(async (req, res) => {
  const { id }     = req.params;
  const { status } = req.body;
  if (!ORDER_STATUSES.includes(status)) {
    throw new ApiError(400, `Status must be one of: ${ORDER_STATUSES.join(", ")}`);
  }

  const updated = await getDb().transaction(async (tx) => {
    const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
    if (!order) throw new ApiError(404, "Order not found");
    if (order.status === status) return order;
    if (RESTOCKING_STATUSES.includes(order.status)) {
      throw new ApiError(400, `This order is already ${order.status.toLowerCase()} and can no longer change status`);
    }

    const [row] = await tx.update(orders).set({ status, updatedAt: new Date() }).where(eq(orders.id, id)).returning();
    if (RESTOCKING_STATUSES.includes(status)) {
      for (const item of order.data?.items || []) {
        const quantity = Number(item.quantity);
        if (item.productId && Number.isSafeInteger(quantity) && quantity > 0) {
          await tx.update(products)
            .set({ stock: sql`${products.stock} + ${quantity}`, updatedAt: new Date() })
            .where(eq(products.id, String(item.productId)));
        }
      }
    }
    return row;
  });

  res.status(200).json({ success: true, data: await Order.findById(updated.id) });
});

const deleteOrder = asyncHandler(async (req, res) => {
  if (!await Order.findById(req.params.id)) throw new ApiError(404, "Order not found");
  await Order.delete(req.params.id);
  res.status(200).json({ success: true, message: "Order deleted successfully" });
});

// Keep in sync with LOW_STOCK in Client/src/screens/admin/AdminDashboard.jsx
const LOW_STOCK_THRESHOLD = 10;

const getAnalytics = asyncHandler(async (_req, res) => {
  const [orders, products, users] = await Promise.all([Order.getAll(), Product.getAll(), User.getAll()]);
  const delivered = orders.filter((order) => order.status === "Delivered");
  const revenue = delivered.reduce((sum, order) => sum + Number(order.totalAmount || 0), 0);
  const lowStock = products.filter((product) => Number(product.stock || 0) <= LOW_STOCK_THRESHOLD).length;
  const returns = orders.filter((order) => String(order.status).toLowerCase().includes("return")).length;
  res.status(200).json({ success: true, data: { revenue, orders: orders.length, customers: users.filter((user) => user.role !== "admin").length, products: products.length, lowStock, returns } });
});

const getCustomers = asyncHandler(async (_req, res) => {
  const users = (await User.getAll()).map(User.sanitizeUser).filter((user) => user.role !== "admin");
  res.status(200).json({ success: true, data: users });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Products — existing JSON-body handlers (PRESERVED)
// ─────────────────────────────────────────────────────────────────────────────

const getAllProducts = asyncHandler(async (req, res) => {
  const products = await Product.getAll();
  res.status(200).json({ success: true, data: products });
});

/**
 * Validates the product fields that are present. On create, title and price are required.
 * Returns a cleaned copy of the body.
 */
const validateProductInput = (body, { partial }) => {
  const data = { ...body };
  delete data.id;
  if (!partial || Object.hasOwn(data, "title")) {
    data.title = String(data.title || "").trim();
    if (!data.title) throw new ApiError(400, "Product title is required");
  }
  if (!partial || Object.hasOwn(data, "price")) {
    const price = Number(data.price);
    if (!Number.isFinite(price) || price <= 0) throw new ApiError(400, "Price must be a number greater than 0");
    data.price = price;
  }
  if (Object.hasOwn(data, "stock")) {
    const stock = Number(data.stock);
    if (!Number.isSafeInteger(stock) || stock < 0) throw new ApiError(400, "Stock must be a whole number of 0 or more");
    data.stock = stock;
  }
  for (const key of ["sizes", "colors"]) {
    if (typeof data[key] === "string") data[key] = data[key].split(/[|,]/).map((v) => v.trim()).filter(Boolean);
    if (Object.hasOwn(data, key) && !Array.isArray(data[key])) throw new ApiError(400, `${key} must be a list`);
  }
  return data;
};

const createProduct = asyncHandler(async (req, res) => {
  const newProduct = await Product.create(validateProductInput(req.body, { partial: false }));
  res.status(201).json({ success: true, data: newProduct });
});

const updateProduct = asyncHandler(async (req, res) => {
  const updated = await Product.update(req.params.id, validateProductInput(req.body, { partial: true }));
  if (!updated) throw new ApiError(404, "Product not found");
  res.status(200).json({ success: true, data: updated });
});

const deleteProduct = asyncHandler(async (req, res) => {
  if (!await Product.findById(req.params.id)) throw new ApiError(404, "Product not found");
  await Product.delete(req.params.id);
  res.status(200).json({ success: true, message: "Product deleted successfully" });
});

// ─────────────────────────────────────────────────────────────────────────────
//  Products — NEW: file upload + background removal pipeline
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/admin/products/upload
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts:  multipart/form-data
 *   image          (file)    — garment image (JPEG/PNG/WebP/AVIF)
 *   title          (string)  — product title
 *   price          (number)
 *   category       (string)
 *   gender         (string)  — "mens" | "womens" | "unisex"
 *   description    (string, optional)
 *   removeBg       (boolean, optional, default true) — set "false" to skip rembg
 *
 * Pipeline:
 *   1. Multer reads the file into memory (req.file.buffer)
 *   2. If removeBg !== "false": Python rembg strips the background → transparent PNG
 *   3. Clean PNG buffer is uploaded to Cloudinary (folder: wear_your_style/products)
 *   4. Product row is created in Postgres with the Cloudinary secure_url
 *
 * Response:
 *   { success: true, data: <product>, imgSource: "<cloudinary_url>" }
 */
const createProductWithBgRemoval = asyncHandler(async (req, res) => {
  // Multer populates req.file when the "upload" middleware runs before this handler
  if (!req.file) {
    throw new ApiError(400, "No image file provided. Send multipart/form-data with field 'image'.");
  }

  const { title, price, category, gender, description, stock, sizes } = req.body;
  const skipBgRemoval = req.body.removeBg === "false";

  if (!title || !price || !category || !gender) {
    throw new ApiError(400, "title, price, category, and gender are required fields.");
  }

  // ── Step 1: Background removal ────────────────────────────────────────────
  let imageBuffer = req.file.buffer;
  let bgRemoved   = false;

  if (!skipBgRemoval) {
    try {
      console.log(`[BgRemoval] Running rembg on "${req.file.originalname}" …`);
      imageBuffer = await removeBgFromBuffer(req.file.buffer, req.file.originalname);
      bgRemoved   = true;
      console.log("[BgRemoval] ✓ Background removed successfully");
    } catch (err) {
      // Non-fatal: if rembg fails (e.g. Python not on PATH), log and continue
      // with the original image so the upload doesn't fail entirely.
      console.warn(`[BgRemoval] ⚠ Skipping: ${err.message}`);
    }
  }

  // ── Step 2: Upload to Cloudinary ──────────────────────────────────────────
  const safeTitle  = (title || "product").replace(/\s+/g, "_").toLowerCase();
  const publicId   = `products/${safeTitle}_${Date.now()}`;

  let cloudinaryResult;
  try {
    console.log(`[Cloudinary] Uploading to ${publicId} …`);
    cloudinaryResult = await uploadToCloudinary(imageBuffer, {
      public_id:     publicId,
      folder:        "wear_your_style/products",
      resource_type: "image",
      // Preserve transparency for rembg-processed PNGs
      format:        bgRemoved ? "png" : undefined,
    });
    console.log(`[Cloudinary] ✓ Uploaded: ${cloudinaryResult.secure_url}`);
  } catch (err) {
    throw new ApiError(500, `Cloudinary upload failed: ${err.message}`);
  }

  // ── Step 3: Save product to Postgres ──────────────────────────────────────
  const productData = validateProductInput({
    title,
    price,
    ...(stock !== undefined && { stock }),
    ...(sizes !== undefined && { sizes }),
    category,
    gender,
    description:   description || "",
    imgSource:     cloudinaryResult.secure_url,
    cloudinaryId:  cloudinaryResult.public_id,
    bgRemoved,
  }, { partial: false });

  const newProduct = await Product.create(productData);

  return res.status(201).json(
    new ApiResponse(201, {
      ...newProduct,
      imgSource:  cloudinaryResult.secure_url,
      bgRemoved,
    },
    bgRemoved
      ? "Product created with background removed"
      : "Product created (background removal skipped)"
    )
  );
});

// ─────────────────────────────────────────────────────────────────────────────
//  Exports
// ─────────────────────────────────────────────────────────────────────────────

export {
  // Orders
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getAnalytics,
  getCustomers,

  // Products (preserved)
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,

  // Products (new)
  createProductWithBgRemoval,
};
