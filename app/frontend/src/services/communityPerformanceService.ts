import { performanceMonitoringService } from './performanceMonitoringService';
import { analyticsService } from './analyticsService';
import { Community } from '../models/Community';
import { CommunityPost } from '../models/CommunityPost';
import { CommunityService } from './communityService';
import { CommunityPostService } from './communityPostService';
import { EngagementAnalyticsService } from './engagementAnalyticsService';

// Community performance metrics interface
export interface CommunityPerformanceMetrics {
  // Core community metrics
  communityId: string;
  communityName: string;
  memberCount: number;
  activeMembers: number;
  onlineMembers: number;
  
  // Engagement metrics
  totalPosts: number;
  postsPerDay: number;
  avgPostLength: number;
  totalComments: number;
  commentsPerPost: number;
  totalReactions: number;
  reactionsPerPost: number;
  totalViews: number;
  viewsPerPost: number;
  
  // Growth metrics
  memberGrowthRate: number; // percentage change
  postGrowthRate: number; // percentage change
  engagementGrowthRate: number; // percentage change
  
  // Quality metrics
  avgCommentDepth: number;
  responseRate: number; // percentage of posts with comments
  engagementRate: number; // percentage of members actively engaging
  
  // Timing metrics
  avgResponseTime: number; // in minutes
  peakActivityHours: number[]; // hours with most activity (0-23)
  
  // Content metrics
  topPostTypes: { type: string; count: number }[];
  trendingTopics: string[];
  
  // User distribution
  newUsers: number;
  returningUsers: number;
  churnRate: number;
  
  // Monetization metrics
  totalTips: number;
  avgTipAmount: number;
  tipReceivers: number;
  
  // Performance metrics
  pageLoadTime: number;
  apiResponseTime: number;
  errorRate: number;
  
  // Timestamp
  timestamp: number;
  period: 'hour' | 'day' | 'week' | 'month';
}

// Community performance summary
export interface CommunityPerformanceSummary {
  communityId: string;
  communityName: string;
  
  // Overall score (0-100)
  engagementScore: number;
  growthScore: number;
  qualityScore: number;
  overallScore: number;
  
  // Key metrics
  memberCount: number;
  activeMembers: number;
  totalPosts: number;
  totalComments: number;
  
  // Trends
  memberTrend: 'increasing' | 'decreasing' | 'stable';
  engagementTrend: 'increasing' | 'decreasing' | 'stable';
  postTrend: 'increasing' | 'decreasing' | 'stable';
  
  // Recommendations
  recommendations: string[];
  
  // Last updated
  lastUpdated: Date;
}

// Community analytics event
export interface CommunityAnalyticsEvent {
  eventType: 'post_created' | 'comment_added' | 'reaction_added' | 'member_joined' | 'member_left' | 'tip_sent' | 'view_recorded';
  communityId: string;
  userId: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

class CommunityPerformanceService {
  private metrics: CommunityPerformanceMetrics[] = [];
  private listeners: ((metrics: CommunityPerformanceMetrics) => void)[] = [];
  private eventQueue: CommunityAnalyticsEvent[] = [];
  private isProcessingQueue = false;
  private metricsCollectionInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize community performance monitoring
   */
  async initialize(): Promise<void> {
    // Start collecting metrics periodically
    this.metricsCollectionInterval = setInterval(() => {
      this.collectMetrics();
    }, 300000); // Collect every 5 minutes
    
    // Process queued events
    setInterval(() => {
      this.processEventQueue();
    }, 60000); // Process queue every minute
    
    console.log('Community performance monitoring initialized');
  }

  /**
   * Track a community analytics event
   */
  trackEvent(event: CommunityAnalyticsEvent): void {
    this.eventQueue.push(event);
    
    // Process immediately if queue is getting large
    if (this.eventQueue.length > 100 && !this.isProcessingQueue) {
      this.processEventQueue();
    }
  }

  /**
   * Get current performance metrics for a community
   */
  async getCurrentMetrics(communityId: string): Promise<CommunityPerformanceMetrics> {
    // Get community data
    const community = await CommunityService.getCommunityById(communityId);
    if (!community) {
      throw new Error(`Community ${communityId} not found`);
    }

    // Get recent posts (last 30 days)
    const result = await CommunityPostService.getCommunityPosts(communityId, 1, 100);
    const posts = result.posts || [];

    // Calculate metrics
    const metrics = this.calculateMetrics(community, posts);
    
    // Add to metrics history
    this.metrics.push(metrics);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
    
    // Notify listeners
    this.notifyListeners(metrics);
    
    return metrics;
  }

