import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { users, earningActivities } from '../db/schema';
import { eq, desc, and, sql, sum, count } from 'drizzle-orm';
import { marketplaceRewardsService } from './marketplaceRewardsService';
import { ldaoAcquisitionService } from './ldaoAcquisitionService';

export interface LDAOStakingInfo {
  totalStaked: number;
  stakingTier: number; // 0-3
  stakingTierName: string;
  rewardsEarned: number;
  rewardsClaimed: number;
  votingPower: number;
}

export interface MarketplaceBenefits {
  discountTier: number; // 0-3
  discountPercentage: number; // basis points
  feeReductionPercentage: number; // basis points
  premiumMembership: boolean;
  totalTransactions: number;
  totalRewardsEarned: number;
}

export interface LDAOTokenAcquisitionOptions {
  supportedPaymentMethods: string[];
  currentPrice: number;
  priceChange24h: number;
  availableForPurchase: boolean;
}

export interface LDAOBenefitsSummary {
  stakingInfo: LDAOStakingInfo;
  marketplaceBenefits: MarketplaceBenefits;
  tokenAcquisition: LDAOTokenAcquisitionOptions;
  totalLDAOTokens: number;
  estimatedSavings: number; // Potential savings from staking/discounts
  recentActivity: Array<{
    type: 'reward' | 'purchase' | 'stake' | 'unstake' | 'discount';
    amount: number;
    description: string;
    timestamp: Date;
  }>;
}

export class LDAOBenefitsDashboardService {
  /**
   * Get comprehensive LDAO benefits summary for a user
   * @param userId User ID to get benefits for
   * @returns LDAO benefits summary
   */
  async getLDAOBenefitsSummary(userId: string): Promise<LDAOBenefitsSummary> {
    try {
      // Get user's LDAO token balance
      const userBalance = await this.getUserTokenBalance(userId);
      
      // Get staking information
      const stakingInfo = await this.getUserStakingInfo(userId);
      
      // Get marketplace benefits
      const marketplaceBenefits = await this.getUserMarketplaceBenefits(userId);
      
      // Get token acquisition options
      const tokenAcquisition = await this.getTokenAcquisitionOptions();
      
      // Calculate estimated savings
      const estimatedSavings = await this.calculateEstimatedSavings(userId, marketplaceBenefits);
      
      // Get recent activity
      const recentActivity = await this.getRecentActivity(userId);
      
      return {
        stakingInfo,
        marketplaceBenefits,
        tokenAcquisition,
        totalLDAOTokens: userBalance,
        estimatedSavings,
        recentActivity
      };
    } catch (error) {
      safeLogger.error('Error getting LDAO benefits summary:', error);
      throw new Error('Failed to get LDAO benefits summary');
    }
  }

  /**
   * Get user's token balance
   */
  private async getUserTokenBalance(userId: string): Promise<number> {
    try {
      // In a real implementation, this would query the blockchain or token service
      // For now, returning 0 and would integrate with the actual token balance service
      return 0;
    } catch (error) {
      safeLogger.error('Error getting user token balance:', error);
      return 0;
    }
  }

  /**
   * Get user's staking information
   */
  private async getUserStakingInfo(userId: string): Promise<LDAOStakingInfo> {
    try {
      // In a real implementation, this would query the staking service
      // For now, returning default values and would integrate with actual staking service
      return {
        totalStaked: 0,
        stakingTier: 0,
        stakingTierName: 'None',
        rewardsEarned: 0,
        rewardsClaimed: 0,
        votingPower: 0
      };
    } catch (error) {
      safeLogger.error('Error getting user staking info:', error);
      return {
        totalStaked: 0,
        stakingTier: 0,
        stakingTierName: 'None',
        rewardsEarned: 0,
        rewardsClaimed: 0,
        votingPower: 0
      };
    }
  }

  /**
   * Get user's marketplace benefits
   */
  private async getUserMarketplaceBenefits(userId: string): Promise<MarketplaceBenefits> {
    try {
      // Get user's marketplace statistics
      const stats = await marketplaceRewardsService.getUserMarketplaceStats(userId);
      
      // In a real implementation, this would query the LDAO token contract for discount tier
      // For now, returning default values
      return {
        discountTier: 0,
        discountPercentage: 0,
        feeReductionPercentage: 0,
        premiumMembership: false,
        totalTransactions: stats.totalTransactions,
        totalRewardsEarned: stats.totalRewardsEarned
      };
    } catch (error) {
      safeLogger.error('Error getting user marketplace benefits:', error);
      return {
        discountTier: 0,
        discountPercentage: 0,
        feeReductionPercentage: 0,
        premiumMembership: false,
        totalTransactions: 0,
        totalRewardsEarned: 0
      };
    }
  }

