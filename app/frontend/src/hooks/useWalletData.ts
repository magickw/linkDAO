import { useState, useEffect, useCallback } from 'react';
import { useAccount, useBalance } from 'wagmi';
import { EnhancedWalletData, TokenBalance, TransactionType, TransactionStatus } from '../types/wallet';
import { formatUnits } from 'viem';

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
  address: providedAddress,
  refreshInterval = 300000, // 5 minutes
  autoRefresh = true,
  enableTransactionHistory = false,
  maxTransactions = 10
}: UseWalletDataOptions = {}): UseWalletDataReturn {
  const { address: connectedAddress } = useAccount();
  const address = providedAddress || connectedAddress;

  const { data: ethBalance, isLoading: isLoadingBalance, refetch: refetchBalance } = useBalance({
    address: address as `0x${string}` | undefined,
  });

  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch real wallet data from blockchain
  const fetchWalletData = useCallback(async () => {
    if (!address || !ethBalance) return;

    try {
      setError(null);

      // Convert ETH balance to number
      const ethBalanceNumber = parseFloat(formatUnits(ethBalance.value, ethBalance.decimals));

      // For now, we'll use a fixed ETH price of $2000 for USD conversion
      // In production, you should fetch this from a price API
      const ethPriceUSD = 2000;
      const ethValueUSD = ethBalanceNumber * ethPriceUSD;

      // Create token balances array with real ETH balance
      const balances: TokenBalance[] = [
        {
          symbol: ethBalance.symbol,
          name: 'Ethereum',
          balance: ethBalanceNumber,
          valueUSD: ethValueUSD,
          change24h: 0, // TODO: Fetch from price API
          contractAddress: '0x0000000000000000000000000000000000000000'
        }
      ];

      // For now, we'll use empty transactions
      // In production, you should fetch these from an indexer like Etherscan API
      const recentTransactions: any[] = [];

      const portfolioValue = ethValueUSD;
      const portfolioChange = 0; // TODO: Calculate from historical data

      const data: EnhancedWalletData = {
        address,
        balances,
        recentTransactions,
        portfolioValue,
        portfolioChange,
        quickActions: []
      };

      setWalletData(data);
      setLastUpdated(new Date());
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch wallet data';
      setError(errorMessage);
      console.error('Wallet data fetch error:', err);
    }
  }, [address, ethBalance]);

  // Refresh wallet data manually
  const refreshWalletData = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetchBalance();
      await fetchWalletData();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet data';
      setError(errorMessage);
      console.error('Wallet data refresh error:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetchBalance, fetchWalletData]);

  // Initial fetch when balance is available
  useEffect(() => {
    if (ethBalance && address) {
      fetchWalletData();
    }
  }, [ethBalance, address, fetchWalletData]);

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

  const transactions = walletData?.recentTransactions.map(tx => ({
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
    walletData,
    portfolio,
    tokens,
    transactions,
    isLoading: isLoadingBalance,
    isRefreshing,
    error,
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
    // Portfolio performance tracking requires historical data from a price API or indexer
    // For now, we return null to indicate this feature is not yet implemented
    // TODO: Integrate with a price API like CoinGecko or a blockchain indexer
    setIsLoading(false);
    setData(null);
  }, [timeframe]);

  return { data, isLoading };
}

export default useWalletData;