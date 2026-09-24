export const isAllowedOrigin = (origin) => {
  if (!origin) return true;
  const configured = (process.env.CORS_ORIGIN || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (configured.includes(origin)) return true;
  try {
    const url = new URL(origin);
    return ((url.hostname === "localhost" || url.hostname === "127.0.0.1") && ["http:", "https:"].includes(url.protocol)) ||
      (url.protocol === "https:" && url.hostname.endsWith(".vercel.app"));
  } catch {
    return false;
  }
};
