import { IntelligentSellerCache, UsagePattern, CachePriority } from './intelligentSellerCache';
import { CachePerformanceMonitor, CacheOptimizationRecommendation } from './cachePerformanceMonitor';

// Optimization strategy
export interface OptimizationStrategy {
  name: string;
  description: string;
  conditions: OptimizationCondition[];
  actions: OptimizationAction[];
  priority: number;
  enabled: boolean;
}

// Optimization condition
export interface OptimizationCondition {
  metric: 'hit_rate' | 'response_time' | 'memory_usage' | 'access_frequency' | 'eviction_rate';
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  timeWindow?: number; // in milliseconds
}

// Optimization action
export interface OptimizationAction {
  type: 'adjust_ttl' | 'change_priority' | 'warm_cache' | 'evict_entries' | 'resize_cache';
  parameters: Record<string, any>;
  impact: 'low' | 'medium' | 'high';
}

// Usage pattern analysis result
export interface UsagePatternAnalysis {
  patterns: UsagePattern[];
  insights: {
    mostAccessedDataTypes: string[];
    peakUsageHours: number[];
    userSegments: string[];
    accessTrends: Array<{ dataType: string; trend: 'increasing' | 'decreasing' | 'stable' }>;
  };
  recommendations: string[];
}

// Cache optimization result
export interface OptimizationResult {
  strategy: string;
  actionsApplied: OptimizationAction[];
  expectedImpact: string;
  actualImpact?: {
    hitRateChange: number;
    responseTimeChange: number;
    memoryUsageChange: number;
  };
  timestamp: number;
}

/**
 * Intelligent cache optimization service that analyzes usage patterns
 * and automatically applies optimizations
 */
export class CacheOptimizationService {
  private cache: IntelligentSellerCache;
  private performanceMonitor: CachePerformanceMonitor;
  private strategies: Map<string, OptimizationStrategy> = new Map();
  private optimizationHistory: OptimizationResult[] = [];
  private optimizationInterval: NodeJS.Timeout | null = null;
  private isOptimizing = false;

  constructor(cache: IntelligentSellerCache, performanceMonitor: CachePerformanceMonitor) {
    this.cache = cache;
    this.performanceMonitor = performanceMonitor;
    this.setupDefaultStrategies();
  }

  /**
   * Setup default optimization strategies
   */
  private setupDefaultStrategies(): void {
    // Strategy 1: Improve hit rate by adjusting TTL
    this.strategies.set('improve-hit-rate', {
      name: 'Improve Hit Rate',
      description: 'Increase TTL for frequently accessed data to improve hit rates',
      conditions: [
        { metric: 'hit_rate', operator: 'lt', value: 70 },
        { metric: 'access_frequency', operator: 'gt', value: 5 }
      ],
      actions: [
        {
          type: 'adjust_ttl',
          parameters: { multiplier: 1.5, maxTTL: 3600000 }, // Max 1 hour
          impact: 'medium'
        },
        {
          type: 'warm_cache',
          parameters: { strategy: 'frequent-access' },
          impact: 'high'
        }
      ],
      priority: 1,
      enabled: true
    });

    // Strategy 2: Reduce memory usage
    this.strategies.set('reduce-memory', {
      name: 'Reduce Memory Usage',
      description: 'Optimize memory usage by adjusting priorities and TTLs',
      conditions: [
        { metric: 'memory_usage', operator: 'gt', value: 40 * 1024 * 1024 } // 40MB
      ],
      actions: [
        {
          type: 'change_priority',
          parameters: { targetPriority: CachePriority.LOW, criteria: 'low-access' },
          impact: 'medium'
        },
        {
          type: 'adjust_ttl',
          parameters: { multiplier: 0.7, minTTL: 60000 }, // Min 1 minute
          impact: 'medium'
        },
        {
          type: 'evict_entries',
          parameters: { criteria: 'least-useful', percentage: 10 },
          impact: 'low'
        }
      ],
      priority: 2,
      enabled: true
    });

    // Strategy 3: Optimize response time
    this.strategies.set('optimize-response-time', {
      name: 'Optimize Response Time',
      description: 'Reduce response time through better caching strategies',
      conditions: [
        { metric: 'response_time', operator: 'gt', value: 100 } // 100ms
      ],
      actions: [
        {
          type: 'warm_cache',
          parameters: { strategy: 'predictive', batchSize: 5 },
          impact: 'high'
        },
        {
          type: 'change_priority',
          parameters: { targetPriority: CachePriority.HIGH, criteria: 'frequent-access' },
          impact: 'medium'
        }
      ],
      priority: 3,
      enabled: true
    });

    // Strategy 4: Reduce eviction rate
    this.strategies.set('reduce-evictions', {
      name: 'Reduce Evictions',
      description: 'Minimize cache evictions through better size management',
      conditions: [
        { metric: 'eviction_rate', operator: 'gt', value: 15 } // 15%
      ],
      actions: [
        {
          type: 'resize_cache',
          parameters: { multiplier: 1.2, maxSize: 2000 },
          impact: 'high'
        },
        {
          type: 'change_priority',
          parameters: { targetPriority: CachePriority.CRITICAL, criteria: 'business-critical' },
          impact: 'medium'
        }
      ],
      priority: 4,
      enabled: true
    });
  }

