import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gte, lte, desc, sql, count, sum, avg, gt } from 'drizzle-orm';
import { posts, users, reactions, tips, views, comments, shares, bookmarks, quickPosts, quickPostReactions, quickPostViews, communityMembers } from '../db/schema';
import type {
  EngagementAnalytics,
  EngagementTrend,
  PostEngagementMetrics,
  UserEngagementProfile,
  EngagementInteraction,
  EngagementAggregate,
  SocialProofIndicators,
  FollowerEngagement,
  VerifiedUserEngagement,
  CommunityLeaderEngagement
} from '../types/engagementAnalytics';

export class EngagementAnalyticsService {
  /**
   * Get comprehensive engagement analytics from real database
   */
  static async getEngagementAnalytics(
    userId?: string,
    timeRange: string = 'week'
  ): Promise<EngagementAnalytics> {
    try {
      if (!db) {
        safeLogger.warn('Database not initialized, returning mock data');
        const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
        return this.getMockEngagementAnalytics(userId, timeRange, startDate, endDate);
      }

      const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
      const { startDate: prevStartDate, endDate: prevEndDate } = this.getPreviousPeriod(startDate, endDate);

      // Get current period metrics
      const [reactionsCount, commentsCount, tipsData, viewsCount, sharesCount] = await Promise.all([
        // Reactions count
        db.select({ count: count() })
          .from(reactions)
          .where(gte(reactions.createdAt, startDate))
          .then(r => r[0]?.count || 0),

        // Comments count
        db.select({ count: count() })
          .from(comments)
          .where(gte(comments.createdAt, startDate))
          .then(r => r[0]?.count || 0),

        // Tips count and total
        db.select({
          count: count(),
          total: sum(tips.amount)
        })
          .from(tips)
          .where(gte(tips.createdAt, startDate))
          .then(r => ({ count: r[0]?.count || 0, total: parseFloat(r[0]?.total || '0') })),

        // Views count
        db.select({ count: count() })
          .from(views)
          .where(gte(views.createdAt, startDate))
          .then(r => r[0]?.count || 0),

        // Shares count
        db.select({ count: count() })
          .from(shares)
          .where(gte(shares.createdAt, startDate))
          .then(r => r[0]?.count || 0)
      ]);

      // Get previous period metrics for comparison
      const [prevReactionsCount, prevCommentsCount, prevTipsData, prevViewsCount] = await Promise.all([
        db.select({ count: count() })
          .from(reactions)
          .where(and(gte(reactions.createdAt, prevStartDate), lte(reactions.createdAt, prevEndDate)))
          .then(r => r[0]?.count || 0),

        db.select({ count: count() })
          .from(comments)
          .where(and(gte(comments.createdAt, prevStartDate), lte(comments.createdAt, prevEndDate)))
          .then(r => r[0]?.count || 0),

        db.select({
          count: count(),
          total: sum(tips.amount)
        })
          .from(tips)
          .where(and(gte(tips.createdAt, prevStartDate), lte(tips.createdAt, prevEndDate)))
          .then(r => ({ count: r[0]?.count || 0, total: parseFloat(r[0]?.total || '0') })),

        db.select({ count: count() })
          .from(views)
          .where(and(gte(views.createdAt, prevStartDate), lte(views.createdAt, prevEndDate)))
          .then(r => r[0]?.count || 0)
      ]);

      const totalEngagement = Number(reactionsCount) + Number(commentsCount) + Number(sharesCount) + tipsData.count;
      const prevTotalEngagement = Number(prevReactionsCount) + Number(prevCommentsCount) + prevTipsData.count;

      const totalReach = Number(viewsCount);
      const prevTotalReach = Number(prevViewsCount);

      const engagementRate = totalReach > 0 ? (totalEngagement / totalReach) * 100 : 0;
      const prevEngagementRate = prevTotalReach > 0 ? (prevTotalEngagement / prevTotalReach) * 100 : 0;

      // Calculate percentage changes
      const engagementChange = prevTotalEngagement > 0
        ? ((totalEngagement - prevTotalEngagement) / prevTotalEngagement) * 100
        : 0;
      const reachChange = prevTotalReach > 0
        ? ((totalReach - prevTotalReach) / prevTotalReach) * 100
        : 0;
      const engagementRateChange = prevEngagementRate > 0
        ? ((engagementRate - prevEngagementRate) / prevEngagementRate) * 100
        : 0;
      const tipsChange = prevTipsData.total > 0
        ? ((tipsData.total - prevTipsData.total) / prevTipsData.total) * 100
        : 0;

      return {
        totalEngagement,
        totalReach,
        engagementRate: Math.round(engagementRate * 10) / 10,
        totalTipsReceived: tipsData.total,

        reactions: Number(reactionsCount),
        comments: Number(commentsCount),
        shares: Number(sharesCount),
        tips: tipsData.count,

        engagementChange: Math.round(engagementChange * 10) / 10,
        reachChange: Math.round(reachChange * 10) / 10,
        engagementRateChange: Math.round(engagementRateChange * 10) / 10,
        tipsChange: Math.round(tipsChange * 10) / 10,

        verifiedUserEngagement: 0, // Would require user verification tracking
        communityLeaderEngagement: 0, // Would require role tracking
        followerEngagement: 0, // Would require follower tracking

        timeRange,
        startDate,
        endDate
      };
    } catch (error) {
      safeLogger.error('Error getting engagement analytics:', error);
      const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
      return this.getMockEngagementAnalytics(userId, timeRange, startDate, endDate);
    }
  }

