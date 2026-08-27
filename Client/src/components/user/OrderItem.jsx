import styled from "styled-components";
import PropTypes from "prop-types";
import { currencyFormat } from "../../utils/helper";
import { BaseLinkGreen, BaseButtonBlack } from "../../styles/button"; // Added BaseButtonBlack
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import { toast } from "react-hot-toast";

const OrderItemWrapper = styled.div`
  margin: 30px 0;
  border-bottom: 1px solid ${defaultTheme.color_anti_flash_white};

  .order-item-title {
    margin-bottom: 12px;
  }

  .order-item-details {
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 24px 32px;
    border-radius: 8px;

    @media (max-width: ${breakpoints.sm}) {
      padding: 20px 24px;
    }

    @media (max-width: ${breakpoints.xs}) {
      padding: 12px 16px;
    }
  }

  /* ... existing styles ... */
  .order-info-group {
    @media (max-width: ${breakpoints.sm}) {
      flex-direction: column;
    }
  }

  .order-info-item {
    width: 50%;

    span {
      &:nth-child(2) {
        margin-left: 4px;
      }
    }

    &:nth-child(even) {
      text-align: right;
      @media (max-width: ${breakpoints.lg}) {
        text-align: left;
      }
    }

    @media (max-width: ${breakpoints.sm}) {
      width: 100%;
      margin: 2px 0;
    }
  }

  .order-overview {
    margin: 28px 0;
    gap: 12px;

    @media (max-width: ${breakpoints.lg}) {
      margin: 20px 0;
    }

    @media (max-width: ${breakpoints.sm}) {
      flex-direction: column;
    }

    &-img {
      width: 100px;
      height: 100px;
      border-radius: 6px;
      overflow: hidden;
    }

    &-content {
      grid-template-columns: 100px auto;
      gap: 18px;
    }

    &-info {
      ul {
        span {
          &:nth-child(2) {
            margin-left: 4px;
          }
        }
      }
    }
  }

  .order-actions {
      display: flex;
      gap: 12px;
      align-items: center;

      @media (max-width: ${breakpoints.sm}) {
          flex-direction: column;
          align-items: flex-start;
          width: 100%;
          
          & > * {
              width: 100%;
              text-align: center;
          }
      }
  }
`;

const OrderItem = ({ order }) => {
  const primaryItem = order.items?.[0];
  const handleCancel = async () => {
    if (!window.confirm("Are you sure you want to cancel this order? This action cannot be undone.")) {
        return;
    }

    try {
        const token = localStorage.getItem("accessToken");
        await axios.patch(`${API_BASE_URL}/api/orders/cancel/${order.id}`, {}, {
            headers: {
                Authorization: `Bearer ${token}`
            }
        });
        toast.success("Order cancelled successfully");
        window.location.reload(); // Refresh to show updated status
    } catch (error) {
        console.error("Cancel failed:", error);
        toast.error(error.response?.data?.message || "Failed to cancel order");
    }
  };

  const showCancelButton = order.status === "Order Placed" || order.status === "pending";

  return (
    <OrderItemWrapper>
      <div className="order-item-details">
        <h3 className="text-x order-item-title">Order no: {order.order_no}</h3>
        <div className="order-info-group flex flex-wrap">
          <div className="order-info-item">
            <span className="text-gray font-semibold">Order Date:</span>
            <span className="text-silver">{order.order_date}</span>
          </div>
          <div className="order-info-item">
            <span className="text-gray font-semibold">Order Status:</span>
            <span style={{ color: order.status === 'Cancelled' ? '#ff4d4d' : 'inherit' }} className="text-silver font-bold">{order.status}</span>
          </div>
          <div className="order-info-item">
            <span className="text-gray font-semibold">
              Estimated Delivery Date:
            </span>
            <span className="text-silver">{order.delivery_date}</span>
          </div>
          <div className="order-info-item">
            <span className="text-gray font-semibold">Method:</span>
            <span className="text-silver">{order.payment_method}</span>
          </div>
        </div>
      </div>
      <div className="order-overview flex justify-between items-center">
        {primaryItem ? <div className="order-overview-content grid">
          <div className="order-overview-img">
            <img
              src={primaryItem.imgSource}
              alt=""
              className="object-fit-cover"
            />
          </div>
          <div className="order-overview-info">
            <h4 className="text-xl">{primaryItem.name || primaryItem.title}</h4>
            <ul>
              <li className="font-semibold text-base">
                <span>Colour:</span>
                <span className="text-silver">{primaryItem.color || "Default"}</span>
              </li>
              <li className="font-semibold text-base">
                <span>Qty:</span>
                <span className="text-silver">{primaryItem.quantity}</span>
              </li>
              <li className="font-semibold text-base">
                <span>Total:</span>
                <span className="text-silver">
                  {currencyFormat(primaryItem.price)}
                </span>
              </li>
            </ul>
          </div>
        </div> : <p className="text-gray">Order item details are unavailable.</p>}

        <div className="order-actions">
            {showCancelButton && (
                <BaseButtonBlack onClick={handleCancel} style={{ background: "#ff4d4d", border: "none" }}>
                    Cancel Order
                </BaseButtonBlack>
            )}
            <BaseLinkGreen to={`/order_detail/${order.id}`}>View Detail</BaseLinkGreen>
        </div>
      </div>
    </OrderItemWrapper>
  );
};

export default OrderItem;

OrderItem.propTypes = {
  order: PropTypes.object,
};
