import React, { useState, useRef, useEffect } from "react";
import styled from "styled-components";
import { Link } from "react-router-dom";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import { useAuth } from "../../context/AuthContext";

const ChatContainer = styled.div`
  position: fixed;
  bottom: 30px;
  right: 30px;
  z-index: 9999;
  font-family: "Inter", sans-serif;
`;

const ChatButton = styled.button`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: #d45b3f;
  color: white;
  border: none;
  cursor: pointer;
  box-shadow: 0 12px 26px rgba(113, 45, 29, 0.28);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  transition: transform 0.2s, box-shadow 0.2s;
  &:hover {
    transform: scale(1.05);
    box-shadow: 0 16px 30px rgba(113, 45, 29, 0.34);
  }
`;

const ChatWindow = styled.div`
  width: 380px;
  height: 500px;
  background: #f7f5ef;
  border: 1px solid #dedbd3;
  border-radius: 18px;
  box-shadow: 0 15px 35px rgba(0, 0, 0, 0.15);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  position: absolute;
  bottom: 80px;
  right: 0;
  animation: slideUp 0.3s ease-out;

  @keyframes slideUp {
    from {
      opacity: 0;
      transform: translateY(20px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
`;

const ChatHeader = styled.div`
  background: #23231f;
  color: white;
  padding: 15px 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 700;
  }
  span {
    font-size: 12px;
    opacity: 0.8;
  }
`;

const ChatBody = styled.div`
  flex: 1;
  padding: 20px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const Message = styled.div`
  align-self: ${(props) => (props.$sender === "user" ? "flex-end" : "flex-start")};
  background: ${(props) => (props.$sender === "user" ? "#d45b3f" : "white")};
  color: ${(props) => (props.$sender === "user" ? "white" : "#333")};
  padding: 10px 14px;
  border-radius: 12px;
  max-width: 80%;
  font-size: 14px;
  line-height: 1.4;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.05);
  border-bottom-right-radius: ${(props) => (props.$sender === "user" ? "2px" : "12px")};
  border-bottom-left-radius: ${(props) => (props.$sender === "user" ? "12px" : "2px")};
`;

const ProductRecommendation = styled.div`
  margin-top: 10px;
  background: #fcfcfc;
  border: 1px solid #efefef;
  border-radius: 8px;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  img {
    width: 50px;
    height: 50px;
    object-fit: cover;
    border-radius: 4px;
  }
  .info {
    flex: 1;
    display: flex;
    flex-direction: column;
    span {
      font-size: 12px;
      font-weight: 600;
    }
    small {
      color: #888;
    }
  }
  a {
    color: #d45b3f;
    font-size: 12px;
    font-weight: bold;
    text-decoration: none;
    padding: 4px 8px;
    border-radius: 4px;
    background: #f2e4df;
    &:hover {
      background: #d45b3f;
      color: white;
    }
  }
`;

const ChatInputArea = styled.form`
  padding: 15px 20px;
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 10px;
  background: white;
`;

const Input = styled.input`
  flex: 1;
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  padding: 10px 15px;
  font-size: 14px;
  outline: none;
  &:focus {
    border-color: #d45b3f;
  }
`;

const SendButton = styled.button`
  background: #d45b3f;
  color: white;
  border: none;
  border-radius: 8px;
  width: 38px;
  height: 38px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: #b8472f;
  }
`;

const ChatbotWidget = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "stylist", text: "Hi! I am your Antigravity Stylist. Tell me what outfit style or look you are searching for today!" }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [loading, setLoading] = useState(false);
  const bodyRef = useRef();

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || loading) return;

    const userMessage = inputValue.trim();
    setMessages((prev) => [...prev, { sender: "user", text: userMessage }]);
    setInputValue("");
    setLoading(true);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/stylist`, { message: userMessage, preferences:user?.stylePreferences || {} });
      const { reply, products } = response.data.data;
      setMessages((prev) => [...prev, { sender: "stylist", text: reply, products }]);
    } catch (error) {
      console.error("Stylist API Error:", error);
      setMessages((prev) => [
        ...prev,
        { sender: "stylist", text: "Apologies, I encountered an issue pulling options from the catalog. Let me know if you need help with anything else!" }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ChatContainer>
      {isOpen && (
        <ChatWindow>
          <ChatHeader>
            <div>
              <h3>AI Stylist</h3>
              <span>Active Fit Assistance</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              style={{ background: "none", border: "none", color: "white", cursor: "pointer", fontSize: "16px" }}
            >
              <i className="bi bi-x-lg"></i>
            </button>
          </ChatHeader>
          <ChatBody ref={bodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} style={{ display: "flex", flexDirection: "column", width: "100%" }}>
                <Message $sender={m.sender}>{m.text}</Message>
                {m.products && m.products.map((p) => (
                  <ProductRecommendation key={p.id}>
                    <img src={p.imgSource} alt={p.title} />
                    <div className="info">
                      <span>{p.title}</span>
                      <small>₹{p.price}</small>
                    </div>
                    <Link to={`/product/details/${p.id}`} onClick={() => setIsOpen(false)}>
                      View
                    </Link>
                  </ProductRecommendation>
                ))}
              </div>
            ))}
            {loading && (
              <Message $sender="stylist">
                <i className="bi bi-three-dots fa-pulse"></i> Thinking...
              </Message>
            )}
          </ChatBody>
          <ChatInputArea onSubmit={handleSubmit}>
            <Input
              type="text"
              placeholder="Ask for Summer shirts, Denim pants..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              disabled={loading}
            />
            <SendButton type="submit" disabled={loading}>
              <i className="bi bi-send-fill"></i>
            </SendButton>
          </ChatInputArea>
        </ChatWindow>
      )}
      <ChatButton onClick={() => setIsOpen(!isOpen)} aria-label={isOpen ? "Close AI stylist" : "Open AI stylist"}>
        <i className="bi bi-chat-left-dots-fill"></i>
      </ChatButton>
    </ChatContainer>
  );
};

export default ChatbotWidget;
