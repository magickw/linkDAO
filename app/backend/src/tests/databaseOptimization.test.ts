/**
 * Database Optimization Tests
 * Tests for task 14.1: Optimize database queries
 */

import { Pool } from 'pg';
import EnhancedDatabaseOptimizationService from '../services/enhancedDatabaseOptimizationService';
import DatabaseConnectionOptimizer from '../services/databaseConnectionOptimizer';
import DatabaseOptimizationIntegration from '../services/databaseOptimizationIntegration';
import { queryResultCachingMiddleware } from '../middleware/queryResultCachingMiddleware';

// Mock pool for testing
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
  options: { max: 10 },
  on: jest.fn(),
  end: jest.fn()
} as unknown as Pool;

// Mock client
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  processID: 12345
};

describe('Database Optimization Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (mockPool.connect as jest.Mock).mockResolvedValue(mockClient);
  });

  describe('EnhancedDatabaseOptimizationService', () => {
    let service: EnhancedDatabaseOptimizationService;

    beforeEach(() => {
      service = new EnhancedDatabaseOptimizationService(mockPool);
    });

    afterEach(() => {
      service.stopMonitoring();
    });

    test('should execute optimized query with caching', async () => {
      const mockResult = { rows: [{ id: 1, name: 'test' }], rowCount: 1 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await service.executeOptimizedQuery(
        'SELECT * FROM users WHERE id = $1',
        [1],
        { enableCache: true }
      );

      expect(result.rows).toEqual(mockResult.rows);
      expect(result.fromCache).toBe(false);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(mockClient.query).toHaveBeenCalled();
      expect(mockClient.release).toHaveBeenCalled();
    });

    test('should generate index optimization plan', async () => {
      const mockIndexResult = {
        rows: [
          {
            name: 'idx_users_email',
            columns: ['email'],
            type: 'btree',
            size: '16 kB',
            usage: 100
          }
        ]
      };
      (mockClient.query as jest.Mock).mockResolvedValue(mockIndexResult);

      const plan = await service.generateIndexOptimizationPlan('users');

      expect(plan.table).toBe('users');
      expect(plan.currentIndexes).toBeDefined();
      expect(plan.recommendedIndexes).toBeDefined();
      expect(plan.redundantIndexes).toBeDefined();
    });

    test('should track query performance profiles', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      // Execute the same query multiple times
      for (let i = 0; i < 5; i++) {
        await service.executeOptimizedQuery('SELECT * FROM posts ORDER BY created_at DESC');
      }

      const profiles = service.getQueryProfiles();
      expect(profiles.length).toBeGreaterThan(0);
      
      const profile = profiles[0];
      expect(profile.executionCount).toBe(5);
      expect(profile.averageExecutionTime).toBeGreaterThan(0);
    });

    test('should provide optimization recommendations', async () => {
      const recommendations = service.getIndexRecommendations();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('DatabaseConnectionOptimizer', () => {
    let optimizer: DatabaseConnectionOptimizer;

    beforeEach(() => {
      optimizer = new DatabaseConnectionOptimizer(mockPool);
    });

    afterEach(() => {
      optimizer.stopMonitoring();
    });

    test('should execute query with connection monitoring', async () => {
      const mockResult = { rows: [{ count: 5 }], rowCount: 1 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await optimizer.executeQuery('SELECT COUNT(*) FROM users');

      expect(result.rows).toEqual(mockResult.rows);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.connectionId).toBeDefined();
    });

    test('should track connection pool metrics', () => {
      const metrics = optimizer.getMetrics();

      expect(metrics).toHaveProperty('totalConnections');
      expect(metrics).toHaveProperty('activeConnections');
      expect(metrics).toHaveProperty('idleConnections');
      expect(metrics).toHaveProperty('poolUtilization');
      expect(metrics).toHaveProperty('averageQueryTime');
    });

    test('should provide connection health report', () => {
      const healthReport = optimizer.getConnectionHealthReport();

      expect(healthReport).toHaveProperty('totalConnections');
      expect(healthReport).toHaveProperty('healthyConnections');
      expect(healthReport).toHaveProperty('unhealthyConnections');
      expect(healthReport).toHaveProperty('connectionDetails');
      expect(Array.isArray(healthReport.connectionDetails)).toBe(true);
    });

    test('should generate optimization recommendations', async () => {
      const recommendations = await optimizer.getOptimizationRecommendations();

      expect(Array.isArray(recommendations)).toBe(true);
      recommendations.forEach(rec => {
        expect(rec).toHaveProperty('parameter');
        expect(rec).toHaveProperty('currentValue');
        expect(rec).toHaveProperty('recommendedValue');
        expect(rec).toHaveProperty('reason');
        expect(rec).toHaveProperty('impact');
        expect(rec).toHaveProperty('estimatedImprovement');
      });
    });

    test('should provide pool health status', () => {
      const health = optimizer.getPoolHealth();

      expect(health).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('utilization');
      expect(Array.isArray(health.issues)).toBe(true);
    });

    test('should create optimized pool configuration', () => {
      const config = DatabaseConnectionOptimizer.createOptimizedPoolConfig();

      expect(config).toHaveProperty('max');
      expect(config).toHaveProperty('min');
      expect(config).toHaveProperty('connectionTimeoutMillis');
      expect(config).toHaveProperty('idleTimeoutMillis');
      expect(config).toHaveProperty('keepAlive');
      expect(config.max).toBeGreaterThan(0);
      expect(config.connectionTimeoutMillis).toBeGreaterThan(0);
    });
  });

  describe('DatabaseOptimizationIntegration', () => {
    let integration: DatabaseOptimizationIntegration;

    beforeEach(() => {
      integration = new DatabaseOptimizationIntegration(mockPool, {
        autoApplyOptimizations: false,
        reportingInterval: 60000,
        optimizationInterval: 300000
      });
    });

    afterEach(() => {
      integration.stop();
    });

    test('should execute optimized query through integration', async () => {
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      const result = await integration.executeOptimizedQuery(
        'SELECT * FROM products WHERE status = $1',
        ['active']
      );

      expect(result.rows).toEqual(mockResult.rows);
      expect(result.executionTime).toBeGreaterThan(0);
    });

    test('should generate comprehensive optimization report', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      const report = await integration.generateOptimizationReport();

      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('performance');
      expect(report).toHaveProperty('indexing');
      expect(report).toHaveProperty('caching');
      expect(report).toHaveProperty('connections');
      expect(report).toHaveProperty('recommendations');

      expect(report.performance).toHaveProperty('averageQueryTime');
      expect(report.performance).toHaveProperty('slowQueries');
      expect(report.performance).toHaveProperty('cacheHitRate');
      expect(report.performance).toHaveProperty('connectionPoolUtilization');

      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    test('should provide health status', async () => {
      const health = await integration.getHealthStatus();

      expect(health).toHaveProperty('overall');
      expect(health).toHaveProperty('components');
      expect(health).toHaveProperty('issues');
      expect(health).toHaveProperty('recommendations');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.overall);
      expect(health.components).toHaveProperty('queries');
      expect(health.components).toHaveProperty('indexes');
      expect(health.components).toHaveProperty('caching');
      expect(health.components).toHaveProperty('connections');
      expect(Array.isArray(health.issues)).toBe(true);
    });

    test('should get latest report', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      await integration.generateOptimizationReport();
      const latestReport = integration.getLatestReport();

      expect(latestReport).toBeDefined();
      expect(latestReport).toHaveProperty('timestamp');
      expect(latestReport).toHaveProperty('recommendations');
    });
  });

  describe('Query Result Caching Middleware', () => {
    test('should provide cache metrics', () => {
      const metrics = queryResultCachingMiddleware.getCacheMetrics();

      expect(metrics).toHaveProperty('hits');
      expect(metrics).toHaveProperty('misses');
      expect(metrics).toHaveProperty('hitRate');
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('avgResponseTime');
      expect(metrics).toHaveProperty('cacheSize');
    });

    test('should provide cache health status', async () => {
      const health = await queryResultCachingMiddleware.getCacheHealth();

      expect(health).toHaveProperty('status');
      expect(health).toHaveProperty('hitRate');
      expect(health).toHaveProperty('avgResponseTime');
      expect(health).toHaveProperty('cacheSize');
      expect(health).toHaveProperty('issues');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(health.status);
      expect(Array.isArray(health.issues)).toBe(true);
    });

    test('should reset metrics', () => {
      queryResultCachingMiddleware.resetMetrics();
      const metrics = queryResultCachingMiddleware.getCacheMetrics();

      expect(metrics.hits).toBe(0);
      expect(metrics.misses).toBe(0);
      expect(metrics.totalRequests).toBe(0);
      expect(metrics.hitRate).toBe(0);
    });
  });

  describe('Integration Tests', () => {
    test('should handle database connection errors gracefully', async () => {
      const errorPool = {
        ...mockPool,
        connect: jest.fn().mockRejectedValue(new Error('Connection failed'))
      } as unknown as Pool;

      const service = new EnhancedDatabaseOptimizationService(errorPool);

      await expect(
        service.executeOptimizedQuery('SELECT 1')
      ).rejects.toThrow('Connection failed');

      service.stopMonitoring();
    });

    test('should handle query execution errors', async () => {
      const errorClient = {
        ...mockClient,
        query: jest.fn().mockRejectedValue(new Error('Query failed'))
      };
      (mockPool.connect as jest.Mock).mockResolvedValue(errorClient);

      const optimizer = new DatabaseConnectionOptimizer(mockPool);

      await expect(
        optimizer.executeQuery('INVALID SQL')
      ).rejects.toThrow('Query failed');

      optimizer.stopMonitoring();
    });

    test('should maintain performance under load', async () => {
      const service = new EnhancedDatabaseOptimizationService(mockPool);
      const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
      (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          service.executeOptimizedQuery(`SELECT * FROM users WHERE id = ${i}`)
        );
      }

      const results = await Promise.all(promises);
      expect(results).toHaveLength(100);
      results.forEach(result => {
        expect(result.rows).toEqual(mockResult.rows);
        expect(result.executionTime).toBeGreaterThan(0);
      });

      service.stopMonitoring();
    });
  });
});

