import { EventEmitter } from 'events';
import { CircuitBreaker, circuitBreakerService as circuitBreakerServiceInstance } from './circuitBreakerService';

// Get the type from the instance
type CircuitBreakerService = typeof circuitBreakerServiceInstance;

export interface DegradationConfig {
  enableFallbacks: boolean;
  fallbackTimeout: number;
  maxRetries: number;
  retryDelayMs: number;
  maxRetryDelayMs: number;
  backoffMultiplier: number;
  healthCheckInterval: number;
  degradedModeThreshold: number; // Percentage of failed services to trigger degraded mode
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'failed';
  lastCheck: Date;
  consecutiveFailures: number;
  responseTime: number;
  errorRate: number;
}

export interface DegradationState {
  mode: 'normal' | 'degraded' | 'emergency';
  availableServices: string[];
  failedServices: string[];
  degradedServices: string[];
  lastStateChange: Date;
  reason: string;
}

export interface FallbackStrategy {
  name: string;
  priority: number;
  condition: (error: Error, context: any) => boolean;
  execute: (context: any) => Promise<any>;
  description: string;
}

/**
 * Graceful degradation service for AI content moderation system
 * Handles vendor API outages, implements fallback mechanisms, and manages system health
 */
export class GracefulDegradationService extends EventEmitter {
  private config: DegradationConfig;
  private serviceHealth: Map<string, ServiceHealth> = new Map();
  private degradationState: DegradationState;
  private fallbackStrategies: Map<string, FallbackStrategy[]> = new Map();
  private healthCheckTimer?: NodeJS.Timeout;
  private circuitBreakerService: CircuitBreakerService;

  constructor(config?: Partial<DegradationConfig>) {
    super();

    this.config = {
      enableFallbacks: true,
      fallbackTimeout: 10000, // 10 seconds
      maxRetries: 3,
      retryDelayMs: 1000, // 1 second
      maxRetryDelayMs: 30000, // 30 seconds
      backoffMultiplier: 2,
      healthCheckInterval: 60000, // 1 minute
      degradedModeThreshold: 0.5, // 50% of services failed
      ...config
    };

    this.degradationState = {
      mode: 'normal',
      availableServices: [],
      failedServices: [],
      degradedServices: [],
      lastStateChange: new Date(),
      reason: 'System initialized'
    };

    this.circuitBreakerService = circuitBreakerServiceInstance;
    this.startHealthMonitoring();
    this.setupDefaultFallbackStrategies();
  }

  /**
   * Execute operation with graceful degradation support
   */
  async executeWithDegradation<T>(
    operationName: string,
    operation: () => Promise<T>,
    context?: any
  ): Promise<T> {
    let circuitBreaker = this.circuitBreakerService.getCircuitBreaker(operationName);

    if (!circuitBreaker) {
      circuitBreaker = this.circuitBreakerService.createCircuitBreaker(operationName, {
        failureThreshold: 5,
        recoveryTimeout: 60000,
        monitoringPeriod: 300000,
        expectedErrors: ['TimeoutError', 'RateLimitError', 'ServiceUnavailableError']
      });
    }

    try {
      const result = await circuitBreaker.execute(operation);
      this.recordSuccess(operationName);
      return result;
    } catch (error) {
      this.recordFailure(operationName, error as Error);
      throw error;
    }
  }

