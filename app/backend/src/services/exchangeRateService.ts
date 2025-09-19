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

  // Mock exchange rates (in production, use real API like CoinGecko, CoinMarketCap, etc.)
  private readonly MOCK_RATES: Record<string, number> = {
    'USD_EUR': 0.85,
    'USD_GBP': 0.73,
    'USD_CAD': 1.25,
    'USD_AUD': 1.35,
    'USD_JPY': 110,
    'EUR_USD': 1.18,
    'GBP_USD': 1.37,
    'CAD_USD': 0.80,
    'AUD_USD': 0.74,
    'JPY_USD': 0.0091,
    'ETH_USD': 2500,
    'MATIC_USD': 0.85,
    'USDC_USD': 1.00,
    'USDT_USD': 1.00,
    'DAI_USD': 1.00,
    'USD_ETH': 0.0004,
    'USD_MATIC': 1.18,
    'USD_USDC': 1.00,
    'USD_USDT': 1.00,
    'USD_DAI': 1.00
  };

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
      console.error(`Error fetching exchange rate for ${fromCurrency}/${toCurrency}:`, error);
      
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

  private async fetchExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    // Mock implementation - in production, use real API
    const cacheKey = `${fromCurrency}_${toCurrency}`;
    const reverseKey = `${toCurrency}_${fromCurrency}`;
    
    let rate = this.MOCK_RATES[cacheKey];
    
    // Try reverse rate
    if (!rate && this.MOCK_RATES[reverseKey]) {
      rate = 1 / this.MOCK_RATES[reverseKey];
    }
    
    // Default to 1 for same currency or unknown pairs
    if (!rate) {
      if (fromCurrency === toCurrency) {
        rate = 1;
      } else {
        throw new Error(`Exchange rate not available for ${fromCurrency}/${toCurrency}`);
      }
    }
    
    // Add some random variation to simulate real market conditions
    const variation = (Math.random() - 0.5) * 0.02; // ±1% variation
    rate = rate * (1 + variation);
    
    return {
      fromCurrency,
      toCurrency,
      rate,
      lastUpdated: new Date(),
      source: 'mock_exchange_service',
      bid: rate * 0.999, // Slightly lower bid
      ask: rate * 1.001, // Slightly higher ask
      spread: rate * 0.002 // 0.2% spread
    };
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