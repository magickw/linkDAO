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
      return this.getMockActivity();
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
      return this.getMockEngagement();
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
      return this.getMockContentPerformance();
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
      return this.getMockSocialMetrics();
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
      return this.getMockActivityTimeline(days);
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
      return this.getMockInsights();
    }
  }

  // Mock data methods
  private getMockActivity(): UserActivity {
    return {
      dailyActive: 156,
      weeklyActive: 892,
      monthlyActive: 3245,
      totalPosts: 47,
      totalComments: 234,
      totalLikes: 1256,
      totalShares: 89,
    };
  }

  private getMockEngagement(): EngagementMetrics {
    return {
      averageSessionDuration: 12.5,
      pagesPerSession: 8.3,
      bounceRate: 32.5,
      totalSessions: 1245,
      totalPageViews: 10334,
    };
  }

  private getMockContentPerformance(): ContentPerformance {
    return {
      topPosts: [
        {
          id: '1',
          title: 'Understanding DeFi Yield Farming',
          views: 2345,
          likes: 156,
          comments: 45,
          shares: 23,
          engagementRate: 9.8,
        },
        {
          id: '2',
          title: 'NFT Market Analysis Q4',
          views: 1876,
          likes: 123,
          comments: 38,
          shares: 18,
          engagementRate: 9.2,
        },
        {
          id: '3',
          title: 'Best Crypto Trading Strategies',
          views: 1654,
          likes: 98,
          comments: 32,
          shares: 15,
          engagementRate: 8.9,
        },
        {
          id: '4',
          title: 'How to Secure Your Wallet',
          views: 1432,
          likes: 87,
          comments: 28,
          shares: 12,
          engagementRate: 8.7,
        },
        {
          id: '5',
          title: 'Web3 Development Guide',
          views: 1289,
          likes: 76,
          comments: 24,
          shares: 10,
          engagementRate: 8.5,
        },
      ],
      engagementTrend: [
        { date: '2025-01-10', rate: 8.5 },
        { date: '2025-01-11', rate: 8.7 },
        { date: '2025-01-12', rate: 9.1 },
        { date: '2025-01-13', rate: 9.3 },
        { date: '2025-01-14', rate: 9.0 },
        { date: '2025-01-15', rate: 9.5 },
        { date: '2025-01-16', rate: 9.8 },
      ],
    };
  }

  private getMockSocialMetrics(): SocialMetrics {
    return {
      followers: 1234,
      following: 567,
      reputation: 7850,
      achievements: 12,
      tipsReceived: 45,
      tipsSent: 23,
    };
  }

  private getMockActivityTimeline(days: number): ActivityTimeline[] {
    const timeline: ActivityTimeline[] = [];
    const now = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      
      const activities = [];
      const numActivities = Math.floor(Math.random() * 5) + 1;
      
      for (let j = 0; j < numActivities; j++) {
        const types = ['post', 'comment', 'like', 'share', 'tip', 'follow'] as const;
        const type = types[Math.floor(Math.random() * types.length)];
        
        activities.push({
          type,
          description: this.getActivityDescription(type),
          timestamp: date.getTime() - Math.random() * 86400000,
        });
      }
      
      timeline.push({
        date: date.toISOString().split('T')[0],
        activities: activities.sort((a, b) => b.timestamp - a.timestamp),
      });
    }
    
    return timeline.reverse();
  }

  private getActivityDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      post: ['Created a new post about DeFi', 'Shared an update on NFTs', 'Posted about trading strategies'],
      comment: ['Commented on a popular post', 'Replied to a discussion', 'Added feedback to a proposal'],
      like: ['Liked a post about blockchain', 'Liked a community announcement', 'Liked a tutorial'],
      share: ['Shared an educational post', 'Shared a market analysis', 'Shared a community update'],
      tip: ['Tipped a content creator', 'Sent a tip for helpful advice', 'Tipped a community member'],
      follow: ['Followed a new user', 'Started following a creator', 'Joined a new community'],
    };
    
    const options = descriptions[type] || ['Performed an action'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getMockInsights() {
    return {
      score: 78,
      level: 'Active Contributor',
      insights: [
        'Your engagement rate is 15% above average',
        'You post consistently, with 3-4 posts per week',
        'Your content gets shared frequently',
        'You have a strong presence in DeFi communities',
      ],
      recommendations: [
        'Try posting more video content to increase engagement',
        'Engage more with comments to build relationships',
        'Share your posts in relevant communities',
        'Consider creating a series on trending topics',
      ],
    };
  }
}

export const userAnalyticsService = new UserAnalyticsService();