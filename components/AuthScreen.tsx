/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useEffect, useRef } from 'react';
import { User } from '../types';
import { GoogleIcon } from './icons';

// Using the real Google Client ID as provided.
const GOOGLE_CLIENT_ID = '440798450214-882s2r879mt9v02pph9p9gt7mkfcdkio.apps.googleusercontent.com';


// FIX: Correctly typed the global 'google' object from the Google Identity Services script by augmenting the Window interface.
declare global {
    interface Window {
        google: any;
    }
}

interface AuthScreenProps {
    onRegister: (user: Omit<User, 'id'>) => { success: boolean, message?: string };
    onLogin: (credentials: {username?: string, password?: string, googleId?: string}) => { success: boolean, message?: string };
    onGoogleSignIn: (googleData: { googleId: string; email: string; name: string; picture?: string; }) => { success: boolean; needsRegistration?: boolean; message?: string; authData?: { googleId: string; email: string; name: string; picture?: string; } };
}

type AuthMode = 'login' | 'register' | 'forgotPassword';

const AuthScreen: React.FC<AuthScreenProps> = ({ onRegister, onLogin, onGoogleSignIn }) => {
    const [authMode, setAuthMode] = useState<AuthMode>('login');
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [resetEmailSent, setResetEmailSent] = useState(false);
    
    const [googleAuthData, setGoogleAuthData] = useState<{ googleId: string; email: string; name: string; picture?: string; } | null>(null);
    const googleButtonRef = useRef<HTMLDivElement>(null);

    const handleCredentialResponse = (response: any) => {
        // Log the credential to the console as requested.
        console.log('Google ID Token:', response.credential);

        // =================================================================================
        // CRITICAL SECURITY STEP: BACKEND ID TOKEN VALIDATION
        // =================================================================================
        // The 'response.credential' is the user's ID token (a JWT).
        // In a real production application, you MUST send this token to your backend server.
        // Your backend must then securely verify the token's signature and integrity
        // with Google's token verification endpoint. This is the only way to confirm the
        // user is who they claim to be.
        //
        // NEVER trust the contents of the token on the client-side without backend verification.
        //
        // Learn more: https://developers.google.com/identity/gsi/web/guides/verify-google-id-token
        //
        // For this demo, we are decoding the token on the client-side to simulate the
        // user data retrieval that would happen after a successful backend validation.
        // =================================================================================
        const idToken = response.credential;
        try {
            // --- THIS IS FOR DEMONSTRATION & DEVELOPMENT ONLY ---
            // In a real app, this logic would be on your server after validating the token.
            const userObject = JSON.parse(atob(idToken.split('.')[1]));
            
            const googleData = {
                googleId: userObject.sub, // 'sub' is the user's unique Google ID
                email: userObject.email,
                name: userObject.name,
                picture: userObject.picture,
            };

            const result = onGoogleSignIn(googleData);

            if (result.success) {
                // Success is handled by parent component state change
            } else if (result.needsRegistration && result.authData) {
                setAuthMode('register');
                setGoogleAuthData(result.authData);
                setEmail(result.authData.email); // Pre-fill email
                setUsername(''); // Clear username for input
            } else {
                setError(result.message || 'Google Sign-In failed. Please try again.');
            }

        } catch (e) {
            console.error("Error decoding JWT or handling Google Sign-In:", e);
            setError("Google Sign-In failed. Please try again.");
        }
    };

    useEffect(() => {
        // Initialize Google Identity Services
        if (window.google?.accounts?.id) {
            if (!GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('YOUR_REAL_CLIENT_ID')) {
                setError('Google Client ID is not configured in AuthScreen.tsx.');
                return;
            }

            window.google.accounts.id.initialize({
                client_id: GOOGLE_CLIENT_ID,
                callback: handleCredentialResponse,
            });

            if (googleButtonRef.current) {
                window.google.accounts.id.renderButton(
                    googleButtonRef.current,
                    { theme: "outline", size: "large" }
                );
            }
        } else {
            console.error("Google Identity Services script not loaded.");
            setError("Could not connect to Google Sign-In. Please check your internet connection and refresh the page.");
        }
    }, []);


    const validatePassword = (pass: string) => {
        if (pass.length < 8) {
            setPasswordError('Password must be at least 8 characters long.');
            return false;
        }
        if (!/\d/.test(pass)) {
            setPasswordError('Password must contain at least one number.');
            return false;
        }
        if (!/[!@#$%^&*]/.test(pass)) {
            setPasswordError('Password must contain at least one special character.');
            return false;
        }
        setPasswordError('');
        return true;
    };
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (googleAuthData) { // Completing Google registration
            if (!username.trim()) {
                setError('Please choose a username to complete registration.');
                return;
            }
            const result = onRegister({
                username,
                email: googleAuthData.email,
                googleId: googleAuthData.googleId,
                name: googleAuthData.name,
                picture: googleAuthData.picture,
            });
            if (!result.success) setError(result.message || 'An unexpected error occurred during registration. Please try again.');
            return;
        }

        if (authMode === 'login') {
            const result = onLogin({ username, password });
            if (!result.success) setError(result.message || 'An unexpected error occurred during login. Please try again later.');
        } else if (authMode === 'register') {
            if (!validatePassword(password)) return;
            if (password !== confirmPassword) {
                setError("Passwords do not match. Please try again.");
                return;
            }
            const result = onRegister({ username, email, password: `hashed_${password}` });
            if (!result.success) setError(result.message || 'An unexpected error occurred during registration. Please check your details and try again.');
        }
    };

    const handlePasswordReset = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            setError('Please enter a valid email address.');
            return;
        }
        // Simulate sending the email
        console.log(`Password reset link simulation for: ${email}`);
        setResetEmailSent(true);
    };

    const switchAuthMode = (mode: AuthMode) => {
        setAuthMode(mode);
        setError('');
        setPasswordError('');
        setGoogleAuthData(null);
        setUsername('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setResetEmailSent(false);
    };
    
    if (googleAuthData) {
        return (
            <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl animate-fade-in border border-white/20">
                 <h2 className="text-2xl font-bold text-center mb-2 text-gray-700">Complete Registration</h2>
                <p className="text-center text-gray-500 mb-1">Welcome, {googleAuthData.name}!</p>
                <p className="text-center text-gray-500 mb-6">Choose a username to link with your Google account.</p>

                {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">{error}</p>}

                <form onSubmit={handleSubmit} className="space-y-4">
                    <input
                        type="email"
                        value={googleAuthData.email}
                        disabled
                        className="w-full p-3 border border-pink-200 bg-gray-100 rounded-2xl text-gray-500 focus:outline-none"
                    />
                    <input
                        type="text"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="Choose a username"
                        required
                        autoFocus
                        className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                    />
                    <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg hover-sparkle">
                        Complete Registration
                    </button>
                </form>
            </div>
        );
    }

    const renderForgotPassword = () => (
        <>
            <h1 className="text-4xl font-extrabold text-center mb-2 text-pink-500">tuRNext AI</h1>
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-700">Reset Your Password</h2>
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">{error}</p>}

            {resetEmailSent ? (
                <div className="text-center">
                    <p className="text-gray-600 mb-6">If an account with the email <strong>{email}</strong> exists, a password reset link has been sent.</p>
                    <button onClick={() => switchAuthMode('login')} className="font-semibold text-pink-500 hover:text-pink-600">
                        &larr; Back to Login
                    </button>
                </div>
            ) : (
                <form onSubmit={handlePasswordReset} className="space-y-4">
                    <p className="text-sm text-center text-gray-500">Enter your account's email address and we will send you a link to reset your password.</p>
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        autoFocus
                        className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                    />
                    <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg hover-sparkle">
                        Send Reset Link
                    </button>
                    <p className="text-center mt-6 text-sm">
                        <button type="button" onClick={() => switchAuthMode('login')} className="font-semibold text-pink-500 hover:text-pink-600">
                            Cancel
                        </button>
                    </p>
                </form>
            )}
        </>
    );

    const renderLoginOrRegister = () => (
        <>
            <h1 className="text-4xl font-extrabold text-center mb-2 text-pink-500">tuRNext AI</h1>
            <h2 className="text-2xl font-bold text-center mb-6 text-gray-700">
                {authMode === 'login' ? 'Welcome Back!' : 'Create Your Account'}
            </h2>
            
            {error && <p className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4">
                {authMode === 'register' && (
                    <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Email"
                        required
                        className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                    />
                )}
                <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="Username"
                    required
                    className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                />
                <div>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => {
                            setPassword(e.target.value);
                            if (authMode === 'register') validatePassword(e.target.value);
                        }}
                        placeholder="Password"
                        required
                        className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                    />
                     {authMode === 'login' && (
                        <div className="text-right mt-2">
                             <button type="button" onClick={() => switchAuthMode('forgotPassword')} className="text-sm font-semibold text-pink-500 hover:text-pink-600 hover:underline">
                                Forgot Password?
                            </button>
                        </div>
                    )}
                </div>
                {authMode === 'register' && (
                    <>
                        <input
                            type="password"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            placeholder="Confirm Password"
                            required
                            className="w-full p-3 border border-pink-200 bg-white rounded-2xl text-gray-800 focus:ring-2 focus:ring-pink-400 focus:shadow-lg focus:shadow-pink-400/50 focus:outline-none transition"
                        />
                        {passwordError && <p className="text-red-500 text-xs mt-1">{passwordError}</p>}
                    </>
                )}
                <button type="submit" className="w-full bg-pink-500 text-white font-bold py-3 text-lg rounded-xl transition-all shadow-md hover:bg-pink-600 hover:shadow-lg hover-sparkle">
                    {authMode === 'login' ? 'Login' : 'Register'}
                </button>
            </form>

            <div className="my-4 flex items-center">
                <div className="flex-grow border-t border-gray-300"></div>
                <span className="flex-shrink mx-4 text-gray-400">OR</span>
                <div className="flex-grow border-t border-gray-300"></div>
            </div>

            <p className="text-center text-sm text-gray-500 mb-2">Choose an account to continue to tuRNext AI</p>
            <div id="googleSignInDiv" ref={googleButtonRef} className="w-full flex justify-center"></div>
            
            <p className="text-center mt-6 text-sm">
                {authMode === 'login' ? "Don't have an account?" : "Already have an account?"}
                <button onClick={() => switchAuthMode(authMode === 'login' ? 'register' : 'login')} className="font-semibold text-pink-500 hover:text-pink-600 ml-1">
                    {authMode === 'login' ? 'Register' : 'Login'}
                </button>
            </p>
        </>
    );

    return (
        <div className="w-full max-w-md bg-white/90 backdrop-blur-sm p-8 rounded-3xl shadow-2xl animate-fade-in border border-white/20">
            {authMode === 'forgotPassword' ? renderForgotPassword() : renderLoginOrRegister()}
        </div>
    );
};

export default AuthScreen;