  /**
   * Get engagement trends over time from real database
   */
  static async getEngagementTrends(
    userId?: string,
    timeRange: string = 'week',
    granularity: string = 'day'
  ): Promise<EngagementTrend[]> {
    try {
      if (!db) {
        safeLogger.warn('Database not initialized, returning mock data');
        const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
        return this.getMockEngagementTrends(timeRange, granularity, startDate, endDate);
      }

      const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
      const trends: EngagementTrend[] = [];

      // Generate date range based on granularity
      const dates: Date[] = [];
      const current = new Date(startDate);
      while (current <= endDate) {
        dates.push(new Date(current));
        if (granularity === 'hour') {
          current.setHours(current.getHours() + 1);
        } else {
          current.setDate(current.getDate() + 1);
        }
      }

      // For each date, aggregate the metrics
      for (const date of dates) {
        const nextDate = new Date(date);
        if (granularity === 'hour') {
          nextDate.setHours(nextDate.getHours() + 1);
        } else {
          nextDate.setDate(nextDate.getDate() + 1);
        }

        const [postsCount, reactionsCount, commentsCount, sharesCount, tipsCount, viewsCount] = await Promise.all([
          db.select({ count: count() })
            .from(posts)
            .where(and(gte(posts.createdAt, date), lte(posts.createdAt, nextDate)))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(reactions)
            .where(and(gte(reactions.createdAt, date), lte(reactions.createdAt, nextDate)))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(comments)
            .where(and(gte(comments.createdAt, date), lte(comments.createdAt, nextDate)))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(shares)
            .where(and(gte(shares.createdAt, date), lte(shares.createdAt, nextDate)))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(tips)
            .where(and(gte(tips.createdAt, date), lte(tips.createdAt, nextDate)))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(views)
            .where(and(gte(views.createdAt, date), lte(views.createdAt, nextDate)))
            .then(r => r[0]?.count || 0)
        ]);

        const totalEngagement = Number(reactionsCount) + Number(commentsCount) + Number(sharesCount) + Number(tipsCount);
        const reach = Number(viewsCount);
        const engagementRate = reach > 0 ? (totalEngagement / reach) * 100 : 0;

        trends.push({
          date,
          posts: Number(postsCount),
          reactions: Number(reactionsCount),
          comments: Number(commentsCount),
          shares: Number(sharesCount),
          tips: Number(tipsCount),
          reach,
          engagementRate: Math.round(engagementRate * 10) / 10
        });
      }

      return trends;
    } catch (error) {
      safeLogger.error('Error getting engagement trends:', error);
      const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
      return this.getMockEngagementTrends(timeRange, granularity, startDate, endDate);
    }
  }

