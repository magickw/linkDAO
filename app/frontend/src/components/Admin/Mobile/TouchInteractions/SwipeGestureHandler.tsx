import React, { useRef, useState, useCallback, useEffect } from 'react';

interface SwipeGestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;
  className?: string;
  disabled?: boolean;
}

interface TouchPosition {
  x: number;
  y: number;
  time: number;
}

export const SwipeGestureHandler: React.FC<SwipeGestureHandlerProps> = ({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  className = '',
  disabled = false
}) => {
  const touchStartRef = useRef<TouchPosition | null>(null);
  const touchEndRef = useRef<TouchPosition | null>(null);
  const [isTracking, setIsTracking] = useState(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;
    
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
    setIsTracking(true);
  }, [disabled]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current) return;
    
    const touch = e.touches[0];
    touchEndRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now()
    };
  }, [disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled || !touchStartRef.current || !touchEndRef.current) {
      setIsTracking(false);
      return;
    }

    const startPos = touchStartRef.current;
    const endPos = touchEndRef.current;
    
    const deltaX = endPos.x - startPos.x;
    const deltaY = endPos.y - startPos.y;
    const deltaTime = endPos.time - startPos.time;
    
    // Calculate velocity (pixels per millisecond)
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;
    
    // Only process swipes that are fast enough and exceed threshold
    if (velocity > 0.3 && (Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold)) {
      // Determine primary direction
      if (Math.abs(deltaX) > Math.abs(deltaY)) {
        // Horizontal swipe
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }
    }

    // Reset tracking
    touchStartRef.current = null;
    touchEndRef.current = null;
    setIsTracking(false);
  }, [disabled, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown]);

  return (
    <div
      className={`${className} ${isTracking ? 'touch-tracking' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{
        touchAction: disabled ? 'auto' : 'pan-y', // Allow vertical scrolling but capture horizontal swipes
        userSelect: 'none',
        WebkitUserSelect: 'none'
      }}
    >
      {children}
      
      <style jsx>{`
        .touch-tracking {
          transition: none;
        }
        
        /* Prevent text selection during swipe */
        .touch-tracking * {
          user-select: none;
          -webkit-user-select: none;
          -moz-user-select: none;
          -ms-user-select: none;
        }
      `}</style>
    </div>
  );
};