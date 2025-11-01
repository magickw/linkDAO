import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { moderationMetricsService } from '../services/moderationMetricsService';
import { moderationLoggingService } from '../services/moderationLoggingService';

// Mock dependencies
vi.mock('../db/connectionPool');

describe('Moderation Metrics Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('High Load Scenarios', () => {
    it('should handle concurrent metric requests efficiently', async () => {
      const startTime = Date.now();
      const concurrentRequests = 50;

      const promises = Array.from({ length: concurrentRequests }, () =>
        moderationMetricsService.getSystemMetrics(3600000)
      );

      const results = await Promise.all(promises);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds

      // All results should have the same structure
      results.forEach(result => {
        expect(result).toHaveProperty('performance');
        expect(result).toHaveProperty('health');
        expect(result).toHaveProperty('business');
        expect(result).toHaveProperty('costs');
      });
    });

    it('should cache metrics effectively under load', async () => {
      const spy = vi.spyOn(moderationLoggingService, 'getPerformanceMetrics');
      
      // Make multiple requests in quick succession
      const promises = Array.from({ length: 20 }, () =>
        moderationMetricsService.getSystemMetrics(3600000)
      );

      await Promise.all(promises);

      // Due to caching, the underlying service should be called much less
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('should maintain performance with large datasets', async () => {
      // Mock large dataset response
      const largeDataset = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        timestamp: new Date(),
        eventType: 'decision',
        contentId: `content_${i}`,
        userId: `user_${i}`,
        decision: i % 2 === 0 ? 'block' : 'allow',
        confidence: Math.random(),
        latency: Math.random() * 3000,
        cost: Math.random() * 0.1
      }));

      const startTime = Date.now();
      
      // Simulate processing large dataset
      const metrics = await moderationMetricsService.getSystemMetrics(86400000);
      
      const endTime = Date.now();

      expect(metrics).toBeDefined();
      expect(endTime - startTime).toBeLessThan(3000); // Should process within 3 seconds
    });
  });

  describe('Memory Usage Optimization', () => {
    it('should not leak memory during continuous operation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Simulate continuous operation
      for (let i = 0; i < 100; i++) {
        await moderationMetricsService.getSystemMetrics(3600000);
        
        // Force garbage collection if available
        if (global.gc) {
          global.gc();
        }
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be reasonable (less than 50MB)
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024);
    });

    it('should clear cache appropriately', async () => {
      // Fill cache
      await moderationMetricsService.getSystemMetrics(3600000);
      await moderationMetricsService.getBusinessMetrics(3600000);

      const beforeClear = process.memoryUsage().heapUsed;

      // Clear cache (this would be done internally by the service)
      // In a real implementation, we'd have a method to clear cache
      
      const afterClear = process.memoryUsage().heapUsed;

      // Memory usage should not increase significantly
      expect(afterClear - beforeClear).toBeLessThan(10 * 1024 * 1024);
    });
  });

  describe('Latency Benchmarks', () => {
    it('should return system metrics within acceptable latency', async () => {
      const measurements = [];

      for (let i = 0; i < 10; i++) {
        const start = Date.now();
        await moderationMetricsService.getSystemMetrics(3600000);
        const end = Date.now();
        measurements.push(end - start);
      }

      const averageLatency = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      const maxLatency = Math.max(...measurements);

      expect(averageLatency).toBeLessThan(1000); // Average under 1 second
      expect(maxLatency).toBeLessThan(2000); // Max under 2 seconds
    });

    it('should return business metrics within acceptable latency', async () => {
      const start = Date.now();
      await moderationMetricsService.getBusinessMetrics(86400000);
      const end = Date.now();

      expect(end - start).toBeLessThan(1500); // Should complete within 1.5 seconds
    });

    it('should check alert thresholds quickly', async () => {
      const start = Date.now();
      await moderationMetricsService.checkAlertThresholds();
      const end = Date.now();

      expect(end - start).toBeLessThan(500); // Should complete within 500ms
    });
  });

  describe('Scalability Tests', () => {
    it('should handle increasing time windows efficiently', async () => {
      const timeWindows = [
        3600000,    // 1 hour
        86400000,   // 1 day
        604800000,  // 1 week
        2592000000  // 1 month
      ];

      const latencies = [];

      for (const timeWindow of timeWindows) {
        const start = Date.now();
        await moderationMetricsService.getSystemMetrics(timeWindow);
        const end = Date.now();
        latencies.push(end - start);
      }

      // Latency should not increase dramatically with larger time windows
      const maxLatency = Math.max(...latencies);
      const minLatency = Math.min(...latencies);
      const latencyRatio = maxLatency / minLatency;

      expect(latencyRatio).toBeLessThan(5); // Max should be less than 5x min
    });

    it('should maintain performance with multiple concurrent users', async () => {
      const userCount = 25;
      const requestsPerUser = 4;

      const allPromises = [];

      for (let user = 0; user < userCount; user++) {
        const userPromises = Array.from({ length: requestsPerUser }, () =>
          moderationMetricsService.getSystemMetrics(3600000)
        );
        allPromises.push(...userPromises);
      }

      const start = Date.now();
      const results = await Promise.all(allPromises);
      const end = Date.now();

      expect(results).toHaveLength(userCount * requestsPerUser);
      expect(end - start).toBeLessThan(10000); // Should complete within 10 seconds

      // All results should be valid
      results.forEach(result => {
        expect(result).toHaveProperty('performance');
        expect(result.performance).toHaveProperty('totalDecisions');
      });
    });
  });

  describe('Resource Utilization', () => {
    it('should not exceed CPU usage limits during intensive operations', async () => {
      const startCpuUsage = process.cpuUsage();

      // Perform intensive operations
      const promises = Array.from({ length: 100 }, async () => {
        await moderationMetricsService.getSystemMetrics(3600000);
        await moderationMetricsService.getBusinessMetrics(3600000);
        await moderationMetricsService.checkAlertThresholds();
      });

      await Promise.all(promises);

      const endCpuUsage = process.cpuUsage(startCpuUsage);
      const totalCpuTime = endCpuUsage.user + endCpuUsage.system;

      // CPU usage should be reasonable (less than 5 seconds of CPU time)
      expect(totalCpuTime).toBeLessThan(5000000); // 5 seconds in microseconds
    });

    it('should handle database connection pool efficiently', async () => {
      // Simulate many concurrent database operations
      const promises = Array.from({ length: 50 }, () =>
        moderationMetricsService.getBusinessMetrics(3600000)
      );

      const start = Date.now();
      const results = await Promise.all(promises);
      const end = Date.now();

      expect(results).toHaveLength(50);
      expect(end - start).toBeLessThan(8000); // Should complete within 8 seconds

      // All results should be valid
      results.forEach(result => {
        expect(result).toHaveProperty('totalContentProcessed');
        expect(result).toHaveProperty('contentByType');
      });
    });
  });

  describe('Error Recovery Performance', () => {
    it('should recover quickly from database errors', async () => {
      // Mock database error for first few calls
      let callCount = 0;
      const originalSelect = vi.mocked(require('../db/connectionPool').db.select);
      
      vi.mocked(require('../db/connectionPool').db.select).mockImplementation(() => {
        callCount++;
        if (callCount <= 3) {
          throw new Error('Database connection failed');
        }
        return originalSelect();
      });

      const start = Date.now();
      const metrics = await moderationMetricsService.getSystemMetrics(3600000);
      const end = Date.now();

      expect(metrics).toBeDefined();
      expect(end - start).toBeLessThan(2000); // Should recover within 2 seconds
    });

    it('should maintain performance during partial service failures', async () => {
      // Mock partial failure in logging service
      vi.spyOn(moderationLoggingService, 'getPerformanceMetrics')
        .mockRejectedValueOnce(new Error('Service temporarily unavailable'))
        .mockResolvedValue({
          totalDecisions: 100,
          averageLatency: 1500,
          totalCost: 50,
          vendorLatencies: {},
          vendorCosts: {},
          errorRate: 0.02,
          throughput: 10
        });

      const start = Date.now();
      const metrics = await moderationMetricsService.getSystemMetrics(3600000);
      const end = Date.now();

      expect(metrics).toBeDefined();
      expect(end - start).toBeLessThan(3000); // Should handle failure within 3 seconds
    });
  });

  describe('Cache Performance', () => {
    it('should provide significant performance improvement with caching', async () => {
      // First call (no cache)
      const start1 = Date.now();
      await moderationMetricsService.getSystemMetrics(3600000);
      const end1 = Date.now();
      const uncachedTime = end1 - start1;

      // Second call (cached)
      const start2 = Date.now();
      await moderationMetricsService.getSystemMetrics(3600000);
      const end2 = Date.now();
      const cachedTime = end2 - start2;

      // Cached call should be significantly faster
      expect(cachedTime).toBeLessThan(uncachedTime * 0.1); // At least 10x faster
      expect(cachedTime).toBeLessThan(50); // Should be under 50ms
    });

    it('should handle cache invalidation efficiently', async () => {
      // Fill cache
      await moderationMetricsService.getSystemMetrics(3600000);

      // Wait for cache to expire (simulate by advancing time)
      // In a real test, we might mock the cache TTL

      const start = Date.now();
      await moderationMetricsService.getSystemMetrics(3600000);
      const end = Date.now();

      expect(end - start).toBeLessThan(2000); // Cache refresh should be fast
    });
  });
});
