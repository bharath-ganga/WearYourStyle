import { Order } from "../models/order.model.js";
import { Product } from "../models/product.model.js";
import { Payment } from "../models/payment.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/AsyncHandler.js";

const placeOrder = asyncHandler(async (req, res) => {
    const { 
        items, 
        totalAmount, 
        shippingAddress, 
        paymentMethod, 
        userId, 
        userEmail,
        phone,
        status, 
        delivery_date,
        payment_details
    } = req.body;

    if (!items || items.length === 0) {
        throw new ApiError(400, "Cart is empty");
    }

    const orderData = {
        userId: userId || "guest",
        userEmail: userEmail || "Guest",
        phone: phone || "N/A",
        order_no: `ORD-${Date.now()}`,
        items: items.map(item => ({
            ...item,
            name: item.title 
        })),
        totalAmount,
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
            customerName: payment_details.customer_name || "Guest",
            amount: totalAmount,
            timestamp: payment_details.timestamp || new Date().toISOString()
        });
    }

    // Decrease product stock
    for (const item of items) {
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
    const userId = req.user?.id || req.query.userId;
    
    if (!userId) {
        throw new ApiError(400, "User ID is required");
    }

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

export { placeOrder, getMyOrders, getOrderById, cancelOrder };
