import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { safeLogger } from '../utils/safeLogger';
import { PerformanceOptimizationService, ContentInput } from '../services/performanceOptimizationService';
import { safeLogger } from '../utils/safeLogger';
import { PerceptualHashingService } from '../services/perceptualHashingService';
import { safeLogger } from '../utils/safeLogger';
import { TextHashingService } from '../services/textHashingService';
import { safeLogger } from '../utils/safeLogger';
import { VendorApiOptimizer } from '../services/vendorApiOptimizer';
import { safeLogger } from '../utils/safeLogger';
import { ModerationCacheService } from '../services/moderationCacheService';
import { safeLogger } from '../utils/safeLogger';
import { CircuitBreakerManager } from '../services/circuitBreakerService';
import { safeLogger } from '../utils/safeLogger';

describe('Performance Optimization Validation Tests', () => {
  let performanceService: PerformanceOptimizationService;

  beforeEach(() => {
    performanceService = new PerformanceOptimizationService();
  });

  afterEach(async () => {
    await performanceService.cleanup();
  });

  describe('End-to-End Performance Pipeline', () => {
    it('should process content through complete optimization pipeline', async () => {
      const textContent: ContentInput = {
        id: 'test-content-1',
        type: 'text',
        content: 'This is a test message for performance validation',
        userId: 'user-123',
        metadata: { source: 'test' }
      };

      const result = await performanceService.processContent(textContent);

      expect(result).toMatchObject({
        contentId: 'test-content-1',
        fromCache: false,
        isDuplicate: false,
        processingTime: expect.any(Number),
        cacheHit: false,
        vendorCalls: expect.any(Number),
        cost: expect.any(Number)
      });

      expect(result.processingTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.moderationResult).toBeDefined();
    });

    it('should detect and handle duplicate content efficiently', async () => {
      const originalContent: ContentInput = {
        id: 'original-content',
        type: 'text',
        content: 'This is the original message',
        userId: 'user-123'
      };

      const duplicateContent: ContentInput = {
        id: 'duplicate-content',
        type: 'text',
        content: 'This is the original message', // Exact duplicate
        userId: 'user-456'
      };

      // Process original content first
      const originalResult = await performanceService.processContent(originalContent);
      expect(originalResult.isDuplicate).toBe(false);

      // Process duplicate content
      const duplicateResult = await performanceService.processContent(duplicateContent);
      expect(duplicateResult.isDuplicate).toBe(true);
      expect(duplicateResult.duplicateInfo?.originalContentId).toBe('original-content');
      expect(duplicateResult.vendorCalls).toBe(0); // Should not call vendors for duplicates
    });

    it('should utilize cache for repeated content', async () => {
      const content: ContentInput = {
        id: 'cached-content',
        type: 'text',
        content: 'This message will be cached',
        userId: 'user-123'
      };

      // First request - should not be cached
      const firstResult = await performanceService.processContent(content);
      expect(firstResult.fromCache).toBe(false);

      // Second request - should be cached
      const secondResult = await performanceService.processContent(content);
      expect(secondResult.fromCache).toBe(true);
      expect(secondResult.processingTime).toBeLessThan(firstResult.processingTime);
    });

    it('should handle batch processing efficiently', async () => {
      const batchContent: ContentInput[] = Array.from({ length: 50 }, (_, i) => ({
        id: `batch-content-${i}`,
        type: 'text',
        content: `Batch message number ${i}`,
        userId: `user-${i % 10}` // 10 different users
      }));

      const startTime = Date.now();
      const results = await performanceService.batchProcessContent(batchContent);
      const endTime = Date.now();

      expect(results).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Verify all content was processed
      results.forEach((result, index) => {
        expect(result.contentId).toBe(`batch-content-${index}`);
        expect(result.moderationResult || result.duplicateInfo).toBeDefined();
      });
    });
  });

  describe('Performance Metrics and Monitoring', () => {
    it('should track comprehensive performance metrics', async () => {
      // Process some content to generate metrics
      const contents: ContentInput[] = [
        {
          id: 'metrics-test-1',
          type: 'text',
          content: 'First test message',
          userId: 'user-1'
        },
        {
          id: 'metrics-test-2',
          type: 'text',
          content: 'Second test message',
          userId: 'user-2'
        },
        {
          id: 'metrics-test-1', // Duplicate for cache hit
          type: 'text',
          content: 'First test message',
          userId: 'user-3'
        }
      ];

      for (const content of contents) {
        await performanceService.processContent(content);
      }

      const metrics = performanceService.getPerformanceMetrics();

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.cacheHitRate).toBeGreaterThan(0);
      expect(metrics.averageProcessingTime).toBeGreaterThan(0);
      expect(metrics.totalCost).toBeGreaterThanOrEqual(0);
      expect(metrics.circuitBreakerStats).toBeDefined();
    });

    it('should optimize configuration based on performance data', async () => {
      const optimizationEvents: any[] = [];
      
      performanceService.on('configurationOptimized', (event) => {
        optimizationEvents.push(event);
      });

      // Simulate poor performance conditions
      performanceService['metrics'].totalRequests = 100;
      performanceService['metrics'].cacheHits = 30; // Low hit rate
      performanceService['metrics'].totalProcessingTime = 600000; // High processing time

      await performanceService.optimizeConfiguration();

      expect(optimizationEvents.length).toBeGreaterThan(0);
      
      const hitRateOptimization = optimizationEvents.find(e => e.action === 'increase_cache_ttl');
      const processingOptimization = optimizationEvents.find(e => e.action === 'increase_batch_sizes');
      
      expect(hitRateOptimization || processingOptimization).toBeDefined();
    });

    it('should handle cache warmup efficiently', async () => {
      const contentIds = Array.from({ length: 100 }, (_, i) => `warmup-content-${i}`);
      
      const warmupEvents: any[] = [];
      performanceService.on('cacheWarmedUp', (event) => {
        warmupEvents.push(event);
      });

      await performanceService.warmupCache(contentIds);

      expect(warmupEvents).toHaveLength(1);
      expect(warmupEvents[0].requestedCount).toBe(100);
    });
  });

  describe('Error Handling and Resilience', () => {
    it('should handle vendor API failures gracefully', async () => {
      const content: ContentInput = {
        id: 'error-test-content',
        type: 'text',
        content: 'This will trigger an error scenario',
        userId: 'user-error'
      };

      // Mock vendor failure
      const mockVendorOptimizer = performanceService['vendorOptimizer'];
      jest.spyOn(mockVendorOptimizer, 'batchRequest').mockRejectedValueOnce(
        new Error('Vendor API unavailable')
      );

      // Should still process with fallback
      const result = await performanceService.processContent(content);
      
      expect(result).toBeDefined();
      expect(result.moderationResult?.decision).toBeDefined();
    });

    it('should handle circuit breaker activation', async () => {
      const circuitBreakerEvents: any[] = [];
      
      performanceService.on('circuitBreakerOpened', (event) => {
        circuitBreakerEvents.push(event);
      });

      // Force circuit breaker to open
      const circuitBreaker = performanceService['circuitBreakers'].getCircuitBreaker('moderation-ensemble');
      circuitBreaker.forceOpen();

      const content: ContentInput = {
        id: 'circuit-breaker-test',
        type: 'text',
        content: 'Testing circuit breaker behavior',
        userId: 'user-cb'
      };

      const result = await performanceService.processContent(content);
      
      // Should use fallback moderation
      expect(result.moderationResult?.confidence).toBeLessThan(1.0);
      expect(result.moderationResult?.vendorScores.fallback).toBeDefined();
    });

    it('should handle memory pressure and cleanup', async () => {
      // Generate large amount of data to test memory management
      const largeContent: ContentInput[] = Array.from({ length: 1000 }, (_, i) => ({
        id: `memory-test-${i}`,
        type: 'text',
        content: `Memory test message ${i}`.repeat(100), // Large content
        userId: `user-${i}`
      }));

      // Process in batches to avoid overwhelming the system
      const batchSize = 50;
      for (let i = 0; i < largeContent.length; i += batchSize) {
        const batch = largeContent.slice(i, i + batchSize);
        await performanceService.batchProcessContent(batch);
      }

      const metrics = performanceService.getPerformanceMetrics();
      expect(metrics.totalRequests).toBe(1000);
      
      // Cleanup should work without errors
      await expect(performanceService.cleanup()).resolves.not.toThrow();
    });
  });

  describe('Scalability and Load Testing', () => {
    it('should handle concurrent requests efficiently', async () => {
      const concurrentRequests = 20;
      const requests: Promise<any>[] = [];

      for (let i = 0; i < concurrentRequests; i++) {
        const content: ContentInput = {
          id: `concurrent-${i}`,
          type: 'text',
          content: `Concurrent message ${i}`,
          userId: `user-${i}`
        };
        
        requests.push(performanceService.processContent(content));
      }

      const startTime = Date.now();
      const results = await Promise.all(requests);
      const endTime = Date.now();

      expect(results).toHaveLength(concurrentRequests);
      expect(endTime - startTime).toBeLessThan(15000); // Should complete within 15 seconds

      // Verify no errors occurred
      results.forEach(result => {
        expect(result.contentId).toBeDefined();
        expect(result.processingTime).toBeGreaterThan(0);
      });
    });

    it('should maintain performance under sustained load', async () => {
      const sustainedLoadDuration = 5000; // 5 seconds
      const requestInterval = 100; // Every 100ms
      const results: any[] = [];
      
      const startTime = Date.now();
      let requestCount = 0;

      const loadTest = setInterval(async () => {
        if (Date.now() - startTime >= sustainedLoadDuration) {
          clearInterval(loadTest);
          return;
        }

        const content: ContentInput = {
          id: `sustained-${requestCount++}`,
          type: 'text',
          content: `Sustained load message ${requestCount}`,
          userId: `user-${requestCount % 5}`
        };

        try {
          const result = await performanceService.processContent(content);
          results.push(result);
        } catch (error) {
          safeLogger.error('Sustained load error:', error);
        }
      }, requestInterval);

      // Wait for load test to complete
      await new Promise(resolve => setTimeout(resolve, sustainedLoadDuration + 1000));

      expect(results.length).toBeGreaterThan(30); // Should process at least 30 requests
      
      // Check that performance didn't degrade significantly
      const avgProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
      expect(avgProcessingTime).toBeLessThan(10000); // Average should be under 10 seconds
    });
  });

  describe('Resource Optimization', () => {
    it('should optimize memory usage through efficient caching', async () => {
      const initialMetrics = performanceService.getPerformanceMetrics();
      
      // Process content that should benefit from caching
      const baseContent = 'This is a base message for memory optimization testing';
      const variations = [
        baseContent,
        baseContent + '!', // Near duplicate
        baseContent, // Exact duplicate
        baseContent.toUpperCase(), // Case variation
        baseContent // Another exact duplicate
      ];

      for (let i = 0; i < variations.length; i++) {
        const content: ContentInput = {
          id: `memory-opt-${i}`,
          type: 'text',
          content: variations[i],
          userId: 'user-memory'
        };
        
        await performanceService.processContent(content);
      }

      const finalMetrics = performanceService.getPerformanceMetrics();
      
      // Should have high cache hit rate due to duplicates
      expect(finalMetrics.cacheHitRate).toBeGreaterThan(0.4);
      expect(finalMetrics.duplicateDetectionRate).toBeGreaterThan(0.4);
    });

    it('should optimize vendor API usage through batching', async () => {
      const batchingEvents: any[] = [];
      
      performanceService['vendorOptimizer'].on('batchProcessed', (event) => {
        batchingEvents.push(event);
      });

      // Submit multiple requests quickly to trigger batching
      const quickRequests = Array.from({ length: 15 }, (_, i) => ({
        id: `batch-opt-${i}`,
        type: 'text' as const,
        content: `Batch optimization message ${i}`,
        userId: `user-${i}`
      }));

      await performanceService.batchProcessContent(quickRequests);

      // Should have triggered batching
      expect(batchingEvents.length).toBeGreaterThan(0);
      
      const totalBatchedRequests = batchingEvents.reduce((sum, event) => sum + event.requestCount, 0);
      expect(totalBatchedRequests).toBeGreaterThanOrEqual(15);
    });
  });

  describe('Integration with Existing Systems', () => {
    it('should integrate properly with moderation pipeline', async () => {
      const content: ContentInput = {
        id: 'integration-test',
        type: 'text',
        content: 'Testing integration with moderation system',
        userId: 'user-integration'
      };

      const result = await performanceService.processContent(content);

      // Should produce valid moderation result
      expect(result.moderationResult).toMatchObject({
        contentId: 'integration-test',
        decision: expect.stringMatching(/^(allow|limit|block|review)$/),
        confidence: expect.any(Number),
        categories: expect.any(Array),
        vendorScores: expect.any(Object),
        timestamp: expect.any(Number)
      });

      expect(result.moderationResult!.confidence).toBeGreaterThanOrEqual(0);
      expect(result.moderationResult!.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle different content types appropriately', async () => {
      const textContent: ContentInput = {
        id: 'text-integration',
        type: 'text',
        content: 'Text content for integration testing',
        userId: 'user-text'
      };

      const imageContent: ContentInput = {
        id: 'image-integration',
        type: 'image',
        content: Buffer.from('fake-image-data'),
        userId: 'user-image'
      };

      const textResult = await performanceService.processContent(textContent);
      const imageResult = await performanceService.processContent(imageContent);

      expect(textResult.contentId).toBe('text-integration');
      expect(imageResult.contentId).toBe('image-integration');

      // Both should have valid results
      expect(textResult.moderationResult || textResult.duplicateInfo).toBeDefined();
      expect(imageResult.moderationResult || imageResult.duplicateInfo).toBeDefined();
    });
  });
});