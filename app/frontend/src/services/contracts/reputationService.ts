/**
 * Reputation System Service
 * Handles all interactions with the ReputationSystem smart contract
 * Manages user reputation scores, levels, and benefits
 */

import { Contract, ethers } from 'ethers';
import { contractRegistryService } from '../contractRegistryService';

// Reputation System ABI (key functions)
const REPUTATION_ABI = [
  'function reputationScores(address user) external view returns (uint256)',
  'function getReputationLevel(uint256 score) external view returns (uint256)',
  'function updateReputation(address user, string action, uint256 amount) external',
  'function getLevelBenefits(uint256 level) external view returns (string memory)',
  'function getUserReputationHistory(address user) external view returns (tuple(string action, uint256 amount, uint256 timestamp)[])',
  'event ReputationUpdated(address indexed user, string action, uint256 amount, uint256 newScore)',
  'event LevelUp(address indexed user, uint256 newLevel)',
  'event BenefitGranted(address indexed user, string benefit)'
];

export interface Reputation {
  score: string;
  level: number;
  benefits: string[];
  history: ReputationHistoryEntry[];
}

export interface ReputationHistoryEntry {
  action: string;
  amount: string;
  timestamp: number;
}

export enum ReputationAction {
  POST_CREATED = 'POST_CREATED',
  COMMENT_CREATED = 'COMMENT_CREATED',
  TIP_SENT = 'TIP_SENT',
  TIP_RECEIVED = 'TIP_RECEIVED',
  STAKE_CREATED = 'STAKE_CREATED',
  PROPOSAL_CREATED = 'PROPOSAL_CREATED',
  VOTE_CAST = 'VOTE_CAST',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  MODERATION_ACTION = 'MODERATION_ACTION',
  CHARITY_DONATION = 'CHARITY_DONATION'
}

export class ReputationService {
  private contract: Contract | null = null;
  private initialized = false;

  private async getContract(): Promise<Contract> {
    if (!this.initialized) {
      throw new Error('ReputationService not initialized');
    }

    if (!this.contract) {
      const address = await contractRegistryService.getContractAddress('ReputationSystem');
      const { provider } = await import('@/lib/wagmi');
      this.contract = new Contract(address, REPUTATION_ABI, provider);
    }

    return this.contract;
  }

  /**
   * Initialize the Reputation Service
   */
  async initialize(): Promise<void> {
    try {
      // Ensure contract registry is initialized
      await contractRegistryService.preloadCommonContracts();
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize ReputationService:', error);
      throw error;
    }
  }

  /**
   * Get user's complete reputation information
   */
  async getUserReputation(userAddress: string): Promise<Reputation> {
    const contract = await this.getContract();

    try {
      // Get basic reputation data
      const score = await contract.reputationScores(userAddress);
      const level = await contract.getReputationLevel(score);
      const benefits = await this.getLevelBenefits(level);
      const history = await this.getUserReputationHistory(userAddress);

      return {
        score: ethers.formatEther(score),
        level: Number(level),
        benefits,
        history
      };
    } catch (error) {
      console.error('Failed to get user reputation:', error);
      // Return default reputation for new users
      return {
        score: '0',
        level: 0,
        benefits: [],
        history: []
      };
    }
  }

