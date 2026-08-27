import styled from "styled-components";
import { useState } from "react";
import { useDispatch } from "react-redux";
import { applyDiscount } from "../../redux/slices/cartSlice";
import { toast } from "react-hot-toast";
import { Input } from "../../styles/form";
import {
  BaseButtonOuterspace,
  BaseLinkOutlinePlatinum,
} from "../../styles/button";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";

const CartDiscountWrapper = styled.div`
  @media (max-width: ${breakpoints.xl}) {
    max-width: 420px;
  }

  @media (max-width: ${breakpoints.md}) {
    max-width: 100%;
  }

  .coupon-group {
    margin-top: 20px;
    overflow: hidden;
    border-radius: 6px;
    height: 40px;
  }

  .coupon-input {
    border-top-left-radius: 6px;
    border-bottom-left-radius: 6px;
    border: 1px solid ${defaultTheme.color_platinum};
    padding-left: 12px;
    padding-right: 12px;
    border-right: none;
  }
  
  .coupon-btn {
    padding: 2px 16px;
    border-top-left-radius: 0;
    border-bottom-left-radius: 0;
  }

  .contd-shop-btn {
    height: 40px;
    margin-top: 10px;
  }
`;

const CartDiscount = () => {
  const [couponCode, setCouponCode] = useState("");
  const dispatch = useDispatch();

  const handleApplyCoupon = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) return dispatch(applyDiscount({ discountPercent:0, code:"" }));
    try { const response=await axios.post(`${API_BASE_URL}/api/coupons/validate`,{code:couponCode}); const coupon=response.data.data; dispatch(applyDiscount(coupon)); toast.success(`${coupon.code} applied: ${coupon.discountPercent}% off`); }
    catch(error){ dispatch(applyDiscount({discountPercent:0,code:""})); toast.error(error.response?.data?.message||"Invalid coupon code"); }
  };

  return (
    <CartDiscountWrapper>
      <h3 className="text-xxl text-outerspace">Discount Codes</h3>
      <p className="text-base text-gray">
        Enter your coupon code if you have one.
      </p>
      <form onSubmit={handleApplyCoupon}>
        <div className="coupon-group flex">
          <Input
            type="text"
            className="coupon-input w-full"
            placeholder="Search coupon code"
            value={couponCode}
            onChange={(e) => setCouponCode(e.target.value)}
          />
          <BaseButtonOuterspace
            type="submit"
            className="coupon-btn no-wrap h-full"
          >
            Apply Coupon
          </BaseButtonOuterspace>
        </div>
      </form>
      <BaseLinkOutlinePlatinum
        as={BaseLinkOutlinePlatinum}
        to="/"
        className="contd-shop-btn w-full text-gray"
      >
        continue shopping
      </BaseLinkOutlinePlatinum>
    </CartDiscountWrapper>
  );
};

export default CartDiscount;
