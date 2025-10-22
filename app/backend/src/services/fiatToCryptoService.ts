import axios from 'axios';

export interface ExchangeRate {
  from: string;
  to: string;
  rate: number;
  timestamp: Date;
  source: string;
}

export interface ConversionRequest {
  fromAmount: number;
  fromCurrency: string;
  toCurrency: string;
  slippageTolerance?: number; // percentage, default 1%
  priceGuaranteeMinutes?: number; // default 5 minutes
}

export interface ConversionResult {
  success: boolean;
  fromAmount: number;
  toAmount?: number;
  exchangeRate?: number;
  slippage?: number;
  fees?: number;
  guaranteedUntil?: Date;
  transactionId?: string;
  error?: string;
}

export interface PriceGuarantee {
  id: string;
  fromAmount: number;
  fromCurrency: string;
  toCurrency: string;
  guaranteedRate: number;
  validUntil: Date;
  used: boolean;
}

export class FiatToCryptoService {
  private exchangeRates: Map<string, ExchangeRate> = new Map();
  private priceGuarantees: Map<string, PriceGuarantee> = new Map();
  private readonly CACHE_DURATION = 60000; // 1 minute
  private readonly DEFAULT_SLIPPAGE = 1; // 1%
  private readonly DEFAULT_GUARANTEE_MINUTES = 5;

  constructor(
    private coinGeckoApiKey?: string,
    private coinbaseApiKey?: string,
    private coinbaseApiSecret?: string
  ) {}

  public async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    const cacheKey = `${fromCurrency}-${toCurrency}`;
    const cached = this.exchangeRates.get(cacheKey);

    // Return cached rate if still valid
    if (cached && Date.now() - cached.timestamp.getTime() < this.CACHE_DURATION) {
      return cached;
    }

