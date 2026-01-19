/**
 * Payment Timeout Utilities
 *
 * Provides timeout management for async payment operations
 * to prevent indefinite hanging during checkout
 */

import { safeLogger } from '../utils/safeLogger';

export class TimeoutError extends Error {
  constructor(operation: string, timeout: number) {
    super(`Operation '${operation}' timed out after ${timeout}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Wraps a promise with a timeout
 *
 * @param promise - The promise to wrap
 * @param timeoutMs - Timeout in milliseconds
 * @param operation - Name of the operation for error messages
 * @returns Promise that rejects if timeout is reached
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operation: string = 'Operation'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => {
      setTimeout(() => {
        reject(new TimeoutError(operation, timeoutMs));
      }, timeoutMs);
    })
  ]);
}

/**
 * Wraps multiple promises with individual timeouts and returns results
 * even if some operations fail
 *
 * @param operations - Array of promise factories with metadata
 * @param defaultTimeout - Default timeout for operations without specific timeout
 * @returns Promise with results array (null for failed operations)
 */
export async function withTimeoutAll<T>(
  operations: Array<{
    name: string;
    operation: () => Promise<T>;
    timeout?: number;
    required?: boolean;
  }>,
  defaultTimeout: number = 5000
): Promise<Array<T | null>> {
  const results = await Promise.allSettled(
    operations.map(({ name, operation, timeout }) =>
      withTimeout(operation(), timeout || defaultTimeout, name)
    )
  );

  return results.map((result, index) => {
    if (result.status === 'fulfilled') {
      return result.value;
    } else {
      const op = operations[index];
      safeLogger.warn(`Operation '${op.name}' failed:`, result.reason);

      if (op.required) {
        throw result.reason;
      }

      return null;
    }
  });
}

/**
 * Executes operations with fallback and timeout
 *
 * @param primary - Primary operation to try
 * @param fallback - Fallback operation if primary fails/times out
 * @param timeoutMs - Timeout for primary operation
 * @param operationName - Name for logging
 * @returns Result from primary or fallback
 */
export async function withFallback<T>(
  primary: () => Promise<T>,
  fallback: () => Promise<T> | T,
  timeoutMs: number = 5000,
  operationName: string = 'Operation'
): Promise<T> {
  try {
    return await withTimeout(primary(), timeoutMs, operationName);
  } catch (error) {
    safeLogger.warn(`${operationName} failed, using fallback:`, error);
    return await Promise.resolve(fallback());
  }
}

/**
 * Retry operation with timeout and exponential backoff
 *
 * @param operation - Operation to retry
 * @param options - Retry configuration
 * @returns Result of successful operation
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: {
    maxRetries?: number;
    initialDelay?: number;
    maxDelay?: number;
    timeout?: number;
    operationName?: string;
    shouldRetry?: (error: any) => boolean;
  } = {}
): Promise<T> {
  const {
    maxRetries = 3,
    initialDelay = 1000,
    maxDelay = 10000,
    timeout = 5000,
    operationName = 'Operation',
    shouldRetry = () => true
  } = options;

  let lastError: any;
  let delay = initialDelay;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await withTimeout(operation(), timeout, operationName);
    } catch (error) {
      lastError = error;

      if (attempt === maxRetries || !shouldRetry(error)) {
        throw error;
      }

      safeLogger.warn(
        `${operationName} failed (attempt ${attempt + 1}/${maxRetries + 1}), retrying in ${delay}ms...`,
        error
      );

      await new Promise(resolve => setTimeout(resolve, delay));
      delay = Math.min(delay * 2, maxDelay);
    }
  }

  throw lastError;
}

/**
 * Circuit breaker pattern for payment operations
 */
export class CircuitBreaker {
  private failureCount = 0;
  private lastFailureTime: number | null = null;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private readonly threshold: number = 5,
    private readonly timeout: number = 60000, // 1 minute
    private readonly operationName: string = 'Operation'
  ) {}

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - (this.lastFailureTime || 0) > this.timeout) {
        this.state = 'half-open';
        safeLogger.info(`Circuit breaker for ${this.operationName} entering half-open state`);
      } else {
        throw new Error(`Circuit breaker open for ${this.operationName}`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = 'closed';
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.threshold) {
      this.state = 'open';
      safeLogger.error(
        `Circuit breaker opened for ${this.operationName} after ${this.failureCount} failures`
      );
    }
  }

  getState(): 'closed' | 'open' | 'half-open' {
    return this.state;
  }

  reset(): void {
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.state = 'closed';
  }
}

/**
 * Debounce async operations
 */
export class AsyncDebouncer {
  private timeoutId: NodeJS.Timeout | null = null;
  private pendingPromise: Promise<any> | null = null;

  constructor(private readonly delay: number = 300) {}

  async debounce<T>(operation: () => Promise<T>): Promise<T> {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    return new Promise((resolve, reject) => {
      this.timeoutId = setTimeout(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      }, this.delay);
    });
  }

  cancel(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
  }
}

/**
 * Abort controller with timeout for fetch requests
 */
export function createAbortController(timeoutMs: number): {
  controller: AbortController;
  cleanup: () => void;
} {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  return {
    controller,
    cleanup: () => clearTimeout(timeoutId)
  };
}
