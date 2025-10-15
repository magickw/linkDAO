/**
 * Blockchain transaction monitoring service
 * Monitors transaction completion and updates user balances and UI elements
 */

import { getWebSocketClient } from './webSocketClientService';

interface TransactionStatus {
  hash: string;
  status: 'pending' | 'confirmed' | 'failed' | 'dropped';
  blockNumber?: number;
  confirmations: number;
  gasUsed?: number;
  effectiveGasPrice?: number;
  timestamp: Date;
  error?: string;
}

interface MonitoredTransaction {
  hash: string;
  type: 'tip' | 'stake' | 'vote' | 'delegate' | 'transfer' | 'approval';
  userAddress: string;
  relatedData?: {
    postId?: string;
    proposalId?: string;
    recipientAddress?: string;
    tokenAddress?: string;
    amount?: number;
  };
  callbacks: {
    onConfirmed?: (tx: TransactionStatus) => void;
    onFailed?: (tx: TransactionStatus) => void;
    onUpdate?: (tx: TransactionStatus) => void;
  };
  startTime: Date;
  lastChecked: Date;
}

interface UserBalanceUpdate {
  userAddress: string;
  tokenAddress: string;
  newBalance: number;
  previousBalance: number;
  change: number;
  timestamp: Date;
  transactionHash: string;
}

interface UIUpdateEvent {
  type: 'balance_update' | 'transaction_confirmed' | 'transaction_failed' | 'post_update' | 'governance_update';
  data: any;
  timestamp: Date;
}

export class BlockchainTransactionMonitor {
  private static instance: BlockchainTransactionMonitor;
  private monitoredTransactions: Map<string, MonitoredTransaction> = new Map();
  private userBalances: Map<string, Map<string, number>> = new Map(); // userAddress -> tokenAddress -> balance
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isActive = false;
  private webSocketClient = getWebSocketClient();
  
  // Configuration
  private readonly MONITORING_INTERVAL = 5000; // 5 seconds
  private readonly MAX_MONITORING_TIME = 30 * 60 * 1000; // 30 minutes
  private readonly REQUIRED_CONFIRMATIONS = 3;

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  static getInstance(): BlockchainTransactionMonitor {
    if (!BlockchainTransactionMonitor.instance) {
      BlockchainTransactionMonitor.instance = new BlockchainTransactionMonitor();
    }
    return BlockchainTransactionMonitor.instance;
  }

  /**
   * Start transaction monitoring
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Starting blockchain transaction monitoring');

    // Start monitoring loop
    this.monitoringInterval = setInterval(() => {
      this.checkTransactions();
    }, this.MONITORING_INTERVAL);

    // Set up WebSocket listeners for real-time updates
    this.setupWebSocketListeners();
  }

  /**
   * Stop transaction monitoring
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('Stopping blockchain transaction monitoring');

    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    // Clean up WebSocket listeners
    this.cleanupWebSocketListeners();
  }

  /**
   * Monitor a new transaction
   */
  monitorTransaction(
    hash: string,
    type: MonitoredTransaction['type'],
    userAddress: string,
    relatedData?: MonitoredTransaction['relatedData'],
    callbacks?: MonitoredTransaction['callbacks']
  ): void {
    const transaction: MonitoredTransaction = {
      hash,
      type,
      userAddress,
      relatedData,
      callbacks: callbacks || {},
      startTime: new Date(),
      lastChecked: new Date()
    };

    this.monitoredTransactions.set(hash, transaction);
    
    console.log(`Monitoring transaction: ${hash} (${type})`);

    // Start monitoring if not already active
    if (!this.isActive) {
      this.start();
    }

    // Immediately check the transaction
    this.checkTransaction(hash);
  }

  /**
   * Stop monitoring a specific transaction
   */
  stopMonitoring(hash: string): void {
    const transaction = this.monitoredTransactions.get(hash);
    if (transaction) {
      this.monitoredTransactions.delete(hash);
      console.log(`Stopped monitoring transaction: ${hash}`);
    }
  }

