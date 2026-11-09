// Helpers shared by the try-on screen and the home-page try-on widget.

/**
 * Loads a garment image and returns it as base64 PNG (no data-URL prefix).
 * The ML server decodes images with OpenCV, which cannot read the catalog's
 * AVIF files, so the browser re-encodes them through a canvas first.
 */
export const loadGarmentAsPng = async (imageUrl) => {
  const img = new Image();
  img.crossOrigin = "anonymous";
  img.src = imageUrl;
  await new Promise((resolve, reject) => {
    img.onload = resolve;
    img.onerror = () => reject(new Error(`Could not load garment image ${imageUrl}`));
  });
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  canvas.getContext("2d").drawImage(img, 0, 0);
  return canvas.toDataURL("image/png").split(",")[1];
};

/**
 * The ML server trims tops at the hips but keeps dresses full length.
 */
export const garmentTypeFor = (product) =>
  /\b(dress|gown|kurta|jumpsuit)\b/i.test(product?.title || "") ? "dress" : "top";

// JPEG keeps live frames ~10x smaller than PNG, which matters on the hosted ML server.
export const LIVE_FRAME_FORMAT = "image/jpeg";
export const LIVE_FRAME_QUALITY = 0.8;
