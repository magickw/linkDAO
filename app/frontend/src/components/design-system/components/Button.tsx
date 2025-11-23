/**
 * Simple Button Component
 * Basic button implementation for messaging components
 * 
 * Updated to use standardized size types: 'sm' | 'md' | 'lg'
 * Maintains backward compatibility with legacy sizes during migration period
 */

import React from 'react';
import { ButtonSize, LegacyButtonSize, normalizeButtonSize, isLegacySize } from '../types/button';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'ghost';
  size?: ButtonSize | LegacyButtonSize;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  ...props
}) => {
  // Normalize size to standard format
  const normalizedSize = normalizeButtonSize(size);

  // Log deprecation warning for legacy sizes in development
  if (process.env.NODE_ENV === 'development' && isLegacySize(size)) {
    console.warn(
      `[Button] Legacy size "${size}" is deprecated. Please use "${normalizedSize}" instead.`
    );
  }

  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';

  const variantClasses = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    outline: 'border border-gray-600 text-gray-300 hover:bg-gray-700',
    ghost: 'text-gray-300 hover:bg-gray-700'
  };

  const sizeClasses: Record<ButtonSize, string> = {
    sm: 'px-3 py-1.5 text-sm rounded-md',
    md: 'px-4 py-2 text-sm rounded-md',
    lg: 'px-6 py-3 text-base rounded-lg'
  };

  const classes = `${baseClasses} ${variantClasses[variant]} ${sizeClasses[normalizedSize]} ${className}`;

  return (
    <button className={classes} {...props}>
      {children}
    </button>
  );
};