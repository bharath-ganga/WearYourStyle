import styled from "styled-components";
import { Input } from "../../styles/form";
import { cardsData } from "../../data/data";
import { BaseButtonGreen } from "../../styles/button";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { currencyFormat } from "../../utils/helper";
import { useDispatch, useSelector } from "react-redux";
import { clearCart } from "../../redux/slices/cartSlice";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";

const ShippingPaymentWrapper = styled.div`
  .shipping-addr,
  .shipping-method,
  .payment-method {
    margin: 20px 0;

    &-title {
      margin-bottom: 8px;
    }

    .list-group {
      padding: 24px;
      background-color: ${defaultTheme.color_whitesmoke};
      max-width: 818px;
      margin-top: 24px;
      border-radius: 12px;

      @media (max-width: ${breakpoints.sm}) {
        padding: 16px;
        border-radius: 8px;
        margin-top: 16px;
      }
    }

    .list-group-item {
      column-gap: 20px;
    }
    .horiz-line-separator {
      margin: 20px 0;
      @media (max-width: ${breakpoints.sm}) {
        margin: 12px 0;
      }
    }
  }

  .payment-method {
    .list-group-item {
      &-head {
        column-gap: 20px;
      }
    }

    .payment-cards {
      gap: 20px;
      margin: 24px 0 30px 34px;

      @media (max-width: ${breakpoints.lg}) {
        gap: 16px;
      }

      @media (max-width: ${breakpoints.sm}) {
        margin-top: 16px;
        margin-bottom: 16px;
        gap: 10px;
        margin-left: 0;
      }
      .payment-card {
        position: relative;
        width: 80px;
        height: 46px;
        input {
          opacity: 0;
          position: absolute;
          top: 0;
          left: 0;
          width: 80px;
          height: 46px;
          z-index: 10;
          cursor: pointer;

          &:checked {
            & + .card-wrapper {
              .card-selected {
                position: absolute;
                top: -8px;
                right: -5px;
                width: 14px;
                height: 14px;
                display: inline-block;
              }
            }
          }
        }

        .card-wrapper {
          position: absolute;
          top: 0;
          left: 0;
          border-radius: 5px;
          border: 1px solid rgba(0, 0, 0, 0.1);

          .card-selected {
            display: none;
            transition: ${defaultTheme.default_transition};
          }
        }
      }
    }

    .payment-details {
      margin-left: 34px;
      display: grid;
      row-gap: 16px;

      @media (max-width: ${breakpoints.sm}) {
        margin-left: 0;
      }

      .form-elem-group {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 24px;
        @media (max-width: ${breakpoints.sm}) {
          grid-template-columns: 100%;
          gap: 0;
        }
      }

      .form-elem {
        height: 40px;
        border: 1px solid ${defaultTheme.color_platinum};
        border-radius: 6px;
        padding: 16px;

        &:focus {
          border-color: ${defaultTheme.color_sea_green};
        }

        @media (max-width: ${breakpoints.sm}) {
          margin-bottom: 10px;
          border-radius: 4px;
        }
      }
    }
  }

  .pay-now-btn {
    @media (max-width: ${breakpoints.sm}) {
      width: 100%;
    }
  }
`;

import { useState } from "react";

