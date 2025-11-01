import { db } from '../db/index';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc, sum, count, gte, lte, sql } from 'drizzle-orm';
import { 
  earningActivities,
  users,
} from '../db/schema';
import { earningActivityService } from './earningActivityService';
import { earningNotificationService } from './earningNotificationService';
import { nanoid } from 'nanoid';

export interface ReferralData {
  referrerId: string;
  refereeId: string;
  tier?: number;
  bonusPercentage?: number;
  expiresAt?: Date;
}

export interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalEarned: number;
  thisMonthEarned: number;
  topTier: number;
  referralsByTier: Array<{
    tier: number;
    count: number;
    earned: number;
  }>;
}

export interface ReferralLeaderboard {
  userId: string;
  userHandle?: string;
  userWalletAddress: string;
  totalReferrals: number;
  totalEarned: number;
  topTier: number;
}

class ReferralService {
  /**
   * Generate unique referral code
   */
  generateReferralCode(): string {
    return nanoid(8).toUpperCase();
  }

  /**
   * Create a new referral relationship
   */
  async createReferral(data: ReferralData): Promise<{ success: boolean; referralCode?: string; message: string }> {
    try {
      // Check if referral relationship already exists
      const existingReferral = await db
        .select()
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, data.referrerId),
            eq(referrals.refereeId, data.refereeId)
          )
        )
        .limit(1);

      if (existingReferral.length > 0) {
        return {
          success: false,
          message: 'Referral relationship already exists'
        };
      }

      // Generate unique referral code
      let referralCode: string;
      let isUnique = false;
      let attempts = 0;

      while (!isUnique && attempts < 10) {
        referralCode = this.generateReferralCode();
        const existing = await db
          .select()
          .from(referrals)
          .where(eq(referrals.referralCode, referralCode))
          .limit(1);
        
        isUnique = existing.length === 0;
        attempts++;
      }

      if (!isUnique) {
        return {
          success: false,
          message: 'Failed to generate unique referral code'
        };
      }

      // Create referral record
      const [referral] = await db.insert(referrals).values({
        referrerId: data.referrerId,
        refereeId: data.refereeId,
        referralCode: referralCode!,
        tier: data.tier || 1,
        bonusPercentage: (data.bonusPercentage || 10).toString(),
        totalEarned: '0',
        status: 'active',
        expiresAt: data.expiresAt
      }).returning();

      // Process signup bonus for referrer
      await this.processSignupBonus(referral.id, data.referrerId);

      // Update referrer stats
      await this.updateReferrerStats(data.referrerId);

      return {
        success: true,
        referralCode: referral.referralCode,
        message: 'Referral created successfully'
      };

    } catch (error) {
      safeLogger.error('Error creating referral:', error);
      return {
        success: false,
        message: 'Failed to create referral'
      };
    }
  }

  /**
   * Process signup bonus for referrer
   */
  private async processSignupBonus(referralId: string, referrerId: string): Promise<void> {
    try {
      const signupBonusAmount = 50; // Base signup bonus

      // Create referral reward record
      await db.insert(referralRewards).values({
        referralId,
        rewardAmount: signupBonusAmount.toString(),
        rewardType: 'signup_bonus',
        milestoneReached: 'New user signup'
      });

      // Process earning activity
      const result = await earningActivityService.processEarningActivity({
        userId: referrerId,
        activityType: 'referral',
        activityId: referralId,
        metadata: {
          referralId,
          rewardType: 'signup_bonus',
          bonusAmount: signupBonusAmount
        }
      });

      if (result.success) {
        // Update referral total earned
        await db
          .update(referrals)
          .set({
            totalEarned: result.tokensEarned.toString(),
            updatedAt: new Date()
          })
          .where(eq(referrals.id, referralId));

        // Send notification
        await earningNotificationService.sendEarningNotification({
          userId: referrerId,
          type: 'earning_reward',
          title: 'Referral Bonus Earned!',
          message: `You earned ${result.tokensEarned} LDAO tokens for referring a new user!`,
          tokensEarned: result.tokensEarned,
          activityType: 'referral',
          metadata: {
            referralId,
            rewardType: 'signup_bonus'
          }
        });
      }

    } catch (error) {
      safeLogger.error('Error processing signup bonus:', error);
    }
  }

  /**
   * Process activity bonus for referrer when referee earns tokens
   */
  async processActivityBonus(refereeId: string, activityTokens: number): Promise<void> {
    try {
      // Find active referrals for this referee
      const activeReferrals = await db
        .select()
        .from(referrals)
        .where(
          and(
            eq(referrals.refereeId, refereeId),
            eq(referrals.status, 'active')
          )
        );

      for (const referral of activeReferrals) {
        const bonusPercentage = parseFloat(referral.bonusPercentage);
        const bonusAmount = activityTokens * (bonusPercentage / 100);

        if (bonusAmount > 0) {
          // Create referral reward record
          await db.insert(referralRewards).values({
            referralId: referral.id,
            rewardAmount: bonusAmount.toString(),
            rewardType: 'activity_bonus',
            milestoneReached: `Referee earned ${activityTokens} tokens`
          });

          // Process earning activity for referrer
          const result = await earningActivityService.processEarningActivity({
            userId: referral.referrerId,
            activityType: 'referral',
            activityId: referral.id,
            metadata: {
              referralId: referral.id,
              refereeId,
              rewardType: 'activity_bonus',
              refereeTokens: activityTokens,
              bonusAmount,
              bonusPercentage
            }
          });

          if (result.success) {
            // Update referral total earned
            const newTotal = parseFloat(referral.totalEarned) + result.tokensEarned;
            await db
              .update(referrals)
              .set({
                totalEarned: newTotal.toString(),
                updatedAt: new Date()
              })
              .where(eq(referrals.id, referral.id));

            // Send notification to referrer
            await earningNotificationService.sendEarningNotification({
              userId: referral.referrerId,
              type: 'earning_reward',
              title: 'Referral Activity Bonus!',
              message: `You earned ${result.tokensEarned} LDAO tokens (${bonusPercentage}% bonus) from your referee's activity!`,
              tokensEarned: result.tokensEarned,
              activityType: 'referral',
              metadata: {
                referralId: referral.id,
                rewardType: 'activity_bonus',
                bonusPercentage
              }
            });
          }
        }
      }

    } catch (error) {
      safeLogger.error('Error processing activity bonus:', error);
    }
  }

  /**
   * Process milestone bonus when referrer reaches certain milestones
   */
  async processMilestoneBonus(referrerId: string): Promise<void> {
    try {
      const stats = await this.getReferralStats(referrerId);
      
      // Define milestone rewards
      const milestones = [
        { count: 5, reward: 100, title: '5 Referrals Milestone' },
        { count: 10, reward: 250, title: '10 Referrals Milestone' },
        { count: 25, reward: 500, title: '25 Referrals Milestone' },
        { count: 50, reward: 1000, title: '50 Referrals Milestone' },
        { count: 100, reward: 2500, title: '100 Referrals Milestone' }
      ];

      for (const milestone of milestones) {
        if (stats.totalReferrals >= milestone.count) {
          // Check if milestone bonus already given
          const existingBonus = await db
            .select()
            .from(referralRewards)
            .where(
              and(
                eq(referralRewards.rewardType, 'milestone_bonus'),
                eq(referralRewards.milestoneReached, milestone.title)
              )
            )
            .limit(1);

          if (existingBonus.length === 0) {
            // Create milestone reward
            await db.insert(referralRewards).values({
              referralId: '', // No specific referral for milestone
              rewardAmount: milestone.reward.toString(),
              rewardType: 'milestone_bonus',
              milestoneReached: milestone.title
            });

            // Process earning activity
            const result = await earningActivityService.processEarningActivity({
              userId: referrerId,
              activityType: 'referral',
              metadata: {
                rewardType: 'milestone_bonus',
                milestone: milestone.count,
                bonusAmount: milestone.reward
              }
            });

            if (result.success) {
              // Send milestone notification
              await earningNotificationService.sendMilestoneNotification(referrerId, {
                type: 'referrals',
                milestone: milestone.count,
                currentValue: stats.totalReferrals,
                reward: result.tokensEarned
              });
            }
          }
        }
      }

    } catch (error) {
      safeLogger.error('Error processing milestone bonus:', error);
    }
  }

  /**
   * Get referral statistics for a user
   */
  async getReferralStats(userId: string): Promise<ReferralStats> {
    try {
      // Get total referrals
      const [totalReferralsResult] = await db
        .select({ count: count() })
        .from(referrals)
        .where(eq(referrals.referrerId, userId));

      // Get active referrals
      const [activeReferralsResult] = await db
        .select({ count: count() })
        .from(referrals)
        .where(
          and(
            eq(referrals.referrerId, userId),
            eq(referrals.status, 'active')
          )
        );

      // Get total earned
      const [totalEarnedResult] = await db
        .select({ total: sum(referrals.totalEarned) })
        .from(referrals)
        .where(eq(referrals.referrerId, userId));

      // Get this month's earnings
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [monthEarnedResult] = await db
        .select({ total: sum(referralRewards.rewardAmount) })
        .from(referralRewards)
        .innerJoin(referrals, eq(referralRewards.referralId, referrals.id))
        .where(
          and(
            eq(referrals.referrerId, userId),
            gte(referralRewards.createdAt, monthStart)
          )
        );

      // Get referrals by tier
      const referralsByTier = await db
        .select({
          tier: referrals.tier,
          count: count(),
          earned: sum(referrals.totalEarned)
        })
        .from(referrals)
        .where(eq(referrals.referrerId, userId))
        .groupBy(referrals.tier);

      const topTier = Math.max(...referralsByTier.map(r => r.tier), 1);

      return {
        totalReferrals: totalReferralsResult?.count || 0,
        activeReferrals: activeReferralsResult?.count || 0,
        totalEarned: parseFloat(totalEarnedResult?.total || '0'),
        thisMonthEarned: parseFloat(monthEarnedResult?.total || '0'),
        topTier,
        referralsByTier: referralsByTier.map(r => ({
          tier: r.tier,
          count: r.count,
          earned: parseFloat(r.earned || '0')
        }))
      };

    } catch (error) {
      safeLogger.error('Error getting referral stats:', error);
      return {
        totalReferrals: 0,
        activeReferrals: 0,
        totalEarned: 0,
        thisMonthEarned: 0,
        topTier: 1,
        referralsByTier: []
      };
    }
  }

  /**
   * Get referral leaderboard
   */
  async getReferralLeaderboard(limit: number = 10): Promise<ReferralLeaderboard[]> {
    try {
      const leaderboard = await db
        .select({
          userId: referrals.referrerId,
          userHandle: users.handle,
          userWalletAddress: users.walletAddress,
          totalReferrals: count(referrals.id),
          totalEarned: sum(referrals.totalEarned),
          topTier: sql<number>`MAX(${referrals.tier})`
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.referrerId, users.id))
        .groupBy(referrals.referrerId, users.handle, users.walletAddress)
        .orderBy(desc(count(referrals.id)), desc(sum(referrals.totalEarned)))
        .limit(limit);

      return leaderboard.map(item => ({
        userId: item.userId,
        userHandle: item.userHandle || undefined,
        userWalletAddress: item.userWalletAddress,
        totalReferrals: item.totalReferrals,
        totalEarned: parseFloat(item.totalEarned || '0'),
        topTier: item.topTier
      }));

    } catch (error) {
      safeLogger.error('Error getting referral leaderboard:', error);
      return [];
    }
  }

  /**
   * Get user's referral history
   */
  async getUserReferralHistory(userId: string, limit: number = 20, offset: number = 0) {
    try {
      const referralHistory = await db
        .select({
          id: referrals.id,
          referralCode: referrals.referralCode,
          refereeId: referrals.refereeId,
          refereeHandle: users.handle,
          refereeWalletAddress: users.walletAddress,
          tier: referrals.tier,
          bonusPercentage: referrals.bonusPercentage,
          totalEarned: referrals.totalEarned,
          status: referrals.status,
          createdAt: referrals.createdAt
        })
        .from(referrals)
        .leftJoin(users, eq(referrals.refereeId, users.id))
        .where(eq(referrals.referrerId, userId))
        .orderBy(desc(referrals.createdAt))
        .limit(limit)
        .offset(offset);

      return referralHistory.map(item => ({
        ...item,
        totalEarned: parseFloat(item.totalEarned),
        bonusPercentage: parseFloat(item.bonusPercentage)
      }));

    } catch (error) {
      safeLogger.error('Error getting user referral history:', error);
      return [];
    }
  }

  /**
   * Get referral rewards history
   */
  async getReferralRewardsHistory(referralId: string) {
    try {
      return await db
        .select()
        .from(referralRewards)
        .where(eq(referralRewards.referralId, referralId))
        .orderBy(desc(referralRewards.createdAt));

    } catch (error) {
      safeLogger.error('Error getting referral rewards history:', error);
      return [];
    }
  }

  /**
   * Update referrer statistics
   */
  private async updateReferrerStats(referrerId: string): Promise<void> {
    try {
      await db
        .update(userEarningStats)
        .set({
          referralsMade: sql`${userEarningStats.referralsMade} + 1`,
          updatedAt: new Date()
        })
        .where(eq(userEarningStats.userId, referrerId));

    } catch (error) {
      safeLogger.error('Error updating referrer stats:', error);
    }
  }

  /**
   * Deactivate referral
   */
  async deactivateReferral(referralId: string, reason?: string): Promise<{ success: boolean; message: string }> {
    try {
      await db
        .update(referrals)
        .set({
          status: 'inactive',
          updatedAt: new Date()
        })
        .where(eq(referrals.id, referralId));

      return {
        success: true,
        message: 'Referral deactivated successfully'
      };

    } catch (error) {
      safeLogger.error('Error deactivating referral:', error);
      return {
        success: false,
        message: 'Failed to deactivate referral'
      };
    }
  }

  /**
   * Get referral by code
   */
  async getReferralByCode(referralCode: string) {
    try {
      const [referral] = await db
        .select()
        .from(referrals)
        .where(eq(referrals.referralCode, referralCode))
        .limit(1);

      return referral || null;

    } catch (error) {
      safeLogger.error('Error getting referral by code:', error);
      return null;
    }
  }

  /**
   * Validate referral code
   */
  async validateReferralCode(referralCode: string): Promise<{ valid: boolean; referrerId?: string; message: string }> {
    try {
      const referral = await this.getReferralByCode(referralCode);

      if (!referral) {
        return {
          valid: false,
          message: 'Invalid referral code'
        };
      }

      if (referral.status !== 'active') {
        return {
          valid: false,
          message: 'Referral code is not active'
        };
      }

      if (referral.expiresAt && new Date() > referral.expiresAt) {
        return {
          valid: false,
          message: 'Referral code has expired'
        };
      }

      return {
        valid: true,
        referrerId: referral.referrerId,
        message: 'Valid referral code'
      };

    } catch (error) {
      safeLogger.error('Error validating referral code:', error);
      return {
        valid: false,
        message: 'Error validating referral code'
      };
    }
  }
}

export const referralService = new ReferralService();
