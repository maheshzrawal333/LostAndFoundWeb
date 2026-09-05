import React, { useState } from 'react';
import { Item } from '../../types/item.types';

interface ItemCardProps {
    item: Item;
    onClaimClick: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick }) => {
    const safeImageUrls = item.imageUrls || [];
    const hasImages = safeImageUrls.length > 0;

    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const [isDetailsOpen, setIsDetailsOpen] = useState(false);
    const [modalImageIndex, setModalImageIndex] = useState(0);

    const isLost = item.type === 'LOST';
    const actionText = isLost ? 'I Found This' : 'Claim Item';
    const formattedDate = new Date(item.dateLostOrFound).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev + 1) % safeImageUrls.length);
        }
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (hasImages) {
            setCurrentImageIndex((prev) => (prev - 1 + safeImageUrls.length) % safeImageUrls.length);
        }
    };

    const nextModalImage = () => {
        if (hasImages) {
            setModalImageIndex((prev) => (prev + 1) % safeImageUrls.length);
        }
    };

    const prevModalImage = () => {
        if (hasImages) {
            setModalImageIndex((prev) => (prev - 1 + safeImageUrls.length) % safeImageUrls.length);
        }
    };

    const handleOpenDetails = () => {
        setModalImageIndex(currentImageIndex);
        setIsDetailsOpen(true);
    };

    const handleActionClick = (e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setIsDetailsOpen(false);
        onClaimClick(item);
    };

    const renderImageOrPlaceholder = (index: number, imgClass: string) => {
        if (hasImages && safeImageUrls[index]) {
            return <img src={safeImageUrls[index]} alt={item.title} className={imgClass} />;
        }
        return (
            <div className={`flex flex-col items-center justify-center bg-slate-100 text-slate-400 w-full h-full ${imgClass.includes('object-cover') ? '' : 'p-4'}`}>
                <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                <span className="text-xs font-bold uppercase tracking-wider">No Image</span>
            </div>
        );
    };

    return (
        <>
            {/* ========================================= */}
            {/*               THE MAIN CARD               */}
            {/* ========================================= */}
            <div className="flex flex-col bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 group h-full">

                {/* Photo Area (Clickable to open details) */}
                <div
                    className="relative h-48 sm:h-56 bg-slate-100 overflow-hidden cursor-pointer shrink-0"
                    onClick={handleOpenDetails}
                >
                    {renderImageOrPlaceholder(currentImageIndex, "w-full h-full object-cover transition-transform duration-500 group-hover:scale-105")}

                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 flex gap-2">
            <span className={`px-3 py-1 rounded-lg text-xs font-bold shadow-sm backdrop-blur-md ${
                isLost ? 'bg-red-500/90 text-white' : 'bg-brand-primary/90 text-white'
            }`}>
              {item.type}
            </span>
                    </div>

                    {/* Image Counter Badge */}
                    {safeImageUrls.length > 1 && (
                        <div className="absolute bottom-3 right-3 bg-slate-900/70 backdrop-blur-md text-white text-[10px] font-bold px-2.5 py-1 rounded-md pointer-events-none">
                            {currentImageIndex + 1} / {safeImageUrls.length}
                        </div>
                    )}

                    {/* Subtle Hover Darken (Removed the blocking Quick View text) */}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors pointer-events-none"></div>

                    {/* Mini-Carousel Navigation Arrows */}
                    {safeImageUrls.length > 1 && (
                        <>
                            <button
                                onClick={prevImage}
                                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white text-brand-dark rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md focus:outline-none"
                            >
                                <svg className="w-4 h-4 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                            </button>
                            <button
                                onClick={nextImage}
                                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 bg-white/80 hover:bg-white text-brand-dark rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-md focus:outline-none"
                            >
                                <svg className="w-4 h-4 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                            </button>
                        </>
                    )}
                </div>

                {/* Content Area */}
                <div className="p-5 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-1 gap-2">
                        <h3
                            onClick={handleOpenDetails}
                            className="text-lg font-bold text-brand-dark leading-tight line-clamp-1 cursor-pointer hover:text-brand-primary transition-colors"
                            title={item.title}
                        >
                            {item.title}
                        </h3>
                        <span className="text-[10px] font-bold text-brand-primary bg-brand-lightest px-2 py-1 rounded-md uppercase tracking-wider shrink-0">
              {item.category}
            </span>
                    </div>

                    <p className="text-[10px] font-medium text-slate-400 mb-3 uppercase tracking-wider flex items-center gap-1">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path></svg>
                        REF: {item.id.includes('-') ? item.id.split('-')[0] : `TRK-00${item.id}`}
                    </p>

                    <p className="text-sm text-slate-500 line-clamp-2 mb-5 leading-relaxed flex-1">
                        {item.description}
                    </p>

                    <div className="space-y-2 mt-auto pb-5 border-b border-slate-100 mb-5">
                        <div className="flex items-center gap-2 text-xs font-semibold text-brand-dark">
                            <svg className="w-4 h-4 text-red-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                            <span className="truncate">{item.location.addressText}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500">
                            <svg className="w-4 h-4 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                            {formattedDate}
                        </div>
                    </div>

                    <button
                        onClick={() => handleActionClick()}
                        className="w-full py-2.5 rounded-xl border-2 border-brand-lightest text-brand-dark font-bold text-sm hover:border-brand-primary hover:text-brand-primary hover:bg-brand-lightest/50 transition-all flex items-center justify-center gap-2"
                    >
                        {actionText}
                    </button>
                </div>
            </div>

            {/* ========================================= */}
            {/*        THE QUICK VIEW DETAILS MODAL       */}
            {/* ========================================= */}
            {isDetailsOpen && (
                <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-900/70 backdrop-blur-md p-4 sm:p-6 animate-in fade-in duration-200">
                    <div className="bg-white w-full max-w-5xl max-h-[90vh] rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden relative">

                        {/* Close Button */}
                        <button
                            onClick={() => setIsDetailsOpen(false)}
                            className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/10 hover:bg-black/20 text-brand-dark md:text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors focus:outline-none"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                        </button>

                        {/* Left Side: Large Image Gallery */}
                        <div className="w-full md:w-1/2 bg-slate-950 relative flex flex-col min-h-[300px] md:min-h-0 shrink-0">
                            <div className="flex-1 relative flex items-center justify-center overflow-hidden">
                                {renderImageOrPlaceholder(modalImageIndex, "w-full h-full object-contain p-2")}

                                {safeImageUrls.length > 1 && (
                                    <>
                                        <button onClick={prevModalImage} className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all focus:outline-none">
                                            <svg className="w-5 h-5 mr-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7"></path></svg>
                                        </button>
                                        <button onClick={nextModalImage} className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all focus:outline-none">
                                            <svg className="w-5 h-5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7"></path></svg>
                                        </button>
                                    </>
                                )}
                            </div>

                            {/* Modal Image Thumbnails */}
                            {safeImageUrls.length > 1 && (
                                <div className="h-20 bg-slate-900 border-t border-slate-800 flex items-center justify-center gap-2 px-4 shrink-0">
                                    {safeImageUrls.map((url, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => setModalImageIndex(idx)}
                                            className={`w-12 h-12 rounded-md overflow-hidden border-2 transition-all ${
                                                idx === modalImageIndex ? 'border-brand-primary opacity-100' : 'border-transparent opacity-50 hover:opacity-100'
                                            }`}
                                        >
                                            <img src={url} alt={`Thumbnail ${idx+1}`} className="w-full h-full object-cover" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Right Side: Full Uncropped Details */}
                        <div className="w-full md:w-1/2 flex flex-col bg-white">
                            <div className="p-6 sm:p-8 flex-1 overflow-y-auto custom-scrollbar">

                                <div className="flex gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold ${
                      isLost ? 'bg-red-100 text-red-700' : 'bg-brand-lightest text-brand-primary'
                  }`}>
                    {item.type}
                  </span>
                                    <span className="px-3 py-1 rounded-lg text-[10px] uppercase tracking-wider font-bold bg-slate-100 text-slate-600">
                    {item.category}
                  </span>
                                </div>

                                <h2 className="text-2xl sm:text-3xl font-extrabold text-brand-dark mb-2 leading-tight">
                                    {item.title}
                                </h2>

                                <p className="text-xs font-bold text-slate-400 mb-6 uppercase tracking-wider">
                                    Reference: {item.id.includes('-') ? item.id.split('-')[0] : `TRK-00${item.id}`}
                                </p>

                                {/* Metadata Grid */}
                                <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 mb-6 space-y-3">
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-red-500 shadow-sm shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Location</p>
                                            <p className="text-sm font-semibold text-brand-dark">{item.location.addressText}</p>
                                        </div>
                                    </div>
                                    <div className="h-px bg-slate-200 w-full"></div>
                                    <div className="flex items-start gap-3">
                                        <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center text-brand-primary shadow-sm shrink-0">
                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date {isLost ? 'Lost' : 'Found'}</p>
                                            <p className="text-sm font-semibold text-brand-dark">{formattedDate}</p>
                                        </div>
                                    </div>
                                </div>

                                {/* FULL Description */}
                                <div>
                                    <h4 className="text-sm font-bold text-brand-dark mb-2 border-b border-slate-100 pb-2">Full Description</h4>
                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                        {item.description}
                                    </p>
                                </div>
                            </div>

                            {/* Modal Footer / Action Area */}
                            <div className="p-6 border-t border-slate-100 bg-white shrink-0">
                                <button
                                    onClick={() => handleActionClick()}
                                    className="w-full py-4 rounded-xl text-sm font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/30 hover:bg-brand-dark transition-all flex items-center justify-center gap-2"
                                >
                                    {isLost ? (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7"></path></svg>
                                    ) : (
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                                    )}
                                    {actionText}
                                </button>
                            </div>
                        </div>

                    </div>
                </div>
            )}
        </>
    );
};