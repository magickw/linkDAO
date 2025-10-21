/**
 * Badge Component
 * Provides badge/tag components with different variants
 */

import React from 'react';

interface BadgeProps {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline';
  className?: string;
  children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({ 
  variant = 'default', 
  className = '', 
  children 
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'secondary':
        return 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80';
      case 'destructive':
        return 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80';
      case 'outline':
        return 'text-foreground';
      default:
        return 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80';
    }
  };

  return (
    <div className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${getVariantStyles()} ${className}`}>
      {children}
    </div>
  );
};

export { Badge };