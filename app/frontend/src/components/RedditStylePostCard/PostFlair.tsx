import React from 'react';
import { motion } from 'framer-motion';

export interface FlairConfig {
  id: string;
  name: string;
  color: string;
  backgroundColor: string;
  textColor: string;
  description?: string;
  moderatorOnly: boolean;
}

interface PostFlairProps {
  flair: FlairConfig | string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  variant?: 'filled' | 'outlined' | 'subtle';
  clickable?: boolean;
  onClick?: (flair: FlairConfig | string) => void;
}

export default function PostFlair({
  flair,
  className = '',
  size = 'sm',
  variant = 'filled',
  clickable = false,
  onClick
}: PostFlairProps) {
  // Handle both string and FlairConfig types
  const flairData = typeof flair === 'string' 
    ? {
        id: flair,
        name: flair,
        color: '#3b82f6',
        backgroundColor: '#dbeafe',
        textColor: '#1e40af',
        moderatorOnly: false
      }
    : flair;

  // Size classes
  const sizeClasses = {
    xs: 'text-xs px-1.5 py-0.5',
    sm: 'text-xs px-2 py-0.5',
    md: 'text-sm px-2.5 py-1',
    lg: 'text-base px-3 py-1.5'
  };

  // Get variant styles
  const getVariantStyles = () => {
    switch (variant) {
      case 'filled':
        return {
          backgroundColor: flairData.backgroundColor,
          color: flairData.textColor,
          border: `1px solid ${flairData.color}`
        };
      case 'outlined':
        return {
          backgroundColor: 'transparent',
          color: flairData.color,
          border: `1px solid ${flairData.color}`
        };
      case 'subtle':
        return {
          backgroundColor: `${flairData.backgroundColor}20`, // 20% opacity
          color: flairData.textColor,
          border: 'none'
        };
      default:
        return {
          backgroundColor: flairData.backgroundColor,
          color: flairData.textColor,
          border: `1px solid ${flairData.color}`
        };
    }
  };

  const handleClick = () => {
    if (clickable && onClick) {
      onClick(flair);
    }
  };

  const baseClasses = `
    inline-flex items-center font-medium rounded-full
    transition-all duration-200
    ${sizeClasses[size]}
    ${clickable ? 'cursor-pointer hover:scale-105 hover:shadow-sm' : ''}
    ${className}
  `.trim();

  const Component = clickable ? motion.button : motion.span;

  return (
    <Component
      className={baseClasses}
      style={getVariantStyles()}
      onClick={handleClick}
      whileHover={clickable ? { scale: 1.05 } : undefined}
      whileTap={clickable ? { scale: 0.95 } : undefined}
      title={flairData.description || flairData.name}
      aria-label={`Flair: ${flairData.name}`}
    >
      {flairData.moderatorOnly && (
        <span className="mr-1" title="Moderator only flair">
          🛡️
        </span>
      )}
      {flairData.name}
    </Component>
  );
}