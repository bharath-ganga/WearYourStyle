import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { API_BASE_URL } from "../../config/apiConfig";
import { defaultFallbackProducts } from "../../data/fallbackProducts";
import Hero from "../../components/home/Hero";
import Featured from "../../components/home/Featured";
import NewArrival from "../../components/home/NewArrival";
import SavingZone from "../../components/home/SavingZone";
import Catalog from "../../components/home/Catalog";
import Brands from "../../components/home/Brands";
import Feedback from "../../components/home/Feedback";
import VirtualTryOn from "../VirtualTryOn";

const HomeScreenWrapper = styled.main``;

const TopBar = styled.div`
  background: #23231f;
  padding: 9px 28px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  font-family: 'Inter', sans-serif;
  color: #fff;
  border-bottom: 1px solid #3c3b35;
  animation: slideDown 0.5s ease-out;

  @keyframes slideDown {
    from { transform: translateY(-100%); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }

  .info-group {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 3px 0;
  }

  @media (max-width: 576px) { padding: 8px 16px; font-size: 11px; gap: 12px; }
`;

const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(18,18,15,0.78);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease-out;

  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const ModalContent = styled.div`
  background: #ffffff;
  padding: 40px;
  border-radius: 20px;
  width: min(470px, calc(100% - 32px));
  text-align: center;
  box-shadow: 0 28px 70px rgba(0,0,0,0.28);
  transform: scale(1);
  animation: scaleUp 0.3s ease-out;

  @keyframes scaleUp {
    from { transform: scale(0.9); opacity: 0; }
    to { transform: scale(1); opacity: 1; }
  }

  h2 {
    margin-top: 0;
    margin-bottom: 16px;
    font-family: "Playfair Display", Georgia, serif;
    font-size: 32px;
    color: #111;
    font-weight: 700;
  }
  
  p {
    margin-bottom: 28px;
    color: #555;
    font-size: 16px;
    line-height: 1.5;
  }
  
  .btn-group {
    display: flex;
    justify-content: center;
    gap: 12px;
  }

  button {
    background: #111;
    color: #fff;
    border: none;
    padding: 12px 24px;
    border-radius: 999px;
    cursor: pointer;
    font-weight: 600;
    font-size: 15px;
    transition: all 0.2s ease;
    
    &:hover {
      background: #333;
      transform: translateY(-2px);
    }
  }
  
  .skip-btn {
    background: #f0f0f0;
    color: #333;
    
    &:hover {
      background: #e4e4e4;
    }
  }
`;

