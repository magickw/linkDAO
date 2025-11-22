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

export interface PurchaseTransaction {
  hash: string;
  user: string;
  amount: string; // LDAO amount purchased
  cost: string; // Cost in ETH/USDC/USD
  currency: 'ETH' | 'USDC' | 'USD';
  timestamp: number;
  type: 'purchase';
  status: 'success' | 'failed';
  method: 'crypto' | 'fiat' | 'dex' | 'moonpay';
  blockNumber?: number;
}

export class TransactionHistoryService {
  private static instance: TransactionHistoryService;
  private contract: LDAOToken | null = null;
  private provider: ethers.Provider | null = null;
  private apiBase: string;

  private constructor() {
    this.apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';
  }

  static getInstance(): TransactionHistoryService {
    if (!TransactionHistoryService.instance) {
      TransactionHistoryService.instance = new TransactionHistoryService();
    }
    return TransactionHistoryService.instance;
  }

  private getApiBase(): string {
    return this.apiBase;
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
        this.provider as any
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
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }

      const res = await fetch(`${this.getApiBase()}/api/transactions/history/${userAddress}?limit=${limit}&offset=${offset}&type=token_transfer`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get token transfer history' }));
        console.error('Error getting token transfer history:', errorData);
        return [];
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return [];
      }

      // Transform the backend response format to match TokenTransaction interface
      const transactions = data.data;
      return transactions.map((tx: any) => ({
        hash: tx.transactionHash || tx.hash || tx.id,
        from: tx.fromAddress || tx.from || userAddress,
        to: tx.toAddress || tx.to || tx.recipient,
        value: tx.amount || tx.value || '0',
        timestamp: new Date(tx.timestamp || tx.createdAt).getTime(),
        type: tx.type || 'transfer',
        status: tx.status || 'success',
        fee: tx.fee || tx.gasFee,
        blockNumber: tx.blockNumber || tx.block
      }));
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
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }

      const res = await fetch(`${this.getApiBase()}/api/ldao/history?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get staking history' }));
        console.error('Error getting staking history:', errorData);
        return [];
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return [];
      }

      // Filter staking-related transactions from the combined history
      const allTransactions = data.data.transactions || data.data || [];
      const stakingTransactions = allTransactions.filter((tx: any) =>
        tx.type &&
        (tx.type.includes('stake') || tx.type.includes('unstake') || tx.type.includes('claim') || tx.type.includes('rewards'))
      );

      return stakingTransactions.map((tx: any) => ({
        hash: tx.transactionHash || tx.hash || tx.id,
        user: tx.userAddress || tx.userId || userAddress,
        amount: tx.amount || tx.value || '0',
        tierId: tx.tierId || tx.stakingTier || 1,
        timestamp: new Date(tx.timestamp || tx.createdAt).getTime(),
        type: tx.type || 'stake',
        status: tx.status || 'success',
        rewardAmount: tx.rewardAmount || tx.rewards || tx.earned,
        blockNumber: tx.blockNumber || tx.block
      }));
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
   * Get purchase transaction history for a user
   */
  async getPurchaseHistory(
    userAddress: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<PurchaseTransaction[]> {
    try {
      // Get token with client-side check to prevent SSR errors
      let authToken = null;
      if (typeof window !== 'undefined') {
        authToken = localStorage.getItem('linkdao_access_token') || localStorage.getItem('token');
      }

      const res = await fetch(`${this.getApiBase()}/api/ldao/history?limit=${limit}&offset=${offset}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': authToken ? `Bearer ${authToken}` : ''
        }
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ error: 'Failed to get purchase history' }));
        console.error('Error getting purchase history:', errorData);
        return [];
      }

      const data = await res.json();
      if (!data.success || !data.data) {
        return [];
      }

      // Filter purchase-related transactions from the combined history
      const allTransactions = data.data.transactions || data.data || [];
      const purchaseTransactions = allTransactions.filter((tx: any) =>
        tx.type &&
        (tx.type.includes('purchase') || tx.type.includes('buy') || tx.type.includes('acquisition') || tx.type.includes('mint'))
      );

      return purchaseTransactions.map((tx: any) => ({
        hash: tx.transactionHash || tx.hash || tx.id,
        user: tx.userAddress || tx.userId || userAddress,
        amount: tx.amount || tx.value || '0',
        cost: tx.cost || tx.price || tx.paymentAmount || '0',
        currency: tx.currency || tx.paymentCurrency || 'ETH',
        timestamp: new Date(tx.timestamp || tx.createdAt).getTime(),
        type: tx.type || 'purchase',
        status: tx.status || 'success',
        method: tx.method || tx.paymentMethod || tx.transactionType || 'crypto',
        blockNumber: tx.blockNumber || tx.block
      }));
    } catch (error) {
      const errorResponse = web3ErrorHandler.handleError(error as Error, {
        action: 'getPurchaseHistory',
        component: 'TransactionHistoryService'
      });
      console.error('Failed to get purchase history:', errorResponse.message);
      return [];
    }
  }

  /**
   * Get combined transaction history (tokens + staking)
   */
  async getCombinedHistory(
    userAddress: string,
    limit: number = 20
  ): Promise<Array<TokenTransaction | StakingTransaction | PurchaseTransaction>> {
    try {
      const [tokenHistory, stakingHistory, purchaseHistory] = await Promise.all([
        this.getTokenTransferHistory(userAddress, limit),
        this.getStakingHistory(userAddress, limit),
        this.getPurchaseHistory(userAddress, limit)
      ]);

      // Combine and sort by timestamp (newest first)
      const combined = [...tokenHistory, ...stakingHistory, ...purchaseHistory];
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
          csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.from},${tx.to},${tx.value},${tx.status},${tx.hash}\n`;
        } else if ('amount' in tx && tx.type !== 'purchase') {
          // Staking transaction
          csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.user},,${tx.amount},${tx.status},${tx.hash}\n`;
        } else if (tx.type === 'purchase') {
          // Purchase transaction
          csv += `${new Date(tx.timestamp).toISOString()},${tx.type},${tx.user},,${tx.amount},${tx.status},${tx.hash}\n`;
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