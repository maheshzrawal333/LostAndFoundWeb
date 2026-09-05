import React from 'react';

export type LegalPageType = 'HOW_IT_WORKS' | 'SAFETY' | 'PRIVACY' | 'TERMS';

interface LegalModalProps {
    isOpen: boolean;
    onClose: () => void;
    page: LegalPageType | null;
}

export const LegalModal: React.FC<LegalModalProps> = ({ isOpen, onClose, page }) => {
    if (!isOpen || !page) return null;

    const contentMap = {
        HOW_IT_WORKS: {
            title: 'How It Works',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />,
            body: (
                <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
                    <p>Lost And Found Nepal is a secure, community-driven platform designed to reunite individuals with their lost belongings through a verified, accountable system.</p>

                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-lightest text-brand-primary font-bold flex items-center justify-center shrink-0">1</div>
                            <div>
                                <h4 className="font-bold text-brand-dark text-base">Search or Report</h4>
                                <p>Browse our database using advanced filters to find your lost item. If you've found something, securely report it by providing general details while withholding one key identifying feature.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-lightest text-brand-primary font-bold flex items-center justify-center shrink-0">2</div>
                            <div>
                                <h4 className="font-bold text-brand-dark text-base">Verify Identity</h4>
                                <p>To prevent fraud, all claims and reports require mandatory OTP (One-Time Password) verification using a registered Nepali mobile number.</p>
                            </div>
                        </div>

                        <div className="flex gap-4">
                            <div className="w-8 h-8 rounded-full bg-brand-lightest text-brand-primary font-bold flex items-center justify-center shrink-0">3</div>
                            <div>
                                <h4 className="font-bold text-brand-dark text-base">Secure Connection</h4>
                                <p>Once verified, both parties are placed into a monitored, internal messaging channel to discuss the handover securely. We actively track these channels to ensure user safety.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        SAFETY: {
            title: 'Safety Guidelines',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />,
            body: (
                <div className="space-y-6 text-slate-600 text-sm leading-relaxed">
                    <p className="font-medium text-brand-dark">Your safety is our top priority. Please adhere to the following strict guidelines when using Lost And Found Nepal to recover or return items.</p>

                    <ul className="space-y-4">
                        <li className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <strong className="block text-brand-dark mb-1">Meet in Public Spaces</strong>
                            Always arrange handovers during daylight hours in highly populated, public locations. Ideal meeting spots include near police stations, major shopping malls, or busy cafes.
                        </li>
                        <li className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <strong className="block text-brand-dark mb-1">Protect Sensitive Data</strong>
                            Never share your banking credentials, citizenship/Nagarikta numbers, passport details, or home address in the chat. Our administrators will never ask for this information.
                        </li>
                        <li className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <strong className="block text-brand-dark mb-1">Verify Ownership Rigorously</strong>
                            If you found an item, ask the claimant to describe a specific, hidden detail (e.g., a specific card inside a wallet, or a unique scratch on a phone) before confirming the handover.
                        </li>
                        <li className="p-4 bg-slate-50 border border-slate-100 rounded-xl">
                            <strong className="block text-brand-dark mb-1">Keep Communication On-Platform</strong>
                            Do not move communication to WhatsApp, Viber, or regular phone calls until you are absolutely certain of the other party's legitimacy. Our internal chat is monitored for your protection.
                        </li>
                    </ul>
                </div>
            )
        },
        PRIVACY: {
            title: 'Privacy Policy',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />,
            body: (
                <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                    <p><strong>Effective Date:</strong> September 2026</p>
                    <p>Lost And Found Nepal ("we," "our," or "us") is committed to protecting your personal data in accordance with the privacy laws of Nepal. This policy outlines how we handle your information.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">1. Information We Collect</h4>
                    <p>We collect essential data required to operate a secure platform, including your full name, verified mobile phone number, email address, and optional location data (Province/District). We also collect item images and chat logs.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">2. How We Use Your Data</h4>
                    <p>Your phone number is used strictly for Multi-Factor Authentication (OTP) to prevent fraud. We do not use your phone number for marketing. Chat logs are actively monitored by automated systems and human administrators solely for dispute resolution and safety enforcement.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">3. Data Sharing & Security</h4>
                    <p>We do not sell, rent, or trade your personal information to third parties. Data may be shared with local law enforcement agencies in Nepal only if legally mandated or if there is a credible threat to user safety.</p>
                </div>
            )
        },
        TERMS: {
            title: 'Terms of Service',
            icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />,
            body: (
                <div className="space-y-5 text-slate-600 text-sm leading-relaxed">
                    <p>By accessing and using Lost And Found Nepal, you agree to comply with these Terms of Service. Please read them carefully.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">1. User Conduct & Fraud Prevention</h4>
                    <p>You agree to provide accurate, truthful information when reporting or claiming items. Submitting false claims, attempting to extort rewards, or using the platform for illegal activities will result in an immediate, permanent ban and potential reporting to local authorities.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">2. Platform Liability Exemption</h4>
                    <p>Lost And Found Nepal serves solely as an informational conduit to connect individuals. We do not verify the physical authenticity of items and are <strong>not liable</strong> for any loss, damage, theft, or injury that occurs during offline handovers. Users assume all risks associated with physical meetings.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">3. Monitored Communications</h4>
                    <p>To enforce safety policies, all communications on the platform are logged and subject to monitoring. By using our messaging service, you explicitly consent to this oversight.</p>

                    <h4 className="font-bold text-brand-dark text-base pt-2">4. Account Termination</h4>
                    <p>We reserve the right to suspend or terminate accounts without prior notice if we detect suspicious activity, repeated false claims, or violations of these terms.</p>
                </div>
            )
        }
    };

    const activeContent = contentMap[page];

    return (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-brand-dark/70 backdrop-blur-sm p-4 sm:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl flex flex-col overflow-hidden max-h-[85vh]">

                {/* Header */}
                <div className="bg-slate-950 p-6 flex justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center text-brand-light">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                {activeContent.icon}
                            </svg>
                        </div>
                        <h2 className="text-xl font-bold text-white tracking-tight">{activeContent.title}</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors bg-white/10 p-2 rounded-full focus:outline-none">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                {/* Content Body */}
                <div className="p-6 sm:p-8 overflow-y-auto custom-scrollbar bg-white flex-1">
                    {activeContent.body}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end shrink-0">
                    <button onClick={onClose} className="px-8 py-2.5 rounded-xl text-sm font-bold bg-brand-dark text-white hover:bg-brand-primary transition-colors shadow-md">
                        Understood
                    </button>
                </div>

            </div>
        </div>
    );
};