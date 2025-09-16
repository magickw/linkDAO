/**
 * useWalletData - Custom hook for managing wallet data and state
 * Features: Token balances, transaction history, portfolio tracking, auto-refresh
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { walletService, WalletData, TokenBalance, Transaction, PortfolioSummary } from '@/services/walletService';
import { Address } from 'viem';

export interface UseWalletDataReturn {
  // Data
  walletData: WalletData | null;
  portfolio: PortfolioSummary | null;
  tokens: TokenBalance[];
  transactions: Transaction[];
  
  // State
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  
  // Actions
  refresh: () => Promise<void>;
  refreshTokens: () => Promise<void>;
  refreshTransactions: () => Promise<void>;
  clearError: () => void;
  
  // Configuration
  autoRefreshEnabled: boolean;
  setAutoRefreshEnabled: (enabled: boolean) => void;
}

export interface UseWalletDataOptions {
  autoRefresh?: boolean;
  refreshInterval?: number; // in milliseconds
  enableTransactionHistory?: boolean;
  maxTransactions?: number;
}

export const useWalletData = (options: UseWalletDataOptions = {}): UseWalletDataReturn => {
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    enableTransactionHistory = true,
    maxTransactions = 20
  } = options;

  const { address, isConnected } = useAccount();
  const chainId = useChainId();

  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [autoRefreshEnabled, setAutoRefreshEnabled] = useState(autoRefresh);

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentServiceRef = useRef(walletService);

  // Update service when chain changes
  useEffect(() => {
    if (chainId) {
      currentServiceRef.current = new (walletService.constructor as any)(chainId);
    }
  }, [chainId]);

  /**
   * Fetch complete wallet data
   */
  const fetchWalletData = useCallback(async (isRefresh = false): Promise<void> => {
    if (!address || !isConnected) {
      setWalletData(null);
      setError(null);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setError(null);

      const data = await currentServiceRef.current.getWalletData(address as Address);
      
      if (data.error) {
        setError(data.error);
      } else {
        setWalletData(data);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      console.error('Error fetching wallet data:', err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [address, isConnected]);

  /**
   * Refresh only token balances
   */
  const refreshTokens = useCallback(async (): Promise<void> => {
    if (!address || !isConnected) return;

    try {
      setIsRefreshing(true);
      setError(null);

      const tokens = await currentServiceRef.current.getTokenBalances(address as Address);
      
      if (walletData) {
        const portfolio = currentServiceRef.current['calculatePortfolioSummary'](tokens);
        setWalletData(prev => prev ? {
          ...prev,
          portfolio,
          tokens
        } : null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh token balances';
      setError(errorMessage);
      console.error('Error refreshing tokens:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isConnected, walletData]);

  /**
   * Refresh only transaction history
   */
  const refreshTransactions = useCallback(async (): Promise<void> => {
    if (!address || !isConnected || !enableTransactionHistory) return;

    try {
      setIsRefreshing(true);
      setError(null);

      const transactions = await currentServiceRef.current.getTransactionHistory(
        address as Address, 
        maxTransactions
      );
      
      if (walletData) {
        setWalletData(prev => prev ? {
          ...prev,
          transactions
        } : null);
        setLastUpdated(new Date());
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh transactions';
      setError(errorMessage);
      console.error('Error refreshing transactions:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [address, isConnected, enableTransactionHistory, maxTransactions, walletData]);

  /**
   * Manual refresh function
   */
  const refresh = useCallback(async (): Promise<void> => {
    await fetchWalletData(true);
  }, [fetchWalletData]);

  /**
   * Clear error state
   */
  const clearError = useCallback((): void => {
    setError(null);
  }, []);

  // Initial data fetch when address changes
  useEffect(() => {
    if (address && isConnected) {
      fetchWalletData(false);
    } else {
      setWalletData(null);
      setError(null);
      setLastUpdated(null);
    }
  }, [address, isConnected, fetchWalletData]);

  // Auto-refresh mechanism
  useEffect(() => {
    if (!autoRefreshEnabled || !address || !isConnected) {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
      return;
    }

    const scheduleRefresh = () => {
      refreshTimeoutRef.current = setTimeout(async () => {
        try {
          await refresh();
        } catch (err) {
          console.error('Auto-refresh failed:', err);
        }
        scheduleRefresh(); // Schedule next refresh
      }, refreshInterval);
    };

    scheduleRefresh();

    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
        refreshTimeoutRef.current = null;
      }
    };
  }, [autoRefreshEnabled, address, isConnected, refresh, refreshInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    // Data
    walletData,
    portfolio: walletData?.portfolio || null,
    tokens: walletData?.tokens || [],
    transactions: walletData?.transactions || [],
    
    // State
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    
    // Actions
    refresh,
    refreshTokens,
    refreshTransactions,
    clearError,
    
    // Configuration
    autoRefreshEnabled,
    setAutoRefreshEnabled
  };
};

// Hook for portfolio performance data
export interface UsePortfolioPerformanceReturn {
  data: { labels: string[]; values: number[] } | null;
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export const usePortfolioPerformance = (
  timeframe: '1d' | '1w' | '1m' | '1y' = '1d'
): UsePortfolioPerformanceReturn => {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  
  const [data, setData] = useState<{ labels: string[]; values: number[] } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef(walletService);

  // Update service when chain changes
  useEffect(() => {
    if (chainId) {
      serviceRef.current = new (walletService.constructor as any)(chainId);
    }
  }, [chainId]);

  const fetchPerformanceData = useCallback(async (): Promise<void> => {
    if (!address || !isConnected) {
      setData(null);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const performanceData = await serviceRef.current.getPortfolioPerformance(
        address as Address, 
        timeframe
      );
      
      setData(performanceData);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch performance data';
      setError(errorMessage);
      console.error('Error fetching portfolio performance:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, timeframe]);

  const refresh = useCallback(async (): Promise<void> => {
    await fetchPerformanceData();
  }, [fetchPerformanceData]);

  useEffect(() => {
    fetchPerformanceData();
  }, [fetchPerformanceData]);

  return {
    data,
    isLoading,
    error,
    refresh
  };
};

export default useWalletData;