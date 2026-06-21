import styled from "styled-components";
import { Container } from "../../styles/styles";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { staticImages } from "../../utils/images";
import toast from "react-hot-toast";
import { API_BASE_URL, ML_BASE_URL } from "../../config/apiConfig";

const WardrobeWrapper = styled.div`
  padding: 40px 0;
  background-color: #f9f9f9;
  min-height: 100vh;
`;

const SectionTitle = styled.h2`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 30px;
  color: #3c4242;
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 30px;
`;

const Card = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: transform 0.2s;
  &:hover {
    transform: translateY(-5px);
  }
`;

const CardTitle = styled.h3`
  font-size: 20px;
  margin-bottom: 15px;
  color: #333;
`;

const RecommendationBox = styled.div`
  background: linear-gradient(135deg, #6c5ce7, #a29bfe);
  color: #fff;
  padding: 30px;
  border-radius: 16px;
  margin-bottom: 40px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 10px 20px rgba(108, 92, 231, 0.2);
`;

const WeatherInfo = styled.div`
  flex: 1;
`;

const SuggestionInfo = styled.div`
  flex: 2;
  text-align: right;
`;

const UploadBox = styled.div`
  border: 2px dashed #ccc;
  padding: 40px;
  text-align: center;
  border-radius: 12px;
  cursor: pointer;
  background: #fff;
  margin-bottom: 30px;
  &:hover {
    border-color: #6c5ce7;
    background: #fdfdfd;
  }
`;

const PreviewImg = styled.img`
  max-width: 100%;
  max-height: 200px;
  margin-top: 20px;
  border-radius: 8px;
`;

const OutfitGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 15px;
  margin-top: 20px;
`;

const OutfitItem = styled.div`
  border: 1px solid #eee;
  padding: 10px;
  border-radius: 8px;
  img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    border-radius: 4px;
  }
`;

const WardrobeScreen = () => {
    const [weather, setWeather] = useState({ temp: 28, condition: "Partly Cloudy", city: "New York" });
    const [wardrobeItems, setWardrobeItems] = useState([]);
    const [recommendedOutfit, setRecommendedOutfit] = useState([]);
    const [uploading, setUploading] = useState(false);
    const [classification, setClassification] = useState(null);
    const [preview, setPreview] = useState(null);
    const [selectedItems, setSelectedItems] = useState({ top: null, bottom: null });
    const [lookbooks, setLookbooks] = useState([]);

    const [allProducts, setAllProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [designPrompt, setDesignPrompt] = useState("");
    const [designing, setDesigning] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        // Fetch weather (Mock for now, but structured)
        const fetchWeather = async () => {
             // In real app, use: https://api.openweathermap.org/data/2.5/weather?q=...
             setWeather({ temp: 28, condition: "Sunny", city: "Mumbai" });
        };
        fetchWeather();
        
        const fetchProducts = async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/api/products`);
                const data = await response.json();
                if (Array.isArray(data)) {
                    setAllProducts(data);
                    
                    // Initial recommendations based on weather
                    if (weather.temp > 25) {
                        setRecommendedOutfit([data[1], data[2]].filter(Boolean)); // Light clothes
                    } else {
                        setRecommendedOutfit([data[3], data[4]].filter(Boolean)); // Warmer clothes
                    }
                } else {
                    console.error("Failed to fetch products: expected array but got", data);
                    setAllProducts([]);
                    setRecommendedOutfit([]);
                }
            } catch (error) {
                console.error("Failed to fetch products", error);
                setAllProducts([]);
                setRecommendedOutfit([]);
            } finally {
                setLoading(false);
            }
        };
        fetchProducts();
    }, [weather.temp]);

    const handleGeneratePrint = () => {
        if (!designPrompt.trim()) return;
        setDesigning(true);

        setTimeout(() => {
            const canvas = document.createElement("canvas");
            canvas.width = 400;
            canvas.height = 400;
            const ctx = canvas.getContext("2d");

            // T-shirt Path
            const drawTshirt = (c) => {
                c.beginPath();
                c.moveTo(150, 40);
                c.quadraticCurveTo(200, 60, 250, 40);
                c.lineTo(320, 70);
                c.lineTo(360, 130);
                c.lineTo(320, 150);
                c.lineTo(310, 130);
                c.lineTo(300, 360);
                c.lineTo(100, 360);
                c.lineTo(90, 130);
                c.lineTo(80, 150);
                c.lineTo(40, 130);
                c.lineTo(80, 70);
                c.closePath();
            };

            // Clip pattern inside T-shirt
            ctx.save();
            drawTshirt(ctx);
            ctx.clip();

            const prompt = designPrompt.toLowerCase();
            if (prompt.includes("retro") || prompt.includes("cyberpunk") || prompt.includes("grid")) {
                // Neon Retro Grid
                ctx.fillStyle = "#111111";
                ctx.fillRect(0, 0, 400, 400);
                ctx.strokeStyle = "#ff007f";
                ctx.lineWidth = 2;
                for (let i = 0; i < 400; i += 30) {
                    ctx.beginPath();
                    ctx.moveTo(i, 0);
                    ctx.lineTo(i, 400);
                    ctx.stroke();
                    ctx.beginPath();
                    ctx.moveTo(0, i);
                    ctx.lineTo(400, i);
                    ctx.stroke();
                }
            } else if (prompt.includes("cherry") || prompt.includes("sakura") || prompt.includes("pink") || prompt.includes("flower")) {
                // Cherry Blossom Pattern
                ctx.fillStyle = "#ffe4e1";
                ctx.fillRect(0, 0, 400, 400);
                ctx.fillStyle = "#ff69b4";
                for (let i = 0; i < 30; i++) {
                    ctx.beginPath();
                    ctx.arc(Math.random() * 400, Math.random() * 400, 15 + Math.random() * 15, 0, Math.PI * 2);
                    ctx.fill();
                }
            } else if (prompt.includes("ocean") || prompt.includes("wave") || prompt.includes("blue")) {
                // Blue Waves
                ctx.fillStyle = "#e0f7fa";
                ctx.fillRect(0, 0, 400, 400);
                ctx.strokeStyle = "#00acc1";
                ctx.lineWidth = 8;
                for (let i = 0; i < 400; i += 40) {
                    ctx.beginPath();
                    ctx.arc(i, 200, 60, 0, Math.PI, false);
                    ctx.stroke();
                }
            } else {
                // Stylish gradient fallback
                const grad = ctx.createLinearGradient(0, 0, 400, 400);
                grad.addColorStop(0, "#8a33fd");
                grad.addColorStop(1, "#00f2fe");
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, 400, 400);
            }

            ctx.restore();

            // Draw outline boundary
            ctx.strokeStyle = "#cccccc";
            ctx.lineWidth = 4;
            drawTshirt(ctx);
            ctx.stroke();

            const tshirtDataUrl = canvas.toDataURL("image/png");
            
            // Add custom garment to local wardrobe
            const newItem = {
                id: `custom_${Date.now()}`,
                imgSource: tshirtDataUrl,
                title: `${designPrompt} Custom Top`,
                type: "T-shirt",
                color: "Custom",
                isCustom: true
            };

            setWardrobeItems(prev => [newItem, ...prev]);
            toast.success("AI Custom Shirt added to your collection!");
            setDesignPrompt("");
            setDesigning(false);
        }, 1500);
    };

    const handleFileUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setPreview(URL.createObjectURL(file));
        setUploading(true);
        setClassification(null);

        const formData = new FormData();
        formData.append("image", file);

        try {
            const response = await axios.post(`${ML_BASE_URL}/classify`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            const result = response.data;
            setClassification(result);
            
            // Add to local wardrobe list
            const newItem = {
                id: Date.now(),
                imgSource: URL.createObjectURL(file), // Using local preview for simplicity
                title: `${result.color} ${result.type}`,
                type: result.type,
                color: result.color
            };
            setWardrobeItems(prev => [newItem, ...prev]);

        } catch (error) {
            console.error("Classification failed", error);
            // Fallback for demo
            setClassification({ type: "T-shirt", color: "Blue", confidence: 0.88 });
        } finally {
            setUploading(false);
        }
    };

    const handleSelectItem = (item) => {
        if (item.type.toLowerCase().includes('shirt') || item.type.toLowerCase().includes('top')) {
            setSelectedItems(prev => ({ ...prev, top: item }));
        } else {
            setSelectedItems(prev => ({ ...prev, bottom: item }));
        }
    };

    const handleSaveEnsemble = () => {
        if (!selectedItems.top && !selectedItems.bottom) return;
        setLookbooks(prev => [...prev, {
            id: Date.now(),
            name: `Lookbook #${prev.length + 1}`,
            top: selectedItems.top,
            bottom: selectedItems.bottom
        }]);
        toast.success("Ensemble Saved to Lookbooks!");
        // Reset
        setSelectedItems({ top: null, bottom: null });
    };

    return (
        <WardrobeWrapper>
            <Container>
                <RecommendationBox>
                    <WeatherInfo>
                        <h3><i className="bi bi-cloud-sun"></i> {weather.city} Weather</h3>
                        <p style={{fontSize: '32px', fontWeight: '800'}}>{weather.temp}°C</p>
                        <p>{weather.condition}</p>
                    </WeatherInfo>
                    <SuggestionInfo>
                        <h3>"What should I wear today?"</h3>
                        <p>Based on current conditions: {weather.temp > 25 ? "Stay cool with light cotton!" : "Layer up for the breeze."}</p>
                        <button className="btn btn-outline-light" style={{marginTop: '15px'}} onClick={() => {
                            if (allProducts.length > 0) {
                                setRecommendedOutfit([allProducts[0], allProducts[1]].filter(Boolean)); // Logic to pick from wardrobe
                            }
                        }}>One-Click Suggestion</button>
                    </SuggestionInfo>
                </RecommendationBox>

                <SectionTitle>Elevate Your Style with AI</SectionTitle>

                <Grid style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
                    {/* 🔹 AI Classification */}
                    <Card>
                        <CardTitle>AI Closet Uploader</CardTitle>
                        <UploadBox onClick={() => document.getElementById('wardrobe-upload').click()}>
                            <input 
                                type="file" 
                                id="wardrobe-upload" 
                                hidden 
                                onChange={handleFileUpload}
                                accept="image/*"
                            />
                            {uploading ? (
                                <p><i className="bi bi-cpu animate-spin"></i> Analyzing garments...</p>
                            ) : (
                                <p><i className="bi bi-cloud-upload"></i> Upload your clothes</p>
                            )}
                        </UploadBox>
                        {preview && <PreviewImg src={preview} alt="Preview" />}
                        {classification && (
                            <div style={{marginTop: '15px', padding: '10px', background: '#f0f0ff', borderRadius: '8px'}}>
                                <p><strong>Detected:</strong> {classification.color} {classification.type}</p>
                                <div style={{width: '100%', height: '8px', background: '#ddd', borderRadius: '4px', marginTop: '5px'}}>
                                    <div style={{width: `${classification.confidence * 100}%`, height: '100%', background: '#6c5ce7', borderRadius: '4px'}}></div>
                                </div>
                                <small>Match Confidence: {(classification.confidence * 100).toFixed(1)}%</small>
                            </div>
                        )}
                    </Card>

                    {/* 🔹 AI Custom Pattern Designer */}
                    <Card>
                        <CardTitle>AI Pattern Designer</CardTitle>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                            <small style={{ color: '#666' }}>Type design prompts to print on a 2D vector T-shirt:</small>
                            <input 
                                type="text"
                                placeholder="e.g. cherry blossom, neon grid..."
                                value={designPrompt}
                                onChange={(e) => setDesignPrompt(e.target.value)}
                                style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ccc', outline: 'none', fontSize: '14px' }}
                            />
                            <button 
                                className="btn btn-primary"
                                style={{ backgroundColor: '#6c5ce7', borderColor: '#6c5ce7', fontWeight: 'bold' }}
                                onClick={handleGeneratePrint}
                                disabled={designing}
                            >
                                {designing ? "Designing..." : "Generate AI Print"}
                            </button>
                        </div>
                    </Card>

                    {/* 🔹 Outfit Builder */}
                    <Card>
                        <CardTitle>Visual Outfit Builder</CardTitle>
                        <div style={{display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '200px'}}>
                            <div style={{border: '1px dashed #eee', height: '120px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                {selectedItems.top ? <img src={selectedItems.top.imgSource} style={{height: '100%'}} /> : "Select a Top"}
                            </div>
                            <div style={{border: '1px dashed #eee', height: '120px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
                                {selectedItems.bottom ? <img src={selectedItems.bottom.imgSource} style={{height: '100%'}} /> : "Select a Bottom"}
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{marginTop: '20px', width: '100%', backgroundColor: '#6c5ce7', borderColor: '#6c5ce7'}} onClick={handleSaveEnsemble}>Save Ensemble</button>
                    </Card>

                    {/* 🔹 Smart Insights */}
                    <Card>
                        <CardTitle>Wardrobe Analytics</CardTitle>
                        <div style={{marginBottom: '20px'}}>
                            <small>WARDROBE HEALTH</small>
                            <div style={{display: 'flex', gap: '5px', marginTop: '5px'}}>
                                <div style={{flex: 3, height: '10px', background: '#6c5ce7', borderRadius: '5px'}} title="Worn Items"></div>
                                <div style={{flex: 1, height: '10px', background: '#fdcb6e', borderRadius: '5px'}} title="Unused"></div>
                            </div>
                        </div>
                        <ul style={{listStyle: 'none', padding: 0}}>
                            <li style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{fontSize: '20px'}}>👔</span>
                                <div><strong>Most Worn:</strong> Casual Blue Shirt</div>
                            </li>
                            <li style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{fontSize: '20px'}}>⚠️</span>
                                <div><strong>Underutilized:</strong> 4 items unused for {">"}30d</div>
                            </li>
                            <li style={{marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '10px'}}>
                                <span style={{fontSize: '20px'}}>🎨</span>
                                <div><strong>Trend:</strong> Monochromatic (Past Week)</div>
                            </li>
                        </ul>
                    </Card>
                </Grid>

                <SectionTitle style={{marginTop: '50px'}}>Your Collection</SectionTitle>
                <Grid>
                    {wardrobeItems.length === 0 ? (
                        <p>No items added yet. Upload images or generate custom designs to start your closet.</p>
                    ) : (
                        wardrobeItems.map(item => (
                            <Card key={item.id} style={{padding: '10px', position: 'relative'}} onClick={() => handleSelectItem(item)}>
                                <img src={item.imgSource} style={{width: '100%', height: '150px', objectFit: 'contain', borderRadius: '8px'}} />
                                <div style={{marginTop: '10px', textAlign: 'center'}}>
                                    <strong>{item.title}</strong>
                                </div>
                                <button 
                                    className="btn btn-sm btn-dark" 
                                    style={{ position: 'absolute', top: '10px', right: '10px', padding: '4px 8px', fontSize: '11px', background: '#8a33fd', border: 'none' }}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        navigate("/virtual_try_on", { state: { productId: item.id, imgSource: item.imgSource } });
                                    }}
                                >
                                    Try On
                                </button>
                            </Card>
                        ))
                    )}
                </Grid>

                <SectionTitle style={{marginTop: '50px'}}>My Lookbooks (Moodboards)</SectionTitle>
                <Grid>
                    {lookbooks.length === 0 ? (
                        <p>No Lookbooks saved. Use the Visual Builder to create one!</p>
                    ) : (
                        lookbooks.map(look => (
                            <Card key={look.id} style={{padding: '15px'}}>
                                <CardTitle style={{textAlign: 'center'}}>{look.name}</CardTitle>
                                <div style={{display: 'flex', flexDirection: 'column', gap: '5px', height: '240px'}}>
                                    <div style={{flex: 1, backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'center'}}>
                                        {look.top ? <img src={look.top.imgSource} style={{height: '100%', objectFit: 'contain'}} /> : <span style={{alignSelf:'center'}}>No Top</span>}
                                    </div>
                                    <div style={{flex: 1, backgroundColor: '#f9f9f9', display: 'flex', justifyContent: 'center'}}>
                                        {look.bottom ? <img src={look.bottom.imgSource} style={{height: '100%', objectFit: 'contain'}} /> : <span style={{alignSelf:'center'}}>No Bottom</span>}
                                    </div>
                                </div>
                            </Card>
                        ))
                    )}
                </Grid>
            </Container>
        </WardrobeWrapper>
    );
};

export default WardrobeScreen;
