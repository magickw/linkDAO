/**
 * Performance Optimization Service
 * Implements intelligent caching, request deduplication, compression, and monitoring
 */

interface CacheConfig {
  ttl: number;
  maxSize: number;
  staleWhileRevalidate: boolean;
}

interface PerformanceMetrics {
  requestCount: number;
  cacheHitRate: number;
  averageResponseTime: number;
  errorRate: number;
  compressionRatio: number;
  deduplicationSavings: number;
}

interface RequestMetadata {
  url: string;
  method: string;
  startTime: number;
  endTime?: number;
  fromCache: boolean;
  compressed: boolean;
  size: number;
  error?: string;
}

class PerformanceOptimizationService {
  private cache = new Map<string, { data: any; timestamp: number; ttl: number; size: number }>();
  private pendingRequests = new Map<string, Promise<any>>();
  private metrics: RequestMetadata[] = [];
  private compressionWorker?: Worker;
  
  // Cache configurations for different data types
  private cacheConfigs: Record<string, CacheConfig> = {
    feed: { ttl: 30000, maxSize: 100, staleWhileRevalidate: true },
    communities: { ttl: 60000, maxSize: 50, staleWhileRevalidate: true },
    profiles: { ttl: 120000, maxSize: 200, staleWhileRevalidate: true },
    marketplace: { ttl: 45000, maxSize: 150, staleWhileRevalidate: true },
    governance: { ttl: 90000, maxSize: 75, staleWhileRevalidate: true },
    static: { ttl: 300000, maxSize: 500, staleWhileRevalidate: false }
  };

  constructor() {
    this.initializeCompressionWorker();
    this.startMetricsCollection();
    this.setupCacheCleanup();
  }

  /**
   * Initialize compression web worker
   */
  private initializeCompressionWorker(): void {
    if (typeof Worker !== 'undefined') {
      try {
        this.compressionWorker = new Worker('/workers/compression-worker.js');
      } catch (error) {
        console.warn('Compression worker not available:', error);
      }
    }
  }

  /**
   * Optimized request with intelligent caching and deduplication
   */
  async optimizedRequest<T>(
    url: string,
    options: RequestInit = {},
    cacheType: keyof typeof this.cacheConfigs = 'feed'
  ): Promise<T> {
    const requestKey = this.generateRequestKey(url, options);
    const config = this.cacheConfigs[cacheType];
    const startTime = performance.now();

    // Check cache first
    const cached = this.getCachedData<T>(requestKey, config);
    if (cached) {
      this.recordMetrics({
        url,
        method: options.method || 'GET',
        startTime,
        endTime: performance.now(),
        fromCache: true,
        compressed: false,
        size: this.estimateSize(cached)
      });
      return cached;
    }

    // Check for pending request (deduplication)
    const pending = this.pendingRequests.get(requestKey);
    if (pending) {
      console.log('Deduplicating request:', requestKey);
      return pending;
    }

    // Create new request
    const requestPromise = this.executeOptimizedRequest<T>(url, options, config, startTime);
    this.pendingRequests.set(requestKey, requestPromise);

    try {
      const result = await requestPromise;
      this.pendingRequests.delete(requestKey);
      return result;
    } catch (error) {
      this.pendingRequests.delete(requestKey);
      throw error;
    }
  }

