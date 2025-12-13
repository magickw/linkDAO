/**
 * Staking Service
 * Handles all interactions with the EnhancedLDAOStaking and RewardPool contracts
 * Provides comprehensive staking functionality
 */

import { Contract, ethers } from 'ethers';
import { contractRegistryService } from '../contractRegistryService';

// Enhanced Staking ABI (key functions)
const ENHANCED_STAKING_ABI = [
  'function stake(uint256 amount, uint256 tierId) external',
  'function unstake(uint256 stakeIndex, uint256 amount) external',
  'function claimRewards(uint256 stakeIndex) external',
  'function getUserStakes(address user) external view returns (tuple(uint256 amount, uint256 stakingStartTime, uint256 lockPeriod, uint256 rewardRate, uint256 lastRewardClaim, bool isActive)[])',
  'function getStakingTier(uint256 tierId) external view returns (tuple(uint256 lockPeriod, uint256 rewardRate, uint256 minStakeAmount, bool isActive))',
  'function calculateRewards(uint256 stakeIndex) external view returns (uint256)',
  'function getTotalStaked(address user) external view returns (uint256)',
  'function getVotingPower(address user) external view returns (uint256)',
  'event Staked(address indexed user, uint256 amount, uint256 tierId, uint256 stakeIndex)',
  'event Unstaked(address indexed user, uint256 amount, uint256 stakeIndex)',
  'event RewardsClaimed(address indexed user, uint256 amount)',
  'event StakingTierCreated(uint256 indexed tierId, uint256 lockPeriod, uint256 rewardRate)'
];

// Reward Pool ABI (key functions)
const REWARD_POOL_ABI = [
  'function depositRewards(uint256 amount) external',
  'function claimStakingRewards(address user) external returns (uint256)',
  'function getAvailableRewards(address user) external view returns (uint256)',
  'function getRewardPoolBalance() external view returns (uint256)',
  'event RewardsDeposited(address indexed depositor, uint256 amount)',
  'event RewardsClaimed(address indexed user, uint256 amount)'
];

export interface StakingTier {
  id: number;
  lockPeriod: number; // in seconds
  rewardRate: number; // in basis points (e.g., 500 = 5%)
  minStakeAmount: string;
  isActive: boolean;
}

export interface StakeInfo {
  index: number;
  amount: string;
  stakingStartTime: number;
  lockPeriod: number;
  rewardRate: number;
  lastRewardClaim: number;
  isActive: boolean;
  pendingRewards: string;
  canUnstake: boolean;
}

export interface StakingStats {
  totalStaked: string;
  totalPendingRewards: string;
  votingPower: string;
  activeStakes: number;
}

export class StakingService {
  private stakingContract: Contract | null = null;
  private rewardPoolContract: Contract | null = null;
  private initialized = false;

  private async getStakingContract(): Promise<Contract> {
    if (!this.initialized) {
      throw new Error('StakingService not initialized');
    }

    if (!this.stakingContract) {
      const address = await contractRegistryService.getContractAddress('EnhancedLDAOStaking');
      // Create a read-only provider for view functions
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      this.stakingContract = new Contract(address, ENHANCED_STAKING_ABI, provider);
    }

    return this.stakingContract;
  }

  private async getRewardPoolContract(): Promise<Contract> {
    if (!this.initialized) {
      throw new Error('StakingService not initialized');
    }

    if (!this.rewardPoolContract) {
      const address = await contractRegistryService.getContractAddress('RewardPool');
      // Create a read-only provider for view functions
      const provider = new ethers.JsonRpcProvider('https://sepolia.drpc.org');
      this.rewardPoolContract = new Contract(address, REWARD_POOL_ABI, provider);
    }

    return this.rewardPoolContract;
  }

  /**
   * Initialize the Staking Service
   */
  async initialize(): Promise<void> {
    try {
      await contractRegistryService.preloadCommonContracts();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize StakingService:', error);
      throw error;
    }
  }

