/**
 * Cache Performance Metrics and Monitoring Service
 * Implements comprehensive performance tracking for service worker cache enhancement
 */

export interface CacheHitMissMetrics {
  hits: number;
  misses: number;
  ratio: number;
  totalRequests: number;
  lastUpdated: number;
}

export interface StorageUsageMetrics {
  used: number;
  available: number;
  percentage: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  lastCleanup: number;
  estimatedTimeToFull: number | null;
}

export interface SyncQueueMetrics {
  queueSize: number;
  successRate: number;
  averageRetryCount: number;
  totalProcessed: number;
  failedActions: number;
  averageProcessingTime: number;
  lastSyncTime: number;
}

export interface PreloadEffectivenessMetrics {
  successRate: number;
  averageLoadTime: number;
  bandwidthSaved: number;
  totalPreloads: number;
  hitFromPreload: number;
  wastedPreloads: number;
  networkConditionImpact: Record<string, number>;
}

export interface CacheStrategyMetrics {
  networkFirst: CacheHitMissMetrics;
  cacheFirst: CacheHitMissMetrics;
  staleWhileRevalidate: CacheHitMissMetrics;
  averageResponseTime: Record<string, number>;
  errorRates: Record<string, number>;
}

export interface CachePerformanceSnapshot {
  timestamp: number;
  hitRates: Record<string, CacheHitMissMetrics>;
  storage: StorageUsageMetrics;
  sync: SyncQueueMetrics;
  preload: PreloadEffectivenessMetrics;
  strategies: CacheStrategyMetrics;
  userExperience: {
    offlineCapability: number;
    loadTimeImprovement: number;
    dataUsageReduction: number;
  };
}

export interface PerformanceTrend {
  timeRange: '1h' | '6h' | '24h' | '7d';
  snapshots: CachePerformanceSnapshot[];
  analysis: {
    hitRateChange: number;
    storageGrowthRate: number;
    syncReliability: number;
    preloadEfficiency: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'hit_rate_low' | 'storage_full' | 'sync_failing' | 'preload_ineffective';
  severity: 'info' | 'warning' | 'error' | 'critical';
  message: string;
  timestamp: number;
  metrics: any;
  recommendations: string[];
  autoResolve: boolean;
}

export class CachePerformanceMetricsService {
  private readonly STORAGE_KEY = 'cache-performance-metrics';
  private readonly MAX_SNAPSHOTS = 1000;
  private readonly ALERT_THRESHOLDS = {
    minHitRate: 0.7, // 70%
    maxStorageUsage: 0.85, // 85%
    minSyncSuccessRate: 0.9, // 90%
    minPreloadSuccessRate: 0.6, // 60%
  };

