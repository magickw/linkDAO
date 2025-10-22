/**
 * Exchange Rate Service
 * Connects to reliable exchange rate APIs with caching and fallback mechanisms
 * Provides currency conversion utilities for fiat display
 */

import { ExchangeRate } from '../types/paymentPrioritization';
import { intelligentCacheService } from './intelligentCacheService';

// Exchange rate API endpoints
const EXCHANGE_RATE_APIS = {
  coingecko: 'https://api.coingecko.com/api/v3',
  coinmarketcap: 'https://pro-api.coinmarketcap.com/v1',
  cryptocompare: 'https://min-api.cryptocompare.com/data',
  fixer: 'https://api.fixer.io/v1' // For fiat currencies
};

// Cache configuration
const CACHE_DURATION = 60 * 1000; // 1 minute for crypto rates
const FIAT_CACHE_DURATION = 300 * 1000; // 5 minutes for fiat rates
const CACHE_KEY_PREFIX = 'exchange_rate_';

// Supported currencies and their metadata
const SUPPORTED_CURRENCIES = {
  // Cryptocurrencies
  crypto: {
    'ETH': { name: 'Ethereum', coingeckoId: 'ethereum', decimals: 18 },
    'USDC': { name: 'USD Coin', coingeckoId: 'usd-coin', decimals: 6 },
    'USDT': { name: 'Tether', coingeckoId: 'tether', decimals: 6 },
    'MATIC': { name: 'Polygon', coingeckoId: 'matic-network', decimals: 18 },
    'BTC': { name: 'Bitcoin', coingeckoId: 'bitcoin', decimals: 8 }
  },
  // Fiat currencies
  fiat: {
    'USD': { name: 'US Dollar', symbol: '$' },
    'EUR': { name: 'Euro', symbol: '€' },
    'GBP': { name: 'British Pound', symbol: '£' },
    'JPY': { name: 'Japanese Yen', symbol: '¥' },
    'CAD': { name: 'Canadian Dollar', symbol: 'C$' },
    'AUD': { name: 'Australian Dollar', symbol: 'A$' }
  }
};

interface CachedExchangeRate {
  rate: ExchangeRate;
  timestamp: Date;
}

interface ExchangeRateResponse {
  rates: Record<string, number>;
  source: string;
  timestamp: Date;
  confidence: number;
}

interface ConversionResult {
  fromAmount: number;
  toAmount: number;
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  timestamp: Date;
  confidence: number;
}

export class ExchangeRateService {
  private cache = new Map<string, CachedExchangeRate>();
  private apiKeys: {
    coinmarketcap?: string;
    cryptocompare?: string;
    fixer?: string;
  };

