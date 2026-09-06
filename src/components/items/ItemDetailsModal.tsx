import React, { useState, useEffect } from 'react';
import { Item } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';

interface ItemDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    item: Item | null;
    onClaimClick: (item: Item) => void;
    onOpenInbox: () => void;
}

export const ItemDetailsModal: React.FC<ItemDetailsModalProps> = ({ isOpen, onClose, item, onClaimClick, onOpenInbox }) => {
    const { user } = useAuth();
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        if (isOpen) setActiveImageIndex(0);
    }, [isOpen, item]);

    if (!isOpen || !item) return null;

    const isLost = item.type === 'LOST';
    const isResolved = item.status === 'RESOLVED';
    const isOwnPost = user && item.reportedByUserId && user.id === item.reportedByUserId;

    const images = item.imageUrls && item.imageUrls.length > 0
        ? item.imageUrls
        : ['https://images.unsplash.com/photo-1628155930542-3c7a64e2c833?q=80&w=600&auto=format&fit=crop'];

    const formatDateTime = (dateString?: string) => {
        if (!dateString) return 'Date not specified';
        const d = new Date(dateString);
        return isNaN(d.getTime()) ? 'Invalid Date' : d.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleActionClick = () => {
        onClose();
        if (isResolved || isOwnPost || item.hasAlreadyClaimed) {
            onOpenInbox();
        } else {
            onClaimClick(item);
        }
    };

    const nextImage = () => {
        setActiveImageIndex((prev) => (prev + 1) % images.length);
    };

    const prevImage = () => {
        setActiveImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div className="fixed inset-0 z-[105] flex items-center justify-center bg-[#0f172a]/70 backdrop-blur-sm p-4 md:p-6 animate-in fade-in duration-200">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col md:flex-row overflow-hidden">

                <div className="w-full md:w-[55%] bg-[#f1f5f9] flex flex-col shrink-0 relative border-r border-slate-100">
                    <div className="relative h-64 md:h-[600px] w-full flex items-center justify-center overflow-hidden">
                        <img
                            src={images[activeImageIndex]}
                            alt={item.title || 'Item Detail'}
                            className={`w-full h-full object-cover ${isResolved ? 'grayscale opacity-80' : ''}`}
                        />

                        {isResolved && (
                            <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10">
                                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center mb-3 shadow-lg shadow-emerald-900/50">
                                    <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                                </div>
                                <span className="text-2xl font-extrabold tracking-tight">Resolved</span>
                                <span className="text-sm font-medium text-emerald-100 mt-1">Successfully Returned</span>
                            </div>
                        )}

                        {images.length > 1 && (
                            <>
                                <button
                                    onClick={prevImage}
                                    className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-20 focus:outline-none"
                                >
                                    <svg className="w-6 h-6 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white w-10 h-10 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors z-20 focus:outline-none"
                                >
                                    <svg className="w-6 h-6 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </>
                        )}

                        <button onClick={onClose} className="md:hidden absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-md z-20">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    {images.length > 1 && (
                        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-3 z-20">
                            {images.map((img, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setActiveImageIndex(idx)}
                                    className={`w-12 h-12 rounded-xl overflow-hidden border-[2px] transition-all shadow-md ${activeImageIndex === idx ? 'border-white scale-110 ring-2 ring-black/20' : 'border-transparent opacity-60 hover:opacity-100'}`}
                                >
                                    <img src={img} className="w-full h-full object-cover" alt={`Thumbnail ${idx}`} />
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="w-full md:w-[45%] flex flex-col bg-white h-[50vh] md:h-auto">
                    <div className="hidden md:flex justify-end p-5 pb-0 shrink-0">
                        <button onClick={onClose} className="text-slate-400 hover:text-slate-700 transition-colors bg-slate-50 p-2 rounded-full border border-slate-100">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-6 md:px-8 custom-scrollbar">
                        <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className={`px-3 py-1 text-[11px] font-extrabold uppercase tracking-wide rounded-md shadow-sm ${isLost ? 'bg-[#ef4444] text-white' : 'bg-[#3b82f6] text-white'}`}>
                                {isLost ? 'LOST ITEM' : 'FOUND ITEM'}
                            </span>
                            <span className="text-[11px] font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-md uppercase tracking-wide border border-slate-200">
                                {item.category}
                            </span>
                            {isOwnPost && (
                                <span className="text-[11px] font-extrabold text-[#4f46e5] bg-[#e0e7ff] px-3 py-1 rounded-md uppercase tracking-wide">
                                    YOUR POST
                                </span>
                            )}
                        </div>

                        <h2 className="text-2xl md:text-[28px] font-extrabold text-[#1e3a8a] mb-6 leading-tight tracking-tight">{item.title}</h2>

                        <div className="space-y-3.5 mb-8 bg-[#f8fafc] p-5 rounded-xl border border-slate-100">
                            <div className="flex items-start text-sm font-medium text-slate-600">
                                <svg className="w-4 h-4 mr-3 text-[#3b82f6] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                                <span>{item.location?.addressText || item.addressText || 'Location not specified'}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-slate-600">
                                <svg className="w-4 h-4 mr-3 text-[#3b82f6] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                <span>Reported on {formatDateTime(item.dateLostOrFound)}</span>
                            </div>
                            <div className="flex items-center text-sm font-medium text-slate-600">
                                <svg className="w-4 h-4 mr-3 text-[#3b82f6] shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
                                <span className="font-mono text-[11px] font-bold text-slate-400">REF: TRK-{item.id.substring(0,6).toUpperCase()}</span>
                            </div>
                        </div>

                        <div className="mb-6">
                            <h4 className="text-[11px] font-extrabold text-[#1e3a8a] mb-3 uppercase tracking-wider">Description</h4>
                            <p className="text-slate-600 text-[15px] leading-relaxed whitespace-pre-wrap">{item.description}</p>
                        </div>
                    </div>

                    <div className="p-6 shrink-0 bg-white">
                        {isResolved ? (
                            isOwnPost ? (
                                <button onClick={handleActionClick} className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#1e293b] text-white shadow-md hover:bg-black transition-all flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                    View Resolution Chat
                                </button>
                            ) : (
                                <div className="w-full py-3.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 text-center border border-emerald-200 flex items-center justify-center gap-2">
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    This item has been resolved
                                </div>
                            )
                        ) : isOwnPost ? (
                            <button onClick={handleActionClick} className="w-full py-3.5 rounded-xl text-sm font-bold bg-[#1e293b] text-white shadow-md hover:bg-black transition-all flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                Open Secure Inbox
                            </button>
                        ) : item.hasAlreadyClaimed ? (
                            <button onClick={handleActionClick} className="w-full py-3.5 rounded-xl text-sm font-bold text-white bg-[#10b981] hover:bg-[#059669] shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2">
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                Connection Established (Open Inbox)
                            </button>
                        ) : (
                            <button
                                onClick={handleActionClick}
                                className={`w-full py-3.5 rounded-xl text-sm font-bold text-white shadow-md transition-all flex items-center justify-center gap-2 ${
                                    isLost ? 'bg-[#ef4444] hover:bg-[#dc2626]' : 'bg-[#3b82f6] hover:bg-[#2563eb]'
                                }`}
                            >
                                {item.hasSecretDetail && (
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path></svg>
                                )}
                                {isLost ? 'I Found This Item' : 'Claim This Item'}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};