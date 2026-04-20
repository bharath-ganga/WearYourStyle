import styled from "styled-components";
import { Container } from "../../styles/styles";
import Breadcrumb from "../../components/common/Breadcrumb";
import { UserContent, UserDashboardWrapper } from "../../styles/user";
import UserMenu from "../../components/user/UserMenu";
import Title from "../../components/common/Title";
import { FormElement, Input } from "../../styles/form";
import { BaseLinkGreen } from "../../styles/button";
import { Link, useNavigate } from "react-router-dom";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";

const AccountScreenWrapper = styled.main`
  .address-list {
    margin-top: 20px;
    grid-template-columns: repeat(2, 1fr);
    gap: 25px;

    @media (max-width: ${breakpoints.lg}) {
      grid-template-columns: repeat(1, 1fr);
    }
  }

  .address-item {
    border-radius: 12px;
    border: 1px solid rgba(0, 0, 0, 0.1);
    padding: 25px;
    row-gap: 8px;
  }

  .address-tags {
    gap: 12px;

    li {
      height: 28px;
      border-radius: 8px;
      padding: 2px 12px;
      background-color: ${defaultTheme.color_whitesmoke};
    }
  }

  .address-btns {
    margin-top: 12px;
    .btn-separator {
      width: 1px;
      border-radius: 50px;
      background: ${defaultTheme.color_platinum};
      margin: 0 10px;
    }
  }
`;

const breadcrumbItems = [
  {
    label: "Home",
    link: "/",
  },
  { label: "Account", link: "/account" },
];

