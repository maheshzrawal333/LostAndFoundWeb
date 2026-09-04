import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
                                                  children,
                                                  variant = 'primary',
                                                  isLoading,
                                                  className = '',
                                                  disabled,
                                                  ...props
                                              }) => {
    const baseClass = variant === 'primary' ? 'btn-primary' :
        variant === 'secondary' ? 'btn-secondary' :
            'btn-danger';

    return (
        <button
            className={`${baseClass} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? 'Processing...' : children}
        </button>
    );
};