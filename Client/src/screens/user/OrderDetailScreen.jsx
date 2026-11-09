import styled from "styled-components";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import { UserContent, UserDashboardWrapper } from "../../styles/user";
import UserMenu from "../../components/user/UserMenu";
import { Link, useNavigate, useParams } from "react-router-dom";
import Title from "../../components/common/Title";
import { currencyFormat } from "../../utils/helper";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import OrderStatusTracker from "../../components/common/OrderStatusTracker";
import ColorSwatch from "../../components/common/ColorSwatch";

// How far along the road the parcel is (percent) for each in-progress status.
// Delivered, cancelled and returned orders don't show the map.
const DELIVERY_PROGRESS = { "Order Placed": 0, pending: 0, Confirmed: 10, Shipped: 45, "Out for delivery": 80 };
const CANCELLABLE = ["Order Placed", "Confirmed", "pending"];

const OrderDetailScreenWrapper = styled.main`
  .btn-and-title-wrapper {
    margin-bottom: 24px;
    .title {
      margin-bottom: 0;
    }

    .btn-go-back {
      margin-right: 12px;
      transition: ${defaultTheme.default_transition};

      &:hover {
        margin-right: 16px;
      }
    }
  }

  .order-d-top {
    background-color: ${defaultTheme.color_whitesmoke};
    padding: 26px 32px;
    border-radius: 0;
    border: 1px solid rgba(0, 0, 0, 0.05);

    @media (max-width: ${breakpoints.sm}) {
      flex-direction: column;
      row-gap: 12px;
    }
  }
`;

const OrderDetailStatusWrapper = styled.div`
  margin: 0 36px;
  @media (max-width: ${breakpoints.sm}) {
    margin: 0 10px;
    overflow-x: scroll;
  }

  .order-status {
    height: 4px;
    margin: 50px 0;
    max-width: 580px;
    width: 340px;
    margin-left: auto;
    margin-right: auto;
    position: relative;
    margin-bottom: 70px;

    @media (max-width: ${breakpoints.sm}) {
      margin-right: 40px;
      margin-left: 40px;
    }

    &-dot {
      width: 20px;
      height: 20px;
      border-radius: 0;
      position: absolute;
      top: 50%;
      transform: translateY(-50%);

      &:nth-child(1) {
        left: 0;
      }

      &:nth-child(2) {
        left: calc(33.3333% - 10px);
      }

      &:nth-child(3) {
        left: calc(66.6666% - 10px);
      }
      &:nth-child(4) {
        right: 0;
      }

      &.status-done {
        background-color: ${defaultTheme.color_outerspace};
        .order-status-text {
          color: ${defaultTheme.color_outerspace};
        }
      }

      &.status-current {
        position: absolute;
        &::after {
          content: "";
          position: absolute;
          width: 12px;
          height: 12px;
          background-color: ${defaultTheme.color_outerspace};
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
          z-index: 30;
          border-radius: 0;
        }

        .order-status-text {
          color: ${defaultTheme.color_outerspace};
        }
      }
    }

    &-text {
      position: absolute;
      top: calc(100% + 8px);
      left: 50%;
      transform: translateX(-50%);
    }
  }
`;

const OrderDetailMessageWrapper = styled.div`
  background-color: ${defaultTheme.color_whitesmoke};
  max-width: 748px;
  margin-right: auto;
  margin-left: auto;
  min-height: 68px;
  padding: 16px 24px;
  border-radius: 0;
  position: relative;
  margin-top: 80px;

  &::after {
    content: "";
    position: absolute;
    top: -34px;
    left: 20%;
    border-bottom: 22px solid ${defaultTheme.color_whitesmoke};
    border-top: 18px solid transparent;
    border-left: 18px solid transparent;
    border-right: 18px solid transparent;
  }

  @media (max-width: ${breakpoints.sm}) {
    margin-top: 10px;
  }
`;