  private snapshots: CachePerformanceSnapshot[] = [];
  private alerts: PerformanceAlert[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isInitialized = false;

  // Metrics tracking
  private cacheMetrics: Record<string, CacheHitMissMetrics> = {};
  private storageMetrics: StorageUsageMetrics = {
    used: 0,
    available: 0,
    percentage: 0,
    trend: 'stable',
    lastCleanup: 0,
    estimatedTimeToFull: null,
  };
  private syncMetrics: SyncQueueMetrics = {
    queueSize: 0,
    successRate: 1,
    averageRetryCount: 0,
    totalProcessed: 0,
    failedActions: 0,
    averageProcessingTime: 0,
    lastSyncTime: 0,
  };
  private preloadMetrics: PreloadEffectivenessMetrics = {
    successRate: 1,
    averageLoadTime: 0,
    bandwidthSaved: 0,
    totalPreloads: 0,
    hitFromPreload: 0,
    wastedPreloads: 0,
    networkConditionImpact: {},
  };

  /**
   * Initialize the performance metrics service
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Load existing metrics from storage
      await this.loadMetricsFromStorage();
      
      // Only initialize cache metrics if we don't have any existing data
      if (Object.keys(this.cacheMetrics).length === 0) {
        this.initializeCacheMetrics();
      }
      
      // Don't start monitoring automatically - let caller decide
      // this.startMonitoring();
      
      this.isInitialized = true;
      console.log('[CachePerformanceMetrics] Service initialized successfully');
    } catch (error) {
      console.error('[CachePerformanceMetrics] Failed to initialize:', error);
    }
  }

  /**
   * Start performance monitoring
   */
  startMonitoring(intervalMs: number = 60000): void { // 1 minute intervals
    if (this.monitoringInterval) {
      this.stopMonitoring();
    }

    this.monitoringInterval = setInterval(async () => {
      await this.collectMetrics();
      this.analyzePerformance();
      this.cleanupOldData();
    }, intervalMs);

    console.log('[CachePerformanceMetrics] Monitoring started');
  }

  /**
   * Stop performance monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('[CachePerformanceMetrics] Monitoring stopped');
  }

  /**
   * Record cache hit for specific cache type
   */
  recordCacheHit(cacheType: string): void {
    if (!this.cacheMetrics[cacheType]) {
      this.initializeCacheType(cacheType);
    }

    const metrics = this.cacheMetrics[cacheType];
    metrics.hits++;
    metrics.totalRequests++;
    metrics.ratio = metrics.hits / metrics.totalRequests;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Record cache miss for specific cache type
   */
  recordCacheMiss(cacheType: string): void {
    if (!this.cacheMetrics[cacheType]) {
      this.initializeCacheType(cacheType);
    }

    const metrics = this.cacheMetrics[cacheType];
    metrics.misses++;
    metrics.totalRequests++;
    metrics.ratio = metrics.hits / metrics.totalRequests;
    metrics.lastUpdated = Date.now();
  }

  /**
   * Record sync queue operation
   */
  recordSyncOperation(success: boolean, retryCount: number, processingTime: number): void {
    this.syncMetrics.totalProcessed++;
    this.syncMetrics.averageRetryCount = 
      (this.syncMetrics.averageRetryCount * (this.syncMetrics.totalProcessed - 1) + retryCount) / 
      this.syncMetrics.totalProcessed;
    
    this.syncMetrics.averageProcessingTime = 
      (this.syncMetrics.averageProcessingTime * (this.syncMetrics.totalProcessed - 1) + processingTime) / 
      this.syncMetrics.totalProcessed;

    if (success) {
      this.syncMetrics.successRate = 
        (this.syncMetrics.successRate * (this.syncMetrics.totalProcessed - 1) + 1) / 
        this.syncMetrics.totalProcessed;
    } else {
      this.syncMetrics.failedActions++;
      this.syncMetrics.successRate = 
        (this.syncMetrics.successRate * (this.syncMetrics.totalProcessed - 1)) / 
        this.syncMetrics.totalProcessed;
    }

    this.syncMetrics.lastSyncTime = Date.now();
  }

  /**
   * Record preload operation
   */
  recordPreloadOperation(
    success: boolean, 
    loadTime: number, 
    wasUsed: boolean, 
    networkCondition: string,
    bytesSaved?: number
  ): void {
    this.preloadMetrics.totalPreloads++;
    
    if (success) {
      this.preloadMetrics.successRate = 
        (this.preloadMetrics.successRate * (this.preloadMetrics.totalPreloads - 1) + 1) / 
        this.preloadMetrics.totalPreloads;
      
      this.preloadMetrics.averageLoadTime = 
        (this.preloadMetrics.averageLoadTime * (this.preloadMetrics.totalPreloads - 1) + loadTime) / 
        this.preloadMetrics.totalPreloads;

      if (wasUsed) {
        this.preloadMetrics.hitFromPreload++;
        if (bytesSaved) {
          this.preloadMetrics.bandwidthSaved += bytesSaved;
        }
      } else {
        this.preloadMetrics.wastedPreloads++;
      }
    } else {
      this.preloadMetrics.successRate = 
        (this.preloadMetrics.successRate * (this.preloadMetrics.totalPreloads - 1)) / 
        this.preloadMetrics.totalPreloads;
    }

    // Track network condition impact
    if (!this.preloadMetrics.networkConditionImpact[networkCondition]) {
      this.preloadMetrics.networkConditionImpact[networkCondition] = 0;
    }
    this.preloadMetrics.networkConditionImpact[networkCondition]++;
  }

  /**
   * Update sync queue size
   */
  updateSyncQueueSize(size: number): void {
    this.syncMetrics.queueSize = size;
  }

  /**
   * Get current performance snapshot
   */
  getCurrentSnapshot(): CachePerformanceSnapshot {
    return {
      timestamp: Date.now(),
      hitRates: { ...this.cacheMetrics },
      storage: { ...this.storageMetrics },
      sync: { ...this.syncMetrics },
      preload: { ...this.preloadMetrics },
      strategies: this.calculateStrategyMetrics(),
      userExperience: this.calculateUserExperienceMetrics(),
    };
  }

  /**
   * Get performance trends for specified time range
   */
  getPerformanceTrends(timeRange: '1h' | '6h' | '24h' | '7d'): PerformanceTrend {
    const now = Date.now();
    const timeRangeMs = this.getTimeRangeMs(timeRange);
    const cutoffTime = now - timeRangeMs;

    const relevantSnapshots = this.snapshots.filter(
      snapshot => snapshot.timestamp >= cutoffTime
    );

    return {
      timeRange,
      snapshots: relevantSnapshots,
      analysis: this.analyzeTrends(relevantSnapshots),
    };
  }

  /**
   * Get active performance alerts
   */
  getActiveAlerts(severity?: PerformanceAlert['severity']): PerformanceAlert[] {
    const activeAlerts = this.alerts.filter(alert => {
      const isRecent = Date.now() - alert.timestamp < 3600000; // 1 hour
      return isRecent && (!severity || alert.severity === severity);
    });

    return activeAlerts.sort((a, b) => {
      const severityOrder = { critical: 4, error: 3, warning: 2, info: 1 };
      return severityOrder[b.severity] - severityOrder[a.severity];
    });
  }

  /**
   * Get comprehensive performance report
   */
  getPerformanceReport(): {
    summary: CachePerformanceSnapshot;
    trends: Record<string, PerformanceTrend>;
    alerts: PerformanceAlert[];
    recommendations: string[];
    healthScore: number;
  } {
    const summary = this.getCurrentSnapshot();
    const trends = {
      '1h': this.getPerformanceTrends('1h'),
      '6h': this.getPerformanceTrends('6h'),
      '24h': this.getPerformanceTrends('24h'),
      '7d': this.getPerformanceTrends('7d'),
    };
    const alerts = this.getActiveAlerts();
    const recommendations = this.generateRecommendations(summary, trends['24h']);
    const healthScore = this.calculateHealthScore(summary);

    return {
      summary,
      trends,
      alerts,
      recommendations,
      healthScore,
    };
  }

  /**
   * Export metrics data for analysis
   */
  exportMetricsData(): {
    snapshots: CachePerformanceSnapshot[];
    alerts: PerformanceAlert[];
    configuration: {
      minHitRate: number;
      maxStorageUsage: number;
      minSyncSuccessRate: number;
      minPreloadSuccessRate: number;
    };
    exportTimestamp: number;
  } {
    return {
      snapshots: this.snapshots,
      alerts: this.alerts,
      configuration: this.ALERT_THRESHOLDS,
      exportTimestamp: Date.now(),
    };
  }

  /**
   * Clear all metrics data
   */
  async clearMetricsData(): Promise<void> {
    this.snapshots = [];
    this.alerts = [];
    this.cacheMetrics = {};
    this.initializeCacheMetrics();
    await this.saveMetricsToStorage();
    console.log('[CachePerformanceMetrics] All metrics data cleared');
  }

  // Private methods

  private initializeCacheMetrics(): void {
    const cacheTypes = ['feed', 'communities', 'marketplace', 'messaging', 'static', 'images'];
    
    for (const type of cacheTypes) {
      if (!this.cacheMetrics[type]) {
        this.initializeCacheType(type);
      }
    }
  }

  private initializeCacheType(cacheType: string): void {
    if (!this.cacheMetrics[cacheType]) {
      this.cacheMetrics[cacheType] = {
        hits: 0,
        misses: 0,
        ratio: 0,
        totalRequests: 0,
        lastUpdated: Date.now(),
      };
    }
  }

  private async collectMetrics(): Promise<void> {
    try {
      // Update storage metrics
      await this.updateStorageMetrics();
      
      // Create and store snapshot
      const snapshot = this.getCurrentSnapshot();
      this.snapshots.push(snapshot);
      
      // Limit snapshots to prevent memory issues
      if (this.snapshots.length > this.MAX_SNAPSHOTS) {
        this.snapshots = this.snapshots.slice(-this.MAX_SNAPSHOTS);
      }
      
      // Save to storage periodically
      if (this.snapshots.length % 10 === 0) {
        await this.saveMetricsToStorage();
      }
    } catch (error) {
      console.error('[CachePerformanceMetrics] Failed to collect metrics:', error);
    }
  }

  private async updateStorageMetrics(): Promise<void> {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate();
        const previousUsage = this.storageMetrics.used;
        
        this.storageMetrics.used = estimate.usage || 0;
        this.storageMetrics.available = estimate.quota || 0;
        this.storageMetrics.percentage = 
          this.storageMetrics.available > 0 
            ? (this.storageMetrics.used / this.storageMetrics.available) * 100 
            : 0;

        // Calculate trend
        if (previousUsage > 0) {
          const usageChange = this.storageMetrics.used - previousUsage;
          if (Math.abs(usageChange) < 1024 * 1024) { // Less than 1MB change
            this.storageMetrics.trend = 'stable';
          } else if (usageChange > 0) {
            this.storageMetrics.trend = 'increasing';
          } else {
            this.storageMetrics.trend = 'decreasing';
          }
        }

        // Estimate time to full (if increasing)
        if (this.storageMetrics.trend === 'increasing' && this.snapshots.length > 10) {
          const recentSnapshots = this.snapshots.slice(-10);
          const growthRate = this.calculateStorageGrowthRate(recentSnapshots);
          const remainingSpace = this.storageMetrics.available - this.storageMetrics.used;
          
          if (growthRate > 0) {
            this.storageMetrics.estimatedTimeToFull = remainingSpace / growthRate;
          }
        } else {
          this.storageMetrics.estimatedTimeToFull = null;
        }
      } catch (error) {
        console.warn('[CachePerformanceMetrics] Failed to update storage metrics:', error);
      }
    }
  }

