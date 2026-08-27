import { Link } from "react-router-dom";
import styled from "styled-components";
import { breakpoints } from "./themes/default";

// common header stylings for both auth & main pages
export const HeaderMainWrapper = styled.header`
  min-height: 82px;
  background: ${(props) => props.theme.color_whitesmoke};
  border-bottom: 1px solid ${(props) => props.theme.color_anti_flash_white};
  position: sticky;
  top: 0;
  z-index: 120;

  .header-wrap {
    column-gap: 20px;

    @media (max-width: ${breakpoints.sm}) {
      column-gap: 8px;
    }
  }

  .sidebar-toggler {
    font-size: 24px;
    margin-right: 14px;
    margin-bottom: -1px;
  }
`;

export const SiteBrandWrapper = styled(Link)`
  text-decoration: none;
  column-gap: 10px;

  .brand-img-wrap {
    img {
      width: 28px;
    }
  }

  .site-brand-text {
    font-family: "Playfair Display", Georgia, serif;
    font-size: 25px;
    font-weight: 700;
    letter-spacing: -0.035em;

    @media (max-width: ${breakpoints.xl}) {
      font-size: 20px;
    }

    @media (max-width: ${breakpoints.xs}) {
      display: none;
    }
  }
`;
