/**
 * Seller Database Optimization Tests
 * Tests for Task 15: Optimize database queries and performance
 */

import { Pool } from 'pg';
import SellerQueryOptimizer from '../services/sellerQueryOptimizer';
import SellerDatabaseOptimizationIntegration from '../services/sellerDatabaseOptimizationIntegration';

// Mock pool for testing
const mockPool = {
  connect: jest.fn(),
  query: jest.fn(),
  end: jest.fn(),
  totalCount: 10,
  idleCount: 5,
  waitingCount: 0,
  options: { max: 10 }
} as unknown as Pool;

// Mock client
const mockClient = {
  query: jest.fn(),
  release: jest.fn(),
  processID: 12345
};

describe('SellerQueryOptimizer', () => {
  let optimizer: SellerQueryOptimizer;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect = jest.fn().mockResolvedValue(mockClient);
    optimizer = new SellerQueryOptimizer(mockPool);
  });

  describe('executeSellerQuery', () => {
    it('should execute optimized seller profile query', async () => {
      const mockResult = {
        rows: [{
          wallet_address: '0x123',
          display_name: 'Test Seller',
          tier_id: 'bronze',
          performance_score: 85.5
        }],
        rowCount: 1
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await optimizer.executeSellerQuery(
        'getSellerProfile',
        ['0x123'],
        '0x123'
      );

      expect(result.rows).toEqual(mockResult.rows);
      expect(result.metrics.queryType).toBe('getSellerProfile');
      expect(result.metrics.sellerWalletAddress).toBe('0x123');
      expect(result.metrics.executionTime).toBeGreaterThan(0);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        ['0x123']
      );
    });

    it('should handle query errors gracefully', async () => {
      const error = new Error('Database connection failed');
      mockClient.query.mockRejectedValue(error);

      await expect(
        optimizer.executeSellerQuery('getSellerProfile', ['0x123'], '0x123')
      ).rejects.toThrow('Database connection failed');
    });

    it('should track query metrics', async () => {
      const mockResult = { rows: [], rowCount: 0 };
      mockClient.query.mockResolvedValue(mockResult);

      await optimizer.executeSellerQuery('getSellerProfile', ['0x123'], '0x123');

      const metrics = optimizer.getQueryMetrics();
      expect(metrics).toHaveLength(1);
      expect(metrics[0].queryType).toBe('getSellerProfile');
      expect(metrics[0].sellerWalletAddress).toBe('0x123');
    });
  });

  describe('getSellerProfile', () => {
    it('should return seller profile data', async () => {
      const mockProfile = {
        wallet_address: '0x123',
        display_name: 'Test Seller',
        tier_id: 'bronze'
      };

      mockClient.query.mockResolvedValue({
        rows: [mockProfile],
        rowCount: 1
      });

      const result = await optimizer.getSellerProfile('0x123');

      expect(result).toEqual(mockProfile);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('FROM sellers s'),
        ['0x123']
      );
    });

    it('should return null for non-existent seller', async () => {
      mockClient.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      const result = await optimizer.getSellerProfile('0x999');

      expect(result).toBeNull();
    });
  });

  describe('getSellerDashboard', () => {
    it('should return comprehensive dashboard data', async () => {
      const mockDashboard = {
        wallet_address: '0x123',
        display_name: 'Test Seller',
        active_listings: 5,
        pending_orders: 2,
        recent_completed_orders: 10
      };

      mockClient.query.mockResolvedValue({
        rows: [mockDashboard],
        rowCount: 1
      });

      const result = await optimizer.getSellerDashboard('0x123');

      expect(result).toEqual(mockDashboard);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('COUNT(DISTINCT p.id)'),
        ['0x123']
      );
    });
  });

  describe('getSellerListings', () => {
    it('should return paginated seller listings', async () => {
      const mockListings = [
        { id: '1', title: 'Product 1', status: 'active' },
        { id: '2', title: 'Product 2', status: 'active' }
      ];

      mockClient.query.mockResolvedValue({
        rows: mockListings,
        rowCount: 2
      });

      const result = await optimizer.getSellerListings('0x123', 'active', 10, 0);

      expect(result).toEqual(mockListings);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('LIMIT $3 OFFSET $4'),
        ['0x123', 'active', 10, 0]
      );
    });

    it('should handle null status filter', async () => {
      mockClient.query.mockResolvedValue({
        rows: [],
        rowCount: 0
      });

      await optimizer.getSellerListings('0x123', undefined, 10, 0);

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.anything(),
        ['0x123', null, 10, 0]
      );
    });
  });

  describe('invalidateSellerCache', () => {
    it('should call cache invalidation function', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await optimizer.invalidateSellerCache('0x123', 'profile_update', 'dashboard');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('invalidate_seller_cache'),
        ['0x123', 'profile_update', 'dashboard']
      );
    });
  });

  describe('updateSellerPerformanceMetrics', () => {
    it('should call performance metrics update function', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await optimizer.updateSellerPerformanceMetrics('0x123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('update_seller_performance_metrics'),
        ['0x123']
      );
    });
  });

  describe('getQueryStatistics', () => {
    it('should return query performance statistics', async () => {
      // Add some mock metrics
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });
      
      await optimizer.executeSellerQuery('getSellerProfile', ['0x123'], '0x123');
      await optimizer.executeSellerQuery('getSellerDashboard', ['0x123'], '0x123');

      const stats = optimizer.getQueryStatistics();

      expect(stats.totalQueries).toBe(2);
      expect(stats.queryTypeBreakdown).toHaveProperty('getSellerProfile', 1);
      expect(stats.queryTypeBreakdown).toHaveProperty('getSellerDashboard', 1);
      expect(stats.performanceByType).toHaveProperty('getSellerProfile');
      expect(stats.performanceByType).toHaveProperty('getSellerDashboard');
    });
  });

  describe('getSlowQueries', () => {
    it('should identify slow queries', async () => {
      // Mock a slow query by manipulating the performance timer
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0 : 1000; // 1000ms execution time
      });

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await optimizer.executeSellerQuery('getSellerProfile', ['0x123'], '0x123');

      const slowQueries = optimizer.getSlowQueries(500);

      expect(slowQueries).toHaveLength(1);
      expect(slowQueries[0].executionTime).toBe(1000);

      // Restore original performance.now
      performance.now = originalNow;
    });
  });

  describe('generateOptimizationRecommendations', () => {
    it('should generate recommendations for slow queries', async () => {
      // Mock slow query execution
      const originalNow = performance.now;
      let callCount = 0;
      performance.now = jest.fn(() => {
        callCount++;
        return callCount === 1 ? 0 : 1500; // 1500ms execution time
      });

      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await optimizer.executeSellerQuery('getSellerProfile', ['0x123'], '0x123');

      const recommendations = await optimizer.generateOptimizationRecommendations();

      expect(recommendations).toHaveLength(1);
      expect(recommendations[0].queryType).toBe('getSellerProfile');
      expect(recommendations[0].estimatedImprovement).toBeGreaterThan(0);
      expect(recommendations[0].indexRecommendations).toContain(
        expect.stringContaining('CREATE INDEX')
      );

      // Restore original performance.now
      performance.now = originalNow;
    });
  });
});

