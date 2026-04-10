import styled from "styled-components";
import { Input } from "../../styles/form";
import { BaseButtonGreen } from "../../styles/button";
import CheckoutSummary from "./CheckoutSummary";
import { breakpoints, defaultTheme } from "../../styles/themes/default";

const BillingOrderWrapper = styled.div`
  gap: 60px;
  grid-template-columns: 2fr 1fr;

  @media (max-width: ${breakpoints.xl}) {
    gap: 40px;
  }
  @media (max-width: ${breakpoints.lg}) {
    gap: 30px;
    grid-template-columns: 100%;
  }
`;

const BillingDetailsWrapper = styled.div`
  @media (max-width: ${breakpoints.lg}) {
    order: 2;
  }

  .checkout-form {
    margin-top: 24px;

    .input-elem {
      margin-bottom: 16px;

      @media (max-width: ${breakpoints.xs}) {
        margin-bottom: 10px;
      }

      label {
        margin-bottom: 8px;
        display: block;
      }

      input,
      select {
        height: 40px;
        border-radius: 4px;
        background: ${defaultTheme.color_whitesmoke};
        padding-left: 12px;
        padding-right: 12px;
        width: 100%;
        border: 1px solid ${defaultTheme.color_platinum};
        font-size: 12px;

        &::placeholder {
          font-size: 12px;
        }
      }
    }

    .elem-col-2 {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      column-gap: 24px;

      @media (max-width: ${breakpoints.lg}) {
        column-gap: 12px;
      }
      @media (max-width: ${breakpoints.sm}) {
        grid-template-columns: 100%;
      }
    }

    .elem-col-3 {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      column-gap: 24px;

      @media (max-width: ${breakpoints.lg}) {
        column-gap: 12px;
      }
      @media (max-width: ${breakpoints.sm}) {
        grid-template-columns: 100%;
      }
    }

    .input-check-group {
      column-gap: 10px;
      margin-top: 16px;
    }
    .contd-delivery-btn {
      margin-top: 20px;

      @media (max-width: ${breakpoints.sm}) {
        width: 100%;
      }
    }
  }
`;

const Billing = ({ onBillingSubmit }) => {
  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    
    const address = `${data.street}, ${data.apt ? data.apt + ', ' : ''}${data.city}, ${data.state} ${data.postal}, ${data.country}`;
    const email = data.email;
    const phone = data.phone;
    const name = `${data.firstName} ${data.lastName}`;
    
    if (onBillingSubmit) {
      onBillingSubmit({ address, email, phone, name });
    }
  };

  return (
    <BillingOrderWrapper className="billing-and-order grid items-start">
      <BillingDetailsWrapper>
        <h4 className="text-xxl font-bold text-outerspace">Billing Details</h4>
        <form className="checkout-form" onSubmit={handleSubmit}>
          <div className="input-elem-group elem-col-2">
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">First Name*</label>
              <Input type="text" name="firstName" placeholder="First Name" required />
            </div>
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Last Name*</label>
              <Input type="text" name="lastName" placeholder="Last Name" required />
            </div>
          </div>
          <div className="input-elem-group elem-col-2">
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Email Address*</label>
              <Input type="email" name="email" placeholder="Email Address" required />
            </div>
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Phone*</label>
              <Input type="text" name="phone" placeholder="Phone" required />
            </div>
          </div>
          <div className="input-elem-group">
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Country / Region*</label>
              <Input type="text" name="country" placeholder="Country / Region" required />
            </div>
          </div>
          <div className="input-elem-group elem-col-2">
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Street Address*</label>
              <Input type="text" name="street" placeholder="House number and street name" required />
            </div>
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Apt, suite, unit</label>
              <Input type="text" name="apt" placeholder="apartment, suite, unit, etc. (optional)" />
            </div>
          </div>
          <div className="input-elem-group elem-col-3">
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">City*</label>
              <Input type="text" name="city" placeholder="Town / City" required />
            </div>
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">State*</label>
              <select name="state" required defaultValue="">
                <option value="" disabled>Select State</option>
                {[
                  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", 
                  "Gujarat", "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", 
                  "Madhya Pradesh", "Maharashtra", "Manipur", "Meghalaya", "Mizoram", "Nagaland", 
                  "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", "Tripura", 
                  "Uttar Pradesh", "Uttarakhand", "West Bengal"
                ].map(state => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
            </div>
            <div className="input-elem">
              <label className="text-base text-outerspace font-semibold">Postal Code*</label>
              <Input type="text" name="postal" placeholder="Postal Code" required />
            </div>
          </div>
          <BaseButtonGreen type="submit" className="contd-delivery-btn">
            Continue to delivery
          </BaseButtonGreen>
        </form>
      </BillingDetailsWrapper>
      <CheckoutSummary />
    </BillingOrderWrapper>
  );
};

export default Billing;
