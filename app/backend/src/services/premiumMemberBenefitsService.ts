import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { userStakingInfo, stakingPositions, stakingTiers, stakingEvents } from '../db/schema';
import { eq, and, desc, gte, sum, count } from 'drizzle-orm';

export interface PremiumMemberBenefits {
  bonusAprRate: number; // Additional APR percentage
  exclusiveStakingPools: number[]; // Tier IDs for premium-only pools
  reducedPenalties: boolean; // Reduced early withdrawal penalties
  prioritySupport: boolean; // Priority customer support
  advancedAnalytics: boolean; // Access to advanced analytics
  earlyAccess: boolean; // Early access to new features
  customStakingOptions: boolean; // Custom staking duration options
  compoundingBonuses: boolean; // Enhanced auto-compounding benefits
}

export interface PremiumStakingPool {
  id: number;
  name: string;
  description: string;
  lockPeriod: number;
  baseAprRate: number;
  premiumBonusRate: number;
  minStakeAmount: string;
  maxStakeAmount: string;
  totalCapacity: string;
  currentStaked: string;
  participantCount: number;
  isActive: boolean;
  startDate: Date;
  endDate?: Date;
  specialFeatures: string[];
}

export interface PremiumAnalytics {
  stakingEfficiency: number; // Percentage of optimal staking
  rewardOptimization: number; // How well rewards are optimized
  portfolioBalance: number; // Balance across different tiers
  riskAssessment: string; // Low, Medium, High
  recommendations: string[];
  projectedReturns: {
    monthly: string;
    quarterly: string;
    yearly: string;
  };
  compoundingImpact: string;
  optimalRebalancing: {
    suggested: boolean;
    fromTier: number;
    toTier: number;
    amount: string;
    expectedGain: string;
  }[];
}

export class PremiumMemberBenefitsService {
  private readonly PREMIUM_THRESHOLD = ethers.parseEther("1000"); // 1000 LDAO
  private readonly VIP_THRESHOLD = ethers.parseEther("10000"); // 10000 LDAO for VIP status

  /**
   * Check if user qualifies for premium membership
   */
  async checkPremiumMembershipStatus(userId: string): Promise<{
    isPremium: boolean;
    isVip: boolean;
    totalStaked: string;
    membershipTier: 'basic' | 'premium' | 'vip';
    benefits: PremiumMemberBenefits;
  }> {
    try {
      const userInfo = await db.select()
        .from(userStakingInfo)
        .where(eq(userStakingInfo.userId, userId))
        .limit(1);

      let totalStaked = ethers.parseEther("0");
      let isPremium = false;
      let isVip = false;

      if (userInfo.length > 0) {
        totalStaked = ethers.parseEther(userInfo[0].totalStaked);
        isPremium = totalStaked >= this.PREMIUM_THRESHOLD;
        isVip = totalStaked >= this.VIP_THRESHOLD;
      }

      const membershipTier = isVip ? 'vip' : isPremium ? 'premium' : 'basic';
      const benefits = this.getPremiumBenefits(membershipTier);

      return {
        isPremium,
        isVip,
        totalStaked: ethers.formatEther(totalStaked),
        membershipTier,
        benefits
      };
    } catch (error) {
      safeLogger.error('Error checking premium membership status:', error);
      throw new Error('Failed to check premium membership status');
    }
  }

  /**
   * Get premium member benefits based on tier
   */
  private getPremiumBenefits(tier: 'basic' | 'premium' | 'vip'): PremiumMemberBenefits {
    const baseBenefits: PremiumMemberBenefits = {
      bonusAprRate: 0,
      exclusiveStakingPools: [],
      reducedPenalties: false,
      prioritySupport: false,
      advancedAnalytics: false,
      earlyAccess: false,
      customStakingOptions: false,
      compoundingBonuses: false
    };

    if (tier === 'premium') {
      return {
        ...baseBenefits,
        bonusAprRate: 2, // 2% additional APR
        exclusiveStakingPools: [6, 7], // Premium-only pools
        reducedPenalties: true,
        prioritySupport: true,
        advancedAnalytics: true,
        earlyAccess: true,
        customStakingOptions: true,
        compoundingBonuses: true
      };
    }

    if (tier === 'vip') {
      return {
        ...baseBenefits,
        bonusAprRate: 5, // 5% additional APR
        exclusiveStakingPools: [6, 7, 8, 9], // VIP and premium pools
        reducedPenalties: true,
        prioritySupport: true,
        advancedAnalytics: true,
        earlyAccess: true,
        customStakingOptions: true,
        compoundingBonuses: true
      };
    }

    return baseBenefits;
  }