const AccountScreen = () => {
  const [user, setUser] = useState();
  const [add, setAdd] = useState();
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
      useEffect(() => {
        const authenticateUser = async () => {
            try {
                const token = localStorage.getItem("accessToken");
                if (!token) {
                    navigate("/sign_in");
                    toast.error("Please Log In first!");
                    return;
                }
                const response = await axios.get(`${API_BASE_URL}/api/profile`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });
              const userData = response.data.data.user;
              console.log(userData);
              setUser(userData);
              setAdd(userData.addresses || []);
            }
            catch (err) {
                console.log("Error:", err);
                localStorage.removeItem("accessToken");
                localStorage.removeItem("userId");
                toast.error("Please login again to access your account.");
                navigate("/sign_in");
            } finally {
                setLoading(false);
            }
        }
        authenticateUser();
      }, [navigate]);
      
  if (loading) {
    return (
      <AccountScreenWrapper className="page-py-spacing">
        <Container>
          <Breadcrumb items={breadcrumbItems} />
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <h4>Loading account details...</h4>
          </div>
        </Container>
      </AccountScreenWrapper>
    );
  }

  return (
    <>
      {user && (
        <AccountScreenWrapper className="page-py-spacing">
          <Container>
            <Breadcrumb items={breadcrumbItems} />
            <UserDashboardWrapper>
              <UserMenu />
              <UserContent>
                <Title titleText={"My Account"} />

                {/* GAMIFICATION WIDGET */}
                <div style={{
                    background: 'linear-gradient(45deg, #FFD700, #FFA500)', 
                    borderRadius: '12px', padding: '20px', color: 'white', 
                    marginBottom: '25px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    boxShadow: '0 4px 15px rgba(255, 165, 0, 0.3)'
                }}>
                    <div>
                        <h3 style={{fontSize: '24px', fontWeight: 'bold', margin: '0 0 5px 0'}}><i className="bi bi-trophy"></i> Elite Stylist</h3>
                        <p style={{margin: 0, fontSize: '16px'}}>You have <strong>{Number(localStorage.getItem('loyaltyPoints') || 450)}</strong> Loyalty Points.</p>
                        <small>Earn 500 points for a ₹500 voucher!</small>
                    </div>
                    <button style={{background: 'white', color: '#FFA500', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 'bold', cursor: 'pointer'}}>
                        Redeem
                    </button>
                </div>

                <h4 className="title-sm">Contact Details</h4>
                <form>
                  <div className="form-wrapper">
                    <FormElement className="form-elem">
                      <label
                        htmlFor=""
                        className="form-label font-semibold text-base"
                      >
                        Your Name
                      </label>
                      <div className="form-input-wrapper flex items-center">
                        <Input
                          type="text"
                          className="form-elem-control text-outerspace font-semibold"
                          value={(user.firstName || "Guest") + (user.lastName ? " " + user.lastName : "")}
                          readOnly
                        />
                        <button type="button" className="form-control-change-btn">
                          Change
                        </button>
                      </div>
                    </FormElement>
                    <FormElement className="form-elem">
                      <label
                        htmlFor=""
                        className="form-label font-semibold text-base"
                      >
                        Email Address
                      </label>
                      <div className="form-input-wrapper flex items-center">
                        <Input
                          type="email"
                          className="form-elem-control text-outerspace font-semibold"
                          value={user.email || "No email provided"}
                          readOnly
                        />
                        <button type="button" className="form-control-change-btn">
                          Change
                        </button>
                      </div>
                    </FormElement>
                    <FormElement className="form-elem">
                      <label
                        htmlFor=""
                        className="form-label font-semibold text-base"
                      >
                        Phone Number
                      </label>
                      <div className="form-input-wrapper flex items-center">
                        <Input
                          type="text"
                          className="form-elem-control text-outerspace font-semibold"
                          value={user.phone || user.phoneNumber || "Not present"}
                          readOnly
                        />
                        <button type="button" className="form-control-change-btn">
                          Change
                        </button>
                      </div>
                    </FormElement>
                  </div>
                </form>
                <div>
                  <h4 className="title-sm" style={{ marginTop: '40px' }}>Recent Orders</h4>
                  <div style={{ 
                      background: '#fcfcfc', 
                      border: '1px solid #eee', 
                      borderRadius: '12px', 
                      padding: '20px',
                      marginBottom: '30px'
                  }}>
                      <div className="flex justify-between items-center mb-4">
                          <p className="text-gray italic">View your most recent orders here.</p>
                          <Link to="/order" className="text-sea-green font-bold hover:underline">View All Orders</Link>
                      </div>
                      
                      {/* Recent Order Preview Widget */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '15px' }}>
                          <div style={{ 
                              display: 'flex', 
                              alignItems: 'center', 
                              gap: '15px', 
                              padding: '15px',
                              backgroundColor: 'white',
                              borderRadius: '8px',
                              border: '1px solid #efefef',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                          }}>
                              <div style={{ width: '60px', height: '60px', borderRadius: '6px', overflow: 'hidden', backgroundColor: '#f5f5f5' }}>
                                  <img src={staticImages.product1 || "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&q=80&w=100"} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                              </div>
                              <div style={{ flex: 1 }}>
                                  <h5 style={{ margin: 0, fontSize: '16px' }}>Blue Flower Print Crop Top</h5>
                                  <p style={{ margin: 0, color: '#888', fontSize: '14px' }}>Order #ORD-1776679422663 • Dec 12, 2024</p>
                              </div>
                              <div style={{ textAlign: 'right' }}>
                                  <span style={{ 
                                      display: 'inline-block',
                                      padding: '4px 10px',
                                      borderRadius: '20px',
                                      fontSize: '12px',
                                      fontWeight: 'bold',
                                      backgroundColor: '#e6fffa',
                                      color: '#00a98f',
                                      marginBottom: '5px'
                                  }}>In Progress</span>
                                  <div>
                                      <Link to="/order" className="text-sm font-bold text-gray hover:text-black">View Details</Link>
                                  </div>
                              </div>
                          </div>
                      </div>
                  </div>

                  <h4 className="title-sm">My Contact Address</h4>
                  <BaseLinkGreen to="/account/add" className="btn-add-address" style={{ marginBottom: "20px", display: "inline-block" }}>Add Address</BaseLinkGreen>
                  <div className="address-list grid">
                    {add && add.map(item => (
                      <div className="address-item grid" key={item.id || Math.random()}>
                      <p className="text-outerspace text-lg font-semibold address-title">
                        {item.firstName || "Unnamed Address"}
                      </p>
                      <p className="text-gray text-base font-medium address-description">
                       {item.street || ""}, {item.city || ""}, {item.state || ""}
                      </p>
                      <div className="address-btns flex">
                        <Link
                          to="/"
                          className="text-base text-outerspace font-semibold"
                        >
                          Remove
                        </Link>
                        <div className="btn-separator"></div>
                        <Link
                          to="/"
                          className="text-base text-outerspace font-semibold"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                    ))}
                    <div className="address-item grid">
                      <p className="text-outerspace text-lg font-semibold address-title">
                        {user.firstName || "Primary Address"}
                      </p>
                      <p className="text-gray text-base font-medium address-description">
                       {user.street || "No street info"}, {user.city || "No city info"}, {user.state || "No state info"}
                      </p>
                      <ul className="address-tags flex flex-wrap">
                        {user.defaultAdd && (
                        <li className="text-gray text-base font-medium inline-flex items-center justify-center">
                          Default billing address
                        </li>
                        )}
                      </ul>
                      <div className="address-btns flex">
                        <Link
                          to="/"
                          className="text-base text-outerspace font-semibold"
                        >
                          Remove
                        </Link>
                        <div className="btn-separator"></div>
                        <Link
                          to="/"
                          className="text-base text-outerspace font-semibold"
                        >
                          Edit
                        </Link>
                      </div>
                    </div>
                  </div>
                </div>
              </UserContent>
            </UserDashboardWrapper>
          </Container>
        </AccountScreenWrapper>
      )}
    </>
  );
};

export default AccountScreen;
