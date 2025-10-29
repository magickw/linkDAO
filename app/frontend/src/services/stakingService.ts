import { TokenBalance } from '../types/wallet';

export interface StakingPool {
  id: string;
  name: string;
  token: string;
  apy: number;
  tvl: number;
  minStake: number;
  lockPeriod: string;
  risk: 'low' | 'medium' | 'high';
  contractAddress: string;
  rewardsToken?: string;
  rewardRate?: number;
  endTime?: number;
}

export interface UserStakingInfo {
  poolId: string;
  stakedAmount: number;
  rewards: number;
  unlockTime?: number;
  isActive: boolean;
}

interface StakingServiceInterface {
  getAvailablePools(): Promise<StakingPool[]>;
  getUserStakingInfo(address: string): Promise<UserStakingInfo[]>;
  stakeTokens(poolId: string, amount: number, token: string): Promise<any>;
  unstakeTokens(poolId: string, amount: number): Promise<any>;
  claimRewards(poolId: string): Promise<any>;
  getPoolAPR(poolId: string): Promise<number>;
  getPoolTVL(poolId: string): Promise<number>;
}

export class StakingService implements StakingServiceInterface {
  private baseUrl: string;
  private apiKey?: string;

  constructor(baseUrl: string = '/api/staking', apiKey?: string) {
    this.baseUrl = baseUrl;
    this.apiKey = apiKey;
  }

  /**
   * Get available staking pools
   */
  async getAvailablePools(): Promise<StakingPool[]> {
    try {
      const response = await fetch(`${this.baseUrl}/pools`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get staking pools');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting staking pools:', error);
      throw new Error(`Failed to get staking pools: ${error.message || error}`);
    }
  }

  /**
   * Get user staking information
   */
  async getUserStakingInfo(address: string): Promise<UserStakingInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/user/${address}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get user staking info');
      }

      return result.data;
    } catch (error: any) {
      console.error('Error getting user staking info:', error);
      throw new Error(`Failed to get user staking info: ${error.message || error}`);
    }
  }

  /**
   * Stake tokens in a pool
   */
  async stakeTokens(poolId: string, amount: number, token: string): Promise<any> {
    try {
      // In a real implementation, this would call an API to execute the staking transaction
      console.log(`Staking ${amount} ${token} in pool ${poolId}`);
      
      // Simulate API call
      return {
        success: true,
        transactionHash: '0x1234567890abcdef',
        amount: amount,
        token: token,
        poolId: poolId
      };
    } catch (error: any) {
      console.error('Error staking tokens:', error);
      throw new Error(`Failed to stake tokens: ${error.message || error}`);
    }
  }

  /**
   * Unstake tokens from a pool
   */
  async unstakeTokens(poolId: string, amount: number): Promise<any> {
    try {
      // In a real implementation, this would call an API to execute the unstaking transaction
      console.log(`Unstaking ${amount} from pool ${poolId}`);
      
      // Simulate API call
      return {
        success: true,
        transactionHash: '0xabcdef1234567890',
        amount: amount,
        poolId: poolId
      };
    } catch (error: any) {
      console.error('Error unstaking tokens:', error);
      throw new Error(`Failed to unstake tokens: ${error.message || error}`);
    }
  }

  /**
   * Claim rewards from a pool
   */
  async claimRewards(poolId: string): Promise<any> {
    try {
      // In a real implementation, this would call an API to execute the reward claim transaction
      console.log(`Claiming rewards from pool ${poolId}`);
      
      // Simulate API call
      return {
        success: true,
        transactionHash: '0x9876543210fedcba',
        rewards: 10.5,
        poolId: poolId
      };
    } catch (error: any) {
      console.error('Error claiming rewards:', error);
      throw new Error(`Failed to claim rewards: ${error.message || error}`);
    }
  }

  /**
   * Get pool APR
   */
  async getPoolAPR(poolId: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/pool/${poolId}/apr`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get pool APR');
      }

      return result.data.apr;
    } catch (error: any) {
      console.error('Error getting pool APR:', error);
      throw new Error(`Failed to get pool APR: ${error.message || error}`);
    }
  }

  /**
   * Get pool TVL
   */
  async getPoolTVL(poolId: string): Promise<number> {
    try {
      const response = await fetch(`${this.baseUrl}/pool/${poolId}/tvl`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(this.apiKey ? { 'Authorization': `Bearer ${this.apiKey}` } : {})
        }
      });

      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.message || 'Failed to get pool TVL');
      }

      return result.data.tvl;
    } catch (error: any) {
      console.error('Error getting pool TVL:', error);
      throw new Error(`Failed to get pool TVL: ${error.message || error}`);
    }
  }
}

// Create a default instance
export const stakingService = new StakingService();
export default stakingService;