import { logger } from '../utils/logger';
import { alertService } from './alertService';

// Circuit breaker states
type CircuitBreakerState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

// Circuit breaker configuration
interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors?: string[];
  name: string;
}

// Circuit breaker metrics
interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  timeouts: number;
  circuitBreakerOpens: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  averageResponseTime: number;
}

// Retry configuration
interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter: boolean;
  retryableErrors?: string[];
  retryableStatusCodes?: number[];
}

// Default configurations
const DEFAULT_CIRCUIT_BREAKER_CONFIG: Omit<CircuitBreakerConfig, 'name'> = {
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 10000, // 10 seconds
  expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET']
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffMultiplier: 2,
  jitter: true,
  retryableErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET', 'EPIPE'],
  retryableStatusCodes: [408, 429, 500, 502, 503, 504]
};

class CircuitBreaker {
  private state: CircuitBreakerState = 'CLOSED';
  private failures: number = 0;
  private lastFailureTime: number = 0;
  private lastSuccessTime: number = 0;
  private metrics: CircuitBreakerMetrics;
  private config: CircuitBreakerConfig;

  constructor(config: CircuitBreakerConfig) {
    this.config = { ...DEFAULT_CIRCUIT_BREAKER_CONFIG, ...config };
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitBreakerOpens: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      averageResponseTime: 0
    };
  }

  async execute<T>(
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const startTime = Date.now();
    
    // Check if circuit breaker should transition from OPEN to HALF_OPEN
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
        this.state = 'HALF_OPEN';
        logger.info(`Circuit breaker ${this.config.name} transitioning to HALF_OPEN`);
      } else {
        // Circuit is open, use fallback or throw error
        this.metrics.totalRequests++;
        if (fallback) {
          logger.warn(`Circuit breaker ${this.config.name} is OPEN, using fallback`);
          return fallback();
        }
        throw new Error(`Circuit breaker ${this.config.name} is OPEN`);
      }
    }

    this.metrics.totalRequests++;

    try {
      const result = await operation();
      this.onSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.onFailure(error, Date.now() - startTime);
      
      // If we have a fallback, use it for any failure
      if (fallback) {
        logger.warn(`Circuit breaker ${this.config.name} operation failed, using fallback`, {
          error: error instanceof Error ? error.message : 'Unknown error',
          state: this.state
        });
        return fallback();
      }
      
      throw error;
    }
  }

  private onSuccess(responseTime: number): void {
    this.failures = 0;
    this.lastSuccessTime = Date.now();
    this.metrics.successfulRequests++;
    
    // Update average response time
    this.updateAverageResponseTime(responseTime);
    
    if (this.state === 'HALF_OPEN') {
      this.state = 'CLOSED';
      logger.info(`Circuit breaker ${this.config.name} recovered, state: CLOSED`);
    }
  }

  private onFailure(error: any, responseTime: number): void {
    this.failures++;
    this.lastFailureTime = Date.now();
    this.metrics.failedRequests++;
    
    // Update average response time
    this.updateAverageResponseTime(responseTime);
    
    // Check if error is a timeout
    if (error.code === 'ETIMEDOUT' || error.message?.includes('timeout')) {
      this.metrics.timeouts++;
    }
    
    // Log the failure
    logger.warn(`Circuit breaker ${this.config.name} recorded failure`, {
      error: error instanceof Error ? error.message : 'Unknown error',
      failures: this.failures,
      threshold: this.config.failureThreshold,
      state: this.state
    });
    
    // Check if we should open the circuit
    if (this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      this.metrics.circuitBreakerOpens++;
      
      logger.error(`Circuit breaker ${this.config.name} OPENED`, {
        failures: this.failures,
        threshold: this.config.failureThreshold,
        lastFailureTime: this.lastFailureTime
      });
      
      // Send alert
      alertService.createAlert(
        'circuit_breaker_open',
        `Circuit Breaker Opened: ${this.config.name}`,
        `Circuit breaker for ${this.config.name} has opened after ${this.failures} failures`,
        this.config.name,
        {
          failures: this.failures,
          threshold: this.config.failureThreshold,
          state: this.state,
          metrics: this.metrics
        },
        'high'
      );
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.totalRequests;
    this.metrics.averageResponseTime = 
      ((this.metrics.averageResponseTime * (totalRequests - 1)) + responseTime) / totalRequests;
  }

  // Get current state and metrics
  getState(): CircuitBreakerState {
    return this.state;
  }

  getMetrics(): CircuitBreakerMetrics & { state: CircuitBreakerState; config: CircuitBreakerConfig } {
    return {
      ...this.metrics,
      state: this.state,
      config: this.config
    };
  }

  // Force state change (for testing or manual intervention)
  forceState(state: CircuitBreakerState): void {
    const oldState = this.state;
    this.state = state;
    
    logger.warn(`Circuit breaker ${this.config.name} state forced from ${oldState} to ${state}`);
  }

  // Reset circuit breaker
  reset(): void {
    this.state = 'CLOSED';
    this.failures = 0;
    this.lastFailureTime = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      timeouts: 0,
      circuitBreakerOpens: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      averageResponseTime: 0
    };
    
    logger.info(`Circuit breaker ${this.config.name} reset`);
  }
}

