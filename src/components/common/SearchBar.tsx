import React from 'react';

interface SearchBarProps {
    searchQuery: string;
    setSearchQuery: (val: string) => void;
    locationQuery: string;
    setLocationQuery: (val: string) => void;
    onSearch: () => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({
                                                        searchQuery,
                                                        setSearchQuery,
                                                        locationQuery,
                                                        setLocationQuery,
                                                        onSearch
                                                    }) => {

    // Allows users to trigger search by pressing 'Enter' on their keyboard
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSearch();
        }
    };

    return (
        <div className="bg-white p-2 rounded-2xl md:rounded-full shadow-lg shadow-slate-200/50 border border-slate-200 flex flex-col md:flex-row items-center gap-2 md:gap-0 w-full max-w-4xl animate-in slide-in-from-top-4 duration-300">

            {/* Search Input Area */}
            <div className="flex-1 flex items-center px-4 py-2 w-full group relative">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#3b82f6] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                <div className="ml-3 w-full text-left pr-8">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">What are you looking for?</label>
                    <input
                        type="text"
                        placeholder="e.g. Wallet, Sony, Keys..."
                        className="w-full bg-transparent border-none focus:outline-none text-[#0f172a] font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base truncate"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {/* Enterprise Feature: Dynamic Clear Button */}
                {searchQuery && (
                    <button onClick={() => { setSearchQuery(''); onSearch(); }} className="absolute right-4 text-slate-300 hover:text-slate-500 focus:outline-none bg-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                )}
            </div>

            <div className="hidden md:block w-px h-12 bg-slate-200 shrink-0 mx-2"></div>

            {/* Location Input Area */}
            <div className="flex-1 flex items-center px-4 py-2 w-full group relative border-t border-slate-100 md:border-none">
                <svg className="w-5 h-5 text-slate-400 group-focus-within:text-[#3b82f6] transition-colors shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <div className="ml-3 w-full text-left pr-8">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Where?</label>
                    <input
                        type="text"
                        placeholder="e.g. Kathmandu, Bus Park..."
                        className="w-full bg-transparent border-none focus:outline-none text-[#0f172a] font-semibold placeholder:text-slate-300 placeholder:font-medium text-sm sm:text-base truncate"
                        value={locationQuery}
                        onChange={(e) => setLocationQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                </div>
                {/* Enterprise Feature: Dynamic Clear Button */}
                {locationQuery && (
                    <button onClick={() => { setLocationQuery(''); onSearch(); }} className="absolute right-4 text-slate-300 hover:text-slate-500 focus:outline-none bg-white">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                )}
            </div>

            {/* Action Button */}
            <button
                onClick={onSearch}
                className="w-full md:w-auto bg-[#3b82f6] text-white px-8 py-3.5 sm:py-4 rounded-xl md:rounded-full font-bold hover:bg-[#2563eb] transition-colors shadow-md shadow-[#3b82f6]/30 mt-2 md:mt-0 flex items-center justify-center shrink-0 focus:outline-none"
            >
                <span className="md:hidden mr-2">Search Items</span>
                <svg className="w-5 h-5 hidden md:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
            </button>
        </div>
    );
};