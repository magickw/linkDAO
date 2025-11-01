import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { stakingPositions, stakingTiers, userStakingInfo } from '../db/schema';
import { safeLogger } from '../utils/safeLogger';
import { eq, and, desc } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';

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
      const tiers = await db.select().from(stakingTiers).where(eq(stakingTiers.isActive, true));
      return tiers.map(tier => ({
        id: tier.id,
        name: tier.name,
        lockPeriod: tier.lockPeriod,
        baseAprRate: tier.baseAprRate,
        premiumBonusRate: tier.premiumBonusRate,
        minStakeAmount: tier.minStakeAmount,
        maxStakeAmount: tier.maxStakeAmount || "0",
        isActive: tier.isActive,
        allowsAutoCompound: tier.allowsAutoCompound,
        earlyWithdrawalPenalty: tier.earlyWithdrawalPenalty
      }));
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

      // Get user's premium status
      const userInfo = await db.select()
        .from(userStakingInfo)
        .where(eq(userStakingInfo.userId, userId))
        .limit(1);

      const isPremiumMember = userInfo.length > 0 ? userInfo[0].isPremiumMember : false;

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
      const tiers = await db.select()
        .from(stakingTiers)
        .where(and(eq(stakingTiers.id, tierId), eq(stakingTiers.isActive, true)))
        .limit(1);

      if (tiers.length === 0) {
        throw new Error('Invalid staking tier');
      }

      const tier = tiers[0];
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
      const tier = await db.select()
        .from(stakingTiers)
        .where(eq(stakingTiers.id, options.tierId))
        .limit(1);

      if (tier.length === 0) {
        throw new Error('Invalid staking tier');
      }

      const tierData = tier[0];
      
      // Get user's premium status for APR calculation
      const userInfo = await db.select()
        .from(userStakingInfo)
        .where(eq(userStakingInfo.userId, userId))
        .limit(1);

      const isPremiumMember = userInfo.length > 0 ? userInfo[0].isPremiumMember : false;
      
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
        walletAddress,
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
        contractAddress: this.stakingContract.target as string,
        transactionHash,
        createdAt: now,
        updatedAt: now
      });

      // Update user staking info
      await this.updateUserStakingInfo(userId);

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
        isActive: pos.isActive,
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
      const tier = await db.select()
        .from(stakingTiers)
        .where(eq(stakingTiers.id, pos.tierId))
        .limit(1);

      if (tier.length === 0) {
        throw new Error('Staking tier not found');
      }

      const tierData = tier[0];
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

      // Update user staking info
      await this.updateUserStakingInfo(pos.userId);
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
   * Update user staking info summary
   */
  private async updateUserStakingInfo(userId: string): Promise<void> {
    try {
      const positions = await this.getUserStakePositions(userId);
      const activePositions = positions.filter(pos => pos.isActive);

      let totalStaked = ethers.parseEther("0");
      let totalRewards = ethers.parseEther("0");

      for (const pos of activePositions) {
        totalStaked += ethers.parseEther(pos.amount);
        totalRewards += ethers.parseEther(pos.accumulatedRewards);
      }

      // Check premium membership threshold (1000 LDAO)
      const premiumThreshold = ethers.parseEther("1000");
      const isPremiumMember = totalStaked >= premiumThreshold;

      // Upsert user staking info
      const existingInfo = await db.select()
        .from(userStakingInfo)
        .where(eq(userStakingInfo.userId, userId))
        .limit(1);

      const now = new Date();

      if (existingInfo.length === 0) {
        await db.insert(userStakingInfo).values({
          userId,
          totalStaked: ethers.formatEther(totalStaked),
          totalRewards: ethers.formatEther(totalRewards),
          activePositions: activePositions.length,
          isPremiumMember,
          premiumMemberSince: isPremiumMember ? now : null,
          lastActivityTime: now,
          createdAt: now,
          updatedAt: now
        });
      } else {
        const existing = existingInfo[0];
        await db.update(userStakingInfo)
          .set({
            totalStaked: ethers.formatEther(totalStaked),
            totalRewards: ethers.formatEther(totalRewards),
            activePositions: activePositions.length,
            isPremiumMember,
            premiumMemberSince: isPremiumMember && !existing.isPremiumMember ? now : existing.premiumMemberSince,
            lastActivityTime: now,
            updatedAt: now
          })
          .where(eq(userStakingInfo.userId, userId));
      }
    } catch (error) {
      safeLogger.error('Error updating user staking info:', error);
      throw new Error('Failed to update user staking info');
    }
  }
}

export default EnhancedStakingService;