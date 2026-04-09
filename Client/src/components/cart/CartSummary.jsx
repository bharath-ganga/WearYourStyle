import styled from "styled-components";
import { BaseButtonGreen } from "../../styles/button";
import { currencyFormat } from "../../utils/helper";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { getCartTotal } from "../../redux/slices/cartSlice";
import { useNavigate } from "react-router-dom";

const CartSummaryWrapper = styled.div`
  background-color: ${defaultTheme.color_flash_white};
  padding: 16px;

  .checkout-btn {
    min-width: 100%;
  }

  .summary-list {
    padding: 20px;

    @media (max-width: ${breakpoints.xs}) {
      padding-top: 0;
      padding-right: 0;
      padding-left: 0;
    }

    .summary-item {
      margin: 6px 0;

      &:last-child {
        margin-top: 20px;
        border-top: 1px dashed ${defaultTheme.color_sea_green};
        padding-top: 10px;
      }
    }
  }
`;

const CartSummary = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { carts, totalAmount, discountPercent } = useSelector((state) => state.cart);
  const shippingCharge = 50; // Dynamic or fixed shipping

  const discountAmount = discountPercent > 0 ? (totalAmount * discountPercent) / 100 : 0;
  const grandTotal = totalAmount - discountAmount + shippingCharge;

  useEffect(() => {
    dispatch(getCartTotal());
  }, [carts, dispatch]);

  return (
    <CartSummaryWrapper>
      <ul className="summary-list">
        <li className="summary-item flex justify-between">
          <span className="font-medium text-outerspace">Sub Total</span>
          <span className="font-medium text-outerspace">{currencyFormat(totalAmount)}</span>
        </li>
        {discountPercent > 0 && (
          <li className="summary-item flex justify-between">
             <span className="font-medium text-outerspace">Discount ({discountPercent}%)</span>
             <span className="font-medium text-outerspace text-red-500">-{currencyFormat(discountAmount)}</span>
          </li>
        )}
        <li className="summary-item flex justify-between">
          <span className="font-medium text-outerspace">Shipping</span>
          <span className="font-medium text-outerspace">{currencyFormat(shippingCharge)}</span>
        </li>
        <li className="summary-item flex justify-between">
          <span className="font-medium text-outerspace">Grand Total</span>
          <span className="summary-item-value font-bold text-outerspace">
            {currencyFormat(grandTotal)}
          </span>
        </li>
      </ul>
      <BaseButtonGreen 
        type="button" 
        className="checkout-btn"
        onClick={() => navigate("/checkout")}
      >
        Proceed To Checkout
      </BaseButtonGreen>
    </CartSummaryWrapper>
  );
};

export default CartSummary;
