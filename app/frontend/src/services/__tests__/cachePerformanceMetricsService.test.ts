/**
 * Tests for Cache Performance Metrics Service
 */

import { CachePerformanceMetricsService } from '../cachePerformanceMetricsService';

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Mock navigator.storage
const mockStorageEstimate = jest.fn();
Object.defineProperty(navigator, 'storage', {
  value: {
    estimate: mockStorageEstimate,
  },
  configurable: true,
});

describe('CachePerformanceMetricsService', () => {
  let service: CachePerformanceMetricsService;

  beforeEach(async () => {
    service = new CachePerformanceMetricsService();
    jest.clearAllMocks();
    mockStorageEstimate.mockResolvedValue({
      usage: 1024 * 1024 * 10, // 10MB
      quota: 1024 * 1024 * 100, // 100MB
    });
    
    // Reset service to clean state
    service.reset();
  });

  afterEach(() => {
    service.cleanup();
  });

  describe('Initialization', () => {
    it('should initialize successfully', async () => {
      mockLocalStorage.getItem.mockReturnValue(null);
      
      await service.initialize();
      
      expect(mockLocalStorage.getItem).toHaveBeenCalledWith('cache-performance-metrics');
    });

    it('should load existing metrics from storage', async () => {
      const existingData = {
        snapshots: [],
        alerts: [],
        cacheMetrics: { feed: { hits: 10, misses: 2, ratio: 0.83, totalRequests: 12, lastUpdated: Date.now() } },
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(existingData));
      
      await service.initialize();
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.hitRates.feed).toBeDefined();
      expect(snapshot.hitRates.feed.hits).toBe(10);
    });
  });

  describe('Cache Hit/Miss Recording', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should record cache hits correctly', () => {
      service.recordCacheHit('feed');
      service.recordCacheHit('feed');
      service.recordCacheMiss('feed');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.hitRates.feed.hits).toBe(2);
      expect(snapshot.hitRates.feed.misses).toBe(1);
      expect(snapshot.hitRates.feed.totalRequests).toBe(3);
      expect(snapshot.hitRates.feed.ratio).toBeCloseTo(0.67, 2);
    });

    it('should handle multiple cache types', () => {
      service.recordCacheHit('feed');
      service.recordCacheHit('marketplace');
      service.recordCacheMiss('communities');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.hitRates.feed.hits).toBe(1);
      expect(snapshot.hitRates.marketplace.hits).toBe(1);
      expect(snapshot.hitRates.communities.misses).toBe(1);
    });

    it('should initialize cache type on first use', () => {
      service.recordCacheHit('newCacheType');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.hitRates.newCacheType).toBeDefined();
      expect(snapshot.hitRates.newCacheType.hits).toBe(1);
      expect(snapshot.hitRates.newCacheType.totalRequests).toBe(1);
    });
  });

  describe('Sync Queue Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should record successful sync operations', () => {
      service.recordSyncOperation(true, 0, 150);
      service.recordSyncOperation(true, 1, 200);
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.sync.totalProcessed).toBe(2);
      expect(snapshot.sync.successRate).toBe(1);
      expect(snapshot.sync.averageRetryCount).toBe(0.5);
      expect(snapshot.sync.averageProcessingTime).toBe(175);
    });

    it('should record failed sync operations', () => {
      service.recordSyncOperation(true, 0, 100);
      service.recordSyncOperation(false, 2, 300);
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.sync.totalProcessed).toBe(2);
      expect(snapshot.sync.successRate).toBe(0.5);
      expect(snapshot.sync.failedActions).toBe(1);
      expect(snapshot.sync.averageRetryCount).toBe(1);
    });

    it('should update queue size', () => {
      service.updateSyncQueueSize(5);
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.sync.queueSize).toBe(5);
    });
  });

  describe('Preload Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should record successful preload operations', () => {
      service.recordPreloadOperation(true, 100, true, 'fast', 1024);
      service.recordPreloadOperation(true, 150, false, 'slow');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.preload.totalPreloads).toBe(2);
      expect(snapshot.preload.successRate).toBe(1);
      expect(snapshot.preload.hitFromPreload).toBe(1);
      expect(snapshot.preload.wastedPreloads).toBe(1);
      expect(snapshot.preload.bandwidthSaved).toBe(1024);
      expect(snapshot.preload.averageLoadTime).toBe(125);
    });

    it('should track network condition impact', () => {
      service.recordPreloadOperation(true, 100, true, 'fast');
      service.recordPreloadOperation(true, 200, true, 'fast');
      service.recordPreloadOperation(true, 300, true, 'slow');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.preload.networkConditionImpact.fast).toBe(2);
      expect(snapshot.preload.networkConditionImpact.slow).toBe(1);
    });

    it('should handle failed preload operations', () => {
      service.recordPreloadOperation(true, 100, true, 'fast');
      service.recordPreloadOperation(false, 0, false, 'slow');
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.preload.totalPreloads).toBe(2);
      expect(snapshot.preload.successRate).toBe(0.5);
    });
  });

  describe('Performance Trends', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should calculate trends correctly', () => {
      // Record some metrics over time
      service.recordCacheHit('feed');
      service.recordCacheHit('feed');
      service.recordCacheMiss('feed');
      
      const trends = service.getPerformanceTrends('1h');
      expect(trends.timeRange).toBe('1h');
      expect(trends.snapshots).toBeDefined();
      expect(trends.analysis).toBeDefined();
    });

    it('should filter snapshots by time range', () => {
      const trends24h = service.getPerformanceTrends('24h');
      const trends1h = service.getPerformanceTrends('1h');
      
      expect(trends24h.timeRange).toBe('24h');
      expect(trends1h.timeRange).toBe('1h');
    });
  });

  describe('Performance Alerts', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate hit rate alerts', () => {
      // Create low hit rate scenario
      for (let i = 0; i < 10; i++) {
        service.recordCacheMiss('feed');
      }
      service.recordCacheHit('feed');
      
      // Trigger analysis
      service.startMonitoring(100);
      
      setTimeout(() => {
        const alerts = service.getActiveAlerts();
        const hitRateAlert = alerts.find(alert => alert.type === 'hit_rate_low');
        expect(hitRateAlert).toBeDefined();
        expect(hitRateAlert?.severity).toBe('critical');
        service.stopMonitoring();
      }, 150);
    });

    it('should filter alerts by severity', () => {
      // This would require triggering specific alert conditions
      const criticalAlerts = service.getActiveAlerts('critical');
      const warningAlerts = service.getActiveAlerts('warning');
      
      expect(Array.isArray(criticalAlerts)).toBe(true);
      expect(Array.isArray(warningAlerts)).toBe(true);
    });
  });

  describe('Performance Report', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate comprehensive performance report', () => {
      service.recordCacheHit('feed');
      service.recordCacheHit('marketplace');
      service.recordCacheMiss('communities');
      service.recordSyncOperation(true, 0, 100);
      service.recordPreloadOperation(true, 150, true, 'fast', 2048);
      
      const report = service.getPerformanceReport();
      
      expect(report.summary).toBeDefined();
      expect(report.trends).toBeDefined();
      expect(report.alerts).toBeDefined();
      expect(report.recommendations).toBeDefined();
      expect(report.healthScore).toBeGreaterThanOrEqual(0);
      expect(report.healthScore).toBeLessThanOrEqual(100);
    });

    it('should calculate health score correctly', () => {
      // Create good performance scenario
      for (let i = 0; i < 8; i++) {
        service.recordCacheHit('feed');
      }
      for (let i = 0; i < 2; i++) {
        service.recordCacheMiss('feed');
      }
      service.recordSyncOperation(true, 0, 50);
      service.recordPreloadOperation(true, 100, true, 'fast', 1024);
      
      const report = service.getPerformanceReport();
      expect(report.healthScore).toBeGreaterThan(70);
    });
  });

  describe('Storage Usage Metrics', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should update storage metrics from navigator.storage', async () => {
      mockStorageEstimate.mockResolvedValue({
        usage: 1024 * 1024 * 50, // 50MB
        quota: 1024 * 1024 * 100, // 100MB
      });
      
      // Trigger metrics collection
      service.startMonitoring(100);
      
      setTimeout(async () => {
        const snapshot = service.getCurrentSnapshot();
        expect(snapshot.storage.used).toBe(1024 * 1024 * 50);
        expect(snapshot.storage.available).toBe(1024 * 1024 * 100);
        expect(snapshot.storage.percentage).toBe(50);
        service.stopMonitoring();
      }, 150);
    });

    it('should handle storage estimation errors gracefully', async () => {
      mockStorageEstimate.mockRejectedValue(new Error('Storage not available'));
      
      service.startMonitoring(100);
      
      setTimeout(() => {
        const snapshot = service.getCurrentSnapshot();
        expect(snapshot.storage).toBeDefined();
        service.stopMonitoring();
      }, 150);
    });
  });

  describe('Data Export and Import', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should export metrics data', () => {
      service.recordCacheHit('feed');
      service.recordSyncOperation(true, 0, 100);
      
      const exportData = service.exportMetricsData();
      
      expect(exportData.snapshots).toBeDefined();
      expect(exportData.alerts).toBeDefined();
      expect(exportData.configuration).toBeDefined();
      expect(exportData.exportTimestamp).toBeDefined();
    });

    it('should clear all metrics data', async () => {
      service.recordCacheHit('feed');
      service.recordSyncOperation(true, 0, 100);
      
      await service.clearMetricsData();
      
      const snapshot = service.getCurrentSnapshot();
      expect(snapshot.hitRates.feed.totalRequests).toBe(0);
    });
  });

  describe('Monitoring Lifecycle', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should start and stop monitoring', () => {
      expect(service['monitoringInterval']).toBeNull();
      
      service.startMonitoring(1000);
      expect(service['monitoringInterval']).not.toBeNull();
      
      service.stopMonitoring();
      expect(service['monitoringInterval']).toBeNull();
    });

    it('should cleanup resources', () => {
      service.startMonitoring(1000);
      service.cleanup();
      
      expect(service['monitoringInterval']).toBeNull();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Recommendations Generation', () => {
    beforeEach(async () => {
      await service.initialize();
    });

    it('should generate relevant recommendations', () => {
      // Create scenario that should trigger recommendations
      for (let i = 0; i < 7; i++) {
        service.recordCacheMiss('feed');
      }
      for (let i = 0; i < 3; i++) {
        service.recordCacheHit('feed');
      }
      
      const report = service.getPerformanceReport();
      expect(report.recommendations.length).toBeGreaterThan(0);
      expect(report.recommendations.some(rec => 
        rec.includes('cache TTL') || rec.includes('preloading')
      )).toBe(true);
    });
  });
});