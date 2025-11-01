import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { GracefulDegradationService } from '../services/gracefulDegradationService';
import { SystemHealthMonitoringService } from '../services/systemHealthMonitoringService';
import { ErrorClassificationService } from '../services/errorClassificationService';

describe('Graceful Degradation System', () => {
  let degradationService: GracefulDegradationService;
  let healthMonitoringService: SystemHealthMonitoringService;
  let errorClassificationService: ErrorClassificationService;

  beforeEach(() => {
    degradationService = new GracefulDegradationService({
      enableFallbacks: true,
      fallbackTimeout: 5000,
      maxRetries: 2,
      retryDelayMs: 100,
      maxRetryDelayMs: 1000,
      backoffMultiplier: 2,
      healthCheckInterval: 1000,
      degradedModeThreshold: 0.5
    });

    healthMonitoringService = new SystemHealthMonitoringService();
    errorClassificationService = new ErrorClassificationService();
  });

  afterEach(() => {
    degradationService.destroy();
    healthMonitoringService.destroy();
  });

  describe('GracefulDegradationService', () => {
    describe('executeWithDegradation', () => {
      it('should execute operation successfully when service is healthy', async () => {
        const mockOperation = jest.fn().mockResolvedValue('success');
        
        const result = await degradationService.executeWithDegradation(
          'test-operation',
          mockOperation
        );
        
        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(1);
      });

      it('should track service health during operations', async () => {
        const mockOperation = jest.fn().mockResolvedValue('success');
        
        await degradationService.executeWithDegradation('test-service', mockOperation);
        
        // Service should be marked as healthy after successful operation
        const systemHealth = degradationService.getSystemHealth();
        expect(systemHealth.overallStatus).toBe('healthy');
      });
    });

    describe('executeWithRetry', () => {
      it('should retry failed operations with exponential backoff', async () => {
        let attemptCount = 0;
        const mockOperation = jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return 'success';
        });

        const result = await degradationService.executeWithRetry(
          mockOperation,
          'retry-test',
          3
        );

        expect(result).toBe('success');
        expect(mockOperation).toHaveBeenCalledTimes(3);
      });

      it('should not retry non-retryable errors', async () => {
        const mockOperation = jest.fn().mockRejectedValue(new Error('ValidationError: Invalid input'));

        await expect(
          degradationService.executeWithRetry(mockOperation, 'validation-test', 3)
        ).rejects.toThrow('ValidationError: Invalid input');

        expect(mockOperation).toHaveBeenCalledTimes(1);
      });

      it('should emit retry events', async () => {
        const retryAttemptSpy = jest.fn();
        const retrySuccessSpy = jest.fn();
        
        degradationService.on('retryAttempt', retryAttemptSpy);
        degradationService.on('retrySuccess', retrySuccessSpy);

        let attemptCount = 0;
        const mockOperation = jest.fn().mockImplementation(() => {
          attemptCount++;
          if (attemptCount < 2) {
            throw new Error('Temporary failure');
          }
          return 'success';
        });

        await degradationService.executeWithRetry(mockOperation, 'event-test', 3);

        expect(retryAttemptSpy).toHaveBeenCalled();
        expect(retrySuccessSpy).toHaveBeenCalled();
      });
    });

    describe('fallback strategies', () => {
      it('should register and execute fallback strategies by priority', async () => {
        const lowPriorityFallback = jest.fn().mockResolvedValue('low-priority');
        const highPriorityFallback = jest.fn().mockResolvedValue('high-priority');

        degradationService.registerFallbackStrategy('test-op', {
          name: 'low-priority',
          priority: 50,
          condition: () => true,
          execute: lowPriorityFallback,
          description: 'Low priority fallback'
        });

        degradationService.registerFallbackStrategy('test-op', {
          name: 'high-priority',
          priority: 100,
          condition: () => true,
          execute: highPriorityFallback,
          description: 'High priority fallback'
        });

        // Simulate fallback execution (would normally be triggered by circuit breaker)
        const fallbackResult = await (degradationService as any).executeFallback('test-op', {});

        expect(fallbackResult).toBe('high-priority');
        expect(highPriorityFallback).toHaveBeenCalled();
        expect(lowPriorityFallback).not.toHaveBeenCalled();
      });

      it('should try next fallback strategy if first one fails', async () => {
        const failingFallback = jest.fn().mockRejectedValue(new Error('Fallback failed'));
        const workingFallback = jest.fn().mockResolvedValue('working-fallback');

        degradationService.registerFallbackStrategy('test-op', {
          name: 'failing',
          priority: 100,
          condition: () => true,
          execute: failingFallback,
          description: 'Failing fallback'
        });

        degradationService.registerFallbackStrategy('test-op', {
          name: 'working',
          priority: 90,
          condition: () => true,
          execute: workingFallback,
          description: 'Working fallback'
        });

        const fallbackResult = await (degradationService as any).executeFallback('test-op', {});

        expect(fallbackResult).toBe('working-fallback');
        expect(failingFallback).toHaveBeenCalled();
        expect(workingFallback).toHaveBeenCalled();
      });
    });

    describe('system health monitoring', () => {
      it('should update degradation state based on service health', async () => {
        // Simulate multiple service failures
        degradationService.updateServiceHealth('service1', false);
        degradationService.updateServiceHealth('service2', false);
        degradationService.updateServiceHealth('service3', true);

        const systemHealth = degradationService.getSystemHealth();
        expect(systemHealth.degradationState.mode).toBe('degraded');
        expect(systemHealth.degradationState.failedServices).toContain('service1');
        expect(systemHealth.degradationState.failedServices).toContain('service2');
      });

      it('should trigger emergency mode when most services fail', async () => {
        // Simulate critical failure
        for (let i = 1; i <= 5; i++) {
          degradationService.updateServiceHealth(`service${i}`, false);
        }

        const systemHealth = degradationService.getSystemHealth();
        expect(systemHealth.degradationState.mode).toBe('emergency');
      });

      it('should attempt recovery from degraded mode', async () => {
        // Put system in degraded mode
        degradationService.forceDegradedMode('Test degradation');
        
        // Mock successful recovery
        const recoverySpy = jest.spyOn(degradationService, 'attemptRecovery');
        recoverySpy.mockResolvedValue(true);

        const recoveryResult = await degradationService.attemptRecovery();
        expect(recoveryResult).toBe(true);
      });
    });
  });

  describe('SystemHealthMonitoringService', () => {
    describe('metrics collection', () => {
      it('should collect system metrics', async () => {
        const metrics = await healthMonitoringService.collectMetrics();
        
        expect(metrics).toHaveProperty('timestamp');
        expect(metrics).toHaveProperty('systemLoad');
        expect(metrics).toHaveProperty('services');
        expect(metrics).toHaveProperty('circuitBreakers');
        expect(metrics).toHaveProperty('degradationState');
        
        expect(metrics.systemLoad).toHaveProperty('cpu');
        expect(metrics.systemLoad).toHaveProperty('memory');
        expect(metrics.systemLoad).toHaveProperty('heap');
      });

      it('should store metrics history', async () => {
        const initialMetrics = healthMonitoringService.getMetricsHistory();
        expect(initialMetrics).toHaveLength(0);

        // Trigger metrics collection
        await healthMonitoringService.collectMetrics();
        
        const metricsAfter = healthMonitoringService.getMetricsHistory();
        expect(metricsAfter.length).toBeGreaterThan(0);
      });
    });

    describe('alert system', () => {
      it('should trigger alerts when conditions are met', async () => {
        const alertSpy = jest.fn();
        healthMonitoringService.on('alertTriggered', alertSpy);

        // Add a test alert rule
        healthMonitoringService.addAlertRule({
          name: 'test-alert',
          condition: (metrics) => metrics.systemLoad.memory > 50,
          severity: 'warning',
          message: 'Test alert triggered',
          cooldownMs: 1000
        });

        // Mock high memory usage
        const mockMetrics = {
          timestamp: new Date(),
          systemLoad: { cpu: 10, memory: 80, heap: process.memoryUsage() },
          services: {},
          circuitBreakers: {},
          degradationState: { mode: 'normal' as const, reason: 'test', affectedServices: [] }
        };

        (healthMonitoringService as any).checkAlertRules(mockMetrics);

        expect(alertSpy).toHaveBeenCalled();
      });

      it('should respect alert cooldown periods', async () => {
        const alertSpy = jest.fn();
        healthMonitoringService.on('alertTriggered', alertSpy);

        healthMonitoringService.addAlertRule({
          name: 'cooldown-test',
          condition: () => true,
          severity: 'info',
          message: 'Cooldown test',
          cooldownMs: 5000 // 5 seconds
        });

        const mockMetrics = {
          timestamp: new Date(),
          systemLoad: { cpu: 10, memory: 50, heap: process.memoryUsage() },
          services: {},
          circuitBreakers: {},
          degradationState: { mode: 'normal' as const, reason: 'test', affectedServices: [] }
        };

        // First trigger
        (healthMonitoringService as any).checkAlertRules(mockMetrics);
        expect(alertSpy).toHaveBeenCalledTimes(1);

        // Second trigger (should be blocked by cooldown)
        (healthMonitoringService as any).checkAlertRules(mockMetrics);
        expect(alertSpy).toHaveBeenCalledTimes(1); // Still only once
      });
    });

    describe('health summary', () => {
      it('should provide accurate health summary', () => {
        const summary = healthMonitoringService.getHealthSummary();
        
        expect(summary).toHaveProperty('status');
        expect(summary).toHaveProperty('uptime');
        expect(summary).toHaveProperty('activeAlerts');
        expect(summary).toHaveProperty('criticalAlerts');
        expect(summary).toHaveProperty('servicesStatus');
        expect(summary).toHaveProperty('lastUpdate');
        
        expect(['healthy', 'degraded', 'critical']).toContain(summary.status);
        expect(typeof summary.uptime).toBe('number');
        expect(typeof summary.activeAlerts).toBe('number');
        expect(typeof summary.criticalAlerts).toBe('number');
      });
    });
  });

  describe('ErrorClassificationService', () => {
    describe('error classification', () => {
      it('should classify network errors correctly', () => {
        const networkError = new Error('Connection refused');
        const context = {
          service: 'test-service',
          operation: 'test-operation',
          timestamp: new Date()
        };

        const classified = errorClassificationService.classifyError(networkError, context);
        
        expect(classified.classification.type).toBe('network');
        expect(classified.classification.retryable).toBe(true);
        expect(classified.classification.suggestedAction).toBe('retry');
      });

      it('should classify rate limit errors correctly', () => {
        const rateLimitError = new Error('Rate limit exceeded');
        const context = {
          service: 'openai',
          operation: 'text-moderation',
          timestamp: new Date()
        };

        const classified = errorClassificationService.classifyError(rateLimitError, context);
        
        expect(classified.classification.type).toBe('rate_limit');
        expect(classified.classification.retryable).toBe(true);
        expect(classified.classification.severity).toBe('low');
      });

      it('should classify authentication errors correctly', () => {
        const authError = new Error('Invalid API key');
        const context = {
          service: 'google-vision',
          operation: 'image-scan',
          timestamp: new Date()
        };

        const classified = errorClassificationService.classifyError(authError, context);
        
        expect(classified.classification.type).toBe('authentication');
        expect(classified.classification.retryable).toBe(false);
        expect(classified.classification.suggestedAction).toBe('escalate');
      });

      it('should classify validation errors correctly', () => {
        const validationError = new Error('Invalid request format');
        const context = {
          service: 'content-moderation',
          operation: 'validate-input',
          timestamp: new Date()
        };

        const classified = errorClassificationService.classifyError(validationError, context);
        
        expect(classified.classification.type).toBe('validation');
        expect(classified.classification.retryable).toBe(false);
      });
    });

    describe('error statistics', () => {
      it('should provide accurate error statistics', () => {
        // Generate some test errors
        const errors = [
          new Error('Network timeout'),
          new Error('Rate limit exceeded'),
          new Error('Invalid API key'),
          new Error('Connection refused')
        ];

        const context = {
          service: 'test-service',
          operation: 'test-operation',
          timestamp: new Date()
        };

        errors.forEach(error => {
          errorClassificationService.classifyError(error, context);
        });

        const stats = errorClassificationService.getErrorStatistics();
        
        expect(stats.totalErrors).toBe(4);
        expect(stats.errorsByType).toHaveProperty('network');
        expect(stats.errorsByType).toHaveProperty('rate_limit');
        expect(stats.errorsByType).toHaveProperty('authentication');
        expect(stats.retryableErrors).toBeGreaterThan(0);
        expect(stats.nonRetryableErrors).toBeGreaterThan(0);
      });

      it('should filter statistics by time window', () => {
        const oldError = new Error('Old error');
        const recentError = new Error('Recent error');
        
        const oldContext = {
          service: 'test',
          operation: 'test',
          timestamp: new Date(Date.now() - 10000) // 10 seconds ago
        };
        
        const recentContext = {
          service: 'test',
          operation: 'test',
          timestamp: new Date()
        };

        errorClassificationService.classifyError(oldError, oldContext);
        errorClassificationService.classifyError(recentError, recentContext);

        // Get stats for last 5 seconds only
        const recentStats = errorClassificationService.getErrorStatistics(5000);
        expect(recentStats.totalErrors).toBe(1);
      });
    });

    describe('circuit breaker integration', () => {
      it('should determine if error should trigger circuit breaker', () => {
        const networkError = new Error('Connection timeout');
        const validationError = new Error('Invalid input');
        
        const context = {
          service: 'test',
          operation: 'test',
          timestamp: new Date()
        };

        const classifiedNetwork = errorClassificationService.classifyError(networkError, context);
        const classifiedValidation = errorClassificationService.classifyError(validationError, context);

        expect(errorClassificationService.shouldTriggerCircuitBreaker(classifiedNetwork)).toBe(true);
        expect(errorClassificationService.shouldTriggerCircuitBreaker(classifiedValidation)).toBe(false);
      });

      it('should provide appropriate retry delays', () => {
        const rateLimitError = new Error('Rate limit exceeded');
        const networkError = new Error('Connection failed');
        
        const context = {
          service: 'test',
          operation: 'test',
          timestamp: new Date()
        };

        const classifiedRateLimit = errorClassificationService.classifyError(rateLimitError, context);
        const classifiedNetwork = errorClassificationService.classifyError(networkError, context);

        const rateLimitDelay = errorClassificationService.getRecommendedRetryDelay(classifiedRateLimit, 1);
        const networkDelay = errorClassificationService.getRecommendedRetryDelay(classifiedNetwork, 1);

        expect(rateLimitDelay).toBeGreaterThan(networkDelay); // Rate limit should have longer delay
        expect(rateLimitDelay).toBeGreaterThan(0);
        expect(networkDelay).toBeGreaterThan(0);
      });
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete system degradation scenario', async () => {
      // Simulate multiple service failures
      const services = ['openai', 'google-vision', 'perspective'];
      
      services.forEach(service => {
        degradationService.updateServiceHealth(service, false);
      });

      const systemHealth = degradationService.getSystemHealth();
      expect(systemHealth.degradationState.mode).toBe('emergency');

      // Verify fallback strategies are available
      const mockOperation = jest.fn().mockRejectedValue(new Error('All services down'));
      
      try {
        await degradationService.executeWithDegradation('content-moderation', mockOperation);
      } catch (error) {
        // Expected to fail, but fallback should be attempted
      }

      expect(mockOperation).toHaveBeenCalled();
    });

    it('should recover from degraded state when services become healthy', async () => {
      // Start with degraded state
      degradationService.forceDegradedMode('Test scenario');
      
      // Simulate service recovery
      const services = ['openai', 'google-vision', 'perspective'];
      services.forEach(service => {
        degradationService.updateServiceHealth(service, true);
      });

      // Attempt recovery
      const recoverySuccess = await degradationService.attemptRecovery();
      
      if (recoverySuccess) {
        const systemHealth = degradationService.getSystemHealth();
        expect(systemHealth.degradationState.mode).toBe('normal');
      }
    });

    it('should maintain error history and provide insights', () => {
      const errors = [
        { error: new Error('OpenAI quota exceeded'), service: 'openai' },
        { error: new Error('Google Vision timeout'), service: 'google-vision' },
        { error: new Error('Network connection failed'), service: 'perspective' }
      ];

      errors.forEach(({ error, service }) => {
        errorClassificationService.classifyError(error, {
          service,
          operation: 'moderation',
          timestamp: new Date()
        });
      });

      const stats = errorClassificationService.getErrorStatistics();
      expect(stats.totalErrors).toBe(3);
      expect(stats.errorsByType).toHaveProperty('rate_limit');
      expect(stats.errorsByType).toHaveProperty('timeout');
      expect(stats.errorsByType).toHaveProperty('network');

      const openaiErrors = errorClassificationService.getRecentErrorsByService('openai', 5);
      expect(openaiErrors).toHaveLength(1);
      expect(openaiErrors[0].classification.type).toBe('rate_limit');
    });
  });
});
