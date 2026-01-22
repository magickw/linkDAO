/**
 * Staking Boost Service
 * 
 * Provides functionality to boost staking rewards and performance.
 * 
 * Features:
 * - Boost multiplier management
 * - Boost duration and activation
 * - Boost rewards calculation
 * - Boost history tracking
 * - Boost tiers and levels
 */

import apiClient from './apiClient';

// Boost tier
export enum BoostTier {
  NONE = 'none',
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
  DIAMOND = 'diamond',
}

// Boost type
export enum BoostType {
  REWARD_MULTIPLIER = 'reward_multiplier',
  SPEED_BOOST = 'speed_boost',
  FEE_REDUCTION = 'fee_reduction',
  COMBO = 'combo',
}

// Boost status
export enum BoostStatus {
  ACTIVE = 'active',
  EXPIRED = 'expired',
  PAUSED = 'paused',
  PENDING = 'pending',
}

// Boost configuration
export interface BoostConfig {
  tier: BoostTier;
  multiplier: number; // e.g., 1.5x, 2x
  duration: number; // in days
  cost: number; // in LDAO tokens
  speedBonus: number; // percentage faster
  feeReduction: number; // percentage reduction
  maxStakeAmount: number; // maximum stake amount for this tier
  minStakeAmount: number; // minimum stake amount for this tier
}

// Active boost
export interface ActiveBoost {
  id: string;
  userId: string;
  stakingPoolId: string;
  tier: BoostTier;
  type: BoostType;
  multiplier: number;
  startTime: Date;
  endTime: Date;
  status: BoostStatus;
  originalRewards: number;
  boostedRewards: number;
  additionalRewards: number;
}

// Boost purchase request
export interface BoostPurchaseRequest {
  stakingPoolId: string;
  tier: BoostTier;
  type: BoostType;
  duration: number;
  autoRenew: boolean;
}

// Boost rewards calculation
export interface BoostRewardsCalculation {
  baseRewards: number;
  boostedRewards: number;
  additionalRewards: number;
  multiplier: number;
  dailyRewards: number;
  totalDuration: number;
}

// Boost statistics
export interface BoostStatistics {
  totalBoostsPurchased: number;
  totalBoostSpent: number;
  totalAdditionalRewardsEarned: number;
  currentBoostTier: BoostTier;
  boostsActive: number;
  averageBoostDuration: number;
  mostUsedBoostTier: BoostTier;
  boostHistory: ActiveBoost[];
}

class StakingBoostService {
  private boostConfigs: Record<BoostTier, BoostConfig> = {
    [BoostTier.BRONZE]: {
      tier: BoostTier.BRONZE,
      multiplier: 1.1,
      duration: 7,
      cost: 100,
      speedBonus: 5,
      feeReduction: 5,
      maxStakeAmount: 10000,
      minStakeAmount: 100,
    },
    [BoostTier.SILVER]: {
      tier: BoostTier.SILVER,
      multiplier: 1.25,
      duration: 14,
      cost: 250,
      speedBonus: 10,
      feeReduction: 10,
      maxStakeAmount: 50000,
      minStakeAmount: 500,
    },
    [BoostTier.GOLD]: {
      tier: BoostTier.GOLD,
      multiplier: 1.5,
      duration: 30,
      cost: 500,
      speedBonus: 15,
      feeReduction: 15,
      maxStakeAmount: 100000,
      minStakeAmount: 1000,
    },
    [BoostTier.PLATINUM]: {
      tier: BoostTier.PLATINUM,
      multiplier: 1.75,
      duration: 60,
      cost: 1000,
      speedBonus: 20,
      feeReduction: 20,
      maxStakeAmount: 500000,
      minStakeAmount: 5000,
    },
    [BoostTier.DIAMOND]: {
      tier: BoostTier.DIAMOND,
      multiplier: 2.0,
      duration: 90,
      cost: 2500,
      speedBonus: 25,
      feeReduction: 25,
      maxStakeAmount: 1000000,
      minStakeAmount: 10000,
    },
  };

  /**
   * Get boost configuration for tier
   */
  getBoostConfig(tier: BoostTier): BoostConfig {
    return this.boostConfigs[tier];
  }

  /**
   * Get all boost configurations
   */
  getAllBoostConfigs(): BoostConfig[] {
    return Object.values(this.boostConfigs);
  }

  /**
   * Calculate boost rewards
   */
  calculateBoostRewards(
    baseRewards: number,
    tier: BoostTier,
    duration: number
  ): BoostRewardsCalculation {
    const config = this.getBoostConfig(tier);
    const multiplier = config.multiplier;
    const boostedRewards = baseRewards * multiplier;
    const additionalRewards = boostedRewards - baseRewards;
    const dailyRewards = boostedRewards / duration;

    return {
      baseRewards,
      boostedRewards,
      additionalRewards,
      multiplier,
      dailyRewards,
      totalDuration: duration,
    };
  }

