/**
 * Tests for Cache Performance Optimization
 * Validates performance metrics collection and accuracy under various conditions
 */

import { ServiceWorkerCacheService } from '../serviceWorkerCacheService';
import { CachePerformanceMetricsService } from '../cachePerformanceMetricsService';

// Mock service worker and cache APIs
const mockCaches = {
  open: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
  match: jest.fn(),
};

const mockCache = {
  match: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  keys: jest.fn(),
};

Object.defineProperty(window, 'caches', {
  value: mockCaches,
});

// Mock navigator APIs
Object.defineProperty(navigator, 'serviceWorker', {
  value: {
    register: jest.fn(),
    ready: Promise.resolve({
      navigationPreload: {
        enable: jest.fn(),
        disable: jest.fn(),
        setHeaderValue: jest.fn(),
      },
    }),
    controller: {
      postMessage: jest.fn(),
    },
  },
  configurable: true,
});

Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: jest.fn().mockResolvedValue({
      usage: 1024 * 1024 * 25, // 25MB
      quota: 1024 * 1024 * 100, // 100MB
    }),
  },
  configurable: true,
});

// Mock IndexedDB
const mockIDBRequest = {
  onsuccess: null,
  onerror: null,
  result: null,
};

const mockIDBDatabase = {
  transaction: jest.fn(),
  createObjectStore: jest.fn(),
  objectStoreNames: {
    contains: jest.fn().mockReturnValue(false),
  },
};

const mockIDBTransaction = {
  objectStore: jest.fn(),
};

const mockIDBObjectStore = {
  put: jest.fn(),
  get: jest.fn(),
  delete: jest.fn(),
  getAll: jest.fn(),
  createIndex: jest.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: {
    open: jest.fn().mockReturnValue({
      ...mockIDBRequest,
      onupgradeneeded: null,
    }),
  },
});

