import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../config/apiConfig";

const AuthContext = createContext(null);
const guestKey = "wear-your-style-guest-wishlist";

const readGuestWishlist = () => {
  try { return JSON.parse(localStorage.getItem(guestKey) || "[]"); } catch { return []; }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [wishlist, setWishlist] = useState(readGuestWishlist);
  const [loading, setLoading] = useState(true);

  const loadSession = useCallback(async () => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      setUser(null);
      setWishlist(readGuestWishlist());
      setLoading(false);
      return;
    }
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [profile, saved] = await Promise.all([
        axios.get(`${API_BASE_URL}/api/profile`, { headers }),
        axios.get(`${API_BASE_URL}/api/wishlist`, { headers }),
      ]);
      setUser(profile.data.data.user);
      setWishlist(saved.data.data || []);

      const guest = readGuestWishlist();
      if (guest.length) {
        await Promise.all(guest.map((product) => axios.post(`${API_BASE_URL}/api/wishlist`, { productId: product.id }, { headers })));
        localStorage.removeItem(guestKey);
        const merged = await axios.get(`${API_BASE_URL}/api/wishlist`, { headers });
        setWishlist(merged.data.data || []);
      }
    } catch (error) {
      if (error.response?.status === 401) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("userId");
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSession();
    window.addEventListener("auth-changed", loadSession);
    return () => window.removeEventListener("auth-changed", loadSession);
  }, [loadSession]);

  const toggleWishlist = async (product) => {
    const exists = wishlist.some((item) => item.id === product.id);
    const next = exists ? wishlist.filter((item) => item.id !== product.id) : [...wishlist, product];
    setWishlist(next);
    const token = localStorage.getItem("accessToken");
    if (!token) {
      localStorage.setItem(guestKey, JSON.stringify(next));
      toast.success(exists ? "Removed from wishlist" : "Saved on this device");
      return;
    }
    try {
      const config = { headers: { Authorization: `Bearer ${token}` } };
      if (exists) await axios.delete(`${API_BASE_URL}/api/wishlist/${product.id}`, config);
      else await axios.post(`${API_BASE_URL}/api/wishlist`, { productId: product.id }, config);
      toast.success(exists ? "Removed from wishlist" : "Added to wishlist");
    } catch {
      setWishlist(wishlist);
      toast.error("Could not update wishlist");
    }
  };

  const logout = async () => {
    const token = localStorage.getItem("accessToken");
    try {
      if (token) await axios.post(`${API_BASE_URL}/api/logout`, {}, { headers: { Authorization: `Bearer ${token}` } });
    } catch { /* local logout still succeeds */ }
    localStorage.removeItem("accessToken");
    localStorage.removeItem("userId");
    setUser(null);
    setWishlist(readGuestWishlist());
  };

  const value = useMemo(() => ({ user, wishlist, loading, isAuthenticated: Boolean(user), refreshAuth: loadSession, toggleWishlist, logout }), [user, wishlist, loading, loadSession]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);
