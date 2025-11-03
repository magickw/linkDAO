import { db } from '../db/connection';
import { safeLogger } from '../utils/safeLogger';
import { sellers, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, count, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface SellerPerformanceMetrics {
  sellerId: string;
  timestamp: string;
  
  // Component Performance Metrics
  componentLoadTimes: {
    sellerOnboarding: number;
    sellerProfile: number;
    sellerDashboard: number;
    sellerStore: number;
  };
  
  // API Performance Metrics
  apiResponseTimes: {
    getProfile: number;
    updateProfile: number;
    getListings: number;
    createListing: number;
    getDashboard: number;
  };
  
  // Cache Performance Metrics
  cacheMetrics: {
    hitRate: number;
    missRate: number;
    invalidationTime: number;
    averageRetrievalTime: number;
  };
  
  // Error Metrics
  errorMetrics: {
    totalErrors: number;
    errorRate: number;
    criticalErrors: number;
    recoveredErrors: number;
    errorsByType: Record<string, number>;
  };
  
  // User Experience Metrics
  userExperienceMetrics: {
    timeToInteractive: number;
    firstContentfulPaint: number;
    largestContentfulPaint: number;
    cumulativeLayoutShift: number;
    firstInputDelay: number;
  };
  
  // Mobile Performance Metrics
  mobileMetrics: {
    touchResponseTime: number;
    scrollPerformance: number;
    gestureRecognitionTime: number;
    batteryImpact: number;
  };
  
  // Real-time Features Performance
  realTimeMetrics: {
    webSocketConnectionTime: number;
    messageDeliveryTime: number;
    liveUpdateLatency: number;
    connectionStability: number;
  };
}

export interface PerformanceAlert {
  id: string;
  sellerId: string;
  alertType: 'performance' | 'error' | 'availability' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  metrics: any;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  actions: Array<{
    action: string;
    description: string;
    automated: boolean;
  }>;
}

export interface PerformanceRegression {
  sellerId: string;
  metric: string;
  currentValue: number;
  baselineValue: number;
  regressionPercentage: number;
  detectedAt: string;
  severity: 'minor' | 'moderate' | 'major' | 'critical';
  affectedComponents: string[];
  potentialCauses: string[];
  recommendedActions: string[];
}

export interface PerformanceDashboardData {
  sellerId: string;
  overallScore: number;
  metrics: SellerPerformanceMetrics;
  alerts: PerformanceAlert[];
  regressions: PerformanceRegression[];
  trends: {
    metric: string;
    data: Array<{ timestamp: string; value: number }>;
  }[];
  recommendations: Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>;
}

export interface PerformanceTestResult {
  testId: string;
  sellerId: string;
  testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume';
  status: 'running' | 'completed' | 'failed' | 'cancelled';
  startTime: string;
  endTime?: string;
  duration?: number;
  results: {
    averageResponseTime: number;
    maxResponseTime: number;
    minResponseTime: number;
    throughput: number;
    errorRate: number;
    successRate: number;
    concurrentUsers: number;
    totalRequests: number;
    failedRequests: number;
  };
  regressions: PerformanceRegression[];
  recommendations: string[];
}

export class SellerPerformanceMonitoringService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly METRICS_RETENTION_DAYS = 30;
  private performanceBaselines: Map<string, Map<string, number>> = new Map();
  private alertThresholds: Map<string, number> = new Map();

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
    this.initializeAlertThresholds();
  }

  /**
   * Store performance metrics
   */
  async storePerformanceMetrics(
    sellerId: string,
    metrics: SellerPerformanceMetrics[]
  ): Promise<void> {
    try {
      // Store in database
      for (const metric of metrics) {
        await db.execute(sql`
          INSERT INTO seller_performance_metrics (
            seller_id, timestamp, component_load_times, api_response_times,
            cache_metrics, error_metrics, user_experience_metrics,
            mobile_metrics, real_time_metrics
          ) VALUES (
            ${sellerId}, ${metric.timestamp}, ${JSON.stringify(metric.componentLoadTimes)},
            ${JSON.stringify(metric.apiResponseTimes)}, ${JSON.stringify(metric.cacheMetrics)},
            ${JSON.stringify(metric.errorMetrics)}, ${JSON.stringify(metric.userExperienceMetrics)},
            ${JSON.stringify(metric.mobileMetrics)}, ${JSON.stringify(metric.realTimeMetrics)}
          )
        `);
      }

      // Store in Redis for real-time access
      const cacheKey = `seller:performance:${sellerId}:latest`;
      await this.redis.setex(
        cacheKey,
        this.CACHE_TTL,
        JSON.stringify(metrics[metrics.length - 1])
      );

      // Check for performance regressions
      await this.checkPerformanceRegressions(sellerId, metrics);

      // Update performance baselines
      await this.updatePerformanceBaselines(sellerId, metrics);

    } catch (error) {
      safeLogger.error('Error storing performance metrics:', error);
      throw new Error('Failed to store performance metrics');
    }
  }

  /**
   * Get performance dashboard data
   */
  async getPerformanceDashboard(sellerId: string): Promise<PerformanceDashboardData> {
    try {
      const cacheKey = `seller:performance:dashboard:${sellerId}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const [
        latestMetrics,
        alerts,
        regressions,
        trends,
        recommendations
      ] = await Promise.all([
        this.getLatestMetrics(sellerId),
        this.getActiveAlerts(sellerId),
        this.getActiveRegressions(sellerId),
        this.getPerformanceTrends(sellerId),
        this.generateRecommendations(sellerId)
      ]);

      const overallScore = this.calculateOverallScore(latestMetrics);

      const dashboardData: PerformanceDashboardData = {
        sellerId,
        overallScore,
        metrics: latestMetrics,
        alerts,
        regressions,
        trends,
        recommendations
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(dashboardData));
      return dashboardData;

    } catch (error) {
      safeLogger.error('Error getting performance dashboard:', error);
      throw new Error('Failed to retrieve performance dashboard');
    }
  }

  /**
   * Run automated performance regression test
   */
  async runPerformanceRegressionTest(
    sellerId: string,
    testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume'
  ): Promise<PerformanceTestResult> {
    try {
      const testId = `test-${sellerId}-${Date.now()}`;
      const startTime = new Date().toISOString();

      // Store test start
      await db.execute(sql`
        INSERT INTO seller_performance_tests (
          test_id, seller_id, test_type, status, start_time
        ) VALUES (
          ${testId}, ${sellerId}, ${testType}, 'running', ${startTime}
        )
      `);

      // Run the actual test (this would integrate with load testing tools)
      const testResults = await this.executePerformanceTest(sellerId, testType);

      const endTime = new Date().toISOString();
      const duration = new Date(endTime).getTime() - new Date(startTime).getTime();

      // Detect regressions
      const regressions = await this.detectRegressions(sellerId, testResults);

      // Generate recommendations
      const recommendations = this.generateTestRecommendations(testResults, regressions);

      const result: PerformanceTestResult = {
        testId,
        sellerId,
        testType,
        status: 'completed',
        startTime,
        endTime,
        duration,
        results: testResults,
        regressions,
        recommendations
      };

      // Update test record
      await db.execute(sql`
        UPDATE seller_performance_tests 
        SET status = 'completed', end_time = ${endTime}, 
            duration = ${duration}, results = ${JSON.stringify(testResults)}
        WHERE test_id = ${testId}
      `);

      return result;

    } catch (error) {
      safeLogger.error('Error running performance regression test:', error);
      throw new Error('Failed to run performance regression test');
    }
  }

  /**
   * Get performance alerts
   */
  async getPerformanceAlerts(
    sellerId: string,
    severity?: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<PerformanceAlert[]> {
    try {
      let query = sql`
        SELECT * FROM seller_performance_alerts 
        WHERE seller_id = ${sellerId} AND resolved = false
      `;

      if (severity) {
        query = sql`${query} AND severity = ${severity}`;
      }

      query = sql`${query} ORDER BY timestamp DESC LIMIT 50`;

      const result = await db.execute(query);
      
      return result.map(row => ({
        id: String(row.id),
        sellerId: String(row.seller_id),
        alertType: String(row.alert_type) as any,
        severity: String(row.severity) as any,
        title: String(row.title),
        description: String(row.description),
        metrics: JSON.parse(String(row.metrics)),
        timestamp: String(row.timestamp),
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
        actions: JSON.parse(String(row.actions))
      }));

    } catch (error) {
      safeLogger.error('Error getting performance alerts:', error);
      return [];
    }
  }

  /**
   * Create performance alert
   */
  async createPerformanceAlert(
    sellerId: string,
    alertData: {
      alertType: 'performance' | 'error' | 'availability' | 'security';
      severity: 'low' | 'medium' | 'high' | 'critical';
      title: string;
      description: string;
      metrics: any;
      actions: Array<{
        action: string;
        description: string;
        automated: boolean;
      }>;
    }
  ): Promise<PerformanceAlert> {
    try {
      const alertId = `alert-${sellerId}-${Date.now()}`;
      const timestamp = new Date().toISOString();

      const alert: PerformanceAlert = {
        id: alertId,
        sellerId,
        timestamp,
        resolved: false,
        ...alertData
      };

      await db.execute(sql`
        INSERT INTO seller_performance_alerts (
          id, seller_id, alert_type, severity, title, description,
          metrics, timestamp, resolved, actions
        ) VALUES (
          ${alertId}, ${sellerId}, ${alertData.alertType}, ${alertData.severity},
          ${alertData.title}, ${alertData.description}, ${JSON.stringify(alertData.metrics)},
          ${timestamp}, false, ${JSON.stringify(alertData.actions)}
        )
      `);

      // Send real-time notification
      await this.sendAlertNotification(alert);

      return alert;

    } catch (error) {
      safeLogger.error('Error creating performance alert:', error);
      throw new Error('Failed to create performance alert');
    }
  }

  /**
   * Resolve performance alert
   */
  async resolvePerformanceAlert(alertId: string): Promise<void> {
    try {
      const resolvedAt = new Date().toISOString();

      await db.execute(sql`
        UPDATE seller_performance_alerts 
        SET resolved = true, resolved_at = ${resolvedAt}
        WHERE id = ${alertId}
      `);

    } catch (error) {
      safeLogger.error('Error resolving performance alert:', error);
      throw new Error('Failed to resolve performance alert');
    }
  }

  /**
   * Get performance recommendations
   */
  async getPerformanceRecommendations(sellerId: string): Promise<Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>> {
    try {
      const metrics = await this.getLatestMetrics(sellerId);
      const regressions = await this.getActiveRegressions(sellerId);
      
      return this.generateRecommendations(sellerId, metrics, regressions);

    } catch (error) {
      safeLogger.error('Error getting performance recommendations:', error);
      return [];
    }
  }

  /**
   * Get performance trends
   */
  async getPerformanceTrends(
    sellerId: string,
    metric?: string,
    period: 'hour' | 'day' | 'week' = 'day',
    limit: number = 30
  ): Promise<{
    metric: string;
    data: Array<{ timestamp: string; value: number }>;
  }[]> {
    try {
      const groupBy = period === 'hour' ? 'DATE_TRUNC(\'hour\', timestamp)' :
                     period === 'day' ? 'DATE_TRUNC(\'day\', timestamp)' :
                     'DATE_TRUNC(\'week\', timestamp)';

      const result = await db.execute(sql`
        SELECT 
          ${sql.raw(groupBy)} as period,
          AVG((api_response_times->>'getProfile')::numeric) as avg_get_profile,
          AVG((api_response_times->>'updateProfile')::numeric) as avg_update_profile,
          AVG((cache_metrics->>'hitRate')::numeric) as avg_cache_hit_rate,
          AVG((error_metrics->>'errorRate')::numeric) as avg_error_rate
        FROM seller_performance_metrics
        WHERE seller_id = ${sellerId}
          AND timestamp >= NOW() - INTERVAL '${sql.raw(limit.toString())} ${sql.raw(period)}s'
        GROUP BY ${sql.raw(groupBy)}
        ORDER BY period DESC
        LIMIT ${limit}
      `);

      const trends = [
        {
          metric: 'API Response Time (Get Profile)',
          data: result.map(row => ({
            timestamp: String(row.period),
            value: Number(row.avg_get_profile) || 0
          }))
        },
        {
          metric: 'API Response Time (Update Profile)',
          data: result.map(row => ({
            timestamp: String(row.period),
            value: Number(row.avg_update_profile) || 0
          }))
        },
        {
          metric: 'Cache Hit Rate',
          data: result.map(row => ({
            timestamp: String(row.period),
            value: Number(row.avg_cache_hit_rate) || 0
          }))
        },
        {
          metric: 'Error Rate',
          data: result.map(row => ({
            timestamp: String(row.period),
            value: Number(row.avg_error_rate) || 0
          }))
        }
      ];

      return metric ? trends.filter(t => t.metric.toLowerCase().includes(metric.toLowerCase())) : trends;

    } catch (error) {
      safeLogger.error('Error getting performance trends:', error);
      return [];
    }
  }

  // Private helper methods

  private initializeAlertThresholds(): void {
    this.alertThresholds.set('api_response_time', 5000); // 5 seconds
    this.alertThresholds.set('error_rate', 5); // 5%
    this.alertThresholds.set('cache_hit_rate', 80); // 80%
    this.alertThresholds.set('component_load_time', 3000); // 3 seconds
    this.alertThresholds.set('first_contentful_paint', 2500); // 2.5 seconds
    this.alertThresholds.set('largest_contentful_paint', 4000); // 4 seconds
  }

  private async getLatestMetrics(sellerId: string): Promise<SellerPerformanceMetrics> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM seller_performance_metrics
        WHERE seller_id = ${sellerId}
        ORDER BY timestamp DESC
        LIMIT 1
      `);

      if (result.length === 0) {
        return this.getDefaultMetrics(sellerId);
      }

      const row = result[0];
      return {
        sellerId,
        timestamp: String(row.timestamp),
        componentLoadTimes: JSON.parse(String(row.component_load_times)),
        apiResponseTimes: JSON.parse(String(row.api_response_times)),
        cacheMetrics: JSON.parse(String(row.cache_metrics)),
        errorMetrics: JSON.parse(String(row.error_metrics)),
        userExperienceMetrics: JSON.parse(String(row.user_experience_metrics)),
        mobileMetrics: JSON.parse(String(row.mobile_metrics)),
        realTimeMetrics: JSON.parse(String(row.real_time_metrics))
      };

    } catch (error) {
      safeLogger.error('Error getting latest metrics:', error);
      return this.getDefaultMetrics(sellerId);
    }
  }

  private async getActiveAlerts(sellerId: string): Promise<PerformanceAlert[]> {
    try {
      return await this.getPerformanceAlerts(sellerId);
    } catch (error) {
      safeLogger.error('Error getting active alerts:', error);
      return [];
    }
  }

  private async getActiveRegressions(sellerId: string): Promise<PerformanceRegression[]> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM seller_performance_regressions
        WHERE seller_id = ${sellerId} AND resolved = false
        ORDER BY detected_at DESC
        LIMIT 20
      `);

      return result.map(row => ({
        sellerId: String(row.seller_id),
        metric: String(row.metric),
        currentValue: Number(row.current_value),
        baselineValue: Number(row.baseline_value),
        regressionPercentage: Number(row.regression_percentage),
        detectedAt: String(row.detected_at),
        severity: String(row.severity) as any,
        affectedComponents: JSON.parse(String(row.affected_components)),
        potentialCauses: JSON.parse(String(row.potential_causes)),
        recommendedActions: JSON.parse(String(row.recommended_actions))
      }));

    } catch (error) {
      safeLogger.error('Error getting active regressions:', error);
      return [];
    }
  }

  private calculateOverallScore(metrics: SellerPerformanceMetrics): number {
    try {
      let score = 100;

      // Deduct points for poor performance
      if (metrics.apiResponseTimes.getProfile > 2000) score -= 10;
      if (metrics.apiResponseTimes.updateProfile > 3000) score -= 10;
      if (metrics.cacheMetrics.hitRate < 90) score -= 15;
      if (metrics.errorMetrics.errorRate > 1) score -= 20;
      if (metrics.userExperienceMetrics.firstContentfulPaint > 2500) score -= 10;
      if (metrics.userExperienceMetrics.largestContentfulPaint > 4000) score -= 15;
      if (metrics.mobileMetrics.touchResponseTime > 100) score -= 10;

      return Math.max(0, Math.min(100, score));

    } catch (error) {
      safeLogger.error('Error calculating overall score:', error);
      return 50; // Default score
    }
  }

  private async checkPerformanceRegressions(
    sellerId: string,
    metrics: SellerPerformanceMetrics[]
  ): Promise<void> {
    try {
      const baselines = this.performanceBaselines.get(sellerId);
      if (!baselines) return;

      const latestMetric = metrics[metrics.length - 1];

      // Check API response time regressions
      for (const [endpoint, responseTime] of Object.entries(latestMetric.apiResponseTimes)) {
        const baseline = baselines.get(`api_${endpoint}`);
        if (baseline && responseTime > baseline * 1.5) { // 50% regression threshold
          await this.createRegressionAlert(sellerId, `api_${endpoint}`, responseTime, baseline);
        }
      }

      // Check cache performance regressions
      const cacheHitBaseline = baselines.get('cache_hit_rate');
      if (cacheHitBaseline && latestMetric.cacheMetrics.hitRate < cacheHitBaseline * 0.8) {
        await this.createRegressionAlert(
          sellerId,
          'cache_hit_rate',
          latestMetric.cacheMetrics.hitRate,
          cacheHitBaseline
        );
      }

    } catch (error) {
      safeLogger.error('Error checking performance regressions:', error);
    }
  }

  private async createRegressionAlert(
    sellerId: string,
    metric: string,
    currentValue: number,
    baselineValue: number
  ): Promise<void> {
    const regressionPercentage = ((currentValue - baselineValue) / baselineValue) * 100;
    
    // Determine severity
    let severity: 'low' | 'medium' | 'high' | 'critical';
    if (regressionPercentage > 100) {
      severity = 'critical';
    } else if (regressionPercentage > 50) {
      severity = 'high';
    } else {
      severity = 'medium';
    }
    
    // Create alert data without sellerId since it's passed separately
    const alertData = {
      alertType: 'performance' as const,
      severity,
      title: `Performance Regression Detected: ${metric}`,
      description: `${metric} has regressed by ${regressionPercentage.toFixed(1)}% from baseline`,
      metrics: { metric, currentValue, baselineValue, regressionPercentage },
      actions: [
        {
          action: 'investigate_cause',
          description: 'Investigate the root cause of the performance regression',
          automated: false
        },
        {
          action: 'rollback_changes',
          description: 'Consider rolling back recent changes if applicable',
          automated: false
        }
      ]
    };
    
    await this.createPerformanceAlert(sellerId, alertData);
  }

  private async updatePerformanceBaselines(
    sellerId: string,
    metrics: SellerPerformanceMetrics[]
  ): Promise<void> {
    try {
      let baselines = this.performanceBaselines.get(sellerId);
      if (!baselines) {
        baselines = new Map();
        this.performanceBaselines.set(sellerId, baselines);
      }

      const latestMetric = metrics[metrics.length - 1];

      // Update API response time baselines
      for (const [endpoint, responseTime] of Object.entries(latestMetric.apiResponseTimes)) {
        const currentBaseline = baselines.get(`api_${endpoint}`) || responseTime;
        // Use exponential moving average for baseline updates
        const newBaseline = currentBaseline * 0.9 + responseTime * 0.1;
        baselines.set(`api_${endpoint}`, newBaseline);
      }

      // Update cache performance baselines
      const currentCacheBaseline = baselines.get('cache_hit_rate') || latestMetric.cacheMetrics.hitRate;
      const newCacheBaseline = currentCacheBaseline * 0.9 + latestMetric.cacheMetrics.hitRate * 0.1;
      baselines.set('cache_hit_rate', newCacheBaseline);

    } catch (error) {
      safeLogger.error('Error updating performance baselines:', error);
    }
  }

  private async executePerformanceTest(
    sellerId: string,
    testType: 'load' | 'stress' | 'endurance' | 'spike' | 'volume'
  ): Promise<any> {
    // Mock implementation - would integrate with actual load testing tools
    return {
      averageResponseTime: 250 + Math.random() * 100,
      maxResponseTime: 800 + Math.random() * 400,
      minResponseTime: 100 + Math.random() * 50,
      throughput: 100 + Math.random() * 50,
      errorRate: Math.random() * 2,
      successRate: 98 + Math.random() * 2,
      concurrentUsers: testType === 'load' ? 50 : testType === 'stress' ? 200 : 100,
      totalRequests: 5000,
      failedRequests: Math.floor(Math.random() * 100)
    };
  }

  private async detectRegressions(
    sellerId: string,
    testResults: any
  ): Promise<PerformanceRegression[]> {
    // Mock implementation - would compare against historical test results
    return [];
  }

  private generateTestRecommendations(
    testResults: any,
    regressions: PerformanceRegression[]
  ): string[] {
    const recommendations: string[] = [];

    if (testResults.errorRate > 1) {
      recommendations.push('Investigate and fix errors causing high error rate');
    }

    if (testResults.averageResponseTime > 500) {
      recommendations.push('Optimize API endpoints to reduce response time');
    }

    if (testResults.throughput < 50) {
      recommendations.push('Scale infrastructure to handle higher throughput');
    }

    return recommendations;
  }

  private async generateRecommendations(
    sellerId: string,
    metrics?: SellerPerformanceMetrics,
    regressions?: PerformanceRegression[]
  ): Promise<Array<{
    priority: 'high' | 'medium' | 'low';
    title: string;
    description: string;
    expectedImpact: string;
    effort: 'low' | 'medium' | 'high';
  }>> {
    const recommendations = [];

    if (metrics) {
      if (metrics.cacheMetrics.hitRate < 90) {
        recommendations.push({
          priority: 'high' as const,
          title: 'Improve Cache Hit Rate',
          description: 'Cache hit rate is below optimal threshold. Consider cache warming strategies.',
          expectedImpact: 'Reduce API response times by 30-50%',
          effort: 'medium' as const
        });
      }

      if (metrics.apiResponseTimes.getProfile > 2000) {
        recommendations.push({
          priority: 'high' as const,
          title: 'Optimize Profile API Performance',
          description: 'Profile API response time is above acceptable threshold.',
          expectedImpact: 'Improve user experience and reduce bounce rate',
          effort: 'high' as const
        });
      }

      if (metrics.userExperienceMetrics.firstContentfulPaint > 2500) {
        recommendations.push({
          priority: 'medium' as const,
          title: 'Optimize First Contentful Paint',
          description: 'First Contentful Paint is slower than recommended. Consider code splitting.',
          expectedImpact: 'Improve perceived performance by 20%',
          effort: 'medium' as const
        });
      }
    }

    return recommendations;
  }

  private async sendAlertNotification(alert: PerformanceAlert): Promise<void> {
    try {
      // Send to Redis pub/sub for real-time notifications
      await this.redis.publish(
        `seller:alerts:${alert.sellerId}`,
        JSON.stringify(alert)
      );

      // Could also integrate with email, Slack, etc.
    } catch (error) {
      safeLogger.error('Error sending alert notification:', error);
    }
  }

  private getDefaultMetrics(sellerId: string): SellerPerformanceMetrics {
    return {
      sellerId,
      timestamp: new Date().toISOString(),
      componentLoadTimes: {
        sellerOnboarding: 0,
        sellerProfile: 0,
        sellerDashboard: 0,
        sellerStore: 0,
      },
      apiResponseTimes: {
        getProfile: 0,
        updateProfile: 0,
        getListings: 0,
        createListing: 0,
        getDashboard: 0,
      },
      cacheMetrics: {
        hitRate: 0,
        missRate: 0,
        invalidationTime: 0,
        averageRetrievalTime: 0,
      },
      errorMetrics: {
        totalErrors: 0,
        errorRate: 0,
        criticalErrors: 0,
        recoveredErrors: 0,
        errorsByType: {},
      },
      userExperienceMetrics: {
        timeToInteractive: 0,
        firstContentfulPaint: 0,
        largestContentfulPaint: 0,
        cumulativeLayoutShift: 0,
        firstInputDelay: 0,
      },
      mobileMetrics: {
        touchResponseTime: 0,
        scrollPerformance: 0,
        gestureRecognitionTime: 0,
        batteryImpact: 0,
      },
      realTimeMetrics: {
        webSocketConnectionTime: 0,
        messageDeliveryTime: 0,
        liveUpdateLatency: 0,
        connectionStability: 0,
      },
    };
  }
}

export const sellerPerformanceMonitoringService = new SellerPerformanceMonitoringService();