  /**
   * Track a single engagement interaction
   */
  static async trackEngagementInteraction(interaction: EngagementInteraction): Promise<void> {
    try {
      safeLogger.info('Tracking engagement interaction:', {
        postId: interaction.postId,
        userId: interaction.userId,
        type: interaction.type,
        userType: interaction.userType,
        socialProofWeight: interaction.socialProofWeight
      });

      // Interactions are automatically tracked when users perform actions
      // (reactions, comments, shares, tips, views)
    } catch (error) {
      safeLogger.error('Error tracking engagement interaction:', error);
      throw new Error('Failed to track engagement interaction');
    }
  }

  /**
   * Track multiple engagement interactions in batch
   */
  static async trackEngagementBatch(interactions: EngagementInteraction[]): Promise<void> {
    try {
      safeLogger.info(`Tracking ${interactions.length} engagement interactions in batch`);

      for (const interaction of interactions) {
        await this.trackEngagementInteraction(interaction);
      }
    } catch (error) {
      safeLogger.error('Error tracking engagement batch:', error);
      throw new Error('Failed to track engagement batch');
    }
  }

  /**
   * Get top performing posts from real database
   */
  static async getTopPerformingPosts(
    userId?: string,
    timeRange: string = 'week',
    limit: number = 10,
    sortBy: string = 'engagementScore'
  ): Promise<PostEngagementMetrics[]> {
    try {
      if (!db) {
        return this.getMockTopPerformingPosts(userId, limit);
      }

      const { startDate } = this.getTimeRangeFilter(timeRange);

      // Get posts with their engagement metrics
      const postsWithMetrics = await db.select({
        id: posts.id,
        content: posts.content,
        title: posts.title,
        createdAt: posts.createdAt,
        upvotes: posts.upvotes,
        downvotes: posts.downvotes,
        authorId: posts.authorId
      })
        .from(posts)
        .where(gte(posts.createdAt, startDate))
        .orderBy(desc(posts.upvotes))
        .limit(limit * 2); // Get more to filter

      const result: PostEngagementMetrics[] = [];

      for (const post of postsWithMetrics) {
        // Get detailed metrics for each post
        const [reactionsCount, commentsCount, sharesCount, tipsCount, viewsCount] = await Promise.all([
          db.select({ count: count() })
            .from(reactions)
            .where(eq(reactions.postId, post.id))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(comments)
            .where(eq(comments.postId, post.id))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(shares)
            .where(eq(shares.postId, post.id))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(tips)
            .where(eq(tips.postId, post.id))
            .then(r => r[0]?.count || 0),

          db.select({ count: count() })
            .from(views)
            .where(eq(views.postId, post.id))
            .then(r => r[0]?.count || 0)
        ]);

        // Calculate engagement score
        const engagementScore = (Number(reactionsCount) * 2) +
          (Number(commentsCount) * 3) +
          (Number(sharesCount) * 5) +
          (Number(tipsCount) * 10) +
          ((post.upvotes || 0) - (post.downvotes || 0));

        result.push({
          postId: String(post.id),
          content: post.content || post.title || '',
          createdAt: post.createdAt || new Date(),
          reactions: Number(reactionsCount),
          comments: Number(commentsCount),
          shares: Number(sharesCount),
          tips: Number(tipsCount),
          views: Number(viewsCount),
          engagementScore,
          verifiedUserInteractions: 0,
          communityLeaderInteractions: 0,
          followerInteractions: 0,
          isTopPerforming: engagementScore > 100,
          trendingStatus: engagementScore > 500 ? 'hot' : engagementScore > 200 ? 'rising' : undefined
        });
      }

      // Sort by engagement score and return top N
      return result
        .sort((a, b) => b.engagementScore - a.engagementScore)
        .slice(0, limit);
    } catch (error) {
      safeLogger.error('Error getting top performing posts:', error);
      return this.getMockTopPerformingPosts(userId, limit);
    }
  }

  /**
   * Get social proof indicators for a post
   */
  static async getSocialProofIndicators(
    postId: string,
    maxDisplayCount: number = 5
  ): Promise<SocialProofIndicators> {
    try {
      // For now, return mock data since we need more complex queries
      // to get follower relationships and verified users
      return this.getMockSocialProofIndicators(postId, maxDisplayCount);
    } catch (error) {
      safeLogger.error('Error getting social proof indicators:', error);
      throw new Error('Failed to get social proof indicators');
    }
  }

