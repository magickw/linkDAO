import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { EnhancedDatabaseOptimizationService } from '../services/enhancedDatabaseOptimizationService';
import { EnhancedCDNOptimizationService } from '../services/enhancedCdnOptimizationService';
import { MarketplaceCachingService } from '../services/marketplaceCachingService';
import { EnhancedMonitoringService } from '../services/enhancedMonitoringService';
import { ErrorTrackingService } from '../services/errorTrackingService';
import { HealthCheckService } from '../services/healthCheckService';
import { PerformanceMonitoringService } from '../services/performanceMonitoringService';
import { AnalyticsService } from '../services/analyticsService';

describe('Performance Optimization Integration Tests', () => {
  let dbService: EnhancedDatabaseOptimizationService;
  let cdnService: EnhancedCDNOptimizationService;
  let cacheService: MarketplaceCachingService;
  let monitoringService: EnhancedMonitoringService;
  let errorTrackingService: ErrorTrackingService;
  let healthCheckService: HealthCheckService;
  let performanceService: PerformanceMonitoringService;
  let analyticsService: AnalyticsService;

  beforeAll(async () => {
    // Initialize services with test configurations
    const dbConfig = {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: parseInt(process.env.TEST_DB_PORT || '5432'),
      database: process.env.TEST_DB_NAME || 'test_marketplace',
      user: process.env.TEST_DB_USER || 'test',
      password: process.env.TEST_DB_PASSWORD || 'test',
      max: 10,
      min: 2,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000
    };

    const cacheConfig = {
      redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
        password: process.env.TEST_REDIS_PASSWORD,
        db: parseInt(process.env.TEST_REDIS_DB || '1'),
        keyPrefix: 'test:marketplace:'
      },
      memory: {
        maxSize: 100,
        ttl: 300000
      },
      marketplace: {
        productCacheTTL: 300,
        userCacheTTL: 600,
        orderCacheTTL: 180,
        searchCacheTTL: 120,
        imageCacheTTL: 3600
      }
    };

    const cdnConfig = {
      distributionId: process.env.TEST_CLOUDFRONT_DISTRIBUTION_ID || 'test-distribution',
      bucketName: process.env.TEST_S3_BUCKET || 'test-bucket',
      region: process.env.TEST_AWS_REGION || 'us-east-1',
      accessKeyId: process.env.TEST_AWS_ACCESS_KEY_ID || 'test-key',
      secretAccessKey: process.env.TEST_AWS_SECRET_ACCESS_KEY || 'test-secret',
      cloudFrontDomain: process.env.TEST_CLOUDFRONT_DOMAIN || 'test.cloudfront.net'
    };

    const monitoringConfig = {
      redis: {
        host: process.env.TEST_REDIS_HOST || 'localhost',
        port: parseInt(process.env.TEST_REDIS_PORT || '6379'),
        password: process.env.TEST_REDIS_PASSWORD,
        db: parseInt(process.env.TEST_REDIS_DB || '2')
      },
      alerting: {
        webhookUrl: process.env.TEST_WEBHOOK_URL
      },
      thresholds: {
        errorRate: 0.05,
        responseTime: 1000,
        memoryUsage: 80,
        cpuUsage: 80,
        diskUsage: 85,
        cacheHitRate: 0.7
      }
    };

    const healthCheckConfig = {
      services: {
        database: { enabled: true, timeout: 5000, critical: true },
        redis: { enabled: true, timeout: 3000, critical: true },
        ipfs: { enabled: false, timeout: 5000, critical: false },
        blockchain: { enabled: false, timeout: 10000, critical: false },
        cdn: { enabled: false, timeout: 5000, critical: false },
        paymentProcessor: { enabled: false, timeout: 5000, critical: false }
      },
      intervals: {
        healthCheck: 30000,
        detailedCheck: 300000
      },
      thresholds: {
        responseTime: 1000,
        errorRate: 0.05,
        uptime: 99.0
      }
    };

    // Initialize services
    dbService = new EnhancedDatabaseOptimizationService(dbConfig);
    cacheService = new MarketplaceCachingService(cacheConfig);
    performanceService = new PerformanceMonitoringService();
    analyticsService = new AnalyticsService();
    
    errorTrackingService = new ErrorTrackingService(
      process.env.TEST_REDIS_URL || 'redis://localhost:6379/3'
    );
    
    healthCheckService = new HealthCheckService(healthCheckConfig);
    
    monitoringService = new EnhancedMonitoringService(
      monitoringConfig,
      performanceService,
      analyticsService,
      cacheService
    );

    // Wait for services to initialize
    await new Promise(resolve => setTimeout(resolve, 1000));
  });

  afterAll(async () => {
    // Cleanup services
    await Promise.allSettled([
      dbService?.close(),
      cacheService?.close(),
      monitoringService?.close(),
      errorTrackingService?.close(),
      healthCheckService?.close(),
      performanceService?.destroy()
    ]);
  });

  describe('Enhanced Database Optimization', () => {
    it('should execute optimized queries with caching', async () => {
      const startTime = Date.now();
      
      const products = await dbService.getOptimizedProductsWithPagination(10, 0, {
        category: 'electronics',
        minPrice: 10,
        maxPrice: 1000
      });
      
      const duration = Date.now() - startTime;
      
      expect(Array.isArray(products)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should complete within 1 second
    });

    it('should create optimized indexes', async () => {
      // This test would verify that indexes are created successfully
      await expect(dbService.createMarketplaceOptimizedIndexes()).resolves.not.toThrow();
    });

    it('should provide query performance metrics', async () => {
      const metrics = dbService.getQueryMetrics();
      expect(Array.isArray(metrics)).toBe(true);
      
      const slowQueries = dbService.getSlowQueries(500);
      expect(Array.isArray(slowQueries)).toBe(true);
    });

    it('should provide pool statistics', async () => {
      const stats = await dbService.getPoolStats();
      expect(stats).toHaveProperty('primary');
      expect(stats.primary).toHaveProperty('totalCount');
      expect(stats.primary).toHaveProperty('idleCount');
    });
  });

  describe('Marketplace Caching Service', () => {
    const testProduct = {
      id: 'test-product-1',
      title: 'Test Product',
      sellerId: 'test-seller-1',
      price: 99.99,
      images: ['image1.jpg', 'image2.jpg']
    };

    it('should cache and retrieve products', async () => {
      await cacheService.cacheProduct(testProduct.id, testProduct);
      
      const cached = await cacheService.getCachedProduct(testProduct.id);
      expect(cached).toEqual(testProduct);
    });

    it('should invalidate product cache correctly', async () => {
      await cacheService.cacheProduct(testProduct.id, testProduct);
      await cacheService.invalidateProductCache(testProduct.id, testProduct.sellerId);
      
      const cached = await cacheService.getCachedProduct(testProduct.id);
      expect(cached).toBeNull();
    });

    it('should cache search results', async () => {
      const searchResults = [testProduct];
      const query = 'test';
      const filters = { category: 'electronics' };
      const pagination = { page: 1, limit: 10 };
      
      await cacheService.cacheSearchResults(query, filters, searchResults, pagination);
      
      const cached = await cacheService.getCachedSearchResults(query, filters, pagination);
      expect(cached).toEqual(searchResults);
    });

    it('should provide cache performance metrics', async () => {
      const metrics = await cacheService.getCachePerformanceMetrics();
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('memoryUsage');
      expect(typeof metrics.hitRate).toBe('number');
    });

    it('should perform health check', async () => {
      const health = await cacheService.healthCheck();
      expect(health).toHaveProperty('redis');
      expect(health).toHaveProperty('memory');
      expect(typeof health.redis).toBe('boolean');
    });
  });

  describe('Error Tracking Service', () => {
    it('should track and group errors', async () => {
      const error1 = new Error('Database connection failed');
      const error2 = new Error('Database connection failed');
      
      const errorId1 = await errorTrackingService.trackError(error1, {
        userId: 'user1',
        url: '/api/products'
      });
      
      const errorId2 = await errorTrackingService.trackError(error2, {
        userId: 'user2',
        url: '/api/products'
      });
      
      expect(typeof errorId1).toBe('string');
      expect(typeof errorId2).toBe('string');
      
      // Should group similar errors
      expect(errorId1).toBe(errorId2);
    });

    it('should provide error analytics', async () => {
      const analytics = await errorTrackingService.getErrorAnalytics();
      
      expect(analytics).toHaveProperty('totalErrors');
      expect(analytics).toHaveProperty('errorRate');
      expect(analytics).toHaveProperty('topErrors');
      expect(analytics).toHaveProperty('errorsByCategory');
      expect(Array.isArray(analytics.topErrors)).toBe(true);
    });

    it('should search errors', async () => {
      const results = await errorTrackingService.searchErrors({
        category: 'database',
        limit: 10
      });
      
      expect(Array.isArray(results)).toBe(true);
    });

    it('should resolve errors', async () => {
      const error = new Error('Test error for resolution');
      const errorId = await errorTrackingService.trackError(error);
      
      const resolved = await errorTrackingService.resolveError(errorId, 'test-user');
      expect(resolved).toBe(true);
    });
  });

  describe('Health Check Service', () => {
    it('should check system health', async () => {
      const health = await healthCheckService.getSystemHealth();
      
      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('services');
      expect(health).toHaveProperty('lastUpdate');
      expect(Array.isArray(health.services)).toBe(true);
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
    });

    it('should check individual service health', async () => {
      const dbHealth = await healthCheckService.getServiceHealth('database');
      
      if (dbHealth) {
        expect(dbHealth).toHaveProperty('service');
        expect(dbHealth).toHaveProperty('status');
        expect(dbHealth).toHaveProperty('responseTime');
        expect(dbHealth.service).toBe('database');
      }
    });

    it('should force health check', async () => {
      await expect(healthCheckService.forceHealthCheck()).resolves.not.toThrow();
      await expect(healthCheckService.forceHealthCheck('database')).resolves.not.toThrow();
    });

    it('should provide health metrics', async () => {
      const metrics = await healthCheckService.getHealthMetrics('database', 50);
      expect(Array.isArray(metrics)).toBe(true);
    });
  });

  describe('Enhanced Monitoring Service', () => {
    it('should get system status', async () => {
      const status = await monitoringService.getSystemStatus();
      
      expect(status).toHaveProperty('overall');
      expect(status).toHaveProperty('services');
      expect(status).toHaveProperty('activeAlerts');
      expect(status).toHaveProperty('lastUpdate');
      expect(Array.isArray(status.services)).toBe(true);
      expect(Array.isArray(status.activeAlerts)).toBe(true);
    });

    it('should provide performance insights', async () => {
      const insights = await monitoringService.getPerformanceInsights();
      expect(Array.isArray(insights)).toBe(true);
    });

    it('should get dashboard data', async () => {
      const dashboardData = await monitoringService.getDashboardData();
      // Dashboard data might be null if no monitoring cycle has run yet
      if (dashboardData) {
        expect(typeof dashboardData).toBe('object');
      }
    });
  });

  describe('Performance Integration', () => {
    it('should handle high load scenarios', async () => {
      const promises = [];
      
      // Simulate concurrent requests
      for (let i = 0; i < 50; i++) {
        promises.push(
          cacheService.cacheProduct(`product-${i}`, {
            id: `product-${i}`,
            title: `Product ${i}`,
            sellerId: `seller-${i % 10}`,
            price: Math.random() * 1000
          })
        );
      }
      
      const startTime = Date.now();
      await Promise.all(promises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
    });

    it('should maintain performance under error conditions', async () => {
      // Generate multiple errors
      const errorPromises = [];
      for (let i = 0; i < 20; i++) {
        errorPromises.push(
          errorTrackingService.trackError(
            new Error(`Test error ${i}`),
            { userId: `user-${i}` }
          )
        );
      }
      
      const startTime = Date.now();
      await Promise.all(errorPromises);
      const duration = Date.now() - startTime;
      
      expect(duration).toBeLessThan(2000); // Should handle errors quickly
    });

    it('should provide comprehensive monitoring data', async () => {
      // Wait for monitoring cycle to run
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      const [
        systemStatus,
        systemHealth,
        errorAnalytics,
        cacheMetrics
      ] = await Promise.all([
        monitoringService.getSystemStatus(),
        healthCheckService.getSystemHealth(),
        errorTrackingService.getErrorAnalytics(),
        cacheService.getCachePerformanceMetrics()
      ]);
      
      expect(systemStatus).toBeDefined();
      expect(systemHealth).toBeDefined();
      expect(errorAnalytics).toBeDefined();
      expect(cacheMetrics).toBeDefined();
      
      // Verify data structure
      expect(systemStatus.services.length).toBeGreaterThan(0);
      expect(systemHealth.services.length).toBeGreaterThan(0);
      expect(typeof errorAnalytics.totalErrors).toBe('number');
      expect(typeof cacheMetrics.hitRate).toBe('number');
    });
  });

  describe('Performance Benchmarks', () => {
    it('should meet database query performance benchmarks', async () => {
      const iterations = 10;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await dbService.getOptimizedProductsWithPagination(20, i * 20);
        times.push(Date.now() - startTime);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(averageTime).toBeLessThan(500); // Average under 500ms
      expect(maxTime).toBeLessThan(1000); // Max under 1 second
    });

    it('should meet cache performance benchmarks', async () => {
      const iterations = 100;
      const times: number[] = [];
      
      // Pre-populate cache
      await cacheService.cacheProduct('benchmark-product', {
        id: 'benchmark-product',
        title: 'Benchmark Product',
        sellerId: 'benchmark-seller'
      });
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await cacheService.getCachedProduct('benchmark-product');
        times.push(Date.now() - startTime);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(averageTime).toBeLessThan(10); // Average under 10ms
      expect(maxTime).toBeLessThan(50); // Max under 50ms
    });

    it('should meet error tracking performance benchmarks', async () => {
      const iterations = 50;
      const times: number[] = [];
      
      for (let i = 0; i < iterations; i++) {
        const startTime = Date.now();
        await errorTrackingService.trackError(
          new Error(`Benchmark error ${i}`),
          { userId: `benchmark-user-${i}` }
        );
        times.push(Date.now() - startTime);
      }
      
      const averageTime = times.reduce((sum, time) => sum + time, 0) / times.length;
      const maxTime = Math.max(...times);
      
      expect(averageTime).toBeLessThan(100); // Average under 100ms
      expect(maxTime).toBeLessThan(500); // Max under 500ms
    });
  });
});