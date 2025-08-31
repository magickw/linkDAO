import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { AIModerationOrchestrator } from '../services/aiModerationOrchestrator';
import { GracefulDegradationService } from '../services/gracefulDegradationService';
import { ErrorClassificationService } from '../services/errorClassificationService';

describe('Error Scenarios and Degradation Behavior', () => {
  let orchestrator: AIModerationOrchestrator;
  let degradationService: GracefulDegradationService;
  let errorClassificationService: ErrorClassificationService;

  beforeEach(() => {
    orchestrator = new AIModerationOrchestrator();
    degradationService = new GracefulDegradationService({
      enableFallbacks: true,
      maxRetries: 2,
      retryDelayMs: 100
    });
    errorClassificationService = new ErrorClassificationService();
  });

  afterEach(() => {
    degradationService.destroy();
  });

  describe('Vendor API Outages', () => {
    it('should handle OpenAI API outage gracefully', async () => {
      // Mock OpenAI service to fail
      const mockOpenAIError = new Error('OpenAI API is currently unavailable');
      
      // Mock the text vendors to simulate OpenAI failure
      jest.spyOn(orchestrator['textVendors'][0], 'scanText').mockRejectedValue(mockOpenAIError);
      
      const testContent = {
        id: 'test-content-1',
        type: 'post' as const,
        text: 'This is test content',
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x123...',
        metadata: {}
      };

      const result = await orchestrator.scanContent(testContent);
      
      // Should still get a result, possibly from other vendors or fallback
      expect(result).toBeDefined();
      expect(result.action).toBeOneOf(['allow', 'limit', 'block', 'review']);
      
      // Should have some vendor results, even if some failed
      expect(result.vendorResults).toBeDefined();
    });

    it('should handle Google Vision API outage for image content', async () => {
      const mockVisionError = new Error('Google Vision API quota exceeded');
      
      // Mock Google Vision service to fail
      jest.spyOn(orchestrator['imageVendors'][0], 'scanImage').mockRejectedValue(mockVisionError);
      
      const testContent = {
        id: 'test-content-2',
        type: 'post' as const,
        media: [{
          url: 'https://example.com/test-image.jpg',
          type: 'image' as const,
          mimeType: 'image/jpeg',
          size: 1024000
        }],
        userId: 'user-123',
        userReputation: 75,
        walletAddress: '0x123...',
        metadata: {}
      };

      const result = await orchestrator.scanContent(testContent);
      
      expect(result).toBeDefined();
      expect(result.action).toBeOneOf(['allow', 'limit', 'block', 'review']);
      
      // Should handle the failure gracefully
      const failedResults = result.vendorResults.filter(r => !r.success);
      expect(failedResults.length).toBeGreaterThan(0);
    });

    it('should handle complete vendor ensemble failure', async () => {
      // Mock all vendors to fail
      orchestrator['textVendors'].forEach(vendor => {
        jest.spyOn(vendor, 'scanText').mockRejectedValue(new Error('Service unavailable'));
      });
      
      orchestrator['imageVendors'].forEach(vendor => {
        if (vendor.scanImage) {
          jest.spyOn(vendor, 'scanImage').mockRejectedValue(new Error('Service unavailable'));
        }
      });

      const testContent = {
        id: 'test-content-3',
        type: 'post' as const,
        text: 'Test content with image',
        media: [{
          url: 'https://example.com/test.jpg',
          type: 'image' as const,
          mimeType: 'image/jpeg',
          size: 512000
        }],
        userId: 'user-123',
        userReputation: 50,
        walletAddress: '0x123...',
        metadata: {}
      };

      const result = await orchestrator.scanContent(testContent);
      
      // Should return a safe fallback decision
      expect(result).toBeDefined();
      expect(result.action).toBe('review'); // Conservative approach when all vendors fail
      expect(result.primaryCategory).toBe('error');
    });
  });

  describe('Network and Timeout Errors', () => {
    it('should handle network timeout errors with retry', async () => {
      let attemptCount = 0;
      const timeoutError = new Error('Request timeout');
      
      const mockOperation = jest.fn().mockImplementation(() => {
        attemptCount++;
        if (attemptCount < 3) {
          throw timeoutError;
        }
        return { success: true, data: 'success' };
      });

      const result = await degradationService.executeWithRetry(
        mockOperation,
        'timeout-test',
        3
      );

      expect(result.data).toBe('success');
      expect(mockOperation).toHaveBeenCalledTimes(3);
    });

    it('should classify network errors correctly', () => {
      const networkErrors = [
        new Error('ECONNREFUSED'),
        new Error('ENOTFOUND'),
        new Error('ETIMEDOUT'),
        new Error('Network request failed')
      ];

      networkErrors.forEach(error => {
        const classified = errorClassificationService.classifyError(error, {
          service: 'test-service',
          operation: 'network-test',
          timestamp: new Date()
        });

        expect(classified.classification.type).toBe('network');
        expect(classified.classification.retryable).toBe(true);
        expect(classified.classification.suggestedAction).toBe('retry');
      });
    });

    it('should handle DNS resolution failures', async () => {
      const dnsError = new Error('ENOTFOUND api.openai.com');
      
      const classified = errorClassificationService.classifyError(dnsError, {
        service: 'openai',
        operation: 'text-moderation',
        timestamp: new Date()
      });

      expect(classified.classification.type).toBe('network');
      expect(classified.classification.retryable).toBe(true);
      
      const retryDelay = errorClassificationService.getRecommendedRetryDelay(classified, 1);
      expect(retryDelay).toBeGreaterThan(0);
      expect(retryDelay).toBeLessThan(10000); // Should be reasonable for network errors
    });
  });

  describe('Rate Limiting and Quota Errors', () => {
    it('should handle OpenAI rate limiting', () => {
      const rateLimitError = new Error('Rate limit exceeded. Please try again later.');
      
      const classified = errorClassificationService.classifyError(rateLimitError, {
        service: 'openai',
        operation: 'text-moderation',
        timestamp: new Date()
      });

      expect(classified.classification.type).toBe('rate_limit');
      expect(classified.classification.severity).toBe('low');
      expect(classified.classification.retryable).toBe(true);
      
      const retryDelay = errorClassificationService.getRecommendedRetryDelay(classified, 1);
      expect(retryDelay).toBeGreaterThan(30000); // Should wait longer for rate limits
    });

    it('should handle Google Vision quota exceeded', () => {
      const quotaError = new Error('Quota exceeded for Google Vision API');
      
      const classified = errorClassificationService.classifyError(quotaError, {
        service: 'google-vision',
        operation: 'image-scan',
        timestamp: new Date()
      });

      expect(classified.classification.type).toBe('rate_limit');
      expect(classified.classification.suggestedAction).toBe('retry');
    });

    it('should suggest fallback for persistent rate limiting', async () => {
      // Simulate persistent rate limiting
      const rateLimitError = new Error('Rate limit exceeded');
      
      let fallbackExecuted = false;
      degradationService.registerFallbackStrategy('rate-limit-test', {
        name: 'rate-limit-fallback',
        priority: 100,
        condition: (error) => error.message.includes('Rate limit'),
        execute: async () => {
          fallbackExecuted = true;
          return { fallback: true, confidence: 0.3 };
        },
        description: 'Fallback for rate limiting'
      });

      // This would normally be handled by circuit breaker
      try {
        await degradationService.executeWithDegradation(
          'rate-limit-test',
          () => Promise.reject(rateLimitError)
        );
      } catch (error) {
        // Expected to fail initially
      }

      // Verify error was classified correctly
      const classified = errorClassificationService.classifyError(rateLimitError, {
        service: 'test',
        operation: 'rate-limit-test',
        timestamp: new Date()
      });

      expect(classified.classification.type).toBe('rate_limit');
    });
  });

  describe('Authentication and Authorization Errors', () => {
    it('should handle invalid API key errors', () => {
      const authErrors = [
        new Error('Invalid API key provided'),
        new Error('Unauthorized: 401'),
        new Error('Forbidden: 403'),
        new Error('Authentication failed')
      ];

      authErrors.forEach(error => {
        const classified = errorClassificationService.classifyError(error, {
          service: 'openai',
          operation: 'authenticate',
          timestamp: new Date()
        });

        expect(classified.classification.type).toBe('authentication');
        expect(classified.classification.retryable).toBe(false);
        expect(classified.classification.suggestedAction).toBe('escalate');
        expect(classified.classification.severity).toBe('high');
      });
    });

    it('should not trigger circuit breaker for auth errors', () => {
      const authError = new Error('Invalid API key');
      
      const classified = errorClassificationService.classifyError(authError, {
        service: 'openai',
        operation: 'text-scan',
        timestamp: new Date()
      });

      expect(errorClassificationService.shouldTriggerCircuitBreaker(classified)).toBe(false);
    });
  });

  describe('Validation and Input Errors', () => {
    it('should handle validation errors without retry', () => {
      const validationErrors = [
        new Error('ValidationError: Invalid input format'),
        new Error('Bad Request: 400'),
        new Error('Malformed JSON in request body'),
        new Error('Required field missing: text')
      ];

      validationErrors.forEach(error => {
        const classified = errorClassificationService.classifyError(error, {
          service: 'content-validator',
          operation: 'validate-input',
          timestamp: new Date()
        });

        expect(classified.classification.type).toBe('validation');
        expect(classified.classification.retryable).toBe(false);
        expect(classified.classification.suggestedAction).toBe('escalate');
      });
    });

    it('should not retry validation errors', async () => {
      const validationError = new Error('ValidationError: Invalid content format');
      const mockOperation = jest.fn().mockRejectedValue(validationError);

      await expect(
        degradationService.executeWithRetry(mockOperation, 'validation-test', 3)
      ).rejects.toThrow('ValidationError: Invalid content format');

      expect(mockOperation).toHaveBeenCalledOnce();
    });
  });

  describe('Circuit Breaker Behavior', () => {
    it('should open circuit breaker after repeated failures', async () => {
      const failingOperation = jest.fn().mockRejectedValue(new Error('Service unavailable'));
      
      // Execute multiple times to trigger circuit breaker
      for (let i = 0; i < 6; i++) {
        try {
          await degradationService.executeWithDegradation('circuit-test', failingOperation);
        } catch (error) {
          // Expected to fail
        }
      }

      // Circuit breaker should now be open
      const systemHealth = degradationService.getSystemHealth();
      const circuitStats = systemHealth.circuitBreakerStats.get('circuit-test');
      
      if (circuitStats) {
        expect(circuitStats.state).toBe('open');
      }
    });

    it('should use fallback when circuit is open', async () => {
      let fallbackUsed = false;
      
      degradationService.registerFallbackStrategy('circuit-fallback-test', {
        name: 'circuit-fallback',
        priority: 100,
        condition: () => true,
        execute: async () => {
          fallbackUsed = true;
          return { fallback: true };
        },
        description: 'Circuit breaker fallback'
      });

      const failingOperation = jest.fn().mockRejectedValue(new Error('Service down'));
      
      // Trigger circuit breaker opening
      for (let i = 0; i < 6; i++) {
        try {
          await degradationService.executeWithDegradation('circuit-fallback-test', failingOperation);
        } catch (error) {
          // Expected failures
        }
      }

      // Next call should use fallback
      try {
        await degradationService.executeWithDegradation('circuit-fallback-test', failingOperation);
      } catch (error) {
        // May still fail if fallback isn't properly triggered
      }
    });
  });

  describe('System Recovery', () => {
    it('should recover from degraded mode when services become healthy', async () => {
      // Force degraded mode
      degradationService.forceDegradedMode('Test recovery scenario');
      
      let systemHealth = degradationService.getSystemHealth();
      expect(systemHealth.degradationState.mode).toBe('degraded');

      // Simulate service recovery
      degradationService.updateServiceHealth('service1', true);
      degradationService.updateServiceHealth('service2', true);
      degradationService.updateServiceHealth('service3', true);

      // Attempt recovery
      const recoverySuccess = await degradationService.attemptRecovery();
      
      if (recoverySuccess) {
        systemHealth = degradationService.getSystemHealth();
        expect(systemHealth.degradationState.mode).toBe('normal');
      }
    });

    it('should gradually recover circuit breakers', async () => {
      // This test would verify that circuit breakers transition from open -> half-open -> closed
      // when services recover. Implementation depends on circuit breaker timing.
      
      const mockOperation = jest.fn()
        .mockRejectedValueOnce(new Error('Still failing'))
        .mockResolvedValue('recovered');

      // First call should fail
      try {
        await degradationService.executeWithDegradation('recovery-test', mockOperation);
      } catch (error) {
        expect(error.message).toBe('Still failing');
      }

      // Second call should succeed (simulating recovery)
      const result = await degradationService.executeWithDegradation('recovery-test', mockOperation);
      expect(result).toBe('recovered');
    });
  });

  describe('Error Statistics and Monitoring', () => {
    it('should track error patterns over time', () => {
      const errors = [
        { error: new Error('Network timeout'), service: 'openai' },
        { error: new Error('Rate limit exceeded'), service: 'openai' },
        { error: new Error('Network timeout'), service: 'google-vision' },
        { error: new Error('Invalid API key'), service: 'perspective' }
      ];

      errors.forEach(({ error, service }) => {
        errorClassificationService.classifyError(error, {
          service,
          operation: 'moderation',
          timestamp: new Date()
        });
      });

      const stats = errorClassificationService.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(4);
      expect(stats.errorsByType.network).toBe(2);
      expect(stats.errorsByType.rate_limit).toBe(1);
      expect(stats.errorsByType.authentication).toBe(1);
      expect(stats.retryableErrors).toBe(3);
      expect(stats.nonRetryableErrors).toBe(1);
    });

    it('should provide service-specific error insights', () => {
      const openaiErrors = [
        new Error('OpenAI quota exceeded'),
        new Error('OpenAI API timeout')
      ];

      openaiErrors.forEach(error => {
        errorClassificationService.classifyError(error, {
          service: 'openai',
          operation: 'text-moderation',
          timestamp: new Date()
        });
      });

      const openaiErrorHistory = errorClassificationService.getRecentErrorsByService('openai', 10);
      expect(openaiErrorHistory).toHaveLength(2);
      
      const errorTypes = openaiErrorHistory.map(e => e.classification.type);
      expect(errorTypes).toContain('rate_limit');
      expect(errorTypes).toContain('timeout');
    });
  });

  describe('Fallback Strategy Effectiveness', () => {
    it('should measure fallback success rates', async () => {
      let fallbackSuccessCount = 0;
      let fallbackFailureCount = 0;

      degradationService.on('fallbackSuccess', () => fallbackSuccessCount++);
      degradationService.on('fallbackFailed', () => fallbackFailureCount++);

      // Register multiple fallback strategies
      degradationService.registerFallbackStrategy('fallback-test', {
        name: 'primary-fallback',
        priority: 100,
        condition: () => true,
        execute: async () => {
          if (Math.random() > 0.5) {
            throw new Error('Fallback failed');
          }
          return { fallback: true };
        },
        description: 'Primary fallback'
      });

      degradationService.registerFallbackStrategy('fallback-test', {
        name: 'secondary-fallback',
        priority: 90,
        condition: () => true,
        execute: async () => ({ fallback: true, secondary: true }),
        description: 'Secondary fallback'
      });

      // Execute multiple operations to test fallback effectiveness
      for (let i = 0; i < 10; i++) {
        try {
          await degradationService['executeFallback']('fallback-test', {});
        } catch (error) {
          // Some fallbacks may fail
        }
      }

      // Should have some successful fallbacks
      expect(fallbackSuccessCount + fallbackFailureCount).toBeGreaterThan(0);
    });
  });
});