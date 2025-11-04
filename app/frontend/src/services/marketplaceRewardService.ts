import { BigNumber } from 'ethers';
import { calculateMarketplaceReward } from '../config/rewardConfig';
import { LDAOTokenService } from './web3/ldaoTokenService';
import { RewardPool } from '../types/contracts';

export interface MarketplaceTransaction {
  transactionId: string;
  seller: string;
  buyer: string;
  transactionValue: BigNumber;
  tokenAddress: string;  // Address of the token used for payment
  timestamp: number;
}

export interface MarketplaceRewardResult {
  success: boolean;
  transactionHash?: string;
  rewardAmount?: string;
  error?: string;
}

export class MarketplaceRewardService {
  private static instance: MarketplaceRewardService;
  private rewardPool: RewardPool | null = null;
  private ldaoTokenService: LDAOTokenService;

  private constructor() {
    this.ldaoTokenService = LDAOTokenService.getInstance();
  }

  static getInstance(): MarketplaceRewardService {
    if (!MarketplaceRewardService.instance) {
      MarketplaceRewardService.instance = new MarketplaceRewardService();
    }
    return MarketplaceRewardService.instance;
  }

  /**
   * Process marketplace transaction reward
   * @param transaction - Transaction details
   */
  async processTransactionReward(
    transaction: MarketplaceTransaction
  ): Promise<MarketplaceRewardResult> {
    try {
      // Validate transaction
      if (!await this.isValidTransaction(transaction)) {
        return {
          success: false,
          error: 'Invalid transaction'
        };
      }

      // Check if reward was already processed
      const isRewarded = await this.rewardPool?.transactionRewarded(
        transaction.transactionId
      );
      if (isRewarded) {
        return {
          success: false,
          error: 'Transaction reward already processed'
        };
      }

      // Calculate reward amount (0.1% of transaction value)
      const rewardAmount = calculateMarketplaceReward(transaction.transactionValue);

      // Process the reward
      const tx = await this.rewardPool?.processMarketplaceReward(
        transaction.seller,
        rewardAmount,
        transaction.transactionId,
        {
          gasLimit: 200000 // Estimated gas limit
        }
      );

      if (!tx) {
        throw new Error('Failed to process marketplace reward');
      }

      const receipt = await tx.wait();

      return {
        success: true,
        transactionHash: receipt.transactionHash,
        rewardAmount: rewardAmount.toString()
      };

    } catch (error) {
      console.error('Error processing marketplace reward:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Validate a marketplace transaction
   * @param transaction - Transaction details to validate
   * @returns Boolean indicating if the transaction is valid
   */
  private async isValidTransaction(
    transaction: MarketplaceTransaction
  ): Promise<boolean> {
    try {
      // Check if transaction value is positive
      if (transaction.transactionValue.lte(0)) {
        return false;
      }

      // Check if buyer and seller are different
      if (transaction.buyer.toLowerCase() === transaction.seller.toLowerCase()) {
        return false;
      }

      // Verify transaction existence in marketplace contract
      const exists = await this.verifyTransactionExists(transaction.transactionId);
      if (!exists) {
        return false;
      }

      return true;

    } catch (error) {
      console.error('Error validating transaction:', error);
      return false;
    }
  }

  /**
   * Verify transaction exists in marketplace contract
   * @param transactionId - ID of the transaction to verify
   * @returns Boolean indicating if the transaction exists
   */
  private async verifyTransactionExists(transactionId: string): Promise<boolean> {
    try {
      // Implementation depends on marketplace contract structure
      const transaction = await this.rewardPool?.getMarketplaceTransaction(transactionId);
      return !!transaction;
    } catch (error) {
      console.error('Error verifying transaction:', error);
      return false;
    }
  }

  /**
   * Get user's total earned rewards from marketplace transactions
   * @param userAddress - Wallet address of the user
   * @returns Total earned rewards in LDAO tokens
   */
  async getTotalMarketplaceRewards(userAddress: string): Promise<string> {
    try {
      const total = await this.rewardPool?.userMarketplaceRewards(userAddress);
      return total?.toString() || '0';
    } catch (error) {
      console.error('Error getting total marketplace rewards:', error);
      return '0';
    }
  }

  /**
   * Get marketplace transactions for a user
   * @param userAddress - Address of the user
   * @param role - 'buyer' or 'seller'
   * @param limit - Maximum number of transactions to return
   * @param offset - Number of transactions to skip
   * @returns Array of transaction IDs
   */
  async getUserTransactions(
    userAddress: string,
    role: 'buyer' | 'seller',
    limit: number = 10,
    offset: number = 0
  ): Promise<string[]> {
    try {
      return await this.rewardPool?.getUserTransactions(
        userAddress,
        role,
        limit,
        offset
      ) || [];
    } catch (error) {
      console.error('Error getting user transactions:', error);
      return [];
    }
  }

  /**
   * Get rewards statistics for marketplace activity
   * @param userAddress - Address of the user
   * @returns Statistics about marketplace rewards
   */
  async getRewardsStatistics(userAddress: string): Promise<{
    totalRewards: string;
    transactionCount: number;
    averageReward: string;
  }> {
    try {
      const [totalRewards, transactions] = await Promise.all([
        this.getTotalMarketplaceRewards(userAddress),
        this.getUserTransactions(userAddress, 'seller')
      ]);

      const avgReward = transactions.length > 0
        ? BigNumber.from(totalRewards).div(transactions.length).toString()
        : '0';

      return {
        totalRewards,
        transactionCount: transactions.length,
        averageReward: avgReward
      };
    } catch (error) {
      console.error('Error getting rewards statistics:', error);
      return {
        totalRewards: '0',
        transactionCount: 0,
        averageReward: '0'
      };
    }
  }
}

export default MarketplaceRewardService;