/**
 * cloudinary.util.js
 * ───────────────────────────────────────────────────────────────
 * Thin wrapper around the Cloudinary v2 SDK.
 *
 * Usage:
 *   import { uploadToCloudinary, deleteFromCloudinary } from '../utils/cloudinary.util.js';
 *
 *   const result = await uploadToCloudinary(buffer, { folder: 'products', public_id: 'abc' });
 *   console.log(result.secure_url);
 */

import { v2 as cloudinary } from "cloudinary";
import { Readable } from "stream";

// Configure once at module load — reads from .env automatically via dotenv
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

/**
 * Upload a Buffer or file path to Cloudinary.
 *
 * @param {Buffer|string} source  - Raw buffer or local file path
 * @param {object}        opts    - cloudinary.uploader.upload options
 *                                  (folder, public_id, resource_type, etc.)
 * @returns {Promise<object>}      Cloudinary upload result (contains .secure_url)
 */
export const uploadToCloudinary = (source, opts = {}) => {
  return new Promise((resolve, reject) => {
    const defaultOpts = {
      resource_type: "image",
      folder:        "wear_your_style/products",
      ...opts,
    };

    if (Buffer.isBuffer(source)) {
      // Stream the buffer directly — no temp file needed
      const uploadStream = cloudinary.uploader.upload_stream(
        defaultOpts,
        (err, result) => {
          if (err) return reject(err);
          resolve(result);
        }
      );

      const readable = new Readable();
      readable._read = () => {};
      readable.push(source);
      readable.push(null);
      readable.pipe(uploadStream);
    } else {
      // Source is a file path string
      cloudinary.uploader.upload(source, defaultOpts, (err, result) => {
        if (err) return reject(err);
        resolve(result);
      });
    }
  });
};

/**
 * Delete an asset from Cloudinary by its public_id.
 *
 * @param {string} publicId  - Cloudinary public_id (NOT the full URL)
 * @returns {Promise<object>}
 */
export const deleteFromCloudinary = (publicId) =>
  cloudinary.uploader.destroy(publicId);
