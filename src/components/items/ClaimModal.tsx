import React, { useState, useEffect } from 'react';
import { Item } from '../../types/item.types';

interface ClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item | null;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ isOpen, onClose, item }) => {
    // Steps: OTP (Verify registered phone) -> CHAT_WARNING (Security notice) -> CHAT (Active messaging)
    const [step, setStep] = useState<'OTP' | 'CHAT_WARNING' | 'CHAT'>('OTP');

    // Verification State
    const [otp, setOtp] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');

    // Chat State
    const [chatMessages, setChatMessages] = useState<{ sender: 'me' | 'them'; text: string }[]>([]);
    const [chatInput, setChatInput] = useState('');

    // Mocking the logged-in user's registered phone number from the system context
    const registeredPhoneNumber = "+977 98XXXXX123";

    useEffect(() => {
        if (isOpen) {
            setStep('OTP'); // Start directly at OTP Verification
            setOtp('');
            setError('');
            setChatMessages([]);
            setChatInput('');
        }
    }, [isOpen]);

    if (!isOpen || !item) return null;

    const isLost = item.type === 'LOST';
    const actionText = isLost ? 'I Found This' : 'Claim Item';

    const handleNext = async () => {
        if (step === 'OTP') {
            if (otp.length !== 6) {
                setError('Please enter a valid 6-digit verification code.');
                return;
            }
            setIsSubmitting(true);
            setError('');
            try {
                await new Promise((resolve) => setTimeout(resolve, 1200));
                if (otp === '123456') {
                    setStep('CHAT_WARNING');
                } else {
                    setError('Invalid verification code.');
                }
            } finally {
                setIsSubmitting(false);
            }
        } else if (step === 'CHAT_WARNING') {
            setStep('CHAT');
        }
    };

    const sendChatMessage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!chatInput.trim()) return;
        setChatMessages((prev) => [...prev, { sender: 'me', text: chatInput }]);
        setChatInput('');

        setTimeout(() => {
            setChatMessages((prev) => [
                ...prev,
                { sender: 'them', text: 'System: Message received and logged for security tracking.' },
            ]);
        }, 1000);
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col overflow-hidden border border-brand-lightest h-[620px]">

                {/* Header */}
                <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">
                            {step === 'CHAT' ? `Secure Channel: ${item.title}` : actionText}
                        </h2>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                            REF: {item.id.includes('-') ? item.id.split('-')[0].toUpperCase() : `TRK-00${item.id}`}
                        </p>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full focus:outline-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col relative custom-scrollbar">

                    {/* STEP 1: OTP Verification */}
                    {step === 'OTP' && (
                        <div className="p-8 flex flex-col items-center justify-center h-full text-center">
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
                                    className={`w-full px-4 py-4 text-center text-2xl tracking-[0.5em] border rounded-xl focus:outline-none focus:ring-2 transition-all font-mono shadow-sm ${
                                        error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:border-brand-primary focus:ring-brand-lightest'
                                    }`}
                                    placeholder="------"
                                    disabled={isSubmitting}
                                />
                                {error && <p className="text-red-500 text-xs font-semibold mt-2">{error}</p>}
                                <p className="text-xs text-slate-400 mt-4">Use code <span className="font-bold text-brand-dark">123456</span> for testing.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: Comprehensive Security Warning Notice */}
                    {step === 'CHAT_WARNING' && (
                        <div className="p-6 md:p-8 flex flex-col items-center justify-center h-full text-center animate-in zoom-in-95 duration-300">
                            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border-4 border-red-100 shrink-0">
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-4">Mandatory Security Warning</h3>

                            <div className="bg-white border border-slate-200 p-5 rounded-xl text-left shadow-sm max-w-lg w-full">
                                <ul className="space-y-4 text-sm font-medium text-slate-600">
                                    <li className="flex gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
                                        <span><strong>Monitored Channel:</strong> Messages are not fully end-to-end encrypted. Our administrative team actively monitors channels to prevent fraud and track disputes.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                        <span><strong>Data Security:</strong> NEVER share passwords, banking details, citizenship/ID numbers, or any sensitive information in this chat.</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
                                        <span><strong>Safe Meetups:</strong> If arranging a handover, ALWAYS meet in a well-lit, public location (e.g., a cafe, mall, or near a police station).</span>
                                    </li>
                                    <li className="flex gap-3">
                                        <svg className="w-5 h-5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                        <span><strong>Platform Liability:</strong> Communicating or conducting exchanges outside of Lost And Found Nepal voids system protection. We accept no liability for external actions.</span>
                                    </li>
                                </ul>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: Live Chat Box */}
                    {step === 'CHAT' && (
                        <div className="flex flex-col h-full bg-white">
                            <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center justify-center gap-2 text-amber-700 text-xs font-bold shrink-0">
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                Verified secure channel. Monitored for fraud prevention. Do not share passwords.
                            </div>

                            <div className="flex-1 p-4 overflow-y-auto flex flex-col gap-3 custom-scrollbar bg-slate-50">
                                {chatMessages.length === 0 && (
                                    <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                        <p className="text-sm text-slate-500 font-medium">Send a message detailing your proof of ownership or the location found to begin.</p>
                                    </div>
                                )}
                                {chatMessages.map((msg, idx) => (
                                    <div key={idx} className={`flex ${msg.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                                        <div className={`max-w-[75%] px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm ${
                                            msg.sender === 'me'
                                                ? 'bg-brand-primary text-white rounded-tr-sm'
                                                : 'bg-white border border-slate-200 text-brand-dark rounded-tl-sm'
                                        }`}>
                                            {msg.text}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <form onSubmit={sendChatMessage} className="p-4 bg-white border-t border-slate-200 shrink-0 flex gap-2">
                                <input
                                    type="text"
                                    value={chatInput}
                                    onChange={(e) => setChatInput(e.target.value)}
                                    placeholder="Type your message securely..."
                                    className="flex-1 px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-full focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-sm font-medium"
                                />
                                <button type="submit" disabled={!chatInput.trim()} className="w-11 h-11 bg-brand-primary text-white rounded-full flex items-center justify-center hover:bg-brand-dark transition-colors disabled:opacity-50">
                                    <svg className="w-5 h-5 -ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"></path></svg>
                                </button>
                            </form>
                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 'CHAT' && (
                    <div className="p-6 border-t border-brand-lightest bg-slate-50 flex justify-between items-center shrink-0">
                        <button onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleNext}
                            disabled={isSubmitting}
                            className={`px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 min-w-[140px] ${
                                step === 'CHAT_WARNING' ? 'bg-red-600 text-white hover:bg-red-700 shadow-red-600/30' : 'bg-brand-primary text-white hover:bg-brand-dark shadow-brand-primary/30'
                            }`}
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : step === 'CHAT_WARNING' ? 'Acknowledge & Open Chat' : 'Continue'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};