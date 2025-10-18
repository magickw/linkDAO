import React, { useState, useRef, useCallback } from 'react';
import { Check, X, Archive, Flag, MoreHorizontal } from 'lucide-react';

interface SwipeAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  backgroundColor: string;
  onAction: () => void;
}

interface SwipeableCardProps {
  children: React.ReactNode;
  leftActions?: SwipeAction[];
  rightActions?: SwipeAction[];
  onSwipe?: (direction: 'left' | 'right', actionId?: string) => void;
  threshold?: number;
  maxSwipeDistance?: number;
  disabled?: boolean;
  className?: string;
}

export const SwipeableCard: React.FC<SwipeableCardProps> = ({
  children,
  leftActions = [],
  rightActions = [],
  onSwipe,
  threshold = 80,
  maxSwipeDistance = 200,
  disabled = false,
  className = ''
}) => {
  const [swipeDistance, setSwipeDistance] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [activeAction, setActiveAction] = useState<SwipeAction | null>(null);
  
  const cardRef = useRef<HTMLDivElement>(null);
  const touchStartXRef = useRef<number>(0);
  const touchStartYRef = useRef<number>(0);
  const isSwipingRef = useRef<boolean>(false);
  const swipeDirectionRef = useRef<'left' | 'right' | null>(null);

  // Default actions for common use cases
  const defaultLeftActions: SwipeAction[] = [
    {
      id: 'approve',
      label: 'Approve',
      icon: Check,
      color: 'text-white',
      backgroundColor: 'bg-green-500',
      onAction: () => console.log('Approved')
    }
  ];

  const defaultRightActions: SwipeAction[] = [
    {
      id: 'reject',
      label: 'Reject',
      icon: X,
      color: 'text-white',
      backgroundColor: 'bg-red-500',
      onAction: () => console.log('Rejected')
    },
    {
      id: 'flag',
      label: 'Flag',
      icon: Flag,
      color: 'text-white',
      backgroundColor: 'bg-orange-500',
      onAction: () => console.log('Flagged')
    }
  ];

  const actualLeftActions = leftActions.length > 0 ? leftActions : defaultLeftActions;
  const actualRightActions = rightActions.length > 0 ? rightActions : defaultRightActions;

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (disabled || isAnimating) return;
    
    const touch = e.touches[0];
    touchStartXRef.current = touch.clientX;
    touchStartYRef.current = touch.clientY;
    isSwipingRef.current = false;
    swipeDirectionRef.current = null;
  }, [disabled, isAnimating]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (disabled || isAnimating) return;
    
    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartXRef.current;
    const deltaY = touch.clientY - touchStartYRef.current;
    
    // Determine if this is a horizontal swipe
    if (!isSwipingRef.current) {
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10;
      if (isHorizontalSwipe) {
        isSwipingRef.current = true;
        swipeDirectionRef.current = deltaX > 0 ? 'right' : 'left';
        e.preventDefault(); // Prevent scrolling
      } else if (Math.abs(deltaY) > 10) {
        // This is a vertical scroll, don't interfere
        return;
      }
    }
    
    if (isSwipingRef.current) {
      e.preventDefault();
      
      // Limit swipe distance
      const limitedDistance = Math.max(-maxSwipeDistance, Math.min(maxSwipeDistance, deltaX));
      setSwipeDistance(limitedDistance);
      
      // Determine active action based on swipe distance
      const direction = limitedDistance > 0 ? 'right' : 'left';
      const actions = direction === 'right' ? actualLeftActions : actualRightActions;
      const actionIndex = Math.floor(Math.abs(limitedDistance) / (threshold * 1.5));
      const action = actions[Math.min(actionIndex, actions.length - 1)];
      
      setActiveAction(Math.abs(limitedDistance) > threshold ? action : null);
    }
  }, [disabled, isAnimating, threshold, maxSwipeDistance, actualLeftActions, actualRightActions]);

  const handleTouchEnd = useCallback(() => {
    if (disabled || isAnimating || !isSwipingRef.current) return;
    
    setIsAnimating(true);
    
    // Check if swipe distance exceeds threshold
    if (Math.abs(swipeDistance) > threshold && activeAction) {
      // Execute the action
      activeAction.onAction();
      onSwipe?.(swipeDirectionRef.current!, activeAction.id);
      
      // Animate card off screen
      const direction = swipeDistance > 0 ? 1 : -1;
      setSwipeDistance(direction * (maxSwipeDistance + 100));
      
      setTimeout(() => {
        resetCard();
      }, 300);
    } else {
      // Snap back to center
      setSwipeDistance(0);
      setTimeout(() => {
        setIsAnimating(false);
      }, 200);
    }
    
    setActiveAction(null);
    isSwipingRef.current = false;
    swipeDirectionRef.current = null;
  }, [disabled, isAnimating, swipeDistance, threshold, activeAction, onSwipe, maxSwipeDistance]);

  const resetCard = useCallback(() => {
    setSwipeDistance(0);
    setActiveAction(null);
    setIsAnimating(false);
    isSwipingRef.current = false;
    swipeDirectionRef.current = null;
  }, []);

  const renderActions = (actions: SwipeAction[], side: 'left' | 'right') => {
    const isVisible = (side === 'left' && swipeDistance > 0) || (side === 'right' && swipeDistance < 0);
    if (!isVisible) return null;
    
    const distance = Math.abs(swipeDistance);
    const opacity = Math.min(distance / threshold, 1);
    
    return (
      <div
        className={`absolute top-0 bottom-0 flex items-center ${
          side === 'left' ? 'left-0' : 'right-0'
        }`}
        style={{
          width: `${distance}px`,
          opacity
        }}
      >
        {actions.map((action, index) => {
          const Icon = action.icon;
          const isActive = activeAction?.id === action.id;
          const actionWidth = Math.min(distance / actions.length, 80);
          
          return (
            <div
              key={action.id}
              className={`h-full flex flex-col items-center justify-center ${action.backgroundColor} ${
                isActive ? 'scale-110' : 'scale-100'
              } transition-transform duration-150`}
              style={{
                width: `${actionWidth}px`,
                minWidth: '60px'
              }}
            >
              <Icon className={`w-6 h-6 ${action.color} mb-1`} />
              <span className={`text-xs ${action.color} font-medium`}>
                {action.label}
              </span>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* Left actions */}
      {renderActions(actualLeftActions, 'left')}
      
      {/* Right actions */}
      {renderActions(actualRightActions, 'right')}
      
      {/* Main card content */}
      <div
        ref={cardRef}
        className="relative bg-white/10 backdrop-blur-md rounded-lg transition-transform duration-200 ease-out"
        style={{
          transform: `translateX(${swipeDistance}px)`,
          transition: isAnimating ? 'transform 0.2s ease-out' : 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
        
        {/* Swipe hint overlay */}
        {Math.abs(swipeDistance) > 10 && Math.abs(swipeDistance) < threshold && (
          <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
            <div className="flex items-center space-x-2 text-white/70">
              <MoreHorizontal className="w-5 h-5" />
              <span className="text-sm">
                {swipeDistance > 0 ? 'Swipe right for actions' : 'Swipe left for actions'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};