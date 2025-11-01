/**
 * Caching Effectiveness Tests
 * Tests caching performance with real data operations
 */

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';
import { DatabaseSeeder } from '../fixtures';

interface CacheMetrics {
  hitRate: number;
  missRate: number;
  avgHitTime: number;
  avgMissTime: number;
  totalRequests: number;
}

class MockCacheService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number }>();
  private stats = {
    hits: 0,
    misses: 0,
    hitTimes: [] as number[],
    missTimes: [] as number[]
  };

  async get<T>(key: string): Promise<T | null> {
    const startTime = performance.now();
    const cached = this.cache.get(key);
    
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      this.stats.hits++;
      this.stats.hitTimes.push(performance.now() - startTime);
      return cached.data as T;
    }
    
    this.stats.misses++;
    this.stats.missTimes.push(performance.now() - startTime);
    return null;
  }

  async set(key: string, data: any, ttl: number = 300000): Promise<void> {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  getMetrics(): CacheMetrics {
    const totalRequests = this.stats.hits + this.stats.misses;
    return {
      hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
      missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
      avgHitTime: this.stats.hitTimes.length > 0 
        ? this.stats.hitTimes.reduce((a, b) => a + b, 0) / this.stats.hitTimes.length 
        : 0,
      avgMissTime: this.stats.missTimes.length > 0
        ? this.stats.missTimes.reduce((a, b) => a + b, 0) / this.stats.missTimes.length
        : 0,
      totalRequests
    };
  }

  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      hitTimes: [],
      missTimes: []
    };
  }
}

class CachedDataService {
  constructor(
    private db: any,
    private cache: MockCacheService
  ) {}

  async getCommunities(filters: any = {}): Promise<any[]> {
    const cacheKey = `communities:${JSON.stringify(filters)}`;
    
    let communities = await this.cache.get<any[]>(cacheKey);
    if (communities) {
      return communities;
    }

    // Simulate database query
    let query = this.db.select().from(schema.communities);
    
    if (filters.category) {
      query = query.where(schema.communities.category.eq(filters.category));
    }
    
    if (filters.isPublic !== undefined) {
      query = query.where(schema.communities.isPublic.eq(filters.isPublic));
    }

    communities = await query.limit(filters.limit || 50);
    
    await this.cache.set(cacheKey, communities, 300000); // 5 minutes TTL
    return communities;
  }

  async getProducts(filters: any = {}): Promise<any[]> {
    const cacheKey = `products:${JSON.stringify(filters)}`;
    
    let products = await this.cache.get<any[]>(cacheKey);
    if (products) {
      return products;
    }

    let query = this.db.select().from(schema.products);
    
    if (filters.category) {
      query = query.where(schema.products.category.eq(filters.category));
    }
    
    if (filters.listingType) {
      query = query.where(schema.products.listingType.eq(filters.listingType));
    }

    products = await query.limit(filters.limit || 50);
    
    await this.cache.set(cacheKey, products, 180000); // 3 minutes TTL
    return products;
  }

  async getTrendingContent(): Promise<any[]> {
    const cacheKey = 'trending:content';
    
    let trending = await this.cache.get<any[]>(cacheKey);
    if (trending) {
      return trending;
    }

    // Simulate complex trending calculation
    const posts = await this.db
      .select()
      .from(schema.posts)
      .orderBy(schema.posts.createdAt.desc())
      .limit(100);

    // Simulate processing time for trending algorithm
    await new Promise(resolve => setTimeout(resolve, 100));

    trending = posts.slice(0, 20);
    
    await this.cache.set(cacheKey, trending, 60000); // 1 minute TTL for trending
    return trending;
  }

  async getUserProfile(userId: string): Promise<any | null> {
    const cacheKey = `user:profile:${userId}`;
    
    let profile = await this.cache.get<any>(cacheKey);
    if (profile) {
      return profile;
    }

    profile = await this.db
      .select()
      .from(schema.users)
      .where(schema.users.id.eq(userId))
      .limit(1);

    if (profile.length > 0) {
      await this.cache.set(cacheKey, profile[0], 600000); // 10 minutes TTL
      return profile[0];
    }

    return null;
  }
}

