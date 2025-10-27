/**
 * Transaction History Service - Tracks and displays user's LDAO token transaction history
 */

import { ethers } from 'ethers';
import { getProvider } from '@/utils/web3';
import { LDAOToken, LDAOToken__factory } from '@/types/typechain';
import deployedAddresses from '../../../../contracts/deployedAddresses-sepolia.json';
import { web3ErrorHandler } from '@/utils/web3ErrorHandling';

export interface TokenTransaction {
  hash: string;
  from: string;
  to: string;
  value: string;
  timestamp: number;
  type: 'transfer' | 'mint' | 'burn' | 'stake' | 'unstake' | 'reward';
  status: 'success' | 'failed';
  fee?: string;
  blockNumber: number;
}

export interface StakingTransaction {
  hash: string;
  user: string;
  amount: string;
  tierId: number;
  timestamp: number;
  type: 'stake' | 'unstake' | 'claim';
  status: 'success' | 'failed';
  rewardAmount?: string;
  blockNumber: number;
}

export class TransactionHistoryService {
  private static instance: TransactionHistoryService;
  private contract: LDAOToken | null = null;
  private provider: ethers.providers.Provider | null = null;

  private constructor() {}

  static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  /**
   * Initialize the service with provider and contract
   */
  private async initialize(): Promise<void> {
    if (this.provider && this.contract) return;

    try {
      this.provider = await getProvider();
      if (!this.provider) {
        throw new Error('No provider available');
      }

      this.contract = LDAOToken__factory.connect(
        deployedAddresses.contracts.LDAOToken.address,
        this.provider
      );
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'initialize',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to initialize transaction history service:', errorResponse.message);
    }
  }

  /**
   * Get token transfer history for a user
   */
  async getTokenTransferHistory(
    userAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<TokenTransaction[]> {
    try {
      await this.initialize();
      if (!this.contract || !this.provider) {
        throw new Error('Service not initialized');
      }

      // In a real implementation, this would query the blockchain for transfer events
      // For now, we'll simulate some transaction history
      
      const transactions: TokenTransaction[] = [];
      
      // Simulate some recent transactions
      for (let i = 0; i < Math.min(limit, 5); i++) {
        const timestamp = Date.now() - (i * 86400000); // 1 day apart
        const isOutgoing = Math.random() > 0.5;
        
        transactions.push({
          hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`transfer_${userAddress}_${timestamp}_${i}`)),
          from: isOutgoing ? userAddress : `0x${Math.random().toString(16).substr(2, 40)}`,
          to: isOutgoing ? `0x${Math.random().toString(16).substr(2, 40)}` : userAddress,
          value: (Math.random() * 1000).toFixed(2),
          timestamp,
          type: 'transfer',
          status: 'success',
          fee: (0.001 + Math.random() * 0.002).toFixed(6),
          blockNumber: 1000000 + i
        });
      }
      
      return transactions;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getTokenTransferHistory',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to get token transfer history:', errorResponse.message);
      return [];
    }
  }

  /**
   * Get staking transaction history for a user
   */
  async getStakingHistory(
    userAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<StakingTransaction[]> {
    try {
      await this.initialize();
      if (!this.contract || !this.provider) {
        throw new Error('Service not initialized');
      }

      // In a real implementation, this would query the blockchain for staking events
      // For now, we'll simulate some staking history
      
      const transactions: StakingTransaction[] = [];
      
      // Simulate some recent staking transactions
      for (let i = 0; i < Math.min(limit, 3); i++) {
        const timestamp = Date.now() - (i * 172800000); // 2 days apart
        const types: Array<'stake' | 'unstake' | 'claim'> = ['stake', 'unstake', 'claim'];
        const type = types[i % types.length];
        
        const transaction: StakingTransaction = {
          hash: ethers.utils.keccak256(ethers.utils.toUtf8Bytes(`stake_${userAddress}_${timestamp}_${i}`)),
          user: userAddress,
          amount: type === 'claim' ? '0' : (Math.random() * 100).toFixed(2),
          tierId: Math.floor(Math.random() * 4) + 1,
          timestamp,
          type,
          status: 'success',
          blockNumber: 1000000 + i + 100
        };
        
        if (type === 'claim') {
          transaction.rewardAmount = (Math.random() * 5).toFixed(2);
        }
        
        transactions.push(transaction);
      }
      
      return transactions;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getStakingHistory',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to get staking history:', errorResponse.message);
      return [];
    }
  }

  /**
   * Get combined transaction history (tokens + staking)
   */
  async getCombinedHistory(
    userAddress: string,
    limit: number = 20
  ): Promise<Array<TokenTransaction | StakingTransaction>> {
    try {
      const [tokenHistory, stakingHistory] = await Promise.all([
        this.getTokenTransferHistory(userAddress, limit),
        this.getStakingHistory(userAddress, limit)
      ]);

      // Combine and sort by timestamp (newest first)
      const combined = [...tokenHistory, ...stakingHistory];
      return combined.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getCombinedHistory',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to get combined history:', errorResponse.message);
      return [];
    }
  }

  /**
   * Get transaction details by hash
   */
  async getTransactionDetails(
    transactionHash: string
  ): Promise<TokenTransaction | StakingTransaction | null> {
    try {
      await this.initialize();
      if (!this.provider) {
        throw new Error('Service not initialized');
      }

      // In a real implementation, this would fetch transaction details from the blockchain
      // For now, we'll simulate a response
      
      // Simulate fetching transaction details
      console.log(`Fetching details for transaction: ${transactionHash}`);
      
      return null;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getTransactionDetails',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to get transaction details:', errorResponse.message);
      return null;
    }
  }

  /**
   * Export transaction history as CSV
   */
  async exportHistoryAsCSV(
    userAddress: string
  ): Promise<string> {
    try {
      const history = await this.getCombinedHistory(userAddress, 100);
      
      // Create CSV header
      let csv = 'Date,Type,From,To,Amount,Status,Transaction Hash\n';
      
      // Add transaction data
      history.forEach(tx => {
        if ('value' in tx) {
          // Token transaction
          csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.from},${tx.to},${tx.value},${
            tx.status
          },${tx.hash}\n`;
        } else {
          // Staking transaction
          csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.user},,${
            tx.amount
          },${tx.status},${tx.hash}\n`;
        }
      });
      
      return csv;
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'exportHistoryAsCSV',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to export history as CSV:', errorResponse.message);
      return '';
    }
  }
}

export const transactionHistoryService = TransactionHistoryService.getInstance();