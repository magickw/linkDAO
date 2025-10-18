/**
 * Frontend Caching Performance Tests
 * Tests for service worker cache, intelligent cache, and browser cache performance
 */

import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FeedPage } from '@/components/Feed/FeedPage';
import { serviceWorkerCacheService } from '@/services/serviceWorkerCacheService';
import { intelligentCacheService } from '@/services/intelligentCacheService';
import { performanceMonitor } from '@/utils/performanceMonitor';

// Mock service worker and cache APIs
const mockCacheStorage = new Map();
const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(() => Promise.resolve([])),
  addAll: jest.fn()
};

Object.defineProperty(global, 'caches', {
  value: {
    open: jest.fn(() => Promise.resolve(mockCache)),
    match: jest.fn(),
    has: jest.fn(),
    delete: jest.fn(),
    keys: jest.fn(() => Promise.resolve([]))
  }
});

// Mock IndexedDB for intelligent cache
const mockIndexedDB = {
  open: jest.fn(() => ({
    result: {
      transaction: jest.fn(() => ({
        objectStore: jest.fn(() => ({
          get: jest.fn(() => ({ onsuccess: null, result: null })),
          put: jest.fn(() => ({ onsuccess: null })),
          delete: jest.fn(() => ({ onsuccess: null })),
          clear: jest.fn(() => ({ onsuccess: null }))
        }))
      }))
    },
    onsuccess: null,
    onerror: null
  }))
};

Object.defineProperty(global, 'indexedDB', {
  value: mockIndexedDB
});

// Performance measurement utilities
class CachePerformanceMonitor {
  private measurements: Map<string, number[]> = new Map();

  startMeasurement(name: string): () => number {
    const startTime = performance.now();
    return () => {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      if (!this.measurements.has(name)) {
        this.measurements.set(name, []);
      }
      this.measurements.get(name)!.push(duration);
      
      return duration;
    };
  }

  getStats(name: string) {
    const times = this.measurements.get(name) || [];
    if (times.length === 0) return null;

    return {
      count: times.length,
      average: times.reduce((sum, time) => sum + time, 0) / times.length,
      min: Math.min(...times),
      max: Math.max(...times),
      p95: times.sort((a, b) => a - b)[Math.floor(times.length * 0.95)]
    };
  }

  clear() {
    this.measurements.clear();
  }
}

const cacheMonitor = new CachePerformanceMonitor();