class RetryService {
  private config: RetryConfig;

  constructor(config: Partial<RetryConfig> = {}) {
    this.config = { ...DEFAULT_RETRY_CONFIG, ...config };
  }

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    customConfig?: Partial<RetryConfig>
  ): Promise<T> {
    const config = { ...this.config, ...customConfig };
    let lastError: any;
    let attempt = 0;

    while (attempt <= config.maxRetries) {
      try {
        const startTime = Date.now();
        const result = await operation();
        
        if (attempt > 0) {
          logger.info(`Operation ${operationName} succeeded after ${attempt} retries`, {
            operation: operationName,
            attempts: attempt + 1,
            totalTime: Date.now() - startTime
          });
        }
        
        return result;
      } catch (error) {
        lastError = error;
        attempt++;
        
        // Check if error is retryable
        if (!this.isRetryableError(error, config)) {
          logger.warn(`Non-retryable error for operation ${operationName}`, {
            operation: operationName,
            attempt,
            error: error instanceof Error ? error.message : 'Unknown error',
            errorCode: error.code,
            statusCode: error.statusCode
          });
          throw error;
        }
        
        // Don't retry on last attempt
        if (attempt > config.maxRetries) {
          break;
        }
        
        // Calculate delay with exponential backoff
        const delay = this.calculateDelay(attempt - 1, config);
        
        logger.warn(`Operation ${operationName} failed, retrying in ${delay}ms`, {
          operation: operationName,
          attempt,
          maxRetries: config.maxRetries,
          delay,
          error: error instanceof Error ? error.message : 'Unknown error',
          errorCode: error.code,
          statusCode: error.statusCode
        });
        
        await this.sleep(delay);
      }
    }

    // All retries exhausted
    logger.error(`Operation ${operationName} failed after ${config.maxRetries + 1} attempts`, {
      operation: operationName,
      totalAttempts: config.maxRetries + 1,
      finalError: lastError instanceof Error ? lastError.message : 'Unknown error'
    });

    throw lastError;
  }

  private isRetryableError(error: any, config: RetryConfig): boolean {
    // Check error codes
    if (config.retryableErrors && error.code) {
      if (config.retryableErrors.includes(error.code)) {
        return true;
      }
    }

    // Check HTTP status codes
    if (config.retryableStatusCodes && error.statusCode) {
      if (config.retryableStatusCodes.includes(error.statusCode)) {
        return true;
      }
    }

    // Check error messages for common retryable patterns
    if (error.message) {
      const retryablePatterns = [
        'timeout',
        'connection refused',
        'network error',
        'temporary failure',
        'service unavailable'
      ];
      
      const message = error.message.toLowerCase();
      return retryablePatterns.some(pattern => message.includes(pattern));
    }

    return false;
  }

  private calculateDelay(attempt: number, config: RetryConfig): number {
    // Exponential backoff: baseDelay * (backoffMultiplier ^ attempt)
    let delay = config.baseDelay * Math.pow(config.backoffMultiplier, attempt);
    
    // Cap at maxDelay
    delay = Math.min(delay, config.maxDelay);
    
    // Add jitter to prevent thundering herd
    if (config.jitter) {
      delay = delay * (0.5 + Math.random() * 0.5);
    }
    
    return Math.floor(delay);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

class CircuitBreakerService {
  private circuitBreakers: Map<string, CircuitBreaker> = new Map();
  private retryService: RetryService;

  constructor() {
    this.retryService = new RetryService();
    this.initializeDefaultCircuitBreakers();
  }

  private initializeDefaultCircuitBreakers(): void {
    // Database circuit breaker
    this.createCircuitBreaker('database', {
      failureThreshold: 5,
      recoveryTimeout: 30000, // 30 seconds
      monitoringPeriod: 10000,
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']
    });

    // External API circuit breaker
    this.createCircuitBreaker('external-api', {
      failureThreshold: 3,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 15000,
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT', 'ECONNRESET']
    });

    // Cache circuit breaker
    this.createCircuitBreaker('cache', {
      failureThreshold: 10,
      recoveryTimeout: 15000, // 15 seconds
      monitoringPeriod: 5000,
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']
    });

    // Authentication service circuit breaker
    this.createCircuitBreaker('auth-service', {
      failureThreshold: 3,
      recoveryTimeout: 45000, // 45 seconds
      monitoringPeriod: 10000,
      expectedErrors: ['ECONNREFUSED', 'ENOTFOUND', 'ETIMEDOUT']
    });
  }

  createCircuitBreaker(name: string, config: Partial<CircuitBreakerConfig>): CircuitBreaker {
    const circuitBreaker = new CircuitBreaker({
      ...DEFAULT_CIRCUIT_BREAKER_CONFIG,
      ...config,
      name
    });
    
    this.circuitBreakers.set(name, circuitBreaker);
    
    logger.info(`Circuit breaker created: ${name}`, {
      name,
      config: circuitBreaker.getMetrics().config
    });
    
    return circuitBreaker;
  }

  getCircuitBreaker(name: string): CircuitBreaker | undefined {
    return this.circuitBreakers.get(name);
  }

  // Execute operation with circuit breaker protection
  async executeWithCircuitBreaker<T>(
    name: string,
    operation: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(name);
    
    if (!circuitBreaker) {
      logger.warn(`Circuit breaker ${name} not found, executing without protection`);
      return operation();
    }
    
    return circuitBreaker.execute(operation, fallback);
  }

  // Execute operation with retry logic
  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    config?: Partial<RetryConfig>
  ): Promise<T> {
    return this.retryService.executeWithRetry(operation, operationName, config);
  }

  // Execute operation with both circuit breaker and retry
  async executeWithProtection<T>(
    circuitBreakerName: string,
    operation: () => Promise<T>,
    operationName: string,
    options?: {
      fallback?: () => Promise<T>;
      retryConfig?: Partial<RetryConfig>;
    }
  ): Promise<T> {
    const circuitBreaker = this.circuitBreakers.get(circuitBreakerName);
    
    if (!circuitBreaker) {
      logger.warn(`Circuit breaker ${circuitBreakerName} not found, using retry only`);
      return this.executeWithRetry(operation, operationName, options?.retryConfig);
    }

    // Wrap operation with retry logic
    const operationWithRetry = () => 
      this.executeWithRetry(operation, operationName, options?.retryConfig);

    return circuitBreaker.execute(operationWithRetry, options?.fallback);
  }

  // Get all circuit breaker states
  getAllStates(): Record<string, any> {
    const states: Record<string, any> = {};
    
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      states[name] = circuitBreaker.getMetrics();
    }
    
    return states;
  }

  // Get health status of all circuit breakers
  getHealthStatus(): {
    healthy: boolean;
    openCircuits: string[];
    degradedCircuits: string[];
    totalCircuits: number;
  } {
    const openCircuits: string[] = [];
    const degradedCircuits: string[] = [];
    
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      const state = circuitBreaker.getState();
      const metrics = circuitBreaker.getMetrics();
      
      if (state === 'OPEN') {
        openCircuits.push(name);
      } else if (state === 'HALF_OPEN' || metrics.failedRequests > 0) {
        degradedCircuits.push(name);
      }
    }
    
    return {
      healthy: openCircuits.length === 0,
      openCircuits,
      degradedCircuits,
      totalCircuits: this.circuitBreakers.size
    };
  }

  // Reset all circuit breakers
  resetAll(): void {
    for (const [name, circuitBreaker] of this.circuitBreakers.entries()) {
      circuitBreaker.reset();
    }
    
    logger.info('All circuit breakers reset');
  }

  // Reset specific circuit breaker
  reset(name: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(name);
    
    if (!circuitBreaker) {
      return false;
    }
    
    circuitBreaker.reset();
    return true;
  }
}

// Export singleton instance
export const circuitBreakerService = new CircuitBreakerService();

// Export classes and types for direct use
export { CircuitBreaker, RetryService };
export type { 
  CircuitBreakerState, 
  CircuitBreakerConfig, 
  CircuitBreakerMetrics, 
  RetryConfig 
};
