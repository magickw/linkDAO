import { EventEmitter } from 'events';
import { PerformanceOptimizationService } from './performanceOptimizationService';
import { ModerationCacheService } from './moderationCacheService';
import { VendorApiOptimizer } from './vendorApiOptimizer';
import { CircuitBreakerManager } from './circuitBreakerService';

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  timestamp: number;
  description: string;
}

export interface SystemHealthMetrics {
  overall: 'healthy' | 'degraded' | 'critical';
  timestamp: number;
  components: {
    cache: {
      status: 'healthy' | 'degraded' | 'critical';
      hitRate: number;
      memoryUsage: number;
      responseTime: number;
    };
    vendors: {
      status: 'healthy' | 'degraded' | 'critical';
      activeVendors: number;
      averageLatency: number;
      errorRate: number;
    };
    circuitBreakers: {
      status: 'healthy' | 'degraded' | 'critical';
      openCircuits: number;
      totalCircuits: number;
    };
    processing: {
      status: 'healthy' | 'degraded' | 'critical';
      throughput: number;
      averageProcessingTime: number;
      queueSize: number;
    };
  };
}

export interface PerformanceTrend {
  metric: string;
  timeWindow: number;
  dataPoints: Array<{
    timestamp: number;
    value: number;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number;
}

/**
 * Performance monitoring service for real-time system health tracking
 * Provides alerts, metrics collection, and trend analysis
 */
export class PerformanceMonitoringService extends EventEmitter {
  private readonly performanceService: PerformanceOptimizationService;
  private readonly cacheService: ModerationCacheService;
  private readonly vendorOptimizer: VendorApiOptimizer;
  private readonly circuitBreakerManager: CircuitBreakerManager;

  private alerts: Map<string, PerformanceAlert> = new Map();
  private metricsHistory: Map<string, Array<{ timestamp: number; value: number }>> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private alertThresholds = {
    cacheHitRate: { warning: 0.7, critical: 0.5 },
    averageProcessingTime: { warning: 5000, critical: 10000 },
    errorRate: { warning: 0.05, critical: 0.1 },
    memoryUsage: { warning: 500 * 1024 * 1024, critical: 1024 * 1024 * 1024 }, // 500MB/1GB
    circuitBreakerFailures: { warning: 0.3, critical: 0.5 },
    vendorLatency: { warning: 3000, critical: 5000 }
  };

  private readonly maxHistorySize = 1000; // Keep last 1000 data points per metric
  private readonly monitoringIntervalMs = 30000; // Monitor every 30 seconds

  constructor(
    performanceService: PerformanceOptimizationService,
    cacheService: ModerationCacheService,
    vendorOptimizer: VendorApiOptimizer,
    circuitBreakerManager: CircuitBreakerManager
  ) {
    super();
    
    this.performanceService = performanceService;
    this.cacheService = cacheService;
    this.vendorOptimizer = vendorOptimizer;
    this.circuitBreakerManager = circuitBreakerManager;

    this.setupEventListeners();
  }

  /**
   * Setup event listeners for real-time monitoring
   */
  private setupEventListeners(): void {
    // Listen to performance service events
    this.performanceService.on('processingError', (event) => {
      this.handleProcessingError(event);
    });

    this.performanceService.on('configurationOptimized', (event) => {
      this.emit('systemOptimized', event);
    });

    // Listen to circuit breaker events
    this.circuitBreakerManager.on('circuitOpened', (event) => {
      this.handleCircuitBreakerOpened(event);
    });

    this.circuitBreakerManager.on('circuitClosed', (event) => {
      this.emit('circuitBreakerRecovered', event);
    });

    // Listen to vendor optimizer events
    this.vendorOptimizer.on('batchError', (event) => {
      this.handleVendorError(event);
    });
  }

