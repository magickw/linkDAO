import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { performance } from 'perf_hooks';
import { DatabaseOptimizationService } from '../services/databaseOptimizationService';
import { CachingStrategiesService } from '../services/cachingStrategiesService';
import { LoadBalancingService } from '../services/loadBalancingService';
import { PerformanceMonitoringService } from '../services/performanceMonitoringService';

describe('Performance Tests', () => {
  let dbService: DatabaseOptimizationService;
  let cacheService: CachingStrategiesService;
  let loadBalancer: LoadBalancingService;
  let monitor: PerformanceMonitoringService;

  beforeAll(async () => {
    // Initialize services with test configurations
    dbService = new DatabaseOptimizationService({
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_marketplace',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      max: 10,
      min: 2,
      idleTimeoutMillis: 10000,
      connectionTimeoutMillis: 2000,
    }, process.env.TEST_REDIS_URL || 'redis://localhost:6379');

    cacheService = new CachingStrategiesService({
      redis: {
        host: 'localhost',
        port: 6379,
        db: 1, // Use different DB for tests
        keyPrefix: 'test:',
      },
      memory: {
        maxSize: 1000,
        ttl: 60000,
      },
    });

    loadBalancer = new LoadBalancingService({
      algorithm: 'round-robin',
      healthCheck: {
        interval: 5000,
        timeout: 2000,
        retries: 3,
        path: '/health',
      },
      autoScaling: {
        enabled: false, // Disable for tests
        minInstances: 1,
        maxInstances: 5,
        targetCpuUtilization: 70,
        targetMemoryUtilization: 80,
        scaleUpCooldown: 300000,
        scaleDownCooldown: 600000,
      },
    });

    monitor = new PerformanceMonitoringService();
  });

  afterAll(async () => {
    await dbService?.close();
    await cacheService?.close();
    loadBalancer?.destroy();
    monitor?.destroy();
  });

  describe('Database Performance Tests', () => {
    it('should handle concurrent queries efficiently', async () => {
      const concurrentQueries = 50;
      const queries = Array.from({ length: concurrentQueries }, (_, i) => 
        dbService.executeOptimizedQuery(
          'SELECT * FROM products WHERE status = $1 LIMIT 10',
          ['active'],
          `test_products_${i}`,
          60
        )
      );

      const startTime = performance.now();
      const results = await Promise.all(queries);
      const endTime = performance.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentQueries;

      expect(results).toHaveLength(concurrentQueries);
      expect(averageTime).toBeLessThan(100); // Should average less than 100ms per query
      expect(totalTime).toBeLessThan(2000); // Total time should be less than 2 seconds

      console.log(`Concurrent queries performance: ${totalTime.toFixed(2)}ms total, ${averageTime.toFixed(2)}ms average`);
    });

    it('should optimize query performance with indexes', async () => {
      // Create test indexes
      await dbService.createOptimizedIndexes();

      // Test query performance before and after indexing
      const testQuery = `
        SELECT p.*, u.username 
        FROM products p 
        JOIN users u ON p.seller_id = u.id 
        WHERE p.status = $1 AND p.category_id = $2 
        ORDER BY p.created_at DESC 
        LIMIT 20
      `;

      const iterations = 10;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await dbService.executeOptimizedQuery(testQuery, ['active', 'test-category']);
        const end = performance.now();
        times.push(end - start);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);

      expect(averageTime).toBeLessThan(50); // Should average less than 50ms
      expect(maxTime).toBeLessThan(200); // No query should take more than 200ms

      console.log(`Indexed query performance: ${averageTime.toFixed(2)}ms average, ${maxTime.toFixed(2)}ms max`);
    });

    it('should maintain connection pool efficiency', async () => {
      const poolStats = await dbService.getPoolStats();
      
      expect(poolStats.totalCount).toBeGreaterThan(0);
      expect(poolStats.idleCount).toBeGreaterThanOrEqual(0);
      expect(poolStats.waitingCount).toBe(0); // No waiting connections in test

      // Test pool under load
      const heavyQueries = Array.from({ length: 20 }, () =>
        dbService.executeOptimizedQuery('SELECT pg_sleep(0.1)', [])
      );

      await Promise.all(heavyQueries);
      
      const statsAfterLoad = await dbService.getPoolStats();
      expect(statsAfterLoad.totalCount).toBeLessThanOrEqual(10); // Max pool size
    });
  });

  describe('Cache Performance Tests', () => {
    beforeEach(async () => {
      // Clear cache before each test
      await cacheService.delete('*');
    });

    it('should provide fast cache access', async () => {
      const testData = { id: 1, name: 'Test Product', price: 100 };
      const key = 'test:product:1';

      // Test cache set performance
      const setStart = performance.now();
      await cacheService.set(key, testData, 3600);
      const setEnd = performance.now();

      expect(setEnd - setStart).toBeLessThan(10); // Cache set should be very fast

      // Test cache get performance
      const getStart = performance.now();
      const cached = await cacheService.get(key);
      const getEnd = performance.now();

      expect(getEnd - getStart).toBeLessThan(5); // Cache get should be extremely fast
      expect(cached).toEqual(testData);

      console.log(`Cache performance: set ${(setEnd - setStart).toFixed(2)}ms, get ${(getEnd - getStart).toFixed(2)}ms`);
    });

    it('should handle high-frequency cache operations', async () => {
      const operations = 1000;
      const keys = Array.from({ length: operations }, (_, i) => `test:key:${i}`);
      const values = Array.from({ length: operations }, (_, i) => ({ id: i, data: `value${i}` }));

      // Test batch set performance
      const setStart = performance.now();
      const setPromises = keys.map((key, i) => cacheService.set(key, values[i], 3600));
      await Promise.all(setPromises);
      const setEnd = performance.now();

      // Test batch get performance
      const getStart = performance.now();
      const getPromises = keys.map(key => cacheService.get(key));
      const results = await Promise.all(getPromises);
      const getEnd = performance.now();

      const setTime = setEnd - setStart;
      const getTime = getEnd - getStart;

      expect(results).toHaveLength(operations);
      expect(setTime).toBeLessThan(1000); // 1000 sets in less than 1 second
      expect(getTime).toBeLessThan(500); // 1000 gets in less than 0.5 seconds

      console.log(`Batch cache performance: ${operations} sets in ${setTime.toFixed(2)}ms, ${operations} gets in ${getTime.toFixed(2)}ms`);
    });

    it('should demonstrate multi-level cache efficiency', async () => {
      const key = 'test:multilevel';
      const data = { complex: 'data', with: ['arrays', 'and'], nested: { objects: true } };

      // First access - should hit fallback
      const firstStart = performance.now();
      const firstResult = await cacheService.get(key, async () => {
        await new Promise(resolve => setTimeout(resolve, 50)); // Simulate slow operation
        return data;
      });
      const firstEnd = performance.now();

      // Second access - should hit memory cache
      const secondStart = performance.now();
      const secondResult = await cacheService.get(key);
      const secondEnd = performance.now();

      expect(firstResult).toEqual(data);
      expect(secondResult).toEqual(data);
      expect(firstEnd - firstStart).toBeGreaterThan(45); // Should include fallback time
      expect(secondEnd - secondStart).toBeLessThan(5); // Should be very fast from memory

      console.log(`Multi-level cache: first access ${(firstEnd - firstStart).toFixed(2)}ms, second access ${(secondEnd - secondStart).toFixed(2)}ms`);
    });
  });

  describe('Load Balancer Performance Tests', () => {
    beforeEach(() => {
      // Add test servers
      loadBalancer.addServer({
        id: 'server1',
        host: 'localhost',
        port: 3001,
        weight: 1,
        maxConnections: 100,
      });

      loadBalancer.addServer({
        id: 'server2',
        host: 'localhost',
        port: 3002,
        weight: 2,
        maxConnections: 100,
      });

      loadBalancer.addServer({
        id: 'server3',
        host: 'localhost',
        port: 3003,
        weight: 1,
        maxConnections: 100,
      });
    });

    it('should distribute load efficiently', async () => {
      const requests = 1000;
      const serverCounts = new Map<string, number>();

      const start = performance.now();
      
      for (let i = 0; i < requests; i++) {
        const server = loadBalancer.getNextServer();
        if (server) {
          const count = serverCounts.get(server.id) || 0;
          serverCounts.set(server.id, count + 1);
        }
      }
      
      const end = performance.now();

      const totalTime = end - start;
      const averageTime = totalTime / requests;

      expect(serverCounts.size).toBeGreaterThan(0);
      expect(averageTime).toBeLessThan(1); // Should be very fast per request

      // Check distribution is reasonable (within 20% of expected)
      const expectedPerServer = requests / 3;
      serverCounts.forEach((count, serverId) => {
        const deviation = Math.abs(count - expectedPerServer) / expectedPerServer;
        expect(deviation).toBeLessThan(0.3); // Within 30% of expected
      });

      console.log(`Load balancer performance: ${requests} requests in ${totalTime.toFixed(2)}ms (${averageTime.toFixed(4)}ms per request)`);
      console.log('Distribution:', Object.fromEntries(serverCounts));
    });

    it('should handle server failures gracefully', async () => {
      const stats = loadBalancer.getLoadBalancerStats();
      expect(stats.healthyServers).toBe(3);

      // Simulate server failure
      const server1 = loadBalancer.getNextServer();
      if (server1) {
        loadBalancer.removeServer(server1.id);
      }

      const newStats = loadBalancer.getLoadBalancerStats();
      expect(newStats.totalServers).toBe(2);

      // Should still distribute load among remaining servers
      const requests = 100;
      let successfulRequests = 0;

      for (let i = 0; i < requests; i++) {
        const server = loadBalancer.getNextServer();
        if (server) {
          successfulRequests++;
        }
      }

      expect(successfulRequests).toBe(requests); // All requests should still be handled
    });
  });

  describe('Performance Monitoring Tests', () => {
    it('should record metrics efficiently', async () => {
      const metricsCount = 10000;
      
      const start = performance.now();
      
      for (let i = 0; i < metricsCount; i++) {
        monitor.recordMetric('test.metric', Math.random() * 100, 'ms', {
          iteration: i.toString(),
        });
      }
      
      const end = performance.now();
      
      const totalTime = end - start;
      const averageTime = totalTime / metricsCount;

      expect(averageTime).toBeLessThan(0.1); // Should be very fast per metric
      
      const metrics = monitor.getMetrics('test.metric');
      expect(metrics).toHaveLength(metricsCount);

      console.log(`Metrics recording performance: ${metricsCount} metrics in ${totalTime.toFixed(2)}ms (${averageTime.toFixed(4)}ms per metric)`);
    });

    it('should aggregate metrics efficiently', async () => {
      // Record test metrics over time
      const metricsCount = 1000;
      const baseTime = Date.now() - 3600000; // 1 hour ago

      for (let i = 0; i < metricsCount; i++) {
        const timestamp = new Date(baseTime + i * 3600); // 1 metric per hour
        monitor.recordMetric('test.aggregation', Math.random() * 100, 'ms');
      }

      const start = performance.now();
      const aggregated = monitor.getAggregatedMetrics('test.aggregation', 60000); // 1-minute buckets
      const end = performance.now();

      expect(aggregated.length).toBeGreaterThan(0);
      expect(end - start).toBeLessThan(100); // Aggregation should be fast

      console.log(`Metrics aggregation performance: ${(end - start).toFixed(2)}ms for ${aggregated.length} buckets`);
    });

    it('should handle alert evaluation efficiently', async () => {
      // Add test alert rule
      const ruleId = monitor.addAlertRule({
        name: 'Test Alert',
        metric: 'test.alert.metric',
        condition: 'gt',
        threshold: 50,
        duration: 60,
        severity: 'medium',
        enabled: true,
        cooldown: 300,
      });

      // Record metrics that should trigger alert
      for (let i = 0; i < 100; i++) {
        monitor.recordMetric('test.alert.metric', 75, 'ms'); // Above threshold
      }

      const start = performance.now();
      
      // Simulate alert evaluation (this would normally happen automatically)
      const alerts = monitor.getActiveAlerts();
      
      const end = performance.now();

      expect(end - start).toBeLessThan(50); // Alert evaluation should be fast

      console.log(`Alert evaluation performance: ${(end - start).toFixed(2)}ms`);
    });
  });

  describe('Integration Performance Tests', () => {
    it('should handle full request lifecycle efficiently', async () => {
      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();

        // Simulate full request lifecycle
        // 1. Load balancer selects server
        const server = loadBalancer.getNextServer();
        expect(server).toBeTruthy();

        // 2. Check cache
        const cacheKey = `product:${i}`;
        let product = await cacheService.get(cacheKey);

        // 3. If not in cache, query database
        if (!product) {
          product = await dbService.executeOptimizedQuery(
            'SELECT * FROM products WHERE id = $1',
            [i.toString()],
            cacheKey,
            300
          );
        }

        // 4. Record metrics
        const responseTime = performance.now() - start;
        monitor.recordRequestMetrics(responseTime, 200, '/api/products');

        times.push(responseTime);
      }

      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      const minTime = Math.min(...times);

      expect(averageTime).toBeLessThan(50); // Average should be less than 50ms
      expect(maxTime).toBeLessThan(200); // No request should take more than 200ms

      console.log(`Full lifecycle performance: ${averageTime.toFixed(2)}ms average, ${minTime.toFixed(2)}ms min, ${maxTime.toFixed(2)}ms max`);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 10000; // 10 seconds
      const requestsPerSecond = 50;
      const interval = 1000 / requestsPerSecond;

      const startTime = Date.now();
      const responseTimes: number[] = [];
      let requestCount = 0;

      while (Date.now() - startTime < duration) {
        const requestStart = performance.now();

        // Simulate request processing
        const server = loadBalancer.getNextServer();
        const product = await cacheService.get(`product:${requestCount}`, async () => {
          return await dbService.executeOptimizedQuery(
            'SELECT * FROM products LIMIT 1',
            [],
            `product:${requestCount}`,
            60
          );
        });

        const requestEnd = performance.now();
        const responseTime = requestEnd - requestStart;
        
        responseTimes.push(responseTime);
        monitor.recordRequestMetrics(responseTime, 200, '/api/products');

        requestCount++;

        // Wait for next request
        await new Promise(resolve => setTimeout(resolve, interval));
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const p95ResponseTime = responseTimes.sort((a, b) => a - b)[Math.floor(responseTimes.length * 0.95)];

      expect(averageResponseTime).toBeLessThan(100); // Average should remain low
      expect(p95ResponseTime).toBeLessThan(200); // 95th percentile should be reasonable
      expect(requestCount).toBeGreaterThan(400); // Should handle expected load

      console.log(`Sustained load performance: ${requestCount} requests, ${averageResponseTime.toFixed(2)}ms average, ${p95ResponseTime.toFixed(2)}ms p95`);
    });
  });
});

