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
    border-radius: 8px;
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
      border-radius: 50%;
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
          border-radius: 50%;
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
  border-radius: 8px;
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
      border-radius: 8px;
      overflow: hidden;
      box-shadow: rgba(149, 157, 165, 0.2) 0px 8px 24px;

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
        border-radius: 50%;
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
                        borderRadius: '8px',
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
              <div className="order-d-top flex justify-between items-start">
                <div className="order-d-top-l">
                  <h4 className="text-3xl order-d-no">
                    Order no: {order.order_no}
                  </h4>
                  <p className="text-lg font-medium text-gray">
                    Placed On {order.order_date}
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

              {/* SIMULATED LIVE TRACKER MAP (CSS Animations) */}
              {order.status !== "Delivered" && (
                <div style={{
                    marginTop: '40px', padding: '30px', backgroundColor: '#f8fafc',
                    borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 10px 25px rgba(0,0,0,0.05)', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '20px' }}>
                       <div style={{ width: '12px', height: '12px', backgroundColor: '#10b981', borderRadius: '50%', marginRight: '10px', boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.2)' }}></div>
                       <h4 className="text-xl font-bold m-0" style={{ color: '#0f172a' }}>Live Tracking</h4>
                    </div>

                    <div style={{height: '140px', backgroundColor: '#e2e8f0', borderRadius: '12px', position: 'relative', overflow: 'hidden', boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.06)' }}>
                        {/* Moving dashed road line */}
                        <div style={{
                            position: 'absolute', top:'50%', left: '10%', right: '10%', height: '6px', 
                            background: 'repeating-linear-gradient(90deg, #94a3b8, #94a3b8 10px, transparent 10px, transparent 20px)', 
                            transform:'translateY(-50%)', borderRadius:'4px',
                            animation: 'moveRoad 1s linear infinite'
                        }}></div>
                        
                        {/* Progress line filling up the road */}
                        <div style={{
                            position: 'absolute', top:'50%', left: '10%', height: '6px', backgroundColor: '#10b981', transform:'translateY(-50%)', borderRadius:'4px',
                            animation: 'fillRoad 10s ease-in-out infinite alternate', zIndex: 1
                        }}></div>

                        {/* Warehouse Marker */}
                        <div style={{position: 'absolute', top:'50%', left: '10%', transform: 'translate(-50%, -50%)', zIndex: 2 }}>
                            <div style={{ position: 'relative', width: '20px', height: '20px', backgroundColor: '#334155', borderRadius: '50%', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}></div>
                            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', padding: '4px 10px', backgroundColor: '#334155', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>Warehouse</div>
                        </div>

                        {/* Destination Marker */}
                        <div style={{position: 'absolute', top:'50%', right: '10%', transform: 'translate(50%, -50%)', zIndex: 2}}>
                            <div style={{ position: 'relative' }}>
                                <div style={{ width: '24px', height: '24px', backgroundColor: '#ef4444', borderRadius: '50%', border: '4px solid white', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                                <div style={{ width: '40px', height: '40px', backgroundColor: 'rgba(239, 68, 68, 0.2)', borderRadius: '50%', animation: 'pulse 1.5s infinite', position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}></div>
                            </div>
                            <div style={{ position: 'absolute', top: '-40px', left: '50%', transform: 'translateX(-50%)', padding: '4px 10px', backgroundColor: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '13px', fontWeight: 'bold' }}>You</div>
                        </div>

                        {/* Vehicle */}
                        <style>{`
                            @keyframes driveVehicle {
                                0% { left: 10%; transform: translate(-50%, -50%) translateY(0); }
                                25% { transform: translate(-50%, -50%) translateY(-3px); }
                                50% { left: 50%; transform: translate(-50%, -50%) translateY(0); }
                                75% { transform: translate(-50%, -50%) translateY(-3px); }
                                100% { left: 88%; transform: translate(-50%, -50%) translateY(0); }
                            }
                            @keyframes fillRoad {
                                0% { width: 0%; }
                                100% { width: 78%; }
                            }
                            @keyframes moveRoad {
                                0% { background-position: 0 0; }
                                100% { background-position: -20px 0; }
                            }
                            @keyframes pulse {
                                0% { transform: translate(-50%, -50%) scale(0.8); opacity: 0.8; }
                                100% { transform: translate(-50%, -50%) scale(1.5); opacity: 0; }
                            }
                        `}</style>
                        <div style={{
                            position: 'absolute', top: '50%', zIndex: 4,
                            animation: 'driveVehicle 10s ease-in-out infinite alternate'
                        }}>
                             <div style={{
                                 padding: '8px', backgroundColor: 'white', borderRadius: '50%',
                                 boxShadow: '0 4px 8px rgba(0,0,0,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center',
                                 border: '3px solid #10b981'
                             }}>
                                <i className="bi bi-truck text-2xl" style={{ color: '#10b981' }}></i>
                             </div>
                        </div>
                    </div>
                </div>
              )}

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
                          Color: &nbsp;
                          <span className="font-medium text-gray">
                            {item.color}
                          </span>
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
