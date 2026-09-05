import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext'; // Adjust path as needed

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface LoginDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginDrawer: React.FC<LoginDrawerProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const { login } = useAuth();

    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP'>('LOGIN');
    const [authStep, setAuthStep] = useState<'FORM' | 'OTP'>('FORM');

    // Form State
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Security State
    const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string; otp?: string; general?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);

    useEffect(() => {
        if (failedAttempts >= 3) {
            setIsLockedOut(true);
            const timer = setTimeout(() => {
                setIsLockedOut(false);
                setFailedAttempts(0);
                setErrors({});
            }, 30000);
            return () => clearTimeout(timer);
        }
    }, [failedAttempts]);

    const validateForm = (): boolean => {
        const newErrors: typeof errors = {};
        let isValid = true;

        if (authStep === 'OTP') {
            if (otp.length !== 6 || !/^\d+$/.test(otp)) {
                newErrors.otp = 'Please enter a valid 6-digit code.';
                isValid = false;
            }
            setErrors(newErrors);
            return isValid;
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            newErrors.email = 'Please enter a valid email address.';
            isValid = false;
        }

        if (mode === 'SIGNUP' && !/^\+?[1-9]\d{9,14}$/.test(phone)) {
            newErrors.phone = 'Include country code (e.g., +977).';
            isValid = false;
        }

        if (password.length < 8) {
            newErrors.password = 'Password must be at least 8 characters long.';
            isValid = false;
        }

        if (mode === 'SIGNUP' && password !== confirmPassword) {
            newErrors.password = 'Passwords do not match.';
            isValid = false;
        }

        setErrors(newErrors);
        return isValid;
    };

    const handleRequestOTP = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/request-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrPhone: email })
            });

            if (!response.ok) throw new Error('Failed to send OTP');
            setAuthStep('OTP');
        } catch (error) {
            setErrors({ general: 'Failed to connect to server. Please try again.' });
        }
    };

    const handleVerifyOTP = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrPhone: email, code: otp })
            });

            if (response.ok) {
                const data = await response.json();
                login(data.token, data.user); // Save to AuthContext
                onLoginSuccess();
                resetState();
                onClose();
            } else {
                setFailedAttempts(prev => prev + 1);
                setErrors({ otp: 'Invalid verification code.' });
            }
        } catch (error) {
            setErrors({ general: 'Authentication failed. Please verify your credentials.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLockedOut) return;

        setErrors({});
        if (!validateForm()) return;

        setIsSubmitting(true);

        if (authStep === 'FORM') {
            await handleRequestOTP();
        } else {
            await handleVerifyOTP();
        }

        setIsSubmitting(false);
    };

    const resetState = () => {
        setEmail('');
        setPhone('');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setErrors({});
        setMode('LOGIN');
        setAuthStep('FORM');
        setShowPassword(false);
        setShowConfirmPassword(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const toggleMode = () => {
        setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
        setAuthStep('FORM');
        setErrors({});
    };

    return (
        <>
            <div
                className={`fixed inset-0 bg-brand-dark/40 backdrop-blur-sm transition-opacity duration-300 z-[100] ${
                    isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
                }`}
                onClick={handleClose}
            />

            <div
                className={`fixed top-0 right-0 h-full w-full max-w-[420px] bg-white shadow-2xl z-[101] transform transition-transform duration-300 ease-in-out flex flex-col ${
                    isOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <div className="bg-brand-dark px-6 py-4 flex justify-between h-20 items-center">
                    <span className="text-xl font-bold tracking-tight text-white">Lost And Found Nepal.</span>
                    <button
                        onClick={handleClose}
                        className="text-white border border-white rounded-full p-1.5 hover:bg-white/20 transition-colors focus:outline-none focus:ring-2 focus:ring-white"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-3xl font-extrabold text-brand-dark leading-tight max-w-[280px]">
                            {authStep === 'OTP' ? 'Verify your identity' : mode === 'LOGIN' ? 'Sign in securely' : 'Create your secure account'}
                        </h2>
                        <svg className="w-8 h-8 text-brand-dark mt-1 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                        </svg>
                    </div>

                    {isLockedOut && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 text-sm font-bold rounded-lg flex items-start gap-3">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                            <div>Account temporarily locked due to multiple failed attempts. Try again in 30 seconds.</div>
                        </div>
                    )}

                    {errors.general && !isLockedOut && (
                        <div className="mb-6 p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg">
                            {errors.general}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="flex flex-col gap-5">

                        {authStep === 'OTP' && (
                            <div className="animate-in fade-in slide-in-from-right-4 duration-300">
                                <p className="text-sm font-medium text-slate-600 mb-6">
                                    For your security, we've sent a 6-digit verification code to <span className="font-bold text-brand-dark">{email}</span>.
                                </p>
                                <label className="block text-brand-dark font-bold text-sm mb-1.5">Verification Code</label>
                                <input
                                    type="text"
                                    maxLength={6}
                                    value={otp}
                                    onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                    className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono ${
                                        errors.otp ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                    }`}
                                    placeholder="------"
                                    disabled={isLockedOut}
                                />
                                {errors.otp && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.otp}</p>}
                            </div>
                        )}

                        {authStep === 'FORM' && (
                            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                                <div>
                                    <label className="block text-brand-dark font-bold text-sm mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            errors.email ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                        }`}
                                        placeholder="name@example.com"
                                        disabled={isLockedOut}
                                    />
                                    {errors.email && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.email}</p>}
                                </div>

                                {mode === 'SIGNUP' && (
                                    <div>
                                        <label className="block text-brand-dark font-bold text-sm mb-1.5">Phone Number (Required)</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                                errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="+977"
                                            disabled={isLockedOut}
                                        />
                                        {errors.phone && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.phone}</p>}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-brand-dark font-bold text-sm mb-1.5">Password</label>
                                    <div className="relative">
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                                errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="••••••••"
                                            disabled={isLockedOut}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark transition-colors focus:outline-none"
                                        >
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                {mode === 'SIGNUP' && (
                                    <div>
                                        <label className="block text-brand-dark font-bold text-sm mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                                    errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                                }`}
                                                placeholder="••••••••"
                                                disabled={isLockedOut}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark transition-colors focus:outline-none"
                                            >
                                                {showConfirmPassword ? (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                                ) : (
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                )}
                                            </button>
                                        </div>
                                        {errors.password && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.password}</p>}
                                    </div>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || isLockedOut}
                            className="w-full bg-brand-dark text-white font-bold py-3.5 rounded-full hover:bg-brand-primary transition-colors text-lg mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-14"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                authStep === 'OTP' ? 'Verify Code' : mode === 'LOGIN' ? 'Secure Log In' : 'Create Account'
                            )}
                        </button>
                    </form>

                    <hr className="my-8 border-slate-200" />

                    {authStep === 'FORM' && (
                        <div className="flex flex-col gap-4 text-center">
                            <p className="text-sm font-medium text-slate-600">
                                {mode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                            </p>
                            <button
                                onClick={toggleMode}
                                disabled={isLockedOut}
                                className="w-full bg-white text-brand-dark border-2 border-brand-dark font-bold py-3 rounded-full hover:bg-slate-50 transition-colors disabled:opacity-50"
                            >
                                {mode === 'LOGIN' ? 'Create a secure account' : 'Sign in instead'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};