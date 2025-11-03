/**
 * Rate Limit Handler Utility
 *
 * Provides robust handling for rate-limited APIs with:
 * - Exponential backoff
 * - Circuit breaker pattern
 * - Fallback values
 * - Request deduplication
 */

interface RetryConfig {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  fallbackValue?: any;
}

interface CircuitBreakerState {
  failures: number;
  lastFailureTime: number;
  isOpen: boolean;
}

class RateLimitHandler {
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private pendingRequests: Map<string, Promise<any>> = new Map();
  private readonly CIRCUIT_BREAKER_THRESHOLD = 5;
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  /**
   * Execute a request with automatic retry on rate limit
   */
  async executeWithRetry<T>(
    fn: () => Promise<T>,
    key: string,
    config: RetryConfig = {}
  ): Promise<T> {
    const {
      maxRetries = 3,
      initialDelay = 1000,
      maxDelay = 30000,
      backoffMultiplier = 2,
      fallbackValue = null
    } = config;

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(key)) {
      console.warn(`Circuit breaker open for ${key}, returning fallback`);
      return fallbackValue;
    }

    // Deduplicate concurrent requests
    const pending = this.pendingRequests.get(key);
    if (pending) {
      console.log(`Returning pending request for ${key}`);
      return pending;
    }

    const requestPromise = this._executeWithRetryInternal(
      fn,
      key,
      maxRetries,
      initialDelay,
      maxDelay,
      backoffMultiplier,
      fallbackValue
    );

    this.pendingRequests.set(key, requestPromise);

    try {
      const result = await requestPromise;
      this.recordSuccess(key);
      return result;
    } finally {
      this.pendingRequests.delete(key);
    }
  }

  private async _executeWithRetryInternal<T>(
    fn: () => Promise<T>,
    key: string,
    maxRetries: number,
    initialDelay: number,
    maxDelay: number,
    backoffMultiplier: number,
    fallbackValue: any
  ): Promise<T> {
    let lastError: Error | null = null;
    let delay = initialDelay;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const result = await fn();
        return result;
      } catch (error: any) {
        lastError = error;
        const status = error.status || error.response?.status;

        // Handle rate limiting (429)
        if (status === 429) {
          this.recordFailure(key);

          if (attempt < maxRetries) {
            const retryAfter = this.getRetryAfter(error);
            const waitTime = retryAfter || Math.min(delay, maxDelay);

            console.log(
              `Rate limited on ${key}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`
            );

            await this.sleep(waitTime);
            delay *= backoffMultiplier;
            continue;
          }
        }

        // Handle service unavailable (503)
        if (status === 503) {
          this.recordFailure(key);

          if (attempt < maxRetries) {
            const waitTime = Math.min(delay, maxDelay);
            console.log(
              `Service unavailable for ${key}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`
            );

            await this.sleep(waitTime);
            delay *= backoffMultiplier;
            continue;
          }
        }

        // Non-retryable error, throw immediately
        if (status && status < 500 && status !== 429) {
          throw error;
        }

        // For other 5xx errors, retry
        if (attempt < maxRetries) {
          const waitTime = Math.min(delay, maxDelay);
          console.log(
            `Request failed for ${key}, retrying in ${waitTime}ms (attempt ${attempt + 1}/${maxRetries})`
          );

          await this.sleep(waitTime);
          delay *= backoffMultiplier;
        }
      }
    }

    // All retries exhausted
    console.error(`All retries exhausted for ${key}, using fallback`);
    this.recordFailure(key);

    if (fallbackValue !== null && fallbackValue !== undefined) {
      return fallbackValue;
    }

    throw lastError || new Error(`Request failed after ${maxRetries} retries`);
  }

  /**
   * Extract Retry-After header from error response
   */
  private getRetryAfter(error: any): number | null {
    const retryAfter =
      error.response?.headers?.['retry-after'] ||
      error.headers?.['retry-after'];

    if (!retryAfter) return null;

    // If it's a number, it's seconds
    const seconds = parseInt(retryAfter, 10);
    if (!isNaN(seconds)) {
      return seconds * 1000;
    }

    // If it's a date, calculate the difference
    const retryDate = new Date(retryAfter);
    if (!isNaN(retryDate.getTime())) {
      return Math.max(0, retryDate.getTime() - Date.now());
    }

    return null;
  }

  /**
   * Circuit breaker: check if too many failures have occurred
   */
  private isCircuitBreakerOpen(key: string): boolean {
    const state = this.circuitBreakers.get(key);
    if (!state) return false;

    // Reset circuit breaker after timeout
    if (Date.now() - state.lastFailureTime > this.CIRCUIT_BREAKER_TIMEOUT) {
      this.circuitBreakers.delete(key);
      return false;
    }

    return state.isOpen && state.failures >= this.CIRCUIT_BREAKER_THRESHOLD;
  }

  /**
   * Record a successful request
   */
  private recordSuccess(key: string): void {
    // Reset circuit breaker on success
    this.circuitBreakers.delete(key);
  }

  /**
   * Record a failed request
   */
  private recordFailure(key: string): void {
    const state = this.circuitBreakers.get(key) || {
      failures: 0,
      lastFailureTime: Date.now(),
      isOpen: false
    };

    state.failures += 1;
    state.lastFailureTime = Date.now();

    if (state.failures >= this.CIRCUIT_BREAKER_THRESHOLD) {
      state.isOpen = true;
      console.warn(
        `Circuit breaker opened for ${key} after ${state.failures} failures`
      );
    }

    this.circuitBreakers.set(key, state);
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Create a rate-limited fetch wrapper
   */
  createFetcher<T>(key: string, config?: RetryConfig) {
    return async (url: string, options?: RequestInit): Promise<T> => {
      return this.executeWithRetry(
        async () => {
          const response = await fetch(url, options);

          if (!response.ok) {
            const error: any = new Error(
              `HTTP ${response.status}: ${response.statusText}`
            );
            error.status = response.status;
            error.response = response;
            throw error;
          }

          return response.json();
        },
        `${key}:${url}`,
        config
      );
    };
  }

  /**
   * Get circuit breaker status for monitoring
   */
  getCircuitBreakerStatus(): Record<string, CircuitBreakerState> {
    const status: Record<string, CircuitBreakerState> = {};
    this.circuitBreakers.forEach((state, key) => {
      status[key] = { ...state };
    });
    return status;
  }

  /**
   * Reset a specific circuit breaker
   */
  resetCircuitBreaker(key: string): void {
    this.circuitBreakers.delete(key);
  }

  /**
   * Reset all circuit breakers
   */
  resetAllCircuitBreakers(): void {
    this.circuitBreakers.clear();
  }
}

// Export singleton instance
export const rateLimitHandler = new RateLimitHandler();

// Convenience functions for common use cases
export const fetchWithRetry = <T>(
  url: string,
  options?: RequestInit,
  config?: RetryConfig
): Promise<T> => {
  return rateLimitHandler.createFetcher<T>('fetch', config)(url, options);
};

export const fetchWithFallback = <T>(
  url: string,
  fallbackValue: T,
  options?: RequestInit
): Promise<T> => {
  return rateLimitHandler.createFetcher<T>('fetch', { fallbackValue })(
    url,
    options
  );
};