const ShippingPayment = ({ billingDetails }) => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { carts, totalAmount, discountPercent } = useSelector((state) => state.cart);
    const [paymentMethod, setPaymentMethod] = useState("");

    const getDeliveryDate = () => {
        const minDate = new Date();
        minDate.setDate(minDate.getDate() + 3);
        const maxDate = new Date();
        maxDate.setDate(maxDate.getDate() + 5);
        const options = { weekday: 'long', month: 'long', day: 'numeric' };
        return `Arrives between ${minDate.toLocaleDateString('en-US', options)} and ${maxDate.toLocaleDateString('en-US', options)}`;
    };

    const handlePayNow = async () => {
        if (carts.length === 0) {
            toast.error("Your cart is empty!");
            return;
        }
        if (!paymentMethod) {
            toast.error("Please select at least one mode of payment.");
            return;
        }

        try {
            const discountAmount = discountPercent > 0 ? (totalAmount * discountPercent) / 100 : 0;
            const finalAmount = totalAmount - discountAmount + 50;

            const transactionId = `TRX-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
            
            const orderData = {
                items: carts,
                totalAmount: finalAmount, 
                shippingAddress: billingDetails?.address || "Default Address", 
                paymentMethod: paymentMethod,
                status: "Order Placed", 
                delivery_date: getDeliveryDate(),
                userId: localStorage.getItem("userId") || "guest",
                userEmail: billingDetails?.email || localStorage.getItem("userEmail") || "Guest",
                phone: billingDetails?.phone || "N/A",
                payment_details: {
                    transaction_id: transactionId,
                    payment_type: paymentMethod,
                    customer_name: billingDetails?.name || localStorage.getItem("userName") || "Guest User",
                    timestamp: new Date().toISOString()
                }
            };

            await axios.post(`${API_BASE_URL}/api/orders/place`, orderData);
            
            const pts = Number(localStorage.getItem("loyaltyPoints") || 450);
            localStorage.setItem("loyaltyPoints", pts + 50);

            dispatch(clearCart());
            toast.success(`Order placed! Transaction ID: ${transactionId}`);
            navigate("/confirm");
        } catch (error) {
            console.error("Error placing order:", error);
            toast.error("Failed to place order. Please try again.");
        }
    };

  return (
    <ShippingPaymentWrapper>
      <div className="shipping-addr">
        <h3 className="text-xxl shipping-addr-title">Shipping Address</h3>
        <p className="text-base text-outerspace">
          Select the address that matches your card or payment method.
        </p>
        <div className="list-group">
          <div className="list-group-item flex flex-col items-start gap-2">
            <div className="flex items-center w-full">
                <Input type="radio" name="shipping_addr" className="mr-2" defaultChecked />
                <span className="font-semibold text-lg">
                Same as Billing address
                </span>
            </div>
            {billingDetails?.address && (
                <div style={{ marginLeft: '28px', padding: '12px', backgroundColor: '#eef2f6', border: '1px solid #cbd5e1', borderRadius: '6px', color: '#334155', fontSize: '14px', maxWidth: '400px' }}>
                    <div style={{ fontWeight: 'bold', marginBottom: '4px' }}>{billingDetails.name}</div>
                    <div><i className="bi bi-geo-alt-fill" style={{ marginRight: '6px', color: '#00a98f' }}></i>{billingDetails.address}</div>
                    <div style={{ marginTop: '4px' }}><i className="bi bi-telephone-fill" style={{ marginRight: '6px', color: '#00a98f' }}></i>{billingDetails.phone}</div>
                </div>
            )}
          </div>
          <div className="horiz-line-separator"></div>
          <div className="list-group-item flex items-center">
            <Input type="radio" name="shipping_addr" />
            <span className="font-semibold text-lg">
              Use a different shipping address
            </span>
          </div>
        </div>
      </div>
      <div className="shipping-method">
        <h3 className="text-xxl shipping-method-title">Shipping Method</h3>
        <p className="text-base text-outerspace">
          Select the delivery method.
        </p>
        <div className="list-group">
          <div className="list-group-item flex items-center">
            <span className="font-semibold text-lg">
              {getDeliveryDate()}
            </span>
          </div>
          <div className="horiz-line-separator"></div>
          <div className="list-group-item flex items-start justify-between">
            <p className="font-semibold text-lg">
              Delivery Charges &nbsp;
              <span className="flex text-base font-medium text-gray">
                Standard Shipping
              </span>
            </p>
            <span className="font-semibold text-lg">{currencyFormat(50)}</span>
          </div>
        </div>
      </div>

      <div className="payment-method">
        <h3 className="text-xxl payment-method-title">Payment Method</h3>
        <p className="text-base text-outerspace">
          All transactions are secure and encrypted.
        </p>
        <div className="list-group">
          <div className="list-group-item">
            <div className="flex items-center list-group-item-head">
              <Input
                type="radio"
                className="list-group-item-check"
                name="payment_method"
                value="Credit Card"
                checked={paymentMethod === "Credit Card"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <p className="font-semibold text-lg">
                Credit Card
                <span className="flex text-base font-medium text-gray">
                  We accept all major credit cards.
                </span>
              </p>
            </div>
            <div className="payment-cards flex flex-wrap">
              {cardsData?.map((card) => {
                return (
                  <div
                    className="payment-card flex items-center justify-center"
                    key={card.id}
                  >
                    <Input type="radio" name="payment_cards" />
                    <div className="card-wrapper bg-white w-full h-full flex items-center justify-center">
                      <img src={card.imgSource} alt="" />
                      <div className="card-selected text-sea-green">
                        <i className="bi bi-check-circle-fill"></i>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="payment-details">
              <div className="form-elem-group">
                <Input
                  type="text"
                  className="form-elem"
                  placeholder="Card number (16 digits)"
                  maxLength="16"
                  onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 16);
                  }}
                />
                <Input
                  type="text"
                  className="form-elem"
                  placeholder="NAME ON CARD"
                  style={{ textTransform: 'uppercase' }}
                  onChange={(e) => {
                      e.target.value = e.target.value.toUpperCase();
                  }}
                />
              </div>
              <div className="form-elem-group">
                <Input
                  type="text"
                  className="form-elem"
                  placeholder="Expiration date (MM/YY)"
                  maxLength="5"
                  onChange={(e) => {
                      let val = e.target.value.replace(/\D/g, '');
                      if (val.length >= 3) {
                          val = val.slice(0, 2) + '/' + val.slice(2, 4);
                      }
                      e.target.value = val;
                  }}
                />
                <Input
                  type="text"
                  className="form-elem"
                  placeholder="CVV"
                  maxLength="4"
                  onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                  }}
                />
              </div>
            </div>
          </div>

          <div className="horiz-line-separator"></div>
          <div className="list-group-item flex items-center">
            <Input
              type="radio"
              className="list-group-item-check"
              name="payment_method"
              value="Cash on delivery"
              checked={paymentMethod === "Cash on delivery"}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <p className="font-semibod text-lg">
              Cash on delivery
              <span className="flex text-base font-medium text-gray">
                Pay with cash upon delivery.
              </span>
            </p>
          </div>
          <div className="horiz-line-separator"></div>
          <div className="list-group-item flex items-center">
            <Input
              type="radio"
              className="list-group-item-check"
              name="payment_method"
              value="PayPal"
              checked={paymentMethod === "PayPal"}
              onChange={(e) => setPaymentMethod(e.target.value)}
            />
            <p className="font-semibod text-lg">PayPal</p>
          </div>
          <div className="horiz-line-separator"></div>
          <div className="list-group-item">
            <div className="flex items-center list-group-item-head">
              <Input
                type="radio"
                className="list-group-item-check"
                name="payment_method"
                value="UPI"
                checked={paymentMethod === "UPI"}
                onChange={(e) => setPaymentMethod(e.target.value)}
              />
              <div className="flex flex-col">
                <p className="font-semibold text-lg">UPI</p>
                <span className="flex text-base font-medium text-gray">
                  Pay using Google Pay, PhonePe, Paytm, etc.
                </span>
              </div>
            </div>
            {paymentMethod === "UPI" && (
              <div className="payment-details" style={{ marginTop: '20px' }}>
                <div className="form-elem-group" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Input 
                        type="text" 
                        className="form-elem" 
                        placeholder="10-digit mobile number" 
                        maxLength="10"
                        style={{ flex: 2 }}
                        onChange={(e) => {
                            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 10);
                        }}
                    />
                    <span style={{ fontWeight: 'bold', fontSize: '18px', color: '#555' }}>@</span>
                    <select className="form-elem" style={{ flex: 1, padding: '0 10px', height: '40px', borderRadius: '4px', border: '1px solid #e2e8f0' }}>
                        <option value="okaxis">okaxis</option>
                        <option value="okhdfcbank">okhdfcbank</option>
                        <option value="oksbi">oksbi</option>
                        <option value="okicici">okicici</option>
                        <option value="ybl">ybl (Yes Bank)</option>
                        <option value="ibl">ibl (ICICI Bank)</option>
                        <option value="axl">axl (Axis Bank)</option>
                        <option value="paytm">paytm</option>
                        <option value="airtel">airtel</option>
                        <option value="apl">apl (Amazon Pay)</option>
                    </select>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      <BaseButtonGreen onClick={handlePayNow} className="pay-now-btn">
        Pay Now
      </BaseButtonGreen>
    </ShippingPaymentWrapper>
  );
};

export default ShippingPayment;