describe('Caching Effectiveness Tests', () => {
  let db: any;
  let sql: any;
  let seeder: DatabaseSeeder;
  let cache: MockCacheService;
  let dataService: CachedDataService;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is required for caching tests');
    }

    sql = postgres(testDbUrl);
    db = drizzle(sql, { schema });
    seeder = new DatabaseSeeder(testDbUrl);
    cache = new MockCacheService();
    dataService = new CachedDataService(db, cache);

    // Seed test data
    await seeder.seedMinimal();
  });

  afterAll(async () => {
    await seeder.close();
    await sql.end();
  });

  beforeEach(() => {
    cache.clear();
  });

  describe('Cache Hit Rate Tests', () => {
    it('should achieve high hit rate for repeated community queries', async () => {
      const filters = { category: 'Finance', isPublic: true };
      
      // Make multiple requests for the same data
      for (let i = 0; i < 10; i++) {
        await dataService.getCommunities(filters);
      }

      const metrics = cache.getMetrics();
      
      expect(metrics.totalRequests).toBe(10);
      expect(metrics.hitRate).toBeGreaterThan(0.8); // 80% hit rate
      expect(metrics.avgHitTime).toBeLessThan(metrics.avgMissTime);

      safeLogger.info(`Community cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
      safeLogger.info(`Avg hit time: ${metrics.avgHitTime.toFixed(2)}ms, Avg miss time: ${metrics.avgMissTime.toFixed(2)}ms`);
    });

    it('should achieve high hit rate for repeated product queries', async () => {
      const filters = { category: 'electronics', limit: 20 };
      
      // Make multiple requests
      for (let i = 0; i < 15; i++) {
        await dataService.getProducts(filters);
      }

      const metrics = cache.getMetrics();
      
      expect(metrics.totalRequests).toBe(15);
      expect(metrics.hitRate).toBeGreaterThan(0.85); // 85% hit rate
      
      safeLogger.info(`Product cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });

    it('should handle mixed query patterns effectively', async () => {
      // Simulate realistic usage pattern
      const queries = [
        () => dataService.getCommunities({ category: 'Finance' }),
        () => dataService.getCommunities({ isPublic: true }),
        () => dataService.getProducts({ category: 'electronics' }),
        () => dataService.getProducts({ listingType: 'AUCTION' }),
        () => dataService.getTrendingContent(),
      ];

      // Execute mixed pattern: some repeated, some unique
      for (let round = 0; round < 5; round++) {
        for (const query of queries) {
          await query();
          // Repeat some queries more frequently
          if (Math.random() > 0.5) {
            await query();
          }
        }
      }

      const metrics = cache.getMetrics();
      
      expect(metrics.hitRate).toBeGreaterThan(0.4); // 40% hit rate for mixed pattern
      expect(metrics.totalRequests).toBeGreaterThan(25);

      safeLogger.info(`Mixed pattern cache hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Cache Performance Impact Tests', () => {
    it('should demonstrate significant performance improvement with caching', async () => {
      const filters = { category: 'Finance', isPublic: true };
      
      // Measure first request (cache miss)
      const startMiss = performance.now();
      await dataService.getCommunities(filters);
      const missTime = performance.now() - startMiss;

      // Measure second request (cache hit)
      const startHit = performance.now();
      await dataService.getCommunities(filters);
      const hitTime = performance.now() - startHit;

      expect(hitTime).toBeLessThan(missTime);
      
      const improvement = ((missTime - hitTime) / missTime) * 100;
      expect(improvement).toBeGreaterThan(50); // At least 50% improvement

      safeLogger.info(`Cache miss: ${missTime.toFixed(2)}ms, Cache hit: ${hitTime.toFixed(2)}ms`);
      safeLogger.info(`Performance improvement: ${improvement.toFixed(1)}%`);
    });

    it('should handle concurrent requests efficiently with caching', async () => {
      const filters = { category: 'Technology' };
      
      // First, populate cache
      await dataService.getCommunities(filters);

      // Then make concurrent requests
      const startTime = performance.now();
      
      const concurrentRequests = Array.from({ length: 20 }, () =>
        dataService.getCommunities(filters)
      );
      
      const results = await Promise.all(concurrentRequests);
      const totalTime = performance.now() - startTime;

      expect(results.length).toBe(20);
      expect(totalTime).toBeLessThan(100); // Should be very fast with caching

      const metrics = cache.getMetrics();
      expect(metrics.hitRate).toBeGreaterThan(0.95); // 95% hit rate

      safeLogger.info(`20 concurrent cached requests completed in ${totalTime.toFixed(2)}ms`);
    });

    it('should maintain performance under high load with caching', async () => {
      // Simulate high load scenario
      const loadTest = async () => {
        const queries = [
          dataService.getCommunities({ isPublic: true }),
          dataService.getProducts({ category: 'nft' }),
          dataService.getTrendingContent(),
        ];
        
        return Promise.all(queries);
      };

      // Warm up cache
      await loadTest();

      // Measure performance under load
      const startTime = performance.now();
      
      const loadPromises = Array.from({ length: 50 }, () => loadTest());
      await Promise.all(loadPromises);
      
      const totalTime = performance.now() - startTime;
      const avgTimePerRequest = totalTime / (50 * 3); // 50 batches * 3 queries each

      expect(avgTimePerRequest).toBeLessThan(10); // Average should be under 10ms with caching

      const metrics = cache.getMetrics();
      expect(metrics.hitRate).toBeGreaterThan(0.8); // 80% hit rate under load

      safeLogger.info(`High load test: ${avgTimePerRequest.toFixed(2)}ms avg per request`);
      safeLogger.info(`Hit rate under load: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Cache Invalidation Tests', () => {
    it('should handle cache expiration correctly', async () => {
      // Use short TTL for testing
      const shortTtlCache = new MockCacheService();
      const shortTtlService = new CachedDataService(db, shortTtlCache);

      // Override set method to use short TTL
      const originalSet = shortTtlCache.set.bind(shortTtlCache);
      shortTtlCache.set = async (key: string, data: any) => {
        return originalSet(key, data, 100); // 100ms TTL
      };

      // First request
      await shortTtlService.getCommunities({ category: 'Finance' });
      
      // Second request (should hit cache)
      await shortTtlService.getCommunities({ category: 'Finance' });
      
      // Wait for cache to expire
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Third request (should miss cache due to expiration)
      await shortTtlService.getCommunities({ category: 'Finance' });

      const metrics = shortTtlCache.getMetrics();
      
      expect(metrics.totalRequests).toBe(3);
      expect(metrics.hits).toBe(1); // Only the second request should hit
      expect(metrics.misses).toBe(2); // First and third should miss

      safeLogger.info(`Cache expiration test - Hits: ${metrics.hits}, Misses: ${metrics.misses}`);
    });

    it('should handle cache size limits effectively', async () => {
      // Simulate cache with size limit
      const limitedCache = new MockCacheService();
      
      // Override to simulate LRU eviction
      const originalSet = limitedCache.set.bind(limitedCache);
      let cacheSize = 0;
      const maxSize = 5;
      
      limitedCache.set = async (key: string, data: any, ttl?: number) => {
        if (cacheSize >= maxSize) {
          // Simulate LRU eviction by clearing cache
          limitedCache.clear();
          cacheSize = 0;
        }
        await originalSet(key, data, ttl);
        cacheSize++;
      };

      const limitedService = new CachedDataService(db, limitedCache);

      // Fill cache beyond limit
      for (let i = 0; i < 10; i++) {
        await limitedService.getCommunities({ category: `Category${i}` });
      }

      // Request early items (should be evicted)
      await limitedService.getCommunities({ category: 'Category0' });
      await limitedService.getCommunities({ category: 'Category1' });

      const metrics = limitedCache.getMetrics();
      
      // Should have some cache misses due to eviction
      expect(metrics.misses).toBeGreaterThan(5);

      safeLogger.info(`Cache size limit test - Total requests: ${metrics.totalRequests}, Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Cache Effectiveness by Data Type', () => {
    it('should show different effectiveness for different data types', async () => {
      const testCases = [
        {
          name: 'Static Communities',
          query: () => dataService.getCommunities({ isPublic: true }),
          expectedHitRate: 0.9 // High hit rate for relatively static data
        },
        {
          name: 'Dynamic Trending',
          query: () => dataService.getTrendingContent(),
          expectedHitRate: 0.7 // Lower hit rate for frequently changing data
        },
        {
          name: 'Product Listings',
          query: () => dataService.getProducts({ category: 'electronics' }),
          expectedHitRate: 0.8 // Medium hit rate for semi-static data
        }
      ];

      for (const testCase of testCases) {
        cache.clear();
        
        // Make multiple requests
        for (let i = 0; i < 10; i++) {
          await testCase.query();
        }

        const metrics = cache.getMetrics();
        
        expect(metrics.hitRate).toBeGreaterThan(testCase.expectedHitRate);

        safeLogger.info(`${testCase.name} - Hit rate: ${(metrics.hitRate * 100).toFixed(1)}% (expected: ${(testCase.expectedHitRate * 100).toFixed(1)}%)`);
      }
    });

    it('should demonstrate memory efficiency of caching', async () => {
      const initialMemory = process.memoryUsage();
      
      // Fill cache with various data types
      for (let i = 0; i < 100; i++) {
        await dataService.getCommunities({ category: `Cat${i % 10}` });
        await dataService.getProducts({ category: `Prod${i % 5}` });
        
        if (i % 10 === 0) {
          await dataService.getTrendingContent();
        }
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;

      // Memory increase should be reasonable
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      const metrics = cache.getMetrics();
      
      safeLogger.info(`Cache memory test - Requests: ${metrics.totalRequests}, Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
      safeLogger.info(`Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });
  });

  describe('Real-world Usage Patterns', () => {
    it('should handle typical user browsing patterns', async () => {
      // Simulate user browsing: communities -> products -> back to communities
      const userSession = async () => {
        // User visits communities page
        await dataService.getCommunities({ isPublic: true });
        await dataService.getCommunities({ category: 'Finance' });
        
        // User visits marketplace
        await dataService.getProducts({ category: 'electronics' });
        await dataService.getProducts({ listingType: 'AUCTION' });
        
        // User checks trending
        await dataService.getTrendingContent();
        
        // User goes back to communities (should hit cache)
        await dataService.getCommunities({ isPublic: true });
        
        // User checks different products
        await dataService.getProducts({ category: 'nft' });
      };

      // Simulate multiple user sessions
      for (let session = 0; session < 5; session++) {
        await userSession();
      }

      const metrics = cache.getMetrics();
      
      expect(metrics.hitRate).toBeGreaterThan(0.6); // 60% hit rate for realistic usage
      expect(metrics.totalRequests).toBe(35); // 7 requests * 5 sessions

      safeLogger.info(`User browsing simulation - Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });

    it('should handle API pagination caching effectively', async () => {
      // Simulate paginated requests
      const pages = [1, 2, 3, 2, 1, 3, 1]; // User navigating back and forth
      
      for (const page of pages) {
        await dataService.getCommunities({ 
          isPublic: true, 
          page, 
          limit: 10 
        });
      }

      const metrics = cache.getMetrics();
      
      expect(metrics.hitRate).toBeGreaterThan(0.4); // Some pages accessed multiple times
      expect(metrics.totalRequests).toBe(7);

      safeLogger.info(`Pagination caching - Hit rate: ${(metrics.hitRate * 100).toFixed(1)}%`);
    });
  });
});
