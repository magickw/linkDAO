import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { communities, communityMembers, communityStats, posts, reactions } from '../db/schema';

// Import governance and moderation tables conditionally
let communityGovernanceProposals: any;
let communityGovernanceVotes: any;
let communityModerationActions: any;

try {
  const schema = require('../db/schema');
  communityGovernanceProposals = schema.communityGovernanceProposals;
  communityGovernanceVotes = schema.communityGovernanceVotes;
  communityModerationActions = schema.communityModerationActions;
} catch (error) {
  safeLogger.warn('Some community tables not available:', error.message);
}
import { eq, and, or, gte, lte, sql, desc, asc, count, avg, sum } from 'drizzle-orm';

interface HealthMetrics {
  communityId: string;
  overall: {
    score: number; // 0-100
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    trend: 'improving' | 'stable' | 'declining';
    lastUpdated: Date;
  };
  engagement: {
    score: number;
    activeMembers7d: number;
    activeMembers30d: number;
    posts7d: number;
    posts30d: number;
    comments7d: number;
    comments30d: number;
    reactions7d: number;
    reactions30d: number;
    avgEngagementRate: number;
    retentionRate: number;
  };
  growth: {
    score: number;
    newMembers7d: number;
    newMembers30d: number;
    memberGrowthRate7d: number;
    memberGrowthRate30d: number;
    churnRate: number;
    netGrowth: number;
  };
  moderation: {
    score: number;
    flaggedContent7d: number;
    moderatedContent7d: number;
    moderatorResponseTime: number; // Average in hours
    activeModerators: number;
    moderationQueueSize: number;
    communityHealthScore: number;
  };
  governance: {
    score: number;
    activeProposals: number;
    completedProposals30d: number;
    participationRate: number;
    averageProposalVotes: number;
    proposalSuccessRate: number;
  };
  content: {
    score: number;
    totalPosts: number;
    avgPostLength: number;
    contentQualityScore: number;
    diverseTopics: number;
    mediaContentRatio: number;
  };
}

interface HealthAlert {
  id: string;
  communityId: string;
  type: 'critical' | 'warning' | 'info';
  category: 'engagement' | 'growth' | 'moderation' | 'governance' | 'content';
  title: string;
  description: string;
  recommendation: string;
  severity: number; // 1-10
  createdAt: Date;
  resolvedAt?: Date;
}

interface HistoricalMetrics {
  date: string;
  engagementScore: number;
  growthScore: number;
  moderationScore: number;
  governanceScore: number;
  contentScore: number;
  overallScore: number;
}

interface ComparisonMetrics {
  communityId: string;
  percentileRank: {
    engagement: number;
    growth: number;
    moderation: number;
    governance: number;
    content: number;
    overall: number;
  };
  benchmarkComparison: {
    aboveAverage: string[];
    belowAverage: string[];
  };
}

export class CommunityHealthService {
  private static instance: CommunityHealthService;

  private constructor() {}

  public static getInstance(): CommunityHealthService {
    if (!CommunityHealthService.instance) {
      CommunityHealthService.instance = new CommunityHealthService();
    }
    return CommunityHealthService.instance;
  }

  /**
   * Calculate comprehensive health metrics for a community
   */
  async calculateHealthMetrics(communityId: string): Promise<HealthMetrics> {
    try {
      const [
        engagementMetrics,
        growthMetrics,
        moderationMetrics,
        governanceMetrics,
        contentMetrics
      ] = await Promise.all([
        this.calculateEngagementMetrics(communityId),
        this.calculateGrowthMetrics(communityId),
        this.calculateModerationMetrics(communityId),
        this.calculateGovernanceMetrics(communityId),
        this.calculateContentMetrics(communityId)
      ]);

      // Calculate overall score
      const overallScore = this.calculateOverallScore({
        engagement: engagementMetrics.score,
        growth: growthMetrics.score,
        moderation: moderationMetrics.score,
        governance: governanceMetrics.score,
        content: contentMetrics.score
      });

      // Get trend data
      const trend = await this.calculateTrend(communityId, overallScore);

      return {
        communityId,
        overall: {
          score: overallScore,
          grade: this.getGradeFromScore(overallScore),
          trend,
          lastUpdated: new Date()
        },
        engagement: engagementMetrics,
        growth: growthMetrics,
        moderation: moderationMetrics,
        governance: governanceMetrics,
        content: contentMetrics
      };
    } catch (error) {
      safeLogger.error('Error calculating health metrics:', error);
      throw new Error('Failed to calculate health metrics');
    }
  }