  /**
   * Purchase boost
   */
  async purchaseBoost(request: BoostPurchaseRequest): Promise<ActiveBoost> {
    try {
      const config = this.getBoostConfig(request.tier);
      const cost = config.cost * (request.duration / config.duration);

      const response = await apiClient.post('/staking/boost/purchase', {
        ...request,
        cost,
      });

      return response.data;
    } catch (error) {
      console.error('Error purchasing boost:', error);
      throw new Error('Failed to purchase boost');
    }
  }

  /**
   * Get active boosts for user
   */
  async getActiveBoosts(userId: string): Promise<ActiveBoost[]> {
    try {
      const response = await apiClient.get(`/staking/boost/${userId}/active`);

      return response.data;
    } catch (error) {
      console.error('Error fetching active boosts:', error);
      throw new Error('Failed to fetch active boosts');
    }
  }

  /**
   * Get boost by ID
   */
  async getBoostById(boostId: string): Promise<ActiveBoost> {
    try {
      const response = await apiClient.get(`/staking/boost/${boostId}`);

      return response.data;
    } catch (error) {
      console.error('Error fetching boost:', error);
      throw new Error('Failed to fetch boost');
    }
  }

  /**
   * Pause boost
   */
  async pauseBoost(boostId: string): Promise<boolean> {
    try {
      await apiClient.post(`/staking/boost/${boostId}/pause`);

      return true;
    } catch (error) {
      console.error('Error pausing boost:', error);
      throw new Error('Failed to pause boost');
    }
  }

  /**
   * Resume boost
   */
  async resumeBoost(boostId: string): Promise<boolean> {
    try {
      await apiClient.post(`/staking/boost/${boostId}/resume`);

      return true;
    } catch (error) {
      console.error('Error resuming boost:', error);
      throw new Error('Failed to resume boost');
    }
  }

  /**
   * Cancel boost
   */
  async cancelBoost(boostId: string): Promise<boolean> {
    try {
      await apiClient.delete(`/staking/boost/${boostId}`);

      return true;
    } catch (error) {
      console.error('Error canceling boost:', error);
      throw new Error('Failed to cancel boost');
    }
  }

  /**
   * Extend boost duration
   */
  async extendBoost(boostId: string, additionalDays: number): Promise<ActiveBoost> {
    try {
      const response = await apiClient.post(`/staking/boost/${boostId}/extend`, {
        additionalDays,
      });

      return response.data;
    } catch (error) {
      console.error('Error extending boost:', error);
      throw new Error('Failed to extend boost');
    }
  }

  /**
   * Upgrade boost tier
   */
  async upgradeBoostTier(boostId: string, newTier: BoostTier): Promise<ActiveBoost> {
    try {
      const response = await apiClient.post(`/staking/boost/${boostId}/upgrade`, {
        newTier,
      });

      return response.data;
    } catch (error) {
      console.error('Error upgrading boost tier:', error);
      throw new Error('Failed to upgrade boost tier');
    }
  }

  /**
   * Get boost statistics
   */
  async getBoostStatistics(userId: string): Promise<BoostStatistics> {
    try {
      const response = await apiClient.get(`/staking/boost/${userId}/statistics`);

      return response.data;
    } catch (error) {
      console.error('Error fetching boost statistics:', error);
      throw new Error('Failed to fetch boost statistics');
    }
  }

