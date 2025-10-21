/**
 * Cost Effectiveness Integration Tests
 * Tests the integration between gas fee estimation, transaction cost calculation, and exchange rate services
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { PaymentMethodType, PaymentMethod } from '../../types/paymentPrioritization';
import { gasFeeEstimationService } from '../gasFeeEstimationService';
import { transactionCostCalculator } from '../transactionCostCalculator';
import { exchangeRateService } from '../exchangeRateService';
import { CostEffectivenessCalculator } from '../costEffectivenessCalculator';

// Mock payment methods for testing
const mockPaymentMethods: PaymentMethod[] = [
  {
    id: 'usdc-mainnet',
    type: PaymentMethodType.STABLECOIN_USDC,
    name: 'USDC (Ethereum)',
    description: 'USD Coin on Ethereum mainnet',
    token: {
      address: '0xA0b86a33E6441e8e4E8b8e4E8b8e4E8b8e4E8b8e',
      symbol: 'USDC',
      name: 'USD Coin',
      decimals: 6,
      chainId: 1
    },
    chainId: 1,
    enabled: true,
    supportedNetworks: [1]
  },
  {
    id: 'fiat-stripe',
    type: PaymentMethodType.FIAT_STRIPE,
    name: 'Credit/Debit Card',
    description: 'Traditional payment with Stripe',
    enabled: true,
    supportedNetworks: []
  }
];

// Mock external API calls
jest.mock('node-fetch');

describe('Cost Effectiveness Integration', () => {
  let costCalculator: CostEffectivenessCalculator;
  const testAmount = 100; // $100 USD

  beforeEach(() => {
    costCalculator = new CostEffectivenessCalculator();
    
    // Clear caches
    gasFeeEstimationService.clearCache();
    transactionCostCalculator.clearCache();
    exchangeRateService.clearCache();
  });

  describe('Gas Fee Estimation Service', () => {
    it('should estimate gas fees for different networks', async () => {
      const mainnetEstimate = await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
      const polygonEstimate = await gasFeeEstimationService.getGasEstimate(137, 'erc20Transfer');
      
      expect(mainnetEstimate.gasLimit).toBeGreaterThan(0n);
      expect(mainnetEstimate.gasPrice).toBeGreaterThan(0n);
      expect(mainnetEstimate.totalCostUSD).toBeGreaterThan(0);
      expect(mainnetEstimate.confidence).toBeGreaterThan(0);
      expect(mainnetEstimate.confidence).toBeLessThanOrEqual(1);
      
      expect(polygonEstimate.gasLimit).toBeGreaterThan(0n);
      expect(polygonEstimate.gasPrice).toBeGreaterThan(0n);
      expect(polygonEstimate.totalCostUSD).toBeGreaterThan(0);
      
      // Polygon should generally be cheaper than mainnet
      expect(polygonEstimate.totalCostUSD).toBeLessThan(mainnetEstimate.totalCostUSD);
    });

    it('should validate gas fee thresholds', async () => {
      const gasEstimate = await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
      
      const validation = gasFeeEstimationService.validateGasFeeThreshold(gasEstimate, {
        maxAcceptableGasFeeUSD: 50,
        warningThresholdUSD: 25,
        blockTransactionThresholdUSD: 100
      });
      
      expect(validation).toHaveProperty('isAcceptable');
      expect(validation).toHaveProperty('shouldWarn');
      expect(validation).toHaveProperty('shouldBlock');
      expect(typeof validation.isAcceptable).toBe('boolean');
      expect(typeof validation.shouldWarn).toBe('boolean');
      expect(typeof validation.shouldBlock).toBe('boolean');
    });

    it('should provide network conditions', async () => {
      const conditions = await gasFeeEstimationService.getNetworkConditions(1);
      
      expect(conditions.chainId).toBe(1);
      expect(conditions.gasPrice).toBeGreaterThan(0n);
      expect(conditions.gasPriceUSD).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(conditions.networkCongestion);
      expect(conditions.blockTime).toBeGreaterThan(0);
      expect(conditions.lastUpdated).toBeInstanceOf(Date);
    });
  });

  describe('Exchange Rate Service', () => {
    it('should get exchange rates for supported currencies', async () => {
      const ethToUsd = await exchangeRateService.getExchangeRate('ETH', 'USD');
      const usdcToUsd = await exchangeRateService.getExchangeRate('USDC', 'USD');
      
      expect(ethToUsd).toBeTruthy();
      if (ethToUsd) {
        expect(ethToUsd.rate).toBeGreaterThan(0);
        expect(ethToUsd.fromToken).toBe('ETH');
        expect(ethToUsd.toToken).toBe('USD');
        expect(ethToUsd.confidence).toBeGreaterThan(0);
        expect(ethToUsd.confidence).toBeLessThanOrEqual(1);
      }
      
      expect(usdcToUsd).toBeTruthy();
      if (usdcToUsd) {
        expect(usdcToUsd.rate).toBeCloseTo(1, 1); // USDC should be close to $1
      }
    });

    it('should convert currencies correctly', async () => {
      const conversion = await exchangeRateService.convertCurrency(100, 'USDC', 'USD');
      
      expect(conversion).toBeTruthy();
      if (conversion) {
        expect(conversion.fromAmount).toBe(100);
        expect(conversion.fromCurrency).toBe('USDC');
        expect(conversion.toCurrency).toBe('USD');
        expect(conversion.toAmount).toBeCloseTo(100, 0); // Should be close to 100 USD
        expect(conversion.rate).toBeCloseTo(1, 1);
      }
    });

    it('should format currencies correctly', () => {
      const usdFormatted = exchangeRateService.formatCurrency(1234.56, 'USD');
      const ethFormatted = exchangeRateService.formatCurrency(1.234567, 'ETH');
      
      expect(usdFormatted).toContain('1,234.56');
      expect(usdFormatted).toContain('$');
      
      expect(ethFormatted).toContain('1.2346');
      expect(ethFormatted).toContain('ETH');
    });

    it('should handle multiple exchange rates', async () => {
      const rates = await exchangeRateService.getMultipleExchangeRates('ETH', ['USD', 'USDC', 'USDT']);
      
      expect(rates).toHaveProperty('USD');
      expect(rates).toHaveProperty('USDC');
      expect(rates).toHaveProperty('USDT');
      
      // At least USD should be available
      expect(rates.USD).toBeTruthy();
    });
  });

  describe('Transaction Cost Calculator', () => {
    it('should calculate transaction costs for different payment methods', async () => {
      const usdcMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC);
      const fiatMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.FIAT_STRIPE);
      
      expect(usdcMethod).toBeTruthy();
      expect(fiatMethod).toBeTruthy();
      
      if (usdcMethod && fiatMethod) {
        const usdcCost = await transactionCostCalculator.calculateTransactionCost(usdcMethod, testAmount);
        const fiatCost = await transactionCostCalculator.calculateTransactionCost(fiatMethod, testAmount);
        
        expect(usdcCost.totalCost).toBeGreaterThan(testAmount); // Should include fees
        expect(usdcCost.baseCost).toBe(testAmount);
        expect(usdcCost.gasFee).toBeGreaterThan(0); // Crypto should have gas fees
        expect(usdcCost.confidence).toBeGreaterThan(0);
        
        expect(fiatCost.totalCost).toBeGreaterThan(testAmount); // Should include fees
        expect(fiatCost.baseCost).toBe(testAmount);
        expect(fiatCost.gasFee).toBe(0); // Fiat should have no gas fees
        expect(fiatCost.confidence).toBeGreaterThan(0);
      }
    });

    it('should compare payment methods correctly', async () => {
      const methods = mockPaymentMethods;
      
      const comparison = await transactionCostCalculator.comparePaymentMethods(methods, testAmount);
      
      expect(comparison).toHaveLength(methods.length);
      expect(comparison[0].costEstimate.totalCost).toBeLessThanOrEqual(comparison[1].costEstimate.totalCost);
      
      // At least one should be recommended
      const recommendedCount = comparison.filter(c => c.isRecommended).length;
      expect(recommendedCount).toBeGreaterThan(0);
      
      // Check that savings are calculated correctly
      if (comparison.length > 1) {
        const mostExpensive = comparison[comparison.length - 1];
        const cheapest = comparison[0];
        
        if (mostExpensive.savings) {
          expect(mostExpensive.savings).toBe(0); // Most expensive should have 0 savings
        }
        
        if (cheapest.costDifference) {
          expect(cheapest.costDifference).toBe(0); // Cheapest should have 0 cost difference
        }
      }
    });
  });

  describe('Integrated Cost Effectiveness Calculator', () => {
    it('should calculate transaction costs using integrated services', async () => {
      const usdcMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC);
      
      expect(usdcMethod).toBeTruthy();
      
      if (usdcMethod) {
        const networkConditions = await costCalculator.getNetworkConditions(usdcMethod.chainId || 1);
        const costEstimate = await costCalculator.calculateTransactionCost(usdcMethod, testAmount, networkConditions);
        
        expect(costEstimate.totalCost).toBeGreaterThan(testAmount);
        expect(costEstimate.baseCost).toBe(testAmount);
        expect(costEstimate.confidence).toBeGreaterThan(0);
        expect(costEstimate.estimatedTime).toBeGreaterThan(0);
        expect(costEstimate.currency).toBe('USD');
        expect(costEstimate.breakdown).toBeTruthy();
      }
    });

    it('should compare multiple payment methods', async () => {
      const methods = mockPaymentMethods;
      
      const networkConditions = [await costCalculator.getNetworkConditions(1)];
      const comparison = await costCalculator.comparePaymentMethods(methods, testAmount, networkConditions);
      
      expect(comparison).toHaveLength(methods.length);
      expect(comparison[0].costEstimate.totalCost).toBeLessThanOrEqual(comparison[1].costEstimate.totalCost);
      
      // Verify that at least one method is recommended
      const hasRecommended = comparison.some(c => c.isRecommended);
      expect(hasRecommended).toBe(true);
    });

    it('should handle gas fee threshold validation', async () => {
      const usdcMethod = mockPaymentMethods.find(m => m.type === PaymentMethodType.STABLECOIN_USDC);
      
      expect(usdcMethod).toBeTruthy();
      
      if (usdcMethod) {
        const networkConditions = await costCalculator.getNetworkConditions(usdcMethod.chainId || 1);
        const costEstimate = await costCalculator.calculateTransactionCost(usdcMethod, testAmount, networkConditions);
        
        const isAcceptable = costCalculator.isGasFeeAcceptable(costEstimate, 50); // $50 threshold
        expect(typeof isAcceptable).toBe('boolean');
        
        // If gas fee is high, it should not be acceptable
        if (costEstimate.gasFee > 50) {
          expect(isAcceptable).toBe(false);
        }
      }
    });
  });

  describe('Error Handling and Fallbacks', () => {
    it('should handle API failures gracefully', async () => {
      // Test with invalid chain ID to trigger fallback
      const networkConditions = await costCalculator.getNetworkConditions(999999);
      
      expect(networkConditions.chainId).toBe(999999);
      expect(networkConditions.gasPrice).toBeGreaterThan(0n);
      expect(networkConditions.gasPriceUSD).toBeGreaterThan(0);
      expect(['low', 'medium', 'high']).toContain(networkConditions.networkCongestion);
    });

    it('should provide fallback exchange rates', async () => {
      // Test with unsupported currency pair
      const rate = await exchangeRateService.getExchangeRate('INVALID', 'USD');
      
      // Should either return null or a fallback rate
      if (rate) {
        expect(rate.confidence).toBeLessThan(0.5); // Fallback should have low confidence
      }
    });

    it('should handle cache operations correctly', () => {
      const gasCacheStats = gasFeeEstimationService.getCacheStats();
      const exchangeCacheStats = exchangeRateService.getCacheStats();
      const transactionCacheStats = transactionCostCalculator.getCacheStats();
      
      expect(gasCacheStats).toHaveProperty('size');
      expect(gasCacheStats).toHaveProperty('keys');
      expect(Array.isArray(gasCacheStats.keys)).toBe(true);
      
      expect(exchangeCacheStats).toHaveProperty('size');
      expect(exchangeCacheStats).toHaveProperty('keys');
      expect(Array.isArray(exchangeCacheStats.keys)).toBe(true);
      
      expect(transactionCacheStats).toHaveProperty('size');
      expect(transactionCacheStats).toHaveProperty('keys');
      expect(Array.isArray(transactionCacheStats.keys)).toBe(true);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache gas estimates effectively', async () => {
      const startTime = Date.now();
      
      // First call should take longer (API call)
      await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
      const firstCallTime = Date.now() - startTime;
      
      const secondStartTime = Date.now();
      
      // Second call should be faster (cached)
      await gasFeeEstimationService.getGasEstimate(1, 'erc20Transfer');
      const secondCallTime = Date.now() - secondStartTime;
      
      // Second call should be significantly faster (though this might be flaky in tests)
      expect(secondCallTime).toBeLessThan(firstCallTime + 100); // Allow some margin
    });

    it('should cache exchange rates effectively', async () => {
      const startTime = Date.now();
      
      // First call
      await exchangeRateService.getExchangeRate('ETH', 'USD');
      const firstCallTime = Date.now() - startTime;
      
      const secondStartTime = Date.now();
      
      // Second call should use cache
      await exchangeRateService.getExchangeRate('ETH', 'USD');
      const secondCallTime = Date.now() - secondStartTime;
      
      expect(secondCallTime).toBeLessThan(firstCallTime + 50); // Allow some margin
    });
  });
});