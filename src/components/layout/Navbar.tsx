import React from 'react';
import { useAuth } from '../../context/AuthContext';

interface NavbarProps {
    onReportClick: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onReportClick }) => {
    const { isAuthenticated, user, logout } = useAuth();

    return (
        <header className="navbar">
            <div className="nav-brand">FindIt System</div>
            <div className="nav-actions" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                {isAuthenticated ? (
                    <>
            <span style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>
              Hello, {user?.email}
            </span>
                        <button className="btn-secondary" onClick={logout}>Logout</button>
                        <button className="btn-primary" onClick={onReportClick}>+ Report Item</button>
                    </>
                ) : (
                    <button className="btn-primary" onClick={() => alert('Mock Login trigger')}>Login</button>
                )}
            </div>
        </header>
    );
};