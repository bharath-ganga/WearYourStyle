import styled from "styled-components";
import { Link } from "react-router-dom";
import { Container } from "../../styles/styles";
import { staticImages } from "../../utils/images";
import { BaseLinkGreen } from "../../styles/button";
import { defaultTheme } from "../../styles/themes/default";

const ConfirmScreenWrapper = styled.main`
  margin: 24px 0;

  .confirm-img {
    width: 240px;
    overflow: hidden;
  }

  .confirm-msg {
    border: 2px solid ${defaultTheme.color_outerspace};
    border-radius: 6px;
    padding: 24px 0;
    margin-top: 16px;
    max-width: 400px;
    gap: 12px;
  }
`;

const ConfirmScreen = () => {
  return (
    <ConfirmScreenWrapper className="page-py-spacing">
      <Container>
        <div className="confirm-content flex items-center justify-center flex-col">
          <div className="confirm-img">
            <img
              src={staticImages.confirmed_img}
              alt=""
              className="object-fit-cover"
            />
          </div>
          <div className="confirm-msg w-full flex flex-col justify-center items-center">
            <p className="text-4xl font-semibold text-outerspace">
              Your Order is Confirmed
            </p>
            <div className="flex gap-2">
              <BaseLinkGreen to="/">Continue Shopping</BaseLinkGreen>
              <Link to="/order" className="btn text-base font-semibold" style={{ border: "1px solid #3c4242", padding: "8px 16px", borderRadius: "4px" }}>View Order</Link>
            </div>
          </div>
        </div>
      </Container>
    </ConfirmScreenWrapper>
  );
};

export default ConfirmScreen;