  /**
   * Execute request with compression and optimization
   */
  private async executeOptimizedRequest<T>(
    url: string,
    options: RequestInit,
    config: CacheConfig,
    startTime: number
  ): Promise<T> {
    const requestKey = this.generateRequestKey(url, options);
    let compressed = false;
    let responseSize = 0;

    try {
      // Add compression headers
      const optimizedOptions: RequestInit = {
        ...options,
        headers: {
          'Accept-Encoding': 'gzip, deflate, br',
          'Accept': 'application/json',
          ...options.headers
        }
      };

      const response = await fetch(url, optimizedOptions);

      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        (error as any).status = response.status;
        this.recordMetrics({
          url,
          method: options.method || 'GET',
          startTime,
          endTime: performance.now(),
          fromCache: false,
          compressed: false,
          size: 0,
          error: error.message
        });
        throw error;
      }

      // Check if response is compressed
      const contentEncoding = response.headers.get('content-encoding');
      compressed = !!(contentEncoding && ['gzip', 'deflate', 'br'].includes(contentEncoding));

      // Get response data
      const contentType = response.headers.get('content-type');
      let data: T;

      if (contentType?.includes('application/json')) {
        data = await response.json();
      } else if (contentType?.includes('text/')) {
        data = await response.text() as unknown as T;
      } else {
        data = response as unknown as T;
      }

      responseSize = this.estimateSize(data);

      // Cache the response
      this.setCachedData(requestKey, data, config, responseSize);

      // Record metrics
      this.recordMetrics({
        url,
        method: options.method || 'GET',
        startTime,
        endTime: performance.now(),
        fromCache: false,
        compressed,
        size: responseSize
      });

      return data;
    } catch (error) {
      this.recordMetrics({
        url,
        method: options.method || 'GET',
        startTime,
        endTime: performance.now(),
        fromCache: false,
        compressed: false,
        size: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
      throw error;
    }
  }

  /**
   * Get cached data with stale-while-revalidate support
   */
  private getCachedData<T>(requestKey: string, config: CacheConfig): T | null {
    const cached = this.cache.get(requestKey);
    if (!cached) return null;

    const age = Date.now() - cached.timestamp;
    
    // Return fresh data
    if (age < cached.ttl) {
      return cached.data;
    }

    // Stale-while-revalidate: return stale data but trigger background refresh
    if (config.staleWhileRevalidate && age < cached.ttl * 2) {
      // Trigger background refresh (implementation would go here)
      return cached.data;
    }

    return null;
  }

  /**
   * Set cached data with size tracking
   */
  private setCachedData(
    requestKey: string,
    data: any,
    config: CacheConfig,
    size: number
  ): void {
    // Check cache size limits
    if (this.cache.size >= config.maxSize) {
      this.evictOldestEntries(Math.floor(config.maxSize * 0.2)); // Evict 20%
    }

    this.cache.set(requestKey, {
      data,
      timestamp: Date.now(),
      ttl: config.ttl,
      size
    });
  }

  /**
   * Evict oldest cache entries
   */
  private evictOldestEntries(count: number): void {
    const entries = Array.from(this.cache.entries())
      .sort(([, a], [, b]) => a.timestamp - b.timestamp)
      .slice(0, count);

    for (const [key] of entries) {
      this.cache.delete(key);
    }
  }

  /**
   * Generate unique request key for deduplication
   */
  private generateRequestKey(url: string, options: RequestInit): string {
    const method = options.method || 'GET';
    const body = options.body ? JSON.stringify(options.body) : '';
    const searchParams = new URL(url).searchParams.toString();
    return `${method}:${url}:${searchParams}:${body}`;
  }

  /**
   * Estimate data size in bytes
   */
  private estimateSize(data: any): number {
    try {
      return new Blob([JSON.stringify(data)]).size;
    } catch {
      return 0;
    }
  }

  /**
   * Record performance metrics
   */
  private recordMetrics(metadata: RequestMetadata): void {
    this.metrics.push(metadata);
    
    // Keep only last 1000 metrics
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    const recentMetrics = this.metrics.slice(-100); // Last 100 requests
    
    if (recentMetrics.length === 0) {
      return {
        requestCount: 0,
        cacheHitRate: 0,
        averageResponseTime: 0,
        errorRate: 0,
        compressionRatio: 0,
        deduplicationSavings: 0
      };
    }

    const cacheHits = recentMetrics.filter(m => m.fromCache).length;
    const errors = recentMetrics.filter(m => m.error).length;
    const compressed = recentMetrics.filter(m => m.compressed).length;
    const totalResponseTime = recentMetrics
      .filter(m => m.endTime)
      .reduce((sum, m) => sum + (m.endTime! - m.startTime), 0);

    return {
      requestCount: recentMetrics.length,
      cacheHitRate: (cacheHits / recentMetrics.length) * 100,
      averageResponseTime: totalResponseTime / recentMetrics.length,
      errorRate: (errors / recentMetrics.length) * 100,
      compressionRatio: (compressed / recentMetrics.length) * 100,
      deduplicationSavings: (this.pendingRequests.size / recentMetrics.length) * 100
    };
  }

  /**
   * Get cache statistics
   */
  getCacheStatistics() {
    const totalSize = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.size, 0);
    
    const typeStats = Object.keys(this.cacheConfigs).map(type => {
      const typeEntries = Array.from(this.cache.entries())
        .filter(([key]) => key.includes(type));
      
      return {
        type,
        count: typeEntries.length,
        size: typeEntries.reduce((sum, [, entry]) => sum + entry.size, 0),
        hitRate: this.calculateTypeHitRate(type)
      };
    });

    return {
      totalEntries: this.cache.size,
      totalSize,
      typeStats,
      pendingRequests: this.pendingRequests.size
    };
  }

