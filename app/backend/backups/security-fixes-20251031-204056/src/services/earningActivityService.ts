import { db } from '../db/index';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, gte, lte, desc, sum, count, sql } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { 
  earningActivities, 
  earningConfig, 
  dailyEarningLimits, 
  userEarningStats,
  activityFeed,
  earningAbusePrevention,
  users,
  posts,
  reactions
} from '../db/schema';
import { notificationService } from './notificationService';
import { safeLogger } from '../utils/safeLogger';
import { reputationService } from './reputationService';
import { safeLogger } from '../utils/safeLogger';

export interface EarningActivityData {
  userId: string;
  activityType: 'post' | 'comment' | 'referral' | 'marketplace' | 'daily_login' | 'profile_complete';
  activityId?: string;
  metadata?: Record<string, any>;
  qualityScore?: number;
  isPremiumUser?: boolean;
}

export interface EarningResult {
  success: boolean;
  tokensEarned: number;
  baseReward: number;
  multiplier: number;
  premiumBonus: number;
  dailyLimitReached: boolean;
  message: string;
  activityId?: string;
}

export interface ActivityMetrics {
  totalActivities: number;
  tokensEarned: number;
  averageQualityScore: number;
  topActivityTypes: Array<{
    activityType: string;
    count: number;
    tokensEarned: number;
  }>;
}

class EarningActivityService {
  /**
   * Process an earning activity and calculate rewards
   */
  async processEarningActivity(data: EarningActivityData): Promise<EarningResult> {
    try {
      // Check for abuse prevention
      const abuseCheck = await this.checkAbusePreventionStatus(data.userId, data.activityType);
      if (abuseCheck.isSuspended) {
        return {
          success: false,
          tokensEarned: 0,
          baseReward: 0,
          multiplier: 0,
          premiumBonus: 0,
          dailyLimitReached: false,
          message: `Activity suspended: ${abuseCheck.reason}`
        };
      }

      // Get earning configuration for this activity type
      const config = await this.getEarningConfig(data.activityType);
      if (!config || !config.isActive) {
        return {
          success: false,
          tokensEarned: 0,
          baseReward: 0,
          multiplier: 0,
          premiumBonus: 0,
          dailyLimitReached: false,
          message: 'Activity type not configured for earning'
        };
      }

      // Check daily limits
      const dailyLimitCheck = await this.checkDailyLimit(data.userId, data.activityType, config.dailyLimit);
      if (dailyLimitCheck.limitReached) {
        return {
          success: false,
          tokensEarned: 0,
          baseReward: config.baseReward,
          multiplier: 0,
          premiumBonus: 0,
          dailyLimitReached: true,
          message: 'Daily earning limit reached for this activity'
        };
      }

      // Calculate quality score and multiplier
      const qualityScore = await this.calculateQualityScore(data);
      const qualityMultiplier = config.qualityMultiplierEnabled ? qualityScore : 1.0;

      // Check for premium bonus
      const premiumMultiplier = data.isPremiumUser ? (1 + config.premiumBonusPercentage / 100) : 1.0;

      // Calculate final reward
      const baseReward = config.baseReward;
      const totalMultiplier = qualityMultiplier * premiumMultiplier;
      const tokensEarned = baseReward * totalMultiplier;
      const premiumBonus = data.isPremiumUser ? baseReward * (config.premiumBonusPercentage / 100) : 0;

      // Create earning activity record
      const [activity] = await db.insert(earningActivities).values({
        userId: data.userId,
        activityType: data.activityType,
        activityId: data.activityId,
        tokensEarned: tokensEarned.toString(),
        baseReward: baseReward.toString(),
        multiplier: totalMultiplier.toString(),
        qualityScore: qualityScore.toString(),
        isPremiumBonus: data.isPremiumUser || false,
        premiumBonusAmount: premiumBonus.toString(),
        dailyLimitApplied: false,
        metadata: JSON.stringify(data.metadata || {}),
        status: 'processed',
        processedAt: new Date()
      }).returning();

      // Update daily limits
      await this.updateDailyLimit(data.userId, data.activityType, tokensEarned, config.dailyLimit);

      // Update user earning stats
      await this.updateUserEarningStats(data.userId, tokensEarned);

      // Create activity feed entry
      await this.createActivityFeedEntry(data.userId, data.activityType, tokensEarned, data.activityId);

      // Send notification
      await this.sendEarningNotification(data.userId, data.activityType, tokensEarned);

      return {
        success: true,
        tokensEarned,
        baseReward,
        multiplier: totalMultiplier,
        premiumBonus,
        dailyLimitReached: false,
        message: 'Tokens earned successfully',
        activityId: activity.id
      };

    } catch (error) {
      safeLogger.error('Error processing earning activity:', error);
      return {
        success: false,
        tokensEarned: 0,
        baseReward: 0,
        multiplier: 0,
        premiumBonus: 0,
        dailyLimitReached: false,
        message: 'Failed to process earning activity'
      };
    }
  }

