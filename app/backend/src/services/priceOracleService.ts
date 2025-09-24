import axios from 'axios';
import { tokenDataService } from './tokenDataService';
import { ExchangeRateService } from './exchangeRateService';
import { RedisService } from './redisService';

interface TokenData {
  symbol: string;
  name: string;
  amount?: number;
  usdValue?: number;
  change24h?: number;
  change7d?: number;
  logo?: string;
  decimals?: number;
  marketCap?: number;
  volume24h?: number;
  holders?: number;
  verified?: boolean;
}

export interface FiatConversion {
  amount: string;
  currency: string;
  usdEquivalent: string;
  eurEquivalent?: string;
  gbpEquivalent?: string;
  lastUpdated: Date;
  source: string;
}

export interface CryptoPriceData {
  symbol: string;
  name: string;
  usdPrice: number;
  eurPrice?: number;
  gbpPrice?: number;
  change24h?: number;
  change7d?: number;
  marketCap?: number;
  volume24h?: number;
  lastUpdated: Date;
}

export interface PriceConversionResult {
  fromAmount: string;
  fromCurrency: string;
  toAmount: string;
  toCurrency: string;
  exchangeRate: number;
  timestamp: Date;
  source: string;
}

export class PriceOracleService {
  private exchangeRateService: ExchangeRateService;
  private redisService: RedisService;
  private readonly CACHE_TTL = 300; // 5 minutes

  constructor() {
    this.exchangeRateService = new ExchangeRateService();
    this.redisService = new RedisService();
  }

  /**
   * Convert cryptocurrency amount to fiat currency
   */
  async convertCryptoToFiat(
    amount: string,
    cryptoSymbol: string,
    fiatCurrency: string = 'USD'
  ): Promise<PriceConversionResult> {
    try {
      // Get crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(cryptoSymbol);
      if (!cryptoPrice || !cryptoPrice.usdPrice) {
        throw new Error(`Unable to fetch price for ${cryptoSymbol}`);
      }

      // Get exchange rate from USD to target fiat currency
      const exchangeRate = await this.exchangeRateService.getExchangeRate('USD', fiatCurrency);
      
      // Calculate converted amount
      const cryptoAmount = parseFloat(amount);
      const usdValue = cryptoAmount * cryptoPrice.usdPrice;
      const fiatValue = usdValue * exchangeRate.rate;

      return {
        fromAmount: amount,
        fromCurrency: cryptoSymbol,
        toAmount: fiatValue.toFixed(2),
        toCurrency: fiatCurrency,
        exchangeRate: exchangeRate.rate,
        timestamp: new Date(),
        source: `CoinGecko + ${exchangeRate.source}`
      };
    } catch (error) {
      console.error('Crypto to fiat conversion failed:', error);
      throw new Error(`Failed to convert ${amount} ${cryptoSymbol} to ${fiatCurrency}`);
    }
  }

  /**
   * Convert fiat currency amount to cryptocurrency
   */
  async convertFiatToCrypto(
    amount: string,
    fiatCurrency: string,
    cryptoSymbol: string
  ): Promise<PriceConversionResult> {
    try {
      // Get crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(cryptoSymbol);
      if (!cryptoPrice || !cryptoPrice.usdPrice) {
        throw new Error(`Unable to fetch price for ${cryptoSymbol}`);
      }

      // Get exchange rate from fiat currency to USD
      const exchangeRate = await this.exchangeRateService.getExchangeRate(fiatCurrency, 'USD');
      
      // Calculate converted amount
      const fiatAmount = parseFloat(amount);
      const usdValue = fiatAmount * exchangeRate.rate;
      const cryptoValue = usdValue / cryptoPrice.usdPrice;

      return {
        fromAmount: amount,
        fromCurrency: fiatCurrency,
        toAmount: cryptoValue.toFixed(8),
        toCurrency: cryptoSymbol,
        exchangeRate: 1 / cryptoPrice.usdPrice,
        timestamp: new Date(),
        source: `CoinGecko + ${exchangeRate.source}`
      };
    } catch (error) {
      console.error('Fiat to crypto conversion failed:', error);
      throw new Error(`Failed to convert ${amount} ${fiatCurrency} to ${cryptoSymbol}`);
    }
  }

  /**
   * Get current price of a cryptocurrency
   */
  async getCryptoPrice(symbol: string): Promise<CryptoPriceData> {
    const cacheKey = `crypto_price_${symbol.toLowerCase()}`;
    
    // Try to get from cache first
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }

