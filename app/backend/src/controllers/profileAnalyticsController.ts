import { Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { EngagementAnalyticsService } from '../services/engagementAnalyticsService';
import { DatabaseService } from '../services/databaseService';
import { eq, and, gte, lte, desc, sql, count } from 'drizzle-orm';
import { posts, users, follows, reactions, tips, views, comments, reposts } from '../db/schema';

export class ProfileAnalyticsController {
  private databaseService: DatabaseService;

  constructor() {
    this.databaseService = new DatabaseService();
  }

  /**
   * Get comprehensive profile analytics for a user
   */
  async getProfileAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeRange = '30d' } = req.query as { timeRange?: string };

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const { startDate, endDate } = this.getTimeRangeFilter(timeRange);
      const { startDate: prevStartDate, endDate: prevEndDate } = this.getPreviousPeriod(startDate, endDate);

      const db = this.databaseService.getDatabase();
      if (!db) {
        throw new Error('Database not available');
      }

      // Get user info
      const [user] = await db.select().from(users).where(eq(users.id, userId));
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found'
        });
        return;
      }

      // Get current period metrics
      const [viewsCount, reactionsCount, commentsCount, repostsCount, tipsData] = await Promise.all([
        // Total views
        db.select({ count: count() })
          .from(views)
          .where(
            and(
              eq(views.userId, userId),
              gte(views.createdAt, startDate)
            )
          )
          .then(r => r[0]?.count || 0),

        // Total reactions received
        db.select({ count: count() })
          .from(reactions)
          .innerJoin(posts, eq(reactions.postId, posts.id))
          .where(
            and(
              eq(posts.authorId, userId),
              gte(reactions.createdAt, startDate)
            )
          )
          .then(r => r[0]?.count || 0),

        // Total comments received
        db.select({ count: count() })
          .from(comments)
          .innerJoin(posts, eq(comments.postId, posts.id))
          .where(
            and(
              eq(posts.authorId, userId),
              gte(comments.createdAt, startDate)
            )
          )
          .then(r => r[0]?.count || 0),

        // Total reposts received
        db.select({ count: count() })
          .from(reposts)
          .innerJoin(posts, eq(reposts.postId, posts.id))
          .where(
            and(
              eq(posts.authorId, userId),
              gte(reposts.createdAt, startDate)
            )
          )
          .then(r => r[0]?.count || 0),

        // Total tips received
        db.select({
          count: count(),
          total: sql<number>`COALESCE(SUM(${tips.amount}), 0)`
        })
          .from(tips)
          .innerJoin(posts, eq(tips.postId, posts.id))
          .where(
            and(
              eq(posts.authorId, userId),
              gte(tips.createdAt, startDate)
            )
          )
          .then(r => ({ count: r[0]?.count || 0, total: parseFloat(r[0]?.total?.toString() || '0') }))
      ]);

      // Get previous period metrics
      const [prevViewsCount, prevFollowersCount, prevTipsTotal] = await Promise.all([
        db.select({ count: count() })
          .from(views)
          .where(
            and(
              eq(views.userId, userId),
              gte(views.createdAt, prevStartDate),
              lte(views.createdAt, prevEndDate)
            )
          )
          .then(r => r[0]?.count || 0),

        db.select({ count: count() })
          .from(follows)
          .where(
            and(
              eq(follows.followingId, userId),
              gte(follows.createdAt, prevStartDate),
              lte(follows.createdAt, prevEndDate)
            )
          )
          .then(r => r[0]?.count || 0),

        db.select({ total: sql<number>`COALESCE(SUM(${tips.amount}), 0)` })
          .from(tips)
          .innerJoin(posts, eq(tips.postId, posts.id))
          .where(
            and(
              eq(posts.authorId, userId),
              gte(tips.createdAt, prevStartDate),
              lte(tips.createdAt, prevEndDate)
            )
          )
          .then(r => parseFloat(r[0]?.total?.toString() || '0'))
      ]);

      // Get current followers count
      const [currentFollowers] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, userId))
        .then(r => r[0]?.count || 0);

      // Get total followers (all time)
      const [totalFollowers] = await db
        .select({ count: count() })
        .from(follows)
        .where(eq(follows.followingId, userId))
        .then(r => r[0]?.count || 0);

      // Calculate engagement
      const totalEngagement = Number(reactionsCount) + Number(commentsCount) + Number(repostsCount) + tipsData.count;
      const engagementRate = Number(viewsCount) > 0 ? (totalEngagement / Number(viewsCount)) * 100 : 0;

      // Calculate changes
      const engagementChange = prevViewsCount > 0
        ? ((totalEngagement - prevViewsCount) / prevViewsCount) * 100
        : 0;

      const reachChange = prevViewsCount > 0
        ? ((Number(viewsCount) - prevViewsCount) / prevViewsCount) * 100
        : 0;

      const followersChange = prevFollowersCount > 0
        ? ((currentFollowers - prevFollowersCount) / prevFollowersCount) * 100
        : 0;

      const earningsChange = prevTipsTotal > 0
        ? ((tipsData.total - prevTipsTotal) / prevTipsTotal) * 100
        : 0;

      // Get top performing posts
      const topPosts = await db
        .select({
          id: posts.id,
          content: posts.content,
          createdAt: posts.createdAt
        })
        .from(posts)
        .where(
          and(
            eq(posts.authorId, userId),
            gte(posts.createdAt, startDate)
          )
        )
        .orderBy(desc(posts.upvotes))
        .limit(5);

      const topPerformingPosts = await Promise.all(
        topPosts.map(async (post) => {
          const [postReactions, postComments, postReposts, postViews] = await Promise.all([
            db.select({ count: count() })
              .from(reactions)
              .where(eq(reactions.postId, post.id))
              .then(r => r[0]?.count || 0),

            db.select({ count: count() })
              .from(comments)
              .where(eq(comments.postId, post.id))
              .then(r => r[0]?.count || 0),

            db.select({ count: count() })
              .from(reposts)
              .where(eq(reposts.postId, post.id))
              .then(r => r[0]?.count || 0),

            db.select({ count: count() })
              .from(views)
              .where(eq(views.postId, post.id))
              .then(r => r[0]?.count || 0)
          ]);

          const engagement = Number(postReactions) * 2 + Number(postComments) * 3 + Number(postReposts) * 5;

          return {
            id: post.id,
            content: post.content || '',
            engagement,
            views: Number(postViews),
            reactions: Number(postReactions),
            comments: Number(postComments),
            reposts: Number(postReposts),
            createdAt: post.createdAt?.toISOString() || new Date().toISOString()
          };
        })
      );

      // Generate trend data
      const engagementTrends = this.generateTrendData(startDate, endDate, 7);
      const followerGrowth = this.generateTrendData(startDate, endDate, 7);
      const earningsTrend = this.generateTrendData(startDate, endDate, 7);

      const analyticsData = {
        totalViews: Number(viewsCount),
        totalEngagement,
        engagementRate: Math.round(engagementRate * 10) / 10,
        avgEngagementRate: Math.round(engagementRate * 10) / 10,
        totalFollowers: Number(totalFollowers),
        followerGrowthRate: Math.round(followersChange * 10) / 10,
        totalTipsReceived: tipsData.count,
        totalEarnings: tipsData.total,
        reactions: Number(reactionsCount),
        comments: Number(commentsCount),
        reposts: Number(repostsCount),
        shares: Number(repostsCount),
        tips: tipsData.count,
        bestPerformingTime: '2:00 PM - 4:00 PM',
        mostEngagedContentType: 'General Posts',
        topPerformingPosts,
        engagementTrends,
        followerGrowth,
        earningsTrend,
        audienceBreakdown: {
          verified: 15,
          leaders: 8,
          regular: 77
        },
        peakHours: [14, 15, 16, 20, 21],
        peakDays: ['Tuesday', 'Wednesday', 'Thursday'],
        vsPreviousPeriod: {
          engagementChange: Math.round(engagementChange * 10) / 10,
          reachChange: Math.round(reachChange * 10) / 10,
          followersChange: Math.round(followersChange * 10) / 10,
          earningsChange: Math.round(earningsChange * 10) / 10
        }
      };

      res.json({
        success: true,
        data: analyticsData
      });
    } catch (error) {
      safeLogger.error('Error getting profile analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve profile analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get user engagement profile
   */
  async getUserEngagementProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const profile = await EngagementAnalyticsService.getUserEngagementProfile(userId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      safeLogger.error('Error getting user engagement profile:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve engagement profile',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get engagement trends over time
   */
  async getEngagementTrends(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeRange = '30d', granularity = 'day' } = req.query as {
        timeRange?: string;
        granularity?: string;
      };

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const trends = await EngagementAnalyticsService.getEngagementTrends(
        userId,
        timeRange,
        granularity
      );

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      safeLogger.error('Error getting engagement trends:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve engagement trends',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get top performing posts
   */
  async getTopPerformingPosts(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { timeRange = '30d', limit = 10 } = req.query as {
        timeRange?: string;
        limit?: string;
      };

      if (!userId) {
        res.status(400).json({
          success: false,
          error: 'User ID is required'
        });
        return;
      }

      const posts = await EngagementAnalyticsService.getTopPerformingPosts(
        userId,
        timeRange,
        parseInt(limit)
      );

      res.json({
        success: true,
        data: posts
      });
    } catch (error) {
      safeLogger.error('Error getting top performing posts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top posts',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Helper methods
   */
  private getTimeRangeFilter(timeRange: string): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();

    switch (timeRange) {
      case '7d':
        startDate.setDate(endDate.getDate() - 7);
        break;
      case '30d':
        startDate.setDate(endDate.getDate() - 30);
        break;
      case '90d':
        startDate.setDate(endDate.getDate() - 90);
        break;
      case 'all':
        startDate.setFullYear(endDate.getFullYear() - 10);
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    return { startDate, endDate };
  }

  private getPreviousPeriod(startDate: Date, endDate: Date): { startDate: Date; endDate: Date } {
    const duration = endDate.getTime() - startDate.getTime();
    return {
      startDate: new Date(startDate.getTime() - duration),
      endDate: new Date(startDate.getTime())
    };
  }

  private generateTrendData(startDate: Date, endDate: Date, points: number): Array<{ date: string; value: number }> {
    const data: Array<{ date: string; value: number }> = [];
    const duration = endDate.getTime() - startDate.getTime();
    const interval = duration / (points - 1);

    for (let i = 0; i < points; i++) {
      const date = new Date(startDate.getTime() + interval * i);
      data.push({
        date: date.toISOString(),
        value: Math.floor(Math.random() * 100) + 50 // Mock data - would be calculated from actual metrics
      });
    }

    return data;
  }
}

export const profileAnalyticsController = new ProfileAnalyticsController();