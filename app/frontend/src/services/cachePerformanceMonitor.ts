import { IntelligentSellerCache, CachePerformanceMetrics } from './intelligentSellerCache';

// Performance alert thresholds
export interface PerformanceThresholds {
  minHitRate: number;
  maxResponseTime: number;
  maxMemoryUsage: number;
  maxEvictionRate: number;
}

// Performance alert
export interface PerformanceAlert {
  type: 'hit_rate' | 'response_time' | 'memory_usage' | 'eviction_rate';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  timestamp: number;
  recommendations: string[];
}

// Cache optimization recommendation
export interface CacheOptimizationRecommendation {
  type: 'increase_ttl' | 'decrease_ttl' | 'adjust_priority' | 'increase_cache_size' | 'optimize_warming';
  description: string;
  impact: 'low' | 'medium' | 'high';
  effort: 'low' | 'medium' | 'high';
  expectedImprovement: string;
  implementation: string;
}

// Performance trend data
export interface PerformanceTrend {
  timestamp: number;
  hitRate: number;
  responseTime: number;
  memoryUsage: number;
  requestCount: number;
}

/**
 * Cache performance monitoring and optimization service
 */
export class CachePerformanceMonitor {
  private cache: IntelligentSellerCache;
  private thresholds: PerformanceThresholds;
  private alerts: PerformanceAlert[] = [];
  private trends: PerformanceTrend[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private maxTrendHistory = 288; // 24 hours of 5-minute intervals

  constructor(cache: IntelligentSellerCache, thresholds?: Partial<PerformanceThresholds>) {
    this.cache = cache;
    this.thresholds = {
      minHitRate: 70, // 70%
      maxResponseTime: 100, // 100ms
      maxMemoryUsage: 50 * 1024 * 1024, // 50MB
      maxEvictionRate: 10, // 10%
      ...thresholds
    };
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 5 * 60 * 1000): void {
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(() => {
      this.collectMetrics();
      this.analyzePerformance();
      this.cleanupOldData();
    }, intervalMs);

    console.log('[CachePerformanceMonitor] Performance monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('[CachePerformanceMonitor] Performance monitoring stopped');
  }

  /**
   * Get current performance metrics
   */
  getCurrentMetrics(): CachePerformanceMetrics {
    return this.cache.getPerformanceMetrics();
  }

  /**
   * Get performance trends
   */
  getPerformanceTrends(hours: number = 24): PerformanceTrend[] {
    const cutoffTime = Date.now() - (hours * 60 * 60 * 1000);
    return this.trends.filter(trend => trend.timestamp >= cutoffTime);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    const activeAlerts = this.alerts.filter(alert => 
      Date.now() - alert.timestamp < 60 * 60 * 1000 // Last hour
    );

    if (severity) {
      return activeAlerts.filter(alert => alert.severity === severity);
    }

    return activeAlerts;
  }

  /**
   * Get cache optimization recommendations
   */
  getOptimizationRecommendations(): CacheOptimizationRecommendation[] {
    const metrics = this.getCurrentMetrics();
    const stats = this.cache.getCacheStats();
    const recommendations: CacheOptimizationRecommendation[] = [];

    // Low hit rate recommendations
    if (metrics.hitRate < this.thresholds.minHitRate) {
      recommendations.push({
        type: 'increase_ttl',
        description: `Hit rate is ${metrics.hitRate.toFixed(1)}%, below threshold of ${this.thresholds.minHitRate}%`,
        impact: 'high',
        effort: 'low',
        expectedImprovement: 'Increase hit rate by 10-20%',
        implementation: 'Increase TTL for frequently accessed data types'
      });

      recommendations.push({
        type: 'optimize_warming',
        description: 'Improve cache warming strategies for better hit rates',
        impact: 'medium',
        effort: 'medium',
        expectedImprovement: 'Reduce cold cache misses by 30-50%',
        implementation: 'Implement predictive cache warming based on user patterns'
      });
    }

    // High response time recommendations
    if (metrics.averageResponseTime > this.thresholds.maxResponseTime) {
      recommendations.push({
        type: 'increase_cache_size',
        description: `Average response time is ${metrics.averageResponseTime.toFixed(1)}ms, above threshold`,
        impact: 'medium',
        effort: 'low',
        expectedImprovement: 'Reduce response time by 20-40%',
        implementation: 'Increase cache size to reduce evictions and improve hit rates'
      });
    }

    // High memory usage recommendations
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      recommendations.push({
        type: 'adjust_priority',
        description: `Memory usage is ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB, above threshold`,
        impact: 'medium',
        effort: 'medium',
        expectedImprovement: 'Reduce memory usage by 15-30%',
        implementation: 'Optimize cache priorities and implement more aggressive eviction for low-priority items'
      });

      recommendations.push({
        type: 'decrease_ttl',
        description: 'Reduce TTL for less frequently accessed data to free memory',
        impact: 'low',
        effort: 'low',
        expectedImprovement: 'Reduce memory usage by 10-20%',
        implementation: 'Implement dynamic TTL based on access patterns'
      });
    }

    // High eviction rate recommendations
    const evictionRate = (metrics.evictionCount / metrics.totalRequests) * 100;
    if (evictionRate > this.thresholds.maxEvictionRate) {
      recommendations.push({
        type: 'increase_cache_size',
        description: `Eviction rate is ${evictionRate.toFixed(1)}%, above threshold of ${this.thresholds.maxEvictionRate}%`,
        impact: 'high',
        effort: 'low',
        expectedImprovement: 'Reduce evictions by 50-70%',
        implementation: 'Increase cache size or implement more intelligent eviction policies'
      });
    }

    return recommendations.sort((a, b) => {
      const impactWeight = { low: 1, medium: 2, high: 3 };
      const effortWeight = { low: 3, medium: 2, high: 1 };
      
      const scoreA = impactWeight[a.impact] * effortWeight[a.effort];
      const scoreB = impactWeight[b.impact] * effortWeight[b.effort];
      
      return scoreB - scoreA; // Higher score first
    });
  }

  /**
   * Generate performance report
   */
  generatePerformanceReport(): {
    summary: {
      hitRate: number;
      averageResponseTime: number;
      memoryUsage: number;
      totalRequests: number;
      cacheSize: number;
    };
    trends: PerformanceTrend[];
    alerts: PerformanceAlert[];
    recommendations: CacheOptimizationRecommendation[];
    topPerformingKeys: Array<{ key: string; hitRate: number; accessCount: number }>;
  } {
    const metrics = this.getCurrentMetrics();
    const stats = this.cache.getCacheStats();
    const trends = this.getPerformanceTrends(24);
    const alerts = this.getActiveAlerts();
    const recommendations = this.getOptimizationRecommendations();

    return {
      summary: {
        hitRate: metrics.hitRate,
        averageResponseTime: metrics.averageResponseTime,
        memoryUsage: metrics.memoryUsage,
        totalRequests: metrics.totalRequests,
        cacheSize: stats.size
      },
      trends,
      alerts,
      recommendations,
      topPerformingKeys: stats.topUsedEntries.map(entry => ({
        key: entry.key,
        hitRate: 0, // Would need to track per-key hit rates
        accessCount: entry.accessCount
      }))
    };
  }

  /**
   * Export performance data for analysis
   */
  exportPerformanceData(): {
    metrics: CachePerformanceMetrics;
    trends: PerformanceTrend[];
    alerts: PerformanceAlert[];
    cacheStats: ReturnType<IntelligentSellerCache['getCacheStats']>;
    timestamp: number;
  } {
    return {
      metrics: this.getCurrentMetrics(),
      trends: this.trends,
      alerts: this.alerts,
      cacheStats: this.cache.getCacheStats(),
      timestamp: Date.now()
    };
  }

  /**
   * Apply optimization recommendations automatically
   */
  async applyOptimizations(recommendations: CacheOptimizationRecommendation[]): Promise<void> {
    for (const recommendation of recommendations) {
      try {
        switch (recommendation.type) {
          case 'increase_cache_size':
            // This would require cache reconfiguration
            console.log('[CachePerformanceMonitor] Cache size increase recommended');
            break;
          
          case 'optimize_warming':
            // Trigger cache warming for high-usage patterns
            await this.optimizeCacheWarming();
            break;
          
          case 'adjust_priority':
            // This would require access to cache internals
            console.log('[CachePerformanceMonitor] Priority adjustment recommended');
            break;
          
          default:
            console.log(`[CachePerformanceMonitor] Optimization type ${recommendation.type} not implemented`);
        }
      } catch (error) {
        console.error(`[CachePerformanceMonitor] Failed to apply optimization ${recommendation.type}:`, error);
      }
    }
  }

  // Private methods

  private collectMetrics(): void {
    const metrics = this.getCurrentMetrics();
    const stats = this.cache.getCacheStats();

    const trend: PerformanceTrend = {
      timestamp: Date.now(),
      hitRate: metrics.hitRate,
      responseTime: metrics.averageResponseTime,
      memoryUsage: metrics.memoryUsage,
      requestCount: metrics.totalRequests
    };

    this.trends.push(trend);

    // Keep only recent trends
    if (this.trends.length > this.maxTrendHistory) {
      this.trends = this.trends.slice(-this.maxTrendHistory);
    }
  }

  private analyzePerformance(): void {
    const metrics = this.getCurrentMetrics();
    const now = Date.now();

    // Check hit rate
    if (metrics.hitRate < this.thresholds.minHitRate) {
      this.createAlert({
        type: 'hit_rate',
        severity: metrics.hitRate < this.thresholds.minHitRate * 0.5 ? 'critical' : 'high',
        message: `Cache hit rate is ${metrics.hitRate.toFixed(1)}%, below threshold of ${this.thresholds.minHitRate}%`,
        value: metrics.hitRate,
        threshold: this.thresholds.minHitRate,
        timestamp: now,
        recommendations: [
          'Increase TTL for frequently accessed data',
          'Implement better cache warming strategies',
          'Review cache invalidation patterns'
        ]
      });
    }

    // Check response time
    if (metrics.averageResponseTime > this.thresholds.maxResponseTime) {
      this.createAlert({
        type: 'response_time',
        severity: metrics.averageResponseTime > this.thresholds.maxResponseTime * 2 ? 'critical' : 'medium',
        message: `Average response time is ${metrics.averageResponseTime.toFixed(1)}ms, above threshold of ${this.thresholds.maxResponseTime}ms`,
        value: metrics.averageResponseTime,
        threshold: this.thresholds.maxResponseTime,
        timestamp: now,
        recommendations: [
          'Increase cache size to reduce evictions',
          'Optimize data serialization',
          'Review cache access patterns'
        ]
      });
    }

    // Check memory usage
    if (metrics.memoryUsage > this.thresholds.maxMemoryUsage) {
      this.createAlert({
        type: 'memory_usage',
        severity: metrics.memoryUsage > this.thresholds.maxMemoryUsage * 1.5 ? 'critical' : 'high',
        message: `Memory usage is ${(metrics.memoryUsage / 1024 / 1024).toFixed(1)}MB, above threshold of ${(this.thresholds.maxMemoryUsage / 1024 / 1024).toFixed(1)}MB`,
        value: metrics.memoryUsage,
        threshold: this.thresholds.maxMemoryUsage,
        timestamp: now,
        recommendations: [
          'Implement more aggressive eviction policies',
          'Reduce TTL for low-priority data',
          'Optimize data structures'
        ]
      });
    }

    // Check eviction rate
    const evictionRate = (metrics.evictionCount / Math.max(metrics.totalRequests, 1)) * 100;
    if (evictionRate > this.thresholds.maxEvictionRate) {
      this.createAlert({
        type: 'eviction_rate',
        severity: evictionRate > this.thresholds.maxEvictionRate * 2 ? 'critical' : 'medium',
        message: `Eviction rate is ${evictionRate.toFixed(1)}%, above threshold of ${this.thresholds.maxEvictionRate}%`,
        value: evictionRate,
        threshold: this.thresholds.maxEvictionRate,
        timestamp: now,
        recommendations: [
          'Increase cache size',
          'Optimize cache priorities',
          'Review data access patterns'
        ]
      });
    }
  }

  private createAlert(alert: PerformanceAlert): void {
    // Avoid duplicate alerts within 5 minutes
    const recentAlert = this.alerts.find(a => 
      a.type === alert.type && 
      Date.now() - a.timestamp < 5 * 60 * 1000
    );

    if (!recentAlert) {
      this.alerts.push(alert);
      console.warn(`[CachePerformanceMonitor] ${alert.severity.toUpperCase()} Alert: ${alert.message}`);
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);

    // Trends are already limited by maxTrendHistory
  }

  private async optimizeCacheWarming(): Promise<void> {
    // This would implement intelligent cache warming based on usage patterns
    // For now, just log the optimization
    console.log('[CachePerformanceMonitor] Optimizing cache warming strategies');
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.alerts = [];
    this.trends = [];
  }
}

// Export factory function
export const createCachePerformanceMonitor = (
  cache: IntelligentSellerCache, 
  thresholds?: Partial<PerformanceThresholds>
): CachePerformanceMonitor => {
  return new CachePerformanceMonitor(cache, thresholds);
};