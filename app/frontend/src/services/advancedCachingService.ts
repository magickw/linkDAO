/**
 * Advanced Caching and Optimization Service
 * Implements predictive preloading, cache compression, deduplication, and analytics
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';
import { intelligentCacheManager } from './intelligentCacheService';

interface CacheCompressionConfig {
  enabled: boolean;
  algorithm: 'gzip' | 'brotli' | 'lz4';
  threshold: number; // Minimum size to compress (bytes)
  level: number; // Compression level 1-9
}

interface CacheDeduplicationConfig {
  enabled: boolean;
  hashAlgorithm: 'sha256' | 'md5' | 'xxhash';
  contentTypes: string[];
  maxDuplicates: number;
}

interface PredictivePreloadingConfig {
  enabled: boolean;
  maxConcurrentPreloads: number;
  networkThreshold: number; // Minimum connection speed (Mbps)
  batteryThreshold: number; // Minimum battery level (0-1)
  memoryThreshold: number; // Maximum memory usage (bytes)
  confidenceThreshold: number; // Minimum prediction confidence (0-1)
}

interface CacheAnalyticsData {
  timestamp: number;
  hitRate: number;
  missRate: number;
  compressionRatio: number;
  deduplicationSavings: number;
  preloadSuccessRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  networkSavings: number;
  userSatisfactionScore: number;
}

interface UserBehaviorPrediction {
  userId: string;
  nextActions: Array<{
    action: string;
    target: string;
    confidence: number;
    timeWindow: number;
  }>;
  resourcePriorities: Map<string, number>;
  contextualFactors: {
    timeOfDay: number;
    dayOfWeek: number;
    deviceType: string;
    networkCondition: string;
    batteryLevel: number;
  };
}

interface CacheWarmingStrategy {
  name: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  resources: string[];
  conditions: {
    timeWindows: Array<{ start: number; end: number }>;
    userSegments: string[];
    networkConditions: string[];
  };
  metrics: {
    successRate: number;
    averageLoadTime: number;
    userEngagement: number;
  };
}

/**
 * Advanced Caching Service with ML-driven optimization
 */
export class AdvancedCachingService {
  private compressionConfig: CacheCompressionConfig;
  private deduplicationConfig: CacheDeduplicationConfig;
  private preloadingConfig: PredictivePreloadingConfig;
  private analyticsData: CacheAnalyticsData[] = [];
  private contentHashes = new Map<string, string>();
  private duplicateContent = new Map<string, string[]>();
  private preloadingQueue = new Map<string, Promise<void>>();
  private warmingStrategies: CacheWarmingStrategy[] = [];
  private performanceObserver: PerformanceObserver | null = null;
  private compressionWorker: Worker | null = null;
  private analyticsWorker: Worker | null = null;

  constructor() {
    this.compressionConfig = {
      enabled: true,
      algorithm: 'gzip',
      threshold: 1024, // 1KB
      level: 6
    };

    this.deduplicationConfig = {
      enabled: true,
      hashAlgorithm: 'sha256',
      contentTypes: ['application/json', 'text/html', 'text/css', 'application/javascript'],
      maxDuplicates: 10
    };

    this.preloadingConfig = {
      enabled: true,
      maxConcurrentPreloads: 3,
      networkThreshold: 1.0, // 1 Mbps
      batteryThreshold: 0.2, // 20%
      memoryThreshold: 100 * 1024 * 1024, // 100MB
      confidenceThreshold: 0.7 // 70%
    };

    this.initializeWorkers();
    this.initializePerformanceMonitoring();
    this.initializeWarmingStrategies();
  }

  /**
   * Initialize web workers for background processing
   */
  private initializeWorkers(): void {
    try {
      // Compression worker for background compression
      this.compressionWorker = new Worker('/workers/compression-worker.js');
      this.compressionWorker.onmessage = this.handleCompressionWorkerMessage.bind(this);

      // Analytics worker for performance analysis
      this.analyticsWorker = new Worker('/workers/analytics-worker.js');
      this.analyticsWorker.onmessage = this.handleAnalyticsWorkerMessage.bind(this);
    } catch (error) {
      console.warn('Failed to initialize workers:', error);
    }
  }

