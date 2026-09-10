import React, { useState, useEffect } from 'react';
import { Item } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface ClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item | null;
    onSuccessOpenInbox?: () => void;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ isOpen, onClose, item, onSuccessOpenInbox }) => {
    const { token, user } = useAuth();

    // The flow now starts with the Security Warning
    const [step, setStep] = useState<'CHAT_WARNING' | 'OTP' | 'SUCCESS'>('CHAT_WARNING');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Store coordinates between Step 1 (Warning) and Step 2 (OTP Submission)
    const [coordinates, setCoordinates] = useState<{ lat: number | null, lng: number | null }>({ lat: null, lng: null });

    const isOwnPost = user && item?.reportedByUserId && user.id === item.reportedByUserId;
    const actionText = item?.type === 'LOST' ? 'I Found This' : 'Claim Item';

    useEffect(() => {
        if (isOpen && item) {
            // Reset state entirely when modal opens
            setStep('CHAT_WARNING');
            setOtp('');
            setError('');
            setIsSubmitting(false);
            setCoordinates({ lat: null, lng: null });
        }
    }, [isOpen, item, isOwnPost]);

    if (!isOpen || !item) return null;

    // STEP 1: Handle Security Acknowledgment & Location Fetching
    const handleAcknowledgeAndRequestOtp = async () => {
        setIsSubmitting(true);
        setError('');

        const requestOtpAndProceed = async (lat: number, lng: number) => {
            setCoordinates({ lat, lng }); // Save location for final submission
            try {
                const response = await fetch(`${API_BASE_URL}/items/request-otp`, {
                    method: 'POST',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) {
                    throw new Error('Failed to send verification code.');
                }
                // Successfully got location and sent email -> Move to OTP step
                setStep('OTP');
            } catch (err) {
                setError('Failed to request verification code. Please check your connection.');
            } finally {
                setIsSubmitting(false);
            }
        };

        // Enterprise STRICT Geolocation Requirement
        let locationResolved = false;

        const absoluteTimeout = setTimeout(() => {
            if (!locationResolved) {
                locationResolved = true;
                setIsSubmitting(false);
                setError("Location access is required to prevent fraud. Please allow location permissions in your browser and try again.");
            }
        }, 8000);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    if (!locationResolved) {
                        locationResolved = true;
                        clearTimeout(absoluteTimeout);
                        requestOtpAndProceed(position.coords.latitude, position.coords.longitude);
                    }
                },
                (err) => {
                    if (!locationResolved) {
                        locationResolved = true;
                        clearTimeout(absoluteTimeout);
                        setIsSubmitting(false);

                        if (err.code === err.PERMISSION_DENIED) {
                            setError("Location access was denied. You must allow location access in your browser settings to claim this item.");
                        } else {
                            setError("Unable to retrieve your location. Please check your device settings and try again.");
                        }
                    }
                },
                { enableHighAccuracy: true, timeout: 8000 }
            );
        } else {
            if (!locationResolved) {
                locationResolved = true;
                clearTimeout(absoluteTimeout);
                setIsSubmitting(false);
                setError("Your browser does not support location services, which are strictly required for security.");
            }
        }
    };

    // STEP 2: Handle Final Claim Submission with OTP and Saved Location
    const handleFinalSubmit = async () => {
        if (otp.length !== 6 || !/^\d+$/.test(otp)) {
            setError('Please enter a valid 6-digit verification code.');
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const response = await fetch(`${API_BASE_URL}/claims`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemId: item.id,
                    proofDescription: "Secure connection initiated via OTP verification.",
                    secretAnswer: null,
                    contactEmailOrPhone: user?.email || 'Verified User',
                    latitude: coordinates.lat, // Inject saved coordinates
                    longitude: coordinates.lng, // Inject saved coordinates
                    otp
                })
            });

            if (response.ok) {
                setStep('SUCCESS');
            } else if (response.status === 409) {
                setError('Could not establish connection. You may have already claimed this item.');
            } else {
                const errData = await response.json().catch(() => ({}));
                setError(errData.message || errData.error || 'Could not establish connection. Please try again later.');
            }
        } catch (err) {
            setError('Network error occurred while opening connection.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200">

                <div className="bg-[#0b1120] p-5 md:px-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{actionText}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                            REF: TRK-{item.id.substring(0, 6).toUpperCase()}
                        </p>
                    </div>
                    {step !== 'SUCCESS' && (
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full focus:outline-none">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>

                <div className="flex-1 overflow-y-auto flex flex-col relative custom-scrollbar bg-[#f8fafc]">
                    {isOwnPost ? (
                        <div className="p-10 py-16 flex flex-col items-center justify-center text-center">
                            <div className="w-20 h-20 bg-slate-200 text-slate-500 rounded-full flex items-center justify-center mb-6">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-3">This is your post</h3>
                            <p className="text-slate-500 font-medium mb-8 max-w-md">
                                You cannot open a claim on an item you reported. Please wait for other users to contact you regarding this item.
                            </p>
                            <button onClick={onClose} className="px-8 py-3 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md hover:bg-brand-dark transition-all">
                                Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <>
                            {step === 'CHAT_WARNING' && (
                                <div className="px-6 py-10 md:p-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 bg-[#fef2f2] text-[#dc2626] rounded-full flex items-center justify-center mb-5 border-[3px] border-[#fee2e2] shrink-0 mx-auto shadow-sm">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>

                                    <h3 className="text-[26px] font-extrabold text-[#1e3a8a] mb-6 tracking-tight">Security & Safety Standards</h3>

                                    <div className="bg-white border border-slate-100 p-6 sm:p-7 rounded-2xl text-left shadow-sm max-w-[540px] w-full mb-4">
                                        <ul className="space-y-6 text-[15px] font-medium text-slate-500">
                                            <li className="flex gap-4 items-start">
                                                <svg className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                                                <span className="leading-relaxed"><strong className="text-slate-700">Platform Security:</strong> Messages are not end-to-end encrypted. To ensure a safe community, chat logs are securely retained and will strictly be reviewed by administration only if a user is reported for fraud, abuse, or system exploitation.</span>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <svg className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                <span className="leading-relaxed"><strong className="text-slate-700">Data Protection:</strong> Never share passwords, banking details, citizenship/ID numbers, or sensitive financial information. Communicating off-platform voids all system protections.</span>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <svg className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                                <span className="leading-relaxed"><strong className="text-slate-700">Location Verification:</strong> To prevent fraudulent claims and system exploitation, your precise location is required and will be securely logged when initiating this connection.</span>
                                            </li>
                                        </ul>
                                    </div>

                                    {error && (
                                        <div className="text-[#dc2626] text-[15px] font-bold bg-[#fef2f2] p-4 rounded-xl w-full max-w-[540px] border border-[#fecaca] text-center shadow-sm">
                                            {error}
                                        </div>
                                    )}
                                </div>
                            )}

                            {step === 'OTP' && (
                                <div className="p-8 flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
                                    <div className="w-16 h-16 bg-brand-lightest text-brand-primary rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Enter Verification Code</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm">
                                        We sent a 6-digit verification code to <span className="font-bold text-brand-dark">{user?.email || 'your registered email'}</span>.
                                    </p>

                                    <div className="w-full max-w-xs relative">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono shadow-sm bg-white ${
                                                error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                            }`}
                                            placeholder="------"
                                            disabled={isSubmitting}
                                        />
                                        {error && <p className="text-red-500 text-xs font-semibold mt-2">{error}</p>}
                                    </div>
                                </div>
                            )}

                            {step === 'SUCCESS' && (
                                <div className="p-10 py-16 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                                    <div className="w-20 h-20 bg-[#ecfdf5] text-[#10b981] rounded-full flex items-center justify-center mb-6 shadow-sm border-[4px] border-[#d1fae5]">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                    </div>
                                    <h3 className="text-[26px] font-extrabold text-[#1e3a8a] mb-3 tracking-tight">Connection Established!</h3>
                                    <p className="text-slate-500 font-medium mb-10 text-[15px]">
                                        A secure channel has been created with the poster. Please open your <strong className="text-[#1e3a8a]">Secure Inbox</strong> to begin chatting.
                                    </p>
                                    <button onClick={onSuccessOpenInbox || onClose} className="w-full max-w-sm py-3.5 rounded-xl text-[15px] font-bold bg-[#3b82f6] text-white shadow-md hover:bg-[#2563eb] transition-all focus:outline-none">
                                        Close & Open Inbox
                                    </button>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {!isOwnPost && step !== 'SUCCESS' && (
                    <div className="px-6 py-5 md:px-10 border-t border-slate-200 bg-[#f8fafc] flex justify-between items-center shrink-0">
                        <button onClick={onClose} disabled={isSubmitting} className="text-[15px] font-bold text-[#64748b] hover:text-[#0f172a] transition-colors focus:outline-none disabled:opacity-50">
                            Cancel
                        </button>

                        {step === 'CHAT_WARNING' && (
                            <button
                                onClick={handleAcknowledgeAndRequestOtp}
                                disabled={isSubmitting}
                                className="px-8 py-3.5 rounded-xl text-[15px] font-bold shadow-lg transition-all flex items-center justify-center min-w-[140px] focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-red-600/25"
                            >
                                {isSubmitting ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Acknowledge & Get Code'}
                            </button>
                        )}

                        {step === 'OTP' && (
                            <button
                                onClick={handleFinalSubmit}
                                disabled={isSubmitting}
                                className="px-8 py-3.5 rounded-xl text-[15px] font-bold shadow-lg transition-all flex items-center justify-center min-w-[140px] focus:outline-none disabled:opacity-70 disabled:cursor-not-allowed bg-brand-primary text-white hover:bg-brand-dark shadow-brand-primary/30"
                            >
                                {isSubmitting ? <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : 'Verify & Connect'}
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};