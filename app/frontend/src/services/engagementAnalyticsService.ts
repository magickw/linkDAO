import type {
  EngagementAnalytics,
  EngagementTrend,
  PostEngagementMetrics,
  UserEngagementProfile,
  EngagementInteraction,
  EngagementAggregate,
  SocialProofIndicators,
  EngagementAnalyticsResponse,
  EngagementTrendsResponse,
  TopPostsResponse
} from '../types/engagementAnalytics';
import { requestManager } from './requestManager';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Engagement Analytics Service
 * Handles social proof tracking, engagement analytics, and user interaction metrics
 */
export class EngagementAnalyticsService {
  /**
   * Get comprehensive engagement analytics for a user or global
   */
  static async getEngagementAnalytics(
    userId?: string,
    timeRange: string = 'week'
  ): Promise<EngagementAnalytics> {
    try {
      const params = new URLSearchParams({
        timeRange
      });
      
      if (userId) {
        params.append('userId', userId);
      }

      const url = `${BACKEND_API_BASE_URL}/api/analytics/engagement?${params.toString()}`;
      
      const response = await requestManager.request<EngagementAnalyticsResponse>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      }, {
        timeout: 15000,
        retries: 2,
        deduplicate: true
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching engagement analytics:', error);
      return this.getMockEngagementAnalytics(userId, timeRange);
    }
  }

  /**
   * Get engagement trends over time
   */
  static async getEngagementTrends(
    userId?: string,
    timeRange: string = 'week',
    granularity: string = 'day'
  ): Promise<EngagementTrend[]> {
    try {
      const params = new URLSearchParams({
        timeRange,
        granularity
      });
      
      if (userId) {
        params.append('userId', userId);
      }

      const url = `${BACKEND_API_BASE_URL}/api/analytics/engagement/trends?${params.toString()}`;
      
      const response = await requestManager.request<EngagementTrendsResponse>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching engagement trends:', error);
      return this.getMockEngagementTrends(timeRange);
    }
  }

  /**
   * Get top performing posts with engagement metrics
   */
  static async getTopPerformingPosts(
    userId?: string,
    timeRange: string = 'week',
    limit: number = 10
  ): Promise<PostEngagementMetrics[]> {
    try {
      const params = new URLSearchParams({
        timeRange,
        limit: limit.toString()
      });
      
      if (userId) {
        params.append('userId', userId);
      }

      const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/top-performing?${params.toString()}`;
      
      const response = await requestManager.request<TopPostsResponse>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching top performing posts:', error);
      return this.getMockTopPerformingPosts(userId);
    }
  }

  /**
   * Get user engagement profile and insights
   */
  static async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/analytics/users/${userId}/engagement-profile`;
      
      return await requestManager.request<UserEngagementProfile>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching user engagement profile:', error);
      return this.getMockUserEngagementProfile(userId);
    }
  }

  /**
   * Track a new engagement interaction
   */
  static async trackEngagementInteraction(interaction: Omit<EngagementInteraction, 'id' | 'timestamp'>): Promise<void> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/analytics/engagement/track`;
      
      await requestManager.request(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...interaction,
          timestamp: new Date()
        }),
      });
    } catch (error) {
      console.error('Error tracking engagement interaction:', error);
      // Store in local queue for retry
      this.queueInteractionForRetry(interaction);
    }
  }

  /**
   * Get social proof indicators for a post
   */
  static async getSocialProofIndicators(postId: string): Promise<SocialProofIndicators> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/${postId}/social-proof`;
      
