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
  timeRange?: string;
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

// Re-export existing social proof types
export type { 
  SocialProofData,
  UserProfile
} from '../components/SocialProof/SocialProofIndicator';

// Import for use in interfaces
import type { SocialProofData, UserProfile } from '../components/SocialProof/SocialProofIndicator';
import type { TrendingLevel } from '../components/TrendingBadge/TrendingBadge';
import type { ContentPreview } from './contentPreview';

// Re-export existing trending level type
export type { TrendingLevel } from '../components/TrendingBadge/TrendingBadge';

// Re-export existing content preview types
export type { 
  ContentPreview,
  NFTPreview,
  LinkPreview,
  ProposalPreview,
  TokenPreview
} from './contentPreview';

export interface TokenAmount {
  amount: number;
  token: string;
  usdValue?: number;
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