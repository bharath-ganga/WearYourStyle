import styled from "styled-components";
import { useSelector, useDispatch } from "react-redux";
import { useEffect } from "react";
import { getCartTotal } from "../../redux/slices/cartSlice";
import { currencyFormat } from "../../utils/helper";
import { breakpoints, defaultTheme } from "../../styles/themes/default";

const CheckoutSummaryWrapper = styled.div`
  box-shadow: 2px 2px 4px 0px rgba(0, 0, 0, 0.05),
    -2px -2px 4px 0px rgba(0, 0, 0, 0.05);
  padding: 40px;

  @media (max-width: ${breakpoints.xl}) {
    padding: 24px;
  }

  @media (max-width: ${breakpoints.sm}) {
    padding: 16px;
  }

  @media (max-width: ${breakpoints.xs}) {
    background-color: transparent;
    padding: 0;
    box-shadow: none;
  }

  .order-list {
    row-gap: 24px;
    margin-top: 20px;

    @media (max-width: ${breakpoints.sm}) {
      row-gap: 16px;
    }
  }

  .order-item {
    grid-template-columns: 60px auto;
    gap: 16px;

    @media (max-width: ${breakpoints.xs}) {
      align-items: center;
    }

    &-img {
      width: 60px;
      height: 60px;
      overflow: hidden;
      border-radius: 4px;
      img {
        width: 100%;
        height: 100%;
        object-fit: cover;
      }
    }

    &-info {
      gap: 16px;

      @media (max-width: ${breakpoints.xs}) {
        flex-direction: column;
        gap: 6px;
      }
    }
  }

  .order-info {
    margin-top: 30px;
    @media (max-width: ${breakpoints.sm}) {
      margin-top: 20px;
    }

    li {
      margin: 6px 0;
    }

    .list-separator {
      height: 1px;
      background-color: ${defaultTheme.color_anti_flash_white};
      margin: 12px 0;
    }
  }
`;

const CheckoutSummary = () => {
  const dispatch = useDispatch();
  const { carts: cartItems, totalAmount, discountPercent } = useSelector((state) => state.cart);

  useEffect(() => {
    dispatch(getCartTotal());
  }, [cartItems, dispatch]);

  const shipping = cartItems.length > 0 ? 50 : 0;
  const savings = discountPercent > 0 ? (totalAmount * discountPercent) / 100 : 0;
  const grandTotal = totalAmount + shipping - savings;

  return (
    <CheckoutSummaryWrapper>
      <h4 className="text-xxl font-bold text-outerspace">
        Checkout Order Summary
      </h4>
      <div className="order-list grid">
        {cartItems?.map((item) => {
          return (
            <div className="order-item grid" key={item.id}>
              <div className="order-item-img">
                <img
                  src={item.imgSource}
                  alt={item.title}
                />
              </div>
              <div className="order-item-info flex justify-between">
                <div className="order-item-info-l">
                  <p className="text-base font-bold text-outerspace">
                    {item.title}&nbsp;
                    <span className="text-gray">x{item.quantity}</span>
                  </p>
                  <p className="text-base font-bold text-outerspace">
                    Color: &nbsp;
                    <span className="text-gray font-normal">{item.color}</span>
                  </p>
                </div>
                <div className="order-item-info-r text-gray font-bold text-base">
                  {currencyFormat(item.totalPrice)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <ul className="order-info">
        <li className="flex items-center justify-between">
          <span className="text-outerspace font-bold text-lg">
            Subtotal <span className="text-gray font-semibold">({cartItems.length} items)</span>
          </span>
          <span className="text-outerspace font-bold text-lg">{currencyFormat(totalAmount)}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-outerspace font-bold text-lg">
            Savings{discountPercent > 0 ? ` (${discountPercent}%)` : ""}
          </span>
          <span className="text-outerspace font-bold text-lg">-{currencyFormat(savings)}</span>
        </li>
        <li className="flex items-center justify-between">
          <span className="text-outerspace font-bold text-lg">Shipping</span>
          <span className="text-outerspace font-bold text-lg">{currencyFormat(shipping)}</span>
        </li>
        <li className="list-separator"></li>
        <li className="flex items-center justify-between">
          <span className="text-outerspace font-bold text-lg">Total</span>
          <span className="text-outerspace font-bold text-lg">{currencyFormat(grandTotal)}</span>
        </li>
      </ul>
    </CheckoutSummaryWrapper>
  );
};

export default CheckoutSummary;
