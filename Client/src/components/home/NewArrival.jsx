import styled from "styled-components";
import { Container, Section } from "../../styles/styles";
import Title from "../common/Title";
import Slider from "react-slick";
import CustomNextArrow from "../common/CustomNextArrow";
import CustomPrevArrow from "../common/CustomPrevArrow";
import { newArrivalData } from "../../data/data";
import { commonCardStyles } from "../../styles/card";
import { breakpoints } from "../../styles/themes/default";

import Webcam from "react-webcam";
import io from "socket.io-client";
import React, { useState, useRef, useEffect } from "react";
import { ML_BASE_URL } from "../../config/apiConfig";
import { garmentTypeFor, loadGarmentAsPng, LIVE_FRAME_FORMAT, LIVE_FRAME_QUALITY } from "../../utils/tryOn";

const ProductCardBoxWrapper = styled.div`
  ${commonCardStyles}
  .product-img {
    height: 262px;
    width: 262px;
  }

  @media (max-width: ${breakpoints.sm}) {
    padding-left: 6px;
    padding-right: 6px;
  }
`;

const ArrivalSliderWrapper = styled.div`
  .custom-prev-arrow {
    top: 43%;
    left: -18px;
    @media (max-width: ${breakpoints.xxl}) {
      left: 24px;
    }

    @media (max-width: ${breakpoints.xs}) {
      left: 4px;
    }
  }

  .custom-next-arrow {
    top: 43%;
    right: -18px;
    @media (max-width: ${breakpoints.xxl}) {
      right: 24px;
    }

    @media (max-width: ${breakpoints.xs}) {
      right: 4px;
    }
  }
`;

const ButtonWrapper = styled.div`
background-color: #23231f;
  color: white;
  padding: 10px 20px;
  border-radius: 0;
  border: none;
  cursor: pointer;
  font-weight: bold;
  transition: all 0.3s ease;
  width: max-content;
  margin: 28px auto 0;

  &:hover {
    background-color: #d45b3f;
    transform: none;
  }

  &:active {
    transform: scale(0.95);
  }
`;

const WebcamContainer = styled.div`
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 25rem;
  border: 1px solid #dedbd3;
  border-radius: 0;
  background-color: #000;
  overflow: hidden;
  box-shadow: none;
`;


const OverlayWrapper = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  justify-content: center;
  align-items: center;
  pointer-events: none;
`;

const OverlayImage = styled.img`
  max-width: 80%;
  max-height: 80%;
  transition: transform 0.3s ease-in-out;
  object-fit: contain;
