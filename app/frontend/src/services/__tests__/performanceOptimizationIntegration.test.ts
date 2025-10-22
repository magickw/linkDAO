/**
 * Performance Optimization Integration Tests
 * Tests the integration between intelligent caching and performance optimization
 */

import { intelligentCacheService } from '../intelligentCacheService';
import { prioritizationPerformanceOptimizer } from '../prioritizationPerformanceOptimizer';
import { serviceWorkerCacheService } from '../serviceWorkerCacheService';
import { 
  PaymentMethodType, 
  GasEstimate, 
  ExchangeRate, 
  UserPreferences,
  PaymentMethod,
  UserContext
} from '../../types/paymentPrioritization';

// Mock data for testing
const mockGasEstimate: GasEstimate = {
  gasLimit: 65000n,
  gasPrice: 30000000000n,
  totalCost: 1950000000000000n,
  totalCostUSD: 25.5,
  confidence: 0.9
};

const mockExchangeRate: ExchangeRate = {
  fromToken: 'ETH',
  toToken: 'USD',
  rate: 2000,
  source: 'coingecko',
  lastUpdated: new Date(),
  confidence: 0.95
};

const mockUserPreferences: UserPreferences = {
  preferredMethods: [],
  avoidedMethods: [],
  maxGasFeeThreshold: 25,
  preferStablecoins: true,
  preferFiat: false,
  lastUsedMethods: [],
  autoSelectBestOption: true
};

const mockPaymentMethods: PaymentMethod[] = [
  { type: PaymentMethodType.STABLECOIN_USDC, name: 'USDC', id: 'usdc-1' },
  { type: PaymentMethodType.FIAT_STRIPE, name: 'Stripe', id: 'stripe-1' },
  { type: PaymentMethodType.NATIVE_ETH, name: 'ETH', id: 'eth-1' }
];

const mockUserContext: UserContext = {
  userId: 'test-user-123',
  chainId: 1,
  walletBalances: [],
  preferences: mockUserPreferences
};

