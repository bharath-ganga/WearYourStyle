/**
 * admin.routes.js
 * ─────────────────────────────────────────────────────────────────────────────
 * All routes require JWT auth + admin role (enforced by middleware).
 *
 * PRESERVED (unchanged):
 *   GET    /api/admin/orders
 *   PATCH  /api/admin/orders/:id
 *   DELETE /api/admin/orders/:id
 *   GET    /api/admin/products
 *   POST   /api/admin/products          ← JSON body { imgSource: url, ... }
 *   PUT    /api/admin/products/:id
 *   DELETE /api/admin/products/:id
 *
 * NEW:
 *   POST   /api/admin/products/upload   ← multipart/form-data with image file
 *     Runs rembg background removal, uploads clean PNG to Cloudinary,
 *     stores product in Firestore.  See admin.controller.js for full docs.
 */

import express from "express";
import multer from "multer";

import {
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  getAllProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductWithBgRemoval,
  getAnalytics,
  getCustomers,
} from "../controller/admin.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin }   from "../middlewares/admin.middleware.js";
import { getCoupons, createCoupon, deleteCoupon } from "../controller/coupon.controller.js";

const router = express.Router();

// ── Auth + admin guard on every route ────────────────────────────────────────
router.use(verifyJWT);
router.use(isAdmin);

// ── Multer: in-memory storage (no temp files managed by multer itself) ───────
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 15 * 1024 * 1024,   // 15 MB max upload
  },
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`), false);
    }
  },
});

// ─────────────────────────────────────────────────────────────────────────────
//  Order routes  (PRESERVED)
// ─────────────────────────────────────────────────────────────────────────────
router.get    ("/orders",     getAllOrders);
router.patch  ("/orders/:id", updateOrderStatus);
router.delete ("/orders/:id", deleteOrder);
router.get    ("/analytics", getAnalytics);
router.get    ("/customers", getCustomers);
router.get    ("/coupons", getCoupons);
router.post   ("/coupons", createCoupon);
router.delete ("/coupons/:id", deleteCoupon);

// ─────────────────────────────────────────────────────────────────────────────
//  Product routes  (PRESERVED)
// ─────────────────────────────────────────────────────────────────────────────
router.get    ("/products",      getAllProducts);
router.post   ("/products",      createProduct);          // JSON body, existing flow
router.put    ("/products/:id",  updateProduct);
router.delete ("/products/:id",  deleteProduct);

// ─────────────────────────────────────────────────────────────────────────────
//  NEW: file upload + background removal + Cloudinary
// ─────────────────────────────────────────────────────────────────────────────
// IMPORTANT: This route must be declared BEFORE "/products/:id" routes so
// "upload" is not mistakenly treated as an :id parameter.
router.post(
  "/products/upload",
  upload.single("image"),
  createProductWithBgRemoval,
);

export default router;
