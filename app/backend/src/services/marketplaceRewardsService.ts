import { db } from '../db/index';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc, sum, count, gte, lte, sql } from 'drizzle-orm';
import { 
  orders,
  users,
  earningActivities
} from '../db/schema';
import { 
  marketplaceRewards,
  earningChallenges,
  userChallengeProgress
} from '../db/marketplaceSchema';
import { earningActivityService } from './earningActivityService';
import { earningNotificationService } from './earningNotificationService';

export interface MarketplaceTransactionData {
  orderId: number;
  buyerId?: string;
  sellerId?: string;
  transactionAmount: number;
  isPremiumBuyer?: boolean;
  isPremiumSeller?: boolean;
}

export interface VolumeBasedTier {
  name: string;
  minVolume: number;
  maxVolume?: number;
  buyerMultiplier: number;
  sellerMultiplier: number;
  description: string;
}

export interface MarketplaceChallengeData {
  name: string;
  description: string;
  challengeType: 'daily' | 'weekly' | 'monthly' | 'milestone';
  targetValue: number;
  rewardAmount: number;
  bonusMultiplier?: number;
  startDate?: Date;
  endDate?: Date;
  maxParticipants?: number;
}

export interface MarketplaceStats {
  totalTransactions: number;
  totalVolume: number;
  totalRewardsEarned: number;
  averageTransactionValue: number;
  currentTier: VolumeBasedTier;
  nextTier?: VolumeBasedTier;
  progressToNextTier: number;
  activeChallenges: number;
  completedChallenges: number;
}

class MarketplaceRewardsService {
  // Volume-based reward tiers
  private readonly volumeTiers: VolumeBasedTier[] = [
    {
      name: 'Bronze',
      minVolume: 0,
      maxVolume: 1000,
      buyerMultiplier: 1.0,
      sellerMultiplier: 1.0,
      description: 'Starting tier for new marketplace users'
    },
    {
      name: 'Silver',
      minVolume: 1000,
      maxVolume: 5000,
      buyerMultiplier: 1.2,
      sellerMultiplier: 1.2,
      description: '20% bonus rewards for active traders'
    },
    {
      name: 'Gold',
      minVolume: 5000,
      maxVolume: 20000,
      buyerMultiplier: 1.5,
      sellerMultiplier: 1.5,
      description: '50% bonus rewards for high-volume traders'
    },
    {
      name: 'Platinum',
      minVolume: 20000,
      maxVolume: 100000,
      buyerMultiplier: 2.0,
      sellerMultiplier: 2.0,
      description: '100% bonus rewards for premium traders'
    },
    {
      name: 'Diamond',
      minVolume: 100000,
      buyerMultiplier: 2.5,
      sellerMultiplier: 2.5,
      description: '150% bonus rewards for elite traders'
    }
  ];

  /**
   * Process marketplace transaction rewards
   */
  async processMarketplaceRewards(data: MarketplaceTransactionData): Promise<void> {
    try {
      safeLogger.info('Processing marketplace rewards for order:', data.orderId);

      // Calculate base reward amounts
      const baseRewardPercentage = 0.5; // 0.5% of transaction value
      const baseReward = data.transactionAmount * (baseRewardPercentage / 100);

      let buyerReward = 0;
      let sellerReward = 0;

      // Process buyer rewards
      if (data.buyerId) {
        const buyerTier = await this.getUserVolumeTier(data.buyerId);
        buyerReward = baseReward * buyerTier.buyerMultiplier;

        const buyerResult = await earningActivityService.processEarningActivity({
          userId: data.buyerId,
          activityType: 'marketplace',
          activityId: data.orderId.toString(),
          isPremiumUser: data.isPremiumBuyer,
          metadata: {
            orderId: data.orderId,
            role: 'buyer',
            transactionAmount: data.transactionAmount,
            tier: buyerTier.name,
            multiplier: buyerTier.buyerMultiplier,
            baseReward
          }
        });

        if (buyerResult.success) {
          buyerReward = buyerResult.tokensEarned;
        }
      }

      // Process seller rewards
      if (data.sellerId) {
        const sellerTier = await this.getUserVolumeTier(data.sellerId);
        sellerReward = baseReward * sellerTier.sellerMultiplier;

        const sellerResult = await earningActivityService.processEarningActivity({
          userId: data.sellerId,
          activityType: 'marketplace',
          activityId: data.orderId.toString(),
          isPremiumUser: data.isPremiumSeller,
          metadata: {
            orderId: data.orderId,
            role: 'seller',
            transactionAmount: data.transactionAmount,
            tier: sellerTier.name,
            multiplier: sellerTier.sellerMultiplier,
            baseReward
          }
        });

        if (sellerResult.success) {
          sellerReward = sellerResult.tokensEarned;
        }
      }

      // Create marketplace reward record
      await db.insert(marketplaceRewards).values({
        orderId: data.orderId,
        buyerId: data.buyerId || null,
        sellerId: data.sellerId || null,
        transactionAmount: data.transactionAmount.toString(),
        buyerReward: buyerReward.toString(),
        sellerReward: sellerReward.toString(),
        rewardTier: await this.getTransactionTier(data.transactionAmount),
        bonusMultiplier: '1.0',
        processedAt: new Date()
      });

      // Update challenge progress
      if (data.buyerId) {
        await this.updateChallengeProgress(data.buyerId, 'buyer', data.transactionAmount);
      }
      if (data.sellerId) {
        await this.updateChallengeProgress(data.sellerId, 'seller', data.transactionAmount);
      }

      safeLogger.info(`Marketplace rewards processed: Buyer: ${buyerReward}, Seller: ${sellerReward}`);

    } catch (error) {
      safeLogger.error('Error processing marketplace rewards:', error);
    }
  }

