import React, { useRef, useCallback, useEffect } from 'react';
import { motion, PanInfo, useMotionValue, useTransform } from 'framer-motion';
import { 
  HeartIcon, 
  BookmarkIcon, 
  CurrencyDollarIcon,
  ArrowUpIcon,
  ShareIcon,
  FlagIcon
} from '@heroicons/react/24/outline';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface Web3SwipeAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  backgroundColor: string;
  action: () => void;
  web3Feature?: boolean;
  requiresWallet?: boolean;
  gasFee?: string;
}

interface Web3SwipeGestureHandlerProps {
  children: React.ReactNode;
  postId?: string;
  onUpvote?: () => void;
  onSave?: () => void;
  onTip?: (amount?: number) => void;
  onStake?: (amount?: number) => void;
  onShare?: () => void;
  onReport?: () => void;
  walletConnected?: boolean;
  userBalance?: number;
  swipeThreshold?: number;
  disabled?: boolean;
  className?: string;
}

export const Web3SwipeGestureHandler: React.FC<Web3SwipeGestureHandlerProps> = ({
  children,
  postId,
  onUpvote,
  onSave,
  onTip,
  onStake,
  onShare,
  onReport,
  walletConnected = false,
  userBalance = 0,
  swipeThreshold = 80,
  disabled = false,
  className = ''
}) => {
  const { triggerHapticFeedback, isTouch } = useMobileOptimization();
  const { announceToScreenReader } = useMobileAccessibility();
  
  const containerRef = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const opacity = useTransform(x, [-200, -100, 0, 100, 200], [0.8, 1, 1, 1, 0.8]);
  const scale = useTransform(x, [-200, -100, 0, 100, 200], [0.98, 1, 1, 1, 0.98]);
  
  // Left swipe (upvote) indicator
  const leftIndicatorOpacity = useTransform(
    x, 
    [-200, -swipeThreshold, 0], 
    [1, 0.8, 0]
  );
  
  // Right swipe (save) indicator
  const rightIndicatorOpacity = useTransform(
    x, 
    [0, swipeThreshold, 200], 
    [0, 0.8, 1]
  );

  // Web3 swipe actions
  const leftSwipeActions: Web3SwipeAction[] = [
    {
      id: 'upvote',
      label: 'Upvote',
      icon: ArrowUpIcon,
      color: '#ef4444',
      backgroundColor: 'rgba(239, 68, 68, 0.1)',
      action: () => onUpvote?.(),
    },
    {
      id: 'tip',
      label: 'Tip',
      icon: CurrencyDollarIcon,
      color: '#10b981',
      backgroundColor: 'rgba(16, 185, 129, 0.1)',
      action: () => onTip?.(),
      web3Feature: true,
      requiresWallet: true,
      gasFee: '~$0.50'
    }
  ];

  const rightSwipeActions: Web3SwipeAction[] = [
    {
      id: 'save',
      label: 'Save',
      icon: BookmarkIcon,
      color: '#3b82f6',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      action: () => onSave?.(),
    },
    {
      id: 'stake',
      label: 'Boost',
      icon: ArrowUpIcon,
      color: '#8b5cf6',
      backgroundColor: 'rgba(139, 92, 246, 0.1)',
      action: () => onStake?.(),
      web3Feature: true,
      requiresWallet: true,
      gasFee: '~$1.20'
    }
  ];

  // Get current swipe action based on distance
  const getCurrentAction = useCallback((offsetX: number) => {
    const absOffset = Math.abs(offsetX);
    if (absOffset < swipeThreshold) return null;
    
    if (offsetX < 0) {
      // Left swipe - choose between upvote and tip based on distance
      return absOffset > swipeThreshold * 1.5 ? leftSwipeActions[1] : leftSwipeActions[0];
    } else {
      // Right swipe - choose between save and stake based on distance
      return absOffset > swipeThreshold * 1.5 ? rightSwipeActions[1] : rightSwipeActions[0];
    }
  }, [swipeThreshold]);

  // Handle pan start
  const handlePanStart = useCallback(() => {
    if (disabled || !isTouch) return;
    triggerHapticFeedback('light');
  }, [disabled, isTouch, triggerHapticFeedback]);

  // Handle pan
  const handlePan = useCallback((event: any, info: PanInfo) => {
    if (disabled || !isTouch) return;
    
    const { offset } = info;
    x.set(offset.x);
    
    const currentAction = getCurrentAction(offset.x);
    const absOffsetX = Math.abs(offset.x);
    
    // Provide haptic feedback at thresholds
    if (absOffsetX >= swipeThreshold && absOffsetX < swipeThreshold + 10) {
      triggerHapticFeedback('medium');
      
      if (currentAction) {
        announceToScreenReader(`${currentAction.label} action ready`);
      }
    }
    
    // Enhanced feedback for Web3 actions
    if (absOffsetX >= swipeThreshold * 1.5 && absOffsetX < swipeThreshold * 1.5 + 10) {
      if (currentAction?.web3Feature) {
        triggerHapticFeedback('heavy');
        announceToScreenReader(`${currentAction.label} Web3 action ready${currentAction.gasFee ? `, gas fee ${currentAction.gasFee}` : ''}`);
      }
    }
  }, [disabled, isTouch, x, getCurrentAction, swipeThreshold, triggerHapticFeedback, announceToScreenReader]);

  // Handle pan end
  const handlePanEnd = useCallback((event: any, info: PanInfo) => {
    if (disabled || !isTouch) return;
    
    const { offset, velocity } = info;
    const absOffsetX = Math.abs(offset.x);
    const absVelocityX = Math.abs(velocity.x);
    
    // Check if swipe threshold is met
    const isSwipe = absOffsetX >= swipeThreshold || absVelocityX >= 500;
    
    if (isSwipe) {
      const currentAction = getCurrentAction(offset.x);
      
      if (currentAction) {
        // Check Web3 requirements
        if (currentAction.requiresWallet && !walletConnected) {
          triggerHapticFeedback('error');
          announceToScreenReader('Please connect your wallet to use Web3 features');
        } else if (currentAction.web3Feature && userBalance <= 0) {
          triggerHapticFeedback('error');
          announceToScreenReader('Insufficient balance for this action');
        } else {
          triggerHapticFeedback('success');
          currentAction.action();
          announceToScreenReader(`${currentAction.label} action completed`);
        }
      }
    }
    
    // Reset position with spring animation
    x.set(0);
  }, [disabled, isTouch, swipeThreshold, getCurrentAction, walletConnected, userBalance, x, triggerHapticFeedback, announceToScreenReader]);

  if (!isTouch || disabled) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div className={`relative overflow-hidden ${className}`} ref={containerRef}>
      {/* Left swipe indicators */}
      <motion.div
        className="absolute left-0 top-0 bottom-0 flex items-center justify-center w-24 z-10"
        style={{ opacity: leftIndicatorOpacity }}
      >
        <div className="flex flex-col items-center space-y-2">
          {leftSwipeActions.map((action, index) => {
            const isActive = Math.abs(x.get()) >= swipeThreshold * (index + 1);
            return (
              <motion.div
                key={action.id}
                className={`
                  flex flex-col items-center p-2 rounded-lg
                  ${isActive ? 'bg-white/20' : 'bg-white/10'}
                  transition-all duration-200
                `}
                style={{ 
                  backgroundColor: isActive ? action.backgroundColor : 'rgba(255, 255, 255, 0.1)',
                  color: action.color
                }}
                animate={{ scale: isActive ? 1.1 : 1 }}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
                {action.web3Feature && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Right swipe indicators */}
      <motion.div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center w-24 z-10"
        style={{ opacity: rightIndicatorOpacity }}
      >
        <div className="flex flex-col items-center space-y-2">
          {rightSwipeActions.map((action, index) => {
            const isActive = Math.abs(x.get()) >= swipeThreshold * (index + 1);
            return (
              <motion.div
                key={action.id}
                className={`
                  flex flex-col items-center p-2 rounded-lg
                  ${isActive ? 'bg-white/20' : 'bg-white/10'}
                  transition-all duration-200
                `}
                style={{ 
                  backgroundColor: isActive ? action.backgroundColor : 'rgba(255, 255, 255, 0.1)',
                  color: action.color
                }}
                animate={{ scale: isActive ? 1.1 : 1 }}
              >
                <action.icon className="w-5 h-5" />
                <span className="text-xs font-medium">{action.label}</span>
                {action.web3Feature && (
                  <div className="w-2 h-2 bg-purple-500 rounded-full" />
                )}
              </motion.div>
            );
          })}
        </div>
      </motion.div>

      {/* Main content */}
      <motion.div
        style={{ x, opacity, scale }}
        onPanStart={handlePanStart}
        onPan={handlePan}
        onPanEnd={handlePanEnd}
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

export default Web3SwipeGestureHandler;