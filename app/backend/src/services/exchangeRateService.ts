import { safeLogger } from '../utils/safeLogger';

export interface ExchangeRate {
  fromCurrency: string;
  toCurrency: string;
  rate: number;
  lastUpdated: Date;
  source: string;
  bid?: number;
  ask?: number;
  spread?: number;
}

export interface CurrencyInfo {
  code: string;
  name: string;
  symbol: string;
  type: 'fiat' | 'crypto';
  decimals: number;
  isStablecoin?: boolean;
}

export class ExchangeRateService {
  private rateCache = new Map<string, ExchangeRate>();
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  // Supported currencies
  private readonly SUPPORTED_FIAT_CURRENCIES: CurrencyInfo[] = [
    { code: 'USD', name: 'US Dollar', symbol: '$', type: 'fiat', decimals: 2 },
    { code: 'EUR', name: 'Euro', symbol: '€', type: 'fiat', decimals: 2 },
    { code: 'GBP', name: 'British Pound', symbol: '£', type: 'fiat', decimals: 2 },
    { code: 'CAD', name: 'Canadian Dollar', symbol: 'C$', type: 'fiat', decimals: 2 },
    { code: 'AUD', name: 'Australian Dollar', symbol: 'A$', type: 'fiat', decimals: 2 },
    { code: 'JPY', name: 'Japanese Yen', symbol: '¥', type: 'fiat', decimals: 0 }
  ];

  private readonly SUPPORTED_CRYPTO_CURRENCIES: CurrencyInfo[] = [
    { code: 'ETH', name: 'Ethereum', symbol: 'ETH', type: 'crypto', decimals: 18 },
    { code: 'MATIC', name: 'Polygon', symbol: 'MATIC', type: 'crypto', decimals: 18 },
    { code: 'USDC', name: 'USD Coin', symbol: 'USDC', type: 'crypto', decimals: 6, isStablecoin: true },
    { code: 'USDT', name: 'Tether USD', symbol: 'USDT', type: 'crypto', decimals: 6, isStablecoin: true },
    { code: 'DAI', name: 'Dai Stablecoin', symbol: 'DAI', type: 'crypto', decimals: 18, isStablecoin: true }
  ];

  // Real-time exchange rates are fetched from external APIs.

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    
    // Check cache first
    const cached = this.rateCache.get(cacheKey);
    if (cached && Date.now() - cached.lastUpdated.getTime() < this.cacheExpiry) {
      return cached;
    }

