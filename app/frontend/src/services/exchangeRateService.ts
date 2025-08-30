import { ExchangeRate } from '../types/fiatPayment';

export class ExchangeRateService {
  private rateCache = new Map<string, ExchangeRate>();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly API_ENDPOINTS = {
    coinGecko: 'https://api.coingecko.com/api/v3/simple/price',
    exchangeRatesAPI: 'https://api.exchangerate-api.com/v4/latest',
    coinbase: 'https://api.coinbase.com/v2/exchange-rates'
  };

  /**
   * Get exchange rate between two currencies
   */
  async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.rateCache.get(cacheKey);
    
    if (cached && this.isRateValid(cached)) {
      return cached;
    }

    try {
      let rate: number;
      
      if (this.isCryptoCurrency(fromCurrency) || this.isCryptoCurrency(toCurrency)) {
        rate = await this.getCryptoExchangeRate(fromCurrency, toCurrency);
      } else {
        rate = await this.getFiatExchangeRate(fromCurrency, toCurrency);
      }

      const exchangeRate: ExchangeRate = {
        fromCurrency,
        toCurrency,
        rate,
        provider: 'coingecko',
        timestamp: new Date(),
        validUntil: new Date(Date.now() + this.CACHE_DURATION)
      };

      this.rateCache.set(cacheKey, exchangeRate);
      return exchangeRate;
    } catch (error) {
      console.error('Failed to fetch exchange rate:', error);
      throw new Error(`Failed to get exchange rate for ${fromCurrency} to ${toCurrency}`);
    }
  }

  /**
   * Get multiple exchange rates at once
   */
  async getMultipleRates(
    fromCurrency: string, 
    toCurrencies: string[]
  ): Promise<Record<string, ExchangeRate>> {
    const rates: Record<string, ExchangeRate> = {};
    
    await Promise.all(
      toCurrencies.map(async (toCurrency) => {
        try {
          rates[toCurrency] = await this.getExchangeRate(fromCurrency, toCurrency);
        } catch (error) {
          console.error(`Failed to get rate for ${fromCurrency} to ${toCurrency}:`, error);
        }
      })
    );

    return rates;
  }

  /**
   * Convert amount from one currency to another
   */
  async convertAmount(
    amount: number,
    fromCurrency: string,
    toCurrency: string
  ): Promise<{ convertedAmount: number; exchangeRate: ExchangeRate }> {
    const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const convertedAmount = amount * exchangeRate.rate;
    
    return { convertedAmount, exchangeRate };
  }

  /**
   * Get crypto to fiat exchange rate
   */
  private async getCryptoExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    const cryptoId = this.getCryptoId(fromCurrency);
    const fiatCurrency = toCurrency.toLowerCase();
    
    const response = await fetch(
      `${this.API_ENDPOINTS.coinGecko}?ids=${cryptoId}&vs_currencies=${fiatCurrency}`
    );
    
    if (!response.ok) {
      throw new Error('Failed to fetch crypto exchange rate');
    }

    const data = await response.json();
    const rate = data[cryptoId]?.[fiatCurrency];
    
    if (typeof rate !== 'number') {
      throw new Error('Invalid exchange rate response');
    }

    return rate;
  }

  /**
   * Get fiat to fiat exchange rate
   */
  private async getFiatExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    if (fromCurrency === toCurrency) {
      return 1;
    }

    const response = await fetch(`${this.API_ENDPOINTS.exchangeRatesAPI}/${fromCurrency}`);
    
    if (!response.ok) {
      throw new Error('Failed to fetch fiat exchange rate');
    }

    const data = await response.json();
    const rate = data.rates?.[toCurrency];
    
    if (typeof rate !== 'number') {
      throw new Error('Invalid exchange rate response');
    }

    return rate;
  }

  /**
   * Check if currency is a cryptocurrency
   */
  private isCryptoCurrency(currency: string): boolean {
    const cryptoCurrencies = ['BTC', 'ETH', 'USDC', 'USDT', 'MATIC', 'ARB'];
    return cryptoCurrencies.includes(currency.toUpperCase());
  }

  /**
   * Get CoinGecko ID for cryptocurrency
   */
  private getCryptoId(currency: string): string {
    const cryptoIds: Record<string, string> = {
      'BTC': 'bitcoin',
      'ETH': 'ethereum',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'MATIC': 'matic-network',
      'ARB': 'arbitrum'
    };
    
    return cryptoIds[currency.toUpperCase()] || currency.toLowerCase();
  }

  /**
   * Check if cached rate is still valid
   */
  private isRateValid(rate: ExchangeRate): boolean {
    return new Date() < rate.validUntil;
  }

  /**
   * Get supported currencies
   */
  getSupportedFiatCurrencies(): string[] {
    return ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];
  }

  getSupportedCryptoCurrencies(): string[] {
    return ['BTC', 'ETH', 'USDC', 'USDT', 'MATIC', 'ARB'];
  }

  /**
   * Calculate conversion with slippage
   */
  calculateWithSlippage(
    amount: number,
    rate: number,
    slippagePercent: number
  ): { minAmount: number; maxAmount: number; expectedAmount: number } {
    const expectedAmount = amount * rate;
    const slippageAmount = expectedAmount * (slippagePercent / 100);
    
    return {
      minAmount: expectedAmount - slippageAmount,
      maxAmount: expectedAmount + slippageAmount,
      expectedAmount
    };
  }

  /**
   * Get historical rates (mock implementation)
   */
  async getHistoricalRates(
    fromCurrency: string,
    toCurrency: string,
    days: number = 7
  ): Promise<Array<{ date: Date; rate: number }>> {
    // In a real implementation, this would fetch historical data
    // For now, return mock data
    const currentRate = await this.getExchangeRate(fromCurrency, toCurrency);
    const rates = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      // Add some random variation for mock data
      const variation = (Math.random() - 0.5) * 0.1; // ±5% variation
      const rate = currentRate.rate * (1 + variation);
      
      rates.push({ date, rate });
    }
    
    return rates;
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
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.rateCache.size,
      keys: Array.from(this.rateCache.keys())
    };
  }
}