  /**
   * Get transaction status
   */
  getTransactionStatus(hash: string): TransactionStatus | null {
    // In a real implementation, this would query the blockchain
    // For now, return mock data
    const transaction = this.monitoredTransactions.get(hash);
    if (!transaction) return null;

    // Simulate transaction progression
    const elapsed = Date.now() - transaction.startTime.getTime();
    let status: TransactionStatus['status'] = 'pending';
    let confirmations = 0;

    if (elapsed > 30000) { // After 30 seconds, consider confirmed
      status = 'confirmed';
      confirmations = this.REQUIRED_CONFIRMATIONS;
    } else if (elapsed > 15000) { // After 15 seconds, start getting confirmations
      confirmations = Math.floor((elapsed - 15000) / 5000);
      if (confirmations >= this.REQUIRED_CONFIRMATIONS) {
        status = 'confirmed';
      }
    }

    return {
      hash,
      status,
      confirmations,
      blockNumber: status === 'confirmed' ? Math.floor(Math.random() * 1000000) + 18000000 : undefined,
      gasUsed: status === 'confirmed' ? Math.floor(Math.random() * 100000) + 21000 : undefined,
      effectiveGasPrice: status === 'confirmed' ? Math.floor(Math.random() * 50) + 20 : undefined,
      timestamp: new Date()
    };
  }

  /**
   * Update user balance
   */
  async updateUserBalance(
    userAddress: string,
    tokenAddress: string,
    transactionHash: string
  ): Promise<void> {
    try {
      // In a real implementation, this would query the blockchain for the actual balance
      const newBalance = await this.fetchUserBalance(userAddress, tokenAddress);
      
      // Get previous balance
      const userBalances = this.userBalances.get(userAddress) || new Map();
      const previousBalance = userBalances.get(tokenAddress) || 0;
      
      // Update stored balance
      userBalances.set(tokenAddress, newBalance);
      this.userBalances.set(userAddress, userBalances);
      
      // Create balance update event
      const balanceUpdate: UserBalanceUpdate = {
        userAddress,
        tokenAddress,
        newBalance,
        previousBalance,
        change: newBalance - previousBalance,
        timestamp: new Date(),
        transactionHash
      };

      // Emit balance update event
      this.emit('balance_update', balanceUpdate);

      // Send UI update
      this.sendUIUpdate({
        type: 'balance_update',
        data: balanceUpdate,
        timestamp: new Date()
      });

      console.log(`Updated balance for ${userAddress}: ${previousBalance} -> ${newBalance}`);
    } catch (error) {
      console.error('Error updating user balance:', error);
    }
  }

  /**
   * Get user balance
   */
  getUserBalance(userAddress: string, tokenAddress: string): number {
    const userBalances = this.userBalances.get(userAddress);
    return userBalances?.get(tokenAddress) || 0;
  }

  /**
   * Get all monitored transactions
   */
  getMonitoredTransactions(): MonitoredTransaction[] {
    return Array.from(this.monitoredTransactions.values());
  }

  /**
   * Get transactions by user
   */
  getUserTransactions(userAddress: string): MonitoredTransaction[] {
    return Array.from(this.monitoredTransactions.values())
      .filter(tx => tx.userAddress === userAddress);
  }

  /**
   * Get transactions by type
   */
  getTransactionsByType(type: MonitoredTransaction['type']): MonitoredTransaction[] {
    return Array.from(this.monitoredTransactions.values())
      .filter(tx => tx.type === type);
  }

  /**
   * Check all monitored transactions
   */
  private async checkTransactions(): Promise<void> {
    const transactions = Array.from(this.monitoredTransactions.values());
    
    for (const transaction of transactions) {
      await this.checkTransaction(transaction.hash);
    }

    // Clean up old transactions
    this.cleanupOldTransactions();
  }

