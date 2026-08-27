import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Payment } from "../models/payment.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";
import { Coupon } from "../models/coupon.model.js";

const placeOrder = asyncHandler(async (req, res) => {
    const { 
        items, 
        shippingAddress, 
        paymentMethod, 
        phone,
        status, 
        delivery_date,
        payment_details,
        couponCode = ""
    } = req.body;

    const userId = req.user.id;
    const userEmail = req.user.email;

    if (!items || items.length === 0) {
        throw new ApiError(400, "Cart is empty");
    }

    if (!shippingAddress || !paymentMethod) throw new ApiError(400, "Shipping address and payment method are required");
    const coupon = couponCode ? await Coupon.findByCode(couponCode) : null;
    if (couponCode && !coupon) throw new ApiError(400, "Coupon is invalid or inactive");
    const safeDiscount = Number(coupon?.discountPercent || 0);
    let subtotal = 0;
    const validatedItems = [];
    for (const item of items) {
        const quantity = Math.max(1, Number.parseInt(item.quantity, 10) || 1);
        const productId = item.productId;
        const product = productId ? await Product.findById(productId) : null;
        if (!product) throw new ApiError(400, `Product is no longer available: ${item.title || productId}`);
        if (Number(product.stock) < quantity) throw new ApiError(409, `Only ${product.stock || 0} left for ${product.title}`);
        subtotal += Number(product.price) * quantity;
        validatedItems.push({ ...item, productId, title: product.title, name: product.title, price: Number(product.price), quantity, totalPrice: Number(product.price) * quantity });
    }
    const serverTotal = Number((subtotal * (1 - safeDiscount / 100) + 50).toFixed(2));

    const orderData = {
        userId,
        userEmail,
        phone: phone || "N/A",
        order_no: `ORD-${Date.now()}`,
        items: validatedItems,
        subtotal,
        shippingFee: 50,
        discountPercent: safeDiscount,
        totalAmount: serverTotal,
        shippingAddress,
        paymentMethod,
        order_date: new Date().toLocaleDateString(), 
        status: status || "Order Placed",
        delivery_date: delivery_date || "Within 3-5 days"
    };

    const order = await Order.create(orderData);

    if (!order) {
        throw new ApiError(500, "Something went wrong while placing order");
    }

    // Step 2: Store payment record if provided
    if (payment_details) {
        await Payment.create({
            orderId: order.id,
            order_no: order.order_no,
            transactionId: payment_details.transaction_id,
            paymentType: payment_details.payment_type || paymentMethod,
            customerName: payment_details.customer_name || (req.user ? req.user.firstName : "Guest"),
            amount: serverTotal,
            timestamp: payment_details.timestamp || new Date().toISOString()
        });
    }

    // Decrease product stock
    for (const item of validatedItems) {
        if (item.productId) {
            const product = await Product.findById(item.productId);
            if (product && typeof product.stock !== 'undefined') {
                const newStock = Math.max(0, parseInt(product.stock) - parseInt(item.quantity || 1));
                await Product.update(item.productId, { stock: newStock });
            }
        }
    }

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

    const order = await Order.findById(id);
    if (!order) {
        throw new ApiError(404, "Order not found");
    }

    // Security check: Only the owner or an admin can cancel the order
    if (order.userId !== req.user.id && req.user.role !== "admin") {
        throw new ApiError(403, "You do not have permission to cancel this order");
    }

    if (order.status === "Cancelled") {
        throw new ApiError(400, "Order is already cancelled");
    }

    const updatedOrder = await Order.update(id, { status: "Cancelled" });

    // Restore stock
    for (const item of order.items) {
        if (item.productId) {
            const product = await Product.findById(item.productId);
            if (product && typeof product.stock !== 'undefined') {
                const newStock = parseInt(product.stock) + parseInt(item.quantity || 1);
                await Product.update(item.productId, { stock: newStock });
            }
        }
    }

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
