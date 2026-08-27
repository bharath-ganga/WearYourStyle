import { css } from "styled-components";
import { breakpoints, defaultTheme } from "./themes/default";

export const commonCardStyles = css`
  padding: 0;
  border-radius: 18px;
  cursor: pointer;

  .product-img {
    border-radius: 18px;
    overflow: hidden;
    margin-bottom: 16px;
    background: #ece9e1;

    img {
      transition: ${defaultTheme.default_transition};
    }

    &:hover {
      img {
        scale: 1.035;
      }
    }

    @media (max-width: ${breakpoints.lg}) {
      margin-bottom: 12px;
    }
  }
`;
