import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
    onReportClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReportClick }) => {
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md">
            <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-accent rounded-lg flex items-center justify-center">
                        <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                    </div>
                    <span className="text-xl font-bold tracking-tight text-slate-900">Lost And Found Nepal</span>
                </div>

                <div className="flex items-center gap-4">
                    {isAuthenticated ? (
                        <>
              <span className="text-sm font-medium text-slate-600 hidden sm:block">
                {user?.email}
              </span>
                            <button
                                onClick={logout}
                                className="text-sm font-medium text-slate-500 hover:text-slate-900 transition-colors px-3 py-2"
                            >
                                Log out
                            </button>
                            <button
                                onClick={onReportClick}
                                className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm"
                            >
                                + Report Item
                            </button>
                        </>
                    ) : (
                        <button className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 transition-colors shadow-sm">
                            Sign In
                        </button>
                    )}
                </div>
            </div>
        </header>
    );
};