const OrderDetailListWrapper = styled.div`
  padding: 24px;
  margin-top: 40px;
  border: 1px solid rgba(0, 0, 0, 0.05);

  @media (max-width: ${defaultTheme.md}) {
    padding: 18px;
  }

  @media (max-width: ${defaultTheme.md}) {
    padding: 12px;
  }

  .order-d-item {
    grid-template-columns: 80px 1fr 1fr 32px;
    gap: 20px;
    padding: 12px 0;
    border-bottom: 1px solid ${defaultTheme.color_whitesmoke};
    position: relative;

    @media (max-width: ${defaultTheme.xl}) {
      grid-template-columns: 80px 3fr 2fr 32px;
      padding: 16px 0;
      gap: 16px;
    }

    @media (max-width: ${defaultTheme.sm}) {
      grid-template-columns: 50px 3fr 2fr;
      gap: 16px;
    }

    @media (max-width: ${defaultTheme.xs}) {
      grid-template-columns: 100%;
      gap: 12px;
    }

    &:first-child {
      padding-top: 0;
    }

    &:last-child {
      padding-bottom: 0;
      border-bottom: 0;
    }

    &-img {
      width: 80px;
      height: 80px;
      border-radius: 0;
      overflow: hidden;
      box-shadow: none;

      @media (max-width: ${breakpoints.sm}) {
        width: 50px;
        height: 50px;
      }

      @media (max-width: ${breakpoints.sm}) {
        width: 100%;
        height: 100%;
      }
    }

    &-calc {
      p {
        display: inline-block;
        margin-right: 50px;

        @media (max-width: ${defaultTheme.lg}) {
          margin-right: 20px;
        }
      }
    }

    &-btn {
      margin-bottom: auto;
      &:hover {
        color: ${defaultTheme.color_sea_green};
      }

      @media (max-width: ${breakpoints.sm}) {
        position: absolute;
        right: 0;
        top: 10px;
      }

      @media (max-width: ${defaultTheme.xs}) {
        width: 28px;
        height: 28px;
        z-index: 5;
        background-color: ${defaultTheme.color_white};
        border-radius: 0;
        right: 8px;
        top: 24px;
      }
    }
  }
`;

const breadcrumbItems = [
  { label: "Home", link: "/" },
  { label: "Order", link: "/order" },
  { label: "Order Details", link: "/order" },
];

