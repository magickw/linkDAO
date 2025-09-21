import { Post } from '../models/Post';
import { Community } from '../models/Community';
import { UserProfile } from '../models/UserProfile';

// Enhanced search types for the advanced search and discovery system
export interface EnhancedSearchFilters {
  type?: 'all' | 'posts' | 'communities' | 'users' | 'hashtags';
  timeRange?: 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';
  sortBy?: 'relevance' | 'recent' | 'popular' | 'trending';
  category?: string;
  tags?: string[];
  author?: string;
  community?: string;
  hasMedia?: boolean;
  hasPolls?: boolean;
  hasProposals?: boolean;
  minEngagement?: number;
  verified?: boolean;
  location?: string;
}

export interface SearchSuggestion {
  text: string;
  type: 'post' | 'community' | 'user' | 'hashtag' | 'topic';
  count?: number;
  trending?: boolean;
  verified?: boolean;
  avatar?: string;
  description?: string;
}

export interface EnhancedSearchResults {
  posts: EnhancedPost[];
  communities: EnhancedCommunity[];
  users: EnhancedUserProfile[];
  hashtags: HashtagResult[];
  topics: TopicResult[];
  totalResults: number;
  hasMore: boolean;
  searchTime: number;
  suggestions: SearchSuggestion[];
}

export interface EnhancedPost extends Post {
  preview?: ContentPreview;
  engagementMetrics: EngagementMetrics;
  socialProof: SocialProof;
  trendingScore?: number;
  relevanceScore?: number;
  communityInfo?: {
    name: string;
    displayName: string;
    avatar?: string;
  };
  authorInfo?: {
    handle: string;
    avatar?: string;
    reputation?: number;
    badges?: string[];
    verified?: boolean;
  };
}

export interface EnhancedCommunity extends Community {
  engagementMetrics: CommunityEngagementMetrics;
  recentActivity: RecentActivity[];
  recommendationScore?: number;
  mutualConnections?: number;
  trending?: boolean;
  featured?: boolean;
}

export interface EnhancedUserProfile extends UserProfile {
  reputation: UserReputation;
  badges: Badge[];
  mutualConnections: number;
  mutualCommunities: string[];
  activityScore: number;
  lastActive: Date;
  verified: boolean;
  followersCount: number;
  followingCount: number;
  postsCount: number;
}

export interface ContentPreview {
  type: 'text' | 'image' | 'video' | 'link' | 'nft' | 'poll' | 'proposal';
  title?: string;
  description?: string;
  thumbnail?: string;
  metadata?: Record<string, any>;
}

export interface EngagementMetrics {
  views: number;
  likes: number;
  comments: number;
  shares: number;
  tips: number;
  reactions: ReactionCount[];
  engagementRate: number;
  trendingVelocity: number;
}

export interface CommunityEngagementMetrics {
  activeMembers: number;
  postsToday: number;
  postsThisWeek: number;
  averageEngagement: number;
  growthRate: number;
  activityScore: number;
}

export interface ReactionCount {
  type: string;
  count: number;
  emoji: string;
}

export interface SocialProof {
  followedUsersWhoEngaged: UserProfile[];
  totalEngagementFromFollowed: number;
  communityLeadersWhoEngaged: UserProfile[];
  verifiedUsersWhoEngaged: UserProfile[];
}

export interface UserReputation {
  totalScore: number;
  level: number;
  breakdown: {
    posting: number;
    governance: number;
    community: number;
    trading: number;
  };
  rank?: number;
}

export interface Badge {
  id: string;
  name: string;
  description: string;
  icon: string;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  earnedAt: Date;
}

export interface HashtagResult {
  tag: string;
  count: number;
  growth: number;
  trending: boolean;
  relatedTags: string[];
  topPosts: Post[];
  engagementMetrics: {
    totalPosts: number;
    totalEngagement: number;
    averageEngagement: number;
  };
}

export interface TopicResult {
  name: string;
  description: string;
  postCount: number;
  communityCount: number;
  trending: boolean;
  relatedTopics: string[];
  topCommunities: Community[];
  recentPosts: Post[];
}

export interface RecentActivity {
  type: 'post' | 'comment' | 'member_joined' | 'event';
  timestamp: Date;
  description: string;
  user?: UserProfile;
}

export interface CommunityRecommendation {
  community: EnhancedCommunity;
  score: number;
  reason: string;
  type: 'interest_based' | 'activity_based' | 'network_based' | 'trending' | 'similar_members';
  mutualConnections?: number;
  sharedInterests?: string[];
}

export interface UserRecommendation {
  user: EnhancedUserProfile;
  score: number;
  reason: string;
  type: 'mutual_connections' | 'shared_interests' | 'similar_activity' | 'community_based';
  mutualConnections?: number;
  mutualCommunities?: string[];
  sharedInterests?: string[];
}

export interface DiscoveryContent {
  trending: {
    posts: EnhancedPost[];
    communities: EnhancedCommunity[];
    hashtags: HashtagResult[];
    topics: TopicResult[];
  };
  recommendations: {
    communities: CommunityRecommendation[];
    users: UserRecommendation[];
    posts: EnhancedPost[];
  };
  personalized: {
    forYou: EnhancedPost[];
    basedOnActivity: EnhancedPost[];
    fromNetwork: EnhancedPost[];
  };
}

export interface SearchAnalytics {
  query: string;
  filters: EnhancedSearchFilters;
  resultCount: number;
  clickThroughRate: number;
  searchTime: number;
  timestamp: Date;
  userId?: string;
  sessionId: string;
}

export interface LearningData {
  userId: string;
  searchQueries: string[];
  clickedResults: Array<{
    type: 'post' | 'community' | 'user';
    id: string;
    position: number;
    timestamp: Date;
  }>;
  engagementPatterns: {
    preferredContentTypes: string[];
    activeTimeRanges: string[];
    favoriteTopics: string[];
    communityInterests: string[];
  };
  preferences: {
    sortPreference: string;
    filterPreferences: Record<string, any>;
    contentPreferences: string[];
  };
}

export interface BookmarkItem {
  id: string;
  type: 'post' | 'community' | 'user' | 'hashtag' | 'topic';
  itemId: string;
  title: string;
  description?: string;
  thumbnail?: string;
  tags: string[];
  createdAt: Date;
  folder?: string;
}

export interface FollowAction {
  type: 'follow' | 'unfollow';
  targetType: 'user' | 'community' | 'hashtag' | 'topic';
  targetId: string;
  timestamp: Date;
}

export interface JoinAction {
  type: 'join' | 'leave';
  communityId: string;
  timestamp: Date;
}