  /**
   * Execute operation with retry logic and exponential backoff
   */
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    maxRetries?: number
  ): Promise<T> {
    const retries = maxRetries ?? this.config.maxRetries;
    let lastError: Error;
    let delay = this.config.retryDelayMs;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await operation();

        if (attempt > 0) {
          this.emit('retrySuccess', {
            operationName,
            attempt,
            totalAttempts: attempt + 1
          });
        }

        return result;
      } catch (error) {
        lastError = error as Error;

        // Don't retry on certain errors
        if (this.isNonRetryableError(error as Error)) {
          throw error;
        }

        if (attempt < retries) {
          this.emit('retryAttempt', {
            operationName,
            attempt: attempt + 1,
            maxRetries: retries,
            delay,
            error: lastError.message
          });

          await this.sleep(delay);
          delay = Math.min(delay * this.config.backoffMultiplier, this.config.maxRetryDelayMs);
        }
      }
    }

    this.emit('retryExhausted', {
      operationName,
      totalAttempts: retries + 1,
      finalError: lastError.message
    });

    throw lastError;
  }

  /**
   * Register a fallback strategy for a specific operation
   */
  registerFallbackStrategy(operationName: string, strategy: FallbackStrategy): void {
    if (!this.fallbackStrategies.has(operationName)) {
      this.fallbackStrategies.set(operationName, []);
    }

    const strategies = this.fallbackStrategies.get(operationName)!;
    strategies.push(strategy);

    // Sort by priority (higher priority first)
    strategies.sort((a, b) => b.priority - a.priority);

    this.emit('fallbackRegistered', {
      operationName,
      strategyName: strategy.name,
      priority: strategy.priority
    });
  }

  /**
   * Execute fallback strategies for failed operation
   */
  private async executeFallback(operationName: string, context: any): Promise<any> {
    const strategies = this.fallbackStrategies.get(operationName) || [];

    if (strategies.length === 0) {
      throw new Error(`No fallback strategies available for ${operationName}`);
    }

    for (const strategy of strategies) {
      try {
        if (strategy.condition(new Error('Circuit breaker open'), context)) {
          this.emit('fallbackExecuting', {
            operationName,
            strategyName: strategy.name,
            description: strategy.description
          });

          const result = await Promise.race([
            strategy.execute(context),
            this.createTimeoutPromise(this.config.fallbackTimeout)
          ]);

          this.emit('fallbackSuccess', {
            operationName,
            strategyName: strategy.name
          });

          return result;
        }
      } catch (error) {
        this.emit('fallbackFailed', {
          operationName,
          strategyName: strategy.name,
          error: (error as Error).message
        });

        // Continue to next strategy
        continue;
      }
    }

    throw new Error(`All fallback strategies failed for ${operationName}`);
  }

  /**
   * Update service health status
   */
  updateServiceHealth(serviceName: string, isHealthy: boolean, responseTime?: number): void {
    const currentHealth = this.serviceHealth.get(serviceName) || {
      name: serviceName,
      status: 'healthy',
      lastCheck: new Date(),
      consecutiveFailures: 0,
      responseTime: 0,
      errorRate: 0
    };

    currentHealth.lastCheck = new Date();
    currentHealth.responseTime = responseTime || currentHealth.responseTime;

    if (isHealthy) {
      currentHealth.consecutiveFailures = 0;
      currentHealth.status = 'healthy';
    } else {
      currentHealth.consecutiveFailures++;

      if (currentHealth.consecutiveFailures >= 3) {
        currentHealth.status = 'failed';
      } else if (currentHealth.consecutiveFailures >= 1) {
        currentHealth.status = 'degraded';
      }
    }

    this.serviceHealth.set(serviceName, currentHealth);
    this.updateDegradationState();

    this.emit('serviceHealthUpdated', {
      serviceName,
      status: currentHealth.status,
      consecutiveFailures: currentHealth.consecutiveFailures
    });
  }

  /**
   * Get current system health summary
   */
  getSystemHealth(): {
    overallStatus: 'healthy' | 'degraded' | 'critical';
    services: ServiceHealth[];
    degradationState: DegradationState;
    circuitBreakerStats: Record<string, any>;
  } {
    const services = Array.from(this.serviceHealth.values());
    const circuitBreakerStats = this.circuitBreakerService.getAllStates();

    let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';

    const failedCount = services.filter(s => s.status === 'failed').length;
    const degradedCount = services.filter(s => s.status === 'degraded').length;
    const totalCount = services.length;

    if (totalCount > 0) {
      const failureRate = failedCount / totalCount;
      const degradationRate = (failedCount + degradedCount) / totalCount;

      if (failureRate >= 0.5) {
        overallStatus = 'critical';
      } else if (degradationRate >= 0.3) {
        overallStatus = 'degraded';
      }
    }

    return {
      overallStatus,
      services,
      degradationState: this.degradationState,
      circuitBreakerStats
    };
  }

  /**
   * Force system into degraded mode (for testing or emergency)
   */
  forceDegradedMode(reason: string): void {
    this.degradationState = {
      mode: 'degraded',
      availableServices: this.getHealthyServices(),
      failedServices: this.getFailedServices(),
      degradedServices: this.getDegradedServices(),
      lastStateChange: new Date(),
      reason: `Forced degradation: ${reason}`
    };

    this.emit('degradationStateChanged', this.degradationState);
  }

  /**
   * Attempt to recover from degraded mode
   */
  /**
   * Attempt to recover from degraded mode
   */
  async attemptRecovery(): Promise<boolean> {
    this.emit('recoveryAttemptStarted');

    try {
      // Re-run health checks for all known services
      // This updates internal state based on current circuit breaker stats
      await this.performHealthCheck();

      // Check if we have recovered enough to exit degraded mode
      // recoverySuccess is true if we are no longer in critical state 
      // i.e., > 70% of services are healthy

      const services = Array.from(this.serviceHealth.values());
      const healthyServices = services.filter(s => s.status === 'healthy').length;
      const totalServices = services.length;

      // If we have no services registered, we assume healthy
      if (totalServices === 0) {
        this.degradationState.mode = 'normal';
        this.degradationState.reason = 'No services registered';
        this.degradationState.lastStateChange = new Date();
        return true;
      }

      const recoverySuccess = healthyServices >= totalServices * 0.7;

      if (recoverySuccess) {
        this.degradationState.mode = 'normal';
        this.degradationState.reason = 'Recovery successful: Majority of services are healthy';
        this.degradationState.lastStateChange = new Date();

        this.emit('recoverySuccess', {
          recoveredServices: healthyServices,
          totalServices
        });
      } else {
        this.emit('recoveryFailed', {
          recoveredServices: healthyServices,
          totalServices
        });
      }

      return recoverySuccess;
    } catch (error) {
      this.emit('recoveryError', { error: (error as Error).message });
      return false;
    }
  }

  /**
   * Setup default fallback strategies for common operations
   */
  private setupDefaultFallbackStrategies(): void {
    // Text moderation fallback
    this.registerFallbackStrategy('text-moderation', {
      name: 'single-vendor-fallback',
      priority: 100,
      condition: () => true,
      execute: async (context) => {
        // Return a conservative result when ensemble fails
        return {
          vendor: 'fallback',
          confidence: 0.3,
          categories: [],
          reasoning: 'Fallback result due to vendor unavailability',
          cost: 0,
          latency: 0,
          success: true,
          fallback: true
        };
      },
      description: 'Conservative fallback when text moderation vendors are unavailable'
    });

    // Image moderation fallback
    this.registerFallbackStrategy('image-moderation', {
      name: 'skip-image-analysis',
      priority: 100,
      condition: () => true,
      execute: async (context) => {
        return {
          vendor: 'fallback',
          confidence: 0,
          categories: [],
          reasoning: 'Image analysis skipped due to vendor unavailability',
          cost: 0,
          latency: 0,
          success: true,
          fallback: true
        };
      },
      description: 'Skip image analysis when vendors are unavailable'
    });

    // Content publishing fallback
    this.registerFallbackStrategy('content-publishing', {
      name: 'publish-with-warning',
      priority: 90,
      condition: () => this.degradationState.mode !== 'emergency',
      execute: async (context) => {
        return {
          action: 'allow',
          confidence: 0,
          warning: 'Content published with reduced moderation due to system degradation',
          requiresReview: true
        };
      },
      description: 'Publish content with warning label during degraded mode'
    });

    // Emergency mode fallback
    this.registerFallbackStrategy('content-publishing', {
      name: 'emergency-block',
      priority: 200,
      condition: () => this.degradationState.mode === 'emergency',
      execute: async (context) => {
        return {
          action: 'block',
          confidence: 1.0,
          reasoning: 'Content blocked due to emergency mode - system degradation'
        };
      },
      description: 'Block all content during emergency mode'
    });
  }

  /**
   * Start health monitoring
   */
  private startHealthMonitoring(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthCheck();
    }, this.config.healthCheckInterval);
  }

  /**
   * Perform periodic health check
   */
  private async performHealthCheck(): Promise<void> {
    this.emit('healthCheckStarted');

    try {
      // This would integrate with actual service health checks
      // For now, we'll update based on circuit breaker states
      const circuitStats = this.circuitBreakerService.getAllStates();

      for (const [serviceName, stats] of Object.entries(circuitStats)) {
        const isHealthy = stats.state === 'closed' && stats.failureCount < 3;
        this.updateServiceHealth(serviceName, isHealthy, stats.averageResponseTime);
      }

      this.emit('healthCheckCompleted');
    } catch (error) {
      this.emit('healthCheckFailed', { error: (error as Error).message });
    }
  }

  /**
   * Update degradation state based on service health
   */
  private updateDegradationState(): void {
    const services = Array.from(this.serviceHealth.values());
    const failedServices = services.filter(s => s.status === 'failed');
    const degradedServices = services.filter(s => s.status === 'degraded');
    const healthyServices = services.filter(s => s.status === 'healthy');

    const failureRate = services.length > 0 ? failedServices.length / services.length : 0;
    const previousMode = this.degradationState.mode;

    let newMode: 'normal' | 'degraded' | 'emergency' = 'normal';
    let reason = 'System operating normally';

    if (failureRate >= 0.8) {
      newMode = 'emergency';
      reason = `Critical system failure: ${failedServices.length}/${services.length} services failed`;
    } else if (failureRate >= this.config.degradedModeThreshold) {
      newMode = 'degraded';
      reason = `System degraded: ${failedServices.length}/${services.length} services failed`;
    } else if (degradedServices.length > 0) {
      newMode = 'degraded';
      reason = `System degraded: ${degradedServices.length} services experiencing issues`;
    }

    if (newMode !== previousMode) {
      this.degradationState = {
        mode: newMode,
        availableServices: healthyServices.map(s => s.name),
        failedServices: failedServices.map(s => s.name),
        degradedServices: degradedServices.map(s => s.name),
        lastStateChange: new Date(),
        reason
      };

      this.emit('degradationStateChanged', {
        previousMode,
        newMode,
        reason,
        failedServices: failedServices.length,
        totalServices: services.length
      });
    }
  }

  /**
   * Record successful operation
   */
  private recordSuccess(operationName: string): void {
    this.updateServiceHealth(operationName, true);
  }

  /**
   * Record failed operation
   */
  private recordFailure(operationName: string, error: Error): void {
    this.updateServiceHealth(operationName, false);

    this.emit('operationFailed', {
      operationName,
      error: error.message,
      timestamp: new Date()
    });
  }

  /**
   * Check if error should not be retried
   */
  private isNonRetryableError(error: Error): boolean {
    const nonRetryableErrors = [
      'ValidationError',
      'AuthenticationError',
      'AuthorizationError',
      'BadRequestError',
      'NotFoundError'
    ];

    return nonRetryableErrors.some(errorType =>
      error.name === errorType || error.message.includes(errorType)
    );
  }

  /**
   * Get healthy services
   */
  private getHealthyServices(): string[] {
    return Array.from(this.serviceHealth.values())
      .filter(s => s.status === 'healthy')
      .map(s => s.name);
  }

  /**
   * Get failed services
   */
  private getFailedServices(): string[] {
    return Array.from(this.serviceHealth.values())
      .filter(s => s.status === 'failed')
      .map(s => s.name);
  }

  /**
   * Get degraded services
   */
  private getDegradedServices(): string[] {
    return Array.from(this.serviceHealth.values())
      .filter(s => s.status === 'degraded')
      .map(s => s.name);
  }

  /**
   * Create timeout promise
   */
  private createTimeoutPromise(ms: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Operation timeout')), ms);
    });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
    }
    this.removeAllListeners();
  }
}

export const gracefulDegradationService = new GracefulDegradationService();