  /**
   * Get performance summary for a community
   */
  async getPerformanceSummary(communityId: string): Promise<CommunityPerformanceSummary> {
    const metrics = await this.getCurrentMetrics(communityId);
    
    // Calculate scores
    const engagementScore = this.calculateEngagementScore(metrics);
    const growthScore = this.calculateGrowthScore(metrics);
    const qualityScore = this.calculateQualityScore(metrics);
    const overallScore = Math.round((engagementScore + growthScore + qualityScore) / 3);
    
    // Determine trends
    const memberTrend = metrics.memberGrowthRate > 0 ? 'increasing' : 
                       metrics.memberGrowthRate < 0 ? 'decreasing' : 'stable';
    const engagementTrend = metrics.engagementGrowthRate > 0 ? 'increasing' : 
                           metrics.engagementGrowthRate < 0 ? 'decreasing' : 'stable';
    const postTrend = metrics.postGrowthRate > 0 ? 'increasing' : 
                     metrics.postGrowthRate < 0 ? 'decreasing' : 'stable';
    
    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics);
    
    return {
      communityId: metrics.communityId,
      communityName: metrics.communityName,
      engagementScore,
      growthScore,
      qualityScore,
      overallScore,
      memberCount: metrics.memberCount,
      activeMembers: metrics.activeMembers,
      totalPosts: metrics.totalPosts,
      totalComments: metrics.totalComments,
      memberTrend,
      engagementTrend,
      postTrend,
      recommendations,
      lastUpdated: new Date()
    };
  }

