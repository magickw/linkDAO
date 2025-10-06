// Mock Feed Service for testing
import { EnhancedPost, FeedFilter, CommunityEngagementMetrics, LeaderboardEntry, LikedByData } from '../types/feed';

export interface FeedResponse {
  posts: EnhancedPost[];
  hasMore: boolean;
  totalPages: number;
}

export class FeedService {
  static async getEnhancedFeed(
    filter: FeedFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<FeedResponse> {
    // Mock implementation for testing
    return {
      posts: [],
      hasMore: false,
      totalPages: 1
    };
  }

  static async getCommunityEngagementMetrics(
    communityId: string,
    timeRange: string = 'week'
  ): Promise<CommunityEngagementMetrics> {
    // Mock implementation for testing
    return {
      communityId,
      totalPosts: 0,
      totalEngagement: 0,
      topContributors: [],
      trendingTags: [],
      engagementGrowth: 0
    };
  }

  static async getCommunityLeaderboard(
    communityId: string,
    metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    // Mock implementation for testing
    return [];
  }

  static async getLikedByData(postId: string): Promise<LikedByData> {
    // Mock implementation for testing
    return {
      reactions: [],
      tips: [],
      followedUsers: [],
      totalUsers: 0
    };
  }

  static async getTrendingPosts(
    timeRange: string = 'day',
    limit: number = 5
  ): Promise<EnhancedPost[]> {
    // Mock implementation for testing
    return [];
  }
}