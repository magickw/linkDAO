/**
 * Request Deduplication Service
 * Prevents duplicate API calls and manages request coalescing
 */

interface PendingRequest<T> {
  promise: Promise<T>;
  timestamp: number;
  subscribers: number;
}

interface DeduplicationMetrics {
  totalRequests: number;
  deduplicatedRequests: number;
  savingsPercentage: number;
  averageSubscribers: number;
}

class RequestDeduplicationService {
  private pendingRequests = new Map<string, PendingRequest<any>>();
  private metrics = {
    totalRequests: 0,
    deduplicatedRequests: 0,
    totalSubscribers: 0
  };

  /**
   * Execute request with deduplication
   */
  async deduplicatedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    maxAge: number = 30000 // 30 seconds
  ): Promise<T> {
    this.metrics.totalRequests++;

    // Check for existing pending request
    const existing = this.pendingRequests.get(key);
    if (existing && Date.now() - existing.timestamp < maxAge) {
      existing.subscribers++;
      this.metrics.deduplicatedRequests++;
      this.metrics.totalSubscribers++;
      
      console.log(`Deduplicating request: ${key} (${existing.subscribers} subscribers)`);
      return existing.promise;
    }

    // Create new request
    const promise = requestFn()
      .finally(() => {
        // Clean up after completion
        this.pendingRequests.delete(key);
      });

    this.pendingRequests.set(key, {
      promise,
      timestamp: Date.now(),
      subscribers: 1
    });

    return promise;
  }

  /**
   * Generate request key for deduplication
   */
  generateRequestKey(
    url: string,
    method: string = 'GET',
    body?: any,
    params?: Record<string, any>
  ): string {
    const normalizedUrl = this.normalizeUrl(url);
    const bodyHash = body ? this.hashObject(body) : '';
    const paramsHash = params ? this.hashObject(params) : '';
    
    return `${method.toUpperCase()}:${normalizedUrl}:${bodyHash}:${paramsHash}`;
  }

  /**
   * Normalize URL for consistent key generation
   */
  private normalizeUrl(url: string): string {
    try {
      const urlObj = new URL(url);
      // Sort search parameters for consistency
      urlObj.searchParams.sort();
      return urlObj.toString();
    } catch {
      return url;
    }
  }

  /**
   * Simple hash function for objects
   */
  private hashObject(obj: any): string {
    const str = JSON.stringify(obj, Object.keys(obj).sort());
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(36);
  }

  /**
   * Cancel pending request
   */
  cancelRequest(key: string): boolean {
    const pending = this.pendingRequests.get(key);
    if (pending) {
      this.pendingRequests.delete(key);
      return true;
    }
    return false;
  }

  /**
   * Get pending requests count
   */
  getPendingRequestsCount(): number {
    return this.pendingRequests.size;
  }

  /**
   * Get deduplication metrics
   */
  getMetrics(): DeduplicationMetrics {
    const savingsPercentage = this.metrics.totalRequests > 0 
      ? (this.metrics.deduplicatedRequests / this.metrics.totalRequests) * 100 
      : 0;
    
    const averageSubscribers = this.metrics.deduplicatedRequests > 0
      ? this.metrics.totalSubscribers / this.metrics.deduplicatedRequests
      : 1;

    return {
      totalRequests: this.metrics.totalRequests,
      deduplicatedRequests: this.metrics.deduplicatedRequests,
      savingsPercentage,
      averageSubscribers
    };
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      totalRequests: 0,
      deduplicatedRequests: 0,
      totalSubscribers: 0
    };
  }

  /**
   * Clear all pending requests
   */
  clearPendingRequests(): void {
    this.pendingRequests.clear();
  }

  /**
   * Get pending requests info for debugging
   */
  getPendingRequestsInfo(): Array<{
    key: string;
    age: number;
    subscribers: number;
  }> {
    const now = Date.now();
    return Array.from(this.pendingRequests.entries()).map(([key, request]) => ({
      key,
      age: now - request.timestamp,
      subscribers: request.subscribers
    }));
  }

  /**
   * Cleanup old pending requests
   */
  cleanup(maxAge: number = 60000): number {
    const now = Date.now();
    let cleaned = 0;
    
    for (const [key, request] of this.pendingRequests.entries()) {
      if (now - request.timestamp > maxAge) {
        this.pendingRequests.delete(key);
        cleaned++;
      }
    }
    
    return cleaned;
  }
}

/**
 * Request Coalescer for batching similar requests
 */
class RequestCoalescer {
  private batchQueues = new Map<string, {
    requests: Array<{ resolve: Function; reject: Function; data: any }>;
    timer: NodeJS.Timeout;
  }>();

  /**
   * Coalesce requests into batches
   */
  async coalesceRequest<T>(
    batchKey: string,
    requestData: any,
    batchFn: (requests: any[]) => Promise<T[]>,
    batchDelay: number = 100
  ): Promise<T> {
    return new Promise((resolve, reject) => {
      let batch = this.batchQueues.get(batchKey);
      
      if (!batch) {
        batch = {
          requests: [],
          timer: setTimeout(() => this.executeBatch(batchKey, batchFn), batchDelay)
        };
        this.batchQueues.set(batchKey, batch);
      }
      
      batch.requests.push({ resolve, reject, data: requestData });
    });
  }

  /**
   * Execute batched requests
   */
  private async executeBatch<T>(
    batchKey: string,
    batchFn: (requests: any[]) => Promise<T[]>
  ): Promise<void> {
    const batch = this.batchQueues.get(batchKey);
    if (!batch) return;
    
    this.batchQueues.delete(batchKey);
    
    try {
      const requestsData = batch.requests.map(r => r.data);
      const results = await batchFn(requestsData);
      
      // Resolve individual requests
      batch.requests.forEach((request, index) => {
        if (results[index] !== undefined) {
          request.resolve(results[index]);
        } else {
          request.reject(new Error('Batch request failed'));
        }
      });
    } catch (error) {
      // Reject all requests in batch
      batch.requests.forEach(request => request.reject(error));
    }
  }

  /**
   * Clear all batches
   */
  clearBatches(): void {
    for (const [, batch] of this.batchQueues) {
      clearTimeout(batch.timer);
    }
    this.batchQueues.clear();
  }
}

// Export singleton instances
export const requestDeduplicationService = new RequestDeduplicationService();
export const requestCoalescer = new RequestCoalescer();

// Convenience function for deduplicating API requests
export const deduplicatedApiRequest = async <T>(
  url: string,
  options: RequestInit = {},
  maxAge?: number
): Promise<T> => {
  const key = requestDeduplicationService.generateRequestKey(
    url,
    options.method,
    options.body,
    options.headers as Record<string, any>
  );
  
  return requestDeduplicationService.deduplicatedRequest(
    key,
    () => fetch(url, options).then(response => {
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    }),
    maxAge
  );
};

export default requestDeduplicationService;