const OrderDetailScreen = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  const updateOrder = async (action, body = {}) => {
    try {
      const token = localStorage.getItem("accessToken");
      const response = await axios.patch(`${API_BASE_URL}/api/orders/${action}/${id}`, body, { headers:{ Authorization:`Bearer ${token}` } });
      setOrder(response.data.data);
      toast.success(action === "return" ? "Return requested" : "Order cancelled");
    } catch (error) { toast.error(error.response?.data?.message || "Could not update order"); }
  };

  const downloadInvoice = () => {
    const rows = order.items.map((item) => `<tr><td>${item.title || item.name}</td><td>${item.quantity}</td><td>₹${Number(item.price).toFixed(2)}</td></tr>`).join("");
    const html = `<!doctype html><meta charset="utf-8"><title>Invoice ${order.order_no}</title><style>body{font-family:Arial;padding:40px;color:#263333}h1{margin-bottom:4px}table{width:100%;border-collapse:collapse;margin:30px 0}td,th{padding:12px;border-bottom:1px solid #ddd;text-align:left}</style><h1>WearYourStyle</h1><p>Invoice ${order.order_no} · ${order.order_date}</p><p>${order.userEmail}<br>${order.shippingAddress}</p><table><tr><th>Item</th><th>Qty</th><th>Price</th></tr>${rows}</table><h2>Total: ₹${Number(order.totalAmount).toFixed(2)}</h2>`;
    const url = URL.createObjectURL(new Blob([html], { type:"text/html" }));
    const link = document.createElement("a"); link.href=url; link.download=`${order.order_no}-invoice.html`; link.click(); URL.revokeObjectURL(url);
  };

  useEffect(() => {
    const authenticateUserAndFetchOrder = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        if (!token) {
          navigate("/sign_in");
          toast.error("Please Log In first!");
          return;
        }

        // Fetch user profile
        const userRes = await axios.get(`${API_BASE_URL}/api/profile`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setUser(userRes.data.user);

        // Fetch Order Details
        if (id) {
            const orderRes = await axios.get(`${API_BASE_URL}/api/orders/${id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (orderRes.data.success) {
                setOrder(orderRes.data.data);
            }
        }
      } catch (err) {
        console.error("Error:", err);
      } finally {
        setLoading(false);
      }
    };
    authenticateUserAndFetchOrder();
  }, [id, navigate]);

  if (loading) {
      return (
          <OrderDetailScreenWrapper className="page-py-spacing">
              <Container><p className="py-20 text-center">Loading Order...</p></Container>
          </OrderDetailScreenWrapper>
      );
  }

  if (!order) {
      return (
          <OrderDetailScreenWrapper className="page-py-spacing">
              <Container>
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                    <p className="text-xl text-red-500 font-bold mb-4">Order not found.</p>
                    <p className="text-gray mb-6">We couldn't find the order you're looking for. It may have been removed or you may have entered an incorrect ID.</p>
                    <Link to="/order" style={{ 
                        display: 'inline-block',
                        padding: '12px 24px',
                        backgroundColor: '#3c4242',
                        color: 'white',
                        borderRadius: 0,
                        fontWeight: '600'
                    }}>Go Back to My Orders</Link>
                </div>
              </Container>
          </OrderDetailScreenWrapper>
      );
  }

  const getStatusClass = (stepStatus) => {
      const statuses = ["Order Placed", "Shipped", "Delivered"];
      const currentIndex = statuses.indexOf(order.status || "Order Placed");
      const stepIndex = statuses.indexOf(stepStatus);

      if (stepIndex < currentIndex) return "status-done";
      if (stepIndex === currentIndex) return "status-current";
      return "";
  };
  
  return (
    <OrderDetailScreenWrapper className="page-py-spacing">
      <Container>
        <Breadcrumb items={breadcrumbItems} />
        <UserDashboardWrapper>
          <UserMenu />
          <UserContent>
            <div className="flex items-center justify-start btn-and-title-wrapper">
              <Link
                to="/order"
                className="btn-go-back inline-flex items-center justify-center text-xxl"
              >
                <i className="bi bi-chevron-left"></i>
              </Link>
              <Title titleText={"Order Details"} />
            </div>

              <div className="order-d-wrapper">
              <div style={{ display:"flex", gap:10, justifyContent:"flex-end", marginBottom:16, flexWrap:"wrap" }}><button type="button" onClick={downloadInvoice} style={{border:"1px solid #263333",borderRadius: 0,padding:"10px 16px",fontWeight:700}}>Download invoice</button>{CANCELLABLE.includes(order.status) && <button type="button" onClick={()=>updateOrder("cancel")} style={{border:"1px solid #b42318",color:"#b42318",borderRadius: 0,padding:"10px 16px",fontWeight:700}}>Cancel order</button>}{order.status === "Delivered" && <button type="button" onClick={()=>updateOrder("return",{reason:"Customer requested return"})} style={{border:"1px solid #263333",borderRadius: 0,padding:"10px 16px",fontWeight:700}}>Request return</button>}</div>
              <div className="order-d-top flex justify-between items-start">
                <div className="order-d-top-l">
                  <h4 className="text-3xl order-d-no">
                    Order no: {order.order_no}
                  </h4>
                  <p className="text-lg font-medium text-gray">
                    Placed on {new Date(order.order_date || order.createdAt).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>
                <div className="order-d-top-r text-xxl text-gray font-semibold">
                  Total: <span className="text-outerspace">{currencyFormat(order.totalAmount)}</span>
                </div>
              </div>

              <div style={{ marginTop: '40px', marginBottom: '80px' }}>
                  <OrderStatusTracker currentStatus={order.status} />
              </div>
              
              <OrderDetailMessageWrapper className="order-message flex items-center justify-start">
                <p className="font-semibold text-gray">
                  Delivery expected by &nbsp;
                  <span className="text-outerspace">
                    {order.delivery_date || "TBD"}
                  </span>
                </p>
              </OrderDetailMessageWrapper>

              {/* Delivery progress map, driven by the order status */}
              {DELIVERY_PROGRESS[order.status] !== undefined && (() => {
                const progress = DELIVERY_PROGRESS[order.status];
                const vehicleLeft = `${10 + progress * 0.8}%`;
                return (
                <div style={{ marginTop: '40px', padding: '30px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                       <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', marginRight: '10px' }}></div>
                       <h4 className="text-xl font-bold m-0" style={{ color: '#0f172a' }}>Delivery progress</h4>
                    </div>

                    <div style={{ height: '140px', backgroundColor: '#e2e8f0', position: 'relative', overflow: 'hidden' }}>
                        {/* Road */}
                        <div style={{ position: 'absolute', top: '50%', left: '10%', right: '10%', height: '6px', transform: 'translateY(-50%)',
                            background: 'repeating-linear-gradient(90deg, #94a3b8, #94a3b8 10px, transparent 10px, transparent 20px)' }}></div>
                        {/* Distance covered */}
                        <div style={{ position: 'absolute', top: '50%', left: '10%', width: `${progress * 0.8}%`, height: '6px', backgroundColor: '#10b981', transform: 'translateY(-50%)', zIndex: 1 }}></div>

                        {/* Warehouse marker */}
                        <div style={{ position: 'absolute', top: '50%', left: '10%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                            <div style={{ width: '20px', height: '20px', backgroundColor: '#334155', border: '4px solid white' }}></div>
                            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', padding: '4px 10px', backgroundColor: '#334155', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>Warehouse</div>
                        </div>

                        {/* Destination marker */}
                        <div style={{ position: 'absolute', top: '50%', right: '10%', transform: 'translate(50%, -50%)', zIndex: 2 }}>
                            <div style={{ width: '24px', height: '24px', backgroundColor: '#ef4444', border: '4px solid white' }}></div>
                            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', padding: '4px 10px', backgroundColor: '#ef4444', color: 'white', fontSize: '13px', fontWeight: 'bold' }}>You</div>
                        </div>

                        {/* Vehicle */}
                        <div style={{ position: 'absolute', top: '50%', left: vehicleLeft, transform: 'translate(-50%, -50%)', zIndex: 4 }}>
                             <div style={{ padding: '8px', backgroundColor: 'white', display: 'flex', justifyContent: 'center', alignItems: 'center', border: '3px solid #10b981' }}>
                                <i className="bi bi-truck text-2xl" style={{ color: '#10b981' }}></i>
                             </div>
                        </div>
                    </div>
                </div>
                );
              })()}

              <OrderDetailListWrapper className="order-d-list">
                {order.items?.map((item, index) => {
                  return (
                    <div className="order-d-item grid" key={item.id || index}>
                      <div className="order-d-item-img">
                        <img
                          src={item.imgSource}
                          alt={item.title || item.name}
                          className="object-fit-cover"
                        />
                      </div>
                      <div className="order-d-item-info">
                        <p className="text-xl font-bold">{item.title || item.name}</p>
                        <p className="text-md font-bold">
                          Colour: &nbsp;<ColorSwatch color={item.color} />
                          {item.size && <span className="font-medium text-gray">&nbsp; Size: {item.size}</span>}
                        </p>
                      </div>
                      <div className="order-d-item-calc">
                        <p className="font-bold text-lg">
                          Qty: &nbsp;
                          <span className="text-gray">{item.quantity}</span>
                        </p>
                        <p className="font-bold text-lg">
                          Price: &nbsp;
                          <span className="text-gray">
                            {currencyFormat(item.price)}
                          </span>
                        </p>
                      </div>
                    </div>
                  );
                })}
              </OrderDetailListWrapper>
            </div>
          </UserContent>
        </UserDashboardWrapper>
      </Container>
    </OrderDetailScreenWrapper>
  );
};

export default OrderDetailScreen;