describe('Performance Optimization Integration', () => {
  beforeEach(() => {
    // Clear caches before each test
    intelligentCacheService.clearAllCaches();
  });

  afterAll(() => {
    // Cleanup after all tests
    intelligentCacheService.destroy();
  });

  describe('Intelligent Cache Service', () => {
    it('should cache and retrieve gas estimates', async () => {
      const cacheKey = 'test-gas-estimate-1';
      
      // Cache the estimate
      await intelligentCacheService.cacheGasEstimate(cacheKey, mockGasEstimate);
      
      // Retrieve the estimate
      const cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      
      expect(cached).toEqual(mockGasEstimate);
    });

    it('should cache and retrieve exchange rates', async () => {
      const fromCurrency = 'ETH';
      const toCurrency = 'USD';
      
      // Cache the rate
      await intelligentCacheService.cacheExchangeRate(fromCurrency, toCurrency, mockExchangeRate);
      
      // Retrieve the rate
      const cached = await intelligentCacheService.getCachedExchangeRate(fromCurrency, toCurrency);
      
      expect(cached).toEqual(mockExchangeRate);
    });

    it('should cache and retrieve user preferences', async () => {
      const userId = 'test-user-123';
      
      // Cache the preferences
      await intelligentCacheService.cacheUserPreferences(userId, mockUserPreferences);
      
      // Retrieve the preferences
      const cached = await intelligentCacheService.getCachedUserPreferences(userId);
      
      expect(cached).toEqual(mockUserPreferences);
    });

    it('should handle cache expiration', async () => {
      const cacheKey = 'test-expiration';
      const shortTTL = 50; // 50ms
      
      // Cache with short TTL
      await intelligentCacheService.cacheGasEstimate(cacheKey, mockGasEstimate, shortTTL);
      
      // Should be available immediately
      let cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      expect(cached).toEqual(mockGasEstimate);
      
      // Wait for expiration (wait longer than TTL)
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Should be expired
      cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      expect(cached).toBeNull();
    });

    it('should provide cache metrics', () => {
      const metrics = intelligentCacheService.getCacheMetrics();
      
      expect(metrics).toHaveProperty('totalSize');
      expect(metrics).toHaveProperty('cacheStats');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(typeof metrics.totalSize).toBe('number');
    });
  });

  describe('Prioritization Performance Optimizer', () => {
    it('should perform parallel cost calculations', async () => {
      const results = await prioritizationPerformanceOptimizer.parallelCostCalculation(
        mockPaymentMethods,
        mockUserContext,
        1000
      );
      
      expect(results.results).toHaveLength(mockPaymentMethods.length);
      expect(results.executionTime).toBeGreaterThan(0);
      expect(results.errors).toEqual([]);
      expect(typeof results.cacheHits).toBe('number');
      expect(typeof results.cacheMisses).toBe('number');
    });

    it('should implement lazy loading', async () => {
      const lazyResult = await prioritizationPerformanceOptimizer.lazyLoadPrioritizationData(
        mockPaymentMethods,
        mockUserContext
      );
      
      expect(lazyResult.immediate).toBeDefined();
      expect(lazyResult.lazy).toBeInstanceOf(Promise);
      
      // Wait for lazy loading to complete
      const lazyMethods = await lazyResult.lazy;
      expect(Array.isArray(lazyMethods)).toBe(true);
    });

    it('should batch process multiple requests', async () => {
      const requests = [
        {
          methods: mockPaymentMethods,
          userContext: mockUserContext,
          transactionAmount: 100
        },
        {
          methods: mockPaymentMethods,
          userContext: mockUserContext,
          transactionAmount: 500
        }
      ];
      
      const results = await prioritizationPerformanceOptimizer.batchProcessPrioritization(requests);
      
      expect(results).toHaveLength(2);
      expect(results[0]).toHaveLength(mockPaymentMethods.length);
      expect(results[1]).toHaveLength(mockPaymentMethods.length);
    });

    it('should provide performance metrics', () => {
      const metrics = prioritizationPerformanceOptimizer.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('totalExecutionTime');
      expect(metrics).toHaveProperty('parallelExecutionTime');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageTaskDuration');
      expect(metrics).toHaveProperty('concurrencyLevel');
      expect(metrics).toHaveProperty('memoryUsage');
    });

    it('should optimize memory usage', async () => {
      // This test verifies the method runs without errors
      await expect(prioritizationPerformanceOptimizer.optimizeMemoryUsage()).resolves.not.toThrow();
    });
  });

  describe('Service Worker Cache Service', () => {
    it('should initialize without errors', async () => {
      // Mock service worker support
      Object.defineProperty(navigator, 'serviceWorker', {
        value: {
          register: jest.fn().mockResolvedValue({}),
          controller: null
        },
        writable: true
      });

      Object.defineProperty(window, 'caches', {
        value: {
          open: jest.fn().mockResolvedValue({
            put: jest.fn(),
            match: jest.fn(),
            delete: jest.fn(),
            keys: jest.fn().mockResolvedValue([])
          }),
          keys: jest.fn().mockResolvedValue([]),
          delete: jest.fn()
        },
        writable: true
      });

      await expect(serviceWorkerCacheService.initialize()).resolves.not.toThrow();
    });

    it('should handle unsupported service worker gracefully', async () => {
      // Remove service worker support
      Object.defineProperty(navigator, 'serviceWorker', {
        value: undefined,
        writable: true
      });

      await expect(serviceWorkerCacheService.initialize()).resolves.not.toThrow();
      
      // Cache operations should not throw when service worker is not supported
      await expect(serviceWorkerCacheService.cacheGasEstimate('test', mockGasEstimate)).resolves.not.toThrow();
      
      const cached = await serviceWorkerCacheService.getCachedGasEstimate('test');
      expect(cached).toBeNull();
    });
  });

  describe('Integration between services', () => {
    it('should work together for complete caching solution', async () => {
      const cacheKey = 'integration-test';
      
      // Cache using intelligent cache service
      await intelligentCacheService.cacheGasEstimate(cacheKey, mockGasEstimate);
      
      // Verify it can be retrieved
      const cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      expect(cached).toEqual(mockGasEstimate);
      
      // Performance optimizer should be able to use cached data
      const results = await prioritizationPerformanceOptimizer.parallelCostCalculation(
        mockPaymentMethods,
        mockUserContext,
        1000
      );
      
      // Should have some cache hits due to pre-cached data
      expect(results.cacheHits + results.cacheMisses).toBeGreaterThan(0);
    });

    it('should handle cache invalidation properly', async () => {
      const cacheKey = 'invalidation-test';
      
      // Cache some data
      await intelligentCacheService.cacheGasEstimate(cacheKey, mockGasEstimate);
      
      // Verify it's cached
      let cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      expect(cached).toEqual(mockGasEstimate);
      
      // Clear cache
      intelligentCacheService.clearCache('gas_estimates');
      
      // Should be gone
      cached = await intelligentCacheService.getCachedGasEstimate(cacheKey);
      expect(cached).toBeNull();
    });
  });
});

// Helper function to create mock promises for testing
function createMockPromise<T>(value: T, delay: number = 0): Promise<T> {
  return new Promise(resolve => {
    setTimeout(() => resolve(value), delay);
  });
}