/**
 * Enhanced Request Manager with circuit breaker integration and graceful degradation
 * Provides better user experience during service outages with comprehensive resilience features
 */

import { CircuitBreaker, apiCircuitBreaker } from './circuitBreaker';
import { globalRequestCoalescer } from '../hooks/useRequestCoalescing';

interface RequestConfig {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  fallbackData?: any;
  showUserFeedback?: boolean;
  circuitBreaker?: CircuitBreaker;
  enableCoalescing?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  priority?: 'low' | 'medium' | 'high';
}

interface ServiceStatus {
  isAvailable: boolean;
  lastChecked: number;
  consecutiveFailures: number;
  nextRetryTime: number;
  circuitBreakerState: string;
  requestCount: number;
  errorRate: number;
}

interface RequestMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageResponseTime: number;
  lastRequestTime: number;
}

class EnhancedRequestManager {
  private serviceStatus: ServiceStatus = {
    isAvailable: true,
    lastChecked: 0,
    consecutiveFailures: 0,
    nextRetryTime: 0,
    circuitBreakerState: 'CLOSED',
    requestCount: 0,
    errorRate: 0
  };

  private metrics: RequestMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    failedRequests: 0,
    averageResponseTime: 0,
    lastRequestTime: 0
  };

  private readonly MAX_CONSECUTIVE_FAILURES = 5; // Aligned with circuit breaker
  private readonly SERVICE_CHECK_INTERVAL = 30000; // 30 seconds
  private readonly CIRCUIT_BREAKER_TIMEOUT = 60000; // 1 minute
  private readonly REQUEST_DEDUPLICATION_WINDOW = 1000; // 1 second
  
  private pendingRequests = new Map<string, Promise<any>>();
  private requestTimestamps = new Map<string, number>();

  /**
   * Make an HTTP request with enhanced error handling, circuit breaker, and request coalescing
   */
  async request<T>(
    url: string,
    options: RequestInit = {},
    config: RequestConfig = {}
  ): Promise<T> {
    const {
      retries = 3,
      retryDelay = 1000,
      timeout = 15000,
      fallbackData,
      showUserFeedback = true,
      circuitBreaker = apiCircuitBreaker,
      enableCoalescing = true,
      cacheKey,
      cacheTTL = 30000,
      priority = 'medium'
    } = config;

    const startTime = Date.now();
    this.metrics.totalRequests++;
    this.metrics.lastRequestTime = startTime;

    // Generate request key for deduplication
    const requestKey = this.generateRequestKey(url, options);
    
    // Check for request deduplication
    if (enableCoalescing && this.shouldDeduplicateRequest(requestKey)) {
      const existingRequest = this.pendingRequests.get(requestKey);
      if (existingRequest) {
        console.log('Deduplicating request:', requestKey);
        return existingRequest;
      }
    }

    // Use request coalescing for GET requests
    if (enableCoalescing && options.method?.toUpperCase() === 'GET' && cacheKey) {
      return globalRequestCoalescer.request(
        cacheKey,
        () => this.executeRequestWithCircuitBreaker<T>(url, options, config, circuitBreaker),
        cacheTTL
      );
    }

    // Execute request with circuit breaker
    const requestPromise = this.executeRequestWithCircuitBreaker<T>(url, options, config, circuitBreaker);
    
    if (enableCoalescing) {
      this.pendingRequests.set(requestKey, requestPromise);
      this.requestTimestamps.set(requestKey, startTime);
    }

    try {
      const result = await requestPromise;
      this.recordSuccess(Date.now() - startTime);
      return result;
    } catch (error) {
      this.recordFailure(error as Error, Date.now() - startTime);
      throw error;
    } finally {
      if (enableCoalescing) {
        this.pendingRequests.delete(requestKey);
        this.requestTimestamps.delete(requestKey);
      }
    }
  }

  /**
   * Execute request with circuit breaker integration
   */
  private async executeRequestWithCircuitBreaker<T>(
    url: string,
    options: RequestInit,
    config: RequestConfig,
    circuitBreaker: CircuitBreaker
  ): Promise<T> {
    const { fallbackData, retries = 3, retryDelay = 1000, timeout = 15000 } = config;

    return circuitBreaker.execute(
      () => this.executeWithRetry<T>(url, options, retries, retryDelay, timeout),
      fallbackData ? () => fallbackData : undefined
    );
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
   * Record a successful request with metrics
   */
  private recordSuccess(responseTime: number): void {
    this.serviceStatus.isAvailable = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.lastChecked = Date.now();
    this.serviceStatus.nextRetryTime = 0;
    this.serviceStatus.requestCount++;
    
    this.metrics.successfulRequests++;
    this.updateAverageResponseTime(responseTime);
    this.updateErrorRate();
  }

  /**
   * Record a failed request with enhanced metrics
   */
  private recordFailure(error: Error, responseTime?: number): void {
    const isServiceError = (error as any).status === 503 || 
                          (error as any).status >= 500 ||
                          (error as any).isServiceUnavailable ||
                          error.message.includes('timeout') ||
                          error.message.includes('network');
    
    this.metrics.failedRequests++;
    if (responseTime) {
      this.updateAverageResponseTime(responseTime);
    }
    this.updateErrorRate();
    
    if (isServiceError) {
      this.serviceStatus.consecutiveFailures++;
      this.serviceStatus.lastChecked = Date.now();
      this.serviceStatus.requestCount++;
      
      // Update service status based on circuit breaker state
      this.updateServiceStatusFromCircuitBreaker();
    }
  }

  /**
   * Update average response time
   */
  private updateAverageResponseTime(responseTime: number): void {
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.averageResponseTime = 
      (this.metrics.averageResponseTime * (totalRequests - 1) + responseTime) / totalRequests;
  }

  /**
   * Update error rate
   */
  private updateErrorRate(): void {
    const totalRequests = this.metrics.successfulRequests + this.metrics.failedRequests;
    this.metrics.errorRate = totalRequests > 0 ? this.metrics.failedRequests / totalRequests : 0;
  }

  /**
   * Update service status from circuit breaker state
   */
  private updateServiceStatusFromCircuitBreaker(): void {
    this.serviceStatus.circuitBreakerState = apiCircuitBreaker.getState();
    this.serviceStatus.isAvailable = !apiCircuitBreaker.isOpen();
  }

  /**
   * Generate request key for deduplication
   */
  private generateRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    return `${method}:${url}:${body}`;
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicateRequest(requestKey: string): boolean {
    const timestamp = this.requestTimestamps.get(requestKey);
    if (!timestamp) return false;
    
    return Date.now() - timestamp < this.REQUEST_DEDUPLICATION_WINDOW;
  }

  /**
   * Get current service status with enhanced metrics
   */
  getServiceStatus(): ServiceStatus {
    this.updateServiceStatusFromCircuitBreaker();
    return { ...this.serviceStatus };
  }

  /**
   * Get request metrics
   */
  getMetrics(): RequestMetrics {
    return { ...this.metrics };
  }

  /**
   * Manually reset the circuit breaker and metrics
   */
  resetCircuitBreaker(): void {
    apiCircuitBreaker.reset();
    this.serviceStatus.isAvailable = true;
    this.serviceStatus.consecutiveFailures = 0;
    this.serviceStatus.nextRetryTime = 0;
    this.serviceStatus.circuitBreakerState = 'CLOSED';
    console.log('Circuit breaker and service status manually reset');
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      averageResponseTime: 0,
      lastRequestTime: 0
    };
    console.log('Request metrics reset');
  }

  /**
   * Health check endpoint
   */
  async healthCheck(baseUrl: string): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
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
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
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