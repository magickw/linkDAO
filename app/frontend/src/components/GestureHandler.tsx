import React, { useState, useRef, useEffect } from 'react';

interface GestureHandlerProps {
  children: React.ReactNode;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  className?: string;
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
  className = ''
}: GestureHandlerProps) {
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [startTime, setStartTime] = useState(0);
  const [touchMoved, setTouchMoved] = useState(false);
  const touchTimeout = useRef<NodeJS.Timeout | null>(null);
  const tapTimeout = useRef<NodeJS.Timeout | null>(null);
  const tapCount = useRef(0);

  // Clean up timeouts on unmount
  useEffect(() => {
    return () => {
      if (touchTimeout.current) clearTimeout(touchTimeout.current);
      if (tapTimeout.current) clearTimeout(tapTimeout.current);
    };
  }, []);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setStartX(touch.clientX);
    setStartY(touch.clientY);
    setStartTime(Date.now());
    setTouchMoved(false);
    
    // Clear previous timeouts
    if (tapTimeout.current) clearTimeout(tapTimeout.current);
    
    // Set long press timeout
    if (onLongPress) {
      touchTimeout.current = setTimeout(() => {
        onLongPress();
        tapCount.current = 0;
      }, 500); // 500ms for long press
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }
    setTouchMoved(true);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    // Clear long press timeout
    if (touchTimeout.current) {
      clearTimeout(touchTimeout.current);
      touchTimeout.current = null;
    }
    
    if (!touchMoved) {
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const endTime = Date.now();
      
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const deltaTime = endTime - startTime;
      
      // Check for tap or double tap
      if (Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10 && deltaTime < 200) {
        tapCount.current += 1;
        
        if (tapCount.current === 1) {
          // First tap
          tapTimeout.current = setTimeout(() => {
            if (tapCount.current === 1) {
              // Single tap
              if (onTap) onTap();
            }
            tapCount.current = 0;
          }, 300); // 300ms delay to check for double tap
        } else if (tapCount.current === 2) {
          // Double tap
          if (tapTimeout.current) clearTimeout(tapTimeout.current);
          if (onDoubleTap) onDoubleTap();
          tapCount.current = 0;
        }
      }
    } else {
      // Handle swipe gestures
      const endX = e.changedTouches[0].clientX;
      const endY = e.changedTouches[0].clientY;
      const deltaX = endX - startX;
      const deltaY = endY - startY;
      const absDeltaX = Math.abs(deltaX);
      const absDeltaY = Math.abs(deltaY);
      
      // Minimum swipe distance
      if (absDeltaX > 50 || absDeltaY > 50) {
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
      }
    }
    
    setTouchMoved(false);
  };

  return (
    <div
      className={className}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {children}
    </div>
  );
}