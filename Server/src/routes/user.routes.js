import { Router } from "express";
import { registerUser, loginUser, logoutUser, getAllUsers, getCurrentUser, updateCurrentUser, getWishlist, addWishlistItem, removeWishlistItem, addAddress, removeAddress } from "../controller/user.controller.js";
import { getStylistRecommendations } from "../controller/stylist.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { isAdmin } from "../middlewares/admin.middleware.js";
import { validateCoupon } from "../controller/coupon.controller.js";

const router = Router();

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/logout", verifyJWT, logoutUser);
router.get("/users", verifyJWT, isAdmin, getAllUsers);
router.get("/profile", verifyJWT, getCurrentUser);
router.patch("/profile", verifyJWT, updateCurrentUser);
router.get("/wishlist", verifyJWT, getWishlist);
router.post("/wishlist", verifyJWT, addWishlistItem);
router.delete("/wishlist/:productId", verifyJWT, removeWishlistItem);
router.post("/address", verifyJWT, addAddress);
router.delete("/address/:id", verifyJWT, removeAddress);
router.post("/stylist", getStylistRecommendations);
router.post("/coupons/validate", validateCoupon);

export default router;
