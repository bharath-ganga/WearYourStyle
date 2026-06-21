import { Router } from "express";
import { placeOrder, getMyOrders, getOrderById, cancelOrder } from "../controller/order.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = Router();

router.route("/place").post(placeOrder);
router.route("/my-orders").get(verifyJWT, getMyOrders);
router.route("/cancel/:id").patch(verifyJWT, cancelOrder);
router.route("/:id").get(verifyJWT, getOrderById);

export default router;
