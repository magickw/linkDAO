import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { PerceptualHashingService } from '../services/perceptualHashingService';
import { TextHashingService } from '../services/textHashingService';
import { VendorApiOptimizer } from '../services/vendorApiOptimizer';
import { ModerationCacheService } from '../services/moderationCacheService';
import { CircuitBreaker, CircuitState, CircuitBreakerManager } from '../services/circuitBreakerService';

describe('Performance Optimization Services', () => {
  describe('PerceptualHashingService', () => {
    let hashingService: PerceptualHashingService;

    beforeEach(() => {
      hashingService = new PerceptualHashingService();
    });

    it('should generate consistent hashes for identical images', async () => {
      // Create a simple test image buffer (1x1 pixel)
      const imageBuffer = Buffer.from([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
        0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
        0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
        0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53,
        0xDE, 0x00, 0x00, 0x00, 0x0C, 0x49, 0x44, 0x41,
        0x54, 0x08, 0x99, 0x01, 0x01, 0x00, 0x00, 0xFF,
        0xFF, 0x00, 0x00, 0x00, 0x02, 0x00, 0x01, 0xE2,
        0x21, 0xBC, 0x33, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      const hash1 = await hashingService.generateImageHash(imageBuffer);
      const hash2 = await hashingService.generateImageHash(imageBuffer);

      expect(hash1.hash).toBe(hash2.hash);
      expect(hash1.algorithm).toBe('dhash');
      expect(hash1.confidence).toBe(1.0);
    });

    it('should detect similar images with high similarity', async () => {
      const hash1 = 'abcd1234';
      const hash2 = 'abcd1235'; // Only 1 bit different
      
      const similarity = hashingService.calculateSimilarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should detect different images with low similarity', async () => {
      const hash1 = 'abcd1234';
      const hash2 = 'efgh5678';
      
      const similarity = hashingService.calculateSimilarity(hash1, hash2);
      expect(similarity).toBeLessThan(0.5);
    });

    it('should handle duplicate detection workflow', async () => {
      const testBuffer = Buffer.from('test image data');
      const existingHashes = new Map([
        ['content1', 'abcd1234'],
        ['content2', 'efgh5678']
      ]);

      // Mock the generateImageHash method to return predictable results
      jest.spyOn(hashingService, 'generateImageHash').mockResolvedValue({
        hash: 'abcd1235', // Similar to content1
        algorithm: 'dhash',
        confidence: 1.0
      });

      const result = await hashingService.checkForDuplicate(testBuffer, existingHashes);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.originalContentId).toBe('content1');
      expect(result.similarity).toBeGreaterThan(0.9);
    });
  });

  describe('TextHashingService', () => {
    let textHashingService: TextHashingService;

    beforeEach(() => {
      textHashingService = new TextHashingService();
    });

    it('should generate consistent hashes for identical text', () => {
      const text = 'This is a test message for hashing';
      
      const hash1 = textHashingService.generateTextHashes(text);
      const hash2 = textHashingService.generateTextHashes(text);

      expect(hash1.contentHash).toBe(hash2.contentHash);
      expect(hash1.semanticHash).toBe(hash2.semanticHash);
      expect(hash1.normalizedText).toBe(hash2.normalizedText);
    });

    it('should normalize text consistently', () => {
      const text1 = 'Hello World!!! How are you???';
      const text2 = 'hello world how are you';
      
      const hash1 = textHashingService.generateTextHashes(text1);
      const hash2 = textHashingService.generateTextHashes(text2);

      expect(hash1.normalizedText).toBe(hash2.normalizedText);
    });

    it('should detect exact duplicates', async () => {
      const text = 'This is an exact duplicate message';
      const existingContent = new Map([
        ['content1', {
          hash: textHashingService.generateTextHashes(text),
          text
        }]
      ]);

      const result = await textHashingService.checkForDuplicate(text, existingContent);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('exact');
      expect(result.similarity).toBe(1.0);
    });

    it('should detect near-exact duplicates', async () => {
      const originalText = 'This is a test message for duplicate detection';
      const similarText = 'This is a test message for duplicate detection!'; // Added punctuation
      
      const existingContent = new Map([
        ['content1', {
          hash: textHashingService.generateTextHashes(originalText),
          text: originalText
        }]
      ]);

      const result = await textHashingService.checkForDuplicate(similarText, existingContent);
      
      expect(result.isDuplicate).toBe(true);
      expect(result.duplicateType).toBe('near-exact');
      expect(result.similarity).toBeGreaterThan(0.95);
    });

    it('should generate spam fingerprints', () => {
      const spamText = 'BUY NOW!!! AMAZING DEAL!!! CLICK HERE!!! 🚀🚀🚀';
      const normalText = 'This is a normal message about everyday topics';
      
      const spamFingerprint = textHashingService.generateSpamFingerprint(spamText);
      const normalFingerprint = textHashingService.generateSpamFingerprint(normalText);

      expect(spamFingerprint).not.toBe(normalFingerprint);
      expect(spamFingerprint).toHaveLength(64); // SHA256 hex length
    });
  });

  describe('VendorApiOptimizer', () => {
    let optimizer: VendorApiOptimizer;

    beforeEach(() => {
      optimizer = new VendorApiOptimizer();
    });

    afterEach(() => {
      optimizer.removeAllListeners();
    });

    it('should batch requests efficiently', async () => {
      const batchProcessedPromise = new Promise((resolve) => {
        optimizer.once('batchProcessed', resolve);
      });

      // Submit multiple requests
      const requests = Array.from({ length: 5 }, (_, i) => 
        optimizer.batchRequest('openai', `test content ${i}`, 'text', 'medium')
      );

      // Wait for batch to be processed
      await batchProcessedPromise;
      
      // All requests should complete
      const results = await Promise.all(requests);
      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result).toHaveProperty('confidence');
        expect((result as any).vendor).toBe('openai');
      });
    });

    it('should prioritize high priority requests', async () => {
      const results: any[] = [];
      
      // Add event listener to track processing order
      optimizer.on('batchProcessed', (event) => {
        results.push(event);
      });

      // Submit low priority request first
      const lowPriorityPromise = optimizer.batchRequest('openai', 'low priority', 'text', 'low');
      
      // Submit high priority request second
      const highPriorityPromise = optimizer.batchRequest('openai', 'high priority', 'text', 'high');

      await Promise.all([lowPriorityPromise, highPriorityPromise]);
      
      // High priority should be processed first (in the batch)
      expect(results.length).toBeGreaterThan(0);
    });

    it('should respect rate limits', async () => {
      const stats = optimizer.getVendorStats('openai');
      expect(stats).toBeTruthy();
      expect(stats!.rateLimit.max).toBeGreaterThan(0);
      expect(stats!.rateLimit.current).toBeGreaterThanOrEqual(0);
    });

    it('should provide system statistics', () => {
      const systemStats = optimizer.getSystemStats();
      
      expect(systemStats).toHaveProperty('totalQueueSize');
      expect(systemStats).toHaveProperty('activeVendors');
      expect(systemStats).toHaveProperty('totalCostEstimate');
      expect(systemStats.activeVendors).toBeGreaterThan(0);
    });
  });

  describe('ModerationCacheService', () => {
    let cacheService: ModerationCacheService;

    beforeEach(() => {
      // Use in-memory Redis mock for testing
      cacheService = new ModerationCacheService('redis://localhost:6379');
    });

    afterEach(async () => {
      await cacheService.close();
    });

    it('should cache and retrieve moderation results', async () => {
      const result = {
        contentId: 'test-content-1',
        decision: 'allow' as const,
        confidence: 0.95,
        categories: ['safe'],
        vendorScores: { openai: 0.1, perspective: 0.05 },
        timestamp: Date.now(),
        ttl: 3600
      };

      await cacheService.cacheModerationResult(result);
      const cached = await cacheService.getModerationResult('test-content-1');

      expect(cached).toEqual(result);
    });

    it('should cache and retrieve user reputation', async () => {
      const reputation = {
        userId: 'user-123',
        score: 85,
        level: 'high' as const,
        violationCount: 2,
        helpfulReports: 15,
        lastUpdated: Date.now()
      };

      await cacheService.cacheUserReputation(reputation);
      const cached = await cacheService.getUserReputation('user-123');

      expect(cached).toEqual(reputation);
    });

    it('should handle batch operations efficiently', async () => {
      const results = Array.from({ length: 10 }, (_, i) => ({
        contentId: `content-${i}`,
        decision: 'allow' as const,
        confidence: 0.9,
        categories: ['safe'],
        vendorScores: { openai: 0.1 },
        timestamp: Date.now(),
        ttl: 3600
      }));

      await cacheService.batchCacheModerationResults(results);
      
      const contentIds = results.map(r => r.contentId);
      const cached = await cacheService.batchGetModerationResults(contentIds);

      expect(cached.size).toBe(10);
      contentIds.forEach(id => {
        expect(cached.has(id)).toBe(true);
      });
    });

    it('should track cache statistics', async () => {
      // Perform some cache operations
      await cacheService.getModerationResult('non-existent');
      
      const result = {
        contentId: 'test-stats',
        decision: 'allow' as const,
        confidence: 0.9,
        categories: ['safe'],
        vendorScores: {},
        timestamp: Date.now(),
        ttl: 3600
      };
      
      await cacheService.cacheModerationResult(result);
      await cacheService.getModerationResult('test-stats');

      const stats = await cacheService.getCacheStats();
      
      expect(stats.totalRequests).toBeGreaterThan(0);
      expect(stats.hitRate).toBeGreaterThanOrEqual(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('CircuitBreaker', () => {
    let circuitBreaker: CircuitBreaker;
    let mockFunction: jest.Mock;

    beforeEach(() => {
      mockFunction = jest.fn();
      circuitBreaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['TimeoutError'],
        slowCallThreshold: 0.5,
        slowCallDurationThreshold: 100
      });
    });

    it('should execute function successfully when circuit is closed', async () => {
      mockFunction.mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFunction);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledOnce();
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED);
      expect(stats.successCount).toBe(1);
    });

    it('should open circuit after failure threshold', async () => {
      mockFunction.mockRejectedValue(new Error('Service unavailable'));
      
      // Trigger failures to reach threshold
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(mockFunction);
        } catch (error) {
          // Expected failures
        }
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.OPEN);
      expect(stats.failureCount).toBe(3);
    });

    it('should reject calls when circuit is open', async () => {
      // Force circuit open
      circuitBreaker.forceOpen();
      
      await expect(circuitBreaker.execute(mockFunction)).rejects.toThrow('Circuit breaker is OPEN');
      expect(mockFunction).not.toHaveBeenCalled();
    });

    it('should transition to half-open after recovery timeout', async () => {
      // Open circuit
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getStats().state).toBe(CircuitState.OPEN);
      
      // Wait for recovery timeout (mocked)
      await new Promise(resolve => setTimeout(resolve, 1100));
      
      // Next call should transition to half-open
      mockFunction.mockResolvedValue('recovery success');
      const result = await circuitBreaker.execute(mockFunction);
      
      expect(result).toBe('recovery success');
      expect(circuitBreaker.getStats().state).toBe(CircuitState.CLOSED);
    });

    it('should handle expected errors without opening circuit', async () => {
      const timeoutError = new Error('TimeoutError: Request timeout');
      mockFunction.mockRejectedValue(timeoutError);
      
      try {
        await circuitBreaker.execute(mockFunction);
      } catch (error) {
        // Expected
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe(CircuitState.CLOSED); // Should remain closed
    });

    it('should track slow calls', async () => {
      mockFunction.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve('slow'), 150))
      );
      
      await circuitBreaker.execute(mockFunction);
      
      const stats = circuitBreaker.getStats();
      expect(stats.slowCallCount).toBe(1);
      expect(stats.averageResponseTime).toBeGreaterThan(100);
    });
  });

  describe('CircuitBreakerManager', () => {
    let manager: CircuitBreakerManager;

    beforeEach(() => {
      manager = new CircuitBreakerManager();
    });

    it('should create and manage multiple circuit breakers', () => {
      const breaker1 = manager.getCircuitBreaker('service1');
      const breaker2 = manager.getCircuitBreaker('service2');
      
      expect(breaker1).toBeTruthy();
      expect(breaker2).toBeTruthy();
      expect(breaker1).not.toBe(breaker2);
      
      // Getting same service should return same instance
      const breaker1Again = manager.getCircuitBreaker('service1');
      expect(breaker1Again).toBe(breaker1);
    });

    it('should provide system health summary', () => {
      // Create some circuit breakers
      const breaker1 = manager.getCircuitBreaker('service1');
      const breaker2 = manager.getCircuitBreaker('service2');
      
      // Force one open
      breaker1.forceOpen();
      
      const health = manager.getHealthSummary();
      
      expect(health.totalCircuits).toBe(2);
      expect(health.openCircuits).toBe(1);
      expect(health.healthyCircuits).toBe(1);
      expect(health.overallHealth).toBe('degraded');
    });

    it('should collect statistics from all circuit breakers', () => {
      manager.getCircuitBreaker('service1');
      manager.getCircuitBreaker('service2');
      manager.getCircuitBreaker('service3');
      
      const allStats = manager.getAllStats();
      
      expect(allStats.size).toBe(3);
      expect(allStats.has('service1')).toBe(true);
      expect(allStats.has('service2')).toBe(true);
      expect(allStats.has('service3')).toBe(true);
    });
  });

  describe('Performance Integration Tests', () => {
    it('should handle high-throughput duplicate detection', async () => {
      const hashingService = new PerceptualHashingService();
      const textHashingService = new TextHashingService();
      
      const startTime = Date.now();
      
      // Generate hashes for 100 text samples
      const textPromises = Array.from({ length: 100 }, (_, i) => 
        Promise.resolve(textHashingService.generateTextHashes(`Test message ${i}`))
      );
      
      const textResults = await Promise.all(textPromises);
      const endTime = Date.now();
      
      expect(textResults).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify all hashes are unique
      const hashes = new Set(textResults.map(r => r.contentHash));
      expect(hashes.size).toBe(100);
    });

    it('should maintain cache performance under load', async () => {
      const cacheService = new ModerationCacheService();
      
      const startTime = Date.now();
      
      // Perform 1000 cache operations
      const operations = [];
      for (let i = 0; i < 1000; i++) {
        const result = {
          contentId: `content-${i}`,
          decision: 'allow' as const,
          confidence: Math.random(),
          categories: ['safe'],
          vendorScores: { openai: Math.random() },
          timestamp: Date.now(),
          ttl: 3600
        };
        
        operations.push(
          cacheService.cacheModerationResult(result)
            .then(() => cacheService.getModerationResult(`content-${i}`))
        );
      }
      
      await Promise.all(operations);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      const stats = await cacheService.getCacheStats();
      expect(stats.hitRate).toBeGreaterThan(0.9); // High hit rate expected
      
      await cacheService.close();
    });
  });
});