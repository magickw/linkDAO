import React, { useState, useRef, useEffect } from 'react';
import { useMobileOptimization } from '../../../../hooks/useMobileOptimization';
import { ButtonSize, LegacyButtonSize, normalizeButtonSize } from '../../../design-system/types/button';

export interface TouchOptimizedButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: ButtonSize | LegacyButtonSize;
  disabled?: boolean;
  loading?: boolean;
  className?: string;
  style?: React.CSSProperties;
  hapticFeedback?: boolean;
  rippleEffect?: boolean;
}

export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  className = '',
  style = {},
  hapticFeedback = true,
  rippleEffect = true,
}) => {
  const { touchSupported, getOptimalFontSize } = useMobileOptimization();
  const [isPressed, setIsPressed] = useState(false);
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const rippleIdRef = useRef(0);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsPressed(true);

    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Light haptic feedback
    }

    if (rippleEffect && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const touch = e.touches[0];
      const x = touch.clientX - rect.left;
      const y = touch.clientY - rect.top;

      const newRipple = {
        id: rippleIdRef.current++,
        x,
        y,
      };

      setRipples(prev => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
      }, 600);
    }
  };

  const handleTouchEnd = () => {
    setIsPressed(false);
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!disabled && !loading) {
      onClick();
    }
  };

  // Normalize size to standard format
  const normalizedSize = normalizeButtonSize(size);

  // Size configurations
  const sizeConfig: Record<ButtonSize, {
    minHeight: number;
    minWidth: number;
    padding: string;
    fontSize: number;
  }> = {
    sm: {
      minHeight: 36,
      minWidth: 36,
      padding: '8px 12px',
      fontSize: getOptimalFontSize(14),
    },
    md: {
      minHeight: 44, // iOS minimum touch target
      minWidth: 44,
      padding: '12px 16px',
      fontSize: getOptimalFontSize(16),
    },
    lg: {
      minHeight: 52,
      minWidth: 52,
      padding: '16px 20px',
      fontSize: getOptimalFontSize(18),
    },
  };

  // Variant styles
  const variantStyles = {
    primary: {
      background: disabled ? '#6c757d' : '#007bff',
      color: 'white',
      border: 'none',
    },
    secondary: {
      background: disabled ? '#e9ecef' : '#6c757d',
      color: disabled ? '#adb5bd' : 'white',
      border: 'none',
    },
    outline: {
      background: 'transparent',
      color: disabled ? '#6c757d' : '#007bff',
      border: `2px solid ${disabled ? '#6c757d' : '#007bff'}`,
    },
    ghost: {
      background: 'transparent',
      color: disabled ? '#6c757d' : '#007bff',
      border: 'none',
    },
  };

  const currentSizeConfig = sizeConfig[normalizedSize];
  const currentVariantStyle = variantStyles[variant];

  const buttonStyle: React.CSSProperties = {
    ...currentSizeConfig,
    ...currentVariantStyle,
    position: 'relative',
    overflow: 'hidden',
    borderRadius: '8px',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'all 0.2s ease',
    transform: isPressed && touchSupported ? 'scale(0.95)' : 'scale(1)',
    opacity: disabled ? 0.6 : 1,
    fontWeight: 500,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    userSelect: 'none',
    WebkitTapHighlightColor: 'transparent',
    ...style,
  };

  return (
    <button
      ref={buttonRef}
      className={`touch-optimized-button ${className}`}
      style={buttonStyle}
      onClick={handleClick}
      onTouchStart={touchSupported ? handleTouchStart : undefined}
      onTouchEnd={touchSupported ? handleTouchEnd : undefined}
      onMouseDown={!touchSupported ? () => setIsPressed(true) : undefined}
      onMouseUp={!touchSupported ? () => setIsPressed(false) : undefined}
      onMouseLeave={!touchSupported ? () => setIsPressed(false) : undefined}
      disabled={disabled || loading}
      type="button"
    >
      {/* Loading spinner */}
      {loading && (
        <div className="loading-spinner">
          <div className="spinner"></div>
        </div>
      )}

      {/* Button content */}
      <span className={`button-content ${loading ? 'loading' : ''}`}>
        {children}
      </span>

      {/* Ripple effects */}
      {rippleEffect && ripples.map((ripple) => (
        <span
          key={ripple.id}
          className="ripple"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        />
      ))}

      <style jsx>{`
        .loading-spinner {
          position: absolute;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .spinner {
          width: 16px;
          height: 16px;
          border: 2px solid transparent;
          border-top: 2px solid currentColor;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        .button-content {
          transition: opacity 0.2s ease;
        }

        .button-content.loading {
          opacity: 0;
        }

        .ripple {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.3);
          transform: translate(-50%, -50%);
          pointer-events: none;
          animation: ripple-animation 0.6s ease-out;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes ripple-animation {
          0% {
            width: 0;
            height: 0;
            opacity: 1;
          }
          100% {
            width: 100px;
            height: 100px;
            opacity: 0;
          }
        }

        /* Hover effects for non-touch devices */
        @media (hover: hover) {
          .touch-optimized-button:hover:not(:disabled) {
            transform: translateY(-1px);
            box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
          }
        }

        /* Focus styles for accessibility */
        .touch-optimized-button:focus {
          outline: 2px solid #007bff;
          outline-offset: 2px;
        }

        .touch-optimized-button:focus:not(:focus-visible) {
          outline: none;
        }

        /* Active state for better feedback */
        .touch-optimized-button:active:not(:disabled) {
          transform: scale(0.95);
        }
      `}</style>
    </button>
  );
};

export default TouchOptimizedButton;