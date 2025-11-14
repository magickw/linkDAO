import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { stakingPositions } from '../db/schema';
import { eq, and, desc } from 'drizzle-orm';

export interface StakingTier {
  id: number;
  name: string;
  lockPeriod: number; // in seconds, 0 for flexible
  baseAprRate: number; // basis points
  premiumBonusRate: number; // basis points
  minStakeAmount: string;
  maxStakeAmount: string; // "0" for unlimited
  isActive: boolean;
  allowsAutoCompound: boolean;
  earlyWithdrawalPenalty: number; // basis points
}

export interface StakePosition {
  id: string;
  userId: string;
  amount: string;
  startTime: Date;
  lockPeriod: number;
  aprRate: number;
  lastRewardClaim: Date;
  accumulatedRewards: string;
  isActive: boolean;
  isAutoCompound: boolean;
  isFixedTerm: boolean;
  tierId: number;
  contractAddress: string;
  transactionHash: string;
}

export interface FlexibleStakingOptions {
  tierId: number;
  amount: string;
  duration?: number; // Optional for flexible staking
  autoCompound: boolean;
  compoundFrequency?: 'daily' | 'weekly' | 'monthly'; // For auto-compound
}

export interface StakingCalculation {
  estimatedRewards: string;
  effectiveApr: number;
  lockEndDate?: Date;
  earlyWithdrawalPenalty?: string;
  compoundingEffect?: string;
}

export class EnhancedStakingService {
  private provider: ethers.Provider;
  private stakingContract: ethers.Contract;

  constructor(
    provider: ethers.Provider,
    contractAddress: string,
    contractAbi: any[]
  ) {
    this.provider = provider;
    this.stakingContract = new ethers.Contract(contractAddress, contractAbi, provider);
  }

  /**
   * Get all available staking tiers
   */
  async getStakingTiers(): Promise<StakingTier[]> {
    try {
      // Since stakingTiers table doesn't exist, we'll return mock data for now
      // In a real implementation, this would come from a configuration or database table
      return [
        {
          id: 1,
          name: "Flexible Staking",
          lockPeriod: 0,
          baseAprRate: 1000, // 10% APR
          premiumBonusRate: 200, // 2% bonus for premium members
          minStakeAmount: "100",
          maxStakeAmount: "0", // Unlimited
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 50 // 0.5% penalty
        },
        {
          id: 2,
          name: "30-Day Fixed",
          lockPeriod: 30 * 24 * 3600,
          baseAprRate: 1200, // 12% APR
          premiumBonusRate: 300, // 3% bonus for premium members
          minStakeAmount: "500",
          maxStakeAmount: "0", // Unlimited
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 100 // 1% penalty
        },
        {
          id: 3,
          name: "90-Day Fixed",
          lockPeriod: 90 * 24 * 3600,
          baseAprRate: 1500, // 15% APR
          premiumBonusRate: 400, // 4% bonus for premium members
          minStakeAmount: "1000",
          maxStakeAmount: "0", // Unlimited
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 200 // 2% penalty
        },
        {
          id: 4,
          name: "1-Year Fixed",
          lockPeriod: 365 * 24 * 3600,
          baseAprRate: 1800, // 20% APR
          premiumBonusRate: 500, // 5% bonus for premium members
          minStakeAmount: "5000",
          maxStakeAmount: "0", // Unlimited
          isActive: true,
          allowsAutoCompound: true,
          earlyWithdrawalPenalty: 500 // 5% penalty
        }
      ];
    } catch (error) {
      safeLogger.error('Error fetching staking tiers:', error);
      throw new Error('Failed to fetch staking tiers');
    }
  }

  /**
   * Get flexible staking options for a user
   */
  async getFlexibleStakingOptions(userId: string): Promise<{
    flexibleTiers: StakingTier[];
    fixedTermTiers: StakingTier[];
    userBalance: string;
    isPremiumMember: boolean;
  }> {
    try {
      const allTiers = await this.getStakingTiers();
      const flexibleTiers = allTiers.filter(tier => tier.lockPeriod === 0);
      const fixedTermTiers = allTiers.filter(tier => tier.lockPeriod > 0);

      // Get user's premium status by checking their staking positions
      const positions = await db.select()
        .from(stakingPositions)
        .where(and(
          eq(stakingPositions.userId, userId),
          eq(stakingPositions.status, 'active')
        ));

      // Calculate total staked amount to determine premium status
      let totalStaked = ethers.parseEther("0");
      for (const position of positions) {
        totalStaked += ethers.parseEther(position.amount);
      }

      // Premium threshold (same as in premiumMemberBenefitsService)
      const PREMIUM_THRESHOLD = ethers.parseEther("1000");
      const isPremiumMember = totalStaked >= PREMIUM_THRESHOLD;

      return {
        flexibleTiers,
        fixedTermTiers,
        userBalance: "0", // This would be fetched from blockchain
        isPremiumMember
      };
    } catch (error) {
      safeLogger.error('Error fetching flexible staking options:', error);
      throw new Error('Failed to fetch staking options');
    }
  }

