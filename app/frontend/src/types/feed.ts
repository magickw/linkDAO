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
  isBookmarked?: boolean;
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

// Infinite scroll state
export interface InfiniteScrollState {
  hasMore: boolean;
  isLoading: boolean;
  page: number;
  totalPages: number;
  error?: string;
}