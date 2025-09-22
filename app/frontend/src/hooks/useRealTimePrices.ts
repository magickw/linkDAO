import { useState, useEffect, useCallback, useRef } from 'react';
import { TokenBalance, EnhancedWalletData } from '../types/wallet';
import { cryptoPriceService, CryptoPriceData } from '../services/cryptoPriceService';

interface UseRealTimePricesOptions {
  tokens: string[];
  updateInterval?: number;
  enabled?: boolean;
}

interface UseRealTimePricesReturn {
  prices: Map<string, CryptoPriceData>;
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
  updatePrices: () => Promise<void>;
  updateWalletData: (walletData: EnhancedWalletData) => Promise<EnhancedWalletData>;
}

export function useRealTimePrices({
  tokens,
  updateInterval = 30000,
  enabled = true
}: UseRealTimePricesOptions): UseRealTimePricesReturn {
  const [prices, setPrices] = useState<Map<string, CryptoPriceData>>(new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const tokensRef = useRef<string[]>([]);

  // Update prices manually
  const updatePrices = useCallback(async () => {
    if (!enabled || tokens.length === 0) return;

    setIsLoading(true);
    setError(null);

    try {
      const newPrices = await cryptoPriceService.getPrices(tokens);
      setPrices(newPrices);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch prices');
      console.error('Price update error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokens, enabled]);

  // Update wallet data with current prices
  const updateWalletData = useCallback(async (walletData: EnhancedWalletData): Promise<EnhancedWalletData> => {
    try {
      const portfolioData = await cryptoPriceService.calculatePortfolioValue(walletData.balances);
      
      return {
        ...walletData,
        balances: portfolioData.updatedBalances,
        portfolioValue: portfolioData.totalValue,
        portfolioChange: portfolioData.totalChange24h
      };
    } catch (err) {
      console.error('Failed to update wallet data:', err);
      return walletData;
    }
  }, []);

  // Set up subscription when tokens change
  useEffect(() => {
    if (!enabled || tokens.length === 0) {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
      return;
    }

    // Only resubscribe if tokens actually changed
    const tokensChanged = JSON.stringify(tokens.sort()) !== JSON.stringify(tokensRef.current.sort());
    if (!tokensChanged && unsubscribeRef.current) {
      return;
    }

    tokensRef.current = [...tokens];

    // Clean up previous subscription
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
    }

    // Set up new subscription
    unsubscribeRef.current = cryptoPriceService.subscribe({
      tokens,
      callback: (newPrices) => {
        setPrices(new Map(newPrices));
        setLastUpdated(new Date());
        setError(null);
      },
      interval: updateInterval
    });

    // Initial price fetch
    updatePrices();

    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
      }
    };
  }, [tokens, enabled, updateInterval, updatePrices]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  return {
    prices,
    isLoading,
    error,
    lastUpdated,
    updatePrices,
    updateWalletData
  };
}

// Hook specifically for wallet dashboard
export function useWalletPrices(walletData: EnhancedWalletData | null) {
  const tokens = walletData?.balances.map(balance => balance.symbol) || [];
  
  const {
    prices,
    isLoading,
    error,
    lastUpdated,
    updatePrices,
    updateWalletData
  } = useRealTimePrices({
    tokens,
    enabled: !!walletData && tokens.length > 0
  });

  const [enhancedWalletData, setEnhancedWalletData] = useState<EnhancedWalletData | null>(null);

  // Update wallet data when prices change
  useEffect(() => {
    if (!walletData || prices.size === 0) {
      setEnhancedWalletData(walletData);
      return;
    }

    updateWalletData(walletData).then(setEnhancedWalletData);
  }, [walletData, prices, updateWalletData]);

  return {
    walletData: enhancedWalletData,
    prices,
    isLoading,
    error,
    lastUpdated,
    updatePrices
  };
}

export default useRealTimePrices;