  /**
   * Calculate staking rewards and penalties
   */
  async calculateStakingRewards(
    amount: string,
    tierId: number,
    duration?: number,
    isPremiumMember: boolean = false
  ): Promise<StakingCalculation> {
    try {
      // Get all tiers and find the matching one
      const allTiers = await this.getStakingTiers();
      const tier = allTiers.find(t => t.id === tierId && t.isActive);

      if (!tier) {
        throw new Error('Invalid staking tier');
      }

      const stakeAmount = ethers.parseEther(amount);
      
      // Calculate effective APR
      let effectiveApr = tier.baseAprRate;
      if (isPremiumMember) {
        effectiveApr += tier.premiumBonusRate;
      }

      // Calculate duration (use tier lock period if not specified)
      const stakingDuration = duration || tier.lockPeriod;
      const durationInYears = stakingDuration / (365 * 24 * 3600);

      // Calculate estimated rewards
      const annualRewards = (stakeAmount * BigInt(effectiveApr)) / BigInt(10000);
      const estimatedRewards = (annualRewards * BigInt(Math.floor(durationInYears * 1000))) / BigInt(1000);

      // Calculate lock end date for fixed-term staking
      let lockEndDate: Date | undefined;
      if (tier.lockPeriod > 0) {
        lockEndDate = new Date(Date.now() + tier.lockPeriod * 1000);
      }

      // Calculate early withdrawal penalty
      let earlyWithdrawalPenalty: string | undefined;
      if (tier.earlyWithdrawalPenalty > 0) {
        const penalty = (stakeAmount * BigInt(tier.earlyWithdrawalPenalty)) / BigInt(10000);
        earlyWithdrawalPenalty = ethers.formatEther(penalty);
      }

      // Calculate compounding effect if auto-compound is enabled
      let compoundingEffect: string | undefined;
      if (tier.allowsAutoCompound) {
        // Simplified compound interest calculation
        const compoundFrequency = 12; // Monthly compounding
        const compoundRate = effectiveApr / 10000 / compoundFrequency;
        const compoundPeriods = durationInYears * compoundFrequency;
        const compoundMultiplier = Math.pow(1 + compoundRate, compoundPeriods);
        const compoundedAmount = parseFloat(amount) * compoundMultiplier;
        compoundingEffect = (compoundedAmount - parseFloat(amount)).toFixed(6);
      }

      return {
        estimatedRewards: ethers.formatEther(estimatedRewards),
        effectiveApr: effectiveApr / 100, // Convert basis points to percentage
        lockEndDate,
        earlyWithdrawalPenalty,
        compoundingEffect
      };
    } catch (error) {
      safeLogger.error('Error calculating staking rewards:', error);
      throw new Error('Failed to calculate staking rewards');
    }
  }

