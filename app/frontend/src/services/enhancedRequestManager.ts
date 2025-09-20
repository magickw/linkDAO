/**
 * Enhanced Request Manager with improved 503 error handling
 * Provides better user experience during service outages
 */

interface RequestConfig {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackData?: any;
  showUserFeedback?: boolean;
}

interface ServiceStatus {
  isAvailable: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  nextRetryTime: number;
}

class EnhancedRequestManager {
  private serviceStatus: ServiceStatus = {
    isAvailable: true,
    lastChecked: 0,
    consecutiveFailures: 0,
    nextRetryTime: 0
  };

  private readonly MAX_CONSECUTIVE_FAILURES = 3;
  private readonly SERVICE_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute

  /**
   * Make an HTTP request with enhanced error handling
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 10000,
      fallbackData,
      showUserFeedback = true
    } = config;

    // Check circuit breaker
    if (!this.isServiceAvailable()) {
      if (fallbackData !== undefined) {
        console.log('Service unavailable, returning fallback data');
        return fallbackData;
      }
      throw new Error('Service is currently unavailable. Please try again later.');
    }

    try {
      const result = await this.executeWithRetry<T>(url, options, retries, retryDelay, timeout);
      this.recordSuccess();
      return result;
    } catch (error) {
      this.recordFailure(error as Error);
      
      // Return fallback data if available
      if (fallbackData !== undefined && (error as any).status === 503) {
        console.log('Request failed, returning fallback data');
        return fallbackData;
      }
      
      throw error;
    }
  }

  /**
   * Execute request with retry logic and circuit breaker
   */
  private async executeWithRetry<T>(
    url: string,
    options: RequestInit,
    retries: number,
    retryDelay: number,
    timeout: number
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await this.executeRequest<T>(url, options, timeout);
      } catch (error) {
        lastError = error as Error;
        const errorStatus = (error as any).status;

        // Don't retry on client errors (4xx) except 429 (rate limit)
        if (errorStatus >= 400 && errorStatus < 500 && errorStatus !== 429) {
          throw error;
        }

        // Special handling for 503 Service Unavailable
        if (errorStatus === 503) {
          const serviceUnavailableDelay = Math.min(5000 * Math.pow(2, attempt), 30000);
          console.log(`Service unavailable (503). Retrying in ${serviceUnavailableDelay}ms (attempt ${attempt + 1}/${retries + 1})`);
          
          if (attempt < retries) {
            await this.sleep(serviceUnavailableDelay);
            continue;
          }
        }

        // Don't retry on the last attempt
        if (attempt === retries) {
          break;
        }

        // Wait before retrying with exponential backoff
        const delay = retryDelay * Math.pow(2, attempt);
        console.log(`Request failed, retrying in ${delay}ms (attempt ${attempt + 1}/${retries + 1})`);
        await this.sleep(delay);
      }
    }

    throw lastError!;
  }

  /**
   * Execute a single request with timeout
   */
  private async executeRequest<T>(
    url: string,
    options: RequestInit,
    timeout: number
  ): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          ...options.headers,
        },
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
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
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Check if service is available (circuit breaker pattern)
   */
  private isServiceAvailable(): boolean {
    const now = Date.now();
    
    // If we're within the circuit breaker timeout, service is considered unavailable
    if (this.serviceStatus.nextRetryTime > now) {
      return false;
    }
    
    // If too many consecutive failures, open the circuit
    if (this.serviceStatus.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
      return false;
    }
    
    return true;
  }

  /**
   * Record a successful request
   */
  private recordSuccess(): void {
    this.serviceStatus.isAvailable = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.lastChecked = Date.now();
    this.serviceStatus.nextRetryTime = 0;
  }

  /**
   * Record a failed request
   */
  private recordFailure(error: Error): void {
    const isServiceError = (error as any).status === 503 || (error as any).isServiceUnavailable;
    
    if (isServiceError) {
      this.serviceStatus.consecutiveFailures++;
      this.serviceStatus.lastChecked = Date.now();
      
      // If we've hit the failure threshold, open the circuit breaker
      if (this.serviceStatus.consecutiveFailures >= this.MAX_CONSECUTIVE_FAILURES) {
        this.serviceStatus.isAvailable = false;
        this.serviceStatus.nextRetryTime = Date.now() + this.CIRCUIT_BREAKER_TIMEOUT;
        console.log(`Circuit breaker opened. Service will be retried after ${this.CIRCUIT_BREAKER_TIMEOUT}ms`);
      }
    }
  }

  /**
   * Get current service status
   */
  getServiceStatus(): ServiceStatus {
    return { ...this.serviceStatus };
  }

  /**
   * Manually reset the circuit breaker
   */
  resetCircuitBreaker(): void {
    this.serviceStatus.isAvailable = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.nextRetryTime = 0;
    console.log('Circuit breaker manually reset');
  }

  /**
   * Health check endpoint
   */
  async healthCheck(baseUrl: string): Promise<boolean> {
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        timeout: 5000,
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Create singleton instance
export const enhancedRequestManager = new EnhancedRequestManager();

// Convenience methods
export const apiRequest = <T>(
  endpoint: string,
  options?: RequestInit,
  config?: RequestConfig
): Promise<T> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3002';
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;
  return enhancedRequestManager.request<T>(url, options, config);
};

export const apiGet = <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
  return apiRequest<T>(endpoint, { method: 'GET' }, config);
};

export const apiPost = <T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> => {
  return apiRequest<T>(endpoint, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  }, config);
};

export const apiPut = <T>(endpoint: string, data?: any, config?: RequestConfig): Promise<T> => {
  return apiRequest<T>(endpoint, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  }, config);
};

export const apiDelete = <T>(endpoint: string, config?: RequestConfig): Promise<T> => {
  return apiRequest<T>(endpoint, { method: 'DELETE' }, config);
};

export default enhancedRequestManager;