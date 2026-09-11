import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'https://lostandfoundbackend-lt0z.onrender.com/api/v1';

// Enterprise Security Constants
const MAX_MESSAGE_LENGTH = 1000;
const MAX_EMAIL_LENGTH = 100;
const FEEDBACK_COOLDOWN_MS = 3 * 60 * 1000; // 3 minutes in milliseconds

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

type FeedbackType = 'BUG' | 'SUGGESTION' | 'GENERAL';

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { token } = useAuth();

    const [feedbackType, setFeedbackType] = useState<FeedbackType>('SUGGESTION');
    const [message, setMessage] = useState('');
    const [contactEmail, setContactEmail] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen) {
            setFeedbackType('SUGGESTION');
            setMessage('');
            setContactEmail('');
            setIsSubmitting(false);
            setIsSuccess(false);
            setError('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async () => {
        // 1. Client-Side Spam Prevention (Cooldown Check)
        const lastSubmit = localStorage.getItem('laf_feedback_timestamp');
        if (lastSubmit) {
            const timePassed = Date.now() - parseInt(lastSubmit, 10);
            if (timePassed < FEEDBACK_COOLDOWN_MS) {
                const minutesLeft = Math.ceil((FEEDBACK_COOLDOWN_MS - timePassed) / 60000);
                setError(`Spam protection: Please wait ${minutesLeft} minute(s) before submitting again.`);
                return;
            }
        }

        // 2. Strict Input Validation
        if (!message.trim()) {
            setError('Please enter your feedback details before submitting.');
            return;
        }

        if (message.length > MAX_MESSAGE_LENGTH) {
            setError(`Message cannot exceed ${MAX_MESSAGE_LENGTH} characters.`);
            return;
        }

        if (contactEmail) {
            if (contactEmail.length > MAX_EMAIL_LENGTH) {
                setError(`Email cannot exceed ${MAX_EMAIL_LENGTH} characters.`);
                return;
            }
            // Basic Regex for valid email structure
            if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
                setError('Please enter a valid email address.');
                return;
            }
        }

        setError('');
        setIsSubmitting(true);

        try {
            const headers: Record<string, string> = { 'Content-Type': 'application/json' };
            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
            }

            const response = await fetch(`${API_BASE_URL}/feedback`, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    type: feedbackType,
                    message: message.trim(),
                    contactEmail: contactEmail.trim()
                })
            });

            if (!response.ok) {
                throw new Error('Failed to submit feedback');
            }

            // Record successful submission time to enforce future cooldowns
            localStorage.setItem('laf_feedback_timestamp', Date.now().toString());

            setIsSuccess(true);
            setTimeout(() => {
                onClose();
            }, 2500);
        } catch (err) {
            setError('Failed to send feedback. Please try again.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-brand-lightest transition-all max-h-[calc(100dvh-2rem)]">

                {/* Header */}
                <div className="bg-slate-950 p-4 sm:p-5 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-brand-light">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z"></path></svg>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">Send Feedback</h2>
                    </div>
                    {!isSuccess && (
                        <button onClick={onClose} disabled={isSubmitting} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full focus:outline-none disabled:opacity-50">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>

                {isSuccess ? (
                    <div className="p-12 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300 overflow-y-auto">
                        <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner">
                            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <h3 className="text-2xl font-extrabold text-brand-dark mb-2">Thank You!</h3>
                        <p className="text-slate-500 font-medium">Your feedback has been successfully submitted. We review every message to improve our platform.</p>
                    </div>
                ) : (
                    <div className="flex flex-col flex-1 min-h-0">
                        {/* Body */}
                        <div className="p-5 sm:p-8 overflow-y-auto bg-white flex-1 custom-scrollbar">
                            <p className="text-sm text-slate-500 font-medium mb-5">
                                We are constantly updating Lost And Found Nepal. Let us know if you found a bug, have a feature suggestion, or just want to share your experience.
                            </p>

                            <div className="mb-5">
                                <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-3">Feedback Type</label>
                                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                                    <button onClick={() => setFeedbackType('BUG')} className={`py-2 px-1 sm:py-3 sm:px-4 rounded-xl border-2 font-bold text-[11px] sm:text-sm transition-all flex flex-col items-center gap-1 sm:gap-1.5 ${feedbackType === 'BUG' ? 'border-red-500 bg-red-50 text-red-700 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                        Report Bug
                                    </button>
                                    <button onClick={() => setFeedbackType('SUGGESTION')} className={`py-2 px-1 sm:py-3 sm:px-4 rounded-xl border-2 font-bold text-[11px] sm:text-sm transition-all flex flex-col items-center gap-1 sm:gap-1.5 ${feedbackType === 'SUGGESTION' ? 'border-brand-primary bg-brand-lightest text-brand-dark shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"></path></svg>
                                        Suggestion
                                    </button>
                                    <button onClick={() => setFeedbackType('GENERAL')} className={`py-2 px-1 sm:py-3 sm:px-4 rounded-xl border-2 font-bold text-[11px] sm:text-sm transition-all flex flex-col items-center gap-1 sm:gap-1.5 ${feedbackType === 'GENERAL' ? 'border-slate-800 bg-slate-100 text-slate-800 shadow-sm' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}>
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"></path></svg>
                                        General
                                    </button>
                                </div>
                            </div>

                            {!token && (
                                <div className="mb-5">
                                    <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide mb-2">Email (Optional)</label>
                                    <input
                                        type="email"
                                        maxLength={MAX_EMAIL_LENGTH}
                                        value={contactEmail}
                                        onChange={(e) => {
                                            setContactEmail(e.target.value);
                                            setError(''); // Clear error on typing
                                        }}
                                        placeholder="Leave your email if you'd like a reply..."
                                        className="w-full px-4 py-3 bg-white border border-slate-300 focus:ring-brand-lightest focus:border-brand-primary rounded-xl focus:outline-none focus:ring-2 text-brand-dark font-medium transition-all"
                                        disabled={isSubmitting}
                                    />
                                </div>
                            )}

                            <div>
                                <div className="flex justify-between items-end mb-2">
                                    <label className="block text-xs font-bold text-brand-dark uppercase tracking-wide">Details <span className="text-red-500">*</span></label>
                                    <span className={`text-xs font-bold ${message.length >= MAX_MESSAGE_LENGTH ? 'text-red-500' : 'text-slate-400'}`}>
                                        {message.length} / {MAX_MESSAGE_LENGTH}
                                    </span>
                                </div>
                                <textarea
                                    rows={4}
                                    maxLength={MAX_MESSAGE_LENGTH}
                                    value={message}
                                    onChange={(e) => {
                                        setMessage(e.target.value);
                                        setError(''); // Clear error on typing
                                    }}
                                    placeholder={feedbackType === 'BUG' ? "Please describe the bug..." : feedbackType === 'SUGGESTION' ? "What feature would you like to see?" : "Tell us what's on your mind..."}
                                    className={`w-full px-4 py-3 bg-white border ${error ? 'border-red-500 focus:ring-red-200' : 'border-slate-300 focus:ring-brand-lightest focus:border-brand-primary'} rounded-xl focus:outline-none focus:ring-2 text-brand-dark font-medium resize-none transition-all`}
                                    disabled={isSubmitting}
                                />
                                {error && <p className="text-red-500 text-xs font-bold mt-2 animate-in fade-in">{error}</p>}
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex justify-end gap-3 shrink-0">
                            <button onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-200 transition-colors disabled:opacity-50">Cancel</button>
                            <button onClick={handleSubmit} disabled={isSubmitting} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-[#113b92] text-white shadow-md hover:bg-brand-dark transition-all disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center min-w-[140px]">
                                {isSubmitting ? (
                                    <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                ) : 'Send Feedback'}
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};