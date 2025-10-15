/**
 * React hook for blockchain transaction monitoring
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { 
  blockchainTransactionMonitor, 
  TransactionStatus, 
  MonitoredTransaction, 
  UserBalanceUpdate 
} from '../services/blockchainTransactionMonitor';

interface UseTransactionMonitorOptions {
  userAddress?: string;
  autoStart?: boolean;
}

interface TransactionMonitorState {
  isActive: boolean;
  activeTransactions: MonitoredTransaction[];
  recentTransactions: MonitoredTransaction[];
  userBalances: Map<string, number>;
  stats: {
    activeCount: number;
    confirmedToday: number;
    failedToday: number;
  };
}

interface TransactionMonitorHook {
  // State
  state: TransactionMonitorState;
  
  // Control methods
  start: () => void;
  stop: () => void;
  
  // Transaction methods
  monitorTransaction: (
    hash: string,
    type: MonitoredTransaction['type'],
    relatedData?: MonitoredTransaction['relatedData'],
    callbacks?: MonitoredTransaction['callbacks']
  ) => void;
  stopMonitoring: (hash: string) => void;
  getTransactionStatus: (hash: string) => TransactionStatus | null;
  
  // Balance methods
  getUserBalance: (tokenAddress: string) => number;
  refreshBalance: (tokenAddress: string) => Promise<void>;
  
  // Utility methods
  getActiveTransactions: () => MonitoredTransaction[];
  getTransactionsByType: (type: MonitoredTransaction['type']) => MonitoredTransaction[];
  clearHistory: () => void;
}

export const useTransactionMonitor = (
  options: UseTransactionMonitorOptions = {}
): TransactionMonitorHook => {
  const { userAddress, autoStart = true } = options;

  // State management
  const [state, setState] = useState<TransactionMonitorState>({
    isActive: false,
    activeTransactions: [],
    recentTransactions: [],
    userBalances: new Map(),
    stats: {
      activeCount: 0,
      confirmedToday: 0,
      failedToday: 0
    }
  });

  // Event listeners cleanup
  const listenersRef = useRef<Map<string, Function>>(new Map());

  // Update state from monitor
  const updateState = useCallback(() => {
    const stats = blockchainTransactionMonitor.getStats();
    const activeTransactions = userAddress 
      ? blockchainTransactionMonitor.getUserTransactions(userAddress)
      : blockchainTransactionMonitor.getMonitoredTransactions();

    setState(prev => ({
      ...prev,
      isActive: stats.isActive,
      activeTransactions,
      stats: {
        activeCount: stats.activeTransactions,
        confirmedToday: stats.confirmedToday,
        failedToday: stats.failedToday
      }
    }));
  }, [userAddress]);

  // Handle transaction updates
  const handleTransactionUpdate = useCallback((data: { transaction: MonitoredTransaction; status: TransactionStatus }) => {
    if (userAddress && data.transaction.userAddress !== userAddress) return;
    
    updateState();
  }, [userAddress, updateState]);

  // Handle transaction confirmed
  const handleTransactionConfirmed = useCallback((data: { transaction: MonitoredTransaction; status: TransactionStatus }) => {
    if (userAddress && data.transaction.userAddress !== userAddress) return;
    
    console.log('Transaction confirmed:', data.transaction.hash);
    
    // Add to recent transactions
    setState(prev => ({
      ...prev,
      recentTransactions: [data.transaction, ...prev.recentTransactions].slice(0, 10)
    }));
    
    updateState();
  }, [userAddress, updateState]);

  // Handle transaction failed
  const handleTransactionFailed = useCallback((data: { transaction: MonitoredTransaction; status: TransactionStatus }) => {
    if (userAddress && data.transaction.userAddress !== userAddress) return;
    
    console.log('Transaction failed:', data.transaction.hash);
    
    // Add to recent transactions
    setState(prev => ({
      ...prev,
      recentTransactions: [data.transaction, ...prev.recentTransactions].slice(0, 10)
    }));
    
    updateState();
  }, [userAddress, updateState]);

  // Handle balance updates
  const handleBalanceUpdate = useCallback((balanceUpdate: UserBalanceUpdate) => {
    if (userAddress && balanceUpdate.userAddress !== userAddress) return;
    
    console.log('Balance updated:', balanceUpdate);
    
    setState(prev => {
      const newBalances = new Map(prev.userBalances);
      newBalances.set(balanceUpdate.tokenAddress, balanceUpdate.newBalance);
      
      return {
        ...prev,
        userBalances: newBalances
      };
    });
  }, [userAddress]);

  // Control methods
  const start = useCallback(() => {
    blockchainTransactionMonitor.start();
    updateState();
  }, [updateState]);

  const stop = useCallback(() => {
    blockchainTransactionMonitor.stop();
    updateState();
  }, [updateState]);

  // Transaction methods
  const monitorTransaction = useCallback((
    hash: string,
    type: MonitoredTransaction['type'],
    relatedData?: MonitoredTransaction['relatedData'],
    callbacks?: MonitoredTransaction['callbacks']
  ) => {
    if (!userAddress) {
      console.warn('Cannot monitor transaction without userAddress');
      return;
    }

    blockchainTransactionMonitor.monitorTransaction(
      hash,
      type,
      userAddress,
      relatedData,
      callbacks
    );
    
    updateState();
  }, [userAddress, updateState]);

  const stopMonitoring = useCallback((hash: string) => {
    blockchainTransactionMonitor.stopMonitoring(hash);
    updateState();
  }, [updateState]);

  const getTransactionStatus = useCallback((hash: string): TransactionStatus | null => {
    return blockchainTransactionMonitor.getTransactionStatus(hash);
  }, []);

  // Balance methods
  const getUserBalance = useCallback((tokenAddress: string): number => {
    if (!userAddress) return 0;
    return blockchainTransactionMonitor.getUserBalance(userAddress, tokenAddress);
  }, [userAddress]);

  const refreshBalance = useCallback(async (tokenAddress: string) => {
    if (!userAddress) return;
    
    // Force balance update
    await blockchainTransactionMonitor.updateUserBalance(
      userAddress,
      tokenAddress,
      'manual_refresh'
    );
  }, [userAddress]);

  // Utility methods
  const getActiveTransactions = useCallback((): MonitoredTransaction[] => {
    return state.activeTransactions;
  }, [state.activeTransactions]);

  const getTransactionsByType = useCallback((type: MonitoredTransaction['type']): MonitoredTransaction[] => {
    return state.activeTransactions.filter(tx => tx.type === type);
  }, [state.activeTransactions]);

  const clearHistory = useCallback(() => {
    setState(prev => ({
      ...prev,
      recentTransactions: []
    }));
  }, []);

  // Set up event listeners
  useEffect(() => {
    const listeners = new Map<string, Function>();
    
    // Transaction events
    listeners.set('transaction_update', handleTransactionUpdate);
    listeners.set('transaction_confirmed', handleTransactionConfirmed);
    listeners.set('transaction_failed', handleTransactionFailed);
    listeners.set('balance_update', handleBalanceUpdate);

    // Register listeners
    listeners.forEach((callback, event) => {
      blockchainTransactionMonitor.on(event, callback);
    });

    listenersRef.current = listeners;

    // Auto-start if enabled
    if (autoStart) {
      start();
    }

    // Initial state update
    updateState();

    // Cleanup on unmount
    return () => {
      listeners.forEach((callback, event) => {
        blockchainTransactionMonitor.off(event, callback);
      });
    };
  }, [autoStart, start, updateState, handleTransactionUpdate, handleTransactionConfirmed, handleTransactionFailed, handleBalanceUpdate]);

  // Periodic state updates
  useEffect(() => {
    const interval = setInterval(updateState, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, [updateState]);

  return {
    state,
    start,
    stop,
    monitorTransaction,
    stopMonitoring,
    getTransactionStatus,
    getUserBalance,
    refreshBalance,
    getActiveTransactions,
    getTransactionsByType,
    clearHistory
  };
};

// Specialized hooks for specific transaction types
export const useTransactionMonitorForTips = (userAddress: string) => {
  const monitor = useTransactionMonitor({ userAddress, autoStart: true });
  
  const monitorTip = useCallback((
    hash: string,
    postId: string,
    recipientAddress: string,
    amount: number,
    tokenAddress: string,
    callbacks?: MonitoredTransaction['callbacks']
  ) => {
    monitor.monitorTransaction(hash, 'tip', {
      postId,
      recipientAddress,
      amount,
      tokenAddress
    }, callbacks);
  }, [monitor]);

  return {
    ...monitor,
    monitorTip,
    getTipTransactions: () => monitor.getTransactionsByType('tip')
  };
};

export const useTransactionMonitorForStaking = (userAddress: string) => {
  const monitor = useTransactionMonitor({ userAddress, autoStart: true });
  
  const monitorStake = useCallback((
    hash: string,
    postId: string,
    amount: number,
    tokenAddress: string,
    callbacks?: MonitoredTransaction['callbacks']
  ) => {
    monitor.monitorTransaction(hash, 'stake', {
      postId,
      amount,
      tokenAddress
    }, callbacks);
  }, [monitor]);

  return {
    ...monitor,
    monitorStake,
    getStakeTransactions: () => monitor.getTransactionsByType('stake')
  };
};

export const useTransactionMonitorForGovernance = (userAddress: string) => {
  const monitor = useTransactionMonitor({ userAddress, autoStart: true });
  
  const monitorVote = useCallback((
    hash: string,
    proposalId: string,
    callbacks?: MonitoredTransaction['callbacks']
  ) => {
    monitor.monitorTransaction(hash, 'vote', {
      proposalId
    }, callbacks);
  }, [monitor]);

  const monitorDelegate = useCallback((
    hash: string,
    delegateeAddress: string,
    callbacks?: MonitoredTransaction['callbacks']
  ) => {
    monitor.monitorTransaction(hash, 'delegate', {
      recipientAddress: delegateeAddress
    }, callbacks);
  }, [monitor]);

  return {
    ...monitor,
    monitorVote,
    monitorDelegate,
    getVoteTransactions: () => monitor.getTransactionsByType('vote'),
    getDelegateTransactions: () => monitor.getTransactionsByType('delegate')
  };
};

export default useTransactionMonitor;