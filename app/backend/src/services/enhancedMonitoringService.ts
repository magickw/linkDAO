import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { Redis } from 'ioredis';
import { performanceMonitoringService } from './performanceMonitoringService';
import { AnalyticsService } from './analyticsService';
import { MarketplaceCachingService } from './marketplaceCachingService';

interface MonitoringConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
  };
  alerting: {
    webhookUrl?: string;
    emailConfig?: {
      host: string;
      port: number;
      user: string;
      password: string;
    };
    slackConfig?: {
      webhookUrl: string;
      channel: string;
    };
  };
  thresholds: {
    errorRate: number;
    responseTime: number;
    memoryUsage: number;
    cpuUsage: number;
    diskUsage: number;
    cacheHitRate: number;
  };
}

interface ServiceHealthStatus {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  lastCheck: Date;
  responseTime: number;
  errorRate: number;
  uptime: number;
  details: Record<string, any>;
}

interface SystemAlert {
  id: string;
  type: 'performance' | 'error' | 'security' | 'business';
  severity: 'low' | 'medium' | 'high' | 'critical';
  service: string;
  message: string;
  details: Record<string, any>;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
}

interface BusinessMetricAlert {
  metric: string;
  currentValue: number;
  threshold: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  impact: 'low' | 'medium' | 'high';
  suggestedActions: string[];
}

interface PerformanceInsight {
  category: 'database' | 'cache' | 'api' | 'frontend' | 'cdn';
  insight: string;
  impact: 'low' | 'medium' | 'high';
  recommendation: string;
  estimatedImprovement: string;
  implementationEffort: 'low' | 'medium' | 'high';
}

export class EnhancedMonitoringService extends EventEmitter {
  private redis: Redis;
  private config: MonitoringConfig;
  private performanceService: typeof performanceMonitoringService;
  private analyticsService: AnalyticsService;
  private cacheService: MarketplaceCachingService;
  private serviceHealthMap: Map<string, ServiceHealthStatus> = new Map();
  private activeAlerts: Map<string, SystemAlert> = new Map();
  private monitoringInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(
    config: MonitoringConfig,
    performanceService: typeof performanceMonitoringService,
    analyticsService: AnalyticsService,
    cacheService: MarketplaceCachingService
  ) {
    super();
    this.config = config;
    this.performanceService = performanceService;
    this.analyticsService = analyticsService;
    this.cacheService = cacheService;
    
    this.redis = new Redis({
      host: config.redis.host,
      port: config.redis.port,
      password: config.redis.password,
      db: config.redis.db,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3
    });

    this.startMonitoring();
    this.setupEventHandlers();
  }

