/**
 * Request Manager Service
 * Handles API request deduplication, rate limiting, and error handling
 */

interface PendingRequest {
  promise: Promise<any>;
  timestamp: number;
}

interface RequestConfig {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  deduplicate?: boolean;
}

class RequestManager {
  private pendingRequests = new Map<string, PendingRequest>();
  private requestCounts = new Map<string, { count: number; windowStart: number }>();
  private readonly RATE_LIMIT_WINDOW = 60000; // 1 minute
  private readonly MAX_REQUESTS_PER_MINUTE = 30; // Increased from 20 to 30
  private readonly DEFAULT_TIMEOUT = 15000; // Increased from 10s to 15s
  private readonly DEFAULT_RETRIES = 1; // Reduced from 2 to 1
  private readonly DEFAULT_RETRY_DELAY = 2000; // Increased from 1s to 2s

  /**
   * Make a managed API request with deduplication and rate limiting
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      timeout = this.DEFAULT_TIMEOUT,
      retries = this.DEFAULT_RETRIES,
      retryDelay = this.DEFAULT_RETRY_DELAY,
      deduplicate = true
    } = config;

    const requestKey = this.getRequestKey(url, options);

    // Check rate limit
    if (!this.checkRateLimit(url)) {
      throw new Error('Rate limit exceeded. Please try again later.');
    }

    // Return existing request if deduplication is enabled
    if (deduplicate && this.pendingRequests.has(requestKey)) {
      const pending = this.pendingRequests.get(requestKey)!;
      
      // Check if request is still fresh (within 30 seconds)
      if (Date.now() - pending.timestamp < 30000) {
        console.log('Returning deduplicated request:', requestKey);
        return pending.promise;
      } else {
        // Remove stale request
        this.pendingRequests.delete(requestKey);
      }
    }

    // Create new request with retry logic
    const requestPromise = this.executeWithRetry<T>(url, options, retries, retryDelay, timeout);

    // Store pending request for deduplication
    if (deduplicate) {
      this.pendingRequests.set(requestKey, {
        promise: requestPromise,
        timestamp: Date.now()
      });

      // Clean up after completion
      requestPromise.finally(() => {
        this.pendingRequests.delete(requestKey);
      });
    }

    try {
      return await requestPromise;
    } catch (error: unknown) {
      // Ensure 503 errors have the proper properties for service handling
      if (error instanceof Error) {
        const errorWithStatus = error as any;
        if (errorWithStatus.status === 503 || error.message.includes('HTTP 503') || error.message.includes('Service temporarily unavailable')) {
          errorWithStatus.isServiceUnavailable = true;
          errorWithStatus.status = 503;
          console.log('Request manager caught 503 error, properly formatted for service layer:', error.message);
        }
      }
      throw error;
    }
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number,
    retryDelay: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeRequest<T>(url, options, timeout);
      } catch (error) {
        lastError = error as Error;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (error instanceof Response && error.status >= 400 && error.status < 500 && error.status !== 429) {
          throw error;
        }

        // Specific handling for 503 Service Unavailable
        if ((error as any).isServiceUnavailable || (error as any).status === 503) {
          const serviceUnavailableDelay = 5000 * Math.pow(2, attempt); // Longer delay for 503
          console.log(`Backend service unavailable. Retrying in ${serviceUnavailableDelay}ms (attempt ${attempt + 1}/${retries + 1}):`, url);
          await this.sleep(serviceUnavailableDelay);
          continue; // Continue to the next retry attempt
        }
        
        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1}):`, url);
        await this.sleep(delay);
      }
    }

    // Handle service unavailable errors more gracefully
    if (lastError && ((lastError as any)?.isServiceUnavailable || (lastError as any)?.status === 503)) {
      console.warn('Service unavailable after all retries, throwing service unavailable error');
      const serviceError = new Error('Our servers are temporarily unavailable. Please try again in a few minutes.');
      (serviceError as any).isServiceUnavailable = true;
      (serviceError as any).status = 503;
      throw serviceError;
    }

    if (lastError) {
      // Provide user-friendly error messages
      let errorMessage = lastError instanceof Error ? lastError.message : 'Request failed with unknown error';
      
      if (errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
        errorMessage = 'Unable to connect to our servers. Please check your internet connection and try again.';
      } else if (errorMessage.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      }
      
      const error = new Error(errorMessage);
      // Preserve original error properties
      Object.assign(error, lastError);
      throw error;
    }

    // This should never happen, but TypeScript requires it
    throw new Error('Request failed with unknown error');
  }

  /**
   * Execute a single request with timeout
   */
  private async executeRequest<T>(url: string, options: RequestInit, timeout: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        // Provide user-friendly error messages
        if (response.status === 503) {
          errorMessage = 'Our servers are temporarily unavailable. Please try again in a few minutes.';
        } else if (response.status === 429) {
          errorMessage = 'Too many requests. Please wait before trying again.';
        } else if (response.status >= 500) {
          errorMessage = 'Our servers are experiencing issues. Please try again later.';
        }
        
        const error = new Error(errorMessage);
        (error as any).status = response.status;
        (error as any).response = response;
        if (response.status === 503) {
          (error as any).isServiceUnavailable = true;
        }
        throw error;
      }

      // Handle different content types
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        return await response.json();
      } else if (contentType?.includes('text/')) {
        return await response.text() as unknown as T;
      } else {
        return response as unknown as T;
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout. Please try again.');
      }
      
      throw error;
    }
  }

  /**
   * Check if request is within rate limit
   */
  private checkRateLimit(url: string): boolean {
    const endpoint = new URL(url).pathname;
    const now = Date.now();
    
    let requestInfo = this.requestCounts.get(endpoint);
    
    if (!requestInfo) {
      requestInfo = { count: 0, windowStart: now };
      this.requestCounts.set(endpoint, requestInfo);
    }
    
    // Reset window if expired
    if (now - requestInfo.windowStart > this.RATE_LIMIT_WINDOW) {
      requestInfo.count = 0;
      requestInfo.windowStart = now;
    }
    
    // Check if under limit
    if (requestInfo.count >= this.MAX_REQUESTS_PER_MINUTE) {
      return false;
    }
    
    requestInfo.count += 1;
    return true;
  }

  /**
   * Generate a unique key for request deduplication
   */
  private getRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    
    // Special handling for seller profile requests to increase deduplication
    if (url.includes('/api/marketplace/seller/') || url.includes('/marketplace/seller/profile/')) {
      // Extract wallet address from URL for seller profile requests
      const walletAddressMatch = url.match(/(0x[a-fA-F0-9]{40})/);
      if (walletAddressMatch) {
        return `${method}:seller-profile:${walletAddressMatch[1]}`;
      }
    }
    
    return `${method}:${url}:${body}`;
  }

  /**
   * Sleep utility for retry delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Clear all pending requests (useful for cleanup)
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get current rate limit status for debugging
   */
  getRateLimitStatus(): Record<string, { count: number; remaining: number; resetTime: number }> {
    const now = Date.now();
    const status: Record<string, { count: number; remaining: number; resetTime: number }> = {};
    
    for (const [endpoint, info] of this.requestCounts.entries()) {
      const windowEnd = info.windowStart + this.RATE_LIMIT_WINDOW;
      status[endpoint] = {
        count: info.count,
        remaining: Math.max(0, this.MAX_REQUESTS_PER_MINUTE - info.count),
        resetTime: windowEnd
      };
    }
    
    return status;
  }
}

// Export singleton instance
export const requestManager = new RequestManager();