import { Router } from "express";
import { getReviews, saveReview } from "../controller/review.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
const router = Router();
router.get("/:productId", getReviews);
router.post("/:productId", verifyJWT, saveReview);
export default router;
