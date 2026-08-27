import styled from "styled-components";
import { breakpoints, defaultTheme } from "./themes/default";

// common styles components

export const PageWrapper = styled.div`
  overflow: clip !important;
  min-height: 100vh;
`;

export const Container = styled.div`
  max-width: 1380px;
  padding: 0 28px !important;
  margin: 0 auto;
  width: 100%;
`;

export const Section = styled.section`
  padding: 64px 0;

  @media (max-width: ${breakpoints.lg}) {
    padding: 44px 0;
  }
`;

export const TitleWrapper = styled.div`
  margin-bottom: 32px;
  position: relative;
  padding-left: 0;
  display: flex;
  align-items: center;

  h2,
  h3,
  h4 {
    font-family: "Playfair Display", Georgia, serif;
    font-weight: 700;
    margin-bottom: 0 !important;
  }

  @media (max-width: ${breakpoints.lg}) {
    padding-left: 0;
  }

  @media (max-width: ${breakpoints.sm}) {
    padding-left: 0;
  }
  h3 {
    font-size: clamp(30px, 4vw, 46px);
    letter-spacing: -0.035em;
    margin-bottom: 4px;
    @media (max-width: ${breakpoints.lg}) {
      font-size: 34px;
    }

    @media (max-width: ${breakpoints.sm}) {
      font-size: 29px;
    }
  }

  p {
    font-size: 18px;
  }

  &::after { display: none; }
`;

export const ContentStylings = styled.div`
  color: ${defaultTheme.color_gray};
  h1,
  h2,
  h3,
  h4,
  h5,
  h6 {
    margin: 16px 0 12px 0;
  }
  p {
    margin: 8px 0;
  }
  a {
    color: ${defaultTheme.color_sea_green};
    font-weight: 600;
  }
  span,
  p,
  ul,
  a {
    @media (max-width: ${breakpoints.lg}) {
      font-size: 13px !important;
    }
    @media (max-width: ${breakpoints.sm}) {
      font-size: 12px !important;
    }
  }
  h1, h2{
    @media(max-width: ${breakpoints.lg}){
      font-size: 17px!important;
    }
    @media(max-width: ${breakpoints.sm}){
      font-size: 16px!important;
    }
  }
  h3, h4{
    @media(max-width: ${breakpoints.lg}){
      font-size: 16px!important;
    }
    @media(max-width: ${breakpoints.sm}){
      font-size: 15px!important;
    }
  }
  h5, h6{
    @media(max-width: ${breakpoints.lg}){
      font-size: 15px!important;
    }
    @media(max-width: ${breakpoints.sm}){
      font-size: 14px!important;
    }
  }
`;