  /**
   * Check a specific transaction
   */
  private async checkTransaction(hash: string): Promise<void> {
    const transaction = this.monitoredTransactions.get(hash);
    if (!transaction) return;

    try {
      const status = this.getTransactionStatus(hash);
      if (!status) return;

      // Update last checked time
      transaction.lastChecked = new Date();

      // Handle status changes
      if (status.status === 'confirmed' && status.confirmations >= this.REQUIRED_CONFIRMATIONS) {
        await this.handleTransactionConfirmed(transaction, status);
      } else if (status.status === 'failed') {
        await this.handleTransactionFailed(transaction, status);
      } else {
        // Call update callback
        if (transaction.callbacks.onUpdate) {
          transaction.callbacks.onUpdate(status);
        }
      }

      // Emit status update
      this.emit('transaction_update', { transaction, status });

    } catch (error) {
      console.error(`Error checking transaction ${hash}:`, error);
    }
  }

  /**
   * Handle confirmed transaction
   */
  private async handleTransactionConfirmed(
    transaction: MonitoredTransaction,
    status: TransactionStatus
  ): Promise<void> {
    console.log(`Transaction confirmed: ${transaction.hash}`);

    // Update user balance if applicable
    if (transaction.relatedData?.tokenAddress) {
      await this.updateUserBalance(
        transaction.userAddress,
        transaction.relatedData.tokenAddress,
        transaction.hash
      );
    }

    // Handle specific transaction types
    await this.handleTransactionTypeSpecificUpdates(transaction, status);

    // Call confirmed callback
    if (transaction.callbacks.onConfirmed) {
      transaction.callbacks.onConfirmed(status);
    }

    // Send UI update
    this.sendUIUpdate({
      type: 'transaction_confirmed',
      data: { transaction, status },
      timestamp: new Date()
    });

    // Remove from monitoring
    this.monitoredTransactions.delete(transaction.hash);

    // Emit confirmed event
    this.emit('transaction_confirmed', { transaction, status });
  }

  /**
   * Handle failed transaction
   */
  private async handleTransactionFailed(
    transaction: MonitoredTransaction,
    status: TransactionStatus
  ): Promise<void> {
    console.log(`Transaction failed: ${transaction.hash}`);

    // Call failed callback
    if (transaction.callbacks.onFailed) {
      transaction.callbacks.onFailed(status);
    }

    // Send UI update
    this.sendUIUpdate({
      type: 'transaction_failed',
      data: { transaction, status },
      timestamp: new Date()
    });

    // Remove from monitoring
    this.monitoredTransactions.delete(transaction.hash);

    // Emit failed event
    this.emit('transaction_failed', { transaction, status });
  }

  /**
   * Handle transaction type specific updates
   */
  private async handleTransactionTypeSpecificUpdates(
    transaction: MonitoredTransaction,
    status: TransactionStatus
  ): Promise<void> {
    switch (transaction.type) {
      case 'tip':
        if (transaction.relatedData?.postId) {
          this.sendUIUpdate({
            type: 'post_update',
            data: {
              postId: transaction.relatedData.postId,
              updateType: 'tip_confirmed',
              amount: transaction.relatedData.amount,
              transactionHash: transaction.hash
            },
            timestamp: new Date()
          });
        }
        break;

      case 'stake':
        if (transaction.relatedData?.postId) {
          this.sendUIUpdate({
            type: 'post_update',
            data: {
              postId: transaction.relatedData.postId,
              updateType: 'stake_confirmed',
              amount: transaction.relatedData.amount,
              transactionHash: transaction.hash
            },
            timestamp: new Date()
          });
        }
        break;

      case 'vote':
        if (transaction.relatedData?.proposalId) {
          this.sendUIUpdate({
            type: 'governance_update',
            data: {
              proposalId: transaction.relatedData.proposalId,
              updateType: 'vote_confirmed',
              transactionHash: transaction.hash
            },
            timestamp: new Date()
          });
        }
        break;

      case 'delegate':
        this.sendUIUpdate({
          type: 'governance_update',
          data: {
            updateType: 'delegation_confirmed',
            delegatee: transaction.relatedData?.recipientAddress,
            transactionHash: transaction.hash
          },
          timestamp: new Date()
        });
        break;
    }
  }