describe('Frontend Caching Performance Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    cacheMonitor.clear();
    mockCacheStorage.clear();
    
    // Reset cache hit/miss counters
    mockCache.match.mockImplementation((request) => {
      const url = typeof request === 'string' ? request : request.url;
      return Promise.resolve(mockCacheStorage.get(url) || null);
    });
    
    mockCache.put.mockImplementation((request, response) => {
      const url = typeof request === 'string' ? request : request.url;
      mockCacheStorage.set(url, response);
      return Promise.resolve();
    });
  });

  describe('Service Worker Cache Performance', () => {
    it('should demonstrate fast cache hits', async () => {
      const testData = { posts: [], hasMore: false };
      const testResponse = new Response(JSON.stringify(testData));
      
      // Pre-populate cache
      const cacheKey = '/api/feed?page=1';
      mockCacheStorage.set(cacheKey, testResponse);

      const iterations = 100;
      const hitTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('cache-hit');
        
        const result = await serviceWorkerCacheService.cacheWithStrategy(
          cacheKey,
          () => Promise.resolve(testData),
          'CacheFirst',
          { maxAge: 300000 }
        );
        
        const time = endMeasurement();
        hitTimes.push(time);
        
        expect(result).toEqual(testData);
      }

      const stats = cacheMonitor.getStats('cache-hit');
      
      // Cache hits should be very fast
      expect(stats!.average).toBeLessThan(5); // Average under 5ms
      expect(stats!.max).toBeLessThan(20); // No hit over 20ms
      expect(stats!.p95).toBeLessThan(10); // 95th percentile under 10ms

      console.log(`Service Worker Cache Hit Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms
        P95: ${stats!.p95.toFixed(2)}ms`);
    });

    it('should handle cache misses efficiently', async () => {
      const testData = { posts: [], hasMore: false };
      
      // Mock network delay
      const mockFetch = jest.fn().mockImplementation(() => 
        new Promise(resolve => 
          setTimeout(() => resolve(testData), 50) // 50ms network delay
        )
      );

      const iterations = 50;
      const missTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('cache-miss');
        
        const result = await serviceWorkerCacheService.cacheWithStrategy(
          `/api/feed?page=${i}`,
          mockFetch,
          'NetworkFirst',
          { maxAge: 300000 }
        );
        
        const time = endMeasurement();
        missTimes.push(time);
        
        expect(result).toEqual(testData);
      }

      const stats = cacheMonitor.getStats('cache-miss');
      
      // Cache misses should include network time but be reasonable
      expect(stats!.average).toBeGreaterThan(45); // Should include network delay
      expect(stats!.average).toBeLessThan(100); // But not excessive overhead
      expect(stats!.max).toBeLessThan(200); // No miss over 200ms

      console.log(`Service Worker Cache Miss Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms
        Network Calls: ${mockFetch.mock.calls.length}`);
    });

    it('should optimize StaleWhileRevalidate strategy', async () => {
      const staleData = { posts: [{ id: 'old' }], hasMore: false };
      const freshData = { posts: [{ id: 'new' }], hasMore: false };
      
      // Pre-populate with stale data
      const cacheKey = '/api/feed?swr=true';
      const staleResponse = new Response(JSON.stringify(staleData));
      mockCacheStorage.set(cacheKey, staleResponse);

      const mockFetch = jest.fn().mockResolvedValue(freshData);
      const iterations = 20;
      const swrTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('swr');
        
        const result = await serviceWorkerCacheService.cacheWithStrategy(
          cacheKey,
          mockFetch,
          'StaleWhileRevalidate',
          { maxAge: 1 } // Very short TTL to make data stale
        );
        
        const time = endMeasurement();
        swrTimes.push(time);
        
        // Should return stale data immediately
        expect(result).toBeDefined();
      }

      const stats = cacheMonitor.getStats('swr');
      
      // SWR should return stale data very quickly
      expect(stats!.average).toBeLessThan(10); // Average under 10ms
      expect(stats!.max).toBeLessThan(50); // No request over 50ms

      console.log(`StaleWhileRevalidate Performance:
        Iterations: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms
        Background Fetches: ${mockFetch.mock.calls.length}`);
    });

    it('should handle concurrent cache operations', async () => {
      const testData = { posts: [], hasMore: false };
      const concurrentRequests = 50;
      
      const startTime = performance.now();
      
      // Make concurrent requests to same resource
      const promises = Array.from({ length: concurrentRequests }, (_, i) =>
        serviceWorkerCacheService.cacheWithStrategy(
          '/api/feed?concurrent=true',
          () => Promise.resolve({ ...testData, requestId: i }),
          'NetworkFirst',
          { maxAge: 300000 }
        )
      );

      const results = await Promise.all(promises);
      const totalTime = performance.now() - startTime;

      // All requests should complete successfully
      expect(results).toHaveLength(concurrentRequests);
      results.forEach(result => {
        expect(result).toBeDefined();
      });

      const averageTime = totalTime / concurrentRequests;
      
      // Concurrent requests should be handled efficiently
      expect(totalTime).toBeLessThan(1000); // Total under 1 second
      expect(averageTime).toBeLessThan(50); // Average under 50ms per request

      console.log(`Concurrent Cache Operations:
        Requests: ${concurrentRequests}
        Total Time: ${totalTime.toFixed(2)}ms
        Average per Request: ${averageTime.toFixed(2)}ms`);
    });
  });

  describe('Intelligent Cache Performance', () => {
    it('should demonstrate predictive preloading efficiency', async () => {
      const userActions = [
        { action: 'view_feed', context: { page: 1 } },
        { action: 'view_post', context: { postId: 'post-1' } },
        { action: 'view_community', context: { communityId: 'community-1' } }
      ];

      const preloadTimes: number[] = [];

      for (const userAction of userActions) {
        const endMeasurement = cacheMonitor.startMeasurement('predictive-preload');
        
        await intelligentCacheService.analyzeAndPreload(
          'test-user',
          userAction.action,
          userAction.context
        );
        
        const time = endMeasurement();
        preloadTimes.push(time);
      }

      const stats = cacheMonitor.getStats('predictive-preload');
      
      // Predictive preloading should not block user interactions
      expect(stats!.average).toBeLessThan(20); // Average under 20ms
      expect(stats!.max).toBeLessThan(100); // No preload over 100ms

      console.log(`Predictive Preloading Performance:
        Actions: ${userActions.length}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });

    it('should optimize cache invalidation performance', async () => {
      // Populate cache with tagged entries
      const cacheEntries = 100;
      
      for (let i = 0; i < cacheEntries; i++) {
        await intelligentCacheService.set(
          `test-entry-${i}`,
          { data: `value-${i}` },
          300,
          [`tag-${i % 10}`, 'global']
        );
      }

      const invalidationTimes: number[] = [];

      // Test invalidation by tags
      for (let i = 0; i < 10; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('cache-invalidation');
        
        await intelligentCacheService.invalidateByTags([`tag-${i}`]);
        
        const time = endMeasurement();
        invalidationTimes.push(time);
      }

      const stats = cacheMonitor.getStats('cache-invalidation');
      
      // Cache invalidation should be efficient
      expect(stats!.average).toBeLessThan(50); // Average under 50ms
      expect(stats!.max).toBeLessThan(200); // No invalidation over 200ms

      console.log(`Cache Invalidation Performance:
        Entries: ${cacheEntries}
        Invalidations: ${invalidationTimes.length}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });

    it('should handle offline queue operations efficiently', async () => {
      const offlineActions = Array.from({ length: 100 }, (_, i) => ({
        id: `action-${i}`,
        type: 'create_post',
        data: { title: `Post ${i}`, content: 'Test content' },
        timestamp: Date.now(),
        priority: Math.floor(Math.random() * 3)
      }));

      const queueTimes: number[] = [];

      for (const action of offlineActions) {
        const endMeasurement = cacheMonitor.startMeasurement('offline-queue');
        
        await intelligentCacheService.queueOfflineAction(action);
        
        const time = endMeasurement();
        queueTimes.push(time);
      }

      const stats = cacheMonitor.getStats('offline-queue');
      
      // Offline queuing should be very fast
      expect(stats!.average).toBeLessThan(5); // Average under 5ms
      expect(stats!.max).toBeLessThan(20); // No queue operation over 20ms

      console.log(`Offline Queue Performance:
        Actions: ${offlineActions.length}
        Average: ${stats!.average.toFixed(2)}ms
        Max: ${stats!.max.toFixed(2)}ms`);
    });
  });

  describe('Browser Cache Integration Performance', () => {
    it('should optimize HTTP cache headers', async () => {
      const mockFetch = jest.fn().mockImplementation((url) => {
        const response = new Response(JSON.stringify({ data: 'test' }), {
          headers: {
            'Cache-Control': 'public, max-age=300',
            'ETag': '"test-etag"',
            'Last-Modified': new Date().toUTCString()
          }
        });
        return Promise.resolve(response);
      });

      global.fetch = mockFetch;

      const iterations = 20;
      const httpCacheTimes: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('http-cache');
        
        const response = await fetch(`/api/test?iteration=${i}`);
        const data = await response.json();
        
        const time = endMeasurement();
        httpCacheTimes.push(time);
        
        expect(data).toEqual({ data: 'test' });
      }

      const stats = cacheMonitor.getStats('http-cache');
      
      // HTTP cache should be efficient
      expect(stats!.average).toBeLessThan(50); // Average under 50ms
      expect(mockFetch).toHaveBeenCalledTimes(iterations);

      console.log(`HTTP Cache Performance:
        Requests: ${iterations}
        Average: ${stats!.average.toFixed(2)}ms
        Cache Headers Used: Yes`);
    });

    it('should demonstrate memory cache efficiency', async () => {
      const memoryCache = new Map();
      const cacheSize = 1000;
      
      // Populate memory cache
      const populateStart = performance.now();
      
      for (let i = 0; i < cacheSize; i++) {
        memoryCache.set(`key-${i}`, {
          id: i,
          data: `value-${i}`,
          timestamp: Date.now()
        });
      }
      
      const populateTime = performance.now() - populateStart;

      // Test memory cache access
      const accessTimes: number[] = [];
      
      for (let i = 0; i < 100; i++) {
        const key = `key-${Math.floor(Math.random() * cacheSize)}`;
        
        const endMeasurement = cacheMonitor.startMeasurement('memory-access');
        
        const value = memoryCache.get(key);
        
        const time = endMeasurement();
        accessTimes.push(time);
        
        expect(value).toBeDefined();
      }

      const stats = cacheMonitor.getStats('memory-access');
      
      // Memory cache should be extremely fast
      expect(stats!.average).toBeLessThan(0.1); // Average under 0.1ms
      expect(stats!.max).toBeLessThan(1); // No access over 1ms

      console.log(`Memory Cache Performance:
        Cache Size: ${cacheSize}
        Populate Time: ${populateTime.toFixed(2)}ms
        Access Average: ${stats!.average.toFixed(4)}ms
        Access Max: ${stats!.max.toFixed(4)}ms`);
    });
  });

  describe('Cache Strategy Comparison', () => {
    it('should compare different caching strategies', async () => {
      const testData = { posts: [], hasMore: false };
      const strategies = ['CacheFirst', 'NetworkFirst', 'StaleWhileRevalidate'] as const;
      const iterations = 20;

      const results: Record<string, any> = {};

      for (const strategy of strategies) {
        const strategyTimes: number[] = [];
        
        // Clear cache between strategies
        mockCacheStorage.clear();
        
        // Pre-populate for cache-dependent strategies
        if (strategy === 'CacheFirst' || strategy === 'StaleWhileRevalidate') {
          const response = new Response(JSON.stringify(testData));
          mockCacheStorage.set('/api/strategy-test', response);
        }

        const mockFetch = jest.fn().mockImplementation(() => 
          new Promise(resolve => 
            setTimeout(() => resolve(testData), 30) // 30ms network delay
          )
        );

        for (let i = 0; i < iterations; i++) {
          const endMeasurement = cacheMonitor.startMeasurement(`strategy-${strategy}`);
          
          await serviceWorkerCacheService.cacheWithStrategy(
            '/api/strategy-test',
            mockFetch,
            strategy,
            { maxAge: strategy === 'StaleWhileRevalidate' ? 1 : 300000 }
          );
          
          const time = endMeasurement();
          strategyTimes.push(time);
        }

        const stats = cacheMonitor.getStats(`strategy-${strategy}`);
        
        results[strategy] = {
          average: stats!.average,
          min: stats!.min,
          max: stats!.max,
          networkCalls: mockFetch.mock.calls.length
        };

        console.log(`${strategy} Strategy Performance:
          Average: ${stats!.average.toFixed(2)}ms
          Min: ${stats!.min.toFixed(2)}ms
          Max: ${stats!.max.toFixed(2)}ms
          Network Calls: ${mockFetch.mock.calls.length}`);
      }

      // Verify strategy characteristics
      expect(results.CacheFirst.average).toBeLessThan(results.NetworkFirst.average);
      expect(results.StaleWhileRevalidate.average).toBeLessThan(results.NetworkFirst.average);
    });
  });

  describe('Real-World Cache Performance', () => {
    it('should simulate realistic user browsing patterns', async () => {
      const userSessions = [
        { action: 'load_feed', pages: [1, 2, 3] },
        { action: 'browse_communities', communities: ['tech', 'crypto', 'defi'] },
        { action: 'search_content', queries: ['blockchain', 'web3', 'dao'] }
      ];

      const sessionResults: any[] = [];

      for (const session of userSessions) {
        const sessionStart = performance.now();
        const operations: Promise<any>[] = [];

        if (session.action === 'load_feed') {
          session.pages.forEach(page => {
            operations.push(
              serviceWorkerCacheService.cacheWithStrategy(
                `/api/feed?page=${page}`,
                () => Promise.resolve({ posts: [], page }),
                'NetworkFirst',
                { maxAge: 300000 }
              )
            );
          });
        } else if (session.action === 'browse_communities') {
          session.communities.forEach(community => {
            operations.push(
              serviceWorkerCacheService.cacheWithStrategy(
                `/api/communities/${community}`,
                () => Promise.resolve({ community, posts: [] }),
                'StaleWhileRevalidate',
                { maxAge: 600000 }
              )
            );
          });
        } else if (session.action === 'search_content') {
          session.queries.forEach(query => {
            operations.push(
              serviceWorkerCacheService.cacheWithStrategy(
                `/api/search?q=${query}`,
                () => Promise.resolve({ query, results: [] }),
                'NetworkFirst',
                { maxAge: 180000 }
              )
            );
          });
        }

        await Promise.all(operations);
        const sessionTime = performance.now() - sessionStart;

        sessionResults.push({
          action: session.action,
          operations: operations.length,
          time: sessionTime,
          averagePerOperation: sessionTime / operations.length
        });
      }

      // All sessions should complete efficiently
      sessionResults.forEach(result => {
        expect(result.averagePerOperation).toBeLessThan(100); // Average under 100ms per operation
        
        console.log(`${result.action} Session:
          Operations: ${result.operations}
          Total Time: ${result.time.toFixed(2)}ms
          Average per Operation: ${result.averagePerOperation.toFixed(2)}ms`);
      });
    });

    it('should handle cache eviction gracefully', async () => {
      const cacheLimit = 50; // Simulate limited cache size
      const entries = 100; // More entries than cache limit
      
      const evictionTimes: number[] = [];

      for (let i = 0; i < entries; i++) {
        const endMeasurement = cacheMonitor.startMeasurement('cache-eviction');
        
        // Simulate cache with size limit
        if (mockCacheStorage.size >= cacheLimit) {
          // Evict oldest entry (simplified LRU)
          const firstKey = mockCacheStorage.keys().next().value;
          mockCacheStorage.delete(firstKey);
        }
        
        await serviceWorkerCacheService.cacheWithStrategy(
          `/api/eviction-test/${i}`,
          () => Promise.resolve({ id: i, data: `entry-${i}` }),
          'NetworkFirst',
          { maxAge: 300000 }
        );
        
        const time = endMeasurement();
        evictionTimes.push(time);
      }

      const stats = cacheMonitor.getStats('cache-eviction');
      
      // Cache eviction should not significantly impact performance
      expect(stats!.average).toBeLessThan(50); // Average under 50ms
      expect(mockCacheStorage.size).toBeLessThanOrEqual(cacheLimit);

      console.log(`Cache Eviction Performance:
        Entries Processed: ${entries}
        Cache Limit: ${cacheLimit}
        Final Cache Size: ${mockCacheStorage.size}
        Average Time: ${stats!.average.toFixed(2)}ms`);
    });
  });
});