const HomeScreen = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [locationName, setLocationName] = useState("");
  const [temperature, setTemperature] = useState(null);
  const [suggestedProducts, setSuggestedProducts] = useState([]);
  const [manualCity, setManualCity] = useState("");

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/products`);
        const contentType = response.headers.get("content-type");

        if (response.ok && contentType && contentType.includes("application/json")) {
          const data = await response.json();
          if (Array.isArray(data) && data.length > 0) {
            const shuffled = [...data].sort(() => 0.5 - Math.random());
            setAllProducts(shuffled);
            return;
          }
        }
        console.warn("API response was not JSON array. Using fallback products.");
        setAllProducts(defaultFallbackProducts);
      } catch (error) {
        console.warn("Failed to fetch products. Using fallback products:", error);
        setAllProducts(defaultFallbackProducts);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();

    const checkLocation = () => {
      const asked = localStorage.getItem("locationAsked");
      if (!asked) {
        setShowModal(true);
      } else {
        const lat = localStorage.getItem("lat");
        const lon = localStorage.getItem("lon");
        if (lat && lon) {
          fetchLocationInfo(lat, lon);
        }
      }
    };
    checkLocation();
  }, []);

  useEffect(() => {
    if (allProducts.length > 0 && temperature !== null) {
      let filtered = [];
      if (temperature > 25) {
        filtered = allProducts.filter(p => !p.title.toLowerCase().includes("jacket") && !p.title.toLowerCase().includes("sweater") && p.category !== "Jackets");
      } else if (temperature < 15) {
        filtered = allProducts.filter(p => p.title.toLowerCase().includes("jacket") || p.title.toLowerCase().includes("sweater") || p.category === "Shoes");
        if (filtered.length === 0) filtered = allProducts; // fallback
      } else {
        filtered = allProducts.filter(p => p.category === "Shirts" || p.category === "Tshirts" || p.category === "Shoes");
        if (filtered.length === 0) filtered = allProducts; // fallback
      }
      setSuggestedProducts(filtered.sort(() => 0.5 - Math.random()).slice(0, 5));
    }
  }, [allProducts, temperature]);

  const fetchLocationInfo = async (lat, lon) => {
    try {
      // Fetch current temperature
      const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`);
      const weatherData = await weatherRes.json();
      setTemperature(weatherData.current_weather.temperature);

      // Fetch location name
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
      const geoData = await geoRes.json();
      setLocationName(geoData.address.city || geoData.address.town || geoData.address.village || geoData.address.country || "Your Location");
    } catch (err) {
      console.error("Failed to fetch location data", err);
    }
  };

  const handleManualLocation = async () => {
    if (!manualCity.trim()) return;
    try {
      const geoRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(manualCity)}`);
      const geoData = await geoRes.json();
      if (geoData && geoData.length > 0) {
        const lat = geoData[0].lat;
        const lon = geoData[0].lon;
        localStorage.setItem("locationAsked", "true");
        localStorage.setItem("lat", lat);
        localStorage.setItem("lon", lon);
        setShowModal(false);
        fetchLocationInfo(lat, lon);
      } else {
        alert("City not found. Try another or use Detect Live Location.");
      }
    } catch (err) {
      console.error("Geocoding failed", err);
    }
  };

  const handleAllowLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          localStorage.setItem("locationAsked", "true");
          localStorage.setItem("lat", lat);
          localStorage.setItem("lon", lon);
          setShowModal(false);
          fetchLocationInfo(lat, lon);
        },
        (error) => {
          console.error("Error getting location", error);
          handleSkipLocation();
        }
      );
    } else {
      handleSkipLocation();
    }
  };

  const handleSkipLocation = () => {
    localStorage.setItem("locationAsked", "true");
    setShowModal(false);
  };

  return (
    <HomeScreenWrapper>
      {showModal && (
        <ModalOverlay>
          <ModalContent>
            <h2>Enable Location</h2>
            <p>We'd like to suggest clothing perfectly suited for your surroundings.</p>
            
            <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'center' }}>
                <input 
                    type="text" 
                    placeholder="Enter city manually..." 
                    value={manualCity} 
                    onChange={(e) => setManualCity(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleManualLocation()}
                    style={{ padding: '12px 16px', width: '60%', borderRadius: '999px', border: '1px solid #dedbd3', marginRight: '8px', fontSize: '15px', background: '#f7f5ef' }}
                />
                <button onClick={handleManualLocation} style={{ padding: '12px 20px', background: '#d45b3f', color: 'white', borderRadius: '999px', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}>
                    Search
                </button>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', margin: '20px 0', color: '#999' }}>
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
                <span style={{ padding: '0 10px', fontSize: '13px', fontWeight: 'bold' }}>OR</span>
                <div style={{ flex: 1, height: '1px', background: '#eee' }}></div>
            </div>

            <div className="btn-group">
               <button onClick={handleAllowLocation} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  <i className="bi bi-geo-alt-fill"></i> Use Live Location
               </button>
               <button className="skip-btn" onClick={handleSkipLocation} style={{ width: 'auto' }}>Skip</button>
            </div>
          </ModalContent>
        </ModalOverlay>
      )}

      {locationName && temperature !== null && (
        <TopBar>
          <div className="info-group">
            <i className="bi bi-geo-alt-fill"></i>
            <span>Current Location: <strong>{locationName}</strong></span>
          </div>
          <div className="info-group">
            <i className="bi bi-thermometer-half"></i>
            <span>Temperature: <strong>{temperature}°C</strong></span>
          </div>
        </TopBar>
      )}

      <Hero />
      {loading ? (
        <div className="flex justify-center items-center py-40">
          <i className="bi bi-arrow-clockwise fa-spin text-5xl" style={{ animation: "spin 1s linear infinite" }}></i>
          <span className="ml-4 text-2xl font-bold text-gray-500">Loading Products...</span>
        </div>
      ) : (
        <>
          {suggestedProducts.length > 0 && (
             <Catalog catalogTitle="Surrounding Suggestions" products={suggestedProducts} />
          )}
          <NewArrival products={allProducts.slice(0, 5)} />
          <Catalog catalogTitle={"All Products"} products={allProducts} />
        </>
      )}
      <Brands />
    </HomeScreenWrapper>
  );
};

export default HomeScreen;
