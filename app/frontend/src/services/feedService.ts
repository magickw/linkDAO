import { 
  EnhancedPost, 
  FeedFilter, 
  FeedSortType, 
  FeedPreferences, 
  CommunityEngagementMetrics,
  LeaderboardEntry,
  LikedByData,
  FeedAnalytics
} from '../types/feed';
import type { TrendingLevel } from '../components/TrendingBadge/TrendingBadge';
import { Post } from '../models/Post';
import { requestManager } from './requestManager';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Enhanced Feed Service
 * Provides advanced feed functionality with sorting, filtering, and engagement features
 */
export class FeedService {
  /**
   * Get enhanced feed with sorting and filtering
   */
  static async getEnhancedFeed(
    filter: FeedFilter,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: EnhancedPost[]; hasMore: boolean; totalPages: number }> {
    try {
      const params = new URLSearchParams({
        sortBy: filter.sortBy,
        page: page.toString(),
        limit: limit.toString(),
      });

      if (filter.timeRange) params.append('timeRange', filter.timeRange);
      if (filter.communityId) params.append('communityId', filter.communityId);
      if (filter.tags?.length) params.append('tags', filter.tags.join(','));
      if (filter.author) params.append('author', filter.author);

      const url = `${BACKEND_API_BASE_URL}/api/feed/enhanced?${params.toString()}`;
      
      const response = await requestManager.request<{
        posts: EnhancedPost[];
        hasMore: boolean;
        totalPages: number;
        analytics: FeedAnalytics;
      }>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, {
        timeout: 15000,
        retries: 2,
        deduplicate: true
      });

      return {
        posts: response.posts.map(post => this.enhancePost(post)),
        hasMore: response.hasMore,
        totalPages: response.totalPages
      };
    } catch (error) {
      console.error('Error fetching enhanced feed:', error);
      
      // Fallback to mock data for development
      return this.getMockEnhancedFeed(filter, page, limit);
    }
  }

  /**
   * Get trending content detection
   */
  static async getTrendingPosts(
    timeRange: string = 'day',
    limit: number = 10
  ): Promise<EnhancedPost[]> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/feed/trending?timeRange=${timeRange}&limit=${limit}`;
      
      const posts = await requestManager.request<EnhancedPost[]>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return posts.map(post => this.enhancePost(post));
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      return this.getMockTrendingPosts();
    }
  }

  /**
   * Get "liked by" data for a post
   */
  static async getLikedByData(postId: string): Promise<LikedByData> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/posts/${postId}/liked-by`;
      
      return await requestManager.request<LikedByData>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching liked by data:', error);
      return this.getMockLikedByData(postId);
    }
  }

  /**
   * Get community engagement metrics
   */
  static async getCommunityEngagementMetrics(
    communityId: string,
    timeRange: string = 'week'
  ): Promise<CommunityEngagementMetrics> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/communities/${communityId}/engagement?timeRange=${timeRange}`;
      
      return await requestManager.request<CommunityEngagementMetrics>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching community engagement metrics:', error);
      return this.getMockCommunityMetrics(communityId);
    }
  }

  /**
   * Get community leaderboard
   */
  static async getCommunityLeaderboard(
    communityId: string,
    metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given' = 'engagement',
    limit: number = 10
  ): Promise<LeaderboardEntry[]> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/communities/${communityId}/leaderboard?metric=${metric}&limit=${limit}`;
      
      return await requestManager.request<LeaderboardEntry[]>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching community leaderboard:', error);
      return this.getMockLeaderboard(communityId);
    }
  }

  /**
   * Save user feed preferences
   */
  static async saveFeedPreferences(preferences: FeedPreferences): Promise<void> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/user/feed-preferences`;
      
      await requestManager.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preferences),
      });
    } catch (error) {
      console.error('Error saving feed preferences:', error);
      // Save to localStorage as fallback
      localStorage.setItem('feedPreferences', JSON.stringify(preferences));
    }
  }

  /**
   * Get user feed preferences
   */
  static async getFeedPreferences(): Promise<FeedPreferences> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/user/feed-preferences`;
      
      return await requestManager.request<FeedPreferences>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching feed preferences:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('feedPreferences');
      if (stored) {
        return JSON.parse(stored);
      }
      
      // Default preferences
      return {
        defaultSort: FeedSortType.HOT,
        defaultTimeRange: 'day',
        autoRefresh: true,
        refreshInterval: 30,
        showSocialProof: true,
        showTrendingBadges: true,
        infiniteScroll: true,
        postsPerPage: 20
      };
    }
  }

  /**
   * Calculate trending status for a post
   */
  private static calculateTrendingStatus(post: EnhancedPost): TrendingLevel | null {
    const { engagementScore, createdAt } = post;
    const hoursOld = (Date.now() - new Date(createdAt).getTime()) / (1000 * 60 * 60);
    
    // Adjust engagement score based on recency
    const recencyMultiplier = Math.max(0.1, 1 - (hoursOld / 24));
    const adjustedScore = engagementScore * recencyMultiplier;
    
    if (adjustedScore > 1000) return 'viral';
    if (adjustedScore > 500) return 'hot';
    if (adjustedScore > 100) return 'rising';
    return null;
  }

  /**
   * Enhance a post with additional data
   */
  private static enhancePost(post: any): EnhancedPost {
    const enhanced: EnhancedPost = {
      ...post,
      reactions: post.reactions || [],
      tips: post.tips || [],
      comments: post.comments || 0,
      shares: post.shares || 0,
      views: post.views || 0,
      engagementScore: post.engagementScore || 0,
      socialProof: post.socialProof || {
        followedUsersWhoEngaged: [],
        totalEngagementFromFollowed: 0,
        communityLeadersWhoEngaged: [],
        verifiedUsersWhoEngaged: []
      },
      previews: post.previews || [],
      isBookmarked: post.isBookmarked || false,
      userReaction: post.userReaction,
      userTipped: post.userTipped || false
    };

    // Calculate trending status
    enhanced.trendingStatus = this.calculateTrendingStatus(enhanced) || undefined;

    return enhanced;
  }

  /**
   * Mock data for development
   */
  private static getMockEnhancedFeed(
    filter: FeedFilter,
    page: number,
    limit: number
  ): { posts: EnhancedPost[]; hasMore: boolean; totalPages: number } {
    const mockPosts: EnhancedPost[] = [
      {
        id: 'mock-enhanced-1',
        author: '0x1234567890123456789012345678901234567890',
        parentId: null,
        contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z4',
        mediaCids: [],
        tags: ['defi', 'trending'],
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
        onchainRef: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        reactions: [
          {
            type: '🔥',
            users: [
              {
                address: '0xuser1',
                username: 'alice',
                avatar: '/avatars/alice.png',
                amount: 5,
                timestamp: new Date()
              }
            ],
            totalAmount: 5,
            tokenType: 'LDAO'
          }
        ],
        tips: [
          {
            from: '0xuser2',
            amount: 10,
            tokenType: 'USDC',
            message: 'Great post!',
            timestamp: new Date()
          }
        ],
        comments: 12,
        shares: 3,
        views: 156,
        engagementScore: 750,
        socialProof: {
          followedUsersWhoEngaged: [
            {
              id: '0xuser1',
              address: '0xuser1',
              username: 'alice',
              displayName: 'Alice Cooper',
              avatar: '/avatars/alice.png',
              verified: true,
              reputation: 850
            }
          ],
          totalEngagementFromFollowed: 1,
          communityLeadersWhoEngaged: [],
          verifiedUsersWhoEngaged: []
        },
        trendingStatus: 'hot',
        previews: [],
        isBookmarked: false,
        userTipped: false
      },
      {
        id: 'mock-enhanced-2',
        author: '0x0987654321098765432109876543210987654321',
        parentId: null,
        contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z5',
        mediaCids: [],
        tags: ['nft', 'art'],
        createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
        onchainRef: '0x0987654321abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        reactions: [
          {
            type: '💎',
            users: [
              {
                address: '0xuser3',
                username: 'bob',
                avatar: '/avatars/bob.png',
                amount: 20,
                timestamp: new Date()
              }
            ],
            totalAmount: 20,
            tokenType: 'LDAO'
          }
        ],
        tips: [],
        comments: 8,
        shares: 1,
        views: 89,
        engagementScore: 320,
        socialProof: {
          followedUsersWhoEngaged: [],
          totalEngagementFromFollowed: 0,
          communityLeadersWhoEngaged: [],
          verifiedUsersWhoEngaged: []
        },
        trendingStatus: 'rising',
        previews: [],
        isBookmarked: true,
        userTipped: false
      }
    ];

    return {
      posts: mockPosts,
      hasMore: page < 3,
      totalPages: 3
    };
  }

  private static getMockTrendingPosts(): EnhancedPost[] {
    return [
      {
        id: 'trending-1',
        author: '0x1111111111111111111111111111111111111111',
        parentId: null,
        contentCid: 'bafybeictrending1',
        mediaCids: [],
        tags: ['viral', 'web3'],
        createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
        onchainRef: '0xtrending1',
        reactions: [
          {
            type: '🚀',
            users: [],
            totalAmount: 150,
            tokenType: 'LDAO'
          }
        ],
        tips: [],
        comments: 45,
        shares: 12,
        views: 2340,
        engagementScore: 1250,
        socialProof: {
          followedUsersWhoEngaged: [],
          totalEngagementFromFollowed: 0,
          communityLeadersWhoEngaged: [],
          verifiedUsersWhoEngaged: []
        },
        trendingStatus: 'viral',
        previews: [],
        isBookmarked: false,
        userTipped: false
      }
    ];
  }

  private static getMockLikedByData(postId: string): LikedByData {
    return {
      postId,
      reactions: [
        {
          address: '0xuser1',
          username: 'alice',
          avatar: '/avatars/alice.png',
          amount: 5,
          timestamp: new Date()
        },
        {
          address: '0xuser2',
          username: 'bob',
          avatar: '/avatars/bob.png',
          amount: 10,
          timestamp: new Date()
        }
      ],
      tips: [
        {
          from: '0xuser3',
          amount: 25,
          tokenType: 'USDC',
          message: 'Excellent content!',
          timestamp: new Date()
        }
      ],
      totalUsers: 15,
      followedUsers: [
        {
          id: '0xuser1',
          address: '0xuser1',
          username: 'alice',
          displayName: 'Alice Cooper',
          avatar: '/avatars/alice.png',
          verified: true,
          reputation: 850
        }
      ]
    };
  }

  private static getMockCommunityMetrics(communityId: string): CommunityEngagementMetrics {
    return {
      communityId,
      totalPosts: 234,
      totalEngagement: 1567,
      topContributors: [
        {
          id: '0xcontributor1',
          address: '0xcontributor1',
          username: 'topuser',
          displayName: 'Top User',
          avatar: '/avatars/topuser.png',
          verified: true,
          reputation: 1200
        }
      ],
      trendingTags: ['defi', 'nft', 'governance'],
      engagementGrowth: 15.3
    };
  }

  private static getMockLeaderboard(communityId: string): LeaderboardEntry[] {
    return [
      {
        rank: 1,
        user: {
          id: '0xleader1',
          address: '0xleader1',
          username: 'leader1',
          displayName: 'Community Leader',
          avatar: '/avatars/leader1.png',
          verified: true,
          reputation: 1500
        },
        score: 2340,
        change: 2,
        metric: 'engagement'
      },
      {
        rank: 2,
        user: {
          id: '0xleader2',
          address: '0xleader2',
          username: 'leader2',
          displayName: 'Active Member',
          avatar: '/avatars/leader2.png',
          verified: false,
          reputation: 1200
        },
        score: 1890,
        change: -1,
        metric: 'engagement'
      }
    ];
  }
}