  /**
   * Get user's volume-based tier
   */
  private async getUserVolumeTier(userId: string): Promise<VolumeBasedTier> {
    try {
      // Calculate user's total transaction volume (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [volumeResult] = await db
        .select({
          totalVolume: sum(marketplaceRewards.transactionAmount)
        })
        .from(marketplaceRewards)
        .where(
          and(
            sql`(${marketplaceRewards.buyerId} = ${userId} OR ${marketplaceRewards.sellerId} = ${userId})`,
            gte(marketplaceRewards.createdAt, thirtyDaysAgo)
          )
        );

      const totalVolume = parseFloat(volumeResult?.totalVolume || '0');

      // Find appropriate tier
      for (let i = this.volumeTiers.length - 1; i >= 0; i--) {
        const tier = this.volumeTiers[i];
        if (totalVolume >= tier.minVolume) {
          return tier;
        }
      }

      return this.volumeTiers[0]; // Default to Bronze tier

    } catch (error) {
      safeLogger.error('Error getting user volume tier:', error);
      return this.volumeTiers[0];
    }
  }

  /**
   * Get transaction tier based on amount
   */
  private async getTransactionTier(amount: number): Promise<string> {
    if (amount >= 10000) return 'whale';
    if (amount >= 5000) return 'large';
    if (amount >= 1000) return 'medium';
    if (amount >= 100) return 'small';
    return 'micro';
  }

  /**
   * Update challenge progress for marketplace activities
   */
  private async updateChallengeProgress(userId: string, role: 'buyer' | 'seller', transactionAmount: number): Promise<void> {
    try {
      // Get active marketplace challenges
      const activeChallenges = await db
        .select()
        .from(earningChallenges)
        .where(
          and(
            eq(earningChallenges.activityType, 'marketplace'),
            eq(earningChallenges.isActive, true),
            sql`${earningChallenges.startDate} <= NOW()`,
            sql`${earningChallenges.endDate} >= NOW() OR ${earningChallenges.endDate} IS NULL`
          )
        );

      for (const challenge of activeChallenges) {
        // Check if user is already participating
        const [existingProgress] = await db
          .select()
          .from(userChallengeProgress)
          .where(
            and(
              eq(userChallengeProgress.challengeId, challenge.id),
              eq(userChallengeProgress.userId, userId)
            )
          );

        if (existingProgress && existingProgress.isCompleted) {
          continue; // Skip completed challenges
        }

        // Calculate progress increment based on challenge type
        let progressIncrement = 0;
        const challengeMetadata = challenge.metadata ? JSON.parse(challenge.metadata) : {};

        if (challengeMetadata.type === 'transaction_count') {
          progressIncrement = 1; // One transaction
        } else if (challengeMetadata.type === 'transaction_volume') {
          progressIncrement = transactionAmount; // Transaction amount
        } else if (challengeMetadata.type === 'role_specific' && challengeMetadata.role === role) {
          progressIncrement = challengeMetadata.countType === 'volume' ? transactionAmount : 1;
        }

        if (progressIncrement > 0) {
          if (existingProgress) {
            // Update existing progress
            const newProgress = parseFloat(existingProgress.currentProgress) + progressIncrement;
            const isCompleted = newProgress >= parseFloat(existingProgress.targetValue);

            await db
              .update(userChallengeProgress)
              .set({
                currentProgress: newProgress.toString(),
                isCompleted,
                completedAt: isCompleted ? new Date() : null,
                updatedAt: new Date()
              })
              .where(eq(userChallengeProgress.id, existingProgress.id));

            // Process reward if completed
            if (isCompleted && !existingProgress.isCompleted) {
              await this.processChallengeCompletion(userId, challenge.id, parseFloat(challenge.rewardAmount));
            }

          } else {
            // Create new progress record
            const isCompleted = progressIncrement >= parseFloat(challenge.targetValue);

            await db.insert(userChallengeProgress).values({
              challengeId: challenge.id,
              userId,
              currentProgress: progressIncrement.toString(),
              targetValue: challenge.targetValue,
              isCompleted,
              completedAt: isCompleted ? new Date() : null
            });

            // Process reward if completed immediately
            if (isCompleted) {
              await this.processChallengeCompletion(userId, challenge.id, parseFloat(challenge.rewardAmount));
            }
          }
        }
      }

    } catch (error) {
      safeLogger.error('Error updating challenge progress:', error);
    }
  }

