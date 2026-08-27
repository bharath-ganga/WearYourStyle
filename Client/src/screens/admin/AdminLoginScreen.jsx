import React, { useState } from "react";
import styled from "styled-components";
import { Container } from "../../styles/styles";
import axios from "axios";
import { API_BASE_URL } from "../../config/apiConfig";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

const LoginBox = styled.div`
  max-width: 400px;
  margin: 100px auto;
  padding: 40px;
  background: white;
  border-radius: 16px;
  box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  text-align: center;
`;

const Input = styled.input`
  width: 100%;
  padding: 12px;
  margin-bottom: 20px;
  border: 1px solid #ddd;
  border-radius: 8px;
`;

const AdminLogin = () => {
    const navigate = useNavigate();
    const [credentials, setCredentials] = useState({ email: "", password: "" });

    const handleLogin = async (e) => {
        e.preventDefault();
        try {
            const trimmedCredentials = {
                email: credentials.email.trim(),
                password: credentials.password.trim()
            };
            const res = await axios.post(`${API_BASE_URL}/api/login`, trimmedCredentials, { withCredentials: true });
            if (res.data.data.user.role === "admin") {
                localStorage.setItem("accessToken", res.data.token);
                localStorage.setItem("userId", res.data.data.user.id);
                window.dispatchEvent(new Event("auth-changed"));
                toast.success("Welcome, Admin!");
                navigate('/admin/dashboard');
            } else {
                toast.error("You are not authorized to access the Admin panel.");
            }
        } catch (error) {
            toast.error("Invalid credentials.");
        }
    };

    return (
        <Container>
            <LoginBox>
                <h2 style={{marginBottom: '20px'}}>Admin Access</h2>
                <form onSubmit={handleLogin}>
                    <Input 
                        type="email" 
                        placeholder="Admin Email" 
                        value={credentials.email} 
                        onChange={(e) => setCredentials({...credentials, email: e.target.value})}
                        required
                    />
                    <Input 
                        type="password" 
                        placeholder="Password" 
                        value={credentials.password} 
                        onChange={(e) => setCredentials({...credentials, password: e.target.value})}
                        required
                    />
                    <button type="submit" className="btn btn-purple" style={{width: '100%'}}>Authenticate</button>
                    <p style={{marginTop: '20px', fontSize: '12px', color: '#888'}}>
                        Use the provided admin credentials to manage the platform.
                    </p>
                </form>
            </LoginBox>
        </Container>
    );
};

export default AdminLogin;
