// Feed types for testing
export enum FeedSortType {
  HOT = 'hot',
  NEW = 'new',
  TOP = 'top',
  RISING = 'rising'
}

export interface FeedFilter {
  sortBy: FeedSortType;
  timeRange?: string;
  communityId?: string;
  tags?: string[];
  author?: string;
}

export interface EnhancedPost {
  id: string;
  author: string;
  contentCid: string;
  mediaCids?: string[];
  tags: string[];
  createdAt: Date;
  updatedAt: Date;
  reactions: Reaction[];
  tips: Tip[];
  comments: number;
  shares: number;
  views: number;
  engagementScore: number;
  previews: ContentPreview[];
  socialProof?: SocialProof;
  trendingStatus?: string | null;
  trendingScore?: number;
  isBookmarked?: boolean;
  communityId?: string;
  contentType?: 'text' | 'media' | 'link' | 'poll' | 'proposal';
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
  type: string;
  url: string;
  data?: any;
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