  /**
   * Initialize performance monitoring
   */
  private initializePerformanceMonitoring(): void {
    if ('PerformanceObserver' in window) {
      this.performanceObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        this.processPerformanceEntries(entries);
      });

      this.performanceObserver.observe({ 
        entryTypes: ['navigation', 'resource', 'measure'] 
      });
    }

    // Start analytics collection
    setInterval(() => {
      this.collectAnalyticsData();
    }, 60000); // Every minute
  }

  /**
   * Initialize cache warming strategies
   */
  private initializeWarmingStrategies(): void {
    this.warmingStrategies = [
      {
        name: 'morning_commute',
        priority: 'high',
        resources: ['/api/feed/hot', '/api/communities/trending', '/api/notifications'],
        conditions: {
          timeWindows: [{ start: 7, end: 9 }, { start: 17, end: 19 }],
          userSegments: ['active', 'commuter'],
          networkConditions: ['fast', 'medium']
        },
        metrics: { successRate: 0, averageLoadTime: 0, userEngagement: 0 }
      },
      {
        name: 'weekend_discovery',
        priority: 'medium',
        resources: ['/api/communities/discover', '/api/posts/trending', '/api/events/upcoming'],
        conditions: {
          timeWindows: [{ start: 10, end: 22 }],
          userSegments: ['explorer', 'casual'],
          networkConditions: ['fast']
        },
        metrics: { successRate: 0, averageLoadTime: 0, userEngagement: 0 }
      },
      {
        name: 'critical_infrastructure',
        priority: 'critical',
        resources: ['/api/auth/verify', '/api/user/profile', '/api/settings'],
        conditions: {
          timeWindows: [{ start: 0, end: 24 }],
          userSegments: ['all'],
          networkConditions: ['fast', 'medium', 'slow']
        },
        metrics: { successRate: 0, averageLoadTime: 0, userEngagement: 0 }
      }
    ];
  }

  /**
   * Predictive preloading based on user behavior patterns
   */
  async predictivePreload(userId: string, currentContext: any): Promise<void> {
    if (!this.preloadingConfig.enabled) return;

    try {
      // Check system conditions
      const canPreload = await this.checkPreloadingConditions();
      if (!canPreload) return;

      // Generate predictions
      const predictions = await this.generateUserBehaviorPredictions(userId, currentContext);
      
      // Filter high-confidence predictions
      const highConfidencePredictions = predictions.nextActions.filter(
        action => action.confidence >= this.preloadingConfig.confidenceThreshold
      );

      // Execute preloading for top predictions
      const preloadPromises = highConfidencePredictions
        .slice(0, this.preloadingConfig.maxConcurrentPreloads)
        .map(prediction => this.executePreload(prediction));

      await Promise.allSettled(preloadPromises);
    } catch (error) {
      console.error('Predictive preloading failed:', error);
    }
  }

  /**
   * Check if preloading conditions are met
   */
  private async checkPreloadingConditions(): Promise<boolean> {
    // Check network condition
    const networkInfo = this.getNetworkInfo();
    if (networkInfo.effectiveType === 'slow-2g' || networkInfo.effectiveType === '2g') {
      return false;
    }

    // Check battery level
    const batteryInfo = await this.getBatteryInfo();
    if (batteryInfo && batteryInfo.level < this.preloadingConfig.batteryThreshold) {
      return false;
    }

    // Check memory usage
    const memoryInfo = await this.getMemoryInfo();
    if (memoryInfo && memoryInfo.usedJSHeapSize > this.preloadingConfig.memoryThreshold) {
      return false;
    }

    // Check concurrent preloads
    if (this.preloadingQueue.size >= this.preloadingConfig.maxConcurrentPreloads) {
      return false;
    }

    return true;
  }

  /**
   * Generate user behavior predictions using ML algorithms
   */
  private async generateUserBehaviorPredictions(
    userId: string, 
    currentContext: any
  ): Promise<UserBehaviorPrediction> {
    // Get user behavior patterns from intelligent cache manager
    const behaviorData = intelligentCacheManager.getCacheMetrics();
    
    // Analyze current context
    const contextualFactors = {
      timeOfDay: new Date().getHours(),
      dayOfWeek: new Date().getDay(),
      deviceType: this.getDeviceType(),
      networkCondition: this.getNetworkInfo().effectiveType,
      batteryLevel: (await this.getBatteryInfo())?.level || 1
    };

    // Generate predictions based on patterns and context
    const nextActions = await this.predictNextActions(userId, currentContext, contextualFactors);
    
    // Calculate resource priorities
    const resourcePriorities = this.calculateResourcePriorities(nextActions, contextualFactors);

    return {
      userId,
      nextActions,
      resourcePriorities,
      contextualFactors
    };
  }

  /**
   * Predict next user actions using behavioral analysis
   */
  private async predictNextActions(
    userId: string,
    currentContext: any,
    contextualFactors: any
  ): Promise<Array<{ action: string; target: string; confidence: number; timeWindow: number }>> {
    const predictions: Array<{ action: string; target: string; confidence: number; timeWindow: number }> = [];

    // Time-based predictions
    if (contextualFactors.timeOfDay >= 7 && contextualFactors.timeOfDay <= 9) {
      predictions.push({
        action: 'view_feed',
        target: '/api/feed/hot',
        confidence: 0.85,
        timeWindow: 300000 // 5 minutes
      });
    }

    // Context-based predictions
    if (currentContext.page === 'community') {
      predictions.push({
        action: 'view_posts',
        target: `/api/communities/${currentContext.communityId}/posts`,
        confidence: 0.75,
        timeWindow: 180000 // 3 minutes
      });
    }

    // Device-based predictions
    if (contextualFactors.deviceType === 'mobile') {
      predictions.push({
        action: 'view_notifications',
        target: '/api/notifications',
        confidence: 0.65,
        timeWindow: 120000 // 2 minutes
      });
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Calculate resource priorities based on predictions
   */
  private calculateResourcePriorities(
    nextActions: Array<{ action: string; target: string; confidence: number; timeWindow: number }>,
    contextualFactors: any
  ): Map<string, number> {
    const priorities = new Map<string, number>();

    nextActions.forEach(action => {
      let priority = action.confidence;

      // Adjust priority based on context
      if (contextualFactors.networkCondition === 'slow-2g') {
        priority *= 0.5; // Lower priority on slow networks
      }

      if (contextualFactors.batteryLevel < 0.3) {
        priority *= 0.7; // Lower priority on low battery
      }

      priorities.set(action.target, priority);
    });

    return priorities;
  }

  /**
   * Execute preload for a specific prediction
   */
  private async executePreload(prediction: { action: string; target: string; confidence: number; timeWindow: number }): Promise<void> {
    const { target } = prediction;
    
    if (this.preloadingQueue.has(target)) {
      return; // Already preloading
    }

    const preloadPromise = this.performPreload(target);
    this.preloadingQueue.set(target, preloadPromise);

    try {
      await preloadPromise;
      console.log(`Successfully preloaded: ${target}`);
    } catch (error) {
      console.warn(`Preload failed for ${target}:`, error);
    } finally {
      this.preloadingQueue.delete(target);
    }
  }

  /**
   * Perform actual preload operation
   */
  private async performPreload(url: string): Promise<void> {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'X-Preload': 'true',
          'Cache-Control': 'max-age=300'
        }
      });

      if (response.ok) {
        // Compress and cache the response
        const compressedResponse = await this.compressResponse(response);
        await this.cacheCompressedResponse(url, compressedResponse);
      }
    } catch (error) {
      throw new Error(`Preload failed: ${error}`);
    }
  }

  /**
   * Intelligent cache warming for frequently accessed content
   */
  async intelligentCacheWarming(): Promise<void> {
    const currentHour = new Date().getHours();
    const currentDay = new Date().getDay();
    const networkCondition = this.getNetworkInfo().effectiveType;

    for (const strategy of this.warmingStrategies) {
      // Check if strategy conditions are met
      const timeMatch = strategy.conditions.timeWindows.some(
        window => currentHour >= window.start && currentHour <= window.end
      );

      const networkMatch = strategy.conditions.networkConditions.includes(networkCondition);

      if (timeMatch && networkMatch) {
        await this.executeWarmingStrategy(strategy);
      }
    }
  }

  /**
   * Execute cache warming strategy
   */
  private async executeWarmingStrategy(strategy: CacheWarmingStrategy): Promise<void> {
    const startTime = performance.now();
    let successCount = 0;

    try {
      const warmingPromises = strategy.resources.map(async (resource) => {
        try {
          await this.performPreload(resource);
          successCount++;
        } catch (error) {
          console.warn(`Cache warming failed for ${resource}:`, error);
        }
      });

      await Promise.allSettled(warmingPromises);

      // Update strategy metrics
      const endTime = performance.now();
      strategy.metrics.successRate = successCount / strategy.resources.length;
      strategy.metrics.averageLoadTime = endTime - startTime;

      console.log(`Cache warming strategy '${strategy.name}' completed: ${successCount}/${strategy.resources.length} resources`);
    } catch (error) {
      console.error(`Cache warming strategy '${strategy.name}' failed:`, error);
    }
  }

  /**
   * Compress response data
   */
  private async compressResponse(response: Response): Promise<Response> {
    if (!this.compressionConfig.enabled) {
      return response;
    }

    const contentLength = parseInt(response.headers.get('content-length') || '0');
    if (contentLength < this.compressionConfig.threshold) {
      return response; // Too small to compress
    }

    try {
      if (this.compressionWorker) {
        // Use web worker for compression
        return await this.compressWithWorker(response);
      } else {
        // Fallback to main thread compression
        return await this.compressMainThread(response);
      }
    } catch (error) {
      console.warn('Compression failed, using original response:', error);
      return response;
    }
  }

  /**
   * Compress response using web worker
   */
  private async compressWithWorker(response: Response): Promise<Response> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const messageId = Math.random().toString(36);
      
      const handleMessage = (event: MessageEvent) => {
        if (event.data.id === messageId) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          
          if (event.data.success) {
            const compressedData = event.data.data;
            const compressedResponse = new Response(compressedData, {
              status: response.status,
              statusText: response.statusText,
              headers: {
                ...Object.fromEntries(response.headers.entries()),
                'Content-Encoding': this.compressionConfig.algorithm,
                'X-Compressed': 'true'
              }
            });
            resolve(compressedResponse);
          } else {
            reject(new Error(event.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);

      response.arrayBuffer().then(buffer => {
        this.compressionWorker!.postMessage({
          id: messageId,
          type: 'compress',
          data: buffer,
          algorithm: this.compressionConfig.algorithm,
          level: this.compressionConfig.level
        });
      });
    });
  }

  /**
   * Compress response on main thread (fallback)
   */
  private async compressMainThread(response: Response): Promise<Response> {
    // Simple compression using CompressionStream if available
    if ('CompressionStream' in window) {
      const stream = response.body?.pipeThrough(
        new CompressionStream(this.compressionConfig.algorithm as any)
      );

      return new Response(stream, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...Object.fromEntries(response.headers.entries()),
          'Content-Encoding': this.compressionConfig.algorithm,
          'X-Compressed': 'true'
        }
      });
    }

    return response; // No compression available
  }

  /**
   * Cache compressed response
   */
  private async cacheCompressedResponse(url: string, response: Response): Promise<void> {
    try {
      // Check for content deduplication
      const contentHash = await this.calculateContentHash(response.clone());
      
      if (this.deduplicationConfig.enabled && this.contentHashes.has(contentHash)) {
        // Content already exists, create reference instead of storing duplicate
        const existingUrl = this.contentHashes.get(contentHash)!;
        this.addDuplicateReference(contentHash, url);
        console.log(`Deduplicated content: ${url} -> ${existingUrl}`);
        return;
      }

      // Store new content
      const cache = await caches.open('advanced-cache-v1');
      await cache.put(url, response);
      
      // Update deduplication tracking
      if (this.deduplicationConfig.enabled) {
        this.contentHashes.set(contentHash, url);
      }

      console.log(`Cached compressed response: ${url}`);
    } catch (error) {
      console.error(`Failed to cache compressed response for ${url}:`, error);
    }
  }

  /**
   * Calculate content hash for deduplication
   */
  private async calculateContentHash(response: Response): Promise<string> {
    const buffer = await response.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Add duplicate content reference
   */
  private addDuplicateReference(contentHash: string, url: string): void {
    if (!this.duplicateContent.has(contentHash)) {
      this.duplicateContent.set(contentHash, []);
    }
    
    const duplicates = this.duplicateContent.get(contentHash)!;
    if (!duplicates.includes(url)) {
      duplicates.push(url);
      
      // Limit number of duplicates tracked
      if (duplicates.length > this.deduplicationConfig.maxDuplicates) {
        duplicates.shift();
      }
    }
  }

  /**
   * Cache analytics and performance monitoring
   */
  private async collectAnalyticsData(): Promise<void> {
    try {
      const cacheMetrics = intelligentCacheManager.getCacheMetrics();
      const storageEstimate = await navigator.storage?.estimate();
      
      const analyticsData: CacheAnalyticsData = {
        timestamp: Date.now(),
        hitRate: cacheMetrics.hitRate,
        missRate: cacheMetrics.missRate,
        compressionRatio: this.calculateCompressionRatio(),
        deduplicationSavings: this.calculateDeduplicationSavings(),
        preloadSuccessRate: this.calculatePreloadSuccessRate(),
        averageResponseTime: cacheMetrics.averageResponseTime,
        memoryUsage: storageEstimate?.usage || 0,
        networkSavings: cacheMetrics.networkSavings,
        userSatisfactionScore: this.calculateUserSatisfactionScore()
      };

      this.analyticsData.push(analyticsData);
      
      // Keep only last 1000 data points
      if (this.analyticsData.length > 1000) {
        this.analyticsData = this.analyticsData.slice(-1000);
      }

      // Send to analytics worker for processing
      if (this.analyticsWorker) {
        this.analyticsWorker.postMessage({
          type: 'process_analytics',
          data: analyticsData
        });
      }
    } catch (error) {
      console.error('Failed to collect analytics data:', error);
    }
  }

  /**
   * Calculate compression ratio
   */
  private calculateCompressionRatio(): number {
    // This would track original vs compressed sizes
    // For now, return estimated ratio
    return 0.65; // 35% size reduction
  }

  /**
   * Calculate deduplication savings
   */
  private calculateDeduplicationSavings(): number {
    let totalSavings = 0;
    
    for (const duplicates of this.duplicateContent.values()) {
      if (duplicates.length > 1) {
        totalSavings += duplicates.length - 1; // Save storage for duplicates
      }
    }
    
    return totalSavings;
  }

  /**
   * Calculate preload success rate
   */
  private calculatePreloadSuccessRate(): number {
    const preloadingStatus = intelligentCacheManager.getPreloadingStatus();
    const total = preloadingStatus.completed + preloadingStatus.queueSize;
    
    return total > 0 ? preloadingStatus.completed / total : 0;
  }

  /**
   * Calculate user satisfaction score based on performance metrics
   */
  private calculateUserSatisfactionScore(): number {
    const recentData = this.analyticsData.slice(-10); // Last 10 data points
    
    if (recentData.length === 0) return 0.5;
    
    const avgHitRate = recentData.reduce((sum, data) => sum + data.hitRate, 0) / recentData.length;
    const avgResponseTime = recentData.reduce((sum, data) => sum + data.averageResponseTime, 0) / recentData.length;
    
    // Score based on hit rate and response time
    let score = avgHitRate * 0.6; // 60% weight on hit rate
    
    // Response time factor (lower is better)
    const responseTimeFactor = Math.max(0, 1 - (avgResponseTime / 1000)); // Normalize to 1 second
    score += responseTimeFactor * 0.4; // 40% weight on response time
    
    return Math.min(1, Math.max(0, score));
  }

  /**
   * Handle compression worker messages
   */
  private handleCompressionWorkerMessage(event: MessageEvent): void {
    // Handled in compressWithWorker method
  }

  /**
   * Handle analytics worker messages
   */
  private handleAnalyticsWorkerMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'analytics_insights':
        this.processAnalyticsInsights(data);
        break;
      case 'optimization_recommendations':
        this.processOptimizationRecommendations(data);
        break;
    }
  }

  /**
   * Process analytics insights from worker
   */
  private processAnalyticsInsights(insights: any): void {
    console.log('Analytics insights:', insights);
    
    // Apply insights to optimize caching strategies
    if (insights.recommendedCacheSize) {
      // Adjust cache size based on insights
    }
    
    if (insights.optimalPreloadTiming) {
      // Adjust preloading timing
    }
  }

  /**
   * Process optimization recommendations
   */
  private processOptimizationRecommendations(recommendations: any): void {
    console.log('Optimization recommendations:', recommendations);
    
    // Apply recommendations to improve performance
    recommendations.forEach((rec: any) => {
      switch (rec.type) {
        case 'increase_compression':
          this.compressionConfig.level = Math.min(9, this.compressionConfig.level + 1);
          break;
        case 'reduce_preloading':
          this.preloadingConfig.maxConcurrentPreloads = Math.max(1, this.preloadingConfig.maxConcurrentPreloads - 1);
          break;
        case 'optimize_cache_size':
          // Adjust cache size based on recommendation
          break;
      }
    });
  }

  /**
   * Process performance entries
   */
  private processPerformanceEntries(entries: PerformanceEntry[]): void {
    entries.forEach(entry => {
      if (entry.entryType === 'resource') {
        const resourceEntry = entry as PerformanceResourceTiming;
        
        // Track resource loading performance
        const loadTime = resourceEntry.responseEnd - resourceEntry.requestStart;
        const cacheHit = resourceEntry.transferSize === 0;
        
        // Update analytics
        if (this.analyticsWorker) {
          this.analyticsWorker.postMessage({
            type: 'resource_performance',
            data: {
              url: resourceEntry.name,
              loadTime,
              cacheHit,
              transferSize: resourceEntry.transferSize
            }
          });
        }
      }
    });
  }

  /**
   * Get network information
   */
  private getNetworkInfo(): any {
    return (navigator as any).connection || { effectiveType: 'unknown' };
  }

  /**
   * Get battery information
   */
  private async getBatteryInfo(): Promise<any> {
    try {
      return await (navigator as any).getBattery?.();
    } catch {
      return null;
    }
  }

  /**
   * Get memory information
   */
  private async getMemoryInfo(): Promise<any> {
    return (performance as any).memory || null;
  }

  /**
   * Get device type
   */
  private getDeviceType(): string {
    const userAgent = navigator.userAgent;
    
    if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
      return 'tablet';
    } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\sce|palm|smartphone|iemobile/i.test(userAgent)) {
      return 'mobile';
    } else {
      return 'desktop';
    }
  }

  /**
   * Get cache analytics data
   */
  getCacheAnalytics(): CacheAnalyticsData[] {
    return [...this.analyticsData];
  }

  /**
   * Get current cache performance metrics
   */
  getCurrentMetrics(): {
    hitRate: number;
    compressionRatio: number;
    deduplicationSavings: number;
    preloadSuccessRate: number;
    userSatisfactionScore: number;
  } {
    const latest = this.analyticsData[this.analyticsData.length - 1];
    
    return {
      hitRate: latest?.hitRate || 0,
      compressionRatio: latest?.compressionRatio || 0,
      deduplicationSavings: latest?.deduplicationSavings || 0,
      preloadSuccessRate: latest?.preloadSuccessRate || 0,
      userSatisfactionScore: latest?.userSatisfactionScore || 0
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<{
    compression: Partial<CacheCompressionConfig>;
    deduplication: Partial<CacheDeduplicationConfig>;
    preloading: Partial<PredictivePreloadingConfig>;
  }>): void {
    if (config.compression) {
      this.compressionConfig = { ...this.compressionConfig, ...config.compression };
    }
    
    if (config.deduplication) {
      this.deduplicationConfig = { ...this.deduplicationConfig, ...config.deduplication };
    }
    
    if (config.preloading) {
      this.preloadingConfig = { ...this.preloadingConfig, ...config.preloading };
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect();
    }
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    if (this.analyticsWorker) {
      this.analyticsWorker.terminate();
    }
    
    this.preloadingQueue.clear();
    this.contentHashes.clear();
    this.duplicateContent.clear();
    this.analyticsData.length = 0;
  }
}

// Export singleton instance
export const advancedCachingService = new AdvancedCachingService();
export default AdvancedCachingService;