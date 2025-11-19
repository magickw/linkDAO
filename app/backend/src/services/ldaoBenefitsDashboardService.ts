import { db } from '../db/index';
import { eq, and, desc, sql } from 'drizzle-orm';
import {
  orders,
  users,
  earningActivities,
  stakingPositions
} from '../db/schema';
import {
  marketplaceRewards,
  earningChallenges,
  userChallengeProgress
} from '../db/marketplaceSchema';
import { marketplaceRewardsService } from './marketplaceRewardsService';
import { safeLogger } from '../utils/safeLogger';

export interface LDAOStakingInfo {
  totalStaked: string;
  stakingTier: number;
  votingPower: string;
  rewardsEarned: string;
  rewardsClaimed: string;
  nextRewardPayout: string;
  discountPercentage: number;
  stakingBenefits: {
    name: string;
    value: string;
    description: string;
  }[];
}

export interface LDAOMarketplaceBenefits {
  currentTier: string;
  tierBenefits: string[];
  transactionVolume: string;
  rewardsEarned: string;
  discountPercentage: number;
  feeReductionPercentage: number;
  ldaoPaymentDiscount: number;
  marketplaceStats: {
    totalTransactions: number;
    totalVolume: number;
    totalRewardsEarned: number;
    averageTransactionValue: number;
  };
}

export interface LDAOAcquisitionOptions {
  purchaseWithETH: {
    exchangeRate: string;
    minimumPurchase: string;
    maximumPurchase: string;
  };
  earnThroughActivity: {
    currentBalance: string;
    earnableTokens: string;
    availableTasks: {
      name: string;
      potentialReward: string;
      completionRate: string;
    }[];
  };
  stakingRewards: {
    currentAPR: string;
    estimatedAnnualEarnings: string;
    claimableRewards: string;
  };
}

export interface LDAORecentActivity {
  id: string;
  type: 'staking' | 'marketplace' | 'rewards' | 'discount';
  description: string;
  amount: string;
  timestamp: Date;
  status: 'completed' | 'pending' | 'failed';
}

export interface LDAODashboardData {
  stakingInfo: LDAOStakingInfo;
  marketplaceBenefits: LDAOMarketplaceBenefits;
  acquisitionOptions: LDAOAcquisitionOptions;
  recentActivity: LDAORecentActivity[];
  nextMilestone: {
    name: string;
    description: string;
    progress: number;
    reward: string;
  } | null;
}

