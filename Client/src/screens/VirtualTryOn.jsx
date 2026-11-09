import React, { useState, useRef, useEffect, useCallback } from "react";
import { useLocation } from "react-router-dom";
import Webcam from "react-webcam";
import io from "socket.io-client";
import styled, { keyframes, css } from "styled-components";
import { Container, Section } from "../styles/styles";
import { BaseButtonBlack, BaseButtonGreen } from "../styles/button";
import { breakpoints, defaultTheme } from "../styles/themes/default";
import { API_BASE_URL, ML_BASE_URL } from "../config/apiConfig";
import { garmentTypeFor, loadGarmentAsPng, LIVE_FRAME_FORMAT, LIVE_FRAME_QUALITY } from "../utils/tryOn";

// ─────────────────────────────────────────────────────────────────────────────
//  Socket — singleton; connected while the try-on page is open
// ─────────────────────────────────────────────────────────────────────────────
const socket = io(ML_BASE_URL, { transports: ["websocket", "polling"], autoConnect: false });

// If a frame reply never arrives (dropped connection, server restart), stop
// waiting after this long so the live feed doesn't freeze.
const FRAME_TIMEOUT_MS = 4000;

const STATUS_COLORS = { online: "#1f8a4c", connecting: "#b7791f", offline: "#b7791f" };

const ServerStatus = styled.p`
  display: inline-flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
  font-size: 13px;
  font-weight: 600;
  color: ${(p) => STATUS_COLORS[p.$status]};

  &::before {
    content: "";
    width: 8px;
    height: 8px;
    background: ${(p) => STATUS_COLORS[p.$status]};
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Animations
// ─────────────────────────────────────────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const shimmer = keyframes`
  0%   { background-position: -400px 0; }
  100% { background-position:  400px 0; }
`;

const pulse = keyframes`
  0%, 100% { opacity: 1; }
  50%       { opacity: 0.55; }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const scanLine = keyframes`
  0%   { top: 0%; }
  100% { top: 100%; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Layout
// ─────────────────────────────────────────────────────────────────────────────
const PageHeader = styled.div`
  margin-bottom: 28px;
  h2 {
    font-family: "Playfair Display", Georgia, serif;
    font-size: clamp(34px, 5vw, 52px);
    font-weight: 700;
    color: ${defaultTheme.color_jet};
    letter-spacing: -0.5px;
    margin-bottom: 6px;
    span { color: ${defaultTheme.color_sea_green}; }
  }
  p {
    color: ${defaultTheme.color_gray};
    font-size: 14px;
    max-width: 560px;
  }