  /**
   * Calculate quality score for content-based activities
   */
  private async calculateQualityScore(data: EarningActivityData): Promise<number> {
    if (!['post', 'comment'].includes(data.activityType)) {
      return 1.0; // Default score for non-content activities
    }

    let qualityScore = 1.0;

    try {
      if (data.activityType === 'post' && data.activityId) {
        // Get post engagement metrics
        const postMetrics = await this.getPostEngagementMetrics(parseInt(data.activityId));
        
        // Calculate quality based on engagement
        const engagementScore = Math.min(2.0, 1.0 + (postMetrics.totalEngagement / 100));
        qualityScore = engagementScore;
      }

      // Apply user reputation multiplier
      if (data.userId) {
        const userReputation = await reputationService.getUserReputation(data.userId);
        const reputationMultiplier = Math.min(1.5, 1.0 + (userReputation.score / 1000));
        qualityScore *= reputationMultiplier;
      }

      // Ensure quality score is within bounds
      return Math.max(0.5, Math.min(2.0, qualityScore));

    } catch (error) {
      safeLogger.error('Error calculating quality score:', error);
      return 1.0;
    }
  }

  /**
   * Get post engagement metrics for quality scoring
   */
  private async getPostEngagementMetrics(postId: number): Promise<{ totalEngagement: number }> {
    try {
      // This would typically aggregate reactions, tips, views, etc.
      // For now, return a simple calculation
      const [result] = await db
        .select({
          reactionCount: count(),
        })
        .from(reactions)
        .where(eq(reactions.postId, postId));

      return {
        totalEngagement: result?.reactionCount || 0
      };
    } catch (error) {
      safeLogger.error('Error getting post engagement metrics:', error);
      return { totalEngagement: 0 };
    }
  }

  /**
   * Check daily earning limits
   */
  private async checkDailyLimit(userId: string, activityType: string, dailyLimit: number): Promise<{ limitReached: boolean; currentAmount: number }> {
    const today = new Date().toISOString().split('T')[0];

    const [existing] = await db
      .select()
      .from(dailyEarningLimits)
      .where(
        and(
          eq(dailyEarningLimits.userId, userId),
          eq(dailyEarningLimits.activityType, activityType),
          eq(dailyEarningLimits.date, today)
        )
      );

    const currentAmount = existing ? parseFloat(existing.tokensEarnedToday) : 0;
    return {
      limitReached: currentAmount >= dailyLimit,
      currentAmount
    };
  }

  /**
   * Update daily earning limits
   */
  private async updateDailyLimit(userId: string, activityType: string, tokensEarned: number, dailyLimit: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];