      return await requestManager.request<SocialProofIndicators>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching social proof indicators:', error);
      return this.getMockSocialProofIndicators(postId);
    }
  }

  /**
   * Get engagement aggregates for a post
   */
  static async getEngagementAggregate(
    postId: string,
    timeWindow: string = '1d'
  ): Promise<EngagementAggregate> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/${postId}/aggregate?timeWindow=${timeWindow}`;
      
      return await requestManager.request<EngagementAggregate>(url, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
    } catch (error) {
      console.error('Error fetching engagement aggregate:', error);
      return this.getMockEngagementAggregate(postId, timeWindow);
    }
  }

  /**
   * Get engagement analytics for multiple posts
   */
  static async getBulkPostAnalytics(
    postIds: string[],
    timeRange: string = 'week'
  ): Promise<PostEngagementMetrics[]> {
    try {
      const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/bulk`;
      
      return await requestManager.request<PostEngagementMetrics[]>(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          postIds,
          timeRange
        }),
      });
    } catch (error) {
      console.error('Error fetching bulk post analytics:', error);
      return postIds.map(id => this.getMockPostEngagementMetrics(id));
    }
  }

  /**
   * Calculate social proof score for a post
   */
  static calculateSocialProofScore(indicators: SocialProofIndicators): number {
    const {
      totalFollowerEngagement,
      totalVerifiedEngagement,
      totalLeaderEngagement,
      verifiedEngagementBoost,
      leaderEngagementBoost
    } = indicators;

    // Base score from follower engagement
    let score = totalFollowerEngagement * 1.0;
    
    // Boost from verified users
    score += totalVerifiedEngagement * verifiedEngagementBoost;
    
    // Boost from community leaders
    score += totalLeaderEngagement * leaderEngagementBoost;
    
    return Math.round(score);
  }

  /**
   * Determine social proof level based on score
   */
  static getSocialProofLevel(score: number): 'low' | 'medium' | 'high' | 'exceptional' {
    if (score >= 1000) return 'exceptional';
    if (score >= 500) return 'high';
    if (score >= 100) return 'medium';
    return 'low';
  }

  /**
   * Queue interaction for retry when API is unavailable
   */
  private static queueInteractionForRetry(interaction: Omit<EngagementInteraction, 'id' | 'timestamp'>): void {
    try {
      const queue = JSON.parse(localStorage.getItem('engagementQueue') || '[]');
      queue.push({
        ...interaction,
        timestamp: new Date().toISOString(),
        retryCount: 0
      });
      localStorage.setItem('engagementQueue', JSON.stringify(queue));
    } catch (error) {
      console.error('Error queuing interaction for retry:', error);
    }
  }

  /**
   * Process queued interactions
   */
  static async processQueuedInteractions(): Promise<void> {
    try {
      const queue = JSON.parse(localStorage.getItem('engagementQueue') || '[]');
      if (queue.length === 0) return;

      const processedIds: number[] = [];
      
      for (let i = 0; i < queue.length; i++) {
        const interaction = queue[i];
        try {
          await this.trackEngagementInteraction(interaction);
          processedIds.push(i);
        } catch (error) {
          // Increment retry count
          interaction.retryCount = (interaction.retryCount || 0) + 1;
          
          // Remove if too many retries
          if (interaction.retryCount > 3) {
            processedIds.push(i);
          }
        }
      }

      // Remove processed interactions
      const remainingQueue = queue.filter((_: any, index: number) => !processedIds.includes(index));
      localStorage.setItem('engagementQueue', JSON.stringify(remainingQueue));
    } catch (error) {
      console.error('Error processing queued interactions:', error);
    }
  }

  // Mock data methods for development
  private static getMockEngagementAnalytics(userId?: string, timeRange: string = 'week'): EngagementAnalytics {
    return {
      totalEngagement: 1567,
      totalReach: 12340,
      engagementRate: 12.7,
      totalTipsReceived: 245,
      
      reactions: 890,
      comments: 234,
      shares: 123,
      tips: 320,
      
      engagementChange: 15.3,
      reachChange: 8.7,
      engagementRateChange: 2.1,
      tipsChange: 23.4,
      
      verifiedUserEngagement: 45,
      communityLeaderEngagement: 23,
      followerEngagement: 156,
      
      timeRange,
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date()
    };
  }

  private static getMockEngagementTrends(timeRange: string): EngagementTrend[] {
    const trends: EngagementTrend[] = [];
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 1;
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date,
        posts: Math.floor(Math.random() * 10) + 1,
        reactions: Math.floor(Math.random() * 100) + 20,
        comments: Math.floor(Math.random() * 50) + 5,
        shares: Math.floor(Math.random() * 20) + 2,
        tips: Math.floor(Math.random() * 30) + 5,
        reach: Math.floor(Math.random() * 1000) + 200,
        engagementRate: Math.random() * 20 + 5
      });
    }
    
    return trends;
  }

  private static getMockTopPerformingPosts(userId?: string): PostEngagementMetrics[] {
    return [
      {
        postId: 'post-1',
        content: 'Just launched my new DeFi project! 🚀 Check out the innovative yield farming mechanism...',
        createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        reactions: 156,
        comments: 34,
        shares: 12,
        tips: 8,
        views: 2340,
        engagementScore: 890,
        verifiedUserInteractions: 5,
        communityLeaderInteractions: 3,
        followerInteractions: 23,
        isTopPerforming: true,
        trendingStatus: 'hot'
      },
      {
        postId: 'post-2',
        content: 'Thoughts on the latest NFT market trends? The data shows some interesting patterns...',
        createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        reactions: 89,
        comments: 45,
        shares: 6,
        tips: 12,
        views: 1567,
        engagementScore: 567,
        verifiedUserInteractions: 2,
        communityLeaderInteractions: 4,
        followerInteractions: 18,
        isTopPerforming: true,
        trendingStatus: 'rising'
      }
    ];
  }

  private static getMockUserEngagementProfile(userId: string): UserEngagementProfile {
    return {
      userId,
      totalPosts: 234,
      averageEngagementRate: 12.7,
      bestPerformingTime: '2:00 PM - 4:00 PM',
      mostEngagedContentType: 'DeFi Analysis',
      
      audienceBreakdown: {
        verified: 15,
        leaders: 8,
        regular: 77
      },
      
      engagementPatterns: {
        peakHours: [14, 15, 16, 20, 21],
        peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
        seasonalTrends: [
          {
            period: 'Q1',
            engagementMultiplier: 1.2,
            topContentTypes: ['DeFi', 'Analysis']
          }
        ]
      },
      
      socialProofImpact: {
        verifiedUserBoost: 2.5,
        leaderBoost: 1.8,
        followerNetworkBoost: 1.3
      }
    };
  }

  private static getMockSocialProofIndicators(postId: string): SocialProofIndicators {
    return {
      postId,
      
      followedUsersWhoEngaged: [
        {
          userId: 'user-1',
          username: 'alice_crypto',
          displayName: 'Alice Cooper',
          avatar: '/avatars/alice.png',
          interactionType: 'reaction',
          interactionValue: 5,
          timestamp: new Date(),
          followingSince: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          mutualFollowers: 12,
          engagementHistory: 0.8
        }
      ],
      totalFollowerEngagement: 23,
      followerEngagementRate: 0.15,
      
      verifiedUsersWhoEngaged: [
        {
          userId: 'verified-1',
          username: 'vitalik_eth',
          displayName: 'Vitalik Buterin',
          avatar: '/avatars/vitalik.png',
          verificationType: 'expert',
          verificationBadge: '✓',
          followerCount: 1000000,
          interactionType: 'comment',
          timestamp: new Date(),
          influenceScore: 95,
          socialProofWeight: 10
        }
      ],
      totalVerifiedEngagement: 5,
      verifiedEngagementBoost: 3.0,
      
      communityLeadersWhoEngaged: [
        {
          userId: 'leader-1',
          username: 'defi_mod',
          displayName: 'DeFi Moderator',
          avatar: '/avatars/mod.png',
          communityId: 'defi-community',
          communityName: 'DeFi Enthusiasts',
          leadershipRole: 'moderator',
          leadershipBadge: '👑',
          communityReputation: 850,
          communityContributions: 234,
          interactionType: 'tip',
          interactionValue: 10,
          timestamp: new Date(),
          communityInfluence: 75,
          socialProofWeight: 5
        }
      ],
      totalLeaderEngagement: 8,
      leaderEngagementBoost: 2.0,
      
      socialProofScore: 156,
      socialProofLevel: 'medium',
      
      showFollowerNames: true,
      showVerifiedBadges: true,
      showLeaderBadges: true,
      maxDisplayCount: 5
    };
  }

  private static getMockEngagementAggregate(postId: string, timeWindow: string): EngagementAggregate {
    return {
      postId,
      timeWindow,
      
      totalInteractions: 234,
      uniqueUsers: 156,
      
      socialProofScore: 345,
      influenceScore: 67,
      engagementVelocity: 12.5,
      
      verifiedUserInteractions: 5,
      communityLeaderInteractions: 8,
      followerInteractions: 23,
      regularUserInteractions: 198,
      
      reactions: 89,
      comments: 34,
      shares: 12,
      tips: 8,
      views: 1567,
      
      windowStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      windowEnd: new Date(),
      lastUpdated: new Date()
    };
  }

  private static getMockPostEngagementMetrics(postId: string): PostEngagementMetrics {
    return {
      postId,
      content: 'Mock post content for analytics...',
      createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
      reactions: Math.floor(Math.random() * 100) + 10,
      comments: Math.floor(Math.random() * 50) + 5,
      shares: Math.floor(Math.random() * 20) + 1,
      tips: Math.floor(Math.random() * 15) + 1,
      views: Math.floor(Math.random() * 1000) + 100,
      engagementScore: Math.floor(Math.random() * 500) + 50,
      verifiedUserInteractions: Math.floor(Math.random() * 5),
      communityLeaderInteractions: Math.floor(Math.random() * 8),
      followerInteractions: Math.floor(Math.random() * 25),
      isTopPerforming: Math.random() > 0.7,
      trendingStatus: Math.random() > 0.8 ? 'hot' : Math.random() > 0.6 ? 'rising' : undefined
    };
  }
}