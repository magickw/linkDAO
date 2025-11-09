/**
 * User Activity Service
 * Tracks user activity across all features and provides analytics
 * Implements requirements 4.7, 6.2, 6.3 from the interconnected social platform spec
 */

export interface UserActivity {
  id: string;
  userId: string;
  activityType: 'post_create' | 'post_like' | 'post_comment' | 'post_share' | 
                 'community_join' | 'community_leave' | 'community_post' |
                 'message_send' | 'message_read' | 'profile_view' | 'search' |
                 'governance_vote' | 'tip_send' | 'tip_receive';
  targetType: 'post' | 'community' | 'user' | 'message' | 'proposal';
  targetId: string;
  metadata: Record<string, any>;
  timestamp: Date;
  sessionId: string;
  deviceInfo?: {
    userAgent: string;
    platform: string;
    isMobile: boolean;
  };
}

export interface UserEngagementMetrics {
  totalActivities: number;
  dailyActiveStreak: number;
  postsCreated: number;
  communitiesJoined: number;
  messagesExchanged: number;
  reputationScore: number;
  engagementRate: number;
  lastActiveAt: Date;
  topCategories: Array<{
    category: string;
    count: number;
    percentage: number;
  }>;
}

export interface UserRecommendations {
  suggestedUsers: Array<{
    address: string;
    name: string;
    avatarUrl?: string;
    mutualConnections: number;
    similarityScore: number;
    reason: string;
  }>;
  suggestedCommunities: Array<{
    id: string;
    name: string;
    description: string;
    iconUrl?: string;
    memberCount: number;
    relevanceScore: number;
    reason: string;
  }>;
  suggestedContent: Array<{
    id: string;
    type: 'post' | 'proposal';
    title: string;
    description: string;
    authorName: string;
    relevanceScore: number;
    reason: string;
  }>;
}

