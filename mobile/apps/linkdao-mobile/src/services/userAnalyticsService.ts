/**
 * User Analytics Service
 * Provides analytics data for users
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface UserActivity {
  dailyActive: number;
  weeklyActive: number;
  monthlyActive: number;
  totalPosts: number;
  totalComments: number;
  totalLikes: number;
  totalShares: number;
}

export interface EngagementMetrics {
  averageSessionDuration: number;
  pagesPerSession: number;
  bounceRate: number;
  totalSessions: number;
  totalPageViews: number;
}

export interface ContentPerformance {
  topPosts: Array<{
    id: string;
    title: string;
    views: number;
    likes: number;
    comments: number;
    shares: number;
    engagementRate: number;
  }>;
  engagementTrend: Array<{
    date: string;
    rate: number;
  }>;
}

export interface SocialMetrics {
  followers: number;
  following: number;
  reputation: number;
  achievements: number;
  tipsReceived: number;
  tipsSent: number;
}

export interface ActivityTimeline {
  date: string;
  activities: Array<{
    type: 'post' | 'comment' | 'like' | 'share' | 'tip' | 'follow';
    description: string;
    timestamp: number;
  }>;
}

class UserAnalyticsService {
  private baseUrl = `${ENV.BACKEND_URL}/api/analytics`;

  /**
   * Get user activity summary
   */
  async getActivitySummary(timeframe: 'day' | 'week' | 'month' = 'week'): Promise<UserActivity | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/activity`, {
        params: { timeframe }
      });
      const data = response.data.data || response.data;
      return {
        dailyActive: data.dailyActive || 0,
        weeklyActive: data.weeklyActive || 0,
        monthlyActive: data.monthlyActive || 0,
        totalPosts: data.totalPosts || 0,
        totalComments: data.totalComments || 0,
        totalLikes: data.totalLikes || 0,
        totalShares: data.totalShares || 0,
      };
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      return null;
    }
  }

  /**
   * Get engagement metrics
   */
  async getEngagementMetrics(): Promise<EngagementMetrics | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/engagement`);
      const data = response.data.data || response.data;
      return {
        averageSessionDuration: data.averageSessionDuration || 0,
        pagesPerSession: data.pagesPerSession || 0,
        bounceRate: data.bounceRate || 0,
        totalSessions: data.totalSessions || 0,
        totalPageViews: data.totalPageViews || 0,
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      return null;
    }
  }

  /**
   * Get content performance
   */
  async getContentPerformance(limit: number = 5): Promise<ContentPerformance | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/content`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return {
        topPosts: data.topPosts || [],
        engagementTrend: data.engagementTrend || [],
      };
    } catch (error) {
      console.error('Error fetching content performance:', error);
      return null;
    }
  }

  /**
   * Get social metrics
   */
  async getSocialMetrics(): Promise<SocialMetrics | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/social`);
      const data = response.data.data || response.data;
      return {
        followers: data.followers || 0,
        following: data.following || 0,
        reputation: data.reputation || 0,
        achievements: data.achievements || 0,
        tipsReceived: data.tipsReceived || 0,
        tipsSent: data.tipsSent || 0,
      };
    } catch (error) {
      console.error('Error fetching social metrics:', error);
      return null;
    }
  }

  /**
   * Get activity timeline
   */
  async getActivityTimeline(days: number = 7): Promise<ActivityTimeline[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/timeline`, {
        params: { days }
      });
      const data = response.data.data || response.data;
      return data.timeline || data || [];
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
      return [];
    }
  }

  /**
   * Get user insights and recommendations
   */
  async getInsights(): Promise<{
    score: number;
    level: string;
    insights: string[];
    recommendations: string[];
  } | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/insights`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching insights:', error);
      return null;
    }
  }
}

export const userAnalyticsService = new UserAnalyticsService();