/**
 * Token Reaction System Types
 * Defines interfaces for the token-based reaction system with 🔥🚀💎 reaction types
 */

export type ReactionType = '🔥' | '🚀' | '💎';

export interface TokenReactionConfig {
  emoji: ReactionType;
  name: string;
  tokenCost: number;
  multiplier: number;
  animation: string;
  description: string;
}

export const REACTION_TYPES: Record<ReactionType, TokenReactionConfig> = {
  '🔥': {
    emoji: '🔥',
    name: 'Fire',
    tokenCost: 1,
    multiplier: 1.5,
    animation: 'flame',
    description: 'Show this content is hot and trending'
  },
  '🚀': {
    emoji: '🚀',
    name: 'Rocket',
    tokenCost: 2,
    multiplier: 2.0,
    animation: 'launch',
    description: 'Boost this content to the moon'
  },
  '💎': {
    emoji: '💎',
    name: 'Diamond',
    tokenCost: 5,
    multiplier: 3.0,
    animation: 'sparkle',
    description: 'Mark this as diamond hands quality'
  }
};

export interface TokenReaction {
  id: string;
  postId: string;
  userId: string;
  type: ReactionType;
  amount: number;
  rewardsEarned: number;
  createdAt: Date;
  user?: {
    id: string;
    walletAddress: string;
    handle?: string;
    avatar?: string;
  };
}

export interface ReactionSummary {
  type: ReactionType;
  totalAmount: number;
  totalCount: number;
  userAmount: number;
  topContributors: Array<{
    userId: string;
    walletAddress: string;
    handle?: string;
    avatar?: string;
    amount: number;
  }>;
  milestones: ReactionMilestone[];
}

export interface ReactionMilestone {
  threshold: number;
  reached: boolean;
  reachedAt?: Date;
  reward: number;
  description: string;
}

export interface ReactionAnalytics {
  postId: string;
  totalReactions: number;
  totalTokensStaked: number;
  totalRewardsDistributed: number;
  reactionBreakdown: Record<ReactionType, {
    count: number;
    totalAmount: number;
    averageAmount: number;
  }>;
  topReactors: Array<{
    userId: string;
    walletAddress: string;
    handle?: string;
    totalAmount: number;
    reactionTypes: ReactionType[];
  }>;
  milestoneProgress: Array<{
    type: ReactionType;
    currentAmount: number;
    nextMilestone: number;
    progress: number;
  }>;
}

export interface ReactorModalData {
  postId: string;
  reactionType?: ReactionType;
  reactions: TokenReaction[];
  totalAmount: number;
  totalCount: number;
  isLoading: boolean;
}

export interface ReactionStakeModalProps {
  isOpen: boolean;
  reactionType: ReactionType;
  postId: string;
  currentUserStake: number;
  onStake: (amount: number) => Promise<void>;
  onClose: () => void;
  isLoading?: boolean;
}

export interface TokenReactionSystemProps {
  postId: string;
  initialReactions?: ReactionSummary[];
  onReaction?: (postId: string, reactionType: ReactionType, amount: number) => Promise<void>;
  onViewReactors?: (postId: string, reactionType?: ReactionType) => void;
  showAnalytics?: boolean;
  className?: string;
}

export interface ReactionButtonProps {
  reactionType: ReactionType;
  summary: ReactionSummary;
  isUserReacted: boolean;
  onClick: () => void;
  className?: string;
}

export interface ReactionAnimationProps {
  type: ReactionType;
  isActive: boolean;
  onComplete?: () => void;
}

// API Request/Response types
export interface CreateReactionRequest {
  postId: string;
  type: ReactionType;
  amount: number;
}

export interface CreateReactionResponse {
  success: boolean;
  reaction: TokenReaction;
  newSummary: ReactionSummary;
  rewardsEarned: number;
  milestoneReached?: ReactionMilestone;
}

export interface GetReactionsRequest {
  postId: string;
  reactionType?: ReactionType;
  limit?: number;
  offset?: number;
}

export interface GetReactionsResponse {
  reactions: TokenReaction[];
  summaries: ReactionSummary[];
  analytics: ReactionAnalytics;
  hasMore: boolean;
}

// Error types
export interface ReactionError {
  code: 'INSUFFICIENT_BALANCE' | 'INVALID_AMOUNT' | 'POST_NOT_FOUND' | 'NETWORK_ERROR' | 'UNKNOWN_ERROR';
  message: string;
  details?: any;
}

// Celebration system types
export interface CelebrationEvent {
  type: 'milestone' | 'first_reaction' | 'big_stake';
  reactionType: ReactionType;
  amount: number;
  milestone?: ReactionMilestone;
  animation: string;
  message: string;
}

export interface CelebrationAnimationProps {
  event: CelebrationEvent;
  onComplete: () => void;
}