import { logger } from '../utils/logger';
import { circuitBreakerService } from './circuitBreakerService';
import { fallbackService } from './fallbackService';
import { alertService } from './alertService';

// Error recovery strategies
type RecoveryStrategy = 'retry' | 'circuit_breaker' | 'fallback' | 'graceful_degradation' | 'fail_fast';

interface RecoveryConfig {
  strategies: RecoveryStrategy[];
  retryConfig?: {
    maxRetries: number;
    baseDelay: number;
    backoffMultiplier: number;
  };
  circuitBreakerName?: string;
  fallbackKey?: string;
  customFallback?: any;
  alertOnFailure?: boolean;
  gracefulDegradationMode?: boolean;
}

interface RecoveryResult<T> {
  success: boolean;
  data?: T;
  strategy?: RecoveryStrategy;
  attempts: number;
  totalTime: number;
  errors: Array<{
    strategy: RecoveryStrategy;
    error: string;
    timestamp: Date;
  }>;
  usedFallback: boolean;
  fallbackSource?: string;
}

class ErrorRecoveryService {
  private recoveryAttempts: Map<string, number> = new Map();
  private lastRecoveryTime: Map<string, number> = new Map();

  // Execute operation with comprehensive error recovery
  async executeWithRecovery<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RecoveryConfig
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const errors: RecoveryResult<T>['errors'] = [];
    let attempts = 0;
    let lastError: any;

    // Track recovery attempts
    const recoveryKey = `${operationName}_recovery`;
    const currentAttempts = this.recoveryAttempts.get(recoveryKey) || 0;
    this.recoveryAttempts.set(recoveryKey, currentAttempts + 1);
    this.lastRecoveryTime.set(recoveryKey, Date.now());

    logger.info(`Starting error recovery for operation: ${operationName}`, {
      operation: operationName,
      strategies: config.strategies,
      recoveryAttempt: currentAttempts + 1
    });

    // Try each recovery strategy in order
    for (const strategy of config.strategies) {
      attempts++;
      
      try {
        logger.debug(`Attempting recovery strategy: ${strategy}`, {
          operation: operationName,
          strategy,
          attempt: attempts
        });

        let result: T;
        let usedFallback = false;
        let fallbackSource: string | undefined;

        switch (strategy) {
          case 'retry':
            result = await this.executeWithRetry(operation, operationName, config);
            break;

          case 'circuit_breaker':
            result = await this.executeWithCircuitBreaker(operation, operationName, config);
            break;

          case 'fallback':
            const fallbackResult = await this.executeWithFallback(operation, operationName, config);
            result = fallbackResult.data;
            usedFallback = fallbackResult.usedFallback;
            fallbackSource = fallbackResult.fallbackSource;
            break;

          case 'graceful_degradation':
            result = await this.executeWithGracefulDegradation(operation, operationName, config);
            usedFallback = true;
            fallbackSource = 'graceful_degradation';
            break;

          case 'fail_fast':
            result = await operation();
            break;

          default:
            throw new Error(`Unknown recovery strategy: ${strategy}`);
        }

        // Success!
        const totalTime = Date.now() - startTime;
        
        logger.info(`Operation recovered successfully using strategy: ${strategy}`, {
          operation: operationName,
          strategy,
          attempts,
          totalTime,
          usedFallback,
          fallbackSource
        });

        // Reset recovery attempts on success
        this.recoveryAttempts.delete(recoveryKey);

        return {
          success: true,
          data: result,
          strategy,
          attempts,
          totalTime,
          errors,
          usedFallback,
          fallbackSource
        };

      } catch (error) {
        lastError = error;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        errors.push({
          strategy,
          error: errorMessage,
          timestamp: new Date()
        });

        logger.warn(`Recovery strategy ${strategy} failed for operation: ${operationName}`, {
          operation: operationName,
          strategy,
          error: errorMessage,
          attempt: attempts
        });

        // Continue to next strategy
        continue;
      }
    }

    // All recovery strategies failed
    const totalTime = Date.now() - startTime;
    
    logger.error(`All recovery strategies failed for operation: ${operationName}`, {
      operation: operationName,
      strategies: config.strategies,
      attempts,
      totalTime,
      errors,
      finalError: lastError instanceof Error ? lastError.message : 'Unknown error'
    });

    // Send alert if configured
    if (config.alertOnFailure) {
      await alertService.createAlert(
        'service_down',
        `Operation Recovery Failed: ${operationName}`,
        `All recovery strategies failed for ${operationName} after ${attempts} attempts`,
        operationName,
        {
          strategies: config.strategies,
          attempts,
          totalTime,
          errors,
          finalError: lastError instanceof Error ? lastError.message : 'Unknown error'
        },
        'high'
      );
    }

