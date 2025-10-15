/**
 * Performance optimizer for real-time blockchain data with graceful degradation
 */

import { networkConditionDetector, NetworkCondition } from './networkConditionDetector';
import { realTimeBlockchainService } from './realTimeBlockchainService';
import { webSocketConnectionManager } from './webSocketConnectionManager';

interface PerformanceConfig {
  enableAdaptiveUpdates: boolean;
  enableDataCompression: boolean;
  enableRequestBatching: boolean;
  enableSmartCaching: boolean;
  enableGracefulDegradation: boolean;
  maxConcurrentRequests: number;
  requestTimeout: number;
  cacheSize: number;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  message: string;
  estimatedTime?: number;
}

interface FallbackMechanism {
  type: 'cache' | 'mock' | 'reduced' | 'offline';
  reason: string;
  data?: any;
  timestamp: Date;
}

interface PerformanceMetrics {
  renderTime: number;
  dataLoadTime: number;
  memoryUsage: number;
  requestCount: number;
  cacheHitRate: number;
  errorRate: number;
  timestamp: Date;
}

export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private config: PerformanceConfig;
  private currentNetworkCondition: NetworkCondition;
  private loadingStates: Map<string, LoadingState> = new Map();
  private fallbackMechanisms: Map<string, FallbackMechanism> = new Map();
  private performanceMetrics: PerformanceMetrics;
  private requestQueue: Map<string, any[]> = new Map();
  private batchTimeout: NodeJS.Timeout | null = null;
  private isActive = false;

  // Caching
  private dataCache: Map<string, { data: any; timestamp: Date; ttl: number }> = new Map();
  private requestCache: Map<string, Promise<any>> = new Map();

  // Event listeners
  private listeners: Map<string, Set<Function>> = new Map();

  // Performance monitoring
  private renderTimeHistory: number[] = [];
  private requestTimeHistory: number[] = [];
  private memoryUsageHistory: number[] = [];

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  constructor() {
    this.config = this.getDefaultConfig();
    this.currentNetworkCondition = networkConditionDetector.getCurrentCondition();
    this.performanceMetrics = this.getDefaultMetrics();
  }

  /**
   * Initialize performance optimizer
   */
  initialize(config?: Partial<PerformanceConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('Initializing performance optimizer');
  }

  /**
   * Start performance optimization
   */
  start(): void {
    if (this.isActive) return;
    
    this.isActive = true;
    console.log('Starting performance optimizer');

    // Start network condition monitoring
    networkConditionDetector.start();
    
    // Set up network condition listener
    networkConditionDetector.on('condition_changed', this.handleNetworkConditionChange);
    
    // Start performance monitoring
    this.startPerformanceMonitoring();

    this.emit('optimizer_started');
  }

  /**
   * Stop performance optimization
   */
  stop(): void {
    if (!this.isActive) return;
    
    this.isActive = false;
    console.log('Stopping performance optimizer');

    // Clean up listeners
    networkConditionDetector.off('condition_changed', this.handleNetworkConditionChange);
    
    // Clear timeouts
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
      this.batchTimeout = null;
    }

    // Clear caches
    this.dataCache.clear();
    this.requestCache.clear();
    this.requestQueue.clear();

    this.emit('optimizer_stopped');
  }

  /**
   * Optimize data request based on network conditions
   */
  async optimizeRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      priority?: 'low' | 'medium' | 'high' | 'urgent';
      cacheTTL?: number;
      fallbackData?: T;
      enableBatching?: boolean;
    } = {}
  ): Promise<T> {
    const {
      priority = 'medium',
      cacheTTL = 30000,
      fallbackData,
      enableBatching = this.config.enableRequestBatching
    } = options;

    try {
      // Check cache first
      if (this.config.enableSmartCaching) {
        const cached = this.getCachedData<T>(key);
        if (cached) {
          return cached;
        }
      }

      // Check if request is already in progress
      const existingRequest = this.requestCache.get(key);
      if (existingRequest) {
        return await existingRequest;
      }

      // Create optimized request
      const optimizedRequest = this.createOptimizedRequest(key, requestFn, {
        priority,
        cacheTTL,
        fallbackData,
        enableBatching
      });

      // Cache the request promise
      this.requestCache.set(key, optimizedRequest);

      const result = await optimizedRequest;

      // Remove from request cache
      this.requestCache.delete(key);

      return result;
    } catch (error) {
      // Remove from request cache on error
      this.requestCache.delete(key);
      
      // Handle graceful degradation
      if (this.config.enableGracefulDegradation) {
        return this.handleRequestFailure(key, error, fallbackData);
      }
      
      throw error;
    }
  }

  /**
   * Set loading state for component
   */
  setLoadingState(key: string, state: Partial<LoadingState>): void {
    const currentState = this.loadingStates.get(key) || {
      isLoading: false,
      progress: 0,
      message: ''
    };

    const newState = { ...currentState, ...state };
    this.loadingStates.set(key, newState);

    this.emit('loading_state_changed', { key, state: newState });
  }

  /**
   * Get loading state for component
   */
  getLoadingState(key: string): LoadingState | null {
    return this.loadingStates.get(key) || null;
  }

  /**
   * Clear loading state
   */
  clearLoadingState(key: string): void {
    this.loadingStates.delete(key);
    this.emit('loading_state_cleared', { key });
  }

  /**
   * Get optimized update interval based on network condition
   */
  getOptimizedUpdateInterval(baseInterval: number): number {
    return networkConditionDetector.getRecommendedUpdateInterval(baseInterval);
  }

  /**
   * Check if feature should be enabled
   */
  shouldEnableFeature(feature: 'animations' | 'realtime_updates' | 'image_preload' | 'auto_refresh'): boolean {
    return networkConditionDetector.shouldEnableFeature(feature);
  }

  /**
   * Get optimized settings for current network condition
   */
  getOptimizedSettings(): {
    imageQuality: number;
    enableAnimations: boolean;
    updateInterval: number;
    maxConcurrentRequests: number;
    requestTimeout: number;
    enableOfflineCache: boolean;
  } {
    return networkConditionDetector.getOptimizedSettings();
  }

  /**
   * Batch multiple requests together
   */
  batchRequest(key: string, request: any): Promise<any> {
    return new Promise((resolve, reject) => {
      // Add to batch queue
      if (!this.requestQueue.has(key)) {
        this.requestQueue.set(key, []);
      }
      
      this.requestQueue.get(key)!.push({ request, resolve, reject });

      // Set batch timeout if not already set
      if (!this.batchTimeout) {
        this.batchTimeout = setTimeout(() => {
          this.processBatchedRequests();
        }, 100); // Batch requests for 100ms
      }
    });
  }

  /**
   * Get performance metrics
   */
  getPerformanceMetrics(): PerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Record performance metric
   */
  recordPerformanceMetric(type: 'render' | 'request' | 'memory', value: number): void {
    switch (type) {
      case 'render':
        this.renderTimeHistory.push(value);
        this.renderTimeHistory = this.renderTimeHistory.slice(-50);
        break;
      case 'request':
        this.requestTimeHistory.push(value);
        this.requestTimeHistory = this.requestTimeHistory.slice(-50);
        break;
      case 'memory':
        this.memoryUsageHistory.push(value);
        this.memoryUsageHistory = this.memoryUsageHistory.slice(-20);
        break;
    }

    this.updatePerformanceMetrics();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    hitRate: number;
    totalRequests: number;
    cacheHits: number;
  } {
    // In a real implementation, track these metrics
    return {
      size: this.dataCache.size,
      hitRate: this.performanceMetrics.cacheHitRate,
      totalRequests: this.performanceMetrics.requestCount,
      cacheHits: Math.floor(this.performanceMetrics.requestCount * this.performanceMetrics.cacheHitRate)
    };
  }

  /**
   * Clear cache
   */
  clearCache(pattern?: string): void {
    if (pattern) {
      // Clear cache entries matching pattern
      for (const key of this.dataCache.keys()) {
        if (key.includes(pattern)) {
          this.dataCache.delete(key);
        }
      }
    } else {
      // Clear all cache
      this.dataCache.clear();
    }

    this.emit('cache_cleared', { pattern });
  }

  /**
   * Create optimized request with fallback mechanisms
   */
  private async createOptimizedRequest<T>(
    key: string,
    requestFn: () => Promise<T>,
    options: {
      priority: 'low' | 'medium' | 'high' | 'urgent';
      cacheTTL: number;
      fallbackData?: T;
      enableBatching: boolean;
    }
  ): Promise<T> {
    const startTime = Date.now();
    
    try {
      // Set loading state
      this.setLoadingState(key, {
        isLoading: true,
        progress: 0,
        message: 'Loading...'
      });

      // Apply network-based optimizations
      const optimizedSettings = this.getOptimizedSettings();
      
      // Create request with timeout
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('Request timeout'));
        }, optimizedSettings.requestTimeout);
      });

      // Execute request with timeout
      const result = await Promise.race([
        requestFn(),
        timeoutPromise
      ]);

      // Cache the result
      if (this.config.enableSmartCaching) {
        this.setCachedData(key, result, options.cacheTTL);
      }

      // Record performance
      const requestTime = Date.now() - startTime;
      this.recordPerformanceMetric('request', requestTime);

      // Clear loading state
      this.clearLoadingState(key);

      return result;
    } catch (error) {
      // Clear loading state
      this.clearLoadingState(key);
      
      // Record error
      this.recordRequestError(key, error);
      
      throw error;
    }
  }

  /**
   * Handle request failure with graceful degradation
   */
  private handleRequestFailure<T>(key: string, error: any, fallbackData?: T): T {
    console.warn(`Request failed for ${key}, applying fallback:`, error);

    // Try cache first
    const cached = this.getCachedData<T>(key, true); // Allow stale cache
    if (cached) {
      this.setFallbackMechanism(key, {
        type: 'cache',
        reason: 'Request failed, using stale cache',
        data: cached,
        timestamp: new Date()
      });
      return cached;
    }

    // Use provided fallback data
    if (fallbackData !== undefined) {
      this.setFallbackMechanism(key, {
        type: 'mock',
        reason: 'Request failed, using fallback data',
        data: fallbackData,
        timestamp: new Date()
      });
      return fallbackData;
    }

    // Set offline fallback
    this.setFallbackMechanism(key, {
      type: 'offline',
      reason: 'Request failed, no fallback available',
      timestamp: new Date()
    });

    throw error;
  }

  /**
   * Get cached data
   */
  private getCachedData<T>(key: string, allowStale: boolean = false): T | null {
    const cached = this.dataCache.get(key);
    if (!cached) return null;

    const now = Date.now();
    const age = now - cached.timestamp.getTime();

    if (age <= cached.ttl || allowStale) {
      return cached.data;
    }

    // Remove expired cache
    this.dataCache.delete(key);
    return null;
  }

  /**
   * Set cached data
   */
  private setCachedData<T>(key: string, data: T, ttl: number): void {
    // Limit cache size
    if (this.dataCache.size >= this.config.cacheSize) {
      // Remove oldest entries
      const entries = Array.from(this.dataCache.entries());
      entries.sort((a, b) => a[1].timestamp.getTime() - b[1].timestamp.getTime());
      
      const toRemove = Math.floor(this.config.cacheSize * 0.2); // Remove 20%
      for (let i = 0; i < toRemove; i++) {
        this.dataCache.delete(entries[i][0]);
      }
    }

    this.dataCache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }

  /**
   * Set fallback mechanism
   */
  private setFallbackMechanism(key: string, mechanism: FallbackMechanism): void {
    this.fallbackMechanisms.set(key, mechanism);
    this.emit('fallback_activated', { key, mechanism });
  }

  /**
   * Process batched requests
   */
  private processBatchedRequests(): void {
    this.batchTimeout = null;

    this.requestQueue.forEach(async (requests, key) => {
      try {
        // Process all requests in batch
        const results = await Promise.allSettled(
          requests.map(({ request }) => request())
        );

        // Resolve individual promises
        results.forEach((result, index) => {
          const { resolve, reject } = requests[index];
          
          if (result.status === 'fulfilled') {
            resolve(result.value);
          } else {
            reject(result.reason);
          }
        });
      } catch (error) {
        // Reject all requests on batch error
        requests.forEach(({ reject }) => reject(error));
      }
    });

    // Clear request queue
    this.requestQueue.clear();
  }

  /**
   * Handle network condition change
   */
  private handleNetworkConditionChange = (data: { current: NetworkCondition }): void => {
    this.currentNetworkCondition = data.current;
    
    // Update configuration based on new network condition
    this.updateConfigForNetworkCondition(data.current);
    
    // Emit network condition change
    this.emit('network_condition_changed', data.current);
  };

  /**
   * Update configuration for network condition
   */
  private updateConfigForNetworkCondition(condition: NetworkCondition): void {
    const optimizedSettings = networkConditionDetector.getOptimizedSettings();
    
    // Update config based on network condition
    this.config.maxConcurrentRequests = optimizedSettings.maxConcurrentRequests;
    this.config.requestTimeout = optimizedSettings.requestTimeout;
    
    // Enable more aggressive optimizations for poor connections
    if (condition.type === 'slow' || condition.type === 'unstable') {
      this.config.enableDataCompression = true;
      this.config.enableRequestBatching = true;
      this.config.enableGracefulDegradation = true;
    }

    console.log('Updated performance config for network condition:', condition.type);
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
      this.cleanupExpiredCache();
    }, 30000); // Update every 30 seconds
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    const now = new Date();
    
    // Calculate averages
    const avgRenderTime = this.renderTimeHistory.length > 0
      ? this.renderTimeHistory.reduce((sum, time) => sum + time, 0) / this.renderTimeHistory.length
      : 0;

    const avgRequestTime = this.requestTimeHistory.length > 0
      ? this.requestTimeHistory.reduce((sum, time) => sum + time, 0) / this.requestTimeHistory.length
      : 0;

    const avgMemoryUsage = this.memoryUsageHistory.length > 0
      ? this.memoryUsageHistory.reduce((sum, usage) => sum + usage, 0) / this.memoryUsageHistory.length
      : 0;

    this.performanceMetrics = {
      renderTime: avgRenderTime,
      dataLoadTime: avgRequestTime,
      memoryUsage: avgMemoryUsage,
      requestCount: this.requestTimeHistory.length,
      cacheHitRate: 0.8, // Mock value, would be calculated from actual cache hits
      errorRate: 0.05, // Mock value, would be calculated from actual errors
      timestamp: now
    };
  }

  /**
   * Clean up expired cache entries
   */
  private cleanupExpiredCache(): void {
    const now = Date.now();
    
    for (const [key, cached] of this.dataCache.entries()) {
      const age = now - cached.timestamp.getTime();
      if (age > cached.ttl) {
        this.dataCache.delete(key);
      }
    }
  }

  /**
   * Record request error
   */
  private recordRequestError(key: string, error: any): void {
    console.error(`Request error for ${key}:`, error);
    // In a real implementation, track error metrics
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): PerformanceConfig {
    return {
      enableAdaptiveUpdates: true,
      enableDataCompression: false,
      enableRequestBatching: true,
      enableSmartCaching: true,
      enableGracefulDegradation: true,
      maxConcurrentRequests: 6,
      requestTimeout: 15000,
      cacheSize: 100
    };
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): PerformanceMetrics {
    return {
      renderTime: 0,
      dataLoadTime: 0,
      memoryUsage: 0,
      requestCount: 0,
      cacheHitRate: 0,
      errorRate: 0,
      timestamp: new Date()
    };
  }

  /**
   * Event system
   */
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in performance optimizer event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const performanceOptimizer = PerformanceOptimizer.getInstance();

// Export types
export type {
  PerformanceConfig,
  LoadingState,
  FallbackMechanism,
  PerformanceMetrics
};
export type { NetworkCondition } from './networkConditionDetector';
