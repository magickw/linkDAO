import { useState, useEffect, useCallback } from 'react';
import { EnhancedWalletData } from '../types/wallet';
import { walletDataService } from '../services/walletDataService';
import { useWalletPrices } from './useRealTimePrices';

interface UseWalletDataOptions {
  address?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
  enableTransactionHistory?: boolean;
  maxTransactions?: number;
}

interface UseWalletDataReturn {
  walletData: EnhancedWalletData | null;
  portfolio: {
    totalValueUSD: number;
    change24hPercent: number;
  } | null;
  tokens: Array<{
    symbol: string;
    balanceFormatted: string;
    valueUSD: number;
    change24h: number;
  }>;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    token: { symbol: string };
    valueUSD: string;
    timestamp: string;
    status: string;
    hash: string;
  }>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useWalletData({
  address,
  refreshInterval = 60000, // 1 minute
  autoRefresh = true,
  enableTransactionHistory = false,
  maxTransactions = 10
}: UseWalletDataOptions = {}): UseWalletDataReturn {
  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Use real-time prices for the wallet data
  const {
    walletData: enhancedWalletData,
    isLoading: pricesLoading,
    error: pricesError
  } = useWalletPrices(walletData);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const data = await walletDataService.getWalletData(address);
      setWalletData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      console.error('Wallet data fetch error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [address]);

  // Refresh wallet data manually
  const refreshWalletData = useCallback(async () => {
    if (walletData) {
      setIsLoading(true);
      try {
        const refreshedData = await walletDataService.refreshWalletData(walletData);
        setWalletData(refreshedData);
        setLastUpdated(new Date());
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet data';
        setError(errorMessage);
        console.error('Wallet data refresh error:', err);
      } finally {
        setIsLoading(false);
      }
    } else {
      await fetchWalletData();
    }
  }, [walletData, fetchWalletData]);

  // Initial fetch
  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Auto-refresh interval
  useEffect(() => {
    if (!autoRefresh || refreshInterval <= 0) return;

    const interval = setInterval(() => {
      if (!isLoading && !pricesLoading) {
        refreshWalletData();
      }
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, isLoading, pricesLoading, refreshWalletData]);

  // Combine wallet data error with prices error
  const combinedError = error || pricesError;
  const finalWalletData = enhancedWalletData || walletData;

  // Transform data for the wallet page
  const portfolio = finalWalletData ? {
    totalValueUSD: finalWalletData.portfolioValue,
    change24hPercent: finalWalletData.portfolioChange
  } : null;

  const tokens = finalWalletData?.balances.map(balance => ({
    symbol: balance.symbol,
    balanceFormatted: `${balance.balance.toFixed(4)} ${balance.symbol}`,
    valueUSD: balance.valueUSD,
    change24h: balance.change24h
  })) || [];

  const transactions = finalWalletData?.recentTransactions.map(tx => ({
    id: tx.id,
    type: tx.type,
    amount: tx.amount,
    token: { symbol: tx.token },
    valueUSD: tx.valueUSD?.toString() || '0',
    timestamp: tx.timestamp.toISOString(),
    status: tx.status,
    hash: tx.hash
  })) || [];

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    walletData: finalWalletData,
    portfolio,
    tokens,
    transactions,
    isLoading: isLoading || pricesLoading,
    isRefreshing: isLoading,
    error: combinedError,
    lastUpdated,
    refresh: refreshWalletData,
    clearError
  };
}

// Portfolio performance hook
export function usePortfolioPerformance(timeframe: '1d' | '1w' | '1m' | '1y') {
  const [data, setData] = useState<{
    values: number[];
    timestamps: string[];
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    
    // Simulate API call for portfolio performance data
    setTimeout(() => {
      const now = Date.now();
      const intervals = {
        '1d': { count: 24, step: 60 * 60 * 1000 }, // hourly for 1 day
        '1w': { count: 7, step: 24 * 60 * 60 * 1000 }, // daily for 1 week
        '1m': { count: 30, step: 24 * 60 * 60 * 1000 }, // daily for 1 month
        '1y': { count: 12, step: 30 * 24 * 60 * 60 * 1000 } // monthly for 1 year
      };

      const { count, step } = intervals[timeframe];
      const baseValue = 5000;
      const values: number[] = [];
      const timestamps: string[] = [];

      for (let i = 0; i < count; i++) {
        const timestamp = new Date(now - (count - i - 1) * step);
        const randomVariation = (Math.random() - 0.5) * 0.1; // ±5% variation
        const value = baseValue * (1 + randomVariation + (i * 0.01)); // slight upward trend
        
        values.push(value);
        timestamps.push(timestamp.toISOString());
      }

      setData({ values, timestamps });
      setIsLoading(false);
    }, 500);
  }, [timeframe]);

  return { data, isLoading };
}

export default useWalletData;