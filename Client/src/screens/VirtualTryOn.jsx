import React, { useState, useRef, useEffect } from "react";
import { useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import io from "socket.io-client";
import styled from "styled-components";
import { Container, Section } from "../styles/styles";
import { BaseButtonBlack, BaseButtonGreen } from "../styles/button";
import { breakpoints, defaultTheme } from "../styles/themes/default";
import { ML_BASE_URL } from "../config/apiConfig";

const socket = io(ML_BASE_URL); // Connect to the WebSocket server

const TryOnWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 30px;
  margin-top: 20px;

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 1fr;
  }
`;

const ShirtSelection = styled.div`
  background: #f9f9f9;
  padding: 24px;
  border-radius: 12px;
  border: 1px solid rgba(0, 0, 0, 0.05);
  max-height: 700px;
  overflow-y: auto;

  h2 {
    margin-bottom: 20px;
    font-size: 20px;
  }

  .shirt-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 16px;
  }
`;

const ShirtItem = styled.div`
  cursor: pointer;
  border: 2px solid ${props => props.$active ? defaultTheme.color_purple : "transparent"};
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  background: white;

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  }

  img {
    width: 100%;
    height: 150px;
    object-fit: contain;
    padding: 10px;
  }
`;

const WebcamContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 20px;
  background: #000;
  padding: 20px;
  border-radius: 12px;
  position: relative;
  min-height: 500px;
  justify-content: center;

  .webcam-feed {
    width: 100%;
    max-width: 640px;
    border-radius: 8px;
  }

  .overlay {
    position: absolute;
    top: 20px;
    left: 20px;
    right: 20px;
    bottom: 20px;
    display: flex;
    justify-content: center;
    pointer-events: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      max-width: 640px;
    }
  }

  .controls {
      display: flex;
      gap: 15px;
      margin-top: 10px;
  }
`;

