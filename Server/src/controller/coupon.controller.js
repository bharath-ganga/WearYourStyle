import { Coupon } from "../models/coupon.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
export const validateCoupon=asyncHandler(async(req,res)=>{const coupon=await Coupon.findByCode(req.body.code);if(!coupon)throw new ApiError(404,"Coupon is invalid or inactive");res.json(new ApiResponse(200,{code:coupon.code,discountPercent:coupon.discountPercent},"Coupon applied"));});
export const getCoupons=asyncHandler(async(_req,res)=>res.json(new ApiResponse(200,await Coupon.getAll(),"Coupons fetched")));
export const createCoupon=asyncHandler(async(req,res)=>{const percent=Number(req.body.discountPercent);if(!req.body.code||percent<1||percent>80)throw new ApiError(400,"Enter a code and a discount from 1–80%");res.status(201).json(new ApiResponse(201,await Coupon.create(req.body),"Coupon created"));});
export const deleteCoupon=asyncHandler(async(req,res)=>{await Coupon.remove(req.params.id);res.json(new ApiResponse(200,{},"Coupon deleted"));});