    return {
      success: false,
      strategy: undefined,
      attempts,
      totalTime,
      errors,
      usedFallback: false
    };
  }

  private async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RecoveryConfig
  ): Promise<T> {
    return circuitBreakerService.executeWithRetry(
      operation,
      operationName,
      config.retryConfig
    );
  }

  private async executeWithCircuitBreaker<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RecoveryConfig
  ): Promise<T> {
    const circuitBreakerName = config.circuitBreakerName || 'default';
    
    return circuitBreakerService.executeWithCircuitBreaker(
      circuitBreakerName,
      operation,
      config.customFallback ? () => Promise.resolve(config.customFallback) : undefined
    );
  }

  private async executeWithFallback<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RecoveryConfig
  ): Promise<{ data: T; usedFallback: boolean; fallbackSource?: string }> {
    const fallbackKey = config.fallbackKey || operationName;
    
    return fallbackService.executeWithFallback(
      operation,
      fallbackKey,
      {
        customFallback: config.customFallback,
        onFallback: (fallbackData) => {
          logger.info(`Using fallback data for operation: ${operationName}`, {
            operation: operationName,
            fallbackSource: fallbackData.source,
            fallbackAge: Date.now() - fallbackData.timestamp.getTime()
          });
        }
      }
    );
  }

  private async executeWithGracefulDegradation<T>(
    operation: () => Promise<T>,
    operationName: string,
    config: RecoveryConfig
  ): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      logger.warn(`Operation failed, entering graceful degradation mode: ${operationName}`, {
        operation: operationName,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Return minimal/safe default data
      if (config.customFallback) {
        return config.customFallback;
      }

      // Generate safe defaults based on operation name
      return this.generateGracefulDegradationData<T>(operationName);
    }
  }

  private generateGracefulDegradationData<T>(operationName: string): T {
    // Generate safe default data based on operation patterns
    if (operationName.includes('seller') || operationName.includes('profile')) {
      return {
        error: 'Service temporarily unavailable',
        message: 'Seller profile data is currently unavailable. Please try again later.',
        degraded: true
      } as T;
    }

    if (operationName.includes('listings') || operationName.includes('marketplace')) {
      return {
        listings: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: false
        },
        error: 'Service temporarily unavailable',
        message: 'Marketplace listings are currently unavailable. Please try again later.',
        degraded: true
      } as T;
    }

    if (operationName.includes('auth') || operationName.includes('authentication')) {
      return {
        authenticated: false,
        error: 'Authentication service temporarily unavailable',
        message: 'Please try reconnecting your wallet.',
        degraded: true
      } as T;
    }

    // Generic degraded response
    return {
      error: 'Service temporarily unavailable',
      message: 'This service is currently experiencing issues. Please try again later.',
      degraded: true,
      timestamp: new Date().toISOString()
    } as T;
  }

  // Get recovery statistics
  getRecoveryStats(): {
    totalRecoveryAttempts: number;
    activeRecoveries: number;
    recentRecoveries: Array<{
      operation: string;
      attempts: number;
      lastAttempt: Date;
    }>;
    circuitBreakerHealth: any;
    fallbackStats: any;
  } {
    const now = Date.now();
    const recentThreshold = 300000; // 5 minutes
    
    const recentRecoveries = Array.from(this.recoveryAttempts.entries())
      .filter(([_, lastTime]) => now - (this.lastRecoveryTime.get(_) || 0) < recentThreshold)
      .map(([operation, attempts]) => ({
        operation: operation.replace('_recovery', ''),
        attempts,
        lastAttempt: new Date(this.lastRecoveryTime.get(operation) || 0)
      }));

    return {
      totalRecoveryAttempts: Array.from(this.recoveryAttempts.values()).reduce((sum, attempts) => sum + attempts, 0),
      activeRecoveries: recentRecoveries.length,
      recentRecoveries,
      circuitBreakerHealth: circuitBreakerService.getHealthStatus(),
      fallbackStats: fallbackService.getStats()
    };
  }

  // Reset recovery tracking
  resetRecoveryTracking(): void {
    this.recoveryAttempts.clear();
    this.lastRecoveryTime.clear();
    
    logger.info('Error recovery tracking reset');
  }

  // Predefine common recovery configurations
  static getCommonConfigs(): Record<string, RecoveryConfig> {
    return {
      // Database operations
      database: {
        strategies: ['retry', 'circuit_breaker', 'fallback'],
        retryConfig: {
          maxRetries: 3,
          baseDelay: 1000,
          backoffMultiplier: 2
        },
        circuitBreakerName: 'database',
        alertOnFailure: true
      },

      // External API calls
      externalApi: {
        strategies: ['retry', 'circuit_breaker', 'fallback'],
        retryConfig: {
          maxRetries: 2,
          baseDelay: 500,
          backoffMultiplier: 2
        },
        circuitBreakerName: 'external-api',
        alertOnFailure: true
      },

      // Cache operations
      cache: {
        strategies: ['retry', 'graceful_degradation'],
        retryConfig: {
          maxRetries: 1,
          baseDelay: 100,
          backoffMultiplier: 1
        },
        circuitBreakerName: 'cache',
        alertOnFailure: false
      },

      // Authentication
      authentication: {
        strategies: ['retry', 'circuit_breaker', 'graceful_degradation'],
        retryConfig: {
          maxRetries: 2,
          baseDelay: 1000,
          backoffMultiplier: 2
        },
        circuitBreakerName: 'auth-service',
        alertOnFailure: true
      },

      // Critical operations (fail fast)
      critical: {
        strategies: ['fail_fast'],
        alertOnFailure: true
      },

      // Non-critical operations (graceful degradation)
      nonCritical: {
        strategies: ['retry', 'fallback', 'graceful_degradation'],
        retryConfig: {
          maxRetries: 1,
          baseDelay: 500,
          backoffMultiplier: 1
        },
        alertOnFailure: false
      }
    };
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();

// Export types
export type { RecoveryStrategy, RecoveryConfig, RecoveryResult };