  /**
   * Get exclusive staking pools for premium members
   */
  async getExclusiveStakingPools(userId: string): Promise<PremiumStakingPool[]> {
    try {
      const membershipStatus = await this.checkPremiumMembershipStatus(userId);
      
      if (!membershipStatus.isPremium) {
        return [];
      }

      // Get exclusive tier IDs based on membership level
      const exclusiveTierIds = membershipStatus.benefits.exclusiveStakingPools;
      
      if (exclusiveTierIds.length === 0) {
        return [];
      }

      // This would typically fetch from a separate premium pools table
      // For now, we'll create mock premium pools
      const premiumPools: PremiumStakingPool[] = [];

      if (exclusiveTierIds.includes(6)) {
        premiumPools.push({
          id: 6,
          name: "Premium Quarterly Pool",
          description: "Exclusive 90-day staking pool for premium members with enhanced rewards",
          lockPeriod: 90 * 24 * 3600, // 90 days
          baseAprRate: 1500, // 15% base APR
          premiumBonusRate: 500, // 5% premium bonus
          minStakeAmount: ethers.formatEther(ethers.parseEther("2000")),
          maxStakeAmount: ethers.formatEther(ethers.parseEther("50000")),
          totalCapacity: ethers.formatEther(ethers.parseEther("1000000")),
          currentStaked: ethers.formatEther(ethers.parseEther("450000")),
          participantCount: 89,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          specialFeatures: ["Auto-compounding", "Reduced penalties", "Priority rewards"]
        });
      }

      if (exclusiveTierIds.includes(7)) {
        premiumPools.push({
          id: 7,
          name: "Premium Annual Pool",
          description: "Exclusive 365-day staking pool with maximum rewards for premium members",
          lockPeriod: 365 * 24 * 3600, // 365 days
          baseAprRate: 2200, // 22% base APR
          premiumBonusRate: 800, // 8% premium bonus
          minStakeAmount: ethers.formatEther(ethers.parseEther("5000")),
          maxStakeAmount: ethers.formatEther(ethers.parseEther("100000")),
          totalCapacity: ethers.formatEther(ethers.parseEther("2000000")),
          currentStaked: ethers.formatEther(ethers.parseEther("1200000")),
          participantCount: 156,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
          specialFeatures: ["Maximum APR", "VIP support", "Custom terms", "Bonus rewards"]
        });
      }

      if (membershipStatus.isVip && exclusiveTierIds.includes(8)) {
        premiumPools.push({
          id: 8,
          name: "VIP Flexible Pool",
          description: "Ultra-flexible staking pool exclusively for VIP members",
          lockPeriod: 0, // Flexible
          baseAprRate: 1800, // 18% base APR
          premiumBonusRate: 1200, // 12% VIP bonus
          minStakeAmount: ethers.formatEther(ethers.parseEther("10000")),
          maxStakeAmount: "0", // Unlimited
          totalCapacity: "0", // Unlimited
          currentStaked: ethers.formatEther(ethers.parseEther("5000000")),
          participantCount: 23,
          isActive: true,
          startDate: new Date(),
          specialFeatures: ["No lock period", "Unlimited capacity", "VIP concierge", "Custom rewards"]
        });
      }

      if (membershipStatus.isVip && exclusiveTierIds.includes(9)) {
        premiumPools.push({
          id: 9,
          name: "VIP Mega Pool",
          description: "Ultra-high yield pool for VIP members with massive stakes",
          lockPeriod: 180 * 24 * 3600, // 180 days
          baseAprRate: 2500, // 25% base APR
          premiumBonusRate: 1500, // 15% VIP bonus
          minStakeAmount: ethers.formatEther(ethers.parseEther("50000")),
          maxStakeAmount: "0", // Unlimited
          totalCapacity: "0", // Unlimited
          currentStaked: ethers.formatEther(ethers.parseEther("10000000")),
          participantCount: 12,
          isActive: true,
          startDate: new Date(),
          endDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
          specialFeatures: ["Ultra-high APR", "Whale benefits", "Direct access", "Custom contracts"]
        });
      }

      return premiumPools;
    } catch (error) {
      safeLogger.error('Error fetching exclusive staking pools:', error);
      throw new Error('Failed to fetch exclusive staking pools');
    }
  }

