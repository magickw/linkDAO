/**
 * Enhanced Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 * Enhanced with improved failure detection and graceful degradation
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
  halfOpenMaxCalls?: number;
  halfOpenSuccessThreshold?: number;
}

interface CircuitBreakerMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastFailureTime: number;
  lastSuccessTime: number;
  stateChanges: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private successCount = 0;
  private halfOpenCalls = 0;
  private metrics: CircuitBreakerMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    lastFailureTime: 0,
    lastSuccessTime: 0,
    stateChanges: 0
  };
  private listeners: Set<(state: CircuitState, metrics: CircuitBreakerMetrics) => void> = new Set();
  
  constructor(
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 60 seconds as specified
      monitoringPeriod: 10000, // 10 seconds
      halfOpenMaxCalls: 3,
      halfOpenSuccessThreshold: 2
    }
  ) {}
  
  async execute<T>(operation: () => Promise<T>, fallback?: () => T | Promise<T>): Promise<T> {
    this.metrics.totalRequests++;
    
    // Store the initial state to check later if it changed
    const initialState = this.state;
    
    // Check if circuit is open and not yet ready for retry
    if (initialState === 'OPEN' && Date.now() - this.lastFailureTime <= this.config.recoveryTimeout) {
      if (fallback) {
        console.log('Circuit breaker is OPEN, using fallback');
        const fallbackResult = await Promise.resolve(fallback());
        return fallbackResult;
      }
      throw new Error('Service temporarily unavailable - circuit breaker is OPEN');
    }
    
    // If circuit is open but timeout has passed, move to HALF_OPEN
    if (initialState === 'OPEN' && Date.now() - this.lastFailureTime > this.config.recoveryTimeout) {
      this.transitionToHalfOpen();
    }
    
    // In HALF_OPEN state, limit the number of calls
    if (this.state === 'HALF_OPEN') {
      if (this.halfOpenCalls >= (this.config.halfOpenMaxCalls || 3)) {
        if (fallback) {
          console.log('Circuit breaker HALF_OPEN call limit reached, using fallback');
          const fallbackResult = await Promise.resolve(fallback());
          return fallbackResult;
        }
        throw new Error('Service recovery in progress - please try again later');
      }
      this.halfOpenCalls++;
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      
      // Use fallback if available and circuit is open or degraded
      if (fallback && (this.state === 'OPEN' || this.shouldUseFallback(error))) {
        console.log(`Operation failed (${this.state}), using fallback:`, (error as Error).message);
        const fallbackResult = await Promise.resolve(fallback());
        return fallbackResult;
      }
      
      throw error;
    }
  }
  
  private onSuccess() {
    this.metrics.successfulRequests++;
    this.metrics.lastSuccessTime = Date.now();
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // Require multiple successes to fully close the circuit
      if (this.successCount >= (this.config.halfOpenSuccessThreshold || 2)) {
        this.transitionToClosed();
      }
    } else if (this.state === 'CLOSED') {
      // Reset failure count on successful requests
      this.failures = Math.max(0, this.failures - 1);
    }
  }
  
  private onFailure(error: any) {
    this.metrics.failedRequests++;
    this.failures++;
    this.lastFailureTime = Date.now();
    this.metrics.lastFailureTime = this.lastFailureTime;
    
    // Enhanced failure detection
    const isServiceFailure = this.isServiceFailure(error);
    
    if (this.state === 'HALF_OPEN') {
      // Any failure in HALF_OPEN state should reopen the circuit
      this.transitionToOpen();
    } else if (this.state === 'CLOSED' && isServiceFailure && this.failures >= this.config.failureThreshold) {
      this.transitionToOpen();
    }
  }
  
  private isServiceFailure(error: any): boolean {
    // Enhanced service failure detection
    return (
      error?.status >= 500 || 
      error?.status === 503 ||
      error?.status === 502 ||
      error?.status === 504 ||
      error?.isServiceUnavailable ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout') ||
      error?.message?.includes('network') ||
      error?.message?.includes('ECONNREFUSED') ||
      error?.message?.includes('ETIMEDOUT') ||
      error?.code === 'NETWORK_ERROR' ||
      error?.code === 'TIMEOUT'
    );
  }
  
  private shouldUseFallback(error: any): boolean {
    // Determine if fallback should be used based on error type
    return this.isServiceFailure(error) || this.state !== 'CLOSED';
  }
  
  private transitionToOpen(): void {
    if (this.state !== 'OPEN') {
      this.state = 'OPEN';
      this.halfOpenCalls = 0;
      this.successCount = 0;
      this.metrics.stateChanges++;
      console.warn(`Circuit breaker opened due to ${this.failures} failures`);
      this.notifyListeners();
    }
  }
  
  private transitionToHalfOpen(): void {
    if (this.state !== 'HALF_OPEN') {
      this.state = 'HALF_OPEN';
      this.halfOpenCalls = 0;
      this.successCount = 0;
      this.metrics.stateChanges++;
      console.log('Circuit breaker moving to HALF_OPEN state');
      this.notifyListeners();
    }
  }
  
  private transitionToClosed(): void {
    if (this.state !== 'CLOSED') {
      this.state = 'CLOSED';
      this.failures = 0;
      this.halfOpenCalls = 0;
      this.successCount = 0;
      this.metrics.stateChanges++;
      console.log('Circuit breaker closed after successful recovery');
      this.notifyListeners();
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getFailureCount(): number {
    return this.failures;
  }
  
  getMetrics(): CircuitBreakerMetrics {
    return { ...this.metrics };
  }
  
  isOpen(): boolean {
    return this.state === 'OPEN';
  }
  
  isClosed(): boolean {
    return this.state === 'CLOSED';
  }
  
  isHalfOpen(): boolean {
    return this.state === 'HALF_OPEN';
  }
  
  subscribe(listener: (state: CircuitState, metrics: CircuitBreakerMetrics) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notifyListeners(): void {
    this.listeners.forEach(listener => {
      try {
        listener(this.state, this.getMetrics());
      } catch (error) {
        console.error('Error in circuit breaker listener:', error);
      }
    });
  }
  
  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.successCount = 0;
    this.halfOpenCalls = 0;
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastFailureTime: 0,
      lastSuccessTime: 0,
      stateChanges: 0
    };
    console.log('Circuit breaker manually reset');
    this.notifyListeners();
  }
}

// Create enhanced circuit breakers for different services with specified requirements
export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5, // As specified in requirements
  recoveryTimeout: 60000, // 60 seconds as specified
  monitoringPeriod: 10000, // 10 seconds
  halfOpenMaxCalls: 3,
  halfOpenSuccessThreshold: 2
});

export const communityCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000, // 60 seconds
  monitoringPeriod: 10000,
  halfOpenMaxCalls: 3,
  halfOpenSuccessThreshold: 2
});

export const feedCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000, // 60 seconds
  monitoringPeriod: 10000,
  halfOpenMaxCalls: 3,
  halfOpenSuccessThreshold: 2
});

export const marketplaceCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000, // 60 seconds
  monitoringPeriod: 10000,
  halfOpenMaxCalls: 3,
  halfOpenSuccessThreshold: 2
});

export { CircuitBreaker };