describe('Cache Performance Optimization', () => {
  let cacheService: ServiceWorkerCacheService;
  let metricsService: CachePerformanceMetricsService;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockCaches.open.mockResolvedValue(mockCache);
    mockCache.match.mockResolvedValue(null);
    mockCache.put.mockResolvedValue(undefined);
    mockCache.delete.mockResolvedValue(true);
    mockCache.keys.mockResolvedValue([]);
    
    mockIDBTransaction.objectStore.mockReturnValue(mockIDBObjectStore);
    mockIDBDatabase.transaction.mockReturnValue(mockIDBTransaction);
    mockIDBObjectStore.put.mockReturnValue({ ...mockIDBRequest });
    mockIDBObjectStore.get.mockReturnValue({ ...mockIDBRequest });
    mockIDBObjectStore.getAll.mockReturnValue({ ...mockIDBRequest });
    
    // Simulate successful IndexedDB operations
    setTimeout(() => {
      if (mockIDBRequest.onsuccess) {
        mockIDBRequest.onsuccess({ target: { result: mockIDBDatabase } });
      }
    }, 0);

    cacheService = new ServiceWorkerCacheService();
    metricsService = new CachePerformanceMetricsService();
    
    await cacheService.initialize();
    await metricsService.initialize();
  });

  afterEach(() => {
    cacheService.cleanup?.();
    metricsService.cleanup();
  });

  describe('Hit Rate Tracking Accuracy', () => {
    it('should accurately track cache hit rates across different strategies', async () => {
      // Simulate NetworkFirst strategy hits and misses
      const mockResponse = new Response('{"data": "test"}', { status: 200 });
      mockCache.match.mockResolvedValueOnce(null).mockResolvedValueOnce(mockResponse);
      
      global.fetch = jest.fn()
        .mockResolvedValueOnce(mockResponse.clone())
        .mockRejectedValueOnce(new Error('Network error'));

      // Test NetworkFirst with network success
      await cacheService.fetchWithStrategy('/api/feed', 'NetworkFirst');
      
      // Test NetworkFirst with network failure, cache hit
      await cacheService.fetchWithStrategy('/api/feed', 'NetworkFirst');
      
      const performanceReport = cacheService.getPerformanceMetrics();
      const feedMetrics = performanceReport.summary.hitRates.feed;
      
      expect(feedMetrics.totalRequests).toBe(2);
      expect(feedMetrics.hits).toBe(1);
      expect(feedMetrics.misses).toBe(1);
      expect(feedMetrics.ratio).toBeCloseTo(0.5, 2);
    });

    it('should track hit rates separately for different cache types', async () => {
      const mockResponse = new Response('{"data": "test"}', { status: 200 });
      mockCache.match.mockResolvedValue(mockResponse);
      
      // Record hits for different cache types
      metricsService.recordCacheHit('feed');
      metricsService.recordCacheHit('feed');
      metricsService.recordCacheMiss('feed');
      
      metricsService.recordCacheHit('marketplace');
      metricsService.recordCacheMiss('marketplace');
      metricsService.recordCacheMiss('marketplace');
      
      const snapshot = metricsService.getCurrentSnapshot();
      
      expect(snapshot.hitRates.feed.ratio).toBeCloseTo(0.67, 2);
      expect(snapshot.hitRates.marketplace.ratio).toBeCloseTo(0.33, 2);
    });

    it('should handle high-frequency cache operations accurately', async () => {
      const iterations = 1000;
      const hitRate = 0.8; // 80% hit rate
      
      for (let i = 0; i < iterations; i++) {
        if (Math.random() < hitRate) {
          metricsService.recordCacheHit('performance-test');
        } else {
          metricsService.recordCacheMiss('performance-test');
        }
      }
      
      const snapshot = metricsService.getCurrentSnapshot();
      const testMetrics = snapshot.hitRates['performance-test'];
      
      expect(testMetrics.totalRequests).toBe(iterations);
      expect(testMetrics.ratio).toBeCloseTo(hitRate, 1); // Within 10% tolerance
    });
  });

  describe('Storage Usage Monitoring', () => {
    it('should accurately monitor storage usage trends', async () => {
      const mockEstimates = [
        { usage: 1024 * 1024 * 20, quota: 1024 * 1024 * 100 }, // 20MB/100MB
        { usage: 1024 * 1024 * 25, quota: 1024 * 1024 * 100 }, // 25MB/100MB
        { usage: 1024 * 1024 * 30, quota: 1024 * 1024 * 100 }, // 30MB/100MB
      ];
      
      let callCount = 0;
      (navigator.storage.estimate as jest.Mock).mockImplementation(() => {
        return Promise.resolve(mockEstimates[callCount++ % mockEstimates.length]);
      });
      
      // Start monitoring with short interval for testing
      metricsService.startMonitoring(50);
      
      // Wait for multiple collections
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const trends = metricsService.getPerformanceTrends('1h');
      expect(trends.snapshots.length).toBeGreaterThan(1);
      
      // Check that storage trend is detected
      if (trends.snapshots.length >= 2) {
        const latest = trends.snapshots[trends.snapshots.length - 1];
        expect(latest.storage.trend).toBeDefined();
      }
      
      metricsService.stopMonitoring();
    });

    it('should calculate storage growth rate correctly', async () => {
      // Simulate increasing storage usage
      const baseUsage = 1024 * 1024 * 10; // 10MB
      let currentUsage = baseUsage;
      
      (navigator.storage.estimate as jest.Mock).mockImplementation(() => {
        currentUsage += 1024 * 1024; // Increase by 1MB each time
        return Promise.resolve({
          usage: currentUsage,
          quota: 1024 * 1024 * 100,
        });
      });
      
      metricsService.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 200));
      
      const trends = metricsService.getPerformanceTrends('1h');
      expect(trends.analysis.storageGrowthRate).toBeGreaterThan(0);
      
      metricsService.stopMonitoring();
    });
  });

  describe('Sync Queue Performance Metrics', () => {
    it('should accurately track sync operation success rates', () => {
      // Simulate various sync operations
      const operations = [
        { success: true, retryCount: 0, processingTime: 100 },
        { success: true, retryCount: 1, processingTime: 150 },
        { success: false, retryCount: 3, processingTime: 500 },
        { success: true, retryCount: 0, processingTime: 80 },
        { success: false, retryCount: 2, processingTime: 300 },
      ];
      
      operations.forEach(op => {
        metricsService.recordSyncOperation(op.success, op.retryCount, op.processingTime);
      });
      
      const snapshot = metricsService.getCurrentSnapshot();
      const syncMetrics = snapshot.sync;
      
      expect(syncMetrics.totalProcessed).toBe(5);
      expect(syncMetrics.successRate).toBeCloseTo(0.6, 2); // 3/5 = 60%
      expect(syncMetrics.failedActions).toBe(2);
      expect(syncMetrics.averageRetryCount).toBeCloseTo(1.2, 2); // (0+1+3+0+2)/5
      expect(syncMetrics.averageProcessingTime).toBeCloseTo(226, 0); // Average of processing times
    });

    it('should handle edge cases in sync metrics', () => {
      // Test with no operations
      let snapshot = metricsService.getCurrentSnapshot();
      expect(snapshot.sync.successRate).toBe(1); // Default to 100%
      expect(snapshot.sync.averageRetryCount).toBe(0);
      
      // Test with single operation
      metricsService.recordSyncOperation(false, 5, 1000);
      snapshot = metricsService.getCurrentSnapshot();
      expect(snapshot.sync.successRate).toBe(0);
      expect(snapshot.sync.averageRetryCount).toBe(5);
      expect(snapshot.sync.averageProcessingTime).toBe(1000);
    });
  });

  describe('Preload Effectiveness Measurement', () => {
    it('should accurately measure preload effectiveness', () => {
      const preloadOperations = [
        { success: true, loadTime: 100, wasUsed: true, networkCondition: 'fast', bytesSaved: 1024 },
        { success: true, loadTime: 150, wasUsed: false, networkCondition: 'fast' },
        { success: false, loadTime: 0, wasUsed: false, networkCondition: 'slow' },
        { success: true, loadTime: 200, wasUsed: true, networkCondition: 'medium', bytesSaved: 2048 },
        { success: true, loadTime: 120, wasUsed: true, networkCondition: 'fast', bytesSaved: 512 },
      ];
      
      preloadOperations.forEach(op => {
        metricsService.recordPreloadOperation(
          op.success,
          op.loadTime,
          op.wasUsed,
          op.networkCondition,
          op.bytesSaved
        );
      });
      
      const snapshot = metricsService.getCurrentSnapshot();
      const preloadMetrics = snapshot.preload;
      
      expect(preloadMetrics.totalPreloads).toBe(5);
      expect(preloadMetrics.successRate).toBeCloseTo(0.8, 2); // 4/5 successful
      expect(preloadMetrics.hitFromPreload).toBe(3); // 3 were used
      expect(preloadMetrics.wastedPreloads).toBe(1); // 1 successful but not used
      expect(preloadMetrics.bandwidthSaved).toBe(3584); // 1024 + 2048 + 512
      expect(preloadMetrics.networkConditionImpact.fast).toBe(3);
      expect(preloadMetrics.networkConditionImpact.medium).toBe(1);
      expect(preloadMetrics.networkConditionImpact.slow).toBe(1);
    });

    it('should calculate average load time correctly', () => {
      metricsService.recordPreloadOperation(true, 100, true, 'fast');
      metricsService.recordPreloadOperation(true, 200, true, 'fast');
      metricsService.recordPreloadOperation(true, 150, false, 'fast');
      
      const snapshot = metricsService.getCurrentSnapshot();
      expect(snapshot.preload.averageLoadTime).toBeCloseTo(150, 0);
    });
  });

  describe('Performance Alert Generation', () => {
    it('should generate alerts for low hit rates', async () => {
      // Create low hit rate scenario
      for (let i = 0; i < 20; i++) {
        metricsService.recordCacheMiss('test-cache');
      }
      for (let i = 0; i < 5; i++) {
        metricsService.recordCacheHit('test-cache');
      }
      
      // Start monitoring to trigger analysis
      metricsService.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = metricsService.getActiveAlerts();
      const hitRateAlert = alerts.find(alert => alert.type === 'hit_rate_low');
      
      expect(hitRateAlert).toBeDefined();
      expect(hitRateAlert?.severity).toMatch(/warning|error|critical/);
      
      metricsService.stopMonitoring();
    });

    it('should generate alerts for storage issues', async () => {
      // Mock high storage usage
      (navigator.storage.estimate as jest.Mock).mockResolvedValue({
        usage: 1024 * 1024 * 90, // 90MB
        quota: 1024 * 1024 * 100, // 100MB
      });
      
      metricsService.startMonitoring(50);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = metricsService.getActiveAlerts();
      const storageAlert = alerts.find(alert => alert.type === 'storage_full');
      
      expect(storageAlert).toBeDefined();
      
      metricsService.stopMonitoring();
    });

    it('should not generate duplicate alerts', async () => {
      // Create alert condition
      for (let i = 0; i < 50; i++) {
        metricsService.recordCacheMiss('test-cache');
      }
      
      metricsService.startMonitoring(25);
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const alerts = metricsService.getActiveAlerts();
      const hitRateAlerts = alerts.filter(alert => alert.type === 'hit_rate_low');
      
      // Should not have duplicate alerts within 5 minutes
      expect(hitRateAlerts.length).toBeLessThanOrEqual(1);
      
      metricsService.stopMonitoring();
    });
  });

  describe('Performance Report Generation', () => {
    it('should generate comprehensive performance reports', () => {
      // Setup various metrics
      metricsService.recordCacheHit('feed');
      metricsService.recordCacheHit('marketplace');
      metricsService.recordCacheMiss('communities');
      metricsService.recordSyncOperation(true, 0, 100);
      metricsService.recordPreloadOperation(true, 150, true, 'fast', 1024);
      
      const report = metricsService.getPerformanceReport();
      
      expect(report.summary).toBeDefined();
      expect(report.summary.hitRates).toBeDefined();
      expect(report.summary.storage).toBeDefined();
      expect(report.summary.sync).toBeDefined();
      expect(report.summary.preload).toBeDefined();
      
      expect(report.trends).toBeDefined();
      expect(report.trends['1h']).toBeDefined();
      expect(report.trends['24h']).toBeDefined();
      
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
      
      expect(report.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate health score based on performance metrics', () => {
      // Create excellent performance scenario
      for (let i = 0; i < 95; i++) {
        metricsService.recordCacheHit('excellent-cache');
      }
      for (let i = 0; i < 5; i++) {
        metricsService.recordCacheMiss('excellent-cache');
      }
      
      metricsService.recordSyncOperation(true, 0, 50);
      metricsService.recordPreloadOperation(true, 100, true, 'fast', 2048);
      
      const report = metricsService.getPerformanceReport();
      expect(report.healthScore).toBeGreaterThan(80);
      
      // Create poor performance scenario
      metricsService.clearMetricsData();
      
      for (let i = 0; i < 10; i++) {
        metricsService.recordCacheHit('poor-cache');
      }
      for (let i = 0; i < 90; i++) {
        metricsService.recordCacheMiss('poor-cache');
      }
      
      metricsService.recordSyncOperation(false, 3, 1000);
      metricsService.recordPreloadOperation(false, 0, false, 'slow');
      
      const poorReport = metricsService.getPerformanceReport();
      expect(poorReport.healthScore).toBeLessThan(50);
    });
  });

  describe('Network Condition Awareness', () => {
    it('should track preload performance by network condition', () => {
      const networkConditions = ['fast', 'medium', 'slow', 'offline'];
      const loadTimes = [50, 150, 500, 0];
      const successRates = [true, true, true, false];
      
      networkConditions.forEach((condition, index) => {
        for (let i = 0; i < 10; i++) {
          metricsService.recordPreloadOperation(
            successRates[index],
            loadTimes[index],
            Math.random() > 0.5,
            condition
          );
        }
      });
      
      const snapshot = metricsService.getCurrentSnapshot();
      const networkImpact = snapshot.preload.networkConditionImpact;
      
      expect(networkImpact.fast).toBe(10);
      expect(networkImpact.medium).toBe(10);
      expect(networkImpact.slow).toBe(10);
      expect(networkImpact.offline).toBe(10);
    });
  });

  describe('Memory and Performance Optimization', () => {
    it('should limit stored snapshots to prevent memory issues', async () => {
      const maxSnapshots = 1000;
      
      // Generate more snapshots than the limit
      for (let i = 0; i < maxSnapshots + 100; i++) {
        metricsService.recordCacheHit('memory-test');
        // Force snapshot creation by getting current snapshot
        metricsService.getCurrentSnapshot();
      }
      
      const exportData = metricsService.exportMetricsData();
      expect(exportData.snapshots.length).toBeLessThanOrEqual(maxSnapshots);
    });

    it('should cleanup old data efficiently', async () => {
      metricsService.startMonitoring(50);
      
      // Let it run for a bit to generate data
      await new Promise(resolve => setTimeout(resolve, 200));
      
      // Cleanup should not throw errors
      expect(() => metricsService.cleanup()).not.toThrow();
      
      metricsService.stopMonitoring();
    });
  });
});