  /**
   * Create a new staking position
   */
  async createStakePosition(
    userId: string,
    walletAddress: string,
    options: FlexibleStakingOptions,
    transactionHash: string
  ): Promise<string> {
    try {
      // Get all tiers and find the matching one
      const allTiers = await this.getStakingTiers();
      const tierData = allTiers.find(t => t.id === options.tierId);

      if (!tierData) {
        throw new Error('Invalid staking tier');
      }
      
      // Get user's premium status for APR calculation
      const positions = await db.select()
        .from(stakingPositions)
        .where(and(
          eq(stakingPositions.userId, userId),
          eq(stakingPositions.status, 'active')
        ));

      // Calculate total staked amount to determine premium status
      let totalStaked = ethers.parseEther("0");
      for (const position of positions) {
        totalStaked += ethers.parseEther(position.amount);
      }

      // Premium threshold (same as in premiumMemberBenefitsService)
      const PREMIUM_THRESHOLD = ethers.parseEther("1000");
      const isPremiumMember = totalStaked >= PREMIUM_THRESHOLD;
      
      // Calculate effective APR
      let effectiveApr = tierData.baseAprRate;
      if (isPremiumMember) {
        effectiveApr += tierData.premiumBonusRate;
      }

      // Create stake position record
      const positionId = `stake_${userId}_${Date.now()}`;
      const now = new Date();

      await db.insert(stakingPositions).values({
        id: positionId,
        userId,
        amount: options.amount,
        startTime: now,
        lockPeriod: options.duration || tierData.lockPeriod,
        aprRate: effectiveApr,
        lastRewardClaim: now,
        accumulatedRewards: "0",
        isActive: true,
        isAutoCompound: options.autoCompound,
        isFixedTerm: tierData.lockPeriod > 0,
        tierId: options.tierId,
        contractAddress: "", // This would be set in a real implementation
        transactionHash,
        createdAt: now,
        updatedAt: now
      });

      return positionId;
    } catch (error) {
      safeLogger.error('Error creating stake position:', error);
      throw new Error('Failed to create stake position');
    }
  }

  /**
   * Get user's staking positions
   */
  async getUserStakePositions(userId: string): Promise<StakePosition[]> {
    try {
      const positions = await db.select()
        .from(stakingPositions)
        .where(eq(stakingPositions.userId, userId))
        .orderBy(desc(stakingPositions.createdAt));

      return positions.map(pos => ({
        id: pos.id,
        userId: pos.userId,
        amount: pos.amount,
        startTime: pos.startTime,
        lockPeriod: pos.lockPeriod,
        aprRate: pos.aprRate,
        lastRewardClaim: pos.lastRewardClaim,
        accumulatedRewards: pos.accumulatedRewards,
        isActive: pos.status === 'active',
        isAutoCompound: pos.isAutoCompound,
        isFixedTerm: pos.isFixedTerm,
        tierId: pos.tierId,
        contractAddress: pos.contractAddress,
        transactionHash: pos.transactionHash
      }));
    } catch (error) {
      safeLogger.error('Error fetching user stake positions:', error);
      throw new Error('Failed to fetch stake positions');
    }
  }

  /**
   * Calculate early withdrawal penalty
   */
  async calculateEarlyWithdrawalPenalty(
    positionId: string,
    withdrawalAmount?: string
  ): Promise<{
    penalty: string;
    penaltyPercentage: number;
    remainingLockTime: number;
    canWithdraw: boolean;
  }> {
    try {
      const position = await db.select()
        .from(stakingPositions)
        .where(eq(stakingPositions.id, positionId))
        .limit(1);

      if (position.length === 0) {
        throw new Error('Stake position not found');
      }

      const pos = position[0];
      
      // Get all tiers and find the matching one
      const allTiers = await this.getStakingTiers();
      const tierData = allTiers.find(t => t.id === pos.tierId);

      if (!tierData) {
        throw new Error('Staking tier not found');
      }

      const now = Date.now();
      const lockEndTime = pos.startTime.getTime() + (pos.lockPeriod * 1000);
      const remainingLockTime = Math.max(0, lockEndTime - now);
      const canWithdraw = remainingLockTime === 0 || !pos.isFixedTerm;

      let penalty = "0";
      let penaltyPercentage = 0;

      if (remainingLockTime > 0 && pos.isFixedTerm) {
        penaltyPercentage = tierData.earlyWithdrawalPenalty / 100; // Convert basis points to percentage
        const amount = withdrawalAmount || pos.amount;
        const penaltyAmount = (ethers.parseEther(amount) * BigInt(tierData.earlyWithdrawalPenalty)) / BigInt(10000);
        penalty = ethers.formatEther(penaltyAmount);
      }

      return {
        penalty,
        penaltyPercentage,
        remainingLockTime: Math.floor(remainingLockTime / 1000), // Convert to seconds
        canWithdraw
      };
    } catch (error) {
      safeLogger.error('Error calculating early withdrawal penalty:', error);
      throw new Error('Failed to calculate penalty');
    }
  }

