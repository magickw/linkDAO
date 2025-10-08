/**
 * Performance Tests for Real Data Operations
 * Tests performance characteristics when using real database operations
 */

import { describe, beforeAll, afterAll, beforeEach, it, expect } from '@jest/globals';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';
import { DatabaseSeeder } from '../fixtures';

interface PerformanceMetrics {
  duration: number;
  memoryUsage: {
    before: NodeJS.MemoryUsage;
    after: NodeJS.MemoryUsage;
    peak: NodeJS.MemoryUsage;
  };
  queryCount?: number;
}

class PerformanceMonitor {
  private startTime: number = 0;
  private startMemory: NodeJS.MemoryUsage;
  private peakMemory: NodeJS.MemoryUsage;

  start(): void {
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
    }
    
    this.startTime = performance.now();
    this.startMemory = process.memoryUsage();
    this.peakMemory = { ...this.startMemory };
  }

  updatePeakMemory(): void {
    const current = process.memoryUsage();
    if (current.heapUsed > this.peakMemory.heapUsed) {
      this.peakMemory = current;
    }
  }

  end(): PerformanceMetrics {
    const endTime = performance.now();
    const endMemory = process.memoryUsage();
    
    return {
      duration: endTime - this.startTime,
      memoryUsage: {
        before: this.startMemory,
        after: endMemory,
        peak: this.peakMemory
      }
    };
  }
}