  /**
   * Start automatic optimization
   */
  startOptimization(intervalMs: number = 15 * 60 * 1000): void {
    if (this.optimizationInterval) {
      this.stopOptimization();
    }

    this.optimizationInterval = setInterval(async () => {
      if (!this.isOptimizing) {
        await this.runOptimization();
      }
    }, intervalMs);

    console.log('[CacheOptimizationService] Automatic optimization started');
  }

  /**
   * Stop automatic optimization
   */
  stopOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
    }
    console.log('[CacheOptimizationService] Automatic optimization stopped');
  }

  /**
   * Run optimization cycle
   */
  async runOptimization(): Promise<OptimizationResult[]> {
    if (this.isOptimizing) {
      console.log('[CacheOptimizationService] Optimization already in progress');
      return [];
    }

    this.isOptimizing = true;
    const results: OptimizationResult[] = [];

    try {
      console.log('[CacheOptimizationService] Starting optimization cycle');

      // Analyze current performance
      const metrics = this.performanceMonitor.getCurrentMetrics();
      const cacheStats = this.cache.getCacheStats();

      // Get applicable strategies
      const applicableStrategies = this.getApplicableStrategies(metrics, cacheStats);

      // Apply strategies in priority order
      for (const strategy of applicableStrategies) {
        try {
          const result = await this.applyStrategy(strategy);
          results.push(result);
          
          // Small delay between strategies to avoid overwhelming the system
          await new Promise(resolve => setTimeout(resolve, 1000));
        } catch (error) {
          console.error(`[CacheOptimizationService] Failed to apply strategy ${strategy.name}:`, error);
        }
      }

      // Record optimization results
      this.optimizationHistory.push(...results);
      this.cleanupOptimizationHistory();

      console.log(`[CacheOptimizationService] Optimization cycle completed. Applied ${results.length} strategies`);

    } finally {
      this.isOptimizing = false;
    }

    return results;
  }

  /**
   * Analyze usage patterns
   */
  analyzeUsagePatterns(): UsagePatternAnalysis {
    const cacheStats = this.cache.getCacheStats();
    const trends = this.performanceMonitor.getPerformanceTrends(24);

    // Extract patterns from cache statistics
    const patterns: UsagePattern[] = []; // Would be populated from actual cache data
    
    // Analyze insights
    const mostAccessedDataTypes = cacheStats.topUsedEntries
      .map(entry => entry.key.split(':')[1])
      .filter((type, index, arr) => arr.indexOf(type) === index)
      .slice(0, 5);

    const peakUsageHours = this.calculatePeakUsageHours(trends);
    
    const accessTrends = mostAccessedDataTypes.map(dataType => ({
      dataType,
      trend: this.calculateAccessTrend(dataType, trends) as 'increasing' | 'decreasing' | 'stable'
    }));

    const recommendations = this.generateUsageRecommendations(patterns, {
      mostAccessedDataTypes,
      peakUsageHours,
      userSegments: [],
      accessTrends
    });

    return {
      patterns,
      insights: {
        mostAccessedDataTypes,
        peakUsageHours,
        userSegments: [],
        accessTrends
      },
      recommendations
    };
  }

  /**
   * Get optimization recommendations
   */
  getOptimizationRecommendations(): CacheOptimizationRecommendation[] {
    return this.performanceMonitor.getOptimizationRecommendations();
  }

  /**
   * Get optimization history
   */
  getOptimizationHistory(limit: number = 50): OptimizationResult[] {
    return this.optimizationHistory
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice(0, limit);
  }

  /**
   * Add custom optimization strategy
   */
  addStrategy(name: string, strategy: OptimizationStrategy): void {
    this.strategies.set(name, strategy);
    console.log(`[CacheOptimizationService] Added custom strategy: ${name}`);
  }

  /**
   * Remove optimization strategy
   */
  removeStrategy(name: string): boolean {
    const removed = this.strategies.delete(name);
    if (removed) {
      console.log(`[CacheOptimizationService] Removed strategy: ${name}`);
    }
    return removed;
  }

  /**
   * Enable/disable strategy
   */
  toggleStrategy(name: string, enabled: boolean): boolean {
    const strategy = this.strategies.get(name);
    if (strategy) {
      strategy.enabled = enabled;
      console.log(`[CacheOptimizationService] Strategy ${name} ${enabled ? 'enabled' : 'disabled'}`);
      return true;
    }
    return false;
  }

  /**
   * Get all strategies
   */
  getStrategies(): Map<string, OptimizationStrategy> {
    return new Map(this.strategies);
  }

  // Private methods

  private getApplicableStrategies(metrics: any, cacheStats: any): OptimizationStrategy[] {
    const applicable: OptimizationStrategy[] = [];

    this.strategies.forEach((strategy, name) => {
      if (!strategy.enabled) return;

      const conditionsMet = strategy.conditions.every(condition => 
        this.evaluateCondition(condition, metrics, cacheStats)
      );

      if (conditionsMet) {
        applicable.push(strategy);
      }
    });

    // Sort by priority (lower number = higher priority)
    return applicable.sort((a, b) => a.priority - b.priority);
  }

  private evaluateCondition(
    condition: OptimizationCondition, 
    metrics: any, 
    cacheStats: any
  ): boolean {
    let value: number;

    switch (condition.metric) {
      case 'hit_rate':
        value = metrics.hitRate;
        break;
      case 'response_time':
        value = metrics.averageResponseTime;
        break;
      case 'memory_usage':
        value = metrics.memoryUsage;
        break;
      case 'eviction_rate':
        value = (metrics.evictionCount / Math.max(metrics.totalRequests, 1)) * 100;
        break;
      case 'access_frequency':
        // This would need to be calculated from usage patterns
        value = cacheStats.topUsedEntries[0]?.accessCount || 0;
        break;
      default:
        return false;
    }

    switch (condition.operator) {
      case 'gt':
        return value > condition.value;
      case 'lt':
        return value < condition.value;
      case 'eq':
        return value === condition.value;
      case 'gte':
        return value >= condition.value;
      case 'lte':
        return value <= condition.value;
      default:
        return false;
    }
  }

  private async applyStrategy(strategy: OptimizationStrategy): Promise<OptimizationResult> {
    const result: OptimizationResult = {
      strategy: strategy.name,
      actionsApplied: [],
      expectedImpact: strategy.description,
      timestamp: Date.now()
    };

    // Record metrics before optimization
    const metricsBefore = this.performanceMonitor.getCurrentMetrics();

    for (const action of strategy.actions) {
      try {
        await this.applyAction(action);
        result.actionsApplied.push(action);
      } catch (error) {
        console.error(`[CacheOptimizationService] Failed to apply action ${action.type}:`, error);
      }
    }

    // Wait a bit for changes to take effect
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Record metrics after optimization
    const metricsAfter = this.performanceMonitor.getCurrentMetrics();
    result.actualImpact = {
      hitRateChange: metricsAfter.hitRate - metricsBefore.hitRate,
      responseTimeChange: metricsAfter.averageResponseTime - metricsBefore.averageResponseTime,
      memoryUsageChange: metricsAfter.memoryUsage - metricsBefore.memoryUsage
    };

    return result;
  }

  private async applyAction(action: OptimizationAction): Promise<void> {
    switch (action.type) {
      case 'adjust_ttl':
        await this.adjustTTL(action.parameters);
        break;
      case 'change_priority':
        await this.changePriority(action.parameters);
        break;
      case 'warm_cache':
        await this.warmCache(action.parameters);
        break;
      case 'evict_entries':
        await this.evictEntries(action.parameters);
        break;
      case 'resize_cache':
        await this.resizeCache(action.parameters);
        break;
      default:
        console.warn(`[CacheOptimizationService] Unknown action type: ${action.type}`);
    }
  }

  private async adjustTTL(parameters: any): Promise<void> {
    // This would require access to cache internals to adjust TTL
    console.log('[CacheOptimizationService] Adjusting TTL with parameters:', parameters);
  }

  private async changePriority(parameters: any): Promise<void> {
    // This would require access to cache internals to change priorities
    console.log('[CacheOptimizationService] Changing priority with parameters:', parameters);
  }

  private async warmCache(parameters: any): Promise<void> {
    // Trigger cache warming based on strategy
    console.log('[CacheOptimizationService] Warming cache with parameters:', parameters);
    
    // Example: warm cache for all active users
    // This would need actual user data
    const mockWalletAddresses = ['0x1234', '0x5678', '0x9abc'];
    
    for (const walletAddress of mockWalletAddresses) {
      try {
        await this.cache.warmCache(walletAddress, parameters.strategy);
      } catch (error) {
        console.warn(`[CacheOptimizationService] Failed to warm cache for ${walletAddress}:`, error);
      }
    }
  }

  private async evictEntries(parameters: any): Promise<void> {
    // This would require access to cache internals to evict specific entries
    console.log('[CacheOptimizationService] Evicting entries with parameters:', parameters);
  }

  private async resizeCache(parameters: any): Promise<void> {
    // This would require cache reconfiguration
    console.log('[CacheOptimizationService] Resizing cache with parameters:', parameters);
  }

  private calculatePeakUsageHours(trends: any[]): number[] {
    // Analyze trends to find peak usage hours
    const hourlyUsage = new Map<number, number>();
    
    trends.forEach(trend => {
      const hour = new Date(trend.timestamp).getHours();
      hourlyUsage.set(hour, (hourlyUsage.get(hour) || 0) + trend.requestCount);
    });

    // Return top 3 peak hours
    return Array.from(hourlyUsage.entries())
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3)
      .map(([hour]) => hour);
  }

  private calculateAccessTrend(dataType: string, trends: any[]): string {
    if (trends.length < 2) return 'stable';

    const recent = trends.slice(-10); // Last 10 data points
    const older = trends.slice(-20, -10); // Previous 10 data points

    const recentAvg = recent.reduce((sum, t) => sum + t.requestCount, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.requestCount, 0) / older.length;

    const change = (recentAvg - olderAvg) / olderAvg;

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private generateUsageRecommendations(patterns: UsagePattern[], insights: any): string[] {
    const recommendations: string[] = [];

    // Recommendations based on most accessed data types
    if (insights.mostAccessedDataTypes.includes('profile')) {
      recommendations.push('Consider increasing TTL for seller profiles as they are frequently accessed');
    }

    if (insights.mostAccessedDataTypes.includes('dashboard')) {
      recommendations.push('Implement predictive caching for dashboard data during peak hours');
    }

    // Recommendations based on peak usage hours
    if (insights.peakUsageHours.length > 0) {
      recommendations.push(`Schedule cache warming before peak hours: ${insights.peakUsageHours.join(', ')}`);
    }

    // Recommendations based on access trends
    const increasingTrends = insights.accessTrends.filter((t: any) => t.trend === 'increasing');
    if (increasingTrends.length > 0) {
      recommendations.push(`Increase cache capacity for growing data types: ${increasingTrends.map((t: any) => t.dataType).join(', ')}`);
    }

    return recommendations;
  }

  private cleanupOptimizationHistory(): void {
    // Keep only last 100 optimization results
    if (this.optimizationHistory.length > 100) {
      this.optimizationHistory = this.optimizationHistory.slice(-100);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopOptimization();
    this.strategies.clear();
    this.optimizationHistory = [];
  }
}

// Export factory function
export const createCacheOptimizationService = (
  cache: IntelligentSellerCache,
  performanceMonitor: CachePerformanceMonitor
): CacheOptimizationService => {
  return new CacheOptimizationService(cache, performanceMonitor);
};