/**
 * Micro Interaction Layer
 * Reusable micro-interaction components for hover and click states
 */

import React, { useRef, useCallback } from 'react';
import { useAnimation } from './AnimationProvider';
import { AnimationConfig } from '../../../types/communityEnhancements';

interface MicroInteractionProps {
  children: React.ReactNode;
  interactionType: 'hover' | 'click' | 'vote' | 'tip' | 'follow' | 'share';
  animationConfig?: Partial<AnimationConfig>;
  hapticFeedback?: boolean;
  disabled?: boolean;
  className?: string;
  onClick?: (event: React.MouseEvent) => void;
  onHover?: (isHovering: boolean) => void;
}

interface TipAnimationProps {
  children: React.ReactNode;
  amount?: number;
  token?: 'ETH' | 'SOL' | 'LDAO';
  onComplete?: () => void;
}

interface VoteAnimationProps {
  children: React.ReactNode;
  voteType: 'upvote' | 'downvote';
  isActive?: boolean;
  onVote?: (type: 'upvote' | 'downvote') => void;
}

// Main Micro Interaction Component
export const MicroInteractionLayer: React.FC<MicroInteractionProps> = ({
  children,
  interactionType,
  animationConfig = {},
  hapticFeedback = false,
  disabled = false,
  className = '',
  onClick,
  onHover,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { triggerAnimation, isAnimationEnabled } = useAnimation();
  const isHovering = useRef(false);

  // Haptic feedback (if supported)
  const triggerHaptic = useCallback((intensity: 'light' | 'medium' | 'heavy' = 'light') => {
    if (!hapticFeedback || !navigator.vibrate) return;
    
    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30, 10, 30],
    };
    
    navigator.vibrate(patterns[intensity]);
  }, [hapticFeedback]);

  // Handle hover interactions
  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    
    isHovering.current = true;
    onHover?.(true);
    
    if (!isAnimationEnabled) return;
    
    if (elementRef.current) {
      switch (interactionType) {
        case 'hover':
          triggerAnimation(elementRef.current, 'pulse', { duration: 200, ...animationConfig });
          break;
        case 'vote':
          triggerAnimation(elementRef.current, 'bounce', { scale: 1.05, ...animationConfig });
          break;
        case 'tip':
          triggerAnimation(elementRef.current, 'glow', { color: '#10b981', ...animationConfig });
          break;
        case 'follow':
          triggerAnimation(elementRef.current, 'pulse', { duration: 300, ...animationConfig });
          break;
        case 'share':
          triggerAnimation(elementRef.current, 'bounce', { scale: 1.03, ...animationConfig });
          break;
      }
    }
  }, [disabled, isAnimationEnabled, interactionType, animationConfig, triggerAnimation, onHover]);

  const handleMouseLeave = useCallback(() => {
    isHovering.current = false;
    onHover?.(false);
  }, [onHover]);

  // Handle click interactions
  const handleClick = useCallback((event: React.MouseEvent) => {
    if (disabled) return;
    
    event.preventDefault();
    
    // Trigger haptic feedback
    switch (interactionType) {
      case 'vote':
        triggerHaptic('medium');
        break;
      case 'tip':
        triggerHaptic('heavy');
        break;
      default:
        triggerHaptic('light');
    }
    
    // Trigger animation
    if (elementRef.current && isAnimationEnabled) {
      switch (interactionType) {
        case 'click':
          triggerAnimation(elementRef.current, 'bounce', { scale: 0.95, duration: 150, ...animationConfig });
          break;
        case 'vote':
          triggerAnimation(elementRef.current, 'celebrate', { duration: 400, ...animationConfig });
          break;
        case 'tip':
          triggerAnimation(elementRef.current, 'celebrate', { 
            duration: 600, 
            scale: 1.2, 
            color: '#10b981',
            ...animationConfig 
          });
          break;
        case 'follow':
          triggerAnimation(elementRef.current, 'pulse', { duration: 300, ...animationConfig });
          break;
        case 'share':
          triggerAnimation(elementRef.current, 'shake', { duration: 200, ...animationConfig });
          break;
      }
    }
    
    // Call original onClick after animation
    setTimeout(() => {
      onClick?.(event);
    }, 50);
  }, [disabled, interactionType, triggerHaptic, isAnimationEnabled, triggerAnimation, animationConfig, onClick]);

  return (
    <div
      ref={elementRef}
      className={`ce-micro-interaction ${className} ${disabled ? 'ce-disabled' : ''}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      style={{
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: 'opacity var(--ce-transition-fast)',
      }}
    >
      {children}
      
      <style jsx>{`
        .ce-micro-interaction {
          display: inline-block;
          user-select: none;
          -webkit-tap-highlight-color: transparent;
        }
        
        .ce-micro-interaction.ce-disabled {
          pointer-events: none;
        }
        
        @media (hover: none) and (pointer: coarse) {
          .ce-micro-interaction {
            -webkit-touch-callout: none;
            -webkit-user-select: none;
          }
        }
      `}</style>
    </div>
  );
};

// Specialized Tip Animation Component
export const TipAnimation: React.FC<TipAnimationProps> = ({
  children,
  amount = 0,
  token = 'ETH',
  onComplete,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { triggerAnimation } = useAnimation();

  const handleTipAnimation = useCallback(() => {
    if (!elementRef.current) return;

    // Create floating tip indicator
    const tipIndicator = document.createElement('div');
    tipIndicator.className = 'ce-tip-indicator';
    tipIndicator.innerHTML = `
      <div class="ce-tip-amount">+${amount} ${token}</div>
      <div class="ce-tip-icon">${token === 'SOL' ? '◎' : '🪙'}</div>
    `;
    
    // Position relative to the element
    const rect = elementRef.current.getBoundingClientRect();
    tipIndicator.style.cssText = `
      position: fixed;
      top: ${rect.top - 20}px;
      left: ${rect.left + rect.width / 2}px;
      transform: translateX(-50%);
      z-index: var(--ce-z-toast);
      pointer-events: none;
      display: flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.5rem 0.75rem;
      background: var(--ce-accent);
      color: white;
      border-radius: var(--ce-radius-full);
      font-size: var(--ce-font-size-sm);
      font-weight: 600;
      box-shadow: var(--ce-shadow-lg);
    `;
    
    document.body.appendChild(tipIndicator);
    
    // Animate the indicator
    const indicatorAnimation = tipIndicator.animate([
      { 
        opacity: 0, 
        transform: 'translateX(-50%) translateY(0) scale(0.8)' 
      },
      { 
        opacity: 1, 
        transform: 'translateX(-50%) translateY(-20px) scale(1)' 
      },
      { 
        opacity: 0, 
        transform: 'translateX(-50%) translateY(-40px) scale(0.9)' 
      }
    ], {
      duration: 2000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });
    
    // Trigger celebration on main element
    triggerAnimation(elementRef.current, 'celebrate', {
      duration: 600,
      scale: 1.15,
    });
    
    // Cleanup
    indicatorAnimation.addEventListener('finish', () => {
      document.body.removeChild(tipIndicator);
      onComplete?.();
    });
  }, [amount, token, triggerAnimation, onComplete]);

  return (
    <MicroInteractionLayer
      interactionType="tip"
      hapticFeedback={true}
      onClick={handleTipAnimation}
    >
      <div ref={elementRef}>
        {children}
      </div>
    </MicroInteractionLayer>
  );
};

// Specialized Vote Animation Component
export const VoteAnimation: React.FC<VoteAnimationProps> = ({
  children,
  voteType,
  isActive = false,
  onVote,
}) => {
  const elementRef = useRef<HTMLDivElement>(null);
  const { triggerAnimation } = useAnimation();

  const handleVote = useCallback(() => {
    if (!elementRef.current) return;

    // Create vote feedback
    const voteIndicator = document.createElement('div');
    voteIndicator.className = 'ce-vote-indicator';
    voteIndicator.innerHTML = voteType === 'upvote' ? '↑' : '↓';
    
    const rect = elementRef.current.getBoundingClientRect();
    voteIndicator.style.cssText = `
      position: fixed;
      top: ${rect.top}px;
      left: ${rect.left + rect.width / 2}px;
      transform: translateX(-50%);
      z-index: var(--ce-z-toast);
      pointer-events: none;
      font-size: 1.5rem;
      color: ${voteType === 'upvote' ? '#10b981' : '#ef4444'};
      font-weight: bold;
    `;
    
    document.body.appendChild(voteIndicator);
    
    // Animate vote indicator
    const indicatorAnimation = voteIndicator.animate([
      { 
        opacity: 0, 
        transform: 'translateX(-50%) translateY(0) scale(0.5)' 
      },
      { 
        opacity: 1, 
        transform: `translateX(-50%) translateY(${voteType === 'upvote' ? '-30px' : '30px'}) scale(1.2)` 
      },
      { 
        opacity: 0, 
        transform: `translateX(-50%) translateY(${voteType === 'upvote' ? '-50px' : '50px'}) scale(0.8)` 
      }
    ], {
      duration: 1000,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
    });
    
    // Trigger animation on main element
    triggerAnimation(elementRef.current, 'celebrate', {
      duration: 300,
      scale: 1.1,
    });
    
    // Cleanup and callback
    indicatorAnimation.addEventListener('finish', () => {
      document.body.removeChild(voteIndicator);
    });
    
    onVote?.(voteType);
  }, [voteType, triggerAnimation, onVote]);

  return (
    <MicroInteractionLayer
      interactionType="vote"
      hapticFeedback={true}
      onClick={handleVote}
      className={isActive ? 'ce-vote-active' : ''}
    >
      <div ref={elementRef} className={`ce-vote-button ce-vote-${voteType}`}>
        {children}
        
        <style jsx>{`
          .ce-vote-button {
            transition: all var(--ce-transition-fast);
          }
          
          .ce-vote-active {
            color: ${voteType === 'upvote' ? '#10b981' : '#ef4444'};
          }
          
          .ce-vote-upvote:hover {
            color: #10b981;
          }
          
          .ce-vote-downvote:hover {
            color: #ef4444;
          }
        `}</style>
      </div>
    </MicroInteractionLayer>
  );
};

// Export all components
export default {
  MicroInteractionLayer,
  TipAnimation,
  VoteAnimation,
};