  /**
   * Process challenge completion reward
   */
  private async processChallengeCompletion(userId: string, challengeId: string, rewardAmount: number): Promise<void> {
    try {
      const result = await earningActivityService.processEarningActivity({
        userId,
        activityType: 'marketplace',
        activityId: challengeId,
        metadata: {
          challengeId,
          rewardType: 'challenge_completion',
          rewardAmount
        }
      });

      if (result.success) {
        // Mark reward as claimed
        await db
          .update(userChallengeProgress)
          .set({
            rewardClaimed: true,
            rewardClaimedAt: new Date()
          })
          .where(
            and(
              eq(userChallengeProgress.challengeId, challengeId),
              eq(userChallengeProgress.userId, userId)
            )
          );

        // Send notification
        await earningNotificationService.sendEarningNotification({
          userId,
          type: 'milestone_achieved',
          title: 'Marketplace Challenge Completed!',
          message: `You completed a marketplace challenge and earned ${result.tokensEarned} LDAO tokens!`,
          tokensEarned: result.tokensEarned,
          activityType: 'marketplace',
          metadata: {
            challengeId,
            rewardAmount: result.tokensEarned
          }
        });
      }

    } catch (error) {
      safeLogger.error('Error processing challenge completion:', error);
    }
  }

  /**
   * Create marketplace challenge
   */
  async createMarketplaceChallenge(data: MarketplaceChallengeData): Promise<{ success: boolean; challengeId?: string; message: string }> {
    try {
      const [challenge] = await db.insert(earningChallenges).values({
        name: data.name,
        description: data.description,
        challengeType: data.challengeType,
        activityType: 'marketplace',
        targetValue: data.targetValue.toString(),
        rewardAmount: data.rewardAmount.toString(),
        bonusMultiplier: (data.bonusMultiplier || 1.0).toString(),
        startDate: data.startDate || new Date(),
        endDate: data.endDate,
        isActive: true,
        maxParticipants: data.maxParticipants,
        currentParticipants: 0,
        metadata: JSON.stringify({
          type: 'marketplace_challenge',
          createdBy: 'system'
        })
      }).returning();

      return {
        success: true,
        challengeId: challenge.id,
        message: 'Marketplace challenge created successfully'
      };

    } catch (error) {
      safeLogger.error('Error creating marketplace challenge:', error);
      return {
        success: false,
        message: 'Failed to create marketplace challenge'
      };
    }
  }

