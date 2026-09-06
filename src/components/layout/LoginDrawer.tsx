import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface LoginDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    onLoginSuccess: () => void;
}

export const LoginDrawer: React.FC<LoginDrawerProps> = ({ isOpen, onClose, onLoginSuccess }) => {
    const { login } = useAuth();

    // Expanded Mode and Step Tracking
    const [mode, setMode] = useState<'LOGIN' | 'SIGNUP' | 'FORGOT_PASSWORD'>('LOGIN');
    const [authStep, setAuthStep] = useState<'FORM' | 'OTP' | 'NEW_PASSWORD'>('FORM');

    // Form State
    const [email, setEmail] = useState('');
    const [phone, setPhone] = useState('+977 '); // Default to Nepal Country Code
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [otp, setOtp] = useState('');

    // UI & Validation State
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');
    const [infoMessage, setInfoMessage] = useState('');
    const [emailTouched, setEmailTouched] = useState(false);

    // Security State
    const [errors, setErrors] = useState<{ email?: string; phone?: string; password?: string; otp?: string; general?: string }>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [failedAttempts, setFailedAttempts] = useState(0);
    const [isLockedOut, setIsLockedOut] = useState(false);

    // --- REAL-TIME VALIDATORS ---
    const hasMinLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
    const hasUpperAndLowerCase = /[a-z]/.test(password) && /[A-Z]/.test(password);

    const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

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

    // Real-time email check on blur
    const handleEmailBlur = () => {
        setEmailTouched(true);
        if (email.length > 0 && !isEmailValid) {
            setErrors(prev => ({ ...prev, email: 'Please enter a valid email address (e.g., name@example.com).' }));
        } else {
            setErrors(prev => ({ ...prev, email: undefined }));
        }
    };

    // Strict Phone Format Handler
    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let val = e.target.value;
        const prefix = '+977 ';

        if (!val.startsWith(prefix)) {
            val = prefix;
        }

        let numbers = val.substring(prefix.length).replace(/\D/g, '');

        if (numbers.length > 10) {
            numbers = numbers.substring(0, 10);
        }

        setPhone(prefix + numbers);

        if (errors.phone) {
            setErrors(prev => ({ ...prev, phone: undefined }));
        }
    };

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

        if (authStep === 'FORM' || mode === 'FORGOT_PASSWORD') {
            if (!isEmailValid) {
                newErrors.email = 'Please enter a valid email address.';
                isValid = false;
            }
        }

        if (mode === 'SIGNUP' && authStep === 'FORM') {
            const rawPhone = phone.replace(/\s/g, '');
            if (!/^\+9779\d{9}$/.test(rawPhone)) {
                newErrors.phone = 'Please enter a valid 10-digit Nepalese mobile number.';
                isValid = false;
            }
        }

        if (mode === 'LOGIN' && authStep === 'FORM') {
            if (password.length === 0) {
                newErrors.password = 'Password is required.';
                isValid = false;
            }
        }

        if ((mode === 'SIGNUP' && authStep === 'FORM') || authStep === 'NEW_PASSWORD') {
            if (!hasMinLength || !hasNumber || !hasSpecialChar || !hasUpperAndLowerCase) {
                newErrors.password = 'Please ensure your password meets all security requirements.';
                isValid = false;
            }
            if (password !== confirmPassword) {
                newErrors.password = 'Passwords do not match.';
                isValid = false;
            }
        }

        setErrors(newErrors);
        return isValid;
    };

    const redirectToSignup = (message: string) => {
        setMode('SIGNUP');
        setAuthStep('FORM');
        setPassword('');
        setConfirmPassword('');
        setPhone('+977 ');
        setErrors({});
        setInfoMessage(message);
    };

    // --- API HANDLERS ---
    const handleStandardLogin = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (response.ok) {
                const data = await response.json();
                login(data.token, data.user);
                onLoginSuccess();
                handleClose();
            } else {
                setFailedAttempts(prev => prev + 1);
                const errorData = await response.json().catch(() => ({}));
                const errMsg = errorData.message || errorData.general || errorData.error || 'Invalid email or password.';

                if (errMsg.toLowerCase().includes('not found') || errMsg.toLowerCase().includes('no account')) {
                    redirectToSignup("Account not found. Let's create a new one!");
                } else {
                    setErrors({ general: errMsg });
                }
            }
        } catch (error) {
            setErrors({ general: 'Login failed. Please check your connection.' });
        }
    };

    const handleRequestOTP = async () => {
        try {
            const endpoint = mode === 'FORGOT_PASSWORD' ? '/auth/forgot-password/request-otp' : '/auth/request-otp';

            const payload: any = {
                emailOrPhone: email,
                email: email
            };

            if (mode === 'SIGNUP') {
                payload.phone = phone.replace(/\s/g, '');
            }

            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));

                if (errorData.phone) throw new Error(`PHONE:${errorData.phone}`);
                if (errorData.email) throw new Error(`EMAIL:${errorData.email}`);

                const errMsg = errorData.general || errorData.message || errorData.error || 'Failed to send verification code.';

                if (mode === 'FORGOT_PASSWORD' && (errMsg.toLowerCase().includes('no account') || errMsg.toLowerCase().includes('not found'))) {
                    redirectToSignup("This email isn't registered yet. Please create an account.");
                    return;
                }

                throw new Error(`GENERAL:${errMsg}`);
            }

            setAuthStep('OTP');
        } catch (error: any) {
            const msg = error.message;
            if (msg.startsWith('PHONE:')) setErrors({ phone: msg.replace('PHONE:', '') });
            else if (msg.startsWith('EMAIL:')) setErrors({ email: msg.replace('EMAIL:', '') });
            else setErrors({ general: msg.replace('GENERAL:', '') });
        }
    };

    const handleVerifySignupOTP = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/verify-otp`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ emailOrPhone: email, code: otp, phone: phone.replace(/\s/g, ''), password })
            });

            if (response.ok) {
                const data = await response.json();
                login(data.token, data.user);
                onLoginSuccess();
                handleClose();
            } else {
                setFailedAttempts(prev => prev + 1);
                const errorData = await response.json().catch(() => ({}));
                setErrors({ otp: errorData.message || errorData.general || 'Invalid verification code.' });
            }
        } catch (error) {
            setErrors({ general: 'Authentication failed. Please check your connection.' });
        }
    };

    const handleResetPassword = async () => {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/forgot-password/reset`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, code: otp, newPassword: password })
            });

            if (response.ok) {
                setSuccessMessage('Password successfully reset! You can now log in.');
                setTimeout(() => {
                    setMode('LOGIN');
                    setAuthStep('FORM');
                    setPassword('');
                    setConfirmPassword('');
                    setOtp('');
                    setSuccessMessage('');
                }, 2000);
            } else {
                const errorData = await response.json().catch(() => ({}));
                setErrors({ password: errorData.message || errorData.general || 'Failed to reset password.' });
            }
        } catch (error) {
            setErrors({ general: 'Failed to reset password. Please try again.' });
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isLockedOut) return;

        setErrors({});
        setInfoMessage('');
        setEmailTouched(true);

        if (!validateForm()) return;

        setIsSubmitting(true);

        if (mode === 'LOGIN') {
            await handleStandardLogin();
        } else if (mode === 'SIGNUP') {
            if (authStep === 'FORM') {
                await handleRequestOTP();
            } else if (authStep === 'OTP') {
                await handleVerifySignupOTP();
            }
        } else if (mode === 'FORGOT_PASSWORD') {
            if (authStep === 'FORM') {
                await handleRequestOTP();
            } else if (authStep === 'OTP') {
                if (otp === '123456') {
                    setAuthStep('NEW_PASSWORD');
                } else {
                    setErrors({ otp: 'Invalid verification code.' });
                }
            } else if (authStep === 'NEW_PASSWORD') {
                await handleResetPassword();
            }
        }

        setIsSubmitting(false);
    };

    const resetState = () => {
        setEmail('');
        setPhone('+977 ');
        setPassword('');
        setConfirmPassword('');
        setOtp('');
        setErrors({});
        setMode('LOGIN');
        setAuthStep('FORM');
        setShowPassword(false);
        setShowConfirmPassword(false);
        setSuccessMessage('');
        setInfoMessage('');
        setEmailTouched(false);
    };

    const handleClose = () => {
        resetState();
        onClose();
    };

    const toggleMode = () => {
        setMode(mode === 'LOGIN' ? 'SIGNUP' : 'LOGIN');
        setAuthStep('FORM');
        setErrors({});
        setSuccessMessage('');
        setInfoMessage('');
        setEmailTouched(false);
        setPhone('+977 ');
    };

    const getHeaderTitle = () => {
        if (authStep === 'OTP') return 'Verify your identity';
        if (authStep === 'NEW_PASSWORD') return 'Create new password';
        if (mode === 'FORGOT_PASSWORD') return 'Reset your password';
        if (mode === 'SIGNUP') return 'Create your secure account';
        return 'Sign in securely';
    };

    const getButtonText = () => {
        if (authStep === 'OTP') return 'Verify Code';
        if (authStep === 'NEW_PASSWORD') return 'Save New Password';
        if (mode === 'FORGOT_PASSWORD') return 'Send Reset Code';
        if (mode === 'SIGNUP') return 'Create Account';
        return 'Secure Log In';
    };

    const CheckmarkIcon = ({ isValid }: { isValid: boolean }) => (
        <svg className={`w-3.5 h-3.5 mr-2 shrink-0 transition-colors ${isValid ? 'text-emerald-500' : 'text-slate-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path>
        </svg>
    );

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
                <div className="bg-brand-dark px-6 py-4 flex justify-between h-20 items-center shrink-0">
                    <span className="text-xl font-bold tracking-tight text-white">Lost And Found Nepal.</span>
                    <button
                        onClick={handleClose}
                        className="text-white border border-white/30 rounded-full p-1.5 hover:bg-white/10 transition-colors focus:outline-none"
                    >
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="p-8 flex-1 overflow-y-auto custom-scrollbar relative">
                    <div className="flex justify-between items-start mb-8">
                        <h2 className="text-[28px] font-extrabold text-brand-dark leading-tight max-w-[280px] tracking-tight">
                            {getHeaderTitle()}
                        </h2>
                        {mode !== 'FORGOT_PASSWORD' && (
                            <svg className="w-7 h-7 text-brand-dark mt-1.5 flex-shrink-0" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z" />
                            </svg>
                        )}
                        {mode === 'FORGOT_PASSWORD' && (
                            <svg className="w-7 h-7 text-brand-dark mt-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
                            </svg>
                        )}
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

                    {successMessage && (
                        <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-bold rounded-lg flex items-center gap-3">
                            <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            <div>{successMessage}</div>
                        </div>
                    )}

                    {infoMessage && (
                        <div className="mb-6 p-4 bg-[#e0e7ff] border border-[#c7d2fe] text-[#4338ca] text-sm font-bold rounded-lg flex items-start gap-3 animate-in fade-in duration-300">
                            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            <div>{infoMessage}</div>
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
                                {mode === 'FORGOT_PASSWORD' && (
                                    <p className="text-xs font-medium text-slate-400 mt-3 text-center">Use code 123456 to bypass for testing.</p>
                                )}
                            </div>
                        )}

                        {authStep === 'FORM' && (
                            <div className="flex flex-col gap-5 animate-in fade-in duration-300">
                                {mode === 'FORGOT_PASSWORD' && (
                                    <p className="text-sm font-medium text-slate-500 mb-2">
                                        Enter your registered email address and we will send you a code to securely reset your password.
                                    </p>
                                )}

                                <div>
                                    <label className="block text-brand-dark font-bold text-sm mb-1.5">Email Address</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => {
                                            setEmail(e.target.value);
                                            if (emailTouched) {
                                                setErrors(prev => ({ ...prev, email: undefined }));
                                            }
                                        }}
                                        onBlur={handleEmailBlur}
                                        className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                            (errors.email || (emailTouched && email.length > 0 && !isEmailValid))
                                                ? 'border-red-500 focus:ring-red-200'
                                                : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                        }`}
                                        placeholder="name@example.com"
                                        disabled={isLockedOut}
                                    />
                                    {(errors.email || (emailTouched && email.length > 0 && !isEmailValid)) && (
                                        <p className="text-red-500 text-xs font-semibold mt-1.5 animate-in fade-in">
                                            {errors.email || 'Please enter a valid email address.'}
                                        </p>
                                    )}
                                </div>

                                {mode === 'SIGNUP' && (
                                    <div>
                                        <label className="block text-brand-dark font-bold text-sm mb-1.5">Phone Number (Required)</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={handlePhoneChange}
                                            maxLength={15}
                                            className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all font-mono font-medium tracking-wide ${
                                                errors.phone ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="+977 98XXXXXXXX"
                                            disabled={isLockedOut}
                                        />
                                        {errors.phone && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.phone}</p>}
                                    </div>
                                )}

                                {mode !== 'FORGOT_PASSWORD' && (
                                    <div>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <label className="block text-brand-dark font-bold text-sm">Password</label>
                                            {mode === 'LOGIN' && (
                                                <button
                                                    type="button"
                                                    onClick={() => { setMode('FORGOT_PASSWORD'); setAuthStep('FORM'); setErrors({}); setInfoMessage(''); }}
                                                    className="text-xs font-bold text-brand-primary hover:text-brand-dark transition-colors focus:outline-none"
                                                >
                                                    Forgot password?
                                                </button>
                                            )}
                                        </div>
                                        <div className="relative">
                                            {/* STRIPS SPACES ON CHANGE */}
                                            <input
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
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

                                        {mode === 'SIGNUP' && (
                                            <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 animate-in fade-in">
                                                <div className={`flex items-center text-xs font-bold transition-colors ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <CheckmarkIcon isValid={hasMinLength} /> At least 8 characters
                                                </div>
                                                <div className={`flex items-center text-xs font-bold transition-colors ${hasUpperAndLowerCase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <CheckmarkIcon isValid={hasUpperAndLowerCase} /> Uppercase & lowercase letters
                                                </div>
                                                <div className={`flex items-center text-xs font-bold transition-colors ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <CheckmarkIcon isValid={hasNumber} /> Contains a number
                                                </div>
                                                <div className={`flex items-center text-xs font-bold transition-colors ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-400'}`}>
                                                    <CheckmarkIcon isValid={hasSpecialChar} /> Contains a special character (!@#$%)
                                                </div>
                                            </div>
                                        )}

                                        {errors.password && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.password}</p>}
                                    </div>
                                )}

                                {mode === 'SIGNUP' && (
                                    <div>
                                        <label className="block text-brand-dark font-bold text-sm mb-1.5">Confirm Password</label>
                                        <div className="relative">
                                            {/* STRIPS SPACES ON CHANGE */}
                                            <input
                                                type={showConfirmPassword ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
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
                                    </div>
                                )}
                            </div>
                        )}

                        {authStep === 'NEW_PASSWORD' && (
                            <div className="flex flex-col gap-5 animate-in fade-in slide-in-from-right-4 duration-300">
                                <div>
                                    <label className="block text-brand-dark font-bold text-sm mb-1.5">New Password</label>
                                    <div className="relative">
                                        {/* STRIPS SPACES ON CHANGE */}
                                        <input
                                            type={showPassword ? 'text' : 'password'}
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value.replace(/\s/g, ''))}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                                errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="••••••••"
                                            disabled={isLockedOut}
                                        />
                                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark focus:outline-none">
                                            {showPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>

                                    <div className="mt-3 bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 animate-in fade-in">
                                        <div className={`flex items-center text-xs font-bold transition-colors ${hasMinLength ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <CheckmarkIcon isValid={hasMinLength} /> At least 8 characters
                                        </div>
                                        <div className={`flex items-center text-xs font-bold transition-colors ${hasUpperAndLowerCase ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <CheckmarkIcon isValid={hasUpperAndLowerCase} /> Uppercase & lowercase letters
                                        </div>
                                        <div className={`flex items-center text-xs font-bold transition-colors ${hasNumber ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <CheckmarkIcon isValid={hasNumber} /> Contains a number
                                        </div>
                                        <div className={`flex items-center text-xs font-bold transition-colors ${hasSpecialChar ? 'text-emerald-600' : 'text-slate-400'}`}>
                                            <CheckmarkIcon isValid={hasSpecialChar} /> Contains a special character (!@#$%)
                                        </div>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-brand-dark font-bold text-sm mb-1.5">Confirm New Password</label>
                                    <div className="relative">
                                        {/* STRIPS SPACES ON CHANGE */}
                                        <input
                                            type={showConfirmPassword ? 'text' : 'password'}
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value.replace(/\s/g, ''))}
                                            className={`w-full pl-4 pr-12 py-3 border rounded-lg focus:outline-none focus:ring-2 transition-all ${
                                                errors.password ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="••••••••"
                                            disabled={isLockedOut}
                                        />
                                        <button type="button" onClick={() => setShowConfirmPassword(!showConfirmPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-dark focus:outline-none">
                                            {showConfirmPassword ? (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                                            ) : (
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                            )}
                                        </button>
                                    </div>
                                    {errors.password && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.password}</p>}
                                </div>
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={isSubmitting || isLockedOut}
                            className="w-full bg-[#113b92] text-white font-bold py-3.5 rounded-[10px] hover:bg-brand-dark transition-colors text-[15px] mt-4 disabled:opacity-70 disabled:cursor-not-allowed flex justify-center items-center h-[52px]"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-6 w-6 text-white" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                            ) : (
                                getButtonText()
                            )}
                        </button>
                    </form>

                    <hr className="my-8 border-slate-200" />

                    {mode === 'FORGOT_PASSWORD' ? (
                        <div className="text-center">
                            <button
                                onClick={resetState}
                                disabled={isLockedOut}
                                className="text-sm font-bold text-slate-500 hover:text-brand-dark transition-colors flex items-center justify-center gap-2 mx-auto focus:outline-none"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
                                Back to Sign In
                            </button>
                        </div>
                    ) : authStep === 'FORM' && (
                        <div className="flex flex-col gap-4 text-center">
                            <p className="text-[13px] font-medium text-slate-500">
                                {mode === 'LOGIN' ? "Don't have an account?" : "Already have an account?"}
                            </p>
                            <button
                                onClick={toggleMode}
                                disabled={isLockedOut}
                                className="w-full bg-white text-[#113b92] border-2 border-[#113b92] font-bold py-3 rounded-[10px] hover:bg-slate-50 transition-colors disabled:opacity-50 text-[15px]"
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