    try {
      // Try CoinGecko first
      const rate = await this.fetchFromCoinGecko(fromCurrency, toCurrency);
      if (rate) {
        this.exchangeRates.set(cacheKey, rate);
        return rate;
      }

      // Fallback to Coinbase
      const coinbaseRate = await this.fetchFromCoinbase(fromCurrency, toCurrency);
      if (coinbaseRate) {
        this.exchangeRates.set(cacheKey, coinbaseRate);
        return coinbaseRate;
      }

      return null;
    } catch (error) {
      console.error('Exchange rate fetch error:', error);
      return cached || null; // Return cached if available, even if expired
    }
  }

  private async fetchFromCoinGecko(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    try {
      const fromId = this.getCoinGeckoId(fromCurrency);
      const toId = this.getCoinGeckoId(toCurrency);

      if (!fromId || !toId) {
        return null;
      }

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${fromId}&vs_currencies=${toId}`;
      const headers = this.coinGeckoApiKey ? { 'X-CG-Demo-API-Key': this.coinGeckoApiKey } : {};

      const response = await axios.get(url, { headers, timeout: 5000 });
      const rate = response.data[fromId]?.[toId];

      if (rate) {
        return {
          from: fromCurrency,
          to: toCurrency,
          rate,
          timestamp: new Date(),
          source: 'coingecko',
        };
      }

      return null;
    } catch (error) {
      console.error('CoinGecko API error:', error);
      return null;
    }
  }

  private async fetchFromCoinbase(fromCurrency: string, toCurrency: string): Promise<ExchangeRate | null> {
    try {
      // For simplicity, using public Coinbase API
      // In production, you might want to use authenticated API for better rates
      const url = `https://api.coinbase.com/v2/exchange-rates?currency=${fromCurrency}`;
      
      const response = await axios.get(url, { timeout: 5000 });
      const rate = response.data.data.rates[toCurrency];

      if (rate) {
        return {
          from: fromCurrency,
          to: toCurrency,
          rate: parseFloat(rate),
          timestamp: new Date(),
          source: 'coinbase',
        };
      }

      return null;
    } catch (error) {
      console.error('Coinbase API error:', error);
      return null;
    }
  }

  private getCoinGeckoId(currency: string): string | null {
    const mapping: Record<string, string> = {
      'USD': 'usd',
      'EUR': 'eur',
      'GBP': 'gbp',
      'ETH': 'ethereum',
      'BTC': 'bitcoin',
      'USDC': 'usd-coin',
      'USDT': 'tether',
      'LDAO': 'linkdao', // Assuming LDAO is listed
    };

    return mapping[currency.toUpperCase()] || null;
  }

  public async convertFiatToCrypto(request: ConversionRequest): Promise<ConversionResult> {
    try {
      const { fromAmount, fromCurrency, toCurrency, slippageTolerance = this.DEFAULT_SLIPPAGE } = request;

      // Get current exchange rate
      const exchangeRate = await this.getExchangeRate(fromCurrency, toCurrency);
      
      if (!exchangeRate) {
        return {
          success: false,
          fromAmount,
          error: `Unable to get exchange rate for ${fromCurrency} to ${toCurrency}`,
        };
      }

      // Calculate conversion with slippage protection
      const baseAmount = fromAmount * exchangeRate.rate;
      const slippageAmount = baseAmount * (slippageTolerance / 100);
      const guaranteedAmount = baseAmount - slippageAmount;

      // Calculate fees (example: 0.5% conversion fee)
      const conversionFee = fromAmount * 0.005;
      const finalAmount = guaranteedAmount - (conversionFee * exchangeRate.rate);

      return {
        success: true,
        fromAmount,
        toAmount: finalAmount,
        exchangeRate: exchangeRate.rate,
        slippage: slippageTolerance,
        fees: conversionFee,
        guaranteedUntil: new Date(Date.now() + (request.priceGuaranteeMinutes || this.DEFAULT_GUARANTEE_MINUTES) * 60000),
        transactionId: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error('Fiat to crypto conversion error:', error);
      return {
        success: false,
        fromAmount: request.fromAmount,
        error: error instanceof Error ? error.message : 'Conversion failed',
      };
    }
  }

  public async createPriceGuarantee(request: ConversionRequest): Promise<PriceGuarantee | null> {
    try {
      const exchangeRate = await this.getExchangeRate(request.fromCurrency, request.toCurrency);
      
      if (!exchangeRate) {
        return null;
      }

      const guarantee: PriceGuarantee = {
        id: `pg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        fromAmount: request.fromAmount,
        fromCurrency: request.fromCurrency,
        toCurrency: request.toCurrency,
        guaranteedRate: exchangeRate.rate,
        validUntil: new Date(Date.now() + (request.priceGuaranteeMinutes || this.DEFAULT_GUARANTEE_MINUTES) * 60000),
        used: false,
      };

      this.priceGuarantees.set(guarantee.id, guarantee);

      // Clean up expired guarantees
      this.cleanupExpiredGuarantees();

      return guarantee;
    } catch (error) {
      console.error('Price guarantee creation error:', error);
      return null;
    }
  }

  public async executeGuaranteedConversion(guaranteeId: string): Promise<ConversionResult> {
    try {
      const guarantee = this.priceGuarantees.get(guaranteeId);

      if (!guarantee) {
        return {
          success: false,
          fromAmount: 0,
          error: 'Price guarantee not found',
        };
      }

      if (guarantee.used) {
        return {
          success: false,
          fromAmount: guarantee.fromAmount,
          error: 'Price guarantee already used',
        };
      }

      if (new Date() > guarantee.validUntil) {
        return {
          success: false,
          fromAmount: guarantee.fromAmount,
          error: 'Price guarantee expired',
        };
      }

      // Mark guarantee as used
      guarantee.used = true;
      this.priceGuarantees.set(guaranteeId, guarantee);

      // Execute conversion at guaranteed rate
      const baseAmount = guarantee.fromAmount * guarantee.guaranteedRate;
      const conversionFee = guarantee.fromAmount * 0.005;
      const finalAmount = baseAmount - (conversionFee * guarantee.guaranteedRate);

      return {
        success: true,
        fromAmount: guarantee.fromAmount,
        toAmount: finalAmount,
        exchangeRate: guarantee.guaranteedRate,
        slippage: 0, // No slippage with guarantee
        fees: conversionFee,
        transactionId: `gconv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error('Guaranteed conversion execution error:', error);
      return {
        success: false,
        fromAmount: 0,
        error: error instanceof Error ? error.message : 'Guaranteed conversion failed',
      };
    }
  }

  public async processRefund(transactionId: string, reason: string): Promise<{ success: boolean; refundId?: string; error?: string }> {
    try {
      // In a real implementation, this would:
      // 1. Verify the transaction exists
      // 2. Check if refund is allowed (time limits, etc.)
      // 3. Process the refund through the payment processor
      // 4. Update transaction status

      // For now, return a mock successful refund
      return {
        success: true,
        refundId: `refund_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      };
    } catch (error) {
      console.error('Refund processing error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Refund processing failed',
      };
    }
  }

  public async handleConversionFailure(transactionId: string, reason: string): Promise<void> {
    try {
      console.log(`Conversion failure for transaction ${transactionId}: ${reason}`);
      
      // In a real implementation, this would:
      // 1. Log the failure
      // 2. Initiate automatic refund process
      // 3. Send notification to user
      // 4. Update transaction status
      // 5. Trigger alerts for monitoring

      // For now, just log the failure
    } catch (error) {
      console.error('Conversion failure handling error:', error);
    }
  }

  private cleanupExpiredGuarantees(): void {
    const now = new Date();
    for (const [id, guarantee] of this.priceGuarantees.entries()) {
      if (now > guarantee.validUntil) {
        this.priceGuarantees.delete(id);
      }
    }
  }

  public getPriceGuarantee(guaranteeId: string): PriceGuarantee | null {
    return this.priceGuarantees.get(guaranteeId) || null;
  }

  public getSupportedCurrencies(): { fiat: string[]; crypto: string[] } {
    return {
      fiat: ['USD', 'EUR', 'GBP'],
      crypto: ['ETH', 'BTC', 'USDC', 'USDT', 'LDAO'],
    };
  }

  public async getConversionHistory(userId: string): Promise<ConversionResult[]> {
    // In a real implementation, this would query the database
    // For now, return empty array
    return [];
  }

  public async estimateConversionTime(fromCurrency: string, toCurrency: string): Promise<number> {
    // Return estimated conversion time in minutes
    if (fromCurrency === 'USD' && ['ETH', 'USDC'].includes(toCurrency)) {
      return 2; // 2 minutes for USD to major cryptos
    }
    
    return 5; // 5 minutes for other conversions
  }
}