`;

const TryOnWrapper = styled.div`
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: 0;
  border-radius: 0;
  overflow: hidden;
  box-shadow: none;
  background: #0a0a0f;
  min-height: 680px;

  @media (max-width: ${breakpoints.lg}) {
    grid-template-columns: 1fr;
    min-height: auto;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Mode Toggle Bar
// ─────────────────────────────────────────────────────────────────────────────
const ModeBar = styled.div`
  display: flex;
  gap: 0;
  background: #18181f;
  border-radius: 0;
  padding: 4px;
  margin-bottom: 20px;
  width: fit-content;
  border: 1px solid #2d2d35;
`;

const ModeBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 20px;
  border: none;
  border-radius: 0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.22s ease;
  letter-spacing: 0.2px;
  background: ${(p) => (p.$active ? defaultTheme.color_sea_green : "transparent")};
  color: ${(p) => (p.$active ? "#fff" : "#939393")};
  box-shadow: none;

  &:hover:not(:disabled) {
    color: #fff;
    background: ${(p) => (p.$active ? defaultTheme.color_sea_green : "#292932")};
  }
  svg { width: 16px; height: 16px; flex-shrink: 0; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Main Viewport (webcam / result area)
// ─────────────────────────────────────────────────────────────────────────────
const ViewportArea = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: #0d0d14;
  min-height: 680px;
  overflow: hidden;

  @media (max-width: ${breakpoints.lg}) {
    min-height: 420px;
  }
`;

const ViewportInner = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const WebcamFeed = styled(Webcam)`
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
`;

const ResultImage = styled.img`
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform: scaleX(-1);
  animation: ${fadeIn} 0.1s ease;
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Overlays
// ─────────────────────────────────────────────────────────────────────────────
const ScanLineOverlay = styled.div`
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  opacity: ${(p) => (p.$active ? 1 : 0)};
  transition: opacity 0.3s;

  &::after {
    content: "";
    position: absolute;
    left: 0;
    width: 100%;
    height: 2px;
    background: ${defaultTheme.color_sea_green};
    box-shadow: none;
    animation: ${(p) => (p.$active ? css`${scanLine} 2.2s linear infinite` : "none")};
  }
`;

const CornerBrackets = styled.div`
  position: absolute;
  inset: 16px;
  pointer-events: none;
  opacity: ${(p) => (p.$visible ? 0.6 : 0)};
  transition: opacity 0.4s;

  &::before, &::after,
  span::before, span::after {
    content: "";
    position: absolute;
    width: 22px;
    height: 22px;
    border-color: ${defaultTheme.color_sea_green};
    border-style: solid;
  }
  &::before { top: 0; left: 0; border-width: 2px 0 0 2px; border-radius: 0; }
  &::after  { top: 0; right: 0; border-width: 2px 2px 0 0; border-radius: 0; }
  span::before { bottom: 0; left: 0; border-width: 0 0 2px 2px; border-radius: 0; }
  span::after  { bottom: 0; right: 0; border-width: 0 2px 2px 0; border-radius: 0; }
`;

const SilhouetteGuide = styled.div`
  position: absolute;
  top: 45%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 280px;
  height: 420px;
  pointer-events: none;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.4s ease;
  opacity: ${(p) => (p.$visible ? 0.45 : 0)};
  z-index: 4;

  .silhouette-head {
    width: 100px;
    height: 125px;
    border: 3px solid ${defaultTheme.color_sea_green};
    border-radius: 0;
    margin-bottom: 12px;
    box-shadow: none;
  }
  .silhouette-shoulders {
    width: 250px;
    height: 160px;
    border: 3px solid ${defaultTheme.color_sea_green};
    border-bottom: none;
    border-top-left-radius: 120px;
    border-top-right-radius: 120px;
    box-shadow: none;
  }
  .guide-text {
    margin-top: 24px;
    background: rgba(10, 10, 15, 0.85);
    border: 1px solid ${defaultTheme.color_sea_green};
    color: ${defaultTheme.color_sea_green};
    padding: 8px 16px;
    border-radius: 0;
    font-size: 12px;
    font-weight: 700;
    letter-spacing: 0.2px;
    box-shadow: none;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 6px;
  }
`;

// HUD badges (top-right area)
const HudBadge = styled.div`
  position: absolute;
  right: 16px;
  background: #18181f;
  border: 1px solid ${(p) => p.$color || "#353535"};
  border-radius: 0;
  padding: 9px 14px;
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  animation: ${fadeIn} 0.3s ease;
  top: ${(p) => p.$top || "16px"};
  z-index: 20;
  white-space: nowrap;

  .dot {
    width: 8px; height: 8px; border-radius: 0;
    background: ${(p) => p.$color || defaultTheme.color_sea_green};
    animation: ${(p) => (p.$pulse ? css`${pulse} 1.4s ease infinite` : "none")};
  }
`;

const SizeBadge = styled(HudBadge)`
  background: #183a35;
  border-color: ${defaultTheme.color_sea_green};
  top: ${(p) => p.$top};

  .size-tag {
    background: ${defaultTheme.color_sea_green};
    color: #fff;
    font-size: 11px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 0;
    letter-spacing: 0.5px;
  }
`;

const HQBadge = styled(HudBadge)`
  background: #34293b;
  border-color: #b785c9;
  cursor: pointer;
  transition: all 0.2s ease;
  user-select: none;

  &:hover { background: #44334e; transform: none; }
  &:active { transform: scale(0.98); }

  .dot { background: #d9a3e8; }
`;

// Bottom controls bar
const ControlsBar = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 20px 24px;
  background: #111118;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  z-index: 20;
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const IconBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  border-radius: 0;
  border: 1px solid ${(p) => p.$border || "#414141"};
  background: ${(p) => p.$bg || "#292932"};
  color: ${(p) => p.$color || "#fff"};
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;

  &:hover:not(:disabled) {
    background: ${(p) => p.$hoverBg || "#363640"};
    transform: none;
  }
  &:active { transform: scale(0.97); }
  &:disabled { opacity: 0.45; cursor: not-allowed; }
  svg { width: 15px; height: 15px; flex-shrink: 0; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Camera idle state
// ─────────────────────────────────────────────────────────────────────────────
const IdleState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 40px 24px;
  text-align: center;

  .icon-ring {
    width: 80px; height: 80px;
    border-radius: 0;
    background: rgba(16,185,177,0.1);
    border: 2px solid rgba(16,185,177,0.3);
    display: flex; align-items: center; justify-content: center;
    margin-bottom: 4px;
    svg { width: 36px; height: 36px; color: ${defaultTheme.color_sea_green}; }
  }
  h3 { font-size: 18px; font-weight: 700; color: #fff; margin: 0; }
  p  { font-size: 13px; color: #888888; margin: 0; max-width: 260px; line-height: 1.6; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Photo Upload Mode
// ─────────────────────────────────────────────────────────────────────────────
const PhotoUploadArea = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 32px;
  gap: 20px;
  min-height: 420px;
`;

const DropZone = styled.label`
  width: 100%;
  max-width: 400px;
  border: 2px dashed rgba(16,185,177,0.4);
  border-radius: 0;
  padding: 40px 24px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s ease;
  background: rgba(16,185,177,0.04);
  position: relative;

  &:hover, &.drag-over {
    border-color: ${defaultTheme.color_sea_green};
    background: rgba(16,185,177,0.09);
  }

  input[type="file"] { display: none; }

  .upload-icon {
    width: 52px; height: 52px;
    border-radius: 0;
    background: rgba(16,185,177,0.12);
    display: flex; align-items: center; justify-content: center;
    margin: 0 auto 14px;
    svg { width: 26px; height: 26px; color: ${defaultTheme.color_sea_green}; }
  }
  h4 { font-size: 15px; font-weight: 700; color: #fff; margin: 0 0 6px; }
  p  { font-size: 12px; color: #7b7b7b; margin: 0; }
  .formats { margin-top: 10px; font-size: 11px; color: #585858; }
`;

const PhotoPreview = styled.div`
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 420px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;

  img {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 0;
  }
`;

const ProcessingOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: #08080e;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 16px;
  z-index: 30;
  animation: ${fadeIn} 0.2s ease;

  .spinner {
    width: 48px; height: 48px;
    border-radius: 0;
    border: 3px solid rgba(16,185,177,0.2);
    border-top-color: ${defaultTheme.color_sea_green};
    animation: ${spin} 0.8s linear infinite;
  }
  h4 { color: #fff; font-size: 16px; font-weight: 700; margin: 0; }
  p  { color: #888888; font-size: 13px; margin: 0; text-align: center; }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Height slider (for size estimation calibration)
// ─────────────────────────────────────────────────────────────────────────────
const HeightSliderWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  background: #1a1a22;
  border: 1px solid #2d2d35;
  border-radius: 0;
  padding: 8px 14px;
  width: 100%;
  max-width: 400px;

  label { font-size: 12px; color: #888888; white-space: nowrap; }
  input[type="range"] {
    flex: 1;
    accent-color: ${defaultTheme.color_sea_green};
    cursor: pointer;
  }
  span {
    font-size: 13px;
    font-weight: 700;
    color: ${defaultTheme.color_sea_green};
    min-width: 44px;
    text-align: right;
  }
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Sidebar — Garment & Accessory Selection
// ─────────────────────────────────────────────────────────────────────────────
const Sidebar = styled.div`
  background: #111118;
  border-left: 1px solid #242424;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  /* Match the stage height; the garment list scrolls inside */
  max-height: 680px;

  @media (max-width: ${breakpoints.lg}) {
    border-left: none;
    border-top: 1px solid #242424;
    max-height: 340px;
  }
`;

const SidebarTabs = styled.div`
  display: flex;
  border-bottom: 1px solid #242424;
  flex-shrink: 0;
`;

const SidebarTab = styled.button`
  flex: 1;
  padding: 14px 8px;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  transition: all 0.2s ease;
  color: ${(p) => (p.$active ? defaultTheme.color_sea_green : "#646464")};
  border-bottom: 2px solid ${(p) => (p.$active ? defaultTheme.color_sea_green : "transparent")};
  margin-bottom: -1px;

  &:hover { color: #c3c3c3; }
`;

const SidebarScroll = styled.div`
  overflow-y: auto;
  flex: 1;
  min-height: 0;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;

  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #2e2e2e; border-radius: 0; }
`;

const GarmentCard = styled.div`
  flex-shrink: 0;
  border-radius: 0;
  border: 2px solid ${(p) => (p.$active ? defaultTheme.color_sea_green : "#242424")};
  background: ${(p) => (p.$active ? "#183a35" : "#191920")};
  cursor: pointer;
  overflow: hidden;
  transition: all 0.2s ease;
  position: relative;

  &:hover {
    border-color: ${(p) => (p.$active ? defaultTheme.color_sea_green : "#414141")};
    background: #25252d;
  }

  img {
    width: 100%;
    height: 140px;
    object-fit: contain;
    padding: 12px;
    background: #fff;
    display: block;
  }

  .active-check {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 22px; height: 22px;
    border-radius: 0;
    background: ${defaultTheme.color_sea_green};
    display: ${(p) => (p.$active ? "flex" : "none")};
    align-items: center; justify-content: center;
    svg { width: 12px; height: 12px; color: #fff; }
  }
`;

const AccessoryCard = styled(GarmentCard)`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  height: 110px;

  .emoji { font-size: 36px; margin-bottom: 6px; line-height: 1; }
  .label { font-size: 11px; font-weight: 600; color: #9f9f9f; text-align: center; }

  img { display: none; }
`;

const ShimmerCard = styled.div`
  flex-shrink: 0;
  height: 160px;
  border-radius: 0;
  background: #1c1c1c;
  animation: ${shimmer} 1.4s ease infinite;
`;

// ─────────────────────────────────────────────────────────────────────────────
//  Status hint at the bottom of sidebar
// ─────────────────────────────────────────────────────────────────────────────
const SidebarStatus = styled.div`
  padding: 12px;
  font-size: 11px;
  color: #585858;
  border-top: 1px solid #222222;
  text-align: center;
  flex-shrink: 0;
  line-height: 1.5;
`;

// ─────────────────────────────────────────────────────────────────────────────
//  SVG icon helpers
// ─────────────────────────────────────────────────────────────────────────────
const CameraIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const ImageIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

const SparkleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

const DownloadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
    <polyline points="7 10 12 15 17 10"/>
    <line x1="12" y1="15" x2="12" y2="3"/>
  </svg>
);

const CheckIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const UploadIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="16 16 12 12 8 16"/>
    <line x1="12" y1="12" x2="12" y2="21"/>
    <path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/>
  </svg>
);

const StopIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor">
    <rect x="4" y="4" width="16" height="16" rx="3"/>
  </svg>
);

// ─────────────────────────────────────────────────────────────────────────────
//  Main Component
// ─────────────────────────────────────────────────────────────────────────────
const VirtualTryOn = () => {
  // ── Webcam state ───────────────────────────────────────────────────────────
  const [webcamActive,    setWebcamActive]    = useState(false);
  const webcamRef    = useRef(null);
  const isProcessing = useRef(false);

  // ── Garment / result state ─────────────────────────────────────────────────
  const [selectedImage,  setSelectedImage]   = useState(null);   // processed frame
  const [shirtImage,     setShirtImage]      = useState(null);   // base64 shirt
  const [activeShirt,    setActiveShirt]     = useState(null);
  const [detectedSize,   setDetectedSize]    = useState("");
  const [isAiProcessing, setIsAiProcessing]  = useState(false);
  const [aiFeedback,     setAiFeedback]      = useState("");

  // ── Mode: "live" | "photo" ─────────────────────────────────────────────────
  const [inputMode,      setInputMode]       = useState("live");

  // ── HQ mode toggle ─────────────────────────────────────────────────────────
  const [hqMode,         setHqMode]          = useState(false);

  // ── Photo upload state ─────────────────────────────────────────────────────
  const [photoFile,      setPhotoFile]       = useState(null);    // File object
  const [photoPreview,   setPhotoPreview]    = useState(null);    // object URL
  const [photoProcessing, setPhotoProcessing] = useState(false);
  const [photoResult,    setPhotoResult]     = useState(null);    // base64 result
  const [tryOnHistory, setTryOnHistory] = useState(() => { try { return JSON.parse(localStorage.getItem("tryOnHistory") || "[]"); } catch { return []; } });
  const fileInputRef = useRef(null);

  // ── Height calibration ─────────────────────────────────────────────────────
  const [userHeightCm,   setUserHeightCm]    = useState(175);

  // ── Products / accessories ─────────────────────────────────────────────────
  const [allProducts,    setAllProducts]     = useState([]);
  const [loading,        setLoading]         = useState(true);
  const [activeTab,      setActiveTab]       = useState("clothing");
  const [activeAccessory, setActiveAccessory] = useState(null);

  const location = useLocation();

  const accessoryItems = [
    { id: "sunglasses", icon: "🕶️", label: "Sunglasses" },
    { id: "hat",        icon: "👒", label: "Fashion Cap" },
    { id: "crown",      icon: "👑", label: "Royal Crown" },
    { id: "none",       icon: "✕",  label: "Clear All"   },
  ];

  // Filter try-on eligible products
  const tryOnClothes = allProducts.filter((p) => {
    const text = `${p.title} ${p.category || ""}`.toLowerCase();
    return ["shirt", "top", "t-shirt", "tshirt"].some((term) => text.includes(term));
  });

  // ── Socket.IO connection ────────────────────────────────────────────────────
  // The server keeps the chosen garment per connection, so after every
  // (re)connect the current garment and accessory are sent again.
  const garmentRef = useRef(null);      // { shirt, garment_type }
  const accessoryRef = useRef(null);
  const frameSentAt = useRef(0);
  const [serverStatus, setServerStatus] = useState(socket.connected ? "online" : "connecting");

  useEffect(() => {
    const onConnect = () => {
      setServerStatus("online");
      if (garmentRef.current) socket.emit("update_garment", garmentRef.current);
      if (accessoryRef.current) socket.emit("update_accessory", { accessory: accessoryRef.current });
    };
    const onDisconnect = () => setServerStatus("connecting");
    const onConnectError = () => setServerStatus("offline");
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.connect();
    return () => {
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.disconnect();
    };
  }, []);

  // ── Socket.IO listeners ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // Fast preview response (PRESERVED event name)
    socket.on("frame_processed", (data) => {
      setSelectedImage(`data:image/jpeg;base64,${data.frame}`);
      if (data.detected_size) setDetectedSize(data.detected_size);
      setAiFeedback("");
      setIsAiProcessing(false);
      isProcessing.current = false;
    });

    // HQ response (NEW event)
    socket.on("frame_processed_hq", (data) => {
      setSelectedImage(`data:image/jpeg;base64,${data.frame}`);
      if (data.detected_size) setDetectedSize(data.detected_size);
      setAiFeedback("");
      setIsAiProcessing(false);
      isProcessing.current = false;
    });

    socket.on("no_fit", (data) => {
      setAiFeedback(data.message);
      setIsAiProcessing(false);
      isProcessing.current = false;
    });

    socket.on("error", (err) => {
      console.error("ML Server error:", err.message);
      isProcessing.current = false;
      setIsAiProcessing(false);
    });

    return () => {
      socket.off("frame_processed");
      socket.off("frame_processed_hq");
      socket.off("no_fit");
      socket.off("error");
    };
  }, []);

  // ── Fetch products ──────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res  = await fetch(`${API_BASE_URL}/api/products`);
        const data = await res.json();
        if (Array.isArray(data)) {
          setAllProducts(data);
        } else {
          console.error("Failed to fetch products: expected array but got", data);
          setAllProducts([]);
        }
      } catch (e) {
        console.error("Failed to fetch products:", e);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  // ── Auto-select product passed via navigation state ─────────────────────────
  useEffect(() => {
    if (allProducts.length > 0 && location.state?.productId && location.state?.imgSource) {
      const p = allProducts.find((x) => x.id === location.state.productId);
      const text = p ? `${p.title} ${p.category || ""}`.toLowerCase() : "custom top";
      const isTryOnable = ["shirt", "top", "t-shirt", "tshirt"].some((term) =>
        text.includes(term)
      );
      if (isTryOnable && !activeShirt) {
        handleGarmentClick(location.state.imgSource, location.state.productId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [allProducts, location.state]);

  // ── Select garment ─────────────────────────────────────────────────────────
  const handleGarmentClick = async (imageUrl, id) => {
    setActiveShirt(id);
    try {
      const b64 = await loadGarmentAsPng(imageUrl);
      const garment = { shirt: b64, garment_type: garmentTypeFor(allProducts.find((p) => p.id === id)) };
      garmentRef.current = garment;
      setShirtImage(b64);
      socket.emit("update_garment", garment);
    } catch (e) {
      console.error("Garment load error:", e);
      setAiFeedback("Could not load this garment. Please pick another one.");
    }
  };

  // ── Select accessory ───────────────────────────────────────────────────────
  const handleAccessoryClick = (accId) => {
    const id = accId === "none" ? null : accId;
    accessoryRef.current = id;
    setActiveAccessory(id);
    socket.emit("update_accessory", { accessory: id });
  };

  // ── Send live frame (PRESERVED emit name: "process_frame") ─────────────────
  const sendFrame = useCallback(() => {
    if (!webcamRef.current || !socket.connected) return;
    if (!activeShirt && !activeAccessory)          return;
    if (isProcessing.current && Date.now() - frameSentAt.current < FRAME_TIMEOUT_MS) return;

    const shot = webcamRef.current.getScreenshot();
    if (!shot) return;

    isProcessing.current = true;
    frameSentAt.current = Date.now();
    setIsAiProcessing(true);

    const frameB64 = shot.split(",")[1];
    const event    = hqMode ? "frame_hq" : "process_frame";
    socket.emit(event, { frame: frameB64, user_height_cm: userHeightCm });
  }, [activeShirt, activeAccessory, hqMode, userHeightCm]);

  // ── Frame interval (live mode) ─────────────────────────────────────────────
  useEffect(() => {
    if (!webcamActive || inputMode !== "live") return;
    if (!shirtImage && !activeAccessory) return;

    // HQ mode: single shot per button press, not continuous
    if (hqMode) return;

    const interval = setInterval(sendFrame, 110);
    return () => clearInterval(interval);
  }, [webcamActive, inputMode, shirtImage, activeAccessory, hqMode, sendFrame]);

  // ── Toggle webcam ──────────────────────────────────────────────────────────
  const toggleWebcam = () => {
    setWebcamActive((p) => !p);
    setSelectedImage(null);
    setDetectedSize("");
    setAiFeedback("");
    setIsAiProcessing(false);
    isProcessing.current = false;

    if (webcamActive && webcamRef.current?.stream) {
      webcamRef.current.stream.getTracks().forEach((t) => t.stop());
    }
  };

  // ── Switch input mode ──────────────────────────────────────────────────────
  const handleModeSwitch = (mode) => {
    if (mode === inputMode) return;
    // Stop webcam when switching to photo
    if (mode === "photo" && webcamActive) toggleWebcam();
    setInputMode(mode);
    setSelectedImage(null);
    setPhotoResult(null);
    setDetectedSize("");
    setAiFeedback("");
  };

  // ── Photo file selection ───────────────────────────────────────────────────
  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoResult(null);
    setDetectedSize("");
    setAiFeedback("");
    const url = URL.createObjectURL(file);
    setPhotoPreview(url);
  };

  const blobToBase64 = (blob) =>
    new Promise((res, rej) => {
      const reader = new FileReader();
      reader.onloadend = () => res(reader.result.split(",")[1]);
      reader.onerror   = rej;
      reader.readAsDataURL(blob);
    });

  // ── Run photo try-on ───────────────────────────────────────────────────────
  const runPhotoTryOn = async () => {
    if (!photoFile || !shirtImage) return;
    setPhotoProcessing(true);
    setAiFeedback("");
    try {
      const frameB64 = await blobToBase64(photoFile);
      const res = await fetch(`${ML_BASE_URL}/tryon/photo`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          frame:          frameB64,
          shirt:          shirtImage,
          garment_type:   garmentRef.current?.garment_type || "top",
          user_height_cm: userHeightCm,
          hq:             true,
        }),
      });
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setPhotoResult(`data:image/jpeg;base64,${data.result}`);
      if (data.detected_size) setDetectedSize(data.detected_size);
    } catch (e) {
      console.error("Photo try-on failed:", e);
      setAiFeedback("Processing failed. Please try again.");
    } finally {
      setPhotoProcessing(false);
    }
  };

  // ── HQ snapshot (manual trigger in live mode) ──────────────────────────────
  const captureHQShot = () => {
    if (!webcamRef.current || !shirtImage) return;
    const shot = webcamRef.current.getScreenshot();
    if (!shot) return;
    isProcessing.current = true;
    frameSentAt.current = Date.now();
    setIsAiProcessing(true);
    socket.emit("frame_hq", {
      frame:          shot.split(",")[1],
      user_height_cm: userHeightCm,
    });
  };

  // ── Download result ────────────────────────────────────────────────────────
  const downloadResult = () => {
    const src = photoResult || selectedImage;
    if (!src) return;
    const a = document.createElement("a");
    a.href     = src;
    a.download = "MyWearYourStyleFit.jpg";
    a.click();
  };

  const saveResult = () => {
    const src = photoResult || selectedImage;
    if (!src) return;
    const next = [{ id: Date.now(), src, size: detectedSize, createdAt: new Date().toISOString() }, ...tryOnHistory].slice(0, 3);
    try { localStorage.setItem("tryOnHistory", JSON.stringify(next)); setTryOnHistory(next); } catch { setAiFeedback("This result is too large to save on your device. Download it instead."); }
  };

  // ── Derived state ──────────────────────────────────────────────────────────
  const hasResult     = !!(selectedImage || photoResult);
  const canTryOn      = !!shirtImage;
  const isLive        = inputMode === "live";
  const isPhotoMode   = inputMode === "photo";
  const activeResult  = photoResult || selectedImage;

  const sizeColors = { XS: "#a78bfa", S: "#60a5fa", M: "#34d399", L: "#fbbf24", XL: "#f87171" };

  // ─────────────────────────────────────────────────────────────────────────
  //  Render
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <Section>
      <Container>
        <PageHeader>
          <h2>AI Virtual <span>Try-On</span></h2>
          <p>Select a garment, choose your mode, and see how it looks on you in real time.</p>
          <ServerStatus $status={serverStatus} role="status">
            {serverStatus === "online"
              ? "Try-on server connected"
              : serverStatus === "offline"
                ? "Try-on server is starting up. This can take up to a minute on first use…"
                : "Connecting to the try-on server…"}
          </ServerStatus>
        </PageHeader>

        {/* Mode toggle */}
        <ModeBar>
          <ModeBtn
            id="mode-live"
            $active={isLive}
            onClick={() => handleModeSwitch("live")}
          >
            <CameraIcon /> Live Camera
          </ModeBtn>
          <ModeBtn
            id="mode-photo"
            $active={isPhotoMode}
            onClick={() => handleModeSwitch("photo")}
          >
            <ImageIcon /> Upload Photo
          </ModeBtn>
        </ModeBar>

        <TryOnWrapper>

          {/* ── LEFT: Viewport ─────────────────────────────────────────── */}
          <ViewportArea>

            {/* ─────── LIVE MODE ─────────────────────────────────────── */}
            {isLive && (
              <>
                {!webcamActive ? (
                  <IdleState>
                    <div className="icon-ring"><CameraIcon /></div>
                    <h3>Ready to Try On</h3>
                    <p>
                      {canTryOn
                        ? "Camera is off. Click Enable Camera to start."
                        : "Select a garment from the sidebar, then enable the camera."}
                    </p>
                    <BaseButtonGreen
                      id="btn-enable-camera"
                      onClick={toggleWebcam}
                      style={{ marginTop: 8, minWidth: 160 }}
                    >
                      Enable Camera
                    </BaseButtonGreen>
                  </IdleState>
                ) : (
                  <ViewportInner>
                    {/* Live webcam feed */}
                    <WebcamFeed
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat={LIVE_FRAME_FORMAT}
                      screenshotQuality={LIVE_FRAME_QUALITY}
                      videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                      mirrored={true}
                    />

                    {/* Processed try-on result overlay */}
                    {selectedImage && (
                      <ResultImage src={selectedImage} alt="Virtual Try-On" />
                    )}

                    {/* Corner tracking brackets */}
                    <CornerBrackets $visible={webcamActive}>
                      <span />
                    </CornerBrackets>

                    {/* Visual silhouette guide overlay */}
                    {!selectedImage && (
                      <SilhouetteGuide $visible={webcamActive}>
                        <div className="silhouette-head" />
                        <div className="silhouette-shoulders" />
                        <div className="guide-text">
                          <i className="bi bi-person-bounding-box" />
                          Align shoulders & step back
                        </div>
                      </SilhouetteGuide>
                    )}

                    {/* AI scan line */}
                    <ScanLineOverlay $active={isAiProcessing} />

                    {/* HUD — AI status */}
                    <HudBadge
                      $top="16px"
                      $color={isAiProcessing ? "#fbbf24" : defaultTheme.color_sea_green}
                      $pulse={isAiProcessing}
                    >
                      <div className="dot" />
                      {isAiProcessing
                        ? "Analyzing…"
                        : aiFeedback || (selectedImage ? "Fit Ready" : "AI Standby")}
                    </HudBadge>

                    {/* HUD — Size recommendation */}
                    {detectedSize && detectedSize !== "Unknown" && (
                      <SizeBadge $top="62px">
                        <i className="bi bi-rulers" style={{ fontSize: 14, color: defaultTheme.color_sea_green }} />
                        Estimated Size:&nbsp;
                        <span
                          className="size-tag"
                          style={{ background: sizeColors[detectedSize] || defaultTheme.color_sea_green }}
                        >
                          {detectedSize}
                        </span>
                      </SizeBadge>
                    )}

                    {/* HUD — HQ mode indicator (click to toggle) */}
                    <HQBadge
                      id="btn-hq-toggle"
                      $top="108px"
                      title={hqMode ? "Click for Fast Preview" : "Click for HQ Mode"}
                      onClick={() => setHqMode((p) => !p)}
                    >
                      <div className="dot" />
                      {hqMode ? "✨ HQ Mode" : "⚡ Fast Preview"}
                    </HQBadge>

                    {/* Prompt when no garment selected */}
                    {!shirtImage && !activeAccessory && (
                      <div style={{
                        position: "absolute", top: "42%",
                        color: "#6f6f6f", fontSize: 13, fontWeight: 600,
                        textAlign: "center", zIndex: 10, pointerEvents: "none",
                      }}>
                        ← Select a garment or accessory
                      </div>
                    )}

                    {/* Bottom controls */}
                    <ControlsBar>
                      <ControlGroup>
                        <IconBtn
                          id="btn-stop-camera"
                          $bg="rgba(239,68,68,0.15)"
                          $border="rgba(239,68,68,0.4)"
                          $color="#fca5a5"
                          $hoverBg="rgba(239,68,68,0.28)"
                          onClick={toggleWebcam}
                        >
                          <StopIcon /> Stop
                        </IconBtn>

                        {hqMode && shirtImage && (
                          <IconBtn
                            id="btn-hq-capture"
                            $bg="rgba(139,92,246,0.15)"
                            $border="rgba(139,92,246,0.4)"
                            $color="#c4b5fd"
                            $hoverBg="rgba(139,92,246,0.28)"
                            onClick={captureHQShot}
                            disabled={isAiProcessing}
                          >
                            <SparkleIcon />
                            {isAiProcessing ? "Processing…" : "Capture HQ"}
                          </IconBtn>
                        )}
                      </ControlGroup>

                      <ControlGroup>
                        {hasResult && (
                          <IconBtn
                            id="btn-download-live"
                            $bg="rgba(16,185,177,0.15)"
                            $border="rgba(16,185,177,0.4)"
                            $color="#5eead4"
                            $hoverBg="rgba(16,185,177,0.28)"
                            onClick={downloadResult}
                          >
                            <DownloadIcon /> Share Fit
                          </IconBtn>
                        )}
                      </ControlGroup>
                    </ControlsBar>
                  </ViewportInner>
                )}
              </>
            )}

            {/* ─────── PHOTO MODE ────────────────────────────────────── */}
            {isPhotoMode && (
              <>
                {!photoPreview ? (
                  <PhotoUploadArea>
                    <DropZone htmlFor="photo-file-input" id="photo-dropzone">
                      <input
                        id="photo-file-input"
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoSelect}
                      />
                      <div className="upload-icon"><UploadIcon /></div>
                      <h4>Upload Your Photo</h4>
                      <p>Drop a full-body photo or click to browse</p>
                      <div className="formats">JPG · PNG · WebP · AVIF</div>
                    </DropZone>

                    <HeightSliderWrap>
                      <label>Height</label>
                      <input
                        id="height-slider"
                        type="range"
                        min={140} max={210}
                        value={userHeightCm}
                        onChange={(e) => setUserHeightCm(Number(e.target.value))}
                      />
                      <span>{userHeightCm} cm</span>
                    </HeightSliderWrap>
                  </PhotoUploadArea>
                ) : (
                  <PhotoPreview>
                    {/* Show either the result or the original photo */}
                    <img
                      src={photoResult || photoPreview}
                      alt={photoResult ? "Try-On Result" : "Your Photo"}
                      id="photo-result-img"
                    />

                    {/* Processing overlay */}
                    {photoProcessing && (
                      <ProcessingOverlay>
                        <div className="spinner" />
                        <h4>Analyzing with AI…</h4>
                        <p>
                          {hqMode
                            ? "Running high-quality HR-VITON model.\nThis takes 2–8 seconds."
                            : "Processing your photo…"}
                        </p>
                      </ProcessingOverlay>
                    )}

                    {/* Size badge */}
                    {detectedSize && detectedSize !== "Unknown" && !photoProcessing && (
                      <SizeBadge $top="16px">
                        <i className="bi bi-rulers" style={{ fontSize: 14, color: defaultTheme.color_sea_green }} />
                        Estimated Size:&nbsp;
                        <span
                          className="size-tag"
                          style={{ background: sizeColors[detectedSize] || defaultTheme.color_sea_green }}
                        >
                          {detectedSize}
                        </span>
                      </SizeBadge>
                    )}

                    {/* Feedback message */}
                    {aiFeedback && !photoProcessing && (
                      <HudBadge $top="16px" $color="#f87171">
                        <div className="dot" style={{ background: "#f87171" }} />
                        {aiFeedback}
                      </HudBadge>
                    )}

                    {/* Bottom controls */}
                    <ControlsBar>
                      <ControlGroup>
                        <IconBtn
                          id="btn-change-photo"
                          onClick={() => {
                            setPhotoFile(null);
                            setPhotoPreview(null);
                            setPhotoResult(null);
                            setDetectedSize("");
                          }}
                        >
                          Change Photo
                        </IconBtn>

                        {/* Height slider inline */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 11, color: "#6f6f6f" }}>Height</span>
                          <input
                            type="range" min={140} max={210}
                            value={userHeightCm}
                            onChange={(e) => setUserHeightCm(Number(e.target.value))}
                            style={{ width: 80, accentColor: defaultTheme.color_sea_green }}
                          />
                          <span style={{ fontSize: 12, color: defaultTheme.color_sea_green, fontWeight: 700, minWidth: 44 }}>
                            {userHeightCm} cm
                          </span>
                        </div>
                      </ControlGroup>

                      <ControlGroup>
                        {!photoResult ? (
                          <IconBtn
                            id="btn-run-tryon"
                            $bg="rgba(16,185,177,0.2)"
                            $border="rgba(16,185,177,0.5)"
                            $color="#5eead4"
                            $hoverBg="rgba(16,185,177,0.35)"
                            onClick={runPhotoTryOn}
                            disabled={!canTryOn || photoProcessing}
                          >
                            <SparkleIcon />
                            {photoProcessing ? "Processing…" : canTryOn ? "Try On" : "Select a Garment First"}
                          </IconBtn>
                        ) : (
                          <>
                            <IconBtn
                              id="btn-retry-tryon"
                              onClick={runPhotoTryOn}
                              disabled={photoProcessing}
                            >
                              <SparkleIcon /> Retry
                            </IconBtn>
                            <IconBtn
                              id="btn-save-photo"
                              onClick={saveResult}
                            >
                              <CheckIcon /> Save Look
                            </IconBtn>
                            <IconBtn
                              id="btn-download-photo"
                              $bg="rgba(16,185,177,0.15)"
                              $border="rgba(16,185,177,0.4)"
                              $color="#5eead4"
                              $hoverBg="rgba(16,185,177,0.28)"
                              onClick={downloadResult}
                            >
                              <DownloadIcon /> Share Fit
                            </IconBtn>
                          </>
                        )}
                      </ControlGroup>
                    </ControlsBar>
                  </PhotoPreview>
                )}
              </>
            )}
          </ViewportArea>

          {/* ── RIGHT: Sidebar ──────────────────────────────────────────── */}
          <Sidebar>
            <SidebarTabs>
              <SidebarTab
                id="tab-clothing"
                $active={activeTab === "clothing"}
                onClick={() => setActiveTab("clothing")}
              >
                Garments
              </SidebarTab>
              <SidebarTab
                id="tab-accessories"
                $active={activeTab === "accessories"}
                onClick={() => setActiveTab("accessories")}
              >
                Accessories
              </SidebarTab>
            </SidebarTabs>

            <SidebarScroll>
              {activeTab === "clothing" ? (
                loading ? (
                  [1, 2, 3].map((i) => <ShimmerCard key={i} />)
                ) : tryOnClothes.length === 0 ? (
                  <div style={{ color: "#585858", fontSize: 12, textAlign: "center", padding: "24px 8px" }}>
                    No try-on garments found in catalog
                  </div>
                ) : (
                  tryOnClothes.map((product) => (
                    <GarmentCard
                      key={product.id}
                      id={`garment-${product.id}`}
                      $active={activeShirt === product.id}
                      onClick={() => handleGarmentClick(product.imgSource, product.id)}
                    >
                      <img src={product.imgSource} alt={product.title} />
                      <div className="active-check"><CheckIcon /></div>
                    </GarmentCard>
                  ))
                )
              ) : (
                accessoryItems.map((item) => (
                  <AccessoryCard
                    key={item.id}
                    id={`accessory-${item.id}`}
                    $active={
                      item.id === "none"
                        ? activeAccessory === null
                        : activeAccessory === item.id
                    }
                    onClick={() => handleAccessoryClick(item.id)}
                  >
                    <span className="emoji">{item.icon}</span>
                    <span className="label">{item.label}</span>
                    <div className="active-check"><CheckIcon /></div>
                  </AccessoryCard>
                ))
              )}
            </SidebarScroll>

            <SidebarStatus>
              {activeShirt
                ? "✓ Garment selected · Ready to try on"
                : "Select a garment to begin"}
            </SidebarStatus>
          </Sidebar>

        </TryOnWrapper>

        {/* Instructions */}
        <div style={{
          marginTop: 20,
          background: "rgba(16,185,177,0.06)",
          border: "1px solid rgba(16,185,177,0.18)",
          borderRadius: 0,
          padding: "14px 20px",
          display: "flex",
          gap: 28,
          flexWrap: "wrap",
        }}>
          {[
            ["1.", "Pick a garment or accessory from the sidebar."],
            ["2.", "Choose Live Camera or Upload Photo mode."],
            ["3.", "Enable the camera or upload a full-body photo."],
            ["4.", "Toggle ✨ HQ for photorealistic quality (slower)."],
          ].map(([n, t]) => (
            <div key={n} style={{ display: "flex", alignItems: "flex-start", gap: 8, minWidth: 180, flex: 1 }}>
              <span style={{ color: defaultTheme.color_sea_green, fontWeight: 700, fontSize: 13 }}>{n}</span>
              <span style={{ color: "rgba(0,0,0,0.55)", fontSize: 13 }}>{t}</span>
            </div>
          ))}
        </div>
        {tryOnHistory.length > 0 && <div style={{ marginTop:28 }}><h3 style={{ marginBottom:8 }}>Recent try-ons</h3><p style={{ color:"#616666", marginBottom:16 }}>Stored only on this device. Up to three recent results are kept.</p><div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(180px,260px))", gap:16 }}>{tryOnHistory.map((item) => <article key={item.id} style={{ border:"1px solid #dedbd3", borderRadius: 0, padding:10, background:"#fff" }}><img src={item.src} alt="Saved virtual try-on" style={{ width:"100%", aspectRatio:"4/5", objectFit:"cover", borderRadius: 0 }} /><div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}><span>{item.size ? `Size ${item.size}` : "Saved look"}</span><button type="button" aria-label="Delete saved try-on" onClick={() => { const next=tryOnHistory.filter((saved)=>saved.id!==item.id); setTryOnHistory(next); localStorage.setItem("tryOnHistory",JSON.stringify(next)); }}><i className="bi bi-trash3"></i></button></div></article>)}</div></div>}
      </Container>
    </Section>
  );
};

export default VirtualTryOn;