class LDAOBenefitsDashboardService {
  /**
   * Get comprehensive LDAO benefits dashboard data for a user
   */
  async getLDAOBenefitsDashboard(userId: string): Promise<LDAODashboardData> {
    try {
      // Get user information
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) {
        throw new Error('User not found');
      }

      // Fetch all required data in parallel
      const [
        stakingInfo,
        marketplaceStats,
        recentActivity,
        acquisitionOptions,
        nextMilestone
      ] = await Promise.all([
        this.getLDAOStakingInfo(userId),
        marketplaceRewardsService.getUserMarketplaceStats(userId),
        this.getRecentActivity(userId),
        this.getAcquisitionOptions(userId),
        this.getNextMilestone(userId)
      ]);

      // Get marketplace benefits based on staking info
      const marketplaceBenefits = await this.getMarketplaceBenefits(userId, stakingInfo, marketplaceStats);

      return {
        stakingInfo,
        marketplaceBenefits,
        acquisitionOptions,
        recentActivity,
        nextMilestone
      };
    } catch (error) {
      safeLogger.error('Error getting LDAO benefits dashboard:', error);
      throw error;
    }
  }

  /**
   * Get user's LDAO staking information
   */
  private async getLDAOStakingInfo(userId: string): Promise<LDAOStakingInfo> {
    try {
      // Get real staking positions from DB
      const positions = await db
        .select()
        .from(stakingPositions)
        .where(and(
          eq(stakingPositions.userId, userId),
          eq(stakingPositions.status, 'active')
        ));

      // Calculate totals
      let totalStaked = 0;
      let totalRewardsEarned = 0;

      for (const pos of positions) {
        totalStaked += parseFloat(pos.amount);
        totalRewardsEarned += parseFloat(pos.rewardsEarned);
      }

      // Determine tier based on staked amount
      let stakingTier = 0;
      let discountPercentage = 0;

      if (totalStaked >= 10000) {
        stakingTier = 3; // Platinum tier
        discountPercentage = 1500; // 15% in basis points
      } else if (totalStaked >= 5000) {
        stakingTier = 2; // Gold tier
        discountPercentage = 1000; // 10% in basis points
      } else if (totalStaked >= 1000) {
        stakingTier = 1; // Silver tier
        discountPercentage = 500; // 5% in basis points
      } else {
        stakingTier = 0; // Bronze tier
        discountPercentage = 0;
      }

      // Voting power calculation (1 token = 1 vote, plus bonus for longer locks)
      // This is a simplified calculation
      const votingPower = totalStaked.toString();

      return {
        totalStaked: totalStaked.toString(),
        stakingTier,
        votingPower,
        rewardsEarned: totalRewardsEarned.toString(),
        rewardsClaimed: '0', // We'd need a separate table for claimed rewards history
        nextRewardPayout: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        discountPercentage: discountPercentage / 10, // Convert basis points to percentage
        stakingBenefits: [
          {
            name: 'Payment Discount',
            value: `${discountPercentage / 10}%`,
            description: 'Discount on marketplace purchases when paying with LDAO tokens'
          },
          {
            name: 'Fee Reduction',
            value: stakingTier > 0 ? `${stakingTier * 10}%` : '0%',
            description: 'Reduction in marketplace fees based on staking tier'
          },
          {
            name: 'Voting Power',
            value: votingPower,
            description: 'Enhanced voting power in DAO governance'
          }
        ]
      };
    } catch (error) {
      safeLogger.error('Error getting LDAO staking info:', error);
      return {
        totalStaked: '0',
        stakingTier: 0,
        votingPower: '0',
        rewardsEarned: '0',
        rewardsClaimed: '0',
        nextRewardPayout: new Date().toISOString(),
        discountPercentage: 0,
        stakingBenefits: []
      };
    }
  }

  /**
   * Get marketplace benefits based on staking tier
   */
  private async getMarketplaceBenefits(
    userId: string,
    stakingInfo: LDAOStakingInfo,
    marketplaceStats: any
  ): Promise<LDAOMarketplaceBenefits> {
    // Determine current tier based on volume
    let currentTier = 'Bronze';
    if (marketplaceStats.totalVolume >= 100000) currentTier = 'Diamond';
    else if (marketplaceStats.totalVolume >= 20000) currentTier = 'Platinum';
    else if (marketplaceStats.totalVolume >= 5000) currentTier = 'Gold';
    else if (marketplaceStats.totalVolume >= 1000) currentTier = 'Silver';

    // Calculate fee reduction based on staking tier
    const feeReductionPercentage = stakingInfo.stakingTier * 10; // 10% per tier
    const ldaoPaymentDiscount = stakingInfo.discountPercentage;

    return {
      currentTier,
      tierBenefits: [
        'Increased rewards multipliers',
        'Reduced marketplace fees',
        'Exclusive marketplace features',
        'Early access to new features'
      ],
      transactionVolume: marketplaceStats.totalVolume.toString(),
      rewardsEarned: marketplaceStats.totalRewardsEarned.toString(),
      discountPercentage: ldaoPaymentDiscount,
      feeReductionPercentage,
      ldaoPaymentDiscount,
      marketplaceStats: {
        totalTransactions: marketplaceStats.totalTransactions,
        totalVolume: marketplaceStats.totalVolume,
        totalRewardsEarned: marketplaceStats.totalRewardsEarned,
        averageTransactionValue: marketplaceStats.averageTransactionValue
      }
    };
  }

  /**
   * Get user's recent LDAO-related activity
   */
  private async getRecentActivity(userId: string): Promise<LDAORecentActivity[]> {
    try {
      // Get recent marketplace rewards
      const recentRewards = await db
        .select({
          id: marketplaceRewards.id,
          transactionAmount: marketplaceRewards.transactionAmount,
          buyerReward: marketplaceRewards.buyerReward,
          sellerReward: marketplaceRewards.sellerReward,
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
        .limit(5);

      // Get recent earning activities
      const recentActivities = await db
        .select({
          id: earningActivities.id,
          activityType: earningActivities.activityType,
          tokensEarned: earningActivities.tokensEarned,
          createdAt: earningActivities.createdAt,
          metadata: earningActivities.metadata
        })
        .from(earningActivities)
        .where(eq(earningActivities.userId, userId))
        .orderBy(desc(earningActivities.createdAt))
        .limit(5);

      // Combine and format activities
      const allActivities: LDAORecentActivity[] = [
        ...recentRewards.map(reward => ({
          id: `reward-${reward.id}`,
          type: 'rewards' as const,
          description: `Marketplace ${reward.role} reward`,
          amount: (parseFloat(reward.buyerReward || '0') + parseFloat(reward.sellerReward || '0')).toString(),
          timestamp: reward.createdAt,
          status: 'completed' as const
        })),
        ...recentActivities.map(activity => ({
          id: `activity-${activity.id}`,
          type: 'marketplace' as const,
          description: `Earning activity: ${activity.activityType}`,
          amount: activity.tokensEarned,
          timestamp: activity.createdAt,
          status: 'completed' as const
        }))
      ];

      // Sort by timestamp, most recent first
      allActivities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

      return allActivities.slice(0, 10); // Return top 10
    } catch (error) {
      safeLogger.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Get LDAO token acquisition options
   */
  private async getAcquisitionOptions(userId: string): Promise<LDAOAcquisitionOptions> {
    try {
      // Get user's current balance from users table
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      const currentBalance = user?.ldaoBalance || '0';

      // Calculate potential rewards from available tasks
      // In a real app, we would check which tasks the user has already completed
      const availableTasks = [
        {
          name: 'Complete Profile',
          potentialReward: '10',
          completionRate: '95%'
        },
        {
          name: 'Verify Email',
          potentialReward: '5',
          completionRate: '80%'
        },
        {
          name: 'Make First Purchase',
          potentialReward: '25',
          completionRate: '40%'
        },
        {
          name: 'Refer a Friend',
          potentialReward: '50',
          completionRate: '20%'
        }
      ];

      return {
        purchaseWithETH: {
          exchangeRate: '1 LDAO = 0.0001 ETH',
          minimumPurchase: '10 LDAO',
          maximumPurchase: '10000 LDAO'
        },
        earnThroughActivity: {
          currentBalance: currentBalance.toString(),
          earnableTokens: '200',
          availableTasks
        },
        stakingRewards: {
          currentAPR: '12.5%',
          estimatedAnnualEarnings: (parseFloat(currentBalance.toString()) * 0.125).toFixed(2),
          claimableRewards: '0' // This would come from stakingPositions rewards
        }
      };
    } catch (error) {
      safeLogger.error('Error getting acquisition options:', error);
      return {
        purchaseWithETH: {
          exchangeRate: '1 LDAO = 0.0001 ETH',
          minimumPurchase: '10 LDAO',
          maximumPurchase: '10000 LDAO'
        },
        earnThroughActivity: {
          currentBalance: '0',
          earnableTokens: '0',
          availableTasks: []
        },
        stakingRewards: {
          currentAPR: '0%',
          estimatedAnnualEarnings: '0',
          claimableRewards: '0'
        }
      };
    }
  }

  /**
   * Get next milestone for the user
   */
  private async getNextMilestone(userId: string): Promise<LDAODashboardData['nextMilestone']> {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
      if (!user) return null;

      // Get total staked amount
      const positions = await db
        .select()
        .from(stakingPositions)
        .where(and(
          eq(stakingPositions.userId, userId),
          eq(stakingPositions.status, 'active')
        ));

      let totalStaked = 0;
      for (const pos of positions) {
        totalStaked += parseFloat(pos.amount);
      }

      // Define milestones based on staked amount
      const milestones = [
        {
          name: 'Silver Tier',
          description: 'Stake 1,000 LDAO tokens',
          target: 1000,
          reward: '5% discount on LDAO payments'
        },
        {
          name: 'Gold Tier',
          description: 'Stake 5,000 LDAO tokens',
          target: 5000,
          reward: '10% discount on LDAO payments'
        },
        {
          name: 'Platinum Tier',
          description: 'Stake 10,000 LDAO tokens',
          target: 10000,
          reward: '15% discount on LDAO payments'
        }
      ];

      for (const milestone of milestones) {
        if (totalStaked < milestone.target) {
          return {
            name: milestone.name,
            description: milestone.description,
            progress: Math.min(100, (totalStaked / milestone.target) * 100),
            reward: milestone.reward
          };
        }
      }

      // No upcoming milestone
      return null;
    } catch (error) {
      safeLogger.error('Error getting next milestone:', error);
      return null;
    }
  }

  /**
   * Get user's staking tier details
   */
  async getStakingTierDetails(userId: string) {
    const stakingInfo = await this.getLDAOStakingInfo(userId);

    const tierDetails = {
      name: stakingInfo.stakingTier === 0 ? 'Bronze' :
        stakingInfo.stakingTier === 1 ? 'Silver' :
          stakingInfo.stakingTier === 2 ? 'Gold' : 'Platinum',
      benefits: stakingInfo.stakingBenefits,
      progressToNextTier: stakingInfo.stakingTier < 3 ? 25 : 100
    };

    return tierDetails;
  }

  /**
   * Get marketplace-specific benefits for the user
   */
  async getMarketplaceBenefitsOnly(userId: string) {
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) throw new Error('User not found');

    const marketplaceStats = await marketplaceRewardsService.getUserMarketplaceStats(userId);
    const stakingInfo = await this.getLDAOStakingInfo(userId);

    return {
      ...marketplaceStats,
      discountPercentage: stakingInfo.discountPercentage,
      feeReductionPercentage: stakingInfo.stakingTier * 10,
      eligibleForLDAODiscount: stakingInfo.stakingTier > 0
    };
  }
}

export const ldaoBenefitsDashboardService = new LDAOBenefitsDashboardService();