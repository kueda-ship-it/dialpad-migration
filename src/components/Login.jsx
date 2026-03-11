import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { ShieldCheck, Command } from 'lucide-react';
import './Login.css';

const Login = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleMicrosoftLogin = async () => {
        try {
            setLoading(true);
            setError(null);
            const { error: authError } = await supabase.auth.signInWithOAuth({
                provider: 'azure',
                options: {
                    scopes: 'email profile User.Read',
                    redirectTo: window.location.origin
                }
            });

            if (authError) throw authError;
        } catch (err) {
            setError(err.message);
            console.error('SSO Error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            {/* Left Side - Hero / Branding (Hidden on mobile) */}
            <div className="login-left">
                {/* Gradient Accents */}
                <div className="login-left-bg-base"></div>
                <div className="login-glow-1"></div>
                <div className="login-glow-2"></div>

                {/* Logo & Brand */}
                <div className="login-brand">
                    <div className="login-logo">
                        <Command size={20} color="#ffffff" />
                    </div>
                    <span className="login-brand-text">Fulltime System</span>
                </div>

                {/* Hero Typo */}
                <div className="login-hero">
                    <h1 className="login-title">
                        Dialpad <br />
                        <span className="login-title-gradient">Migration Manager</span>
                    </h1>
                    <p className="login-subtitle">
                        Enterprise-grade control system for managing cross-platform migrations, schedules, and operations in real time.
                    </p>
                </div>

                {/* Footer Text */}
                <div className="login-footer-text">
                    <span>&copy; 2026 Fulltime System.</span>
                    <span className="login-dot"></span>
                    <span>Secure Management Portal</span>
                </div>
            </div>

            {/* Right Side - Login Form Area */}
            <div className="login-right">
                {/* Mobile header / Logo */}
                <div className="login-mobile-header">
                    <div className="login-logo" style={{ width: '36px', height: '36px', borderRadius: '10px' }}>
                        <Command size={18} color="#ffffff" />
                    </div>
                    <span className="login-brand-text" style={{ fontSize: '1.125rem' }}>Fulltime System</span>
                </div>

                <div className="login-form-wrapper">
                    {/* Header */}
                    <div className="login-form-header">
                        <div className="login-mobile-icon">
                            <ShieldCheck size={32} color="#60a5fa" />
                        </div>
                        <h2 className="login-form-title">Welcome back</h2>
                        <p className="login-form-subtitle">Please authenticate via Azure AD to access the system.</p>
                    </div>

                    <div className="login-actions">
                        {/* Primary Button */}
                        <button
                            onClick={handleMicrosoftLogin}
                            disabled={loading}
                            className="login-sso-btn"
                        >
                            <div className="login-sso-icon-bg">
                                <svg width="20" height="20" viewBox="0 0 23 23" xmlns="http://www.w3.org/2000/svg">
                                    <path fill="#f35325" d="M0 0h11v11H0z" />
                                    <path fill="#81bc06" d="M12 0h11v11H12z" />
                                    <path fill="#05a6f0" d="M0 12h11v11H0z" />
                                    <path fill="#ffba08" d="M12 12h11v11H12z" />
                                </svg>
                            </div>
                            {loading ? 'Authenticating session...' : 'Sign in with Microsoft'}
                        </button>

                        {/* Divider */}
                        <div className="login-divider">
                            <div className="login-divider-line"></div>
                            <span className="login-divider-text">Secure Access</span>
                            <div className="login-divider-line"></div>
                        </div>

                        {/* Security Notice Card */}
                        <div className="login-security-card">
                            <div className="login-security-icon-wrapper">
                                <ShieldCheck size={20} color="#60a5fa" />
                            </div>
                            <div>
                                <h3 className="login-security-title">Enterprise SSO Required</h3>
                                <p className="login-security-text">
                                    Your session is protected by Azure Active Directory. Unauthorized access is strictly prohibited and logged.
                                </p>
                            </div>
                        </div>

                        {/* Error State */}
                        {error && (
                            <div className="login-error-state">
                                <ShieldCheck size={16} color="#ef4444" style={{ marginTop: '2px' }} />
                                <p className="login-error-text">{error}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Login;
