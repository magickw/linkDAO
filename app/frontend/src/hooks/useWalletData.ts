import { useEffect, useState, useCallback, useMemo } from 'react';
import { useAccount, useChainId } from 'wagmi';
import { walletService, WalletService, TokenBalance as ServiceTokenBalance } from '../services/walletService';
import { EnhancedWalletData } from '../types/wallet';
import { dexService } from '../services/dexService';
import { cryptoPriceService } from '../services/cryptoPriceService';

// Simple in-memory cache for recent transactions to reduce API calls
const txCache = new Map<string, { data: any[]; timestamp: number }>();
const TX_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Allow external invalidation of the transaction cache
export function invalidateTxCache(address?: string) {
  if (!address) {
    txCache.clear();
    return;
  }
  const prefix = `${address}:`;
  for (const key of Array.from(txCache.keys())) {
    if (key.startsWith(prefix)) txCache.delete(key);
  }
}

interface UseWalletDataOptions {
  address?: string;
  chainId?: number;
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
  chainId: providedChainId,
  refreshInterval = 300000, // 5 minutes
  autoRefresh = true,
  enableTransactionHistory = false,
  maxTransactions = 10
}: UseWalletDataOptions = {}): UseWalletDataReturn {
  const { address: connectedAddress } = useAccount();
  const connectedChainId = useChainId();
  const address = providedAddress || connectedAddress;
  const chainId = providedChainId || connectedChainId;

  // No direct on-chain subscription here; we'll poll via our service to support multi-chain balances
  const [isLoadingBalance, setIsLoadingBalance] = useState(false);
  const refetchBalance = async () => { };

  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch wallet data
  const fetchWalletData = useCallback(async () => {
    if (!address) {
      setWalletData(null);
      return;
    }

    try {
      setIsLoadingBalance(true);
      setError(null);

      // Get wallet data from wallet service
      const walletServiceInstance = new WalletService(chainId);
      const walletData = await walletServiceInstance.getWalletData(address as `0x${string}`);

      // Update token balances with real market prices using cryptoPriceService
      const tokensWithPrices = await cryptoPriceService.updateTokenBalances(
        walletData.tokens.map(token => ({
          symbol: token.symbol,
          name: token.name,
          balance: parseFloat(token.balanceFormatted || '0'),
          valueUSD: 0, // Will be updated by price service
          change24h: 0, // Will be updated by price service
          contractAddress: token.address,
          chains: [chainId]
        }))
      );

      // Discover additional tokens the user might hold
      let discoveredTokens: any[] = [];
      try {
        const discoveryResult = await dexService.discoverTokens(address, chainId);
        discoveredTokens = discoveryResult.tokens || [];
      } catch (err) {
        console.warn('Failed to discover tokens:', err);
      }

      // Merge discovered tokens with existing balances
      const allTokens: ServiceTokenBalance[] = [...walletData.tokens];

      // Update the original tokens with price data
      for (let i = 0; i < allTokens.length; i++) {
        const priceData = tokensWithPrices.find(t => t.symbol === allTokens[i].symbol);
        if (priceData) {
          allTokens[i] = {
            ...allTokens[i],
            valueUSD: priceData.valueUSD,
            change24h: priceData.change24h,
            priceUSD: priceData.valueUSD / priceData.balance || 0
          };
        }
      }

      for (const discoveredToken of discoveredTokens) {
        // Only add if not already in the list
        if (!allTokens.some(t => t.symbol === discoveredToken.symbol)) {
          // Create a minimal token balance object for discovered tokens
          allTokens.push({
            symbol: discoveredToken.symbol,
            name: discoveredToken.name,
            address: discoveredToken.address,
            balance: '0', // We don't know the balance, will be updated if user has it
            balanceFormatted: '0',
            decimals: 18,
            valueUSD: 0,
            change24h: 0,
            priceUSD: 0,
            isNative: false
          });
        }
      }

      // Sort tokens by value
      const sortedTokens = allTokens.sort((a, b) => b.valueUSD - a.valueUSD);

      // Get recent transactions with USD values - deferred because this is expensive
      let recentTransactions = walletData.transactions || [];
      try {
        // Only fetch transaction history if explicitly enabled and after initial wallet data load
        if (enableTransactionHistory) {
          try {
            const cacheKey = `${address}:${maxTransactions}`;
            const cached = txCache.get(cacheKey);
            if (cached && Date.now() - cached.timestamp < TX_TTL_MS) {
              recentTransactions = cached.data.map((t) => ({ ...t, timestamp: new Date(t.timestamp) }));
            } else {
              // Use setTimeout to defer expensive transaction fetching to avoid blocking
              // This is moved to a separate useEffect or called separately
              recentTransactions = [];
            }
          } catch (e) {
            // Soft-fail on tx history
            recentTransactions = [];
          }
        } else {
          recentTransactions = [];
        }
      } catch (err) {
        console.warn('Failed to enrich transactions:', err);
      }

      const portfolioValue = sortedTokens.reduce((sum, b) => sum + (b.valueUSD || 0), 0);
      const portfolioChange = sortedTokens.length > 0
        ? sortedTokens.reduce((sum, b) => sum + (b.change24h * (b.valueUSD / (portfolioValue || 1))), 0)
        : 0;

      // Transform service token balances to match frontend types
      const transformedBalances = sortedTokens.map(t => ({
        symbol: t.symbol,
        name: t.name,
        balance: parseFloat(t.balanceFormatted || '0'), // Use balanceFormatted instead of raw balance
        valueUSD: t.valueUSD,
        change24h: t.change24h,
        contractAddress: t.address,
        chains: [chainId]
      }));

      // Transform transactions to match frontend types
      const transformedTransactions = recentTransactions.map((tx: any) => ({
        id: tx.id,
        type: tx.type,
        status: tx.status,
        amount: Number(tx.amount || 0),
        token: typeof tx.token === 'string' ? tx.token : tx.token?.symbol || '',
        toToken: tx.toToken,
        valueUSD: tx.valueUSD ? Number(tx.valueUSD) : undefined,
        timestamp: tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp),
        from: tx.from,
        to: tx.to,
        gasUsed: tx.gasUsed ? Number(tx.gasUsed) : undefined,
        gasPrice: tx.gasPrice ? Number(tx.gasPrice) : undefined,
        hash: tx.hash,
        contractName: tx.contractName,
        nftAction: tx.nftAction,
        nftName: tx.nftName
      }));

      const data: EnhancedWalletData = {
        address,
        balances: transformedBalances,
        recentTransactions: transformedTransactions,
        portfolioValue,
        portfolioChange,
        quickActions: [
          {
            id: 'send',
            label: 'Send',
            icon: '📤',
            action: async () => {
              // This will be handled by the UI components
              console.log('Send action triggered');
            },
            tooltip: 'Send tokens to another address'
          },
          {
            id: 'receive',
            label: 'Receive',
            icon: '📥',
            action: async () => {
              // This will be handled by the UI components
              console.log('Receive action triggered');
            },
            tooltip: 'Show receive address and QR code'
          },
          {
            id: 'swap',
            label: 'Swap',
            icon: '🔄',
            action: async () => {
              // This will be handled by the UI components
              console.log('Swap action triggered');
            },
            tooltip: 'Swap tokens on DEX'
          },
          {
            id: 'stake',
            label: 'Stake',
            icon: '🏦',
            action: async () => {
              // This will be handled by the UI components
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
      // Even on error, set walletData to null to avoid showing stale data
      setWalletData(null);
    } finally {
      setIsLoadingBalance(false);
    }
  }, [address, chainId, providedChainId, connectedChainId, enableTransactionHistory, maxTransactions]);

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
  }, [refetchBalance, fetchWalletData, chainId, providedChainId, connectedChainId]);

  // Initial fetch when address is available - strictly deferred to prevent UI blocking
  useEffect(() => {
    if (address) {
      // Delay wallet data fetch to allow navigation to complete first
      // This prevents blocking navigation when wallet connects
      const timer = setTimeout(fetchWalletData, 1000);
      return () => clearTimeout(timer);
    }
  }, [address, fetchWalletData, chainId, providedChainId, connectedChainId]);

  // Subscribe to price updates for real-time wallet value updates
  useEffect(() => {
    if (!walletData?.balances || walletData.balances.length === 0) {
      return;
    }

    const tokenSymbols = walletData.balances.map(balance => balance.symbol);

    const unsubscribe = cryptoPriceService.subscribe({
      tokens: tokenSymbols,
      callback: (prices) => {
        // Update wallet data with new prices
        setWalletData(currentData => {
          if (!currentData) return currentData;

          const updatedBalances = currentData.balances.map(balance => {
            const priceData = prices.get(balance.symbol.toUpperCase());
            if (priceData) {
              return {
                ...balance,
                valueUSD: balance.balance * priceData.current_price,
                change24h: priceData.price_change_percentage_24h || 0
              };
            }
            return balance;
          });

          const newPortfolioValue = updatedBalances.reduce((sum, b) => sum + b.valueUSD, 0);
          const newPortfolioChange = updatedBalances.length > 0
            ? updatedBalances.reduce((sum, b) => sum + (b.change24h * (b.valueUSD / (newPortfolioValue || 1))), 0)
            : 0;

          return {
            ...currentData,
            balances: updatedBalances,
            portfolioValue: newPortfolioValue,
            portfolioChange: newPortfolioChange
          };
        });

        setLastUpdated(new Date());
      }
    });

    return unsubscribe;
  }, [walletData?.balances]);

  // Separate effect for transaction history to avoid blocking initial wallet data load
  useEffect(() => {
    if (!walletData || !enableTransactionHistory || !address) return;

    const fetchTransactionHistory = async () => {
      try {
        const cacheKey = `${address}:${maxTransactions}`;
        const cached = txCache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < TX_TTL_MS) {
          const cachedTransactions = cached.data.map((t) => ({ ...t, timestamp: new Date(t.timestamp) }));
          
          setWalletData(currentData => {
            if (!currentData) return currentData;
            return {
              ...currentData,
              recentTransactions: cachedTransactions
            };
          });
          return;
        }

        // Determine chains to query: default supported + optional env extension
        const unifiedKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
        const unifiedBase = 'https://api.etherscan.io/v2/api';
        const defaultChainIds = [1, 8453, 84532, 137, 42161];
        const extraChainIds = (process.env.NEXT_PUBLIC_EXPLORER_CHAIN_IDS || '')
          .split(',')
          .map((s) => parseInt(s.trim(), 10))
          .filter((n) => Number.isFinite(n) && !defaultChainIds.includes(n));
        const chainIdsToQuery = [...defaultChainIds, ...extraChainIds];
        const nativeSymbolFor = (cid: number) => (cid === 137 ? 'MATIC' : 'ETH');

        let recentTransactions: any[] = [];
        if (unifiedKey) {
          // Use unified v2 endpoint for both native and token transfers
          const fetchNative = chainIdsToQuery.map(async (chainId) => {
            try {
              const url = new URL(unifiedBase);
              url.searchParams.set('chainid', String(chainId));
              url.searchParams.set('module', 'account');
              url.searchParams.set('action', 'txlist');
              url.searchParams.set('address', address as string);
              url.searchParams.set('sort', 'desc');
              url.searchParams.set('apikey', unifiedKey);
              const res = await fetch(url.toString());
              const data = await res.json().catch(() => ({ status: '0', result: [] }));
              if (data && data.status !== '0' && Array.isArray(data.result)) {
                return data.result.slice(0, maxTransactions).map((tx: any) => {
                  const valueWei = BigInt(tx.value || '0');
                  const amount = Number(valueWei) / 1e18;
                  const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                  return {
                    id: `${chainId}_${tx.hash}`,
                    type: isSend ? 'send' : 'receive',
                    amount,
                    token: nativeSymbolFor(chainId),
                    valueUSD: undefined,
                    timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                    status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                    hash: tx.hash,
                    chainId,
                    from: tx.from,
                    to: tx.to || (isSend ? tx.to : address),
                  };
                });
              }
            } catch (_) { }
            return [];
          });

          const fetchErc20 = chainIdsToQuery.map(async (chainId) => {
            try {
              const url = new URL(unifiedBase);
              url.searchParams.set('chainid', String(chainId));
              url.searchParams.set('module', 'account');
              url.searchParams.set('action', 'tokentx');
              url.searchParams.set('address', address as string);
              url.searchParams.set('sort', 'desc');
              url.searchParams.set('apikey', unifiedKey);
              const res = await fetch(url.toString());
              const data = await res.json().catch(() => ({ status: '0', result: [] }));
              if (data && data.status !== '0' && Array.isArray(data.result)) {
                return data.result.slice(0, maxTransactions).map((tx: any) => {
                  const decimals = Number(tx.tokenDecimal || 18);
                  const raw = tx.value || '0';
                  const amount = Number(raw) / Math.pow(10, decimals);
                  const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                  const symbol = (tx.tokenSymbol || '').toUpperCase();
                  return {
                    id: `${chainId}_${tx.hash}_${tx.contractAddress}`,
                    type: isSend ? 'send' : 'receive',
                    amount,
                    token: symbol,
                    valueUSD: undefined,
                    timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                    status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                    hash: tx.hash,
                    chainId,
                    from: tx.from,
                    to: tx.to || (isSend ? tx.to : address),
                  };
                });
              }
            } catch (_) { }
            return [];
          });

          const [perChainNative, perChainErc20] = await Promise.all([Promise.all(fetchNative), Promise.all(fetchErc20)]);
          recentTransactions = [...perChainNative.flat(), ...perChainErc20.flat()]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, maxTransactions);
        } else {
          // Fallback to previous per-explorer approach if unified key is not set
          const explorerConfigs: Array<{ chainId: number; baseUrl: string; apiKey?: string; nativeSymbol: string }> = [
            { chainId: 1, baseUrl: 'https://api.etherscan.io/api', apiKey: process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY, nativeSymbol: 'ETH' },
            { chainId: 8453, baseUrl: 'https://api.basescan.org/api', apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY, nativeSymbol: 'ETH' },
            { chainId: 84532, baseUrl: 'https://api-sepolia.basescan.org/api', apiKey: process.env.NEXT_PUBLIC_BASESCAN_API_KEY, nativeSymbol: 'ETH' },
            { chainId: 137, baseUrl: 'https://api.polygonscan.com/api', apiKey: process.env.NEXT_PUBLIC_POLYGONSCAN_API_KEY, nativeSymbol: 'MATIC' },
            { chainId: 42161, baseUrl: 'https://api.arbiscan.io/api', apiKey: process.env.NEXT_PUBLIC_ARBISCAN_API_KEY, nativeSymbol: 'ETH' },
          ];

          const fetches = explorerConfigs.map(async ({ chainId, baseUrl, apiKey, nativeSymbol }) => {
            try {
              const url = new URL(baseUrl);
              url.searchParams.set('module', 'account');
              url.searchParams.set('action', 'txlist');
              url.searchParams.set('address', address as string);
              url.searchParams.set('sort', 'desc');
              if (apiKey) url.searchParams.set('apikey', apiKey);
              const res = await fetch(url.toString());
              const data = await res.json().catch(() => ({ status: '0', result: [] }));
              if (data && data.status !== '0' && Array.isArray(data.result)) {
                return data.result.slice(0, maxTransactions).map((tx: any) => {
                  const valueWei = BigInt(tx.value || '0');
                  const amount = Number(valueWei) / 1e18;
                  const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                  return {
                    id: `${chainId}_${tx.hash}`,
                    type: isSend ? 'send' : 'receive',
                    amount,
                    token: nativeSymbol,
                    valueUSD: undefined,
                    timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                    status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                    hash: tx.hash,
                    chainId,
                    from: tx.from,
                    to: tx.to || (isSend ? tx.to : address),
                  };
                });
              }
            } catch (_) { }
            return [];
          });

          const erc20Fetches = explorerConfigs.map(async ({ chainId, baseUrl, apiKey }) => {
            try {
              const url = new URL(baseUrl);
              url.searchParams.set('module', 'account');
              url.searchParams.set('action', 'tokentx');
              url.searchParams.set('address', address as string);
              url.searchParams.set('sort', 'desc');
              if (apiKey) url.searchParams.set('apikey', apiKey);
              const res = await fetch(url.toString());
              const data = await res.json().catch(() => ({ status: '0', result: [] }));
              if (data && data.status !== '0' && Array.isArray(data.result)) {
                return data.result.slice(0, maxTransactions).map((tx: any) => {
                  const decimals = Number(tx.tokenDecimal || 18);
                  const raw = tx.value || '0';
                  const amount = Number(raw) / Math.pow(10, decimals);
                  const isSend = (tx.from || '').toLowerCase() === (address as string).toLowerCase();
                  const symbol = (tx.tokenSymbol || '').toUpperCase();
                  return {
                    id: `${chainId}_${tx.hash}_${tx.contractAddress}`,
                    type: isSend ? 'send' : 'receive',
                    amount,
                    token: symbol,
                    valueUSD: undefined,
                    timestamp: new Date((Number(tx.timeStamp) || 0) * 1000),
                    status: Number(tx.confirmations || 0) > 0 ? 'confirmed' : 'pending',
                    hash: tx.hash,
                    chainId,
                    from: tx.from,
                    to: tx.to || (isSend ? tx.to : address),
                  };
                });
              }
            } catch (_) { }
            return [];
          });

          const [perChainNative, perChainErc20] = await Promise.all([Promise.all(fetches), Promise.all(erc20Fetches)]);
          recentTransactions = [...perChainNative.flat(), ...perChainErc20.flat()]
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, maxTransactions);
        }

        // Enrich transactions with USD values via price service
        const symbols = Array.from(new Set(recentTransactions.map((t) => String(t.token).toUpperCase()).filter(Boolean)));
        if (symbols.length > 0) {
          const prices = await cryptoPriceService.getPrices(symbols);
          recentTransactions = recentTransactions.map((t) => {
            const pd = prices.get(String(t.token).toUpperCase());
            const usd = pd ? (t.amount || 0) * (pd.current_price || 0) : undefined;
            return { ...t, valueUSD: usd };
          });
        }
        
        // Cache normalized result (serialize timestamp)
        txCache.set(cacheKey, { data: recentTransactions.map((t) => ({ ...t, timestamp: (t.timestamp as Date).toISOString() })), timestamp: Date.now() });

        // Update wallet data with transaction history
        setWalletData(currentData => {
          if (!currentData) return currentData;
          return {
            ...currentData,
            recentTransactions
          };
        });
      } catch (error) {
        console.warn('Failed to fetch transaction history:', error);
      }
    };

    // Use setTimeout to defer transaction history fetch
    const timer = setTimeout(fetchTransactionHistory, 1500);
    return () => clearTimeout(timer);
  }, [walletData, enableTransactionHistory, address, maxTransactions]);

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

  const transactions = walletData?.recentTransactions.map((tx: any) => ({
    id: tx.id,
    type: tx.type,
    amount: Number(tx.amount || 0),
    token: { symbol: typeof tx.token === 'string' ? tx.token : tx.token?.symbol || '' },
    valueUSD: String(tx.valueUSD ?? '0'),
    timestamp: (tx.timestamp instanceof Date ? tx.timestamp : new Date(tx.timestamp)).toISOString(),
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