const VirtualTryOn = () => {
    const [selectedImage, setSelectedImage] = useState(null); // Stores processed image
    const [webcamActive, setWebcamActive] = useState(false); // Toggles webcam
    const webcamRef = useRef(null);
    const [shirtImage, setShirtImage] = useState(null); // Stores selected shirt image
    const [activeShirt, setActiveShirt] = useState(null);

    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const location = useLocation();

    // Filter products that look like shirts/tops for try-on
    const tryOnClothes = allProducts.filter(p => 
        p.title.toLowerCase().includes("shirt") || 
        p.title.toLowerCase().includes("top") ||
        p.title.toLowerCase().includes("wear") ||
        p.title.toLowerCase().includes("t-shirt")
    );

    useEffect(() => {
        const fetchProducts = async () => {
            try {
                const response = await fetch("http://localhost:3000/api/products");
                const data = await response.json();
                setAllProducts(data);
            } catch (error) {
                console.error("Failed to fetch products", error);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();

        if (!socket) return;

        socket.on("frame_processed", (data) => {
            setSelectedImage(`data:image/png;base64,${data.frame}`);
        });

        socket.on("error", (error) => {
            console.error("Error from server:", error.message);
        });

        return () => {
            socket.off("frame_processed");
            socket.off("error");
        };
    }, []);

    useEffect(() => {
        if (allProducts.length > 0 && location.state?.productId && location.state?.imgSource) {
            // Check if the product we came from is in the tryOnClothes list
            const passedProduct = allProducts.find(p => p.id === location.state.productId);
            if (passedProduct) {
                const isTryOnable = passedProduct.title.toLowerCase().includes("shirt") || 
                        passedProduct.title.toLowerCase().includes("top") ||
                        passedProduct.title.toLowerCase().includes("wear") ||
                        passedProduct.title.toLowerCase().includes("t-shirt");
                
                if (isTryOnable && !activeShirt) {
                    handleImageClick(location.state.imgSource, location.state.productId);
                    setWebcamActive(true);
                }
            }
        }
    }, [allProducts, location.state, activeShirt]);

    const handleImageClick = async (imageUrl, id) => {
        setActiveShirt(id);
        try {
            const shirtResponse = await fetch(imageUrl);
            const shirtBlob = await shirtResponse.blob();
            const shirtBase64 = await blobToBase64(shirtBlob);
            setShirtImage(shirtBase64); 
        } catch (error) {
            console.error("Error loading shirt image:", error);
        }
    };

    const sendFrameToServer = async () => {
        if (!webcamRef.current || !shirtImage || !socket.connected) return;

        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) return;

        // Extract base64 part from data URL
        const frameBase64 = screenshot.split(",")[1];

        socket.emit("process_frame", {
            frame: frameBase64,
            shirt: shirtImage,
        });
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(",")[1]); 
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const toggleWebcam = () => {
        setWebcamActive((prev) => !prev);
        setSelectedImage(null); 

        if (webcamActive && webcamRef.current && webcamRef.current.stream) {
            const tracks = webcamRef.current.stream.getTracks();
            tracks.forEach((track) => track.stop());
        }
    };

    useEffect(() => {
        let interval;
        if (webcamActive && shirtImage) {
            // Send frame every 100ms for smooth live preview
            interval = setInterval(sendFrameToServer, 100); 
        }
        return () => {
            if (interval) clearInterval(interval);
        };
    }, [webcamActive, shirtImage]); 

    return (
        <Section>
            <Container>
                <h2>AI Virtual Try-On</h2>
                <p>Select a garment and turn on your camera to see how it looks on you!</p>
                
                <div style={{ background: "#f0f0ff", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #d0d0ff" }}>
                    <h4 style={{ marginBottom: "10px", color: "#8a33fd" }}>How to use:</h4>
                    <ul style={{ paddingLeft: "20px", listStyleType: "decimal" }}>
                        <li style={{ marginBottom: "5px" }}>Choose a garment from the <strong>Store Gallery</strong> on the left.</li>
                        <li style={{ marginBottom: "5px" }}>Click <strong>"Enable Camera"</strong> to start the live video feed.</li>
                        <li style={{ marginBottom: "5px" }}>Ensure you are in a <strong>well-lit room</strong> with a plain background if possible.</li>
                    </ul>
                </div>
                
                <TryOnWrapper>
                    <ShirtSelection>
                        <h2>Store Gallery</h2>
                        {loading ? (
                            <div className="flex justify-center items-center py-10">
                                <i className="bi bi-arrow-clockwise fa-spin text-3xl" style={{ animation: "spin 1s linear infinite" }}></i>
                            </div>
                        ) : (
                            <div className="shirt-grid">
                                {tryOnClothes.map((product) => (
                                    <ShirtItem 
                                        key={product.id}
                                        $active={activeShirt === product.id}
                                        onClick={() => handleImageClick(product.imgSource, product.id)}
                                    >
                                        <img src={product.imgSource} alt={product.title} />
                                        <p style={{fontSize: "12px", textAlign: "center", padding: "5px"}}>{product.title}</p>
                                    </ShirtItem>
                                ))}
                            </div>
                        )}
                    </ShirtSelection>

                    <WebcamContainer>
                        {!webcamActive && (
                            <BaseButtonGreen onClick={toggleWebcam}>
                                Enable Camera
                            </BaseButtonGreen>
                        )}

                        {webcamActive && (
                            <>
                                <Webcam
                                    audio={false}
                                    ref={webcamRef}
                                    screenshotFormat="image/png"
                                    videoConstraints={{ facingMode: "user" }}
                                    className="webcam-feed"
                                />
                                
                                {selectedImage && (
                                    <div className="overlay">
                                        <img src={selectedImage} alt="Virtual Try-On" className="overlay-image" />
                                    </div>
                                )}
                                
                                <div className="controls">
                                    <BaseButtonBlack onClick={toggleWebcam} style={{background: "#ff4d4d"}}>
                                        Stop Camera
                                    </BaseButtonBlack>
                                </div>
                            </>
                        )}
                        
                        {!shirtImage && webcamActive && (
                            <p style={{color: "white", marginTop: "10px"}}>Please select a garment from the gallery</p>
                        )}
                    </WebcamContainer>
                </TryOnWrapper>
            </Container>
        </Section>
    );
};

export default VirtualTryOn;
