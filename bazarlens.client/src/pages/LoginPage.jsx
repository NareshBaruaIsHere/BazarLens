import { useState } from 'react';

function LoginPage({ onNavigateToSignUp }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [errors, setErrors] = useState({});

    const validateEmail = (email) => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const newErrors = {};

        if (!email.trim()) {
            newErrors.email = 'Email address is required';
        } else if (!validateEmail(email)) {
            newErrors.email = 'Please enter a valid email address';
        }

        if (!password.trim()) {
            newErrors.password = 'Password is required';
        }

        setErrors(newErrors);

        if (Object.keys(newErrors).length === 0) {
            // For now use a simple hard-coded demo credential check
            if (email.trim() === 'abc@gmail.com' && password === '1234') {
                console.log('Login successful');
            } else {
                setErrors({ form: 'Invalid email or password' });
            }
        }
    };

    return (
        <div className="login-container">
            <div className="login-card">
                {/* Top right: Don't have an account */}
                <div className="top-right-section">
                    <span className="dont-have-account">Don't have an account?</span>
                    <button 
                        type="button"
                        className="create-account-btn"
                        onClick={onNavigateToSignUp}
                    >
                        Create account
                    </button>
                </div>

                {/* Logo and Tagline */}
                <div className="logo-section">
                    <div className="logo">
                        <svg width="50" height="50" viewBox="0 0 50 50" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M25 5C14.5 15 10 20 10 28C10 37.4 16.7 45 25 45C33.3 45 40 37.4 40 28C40 20 35.5 15 25 5Z" fill="#059669"/>
                            <path d="M28 12C28 12 32 16 32 22C32 28 29 32 25 35C21 32 18 28 18 22C18 16 22 12 28 12Z" fill="white" opacity="0.3"/>
                        </svg>
                        <h1 className="logo-text">BazerLens<span className="trademark">™</span></h1>
                    </div>
                    <p className="tagline">People's Data for Fairer Prices</p>
                </div>

                {/* Main Heading */}
                <div className="heading-section">
                    <h2 className="main-heading">Sign in to your account</h2>
                    <p className="subtitle">Continue to access live bazar prices, submit updates and be part of a fairer Bangladesh.</p>
                </div>

                {errors.form && <p className="error-text form-error" role="alert">{errors.form}</p>}

                {/* Form */}
                <form onSubmit={handleSubmit} className="login-form">
                    {/* Email Input */}
                    <div className="form-group">
                        <label htmlFor="email" className="form-label">Email address</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M2 4H18C19.1 4 20 4.9 20 6V14C20 15.1 19.1 16 18 16H2C0.9 16 0 15.1 0 14V6C0 4.9 0.9 4 2 4Z" stroke="#0F172A" strokeWidth="1.5" fill="none"/>
                                <path d="M2 4L10 10L18 4" stroke="#0F172A" strokeWidth="1.5" fill="none"/>
                            </svg>
                            <input
                                type="email"
                                id="email"
                                placeholder="you@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="form-input"
                            />
                        </div>
                        {errors.email && <span className="error-text">{errors.email}</span>}
                    </div>

                    {/* Password Input */}
                    <div className="form-group">
                        <label htmlFor="password" className="form-label">Password</label>
                        <div className="input-wrapper">
                            <svg className="input-icon" width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M15 8H14V6C14 3.2 11.8 1 9 1C6.2 1 4 3.2 4 6V8H3C1.9 8 1 8.9 1 10V18C1 19.1 1.9 20 3 20H15C16.1 20 17 19.1 17 18V10C17 8.9 16.1 8 15 8ZM6 6C6 4.3 7.3 3 9 3C10.7 3 12 4.3 12 6V8H6V6Z" fill="#0F172A"/>
                            </svg>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                id="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="form-input"
                            />
                            <button
                                type="button"
                                className="eye-button"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 4C5.6 4 1.7 6.6 0 10.5c1.7 3.9 5.6 6.5 10 6.5s8.3-2.6 10-6.5c-1.7-3.9-5.6-6.5-10-6.5zm0 11c-2.8 0-5-2.2-5-5s2.2-5 5-5 5 2.2 5 5-2.2 5-5 5zm0-8c-1.7 0-3 1.3-3 3s1.3 3 3 3 3-1.3 3-3-1.3-3-3-3z" fill="#0F172A"/>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                        <path d="M10 16.5C4.5 16.5.5 13 0 10c.5-3 4.5-6.5 10-6.5s9.5 3.5 10 6.5c-.5 3-4.5 6.5-10 6.5zm0-11c-2.8 0-5 2.2-5 5s2.2 5 5 5 5-2.2 5-5-2.2-5-5-5zm0 3c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" fill="#0F172A"/>
                                    </svg>
                                )}
                            </button>
                        </div>
                        {errors.password && <span className="error-text">{errors.password}</span>}
                    </div>

                    {/* Remember me and Forgot password */}
                    <div className="form-row">
                        <label className="checkbox-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                className="checkbox-input"
                            />
                            <span className="checkbox-text">Remember me</span>
                        </label>
                        <a href="#" className="forgot-password">Forgot password?</a>
                    </div>

                    {/* Sign In Button */}
                    <button type="submit" className="sign-in-btn">
                        Sign In <span className="arrow">→</span>
                    </button>
                </form>

                {/* OR Divider */}
                <div className="divider">
                    <span>OR</span>
                </div>

                {/* Google Button */}
                <button type="button" className="google-btn">
                    <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <circle cx="10" cy="10" r="10" fill="#EA4335" opacity="0.1"/>
                        <text x="50%" y="50%" textAnchor="middle" dy=".3em" fontSize="12" fill="#EA4335" fontWeight="bold">G</text>
                    </svg>
                    Continue with Google
                </button>

                {/* Security Info Box */}
                <div className="security-box">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 1L3 5V11C3 19.3 12 23 12 23S21 19.3 21 11V5L12 1Z" fill="#059669"/>
                        <path d="M10 14.17L6.83 11L5.41 12.41L10 16.99L18.59 8.4L17.17 7L10 14.17Z" fill="white"/>
                    </svg>
                    <div>
                        <h3 className="security-title">Secure & Trusted</h3>
                        <p className="security-text">Your data is protected with industry-standard encryption and security practices.</p>
                    </div>
                </div>
            </div>

            {/* Footer */}
            <footer className="login-footer">
                <div className="footer-links">
                    <a href="#" className="footer-link">About</a>
                    <a href="#" className="footer-link">Privacy Policy</a>
                    <a href="#" className="footer-link">Terms of Service</a>
                    <a href="#" className="footer-link">Help Center</a>
                </div>
                <div className="footer-copyright">
                    © 2025 BazerLens. All rights reserved.
                </div>
            </footer>
        </div>
    );
}

export default LoginPage;
