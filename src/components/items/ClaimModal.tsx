import React, { useState, useEffect } from 'react';
import { Item } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';

const API_BASE_URL = 'http://localhost:8081/api/v1';

interface ClaimModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item | null;
}

export const ClaimModal: React.FC<ClaimModalProps> = ({ isOpen, onClose, item }) => {
    const { token, user } = useAuth();

    const [step, setStep] = useState<'FORM' | 'SUCCESS'>('FORM');
    const [proofDescription, setProofDescription] = useState('');
    const [secretAnswer, setSecretAnswer] = useState('');
    const [contactEmailOrPhone, setContactEmailOrPhone] = useState(user?.email || '');

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

    useEffect(() => {
        if (isOpen) {
            setStep('FORM');
            setProofDescription('');
            setSecretAnswer('');
            setContactEmailOrPhone(user?.email || '');
            setErrors({});
        }
    }, [isOpen, user]);

    if (!isOpen || !item) return null;

    const isLost = item.type === 'LOST';
    const actionText = isLost ? 'I Found This' : 'Claim Item';

    const validateForm = () => {
        const newErrors: Record<string, string> = {};
        if (!proofDescription.trim()) newErrors.proofDescription = 'Please provide details of your proof.';
        if (item.hasSecretDetail && !secretAnswer.trim()) newErrors.secretAnswer = 'The secret answer is required for this item.';
        if (!contactEmailOrPhone.trim()) newErrors.contactEmailOrPhone = 'Contact info is required.';

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        setIsSubmitting(true);
        setErrors({});

        try {
            const response = await fetch(`${API_BASE_URL}/claims`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    itemId: item.id,
                    proofDescription,
                    secretAnswer: secretAnswer || null,
                    contactEmailOrPhone
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(errorText || 'Failed to submit claim');
            }

            setStep('SUCCESS');
        } catch (error: any) {
            setErrors({ general: error.message === 'Incorrect secret answer' ? 'Incorrect secret answer. Please try again.' : 'Failed to submit request.' });
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-brand-dark/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden border border-brand-lightest">

                {/* Header */}
                <div className="bg-slate-950 p-5 flex justify-between items-center border-b border-slate-800 shrink-0">
                    <div>
                        <h2 className="text-lg font-bold text-white tracking-tight">{actionText}</h2>
                        <p className="text-xs font-medium text-slate-400 mt-0.5">
                            REF: {item.id.includes('-') ? item.id.split('-')[0].toUpperCase() : `TRK-00${item.id}`}
                        </p>
                    </div>
                    {step !== 'SUCCESS' && (
                        <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-slate-800 p-2 rounded-full focus:outline-none">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    )}
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col custom-scrollbar">

                    {step === 'SUCCESS' ? (
                        <div className="p-10 flex flex-col items-center justify-center text-center animate-in zoom-in-95 duration-300">
                            <div className="w-20 h-20 bg-green-50 text-green-500 rounded-full flex items-center justify-center mb-6 shadow-inner border-4 border-green-100">
                                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                            </div>
                            <h3 className="text-2xl font-extrabold text-brand-dark mb-3">Request Submitted!</h3>
                            <p className="text-slate-500 font-medium mb-8">
                                Your proof has been sent to the original poster. They will review it and respond shortly.
                                Please monitor your <strong className="text-brand-dark">Secure Inbox</strong> for updates.
                            </p>
                            <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-md hover:bg-brand-dark transition-all">
                                Close & Return to Dashboard
                            </button>
                        </div>
                    ) : (
                        <div className="p-6 md:p-8 flex flex-col gap-5">

                            {errors.general && (
                                <div className="p-3 bg-red-50 border border-red-200 text-red-600 text-sm font-bold rounded-lg flex items-center gap-2">
                                    <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                                    {errors.general}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-1.5">Proof Description <span className="text-red-500">*</span></label>
                                <textarea
                                    rows={4}
                                    value={proofDescription}
                                    onChange={(e) => setProofDescription(e.target.value)}
                                    placeholder="Describe why you believe this is yours or how you found it. You can share photos later in the Secure Inbox."
                                    className={`w-full px-4 py-3 bg-white border ${errors.proofDescription ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium resize-none transition-all`}
                                />
                                {errors.proofDescription && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.proofDescription}</p>}
                            </div>

                            {item.hasSecretDetail && (
                                <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl">
                                    <label className="block text-sm font-bold text-amber-900 mb-1.5">
                                        <span className="flex items-center gap-2">
                                            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                            Security Question Required
                                        </span>
                                    </label>
                                    <p className="text-xs font-medium text-amber-700 mb-3">This item has an encrypted security question set by the poster. You must answer it correctly to open communication.</p>
                                    <input
                                        type="text"
                                        value={secretAnswer}
                                        onChange={(e) => setSecretAnswer(e.target.value)}
                                        placeholder="Enter your answer here..."
                                        className={`w-full px-4 py-3 bg-white border ${errors.secretAnswer ? 'border-red-500' : 'border-amber-300'} rounded-xl focus:outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-200 text-brand-dark font-medium transition-all`}
                                    />
                                    {errors.secretAnswer && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.secretAnswer}</p>}
                                </div>
                            )}

                            <div>
                                <label className="block text-sm font-bold text-brand-dark mb-1.5">Preferred Contact Details <span className="text-red-500">*</span></label>
                                <input
                                    type="text"
                                    value={contactEmailOrPhone}
                                    onChange={(e) => setContactEmailOrPhone(e.target.value)}
                                    placeholder="Phone or Email"
                                    className={`w-full px-4 py-3 bg-white border ${errors.contactEmailOrPhone ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-lightest text-brand-dark font-medium transition-all`}
                                />
                                {errors.contactEmailOrPhone && <p className="text-red-500 text-xs font-semibold mt-1.5">{errors.contactEmailOrPhone}</p>}
                            </div>

                        </div>
                    )}
                </div>

                {/* Footer */}
                {step !== 'SUCCESS' && (
                    <div className="p-6 border-t border-brand-lightest bg-slate-50 flex justify-between items-center shrink-0">
                        <button onClick={onClose} disabled={isSubmitting} className="px-6 py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-brand-dark hover:bg-slate-200 transition-colors">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className="px-8 py-2.5 rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2 min-w-[140px] bg-brand-primary text-white hover:bg-brand-dark shadow-brand-primary/30"
                        >
                            {isSubmitting ? (
                                <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                            ) : 'Submit Request'}
                        </button>
                    </div>
                )}

            </div>
        </div>
    );
};