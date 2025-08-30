import React, { useRef, useCallback, ReactNode } from 'react';

interface GestureHandlerProps {
  children: ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  className?: string;
  style?: React.CSSProperties;
  disabled?: boolean;
  swipeThreshold?: number;
  longPressDelay?: number;
}

interface TouchData {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
}

export default function GestureHandler({
  children,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  onTap,
  onDoubleTap,
  onLongPress,
  className = '',
  style,
  disabled = false,
  swipeThreshold = 50,
  longPressDelay = 500
}: GestureHandlerProps) {
  const touchDataRef = useRef<TouchData>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0
  });
  const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isLongPressRef = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    const touch = e.touches[0];
    const now = Date.now();
    
    touchDataRef.current = {
      startX: touch.clientX,
      startY: touch.clientY,
      startTime: now,
      lastTapTime: touchDataRef.current.lastTapTime
    };

    isLongPressRef.current = false;

    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, longPressDelay);
    }
  }, [disabled, onLongPress, longPressDelay]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    // Cancel long press if finger moves too much
    if (longPressTimerRef.current) {
      const touch = e.touches[0];
      const deltaX = Math.abs(touch.clientX - touchDataRef.current.startX);
      const deltaY = Math.abs(touch.clientY - touchDataRef.current.startY);
      
      if (deltaX > 10 || deltaY > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }
  }, [disabled]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (disabled) return;

    // Clear long press timer
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    // Don't process other gestures if it was a long press
    if (isLongPressRef.current) {
      return;
    }

    const touch = e.changedTouches[0];
    const endX = touch.clientX;
    const endY = touch.clientY;
    const deltaX = endX - touchDataRef.current.startX;
    const deltaY = endY - touchDataRef.current.startY;
    const deltaTime = Date.now() - touchDataRef.current.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Check for swipe gestures
    if (distance > swipeThreshold && deltaTime < 300) {
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);

      if (absDeltaX > absDeltaY) {
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
      return;
    }

    // Check for tap gestures (small movement, quick time)
    if (distance < 10 && deltaTime < 300) {
      const now = Date.now();
      const timeSinceLastTap = now - touchDataRef.current.lastTapTime;

      if (timeSinceLastTap < 300 && onDoubleTap) {
        // Double tap
        onDoubleTap();
        touchDataRef.current.lastTapTime = 0; // Reset to prevent triple tap
      } else {
        // Single tap (with delay to check for double tap)
        if (onTap && !onDoubleTap) {
          onTap();
        } else if (onTap) {
          setTimeout(() => {
            const finalTimeSinceLastTap = Date.now() - now;
            if (finalTimeSinceLastTap >= 300) {
              onTap();
            }
          }, 300);
        }
        touchDataRef.current.lastTapTime = now;
      }
    }
  }, [disabled, swipeThreshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap]);

  // Mouse events for desktop compatibility
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    const now = Date.now();
    touchDataRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      startTime: now,
      lastTapTime: touchDataRef.current.lastTapTime
    };

    isLongPressRef.current = false;

    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        isLongPressRef.current = true;
        onLongPress();
      }, longPressDelay);
    }
  }, [disabled, onLongPress, longPressDelay]);

  const handleMouseUp = useCallback((e: React.MouseEvent) => {
    if (disabled) return;

    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isLongPressRef.current) {
      return;
    }

    const endX = e.clientX;
    const endY = e.clientY;
    const deltaX = endX - touchDataRef.current.startX;
    const deltaY = endY - touchDataRef.current.startY;
    const deltaTime = Date.now() - touchDataRef.current.startTime;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

    // Only handle click/tap for mouse events, not swipes
    if (distance < 10 && deltaTime < 300 && onTap) {
      onTap();
    }
  }, [disabled, onTap]);

  return (
    <div
      className={className}
      style={{ 
        touchAction: 'manipulation', // Prevents default touch behaviors
        ...style 
      }}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
    >
      {children}
    </div>
  );
}