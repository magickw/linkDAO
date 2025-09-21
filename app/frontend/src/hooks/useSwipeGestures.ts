import { useCallback, useRef, useState, useEffect } from 'react';

interface SwipeGestureConfig {
  onSwipeLeft?: (distance: number) => void;
  onSwipeRight?: (distance: number) => void;
  onSwipeUp?: (distance: number) => void;
  onSwipeDown?: (distance: number) => void;
  threshold?: number;
  preventDefaultTouchMove?: boolean;
  enableHapticFeedback?: boolean;
  velocityThreshold?: number;
}

interface SwipeState {
  isActive: boolean;
  direction: 'left' | 'right' | 'up' | 'down' | null;
  distance: number;
  velocity: number;
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface SwipeGestureReturn {
  swipeState: SwipeState;
  swipeHandlers: {
    onTouchStart: (e: React.TouchEvent) => void;
    onTouchMove: (e: React.TouchEvent) => void;
    onTouchEnd: (e: React.TouchEvent) => void;
    onTouchCancel: (e: React.TouchEvent) => void;
  };
  resetSwipe: () => void;
  isSwipeSupported: boolean;
}

export const useSwipeGestures = (config: SwipeGestureConfig): SwipeGestureReturn => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    preventDefaultTouchMove = false,
    enableHapticFeedback = true,
    velocityThreshold = 0.3
  } = config;

  const [swipeState, setSwipeState] = useState<SwipeState>({
    isActive: false,
    direction: null,
    distance: 0,
    velocity: 0,
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0
  });

  const [isSwipeSupported, setIsSwipeSupported] = useState(false);
  const touchStartTime = useRef<number>(0);
  const lastTouchTime = useRef<number>(0);

  // Check for touch support
  useEffect(() => {
    const checkTouchSupport = () => {
      return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    };

    setIsSwipeSupported(checkTouchSupport());
  }, []);

  // Haptic feedback utility
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!enableHapticFeedback || typeof window === 'undefined') return;

    // Use Vibration API as fallback
    if ('vibrate' in navigator) {
      const patterns = {
        light: [10],
        medium: [20],
        heavy: [30]
      };
      navigator.vibrate(patterns[type]);
    }

    // Use Haptic Feedback API if available (iOS Safari)
    if ('hapticFeedback' in window) {
      try {
        (window as any).hapticFeedback.impact(type);
      } catch (error) {
        // Silently fail if haptic feedback is not available
      }
    }
  }, [enableHapticFeedback]);

  // Calculate swipe direction and distance
  const calculateSwipe = useCallback((startX: number, startY: number, currentX: number, currentY: number) => {
    const deltaX = currentX - startX;
    const deltaY = currentY - startY;
    const absDeltaX = Math.abs(deltaX);
    const absDeltaY = Math.abs(deltaY);

    let direction: 'left' | 'right' | 'up' | 'down' | null = null;
    let distance = 0;

    // Determine primary direction
    if (absDeltaX > absDeltaY) {
      // Horizontal swipe
      if (absDeltaX > threshold) {
        direction = deltaX > 0 ? 'right' : 'left';
        distance = absDeltaX;
      }
    } else {
      // Vertical swipe
      if (absDeltaY > threshold) {
        direction = deltaY > 0 ? 'down' : 'up';
        distance = absDeltaY;
      }
    }

    return { direction, distance };
  }, [threshold]);

  // Calculate velocity
  const calculateVelocity = useCallback((distance: number, timeElapsed: number) => {
    return timeElapsed > 0 ? distance / timeElapsed : 0;
  }, []);

  // Touch start handler
  const onTouchStart = useCallback((e: React.TouchEvent) => {
    if (!isSwipeSupported) return;

    const touch = e.touches[0];
    const now = Date.now();
    
    touchStartTime.current = now;
    lastTouchTime.current = now;

    setSwipeState({
      isActive: true,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY
    });
  }, [isSwipeSupported]);

  // Touch move handler
  const onTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isSwipeSupported || !swipeState.isActive) return;

    if (preventDefaultTouchMove) {
      e.preventDefault();
    }

    const touch = e.touches[0];
    const now = Date.now();
    const timeElapsed = now - lastTouchTime.current;

    const { direction, distance } = calculateSwipe(
      swipeState.startX,
      swipeState.startY,
      touch.clientX,
      touch.clientY
    );

    const velocity = calculateVelocity(distance, timeElapsed);

    setSwipeState(prev => ({
      ...prev,
      direction,
      distance,
      velocity,
      currentX: touch.clientX,
      currentY: touch.clientY
    }));

    lastTouchTime.current = now;

    // Trigger haptic feedback when threshold is reached
    if (direction && distance > threshold && !swipeState.direction) {
      triggerHapticFeedback('light');
    }
  }, [
    isSwipeSupported,
    swipeState.isActive,
    swipeState.startX,
    swipeState.startY,
    swipeState.direction,
    preventDefaultTouchMove,
    calculateSwipe,
    calculateVelocity,
    threshold,
    triggerHapticFeedback
  ]);

  // Touch end handler
  const onTouchEnd = useCallback((e: React.TouchEvent) => {
    if (!isSwipeSupported || !swipeState.isActive) return;

    const now = Date.now();
    const totalTime = now - touchStartTime.current;
    const finalVelocity = calculateVelocity(swipeState.distance, totalTime);

    // Check if swipe meets criteria
    const isValidSwipe = swipeState.distance > threshold && finalVelocity > velocityThreshold;

    if (isValidSwipe && swipeState.direction) {
      // Trigger appropriate callback
      switch (swipeState.direction) {
        case 'left':
          onSwipeLeft?.(swipeState.distance);
          break;
        case 'right':
          onSwipeRight?.(swipeState.distance);
          break;
        case 'up':
          onSwipeUp?.(swipeState.distance);
          break;
        case 'down':
          onSwipeDown?.(swipeState.distance);
          break;
      }

      // Trigger success haptic feedback
      triggerHapticFeedback('medium');
    }

    // Reset state
    setSwipeState({
      isActive: false,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
  }, [
    isSwipeSupported,
    swipeState.isActive,
    swipeState.distance,
    swipeState.direction,
    threshold,
    velocityThreshold,
    calculateVelocity,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    triggerHapticFeedback
  ]);

  // Touch cancel handler
  const onTouchCancel = useCallback((e: React.TouchEvent) => {
    setSwipeState({
      isActive: false,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
  }, []);

  // Reset swipe state
  const resetSwipe = useCallback(() => {
    setSwipeState({
      isActive: false,
      direction: null,
      distance: 0,
      velocity: 0,
      startX: 0,
      startY: 0,
      currentX: 0,
      currentY: 0
    });
  }, []);

  const swipeHandlers = {
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onTouchCancel
  };

  return {
    swipeState,
    swipeHandlers,
    resetSwipe,
    isSwipeSupported
  };
};

// Utility hook for common post card swipe actions
export const usePostCardSwipeGestures = (
  postId: string,
  onVote: (postId: string, direction: 'up' | 'down') => void,
  onSave?: (postId: string) => void,
  onShare?: (postId: string) => void
) => {
  const swipeConfig: SwipeGestureConfig = {
    onSwipeLeft: useCallback((distance: number) => {
      // Left swipe for voting actions
      if (distance > 100) {
        // Long swipe for downvote
        onVote(postId, 'down');
      } else {
        // Short swipe for upvote
        onVote(postId, 'up');
      }
    }, [postId, onVote]),

    onSwipeRight: useCallback((distance: number) => {
      // Right swipe for save/share actions
      if (distance > 100 && onShare) {
        // Long swipe for share
        onShare(postId);
      } else if (onSave) {
        // Short swipe for save
        onSave(postId);
      }
    }, [postId, onSave, onShare]),

    threshold: 50,
    enableHapticFeedback: true,
    velocityThreshold: 0.3
  };

  return useSwipeGestures(swipeConfig);
};