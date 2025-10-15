/**
 * Web3PostInteractions Module
 * Enhanced Web3-native interaction components with visual feedback and animations
 */

export { default as Web3InteractionButtons } from './Web3InteractionButtons';
export { default as EnhancedReactionSystem } from './EnhancedReactionSystem';
export { default as BoostingSystem } from './BoostingSystem';
export { default as EnhancedTipButton } from './EnhancedTipButton';
export { default as UserStakingStatusWidget } from './UserStakingStatusWidget';
export * from './MicroAnimations';

// Re-export types and constants
export type { Web3ReactionType } from './Web3InteractionButtons';
export { WEB3_REACTIONS } from './Web3InteractionButtons';

// Component interfaces for external use
export interface Web3PostInteractionProps {
  postId: string;
  onReaction?: (postId: string, reactionType: string, amount: number) => Promise<void>;
  onTip?: (postId: string, amount: string, token: string) => Promise<void>;
  onBoost?: (postId: string, amount: number, duration: number) => Promise<void>;
  onShare?: (postId: string) => void;
  onBookmark?: (postId: string) => void;
  showAnalytics?: boolean;
  compact?: boolean;
  className?: string;
}