  /**
   * Get all available staking tiers
   */
  async getStakingTiers(): Promise<StakingTier[]> {
    const contract = await this.getStakingContract();
    const tiers: StakingTier[] = [];

    // Check first 10 tier IDs (adjust based on actual implementation)
    for (let i = 1; i <= 10; i++) {
      try {
        const tier = await contract.getStakingTier(i);
        if (tier.isActive) {
          tiers.push({
            id: i,
            lockPeriod: Number(tier.lockPeriod),
            rewardRate: Number(tier.rewardRate),
            minStakeAmount: ethers.formatEther(tier.minStakeAmount),
            isActive: tier.isActive
          });
        }
      } catch {
        // Tier doesn't exist, stop checking
        break;
      }
    }

    return tiers;
  }

  /**
   * Stake tokens in a specific tier
   */
  async stake(amount: number, tierId: number, signer: any): Promise<string> {
    const contract = await this.getStakingContract();
    const contractWithSigner = contract.connect(signer);

    try {
      // First approve tokens if needed (this would be handled by the UI)
      const tx = await contract.stake(
        ethers.parseEther(amount.toString()),
        tierId
      );
      
      const receipt = await tx.wait();
      
      // Extract stake index from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'Staked';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return parsed.args.stakeIndex.toString();
      }

      throw new Error('Failed to extract stake index from transaction');
    } catch (error) {
      console.error('Failed to stake:', error);
      throw new Error(`Failed to stake: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Unstake tokens
   */
  async unstake(stakeIndex: number, amount: number, signer: any): Promise<void> {
    const contract = await this.getStakingContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.unstake(
        stakeIndex,
        ethers.parseEther(amount.toString())
      );
      await tx.wait();
    } catch (error) {
      console.error('Failed to unstake:', error);
      throw new Error(`Failed to unstake: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Claim rewards from a stake
   */
  async claimRewards(stakeIndex: number, signer: any): Promise<string> {
    const contract = await this.getStakingContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.claimRewards(stakeIndex);
      const receipt = await tx.wait();
      
      // Extract reward amount from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'RewardsClaimed';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return ethers.formatEther(parsed.args.amount);
      }

      throw new Error('Failed to extract reward amount from transaction');
    } catch (error) {
      console.error('Failed to claim rewards:', error);
      throw new Error(`Failed to claim rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get all stakes for a user
   */
  async getUserStakes(userAddress: string): Promise<StakeInfo[]> {
    const contract = await this.getStakingContract();

    try {
      const stakes = await contract.getUserStakes(userAddress);
      const stakeInfos: StakeInfo[] = [];

      for (let i = 0; i < stakes.length; i++) {
        const stake = stakes[i];
        const pendingRewards = await contract.calculateRewards(i);
        const canUnstake = Date.now() / 1000 >= Number(stake.stakingStartTime) + Number(stake.lockPeriod);

        stakeInfos.push({
          index: i,
          amount: ethers.formatEther(stake.amount),
          stakingStartTime: Number(stake.stakingStartTime),
          lockPeriod: Number(stake.lockPeriod),
          rewardRate: Number(stake.rewardRate),
          lastRewardClaim: Number(stake.lastRewardClaim),
          isActive: stake.isActive,
          pendingRewards: ethers.formatEther(pendingRewards),
          canUnstake
        });
      }

      return stakeInfos;
    } catch (error) {
      console.error('Failed to get user stakes:', error);
      return [];
    }
  }

  /**
   * Get user's total staked amount
   */
  async getTotalStaked(userAddress: string): Promise<string> {
    const contract = await this.getStakingContract();

    try {
      const total = await contract.getTotalStaked(userAddress);
      return ethers.formatEther(total);
    } catch (error) {
      console.error('Failed to get total staked:', error);
      return '0';
    }
  }

  /**
   * Get user's voting power
   */
  async getVotingPower(userAddress: string): Promise<string> {
    const contract = await this.getStakingContract();

    try {
      const power = await contract.getVotingPower(userAddress);
      return ethers.formatEther(power);
    } catch (error) {
      console.error('Failed to get voting power:', error);
      return '0';
    }
  }

  /**
   * Get user's staking statistics
   */
  async getStakingStats(userAddress: string): Promise<StakingStats> {
    const stakes = await this.getUserStakes(userAddress);
    const totalStaked = await this.getTotalStaked(userAddress);
    const votingPower = await this.getVotingPower(userAddress);

    const totalPendingRewards = stakes.reduce(
      (sum, stake) => sum + parseFloat(stake.pendingRewards),
      0
    );

    const activeStakes = stakes.filter(stake => stake.isActive).length;

    return {
      totalStaked,
      totalPendingRewards: totalPendingRewards.toString(),
      votingPower,
      activeStakes
    };
  }

  /**
   * Deposit rewards to the reward pool (admin function)
   */
  async depositRewards(amount: number, signer: any): Promise<void> {
    const contract = await this.getRewardPoolContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.depositRewards(ethers.parseEther(amount.toString()));
      await tx.wait();
    } catch (error) {
      console.error('Failed to deposit rewards:', error);
      throw new Error(`Failed to deposit rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get available rewards from reward pool
   */
  async getAvailableRewards(userAddress: string): Promise<string> {
    const contract = await this.getRewardPoolContract();

    try {
      const rewards = await contract.getAvailableRewards(userAddress);
      return ethers.formatEther(rewards);
    } catch (error) {
      console.error('Failed to get available rewards:', error);
      return '0';
    }
  }

  /**
   * Claim all available rewards from reward pool
   */
  async claimAllRewards(signer: any): Promise<string> {
    const contract = await this.getRewardPoolContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.claimStakingRewards(await signer.getAddress());
      const receipt = await tx.wait();
      
      // Extract reward amount from event
      const event = receipt.logs.find(log => {
        try {
          const parsed = contract.interface.parseLog(log);
          return parsed.name === 'RewardsClaimed';
        } catch {
          return false;
        }
      });

      if (event) {
        const parsed = contract.interface.parseLog(event);
        return ethers.formatEther(parsed.args.amount);
      }

      throw new Error('Failed to extract reward amount from transaction');
    } catch (error) {
      console.error('Failed to claim all rewards:', error);
      throw new Error(`Failed to claim all rewards: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get reward pool balance
   */
  async getRewardPoolBalance(): Promise<string> {
    const contract = await this.getRewardPoolContract();

    try {
      const balance = await contract.getRewardPoolBalance();
      return ethers.formatEther(balance);
    } catch (error) {
      console.error('Failed to get reward pool balance:', error);
      return '0';
    }
  }

  /**
   * Listen to staking events
   */
  listenToStakingEvents(callbacks: {
    onStaked?: (user: string, amount: string, tierId: number, stakeIndex: number) => void;
    onUnstaked?: (user: string, amount: string, stakeIndex: number) => void;
    onRewardsClaimed?: (user: string, amount: string) => void;
  }): void {
    this.getStakingContract().then(contract => {
      if (callbacks.onStaked) {
        contract.on('Staked', (user, amount, tierId, stakeIndex) => {
          callbacks.onStaked!(
            user,
            ethers.formatEther(amount),
            Number(tierId),
            Number(stakeIndex)
          );
        });
      }

      if (callbacks.onUnstaked) {
        contract.on('Unstaked', (user, amount, stakeIndex) => {
          callbacks.onUnstaked!(
            user,
            ethers.formatEther(amount),
            Number(stakeIndex)
          );
        });
      }

      if (callbacks.onRewardsClaimed) {
        contract.on('RewardsClaimed', (user, amount) => {
          callbacks.onRewardsClaimed!(
            user,
            ethers.formatEther(amount)
          );
        });
      }
    });
  }

  /**
   * Calculate APY for a tier
   */
  calculateAPY(rewardRate: number): number {
    // rewardRate is in basis points (annual)
    return rewardRate / 100;
  }

  /**
   * Calculate expected rewards for a stake
   */
  calculateExpectedRewards(
    amount: number,
    rewardRate: number,
    lockPeriodSeconds: number,
    stakedDurationSeconds: number
  ): number {
    const annualRate = rewardRate / 10000; // Convert basis points to decimal
    const yearlyReward = amount * annualRate;
    const timeFactor = Math.min(stakedDurationSeconds, lockPeriodSeconds) / (365 * 24 * 60 * 60);
    return yearlyReward * timeFactor;
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    if (this.stakingContract) {
      this.stakingContract.removeAllListeners();
    }
    if (this.rewardPoolContract) {
      this.rewardPoolContract.removeAllListeners();
    }
  }
}

// Export singleton instance
export const stakingService = new StakingService();