  /**
   * Get token acquisition options
   */
  private async getTokenAcquisitionOptions(): Promise<LDAOTokenAcquisitionOptions> {
    try {
      // Get current price information
      const currentPrice = await ldaoAcquisitionService.getCurrentPrice();
      
      // Get supported payment methods
      const supportedMethods = ldaoAcquisitionService.getSupportedPaymentMethods();
      const paymentMethodNames = supportedMethods.map(method => method.type);
      
      return {
        supportedPaymentMethods: paymentMethodNames,
        currentPrice,
        priceChange24h: 0, // Would come from price tracking service
        availableForPurchase: true
      };
    } catch (error) {
      safeLogger.error('Error getting token acquisition options:', error);
      return {
        supportedPaymentMethods: [],
        currentPrice: 0,
        priceChange24h: 0,
        availableForPurchase: false
      };
    }
  }

  /**
   * Calculate estimated savings from staking/discounts
   */
  private async calculateEstimatedSavings(userId: string, marketplaceBenefits: MarketplaceBenefits): Promise<number> {
    try {
      // Calculate potential savings based on user's transaction history and discount tier
      // This is an estimate of potential savings from marketplace discounts
      const avgTransactionValue = 100; // Average transaction value estimate
      const estimatedMonthlyTransactions = 5; // Estimated monthly transactions
      
      // Calculate potential monthly savings based on discount tier
      const monthlySavings = (avgTransactionValue * estimatedMonthlyTransactions * marketplaceBenefits.discountPercentage) / 10000;
      
      // Calculate potential annual savings
      return monthlySavings * 12;
    } catch (error) {
      safeLogger.error('Error calculating estimated savings:', error);
      return 0;
    }
  }

  /**
   * Get recent activity related to LDAO benefits
   */
  private async getRecentActivity(userId: string): Promise<Array<{
    type: 'reward' | 'purchase' | 'stake' | 'unstake' | 'discount';
    amount: number;
    description: string;
    timestamp: Date;
  }>> {
    try {
      // Get recent earning activities
      const recentActivities = await db
        .select({
          id: earningActivities.id,
          activityType: earningActivities.activityType,
          amount: earningActivities.amount,
          description: earningActivities.description,
          createdAt: earningActivities.createdAt
        })
        .from(earningActivities)
        .where(eq(earningActivities.userId, userId))
        .orderBy(desc(earningActivities.createdAt))
        .limit(10);

      // Map to the required format
      return recentActivities.map(activity => ({
        type: this.mapActivityType(activity.activityType),
        amount: parseFloat(activity.amount),
        description: activity.description || this.getDefaultDescription(activity.activityType),
        timestamp: activity.createdAt
      }));
    } catch (error) {
      safeLogger.error('Error getting recent activity:', error);
      return [];
    }
  }

  /**
   * Map activity type to standardized type
   */
  private mapActivityType(activityType: string): 'reward' | 'purchase' | 'stake' | 'unstake' | 'discount' {
    if (activityType.includes('marketplace') || activityType.includes('reward')) {
      return 'reward';
    } else if (activityType.includes('purchase') || activityType.includes('buy')) {
      return 'purchase';
    } else if (activityType.includes('stake')) {
      return 'stake';
    } else if (activityType.includes('unstake')) {
      return 'unstake';
    } else {
      return 'reward'; // Default to reward
    }
  }

  /**
   * Get default description for activity
   */
  private getDefaultDescription(activityType: string): string {
    switch (activityType) {
      case 'marketplace':
        return 'Marketplace reward earned';
      case 'referral':
        return 'Referral reward earned';
      case 'post':
        return 'Content creation reward';
      case 'comment':
        return 'Engagement reward';
      default:
        return 'LDAO token activity';
    }
  }
}

export const ldaoBenefitsDashboardService = new LDAOBenefitsDashboardService();