    await db
      .insert(dailyEarningLimits)
      .values({
        userId,
        activityType,
        date: today,
        tokensEarnedToday: tokensEarned.toString(),
        dailyLimit: dailyLimit.toString(),
        limitReached: tokensEarned >= dailyLimit
      })
      .onConflictDoUpdate({
        target: [dailyEarningLimits.userId, dailyEarningLimits.date, dailyEarningLimits.activityType],
        set: {
          tokensEarnedToday: sql`${dailyEarningLimits.tokensEarnedToday} + ${tokensEarned}`,
          limitReached: sql`(${dailyEarningLimits.tokensEarnedToday} + ${tokensEarned}) >= ${dailyLimit}`,
          updatedAt: new Date()
        }
      });
  }

  /**
   * Update user earning statistics
   */
  private async updateUserEarningStats(userId: string, tokensEarned: number): Promise<void> {
    const today = new Date().toISOString().split('T')[0];
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    const monthStart = new Date();
    monthStart.setDate(1);

    await db
      .insert(userEarningStats)
      .values({
        userId,
        totalTokensEarned: tokensEarned.toString(),
        tokensEarnedToday: tokensEarned.toString(),
        tokensEarnedThisWeek: tokensEarned.toString(),
        tokensEarnedThisMonth: tokensEarned.toString(),
        totalActivities: 1,
        lastActivityDate: today,
        currentStreak: 1
      })
      .onConflictDoUpdate({
        target: [userEarningStats.userId],
        set: {
          totalTokensEarned: sql`${userEarningStats.totalTokensEarned} + ${tokensEarned}`,
          tokensEarnedToday: sql`CASE WHEN ${userEarningStats.lastActivityDate} = '${today}' THEN ${userEarningStats.tokensEarnedToday} + ${tokensEarned} ELSE ${tokensEarned} END`,
          tokensEarnedThisWeek: sql`${userEarningStats.tokensEarnedThisWeek} + ${tokensEarned}`,
          tokensEarnedThisMonth: sql`${userEarningStats.tokensEarnedThisMonth} + ${tokensEarned}`,
          totalActivities: sql`${userEarningStats.totalActivities} + 1`,
          lastActivityDate: today,
          updatedAt: new Date()
        }
      });
  }

  /**
   * Create activity feed entry
   */
  private async createActivityFeedEntry(userId: string, activityType: string, tokensEarned: number, activityId?: string): Promise<void> {
    const activityTitles = {
      post: 'New Post Reward',
      comment: 'Comment Reward',
      referral: 'Referral Bonus',
      marketplace: 'Marketplace Reward',
      daily_login: 'Daily Login Bonus',
      profile_complete: 'Profile Completion Bonus'
    };

    const activityDescriptions = {
      post: 'You earned tokens for creating a quality post',
      comment: 'You earned tokens for engaging with the community',
      referral: 'You earned a bonus for referring a new user',
      marketplace: 'You earned tokens from marketplace activity',
      daily_login: 'You earned your daily login bonus',
      profile_complete: 'You earned tokens for completing your profile'
    };

    await db.insert(activityFeed).values({
      userId,
      activityType,
      title: activityTitles[activityType] || 'Token Reward',
      description: activityDescriptions[activityType] || 'You earned tokens',
      tokensEarned: tokensEarned.toString(),
      icon: `${activityType}_reward`,
      actionUrl: activityId ? `/post/${activityId}` : '/dashboard',
      isRead: false,
      metadata: JSON.stringify({ activityId, tokensEarned })
    });
  }

  /**
   * Send earning notification
   */
  private async sendEarningNotification(userId: string, activityType: string, tokensEarned: number): Promise<void> {
    try {
      await notificationService.createNotification({
        userId,
        type: 'earning_reward',
        title: 'Tokens Earned!',
        message: `You earned ${tokensEarned.toFixed(2)} LDAO tokens for ${activityType}`,
        data: {
          activityType,
          tokensEarned,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      safeLogger.error('Error sending earning notification:', error);
    }
  }

  /**
   * Get earning configuration for activity type
   */
  private async getEarningConfig(activityType: string) {
    const [config] = await db
      .select()
      .from(earningConfig)
      .where(eq(earningConfig.activityType, activityType));

    if (!config) return null;

    return {
      baseReward: parseFloat(config.baseReward),
      dailyLimit: parseFloat(config.dailyLimit),
      qualityMultiplierEnabled: config.qualityMultiplierEnabled,
      premiumBonusPercentage: parseFloat(config.premiumBonusPercentage),
      cooldownPeriod: config.cooldownPeriod,
      minQualityScore: parseFloat(config.minQualityScore),
      maxQualityScore: parseFloat(config.maxQualityScore),
      isActive: config.isActive
    };
  }

  /**
   * Check abuse prevention status
   */
  private async checkAbusePreventionStatus(userId: string, activityType: string): Promise<{ isSuspended: boolean; reason?: string }> {
    const [record] = await db
      .select()
      .from(earningAbusePrevention)
      .where(
        and(
          eq(earningAbusePrevention.userId, userId),
          eq(earningAbusePrevention.activityType, activityType)
        )
      );

    if (!record) {
      return { isSuspended: false };
    }

    if (record.status === 'suspended' || record.status === 'banned') {
      return {
        isSuspended: true,
        reason: record.flaggedReason || 'Account flagged for suspicious activity'
      };
    }

    return { isSuspended: false };
  }

  /**
   * Get user activity metrics
   */
  async getUserActivityMetrics(userId: string, days: number = 30): Promise<ActivityMetrics> {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const activities = await db
      .select({
        activityType: earningActivities.activityType,
        tokensEarned: earningActivities.tokensEarned,
        qualityScore: earningActivities.qualityScore
      })
      .from(earningActivities)
      .where(
        and(
          eq(earningActivities.userId, userId),
          gte(earningActivities.createdAt, startDate)
        )
      );

    const totalActivities = activities.length;
    const tokensEarned = activities.reduce((sum, activity) => sum + parseFloat(activity.tokensEarned), 0);
    const averageQualityScore = activities.length > 0 
      ? activities.reduce((sum, activity) => sum + parseFloat(activity.qualityScore || '1'), 0) / activities.length
      : 0;

    // Group by activity type
    const activityTypeMap = new Map<string, { count: number; tokensEarned: number }>();
    activities.forEach(activity => {
      const existing = activityTypeMap.get(activity.activityType) || { count: 0, tokensEarned: 0 };
      activityTypeMap.set(activity.activityType, {
        count: existing.count + 1,
        tokensEarned: existing.tokensEarned + parseFloat(activity.tokensEarned)
      });
    });

    const topActivityTypes = Array.from(activityTypeMap.entries())
      .map(([activityType, data]) => ({
        activityType,
        count: data.count,
        tokensEarned: data.tokensEarned
      }))
      .sort((a, b) => b.tokensEarned - a.tokensEarned);

    return {
      totalActivities,
      tokensEarned,
      averageQualityScore,
      topActivityTypes
    };
  }

  /**
   * Get user's activity feed
   */
  async getUserActivityFeed(userId: string, limit: number = 20, offset: number = 0) {
    return await db
      .select()
      .from(activityFeed)
      .where(eq(activityFeed.userId, userId))
      .orderBy(desc(activityFeed.createdAt))
      .limit(limit)
      .offset(offset);
  }

  /**
   * Mark activity feed items as read
   */
  async markActivityFeedAsRead(userId: string, activityIds: string[]): Promise<void> {
    await db
      .update(activityFeed)
      .set({ isRead: true })
      .where(
        and(
          eq(activityFeed.userId, userId),
          sql`${activityFeed.id} = ANY(${activityIds})`
        )
      );
  }

  /**
   * Get earning leaderboard
   */
  async getEarningLeaderboard(period: 'daily' | 'weekly' | 'monthly' | 'all' = 'weekly', limit: number = 10) {
    let dateFilter;
    const now = new Date();

    switch (period) {
      case 'daily':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case 'weekly':
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        dateFilter = weekStart;
        break;
      case 'monthly':
        dateFilter = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      default:
        dateFilter = null;
    }

    const query = db
      .select({
        userId: earningActivities.userId,
        totalTokens: sum(earningActivities.tokensEarned),
        activityCount: count(earningActivities.id),
        userHandle: users.handle,
        userWalletAddress: users.walletAddress
      })
      .from(earningActivities)
      .leftJoin(users, eq(earningActivities.userId, users.id))
      .groupBy(earningActivities.userId, users.handle, users.walletAddress)
      .orderBy(desc(sum(earningActivities.tokensEarned)))
      .limit(limit);

    if (dateFilter) {
      query.where(gte(earningActivities.createdAt, dateFilter));
    }

    return await query;
  }

  /**
   * Get user earning statistics
   */
  async getUserEarningStats(userId: string) {
    const [stats] = await db
      .select()
      .from(userEarningStats)
      .where(eq(userEarningStats.userId, userId));

    if (!stats) {
      return {
        totalTokensEarned: '0',
        tokensEarnedToday: '0',
        tokensEarnedThisWeek: '0',
        tokensEarnedThisMonth: '0',
        totalActivities: 0,
        referralsMade: 0,
        challengesCompleted: 0,
        currentStreak: 0,
        longestStreak: 0,
        lastActivityDate: null
      };
    }

    return {
      totalTokensEarned: stats.totalTokensEarned,
      tokensEarnedToday: stats.tokensEarnedToday,
      tokensEarnedThisWeek: stats.tokensEarnedThisWeek,
      tokensEarnedThisMonth: stats.tokensEarnedThisMonth,
      totalActivities: stats.totalActivities,
      referralsMade: stats.referralsMade,
      challengesCompleted: stats.challengesCompleted,
      currentStreak: stats.currentStreak,
      longestStreak: stats.longestStreak,
      lastActivityDate: stats.lastActivityDate
    };
  }

  /**
   * Get earning configuration
   */
  async getEarningConfiguration() {
    const configs = await db
      .select()
      .from(earningConfig)
      .where(eq(earningConfig.isActive, true));

    return configs.map(config => ({
      activityType: config.activityType,
      baseReward: parseFloat(config.baseReward),
      dailyLimit: parseFloat(config.dailyLimit),
      qualityMultiplierEnabled: config.qualityMultiplierEnabled,
      premiumBonusPercentage: parseFloat(config.premiumBonusPercentage),
      cooldownPeriod: config.cooldownPeriod,
      minQualityScore: parseFloat(config.minQualityScore),
      maxQualityScore: parseFloat(config.maxQualityScore),
      isActive: config.isActive
    }));
  }
}

export const earningActivityService = new EarningActivityService();