// Load testing scenarios
describe('Load Testing Scenarios', () => {
  it('should handle marketplace browsing load', async () => {
    // Simulate users browsing products
    const concurrentUsers = 20;
    const actionsPerUser = 10;

    const userSessions = Array.from({ length: concurrentUsers }, async (_, userId) => {
      const actions = [];
      
      for (let i = 0; i < actionsPerUser; i++) {
        const action = Math.random();
        
        if (action < 0.4) {
          // Browse products (40% of actions)
          actions.push(
            dbService.getProductsWithPagination(20, i * 20, { category: 'electronics' })
          );
        } else if (action < 0.7) {
          // View product details (30% of actions)
          actions.push(
            cacheService.get(`product:${userId}:${i}`, async () => {
              return dbService.executeOptimizedQuery(
                'SELECT * FROM products WHERE id = $1',
                [`${userId}-${i}`]
              );
            })
          );
        } else if (action < 0.9) {
          // Search products (20% of actions)
          actions.push(
            dbService.executeOptimizedQuery(
              'SELECT * FROM products WHERE title ILIKE $1 LIMIT 10',
              [`%search${i}%`]
            )
          );
        } else {
          // View user profile (10% of actions)
          actions.push(
            dbService.getUserReputationWithCache(`user-${userId}`)
          );
        }
      }
      
      return Promise.all(actions);
    });

    const start = performance.now();
    await Promise.all(userSessions);
    const end = performance.now();

    const totalTime = end - start;
    const totalActions = concurrentUsers * actionsPerUser;

    expect(totalTime).toBeLessThan(5000); // Should complete within 5 seconds
    
    console.log(`Marketplace browsing load test: ${totalActions} actions by ${concurrentUsers} users in ${totalTime.toFixed(2)}ms`);
  });

  it('should handle order processing load', async () => {
    // Simulate order creation and processing
    const concurrentOrders = 50;

    const orderPromises = Array.from({ length: concurrentOrders }, async (_, orderId) => {
      // Create order
      const order = await dbService.executeOptimizedQuery(
        'INSERT INTO orders (id, buyer_id, seller_id, product_id, status) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [`order-${orderId}`, `buyer-${orderId}`, `seller-${orderId}`, `product-${orderId}`, 'created']
      );

      // Update cache
      await cacheService.set(`order:${orderId}`, order[0], 3600);

      // Record metrics
      monitor.recordMetric('order.created', 1, 'count');

      return order;
    });

    const start = performance.now();
    const results = await Promise.all(orderPromises);
    const end = performance.now();

    const totalTime = end - start;
    const averageTime = totalTime / concurrentOrders;

    expect(results).toHaveLength(concurrentOrders);
    expect(averageTime).toBeLessThan(100); // Average order processing should be fast

    console.log(`Order processing load test: ${concurrentOrders} orders in ${totalTime.toFixed(2)}ms (${averageTime.toFixed(2)}ms average)`);
  });
});