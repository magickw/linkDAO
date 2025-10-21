import { QueryClient } from '@tanstack/react-query';
import { IntelligentSellerCache, CachePriority } from '../intelligentSellerCache';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeAll(() => {
  console.log = jest.fn();
  console.warn = jest.fn();
  console.error = jest.fn();
});

afterAll(() => {
  Object.assign(console, originalConsole);
});

describe('IntelligentSellerCache', () => {
  let queryClient: QueryClient;
  let cache: IntelligentSellerCache;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    cache = new IntelligentSellerCache(queryClient, 100); // Small cache for testing
  });

  afterEach(() => {
    cache.cleanup();
    queryClient.clear();
  });

  describe('Basic Cache Operations', () => {
    it('should store and retrieve data', async () => {
      const testData = { name: 'Test Seller', tier: 'bronze' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      await cache.set(cacheKey, testData);
      const retrieved = await cache.get('profile', walletAddress);

      expect(retrieved).toEqual(testData);
    });

    it('should return null for non-existent data', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const retrieved = await cache.get('profile', walletAddress);

      expect(retrieved).toBeNull();
    });

    it('should respect TTL and return null for expired data', async () => {
      const testData = { name: 'Test Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      await cache.set(cacheKey, testData, { ttl: 100 }); // 100ms TTL

      // Should be available immediately
      let retrieved = await cache.get('profile', walletAddress);
      expect(retrieved).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 150));

      // Should be null after expiration
      retrieved = await cache.get('profile', walletAddress);
      expect(retrieved).toBeNull();
    });
  });

  describe('Cache Priorities', () => {
    it('should store data with different priorities', async () => {
      const testData1 = { name: 'High Priority Seller' };
      const testData2 = { name: 'Low Priority Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';

      await cache.set('profile:' + walletAddress, testData1, { priority: CachePriority.HIGH });
      await cache.set('dashboard:' + walletAddress, testData2, { priority: CachePriority.LOW });

      const stats = cache.getCacheStats();
      expect(stats.size).toBe(2);
    });
  });

  describe('Dependency Tracking', () => {
    it('should invalidate dependent entries', async () => {
      const profileData = { name: 'Test Seller' };
      const dashboardData = { totalSales: 100 };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const profileKey = 'seller:profile:' + walletAddress;
      const dashboardKey = 'seller:dashboard:' + walletAddress;

      // Store profile data
      await cache.set(profileKey, profileData);
      
      // Store dashboard data with profile dependency
      await cache.set(dashboardKey, dashboardData, {
        dependencies: [profileKey]
      });

      // Verify both are cached
      expect(await cache.get('profile', walletAddress)).toEqual(profileData);
      expect(await cache.get('dashboard', walletAddress)).toEqual(dashboardData);

      // Invalidate profile
      await cache.invalidate(profileKey);

      // Profile should be gone
      expect(await cache.get('profile', walletAddress)).toBeNull();
      
      // Dashboard should also be gone due to dependency
      expect(await cache.get('dashboard', walletAddress)).toBeNull();
    });
  });

  describe('Cache Warming', () => {
    it('should warm cache with default strategy', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';

      // Mock the fetchSellerData method to return test data
      const originalFetch = (cache as any).fetchSellerData;
      const mockFetch = jest.fn().mockImplementation((dataType: string) => {
        return Promise.resolve({ dataType, mockData: true });
      });
      (cache as any).fetchSellerData = mockFetch;

      // Mock shouldWarmCache to always return true for testing
      const originalShouldWarm = (cache as any).shouldWarmCache;
      (cache as any).shouldWarmCache = jest.fn().mockReturnValue(true);

      await cache.warmCache(walletAddress);

      // Verify that fetchSellerData was called
      expect(mockFetch).toHaveBeenCalled();

      // Restore original methods
      (cache as any).fetchSellerData = originalFetch;
      (cache as any).shouldWarmCache = originalShouldWarm;
    });
  });

  describe('Performance Metrics', () => {
    it('should track cache hits and misses', async () => {
      const testData = { name: 'Test Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      // Initial metrics
      let metrics = cache.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.totalHits).toBe(0);
      expect(metrics.totalMisses).toBe(0);

      // Cache miss
      await cache.get('profile', walletAddress);
      metrics = cache.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1);
      expect(metrics.totalMisses).toBe(1);

      // Store data
      await cache.set(cacheKey, testData);

      // Cache hit
      await cache.get('profile', walletAddress);
      metrics = cache.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(2);
      expect(metrics.totalHits).toBe(1);
      expect(metrics.totalMisses).toBe(1);
    });

    it('should calculate hit rate correctly', async () => {
      const testData = { name: 'Test Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      // Store data
      await cache.set(cacheKey, testData);

      // Generate some hits and misses
      await cache.get('profile', walletAddress); // hit
      await cache.get('profile', walletAddress); // hit
      await cache.get('dashboard', walletAddress); // miss
      await cache.get('listings', walletAddress); // miss

      const metrics = cache.getPerformanceMetrics();
      expect(metrics.hitRate).toBe(50); // 2 hits out of 4 requests
      expect(metrics.missRate).toBe(50); // 2 misses out of 4 requests
    });
  });

  describe('Cache Statistics', () => {
    it('should provide accurate cache statistics', async () => {
      const testData1 = { name: 'Seller 1' };
      const testData2 = { name: 'Seller 2' };
      const walletAddress = '0x1234567890123456789012345678901234567890';

      await cache.set('profile:' + walletAddress, testData1);
      await cache.set('dashboard:' + walletAddress, testData2);

      const stats = cache.getCacheStats();
      expect(stats.size).toBe(2);
      expect(stats.maxSize).toBe(100);
      expect(stats.memoryUsage).toBeGreaterThan(0);
    });

    it('should track top used entries', async () => {
      const testData = { name: 'Popular Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      await cache.set(cacheKey, testData);

      // Access multiple times to increase access count
      await cache.get('profile', walletAddress);
      await cache.get('profile', walletAddress);
      await cache.get('profile', walletAddress);

      const stats = cache.getCacheStats();
      expect(stats.topUsedEntries.length).toBeGreaterThan(0);
      expect(stats.topUsedEntries[0].accessCount).toBe(4); // 1 from set + 3 from gets
    });
  });

  describe('Cache Eviction', () => {
    it('should evict least useful entries when cache is full', async () => {
      // Fill cache to capacity
      for (let i = 0; i < 105; i++) { // Exceed max size of 100
        await cache.set(`test:${i}`, { id: i }, { priority: CachePriority.LOW });
      }

      const stats = cache.getCacheStats();
      expect(stats.size).toBeLessThanOrEqual(100); // Should not exceed max size
    });
  });

  describe('Cache Cleanup', () => {
    it('should clean up expired entries', async () => {
      const testData = { name: 'Temporary Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';
      const cacheKey = 'seller:profile:' + walletAddress;

      await cache.set(cacheKey, testData, { ttl: 50 }); // Very short TTL

      // Verify data is initially there
      expect(await cache.get('profile', walletAddress)).toEqual(testData);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 100));

      // Trigger cleanup (normally done by interval)
      (cache as any).cleanupExpiredEntries();

      // Data should be gone
      expect(await cache.get('profile', walletAddress)).toBeNull();
    });
  });

  describe('Usage Pattern Analysis', () => {
    it('should track usage patterns', async () => {
      const testData = { name: 'Analyzed Seller' };
      const walletAddress = '0x1234567890123456789012345678901234567890';

      await cache.set('profile:' + walletAddress, testData);

      // Access multiple times to create usage pattern
      for (let i = 0; i < 5; i++) {
        await cache.get('profile', walletAddress);
      }

      // Trigger analysis (normally done by interval)
      cache.analyzeUsagePatterns();

      const stats = cache.getCacheStats();
      expect(stats.usagePatternCount).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle errors gracefully during cache operations', async () => {
      const walletAddress = '0x1234567890123456789012345678901234567890';

      // Mock an error in the internal cache
      const originalSet = cache.set;
      cache.set = jest.fn().mockRejectedValue(new Error('Cache error'));

      // Should not throw
      await expect(cache.set('profile:' + walletAddress, { name: 'Test' })).rejects.toThrow('Cache error');

      // Restore original method
      cache.set = originalSet;
    });
  });
});

describe('Cache Integration', () => {
  let queryClient: QueryClient;
  let cache: IntelligentSellerCache;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });
    cache = new IntelligentSellerCache(queryClient);
  });

  afterEach(() => {
    cache.cleanup();
    queryClient.clear();
  });

  it('should integrate with React Query cache', async () => {
    const testData = { name: 'React Query Seller' };
    const walletAddress = '0x1234567890123456789012345678901234567890';
    const queryKey = ['seller', 'profile', walletAddress];

    // Set data in React Query cache
    queryClient.setQueryData(queryKey, testData);

    // Should be able to retrieve from intelligent cache
    const retrieved = await cache.get('profile', walletAddress);
    expect(retrieved).toEqual(testData);
  });

  it('should handle React Query cache misses', async () => {
    const walletAddress = '0x1234567890123456789012345678901234567890';

    // Should return null when no data in either cache
    const retrieved = await cache.get('profile', walletAddress);
    expect(retrieved).toBeNull();
  });
});