  /**
   * Calculate premium member discount on penalties
   */
  async calculatePremiumPenaltyDiscount(
    userId: string,
    originalPenalty: string
  ): Promise<{
    originalPenalty: string;
    discountPercentage: number;
    discountAmount: string;
    finalPenalty: string;
  }> {
    try {
      const membershipStatus = await this.checkPremiumMembershipStatus(userId);
      
      let discountPercentage = 0;
      
      if (membershipStatus.isVip) {
        discountPercentage = 50; // 50% penalty reduction for VIP
      } else if (membershipStatus.isPremium) {
        discountPercentage = 25; // 25% penalty reduction for premium
      }

      const originalPenaltyAmount = ethers.parseEther(originalPenalty);
      const discountAmount = (originalPenaltyAmount * BigInt(discountPercentage)) / BigInt(100);
      const finalPenaltyAmount = originalPenaltyAmount - discountAmount;

      return {
        originalPenalty,
        discountPercentage,
        discountAmount: ethers.formatEther(discountAmount),
        finalPenalty: ethers.formatEther(finalPenaltyAmount)
      };
    } catch (error) {
      safeLogger.error('Error calculating premium penalty discount:', error);
      throw new Error('Failed to calculate penalty discount');
    }
  }

  /**
   * Get premium member analytics
   */
  async getPremiumAnalytics(userId: string): Promise<PremiumAnalytics | null> {
    try {
      const membershipStatus = await this.checkPremiumMembershipStatus(userId);
      
      if (!membershipStatus.benefits.advancedAnalytics) {
        return null;
      }

      // Get user's staking positions
      const positions = await db.select()
        .from(stakingPositions)
        .where(and(
          eq(stakingPositions.userId, userId),
          eq(stakingPositions.isActive, true)
        ));

      if (positions.length === 0) {
        return null;
      }

      // Calculate analytics
      let totalStaked = ethers.parseEther("0");
      let weightedApr = 0;
      const tierDistribution: { [key: number]: string } = {};

      for (const position of positions) {
        const amount = ethers.parseEther(position.amount);
        totalStaked += amount;
        weightedApr += position.aprRate * parseFloat(position.amount);
        
        if (!tierDistribution[position.tierId]) {
          tierDistribution[position.tierId] = "0";
        }
        tierDistribution[position.tierId] = ethers.formatEther(
          ethers.parseEther(tierDistribution[position.tierId]) + amount
        );
      }

      const averageApr = totalStaked > 0 ? weightedApr / parseFloat(ethers.formatEther(totalStaked)) : 0;

      // Calculate staking efficiency (how well distributed across tiers)
      const tierCount = Object.keys(tierDistribution).length;
      const maxTiers = 5; // Assuming 5 main tiers
      const stakingEfficiency = Math.min((tierCount / maxTiers) * 100, 100);

      // Calculate portfolio balance (how evenly distributed)
      const amounts = Object.values(tierDistribution).map(amount => parseFloat(amount));
      const avgAmount = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length;
      const variance = amounts.reduce((sum, amount) => sum + Math.pow(amount - avgAmount, 2), 0) / amounts.length;
      const portfolioBalance = Math.max(0, 100 - (Math.sqrt(variance) / avgAmount) * 100);

      // Risk assessment
      const highRiskThreshold = 80; // High APR positions
      const mediumRiskThreshold = 50;
      let riskAssessment = "Low";
      
      if (averageApr > highRiskThreshold) {
        riskAssessment = "High";
      } else if (averageApr > mediumRiskThreshold) {
        riskAssessment = "Medium";
      }

      // Generate recommendations
      const recommendations: string[] = [];
      
      if (stakingEfficiency < 60) {
        recommendations.push("Consider diversifying across more staking tiers for better risk management");
      }
      
      if (portfolioBalance < 50) {
        recommendations.push("Rebalance your portfolio for more even distribution");
      }
      
      if (averageApr < 1000) { // Less than 10% APR
        recommendations.push("Consider moving some funds to higher-yield premium pools");
      }

      // Calculate projected returns
      const totalStakedFloat = parseFloat(ethers.formatEther(totalStaked));
      const annualReturn = (totalStakedFloat * averageApr) / 10000;
      
      const projectedReturns = {
        monthly: (annualReturn / 12).toFixed(6),
        quarterly: (annualReturn / 4).toFixed(6),
        yearly: annualReturn.toFixed(6)
      };

      // Calculate compounding impact (assuming monthly compounding)
      const monthlyRate = averageApr / 10000 / 12;
      const compoundedAnnual = totalStakedFloat * Math.pow(1 + monthlyRate, 12) - totalStakedFloat;
      const compoundingImpact = (compoundedAnnual - annualReturn).toFixed(6);

      // Generate optimal rebalancing suggestions
      const optimalRebalancing = [];
      
      // Simple rebalancing logic - move from lowest APR to highest APR tiers
      const sortedPositions = positions.sort((a, b) => a.aprRate - b.aprRate);
      if (sortedPositions.length > 1) {
        const lowestApr = sortedPositions[0];
        const highestApr = sortedPositions[sortedPositions.length - 1];
        
        if (highestApr.aprRate - lowestApr.aprRate > 500) { // 5% difference
          const suggestedAmount = ethers.formatEther(
            ethers.parseEther(lowestApr.amount) / BigInt(2)
          );
          const expectedGain = (parseFloat(suggestedAmount) * (highestApr.aprRate - lowestApr.aprRate)) / 10000;
          
          optimalRebalancing.push({
            suggested: true,
            fromTier: lowestApr.tierId,
            toTier: highestApr.tierId,
            amount: suggestedAmount,
            expectedGain: expectedGain.toFixed(6)
          });
        }
      }

      return {
        stakingEfficiency: Math.round(stakingEfficiency),
        rewardOptimization: Math.round((averageApr / 2000) * 100), // Assuming 20% is optimal
        portfolioBalance: Math.round(portfolioBalance),
        riskAssessment,
        recommendations,
        projectedReturns,
        compoundingImpact,
        optimalRebalancing
      };
    } catch (error) {
      safeLogger.error('Error generating premium analytics:', error);
      throw new Error('Failed to generate premium analytics');
    }
  }