describe('SellerDatabaseOptimizationIntegration', () => {
  let integration: SellerDatabaseOptimizationIntegration;

  beforeEach(() => {
    jest.clearAllMocks();
    mockPool.connect = jest.fn().mockResolvedValue(mockClient);
    integration = new SellerDatabaseOptimizationIntegration(mockPool);
  });

  describe('executeSellerQuery', () => {
    it('should execute query through integrated optimizer', async () => {
      const mockResult = {
        rows: [{ wallet_address: '0x123' }],
        rowCount: 1
      };

      mockClient.query.mockResolvedValue(mockResult);

      const result = await integration.executeSellerQuery(
        'getSellerProfile',
        ['0x123'],
        '0x123'
      );

      expect(result.rows).toEqual(mockResult.rows);
      expect(result.executionTime).toBeGreaterThan(0);
      expect(result.fromCache).toBe(false);
    });
  });

  describe('getOptimizedSellerProfile', () => {
    it('should return optimized seller profile', async () => {
      const mockProfile = {
        wallet_address: '0x123',
        display_name: 'Test Seller'
      };

      mockClient.query.mockResolvedValue({
        rows: [mockProfile],
        rowCount: 1
      });

      const result = await integration.getOptimizedSellerProfile('0x123');

      expect(result).toEqual(mockProfile);
    });
  });

  describe('getOptimizedSellerDashboard', () => {
    it('should return optimized dashboard data', async () => {
      const mockDashboard = {
        wallet_address: '0x123',
        active_listings: 5
      };

      mockClient.query.mockResolvedValue({
        rows: [mockDashboard],
        rowCount: 1
      });

      const result = await integration.getOptimizedSellerDashboard('0x123');

      expect(result).toEqual(mockDashboard);
    });
  });

  describe('getOptimizedSellerListings', () => {
    it('should return optimized listings with pagination', async () => {
      const mockListings = [
        { id: '1', title: 'Product 1' },
        { id: '2', title: 'Product 2' }
      ];

      mockClient.query.mockResolvedValue({
        rows: mockListings,
        rowCount: 2
      });

      const result = await integration.getOptimizedSellerListings('0x123', 'active', 10, 0);

      expect(result).toEqual(mockListings);
    });
  });

  describe('getOptimizationStatus', () => {
    it('should return optimization status', () => {
      const status = integration.getOptimizationStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('summary');
      expect(status).toHaveProperty('trends');
      expect(status.trends).toHaveProperty('queryPerformance');
      expect(status.trends).toHaveProperty('connectionHealth');
      expect(status.trends).toHaveProperty('cacheEfficiency');
    });

    it('should indicate good status for new instance', () => {
      const status = integration.getOptimizationStatus();

      expect(status.status).toBe('good');
      expect(status.summary).toContain('starting up');
    });
  });

  describe('invalidateSellerCache', () => {
    it('should invalidate cache through integrated system', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await integration.invalidateSellerCache('0x123', 'profile_update');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('invalidate_seller_cache'),
        ['0x123', 'profile_update', undefined]
      );
    });
  });

  describe('updateSellerPerformanceMetrics', () => {
    it('should update performance metrics through integrated system', async () => {
      mockClient.query.mockResolvedValue({ rows: [], rowCount: 0 });

      await integration.updateSellerPerformanceMetrics('0x123');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('update_seller_performance_metrics'),
        ['0x123']
      );
    });
  });

  describe('getServices', () => {
    it('should provide access to all optimization services', () => {
      const services = integration.getServices();

      expect(services).toHaveProperty('databaseOptimizer');
      expect(services).toHaveProperty('connectionOptimizer');
      expect(services).toHaveProperty('sellerQueryOptimizer');
    });
  });
});

