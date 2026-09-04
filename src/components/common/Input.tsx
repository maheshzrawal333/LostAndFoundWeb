import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label: string;
    error?: string;
}

export const Input: React.FC<InputProps> = ({ label, error, className = '', ...props }) => {
    return (
        <label className={`form-label ${className}`} style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', fontWeight: 600, fontSize: '0.875rem' }}>
            {label}
            <input
                className="form-input"
                style={{ padding: '0.5rem', border: '1px solid var(--border)', borderRadius: '4px', fontFamily: 'inherit' }}
                {...props}
            />
            {error && <span style={{ color: 'var(--lost-color)', fontSize: '0.75rem', fontWeight: 'normal' }}>{error}</span>}
        </label>
    );
};