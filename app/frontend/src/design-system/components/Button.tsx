/**
 * Button Component - Glassmorphic buttons with ripple effects
 * Provides consistent button styling with Web3 aesthetics
 */

import React, { useState, useRef } from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { designTokens, GradientVariant } from '../tokens';

interface ButtonProps extends Omit<HTMLMotionProps<'button'>, 'size' | 'whileHover' | 'whileTap' | 'variants'> {
  /** Button variant */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'gradient';
  /** Button size */
  size?: 'sm' | 'md' | 'lg';
  /** Gradient variant for gradient buttons */
  gradient?: GradientVariant;
  /** Enable ripple effect */
  ripple?: boolean;
  /** Loading state */
  loading?: boolean;
  /** Icon to display */
  icon?: React.ReactNode;
  /** Icon position */
  iconPosition?: 'left' | 'right';
  /** Full width button */
  fullWidth?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Children components */
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  gradient = 'primary',
  ripple = true,
  loading = false,
  icon,
  iconPosition = 'left',
  fullWidth = false,
  className = '',
  children,
  onClick,
  disabled,
  ...motionProps
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    if (ripple && !disabled && !loading) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) {
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const newRipple = { id: Date.now(), x, y };

        setRipples(prev => [...prev, newRipple]);

        // Remove ripple after animation
        setTimeout(() => {
          setRipples(prev => prev.filter(r => r.id !== newRipple.id));
        }, 600);
      }
    }

    if (onClick && !disabled && !loading) {
      onClick(event);
    }
  };

  // Size configurations
  const sizeConfig = {
    sm: {
      padding: `${designTokens?.spacing?.sm || '0.5rem'} ${designTokens?.spacing?.md || '1rem'}`,
      fontSize: designTokens?.typography?.fontSize?.sm || '0.875rem',
      borderRadius: '8px',
      minHeight: '32px',
    },
    md: {
      padding: `${designTokens?.spacing?.md || '1rem'} ${designTokens?.spacing?.lg || '1.5rem'}`,
      fontSize: designTokens?.typography?.fontSize?.base || '1rem',
      borderRadius: '12px',
      minHeight: '40px',
    },
    lg: {
      padding: `${designTokens?.spacing?.lg || '1.5rem'} ${designTokens?.spacing?.xl || '2rem'}`,
      fontSize: designTokens?.typography?.fontSize?.lg || '1.125rem',
      borderRadius: '16px',
      minHeight: '48px',
    },
  };

  // Variant styles
  const getVariantStyle = () => {
    const baseStyle = {
      position: 'relative' as const,
      overflow: 'hidden' as const,
      border: 'none',
      cursor: disabled || loading ? 'not-allowed' : 'pointer',
      fontWeight: designTokens?.typography?.fontWeight?.medium || '500',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: designTokens?.spacing?.sm || '0.5rem',
      width: fullWidth ? '100%' : 'auto',
      opacity: disabled || loading ? 0.6 : 1,
      ...sizeConfig[size],
    };

    switch (variant) {
      case 'primary':
        return {
          ...baseStyle,
          ...(designTokens?.glassmorphism?.primary || {}),
          color: '#ffffff',
          backgroundImage: designTokens?.gradients?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        };

      case 'secondary':
        return {
          ...baseStyle,
          ...(designTokens?.glassmorphism?.secondary || {}),
          color: '#ffffff',
          backgroundImage: designTokens?.gradients?.secondary || 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        };

      case 'outline':
        return {
          ...baseStyle,
          background: 'transparent',
          border: `2px solid ${designTokens?.colors?.primary?.[500] || '#667eea'}`,
          color: designTokens?.colors?.primary?.[500] || '#667eea',
          backdropFilter: 'blur(8px)',
        };

      case 'ghost':
        return {
          ...baseStyle,
          background: 'rgba(255, 255, 255, 0.05)',
          color: '#ffffff',
          backdropFilter: 'blur(4px)',
        };

      case 'gradient':
        return {
          ...baseStyle,
          background: 'transparent',
          backgroundImage: designTokens?.gradients?.[gradient] || designTokens?.gradients?.primary || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: '#ffffff',
          border: 'none',
        };

      default:
        return baseStyle;
    }
  };

  const buttonVariants = {
    hover: {
      scale: 1.02,
      transition: { duration: 0.2, ease: 'easeInOut' },
    },
    tap: {
      scale: 0.98,
      transition: { duration: 0.1, ease: 'easeInOut' },
    },
  };

  // Filter out conflicting motion properties - don't override internal motion handling
  const filteredMotionProps = motionProps as any;

  return (
    <motion.button
      ref={buttonRef}
      style={getVariantStyle()}
      className={`glass-button ${className}`}
      variants={buttonVariants}
      whileHover={!disabled && !loading ? 'hover' : undefined}
      whileTap={!disabled && !loading ? 'tap' : undefined}
      onClick={handleClick}
      disabled={disabled || loading}
      {...filteredMotionProps}
    >
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <motion.span
          key={ripple.id}
          className="ripple-effect"
          style={{
            position: 'absolute',
            left: ripple.x,
            top: ripple.y,
            width: '4px',
            height: '4px',
            borderRadius: '50%',
            backgroundColor: 'rgba(255, 255, 255, 0.6)',
            pointerEvents: 'none',
            transform: 'translate(-50%, -50%)',
          }}
          initial={{ scale: 0, opacity: 1 }}
          animate={{ scale: 20, opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        />
      ))}

      {/* Button content */}
      {loading && (
        <motion.div
          className="loading-spinner"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          style={{
            width: '16px',
            height: '16px',
            border: '2px solid rgba(255, 255, 255, 0.3)',
            borderTop: '2px solid #ffffff',
            borderRadius: '50%',
          }}
        />
      )}

      {!loading && icon && iconPosition === 'left' && (
        <span className="button-icon">{icon}</span>
      )}

      {!loading && <span className="button-text">{children}</span>}

      {!loading && icon && iconPosition === 'right' && (
        <span className="button-icon">{icon}</span>
      )}
    </motion.button>
  );
};

// Specialized button variants
export const PrimaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="primary" {...props} />
);

export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="secondary" {...props} />
);

export const OutlineButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="outline" {...props} />
);

export const GhostButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="ghost" {...props} />
);

export const GradientButton: React.FC<Omit<ButtonProps, 'variant'>> = (props) => (
  <Button variant="gradient" {...props} />
);