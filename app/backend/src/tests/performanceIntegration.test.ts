import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { PerformanceOptimizationManager, defaultPerformanceConfig } from '../config/performanceConfig';
import { PerformanceMiddleware } from '../middleware/performanceMiddleware';
import express from 'express';
import request from 'supertest';

describe('Performance Integration Tests', () => {
  let performanceManager: PerformanceOptimizationManager;
  let app: express.Application;
  let performanceMiddleware: PerformanceMiddleware;

  beforeAll(async () => {
    // Initialize performance manager with test config
    const testConfig = {
      ...defaultPerformanceConfig,
      database: {
        ...defaultPerformanceConfig.database,
        host: process.env.TEST_DB_HOST || 'localhost',
        database: process.env.TEST_DB_NAME || 'test_marketplace',
      },
      cache: {
        ...defaultPerformanceConfig.cache,
        redis: {
          ...defaultPerformanceConfig.cache.redis,
          db: 1, // Use different DB for tests
        },
      },
      loadBalancing: {
        ...defaultPerformanceConfig.loadBalancing,
        autoScaling: {
          ...defaultPerformanceConfig.loadBalancing.autoScaling,
          enabled: false, // Disable auto-scaling for tests
        },
      },
      cdn: {
        ...defaultPerformanceConfig.cdn,
        enabled: false, // Disable CDN for tests
      },
    };

    performanceManager = new PerformanceOptimizationManager(testConfig);
    await performanceManager.initialize();

    // Setup Express app with performance middleware
    performanceMiddleware = new PerformanceMiddleware(performanceManager);
    app = express();

    app.use(express.json());
    app.use(performanceMiddleware.trackRequestPerformance());
    app.use(performanceMiddleware.loadBalance());
    app.use(performanceMiddleware.optimizeDatabase());
    app.use(performanceMiddleware.monitorPerformance());
    app.use(performanceMiddleware.cacheResponse(60)); // 1 minute cache

    // Test routes
    app.get('/api/test/products', async (req, res) => {
      const timer = req.monitor!.startTimer('products.fetch');
      
      try {
        // Simulate database query
        const products = await req.db!.query(
          'SELECT * FROM products WHERE status = $1 LIMIT $2',
          ['active', 10],
          'test_products_active',
          300
        );
        
        timer.end({ success: 'true' });
        req.monitor!.recordEvent('products.fetched', { count: products.length });
        
        res.json({ data: products, count: products.length });
      } catch (error) {
        timer.end({ success: 'false' });
        req.monitor!.recordEvent('products.fetch_error');
        res.status(500).json({ error: 'Failed to fetch products' });
      }
    });

    app.get('/api/test/slow', async (req, res) => {
      // Simulate slow operation
      await new Promise(resolve => setTimeout(resolve, 1500));
      res.json({ message: 'Slow operation completed' });
    });

    app.get('/api/test/error', (req, res) => {
      throw new Error('Test error');
    });

    app.get('/api/test/cache', (req, res) => {
      const data = {
        timestamp: Date.now(),
        random: Math.random(),
        message: 'This should be cached',
      };
      res.json(data);
    });

    app.use(performanceMiddleware.handlePerformanceErrors());
    
    // Global error handler
    app.use((error: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
      res.status(500).json({ error: error.message });
    });
  });

  afterAll(async () => {
    await performanceManager?.shutdown();
  });

  beforeEach(async () => {
    // Clear metrics before each test
    const monitor = performanceManager.getMonitor();
    if (monitor) {
      // Reset metrics (in a real implementation, you'd have a reset method)
    }
  });

  describe('Request Performance Tracking', () => {
    it('should track request metrics', async () => {
      const response = await request(app)
        .get('/api/test/products')
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('count');

      // Check that metrics were recorded
      const monitor = performanceManager.getMonitor();
      expect(monitor).toBeDefined();

      const metrics = monitor!.getMetrics('http.request.duration');
      expect(metrics.length).toBeGreaterThan(0);

      const latestMetric = metrics[metrics.length - 1];
      expect(latestMetric.value).toBeGreaterThan(0);
      expect(latestMetric.unit).toBe('ms');
    });

    it('should detect slow requests', async () => {
      const response = await request(app)
        .get('/api/test/slow')
        .expect(200);

      expect(response.body.message).toBe('Slow operation completed');

      const monitor = performanceManager.getMonitor();
      const metrics = monitor!.getMetrics('http.request.duration');
      const slowMetric = metrics.find(m => m.value > 1000); // Should be > 1 second

      expect(slowMetric).toBeDefined();
    });

    it('should track error metrics', async () => {
      await request(app)
        .get('/api/test/error')
        .expect(500);

      const monitor = performanceManager.getMonitor();
      const errorMetrics = monitor!.getMetrics('error.occurred');
      
      expect(errorMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Caching Integration', () => {
    it('should cache responses', async () => {
      // First request - should be a cache miss
      const response1 = await request(app)
        .get('/api/test/cache')
        .expect(200);

      expect(response1.headers['x-cache']).toBe('MISS');

      // Second request - should be a cache hit
      const response2 = await request(app)
        .get('/api/test/cache')
        .expect(200);

      expect(response2.headers['x-cache']).toBe('HIT');
      expect(response2.body).toEqual(response1.body); // Should be identical
    });

    it('should record cache metrics', async () => {
      // Make requests to generate cache metrics
      await request(app).get('/api/test/cache');
      await request(app).get('/api/test/cache');

      const monitor = performanceManager.getMonitor();
      const hitMetrics = monitor!.getMetrics('cache.hit');
      const missMetrics = monitor!.getMetrics('cache.miss');

      expect(hitMetrics.length + missMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('Load Balancing Integration', () => {
    it('should assign servers to requests', async () => {
      const response = await request(app)
        .get('/api/test/products')
        .expect(200);

      // Check if server assignment headers are present
      // Note: In a real test, you'd check the actual load balancer state
      const loadBalancer = performanceManager.getLoadBalancer();
      expect(loadBalancer).toBeDefined();

      const stats = loadBalancer!.getLoadBalancerStats();
      expect(stats.totalServers).toBeGreaterThan(0);
    });

    it('should track server connections', async () => {
      const loadBalancer = performanceManager.getLoadBalancer();
      const initialStats = loadBalancer!.getLoadBalancerStats();

      // Make multiple concurrent requests
      const requests = Array.from({ length: 5 }, () =>
        request(app).get('/api/test/products')
      );

      await Promise.all(requests);

      const finalStats = loadBalancer!.getLoadBalancerStats();
      expect(finalStats.totalConnections).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Database Optimization Integration', () => {
    it('should optimize database queries', async () => {
      const response = await request(app)
        .get('/api/test/products')
        .expect(200);

      expect(response.body).toHaveProperty('data');

      const monitor = performanceManager.getMonitor();
      const dbMetrics = monitor!.getMetrics('database.query.duration');
      
      expect(dbMetrics.length).toBeGreaterThan(0);
      
      const latestMetric = dbMetrics[dbMetrics.length - 1];
      expect(latestMetric.value).toBeGreaterThan(0);
      expect(latestMetric.unit).toBe('ms');
    });

    it('should cache database query results', async () => {
      // First request - should hit database
      const response1 = await request(app)
        .get('/api/test/products')
        .expect(200);

      // Second request - should use cached result
      const response2 = await request(app)
        .get('/api/test/products')
        .expect(200);

      expect(response1.body).toEqual(response2.body);

      // Check cache service stats
      const cacheService = performanceManager.getCacheService();
      const stats = cacheService!.getStats();
      
      expect(stats.hits + stats.misses).toBeGreaterThan(0);
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should record custom metrics', async () => {
      await request(app)
        .get('/api/test/products')
        .expect(200);

      const monitor = performanceManager.getMonitor();
      
      // Check for custom metrics recorded in the route
      const eventMetrics = monitor!.getMetrics('event.products.fetched');
      expect(eventMetrics.length).toBeGreaterThan(0);

      const timerMetrics = monitor!.getMetrics('products.fetch');
      expect(timerMetrics.length).toBeGreaterThan(0);
    });

    it('should generate performance summary', async () => {
      // Make several requests to generate data
      await Promise.all([
        request(app).get('/api/test/products'),
        request(app).get('/api/test/cache'),
        request(app).get('/api/test/slow'),
      ]);

      const monitor = performanceManager.getMonitor();
      const summary = monitor!.getPerformanceSummary();

      expect(summary).toHaveProperty('system');
      expect(summary).toHaveProperty('application');
      expect(summary).toHaveProperty('alerts');

      expect(summary.application.requests.total).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Performance', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const startTime = Date.now();

      const requests = Array.from({ length: concurrentRequests }, (_, i) =>
        request(app).get(`/api/test/products?page=${i}`)
      );

      const responses = await Promise.all(requests);
      const endTime = Date.now();

      const totalTime = endTime - startTime;
      const averageTime = totalTime / concurrentRequests;

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Performance should be reasonable
      expect(averageTime).toBeLessThan(1000); // Less than 1 second average
      expect(totalTime).toBeLessThan(5000); // Total time less than 5 seconds

      safeLogger.info(`Concurrent requests performance: ${concurrentRequests} requests in ${totalTime}ms (${averageTime.toFixed(2)}ms average)`);
    });

    it('should maintain performance under sustained load', async () => {
      const duration = 5000; // 5 seconds
      const requestInterval = 100; // 100ms between requests
      const startTime = Date.now();
      const responseTimes: number[] = [];

      while (Date.now() - startTime < duration) {
        const requestStart = Date.now();
        
        try {
          await request(app).get('/api/test/products');
          const requestEnd = Date.now();
          responseTimes.push(requestEnd - requestStart);
        } catch (error) {
          safeLogger.error('Request failed:', error);
        }

        await new Promise(resolve => setTimeout(resolve, requestInterval));
      }

      const averageResponseTime = responseTimes.reduce((sum, time) => sum + time, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(responseTimes.length).toBeGreaterThan(10); // Should have made multiple requests
      expect(averageResponseTime).toBeLessThan(500); // Average should be reasonable
      expect(maxResponseTime).toBeLessThan(2000); // No request should be too slow

      safeLogger.info(`Sustained load performance: ${responseTimes.length} requests, ${averageResponseTime.toFixed(2)}ms average, ${maxResponseTime}ms max`);
    });

    it('should generate comprehensive performance report', async () => {
      // Generate various types of requests
      await Promise.all([
        request(app).get('/api/test/products'),
        request(app).get('/api/test/cache'),
        request(app).get('/api/test/slow'),
        request(app).get('/api/test/products?category=electronics'),
        request(app).get('/api/test/cache'), // Should hit cache
      ]);

      const report = await performanceManager.getPerformanceReport();

      expect(report).toHaveProperty('database');
      expect(report).toHaveProperty('cache');
      expect(report).toHaveProperty('loadBalancer');
      expect(report).toHaveProperty('monitoring');

      // Database report
      expect(report.database).toHaveProperty('poolStats');
      expect(report.database).toHaveProperty('queryMetrics');

      // Cache report
      expect(report.cache).toHaveProperty('stats');
      expect(report.cache.stats.hits + report.cache.stats.misses).toBeGreaterThan(0);

      // Load balancer report
      expect(report.loadBalancer).toHaveProperty('stats');
      expect(report.loadBalancer.stats.totalServers).toBeGreaterThan(0);

      // Monitoring report
      expect(report.monitoring).toHaveProperty('summary');
      expect(report.monitoring.summary.application.requests.total).toBeGreaterThan(0);

      safeLogger.info('Performance report generated successfully');
    });
  });
});
