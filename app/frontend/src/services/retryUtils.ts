/**
 * Retry Utility Functions
 * Implements exponential backoff retry logic for API calls
 */

/**
 * Retry options for API calls
 */
export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  exponentialBase?: number;
  shouldRetry?: (error: any) => boolean;
}

/**
 * Default retry options
 */
const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBase: 2,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, and 429 (rate limited)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429;
    }
    
    return false;
  }
};

/**
 * Wait for a specified number of milliseconds
 */
function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute a function with exponential backoff retry logic
 * @param fn - Function to execute
 * @param options - Retry options
 * @returns Promise that resolves with the result of fn or rejects with the last error
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: any;
  
  for (let attempt = 0; attempt <= (opts.maxRetries || 0); attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // If this is the last attempt or shouldn't retry, rethrow the error
      if (attempt === opts.maxRetries || !(opts.shouldRetry?.(error) ?? true)) {
        throw error;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        opts.initialDelay! * Math.pow(opts.exponentialBase!, attempt),
        opts.maxDelay!
      );
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.1 * delay;
      const totalDelay = delay + jitter;
      
      console.warn(`Attempt ${attempt + 1} failed, retrying in ${Math.round(totalDelay)}ms:`, error);
      
      // Wait before retrying
      await wait(totalDelay);
    }
  }
  
  throw lastError;
}

/**
 * Enhanced fetch with retry logic
 * @param url - URL to fetch
 * @param options - Fetch options
 * @param retryOptions - Retry options
 * @returns Promise that resolves with the fetch response
 */
export async function fetchWithRetry(
  url: string,
  options?: RequestInit,
  retryOptions?: RetryOptions
): Promise<Response> {
  return retryWithBackoff(
    async () => {
      const response = await fetch(url, options);
      
      // Throw error for non-success status codes that should trigger retries
      if (!response.ok) {
        const error: any = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        error.status = response.status;
        throw error;
      }
      
      return response;
    },
    retryOptions
  );
}