  /**
   * Update user's reputation
   */
  async updateReputation(
    userAddress: string,
    action: ReputationAction,
    amount: number,
    signer: any
  ): Promise<void> {
    const contract = await this.getContract();
    const contractWithSigner = contract.connect(signer);

    try {
      const tx = await contract.updateReputation(
        userAddress,
        action,
        ethers.parseEther(amount.toString())
      );
      await tx.wait();
    } catch (error) {
      console.error('Failed to update reputation:', error);
      throw new Error(`Failed to update reputation: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Get benefits for a specific reputation level
   */
  async getLevelBenefits(level: number): Promise<string[]> {
    const contract = await this.getContract();

    try {
      const benefits = await contract.getLevelBenefits(level);
      // Parse the returned string into an array of benefits
      return benefits.split(',').map(b => b.trim()).filter(b => b.length > 0);
    } catch (error) {
      console.error('Failed to get level benefits:', error);
      return [];
    }
  }

  /**
   * Get user's reputation history
   */
  async getUserReputationHistory(userAddress: string): Promise<ReputationHistoryEntry[]> {
    const contract = await this.getContract();

    try {
      const history = await contract.getUserReputationHistory(userAddress);
      
      return history.map((entry: any) => ({
        action: entry.action,
        amount: ethers.formatEther(entry.amount),
        timestamp: Number(entry.timestamp)
      }));
    } catch (error) {
      console.error('Failed to get reputation history:', error);
      return [];
    }
  }

  /**
   * Check if user has sufficient reputation for an action
   */
  async hasMinimumReputation(userAddress: string, requiredLevel: number): Promise<boolean> {
    const reputation = await this.getUserReputation(userAddress);
    return reputation.level >= requiredLevel;
  }

  /**
   * Get reputation score for multiple users (batch operation)
   */
  async getMultipleReputations(userAddresses: string[]): Promise<Record<string, Reputation>> {
    const reputations: Record<string, Reputation> = {};

    await Promise.all(
      userAddresses.map(async (address) => {
        try {
          reputations[address] = await this.getUserReputation(address);
        } catch (error) {
          console.error(`Failed to get reputation for ${address}:`, error);
          reputations[address] = {
            score: '0',
            level: 0,
            benefits: [],
            history: []
          };
        }
      })
    );

    return reputations;
  }

  /**
   * Listen to reputation update events
   */
  listenToReputationUpdates(callback: (user: string, action: string, amount: string, newScore: string) => void): void {
    this.getContract().then(contract => {
      contract.on('ReputationUpdated', (user: string, action: string, amount: bigint, newScore: bigint) => {
        callback(
          user,
          action,
          ethers.formatEther(amount),
          ethers.formatEther(newScore)
        );
      });
    });
  }

  /**
   * Listen to level up events
   */
  listenToLevelUps(callback: (user: string, newLevel: number) => void): void {
    this.getContract().then(contract => {
      contract.on('LevelUp', (user: string, newLevel: bigint) => {
        callback(user, Number(newLevel));
      });
    });
  }

  /**
   * Calculate reputation change for an action
   */
  calculateReputationChange(action: ReputationAction, amount: number): number {
    const reputationWeights: Record<ReputationAction, number> = {
      [ReputationAction.POST_CREATED]: 10,
      [ReputationAction.COMMENT_CREATED]: 5,
      [ReputationAction.TIP_SENT]: 3,
      [ReputationAction.TIP_RECEIVED]: 2,
      [ReputationAction.STAKE_CREATED]: 20,
      [ReputationAction.PROPOSAL_CREATED]: 15,
      [ReputationAction.VOTE_CAST]: 5,
      [ReputationAction.DISPUTE_RESOLVED]: 25,
      [ReputationAction.MODERATION_ACTION]: 30,
      [ReputationAction.CHARITY_DONATION]: 15
    };

    return (reputationWeights[action] || 0) * amount;
  }

  /**
   * Get reputation level threshold
   */
  getLevelThreshold(level: number): number {
    // Exponential growth: 100 * (1.5 ^ level)
    return Math.floor(100 * Math.pow(1.5, level));
  }

  /**
   * Estimate reputation needed for next level
   */
  async getReputationToNextLevel(userAddress: string): Promise<number> {
    const reputation = await this.getUserReputation(userAddress);
    const currentLevel = reputation.level;
    const nextLevelThreshold = this.getLevelThreshold(currentLevel + 1);
    const currentScore = Math.floor(parseFloat(reputation.score));
    
    return Math.max(0, nextLevelThreshold - currentScore);
  }

  /**
   * Clean up event listeners
   */
  cleanup(): void {
    if (this.contract) {
      this.contract.removeAllListeners();
    }
  }
}

// Export singleton instance
export const reputationService = new ReputationService();