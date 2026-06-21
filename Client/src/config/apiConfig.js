import axios from "axios";

// Enable sending cookies with cross-origin requests
axios.defaults.withCredentials = true;

const isLocalhost = typeof window !== "undefined" && (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1");

const API_BASE_URL = import.meta.env.VITE_API_URL || (isLocalhost ? "http://localhost:3000" : "https://wear-your-style.vercel.app");
const ML_BASE_URL = import.meta.env.VITE_ML_URL || (isLocalhost ? "http://localhost:7860" : "https://bharathganga-wear.hf.space");

export { API_BASE_URL, ML_BASE_URL };
