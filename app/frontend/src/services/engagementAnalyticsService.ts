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
  }

  /**
   * Get engagement trends over time
   */
  static async getEngagementTrends(
    userId?: string,
    timeRange: string = 'week',
    granularity: string = 'day'
  ): Promise<EngagementTrend[]> {
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
  }

  /**
   * Get top performing posts with engagement metrics
   */
  static async getTopPerformingPosts(
    userId?: string,
    timeRange: string = 'week',
    limit: number = 10
  ): Promise<PostEngagementMetrics[]> {
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
  }

  /**
   * Get user engagement profile and insights
   */
  static async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    const url = `${BACKEND_API_BASE_URL}/api/analytics/users/${userId}/engagement-profile`;

    return await requestManager.request<UserEngagementProfile>(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
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
      throw error;
    }
  }

  /**
   * Get social proof indicators for a post
   */
  static async getSocialProofIndicators(postId: string): Promise<SocialProofIndicators> {
    const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/${postId}/social-proof`;

    return await requestManager.request<SocialProofIndicators>(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get engagement aggregates for a post
   */
  static async getEngagementAggregate(
    postId: string,
    timeWindow: string = '1d'
  ): Promise<EngagementAggregate> {
    const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/${postId}/aggregate?timeWindow=${timeWindow}`;

    return await requestManager.request<EngagementAggregate>(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
  }

  /**
   * Get engagement analytics for multiple posts
   */
  static async getBulkPostAnalytics(
    postIds: string[],
    timeRange: string = 'week'
  ): Promise<PostEngagementMetrics[]> {
    const url = `${BACKEND_API_BASE_URL}/api/analytics/posts/bulk`;

    return await requestManager.request<PostEngagementMetrics[]>(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        postIds,
        timeRange
      }),
    });
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
}
