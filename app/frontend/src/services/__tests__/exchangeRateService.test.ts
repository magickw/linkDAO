import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { ExchangeRateService } from '../exchangeRateService';

// Mock fetch
global.fetch = jest.fn();

describe('ExchangeRateService', () => {
  let exchangeRateService: ExchangeRateService;

  beforeEach(() => {
    jest.clearAllMocks();
    exchangeRateService = new ExchangeRateService();
  });

  describe('getExchangeRate', () => {
    it('should get crypto to fiat exchange rate', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      const rate = await exchangeRateService.getExchangeRate('ETH', 'USD');

      expect(rate).toBeDefined();
      expect(rate.fromCurrency).toBe('ETH');
      expect(rate.toCurrency).toBe('USD');
      expect(rate.rate).toBe(2000);
      expect(rate.provider).toBe('coingecko');
    });

    it('should get fiat to fiat exchange rate', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          rates: { EUR: 0.85 }
        })
      });

      const rate = await exchangeRateService.getExchangeRate('USD', 'EUR');

      expect(rate).toBeDefined();
      expect(rate.fromCurrency).toBe('USD');
      expect(rate.toCurrency).toBe('EUR');
      expect(rate.rate).toBe(0.85);
    });

    it('should return 1 for same currency conversion', async () => {
      const rate = await exchangeRateService.getExchangeRate('USD', 'USD');

      expect(rate.rate).toBe(1);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should cache exchange rates', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      // First call
      await exchangeRateService.getExchangeRate('ETH', 'USD');
      
      // Second call should use cache
      await exchangeRateService.getExchangeRate('ETH', 'USD');

      expect(fetch).toHaveBeenCalledTimes(1);
    });

    it('should handle API errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 500
      });

      await expect(exchangeRateService.getExchangeRate('ETH', 'USD'))
        .rejects.toThrow('Failed to get exchange rate for ETH to USD');
    });
  });

  describe('convertAmount', () => {
    it('should convert amount correctly', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      const result = await exchangeRateService.convertAmount(1, 'ETH', 'USD');

      expect(result.convertedAmount).toBe(2000);
      expect(result.exchangeRate.rate).toBe(2000);
    });
  });

  describe('getMultipleRates', () => {
    it('should get multiple exchange rates', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000, eur: 1700 }
        })
      });

      const rates = await exchangeRateService.getMultipleRates('ETH', ['USD', 'EUR']);

      expect(rates.USD).toBeDefined();
      expect(rates.EUR).toBeDefined();
      expect(rates.USD.rate).toBe(2000);
      expect(rates.EUR.rate).toBe(1700);
    });
  });

  describe('calculateWithSlippage', () => {
    it('should calculate slippage correctly', () => {
      const result = exchangeRateService.calculateWithSlippage(100, 2, 1); // 1% slippage

      expect(result.expectedAmount).toBe(200);
      expect(result.minAmount).toBe(198); // 200 - 1%
      expect(result.maxAmount).toBe(202); // 200 + 1%
    });
  });

  describe('getSupportedCurrencies', () => {
    it('should return supported fiat currencies', () => {
      const currencies = exchangeRateService.getSupportedFiatCurrencies();
      
      expect(currencies).toContain('USD');
      expect(currencies).toContain('EUR');
      expect(currencies).toContain('GBP');
    });

    it('should return supported crypto currencies', () => {
      const currencies = exchangeRateService.getSupportedCryptoCurrencies();
      
      expect(currencies).toContain('BTC');
      expect(currencies).toContain('ETH');
      expect(currencies).toContain('USDC');
    });
  });

  describe('cache management', () => {
    it('should clear cache', () => {
      exchangeRateService.clearCache();
      const stats = exchangeRateService.getCacheStats();
      
      expect(stats.size).toBe(0);
      expect(stats.keys).toEqual([]);
    });

    it('should provide cache statistics', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({
          ethereum: { usd: 2000 }
        })
      });

      await exchangeRateService.getExchangeRate('ETH', 'USD');
      const stats = exchangeRateService.getCacheStats();
      
      expect(stats.size).toBe(1);
      expect(stats.keys).toContain('ETH-USD');
    });
  });
});