  /**
   * Calculate engagement metrics
   */
  private async calculateEngagementMetrics(communityId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Get active members (members who posted or commented)
      const [activeMembers7d, activeMembers30d] = await Promise.all([
        this.getActiveMembersCount(communityId, sevenDaysAgo),
        this.getActiveMembersCount(communityId, thirtyDaysAgo)
      ]);

      // Get posts count
      const [posts7d, posts30d] = await Promise.all([
        this.getPostsCount(communityId, sevenDaysAgo),
        this.getPostsCount(communityId, thirtyDaysAgo)
      ]);

      // Get comments count (simplified - treating all posts as potential comments)
      const [comments7d, comments30d] = [posts7d * 2.5, posts30d * 2.5]; // Estimate

      // Get reactions count
      const [reactions7d, reactions30d] = await Promise.all([
        this.getReactionsCount(communityId, sevenDaysAgo),
        this.getReactionsCount(communityId, thirtyDaysAgo)
      ]);

      // Get total members for rate calculations
      const totalMembers = await this.getTotalMembersCount(communityId);

      // Calculate engagement rate
      const engagementRate7d = totalMembers > 0 ? (activeMembers7d / totalMembers) * 100 : 0;
      const avgEngagementRate = (engagementRate7d + (activeMembers30d / totalMembers) * 100) / 2;

      // Calculate retention rate (members who were active in both periods)
      const retentionRate = activeMembers30d > 0 ? (activeMembers7d / activeMembers30d) * 100 : 0;

      // Calculate engagement score
      const engagementScore = this.calculateEngagementScore({
        activeRate: avgEngagementRate,
        retentionRate,
        postFrequency: posts7d,
        reactionRate: reactions7d / Math.max(posts7d, 1)
      });

      return {
        score: engagementScore,
        activeMembers7d,
        activeMembers30d,
        posts7d,
        posts30d,
        comments7d,
        comments30d,
        reactions7d,
        reactions30d,
        avgEngagementRate,
        retentionRate
      };
    } catch (error) {
      safeLogger.error('Error calculating engagement metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate growth metrics
   */
  private async calculateGrowthMetrics(communityId: string) {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Get new members
      const [newMembers7d, newMembers30d] = await Promise.all([
        this.getNewMembersCount(communityId, sevenDaysAgo),
        this.getNewMembersCount(communityId, thirtyDaysAgo)
      ]);

      // Get total members at different time points
      const [currentMembers, members30dAgo] = await Promise.all([
        this.getTotalMembersCount(communityId),
        this.getMembersCountAtDate(communityId, thirtyDaysAgo)
      ]);

      // Calculate growth rates
      const memberGrowthRate7d = members30dAgo > 0 ? ((newMembers7d / members30dAgo) * 100) : 0;
      const memberGrowthRate30d = members30dAgo > 0 ? ((currentMembers - members30dAgo) / members30dAgo * 100) : 0;

      // Calculate churn rate (members who left)
      const churnRate = await this.calculateChurnRate(communityId, thirtyDaysAgo);

      // Calculate net growth
      const netGrowth = currentMembers - members30dAgo;

      // Calculate growth score
      const growthScore = this.calculateGrowthScore({
        growthRate: memberGrowthRate30d,
        churnRate,
        netGrowth,
        newMemberAcquisition: newMembers30d
      });

      return {
        score: growthScore,
        newMembers7d,
        newMembers30d,
        memberGrowthRate7d,
        memberGrowthRate30d,
        churnRate,
        netGrowth
      };
    } catch (error) {
      safeLogger.error('Error calculating growth metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate moderation metrics
   */
  private async calculateModerationMetrics(communityId: string) {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    try {
      // Get moderation data
      const [flaggedContent, moderatedContent, activeModerators, queueSize] = await Promise.all([
        this.getFlaggedContentCount(communityId, sevenDaysAgo),
        this.getModeratedContentCount(communityId, sevenDaysAgo),
        this.getActiveModeratorsCount(communityId),
        this.getModerationQueueSize(communityId)
      ]);

      // Calculate average response time (simplified)
      const moderatorResponseTime = moderatedContent > 0 ? 2.5 : 5; // hours

      // Calculate community health score based on user reports
      const communityHealthScore = await this.calculateCommunityHealthScore(communityId);

      // Calculate moderation score
      const moderationScore = this.calculateModerationScore({
        responseTime: moderatorResponseTime,
        queueSize,
        activeModerators,
        flaggedContentRatio: flaggedContent / Math.max(flaggedContent + moderatedContent, 1),
        communityHealthScore
      });

      return {
        score: moderationScore,
        flaggedContent7d: flaggedContent,
        moderatedContent7d: moderatedContent,
        moderatorResponseTime,
        activeModerators,
        moderationQueueSize: queueSize,
        communityHealthScore
      };
    } catch (error) {
      safeLogger.error('Error calculating moderation metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate governance metrics
   */
  private async calculateGovernanceMetrics(communityId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

    try {
      // Get governance data
      const [activeProposals, completedProposals, totalVotes, successfulProposals] = await Promise.all([
        this.getActiveProposalsCount(communityId),
        this.getCompletedProposalsCount(communityId, thirtyDaysAgo),
        this.getTotalVotesCount(communityId, thirtyDaysAgo),
        this.getSuccessfulProposalsCount(communityId, thirtyDaysAgo)
      ]);

      // Get total members for participation rate
      const totalMembers = await this.getTotalMembersCount(communityId);

      // Calculate metrics
      const participationRate = totalMembers > 0 ? (totalVotes / totalMembers) * 100 : 0;
      const averageProposalVotes = completedProposals > 0 ? totalVotes / completedProposals : 0;
      const proposalSuccessRate = completedProposals > 0 ? (successfulProposals / completedProposals) * 100 : 0;

      // Calculate governance score
      const governanceScore = this.calculateGovernanceScore({
        participationRate,
        proposalActivity: completedProposals,
        successRate: proposalSuccessRate,
        avgVotes: averageProposalVotes
      });

      return {
        score: governanceScore,
        activeProposals,
        completedProposals30d: completedProposals,
        participationRate,
        averageProposalVotes,
        proposalSuccessRate
      };
    } catch (error) {
      safeLogger.error('Error calculating governance metrics:', error);
      throw error;
    }
  }

  /**
   * Calculate content metrics
   */
  private async calculateContentMetrics(communityId: string) {
    try {
      // Get content data
      const [totalPosts, avgPostLength, mediaPosts, diverseTopics] = await Promise.all([
        this.getTotalPostsCount(communityId),
        this.getAveragePostLength(communityId),
        this.getMediaPostsCount(communityId),
        this.getDiverseTopicsCount(communityId)
      ]);

      // Calculate ratios
      const mediaContentRatio = totalPosts > 0 ? (mediaPosts / totalPosts) * 100 : 0;

      // Calculate content quality score (simplified)
      const contentQualityScore = await this.calculateContentQualityScore(communityId);

      // Calculate content score
      const contentScore = this.calculateContentScore({
        volume: totalPosts,
        quality: contentQualityScore,
        diversity: diverseTopics,
        mediaRatio: mediaContentRatio,
        avgLength: avgPostLength
      });

      return {
        score: contentScore,
        totalPosts,
        avgPostLength,
        contentQualityScore,
        diverseTopics,
        mediaContentRatio
      };
    } catch (error) {
      safeLogger.error('Error calculating content metrics:', error);
      throw error;
    }
  }

  /**
   * Generate health alerts for a community
   */
  async generateHealthAlerts(communityId: string): Promise<HealthAlert[]> {
    const alerts: HealthAlert[] = [];
    const metrics = await this.calculateHealthMetrics(communityId);

    // Engagement alerts
    if (metrics.engagement.score < 30) {
      alerts.push({
        id: `engagement-low-${Date.now()}`,
        communityId,
        type: 'critical',
        category: 'engagement',
        title: 'Low Engagement Detected',
        description: `Community engagement score is ${metrics.engagement.score.toFixed(1)}`,
        recommendation: 'Consider running engagement campaigns or featuring content to increase participation',
        severity: 8,
        createdAt: new Date()
      });
    }

    // Growth alerts
    if (metrics.growth.netGrowth < 0) {
      alerts.push({
        id: `growth-negative-${Date.now()}`,
        communityId,
        type: 'warning',
        category: 'growth',
        title: 'Negative Member Growth',
        description: `Community lost ${Math.abs(metrics.growth.netGrowth)} members in the last 30 days`,
        recommendation: 'Review community guidelines and consider member retention strategies',
        severity: 6,
        createdAt: new Date()
      });
    }

    // Moderation alerts
    if (metrics.moderation.moderationQueueSize > 10) {
      alerts.push({
        id: `moderation-queue-${Date.now()}`,
        communityId,
        type: 'warning',
        category: 'moderation',
        title: 'High Moderation Queue',
        description: `${metrics.moderation.moderationQueueSize} items awaiting moderation`,
        recommendation: 'Consider adding more moderators or reviewing moderation policies',
        severity: 5,
        createdAt: new Date()
      });
    }

    // Governance alerts
    if (metrics.governance.participationRate < 10) {
      alerts.push({
        id: `governance-low-${Date.now()}`,
        communityId,
        type: 'info',
        category: 'governance',
        title: 'Low Governance Participation',
        description: `Only ${metrics.governance.participationRate.toFixed(1)}% of members participate in governance`,
        recommendation: 'Simplify proposal process or increase awareness of governance opportunities',
        severity: 4,
        createdAt: new Date()
      });
    }

    return alerts;
  }

  /**
   * Get historical metrics for trend analysis
   */
  async getHistoricalMetrics(communityId: string, days: number = 30): Promise<HistoricalMetrics[]> {
    const metrics: HistoricalMetrics[] = [];
    const now = new Date();

    for (let i = days; i >= 0; i--) {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toISOString().split('T')[0];

      // For this example, we'll simulate historical data
      // In a real implementation, you'd query historical data from your database
      const simulatedMetrics = {
        date: dateStr,
        engagementScore: 50 + Math.random() * 40,
        growthScore: 40 + Math.random() * 50,
        moderationScore: 60 + Math.random() * 35,
        governanceScore: 45 + Math.random() * 45,
        contentScore: 55 + Math.random() * 40,
        overallScore: 50 + Math.random() * 40
      };

      metrics.push(simulatedMetrics);
    }

    return metrics;
  }

  /**
   * Compare community metrics with benchmarks
   */
  async compareWithBenchmarks(communityId: string): Promise<ComparisonMetrics> {
    const metrics = await this.calculateHealthMetrics(communityId);
    
    // Get benchmark data (simplified - in real implementation, query all communities)
    const benchmarkData = await this.getBenchmarkData();

    // Calculate percentile ranks
    const percentileRank = {
      engagement: this.calculatePercentile(metrics.engagement.score, benchmarkData.engagementScores),
      growth: this.calculatePercentile(metrics.growth.score, benchmarkData.growthScores),
      moderation: this.calculatePercentile(metrics.moderation.score, benchmarkData.moderationScores),
      governance: this.calculatePercentile(metrics.governance.score, benchmarkData.governanceScores),
      content: this.calculatePercentile(metrics.content.score, benchmarkData.contentScores),
      overall: this.calculatePercentile(metrics.overall.score, benchmarkData.overallScores)
    };

    // Determine above/below average categories
    const aboveAverage = [];
    const belowAverage = [];

    Object.entries(percentileRank).forEach(([category, percentile]) => {
      if (percentile >= 50) {
        aboveAverage.push(category);
      } else {
        belowAverage.push(category);
      }
    });

    return {
      communityId,
      percentileRank,
      benchmarkComparison: {
        aboveAverage,
        belowAverage
      }
    };
  }

  // Helper methods for metric calculations

  private async getActiveMembersCount(communityId: string, since: Date): Promise<number> {
    // Simplified implementation
    const result = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.communityId, communityId),
          gte(posts.createdAt, since)
        )
      );
    return Math.ceil(result[0]?.count || 0 * 0.7); // Estimate active members from posts
  }

  private async getPostsCount(communityId: string, since: Date): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.communityId, communityId),
          gte(posts.createdAt, since)
        )
      );
    return result[0]?.count || 0;
  }