  /**
   * Process partial unstaking
   */
  async processPartialUnstaking(
    positionId: string,
    amount: string,
    transactionHash: string
  ): Promise<void> {
    try {
      const position = await db.select()
        .from(stakingPositions)
        .where(eq(stakingPositions.id, positionId))
        .limit(1);

      if (position.length === 0) {
        throw new Error('Stake position not found');
      }

      const pos = position[0];
      const currentAmount = ethers.parseEther(pos.amount);
      const withdrawAmount = ethers.parseEther(amount);
      const newAmount = currentAmount - withdrawAmount;

      if (newAmount <= 0) {
        throw new Error('Use full unstaking for complete withdrawal');
      }

      // Update position with new amount
      await db.update(stakingPositions)
        .set({
          amount: ethers.formatEther(newAmount),
          updatedAt: new Date()
        })
        .where(eq(stakingPositions.id, positionId));

    } catch (error) {
      safeLogger.error('Error processing partial unstaking:', error);
      throw new Error('Failed to process partial unstaking');
    }
  }

  /**
   * Process auto-compounding for a position
   */
  async processAutoCompounding(
    positionId: string,
    rewardAmount: string,
    transactionHash: string
  ): Promise<void> {
    try {
      const position = await db.select()
        .from(stakingPositions)
        .where(eq(stakingPositions.id, positionId))
        .limit(1);

      if (position.length === 0) {
        throw new Error('Stake position not found');
      }

      const pos = position[0];
      const currentAmount = ethers.parseEther(pos.amount);
      const compoundAmount = ethers.parseEther(rewardAmount);
      const newAmount = currentAmount + compoundAmount;

      // Update position with compounded amount
      await db.update(stakingPositions)
        .set({
          amount: ethers.formatEther(newAmount),
          lastRewardClaim: new Date(),
          accumulatedRewards: (
            ethers.parseEther(pos.accumulatedRewards) + compoundAmount
          ).toString(),
          updatedAt: new Date()
        })
        .where(eq(stakingPositions.id, positionId));

      // Update user staking info
      await this.updateUserStakingInfo(pos.userId);
    } catch (error) {
      safeLogger.error('Error processing auto-compounding:', error);
      throw new Error('Failed to process auto-compounding');
    }
  }

  /**
   * Get staking analytics for a user
   */
  async getUserStakingAnalytics(userId: string): Promise<{
    totalStaked: string;
    totalRewards: string;
    activePositions: number;
    averageApr: number;
    nextRewardClaim: Date | null;
    projectedMonthlyRewards: string;
  }> {
    try {
      const positions = await this.getUserStakePositions(userId);
      const activePositions = positions.filter(pos => pos.isActive);

      let totalStaked = ethers.parseEther("0");
      let totalRewards = ethers.parseEther("0");
      let weightedAprSum = 0;
      let nextRewardClaim: Date | null = null;

      for (const pos of activePositions) {
        const amount = ethers.parseEther(pos.amount);
        const rewards = ethers.parseEther(pos.accumulatedRewards);
        
        totalStaked += amount;
        totalRewards += rewards;
        weightedAprSum += pos.aprRate * parseFloat(pos.amount);

        // Find the earliest next reward claim
        const nextClaim = new Date(pos.lastRewardClaim.getTime() + 24 * 60 * 60 * 1000); // Daily claims
        if (!nextRewardClaim || nextClaim < nextRewardClaim) {
          nextRewardClaim = nextClaim;
        }
      }

      const averageApr = totalStaked > 0 ? weightedAprSum / parseFloat(ethers.formatEther(totalStaked)) / 100 : 0;
      
      // Calculate projected monthly rewards
      const monthlyRewardRate = averageApr / 12 / 100;
      const projectedMonthlyRewards = totalStaked * BigInt(Math.floor(monthlyRewardRate * 10000)) / BigInt(10000);

      return {
        totalStaked: ethers.formatEther(totalStaked),
        totalRewards: ethers.formatEther(totalRewards),
        activePositions: activePositions.length,
        averageApr,
        nextRewardClaim,
        projectedMonthlyRewards: ethers.formatEther(projectedMonthlyRewards)
      };
    } catch (error) {
      safeLogger.error('Error fetching user staking analytics:', error);
      throw new Error('Failed to fetch staking analytics');
    }
  }

  /**
   * Update user staking info (placeholder implementation)
   */
  private async updateUserStakingInfo(userId: string): Promise<void> {
    // This is a placeholder implementation
    // In a real implementation, this would update user staking information
    safeLogger.debug(`Updating staking info for user: ${userId}`);
  }
}

export default EnhancedStakingService;
