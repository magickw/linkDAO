/**
 * Caching Strategies Performance Tests
 * Tests for intelligent caching, service worker cache, and multi-level cache performance
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { CachingStrategiesService } from '../../services/cachingStrategiesService';
import { ServiceWorkerCacheService } from '../../services/serviceWorkerCacheService';
import { IntelligentCacheService } from '../../services/intelligentCacheService';
import Redis from 'ioredis';

describe('Caching Strategies Performance Tests', () => {
  let cachingService: CachingStrategiesService;
  let swCacheService: ServiceWorkerCacheService;
  let intelligentCache: IntelligentCacheService;
  let redis: Redis;

  beforeAll(async () => {
    // Initialize Redis for testing
    redis = new Redis({
      host: process.env.TEST_REDIS_HOST || 'localhost',
      port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
      db: 15, // Use separate DB for performance tests
      retryDelayOnFailover: 100,
      maxRetriesPerRequest: 3,
    });

    // Initialize caching services
    cachingService = new CachingStrategiesService({
      redis: {
        host: 'localhost',
        port: 6379,
        db: 15,
        keyPrefix: 'perf_test:',
      },
      memory: {
        maxSize: 10000,
        ttl: 300000, // 5 minutes
      },
    });

    swCacheService = new ServiceWorkerCacheService();
    intelligentCache = new IntelligentCacheService(cachingService);

    await cachingService.initialize();
    await intelligentCache.initialize();
  });

  afterAll(async () => {
    await cachingService?.close();
    await redis?.quit();
  });

  beforeEach(async () => {
    // Clear all caches before each test
    await redis.flushdb();
    await cachingService.clear();
  });

  describe('Cache Strategy Performance', () => {
    it('should benchmark NetworkFirst strategy performance', async () => {
      const iterations = 1000;
      const testData = { id: 1, content: 'test data', timestamp: Date.now() };
      
      // Mock network fetch with controlled delay
      const mockFetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(testData), 50) // 50ms network delay
        )
      );

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        await swCacheService.cacheWithStrategy(
          `test-key-${i}`,
          mockFetch,
          'NetworkFirst',
          { maxAge: 300000 }
        );
        
        const end = performance.now();
        times.push(end - start);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const p95Time = times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)];
      const maxTime = Math.max(...times);

      // Performance assertions
      expect(averageTime).toBeLessThan(60); // Average should be close to network delay
      expect(p95Time).toBeLessThan(100); // 95th percentile should be reasonable
      expect(maxTime).toBeLessThan(200); // No request should be extremely slow

      safeLogger.info(`NetworkFirst Strategy Performance:
        Average: ${averageTime.toFixed(2)}ms
        P95: ${p95Time.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should benchmark CacheFirst strategy performance', async () => {
      const iterations = 1000;
      const testData = { id: 1, content: 'cached data', timestamp: Date.now() };
      
      // Pre-populate cache
      for (let i = 0; i < iterations; i++) {
        await cachingService.set(`cache-first-${i}`, testData, 300);
      }

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const result = await swCacheService.cacheWithStrategy(
          `cache-first-${i}`,
          () => Promise.resolve(testData),
          'CacheFirst',
          { maxAge: 300000 }
        );
        
        const end = performance.now();
        times.push(end - start);
        
        expect(result).toEqual(testData);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Cache hits should be very fast
      expect(averageTime).toBeLessThan(5);
      expect(maxTime).toBeLessThan(20);

      safeLogger.info(`CacheFirst Strategy Performance:
        Average: ${averageTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });

    it('should benchmark StaleWhileRevalidate strategy performance', async () => {
      const iterations = 500;
      const testData = { id: 1, content: 'stale data', timestamp: Date.now() };
      
      // Pre-populate with stale data
      for (let i = 0; i < iterations; i++) {
        await cachingService.set(`swr-${i}`, testData, 1); // 1ms TTL (immediately stale)
      }

      // Wait for data to become stale
      await new Promise(resolve => setTimeout(resolve, 10));

      const mockFetch = jest.fn().mockImplementation(() => 
        Promise.resolve({ ...testData, updated: true })
      );

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        const result = await swCacheService.cacheWithStrategy(
          `swr-${i}`,
          mockFetch,
          'StaleWhileRevalidate',
          { maxAge: 300000 }
        );
        
        const end = performance.now();
        times.push(end - start);
        
        // Should return stale data immediately
        expect(result).toBeDefined();
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      // Should return stale data quickly while revalidating in background
      expect(averageTime).toBeLessThan(10);
      expect(maxTime).toBeLessThan(50);

      safeLogger.info(`StaleWhileRevalidate Strategy Performance:
        Average: ${averageTime.toFixed(2)}ms
        Max: ${maxTime.toFixed(2)}ms`);
    });
  });

  describe('Multi-Level Cache Performance', () => {
    it('should benchmark memory cache performance', async () => {
      const iterations = 10000;
      const testData = { id: 1, content: 'memory cached data' };

      // Benchmark cache sets
      const setTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cachingService.setMemory(`mem-${i}`, testData, 300);
        const end = performance.now();
        setTimes.push(end - start);
      }

      // Benchmark cache gets
      const getTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await cachingService.getMemory(`mem-${i}`);
        const end = performance.now();
        getTimes.push(end - start);
        expect(result).toEqual(testData);
      }

      const avgSetTime = setTimes.reduce((sum, time) => sum + time, 0) / setTimes.length;
      const avgGetTime = getTimes.reduce((sum, time) => sum + time, 0) / getTimes.length;

      // Memory cache should be extremely fast
      expect(avgSetTime).toBeLessThan(0.1);
      expect(avgGetTime).toBeLessThan(0.05);

      safeLogger.info(`Memory Cache Performance:
        Average Set: ${avgSetTime.toFixed(4)}ms
        Average Get: ${avgGetTime.toFixed(4)}ms`);
    });

    it('should benchmark Redis cache performance', async () => {
      const iterations = 1000;
      const testData = { id: 1, content: 'redis cached data', large: 'x'.repeat(10000) };

      // Benchmark Redis sets
      const setTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await cachingService.setRedis(`redis-${i}`, testData, 300);
        const end = performance.now();
        setTimes.push(end - start);
      }

      // Benchmark Redis gets
      const getTimes: number[] = [];
      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        const result = await cachingService.getRedis(`redis-${i}`);
        const end = performance.now();
        getTimes.push(end - start);
        expect(result).toEqual(testData);
      }

      const avgSetTime = setTimes.reduce((sum, time) => sum + time, 0) / setTimes.length;
      const avgGetTime = getTimes.reduce((sum, time) => sum + time, 0) / getTimes.length;

      // Redis should be fast but slower than memory
      expect(avgSetTime).toBeLessThan(5);
      expect(avgGetTime).toBeLessThan(3);

      safeLogger.info(`Redis Cache Performance:
        Average Set: ${avgSetTime.toFixed(2)}ms
        Average Get: ${avgGetTime.toFixed(2)}ms`);
    });

    it('should benchmark cache hierarchy performance', async () => {
      const iterations = 1000;
      const testData = { id: 1, content: 'hierarchical data' };

      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        
        // Try to get from cache hierarchy (memory -> redis -> fallback)
        const result = await cachingService.get(`hierarchy-${i}`, async () => {
          // Simulate expensive operation
          await new Promise(resolve => setTimeout(resolve, 10));
          return testData;
        });
        
        const end = performance.now();
        times.push(end - start);
        expect(result).toEqual(testData);
      }

      // First call should be slow (fallback), subsequent calls should be fast (cached)
      const firstCallTime = times[0];
      const subsequentCallsAvg = times.slice(1).reduce((sum, time) => sum + time, 0) / (times.length - 1);

      expect(firstCallTime).toBeGreaterThan(8); // Should include fallback time
      expect(subsequentCallsAvg).toBeLessThan(2); // Should be cached

      safeLogger.info(`Cache Hierarchy Performance:
        First Call: ${firstCallTime.toFixed(2)}ms
        Subsequent Calls Average: ${subsequentCallsAvg.toFixed(2)}ms`);
    });
  });

  describe('Intelligent Cache Performance', () => {
    it('should benchmark predictive preloading performance', async () => {
      const userActions = Array.from({ length: 100 }, (_, i) => ({
        userId: `user-${i % 10}`,
        action: 'view_post',
        context: { postId: `post-${i}`, category: 'tech' }
      }));

      const preloadTimes: number[] = [];

      for (const action of userActions) {
        const start = performance.now();
        
        await intelligentCache.analyzeAndPreload(
          action.userId,
          action.action,
          action.context
        );
        
        const end = performance.now();
        preloadTimes.push(end - start);
      }

      const avgPreloadTime = preloadTimes.reduce((sum, time) => sum + time, 0) / preloadTimes.length;
      const maxPreloadTime = Math.max(...preloadTimes);

      // Predictive preloading should not block user actions
      expect(avgPreloadTime).toBeLessThan(20);
      expect(maxPreloadTime).toBeLessThan(100);

      safeLogger.info(`Predictive Preloading Performance:
        Average: ${avgPreloadTime.toFixed(2)}ms
        Max: ${maxPreloadTime.toFixed(2)}ms`);
    });

    it('should benchmark cache invalidation performance', async () => {
      const iterations = 1000;
      
      // Populate cache with tagged entries
      for (let i = 0; i < iterations; i++) {
        await cachingService.set(
          `tagged-${i}`,
          { data: `item-${i}` },
          300,
          [`tag-${i % 10}`, 'global']
        );
      }

      const invalidationTimes: number[] = [];

      // Test invalidation by tags
      for (let i = 0; i < 10; i++) {
        const start = performance.now();
        
        await intelligentCache.invalidateByTags([`tag-${i}`]);
        
        const end = performance.now();
        invalidationTimes.push(end - start);
      }

      const avgInvalidationTime = invalidationTimes.reduce((sum, time) => sum + time, 0) / invalidationTimes.length;
      const maxInvalidationTime = Math.max(...invalidationTimes);

      // Cache invalidation should be efficient
      expect(avgInvalidationTime).toBeLessThan(50);
      expect(maxInvalidationTime).toBeLessThan(200);

      safeLogger.info(`Cache Invalidation Performance:
        Average: ${avgInvalidationTime.toFixed(2)}ms
        Max: ${maxInvalidationTime.toFixed(2)}ms`);
    });

    it('should benchmark offline action queuing performance', async () => {
      const actions = Array.from({ length: 1000 }, (_, i) => ({
        id: `action-${i}`,
        type: 'create_post',
        data: { title: `Post ${i}`, content: 'x'.repeat(1000) },
        timestamp: Date.now(),
        priority: Math.floor(Math.random() * 3)
      }));

      const queueTimes: number[] = [];

      for (const action of actions) {
        const start = performance.now();
        
        await intelligentCache.queueOfflineAction(action);
        
        const end = performance.now();
        queueTimes.push(end - start);
      }

      const avgQueueTime = queueTimes.reduce((sum, time) => sum + time, 0) / queueTimes.length;
      const maxQueueTime = Math.max(...queueTimes);

      // Offline action queuing should be very fast
      expect(avgQueueTime).toBeLessThan(2);
      expect(maxQueueTime).toBeLessThan(10);

      safeLogger.info(`Offline Action Queuing Performance:
        Average: ${avgQueueTime.toFixed(2)}ms
        Max: ${maxQueueTime.toFixed(2)}ms`);
    });
  });

  describe('Cache Compression Performance', () => {
    it('should benchmark cache compression efficiency', async () => {
      const largeData = {
        id: 1,
        content: 'x'.repeat(100000), // 100KB of data
        metadata: Array.from({ length: 1000 }, (_, i) => ({
          key: `key-${i}`,
          value: `value-${i}`.repeat(10)
        }))
      };

      // Test without compression
      const uncompressedStart = performance.now();
      await cachingService.set('large-uncompressed', largeData, 300, [], false);
      const uncompressedSetTime = performance.now() - uncompressedStart;

      const uncompressedGetStart = performance.now();
      const uncompressedResult = await cachingService.get('large-uncompressed');
      const uncompressedGetTime = performance.now() - uncompressedGetStart;

      // Test with compression
      const compressedStart = performance.now();
      await cachingService.set('large-compressed', largeData, 300, [], true);
      const compressedSetTime = performance.now() - compressedStart;

      const compressedGetStart = performance.now();
      const compressedResult = await cachingService.get('large-compressed');
      const compressedGetTime = performance.now() - compressedGetStart;

      expect(uncompressedResult).toEqual(largeData);
      expect(compressedResult).toEqual(largeData);

      // Compression should not significantly impact performance for reasonable data sizes
      expect(compressedSetTime).toBeLessThan(uncompressedSetTime * 2);
      expect(compressedGetTime).toBeLessThan(uncompressedGetTime * 2);

      safeLogger.info(`Cache Compression Performance:
        Uncompressed Set: ${uncompressedSetTime.toFixed(2)}ms
        Compressed Set: ${compressedSetTime.toFixed(2)}ms
        Uncompressed Get: ${uncompressedGetTime.toFixed(2)}ms
        Compressed Get: ${compressedGetTime.toFixed(2)}ms`);
    });
  });

  describe('Concurrent Cache Access Performance', () => {
    it('should handle concurrent cache operations efficiently', async () => {
      const concurrentOperations = 100;
      const testData = { id: 1, content: 'concurrent test data' };

      // Test concurrent sets
      const setConcurrentStart = performance.now();
      const setPromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cachingService.set(`concurrent-set-${i}`, { ...testData, id: i }, 300)
      );
      await Promise.all(setPromises);
      const setConcurrentTime = performance.now() - setConcurrentStart;

      // Test concurrent gets
      const getConcurrentStart = performance.now();
      const getPromises = Array.from({ length: concurrentOperations }, (_, i) =>
        cachingService.get(`concurrent-set-${i}`)
      );
      const results = await Promise.all(getPromises);
      const getConcurrentTime = performance.now() - getConcurrentStart;

      // Verify all operations completed successfully
      expect(results).toHaveLength(concurrentOperations);
      results.forEach((result, i) => {
        expect(result).toEqual({ ...testData, id: i });
      });

      // Concurrent operations should be efficient
      const avgSetTime = setConcurrentTime / concurrentOperations;
      const avgGetTime = getConcurrentTime / concurrentOperations;

      expect(avgSetTime).toBeLessThan(10);
      expect(avgGetTime).toBeLessThan(5);

      safeLogger.info(`Concurrent Cache Operations Performance:
        ${concurrentOperations} concurrent sets: ${setConcurrentTime.toFixed(2)}ms (${avgSetTime.toFixed(2)}ms avg)
        ${concurrentOperations} concurrent gets: ${getConcurrentTime.toFixed(2)}ms (${avgGetTime.toFixed(2)}ms avg)`);
    });

    it('should handle cache contention gracefully', async () => {
      const contentionKey = 'contention-test';
      const concurrentAccess = 50;
      const testData = { counter: 0 };

      // Simulate cache contention with read-modify-write operations
      const contentionStart = performance.now();
      
      const contentionPromises = Array.from({ length: concurrentAccess }, async (_, i) => {
        const current = await cachingService.get(contentionKey) || testData;
        const updated = { counter: current.counter + 1 };
        await cachingService.set(contentionKey, updated, 300);
        return updated;
      });

      const results = await Promise.all(contentionPromises);
      const contentionTime = performance.now() - contentionStart;

      // Should handle contention without errors
      expect(results).toHaveLength(concurrentAccess);
      
      // Final value should be consistent
      const finalValue = await cachingService.get(contentionKey);
      expect(finalValue).toBeDefined();

      const avgContentionTime = contentionTime / concurrentAccess;
      expect(avgContentionTime).toBeLessThan(20);

      safeLogger.info(`Cache Contention Performance:
        ${concurrentAccess} concurrent read-modify-write operations: ${contentionTime.toFixed(2)}ms (${avgContentionTime.toFixed(2)}ms avg)`);
    });
  });
});