  constructor(apiKeys: { coinmarketcap?: string; cryptocompare?: string; fixer?: string } = {}) {
    this.apiKeys = {
      coinmarketcap: apiKeys.coinmarketcap || process.env.NEXT_PUBLIC_COINMARKETCAP_API_KEY,
      cryptocompare: apiKeys.cryptocompare || process.env.NEXT_PUBLIC_CRYPTOCOMPARE_API_KEY,
      fixer: apiKeys.fixer || process.env.NEXT_PUBLIC_FIXER_API_KEY
    };
  }

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    forceRefresh: boolean = false
  ): Promise<ExchangeRate | null> {
    if (!forceRefresh) {
      // Try intelligent cache first
      const cached = await intelligentCacheService.getCachedExchangeRate(fromCurrency, toCurrency);
      if (cached) {
        return cached;
      }

      // Fallback to local cache
      const cacheKey = `${CACHE_KEY_PREFIX}${fromCurrency}_${toCurrency}`;
      const localCached = this.getCachedRate(cacheKey, fromCurrency, toCurrency);
      if (localCached) {
        return localCached;
      }
    }

    try {
      const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
      if (rate) {
        // Cache in both intelligent cache and local cache
        await intelligentCacheService.cacheExchangeRate(fromCurrency, toCurrency, rate);
        const cacheKey = `${CACHE_KEY_PREFIX}${fromCurrency}_${toCurrency}`;
        this.cacheRate(cacheKey, rate, fromCurrency, toCurrency);
      }
      return rate;
    } catch (error) {
      console.error('Exchange rate fetch failed:', error);
      return this.getFallbackRate(fromCurrency, toCurrency);
    }
  }

  /**
   * Get multiple exchange rates at once
   */
  async getMultipleExchangeRates(
    fromCurrency: string,
    toCurrencies: string[],
    forceRefresh: boolean = false
  ): Promise<Record<string, ExchangeRate | null>> {
    const results: Record<string, ExchangeRate | null> = {};

    // Try to get rates in batch if possible
    if (this.isCryptoCurrency(fromCurrency)) {
      try {
        const batchRates = await this.fetchBatchCryptoRates(fromCurrency, toCurrencies);
        for (const toCurrency of toCurrencies) {
          results[toCurrency] = batchRates[toCurrency] || null;
        }
        return results;
      } catch (error) {
        console.error('Batch rate fetch failed, falling back to individual requests:', error);
      }
    }

    // Fallback to individual requests
    const promises = toCurrencies.map(async (toCurrency) => ({
      currency: toCurrency,
      rate: await this.getExchangeRate(fromCurrency, toCurrency, forceRefresh)
    }));

    const responses = await Promise.all(promises);
    for (const response of responses) {
      results[response.currency] = response.rate;
    }

    return results;
  }

  /**
   * Convert amount between currencies
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<ConversionResult | null> {
    if (fromCurrency === toCurrency) {
      return {
        fromAmount: amount,
        toAmount: amount,
        fromCurrency,
        toCurrency,
        rate: 1,
        timestamp: new Date(),
        confidence: 1
      };
    }

    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    if (!exchangeRate) {
      return null;
    }

    return {
      fromAmount: amount,
      toAmount: amount * exchangeRate.rate,
      fromCurrency,
      toCurrency,
      rate: exchangeRate.rate,
      timestamp: exchangeRate.lastUpdated,
      confidence: exchangeRate.confidence
    };
  }

  /**
   * Format currency amount with proper symbol and decimals
   */
  formatCurrency(
    amount: number,
    currency: string,
    options: {
      showSymbol?: boolean;
      decimals?: number;
      locale?: string;
    } = {}
  ): string {
    const {
      showSymbol = true,
      decimals,
      locale = 'en-US'
    } = options;

    // Determine decimal places
    let decimalPlaces = decimals;
    if (decimalPlaces === undefined) {
      if (this.isCryptoCurrency(currency)) {
        decimalPlaces = amount < 1 ? 6 : 4;
      } else {
        decimalPlaces = 2;
      }
    }

    const formattedAmount = amount.toLocaleString(locale, {
      minimumFractionDigits: decimalPlaces,
      maximumFractionDigits: decimalPlaces
    });

    if (!showSymbol) {
      return formattedAmount;
    }

    // Add currency symbol or code
    const symbol = this.getCurrencySymbol(currency);
    if (symbol && symbol !== currency) {
      return `${symbol}${formattedAmount}`;
    } else {
      return `${formattedAmount} ${currency}`;
    }
  }

  /**
   * Get supported currencies
   */
  getSupportedCurrencies(): {
    crypto: string[];
    fiat: string[];
    all: string[];
  } {
    const crypto = Object.keys(SUPPORTED_CURRENCIES.crypto);
    const fiat = Object.keys(SUPPORTED_CURRENCIES.fiat);
    
    return {
      crypto,
      fiat,
      all: [...crypto, ...fiat]
    };
  }

  /**
   * Check if currency is supported
   */
  isSupportedCurrency(currency: string): boolean {
    return this.isCryptoCurrency(currency) || this.isFiatCurrency(currency);
  }

  /**
   * Get currency metadata
   */
  getCurrencyMetadata(currency: string): {
    name: string;
    type: 'crypto' | 'fiat';
    symbol?: string;
    decimals?: number;
    coingeckoId?: string;
  } | null {
    if (this.isCryptoCurrency(currency)) {
      const crypto = SUPPORTED_CURRENCIES.crypto[currency as keyof typeof SUPPORTED_CURRENCIES.crypto];
      return {
        name: crypto.name,
        type: 'crypto',
        decimals: crypto.decimals,
        coingeckoId: crypto.coingeckoId
      };
    }

    if (this.isFiatCurrency(currency)) {
      const fiat = SUPPORTED_CURRENCIES.fiat[currency as keyof typeof SUPPORTED_CURRENCIES.fiat];
      return {
        name: fiat.name,
        type: 'fiat',
        symbol: fiat.symbol
      };
    }

    return null;
  }

  /**
   * Fetch exchange rate from APIs
   */
  private async fetchExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    const isCryptoFrom = this.isCryptoCurrency(fromCurrency);
    const isCryptoTo = this.isCryptoCurrency(toCurrency);

    // Crypto to fiat or crypto to crypto
    if (isCryptoFrom) {
      return this.fetchCryptoExchangeRate(fromCurrency, toCurrency);
    }

    // Fiat to crypto
    if (isCryptoTo) {
      const reverseRate = await this.fetchCryptoExchangeRate(toCurrency, fromCurrency);
      if (reverseRate) {
        return {
          ...reverseRate,
          fromToken: fromCurrency,
          toToken: toCurrency,
          rate: 1 / reverseRate.rate
        };
      }
    }

    // Fiat to fiat
    return this.fetchFiatExchangeRate(fromCurrency, toCurrency);
  }

  /**
   * Fetch crypto exchange rate from CoinGecko
   */
  private async fetchCryptoExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      const cryptoMetadata = SUPPORTED_CURRENCIES.crypto[fromCurrency as keyof typeof SUPPORTED_CURRENCIES.crypto];
      if (!cryptoMetadata) {
        throw new Error(`Unsupported crypto currency: ${fromCurrency}`);
      }

      const targetCurrency = this.isCryptoCurrency(toCurrency) 
        ? SUPPORTED_CURRENCIES.crypto[toCurrency as keyof typeof SUPPORTED_CURRENCIES.crypto]?.coingeckoId || toCurrency.toLowerCase()
        : toCurrency.toLowerCase();

      const response = await fetch(
        `${EXCHANGE_RATE_APIS.coingecko}/simple/price?ids=${cryptoMetadata.coingeckoId}&vs_currencies=${targetCurrency}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const rate = data[cryptoMetadata.coingeckoId]?.[targetCurrency];

      if (rate) {
        return {
          fromToken: fromCurrency,
          toToken: toCurrency,
          rate,
          source: 'coingecko',
          lastUpdated: new Date(),
          confidence: 0.9
        };
      }

      return null;
    } catch (error) {
      console.error('CoinGecko rate fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch batch crypto rates from CoinGecko
   */
  private async fetchBatchCryptoRates(
    fromCurrency: string,
    toCurrencies: string[]
  ): Promise<Record<string, ExchangeRate | null>> {
    try {
      const cryptoMetadata = SUPPORTED_CURRENCIES.crypto[fromCurrency as keyof typeof SUPPORTED_CURRENCIES.crypto];
      if (!cryptoMetadata) {
        throw new Error(`Unsupported crypto currency: ${fromCurrency}`);
      }

      const targetCurrencies = toCurrencies.map(currency => 
        this.isCryptoCurrency(currency)
          ? SUPPORTED_CURRENCIES.crypto[currency as keyof typeof SUPPORTED_CURRENCIES.crypto]?.coingeckoId || currency.toLowerCase()
          : currency.toLowerCase()
      ).join(',');

      const response = await fetch(
        `${EXCHANGE_RATE_APIS.coingecko}/simple/price?ids=${cryptoMetadata.coingeckoId}&vs_currencies=${targetCurrencies}`
      );

      if (!response.ok) {
        throw new Error(`CoinGecko API error: ${response.status}`);
      }

      const data = await response.json();
      const rates = data[cryptoMetadata.coingeckoId] || {};

      const results: Record<string, ExchangeRate | null> = {};
      for (const toCurrency of toCurrencies) {
        const targetCurrency = this.isCryptoCurrency(toCurrency)
          ? SUPPORTED_CURRENCIES.crypto[toCurrency as keyof typeof SUPPORTED_CURRENCIES.crypto]?.coingeckoId || toCurrency.toLowerCase()
          : toCurrency.toLowerCase();

        const rate = rates[targetCurrency];
        if (rate) {
          results[toCurrency] = {
            fromToken: fromCurrency,
            toToken: toCurrency,
            rate,
            source: 'coingecko',
            lastUpdated: new Date(),
            confidence: 0.9
          };
        } else {
          results[toCurrency] = null;
        }
      }

      return results;
    } catch (error) {
      console.error('Batch crypto rate fetch failed:', error);
      return {};
    }
  }

  /**
   * Fetch fiat exchange rate
   */
  private async fetchFiatExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    try {
      // Use a free exchange rate API (exchangerate-api.com)
      const response = await fetch(
        `https://api.exchangerate-api.com/v4/latest/${fromCurrency}`
      );

      if (!response.ok) {
        throw new Error(`Exchange rate API error: ${response.status}`);
      }

      const data = await response.json();
      const rate = data.rates?.[toCurrency];

      if (rate) {
        return {
          fromToken: fromCurrency,
          toToken: toCurrency,
          rate,
          source: 'exchangerate-api',
          lastUpdated: new Date(),
          confidence: 0.95
        };
      }

      return null;
    } catch (error) {
      console.error('Fiat rate fetch failed:', error);
      return null;
    }
  }

  /**
   * Get cached rate if valid
   */
  private getCachedRate(
    cacheKey: string,
    fromCurrency: string,
    toCurrency: string
  ): ExchangeRate | null {
    const cached = this.cache.get(cacheKey);
    if (!cached) {
      return null;
    }

    const cacheDuration = this.isCryptoCurrency(fromCurrency) || this.isCryptoCurrency(toCurrency)
      ? CACHE_DURATION
      : FIAT_CACHE_DURATION;

    if (Date.now() - cached.timestamp.getTime() < cacheDuration) {
      return cached.rate;
    }

    // Remove expired cache entry
    this.cache.delete(cacheKey);
    return null;
  }

  /**
   * Cache exchange rate
   */
  private cacheRate(
    cacheKey: string,
    rate: ExchangeRate,
    fromCurrency: string,
    toCurrency: string
  ): void {
    this.cache.set(cacheKey, {
      rate,
      timestamp: new Date()
    });
  }

  /**
   * Get fallback rate when APIs fail
   */
  private getFallbackRate(
    fromCurrency: string,
    toCurrency: string
  ): ExchangeRate | null {
    // Fallback rates for common pairs
    const fallbackRates: Record<string, Record<string, number>> = {
      'ETH': { 'USD': 2000, 'USDC': 2000, 'USDT': 2000 },
      'USDC': { 'USD': 1, 'USDT': 1, 'ETH': 0.0005 },
      'USDT': { 'USD': 1, 'USDC': 1, 'ETH': 0.0005 },
      'MATIC': { 'USD': 0.8, 'USDC': 0.8, 'ETH': 0.0004 }
    };

    const rate = fallbackRates[fromCurrency]?.[toCurrency];
    if (rate) {
      return {
        fromToken: fromCurrency,
        toToken: toCurrency,
        rate,
        source: 'fallback',
        lastUpdated: new Date(),
        confidence: 0.3 // Low confidence for fallback
      };
    }

    return null;
  }

  /**
   * Check if currency is cryptocurrency
   */
  private isCryptoCurrency(currency: string): boolean {
    return currency in SUPPORTED_CURRENCIES.crypto;
  }

  /**
   * Check if currency is fiat
   */
  private isFiatCurrency(currency: string): boolean {
    return currency in SUPPORTED_CURRENCIES.fiat;
  }

  /**
   * Get currency symbol
   */
  private getCurrencySymbol(currency: string): string {
    if (this.isFiatCurrency(currency)) {
      return SUPPORTED_CURRENCIES.fiat[currency as keyof typeof SUPPORTED_CURRENCIES.fiat].symbol;
    }
    return currency;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; hitRate?: number } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Preload common exchange rates
   */
  async preloadCommonRates(): Promise<void> {
    const commonPairs = [
      ['ETH', 'USD'],
      ['USDC', 'USD'],
      ['USDT', 'USD'],
      ['MATIC', 'USD'],
      ['ETH', 'USDC'],
      ['ETH', 'USDT']
    ];

    const promises = commonPairs.map(([from, to]) => 
      this.getExchangeRate(from, to).catch(error => {
        console.warn(`Failed to preload rate ${from}/${to}:`, error);
        return null;
      })
    );

    await Promise.all(promises);
  }
}

// Export singleton instance
export const exchangeRateService = new ExchangeRateService();

export default ExchangeRateService;