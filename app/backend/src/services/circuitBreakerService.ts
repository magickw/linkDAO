import { EventEmitter } from 'events';

export enum CircuitState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half-open'
}

export interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  expectedErrors: string[];
  slowCallThreshold: number;
  slowCallDurationThreshold: number;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failureCount: number;
  successCount: number;
  totalCalls: number;
  lastFailureTime?: number;
  nextAttemptTime?: number;
  slowCallCount: number;
  averageResponseTime: number;
}

export interface CallResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  duration: number;
  timestamp: number;
}

/**
 * Circuit breaker implementation for vendor API resilience
 * Prevents cascading failures and provides graceful degradation
 */
export class CircuitBreaker<T = any> extends EventEmitter {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount = 0;
  private successCount = 0;
  private totalCalls = 0;
  private slowCallCount = 0;
  private lastFailureTime?: number;
  private nextAttemptTime?: number;
  private responseTimes: number[] = [];
  private readonly maxResponseTimeHistory = 100;

  constructor(
    private readonly name: string,
    private readonly config: CircuitBreakerConfig,
    private readonly fallbackFunction?: () => Promise<T>
  ) {
    super();
    
    // Start monitoring period reset timer
    setInterval(() => {
      this.resetMonitoringPeriod();
    }, this.config.monitoringPeriod);
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute(fn: () => Promise<T>): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      if (this.shouldAttemptReset()) {
        this.state = CircuitState.HALF_OPEN;
        this.emit('stateChange', { name: this.name, state: this.state });
      } else {
        return this.handleOpenCircuit();
      }
    }

    const startTime = Date.now();
    this.totalCalls++;