describe('Real Data Performance Tests', () => {
  let db: any;
  let sql: any;
  let seeder: DatabaseSeeder;
  let monitor: PerformanceMonitor;

  beforeAll(async () => {
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is required for performance tests');
    }

    sql = postgres(testDbUrl);
    db = drizzle(sql, { schema });
    seeder = new DatabaseSeeder(testDbUrl);
    monitor = new PerformanceMonitor();

    // Seed comprehensive data for performance testing
    console.log('🌱 Seeding comprehensive test data for performance tests...');
    await seeder.seedComprehensive();
    console.log('✅ Test data seeded');
  });

  afterAll(async () => {
    await seeder.close();
    await sql.end();
  });

  describe('Database Query Performance', () => {
    it('should handle large community queries efficiently', async () => {
      monitor.start();

      // Query all communities with pagination
      const communities = await db
        .select()
        .from(schema.communities)
        .limit(100)
        .offset(0);

      monitor.updatePeakMemory();

      // Query with filtering
      const filteredCommunities = await db
        .select()
        .from(schema.communities)
        .where(schema.communities.isPublic.eq(true))
        .limit(50);

      monitor.updatePeakMemory();

      // Query with sorting
      const sortedCommunities = await db
        .select()
        .from(schema.communities)
        .orderBy(schema.communities.memberCount.desc())
        .limit(20);

      const metrics = monitor.end();

      // Performance assertions
      expect(metrics.duration).toBeLessThan(2000); // 2 seconds
      expect(communities.length).toBeGreaterThan(0);
      expect(filteredCommunities.length).toBeGreaterThan(0);
      expect(sortedCommunities.length).toBeGreaterThan(0);

      // Memory usage should be reasonable
      const memoryIncrease = metrics.memoryUsage.peak.heapUsed - metrics.memoryUsage.before.heapUsed;
      expect(memoryIncrease).toBeLessThan(100 * 1024 * 1024); // 100MB

      console.log(`Community queries completed in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should handle large product queries efficiently', async () => {
      monitor.start();

      // Query products with complex filtering
      const products = await db
        .select()
        .from(schema.products)
        .where(schema.products.isNFT.eq(false))
        .limit(200);

      monitor.updatePeakMemory();

      // Query with price range filtering
      const priceFilteredProducts = await db
        .select()
        .from(schema.products)
        .where(
          schema.products.price.gte('100')
          .and(schema.products.price.lte('1000'))
        )
        .limit(100);

      monitor.updatePeakMemory();

      // Query auctions
      const auctions = await db
        .select()
        .from(schema.products)
        .where(
          schema.products.listingType.eq('AUCTION')
          .and(schema.products.auctionEndTime.gt(new Date()))
        )
        .orderBy(schema.products.auctionEndTime.asc())
        .limit(50);

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(3000); // 3 seconds
      expect(products.length).toBeGreaterThan(0);
      expect(priceFilteredProducts.length).toBeGreaterThan(0);
      expect(auctions.length).toBeGreaterThan(0);

      console.log(`Product queries completed in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should handle complex join queries efficiently', async () => {
      monitor.start();

      // Complex query with multiple joins
      const userCommunityData = await db
        .select({
          userId: schema.users.id,
          username: schema.users.username,
          reputation: schema.users.reputation,
          communityId: schema.communities.id,
          communityName: schema.communities.name,
          membershipRole: schema.communityMemberships.role,
        })
        .from(schema.users)
        .innerJoin(
          schema.communityMemberships,
          schema.users.id.eq(schema.communityMemberships.userId)
        )
        .innerJoin(
          schema.communities,
          schema.communityMemberships.communityId.eq(schema.communities.id)
        )
        .where(schema.users.reputation.gte(500))
        .limit(100);

      monitor.updatePeakMemory();

      // Another complex query with aggregation
      const communityStats = await db
        .select({
          communityId: schema.communities.id,
          communityName: schema.communities.name,
          memberCount: schema.communities.memberCount,
        })
        .from(schema.communities)
        .leftJoin(
          schema.communityMemberships,
          schema.communities.id.eq(schema.communityMemberships.communityId)
        )
        .where(schema.communities.isPublic.eq(true))
        .groupBy(schema.communities.id, schema.communities.name, schema.communities.memberCount)
        .limit(50);

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(5000); // 5 seconds
      expect(userCommunityData.length).toBeGreaterThan(0);
      expect(communityStats.length).toBeGreaterThan(0);

      console.log(`Complex join queries completed in ${metrics.duration.toFixed(2)}ms`);
    });

    it('should handle feed queries with pagination efficiently', async () => {
      monitor.start();

      // Simulate feed pagination
      const pageSize = 20;
      const pages = 5;
      const allPosts = [];

      for (let page = 0; page < pages; page++) {
        const posts = await db
          .select()
          .from(schema.posts)
          .orderBy(schema.posts.createdAt.desc())
          .limit(pageSize)
          .offset(page * pageSize);

        allPosts.push(...posts);
        monitor.updatePeakMemory();
      }

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(4000); // 4 seconds
      expect(allPosts.length).toBe(pageSize * pages);

      console.log(`Feed pagination (${pages} pages) completed in ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Bulk Operations Performance', () => {
    it('should handle bulk inserts efficiently', async () => {
      monitor.start();

      // Generate test data
      const testUsers = Array.from({ length: 1000 }, (_, i) => ({
        id: `perf-test-user-${i}`,
        walletAddress: `0x${i.toString(16).padStart(40, '0')}`,
        username: `perfuser${i}`,
        displayName: `Performance User ${i}`,
        reputation: Math.floor(Math.random() * 1000),
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isVerified: Math.random() > 0.5,
        preferences: JSON.stringify({}),
        stats: JSON.stringify({}),
        socialLinks: JSON.stringify({}),
      }));

      // Bulk insert
      await db.insert(schema.users).values(testUsers);

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(5000); // 5 seconds
      
      // Verify insertion
      const insertedUsers = await db
        .select()
        .from(schema.users)
        .where(schema.users.id.like('perf-test-user-%'));

      expect(insertedUsers.length).toBe(1000);

      console.log(`Bulk insert of 1000 users completed in ${metrics.duration.toFixed(2)}ms`);

      // Cleanup
      await db.delete(schema.users).where(schema.users.id.like('perf-test-user-%'));
    });

    it('should handle bulk updates efficiently', async () => {
      // First, create test data
      const testUsers = Array.from({ length: 500 }, (_, i) => ({
        id: `bulk-update-user-${i}`,
        walletAddress: `0x${i.toString(16).padStart(40, '0')}`,
        username: `bulkuser${i}`,
        displayName: `Bulk User ${i}`,
        reputation: 100,
        joinedAt: new Date(),
        lastActiveAt: new Date(),
        isVerified: false,
        preferences: JSON.stringify({}),
        stats: JSON.stringify({}),
        socialLinks: JSON.stringify({}),
      }));

      await db.insert(schema.users).values(testUsers);

      monitor.start();

      // Bulk update reputation
      await db
        .update(schema.users)
        .set({ reputation: 500 })
        .where(schema.users.id.like('bulk-update-user-%'));

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(3000); // 3 seconds

      // Verify update
      const updatedUsers = await db
        .select()
        .from(schema.users)
        .where(schema.users.id.like('bulk-update-user-%'));

      expect(updatedUsers.every(user => user.reputation === 500)).toBe(true);

      console.log(`Bulk update of 500 users completed in ${metrics.duration.toFixed(2)}ms`);

      // Cleanup
      await db.delete(schema.users).where(schema.users.id.like('bulk-update-user-%'));
    });

    it('should handle bulk deletes efficiently', async () => {
      // Create test data
      const testPosts = Array.from({ length: 1000 }, (_, i) => ({
        id: `bulk-delete-post-${i}`,
        author: `0x${i.toString(16).padStart(40, '0')}`,
        content: `Test post ${i}`,
        contentCid: `QmTest${i}`,
        mediaCids: JSON.stringify([]),
        type: 'text' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        onchainRef: `0x${i.toString(16).padStart(64, '0')}`,
        engagement: JSON.stringify({ likes: 0, comments: 0, shares: 0, views: 0 }),
        metadata: JSON.stringify({ hashtags: [], mentions: [], links: [] }),
      }));

      await db.insert(schema.posts).values(testPosts);

      monitor.start();

      // Bulk delete
      await db.delete(schema.posts).where(schema.posts.id.like('bulk-delete-post-%'));

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(3000); // 3 seconds

      // Verify deletion
      const remainingPosts = await db
        .select()
        .from(schema.posts)
        .where(schema.posts.id.like('bulk-delete-post-%'));

      expect(remainingPosts.length).toBe(0);

      console.log(`Bulk delete of 1000 posts completed in ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Caching Performance', () => {
    it('should demonstrate query caching benefits', async () => {
      const query = () => db
        .select()
        .from(schema.communities)
        .where(schema.communities.isPublic.eq(true))
        .limit(50);

      // First query (cold cache)
      monitor.start();
      const firstResult = await query();
      const firstMetrics = monitor.end();

      // Second query (should be faster with caching)
      monitor.start();
      const secondResult = await query();
      const secondMetrics = monitor.end();

      expect(firstResult.length).toBe(secondResult.length);
      
      // Note: In a real implementation with query caching,
      // the second query should be significantly faster
      console.log(`First query: ${firstMetrics.duration.toFixed(2)}ms`);
      console.log(`Second query: ${secondMetrics.duration.toFixed(2)}ms`);
    });

    it('should handle concurrent queries efficiently', async () => {
      monitor.start();

      // Execute multiple queries concurrently
      const queries = [
        db.select().from(schema.communities).limit(20),
        db.select().from(schema.products).limit(20),
        db.select().from(schema.users).limit(20),
        db.select().from(schema.posts).limit(20),
        db.select().from(schema.proposals).limit(20),
      ];

      const results = await Promise.all(queries);

      const metrics = monitor.end();

      expect(metrics.duration).toBeLessThan(3000); // 3 seconds
      expect(results.every(result => result.length > 0)).toBe(true);

      console.log(`5 concurrent queries completed in ${metrics.duration.toFixed(2)}ms`);
    });
  });

  describe('Memory Usage Tests', () => {
    it('should handle large result sets without excessive memory usage', async () => {
      monitor.start();

      // Query large dataset
      const largeResultSet = await db
        .select()
        .from(schema.posts)
        .limit(1000);

      monitor.updatePeakMemory();

      // Process the data
      const processedData = largeResultSet.map(post => ({
        id: post.id,
        author: post.author,
        contentLength: post.content.length,
        createdAt: post.createdAt,
      }));

      const metrics = monitor.end();

      expect(largeResultSet.length).toBe(1000);
      expect(processedData.length).toBe(1000);

      // Memory usage should be reasonable for 1000 records
      const memoryIncrease = metrics.memoryUsage.peak.heapUsed - metrics.memoryUsage.before.heapUsed;
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024); // 50MB

      console.log(`Large result set (1000 records) processed in ${metrics.duration.toFixed(2)}ms`);
      console.log(`Memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });

    it('should handle streaming large datasets efficiently', async () => {
      monitor.start();

      let processedCount = 0;
      const batchSize = 100;
      let offset = 0;

      // Simulate streaming by processing in batches
      while (processedCount < 1000) {
        const batch = await db
          .select()
          .from(schema.posts)
          .limit(batchSize)
          .offset(offset);

        if (batch.length === 0) break;

        // Process batch
        batch.forEach(post => {
          // Simulate processing
          const processed = {
            id: post.id,
            wordCount: post.content.split(' ').length,
          };
          processedCount++;
        });

        offset += batchSize;
        monitor.updatePeakMemory();
      }

      const metrics = monitor.end();

      expect(processedCount).toBeGreaterThan(0);

      // Streaming should use less memory than loading all at once
      const memoryIncrease = metrics.memoryUsage.peak.heapUsed - metrics.memoryUsage.before.heapUsed;
      expect(memoryIncrease).toBeLessThan(30 * 1024 * 1024); // 30MB

      console.log(`Streamed processing of ${processedCount} records in ${metrics.duration.toFixed(2)}ms`);
      console.log(`Peak memory increase: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Response Time Benchmarks', () => {
    it('should meet response time requirements for common queries', async () => {
      const benchmarks = [
        {
          name: 'Get trending communities',
          query: () => db
            .select()
            .from(schema.communities)
            .where(schema.communities.isPublic.eq(true))
            .orderBy(schema.communities.memberCount.desc())
            .limit(10),
          maxTime: 500 // 500ms
        },
        {
          name: 'Get featured products',
          query: () => db
            .select()
            .from(schema.products)
            .where(schema.products.isNFT.eq(false))
            .orderBy(schema.products.views.desc())
            .limit(12),
          maxTime: 800 // 800ms
        },
        {
          name: 'Get active proposals',
          query: () => db
            .select()
            .from(schema.proposals)
            .where(schema.proposals.status.eq('active'))
            .orderBy(schema.proposals.createdAt.desc())
            .limit(5),
          maxTime: 400 // 400ms
        },
        {
          name: 'Get recent posts',
          query: () => db
            .select()
            .from(schema.posts)
            .orderBy(schema.posts.createdAt.desc())
            .limit(20),
          maxTime: 600 // 600ms
        }
      ];

      for (const benchmark of benchmarks) {
        monitor.start();
        const result = await benchmark.query();
        const metrics = monitor.end();

        expect(metrics.duration).toBeLessThan(benchmark.maxTime);
        expect(result.length).toBeGreaterThan(0);

        console.log(`${benchmark.name}: ${metrics.duration.toFixed(2)}ms (max: ${benchmark.maxTime}ms)`);
      }
    });

    it('should handle search queries within acceptable time limits', async () => {
      const searchTerms = ['defi', 'nft', 'dao', 'crypto', 'blockchain'];

      for (const term of searchTerms) {
        monitor.start();

        // Search across multiple tables
        const [communityResults, productResults, postResults] = await Promise.all([
          db
            .select()
            .from(schema.communities)
            .where(schema.communities.name.ilike(`%${term}%`))
            .limit(10),
          db
            .select()
            .from(schema.products)
            .where(schema.products.title.ilike(`%${term}%`))
            .limit(10),
          db
            .select()
            .from(schema.posts)
            .where(schema.posts.content.ilike(`%${term}%`))
            .limit(10)
        ]);

        const metrics = monitor.end();

        expect(metrics.duration).toBeLessThan(2000); // 2 seconds for search

        const totalResults = communityResults.length + productResults.length + postResults.length;
        console.log(`Search for "${term}": ${totalResults} results in ${metrics.duration.toFixed(2)}ms`);
      }
    });
  });

  describe('Scalability Tests', () => {
    it('should maintain performance with increasing data volume', async () => {
      const dataSizes = [100, 500, 1000];
      const results = [];

      for (const size of dataSizes) {
        monitor.start();

        const posts = await db
          .select()
          .from(schema.posts)
          .limit(size);

        const metrics = monitor.end();

        results.push({
          size,
          duration: metrics.duration,
          throughput: size / (metrics.duration / 1000) // records per second
        });

        expect(posts.length).toBe(Math.min(size, 1000)); // Limited by actual data
        console.log(`Query ${size} records: ${metrics.duration.toFixed(2)}ms (${results[results.length - 1].throughput.toFixed(0)} records/sec)`);
      }

      // Performance should not degrade linearly with data size
      // (due to database optimizations, indexing, etc.)
      const firstThroughput = results[0].throughput;
      const lastThroughput = results[results.length - 1].throughput;
      
      // Throughput should not drop by more than 50%
      expect(lastThroughput).toBeGreaterThan(firstThroughput * 0.5);
    });

    it('should handle high concurrency without significant degradation', async () => {
      const concurrencyLevels = [1, 5, 10, 20];
      const results = [];

      for (const concurrency of concurrencyLevels) {
        monitor.start();

        const queries = Array.from({ length: concurrency }, () =>
          db
            .select()
            .from(schema.communities)
            .limit(10)
        );

        await Promise.all(queries);

        const metrics = monitor.end();

        results.push({
          concurrency,
          duration: metrics.duration,
          avgResponseTime: metrics.duration / concurrency
        });

        console.log(`Concurrency ${concurrency}: ${metrics.duration.toFixed(2)}ms total, ${results[results.length - 1].avgResponseTime.toFixed(2)}ms avg`);
      }

      // Average response time should not increase dramatically with concurrency
      const singleResponse = results[0].avgResponseTime;
      const highConcurrencyResponse = results[results.length - 1].avgResponseTime;
      
      // Response time should not increase by more than 3x
      expect(highConcurrencyResponse).toBeLessThan(singleResponse * 3);
    });
  });
});