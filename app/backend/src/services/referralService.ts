import { db } from '../db/index';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc, sum, count, gte, lte, sql } from 'drizzle-orm';
import { 
  earningActivities,
  users,
  referralActivities
} from '../db/schema';
import { earningActivityService } from './earningActivityService';
import { earningNotificationService } from './earningNotificationService';
import { nanoid } from 'nanoid';
import { referralConfigService } from './referralConfigService';

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
    const codeLength = referralConfigService.getReferralCodeLength ? referralConfigService.getReferralCodeLength() : 8;
    return nanoid(typeof codeLength === 'number' ? codeLength : 8).toUpperCase();
  }

  /**
   * Create a new referral relationship
   */
  async createReferral(data: ReferralData): Promise<{ success: boolean; referralCode?: string; message: string }> {
    try {
      // Check if referral relationship already exists
      const existingReferral = await db
        .select()
        .from(referralActivities)
        .where(
          and(
            eq(referralActivities.referrerId, data.referrerId),
            eq(referralActivities.refereeId, data.refereeId)
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
          .from(referralActivities)
          .where(eq(referralActivities.id, referralCode))
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
      const [referral] = await db.insert(referralActivities).values({
        referrerId: data.referrerId,
        refereeId: data.refereeId,
        activityType: 'referral_created',
        tokensEarned: '0',
        tierLevel: data.tier || 1,
        bonusPercentage: (data.bonusPercentage || 10).toString(),
        metadata: JSON.stringify({ referralCode, expiresAt: data.expiresAt })
      }).returning();

      // Process signup bonus for referrer
      await this.processSignupBonus(referral.id, data.referrerId);

      // Update referrer stats
      await this.updateReferrerStats(data.referrerId);

      return {
        success: true,
        referralCode: referralCode!,
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
      // Get bonus tokens from config
      const signupBonusAmount = await referralConfigService.getConfigValue('referral_bonus_tokens', 25) as number;

      // Create earning activity record instead of referral reward
      await db.insert(earningActivities).values({
        userId: referrerId,
        activityType: 'referral',
        activityId: referralId,
        tokensEarned: signupBonusAmount.toString(),
        multiplier: '1.0',
        isPremiumBonus: false,
        metadata: JSON.stringify({ 
          referralId,
          rewardType: 'signup_bonus',
          bonusAmount: signupBonusAmount
        })
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
          .update(referralActivities)
          .set({
            tokensEarned: result.tokensEarned.toString()
          })
          .where(eq(referralActivities.id, referralId));

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
        .from(referralActivities)
        .where(
          and(
            eq(referralActivities.refereeId, refereeId)
          )
        );

      for (const referral of activeReferrals) {
        const bonusPercentage = parseFloat(referral.bonusPercentage);
        const bonusAmount = activityTokens * (bonusPercentage / 100);

        if (bonusAmount > 0) {
          // Create earning activity record instead of referral reward
          await db.insert(earningActivities).values({
            userId: referral.referrerId,
            activityType: 'referral',
            activityId: referral.id,
            tokensEarned: bonusAmount.toString(),
            multiplier: '1.0',
            isPremiumBonus: false,
            metadata: JSON.stringify({ 
              referralId: referral.id,
              refereeId,
              rewardType: 'activity_bonus',
              refereeTokens: activityTokens,
              bonusAmount,
              bonusPercentage
            })
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
            const newTotal = parseFloat(referral.tokensEarned) + result.tokensEarned;
            await db
              .update(referralActivities)
              .set({
                tokensEarned: newTotal.toString()
              })
              .where(eq(referralActivities.id, referral.id));

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
      
      // Get milestone rewards from config
      const milestoneRewards = await referralConfigService.getMilestoneRewards();
      
      // Process milestones based on config
      for (const [countStr, reward] of Object.entries(milestoneRewards)) {
        const count = parseInt(countStr);
        if (stats.totalReferrals >= count) {
          // Check if milestone bonus already given
          const existingBonus = await db
            .select()
            .from(earningActivities)
            .where(
              and(
                eq(earningActivities.activityType, 'referral'),
                eq(earningActivities.metadata, JSON.stringify({
                  rewardType: 'milestone_bonus',
                  milestone: `Reached ${count} referrals`
                }))
              )
            )
            .limit(1);

          if (existingBonus.length === 0) {
            // Process milestone earning activity
            await earningActivityService.processEarningActivity({
              userId: referrerId,
              activityType: 'referral',
              metadata: {
                rewardType: 'milestone_bonus',
                milestone: count,
                bonusAmount: reward
              }
            });

            // The earning activity has already been processed above
            // Send milestone notification
            await earningNotificationService.sendMilestoneNotification(referrerId, {
              type: 'referrals',
              milestone: count,
              currentValue: stats.totalReferrals,
              reward: reward
            });
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
        .from(referralActivities)
        .where(eq(referralActivities.referrerId, userId));

      // Get active referrals
      const [activeReferralsResult] = await db
        .select({ count: count() })
        .from(referralActivities)
        .where(
          and(
            eq(referralActivities.referrerId, userId),
            eq(referralActivities.activityType, 'referral_created')
          )
        );

      // Get total earned
      const [totalEarnedResult] = await db
        .select({ total: sum(referralActivities.tokensEarned) })
        .from(referralActivities)
        .where(eq(referralActivities.referrerId, userId));

      // Get this month's earnings
      const monthStart = new Date();
      monthStart.setDate(1);
      monthStart.setHours(0, 0, 0, 0);

      const [monthEarnedResult] = await db
        .select({ total: sum(earningActivities.tokensEarned) })
        .from(earningActivities)
        .where(
          and(
            eq(earningActivities.userId, userId),
            eq(earningActivities.activityType, 'referral'),
            gte(earningActivities.createdAt, monthStart)
          )
        );

      // Get referrals by tier
      const referralsByTier = await db
        .select({
          tier: referralActivities.tierLevel,
          count: count(),
          earned: sum(referralActivities.tokensEarned)
        })
        .from(referralActivities)
        .where(eq(referralActivities.referrerId, userId))
        .groupBy(referralActivities.tierLevel);

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
          userId: referralActivities.referrerId,
          userHandle: users.handle,
          userWalletAddress: users.walletAddress,
          totalReferrals: count(referralActivities.id),
          totalEarned: sum(referralActivities.tokensEarned),
          topTier: sql<number>`MAX(${referralActivities.tierLevel})`
        })
        .from(referralActivities)
        .leftJoin(users, eq(referralActivities.referrerId, users.id))
        .groupBy(referralActivities.referrerId, users.handle, users.walletAddress)
        .orderBy(desc(count(referralActivities.id)), desc(sum(referralActivities.tokensEarned)))
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
          id: referralActivities.id,
          referralCode: sql<string>`${referralActivities.metadata}->>'referralCode'`,
          refereeId: referralActivities.refereeId,
          refereeHandle: users.handle,
          refereeWalletAddress: users.walletAddress,
          tier: referralActivities.tierLevel,
          bonusPercentage: referralActivities.bonusPercentage,
          totalEarned: referralActivities.tokensEarned,
          status: referralActivities.activityType,
          createdAt: referralActivities.createdAt
        })
        .from(referralActivities)
        .leftJoin(users, eq(referralActivities.refereeId, users.id))
        .where(eq(referralActivities.referrerId, userId))
        .orderBy(desc(referralActivities.createdAt))
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
        .from(earningActivities)
        .where(
          and(
            eq(earningActivities.activityType, 'referral'),
            eq(earningActivities.activityId, referralId)
          )
        )
        .orderBy(desc(earningActivities.createdAt));

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
      // Since we don't have a userEarningStats table, we'll just log this for now
      // In a real implementation, we would aggregate data from earningActivities
      safeLogger.info('Updating referrer stats for user:', referrerId);
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
        .update(referralActivities)
        .set({
          activityType: 'referral_deactivated'
        })
        .where(eq(referralActivities.id, referralId));

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
   * Get referral by ID
   */
  async getReferralById(referralId: string) {
    try {
      const [referral] = await db
        .select()
        .from(referralActivities)
        .where(eq(referralActivities.id, referralId))
        .limit(1);

      return referral || null;

    } catch (error) {
      safeLogger.error('Error getting referral by ID:', error);
      return null;
    }
  }

  /**
   * Get referral by code
   */
  async getReferralByCode(referralCode: string) {
    try {
      // Since we're storing referralCode in metadata, we need to search for it
      const referrals = await db
        .select()
        .from(referralActivities)
        .where(sql`metadata->>'referralCode' = ${referralCode}`)
        .limit(1);

      return referrals.length > 0 ? referrals[0] : null;

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

      // Note: status and expiresAt fields don't exist in current schema
      // All referrals are considered active and don't expire

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

  /**
   * Get monthly referral data for trend analysis
   */
  async getReferralMonthlyData(userId: string) {
    try {
      const now = new Date();
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(now.getMonth() - 6);

      // Get monthly referral earnings for the last 6 months
      const monthlyEarnings = await db
        .select({
          month: sql<string>`DATE_TRUNC('month', ${earningActivities.createdAt})`,
          total: sum(earningActivities.tokensEarned)
        })
        .from(earningActivities)
        .where(
          and(
            eq(earningActivities.userId, userId),
            eq(earningActivities.activityType, 'referral'),
            gte(earningActivities.createdAt, sixMonthsAgo)
          )
        )
        .groupBy(sql`DATE_TRUNC('month', ${earningActivities.createdAt})`);

      // Generate all months in the range (including months with 0 activity)
      const result: Array<{ month: string; amount: number }> = [];
      const current = new Date(sixMonthsAgo);
      
      while (current <= now) {
        const monthStr = current.toISOString().substring(0, 7); // YYYY-MM
        const existing = monthlyEarnings.find(e => e.month.startsWith(monthStr));
        
        result.push({
          month: monthStr,
          amount: existing ? parseFloat(existing.total || '0') : 0
        });
        
        current.setMonth(current.getMonth() + 1);
      }

      return result;
    } catch (error) {
      safeLogger.error('Error getting referral monthly data:', error);
      return [];
    }
  }
}

export const referralService = new ReferralService();
