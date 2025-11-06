/**
 * Performance Optimization Services Tests
 */

import { performanceOptimizationService } from '../performanceOptimizationService';
import { requestDeduplicationService } from '../requestDeduplicationService';
import { compressionOptimizationService } from '../compressionOptimizationService';
import { performanceIntegrationService } from '../performanceIntegrationService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Performance Optimization Services', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Reset services
    performanceOptimizationService.clearCache();
    requestDeduplicationService.resetMetrics();
    compressionOptimizationService.resetMetrics();
  });

  describe('PerformanceOptimizationService', () => {
    it('should cache responses correctly', async () => {
      const mockResponse = { data: 'test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Map([['content-type', 'application/json']])
      });

      // First request
      const result1 = await performanceOptimizationService.optimizedRequest(
        'http://test.com/api/test',
        {},
        'feed'
      );

      // Second request (should be cached)
      const result2 = await performanceOptimizationService.optimizedRequest(
        'http://test.com/api/test',
        {},
        'feed'
      );

      expect(result1).toEqual(mockResponse);
      expect(result2).toEqual(mockResponse);
      expect(fetch).toHaveBeenCalledTimes(1); // Only one actual fetch
    });

    it('should provide performance metrics', () => {
      const metrics = performanceOptimizationService.getPerformanceMetrics();
      
      expect(metrics).toHaveProperty('requestCount');
      expect(metrics).toHaveProperty('cacheHitRate');
      expect(metrics).toHaveProperty('averageResponseTime');
      expect(metrics).toHaveProperty('errorRate');
    });

    it('should clear cache correctly', () => {
      performanceOptimizationService.clearCache();
      const stats = performanceOptimizationService.getCacheStatistics();
      
      expect(stats.totalEntries).toBe(0);
    });
  });

  describe('RequestDeduplicationService', () => {
    it('should deduplicate identical requests', async () => {
      let callCount = 0;
      const mockFn = jest.fn(() => {
        callCount++;
        return Promise.resolve(`result-${callCount}`);
      });

      // Make multiple identical requests
      const promises = [
        requestDeduplicationService.deduplicatedRequest('test-key', mockFn),
        requestDeduplicationService.deduplicatedRequest('test-key', mockFn),
        requestDeduplicationService.deduplicatedRequest('test-key', mockFn)
      ];

      const results = await Promise.all(promises);

      expect(mockFn).toHaveBeenCalledTimes(1); // Only called once
      expect(results).toEqual(['result-1', 'result-1', 'result-1']); // All get same result
    });

    it('should generate consistent request keys', () => {
      const key1 = requestDeduplicationService.generateRequestKey(
        'http://test.com/api',
        'GET',
        null,
        { param: 'value' }
      );
      
      const key2 = requestDeduplicationService.generateRequestKey(
        'http://test.com/api',
        'GET',
        null,
        { param: 'value' }
      );

      expect(key1).toBe(key2);
    });

    it('should provide deduplication metrics', () => {
      const metrics = requestDeduplicationService.getMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('deduplicatedRequests');
      expect(metrics).toHaveProperty('savingsPercentage');
    });
  });

  describe('CompressionOptimizationService', () => {
    it('should optimize request headers', async () => {
      const optimizedOptions = await compressionOptimizationService.optimizeRequest(
        'http://test.com/api',
        { method: 'GET' }
      );

      expect(optimizedOptions.headers).toHaveProperty('Accept-Encoding');
      expect(optimizedOptions.headers['Accept-Encoding']).toContain('gzip');
    });

    it('should provide compression metrics', () => {
      const metrics = compressionOptimizationService.getCompressionMetrics();
      
      expect(metrics).toHaveProperty('totalRequests');
      expect(metrics).toHaveProperty('compressedRequests');
      expect(metrics).toHaveProperty('compressionRatio');
    });

    it('should check compression support', () => {
      const support = compressionOptimizationService.getCompressionSupport();
      
      expect(support).toHaveProperty('webWorker');
      expect(support).toHaveProperty('compressionStreams');
      expect(support).toHaveProperty('decompressionStreams');
    });
  });

  describe('PerformanceIntegrationService', () => {
    it('should integrate all optimization features', async () => {
      const mockResponse = { data: 'integrated-test' };
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockResponse),
        headers: new Map([['content-type', 'application/json']])
      });

      const result = await performanceIntegrationService.optimizedRequest(
        'http://test.com/api/integrated',
        {},
        {
          enableCaching: true,
          enableDeduplication: true,
          enableCompression: true,
          enableMonitoring: true
        }
      );

      expect(result).toEqual(mockResponse);
    });

    it('should generate comprehensive performance report', () => {
      const report = performanceIntegrationService.getPerformanceReport();
      
      expect(report).toHaveProperty('timestamp');
      expect(report).toHaveProperty('summary');
      expect(report).toHaveProperty('detailed');
      expect(report).toHaveProperty('recommendations');
      
      expect(report.summary).toHaveProperty('totalRequests');
      expect(report.summary).toHaveProperty('cacheHitRate');
      expect(report.summary).toHaveProperty('deduplicationSavings');
      expect(report.summary).toHaveProperty('compressionRatio');
    });

    it('should provide optimal configuration', () => {
      const config = performanceIntegrationService.getOptimalConfiguration();
      
      expect(config).toHaveProperty('enableCaching');
      expect(config).toHaveProperty('enableDeduplication');
      expect(config).toHaveProperty('enableCompression');
      expect(config).toHaveProperty('enableMonitoring');
    });
  });
});

describe('Performance Integration', () => {
  it('should handle errors gracefully', async () => {
    (fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

    await expect(
      performanceIntegrationService.optimizedRequest('http://test.com/api/error')
    ).rejects.toThrow('Network error');
  });

  it('should export performance data', () => {
    const exportedData = performanceIntegrationService.exportPerformanceData();
    
    expect(exportedData).toHaveProperty('report');
    expect(exportedData).toHaveProperty('cacheStats');
    expect(exportedData).toHaveProperty('deduplicationInfo');
    expect(exportedData).toHaveProperty('compressionSupport');
  });
});