`;


// Connected only while the home-page webcam is open, so plain page views
// don't hold a connection to the ML server.
const socket = io(ML_BASE_URL, { transports: ["websocket", "polling"], autoConnect: false });

const NewArrival = ({ products = [] }) => {
  const [selectedImage, setSelectedImage] = useState(null);
  const [webcamActive, setWebcamActive] = useState(false);
  const webcamRef = useRef(null);
  const [shirtImage, setShirtImage] = useState(null);
  const [detectedSize, setDetectedSize] = useState("");
  const garmentRef = useRef(null);
  const waitingForFrame = useRef(false);

  useEffect(() => {
    if (!webcamActive) return;

    const onFrame = (data) => {
      waitingForFrame.current = false;
      setSelectedImage(`data:image/jpeg;base64,${data.frame}`);
      if (data.detected_size) setDetectedSize(data.detected_size);
    };
    const onError = (error) => {
      waitingForFrame.current = false;
      console.error("Error from try-on server:", error.message);
    };
    // The server forgets the garment when the connection drops; send it again.
    const onConnect = () => {
      if (garmentRef.current) socket.emit("update_garment", garmentRef.current);
    };

    socket.on("frame_processed", onFrame);
    socket.on("error", onError);
    socket.on("connect", onConnect);
    socket.connect();
    return () => {
      socket.off("frame_processed", onFrame);
      socket.off("error", onError);
      socket.off("connect", onConnect);
      socket.disconnect();
    };
  }, [webcamActive]);

  const handleImageClick = async (item, imageUrl) => {
    if (!webcamActive) {
      alert("Please open the webcam to try on clothes.");
      return;
    }
    try {
      const shirt = await loadGarmentAsPng(imageUrl);
      garmentRef.current = { shirt, garment_type: garmentTypeFor(item) };
      setShirtImage(shirt);
      socket.emit("update_garment", garmentRef.current);
    } catch (error) {
      console.error("Error loading garment image:", error);
    }
  };

  const toggleWebcam = () => {
    setWebcamActive((prev) => !prev);
    setSelectedImage(null);
    setDetectedSize("");
    waitingForFrame.current = false;

    if (webcamRef.current && webcamRef.current.stream) {
      webcamRef.current.stream.getTracks().forEach((track) => track.stop());
    }
  };

  useEffect(() => {
    if (!webcamActive || !shirtImage) return;
    // One frame in flight at a time; a lost reply is retried after 4 s.
    let sentAt = 0;
    const interval = setInterval(() => {
      if (!webcamRef.current || !socket.connected) return;
      if (waitingForFrame.current && Date.now() - sentAt < 4000) return;
      const screenshot = webcamRef.current.getScreenshot();
      if (!screenshot) return;
      waitingForFrame.current = true;
      sentAt = Date.now();
      socket.emit("process_frame", { frame: screenshot.split(",")[1] });
    }, 110);
    return () => clearInterval(interval);
  }, [webcamActive, shirtImage]);


  const settings = {
    dots: false,
    infinite: true,
    speed: 300,
    slidesToShow: 1,
    centerMode: true,
    variableWidth: true,
    autoplay: true,
    autoplaySpeed: 3000,
    beforeChange: (current, next) => {
      if (document.activeElement && document.activeElement.closest(".slick-slider")) {
        document.activeElement.blur();
      }
    },
  };

  const path = [
    { id: 1, img: "/shirts/shirt2.png" },
    { id: 2, img: "/shirts/shirt1.png" },
    { id: 3, img: "/shirts/shirt3.png" },
  ];
  
  const displayItems = products.length > 0 ? products : path;

  return (
    <Section>
      <Container>
        <Title titleText={"New Arrival"} />
        <ArrivalSliderWrapper>
          <Slider
            nextArrow={<CustomNextArrow />}
            prevArrow={<CustomPrevArrow />}
            {...settings}
          >
            {displayItems?.map((item) => {
              const imgUrl = item.imgSource || item.img;
              return (
                <ProductCardBoxWrapper key={item.id}>
                  <div className="product-img">
                    <img
                      className="object-fit-cover"
                      src={imgUrl}
                      alt="Product"
                      onClick={() => handleImageClick(item, imgUrl)}
                    />
                  </div>
                </ProductCardBoxWrapper>
              );
            })}
          </Slider>
          <ButtonWrapper onClick={toggleWebcam}>
                    {webcamActive ? "Close Webcam" : "Open Webcam"}
                </ButtonWrapper>
        </ArrivalSliderWrapper>
        {webcamActive && (
  <>
    {/* Display the webcam feed */}
    <WebcamContainer>
    <Webcam
      audio={false}
      ref={webcamRef}
      screenshotFormat={LIVE_FRAME_FORMAT}
      screenshotQuality={LIVE_FRAME_QUALITY}
      mirrored={true}
      videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
      className="webcam-feed"
    />
    </WebcamContainer>

    {/* Display the virtual try-on image */}
    {selectedImage && (
      <div style={{position: 'relative'}}>
        <img src={selectedImage} alt="Virtual Try-On" className="overlay-image" style={{display: 'block', margin: '0 auto'}} />
        <div style={{marginTop: '20px', textAlign: 'center'}}>
          {detectedSize && detectedSize !== "Unknown" && (
            <p className="font-bold text-xl" style={{color: '#d45b3f', marginBottom: '10px'}}>
              ✨ AI Smart Fit Estimate: Size {detectedSize} ✨
            </p>
          )}
          <a href={selectedImage} download="MyWearYourStyleFit.jpg" style={{
            display: 'inline-flex', alignItems: 'center', gap: '8px',
            backgroundColor: '#3c4242', color: 'white', padding: '10px 20px', 
            borderRadius: 0, textDecoration: 'none', fontWeight: 'bold'
          }}>
            <i className="bi bi-download"></i> Share My Fit
          </a>
        </div>
      </div>
    )}
  </>
)}
      </Container>
    </Section>
  );
};

export default NewArrival;
