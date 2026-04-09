import { createSlice } from "@reduxjs/toolkit";

const fetchFromLocalStorage = () => {
    let cart = localStorage.getItem("cart");
    if (cart) {
        return JSON.parse(localStorage.getItem("cart"));
    } else {
        return [];
    }
};

const storeInLocalStorage = (data) => {
    localStorage.setItem("cart", JSON.stringify(data));
};

const cartSlice = createSlice({
    name: "cart",
    initialState: {
        carts: fetchFromLocalStorage(),
        itemsCount: 0,
        totalAmount: 0,
        discountPercent: localStorage.getItem("cartDiscount") ? JSON.parse(localStorage.getItem("cartDiscount")) : 0,
    },
    reducers: {
        addToCart: (state, action) => {
            const isItemInCart = state.carts.find((item) => item.id === action.payload.id);

            if (isItemInCart) {
                const tempCart = state.carts.map((item) => {
                    if (item.id === action.payload.id) {
                        let tempQty = item.quantity + action.payload.quantity;
                        let tempTotalPrice = tempQty * item.price;

                        return {
                            ...item,
                            quantity: tempQty,
                            totalPrice: tempTotalPrice,
                        };
                    } else {
                        return item;
                    }
                });

                state.carts = tempCart;
                storeInLocalStorage(state.carts);
            } else {
                state.carts.push(action.payload);
                storeInLocalStorage(state.carts);
            }
        },

        removeFromCart: (state, action) => {
            const tempCart = state.carts.filter((item) => item.id !== action.payload);
            state.carts = tempCart;
            storeInLocalStorage(state.carts);
        },

        toggleCartQty: (state, action) => {
            const tempCart = state.carts.map((item) => {
                if (item.id === action.payload.id) {
                    let tempQty = item.quantity;
                    let tempTotalPrice = item.totalPrice;

                    if (action.payload.type === "INC") {
                        tempQty++;
                        tempTotalPrice = tempQty * item.price;
                    }

                    if (action.payload.type === "DEC") {
                        tempQty--;
                        if (tempQty < 1) tempQty = 1;
                        tempTotalPrice = tempQty * item.price;
                    }

                    return { ...item, quantity: tempQty, totalPrice: tempTotalPrice };
                } else {
                    return item;
                }
            });

            state.carts = tempCart;
            storeInLocalStorage(state.carts);
        },

        getCartTotal: (state) => {
            state.totalAmount = state.carts.reduce((cartTotal, cartItem) => {
                return (cartTotal += cartItem.totalPrice);
            }, 0);
            state.itemsCount = state.carts.length;
        },

        clearCart: (state) => {
            state.carts = [];
            storeInLocalStorage(state.carts);
        },

        applyDiscount: (state, action) => {
            state.discountPercent = action.payload;
            localStorage.setItem("cartDiscount", JSON.stringify(action.payload));
        },
    },
});

export const { addToCart, removeFromCart, toggleCartQty, getCartTotal, clearCart, applyDiscount } = cartSlice.actions;
export default cartSlice.reducer;