  /**
   * Create custom staking option for premium members
   */
  async createCustomStakingOption(
    userId: string,
    customOptions: {
      amount: string;
      customDuration: number; // in days
      requestedApr: number; // basis points
      specialTerms?: string;
    }
  ): Promise<{
    approved: boolean;
    customTierId?: number;
    approvedApr?: number;
    terms?: string;
    reason?: string;
  }> {
    try {
      const membershipStatus = await this.checkPremiumMembershipStatus(userId);
      
      if (!membershipStatus.benefits.customStakingOptions) {
        return {
          approved: false,
          reason: "Custom staking options not available for your membership tier"
        };
      }

      const stakeAmount = ethers.parseEther(customOptions.amount);
      const minCustomStake = membershipStatus.isVip 
        ? ethers.parseEther("50000") // 50k LDAO for VIP
        : ethers.parseEther("10000"); // 10k LDAO for premium

      if (stakeAmount < minCustomStake) {
        return {
          approved: false,
          reason: `Minimum stake amount for custom options is ${ethers.formatEther(minCustomStake)} LDAO`
        };
      }

      // Validate custom duration (30 days to 2 years)
      if (customOptions.customDuration < 30 || customOptions.customDuration > 730) {
        return {
          approved: false,
          reason: "Custom duration must be between 30 and 730 days"
        };
      }

      // Calculate approved APR based on duration and membership tier
      const baseDurationMultiplier = Math.min(customOptions.customDuration / 365, 2); // Max 2x for 2 years
      const membershipMultiplier = membershipStatus.isVip ? 1.5 : 1.2;
      const maxApr = 3000; // 30% maximum APR
      
      let approvedApr = Math.min(
        Math.floor(1000 * baseDurationMultiplier * membershipMultiplier), // Base calculation
        Math.min(customOptions.requestedApr, maxApr) // Don't exceed requested or max
      );

      // Premium members get at least 12% APR, VIP get at least 15%
      const minApr = membershipStatus.isVip ? 1500 : 1200;
      approvedApr = Math.max(approvedApr, minApr);

      // Create custom terms
      const terms = [
        `Custom ${customOptions.customDuration}-day staking period`,
        `${approvedApr / 100}% APR (${approvedApr} basis points)`,
        `Minimum stake: ${customOptions.amount} LDAO`,
        membershipStatus.isVip ? "VIP concierge support included" : "Premium support included",
        "Auto-compounding available",
        "Reduced early withdrawal penalties apply"
      ].join("; ");

      // In a real implementation, this would create a custom tier in the database
      // For now, we'll return a mock custom tier ID
      const customTierId = 1000 + Math.floor(Math.random() * 9000); // Mock ID

      return {
        approved: true,
        customTierId,
        approvedApr,
        terms,
        reason: "Custom staking option approved based on your membership tier and stake amount"
      };
    } catch (error) {
      safeLogger.error('Error creating custom staking option:', error);
      throw new Error('Failed to create custom staking option');
    }
  }