    try {
      // In production, fetch from real API
      const rate = await this.fetchExchangeRate(fromCurrency, toCurrency);
      
      // Cache the result
      this.rateCache.set(cacheKey, rate);
      
      return rate;
    } catch (error) {
      safeLogger.error(`Error fetching exchange rate for ${fromCurrency}/${toCurrency}:`, error);
      
      // Return cached rate if available, even if expired
      if (cached) {
        return cached;
      }
      
      throw new Error(`Unable to get exchange rate for ${fromCurrency}/${toCurrency}`);
    }
  }

  /**
   * Get multiple exchange rates at once
   */
  async getMultipleExchangeRates(pairs: Array<{ from: string; to: string }>): Promise<ExchangeRate[]> {
    const promises = pairs.map(pair => this.getExchangeRate(pair.from, pair.to));
    return Promise.all(promises);
  }

  /**
   * Convert amount from one currency to another
   */
  async convertCurrency(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; rate: ExchangeRate }> {
    const rate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * rate.rate;
    
    return {
      convertedAmount,
      rate
    };
  }

  /**
   * Get supported fiat currencies
   */
  getSupportedFiatCurrencies(): string[] {
    return this.SUPPORTED_FIAT_CURRENCIES.map(currency => currency.code);
  }

  /**
   * Get supported crypto currencies
   */
  getSupportedCryptoCurrencies(): string[] {
    return this.SUPPORTED_CRYPTO_CURRENCIES.map(currency => currency.code);
  }

  /**
   * Get all supported currencies
   */
  getAllSupportedCurrencies(): CurrencyInfo[] {
    return [...this.SUPPORTED_FIAT_CURRENCIES, ...this.SUPPORTED_CRYPTO_CURRENCIES];
  }

  /**
   * Get currency info
   */
  getCurrencyInfo(currencyCode: string): CurrencyInfo | undefined {
    return this.getAllSupportedCurrencies().find(
      currency => currency.code.toLowerCase() === currencyCode.toLowerCase()
    );
  }

  /**
   * Check if currency is supported
   */
  isCurrencySupported(currencyCode: string): boolean {
    return this.getAllSupportedCurrencies().some(
      currency => currency.code.toLowerCase() === currencyCode.toLowerCase()
    );
  }

  /**
   * Get stablecoins
   */
  getStablecoins(): CurrencyInfo[] {
    return this.SUPPORTED_CRYPTO_CURRENCIES.filter(currency => currency.isStablecoin);
  }

  /**
   * Check if currency is a stablecoin
   */
  isStablecoin(currencyCode: string): boolean {
    const currency = this.getCurrencyInfo(currencyCode);
    return currency?.isStablecoin || false;
  }

  /**
   * Get historical rates (mock implementation)
   */
  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    days: number = 30
  ): Promise<Array<{ date: Date; rate: number }>> {
    // Mock historical data
    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const historicalRates: Array<{ date: Date; rate: number }> = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some random variation to simulate historical data
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const rate = currentRate.rate * (1 + variation);
      
      historicalRates.push({ date, rate });
    }
    
    return historicalRates;
  }

  /**
   * Get rate trends and analysis
   */
  async getRateTrends(
    fromCurrency: string,
    toCurrency: string
  ): Promise<{
    current: number;
    change24h: number;
    change7d: number;
    change30d: number;
    trend: 'up' | 'down' | 'stable';
    volatility: 'low' | 'medium' | 'high';
  }> {
    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);
    
    // Mock trend data
    const change24h = (Math.random() - 0.5) * 0.1; // ±5%
    const change7d = (Math.random() - 0.5) * 0.2; // ±10%
    const change30d = (Math.random() - 0.5) * 0.3; // ±15%
    
    let trend: 'up' | 'down' | 'stable' = 'stable';
    if (change24h > 0.02) trend = 'up';
    else if (change24h < -0.02) trend = 'down';
    
    let volatility: 'low' | 'medium' | 'high' = 'low';
    const avgChange = Math.abs(change24h) + Math.abs(change7d) + Math.abs(change30d);
    if (avgChange > 0.3) volatility = 'high';
    else if (avgChange > 0.15) volatility = 'medium';
    
    return {
      current: currentRate.rate,
      change24h,
      change7d,
      change30d,
      trend,
      volatility
    };
  }

  /**
   * Clear rate cache
   */
  clearCache(): void {
    this.rateCache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.rateCache.size,
      entries: Array.from(this.rateCache.keys())
    };
  }

  // Private methods

  private getCoinGeckoId(currencyCode: string): string {
    switch (currencyCode.toUpperCase()) {
      case 'ETH': return 'ethereum';
      case 'MATIC': return 'matic-network';
      case 'USDC': return 'usd-coin';
      case 'USDT': return 'tether';
      case 'DAI': return 'dai';
      default:
        throw new Error(`No CoinGecko ID mapping for currency: ${currencyCode}`);
    }
  }

  private async fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    if (fromCurrency === toCurrency) {
      return {
        fromCurrency,
        toCurrency,
        rate: 1,
        lastUpdated: new Date(),
        source: 'self',
      };
    }

    const fromInfo = this.getCurrencyInfo(fromCurrency);
    const toInfo = this.getCurrencyInfo(toCurrency);

    if (!fromInfo || !toInfo) {
      throw new Error(`Unsupported currency in pair ${fromCurrency}/${toCurrency}`);
    }

    let rate: number;
    let source: string;

    try {
      // Case 1: Fiat to Fiat
      if (fromInfo.type === 'fiat' && toInfo.type === 'fiat') {
        const response = await fetch(`https://api.frankfurter.app/latest?from=${fromCurrency}&to=${toCurrency}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch fiat exchange rate from Frankfurter API: ${response.statusText}`);
        }
        const data = await response.json();
        rate = data.rates[toCurrency];
        source = 'frankfurter.app';
      }
      // Case 2: Crypto to Fiat or Crypto to Crypto
      else if (fromInfo.type === 'crypto') {
        const fromId = this.getCoinGeckoId(fromCurrency);
        const toCode = toCurrency.toLowerCase();
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${fromId}&vs_currencies=${toCode}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch crypto exchange rate from CoinGecko API: ${response.statusText}`);
        }
        const data = await response.json();
        if (data[fromId] === undefined || data[fromId][toCode] === undefined) {
          throw new Error(`Rate not found for ${fromCurrency}/${toCurrency} on CoinGecko`);
        }
        rate = data[fromId][toCode];
        source = 'coingecko.com';
      }
      // Case 3: Fiat to Crypto
      else if (fromInfo.type === 'fiat' && toInfo.type === 'crypto') {
        const toId = this.getCoinGeckoId(toCurrency);
        const fromCode = fromCurrency.toLowerCase();
        const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${toId}&vs_currencies=${fromCode}`);
        if (!response.ok) {
          throw new Error(`Failed to fetch crypto exchange rate from CoinGecko API: ${response.statusText}`);
        }
        const data = await response.json();
        if (data[toId] === undefined || data[toId][fromCode] === undefined) {
          throw new Error(`Rate not found for ${toCurrency}/${fromCurrency} on CoinGecko`);
        }
        const cryptoPerFiat = data[toId][fromCode];
        if (cryptoPerFiat === 0) {
          throw new Error(`Cannot convert ${fromCurrency} to ${toCurrency}, inverse rate is zero.`);
        }
        rate = 1 / cryptoPerFiat;
        source = 'coingecko.com';
      } else {
        throw new Error(`Unsupported currency conversion: ${fromCurrency} to ${toCurrency}`);
      }

      if (typeof rate !== 'number') {
        throw new Error(`Invalid rate received for ${fromCurrency}/${toCurrency}`);
      }

      return {
        fromCurrency,
        toCurrency,
        rate,
        lastUpdated: new Date(),
        source,
        bid: rate * 0.999,
        ask: rate * 1.001,
        spread: rate * 0.002,
      };
    } catch (error) {
      safeLogger.error(`Error fetching real exchange rate for ${fromCurrency}/${toCurrency}:`, error);
      throw new Error(`Unable to get real exchange rate for ${fromCurrency}/${toCurrency}`);
    }
  }

  /**
   * Format currency amount with proper decimals and symbol
   */
  formatCurrencyAmount(amount: number, currencyCode: string): string {
    const currency = this.getCurrencyInfo(currencyCode);
    if (!currency) {
      return amount.toString();
    }
    
    const formatted = amount.toFixed(currency.decimals);
    
    if (currency.type === 'fiat') {
      return `${currency.symbol}${formatted}`;
    } else {
      return `${formatted} ${currency.symbol}`;
    }
  }

  /**
   * Parse currency amount from string
   */
  parseCurrencyAmount(amountString: string, currencyCode: string): number {
    const currency = this.getCurrencyInfo(currencyCode);
    if (!currency) {
      return parseFloat(amountString);
    }
    
    // Remove currency symbols and spaces
    let cleanAmount = amountString.replace(/[^\d.-]/g, '');
    return parseFloat(cleanAmount);
  }
}
