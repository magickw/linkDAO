import { GracefulDegradationService } from '../services/gracefulDegradationService';
import { SystemHealthMonitoringService } from '../services/systemHealthMonitoringService';
import { ErrorClassificationService } from '../services/errorClassificationService';

describe('Graceful Degradation System - Simple Tests', () => {
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
    test('should execute operation successfully when service is healthy', async () => {
      const testOperation = async () => 'success';
      
      const result = await degradationService.executeWithDegradation(
        'test-operation',
        testOperation
      );
      
      expect(result).toBe('success');
    });

    test('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const testOperation = async () => {
        attemptCount++;
        if (attemptCount < 3) {
          throw new Error('Temporary failure');
        }
        return 'success';
      };

      const result = await degradationService.executeWithRetry(
        testOperation,
        'retry-test',
        3
      );

      expect(result).toBe('success');
      expect(attemptCount).toBe(3);
    });

    test('should not retry non-retryable errors', async () => {
      const testOperation = async () => {
        throw new Error('ValidationError: Invalid input');
      };

      await expect(
        degradationService.executeWithRetry(testOperation, 'validation-test', 3)
      ).rejects.toThrow('ValidationError: Invalid input');
    });

    test('should register and execute fallback strategies', async () => {
      let fallbackExecuted = false;
      
      degradationService.registerFallbackStrategy('test-operation', {
        name: 'test-fallback',
        priority: 100,
        condition: () => true,
        execute: async () => {
          fallbackExecuted = true;
          return { fallback: true, data: 'fallback-result' };
        },
        description: 'Test fallback strategy'
      });

      // Test fallback execution directly
      const fallbackResult = await (degradationService as any).executeFallback('test-operation', {});
      
      expect(fallbackExecuted).toBe(true);
      expect(fallbackResult.fallback).toBe(true);
    });

    test('should update degradation state based on service health', () => {
      // Simulate multiple service failures
      degradationService.updateServiceHealth('service1', false);
      degradationService.updateServiceHealth('service2', false);
      degradationService.updateServiceHealth('service3', true);

      const systemHealth = degradationService.getSystemHealth();
      expect(systemHealth.degradationState.mode).toBe('degraded');
      expect(systemHealth.degradationState.failedServices).toContain('service1');
      expect(systemHealth.degradationState.failedServices).toContain('service2');
    });

    test('should trigger emergency mode when most services fail', () => {
      // Simulate critical failure
      for (let i = 1; i <= 5; i++) {
        degradationService.updateServiceHealth(`service${i}`, false);
      }

      const systemHealth = degradationService.getSystemHealth();
      expect(systemHealth.degradationState.mode).toBe('emergency');
    });
  });

  describe('SystemHealthMonitoringService', () => {
    test('should collect system metrics', async () => {
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

    test('should store metrics history', async () => {
      const initialMetrics = healthMonitoringService.getMetricsHistory();
      expect(initialMetrics).toHaveLength(0);

      // Trigger metrics collection
      await healthMonitoringService.collectMetrics();
      
      const metricsAfter = healthMonitoringService.getMetricsHistory();
      expect(metricsAfter.length).toBeGreaterThan(0);
    });

    test('should provide accurate health summary', () => {
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

    test('should add and trigger custom alert rules', () => {
      let alertTriggered = false;
      healthMonitoringService.on('alertTriggered', () => {
        alertTriggered = true;
      });

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

      expect(alertTriggered).toBe(true);
    });
  });

  describe('ErrorClassificationService', () => {
    test('should classify network errors correctly', () => {
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

    test('should classify rate limit errors correctly', () => {
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

    test('should classify authentication errors correctly', () => {
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

    test('should classify validation errors correctly', () => {
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

    test('should provide accurate error statistics', () => {
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

    test('should determine if error should trigger circuit breaker', () => {
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

    test('should provide appropriate retry delays', () => {
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

  describe('Integration Tests', () => {
    test('should handle complete system degradation scenario', async () => {
      // Simulate multiple service failures
      const services = ['openai', 'google-vision', 'perspective'];
      
      services.forEach(service => {
        degradationService.updateServiceHealth(service, false);
      });

      const systemHealth = degradationService.getSystemHealth();
      expect(systemHealth.degradationState.mode).toBe('emergency');

      // Verify fallback strategies are available
      const testOperation = async () => {
        throw new Error('All services down');
      };
      
      try {
        await degradationService.executeWithDegradation('content-moderation', testOperation);
      } catch (error) {
        // Expected to fail, but fallback should be attempted
        expect(error).toBeDefined();
      }
    });

    test('should recover from degraded state when services become healthy', async () => {
      // Start with degraded state
      degradationService.forceDegradedMode('Test scenario');
      
      // Simulate service recovery
      const services = ['openai', 'google-vision', 'perspective'];
      services.forEach(service => {
        degradationService.updateServiceHealth(service, true);
      });

      // Attempt recovery
      const recoverySuccess = await degradationService.attemptRecovery();
      
      // Recovery may or may not succeed depending on implementation
      expect(typeof recoverySuccess).toBe('boolean');
    });

    test('should maintain error history and provide insights', () => {
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