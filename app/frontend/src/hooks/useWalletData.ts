import { useState, useEffect, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { EnhancedWalletData, TokenBalance } from '../types/wallet';
import { WalletService } from '@/services/walletService';
import { cryptoPriceService } from '@/services/cryptoPriceService';

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

  // No direct on-chain subscription here; we'll poll via our service to support multi-chain balances
  const isLoadingBalance = false;
  const refetchBalance = async () => {};

  const [walletData, setWalletData] = useState<EnhancedWalletData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  // Fetch real wallet data from blockchain across supported chains
  const fetchWalletData = useCallback(async () => {
    if (!address) return;

    try {
      setError(null);

      // Query supported chains in parallel (Ethereum, Base, Base Sepolia)
      const chainIds = [1, 8453, 84532, 137, 42161] as const;
      const svcPairs = chainIds.map((id) => ({ id, svc: new WalletService(id) }));

      const results = await Promise.allSettled(
        svcPairs.map(({ id, svc }) => svc.getTokenBalances(address as `0x${string}`).then((tokens: any[]) => ({ chainId: id, tokens })))
      );

      // Flatten and filter successful token lists with chainId context
      const allTokensRaw: Array<{ chainId: number; token: any }> = results.flatMap((r) =>
        r.status === 'fulfilled'
          ? (r.value.tokens || []).map((t: any) => ({ chainId: (r.value as any).chainId, token: t }))
          : []
      );

      // Transform walletService token shape -> TokenBalance shape and merge by symbol with chain breakdown
      const bySymbol = new Map<string, TokenBalance>();
      for (const { chainId, token: t } of allTokensRaw) {
        const symbol = t.symbol as string;
        const balanceNum = typeof t.balanceFormatted === 'string' ? parseFloat(t.balanceFormatted) : (typeof t.balance === 'string' ? parseFloat(t.balance) : Number(t.balance || 0));
        const valueUSD = Number(t.valueUSD || 0);
        const change24h = Number(t.change24h || 0);
        const contract = (t.address || t.contractAddress || '0x0000000000000000000000000000000000000000') as string;
        const existing = bySymbol.get(symbol);
        if (existing) {
          const existingBreakdown = existing.chainBreakdown || [];
          const idx = existingBreakdown.findIndex((b) => b.chainId === chainId);
          if (idx >= 0) {
            existingBreakdown[idx] = {
              chainId,
              balance: existingBreakdown[idx].balance + (isNaN(balanceNum) ? 0 : balanceNum),
              valueUSD: existingBreakdown[idx].valueUSD + (isNaN(valueUSD) ? 0 : valueUSD),
              contractAddress: existingBreakdown[idx].contractAddress || contract,
            };
          } else {
            existingBreakdown.push({ chainId, balance: isNaN(balanceNum) ? 0 : balanceNum, valueUSD: isNaN(valueUSD) ? 0 : valueUSD, contractAddress: contract });
          }
          bySymbol.set(symbol, {
            symbol,
            name: t.name || symbol,
            balance: existing.balance + (isNaN(balanceNum) ? 0 : balanceNum),
            valueUSD: existing.valueUSD + (isNaN(valueUSD) ? 0 : valueUSD),
            change24h: (existing.valueUSD + valueUSD) > 0
              ? ((existing.change24h * existing.valueUSD) + (change24h * valueUSD)) / (existing.valueUSD + valueUSD)
              : existing.change24h,
            contractAddress: existing.contractAddress || contract,
            chains: Array.from(new Set([...(existing.chains || []), chainId])),
            chainBreakdown: existingBreakdown,
          });
        } else {
          bySymbol.set(symbol, {
            symbol,
            name: t.name || symbol,
            balance: isNaN(balanceNum) ? 0 : balanceNum,
            valueUSD: isNaN(valueUSD) ? 0 : valueUSD,
            change24h: isNaN(change24h) ? 0 : change24h,
            contractAddress: contract,
            chains: [chainId],
            chainBreakdown: [{ chainId, balance: isNaN(balanceNum) ? 0 : balanceNum, valueUSD: isNaN(valueUSD) ? 0 : valueUSD, contractAddress: contract }],
          });
        }
      }

      const balances: TokenBalance[] = Array.from(bySymbol.values()).sort((a, b) => b.valueUSD - a.valueUSD);

  // Fetch recent transactions via explorer APIs when enabled
  let recentTransactions: any[] = [];
  if (enableTransactionHistory) {
    try {
      const unifiedKey = process.env.NEXT_PUBLIC_ETHERSCAN_API_KEY;
      const unifiedBase = 'https://api.etherscan.io/v2/api';

      // Determine chains to query: default supported + optional env extension
      const defaultChainIds = [1, 8453, 84532, 137, 42161];
      const extraChainIds = (process.env.NEXT_PUBLIC_EXPLORER_CHAIN_IDS || '')
        .split(',')
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => Number.isFinite(n) && !defaultChainIds.includes(n));
      const chainIdsToQuery = [...defaultChainIds, ...extraChainIds];

      const nativeSymbolFor = (cid: number) => (cid === 137 ? 'MATIC' : 'ETH');

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
                };
              });
            }
          } catch (_) {}
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
                };
              });
            }
          } catch (_) {}
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
                };
              });
            }
          } catch (_) {}
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
                };
              });
            }
          } catch (_) {}
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
    } catch (e) {
      // Soft-fail on tx history
      recentTransactions = [];
    }
  } else {
    recentTransactions = [];
  }

      const portfolioValue = balances.reduce((sum, b) => sum + (b.valueUSD || 0), 0);
      const portfolioChange = balances.length > 0
        ? balances.reduce((sum, b) => sum + (b.change24h * (b.valueUSD / (portfolioValue || 1))), 0)
        : 0;

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
  }, [address]);

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

  // Initial fetch when address is available
  useEffect(() => {
    if (address) {
      fetchWalletData();
    }
  }, [address, fetchWalletData]);

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