  /**
   * Get user's marketplace statistics
   */
  async getUserMarketplaceStats(userId: string): Promise<MarketplaceStats> {
    try {
      // Get transaction count and volume
      const [transactionStats] = await db
        .select({
          totalTransactions: count(),
          totalVolume: sum(marketplaceRewards.transactionAmount),
          totalRewards: sum(sql`COALESCE(${marketplaceRewards.buyerReward}, 0) + COALESCE(${marketplaceRewards.sellerReward}, 0)`)
        })
        .from(marketplaceRewards)
        .where(
          sql`${marketplaceRewards.buyerId} = ${userId} OR ${marketplaceRewards.sellerId} = ${userId}`
        );

      const totalTransactions = transactionStats?.totalTransactions || 0;
      const totalVolume = parseFloat(transactionStats?.totalVolume || '0');
      const totalRewardsEarned = parseFloat(transactionStats?.totalRewards || '0');
      const averageTransactionValue = totalTransactions > 0 ? totalVolume / totalTransactions : 0;

      // Get current tier
      const currentTier = await this.getUserVolumeTier(userId);
      
      // Find next tier
      const currentTierIndex = this.volumeTiers.findIndex(t => t.name === currentTier.name);
      const nextTier = currentTierIndex < this.volumeTiers.length - 1 ? this.volumeTiers[currentTierIndex + 1] : undefined;
      
      // Calculate progress to next tier
      const progressToNextTier = nextTier ? 
        Math.min(100, ((totalVolume - currentTier.minVolume) / (nextTier.minVolume - currentTier.minVolume)) * 100) : 100;

      // Get challenge stats
      const [challengeStats] = await db
        .select({
          activeChallenges: count(sql`CASE WHEN ${userChallengeProgress.isCompleted} = false THEN 1 END`),
          completedChallenges: count(sql`CASE WHEN ${userChallengeProgress.isCompleted} = true THEN 1 END`)
        })
        .from(userChallengeProgress)
        .innerJoin(earningChallenges, eq(userChallengeProgress.challengeId, earningChallenges.id))
        .where(
          and(
            eq(userChallengeProgress.userId, userId),
            eq(earningChallenges.activityType, 'marketplace')
          )
        );

      return {
        totalTransactions,
        totalVolume,
        totalRewardsEarned,
        averageTransactionValue,
        currentTier,
        nextTier,
        progressToNextTier,
        activeChallenges: challengeStats?.activeChallenges || 0,
        completedChallenges: challengeStats?.completedChallenges || 0
      };

    } catch (error) {
      safeLogger.error('Error getting user marketplace stats:', error);
      return {
        totalTransactions: 0,
        totalVolume: 0,
        totalRewardsEarned: 0,
        averageTransactionValue: 0,
        currentTier: this.volumeTiers[0],
        progressToNextTier: 0,
        activeChallenges: 0,
        completedChallenges: 0
      };
    }
  }

  /**
   * Get active marketplace challenges
   */
  async getActiveMarketplaceChallenges(userId?: string) {
    try {
      const challenges = await db
        .select()
        .from(earningChallenges)
        .where(
          and(
            eq(earningChallenges.activityType, 'marketplace'),
            eq(earningChallenges.isActive, true),
            sql`${earningChallenges.startDate} <= NOW()`,
            sql`${earningChallenges.endDate} >= NOW() OR ${earningChallenges.endDate} IS NULL`
          )
        )
        .orderBy(desc(earningChallenges.createdAt));

      // If userId provided, include user's progress
      if (userId) {
        const challengesWithProgress = await Promise.all(
          challenges.map(async (challenge) => {
            const [progress] = await db
              .select()
              .from(userChallengeProgress)
              .where(
                and(
                  eq(userChallengeProgress.challengeId, challenge.id),
                  eq(userChallengeProgress.userId, userId)
                )
              );

            return {
              ...challenge,
              userProgress: progress ? {
                currentProgress: parseFloat(progress.currentProgress),
                isCompleted: progress.isCompleted,
                rewardClaimed: progress.rewardClaimed
              } : null
            };
          })
        );

        return challengesWithProgress;
      }

      return challenges;

    } catch (error) {
      safeLogger.error('Error getting active marketplace challenges:', error);
      return [];
    }
  }

  /**
   * Get marketplace rewards history
   */
  async getMarketplaceRewardsHistory(userId: string, limit: number = 20, offset: number = 0) {
    try {
      return await db
        .select({
          id: marketplaceRewards.id,
          orderId: marketplaceRewards.orderId,
          transactionAmount: marketplaceRewards.transactionAmount,
          buyerReward: marketplaceRewards.buyerReward,
          sellerReward: marketplaceRewards.sellerReward,
          rewardTier: marketplaceRewards.rewardTier,
          bonusMultiplier: marketplaceRewards.bonusMultiplier,
          createdAt: marketplaceRewards.createdAt,
          role: sql<string>`CASE 
            WHEN ${marketplaceRewards.buyerId} = ${userId} THEN 'buyer'
            WHEN ${marketplaceRewards.sellerId} = ${userId} THEN 'seller'
            ELSE 'unknown'
          END`
        })
        .from(marketplaceRewards)
        .where(
          sql`${marketplaceRewards.buyerId} = ${userId} OR ${marketplaceRewards.sellerId} = ${userId}`
        )
        .orderBy(desc(marketplaceRewards.createdAt))
        .limit(limit)
        .offset(offset);

    } catch (error) {
      safeLogger.error('Error getting marketplace rewards history:', error);
      return [];
    }
  }

  /**
   * Get volume tiers information
   */
  getVolumeTiers(): VolumeBasedTier[] {
    return this.volumeTiers;
  }
}

export const marketplaceRewardsService = new MarketplaceRewardsService();