  private calculateStorageGrowthRate(snapshots: CachePerformanceSnapshot[]): number {
    if (snapshots.length < 2) return 0;

    const oldest = snapshots[0];
    const newest = snapshots[snapshots.length - 1];
    const timeDiff = newest.timestamp - oldest.timestamp;
    const usageDiff = newest.storage.used - oldest.storage.used;

    return timeDiff > 0 ? usageDiff / timeDiff : 0;
  }

  private calculateStrategyMetrics(): CacheStrategyMetrics {
    // This would be populated by actual strategy usage data
    return {
      networkFirst: this.cacheMetrics['networkFirst'] || this.getEmptyMetrics(),
      cacheFirst: this.cacheMetrics['cacheFirst'] || this.getEmptyMetrics(),
      staleWhileRevalidate: this.cacheMetrics['staleWhileRevalidate'] || this.getEmptyMetrics(),
      averageResponseTime: {
        networkFirst: 150,
        cacheFirst: 50,
        staleWhileRevalidate: 75,
      },
      errorRates: {
        networkFirst: 0.02,
        cacheFirst: 0.01,
        staleWhileRevalidate: 0.015,
      },
    };
  }

  private calculateUserExperienceMetrics(): CachePerformanceSnapshot['userExperience'] {
    const overallHitRate = this.calculateOverallHitRate();
    const preloadEffectiveness = this.preloadMetrics.hitFromPreload / Math.max(this.preloadMetrics.totalPreloads, 1);
    
    return {
      offlineCapability: overallHitRate * 100,
      loadTimeImprovement: Math.min(overallHitRate * 60, 60), // Up to 60% improvement
      dataUsageReduction: (this.preloadMetrics.bandwidthSaved / (1024 * 1024)), // MB saved
    };
  }

