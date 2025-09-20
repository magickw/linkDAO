import { Post } from '../models/Post';

// Feed sorting options
export enum FeedSortType {
  HOT = 'hot',
  NEW = 'new',
  TOP = 'top',
  RISING = 'rising'
}

// Feed filter options
export interface FeedFilter {
  sortBy: FeedSortType;
  timeRange?: 'hour' | 'day' | 'week' | 'month' | 'year' | 'all';
  communityId?: string;
  tags?: string[];
  author?: string;
}

// Enhanced post with engagement metrics
export interface EnhancedPost extends Post {
  // Engagement metrics
  reactions: TokenReaction[];
  tips: TipActivity[];
  comments: number;
  shares: number;
  views: number;
  engagementScore: number;
  
  // Social proof
  socialProof: SocialProofData;
  trendingStatus?: TrendingLevel;
  
  // Content previews
  previews: ContentPreview[];
  
  // Metadata
  isBookmarked?: boolean;
  userReaction?: string;
  userTipped?: boolean;
}

// Token reaction data
export interface TokenReaction {
  type: '🔥' | '🚀' | '💎' | '👍' | '❤️';
  users: ReactionUser[];
  totalAmount: number;
  tokenType: string;
}

export interface ReactionUser {
  address: string;
  username?: string;
  avatar?: string;
  amount: number;
  timestamp: Date;
}

// Tip activity data
export interface TipActivity {
  from: string;
  amount: number;
  tokenType: string;
  message?: string;
  timestamp: Date;
}

// Social proof data
export interface SocialProofData {
  followedUsersWhoEngaged: UserProfile[];
  totalEngagementFromFollowed: number;
  communityLeadersWhoEngaged: UserProfile[];
  verifiedUsersWhoEngaged: UserProfile[];
}

export interface UserProfile {
  address: string;
  username?: string;
  displayName?: string;
  avatar?: string;
  verified: boolean;
  reputation?: number;
}

// Trending levels
export enum TrendingLevel {
  NONE = 'none',
  RISING = 'rising',
  HOT = 'hot',
  VIRAL = 'viral'
}

// Content preview types
export interface ContentPreview {
  type: 'nft' | 'link' | 'proposal' | 'token';
  data: NFTPreview | LinkPreview | ProposalPreview | TokenPreview;
  thumbnail?: string;
  metadata: Record<string, any>;
}

export interface NFTPreview {
  contractAddress: string;
  tokenId: string;
  name: string;
  description: string;
  image: string;
  collection: string;
  owner: string;
  price?: TokenAmount;
  rarity?: number;
}

export interface LinkPreview {
  url: string;
  title: string;
  description: string;
  image: string;
  siteName: string;
  type: 'article' | 'video' | 'product' | 'website';
  metadata: Record<string, any>;
}

export interface ProposalPreview {
  id: string;
  title: string;
  description: string;
  status: ProposalStatus;
  votingEnds: Date;
  yesVotes: number;
  noVotes: number;
  quorum: number;
  proposer: string;
}

export interface TokenPreview {
  symbol: string;
  name: string;
  amount: number;
  usdValue: number;
  change24h: number;
  logo: string;
  contractAddress: string;
}

export interface TokenAmount {
  amount: number;
  token: string;
  usdValue?: number;
}

export enum ProposalStatus {
  ACTIVE = 'active',
  PASSED = 'passed',
  FAILED = 'failed',
  EXECUTED = 'executed',
  CANCELLED = 'cancelled'
}

// Feed preferences
export interface FeedPreferences {
  defaultSort: FeedSortType;
  defaultTimeRange: string;
  autoRefresh: boolean;
  refreshInterval: number; // in seconds
  showSocialProof: boolean;
  showTrendingBadges: boolean;
  infiniteScroll: boolean;
  postsPerPage: number;
}

// Infinite scroll state
export interface InfiniteScrollState {
  hasMore: boolean;
  isLoading: boolean;
  page: number;
  totalPages: number;
  error?: string;
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

// "Liked by" modal data
export interface LikedByData {
  postId: string;
  reactions: ReactionUser[];
  tips: TipActivity[];
  totalUsers: number;
  followedUsers: UserProfile[];
}

// Feed analytics
export interface FeedAnalytics {
  totalPosts: number;
  totalEngagement: number;
  averageEngagementRate: number;
  topPerformingPosts: EnhancedPost[];
  engagementTrends: EngagementTrend[];
}

export interface EngagementTrend {
  date: Date;
  posts: number;
  reactions: number;
  tips: number;
  comments: number;
  shares: number;
}

// Real-time update types
export interface FeedUpdate {
  type: 'new_post' | 'post_updated' | 'post_deleted' | 'engagement_updated';
  postId: string;
  data?: any;
  timestamp: Date;
}

// Feed error types
export interface FeedError {
  code: string;
  message: string;
  details?: any;
  recoverable: boolean;
}