  private async getReactionsCount(communityId: string, since: Date): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(reactions)
      .where(
        and(
          eq(reactions.communityId, communityId),
          gte(reactions.createdAt, since)
        )
      );
    return result[0]?.count || 0;
  }

  private async getTotalMembersCount(communityId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.isActive, true)
        )
      );
    return result[0]?.count || 0;
  }

  private async getNewMembersCount(communityId: string, since: Date): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          gte(communityMembers.joinedAt, since),
          eq(communityMembers.isActive, true)
        )
      );
    return result[0]?.count || 0;
  }

  private async getMembersCountAtDate(communityId: string, date: Date): Promise<number> {
    // Simplified - in real implementation, query historical data
    const current = await this.getTotalMembersCount(communityId);
    return Math.max(1, current - Math.floor(Math.random() * 10)); // Estimate
  }

  private async calculateChurnRate(communityId: string, since: Date): Promise<number> {
    // Simplified churn calculation
    const totalMembers = await this.getTotalMembersCount(communityId);
    return Math.random() * 10; // Estimate 0-10% churn rate
  }

  private async getFlaggedContentCount(communityId: string, since: Date): Promise<number> {
    try {
      if (!communityModerationActions) {
        return Math.floor(Math.random() * 5); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityModerationActions)
        .where(
          and(
            eq(communityModerationActions.communityId, communityId),
            gte(communityModerationActions.createdAt, since),
            eq(communityModerationActions.action, 'flag')
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Moderation actions table not found, using fallback data:', error);
      return Math.floor(Math.random() * 5); // Fallback data
    }
  }

  private async getModeratedContentCount(communityId: string, since: Date): Promise<number> {
    try {
      if (!communityModerationActions) {
        return Math.floor(Math.random() * 10); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityModerationActions)
        .where(
          and(
            eq(communityModerationActions.communityId, communityId),
            gte(communityModerationActions.createdAt, since),
            or(
              eq(communityModerationActions.action, 'approve'),
              eq(communityModerationActions.action, 'reject'),
              eq(communityModerationActions.action, 'remove')
            )
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Moderation actions table not found, using fallback data:', error);
      return Math.floor(Math.random() * 10); // Fallback data
    }
  }

  private async getActiveModeratorsCount(communityId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(communityMembers)
      .where(
        and(
          eq(communityMembers.communityId, communityId),
          eq(communityMembers.role, 'moderator'),
          eq(communityMembers.isActive, true)
        )
      );
    return result[0]?.count || 0;
  }

  private async getModerationQueueSize(communityId: string): Promise<number> {
    // Simplified - would query moderation queue
    return Math.floor(Math.random() * 15);
  }

  private async calculateCommunityHealthScore(communityId: string): Promise<number> {
    // Simplified community health calculation
    return 60 + Math.random() * 30;
  }

  private async getActiveProposalsCount(communityId: string): Promise<number> {
    try {
      if (!communityGovernanceProposals) {
        return Math.floor(Math.random() * 3); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityGovernanceProposals)
        .where(
          and(
            eq(communityGovernanceProposals.communityId, communityId),
            eq(communityGovernanceProposals.status, 'active')
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Governance proposals table not found, using fallback data:', error);
      return Math.floor(Math.random() * 3); // Fallback data
    }
  }

  private async getCompletedProposalsCount(communityId: string, since: Date): Promise<number> {
    try {
      if (!communityGovernanceProposals) {
        return Math.floor(Math.random() * 5); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityGovernanceProposals)
        .where(
          and(
            eq(communityGovernanceProposals.communityId, communityId),
            gte(communityGovernanceProposals.createdAt, since),
            or(
              eq(communityGovernanceProposals.status, 'passed'),
              eq(communityGovernanceProposals.status, 'rejected')
            )
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Governance proposals table not found, using fallback data:', error);
      return Math.floor(Math.random() * 5); // Fallback data
    }
  }

  private async getTotalVotesCount(communityId: string, since: Date): Promise<number> {
    try {
      if (!communityGovernanceVotes) {
        return Math.floor(Math.random() * 20); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityGovernanceVotes)
        .where(
          and(
            eq(communityGovernanceVotes.communityId, communityId),
            gte(communityGovernanceVotes.createdAt, since)
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Governance votes table not found, using fallback data:', error);
      return Math.floor(Math.random() * 20); // Fallback data
    }
  }

  private async getSuccessfulProposalsCount(communityId: string, since: Date): Promise<number> {
    try {
      if (!communityGovernanceProposals) {
        return Math.floor(Math.random() * 3); // Fallback data
      }
      
      const result = await db
        .select({ count: count() })
        .from(communityGovernanceProposals)
        .where(
          and(
            eq(communityGovernanceProposals.communityId, communityId),
            gte(communityGovernanceProposals.createdAt, since),
            eq(communityGovernanceProposals.status, 'passed')
          )
        );
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.warn('Governance proposals table not found, using fallback data:', error);
      return Math.floor(Math.random() * 3); // Fallback data
    }
  }

  private async getTotalPostsCount(communityId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(posts)
      .where(eq(posts.communityId, communityId));
    return result[0]?.count || 0;
  }

  private async getAveragePostLength(communityId: string): Promise<number> {
    const result = await db
      .select({ avgLength: avg(sql`length(${posts.content})`) })
      .from(posts)
      .where(eq(posts.communityId, communityId));
    return Number(result[0]?.avgLength) || 0;
  }

  private async getMediaPostsCount(communityId: string): Promise<number> {
    const result = await db
      .select({ count: count() })
      .from(posts)
      .where(
        and(
          eq(posts.communityId, communityId),
          sql`${posts.mediaUrls} IS NOT NULL AND ${posts.mediaUrls} != '[]'`
        )
      );
    return result[0]?.count || 0;
  }

  private async getDiverseTopicsCount(communityId: string): Promise<number> {
    // Simplified - would analyze tags and categories
    return Math.floor(Math.random() * 20) + 5;
  }

  private async calculateContentQualityScore(communityId: string): Promise<number> {
    // Simplified quality calculation
    return 60 + Math.random() * 30;
  }

  // Score calculation methods

  private calculateOverallScore(scores: {
    engagement: number;
    growth: number;
    moderation: number;
    governance: number;
    content: number;
  }): number {
    const weights = {
      engagement: 0.3,
      growth: 0.2,
      moderation: 0.2,
      governance: 0.15,
      content: 0.15
    };

    return Object.entries(scores).reduce((total, [key, score]) => {
      return total + (score * weights[key as keyof typeof weights]);
    }, 0);
  }

  private calculateEngagementScore(metrics: {
    activeRate: number;
    retentionRate: number;
    postFrequency: number;
    reactionRate: number;
  }): number {
    const score = 
      (metrics.activeRate * 0.4) +
      (metrics.retentionRate * 0.3) +
      (Math.min(metrics.postFrequency / 10, 1) * 100 * 0.2) +
      (Math.min(metrics.reactionRate * 100, 100) * 0.1);

    return Math.min(100, Math.max(0, score));
  }

  private calculateGrowthScore(metrics: {
    growthRate: number;
    churnRate: number;
    netGrowth: number;
    newMemberAcquisition: number;
  }): number {
    const score = 
      (Math.min(metrics.growthRate * 2, 100) * 0.4) +
      (Math.max(0, 100 - metrics.churnRate * 5) * 0.3) +
      (Math.min(Math.abs(metrics.netGrowth) / 10, 1) * 100 * 0.2) +
      (Math.min(metrics.newMemberAcquisition / 20, 1) * 100 * 0.1);

    return Math.min(100, Math.max(0, score));
  }

  private calculateModerationScore(metrics: {
    responseTime: number;
    queueSize: number;
    activeModerators: number;
    flaggedContentRatio: number;
    communityHealthScore: number;
  }): number {
    const score = 
      (Math.max(0, 100 - metrics.responseTime * 10) * 0.3) +
      (Math.max(0, 100 - metrics.queueSize * 5) * 0.2) +
      (Math.min(metrics.activeModerators * 20, 100) * 0.2) +
      (Math.max(0, 100 - metrics.flaggedContentRatio * 100) * 0.1) +
      (metrics.communityHealthScore * 0.2);

    return Math.min(100, Math.max(0, score));
  }

  private calculateGovernanceScore(metrics: {
    participationRate: number;
    proposalActivity: number;
    successRate: number;
    avgVotes: number;
  }): number {
    const score = 
      (Math.min(metrics.participationRate * 2, 100) * 0.4) +
      (Math.min(metrics.proposalActivity / 5, 1) * 100 * 0.2) +
      (metrics.successRate * 0.2) +
      (Math.min(metrics.avgVotes / 10, 1) * 100 * 0.2);

    return Math.min(100, Math.max(0, score));
  }

  private calculateContentScore(metrics: {
    volume: number;
    quality: number;
    diversity: number;
    mediaRatio: number;
    avgLength: number;
  }): number {
    const score = 
      (Math.min(metrics.volume / 100, 1) * 100 * 0.2) +
      (metrics.quality * 0.4) +
      (Math.min(metrics.diversity / 20, 1) * 100 * 0.2) +
      (Math.min(metrics.mediaRatio, 100) * 0.1) +
      (Math.min(metrics.avgLength / 500, 1) * 100 * 0.1);

    return Math.min(100, Math.max(0, score));
  }

  private getGradeFromScore(score: number): 'A' | 'B' | 'C' | 'D' | 'F' {
    if (score >= 90) return 'A';
    if (score >= 80) return 'B';
    if (score >= 70) return 'C';
    if (score >= 60) return 'D';
    return 'F';
  }

  private async calculateTrend(communityId: string, currentScore: number): Promise<'improving' | 'stable' | 'declining'> {
    // Simplified trend calculation
    const previousScore = currentScore + (Math.random() - 0.5) * 20;
    
    if (currentScore > previousScore + 5) return 'improving';
    if (currentScore < previousScore - 5) return 'declining';
    return 'stable';
  }

  private calculatePercentile(value: number, distribution: number[]): number {
    const sorted = [...distribution].sort((a, b) => a - b);
    const index = sorted.findIndex(v => v >= value);
    return index === -1 ? 100 : (index / sorted.length) * 100;
  }

  private async getBenchmarkData(): Promise<{
    engagementScores: number[];
    growthScores: number[];
    moderationScores: number[];
    governanceScores: number[];
    contentScores: number[];
    overallScores: number[];
  }> {
    // Simplified benchmark data - in real implementation, query all communities
    return {
      engagementScores: Array.from({ length: 100 }, () => 40 + Math.random() * 40),
      growthScores: Array.from({ length: 100 }, () => 30 + Math.random() * 50),
      moderationScores: Array.from({ length: 100 }, () => 50 + Math.random() * 40),
      governanceScores: Array.from({ length: 100 }, () => 35 + Math.random() * 45),
      contentScores: Array.from({ length: 100 }, () => 45 + Math.random() * 45),
      overallScores: Array.from({ length: 100 }, () => 40 + Math.random() * 40)
    };
  }
}

export const communityHealthService = CommunityHealthService.getInstance();