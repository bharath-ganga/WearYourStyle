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
  grid-template-columns: 3.5fr 1fr;
  margin-top: 20px;
  background: #000;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(0,0,0,0.2);

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 1fr;
    display: flex;
    flex-direction: column;
  }
`;

const ShirtSelection = styled.div`
  background: #e5e5e5;
  border-left: 2px solid #ccc;
  max-height: 700px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;

  .header {
    background: #d4d4d4;
    padding: 15px;
    text-align: center;
    position: sticky;
    top: 0;
    z-index: 10;
    border-bottom: 2px solid #a3a3a3;
    
    h2 {
      margin: 0;
      font-size: 18px;
      font-weight: bold;
      color: #333;
    }
  }

  .shirt-grid {
    display: flex;
    flex-direction: column;
    padding: 15px;
    gap: 20px;
  }
`;

const ShirtItem = styled.div`
  cursor: pointer;
  border: 3px solid ${props => props.$active ? "#8b5cf6" : "#ffffff"};
  background: white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  transition: all 0.2s ease;

  &:hover {
    border-color: #a78bfa;
  }

  img {
    width: 100%;
    height: 160px;
    object-fit: contain;
    padding: 15px;
  }
`;

const WebcamContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #111;
  position: relative;
  min-height: 700px;
  justify-content: center;

  .webcam-feed {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  .overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    display: flex;
    justify-content: center;
    pointer-events: none;

    img {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }
  }

  .controls {
      position: absolute;
      bottom: 30px;
      left: 50%;
      transform: translateX(-50%);
      display: flex;
      gap: 15px;
      z-index: 11;
  }
  
  .camera-icon-ui {
      position: absolute;
      bottom: 20px;
      left: 20px;
      z-index: 10;
      color: white;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      display: flex;
      align-items: center;
      gap: 12px;
      
      i {
         font-size: 55px;
         opacity: 0.8;
      }
      
      .info {
         display: flex;
         flex-direction: column;
         .gender-age {
             font-size: 18px;
             font-weight: 500;
             letter-spacing: 1px;
         }
      }
  }
`;

const VirtualTryOn = () => {
    const [selectedImage, setSelectedImage] = useState(null); // Stores processed image
    const [webcamActive, setWebcamActive] = useState(false); // Toggles webcam
    const webcamRef = useRef(null);
    const [shirtImage, setShirtImage] = useState(null); // Stores selected shirt image
    const [activeShirt, setActiveShirt] = useState(null);
    const [detectedSize, setDetectedSize] = useState("");
    const [isAiProcessing, setIsAiProcessing] = useState(false);
    const [aiFeedback, setAiFeedback] = useState("");

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
            if (data.detected_size) setDetectedSize(data.detected_size);
            setAiFeedback("");
            setIsAiProcessing(false);
        });

        socket.on("no_fit", (data) => {
            setAiFeedback(data.message);
            setIsAiProcessing(false);
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
            // Guarantee pure PNG extraction to avoid Python CV2 failing on AVIF/WebP formats
            const img = new Image();
            img.crossOrigin = "Anonymous";
            img.src = imageUrl;

            await new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = () => reject(new Error("Failed to load image element"));
            });

            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);

            // Export exclusively as PNG base64 and strip the data URI header
            const dataUrl = canvas.toDataURL("image/png");
            const shirtBase64 = dataUrl.split(",")[1];

            setShirtImage(shirtBase64);

            socket.emit("update_garment", { shirt: shirtBase64 });
        } catch (error) {
            console.error("Error loading shirt image:", error);
        }
    };

    const sendFrameToServer = async () => {
        if (!webcamRef.current || !socket.connected || !activeShirt) return;

        const screenshot = webcamRef.current.getScreenshot();
        if (!screenshot) return;

        // Extract base64 part from data URL
        const frameBase64 = screenshot.split(",")[1];

        socket.emit("process_frame", {
            frame: frameBase64
        });
        setIsAiProcessing(true);
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
        setDetectedSize("");
        setAiFeedback("");
        setIsAiProcessing(false);

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

                <div style={{ background: "#f0f0ff", padding: "15px", borderRadius: "8px", marginBottom: "20px", border: "1px solid #d0d0ff" }}>
                    <h4 style={{ marginBottom: "10px", color: "#8a33fd" }}>How to use:</h4>
                    <ul style={{ paddingLeft: "20px", listStyleType: "decimal" }}>
                        <li style={{ marginBottom: "5px" }}>Choose a garment from the <strong>Store Gallery</strong> on the left.</li>
                        <li style={{ marginBottom: "5px" }}>Click <strong>"Enable Camera"</strong> to start the live video feed.</li>
                        <li style={{ marginBottom: "5px" }}>Ensure you are in a <strong>well-lit room</strong> with a plain background if possible.</li>
                    </ul>
                </div>

                <TryOnWrapper>
                    <WebcamContainer>
                        {!webcamActive && (
                            <BaseButtonGreen onClick={toggleWebcam} style={{ zIndex: 11 }}>
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
                                    mirrored={true}
                                />

                                {selectedImage && (
                                    <div className="overlay" style={{ zIndex: 5 }}>
                                        <img src={selectedImage} alt="Virtual Try-On" className="overlay-image" style={{ transform: "scaleX(-1)" }} />
                                    </div>
                                )}

                                {/* Decorative UI elements to match reference */}
                                <div className="camera-icon-ui">
                                    <i className="bi bi-camera"></i>
                                    <div className="info">
                                        <span className="gender-age">User Fit System</span>
                                    </div>
                                </div>

                                {/* AI STATUS OVERLAY */}
                                <div style={{
                                    position: 'absolute', top: '20px', right: '20px',
                                    backgroundColor: 'rgba(0,0,0,0.7)', padding: '10px 15px',
                                    borderRadius: '8px', zIndex: 10, color: '#fff',
                                    border: '1px solid #14c4b5'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <i className={`bi bi-cpu ${isAiProcessing ? 'fa-spin' : ''}`} style={{ color: '#14c4b5' }}></i>
                                        <span style={{ fontSize: '14px', fontWeight: 'bold' }}>
                                            {isAiProcessing ? "AI Analyzing..." : aiFeedback || "AI Fit Ready"}
                                        </span>
                                    </div>
                                </div>

                                <div className="controls">
                                    <BaseButtonBlack onClick={toggleWebcam} style={{ background: "#ff4d4d" }}>
                                        Stop Camera
                                    </BaseButtonBlack>

                                    {selectedImage && (
                                        <a
                                            href={selectedImage}
                                            download="MyWearYourStyleFit.png"
                                            style={{
                                                textDecoration: 'none', background: '#14c4b5', color: 'white',
                                                padding: '12px 20px', borderRadius: '8px', fontWeight: 'bold',
                                                display: 'inline-flex', alignItems: 'center', gap: '8px'
                                            }}
                                        >
                                            <i className="bi bi-download"></i> Share My Fit
                                        </a>
                                    )}
                                </div>
                            </>
                        )}

                        {!shirtImage && webcamActive && (
                            <p style={{ color: "white", zIndex: 10, position: 'absolute', top: '40%' }}>Please select a garment from the gallery</p>
                        )}
                    </WebcamContainer>

                    <ShirtSelection>
                        <div className="header">
                            <h2>Clothing</h2>
                        </div>
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
                                    </ShirtItem>
                                ))}
                            </div>
                        )}
                    </ShirtSelection>
                </TryOnWrapper>
            </Container>
        </Section>
    );
};

export default VirtualTryOn;
