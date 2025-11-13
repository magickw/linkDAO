import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { walletService } from '@/services/walletService';
import { EnhancedWalletData, TokenBalance } from '@/types/wallet';

interface UseWalletDataRealOptions {
  address?: string;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

interface UseWalletDataRealReturn {
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
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  lastUpdated: Date | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}

export function useWalletDataReal({
  address: providedAddress,
  refreshInterval = 300000, // 5 minutes
  autoRefresh = true
}: UseWalletDataRealOptions = {}): UseWalletDataRealReturn {
  const { address: connectedAddress } = useAccount();
  const address = providedAddress || connectedAddress;

  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchWalletData = useCallback(async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      setError(null);

      // Fetch token balances
      const serviceBalances = await walletService.getTokenBalances(address as `0x${string}`);

      // Ensure serviceBalances is an array
      const balancesArray = Array.isArray(serviceBalances) ? serviceBalances : [];

      // Calculate portfolio value and change
      const portfolioValue = balancesArray.reduce((sum, b) => sum + (b.valueUSD || 0), 0);
      const portfolioChange = balancesArray.length > 0
        ? balancesArray.reduce((sum, b) => sum + (b.change24h * (b.valueUSD / (portfolioValue || 1))), 0)
        : 0;

      // Transform service TokenBalance to types TokenBalance
      const transformedBalances: TokenBalance[] = balancesArray.map(balance => ({
        symbol: balance.symbol,
        name: balance.name,
        balance: parseFloat(balance.balanceFormatted),
        valueUSD: balance.valueUSD,
        change24h: balance.change24h,
        contractAddress: balance.address || '0x0000000000000000000000000000000000000000',
        // Add chains and chainBreakdown if needed
      }));

      const data: EnhancedWalletData = {
        address,
        balances: transformedBalances,
        recentTransactions: [], // Transactions would need to be fetched separately
        portfolioValue,
        portfolioChange,
        quickActions: [
          {
            id: 'send',
            label: 'Send',
            icon: '📤',
            action: async () => {
              console.log('Send action triggered');
            },
            tooltip: 'Send tokens to another address'
          },
          {
            id: 'receive',
            label: 'Receive',
            icon: '📥',
            action: async () => {
              console.log('Receive action triggered');
            },
            tooltip: 'Show receive address and QR code'
          },
          {
            id: 'swap',
            label: 'Swap',
            icon: '🔄',
            action: async () => {
              console.log('Swap action triggered');
            },
            tooltip: 'Swap tokens on DEX'
          },
          {
            id: 'stake',
            label: 'Stake',
            icon: '🏦',
            action: async () => {
              console.log('Stake action triggered');
            },
            tooltip: 'Stake tokens to earn rewards'
          }
        ]
      };

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

  const refreshWalletData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await fetchWalletData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet data';
      setError(errorMessage);
      console.error('Wallet data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [fetchWalletData]);

  // Initial fetch when address is available
  useEffect(() => {
    if (address) {
      fetchWalletData();
    }
  }, [address, fetchWalletData]);

  // Auto-refresh based on interval
  useEffect(() => {
    if (!autoRefresh || !address || refreshInterval <= 0) return;

    const intervalId = setInterval(() => {
      refreshWalletData();
    }, refreshInterval);

    return () => clearInterval(intervalId);
  }, [address, refreshInterval, autoRefresh, refreshWalletData]);

  // Transform data for the wallet page
  const portfolio = walletData ? {
    totalValueUSD: walletData.portfolioValue,
    change24hPercent: walletData.portfolioChange
  } : null;

  const tokens = walletData?.balances.map(balance => ({
    symbol: balance.symbol,
    balanceFormatted: `${balance.balance.toFixed(4)} ${balance.symbol}`,
    valueUSD: balance.valueUSD,
    change24h: balance.change24h
  })) || [];

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    walletData,
    portfolio,
    tokens,
    isLoading,
    isRefreshing,
    error,
    lastUpdated,
    refresh: refreshWalletData,
    clearError
  };
}

export default useWalletDataReal;