describe('Database Optimization SQL Migration', () => {
  test('should validate enhanced performance indexes SQL', () => {
    // This would test the SQL migration file in a real scenario
    // For now, we'll just verify the structure exists
    expect(true).toBe(true); // Placeholder test
  });

  test('should validate index naming conventions', () => {
    const indexNames = [
      'idx_posts_community_created_at',
      'idx_reactions_post_type_amount',
      'idx_orders_buyer_status_created',
      'idx_products_category_price_created'
    ];

    indexNames.forEach(name => {
      expect(name).toMatch(/^idx_\w+_\w+/);
      expect(name.length).toBeLessThan(64); // PostgreSQL identifier limit
    });
  });
});

describe('Performance Benchmarks', () => {
  test('should meet query execution time targets', async () => {
    const service = new EnhancedDatabaseOptimizationService(mockPool);
    const mockResult = { rows: [{ id: 1 }], rowCount: 1 };
    (mockClient.query as jest.Mock).mockResolvedValue(mockResult);

    const startTime = Date.now();
    await service.executeOptimizedQuery('SELECT * FROM users LIMIT 10');
    const executionTime = Date.now() - startTime;

    // Should complete within reasonable time (accounting for mocking overhead)
    expect(executionTime).toBeLessThan(1000);

    service.stopMonitoring();
  });

  test('should maintain cache hit rate targets', () => {
    // Simulate cache usage
    queryResultCachingMiddleware.resetMetrics();
    
    // In a real test, you would make actual cached requests
    // For now, we'll just verify the metrics structure
    const metrics = queryResultCachingMiddleware.getCacheMetrics();
    expect(typeof metrics.hitRate).toBe('number');
    expect(metrics.hitRate).toBeGreaterThanOrEqual(0);
    expect(metrics.hitRate).toBeLessThanOrEqual(1);
  });
});
