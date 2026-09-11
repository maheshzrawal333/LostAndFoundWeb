import React, { useState } from 'react';
import { Item } from '../../types/item.types';
import { useAuth } from '../../context/AuthContext';

interface ItemCardProps {
    item: Item;
    onClaimClick: (item: Item) => void;
    onViewDetails: (item: Item) => void;
    onOpenInbox: () => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick, onViewDetails, onOpenInbox }) => {
    const { user } = useAuth();

    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    if (!item) return null;

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
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const handleNextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev + 1) % images.length);
    };

    const handlePrevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
    };

    return (
        <div
            onClick={() => onViewDetails(item)}
            /* FIX 1: Replaced h-full with h-fit to prevent the card from artificially stretching */
            className="bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 overflow-hidden border border-slate-200 group flex flex-col h-fit relative cursor-pointer"
        >
            <div className="relative h-56 w-full overflow-hidden shrink-0 bg-slate-100">
                <img
                    src={images[currentImageIndex]}
                    alt={item.title || 'Item Image'}
                    className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${isResolved ? 'grayscale opacity-80' : ''}`}
                />

                {images.length > 1 && (
                    <>
                        <button
                            onClick={handlePrevImage}
                            className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 focus:outline-none"
                        >
                            <svg className="w-5 h-5 pr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                        </button>
                        <button
                            onClick={handleNextImage}
                            className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20 focus:outline-none"
                        >
                            <svg className="w-5 h-5 pl-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                        </button>

                        <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-20">
                            {images.map((_, idx) => (
                                <div key={idx} className={`h-1.5 rounded-full transition-all duration-300 shadow-sm ${currentImageIndex === idx ? 'w-3 bg-white' : 'w-1.5 bg-white/60'}`} />
                            ))}
                        </div>
                    </>
                )}

                <div className="absolute top-4 left-4 flex flex-col gap-2 z-30">
                    <span className={`px-3 py-1 text-[11px] font-extrabold text-white rounded-md shadow-sm backdrop-blur-md flex items-center gap-1.5 uppercase tracking-wide ${
                        isLost ? 'bg-[#ef4444]' : 'bg-[#3b82f6]'
                    }`}>
                        {isLost ? (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                        ) : (
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                        )}
                        {isLost ? 'LOST' : 'FOUND'}
                    </span>

                    {isOwnPost && !isResolved && (
                        <span className="px-3 py-1 text-[11px] font-extrabold text-[#4f46e5] bg-[#e0e7ff] rounded-md shadow-sm backdrop-blur-md uppercase tracking-wide">
                            YOUR POST
                        </span>
                    )}
                </div>

                {isResolved && (
                    <div className="absolute inset-0 bg-emerald-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center text-white z-10">
                        <div className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center mb-2 shadow-lg shadow-emerald-900/50">
                            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                        </div>
                        <span className="text-lg font-extrabold tracking-tight">Resolved</span>
                        <span className="text-xs font-medium text-emerald-100 mt-1">Successfully Returned</span>
                    </div>
                )}
            </div>

            {/* FIX 2: Removed flex-1 to prevent the container from inflating */}
            <div className="p-5 flex flex-col">
                <div className="flex justify-between items-start mb-2 gap-2">
                    <h3 className="text-lg font-extrabold text-[#1e3a8a] leading-tight line-clamp-1">
                        {item.title}
                    </h3>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-100 border border-slate-200 px-2 py-1 rounded-md shrink-0 uppercase">
                        {item.category}
                    </span>
                </div>

                <p className="text-sm text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                    {item.description}
                </p>

                <div className="space-y-2 mb-5">
                    <div className="flex items-start text-[13px] font-medium text-slate-500">
                        <svg className="w-4 h-4 mr-2 text-slate-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                        <span className="truncate">{item.location?.addressText || item.addressText || 'Location not specified'}</span>
                    </div>
                    <div className="flex items-center text-[13px] font-medium text-slate-500">
                        <svg className="w-4 h-4 mr-2 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span>{formatDateTime(item.dateLostOrFound)}</span>
                    </div>
                </div>

                {/* FIX 3: Removed mt-auto so the button sits naturally under the date without creating a gap */}
                <div className="pt-4 border-t border-slate-100">
                    {isResolved ? (
                        isOwnPost ? (
                            <button
                                onClick={(e) => { e.stopPropagation(); onOpenInbox(); }}
                                className="w-full py-2.5 rounded-xl text-sm font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors flex items-center justify-center gap-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"></path></svg>
                                View Chat
                            </button>
                        ) : (
                            <button disabled className="w-full py-2.5 rounded-xl text-sm font-bold bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed">
                                Case Closed
                            </button>
                        )
                    ) : isOwnPost ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenInbox(); }}
                            className="w-full py-2.5 rounded-xl text-sm font-bold bg-[#f1f5f9] text-[#475569] hover:bg-slate-200 border border-slate-200 transition-colors"
                        >
                            Manage in Secure Inbox
                        </button>
                    ) : item.hasAlreadyClaimed ? (
                        <button
                            onClick={(e) => { e.stopPropagation(); onOpenInbox(); }}
                            className="w-full py-2.5 rounded-xl text-sm font-bold text-white bg-[#10b981] hover:bg-[#059669] shadow-md shadow-emerald-500/25 transition-all flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                            Connection Established
                        </button>
                    ) : (
                        <button
                            onClick={(e) => { e.stopPropagation(); onClaimClick(item); }}
                            className={`w-full py-2.5 rounded-xl text-sm font-bold text-white shadow-sm transition-all flex items-center justify-center gap-2 ${
                                isLost ? 'bg-[#ef4444] hover:bg-[#dc2626]' : 'bg-[#3b82f6] hover:bg-[#2563eb]'
                            }`}
                        >
                            {isLost ? 'I Found This' : 'Claim Item'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};