    try {
      const result = await Promise.race([
        fn(),
        this.createTimeoutPromise()
      ]);

      const duration = Date.now() - startTime;
      this.recordSuccess(duration);
      
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.recordFailure(error as Error, duration);
      throw error;
    }
  }

  /**
   * Create timeout promise for slow call detection
   */
  private createTimeoutPromise(): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Circuit breaker timeout: ${this.name}`));
      }, this.config.slowCallDurationThreshold);
    });
  }

  /**
   * Record successful call
   */
  private recordSuccess(duration: number): void {
    this.successCount++;
    this.recordResponseTime(duration);

    if (duration > this.config.slowCallDurationThreshold) {
      this.slowCallCount++;
    }

    if (this.state === CircuitState.HALF_OPEN) {
      this.state = CircuitState.CLOSED;
      this.failureCount = 0;
      this.emit('stateChange', { name: this.name, state: this.state });
      this.emit('circuitClosed', { name: this.name });
    }

    this.emit('callSuccess', {
      name: this.name,
      duration,
      totalCalls: this.totalCalls
    });
  }

  /**
   * Record failed call
   */
  private recordFailure(error: Error, duration: number): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    this.recordResponseTime(duration);

    // Check if error should be ignored
    if (this.isExpectedError(error)) {
      this.emit('expectedError', { name: this.name, error });
      return;
    }

    // Check if circuit should open
    if (this.shouldOpenCircuit()) {
      this.state = CircuitState.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      this.emit('stateChange', { name: this.name, state: this.state });
      this.emit('circuitOpened', { 
        name: this.name, 
        failureCount: this.failureCount,
        error 
      });
    }

    this.emit('callFailure', {
      name: this.name,
      error,
      duration,
      failureCount: this.failureCount
    });
  }

  /**
   * Record response time for monitoring
   */
  private recordResponseTime(duration: number): void {
    this.responseTimes.push(duration);
    
    // Keep only recent response times
    if (this.responseTimes.length > this.maxResponseTimeHistory) {
      this.responseTimes.shift();
    }
  }

  /**
   * Check if error should be treated as expected
   */
  private isExpectedError(error: Error): boolean {
    return this.config.expectedErrors.some(expectedError => 
      error.message.includes(expectedError) || error.name === expectedError
    );
  }

  /**
   * Check if circuit should open
   */
  private shouldOpenCircuit(): boolean {
    const failureRate = this.failureCount / Math.max(this.totalCalls, 1);
    const slowCallRate = this.slowCallCount / Math.max(this.totalCalls, 1);
    
    return (
      this.failureCount >= this.config.failureThreshold ||
      failureRate >= 0.5 || // 50% failure rate
      slowCallRate >= this.config.slowCallThreshold
    );
  }

  /**
   * Check if circuit should attempt reset
   */
  private shouldAttemptReset(): boolean {
    return this.nextAttemptTime ? Date.now() >= this.nextAttemptTime : false;
  }

  /**
   * Handle open circuit state
   */
  private async handleOpenCircuit(): Promise<T> {
    this.emit('callRejected', { name: this.name, state: this.state });
    
    if (this.fallbackFunction) {
      try {
        const result = await this.fallbackFunction();
        this.emit('fallbackSuccess', { name: this.name });
        return result;
      } catch (error) {
        this.emit('fallbackFailure', { name: this.name, error });
        throw error;
      }
    }
    
    throw new Error(`Circuit breaker is OPEN for ${this.name}`);
  }

  /**
   * Reset monitoring period statistics
   */
  private resetMonitoringPeriod(): void {
    // Only reset if circuit is closed and we have some history
    if (this.state === CircuitState.CLOSED && this.totalCalls > 0) {
      const resetRatio = 0.5; // Reset 50% of counters
      
      this.failureCount = Math.floor(this.failureCount * resetRatio);
      this.successCount = Math.floor(this.successCount * resetRatio);
      this.totalCalls = Math.floor(this.totalCalls * resetRatio);
      this.slowCallCount = Math.floor(this.slowCallCount * resetRatio);
      
      this.emit('monitoringPeriodReset', { name: this.name });
    }
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    const averageResponseTime = this.responseTimes.length > 0
      ? this.responseTimes.reduce((sum, time) => sum + time, 0) / this.responseTimes.length
      : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      totalCalls: this.totalCalls,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime,
      slowCallCount: this.slowCallCount,
      averageResponseTime
    };
  }

  /**
   * Manually open circuit (for testing or emergency)
   */
  forceOpen(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    this.emit('stateChange', { name: this.name, state: this.state });
    this.emit('circuitForceOpened', { name: this.name });
  }

  /**
   * Manually close circuit (for testing or recovery)
   */
  forceClose(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = undefined;
    this.emit('stateChange', { name: this.name, state: this.state });
    this.emit('circuitForceClosed', { name: this.name });
  }

  /**
   * Reset all statistics
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failureCount = 0;
    this.successCount = 0;
    this.totalCalls = 0;
    this.slowCallCount = 0;
    this.lastFailureTime = undefined;
    this.nextAttemptTime = undefined;
    this.responseTimes = [];
    this.emit('circuitReset', { name: this.name });
  }
}

/**
 * Circuit breaker manager for multiple services
 */
export class CircuitBreakerManager {
  private breakers: Map<string, CircuitBreaker> = new Map();
  private defaultConfig: CircuitBreakerConfig = {
    failureThreshold: 5,
    recoveryTimeout: 60000, // 1 minute
    monitoringPeriod: 300000, // 5 minutes
    expectedErrors: ['TimeoutError', 'RateLimitError'],
    slowCallThreshold: 0.3, // 30% slow calls
    slowCallDurationThreshold: 5000 // 5 seconds
  };

  /**
   * Create or get circuit breaker for service
   */
  getCircuitBreaker<T>(
    name: string,
    config?: Partial<CircuitBreakerConfig>,
    fallbackFunction?: () => Promise<T>
  ): CircuitBreaker<T> {
    if (!this.breakers.has(name)) {
      const finalConfig = { ...this.defaultConfig, ...config };
      const breaker = new CircuitBreaker<T>(name, finalConfig, fallbackFunction);
      
      // Forward events
      breaker.on('stateChange', (event) => this.emit('stateChange', event));
      breaker.on('circuitOpened', (event) => this.emit('circuitOpened', event));
      breaker.on('circuitClosed', (event) => this.emit('circuitClosed', event));
      
      this.breakers.set(name, breaker);
    }
    
    return this.breakers.get(name) as CircuitBreaker<T>;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Map<string, CircuitBreakerStats> {
    const stats = new Map<string, CircuitBreakerStats>();
    
    for (const [name, breaker] of this.breakers) {
      stats.set(name, breaker.getStats());
    }
    
    return stats;
  }

  /**
   * Get system health summary
   */
  getHealthSummary(): {
    totalCircuits: number;
    openCircuits: number;
    halfOpenCircuits: number;
    healthyCircuits: number;
    overallHealth: 'healthy' | 'degraded' | 'critical';
  } {
    const stats = this.getAllStats();
    let openCircuits = 0;
    let halfOpenCircuits = 0;
    let healthyCircuits = 0;

    for (const stat of stats.values()) {
      switch (stat.state) {
        case CircuitState.OPEN:
          openCircuits++;
          break;
        case CircuitState.HALF_OPEN:
          halfOpenCircuits++;
          break;
        case CircuitState.CLOSED:
          healthyCircuits++;
          break;
      }
    }

    const totalCircuits = stats.size;
    let overallHealth: 'healthy' | 'degraded' | 'critical' = 'healthy';
    
    if (openCircuits > totalCircuits * 0.5) {
      overallHealth = 'critical';
    } else if (openCircuits > 0 || halfOpenCircuits > totalCircuits * 0.3) {
      overallHealth = 'degraded';
    }

    return {
      totalCircuits,
      openCircuits,
      halfOpenCircuits,
      healthyCircuits,
      overallHealth
    };
  }

  private emit(event: string, data: any): void {
    // This would integrate with your event system
    console.log(`CircuitBreakerManager event: ${event}`, data);
  }
}

export const circuitBreakerManager = new CircuitBreakerManager();