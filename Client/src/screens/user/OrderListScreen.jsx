import styled from "styled-components";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import { UserContent, UserDashboardWrapper } from "../../styles/user";
import UserMenu from "../../components/user/UserMenu";
import Title from "../../components/common/Title";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { orderData } from "../../data/data";
import OrderItemList from "../../components/user/OrderItemList";
import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";

const OrderListScreenWrapper = styled.div`
  .order-tabs-contents {
    margin-top: 40px;
  }
  .order-tabs-head {
    min-width: 170px;
    padding: 12px 0;
    border-bottom: 3px solid ${defaultTheme.color_whitesmoke};

    &.order-tabs-head-active {
      border-bottom-color: ${defaultTheme.color_outerspace};
    }

    @media (max-width: ${breakpoints.lg}) {
      min-width: 120px;
    }

    @media (max-width: ${breakpoints.xs}) {
      min-width: 80px;
    }
  }
`;

const breadcrumbItems = [
  { label: "Home", link: "/" },
  { label: "Order", link: "/order" },
];

const OrderListScreen = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = localStorage.getItem("accessToken");
        const userId = localStorage.getItem("userId");
        if (!token) {
          navigate("/sign_in");
          toast.error("Please Log In first!");
          return;
        }
        
        const response = await axios.get(`${API_BASE_URL}/api/orders/my-orders?userId=${userId}`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });
        
        if (response.data.success) {
            setOrders(response.data.data);
        }
      }
      catch (err) {
        console.log("Error fetching orders:", err);
      } finally {
          setLoading(false);
      }
    }
    fetchOrders();
  }, [navigate]);

  return (
    <OrderListScreenWrapper className="page-py-spacing">
      <Container>
        <Breadcrumb items={breadcrumbItems} />
        <UserDashboardWrapper>
          <UserMenu />
          <UserContent>
            <Title titleText={"My Orders"} />
            <div className="order-tabs">
              <div className="order-tabs-heads">
                <button
                  type="button"
                  className="order-tabs-head text-xl italic order-tabs-head-active"
                  data-id="active"
                >
                  Active
                </button>
              </div>

              <div className="order-tabs-contents">
                <div className="order-tabs-content" id="active">
                    {loading ? (
                        <p>Loading orders...</p>
                    ) : orders.length > 0 ? (
                        <OrderItemList orders={orders} />
                    ) : (
                        <div className="py-20 text-center flex flex-col justify-center items-center gap-4">
                            <p className="text-xl text-gray">No orders found.</p>
                            <Link to="/product" style={{ backgroundColor: '#3c4242', color: 'white', padding: '10px 24px', borderRadius: '8px', fontWeight: 'bold' }}>Start Shopping</Link>
                        </div>
                    )}
                </div>
              </div>
            </div>
          </UserContent>
        </UserDashboardWrapper>
      </Container>
    </OrderListScreenWrapper>
  );
};

export default OrderListScreen;
