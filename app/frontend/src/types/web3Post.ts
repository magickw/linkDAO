/**
 * Enhanced post data types with Web3 integration
 */

import { TokenActivity, StakingInfo } from './tokenActivity';
import { OnChainProof } from './onChainVerification';

export type PostType = 'governance' | 'discussion' | 'showcase' | 'announcement' | 'poll';
export type Web3Reaction = '🔥' | '💎' | '🚀' | '👍' | '❤️' | '💯';

export interface PostWithWeb3Data {
  id: string;
  title: string;
  content: string;
  author: string;
  authorENS?: string;
  authorAvatar?: string;
  communityId: string;
  
  // Post classification
  postType: PostType;
  tags?: string[];
  
  // Engagement metrics
  engagementScore: number;
  viewCount: number;
  commentCount: number;
  
  // Web3 specific data
  stakingInfo: StakingInfo;
  tokenActivity?: TokenActivity[];
  onChainProof?: OnChainProof;
  web3Reactions?: Web3ReactionSummary;
  
  // Status indicators
  isPinned: boolean;
  isFeatured: boolean;
  isTrending: boolean;
  trendingRank?: number;
  
  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  lastActivityAt: Date;
  
  // User interaction state
  userHasVoted?: boolean;
  userVoteType?: 'up' | 'down';
  userHasStaked?: boolean;
  userStakeAmount?: number;
  userHasReacted?: boolean;
  userReactions?: Web3Reaction[];
  userHasTipped?: boolean;
  userTipAmount?: number;
}

export type Web3ReactionSummary = {
  [key in Web3Reaction]: {
    count: number;
    totalValue?: number;
    topReactors?: string[];
  };
};

export interface EngagementMetrics {
  totalVotes: number;
  upvotePercentage: number;
  totalStaked: number;
  totalTipped: number;
  totalReactions: number;
  commentEngagement: number;
  shareCount: number;
  viewToEngagementRatio: number;
}

export interface PostVisibilityBoost {
  stakingBoost: number;
  engagementBoost: number;
  communityBoost: number;
  timeDecay: number;
  totalBoost: number;
  rank: number;
}

export interface TrendingIndicator {
  isTrending: boolean;
  trendingIn: string; // community name
  trendingReason: 'engagement' | 'staking' | 'velocity' | 'controversy';
  trendingScore: number;
  trendingDuration: number;
}

export interface PostInteractionOptions {
  canVote: boolean;
  canStake: boolean;
  canTip: boolean;
  canReact: boolean;
  canComment: boolean;
  canShare: boolean;
  canReport: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canPin: boolean;
  canFeature: boolean;
}

export interface PostCreationRequest {
  title: string;
  content: string;
  postType: PostType;
  communityId: string;
  tags?: string[];
  initialStake?: number;
  stakingToken?: string;
  attachments?: PostAttachment[];
}

export interface PostAttachment {
  type: 'image' | 'video' | 'document' | 'link' | 'nft' | 'token';
  url: string;
  metadata?: AttachmentMetadata;
}

export interface AttachmentMetadata {
  title?: string;
  description?: string;
  thumbnail?: string;
  size?: number;
  duration?: number;
  tokenAddress?: string;
  nftContract?: string;
  nftTokenId?: string;
}

// Community Web3 Data Types
export interface CommunityWithWeb3Data {
  id: string;
  name: string;
  description: string;
  icon: string;
  memberCount: number;
  isActive: boolean;
  
  // User-specific data
  userRole?: 'admin' | 'moderator' | 'member';
  userTokenBalance?: number;
  governanceNotifications?: number;
  
  // Token requirements
  tokenRequirement?: TokenRequirement;
  
  // Activity metrics (for compatibility with existing code)
  activityMetrics?: {
    engagementRate: number;
    trendingScore: number;
  };
  
  // User membership (for compatibility with existing code)
  userMembership?: {
    isJoined: boolean;
    tokenBalance: number;
    reputation: number;
  };
}

export interface TokenRequirement {
  tokenAddress: string;
  minimumBalance: number;
  tokenSymbol: string;
  tokenName: string;
}

export interface UserRoleMap {
  [communityId: string]: 'admin' | 'moderator' | 'member';
}

export interface TokenBalanceMap {
  [communityId: string]: number;
}