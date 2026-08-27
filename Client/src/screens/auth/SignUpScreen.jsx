import styled from "styled-components";
import {
  CheckboxGroup,
  FormGridWrapper,
  FormTitle,
} from "../../styles/form_grid";
import { Container } from "../../styles/styles";
import { staticImages } from "../../utils/images";
import AuthOptions from "../../components/auth/AuthOptions";
import { FormElement, Input } from "../../styles/form";
import PasswordInput from "../../components/auth/PasswordInput";
import { Link, useNavigate } from "react-router-dom";
import { BaseButtonBlack } from "../../styles/button";
import { useRef } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { API_BASE_URL } from "../../config/apiConfig";

const SignUpScreenWrapper = styled.section`
  form {
    margin-top: 40px;
    .form-elem-text {
      margin-top: -16px;
      display: block;
    }
  }

  .text-space {
    margin: 0 4px;
  }
`;

const SignUpScreen = () => {
    const navigate = useNavigate();
    const firstNameRef = useRef();
    const lastNameRef = useRef();
    const emailRef = useRef();
    const phoneRef = useRef();
    const passwordRef = useRef();
    const confirmPasswordRef = useRef();
    const termsRef = useRef();

    const validatePassword = (password) => {
        const minLength = 8;
        const maxLength = 12;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumber = /[0-9]/.test(password);
        const hasSpecialChar = /[@#$%^&+=!]/.test(password);
        const noSpaces = !/\s/.test(password);
        const notCommon = !["password", "123456", "qwerty"].includes(password.toLowerCase());

        if (password.length < minLength || password.length > maxLength) return "Password must be 8-12 characters.";
        if (!hasUpperCase) return "Password must have at least one uppercase letter.";
        if (!hasLowerCase) return "Password must have at least one lowercase letter.";
        if (!hasNumber) return "Password must have at least one number.";
        if (!hasSpecialChar) return "Password must have at least one special character (@, #, $, %, etc.).";
        if (!noSpaces) return "Password should not contain spaces.";
        if (!notCommon) return "Password is too common.";

        return null;
    };

    const handleSignup = async (e) => {
        e.preventDefault();
        
        const firstName = firstNameRef.current.value;
        const lastName = lastNameRef.current.value;
        const email = emailRef.current.value;
        const phoneNumber = phoneRef.current.value;
        const password = passwordRef.current.value;
        const confirmPassword = confirmPasswordRef.current.value;
        const termsAccepted = termsRef.current.checked;

        if (password !== confirmPassword) {
            return toast.error("Passwords do not match!");
        }

        const passwordError = validatePassword(password);
        if (passwordError) {
            return toast.error(passwordError);
        }

        if (!termsAccepted) {
            return toast.error("Please accept the Terms & Conditions.");
        }

        try {
            const response = await axios.post(`${API_BASE_URL}/api/register`, { 
                firstName, 
                lastName, 
                email, 
                phoneNumber, 
                password 
            });
            
            if (response.status === 200) {
                toast.success("Account created successfully! Redirecting to login...");
                setTimeout(() => {
                    navigate("/sign_in");
                }, 2000);
            }
        }
        catch (err) {
            console.log("Error:", err);
            if (err.response && err.response.status === 409) {
                toast.error("User already exists!");
            }
            else {
                toast.error(err.response?.data?.message || "An unexpected error occurred.");
            }
        }
    }

  return (
    <SignUpScreenWrapper>
      <FormGridWrapper>
        <Container>
          <div className="form-grid-content">
            <div className="form-grid-left">
              <img
                src={staticImages.form_img2}
                className="object-fit-cover"
                alt=""
              />
            </div>
            <div className="form-grid-right">
              <FormTitle>
                <h3>Sign Up</h3>
                <p className="text-base">
                  Sign up for free to access to in any of our products
                </p>
              </FormTitle>
              <form onSubmit={handleSignup}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <FormElement>
                        <label className="forme-elem-label text-base font-semibold">First Name</label>
                        <Input type="text" placeholder="First Name" className="form-elem-control" ref={firstNameRef} required />
                    </FormElement>
                    <FormElement>
                        <label className="forme-elem-label text-base font-semibold">Last Name</label>
                        <Input type="text" placeholder="Last Name" className="form-elem-control" ref={lastNameRef} required />
                    </FormElement>
                </div>

                <FormElement>
                  <label className="forme-elem-label text-base font-semibold">Email Address</label>
                  <Input type="email" placeholder="Email" className="form-elem-control" ref={emailRef} required />
                </FormElement>

                <FormElement>
                    <label className="forme-elem-label text-base font-semibold">Phone Number</label>
                    <Input type="tel" placeholder="Phone" className="form-elem-control" ref={phoneRef} required />
                </FormElement>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <FormElement>
                        <label className="forme-elem-label text-base font-semibold">Password</label>
                        <Input type="password" placeholder="Password" className="form-elem-control" ref={passwordRef} required />
                    </FormElement>
                    <FormElement>
                        <label className="forme-elem-label text-base font-semibold">Confirm Password</label>
                        <Input type="password" placeholder="Confirm" className="form-elem-control" ref={confirmPasswordRef} required />
                    </FormElement>
                </div>

                <div className="flex items-center" style={{ marginBottom: '16px', gap: '8px' }}>
                    <input type="checkbox" ref={termsRef} id="terms" required />
                    <label htmlFor="terms" className="text-sm">I agree to the <Link to="/terms" style={{ color: '#d45b3f' }}>Terms & Conditions</Link></label>
                </div>

                <BaseButtonBlack type="submit" className="form-submit-btn">
                  Sign Up
                </BaseButtonBlack>
              </form>
              <p className="flex flex-wrap account-rel-text">
                Already have an account?
                <Link to="/sign_in" className="font-medium">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </Container>
      </FormGridWrapper>
    </SignUpScreenWrapper>
  );
};

export default SignUpScreen;
