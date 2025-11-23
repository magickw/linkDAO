/**
 * Button Component
 * Provides button components with different variants and sizes
 * 
 * Updated to use standardized size types while maintaining backward compatibility
 * with 'default' and 'icon' sizes
 */

import React from 'react';
import { ButtonSize, normalizeButtonSize } from '../design-system/types/button';

type ExtendedButtonSize = ButtonSize | 'default' | 'icon';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: ExtendedButtonSize;
  className?: string;
  children: React.ReactNode;
}

const Button: React.FC<ButtonProps> = ({
  variant = 'default',
  size = 'default',
  className = '',
  children,
  ...props
}) => {
  // Normalize size to standard format, mapping 'default' to 'md'
  const normalizedSize = size === 'default' ? 'md' : size === 'icon' ? 'icon' : normalizeButtonSize(size);

  const getVariantStyles = () => {
    switch (variant) {
      case 'destructive':
        return 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
      case 'outline':
        return 'border border-input bg-background hover:bg-accent hover:text-accent-foreground';
      case 'secondary':
        return 'bg-secondary text-secondary-foreground hover:bg-secondary/80';
      case 'ghost':
        return 'hover:bg-accent hover:text-accent-foreground';
      case 'link':
        return 'text-primary underline-offset-4 hover:underline';
      default:
        return 'bg-primary text-primary-foreground hover:bg-primary/90';
    }
  };

  const getSizeStyles = () => {
    switch (normalizedSize) {
      case 'sm':
        return 'h-9 rounded-md px-3 text-xs';
      case 'lg':
        return 'h-11 rounded-md px-8';
      case 'icon':
        return 'h-10 w-10';
      case 'md':
      default:
        return 'h-10 px-4 py-2';
    }
  };

  return (
    <button
      className={`inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 ${getVariantStyles()} ${getSizeStyles()} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export { Button };