  /**
   * Get premium member staking events and promotions
   */
  async getPremiumStakingEvents(userId: string): Promise<{
    activeEvents: any[];
    upcomingEvents: any[];
    eligiblePromotions: any[];
  }> {
    try {
      const membershipStatus = await this.checkPremiumMembershipStatus(userId);
      
      if (!membershipStatus.isPremium) {
        return {
          activeEvents: [],
          upcomingEvents: [],
          eligiblePromotions: []
        };
      }

      // Mock events and promotions - in a real app, these would come from a database
      const activeEvents = [
        {
          id: 1,
          name: "Premium Member Double Rewards Week",
          description: "Earn 2x rewards on all staking activities",
          startDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
          bonusMultiplier: 2,
          eligibleTiers: membershipStatus.benefits.exclusiveStakingPools,
          isActive: true
        }
      ];

      const upcomingEvents = [
        {
          id: 2,
          name: "VIP Exclusive Mega Pool Launch",
          description: "New ultra-high yield pool exclusively for VIP members",
          startDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          endDate: new Date(Date.now() + 37 * 24 * 60 * 60 * 1000),
          expectedApr: membershipStatus.isVip ? 4000 : null, // 40% APR for VIP
          minStake: "100000", // 100k LDAO
          isVipOnly: true
        }
      ];

      const eligiblePromotions = [
        {
          id: 1,
          name: "Loyalty Bonus",
          description: "Additional 1% APR for members staking for 90+ days",
          bonusApr: 100,
          requirements: "Continuous staking for 90 days",
          isEligible: true
        }
      ];

      if (membershipStatus.isVip) {
        eligiblePromotions.push({
          id: 2,
          name: "VIP Concierge Staking",
          description: "Personal staking advisor and custom terms",
          bonusApr: 0,
          requirements: "VIP membership",
          isEligible: true
        });
      }

      return {
        activeEvents,
        upcomingEvents: membershipStatus.benefits.earlyAccess ? upcomingEvents : [],
        eligiblePromotions
      };
    } catch (error) {
      safeLogger.error('Error fetching premium staking events:', error);
      throw new Error('Failed to fetch premium staking events');
    }
  }
}

export default PremiumMemberBenefitsService;