  /**
   * Calculate hit rate for specific cache type
   */
  private calculateTypeHitRate(type: string): number {
    const typeMetrics = this.metrics
      .slice(-100)
      .filter(m => m.url.includes(type));
    
    if (typeMetrics.length === 0) return 0;
    
    const hits = typeMetrics.filter(m => m.fromCache).length;
    return (hits / typeMetrics.length) * 100;
  }

  /**
   * Clear cache for specific type or all
   */
  clearCache(type?: string): void {
    if (type) {
      const keysToDelete = Array.from(this.cache.keys())
        .filter(key => key.includes(type));
      keysToDelete.forEach(key => this.cache.delete(key));
    } else {
      this.cache.clear();
    }
  }

  /**
   * Preload critical data
   */
  async preloadCriticalData(urls: string[]): Promise<void> {
    const preloadPromises = urls.map(url => 
      this.optimizedRequest(url, { method: 'GET' }, 'static')
        .catch(error => console.warn('Preload failed for:', url, error))
    );
    
    await Promise.allSettled(preloadPromises);
  }

  /**
   * Setup automatic cache cleanup
   */
  private setupCacheCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];
      
      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl * 3) { // 3x TTL for cleanup
          keysToDelete.push(key);
        }
      }
      
      keysToDelete.forEach(key => this.cache.delete(key));
      
      if (keysToDelete.length > 0) {
        console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
      }
    }, 60000); // Run every minute
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Monitor navigation performance
    if (typeof window !== 'undefined' && 'performance' in window) {
      window.addEventListener('load', () => {
        setTimeout(() => {
          const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
          if (navigation) {
            console.log('Page load metrics:', {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
              loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
              totalTime: navigation.loadEventEnd - navigation.fetchStart
            });
          }
        }, 0);
      });
    }
  }

  /**
   * Compress data using web worker
   */
  async compressData(data: any): Promise<ArrayBuffer | null> {
    if (!this.compressionWorker) return null;

    return new Promise((resolve) => {
      const timeout = setTimeout(() => resolve(null), 5000);
      
      this.compressionWorker!.onmessage = (event) => {
        clearTimeout(timeout);
        resolve(event.data);
      };
      
      this.compressionWorker!.onerror = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      
      this.compressionWorker!.postMessage(data);
    });
  }

  /**
   * Get detailed performance report
   */
  getPerformanceReport() {
    const metrics = this.getPerformanceMetrics();
    const cacheStats = this.getCacheStatistics();
    
    return {
      timestamp: new Date().toISOString(),
      metrics,
      cacheStats,
      recommendations: this.generateRecommendations(metrics, cacheStats)
    };
  }

  /**
   * Generate performance recommendations
   */
  private generateRecommendations(metrics: PerformanceMetrics, cacheStats: any): string[] {
    const recommendations: string[] = [];
    
    if (metrics.cacheHitRate < 50) {
      recommendations.push('Consider increasing cache TTL values to improve hit rate');
    }
    
    if (metrics.averageResponseTime > 2000) {
      recommendations.push('High response times detected - consider request optimization');
    }
    
    if (metrics.errorRate > 5) {
      recommendations.push('High error rate - check network connectivity and server status');
    }
    
    if (cacheStats.totalSize > 50 * 1024 * 1024) { // 50MB
      recommendations.push('Cache size is large - consider reducing TTL or cache limits');
    }
    
    if (metrics.compressionRatio < 30) {
      recommendations.push('Low compression usage - ensure server supports compression');
    }
    
    return recommendations;
  }
}

// Export singleton instance
export const performanceOptimizationService = new PerformanceOptimizationService();

// Convenience methods
export const optimizedApiRequest = <T>(
  url: string,
  options?: RequestInit,
  cacheType?: keyof typeof performanceOptimizationService['cacheConfigs']
): Promise<T> => {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL || process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url}`;
  return performanceOptimizationService.optimizedRequest<T>(fullUrl, options, cacheType);
};

export default performanceOptimizationService;