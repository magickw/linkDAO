import { useState, useEffect, useRef, useCallback } from 'react';

export interface SwipeGestureConfig {
  threshold?: number; // Minimum distance for swipe
  velocity?: number; // Minimum velocity for swipe
  preventDefaultTouchmoveEvent?: boolean;
  delta?: number; // Minimum delta for swipe detection
}

export interface SwipeGestureHandlers {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onSwipeStart?: (event: TouchEvent) => void;
  onSwipeMove?: (event: TouchEvent, deltaX: number, deltaY: number) => void;
  onSwipeEnd?: (event: TouchEvent) => void;
}

export interface SwipeGestureState {
  isSwiping: boolean;
  swipeDirection: 'left' | 'right' | 'up' | 'down' | null;
  deltaX: number;
  deltaY: number;
  velocity: number;
}

const defaultConfig: Required<SwipeGestureConfig> = {
  threshold: 50,
  velocity: 0.3,
  preventDefaultTouchmoveEvent: false,
  delta: 10,
};

export const useSwipeGestures = (
  handlers: SwipeGestureHandlers,
  config: SwipeGestureConfig = {}
) => {
  const finalConfig = { ...defaultConfig, ...config };
  const [swipeState, setSwipeState] = useState<SwipeGestureState>({
    isSwiping: false,
    swipeDirection: null,
    deltaX: 0,
    deltaY: 0,
    velocity: 0,
  });

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const touchMoveRef = useRef<{ x: number; y: number; time: number } | null>(null);

  const handleTouchStart = useCallback((event: TouchEvent) => {
    const touch = event.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    setSwipeState(prev => ({
      ...prev,
      isSwiping: true,
      swipeDirection: null,
      deltaX: 0,
      deltaY: 0,
      velocity: 0,
    }));

    handlers.onSwipeStart?.(event);
  }, [handlers]);

  const handleTouchMove = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = event.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;

    touchMoveRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };

    setSwipeState(prev => ({
      ...prev,
      deltaX,
      deltaY,
    }));

    // Determine swipe direction
    let direction: 'left' | 'right' | 'up' | 'down' | null = null;
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      if (Math.abs(deltaX) > finalConfig.delta) {
        direction = deltaX > 0 ? 'right' : 'left';
      }
    } else {
      if (Math.abs(deltaY) > finalConfig.delta) {
        direction = deltaY > 0 ? 'down' : 'up';
      }
    }

    setSwipeState(prev => ({
      ...prev,
      swipeDirection: direction,
    }));

    if (finalConfig.preventDefaultTouchmoveEvent) {
      event.preventDefault();
    }

    handlers.onSwipeMove?.(event, deltaX, deltaY);
  }, [handlers, finalConfig]);

  const handleTouchEnd = useCallback((event: TouchEvent) => {
    if (!touchStartRef.current || !touchMoveRef.current) {
      setSwipeState(prev => ({
        ...prev,
        isSwiping: false,
      }));
      return;
    }

    const deltaX = touchMoveRef.current.x - touchStartRef.current.x;
    const deltaY = touchMoveRef.current.y - touchStartRef.current.y;
    const deltaTime = touchMoveRef.current.time - touchStartRef.current.time;
    const velocity = Math.sqrt(deltaX * deltaX + deltaY * deltaY) / deltaTime;

    setSwipeState(prev => ({
      ...prev,
      isSwiping: false,
      velocity,
    }));

    // Check if swipe meets threshold requirements
    const absX = Math.abs(deltaX);
    const absY = Math.abs(deltaY);
    const meetsThreshold = Math.max(absX, absY) > finalConfig.threshold;
    const meetsVelocity = velocity > finalConfig.velocity;

    if (meetsThreshold && meetsVelocity) {
      if (absX > absY) {
        // Horizontal swipe
        if (deltaX > 0) {
          handlers.onSwipeRight?.();
        } else {
          handlers.onSwipeLeft?.();
        }
      } else {
        // Vertical swipe
        if (deltaY > 0) {
          handlers.onSwipeDown?.();
        } else {
          handlers.onSwipeUp?.();
        }
      }
    }

    handlers.onSwipeEnd?.(event);
    touchStartRef.current = null;
    touchMoveRef.current = null;
  }, [handlers, finalConfig]);

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
  };

  return {
    swipeHandlers,
    swipeState,
  };
};

// Higher-order component for adding swipe gestures
export const withSwipeGestures = <P extends object>(
  Component: React.ComponentType<P>,
  handlers: SwipeGestureHandlers,
  config?: SwipeGestureConfig
) => {
  return React.forwardRef<any, P>((props, ref) => {
    const { swipeHandlers } = useSwipeGestures(handlers, config);
    
    return (
      <div {...swipeHandlers}>
        <Component {...props} ref={ref} />
      </div>
    );
  });
};

export default useSwipeGestures;