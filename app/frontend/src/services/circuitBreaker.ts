/**
 * Circuit Breaker Pattern Implementation
 * Prevents cascading failures by temporarily blocking requests to failing services
 */

type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

interface CircuitBreakerConfig {
  failureThreshold: number;
  recoveryTimeout: number;
  monitoringPeriod: number;
}

class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: CircuitState = 'CLOSED';
  private successCount = 0;
  
  constructor(
    private config: CircuitBreakerConfig = {
      failureThreshold: 5,
      recoveryTimeout: 60000, // 1 minute
      monitoringPeriod: 10000 // 10 seconds
    }
  ) {}
  
  async execute<T>(operation: () => Promise<T>, fallback?: () => T): Promise<T> {
    // Store the initial state to check later if it changed
    const initialState = this.state;
    
    // Check if circuit is open and not yet ready for retry
    if (initialState === 'OPEN' && Date.now() - this.lastFailureTime <= this.config.recoveryTimeout) {
      if (fallback) {
        console.log('Circuit breaker is OPEN, using fallback');
        return fallback();
      }
      throw new Error('Service temporarily unavailable - circuit breaker is OPEN');
    }
    
    // If circuit is open but timeout has passed, move to HALF_OPEN
    if (initialState === 'OPEN') {
      this.state = 'HALF_OPEN';
      this.successCount = 0;
      console.log('Circuit breaker moving to HALF_OPEN state');
    }
    
    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure(error);
      
      // Check if circuit has just opened due to this failure
      if (fallback && this.state === 'OPEN' && initialState !== 'OPEN') {
        console.log('Operation failed and circuit is OPEN, using fallback');
        return fallback();
      }
      
      // If the circuit was already open and we're using fallback, use it
      if (fallback && initialState === 'OPEN') {
        console.log('Operation failed and circuit was OPEN, using fallback');
        return fallback();
      }
      
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    
    if (this.state === 'HALF_OPEN') {
      this.successCount++;
      // Require multiple successes to fully close the circuit
      if (this.successCount >= 3) {
        this.state = 'CLOSED';
        console.log('Circuit breaker closed after successful recovery');
      }
    } else {
      this.state = 'CLOSED';
    }
  }
  
  private onFailure(error: any) {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    // Only count certain types of failures
    const isServiceFailure = 
      error?.status >= 500 || 
      error?.isServiceUnavailable ||
      error?.message?.includes('fetch') ||
      error?.message?.includes('timeout');
    
    if (isServiceFailure && this.failures >= this.config.failureThreshold) {
      this.state = 'OPEN';
      console.warn(`Circuit breaker opened due to ${this.failures} failures`);
    }
  }
  
  getState(): CircuitState {
    return this.state;
  }
  
  getFailureCount(): number {
    return this.failures;
  }
  
  reset() {
    this.failures = 0;
    this.state = 'CLOSED';
    this.successCount = 0;
    console.log('Circuit breaker manually reset');
  }
}

// Create circuit breakers for different services
export const apiCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3, // Lower threshold for API calls
  recoveryTimeout: 30000, // 30 seconds
  monitoringPeriod: 5000 // 5 seconds
});

export const communityCircuitBreaker = new CircuitBreaker({
  failureThreshold: 5,
  recoveryTimeout: 60000, // 1 minute
  monitoringPeriod: 10000
});

export const feedCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds for feed (more critical)
  monitoringPeriod: 5000
});

export { CircuitBreaker };