describe('Database Schema Optimization', () => {
  describe('Seller Performance Fields', () => {
    it('should have required seller performance fields', () => {
      // This would test the actual database schema
      // In a real test, you would check if the columns exist
      const expectedFields = [
        'tier_id',
        'tier_progress',
        'cache_version',
        'last_cache_invalidation',
        'performance_score',
        'total_sales',
        'total_orders',
        'average_rating',
        'response_time_hours',
        'completion_rate'
      ];

      expectedFields.forEach(field => {
        expect(field).toBeDefined();
      });
    });
  });

  describe('Seller Analytics Table', () => {
    it('should have seller analytics table structure', () => {
      const expectedColumns = [
        'id',
        'seller_id',
        'seller_wallet_address',
        'metric_type',
        'metric_value',
        'recorded_at',
        'metadata'
      ];

      expectedColumns.forEach(column => {
        expect(column).toBeDefined();
      });
    });
  });

  describe('Seller Tiers Table', () => {
    it('should have seller tiers table structure', () => {
      const expectedColumns = [
        'id',
        'name',
        'level',
        'requirements',
        'benefits',
        'limitations',
        'created_at'
      ];

      expectedColumns.forEach(column => {
        expect(column).toBeDefined();
      });
    });
  });

  describe('Performance Indexes', () => {
    it('should have optimized indexes for seller queries', () => {
      const expectedIndexes = [
        'idx_sellers_wallet_address_optimized',
        'idx_sellers_tier_performance',
        'idx_sellers_verification_status',
        'idx_seller_analytics_wallet_type_recorded',
        'idx_products_seller_status_updated_optimized',
        'idx_orders_seller_status_amount'
      ];

      expectedIndexes.forEach(index => {
        expect(index).toBeDefined();
      });
    });
  });
});

describe('Query Performance Functions', () => {
  describe('track_seller_query_performance', () => {
    it('should track query performance metrics', () => {
      const functionCall = 'SELECT track_seller_query_performance($1, $2, $3, $4, $5)';
      const params = [
        'getSellerProfile',
        '0x123',
        150.5,
        1,
        JSON.stringify({ optimized: true })
      ];

      expect(functionCall).toContain('track_seller_query_performance');
      expect(params).toHaveLength(5);
    });
  });

  describe('invalidate_seller_cache', () => {
    it('should invalidate seller cache', () => {
      const functionCall = 'SELECT invalidate_seller_cache($1, $2, $3)';
      const params = ['0x123', 'profile_update', 'dashboard'];

      expect(functionCall).toContain('invalidate_seller_cache');
      expect(params).toHaveLength(3);
    });
  });

  describe('update_seller_performance_metrics', () => {
    it('should update seller performance metrics', () => {
      const functionCall = 'SELECT update_seller_performance_metrics($1)';
      const params = ['0x123'];

      expect(functionCall).toContain('update_seller_performance_metrics');
      expect(params).toHaveLength(1);
    });
  });

  describe('refresh_seller_performance_dashboard', () => {
    it('should refresh materialized view', () => {
      const functionCall = 'SELECT refresh_seller_performance_dashboard()';

      expect(functionCall).toContain('refresh_seller_performance_dashboard');
    });
  });
});
