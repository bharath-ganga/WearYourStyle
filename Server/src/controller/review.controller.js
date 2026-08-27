import { Review } from "../models/review.model.js";
import { Product } from "../models/product.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

export const getReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.forProduct(req.params.productId);
  const average = reviews.length ? reviews.reduce((sum, review) => sum + Number(review.rating), 0) / reviews.length : 0;
  res.status(200).json(new ApiResponse(200, { reviews, average:Number(average.toFixed(1)), count:reviews.length }, "Reviews fetched"));
});

export const saveReview = asyncHandler(async (req, res) => {
  const rating = Number(req.body.rating);
  const comment = String(req.body.comment || "").trim();
  if (rating < 1 || rating > 5 || comment.length < 5) throw new ApiError(400, "Choose 1–5 stars and write at least 5 characters");
  if (!await Product.findById(req.params.productId)) throw new ApiError(404, "Product not found");
  const review = await Review.upsert({ productId:req.params.productId, userId:req.user.id, userName:`${req.user.firstName} ${req.user.lastName || ""}`.trim(), rating, comment });
  const all = await Review.forProduct(req.params.productId);
  const average = all.reduce((sum, item) => sum + Number(item.rating), 0) / all.length;
  await Product.update(req.params.productId, { rating:Number(average.toFixed(1)), reviewCount:all.length });
  res.status(201).json(new ApiResponse(201, review, "Review saved"));
});
