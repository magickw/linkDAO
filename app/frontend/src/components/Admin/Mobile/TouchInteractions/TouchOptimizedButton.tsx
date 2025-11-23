import React, { useState, useRef, useCallback } from 'react';
import { ButtonSize, normalizeButtonSize } from '../../../design-system/types/button';

interface TouchOptimizedButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: ButtonSize;
  className?: string;
  longPressDelay?: number;
  hapticFeedback?: boolean;
}

export const TouchOptimizedButton: React.FC<TouchOptimizedButtonProps> = ({
  children,
  onClick,
  onLongPress,
  disabled = false,
  variant = 'primary',
  size = 'md',
  className = '',
  longPressDelay = 500,
  hapticFeedback = true
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const [isLongPressed, setIsLongPressed] = useState(false);
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartTimeRef = useRef<number>(0);

  const triggerHapticFeedback = useCallback(() => {
    if (hapticFeedback && 'vibrate' in navigator) {
      navigator.vibrate(10); // Short vibration
    }
  }, [hapticFeedback]);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    setIsPressed(true);
    touchStartTimeRef.current = Date.now();

    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        setIsLongPressed(true);
        triggerHapticFeedback();
        onLongPress();
      }, longPressDelay);
    }
  }, [disabled, onLongPress, longPressDelay, triggerHapticFeedback]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    e.preventDefault();
    setIsPressed(false);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Only trigger click if it wasn't a long press and was quick enough
    const touchDuration = Date.now() - touchStartTimeRef.current;
    if (!isLongPressed && touchDuration < longPressDelay && onClick) {
      triggerHapticFeedback();
      onClick();
    }

    setIsLongPressed(false);
  }, [disabled, isLongPressed, longPressDelay, onClick, triggerHapticFeedback]);

  const handleTouchCancel = useCallback(() => {
    setIsPressed(false);
    setIsLongPressed(false);

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  // Fallback for mouse events
  const handleMouseDown = useCallback(() => {
    if (disabled) return;
    setIsPressed(true);
  }, [disabled]);

  const handleMouseUp = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handleClick = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    e.preventDefault();
    if (onClick) {
      onClick();
    }
  }, [disabled, onClick]);

  // Get button styles based on variant and size
  const getButtonStyles = () => {
    const baseStyles = 'relative inline-flex items-center justify-center font-medium rounded-lg transition-all duration-150 select-none';

    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-[36px]',
      md: 'px-4 py-3 text-base min-h-[44px]', // 44px is Apple's recommended minimum touch target
      lg: 'px-6 py-4 text-lg min-h-[52px]'
    };

    const variantStyles = {
      primary: 'bg-purple-600 text-white hover:bg-purple-700 active:bg-purple-800',
      secondary: 'bg-white/10 text-white border border-white/20 hover:bg-white/20 active:bg-white/30',
      danger: 'bg-red-600 text-white hover:bg-red-700 active:bg-red-800',
      ghost: 'text-white hover:bg-white/10 active:bg-white/20'
    };

    const pressedStyles = isPressed ? 'scale-95 shadow-inner' : 'scale-100';
    const disabledStyles = disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    return `${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${pressedStyles} ${disabledStyles} ${className}`;
  };

  return (
    <button
      className={getButtonStyles()}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchCancel}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      disabled={disabled}
      style={{
        WebkitTapHighlightColor: 'transparent', // Remove iOS tap highlight
        touchAction: 'manipulation' // Prevent double-tap zoom
      }}
    >
      {/* Ripple effect overlay */}
      {isPressed && (
        <div className="absolute inset-0 bg-white/20 rounded-lg animate-pulse" />
      )}

      {/* Long press indicator */}
      {isLongPressed && (
        <div className="absolute inset-0 bg-white/10 rounded-lg animate-ping" />
      )}

      {children}
    </button>
  );
};