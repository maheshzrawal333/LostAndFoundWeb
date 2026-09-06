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

    const [step, setStep] = useState<'OTP' | 'CHAT_WARNING' | 'SUCCESS'>('OTP');
    const [otp, setOtp] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const registeredPhoneNumber = "+977 98XXXXX123";

    useEffect(() => {
        if (isOpen && item) {
            // --- BYPASS OTP INSTANTLY IF ALREADY CLAIMED ---
            if (item.hasAlreadyClaimed) {
                setStep('CHAT_WARNING');
                setError('You have already established a secure connection for this item. Check your inbox.');
            } else {
                setStep('OTP');
                setError('');
            }
            setOtp('');
            setIsSubmitting(false);
        }
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const isOwnPost = user && item.reportedByUserId && (user.id === item.reportedByUserId);
    const actionText = item.type === 'LOST' ? 'I Found This' : 'Claim Item';

    const handleNext = async () => {
        if (item.hasAlreadyClaimed || error.includes('already established')) {
            if (onSuccessOpenInbox) onSuccessOpenInbox();
            else onClose();
            return;
        }

        if (step === 'OTP') {
            if (otp.length !== 6) {
                setError('Please enter a valid 6-digit verification code.');
                return;
            }
            setIsSubmitting(true);
            setError('');
            try {
                await new Promise((resolve) => setTimeout(resolve, 800));
                if (otp === '123456') {
                    setStep('CHAT_WARNING');
                } else {
                    setError('Invalid verification code.');
                }
            } finally {
                setIsSubmitting(false);
            }
        } else if (step === 'CHAT_WARNING') {
            setIsSubmitting(true);
            setError('');

            const submitClaimWithLocation = async (lat: number | null, lng: number | null) => {
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
                            latitude: lat,
                            longitude: lng
                        })
                    });

                    if (response.ok) {
                        setStep('SUCCESS');
                    } else if (response.status === 409) {
                        setStep('CHAT_WARNING');
                        setError('You have already established a secure connection for this item. Check your inbox.');
                    } else {
                        setError('Could not establish connection. Please try again later.');
                    }
                } catch (err) {
                    setError('Network error occurred while opening connection.');
                } finally {
                    setIsSubmitting(false);
                }
            };

            if ("geolocation" in navigator) {
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        submitClaimWithLocation(position.coords.latitude, position.coords.longitude);
                    },
                    (err) => {
                        console.warn("Location access denied.", err);
                        setError("Security Requirement: Location access is mandatory to claim items. Please enable GPS permissions in your browser and try again.");
                        setIsSubmitting(false);
                    },
                    { enableHighAccuracy: true, timeout: 10000 }
                );
            } else {
                setError("Your browser does not support the required location security features.");
                setIsSubmitting(false);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-[#f8fafc] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-slate-200">

                <div className="bg-[#0b1120] p-5 md:px-6 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{actionText}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                            REF: {item.id.includes('-') ? item.id.split('-')[0].toUpperCase() : `TRK-00${item.id}`}
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
                            {step === 'OTP' && !item.hasAlreadyClaimed && (
                                <div className="p-8 flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-300">
                                    <div className="w-16 h-16 bg-brand-lightest text-brand-primary rounded-full flex items-center justify-center mb-6">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                    </div>
                                    <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Enter Verification Code</h3>
                                    <p className="text-sm text-slate-500 font-medium mb-8 max-w-sm">
                                        We sent a 6-digit verification code to <span className="font-bold text-brand-dark">{registeredPhoneNumber}</span>.
                                    </p>

                                    <div className="w-full max-w-xs">
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
                                        <p className="text-xs text-slate-400 mt-4">Use code <span className="font-bold text-brand-dark">123456</span> to continue.</p>
                                    </div>
                                </div>
                            )}

                            {step === 'CHAT_WARNING' && (
                                <div className="px-6 py-10 md:p-10 flex flex-col items-center animate-in zoom-in-95 duration-300">
                                    <div className="w-16 h-16 bg-[#fef2f2] text-[#dc2626] rounded-full flex items-center justify-center mb-5 border-[3px] border-[#fee2e2] shrink-0 mx-auto shadow-sm">
                                        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    </div>

                                    <h3 className="text-[26px] font-extrabold text-[#1e3a8a] mb-6 tracking-tight">Mandatory Security Warning</h3>

                                    <div className="bg-white border border-slate-100 p-6 sm:p-7 rounded-2xl text-left shadow-sm max-w-[540px] w-full mb-4">
                                        <ul className="space-y-6 text-[15px] font-medium text-slate-500">
                                            <li className="flex gap-4 items-start">
                                                <svg className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                                <span className="leading-relaxed"><strong className="text-slate-700">Monitored Channel:</strong> Messages are not fully end-to-end encrypted. Our administrative team actively monitors channels to prevent fraud and track disputes.</span>
                                            </li>
                                            <li className="flex gap-4 items-start">
                                                <svg className="w-6 h-6 text-[#ef4444] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                                <span className="leading-relaxed"><strong className="text-slate-700">Data Security:</strong> NEVER share passwords, banking details, citizenship/ID numbers, or any sensitive information in this chat.</span>
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
                        <button onClick={onClose} disabled={isSubmitting} className="text-[15px] font-bold text-[#64748b] hover:text-[#0f172a] transition-colors focus:outline-none">
                            Cancel
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={`px-8 py-3.5 rounded-xl text-[15px] font-bold shadow-lg transition-all flex items-center justify-center min-w-[140px] focus:outline-none ${
                                item.hasAlreadyClaimed || error.includes('already established')
                                    ? 'bg-emerald-500 text-white hover:bg-emerald-600 shadow-emerald-500/25'
                                    : step === 'CHAT_WARNING'
                                        ? 'bg-[#dc2626] text-white hover:bg-[#b91c1c] shadow-red-600/25'
                                        : 'bg-brand-primary text-white hover:bg-brand-dark shadow-brand-primary/30'
                            }`}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : item.hasAlreadyClaimed || error.includes('already established') ? (
                                'Open Secure Inbox'
                            ) : step === 'CHAT_WARNING' ? (
                                'Acknowledge & Open Chat'
                            ) : (
                                'Continue'
                            )}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};