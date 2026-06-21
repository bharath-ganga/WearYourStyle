import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import styled from "styled-components";
import { Container } from "../../styles/styles";
import Title from "../../components/common/Title";
import Billing from "../../components/checkout/Billing";
import ShippingPayment from "../../components/checkout/ShippingPayment";
import { breakpoints, defaultTheme } from "../../styles/themes/default";

const CheckoutScreenWrapper = styled.main`
  padding: 48px 0;
  .horiz-line-separator {
    height: 1px;
    background-color: ${defaultTheme.color_anti_flash_white};
    max-width: 818px;
    margin: 30px 0;

    @media (max-width: ${breakpoints.sm}) {
      margin: 20px 0;
    }
  }
`;

const CheckoutScreen = () => {
  const navigate = useNavigate();
  const [billingDetails, setBillingDetails] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (!token) {
      toast.error("Please sign in to proceed to checkout.");
      navigate("/sign_in");
    }
  }, [navigate]);

  const handleBillingSubmit = (details) => {
    setBillingDetails(details);
  };

  return (
    <CheckoutScreenWrapper>
      <Container>
        <Title titleText={"Check Out"} />
        <Billing onBillingSubmit={handleBillingSubmit} />
        <div className="horiz-line-separator w-full"></div>
        {billingDetails && <ShippingPayment billingDetails={billingDetails} />}
      </Container>
    </CheckoutScreenWrapper>
  );
};

export default CheckoutScreen;
