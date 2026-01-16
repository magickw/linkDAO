/**
 * Staking Service
 * Handles staking operations for LDAO tokens
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: number;
  minStake: number;
  lockPeriod: number; // in days
  risk: 'low' | 'medium' | 'high';
  rewardsToken: string;
  rewardRate: number;
}

export interface UserStakingInfo {
  poolId: string;
  stakedAmount: number;
  rewards: number;
  unlockTime?: number;
  isActive: boolean;
  startTime: number;
}

export interface StakingTransaction {
  id: string;
  type: 'stake' | 'unstake' | 'claim';
  amount: number;
  poolId: string;
  timestamp: number;
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
}

class StakingService {
  private baseUrl = `${ENV.BACKEND_URL}/api/staking`;

  /**
   * Get available staking pools
   */
  async getPools(): Promise<StakingPool[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/pools`);
      const data = response.data.data || response.data;
      return data.pools || data || [];
    } catch (error) {
      console.error('Error fetching staking pools:', error);
      return this.getMockPools();
    }
  }

  /**
   * Get user's staking information
   */
  async getUserStakingInfo(): Promise<UserStakingInfo[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/user`);
      const data = response.data.data || response.data;
      return data.staking || data || [];
    } catch (error) {
      console.error('Error fetching user staking info:', error);
      return [];
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stake(poolId: string, amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/stake`, {
        poolId,
        amount,
      });
      const data = response.data.data || response.data;
      return {
        success: true,
        txHash: data.txHash,
      };
    } catch (error: any) {
      console.error('Error staking tokens:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to stake tokens',
      };
    }
  }

  /**
   * Unstake tokens from a pool
   */
  async unstake(poolId: string, amount: number): Promise<{ success: boolean; error?: string; txHash?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/unstake`, {
        poolId,
        amount,
      });
      const data = response.data.data || response.data;
      return {
        success: true,
        txHash: data.txHash,
      };
    } catch (error: any) {
      console.error('Error unstaking tokens:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to unstake tokens',
      };
    }
  }

  /**
   * Claim rewards from a pool
   */
  async claimRewards(poolId: string): Promise<{ success: boolean; error?: string; amount?: number; txHash?: string }> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/claim`, {
        poolId,
      });
      const data = response.data.data || response.data;
      return {
        success: true,
        amount: data.amount,
        txHash: data.txHash,
      };
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      return {
        success: false,
        error: error.response?.data?.message || error.message || 'Failed to claim rewards',
      };
    }
  }

  /**
   * Get staking transaction history
   */
  async getTransactionHistory(): Promise<StakingTransaction[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/transactions`);
      const data = response.data.data || response.data;
      return data.transactions || data || [];
    } catch (error) {
      console.error('Error fetching transaction history:', error);
      return [];
    }
  }

  /**
   * Get total staked amount and pending rewards
   */
  async getStakingSummary(): Promise<{
    totalStaked: number;
    totalRewards: number;
    activePools: number;
  }> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/summary`);
      const data = response.data.data || response.data;
      return {
        totalStaked: data.totalStaked || 0,
        totalRewards: data.totalRewards || 0,
        activePools: data.activePools || 0,
      };
    } catch (error) {
      console.error('Error fetching staking summary:', error);
      return {
        totalStaked: 0,
        totalRewards: 0,
        activePools: 0,
      };
    }
  }

  /**
   * Get user's LDAO token balance
   */
  async getTokenBalance(): Promise<number> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/balance`);
      const data = response.data.data || response.data;
      return data.balance || 0;
    } catch (error) {
      console.error('Error fetching token balance:', error);
      return 0;
    }
  }

  // Mock data methods
  private getMockPools(): StakingPool[] {
    return [
      {
        id: '1',
        name: 'Flexible Staking',
        token: 'LDAO',
        apy: 5.5,
        tvl: 2500000,
        minStake: 100,
        lockPeriod: 0,
        risk: 'low',
        rewardsToken: 'LDAO',
        rewardRate: 0.00015,
      },
      {
        id: '2',
        name: '30-Day Lock',
        token: 'LDAO',
        apy: 8.2,
        tvl: 1800000,
        minStake: 500,
        lockPeriod: 30,
        risk: 'low',
        rewardsToken: 'LDAO',
        rewardRate: 0.00022,
      },
      {
        id: '3',
        name: '90-Day Lock',
        token: 'LDAO',
        apy: 12.5,
        tvl: 1200000,
        minStake: 1000,
        lockPeriod: 90,
        risk: 'medium',
        rewardsToken: 'LDAO',
        rewardRate: 0.00034,
      },
      {
        id: '4',
        name: '180-Day Lock',
        token: 'LDAO',
        apy: 18.0,
        tvl: 800000,
        minStake: 2000,
        lockPeriod: 180,
        risk: 'medium',
        rewardsToken: 'LDAO',
        rewardRate: 0.00049,
      },
      {
        id: '5',
        name: '1-Year Lock',
        token: 'LDAO',
        apy: 25.0,
        tvl: 500000,
        minStake: 5000,
        lockPeriod: 365,
        risk: 'high',
        rewardsToken: 'LDAO',
        rewardRate: 0.00068,
      },
    ];
  }
}

export const stakingService = new StakingService();