  private calculateOverallHitRate(): number {
    const totalHits = Object.values(this.cacheMetrics).reduce((sum, metrics) => sum + metrics.hits, 0);
    const totalRequests = Object.values(this.cacheMetrics).reduce((sum, metrics) => sum + metrics.totalRequests, 0);
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  private getEmptyMetrics(): CacheHitMissMetrics {
    return {
      hits: 0,
      misses: 0,
      ratio: 0,
      totalRequests: 0,
      lastUpdated: Date.now(),
    };
  }

  private analyzePerformance(): void {
    const snapshot = this.getCurrentSnapshot();
    
    // Check hit rate alerts
    const overallHitRate = this.calculateOverallHitRate();
    if (overallHitRate < this.ALERT_THRESHOLDS.minHitRate) {
      this.createAlert({
        type: 'hit_rate_low',
        severity: overallHitRate < 0.5 ? 'critical' : 'warning',
        message: `Cache hit rate is ${(overallHitRate * 100).toFixed(1)}%, below threshold of ${(this.ALERT_THRESHOLDS.minHitRate * 100).toFixed(1)}%`,
        metrics: { hitRate: overallHitRate, threshold: this.ALERT_THRESHOLDS.minHitRate },
        recommendations: [
          'Review cache TTL settings',
          'Implement better preloading strategies',
          'Check for excessive cache invalidation',
        ],
      });
    }

    // Check storage alerts
    if (snapshot.storage.percentage > this.ALERT_THRESHOLDS.maxStorageUsage * 100) {
      this.createAlert({
        type: 'storage_full',
        severity: snapshot.storage.percentage > 95 ? 'critical' : 'error',
        message: `Storage usage is ${snapshot.storage.percentage.toFixed(1)}%, above threshold of ${(this.ALERT_THRESHOLDS.maxStorageUsage * 100).toFixed(1)}%`,
        metrics: { usage: snapshot.storage.percentage, threshold: this.ALERT_THRESHOLDS.maxStorageUsage * 100 },
        recommendations: [
          'Run cache cleanup',
          'Reduce cache TTL for less important data',
          'Implement more aggressive eviction policies',
        ],
      });
    }

    // Check sync alerts
    if (snapshot.sync.successRate < this.ALERT_THRESHOLDS.minSyncSuccessRate) {
      this.createAlert({
        type: 'sync_failing',
        severity: snapshot.sync.successRate < 0.7 ? 'critical' : 'error',
        message: `Sync success rate is ${(snapshot.sync.successRate * 100).toFixed(1)}%, below threshold of ${(this.ALERT_THRESHOLDS.minSyncSuccessRate * 100).toFixed(1)}%`,
        metrics: { successRate: snapshot.sync.successRate, threshold: this.ALERT_THRESHOLDS.minSyncSuccessRate },
        recommendations: [
          'Check network connectivity',
          'Review retry logic',
          'Investigate server-side issues',
        ],
      });
    }

    // Check preload alerts
    if (snapshot.preload.successRate < this.ALERT_THRESHOLDS.minPreloadSuccessRate) {
      this.createAlert({
        type: 'preload_ineffective',
        severity: 'warning',
        message: `Preload success rate is ${(snapshot.preload.successRate * 100).toFixed(1)}%, below threshold of ${(this.ALERT_THRESHOLDS.minPreloadSuccessRate * 100).toFixed(1)}%`,
        metrics: { successRate: snapshot.preload.successRate, threshold: this.ALERT_THRESHOLDS.minPreloadSuccessRate },
        recommendations: [
          'Optimize preload timing',
          'Review preload selection criteria',
          'Consider network conditions in preload decisions',
        ],
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'autoResolve'>): void {
    // Check for duplicate alerts in the last 5 minutes
    const recentAlert = this.alerts.find(alert => 
      alert.type === alertData.type && 
      Date.now() - alert.timestamp < 300000 // 5 minutes
    );

    if (!recentAlert) {
      const alert: PerformanceAlert = {
        id: `${alertData.type}-${Date.now()}`,
        timestamp: Date.now(),
        autoResolve: true,
        ...alertData,
      };

      this.alerts.push(alert);
      console.warn(`[CachePerformanceMetrics] ${alert.severity.toUpperCase()}: ${alert.message}`);
    }
  }

  private analyzeTrends(snapshots: CachePerformanceSnapshot[]): PerformanceTrend['analysis'] {
    if (snapshots.length < 2) {
      return {
        hitRateChange: 0,
        storageGrowthRate: 0,
        syncReliability: 1,
        preloadEfficiency: 1,
      };
    }

    const oldest = snapshots[0];
    const newest = snapshots[snapshots.length - 1];

    const oldestHitRate = this.calculateSnapshotHitRate(oldest);
    const newestHitRate = this.calculateSnapshotHitRate(newest);

    return {
      hitRateChange: newestHitRate - oldestHitRate,
      storageGrowthRate: this.calculateStorageGrowthRate(snapshots),
      syncReliability: newest.sync.successRate,
      preloadEfficiency: newest.preload.successRate,
    };
  }

  private calculateSnapshotHitRate(snapshot: CachePerformanceSnapshot): number {
    const totalHits = Object.values(snapshot.hitRates).reduce((sum, metrics) => sum + metrics.hits, 0);
    const totalRequests = Object.values(snapshot.hitRates).reduce((sum, metrics) => sum + metrics.totalRequests, 0);
    
    return totalRequests > 0 ? totalHits / totalRequests : 0;
  }

  private generateRecommendations(
    snapshot: CachePerformanceSnapshot, 
    trend: PerformanceTrend
  ): string[] {
    const recommendations: string[] = [];
    const overallHitRate = this.calculateSnapshotHitRate(snapshot);

    if (overallHitRate < 0.8) {
      recommendations.push('Consider increasing cache TTL for frequently accessed resources');
      recommendations.push('Implement predictive preloading based on user behavior patterns');
    }

    if (snapshot.storage.percentage > 80) {
      recommendations.push('Schedule regular cache cleanup to prevent storage overflow');
      recommendations.push('Implement size-based eviction policies for large resources');
    }

    if (snapshot.sync.successRate < 0.95) {
      recommendations.push('Improve retry logic with exponential backoff');
      recommendations.push('Add network condition awareness to sync operations');
    }

    if (snapshot.preload.wastedPreloads > snapshot.preload.hitFromPreload) {
      recommendations.push('Refine preload selection criteria to reduce waste');
      recommendations.push('Consider user behavior patterns in preload decisions');
    }

    if (trend.analysis.hitRateChange < -0.05) {
      recommendations.push('Investigate recent changes that may have affected cache effectiveness');
    }

    return recommendations;
  }

  private calculateHealthScore(snapshot: CachePerformanceSnapshot): number {
    const hitRateScore = this.calculateSnapshotHitRate(snapshot) * 30;
    const storageScore = Math.max(0, (100 - snapshot.storage.percentage) / 100) * 20;
    const syncScore = snapshot.sync.successRate * 25;
    const preloadScore = snapshot.preload.successRate * 25;

    return Math.round(hitRateScore + storageScore + syncScore + preloadScore);
  }

  private getTimeRangeMs(timeRange: '1h' | '6h' | '24h' | '7d'): number {
    switch (timeRange) {
      case '1h': return 3600000;
      case '6h': return 21600000;
      case '24h': return 86400000;
      case '7d': return 604800000;
      default: return 86400000;
    }
  }

  private cleanupOldData(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days

    // Clean up old snapshots
    this.snapshots = this.snapshots.filter(snapshot => snapshot.timestamp >= cutoffTime);

    // Clean up old alerts
    this.alerts = this.alerts.filter(alert => alert.timestamp >= cutoffTime);
  }

  private async loadMetricsFromStorage(): Promise<void> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const data = JSON.parse(stored);
        this.snapshots = data.snapshots || [];
        this.alerts = data.alerts || [];
        this.cacheMetrics = data.cacheMetrics || {};
      }
    } catch (error) {
      console.warn('[CachePerformanceMetrics] Failed to load metrics from storage:', error);
    }
  }

  private async saveMetricsToStorage(): Promise<void> {
    try {
      const data = {
        snapshots: this.snapshots.slice(-100), // Keep only recent snapshots
        alerts: this.alerts.slice(-50), // Keep only recent alerts
        cacheMetrics: this.cacheMetrics,
        lastSaved: Date.now(),
      };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.warn('[CachePerformanceMetrics] Failed to save metrics to storage:', error);
    }
  }

  /**
   * Reset service to initial state (for testing)
   */
  reset(): void {
    this.stopMonitoring();
    this.snapshots = [];
    this.alerts = [];
    this.cacheMetrics = {};
    this.storageMetrics = {
      used: 0,
      available: 0,
      percentage: 0,
      trend: 'stable',
      lastCleanup: 0,
      estimatedTimeToFull: null,
    };
    this.syncMetrics = {
      queueSize: 0,
      successRate: 1,
      averageRetryCount: 0,
      totalProcessed: 0,
      failedActions: 0,
      averageProcessingTime: 0,
      lastSyncTime: 0,
    };
    this.preloadMetrics = {
      successRate: 1,
      averageLoadTime: 0,
      bandwidthSaved: 0,
      totalPreloads: 0,
      hitFromPreload: 0,
      wastedPreloads: 0,
      networkConditionImpact: {},
    };
    this.isInitialized = false;
    
    // Clear localStorage for testing
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch (error) {
      // Ignore localStorage errors in test environment
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopMonitoring();
    this.saveMetricsToStorage();
  }
}

// Export singleton instance
export const cachePerformanceMetricsService = new CachePerformanceMetricsService();