    try {
      // Use existing tokenDataService to get price data
      const price = await tokenDataService.getTokenPrice(symbol);
      
      const priceData: CryptoPriceData = {
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} Token`,
        usdPrice: price,
        lastUpdated: new Date()
      };

      // Cache the result
      await this.redisService.set(cacheKey, JSON.stringify(priceData), this.CACHE_TTL);
      
      return priceData;
    } catch (error) {
      console.error(`Failed to fetch price for ${symbol}:`, error);
      throw new Error(`Unable to fetch price for ${symbol}`);
    }
  }

  /**
   * Get prices for multiple cryptocurrencies
   */
  async getMultipleCryptoPrices(symbols: string[]): Promise<Record<string, CryptoPriceData>> {
    const prices: Record<string, CryptoPriceData> = {};
    
    // Process symbols in batches to avoid rate limiting
    const batchSize = 10;
    for (let i = 0; i < symbols.length; i += batchSize) {
      const batch = symbols.slice(i, i + batchSize);
      const batchPromises = batch.map(symbol => this.getCryptoPrice(symbol));
      
      try {
        const batchResults = await Promise.all(batchPromises);
        batchResults.forEach((priceData, index) => {
          prices[batch[index].toUpperCase()] = priceData;
        });
      } catch (error) {
        console.error('Batch price fetch failed:', error);
        // Continue with other batches
      }
    }
    
    return prices;
  }

  /**
   * Get supported cryptocurrencies
   */
  async getSupportedCryptocurrencies(): Promise<string[]> {
    // Common cryptocurrencies supported by the platform
    return ['ETH', 'MATIC', 'USDC', 'USDT', 'DAI', 'LINK', 'WBTC', 'UNI', 'AAVE'];
  }

  /**
   * Get supported fiat currencies
   */
  async getSupportedFiatCurrencies(): Promise<string[]> {
    return this.exchangeRateService.getSupportedFiatCurrencies();
  }

  /**
   * Get all supported currencies (both crypto and fiat)
   */
  async getAllSupportedCurrencies(): Promise<{ crypto: string[]; fiat: string[] }> {
    const crypto = await this.getSupportedCryptocurrencies();
    const fiat = await this.getSupportedFiatCurrencies();
    
    return { crypto, fiat };
  }

  /**
   * Convert product price to multiple fiat currencies
   */
  async convertProductPrice(
    amount: string,
    cryptoSymbol: string
  ): Promise<Record<string, string>> {
    const supportedFiat = await this.getSupportedFiatCurrencies();
    const conversions: Record<string, string> = {};

    try {
      // Get crypto price in USD
      const cryptoPrice = await this.getCryptoPrice(cryptoSymbol);
      if (!cryptoPrice || !cryptoPrice.usdPrice) {
        throw new Error(`Unable to fetch price for ${cryptoSymbol}`);
      }

      // Convert to each supported fiat currency
      for (const fiat of supportedFiat) {
        try {
          const exchangeRate = await this.exchangeRateService.getExchangeRate('USD', fiat);
          const cryptoAmount = parseFloat(amount);
          const usdValue = cryptoAmount * cryptoPrice.usdPrice;
          const fiatValue = usdValue * exchangeRate.rate;
          conversions[fiat] = fiatValue.toFixed(2);
        } catch (error) {
          console.error(`Failed to convert to ${fiat}:`, error);
          conversions[fiat] = 'N/A';
        }
      }

      return conversions;
    } catch (error) {
      console.error('Product price conversion failed:', error);
      throw new Error(`Failed to convert product price from ${cryptoSymbol}`);
    }
  }

  /**
   * Get price trend data for a cryptocurrency
   */
  async getPriceTrend(symbol: string, days: number = 30): Promise<Array<{ date: Date; price: number }>> {
    try {
      // Use CoinGecko API to get historical data
      const response = await axios.get(
        `https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart`,
        {
          params: {
            vs_currency: 'usd',
            days: days,
            interval: 'daily'
          },
          headers: {
            'x-cg-demo-api-key': process.env.COINGECKO_API_KEY || ''
          },
          timeout: 10000
        }
      );

      // Transform the response data
      const prices = response.data.prices.map((priceData: [number, number]) => ({
        date: new Date(priceData[0]),
        price: priceData[1]
      }));

      return prices;
    } catch (error) {
      console.error(`Failed to fetch price trend for ${symbol}:`, error);
      return [];
    }
  }

  /**
   * Get market data for a cryptocurrency
   */
  async getMarketData(symbol: string): Promise<any> {
    try {
      // Use existing tokenDataService
      const tokenData = await tokenDataService.getTokenInfo('ethereum', symbol);
      return tokenData;
    } catch (error) {
      console.error(`Failed to fetch market data for ${symbol}:`, error);
      return null;
    }
  }

  /**
   * Clear price cache
   */
  async clearPriceCache(): Promise<void> {
    // This would require implementing a method to clear all price-related cache keys
    // For now, we'll just log that this functionality could be implemented
    console.log('Price cache clearing functionality would be implemented here');
  }
}

export const priceOracleService = new PriceOracleService();