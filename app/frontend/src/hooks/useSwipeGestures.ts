import React, { useState, useEffect, useRef, useCallback } from 'react';

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
  onSwipeStart?: (event: React.TouchEvent) => void;
  onSwipeMove?: (event: React.TouchEvent, deltaX: number, deltaY: number) => void;
  onSwipeEnd?: (event: React.TouchEvent) => void;
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

  const handleTouchStart = useCallback((event: React.TouchEvent) => {
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

  const handleTouchMove = useCallback((event: React.TouchEvent) => {
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

  const handleTouchEnd = useCallback((event: React.TouchEvent) => {
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
    
    return React.createElement('div', { ...swipeHandlers },
      React.createElement(Component, { ...props, ref } as any)
    );
  });
};

export const usePostCardSwipeGestures = (
  postId: string,
  onVote: (postId: string, direction: 'up' | 'down') => void,
  onSave?: (postId: string) => void,
  onShare?: (postId: string) => void
) => {
  const [swipeState, setSwipeState] = useState({
    isActive: false,
    direction: null as 'left' | 'right' | null,
    distance: 0,
    velocity: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });

  // Check if touch is supported
  const isSwipeSupported = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0);

  // Handle swipe events
  const handleTouchStart = (e: React.TouchEvent) => {
    if (!isSwipeSupported) return;
    
    const touch = e.touches[0];
    setSwipeState(prev => ({
      ...prev,
      isActive: true,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction: null,
      distance: 0
    }));
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwipeSupported || !swipeState.isActive) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - swipeState.startX;
    const deltaY = touch.clientY - swipeState.startY;
    const distance = Math.abs(deltaX);
    const direction = deltaX < 0 ? 'left' : deltaX > 0 ? 'right' : null;
    
    setSwipeState(prev => ({
      ...prev,
      currentX: touch.clientX,
      currentY: touch.clientY,
      direction,
      distance
    }));
  };

  const handleTouchEnd = () => {
    if (!isSwipeSupported || !swipeState.isActive) return;
    
    // Determine action based on direction and distance
    if (swipeState.direction === 'left') {
      // Left swipe: Vote
      if (swipeState.distance > 150 && onVote) {
        // Long left swipe = downvote
        onVote(postId, 'down');
      } else if (onVote) {
        // Short left swipe = upvote
        onVote(postId, 'up');
      }
    } else if (swipeState.direction === 'right') {
      // Right swipe: Save or Share
      if (swipeState.distance > 150 && onShare) {
        // Long right swipe = share
        onShare(postId);
      } else if (onSave) {
        // Short right swipe = save
        onSave(postId);
      }
    }
    
    // Reset state
    setSwipeState(prev => ({
      ...prev,
      isActive: false,
      direction: null,
      distance: 0
    }));
  };

  const handleTouchCancel = () => {
    setSwipeState(prev => ({
      ...prev,
      isActive: false,
      direction: null,
      distance: 0
    }));
  };

  const swipeHandlers = {
    onTouchStart: handleTouchStart,
    onTouchMove: handleTouchMove,
    onTouchEnd: handleTouchEnd,
    onTouchCancel: handleTouchCancel
  };

  return {
    swipeState,
    swipeHandlers,
    isSwipeSupported
  };
};

export default useSwipeGestures;