  /**
   * Fetch user balance from blockchain
   */
  private async fetchUserBalance(userAddress: string, tokenAddress: string): Promise<number> {
    // In a real implementation, this would query the blockchain
    // For now, simulate balance changes
    const currentBalance = this.getUserBalance(userAddress, tokenAddress);
    const randomChange = (Math.random() - 0.5) * 100; // Random change between -50 and +50
    return Math.max(0, currentBalance + randomChange);
  }

  /**
   * Clean up old transactions
   */
  private cleanupOldTransactions(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    this.monitoredTransactions.forEach((transaction, hash) => {
      const elapsed = now - transaction.startTime.getTime();
      if (elapsed > this.MAX_MONITORING_TIME) {
        toRemove.push(hash);
      }
    });

    toRemove.forEach(hash => {
      console.log(`Cleaning up old transaction: ${hash}`);
      this.monitoredTransactions.delete(hash);
    });
  }

  /**
   * Set up WebSocket listeners for real-time updates
   */
  private setupWebSocketListeners(): void {
    if (!this.webSocketClient) return;

    // Listen for blockchain events
    this.webSocketClient.on('blockchain_transaction_update', (data: any) => {
      this.handleWebSocketTransactionUpdate(data);
    });

    this.webSocketClient.on('blockchain_balance_update', (data: any) => {
      this.handleWebSocketBalanceUpdate(data);
    });
  }

  /**
   * Clean up WebSocket listeners
   */
  private cleanupWebSocketListeners(): void {
    if (!this.webSocketClient) return;

    this.webSocketClient.off('blockchain_transaction_update', this.handleWebSocketTransactionUpdate);
    this.webSocketClient.off('blockchain_balance_update', this.handleWebSocketBalanceUpdate);
  }

  /**
   * Handle WebSocket transaction updates
   */
  private handleWebSocketTransactionUpdate = (data: any): void => {
    const { hash, status, confirmations } = data;
    const transaction = this.monitoredTransactions.get(hash);
    
    if (transaction) {
      console.log(`WebSocket transaction update: ${hash} - ${status}`);
      
      // Update transaction immediately
      this.checkTransaction(hash);
    }
  };

  /**
   * Handle WebSocket balance updates
   */
  private handleWebSocketBalanceUpdate = (data: any): void => {
    const { userAddress, tokenAddress, newBalance, transactionHash } = data;
    
    console.log(`WebSocket balance update: ${userAddress} - ${newBalance}`);
    
    // Update balance immediately
    this.updateUserBalance(userAddress, tokenAddress, transactionHash);
  };

  /**
   * Send UI update
   */
  private sendUIUpdate(update: UIUpdateEvent): void {
    if (this.webSocketClient) {
      this.webSocketClient.send('ui_update', update);
    }
    
    // Also emit locally
    this.emit('ui_update', update);
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in transaction monitor event callback:', error);
        }
      });
    }
  }

  /**
   * Get monitoring statistics
   */
  getStats(): {
    activeTransactions: number;
    totalMonitored: number;
    confirmedToday: number;
    failedToday: number;
    isActive: boolean;
  } {
    // In a real implementation, these would be tracked properly
    return {
      activeTransactions: this.monitoredTransactions.size,
      totalMonitored: this.monitoredTransactions.size,
      confirmedToday: 0,
      failedToday: 0,
      isActive: this.isActive
    };
  }
}

// Export singleton instance
export const blockchainTransactionMonitor = BlockchainTransactionMonitor.getInstance();

// Export types
export type {
  TransactionStatus,
  MonitoredTransaction,
  UserBalanceUpdate,
  UIUpdateEvent
};