  /**
   * Get performance history for a community
   */
  getPerformanceHistory(communityId: string, hours: number = 24): CommunityPerformanceMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(metric => 
      metric.communityId === communityId && 
      metric.timestamp > cutoff
    );
  }

  /**
   * Add metrics listener
   */
  addMetricsListener(listener: (metrics: CommunityPerformanceMetrics) => void): void {
    this.listeners.push(listener);
  }

  /**
   * Remove metrics listener
   */
  removeMetricsListener(listener: (metrics: CommunityPerformanceMetrics) => void): void {
    const index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }

  /**
   * Export community analytics data
   */
  async exportAnalytics(communityId: string, startDate?: Date, endDate?: Date): Promise<any> {
    try {
      const response = await analyticsService.exportAnalytics(startDate, endDate, 'json');
      return response;
    } catch (error) {
      console.error('Error exporting community analytics:', error);
      return {
        status: 'unavailable',
        message: 'Community analytics export is currently unavailable.',
        communityId,
        startDate: startDate?.toISOString(),
        endDate: endDate?.toISOString()
      };
    }
  }

  /**
   * Calculate metrics from community data
   */
  private calculateMetrics(community: Community, posts: CommunityPost[]): CommunityPerformanceMetrics {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    
    // Filter recent posts
    const recentPosts = posts.filter(post => 
      post.createdAt.getTime() > thirtyDaysAgo
    );
    
    // Calculate post statistics
    const totalPosts = recentPosts.length;
    const postsPerDay = totalPosts / 30;
    
    // Calculate comment statistics
    const totalComments = recentPosts.reduce((sum, post) => sum + (post.comments?.length || 0), 0);
    const commentsPerPost = totalPosts > 0 ? totalComments / totalPosts : 0;
    
    // Calculate reaction statistics
    const totalReactions = recentPosts.reduce((sum, post) => sum + (post.upvotes || 0) + (post.downvotes || 0), 0);
    const reactionsPerPost = totalPosts > 0 ? totalReactions / totalPosts : 0;
    
    // Calculate view statistics (mock data for now)
    const totalViews = recentPosts.reduce((sum, post) => sum + (post.views || 0), 0);
    const viewsPerPost = totalPosts > 0 ? totalViews / totalPosts : 0;
    
    // Calculate average post length
    const avgPostLength = recentPosts.length > 0 ? 
      recentPosts.reduce((sum, post) => sum + (post.contentCid?.length || 0), 0) / recentPosts.length : 0;
    
    // Calculate growth rates (mock data for now)
    const memberGrowthRate = 5.2; // percentage
    const postGrowthRate = 3.1; // percentage
    const engagementGrowthRate = 4.7; // percentage
    
    // Calculate quality metrics
    const avgCommentDepth = 1.2; // average nesting depth
    const responseRate = totalPosts > 0 ? (recentPosts.filter(p => (p.comments?.length || 0) > 0).length / totalPosts) * 100 : 0;
    const engagementRate = community.memberCount > 0 ? (totalComments / community.memberCount) * 100 : 0;
    
    // Timing metrics (mock data)
    const avgResponseTime = 45; // minutes
    const peakActivityHours = [12, 13, 14, 18, 19, 20]; // hours with most activity
    
    // Content metrics
    const topPostTypes = this.calculateTopPostTypes(recentPosts);
    const trendingTopics = this.extractTrendingTopics(recentPosts);
    
    // User distribution (mock data)
    const newUsers = Math.floor(community.memberCount * 0.15); // 15% new users
    const returningUsers = community.memberCount - newUsers;
    const churnRate = 2.3; // percentage
    
    // Monetization metrics (mock data)
    const totalTips = 1250; // total tip amount
    const avgTipAmount = 5.2; // average tip amount
    const tipReceivers = 45; // number of users who received tips
    
    // Performance metrics from performance monitoring service
    const perfReport = performanceMonitoringService.generateReport();
    // Map the performance report to the expected metrics structure
    const pageLoadTime = perfReport.pageLoad.loadComplete || perfReport.pageLoad.domContentLoaded;
    const apiResponseTime = perfReport.apiPerformance.averageResponseTime;
    const errorRate = perfReport.apiPerformance.errorRate;

    return {
      communityId: community.id,
      communityName: community.displayName,
      memberCount: community.memberCount,
      activeMembers: Math.floor(community.memberCount * 0.6), // 60% active
      onlineMembers: Math.floor(community.memberCount * 0.2), // 20% online
      
      totalPosts,
      postsPerDay,
      avgPostLength,
      totalComments,
      commentsPerPost,
      totalReactions,
      reactionsPerPost,
      totalViews,
      viewsPerPost,
      
      memberGrowthRate,
      postGrowthRate,
      engagementGrowthRate,
      
      avgCommentDepth,
      responseRate,
      engagementRate,
      
      avgResponseTime,
      peakActivityHours,
      
      topPostTypes,
      trendingTopics,
      
      newUsers,
      returningUsers,
      churnRate,
      
      totalTips,
      avgTipAmount,
      tipReceivers,
      
      pageLoadTime,
      apiResponseTime,
      errorRate,
      
      timestamp: now,
      period: 'month'
    };
  }

  /**
   * Calculate top post types from posts
   */
  private calculateTopPostTypes(posts: CommunityPost[]): { type: string; count: number }[] {
    const typeCounts: Record<string, number> = {};
    
    posts.forEach(post => {
      const type = post.contentType || 'text';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
    });
    
    return Object.entries(typeCounts)
      .map(([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }

  /**
   * Extract trending topics from posts
   */
  private extractTrendingTopics(posts: CommunityPost[]): string[] {
    const topicCounts: Record<string, number> = {};
    
    posts.forEach(post => {
      // Extract hashtags from content
      const hashtags = post.contentCid?.match(/#\w+/g) || [];
      hashtags.forEach(tag => {
        const cleanTag = tag.substring(1).toLowerCase();
        topicCounts[cleanTag] = (topicCounts[cleanTag] || 0) + 1;
      });
      
      // Include tags from post
      if (post.tags) {
        post.tags.forEach(tag => {
          const cleanTag = tag.toLowerCase();
          topicCounts[cleanTag] = (topicCounts[cleanTag] || 0) + 1;
        });
      }
    });
    
    return Object.entries(topicCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([topic]) => `#${topic}`);
  }

  /**
   * Calculate engagement score (0-100)
   */
  private calculateEngagementScore(metrics: CommunityPerformanceMetrics): number {
    // Weighted score based on key engagement metrics
    const postsScore = Math.min(100, metrics.postsPerDay * 10); // Normalize to 0-100
    const commentsScore = Math.min(100, metrics.commentsPerPost * 20); // Normalize to 0-100
    const reactionsScore = Math.min(100, metrics.reactionsPerPost * 5); // Normalize to 0-100
    const viewsScore = Math.min(100, metrics.viewsPerPost / 10); // Normalize to 0-100
    const responseRateScore = metrics.responseRate; // Already 0-100
    
    // Weighted average
    return Math.round(
      (postsScore * 0.2) +
      (commentsScore * 0.3) +
      (reactionsScore * 0.2) +
      (viewsScore * 0.15) +
      (responseRateScore * 0.15)
    );
  }

  /**
   * Calculate growth score (0-100)
   */
  private calculateGrowthScore(metrics: CommunityPerformanceMetrics): number {
    // Normalize growth rates to 0-100 scale
    const memberGrowthScore = Math.min(100, Math.max(0, 50 + (metrics.memberGrowthRate * 10)));
    const postGrowthScore = Math.min(100, Math.max(0, 50 + (metrics.postGrowthRate * 10)));
    const engagementGrowthScore = Math.min(100, Math.max(0, 50 + (metrics.engagementGrowthRate * 10)));
    
    // Weighted average
    return Math.round(
      (memberGrowthScore * 0.4) +
      (postGrowthScore * 0.3) +
      (engagementGrowthScore * 0.3)
    );
  }

  /**
   * Calculate quality score (0-100)
   */
  private calculateQualityScore(metrics: CommunityPerformanceMetrics): number {
    // Normalize quality metrics to 0-100 scale
    const avgPostLengthScore = Math.min(100, metrics.avgPostLength / 200); // Target 2000 chars
    const responseRateScore = metrics.responseRate; // Already 0-100
    const engagementRateScore = Math.min(100, metrics.engagementRate * 10); // Normalize
    const avgResponseTimeScore = Math.min(100, Math.max(0, 100 - (metrics.avgResponseTime / 10))); // Invert
    
    // Weighted average
    return Math.round(
      (avgPostLengthScore * 0.3) +
      (responseRateScore * 0.3) +
      (engagementRateScore * 0.25) +
      (avgResponseTimeScore * 0.15)
    );
  }

  /**
   * Generate recommendations based on metrics
   */
  private generateRecommendations(metrics: CommunityPerformanceMetrics): string[] {
    const recommendations: string[] = [];
    
    // Low engagement recommendations
    if (metrics.engagementRate < 5) {
      recommendations.push('Increase community engagement by hosting AMAs or discussion threads');
    }
    
    if (metrics.responseRate < 30) {
      recommendations.push('Encourage more responses by asking follow-up questions in posts');
    }
    
    if (metrics.postsPerDay < 1) {
      recommendations.push('Encourage daily posting through challenges or prompts');
    }
    
    // Growth recommendations
    if (metrics.memberGrowthRate < 0) {
      recommendations.push('Review community onboarding process to reduce member churn');
    }
    
    if (metrics.postGrowthRate < 0) {
      recommendations.push('Create posting guidelines to help members create better content');
    }
    
    // Quality recommendations
    if (metrics.avgPostLength < 200) {
      recommendations.push('Encourage longer, more detailed posts through examples and guidelines');
    }
    
    if (metrics.avgResponseTime > 120) {
      recommendations.push('Assign moderators to respond more quickly to new posts');
    }
    
    // Monetization recommendations
    if (metrics.totalTips < 100) {
      recommendations.push('Promote tipping features to increase community monetization');
    }
    
    // Performance recommendations
    if (metrics.pageLoadTime > 3000) {
      recommendations.push('Optimize community page loading performance');
    }
    
    if (metrics.errorRate > 2) {
      recommendations.push('Investigate and fix errors affecting user experience');
    }
    
    // If no recommendations, suggest general improvement
    if (recommendations.length === 0) {
      recommendations.push('Continue current successful community management practices');
    }
    
    return recommendations;
  }

  /**
   * Process queued events
   */
  private async processEventQueue(): Promise<void> {
    if (this.isProcessingQueue || this.eventQueue.length === 0) {
      return;
    }
    
    this.isProcessingQueue = true;
    
    try {
      // Process events in batches
      const batchSize = 50;
      while (this.eventQueue.length > 0) {
        const batch = this.eventQueue.splice(0, batchSize);
        
        // Track events with analytics service
        for (const event of batch) {
          await analyticsService.trackUserEvent(event.eventType, {
            communityId: event.communityId,
            userId: event.userId,
            ...event.metadata
          });
        }
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error) {
      console.error('Error processing community analytics events:', error);
    } finally {
      this.isProcessingQueue = false;
    }
  }

  /**
   * Collect metrics periodically
   */
  private async collectMetrics(): Promise<void> {
    try {
      // This would typically collect metrics from various sources
      // For now, we'll just log that collection is happening
      console.log('Collecting community performance metrics');
    } catch (error) {
      console.error('Error collecting community metrics:', error);
    }
  }

  /**
   * Notify listeners of new metrics
   */
  private notifyListeners(metrics: CommunityPerformanceMetrics): void {
    this.listeners.forEach(listener => {
      try {
        listener(metrics);
      } catch (error) {
        console.error('Error in community metrics listener:', error);
      }
    });
  }
}

export const communityPerformanceService = new CommunityPerformanceService();