class UserActivityService {
  private static instance: UserActivityService;
  private baseUrl = '/api/user-activity';
  private sessionId: string;
  private activityQueue: UserActivity[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  static getInstance(): UserActivityService {
    if (!UserActivityService.instance) {
      UserActivityService.instance = new UserActivityService();
    }
    return UserActivityService.instance;
  }

  constructor() {
    this.sessionId = this.generateSessionId();
    this.startActivityFlushing();
    this.setupBeforeUnloadHandler();
  }

  /**
   * Track user activity
   */
  async trackActivity(
    activityType: UserActivity['activityType'],
    targetType: UserActivity['targetType'],
    targetId: string,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    try {
      const activity: Omit<UserActivity, 'id' | 'userId'> = {
        activityType,
        targetType,
        targetId,
        metadata: {
          ...metadata,
          url: window.location.href,
          referrer: document.referrer,
        },
        timestamp: new Date(),
        sessionId: this.sessionId,
        deviceInfo: this.getDeviceInfo(),
      };

      // Add to queue for batch processing
      this.activityQueue.push(activity as UserActivity);

      // Flush immediately for critical activities
      if (this.isCriticalActivity(activityType)) {
        await this.flushActivityQueue();
      }
    } catch (error) {
      console.error('Error tracking activity:', error);
    }
  }

  /**
   * Get user engagement metrics
   */
  async getUserEngagementMetrics(
    userAddress: string,
    timeRange: '24h' | '7d' | '30d' | '90d' = '30d'
  ): Promise<UserEngagementMetrics> {
    try {
      const response = await fetch(
        `${this.baseUrl}/metrics/${userAddress}?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch engagement metrics');
      }

      const data = await response.json();
      return {
        ...data,
        lastActiveAt: new Date(data.lastActiveAt),
      };
    } catch (error) {
      console.error('Error fetching engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Get user activity timeline
   */
  async getUserActivityTimeline(
    userAddress: string,
    options: {
      page?: number;
      limit?: number;
      activityTypes?: UserActivity['activityType'][];
      startDate?: Date;
      endDate?: Date;
    } = {}
  ): Promise<{
    activities: UserActivity[];
    totalCount: number;
    hasMore: boolean;
  }> {
    try {
      const params = new URLSearchParams();
      
      if (options.page) params.append('page', options.page.toString());
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.activityTypes) {
        options.activityTypes.forEach(type => params.append('activityTypes', type));
      }
      if (options.startDate) params.append('startDate', options.startDate.toISOString());
      if (options.endDate) params.append('endDate', options.endDate.toISOString());

      const response = await fetch(
        `${this.baseUrl}/timeline/${userAddress}?${params.toString()}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activity timeline');
      }

      const data = await response.json();
      return {
        activities: data.activities.map((activity: any) => ({
          ...activity,
          timestamp: new Date(activity.timestamp),
        })),
        totalCount: data.totalCount,
        hasMore: data.hasMore,
      };
    } catch (error) {
      console.error('Error fetching activity timeline:', error);
      throw error;
    }
  }

  /**
   * Get personalized recommendations
   */
  async getPersonalizedRecommendations(
    userAddress: string
  ): Promise<UserRecommendations> {
    try {
      const response = await fetch(
        `${this.baseUrl}/recommendations/${userAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch recommendations');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      throw error;
    }
  }

  /**
   * Get user reputation score and breakdown
   */
  async getUserReputation(userAddress: string): Promise<{
    totalScore: number;
    breakdown: {
      postQuality: number;
      communityParticipation: number;
      helpfulness: number;
      consistency: number;
      leadership: number;
    };
    badges: Array<{
      id: string;
      name: string;
      description: string;
      iconUrl: string;
      earnedAt: Date;
      rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    }>;
    nextMilestone: {
      name: string;
      requiredScore: number;
      progress: number;
    };
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/reputation/${userAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch user reputation');
      }

      const data = await response.json();
      return {
        ...data,
        badges: data.badges.map((badge: any) => ({
          ...badge,
          earnedAt: new Date(badge.earnedAt),
        })),
      };
    } catch (error) {
      console.error('Error fetching user reputation:', error);
      throw error;
    }
  }

  /**
   * Get activity analytics for dashboard
   */
  async getActivityAnalytics(
    userAddress: string,
    timeRange: '24h' | '7d' | '30d' = '7d'
  ): Promise<{
    totalActivities: number;
    activitiesByType: Record<string, number>;
    activitiesByDay: Array<{
      date: string;
      count: number;
    }>;
    engagementTrend: Array<{
      date: string;
      engagementRate: number;
    }>;
    topInteractions: Array<{
      targetType: string;
      targetId: string;
      targetTitle: string;
      interactionCount: number;
    }>;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/analytics/${userAddress}?timeRange=${timeRange}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch activity analytics');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching activity analytics:', error);
      throw error;
    }
  }

  /**
   * Get cross-feature activity insights
   */
  async getCrossFeatureInsights(
    userAddress: string
  ): Promise<{
    featureUsage: {
      feed: { usage: number; trend: 'up' | 'down' | 'stable' };
      communities: { usage: number; trend: 'up' | 'down' | 'stable' };
      messaging: { usage: number; trend: 'up' | 'down' | 'stable' };
      governance: { usage: number; trend: 'up' | 'down' | 'stable' };
    };
    crossFeatureConnections: Array<{
      fromFeature: string;
      toFeature: string;
      connectionCount: number;
      examples: string[];
    }>;
    recommendedFeatures: Array<{
      feature: string;
      reason: string;
      potentialBenefit: string;
    }>;
  }> {
    try {
      const response = await fetch(
        `${this.baseUrl}/cross-feature-insights/${userAddress}`,
        {
          headers: {
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch cross-feature insights');
      }

      return await response.json();
    } catch (error) {
      console.error('Error fetching cross-feature insights:', error);
      throw error;
    }
  }

  /**
   * Update user preferences based on activity
   */
  async updateUserPreferences(
    userAddress: string,
    preferences: {
      contentTypes: string[];
      communityCategories: string[];
      notificationFrequency: 'high' | 'medium' | 'low';
      privacyLevel: 'public' | 'friends' | 'private';
    }
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.baseUrl}/preferences/${userAddress}`,
        {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getAuthToken()}`,
          },
          body: JSON.stringify(preferences),
        }
      );

      if (!response.ok) {
        throw new Error('Failed to update user preferences');
      }
    } catch (error) {
      console.error('Error updating user preferences:', error);
      throw error;
    }
  }

  // Private helper methods

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getDeviceInfo() {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      ),
    };
  }

  private isCriticalActivity(activityType: UserActivity['activityType']): boolean {
    const criticalActivities = [
      'post_create',
      'community_join',
      'message_send',
      'governance_vote',
      'tip_send',
    ];
    return criticalActivities.includes(activityType);
  }

  private async flushActivityQueue(): Promise<void> {
    if (this.activityQueue.length === 0) return;

    try {
      const activities = [...this.activityQueue];
      this.activityQueue = [];

      const response = await fetch(`${this.baseUrl}/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.getAuthToken()}`,
        },
        body: JSON.stringify({ activities }),
      });

      if (!response.ok) {
        // Re-add activities to queue if request failed
        this.activityQueue.unshift(...activities);
        throw new Error('Failed to flush activity queue');
      }
    } catch (error) {
      console.error('Error flushing activity queue:', error);
    }
  }

  private startActivityFlushing(): void {
    // Flush activities every 30 seconds
    this.flushInterval = setInterval(() => {
      this.flushActivityQueue();
    }, 30000);
  }

  private setupBeforeUnloadHandler(): void {
    window.addEventListener('beforeunload', () => {
      // Flush remaining activities before page unload
      if (this.activityQueue.length > 0) {
        // Use sendBeacon for reliable delivery
        const activities = [...this.activityQueue];
        navigator.sendBeacon(
          `${this.baseUrl}/batch`,
          JSON.stringify({ activities })
        );
      }
    });
  }

  private getAuthToken(): string {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
  }
}

export const userActivityService = UserActivityService.getInstance();
export default userActivityService;