  /**
   * Get boost history
   */
  async getBoostHistory(
    userId: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<ActiveBoost[]> {
    try {
      const response = await apiClient.get(`/staking/boost/${userId}/history`, {
        params: { limit, offset },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching boost history:', error);
      throw new Error('Failed to fetch boost history');
    }
  }

  /**
   * Check if user is eligible for boost
   */
  async checkBoostEligibility(
    userId: string,
    tier: BoostTier,
    stakingPoolId: string
  ): Promise<{
    eligible: boolean;
    reason?: string;
    requirements?: {
      minStakeAmount: number;
      minStakeDuration: number;
      requiredTier?: BoostTier;
    };
  }> {
    try {
      const response = await apiClient.get(`/staking/boost/${userId}/eligibility`, {
        params: { tier, stakingPoolId },
      });

      return response.data;
    } catch (error) {
      console.error('Error checking boost eligibility:', error);
      throw new Error('Failed to check boost eligibility');
    }
  }

  /**
   * Get boost recommendations
   */
  async getBoostRecommendations(
    userId: string,
    stakingPoolId: string
  ): Promise<{
    recommendedTier: BoostTier;
    recommendedDuration: number;
    estimatedAdditionalRewards: number;
    roi: number;
    reasoning: string;
  }> {
    try {
      const response = await apiClient.get(`/staking/boost/${userId}/recommendations`, {
        params: { stakingPoolId },
      });

      return response.data;
    } catch (error) {
      console.error('Error fetching boost recommendations:', error);
      throw new Error('Failed to fetch boost recommendations');
    }
  }

  /**
   * Calculate boost cost
   */
  calculateBoostCost(tier: BoostTier, duration: number): number {
    const config = this.getBoostConfig(tier);
    return Math.floor(config.cost * (duration / config.duration));
  }

  /**
   * Get boost tier name
   */
  getBoostTierName(tier: BoostTier): string {
    const names: Record<BoostTier, string> = {
      [BoostTier.NONE]: 'None',
      [BoostTier.BRONZE]: 'Bronze',
      [BoostTier.SILVER]: 'Silver',
      [BoostTier.GOLD]: 'Gold',
      [BoostTier.PLATINUM]: 'Platinum',
      [BoostTier.DIAMOND]: 'Diamond',
    };
    return names[tier];
  }

  /**
   * Get boost tier color
   */
  getBoostTierColor(tier: BoostTier): string {
    const colors: Record<BoostTier, string> = {
      [BoostTier.NONE]: '#9ca3af',
      [BoostTier.BRONZE]: '#cd7f32',
      [BoostTier.SILVER]: '#c0c0c0',
      [BoostTier.GOLD]: '#ffd700',
      [BoostTier.PLATINUM]: '#e5e4e2',
      [BoostTier.DIAMOND]: '#b9f2ff',
    };
    return colors[tier];
  }

  /**
   * Format boost multiplier
   */
  formatBoostMultiplier(multiplier: number): string {
    return `${multiplier.toFixed(1)}x`;
  }

  /**
   * Is boost active
   */
  isBoostActive(boost: ActiveBoost): boolean {
    return (
      boost.status === BoostStatus.ACTIVE &&
      new Date() >= boost.startTime &&
      new Date() <= boost.endTime
    );
  }

  /**
   * Get boost remaining time
   */
  getBoostRemainingTime(boost: ActiveBoost): number {
    const now = new Date();
    const endTime = new Date(boost.endTime);
    const remaining = Math.max(0, endTime.getTime() - now.getTime());
    return Math.floor(remaining / (1000 * 60 * 60 * 24)); // in days
  }

  /**
   * Get boost progress percentage
   */
  getBoostProgressPercentage(boost: ActiveBoost): number {
    const now = new Date();
    const startTime = new Date(boost.startTime);
    const endTime = new Date(boost.endTime);
    const totalDuration = endTime.getTime() - startTime.getTime();
    const elapsed = now.getTime() - startTime.getTime();
    return Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));
  }

  /**
   * Auto-renew boost
   */
  async autoRenewBoost(boostId: string): Promise<ActiveBoost> {
    try {
      const boost = await this.getBoostById(boostId);
      const newBoost = await this.purchaseBoost({
        stakingPoolId: boost.stakingPoolId,
        tier: boost.tier,
        type: boost.type,
        duration: this.getBoostConfig(boost.tier).duration,
        autoRenew: true,
      });

      return newBoost;
    } catch (error) {
      console.error('Error auto-renewing boost:', error);
      throw new Error('Failed to auto-renew boost');
    }
  }

  /**
   * Get boost tiers in order
   */
  getBoostTiersInOrder(): BoostTier[] {
    return [
      BoostTier.BRONZE,
      BoostTier.SILVER,
      BoostTier.GOLD,
      BoostTier.PLATINUM,
      BoostTier.DIAMOND,
    ];
  }

  /**
   * Get next boost tier
   */
  getNextBoostTier(currentTier: BoostTier): BoostTier | null {
    const tiers = this.getBoostTiersInOrder();
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex === -1 || currentIndex === tiers.length - 1) {
      return null;
    }

    return tiers[currentIndex + 1];
  }

  /**
   * Get previous boost tier
   */
  getPreviousBoostTier(currentTier: BoostTier): BoostTier | null {
    const tiers = this.getBoostTiersInOrder();
    const currentIndex = tiers.indexOf(currentTier);
    
    if (currentIndex <= 0) {
      return null;
    }

    return tiers[currentIndex - 1];
  }
}

// Export singleton instance
export const stakingBoostService = new StakingBoostService();

export default stakingBoostService;