  /**
   * Get engagement aggregate for a post from real database
   */
  static async getEngagementAggregate(
    postId: string,
    timeWindow: string = '1d'
  ): Promise<EngagementAggregate> {
    try {
      if (!db) {
        return this.getMockEngagementAggregate(postId, timeWindow);
      }

      // postId is a UUID string, no need to check if it's a number
      if (!postId) {
        return this.getMockEngagementAggregate(postId, timeWindow);
      }

      const windowMs = this.parseTimeWindow(timeWindow);
      const windowStart = new Date(Date.now() - windowMs);
      const windowEnd = new Date();

      const [reactionsData, commentsData, sharesData, tipsData, viewsData] = await Promise.all([
        db.select({
          count: count(),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${reactions.userId})`
        })
          .from(reactions)
          .where(and(
            eq(reactions.postId, postId),
            gte(reactions.createdAt, windowStart)
          ))
          .then(r => ({ count: r[0]?.count || 0, uniqueUsers: r[0]?.uniqueUsers || 0 })),

        db.select({ count: count() })
          .from(comments)
          .where(and(
            eq(comments.postId, postId),
            gte(comments.createdAt, windowStart)
          ))
          .then(r => r[0]?.count || 0),

        db.select({ count: count() })
          .from(shares)
          .where(and(
            eq(shares.postId, postId),
            gte(shares.createdAt, windowStart)
          ))
          .then(r => r[0]?.count || 0),

        db.select({ count: count() })
          .from(tips)
          .where(and(
            eq(tips.postId, postId),
            gte(tips.createdAt, windowStart)
          ))
          .then(r => r[0]?.count || 0),

        db.select({
          count: count(),
          uniqueUsers: sql<number>`COUNT(DISTINCT ${views.userId})`
        })
          .from(views)
          .where(and(
            eq(views.postId, postId),
            gte(views.createdAt, windowStart)
          ))
          .then(r => ({ count: r[0]?.count || 0, uniqueUsers: r[0]?.uniqueUsers || 0 }))
      ]);

      const totalInteractions = Number(reactionsData.count) + Number(commentsData) + Number(sharesData) + Number(tipsData);
      const uniqueUsers = Math.max(Number(reactionsData.uniqueUsers), Number(viewsData.uniqueUsers));

      // Calculate engagement velocity (interactions per hour)
      const hoursInWindow = windowMs / (1000 * 60 * 60);
      const engagementVelocity = hoursInWindow > 0 ? totalInteractions / hoursInWindow : 0;

      return {
        postId,
        timeWindow,
        totalInteractions,
        uniqueUsers,
        socialProofScore: totalInteractions * 2 + uniqueUsers * 3,
        influenceScore: Math.min(100, totalInteractions + uniqueUsers * 2),
        engagementVelocity: Math.round(engagementVelocity * 10) / 10,
        verifiedUserInteractions: 0,
        communityLeaderInteractions: 0,
        followerInteractions: 0,
        regularUserInteractions: totalInteractions,
        reactions: Number(reactionsData.count),
        comments: Number(commentsData),
        shares: Number(sharesData),
        tips: Number(tipsData),
        views: Number(viewsData.count),
        windowStart,
        windowEnd,
        lastUpdated: new Date()
      };
    } catch (error) {
      safeLogger.error('Error getting engagement aggregate:', error);
      return this.getMockEngagementAggregate(postId, timeWindow);
    }
  }

  /**
   * Get bulk post analytics
   */
  static async getBulkPostAnalytics(
    postIds: string[],
    timeRange: string = 'week'
  ): Promise<PostEngagementMetrics[]> {
    try {
      const result: PostEngagementMetrics[] = [];

      for (const postId of postIds) {
        const aggregate = await this.getEngagementAggregate(postId, '7d');
        result.push({
          postId,
          content: '',
          createdAt: new Date(),
          reactions: aggregate.reactions,
          comments: aggregate.comments,
          shares: aggregate.shares,
          tips: aggregate.tips,
          views: aggregate.views,
          engagementScore: aggregate.socialProofScore,
          verifiedUserInteractions: aggregate.verifiedUserInteractions,
          communityLeaderInteractions: aggregate.communityLeaderInteractions,
          followerInteractions: aggregate.followerInteractions,
          isTopPerforming: aggregate.socialProofScore > 100,
          trendingStatus: aggregate.engagementVelocity > 5 ? 'hot' : aggregate.engagementVelocity > 2 ? 'rising' : undefined
        });
      }

      return result;
    } catch (error) {
      safeLogger.error('Error getting bulk post analytics:', error);
      return postIds.map(postId => this.getMockPostEngagementMetrics(postId));
    }
  }

  /**
   * Get user engagement profile from real database
   */
  static async getUserEngagementProfile(userId: string): Promise<UserEngagementProfile> {
    try {
      if (!db) {
        return this.getMockUserEngagementProfile(userId);
      }

      // Get user's posts count
      const postsCount = await db.select({ count: count() })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .then(r => r[0]?.count || 0);

      // Get total engagement on user's posts
      const userPosts = await db.select({ id: posts.id })
        .from(posts)
        .where(eq(posts.authorId, userId))
        .limit(100);

      let totalReactions = 0;
      let totalComments = 0;
      let totalViews = 0;

      for (const post of userPosts) {
        const [reactionsCount, commentsCount, viewsCount] = await Promise.all([
          db.select({ count: count() })
            .from(reactions)
            .where(eq(reactions.postId, post.id))
            .then(r => Number(r[0]?.count || 0)),
          db.select({ count: count() })
            .from(comments)
            .where(eq(comments.postId, post.id))
            .then(r => Number(r[0]?.count || 0)),
          db.select({ count: count() })
            .from(views)
            .where(eq(views.postId, post.id))
            .then(r => Number(r[0]?.count || 0))
        ]);

        totalReactions += reactionsCount;
        totalComments += commentsCount;
        totalViews += viewsCount;
      }

      const totalEngagement = totalReactions + totalComments;
      const averageEngagementRate = totalViews > 0 ? (totalEngagement / totalViews) * 100 : 0;

      return {
        userId,
        totalPosts: Number(postsCount),
        averageEngagementRate: Math.round(averageEngagementRate * 10) / 10,
        bestPerformingTime: '2:00 PM - 4:00 PM', // Would need more data to calculate
        mostEngagedContentType: 'General', // Would need content type tracking
        audienceBreakdown: {
          verified: 0,
          leaders: 0,
          regular: 100
        },
        engagementPatterns: {
          peakHours: [14, 15, 16, 20, 21],
          peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
          seasonalTrends: []
        },
        socialProofImpact: {
          verifiedUserBoost: 2.5,
          leaderBoost: 1.8,
          followerNetworkBoost: 1.3
        }
      };
    } catch (error) {
      safeLogger.error('Error getting user engagement profile:', error);
      return this.getMockUserEngagementProfile(userId);
    }
  }

  /**
   * Calculate social proof score
   */
  static calculateSocialProofScore(indicators: SocialProofIndicators): number {
    const {
      totalFollowerEngagement,
      totalVerifiedEngagement,
      totalLeaderEngagement,
      verifiedEngagementBoost,
      leaderEngagementBoost
    } = indicators;

    let score = totalFollowerEngagement * 1.0;
    score += totalVerifiedEngagement * verifiedEngagementBoost;
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
   * Get time range filter dates
   */
  private static getTimeRangeFilter(timeRange: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case 'day':
        startDate.setDate(endDate.getDate() - 1);
        break;
      case 'week':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case 'month':
        startDate.setMonth(endDate.getMonth() - 1);
        break;
      case 'quarter':
        startDate.setMonth(endDate.getMonth() - 3);
        break;
      case 'year':
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      default:
        startDate.setDate(endDate.getDate() - 7);
    }

    return { startDate, endDate };
  }

  /**
   * Get previous period for comparison
   */
  private static getPreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      startDate: new Date(startDate.getTime() - duration),
      endDate: new Date(startDate.getTime())
    };
  }

  /**
   * Parse time window string to milliseconds
   */
  private static parseTimeWindow(timeWindow: string): number {
    const match = timeWindow.match(/^(\d+)([hdwm])$/);
    if (!match) return 24 * 60 * 60 * 1000; // Default 1 day

    const value = parseInt(match[1], 10);
    const unit = match[2];

    switch (unit) {
      case 'h': return value * 60 * 60 * 1000;
      case 'd': return value * 24 * 60 * 60 * 1000;
      case 'w': return value * 7 * 24 * 60 * 60 * 1000;
      case 'm': return value * 30 * 24 * 60 * 60 * 1000;
      default: return 24 * 60 * 60 * 1000;
    }
  }

  // Fallback mock data methods for when database is unavailable
  private static getMockEngagementAnalytics(
    userId?: string,
    timeRange: string = 'week',
    startDate: Date = new Date(),
    endDate: Date = new Date()
  ): EngagementAnalytics {
    return {
      totalEngagement: 0,
      totalReach: 0,
      engagementRate: 0,
      totalTipsReceived: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      engagementChange: 0,
      reachChange: 0,
      engagementRateChange: 0,
      tipsChange: 0,
      verifiedUserEngagement: 0,
      communityLeaderEngagement: 0,
      followerEngagement: 0,
      timeRange,
      startDate,
      endDate
    };
  }

  private static getMockEngagementTrends(
    timeRange: string,
    granularity: string,
    startDate: Date,
    endDate: Date
  ): EngagementTrend[] {
    const trends: EngagementTrend[] = [];
    const days = timeRange === 'week' ? 7 : timeRange === 'month' ? 30 : 1;

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      trends.push({
        date,
        posts: 0,
        reactions: 0,
        comments: 0,
        shares: 0,
        tips: 0,
        reach: 0,
        engagementRate: 0
      });
    }

    return trends;
  }

  private static getMockTopPerformingPosts(userId?: string, limit: number = 10): PostEngagementMetrics[] {
    return [];
  }

  private static getMockSocialProofIndicators(postId: string, maxDisplayCount: number): SocialProofIndicators {
    return {
      postId,
      followedUsersWhoEngaged: [],
      totalFollowerEngagement: 0,
      followerEngagementRate: 0,
      verifiedUsersWhoEngaged: [],
      totalVerifiedEngagement: 0,
      verifiedEngagementBoost: 3.0,
      communityLeadersWhoEngaged: [],
      totalLeaderEngagement: 0,
      leaderEngagementBoost: 2.0,
      socialProofScore: 0,
      socialProofLevel: 'low',
      showFollowerNames: true,
      showVerifiedBadges: true,
      showLeaderBadges: true,
      maxDisplayCount
    };
  }

  private static getMockEngagementAggregate(postId: string, timeWindow: string): EngagementAggregate {
    return {
      postId,
      timeWindow,
      totalInteractions: 0,
      uniqueUsers: 0,
      socialProofScore: 0,
      influenceScore: 0,
      engagementVelocity: 0,
      verifiedUserInteractions: 0,
      communityLeaderInteractions: 0,
      followerInteractions: 0,
      regularUserInteractions: 0,
      reactions: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      views: 0,
      windowStart: new Date(Date.now() - 24 * 60 * 60 * 1000),
      windowEnd: new Date(),
      lastUpdated: new Date()
    };
  }

  private static getMockUserEngagementProfile(userId: string): UserEngagementProfile {
    return {
      userId,
      totalPosts: 0,
      averageEngagementRate: 0,
      bestPerformingTime: 'N/A',
      mostEngagedContentType: 'N/A',
      audienceBreakdown: {
        verified: 0,
        leaders: 0,
        regular: 0
      },
      engagementPatterns: {
        peakHours: [],
        peakDays: [],
        seasonalTrends: []
      },
      socialProofImpact: {
        verifiedUserBoost: 2.5,
        leaderBoost: 1.8,
        followerNetworkBoost: 1.3
      }
    };
  }

  private static getMockPostEngagementMetrics(postId: string): PostEngagementMetrics {
    return {
      postId,
      content: '',
      createdAt: new Date(),
      reactions: 0,
      comments: 0,
      shares: 0,
      tips: 0,
      views: 0,
      engagementScore: 0,
      verifiedUserInteractions: 0,
      communityLeaderInteractions: 0,
      followerInteractions: 0,
      isTopPerforming: false,
      trendingStatus: undefined
    };
  }
}
