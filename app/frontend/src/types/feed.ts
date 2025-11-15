// Feed types for testing
export enum FeedSortType {
  HOT = 'hot',
  NEW = 'new',
  TOP = 'top',
  RISING = 'rising'
}

export enum Web3SortType {
  TOKEN_ACTIVITY = 'token_activity',
  STAKING_AMOUNT = 'staking_amount',
  GOVERNANCE_RELEVANCE = 'governance_relevance',
  TIP_AMOUNT = 'tip_amount',
  UNIQUE_STAKERS = 'unique_stakers',
  SOCIAL_PROOF = 'social_proof',
  ENGAGEMENT_VELOCITY = 'engagement_velocity',
  COMMUNITY_IMPACT = 'community_impact'
}

export interface FeedFilter {
  sortBy: FeedSortType;
  timeRange?: string;
  communityId?: string;
  communities?: string[];
  tags?: string[];
  author?: string;
  feedSource?: 'following' | 'all';
  userAddress?: string;
  postTypes?: string[];
  web3Sort?: Web3SortType;
  web3SortDirection?: 'asc' | 'desc';
}

// Standardized post interface that matches backend schema
// This can be either a regular Post (with title/dao) or QuickPost (without title/dao)
export interface EnhancedPost {
  id: string;
  author: string;
  authorId?: string; // Optional for compatibility with backend
  handle?: string; // User handle from backend
  parentId: string | null;
  title?: string; // Optional for quickPosts
  contentCid: string;
  mediaCids: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  onchainRef: string;
  stakedValue: number;
  reputationScore: number;
  dao?: string; // Optional for quickPosts
  
  // Engagement data
  reactions: Reaction[];
  tips: Tip[];
  comments: number;
  shares: number;
  views: number;
  engagementScore: number;
  
  // Enhanced features
  previews?: ContentPreview[]; // Made optional
  socialProof?: SocialProof;
  trendingStatus?: string | null;
  trendingScore?: number;
  isBookmarked?: boolean;
  communityId?: string; // Optional for quickPosts
  contentType?: 'text' | 'media' | 'link' | 'poll' | 'proposal';
  
  // Additional fields from backend
  walletAddress?: string;
  profileCid?: string; // For avatar
  moderationStatus?: string;
  moderationWarning?: string;
  riskScore?: string;
  reactionCount?: string;
  tipCount?: string;
  totalTipAmount?: string;
  commentCount?: string;
  viewCount?: string;
  
  // Flag to distinguish quickPosts from regular posts
  isQuickPost?: boolean;
}

export interface Reaction {
  type: string;
  users: ReactionUser[];
  totalAmount: number;
  tokenType: string;
}

export interface ReactionUser {
  address: string;
  username: string;
  avatar: string;
  amount: number;
  timestamp: Date;
}

export interface Tip {
  from: string;
  amount: number;
  tokenType: string;
  message?: string;
  timestamp: Date;
}

export interface ContentPreview {
  id?: string;
  type: string;
  url: string;
  data?: any;
  metadata?: any;
  cached?: boolean;
  securityStatus?: 'safe' | 'warning' | 'danger';
}

export interface SocialProof {
  followedUsersWhoEngaged: User[];
  totalEngagementFromFollowed: number;
  communityLeadersWhoEngaged: User[];
  verifiedUsersWhoEngaged: User[];
}

export interface User {
  id: string;
  address: string;
  username: string;
  displayName: string;
  avatar: string;
  verified: boolean;
  reputation: number;
}

export interface UserProfile {
  id: string;
  address: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  verified?: boolean;
  reputation?: number;
}

// Infinite scroll state
export interface InfiniteScrollState {
  hasMore: boolean;
  isLoading: boolean;
  page: number;
  totalPages: number;
  error?: string;
  refresh?: () => void;
  retry?: () => void;
}

// Community engagement metrics
export interface CommunityEngagementMetrics {
  communityId: string;
  totalPosts: number;
  totalEngagement: number;
  topContributors: UserProfile[];
  trendingTags: string[];
  engagementGrowth: number; // percentage
}

// Leaderboard data
export interface LeaderboardEntry {
  rank: number;
  user: UserProfile;
  score: number;
  change: number; // position change
  metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given';
}

// Liked by modal data
export interface LikedByData {
  reactions: ReactionUser[];
  tips: TipActivity[];
  followedUsers: UserProfile[];
  totalUsers: number;
}

// Tip activity data
export interface TipActivity {
  from: string;
  address: string;
  username?: string;
  avatar?: string;
  amount: number;
  tokenType: string;
  message?: string;
  timestamp: Date;
}

// Analytics tracking interface
export interface FeedAnalyticsEvent {
  eventType: string;
  postId?: string;
  userId?: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// Error handling interface
export interface FeedError {
  code: string;
  message: string;
  timestamp: Date;
  retryable: boolean;
  details?: any;
}