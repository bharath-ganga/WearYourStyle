import { Order } from "../models/order.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { Coupon } from "../models/coupon.model.js";
import { getDb } from "../db/postgres.js";
import { orders, payments, products } from "../db/schema.js";
import { eq, sql } from "drizzle-orm";
import { randomUUID } from "crypto";

const placeOrder = asyncHandler(async (req, res) => {
    const { 
        items, 
        shippingAddress, 
        paymentMethod, 
        phone,
        delivery_date,
        payment_details,
        couponCode = ""
    } = req.body;

    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!Array.isArray(items) || items.length === 0) {
        throw new ApiError(400, "Cart is empty");
    }

    if (!shippingAddress || !paymentMethod) throw new ApiError(400, "Shipping address and payment method are required");
    const coupon = couponCode ? await Coupon.findByCode(couponCode) : null;
    if (couponCode && !coupon) throw new ApiError(400, "Coupon is invalid or inactive");
    const safeDiscount = Number(coupon?.discountPercent || 0);
    const order = await getDb().transaction(async (tx) => {
        let subtotal = 0;
        const validatedItems = [];
        for (const item of items) {
            const quantity = Number(item?.quantity);
            if (!item?.productId || !Number.isSafeInteger(quantity) || quantity < 1) {
                throw new ApiError(400, "Each cart item needs a product and a positive whole-number quantity");
            }
            const [product] = await tx.update(products)
                .set({ stock: sql`${products.stock} - ${quantity}`, updatedAt: new Date() })
                .where(sql`${products.id} = ${String(item.productId)} and ${products.stock} >= ${quantity}`)
                .returning();
            if (!product) throw new ApiError(409, `Product is unavailable or has insufficient stock: ${item.productId}`);
            const price = Number(product.price);
            subtotal += price * quantity;
            // Keep the shopper's chosen variant; only short plain strings are accepted.
            const variant = (value) => (typeof value === "string" ? value.trim().slice(0, 20) : "");
            validatedItems.push({ productId: product.id, title: product.title, name: product.title, imgSource: product.imgSource, size: variant(item.size), color: variant(item.color), price, quantity, totalPrice: price * quantity });
        }
        const totalAmount = Number((subtotal * (1 - safeDiscount / 100) + 50).toFixed(2));
        const now = new Date();
        const orderId = randomUUID();
        const orderNo = `ORD-${Date.now()}-${orderId.slice(0, 8)}`;
        const data = {
            userEmail, phone: phone || "N/A", order_no: orderNo, items: validatedItems,
            subtotal, shippingFee: 50, discountPercent: safeDiscount,
            shippingAddress, paymentMethod, order_date: now.toISOString(),
            delivery_date: delivery_date || "Within 3-5 days"
        };
        const [saved] = await tx.insert(orders).values({
            id: orderId, userId, status: "Order Placed", totalAmount: String(totalAmount),
            data, createdAt: now, updatedAt: now
        }).returning();
        if (payment_details) {
            await tx.insert(payments).values({
                id: randomUUID(), orderId, amount: String(totalAmount),
                data: {
                    order_no: orderNo,
                    transactionId: payment_details.transaction_id,
                    paymentType: payment_details.payment_type || paymentMethod,
                    customerName: payment_details.customer_name || req.user.firstName,
                    timestamp: payment_details.timestamp || now.toISOString()
                }, createdAt: now, updatedAt: now
            });
        }
        return { ...data, id: saved.id, userId, status: saved.status, totalAmount, createdAt: saved.createdAt.toISOString(), updatedAt: saved.updatedAt.toISOString() };
    });

    return res
        .status(201)
        .json(new ApiResponse(201, order, "Order placed successfully"));
});

const getMyOrders = asyncHandler(async (req, res) => {
    if (!req.user) {
        throw new ApiError(401, "You must be logged in to view your orders");
    }

    const userId = req.user.id;
    const orders = await Order.findByUserId(userId);

    return res
        .status(200)
        .json(new ApiResponse(200, orders, "Orders fetched successfully"));
});

const getOrderById = asyncHandler(async (req, res) => {
    const { id } = req.params;

    if (!id) {
        throw new ApiError(400, "Order ID is required");
    }

    const order = await Order.findById(id);

    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Security check: Only the owner or an admin can view the order details
    if (order.userId !== req.user.id && req.user.role !== "admin") {
        throw new ApiError(403, "You do not have permission to view this order");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, order, "Order fetched successfully"));
});

const cancelOrder = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const updatedOrder = await getDb().transaction(async (tx) => {
        const [order] = await tx.select().from(orders).where(eq(orders.id, id)).for("update");
        if (!order) throw new ApiError(404, "Order not found");
        if (order.userId !== req.user.id && req.user.role !== "admin") {
            throw new ApiError(403, "You do not have permission to cancel this order");
        }
        if (order.status === "Cancelled") throw new ApiError(400, "Order is already cancelled");
        if (["Delivered", "Return requested", "Returned"].includes(order.status)) {
            throw new ApiError(400, "This order can no longer be cancelled");
        }
        const [updated] = await tx.update(orders).set({ status: "Cancelled", updatedAt: new Date() }).where(eq(orders.id, id)).returning();
        for (const item of order.data?.items || []) {
            const quantity = Number(item.quantity);
            if (item.productId && Number.isSafeInteger(quantity) && quantity > 0) {
                await tx.update(products).set({ stock: sql`${products.stock} + ${quantity}`, updatedAt: new Date() }).where(eq(products.id, String(item.productId)));
            }
        }
        return { ...updated.data, id: updated.id, userId: updated.userId, status: updated.status, totalAmount: Number(updated.totalAmount), createdAt: updated.createdAt.toISOString(), updatedAt: updated.updatedAt.toISOString() };
    });

    return res
        .status(200)
        .json(new ApiResponse(200, updatedOrder, "Order cancelled successfully"));
});

const requestReturn = asyncHandler(async (req, res) => {
    const order = await Order.findById(req.params.id);
    if (!order) throw new ApiError(404, "Order not found");
    if (order.userId !== req.user.id && req.user.role !== "admin") throw new ApiError(403, "You do not have permission to return this order");
    if (order.status !== "Delivered") throw new ApiError(400, "Returns can be requested after delivery");
    const updated = await Order.update(order.id, { status: "Return requested", returnReason: req.body.reason || "Changed my mind", returnRequestedAt: new Date().toISOString() });
    return res.status(200).json(new ApiResponse(200, updated, "Return requested"));
});

export { placeOrder, getMyOrders, getOrderById, cancelOrder, requestReturn };