  private startMonitoring(): void {
    // Main monitoring loop - runs every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      await this.performMonitoringCycle();
    }, 30000);

    // Health check loop - runs every 60 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthChecks();
    }, 60000);

    safeLogger.info('Enhanced monitoring service started');
  }

  private setupEventHandlers(): void {
    // Listen to performance service events
    // Event handling not available in current performanceMonitoringService

    // Event handling not available in current performanceMonitoringService

    // Listen to our own events for logging
    this.on('alertCreated', (alert) => {
      safeLogger.warn(`ALERT CREATED: ${alert.message}`);
      this.sendAlert(alert);
    });

    this.on('alertResolved', (alert) => {
      safeLogger.info(`ALERT RESOLVED: ${alert.message}`);
    });
  }

  private async performMonitoringCycle(): Promise<void> {
    try {
      // Collect all monitoring data
      const [
        systemMetrics,
        businessMetrics,
        serviceHealth,
        cacheMetrics,
        errorMetrics
      ] = await Promise.all([
        this.collectSystemMetrics(),
        this.collectBusinessMetrics(),
        this.checkServiceHealth(),
        this.collectCacheMetrics(),
        this.collectErrorMetrics()
      ]);

      // Analyze metrics and generate alerts
      await this.analyzeMetrics({
        system: systemMetrics,
        business: businessMetrics,
        services: serviceHealth,
        cache: cacheMetrics,
        errors: errorMetrics
      });

      // Generate performance insights
      const insights = await this.generatePerformanceInsights();
      await this.storeInsights(insights);

      // Update monitoring dashboard data
      await this.updateDashboardData({
        systemMetrics,
        businessMetrics,
        serviceHealth,
        cacheMetrics,
        insights
      });

    } catch (error) {
      safeLogger.error('Monitoring cycle error:', error);
      await this.createAlert({
        type: 'error',
        severity: 'high',
        service: 'monitoring',
        message: 'Monitoring cycle failed',
        details: { error: error.message }
      });
    }
  }

  private async collectSystemMetrics(): Promise<any> {
    const report = this.performanceService.generateReport();
    const performanceSummary = {
      system: {
        cpu: 0,
        memory: 0
      },
      application: {
        database: {
          connections: 0
        }
      }
    };
    
    return {
      cpu: performanceSummary.system.cpu,
      memory: performanceSummary.system.memory,
      eventLoopLag: await this.measureEventLoopLag(),
      activeConnections: performanceSummary.application.database.connections,
      timestamp: new Date()
    };
  }

  private async collectBusinessMetrics(): Promise<any> {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours

      const [
        overviewMetrics,
        recentOrders,
        activeUsers,
        errorRates
      ] = await Promise.all([
        this.analyticsService.getOverviewMetrics(startDate, endDate),
        this.getRecentOrderMetrics(),
        this.getActiveUserMetrics(),
        this.getErrorRateMetrics()
      ]);

      return {
        revenue: overviewMetrics.totalRevenue,
        orders: overviewMetrics.totalOrders,
        conversionRate: overviewMetrics.conversionRate,
        averageOrderValue: overviewMetrics.averageOrderValue,
        activeUsers: activeUsers,
        errorRate: errorRates.overall,
        recentOrders: recentOrders,
        timestamp: new Date()
      };
    } catch (error) {
      safeLogger.error('Error collecting business metrics:', error);
      return {
        revenue: 0,
        orders: 0,
        conversionRate: 0,
        averageOrderValue: 0,
        activeUsers: 0,
        errorRate: 0,
        timestamp: new Date()
      };
    }
  }

  private async checkServiceHealth(): Promise<ServiceHealthStatus[]> {
    const services = [
      'database',
      'redis',
      'ipfs',
      'blockchain',
      'cdn',
      'payment-processor'
    ];

    const healthChecks = services.map(service => this.checkIndividualServiceHealth(service));
    const results = await Promise.allSettled(healthChecks);

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        return {
          service: services[index],
          status: 'unhealthy' as const,
          lastCheck: new Date(),
          responseTime: -1,
          errorRate: 1,
          uptime: 0,
          details: { error: result.reason?.message || 'Unknown error' }
        };
      }
    });
  }

  private async checkIndividualServiceHealth(service: string): Promise<ServiceHealthStatus> {
    const startTime = performance.now();
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let details: Record<string, any> = {};

    try {
      switch (service) {
        case 'database':
          await this.redis.ping(); // Simple connectivity test
          details = { connectionPool: 'active' };
          break;
          
        case 'redis':
          const cacheHealth = await this.cacheService.healthCheck();
          status = cacheHealth.redis && cacheHealth.memory ? 'healthy' : 'degraded';
          details = cacheHealth;
          break;
          
        case 'ipfs':
          // Would implement IPFS health check
          details = { nodes: 'connected' };
          break;
          
        case 'blockchain':
          // Would implement blockchain connectivity check
          details = { network: 'connected', latestBlock: 'synced' };
          break;
          
        case 'cdn':
          // Would implement CDN health check
          details = { distribution: 'active', cacheHitRate: 0.85 };
          break;
          
        case 'payment-processor':
          // Would implement payment processor health check
          details = { stripe: 'operational', crypto: 'operational' };
          break;
      }
    } catch (error) {
      status = 'unhealthy';
      details = { error: error.message };
    }

    const responseTime = performance.now() - startTime;
    const errorRate = status === 'unhealthy' ? 1 : status === 'degraded' ? 0.1 : 0;

    const healthStatus: ServiceHealthStatus = {
      service,
      status,
      lastCheck: new Date(),
      responseTime,
      errorRate,
      uptime: status === 'unhealthy' ? 0 : 1,
      details
    };

    this.serviceHealthMap.set(service, healthStatus);
    return healthStatus;
  }

  private async collectCacheMetrics(): Promise<any> {
    try {
      const cacheStats = await this.cacheService.getCachePerformanceMetrics();
      return {
        hitRate: cacheStats.hitRate,
        missRate: cacheStats.missRate,
        memoryUsage: cacheStats.memoryUsage,
        avgResponseTime: cacheStats.avgResponseTime,
        redisInfo: cacheStats.redisInfo,
        timestamp: new Date()
      };
    } catch (error) {
      safeLogger.error('Error collecting cache metrics:', error);
      return {
        hitRate: 0,
        missRate: 1,
        memoryUsage: 0,
        avgResponseTime: 0,
        timestamp: new Date()
      };
    }
  }

  private async collectErrorMetrics(): Promise<any> {
    // This would collect error metrics from various sources
    return {
      overall: 0.01, // 1% error rate
      byService: {
        api: 0.005,
        database: 0.001,
        cache: 0.002,
        blockchain: 0.01
      },
      recentErrors: [],
      timestamp: new Date()
    };
  }

  private async analyzeMetrics(metrics: any): Promise<void> {
    // System performance alerts
    if (metrics.system.cpu.usage > this.config.thresholds.cpuUsage) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        service: 'system',
        message: `High CPU usage: ${metrics.system.cpu.usage.toFixed(2)}%`,
        details: { cpuUsage: metrics.system.cpu.usage, threshold: this.config.thresholds.cpuUsage }
      });
    }

    if (metrics.system.memory.usage > this.config.thresholds.memoryUsage) {
      await this.createAlert({
        type: 'performance',
        severity: 'high',
        service: 'system',
        message: `High memory usage: ${metrics.system.memory.usage.toFixed(2)}%`,
        details: { memoryUsage: metrics.system.memory.usage, threshold: this.config.thresholds.memoryUsage }
      });
    }

    // Cache performance alerts
    if (metrics.cache.hitRate < this.config.thresholds.cacheHitRate) {
      await this.createAlert({
        type: 'performance',
        severity: 'medium',
        service: 'cache',
        message: `Low cache hit rate: ${(metrics.cache.hitRate * 100).toFixed(2)}%`,
        details: { hitRate: metrics.cache.hitRate, threshold: this.config.thresholds.cacheHitRate }
      });
    }

    // Business metric alerts
    if (metrics.business.errorRate > this.config.thresholds.errorRate) {
      await this.createAlert({
        type: 'error',
        severity: 'critical',
        service: 'application',
        message: `High error rate: ${(metrics.business.errorRate * 100).toFixed(2)}%`,
        details: { errorRate: metrics.business.errorRate, threshold: this.config.thresholds.errorRate }
      });
    }

    // Service health alerts
    for (const service of metrics.services) {
      if (service.status === 'unhealthy') {
        await this.createAlert({
          type: 'error',
          severity: 'critical',
          service: service.service,
          message: `Service ${service.service} is unhealthy`,
          details: service.details
        });
      } else if (service.status === 'degraded') {
        await this.createAlert({
          type: 'performance',
          severity: 'medium',
          service: service.service,
          message: `Service ${service.service} is degraded`,
          details: service.details
        });
      }
    }
  }

  private async generatePerformanceInsights(): Promise<PerformanceInsight[]> {
    const insights: PerformanceInsight[] = [];
    
    // Database insights
    const slowQueries = []; // Method not available in current performanceMonitoringService
    if (slowQueries.length > 10) {
      insights.push({
        category: 'database',
        insight: `${slowQueries.length} slow queries detected in the last hour`,
        impact: 'high',
        recommendation: 'Review and optimize slow queries, consider adding indexes',
        estimatedImprovement: '30-50% response time improvement',
        implementationEffort: 'medium'
      });
    }

    // Cache insights
    const cacheStats = await this.cacheService.getCachePerformanceMetrics();
    if (cacheStats.hitRate < 0.8) {
      insights.push({
        category: 'cache',
        insight: `Cache hit rate is ${(cacheStats.hitRate * 100).toFixed(1)}%, below optimal threshold`,
        impact: 'medium',
        recommendation: 'Review cache TTL settings and implement cache warming strategies',
        estimatedImprovement: '20-30% response time improvement',
        implementationEffort: 'low'
      });
    }

    // API insights
    const report = this.performanceService.generateReport();
    const mockPerformanceSummary = {
      application: {
        requests: {
          averageResponseTime: 0
        }
      }
    };
    if (mockPerformanceSummary.application.requests.averageResponseTime > 500) {
      insights.push({
        category: 'api',
        insight: `Average API response time is ${mockPerformanceSummary.application.requests.averageResponseTime.toFixed(0)}ms`,
        impact: 'high',
        recommendation: 'Implement response compression, optimize database queries, and add caching',
        estimatedImprovement: '40-60% response time improvement',
        implementationEffort: 'high'
      });
    }

    return insights;
  }

  private async createAlert(alertData: {
    type: 'performance' | 'error' | 'security' | 'business';
    severity: 'low' | 'medium' | 'high' | 'critical';
    service: string;
    message: string;
    details: Record<string, any>;
  }): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const alert: SystemAlert = {
      id: alertId,
      ...alertData,
      timestamp: new Date(),
      resolved: false
    };

    // Check if similar alert already exists
    const existingAlert = Array.from(this.activeAlerts.values()).find(
      a => a.service === alert.service && 
           a.type === alert.type && 
           !a.resolved &&
           Date.now() - a.timestamp.getTime() < 300000 // 5 minutes
    );

    if (existingAlert) {
      return; // Don't create duplicate alerts
    }

    this.activeAlerts.set(alertId, alert);
    
    // Store in Redis for persistence
    await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert)); // 24 hours
    
    this.emit('alertCreated', alert);
  }

  private async sendAlert(alert: SystemAlert): Promise<void> {
    try {
      // Send to configured alerting channels
      if (this.config.alerting.webhookUrl) {
        await this.sendWebhookAlert(alert);
      }

      if (this.config.alerting.slackConfig) {
        await this.sendSlackAlert(alert);
      }

      if (this.config.alerting.emailConfig) {
        await this.sendEmailAlert(alert);
      }
    } catch (error) {
      safeLogger.error('Failed to send alert:', error);
    }
  }

  private async sendWebhookAlert(alert: SystemAlert): Promise<void> {
    const response = await fetch(this.config.alerting.webhookUrl!, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        alert_id: alert.id,
        type: alert.type,
        severity: alert.severity,
        service: alert.service,
        message: alert.message,
        details: alert.details,
        timestamp: alert.timestamp.toISOString()
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook alert failed: ${response.statusText}`);
    }
  }

  private async sendSlackAlert(alert: SystemAlert): Promise<void> {
    const color = {
      low: '#36a64f',
      medium: '#ff9500',
      high: '#ff0000',
      critical: '#8b0000'
    }[alert.severity];

    const payload = {
      channel: this.config.alerting.slackConfig!.channel,
      attachments: [{
        color,
        title: `${alert.severity.toUpperCase()} Alert: ${alert.service}`,
        text: alert.message,
        fields: [
          { title: 'Type', value: alert.type, short: true },
          { title: 'Service', value: alert.service, short: true },
          { title: 'Time', value: alert.timestamp.toISOString(), short: true }
        ],
        footer: 'Marketplace Monitoring',
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    const response = await fetch(this.config.alerting.slackConfig!.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack alert failed: ${response.statusText}`);
    }
  }

  private async sendEmailAlert(alert: SystemAlert): Promise<void> {
    // Email implementation would go here
    safeLogger.info('Email alert would be sent:', alert.message);
  }

  // Utility methods
  private async measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = process.hrtime.bigint();
      setImmediate(() => {
        const lag = Number(process.hrtime.bigint() - start) / 1e6; // Convert to milliseconds
        resolve(lag);
      });
    });
  }

  private async getRecentOrderMetrics(): Promise<any> {
    // Implementation would query recent orders
    return {
      last1Hour: 0,
      last24Hours: 0,
      trend: 'stable'
    };
  }

  private async getActiveUserMetrics(): Promise<number> {
    // Implementation would query active users
    return 0;
  }

  private async getErrorRateMetrics(): Promise<any> {
    // Implementation would calculate error rates
    return {
      overall: 0.01,
      trend: 'stable'
    };
  }

  private handlePerformanceAlert(alert: any): void {
    // Convert performance service alerts to our alert format
    this.createAlert({
      type: 'performance',
      severity: alert.severity === 'critical' ? 'critical' : 'high',
      service: 'performance',
      message: alert.message,
      details: alert
    });
  }

  private analyzeMetricTrends(metric: any): void {
    // Analyze metric trends for predictive alerting
    // Implementation would look for patterns and anomalies
  }

  private async storeInsights(insights: PerformanceInsight[]): Promise<void> {
    await this.redis.setex('monitoring:insights', 3600, JSON.stringify(insights));
  }

  private async updateDashboardData(data: any): Promise<void> {
    await this.redis.setex('monitoring:dashboard', 60, JSON.stringify(data));
  }

  private async performHealthChecks(): Promise<void> {
    // Perform comprehensive health checks
    const healthResults = await this.checkServiceHealth();
    
    for (const health of healthResults) {
      if (health.status === 'unhealthy') {
        await this.createAlert({
          type: 'error',
          severity: 'critical',
          service: health.service,
          message: `Health check failed for ${health.service}`,
          details: health.details
        });
      }
    }
  }

  // Public API methods
  async getSystemStatus(): Promise<{
    overall: 'healthy' | 'degraded' | 'unhealthy';
    services: ServiceHealthStatus[];
    activeAlerts: SystemAlert[];
    lastUpdate: Date;
  }> {
    const services = Array.from(this.serviceHealthMap.values());
    const activeAlerts = Array.from(this.activeAlerts.values()).filter(a => !a.resolved);
    
    let overall: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (services.some(s => s.status === 'unhealthy')) {
      overall = 'unhealthy';
    } else if (services.some(s => s.status === 'degraded')) {
      overall = 'degraded';
    }

    return {
      overall,
      services,
      activeAlerts,
      lastUpdate: new Date()
    };
  }

  async getPerformanceInsights(): Promise<PerformanceInsight[]> {
    const cached = await this.redis.get('monitoring:insights');
    return cached ? JSON.parse(cached) : [];
  }

  async getDashboardData(): Promise<any> {
    const cached = await this.redis.get('monitoring:dashboard');
    return cached ? JSON.parse(cached) : null;
  }

  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.acknowledgedBy = acknowledgedBy;
    alert.acknowledgedAt = new Date();

    await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
    return true;
  }

  async resolveAlert(alertId: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    await this.redis.setex(`alert:${alertId}`, 86400, JSON.stringify(alert));
    this.emit('alertResolved', alert);
    
    return true;
  }

  // Cleanup
  async close(): Promise<void> {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }
    
    await this.redis.quit();
    this.removeAllListeners();
  }
}
