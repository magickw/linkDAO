import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';

// Simple standalone tests for performance optimization components
describe('Performance Optimization - Standalone Tests', () => {
  describe('Text Hashing Service', () => {
    it('should generate consistent hashes for identical text', () => {
      // Import the service directly
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
      const text = 'This is a test message for hashing';
      
      const hash1 = textHashingService.generateTextHashes(text);
      const hash2 = textHashingService.generateTextHashes(text);

      expect(hash1.contentHash).toBe(hash2.contentHash);
      expect(hash1.semanticHash).toBe(hash2.semanticHash);
      expect(hash1.normalizedText).toBe(hash2.normalizedText);
      expect(hash1.wordCount).toBeGreaterThan(0);
    });

    it('should normalize text consistently', () => {
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
      const text1 = 'Hello World!!! How are you???';
      const text2 = 'hello world how are you';
      
      const hash1 = textHashingService.generateTextHashes(text1);
      const hash2 = textHashingService.generateTextHashes(text2);

      expect(hash1.normalizedText).toBe(hash2.normalizedText);
    });

    it('should detect exact duplicates', async () => {
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
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
  });

  describe('Perceptual Hashing Service', () => {
    it('should calculate similarity between hashes', () => {
      const { PerceptualHashingService } = require('../services/perceptualHashingService');
      const perceptualHashingService = new PerceptualHashingService();
      
      const hash1 = 'abcd1234';
      const hash2 = 'abcd1235'; // Only 1 bit different
      
      const similarity = perceptualHashingService.calculateSimilarity(hash1, hash2);
      expect(similarity).toBeGreaterThan(0.9);
    });

    it('should detect different images with low similarity', () => {
      const { PerceptualHashingService } = require('../services/perceptualHashingService');
      const perceptualHashingService = new PerceptualHashingService();
      
      const hash1 = 'abcd1234';
      const hash2 = 'efgh5678';
      
      const similarity = perceptualHashingService.calculateSimilarity(hash1, hash2);
      expect(similarity).toBeLessThan(0.5);
    });
  });

  describe('Vendor API Optimizer', () => {
    let optimizer: any;

    beforeEach(() => {
      const { VendorApiOptimizer } = require('../services/vendorApiOptimizer');
      optimizer = new VendorApiOptimizer();
    });

    afterEach(() => {
      if (optimizer) {
        optimizer.removeAllListeners();
      }
    });

    it('should provide system statistics', () => {
      const systemStats = optimizer.getSystemStats();
      
      expect(systemStats).toHaveProperty('totalQueueSize');
      expect(systemStats).toHaveProperty('activeVendors');
      expect(systemStats).toHaveProperty('totalCostEstimate');
      expect(systemStats.activeVendors).toBeGreaterThan(0);
    });

    it('should get vendor statistics', () => {
      const stats = optimizer.getVendorStats('openai');
      expect(stats).toBeTruthy();
      expect(stats.rateLimit.max).toBeGreaterThan(0);
      expect(stats.rateLimit.current).toBeGreaterThanOrEqual(0);
    });

    it('should update vendor configuration', () => {
      const originalConfig = optimizer.getVendorStats('openai')?.config;
      expect(originalConfig).toBeTruthy();
      
      optimizer.updateVendorConfig('openai', { batchSize: 50 });
      
      const updatedConfig = optimizer.getVendorStats('openai')?.config;
      expect(updatedConfig?.batchSize).toBe(50);
    });
  });

  describe('Circuit Breaker', () => {
    it('should initialize with closed state', () => {
      const { CircuitBreaker } = require('../services/circuitBreakerService');
      
      const circuitBreaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['TimeoutError'],
        slowCallThreshold: 0.5,
        slowCallDurationThreshold: 100
      });

      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.failureCount).toBe(0);
      expect(stats.successCount).toBe(0);
    });

    it('should track statistics correctly', async () => {
      const { CircuitBreaker } = require('../services/circuitBreakerService');
      
      const circuitBreaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['TimeoutError'],
        slowCallThreshold: 0.5,
        slowCallDurationThreshold: 100
      });

      const mockFunction = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(mockFunction);
      
      expect(result).toBe('success');
      expect(mockFunction).toHaveBeenCalledTimes(1);
      
      const stats = circuitBreaker.getStats();
      expect(stats.successCount).toBe(1);
      expect(stats.totalCalls).toBe(1);
    });

    it('should handle manual state changes', () => {
      const { CircuitBreaker } = require('../services/circuitBreakerService');
      
      const circuitBreaker = new CircuitBreaker('test-service', {
        failureThreshold: 3,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['TimeoutError'],
        slowCallThreshold: 0.5,
        slowCallDurationThreshold: 100
      });

      // Force open
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getStats().state).toBe('open');
      
      // Force close
      circuitBreaker.forceClose();
      expect(circuitBreaker.getStats().state).toBe('closed');
      
      // Reset
      circuitBreaker.reset();
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe('closed');
      expect(stats.failureCount).toBe(0);
    });
  });

  describe('Circuit Breaker Manager', () => {
    it('should create and manage multiple circuit breakers', () => {
      const { CircuitBreakerManager } = require('../services/circuitBreakerService');
      const manager = new CircuitBreakerManager();
      
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
      const { CircuitBreakerManager } = require('../services/circuitBreakerService');
      const manager = new CircuitBreakerManager();
      
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
  });

  describe('Performance Integration', () => {
    it('should handle high-throughput text hashing', () => {
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
      const startTime = Date.now();
      
      // Generate hashes for 100 text samples
      const results = [];
      for (let i = 0; i < 100; i++) {
        const result = textHashingService.generateTextHashes(`Test message ${i}`);
        results.push(result);
      }
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      
      // Verify all hashes are unique
      const hashes = new Set(results.map(r => r.contentHash));
      expect(hashes.size).toBe(100);
    });

    it('should maintain performance with duplicate detection', async () => {
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
      // Create existing content map with 50 items
      const existingContent = new Map();
      for (let i = 0; i < 50; i++) {
        const text = `Existing message ${i}`;
        existingContent.set(`content-${i}`, {
          hash: textHashingService.generateTextHashes(text),
          text
        });
      }

      const startTime = Date.now();
      
      // Check for duplicates 100 times
      const results = [];
      for (let i = 0; i < 100; i++) {
        const testText = i < 25 ? `Existing message ${i}` : `New message ${i}`;
        const result = await textHashingService.checkForDuplicate(testText, existingContent);
        results.push(result);
      }
      
      const endTime = Date.now();
      
      expect(results).toHaveLength(100);
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      
      // Verify duplicates were detected
      const duplicates = results.filter(r => r.isDuplicate);
      expect(duplicates.length).toBe(25); // First 25 should be duplicates
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid input gracefully', () => {
      const { TextHashingService } = require('../services/textHashingService');
      const textHashingService = new TextHashingService();
      
      // Test with empty string
      const result1 = textHashingService.generateTextHashes('');
      expect(result1.contentHash).toBeTruthy();
      expect(result1.wordCount).toBe(0);
      
      // Test with very long string
      const longText = 'a'.repeat(10000);
      const result2 = textHashingService.generateTextHashes(longText);
      expect(result2.contentHash).toBeTruthy();
      expect(result2.wordCount).toBe(1);
    });

    it('should handle circuit breaker errors', async () => {
      const { CircuitBreaker } = require('../services/circuitBreakerService');
      
      const circuitBreaker = new CircuitBreaker('test-service', {
        failureThreshold: 2,
        recoveryTimeout: 1000,
        monitoringPeriod: 5000,
        expectedErrors: ['TimeoutError'],
        slowCallThreshold: 0.5,
        slowCallDurationThreshold: 100
      });

      const failingFunction = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Trigger failures to reach threshold
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(failingFunction);
        } catch (error) {
          // Expected failures
        }
      }
      
      const stats = circuitBreaker.getStats();
      expect(stats.state).toBe('open');
      expect(stats.failureCount).toBe(2);
      
      // Next call should be rejected immediately
      await expect(circuitBreaker.execute(failingFunction)).rejects.toThrow('Circuit breaker is OPEN');
    });
  });
});
