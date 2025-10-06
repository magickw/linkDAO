import React, { useRef, useCallback, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  backgroundColor: string;
  action: () => void;
}

interface MobileTouchGestureHandlerProps {
  children: React.ReactNode;
  leftSwipeAction?: SwipeAction;
  rightSwipeAction?: SwipeAction;
  onLongPress?: () => void;
  onDoubleTap?: () => void;
  swipeThreshold?: number;
  longPressDelay?: number;
  doubleTapDelay?: number;
  disabled?: boolean;
  className?: string;
}

export const MobileTouchGestureHandler: React.FC<MobileTouchGestureHandlerProps> = ({
  children,
  leftSwipeAction,
  rightSwipeAction,
  onLongPress,
  onDoubleTap,
  swipeThreshold = 100,
  longPressDelay = 500,
  doubleTapDelay = 300,
  disabled = false,
  className = ''
}) => {
  const { triggerHapticFeedback, isTouch } = useMobileOptimization();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const longPressTimerRef = useRef<NodeJS.Timeout>();
  const lastTapRef = useRef<number>(0);
  const tapCountRef = useRef<number>(0);
  
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.8, 1, 1, 1, 0.8]);
  const scale = useTransform(x, [-200, -100, 0, 100, 200], [0.95, 1, 1, 1, 0.95]);
  
  // Left swipe indicator opacity
  const leftIndicatorOpacity = useTransform(
    x, 
    [-200, -swipeThreshold, 0], 
    [1, 0.8, 0]
  );
  
  // Right swipe indicator opacity
  const rightIndicatorOpacity = useTransform(
    x, 
    [0, swipeThreshold, 200], 
    [0, 0.8, 1]
  );

  // Clear long press timer
  const clearLongPressTimer = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = undefined;
    }
  }, []);

  // Handle pan start
  const handlePanStart = useCallback(() => {
    if (disabled || !isTouch) return;
    
    clearLongPressTimer();
    triggerHapticFeedback('light');
  }, [disabled, isTouch, clearLongPressTimer, triggerHapticFeedback]);

  // Handle pan
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (disabled || !isTouch) return;
    
    const { offset } = info;
    x.set(offset.x);
    
    // Provide haptic feedback at thresholds
    const absOffsetX = Math.abs(offset.x);
    if (absOffsetX >= swipeThreshold && absOffsetX < swipeThreshold + 10) {
      triggerHapticFeedback('medium');
    }
  }, [disabled, isTouch, x, swipeThreshold, triggerHapticFeedback]);

  // Handle pan end
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (disabled || !isTouch) return;
    
    const { offset, velocity } = info;
    const absOffsetX = Math.abs(offset.x);
    const absVelocityX = Math.abs(velocity.x);
    
    // Check if swipe threshold is met
    const isSwipe = absOffsetX >= swipeThreshold || absVelocityX >= 500;
    
    if (isSwipe) {
      if (offset.x < 0 && leftSwipeAction) {
        // Left swipe
        triggerHapticFeedback('success');
        leftSwipeAction.action();
      } else if (offset.x > 0 && rightSwipeAction) {
        // Right swipe
        triggerHapticFeedback('success');
        rightSwipeAction.action();
      }
    }
    
    // Reset position
    x.set(0);
  }, [disabled, isTouch, swipeThreshold, leftSwipeAction, rightSwipeAction, x, triggerHapticFeedback]);

  // Handle touch start (for long press and double tap)
  const handleTouchStart = useCallback((event: React.TouchEvent) => {
    if (disabled || !isTouch) return;
    
    // Start long press timer
    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        triggerHapticFeedback('heavy');
        onLongPress();
      }, longPressDelay);
    }
    
    // Handle double tap
    if (onDoubleTap) {
      const now = Date.now();
      const timeSinceLastTap = now - lastTapRef.current;
      
      if (timeSinceLastTap < doubleTapDelay) {
        tapCountRef.current += 1;
        
        if (tapCountRef.current === 2) {
          clearLongPressTimer();
          triggerHapticFeedback('medium');
          onDoubleTap();
          tapCountRef.current = 0;
        }
      } else {
        tapCountRef.current = 1;
      }
      
      lastTapRef.current = now;
    }
  }, [disabled, isTouch, onLongPress, onDoubleTap, longPressDelay, doubleTapDelay, triggerHapticFeedback, clearLongPressTimer]);

  // Handle touch end/cancel
  const handleTouchEnd = useCallback(() => {
    clearLongPressTimer();
  }, [clearLongPressTimer]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearLongPressTimer();
    };
  }, [clearLongPressTimer]);

  if (!isTouch || disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      {/* Left swipe indicator */}
      {leftSwipeAction && (
        <motion.div
          className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-20 z-10"
          style={{ 
            opacity: leftIndicatorOpacity,
            backgroundColor: leftSwipeAction.backgroundColor 
          }}
        >
          <div className="flex flex-col items-center space-y-1">
            <leftSwipeAction.icon 
              className={`w-6 h-6`} 
            />
            <span 
              className="text-xs font-medium"
            >
              {leftSwipeAction.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Right swipe indicator */}
      {rightSwipeAction && (
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-20 z-10"
          style={{ 
            opacity: rightIndicatorOpacity,
            backgroundColor: rightSwipeAction.backgroundColor 
          }}
        >
          <div className="flex flex-col items-center space-y-1">
            <rightSwipeAction.icon 
              className={`w-6 h-6`} 
            />
            <span 
              className="text-xs font-medium"
            >
              {rightSwipeAction.label}
            </span>
          </div>
        </motion.div>
      )}

      {/* Main content */}
      <motion.div
        style={{ x, opacity, scale }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        drag="x"
        dragConstraints={{ left: -200, right: 200 }}
        dragElastic={0.2}
        className="relative z-20"
      >
        {children}
      </motion.div>
    </div>
  );
};

// Preset swipe actions
export const SwipeActions = {
  like: {
    id: 'like',
    label: 'Like',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
      </svg>
    ),
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  bookmark: {
    id: 'bookmark',
    label: 'Save',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>
      </svg>
    ),
    color: '#3b82f6',
    backgroundColor: 'rgba(59, 130, 246, 0.1)'
  },
  share: {
    id: 'share',
    label: 'Share',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"/>
      </svg>
    ),
    color: '#10b981',
    backgroundColor: 'rgba(16, 185, 129, 0.1)'
  },
  delete: {
    id: 'delete',
    label: 'Delete',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
      </svg>
    ),
    color: '#ef4444',
    backgroundColor: 'rgba(239, 68, 68, 0.1)'
  },
  archive: {
    id: 'archive',
    label: 'Archive',
    icon: ({ className }: { className?: string }) => (
      <svg className={className} fill="currentColor" viewBox="0 0 24 24">
        <path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z"/>
      </svg>
    ),
    color: '#6b7280',
    backgroundColor: 'rgba(107, 114, 128, 0.1)'
  }
};

export default MobileTouchGestureHandler;