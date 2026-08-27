import React, { useState } from "react";
import styled, { keyframes } from "styled-components";
import Slider from "react-slick";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import { bannerData } from "../../data/data";
import { Container } from "../../styles/styles";
import { BaseLinkWhite } from "../../styles/button";
import { breakpoints, defaultTheme } from "../../styles/themes/default";
import CustomNextArrow from "../common/CustomNextArrow";
import CustomPrevArrow from "../common/CustomPrevArrow";

const SectionHeroWrapper = styled.section`
  background-color: ${defaultTheme.color_whitesmoke};
  padding: 18px 24px 0;

  @media (max-width: ${breakpoints.sm}) { padding: 10px 10px 0; }
`;

const HeroSliderWrapper = styled.div`
  max-width: 1540px;
  margin: 0 auto;
  overflow: hidden;
  border-radius: 24px;
  .custom-prev-arrow {
    left: 24px !important;
    background-color: ${defaultTheme.color_white};
    svg {
      color: ${defaultTheme.color_outerspace};
    }

    @media (max-width: ${breakpoints.md}) {
      left: 16px !important;
    }
  }

  .custom-next-arrow {
    right: 24px !important;
    background-color: ${defaultTheme.color_white};
    svg {
      color: ${defaultTheme.color_outerspace};
    }

    @media (max-width: ${breakpoints.md}) {
      right: 16px !important;
    }
  }
`;

const HeroSliderItemWrapper = styled.div`
  position: relative;
  height: min(710px, calc(100vh - 116px));
  min-height: 560px;
  overflow: hidden;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, rgba(17,17,14,.72) 0%, rgba(17,17,14,.32) 50%, rgba(17,17,14,.05) 100%);
  }

  img {
    display: block;
    object-position: center 22%;
  }

  @media (max-width: ${breakpoints.sm}) { height: 620px; min-height: 0; }
`;

const fadeUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(40px) translateX(-50%);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateX(-50%);
  }
`;

const textSlide = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const HeroSlideContent = styled.div`
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  max-width: 1380px;
  z-index: 10;
  animation: ${fadeUp} 1s cubic-bezier(0.25, 0.8, 0.25, 1) forwards;

  .btn {
    height: 42px;
    min-width: 120px;
    margin-top: 20px;
    @media (max-width: ${breakpoints.md}) {
      margin-top: 12px;
    }
  }

  .container {
    max-width: 760px;
    margin-left: 0;

    @media (max-width: ${breakpoints.xxl}) {
      margin-left: 40px;
    }
    @media (max-width: ${breakpoints.md}) {
      margin-left: 16px;
      margin-right: 16px;
    }
    @media (max-width: ${breakpoints.sm}) {
      margin: 0;
      text-align: center;
    }
  }

  .hero-text-top {
    display: inline-flex;
    font-size: 14px;
    font-style: normal;
    text-transform: uppercase;
    letter-spacing: .18em;
    animation: ${textSlide} 1s ease-out 0.2s backwards;
    @media (max-width: ${breakpoints.lg}) {
      font-size: 26px;
    }
  }

  .hero-text-large {
    font-family: "Playfair Display", Georgia, serif;
    font-size: clamp(58px, 7vw, 94px);
    letter-spacing: -0.045em;
    line-height: .98;
    margin-bottom: 20px;
    animation: ${textSlide} 1s ease-out 0.4s backwards;

    @media (max-width: ${breakpoints.lg}) {
      font-size: 60px;
    }
    @media (max-width: ${breakpoints.md}) {
      font-size: 48px;
    }
    @media (max-width: ${breakpoints.sm}) {
      font-size: 36px;
    }
    @media (max-width: ${breakpoints.xs}) {
      font-size: 32px;
    }
  }

  .hero-text-bottom {
    font-size: 17px;
    letter-spacing: .08em;
    margin-bottom: 24px;
    animation: ${textSlide} 1s ease-out 0.6s backwards;

    @media (max-width: ${breakpoints.lg}) {
      font-size: 20px;
    }
  }

  .hero-btn {
    font-size: 15px;
    height: 52px;
    min-width: 174px;
    animation: ${textSlide} 1s ease-out 0.8s backwards;
  }
`;

const Hero = () => {
  const [activeSlide, setActiveSlide] = useState(0);

  const settings = {
    infinite: bannerData.length > 1,
    slidesToShow: 1,
    slidesToScroll: 1,
    arrows: bannerData.length > 1,
    autoplay: true,
    autoplaySpeed: 3000,
    beforeChange: (current, next) => {
      setActiveSlide(next);
      if (document.activeElement && document.activeElement.closest(".slick-slider")) {
        document.activeElement.blur();
      }
    },
    responsive: [
      {
        breakpoint: 1024,
        settings: {
          arrows: bannerData.length > 1,
        },
      },
      {
        breakpoint: 768,
        settings: {
          arrows: false,
          dots: bannerData.length > 1,
        },
      },
    ],
  };

  return (
    <SectionHeroWrapper>
      <HeroSliderWrapper>
        <Slider
          nextArrow={<CustomNextArrow />}
          prevArrow={<CustomPrevArrow />}
          {...settings}
        >
          {bannerData?.map((banner, index) => {
            const isActive = index === activeSlide;
            return (
              <HeroSliderItemWrapper key={banner.id}>
                <img src={banner.imgSource} className="object-fit-cover" />
                <HeroSlideContent className="flex items-center w-full h-full">
                  <Container className="container text-white">
                    <p className="hero-text-top font-bold italic">
                      {banner.topText}
                    </p>
                    <h2 className="hero-text-large font-extrabold">
                      {banner.titleText}
                    </h2>
                    <p className="hero-text-bottom font-semibold uppercase">
                      {banner.bottomText}
                    </p>
                    <BaseLinkWhite 
                      to={banner.buttonLink} 
                      className="hero-btn"
                      tabIndex={isActive ? 0 : -1}
                    >
                      {banner.buttonText}
                    </BaseLinkWhite>
                  </Container>
                </HeroSlideContent>
              </HeroSliderItemWrapper>
            );
          })}
        </Slider>
      </HeroSliderWrapper>
    </SectionHeroWrapper>
  );
};

export default Hero;
