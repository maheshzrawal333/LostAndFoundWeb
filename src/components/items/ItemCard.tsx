import React, { useState } from 'react';
import { Item } from '../../types/item.types';

interface ItemCardProps {
    item: Item;
    onClaimClick: (item: Item) => void;
}

export const ItemCard: React.FC<ItemCardProps> = ({ item, onClaimClick }) => {
    const [currentImageIndex, setCurrentImageIndex] = useState(0);
    const isLost = item.type === 'LOST';

    const images = item.imageUrls || [];
    const hasImages = images.length > 0;
    const hasMultipleImages = images.length > 1;
    const currentImage = hasImages ? images[currentImageIndex] : null;

    // Format the ID for display: Handles UUIDs from backend or short dummy IDs
    const displayId = item.id.includes('-')
        ? item.id.split('-')[0].toUpperCase()
        : `TRK-00${item.id}`;

    const nextImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    };

    const prevImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
    };

    return (
        <article className="group flex flex-col bg-white border-2 border-brand-lightest hover:border-brand-light rounded-2xl overflow-hidden hover:shadow-xl hover:shadow-brand-lightest/50 transition-all duration-300">

            {/* Image Header */}
            <div className="h-52 w-full bg-slate-50 flex items-center justify-center overflow-hidden relative">
                <div className="absolute top-4 left-4 flex gap-2 z-30">
          <span className={`px-3 py-1.5 backdrop-blur-md text-xs font-bold tracking-wide rounded-md shadow-sm ${
              isLost
                  ? 'bg-white/90 text-red-600 border border-red-100'
                  : 'bg-brand-dark/90 text-white border border-brand-dark'
          }`}>
            {item.type}
          </span>
                </div>

                {currentImage ? (
                    <>
                        <img
                            src={currentImage}
                            alt={`${item.title} - photo ${currentImageIndex + 1}`}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        />

                        {hasMultipleImages && (
                            <div className="absolute inset-0 flex items-center justify-between px-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20">
                                <button
                                    onClick={prevImage}
                                    className="bg-white/80 hover:bg-white text-brand-dark rounded-full p-1.5 shadow-md backdrop-blur-sm transition-all focus:outline-none"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 19l-7-7 7-7"></path></svg>
                                </button>
                                <button
                                    onClick={nextImage}
                                    className="bg-white/80 hover:bg-white text-brand-dark rounded-full p-1.5 shadow-md backdrop-blur-sm transition-all focus:outline-none"
                                >
                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5l7 7-7 7"></path></svg>
                                </button>
                            </div>
                        )}

                        {hasMultipleImages && (
                            <div className="absolute bottom-3 right-3 bg-brand-dark/80 text-white text-[10px] font-bold px-2 py-1 rounded-md backdrop-blur-md shadow-sm border border-brand-dark/50 z-10 group-hover:opacity-0 transition-opacity duration-300">
                                {currentImageIndex + 1} / {images.length}
                            </div>
                        )}

                        {hasMultipleImages && (
                            <div className="absolute bottom-3 left-0 right-0 flex justify-center gap-1.5 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                                {images.map((_, idx) => (
                                    <div
                                        key={idx}
                                        className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${
                                            idx === currentImageIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'
                                        }`}
                                    />
                                ))}
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center text-brand-light">
                        <svg className="w-10 h-10 mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg>
                        <span className="text-xs font-semibold uppercase tracking-widest opacity-60">No Photo</span>
                    </div>
                )}
            </div>

            {/* Card Body */}
            <div className="p-6 flex flex-col flex-1 relative z-30 bg-white">
                <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col gap-1">
                        <h3 className="text-lg font-bold text-brand-dark leading-tight group-hover:text-brand-primary transition-colors">
                            {item.title}
                        </h3>
                        {/* Added Tracking ID */}
                        <span className="text-[10px] font-bold text-slate-400 font-mono tracking-wider flex items-center gap-1">
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"></path></svg>
              REF: {displayId}
            </span>
                    </div>
                    <span className="text-[10px] font-bold text-brand-primary bg-brand-lightest px-2 py-1 rounded uppercase tracking-wider mt-0.5">
            {item.category}
          </span>
                </div>

                <p className="text-slate-500 text-sm line-clamp-2 leading-relaxed mb-6 font-medium">
                    {item.description}
                </p>

                {/* Footer Actions */}
                <div className="mt-auto">
                    <div className="flex flex-col gap-1 mb-5 border-l-2 border-brand-lightest pl-3">
                        <span className="text-brand-dark text-xs font-bold truncate">📍 {item.location.addressText}</span>
                        <span className="text-slate-400 text-xs font-semibold">
              📅 {new Date(item.dateLostOrFound).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
                    </div>

                    <button
                        onClick={() => onClaimClick(item)}
                        className="w-full py-3 bg-white border-2 border-brand-lightest text-brand-dark font-bold text-sm rounded-xl hover:bg-brand-primary hover:border-brand-primary hover:text-white transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-brand-lightest"
                    >
                        {isLost ? 'I Found This' : 'Claim Item'}
                    </button>
                </div>
            </div>
        </article>
    );
};