  /**
   * Start continuous monitoring
   */
  startMonitoring(): void {
    if (this.monitoringInterval) {
      return; // Already monitoring
    }

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
        this.analyzePerformanceTrends();
      } catch (error) {
        console.error('Error during performance monitoring:', error);
      }
    }, this.monitoringIntervalMs);

    this.emit('monitoringStarted');
  }

  /**
   * Stop continuous monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
      this.emit('monitoringStopped');
    }
  }

  /**
   * Collect current system metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = Date.now();

    try {
      // Collect performance metrics
      const performanceMetrics = this.performanceService.getPerformanceMetrics();
      this.recordMetric('cacheHitRate', performanceMetrics.cacheHitRate, timestamp);
      this.recordMetric('averageProcessingTime', performanceMetrics.averageProcessingTime, timestamp);
      this.recordMetric('totalRequests', performanceMetrics.totalRequests, timestamp);
      this.recordMetric('totalCost', performanceMetrics.totalCost, timestamp);

      // Collect cache metrics
      const cacheStats = await this.cacheService.getCacheStats();
      this.recordMetric('cacheMemoryUsage', cacheStats.memoryUsage, timestamp);
      this.recordMetric('cacheKeyCount', cacheStats.keyCount, timestamp);

      // Collect vendor metrics
      const vendorStats = this.vendorOptimizer.getSystemStats();
      this.recordMetric('vendorQueueSize', vendorStats.totalQueueSize, timestamp);
      this.recordMetric('vendorCostEstimate', vendorStats.totalCostEstimate, timestamp);

      // Collect circuit breaker metrics
      const circuitBreakerHealth = this.circuitBreakerManager.getHealthSummary();
      this.recordMetric('openCircuits', circuitBreakerHealth.openCircuits, timestamp);
      this.recordMetric('totalCircuits', circuitBreakerHealth.totalCircuits, timestamp);

      // Collect system memory metrics
      const memoryUsage = process.memoryUsage();
      this.recordMetric('systemMemoryUsage', memoryUsage.heapUsed, timestamp);
      this.recordMetric('systemMemoryTotal', memoryUsage.heapTotal, timestamp);

    } catch (error) {
      console.error('Error collecting metrics:', error);
    }
  }

  /**
   * Record a metric value with timestamp
   */
  private recordMetric(metric: string, value: number, timestamp: number): void {
    if (!this.metricsHistory.has(metric)) {
      this.metricsHistory.set(metric, []);
    }

    const history = this.metricsHistory.get(metric)!;
    history.push({ timestamp, value });

    // Keep only recent history
    if (history.length > this.maxHistorySize) {
      history.shift();
    }
  }

  /**
   * Check for alert conditions
   */
  private async checkAlerts(): Promise<void> {
    const currentMetrics = await this.getCurrentMetrics();

    // Check cache hit rate
    this.checkThresholdAlert(
      'cacheHitRate',
      currentMetrics.cacheHitRate,
      this.alertThresholds.cacheHitRate,
      'Cache hit rate is below optimal levels',
      'lower'
    );

    // Check processing time
    this.checkThresholdAlert(
      'averageProcessingTime',
      currentMetrics.averageProcessingTime,
      this.alertThresholds.averageProcessingTime,
      'Average processing time is too high',
      'upper'
    );

    // Check memory usage
    this.checkThresholdAlert(
      'systemMemoryUsage',
      currentMetrics.systemMemoryUsage,
      this.alertThresholds.memoryUsage,
      'System memory usage is high',
      'upper'
    );

    // Check circuit breaker health
    const circuitBreakerFailureRate = currentMetrics.openCircuits / Math.max(currentMetrics.totalCircuits, 1);
    this.checkThresholdAlert(
      'circuitBreakerFailures',
      circuitBreakerFailureRate,
      this.alertThresholds.circuitBreakerFailures,
      'High number of circuit breaker failures',
      'upper'
    );
  }

  /**
   * Check threshold-based alerts
   */
  private checkThresholdAlert(
    metric: string,
    value: number,
    thresholds: { warning: number; critical: number },
    description: string,
    direction: 'upper' | 'lower'
  ): void {
    const alertId = `${metric}_threshold`;
    const isUpperThreshold = direction === 'upper';
    
    let alertType: 'warning' | 'critical' | null = null;
    let threshold: number;

    if (isUpperThreshold) {
      if (value >= thresholds.critical) {
        alertType = 'critical';
        threshold = thresholds.critical;
      } else if (value >= thresholds.warning) {
        alertType = 'warning';
        threshold = thresholds.warning;
      }
    } else {
      if (value <= thresholds.critical) {
        alertType = 'critical';
        threshold = thresholds.critical;
      } else if (value <= thresholds.warning) {
        alertType = 'warning';
        threshold = thresholds.warning;
      }
    }

    if (alertType) {
      const alert: PerformanceAlert = {
        id: alertId,
        type: alertType,
        metric,
        value,
        threshold: threshold!,
        timestamp: Date.now(),
        description
      };

      this.alerts.set(alertId, alert);
      this.emit('performanceAlert', alert);
    } else {
      // Clear alert if it exists and conditions are now normal
      if (this.alerts.has(alertId)) {
        this.alerts.delete(alertId);
        this.emit('alertResolved', { alertId, metric });
      }
    }
  }

  /**
   * Get current metrics snapshot
   */
  private async getCurrentMetrics(): Promise<any> {
    const performanceMetrics = this.performanceService.getPerformanceMetrics();
    const cacheStats = await this.cacheService.getCacheStats();
    const vendorStats = this.vendorOptimizer.getSystemStats();
    const circuitBreakerHealth = this.circuitBreakerManager.getHealthSummary();
    const memoryUsage = process.memoryUsage();

    return {
      cacheHitRate: performanceMetrics.cacheHitRate,
      averageProcessingTime: performanceMetrics.averageProcessingTime,
      systemMemoryUsage: memoryUsage.heapUsed,
      openCircuits: circuitBreakerHealth.openCircuits,
      totalCircuits: circuitBreakerHealth.totalCircuits,
      vendorQueueSize: vendorStats.totalQueueSize
    };
  }

  /**
   * Analyze performance trends
   */
  private analyzePerformanceTrends(): void {
    const trendsToAnalyze = [
      'cacheHitRate',
      'averageProcessingTime',
      'systemMemoryUsage',
      'vendorQueueSize'
    ];

    trendsToAnalyze.forEach(metric => {
      const trend = this.calculateTrend(metric, 300000); // 5 minute window
      if (trend) {
        this.emit('performanceTrend', trend);
        
        // Alert on significant degradation
        if (trend.trend === 'degrading' && Math.abs(trend.changeRate) > 0.2) {
          this.emit('performanceDegradation', {
            metric,
            trend,
            severity: Math.abs(trend.changeRate) > 0.5 ? 'critical' : 'warning'
          });
        }
      }
    });
  }

  /**
   * Calculate trend for a specific metric
   */
  private calculateTrend(metric: string, timeWindow: number): PerformanceTrend | null {
    const history = this.metricsHistory.get(metric);
    if (!history || history.length < 2) {
      return null;
    }

    const now = Date.now();
    const windowStart = now - timeWindow;
    const relevantData = history.filter(point => point.timestamp >= windowStart);

    if (relevantData.length < 2) {
      return null;
    }

    // Calculate linear regression for trend
    const n = relevantData.length;
    const sumX = relevantData.reduce((sum, point, index) => sum + index, 0);
    const sumY = relevantData.reduce((sum, point) => sum + point.value, 0);
    const sumXY = relevantData.reduce((sum, point, index) => sum + (index * point.value), 0);
    const sumXX = relevantData.reduce((sum, point, index) => sum + (index * index), 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const changeRate = slope / (sumY / n); // Normalized change rate

    let trend: 'improving' | 'stable' | 'degrading';
    if (Math.abs(changeRate) < 0.05) {
      trend = 'stable';
    } else if (changeRate > 0) {
      // For metrics like cache hit rate, positive is improving
      // For metrics like processing time, positive is degrading
      const improvingMetrics = ['cacheHitRate'];
      trend = improvingMetrics.includes(metric) ? 'improving' : 'degrading';
    } else {
      const improvingMetrics = ['cacheHitRate'];
      trend = improvingMetrics.includes(metric) ? 'degrading' : 'improving';
    }

    return {
      metric,
      timeWindow,
      dataPoints: relevantData,
      trend,
      changeRate
    };
  }

  /**
   * Get system health summary
   */
  async getSystemHealth(): Promise<SystemHealthMetrics> {
    const performanceMetrics = this.performanceService.getPerformanceMetrics();
    const cacheStats = await this.cacheService.getCacheStats();
    const vendorStats = this.vendorOptimizer.getSystemStats();
    const circuitBreakerHealth = this.circuitBreakerManager.getHealthSummary();

    // Determine component health
    const cacheHealth = this.determineComponentHealth('cache', {
      hitRate: cacheStats.hitRate,
      memoryUsage: cacheStats.memoryUsage,
      responseTime: 0 // Would need to track this separately
    });

    const vendorHealth = this.determineComponentHealth('vendors', {
      activeVendors: vendorStats.activeVendors,
      averageLatency: 0, // Would need to track this
      errorRate: 0 // Would need to track this
    });

    const circuitBreakerHealthStatus = circuitBreakerHealth.overallHealth;

    const processingHealth = this.determineComponentHealth('processing', {
      throughput: performanceMetrics.totalRequests / (Date.now() / 1000), // Rough throughput
      averageProcessingTime: performanceMetrics.averageProcessingTime,
      queueSize: vendorStats.totalQueueSize
    });

    // Determine overall health
    const componentStatuses = [cacheHealth.status, vendorHealth.status, circuitBreakerHealthStatus, processingHealth.status];
    let overallHealth: 'healthy' | 'degraded' | 'critical';

    if (componentStatuses.includes('critical')) {
      overallHealth = 'critical';
    } else if (componentStatuses.includes('degraded')) {
      overallHealth = 'degraded';
    } else {
      overallHealth = 'healthy';
    }

    return {
      overall: overallHealth,
      timestamp: Date.now(),
      components: {
        cache: cacheHealth,
        vendors: vendorHealth,
        circuitBreakers: {
          status: circuitBreakerHealthStatus,
          openCircuits: circuitBreakerHealth.openCircuits,
          totalCircuits: circuitBreakerHealth.totalCircuits
        },
        processing: processingHealth
      }
    };
  }

  /**
   * Determine component health based on metrics
   */
  private determineComponentHealth(component: string, metrics: any): any {
    let status: 'healthy' | 'degraded' | 'critical' = 'healthy';

    switch (component) {
      case 'cache':
        if (metrics.hitRate < 0.5) status = 'critical';
        else if (metrics.hitRate < 0.7) status = 'degraded';
        break;
      
      case 'vendors':
        if (metrics.errorRate > 0.1) status = 'critical';
        else if (metrics.errorRate > 0.05) status = 'degraded';
        break;
      
      case 'processing':
        if (metrics.averageProcessingTime > 10000) status = 'critical';
        else if (metrics.averageProcessingTime > 5000) status = 'degraded';
        break;
    }

    return { status, ...metrics };
  }

  /**
   * Handle processing errors
   */
  private handleProcessingError(event: any): void {
    const alert: PerformanceAlert = {
      id: `processing_error_${Date.now()}`,
      type: 'warning',
      metric: 'processingErrors',
      value: 1,
      threshold: 0,
      timestamp: Date.now(),
      description: `Processing error for content ${event.contentId}: ${event.error.message}`
    };

    this.emit('performanceAlert', alert);
  }

  /**
   * Handle circuit breaker opened events
   */
  private handleCircuitBreakerOpened(event: any): void {
    const alert: PerformanceAlert = {
      id: `circuit_breaker_${event.name}`,
      type: 'critical',
      metric: 'circuitBreakerFailures',
      value: event.failureCount,
      threshold: this.alertThresholds.circuitBreakerFailures.critical,
      timestamp: Date.now(),
      description: `Circuit breaker opened for ${event.name} after ${event.failureCount} failures`
    };

    this.alerts.set(alert.id, alert);
    this.emit('performanceAlert', alert);
  }

  /**
   * Handle vendor errors
   */
  private handleVendorError(event: any): void {
    const alert: PerformanceAlert = {
      id: `vendor_error_${event.vendor}_${Date.now()}`,
      type: 'warning',
      metric: 'vendorErrors',
      value: event.requestCount,
      threshold: 0,
      timestamp: Date.now(),
      description: `Vendor ${event.vendor} batch error affecting ${event.requestCount} requests`
    };

    this.emit('performanceAlert', alert);
  }

  /**
   * Get current active alerts
   */
  getActiveAlerts(): PerformanceAlert[] {
    return Array.from(this.alerts.values());
  }

  /**
   * Get metrics history for a specific metric
   */
  getMetricsHistory(metric: string, timeWindow?: number): Array<{ timestamp: number; value: number }> {
    const history = this.metricsHistory.get(metric) || [];
    
    if (timeWindow) {
      const cutoff = Date.now() - timeWindow;
      return history.filter(point => point.timestamp >= cutoff);
    }
    
    return [...history];
  }

  /**
   * Update alert thresholds
   */
  updateAlertThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    Object.assign(this.alertThresholds, newThresholds);
    this.emit('thresholdsUpdated', this.alertThresholds);
  }

  /**
   * Clear all metrics history
   */
  clearMetricsHistory(): void {
    this.metricsHistory.clear();
    this.emit('metricsHistoryCleared');
  }

  /**
   * Get performance summary report
   */
  async getPerformanceReport(timeWindow: number = 3600000): Promise<any> {
    const systemHealth = await this.getSystemHealth();
    const activeAlerts = this.getActiveAlerts();
    
    const metricsReport: any = {};
    for (const [metric, history] of this.metricsHistory) {
      const recentData = this.getMetricsHistory(metric, timeWindow);
      if (recentData.length > 0) {
        const values = recentData.map(point => point.value);
        metricsReport[metric] = {
          current: values[values.length - 1],
          average: values.reduce((sum, val) => sum + val, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          trend: this.calculateTrend(metric, timeWindow)?.trend || 'stable'
        };
      }
    }

    return {
      timestamp: Date.now(),
      timeWindow,
      systemHealth,
      activeAlerts: activeAlerts.length,
      criticalAlerts: activeAlerts.filter(a => a.type === 'critical').length,
      metrics: metricsReport
    };
  }
}

export const createPerformanceMonitoringService = (
  performanceService: PerformanceOptimizationService,
  cacheService: ModerationCacheService,
  vendorOptimizer: VendorApiOptimizer,
  circuitBreakerManager: CircuitBreakerManager
): PerformanceMonitoringService => {
  return new PerformanceMonitoringService(
    performanceService,
    cacheService,
    vendorOptimizer,
    circuitBreakerManager
  );
};