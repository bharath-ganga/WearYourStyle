import { Router } from "express";
import { placeOrder, getMyOrders, getOrderById, cancelOrder, requestReturn } from "../controller/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/place").post(verifyJWT, placeOrder);
router.route("/my-orders").get(verifyJWT, getMyOrders);
router.route("/cancel/:id").patch(verifyJWT, cancelOrder);
router.route("/return/:id").patch(verifyJWT, requestReturn);
router.route("/:id").get(verifyJWT, getOrderById);

export default router;
