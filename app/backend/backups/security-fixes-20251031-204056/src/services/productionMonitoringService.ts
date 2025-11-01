/**
 * Production Monitoring Service
 * 
 * Provides comprehensive monitoring capabilities for the seller integration
 * system in production environment.
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';

interface MonitoringMetrics {
  timestamp: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
  memoryUsage: number;
  cpuUsage: number;
  activeConnections: number;
  cacheHitRate: number;
  databaseConnections: number;
}

interface AlertThreshold {
  metric: keyof MonitoringMetrics;
  threshold: number;
  operator: 'gt' | 'lt' | 'eq';
  severity: 'low' | 'medium' | 'high' | 'critical';
}

interface Alert {
  id: string;
  timestamp: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metric: string;
  value: number;
  threshold: number;
  message: string;
  resolved: boolean;
}

interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: any;
}

class ProductionMonitoringService extends EventEmitter {
  private metrics: MonitoringMetrics[] = [];
  private alerts: Alert[] = [];
  private alertThresholds: AlertThreshold[] = [];
  private healthChecks: Map<string, () => Promise<HealthCheckResult>> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private isMonitoring = false;

  constructor() {
    super();
    this.setupDefaultThresholds();
    this.setupDefaultHealthChecks();
  }

  /**
   * Start production monitoring
   */
  startMonitoring(intervalMs: number = 30000): void {
    if (this.isMonitoring) {
      safeLogger.warn('Monitoring is already running');
      return;
    }

    safeLogger.info('🔍 Starting production monitoring...');
    this.isMonitoring = true;

    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.checkAlerts();
        await this.runHealthChecks();
      } catch (error) {
        safeLogger.error('Error during monitoring cycle:', error);
        this.emit('monitoring-error', error);
      }
    }, intervalMs);

    this.emit('monitoring-started');
  }

  /**
   * Stop production monitoring
   */
  stopMonitoring(): void {
    if (!this.isMonitoring) {
      return;
    }

    safeLogger.info('🛑 Stopping production monitoring...');
    
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    this.isMonitoring = false;
    this.emit('monitoring-stopped');
  }

  /**
   * Collect system metrics
   */
  private async collectMetrics(): Promise<void> {
    const startTime = performance.now();

    try {
      const metrics: MonitoringMetrics = {
        timestamp: Date.now(),
        responseTime: await this.measureResponseTime(),
        errorRate: await this.calculateErrorRate(),
        throughput: await this.calculateThroughput(),
        memoryUsage: await this.getMemoryUsage(),
        cpuUsage: await this.getCpuUsage(),
        activeConnections: await this.getActiveConnections(),
        cacheHitRate: await this.getCacheHitRate(),
        databaseConnections: await this.getDatabaseConnections(),
      };

      this.metrics.push(metrics);

      // Keep only last 1000 metrics to prevent memory issues
      if (this.metrics.length > 1000) {
        this.metrics = this.metrics.slice(-1000);
      }

      this.emit('metrics-collected', metrics);

    } catch (error) {
      safeLogger.error('Error collecting metrics:', error);
      throw error;
    }
  }

  /**
   * Check alert thresholds
   */
  private async checkAlerts(): Promise<void> {
    if (this.metrics.length === 0) return;

    const latestMetrics = this.metrics[this.metrics.length - 1];

    for (const threshold of this.alertThresholds) {
      const value = latestMetrics[threshold.metric];
      let triggered = false;

      switch (threshold.operator) {
        case 'gt':
          triggered = value > threshold.threshold;
          break;
        case 'lt':
          triggered = value < threshold.threshold;
          break;
        case 'eq':
          triggered = value === threshold.threshold;
          break;
      }

      if (triggered) {
        await this.triggerAlert(threshold, value);
      }
    }
  }

  /**
   * Trigger an alert
   */
  private async triggerAlert(threshold: AlertThreshold, value: number): Promise<void> {
    const alertId = `${threshold.metric}-${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      timestamp: Date.now(),
      severity: threshold.severity,
      metric: threshold.metric,
      value,
      threshold: threshold.threshold,
      message: `${threshold.metric} (${value}) ${threshold.operator} ${threshold.threshold}`,
      resolved: false,
    };

    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    safeLogger.warn(`🚨 Alert triggered: ${alert.message} (Severity: ${alert.severity})`);
    this.emit('alert-triggered', alert);

    // Send notifications based on severity
    await this.sendAlertNotification(alert);
  }

  /**
   * Send alert notification
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // In production, this would integrate with notification services
      // like Slack, PagerDuty, email, etc.
      
      if (alert.severity === 'critical') {
        safeLogger.error(`🚨 CRITICAL ALERT: ${alert.message}`);
        // Send immediate notification to on-call team
      } else if (alert.severity === 'high') {
        safeLogger.warn(`⚠️  HIGH ALERT: ${alert.message}`);
        // Send notification to team channel
      } else {
        safeLogger.info(`ℹ️  Alert: ${alert.message}`);
        // Log to monitoring dashboard
      }

    } catch (error) {
      safeLogger.error('Error sending alert notification:', error);
    }
  }

  /**
   * Run health checks
   */
  private async runHealthChecks(): Promise<void> {
    const healthResults: HealthCheckResult[] = [];

    for (const [serviceName, healthCheck] of this.healthChecks) {
      try {
        const result = await healthCheck();
        healthResults.push(result);

        if (result.status === 'unhealthy') {
          safeLogger.error(`❌ Health check failed for ${serviceName}: ${result.details?.error}`);
          this.emit('health-check-failed', result);
        }

      } catch (error) {
        const result: HealthCheckResult = {
          service: serviceName,
          status: 'unhealthy',
          responseTime: 0,
          details: { error: error.message },
        };

        healthResults.push(result);
        safeLogger.error(`❌ Health check error for ${serviceName}:`, error);
        this.emit('health-check-failed', result);
      }
    }

    this.emit('health-checks-completed', healthResults);
  }

  /**
   * Setup default alert thresholds
   */
  private setupDefaultThresholds(): void {
    this.alertThresholds = [
      {
        metric: 'responseTime',
        threshold: 2000, // 2 seconds
        operator: 'gt',
        severity: 'high',
      },
      {
        metric: 'errorRate',
        threshold: 5, // 5%
        operator: 'gt',
        severity: 'high',
      },
      {
        metric: 'memoryUsage',
        threshold: 85, // 85%
        operator: 'gt',
        severity: 'medium',
      },
      {
        metric: 'cpuUsage',
        threshold: 80, // 80%
        operator: 'gt',
        severity: 'medium',
      },
      {
        metric: 'cacheHitRate',
        threshold: 70, // 70%
        operator: 'lt',
        severity: 'low',
      },
      {
        metric: 'databaseConnections',
        threshold: 90, // 90% of pool
        operator: 'gt',
        severity: 'high',
      },
    ];
  }

  /**
   * Setup default health checks
   */
  private setupDefaultHealthChecks(): void {
    // Database health check
    this.healthChecks.set('database', async () => {
      const startTime = performance.now();
      
      try {
        // In production, this would check actual database connectivity
        // For now, simulate a health check
        await new Promise(resolve => setTimeout(resolve, 10));
        
        return {
          service: 'database',
          status: 'healthy',
          responseTime: performance.now() - startTime,
        };
      } catch (error) {
        return {
          service: 'database',
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          details: { error: error.message },
        };
      }
    });

    // Cache health check
    this.healthChecks.set('cache', async () => {
      const startTime = performance.now();
      
      try {
        // In production, this would check Redis/cache connectivity
        await new Promise(resolve => setTimeout(resolve, 5));
        
        return {
          service: 'cache',
          status: 'healthy',
          responseTime: performance.now() - startTime,
        };
      } catch (error) {
        return {
          service: 'cache',
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          details: { error: error.message },
        };
      }
    });

    // WebSocket health check
    this.healthChecks.set('websocket', async () => {
      const startTime = performance.now();
      
      try {
        // In production, this would check WebSocket server status
        await new Promise(resolve => setTimeout(resolve, 15));
        
        return {
          service: 'websocket',
          status: 'healthy',
          responseTime: performance.now() - startTime,
        };
      } catch (error) {
        return {
          service: 'websocket',
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          details: { error: error.message },
        };
      }
    });

    // Seller API health check
    this.healthChecks.set('seller-api', async () => {
      const startTime = performance.now();
      
      try {
        // In production, this would test seller API endpoints
        await new Promise(resolve => setTimeout(resolve, 20));
        
        return {
          service: 'seller-api',
          status: 'healthy',
          responseTime: performance.now() - startTime,
        };
      } catch (error) {
        return {
          service: 'seller-api',
          status: 'unhealthy',
          responseTime: performance.now() - startTime,
          details: { error: error.message },
        };
      }
    });
  }

  /**
   * Metric collection methods
   */

  private async measureResponseTime(): Promise<number> {
    // In production, this would measure actual API response times
    // For now, simulate response time measurement
    return Math.random() * 1000 + 100; // 100-1100ms
  }

  private async calculateErrorRate(): Promise<number> {
    // In production, this would calculate actual error rate from logs
    // For now, simulate error rate
    return Math.random() * 2; // 0-2%
  }

  private async calculateThroughput(): Promise<number> {
    // In production, this would calculate requests per second
    // For now, simulate throughput
    return Math.random() * 200 + 50; // 50-250 req/s
  }

  private async getMemoryUsage(): Promise<number> {
    // Get actual memory usage
    const memUsage = process.memoryUsage();
    const totalMemory = memUsage.heapTotal + memUsage.external;
    const usedMemory = memUsage.heapUsed;
    
    return (usedMemory / totalMemory) * 100;
  }

  private async getCpuUsage(): Promise<number> {
    // In production, this would get actual CPU usage
    // For now, simulate CPU usage
    return Math.random() * 60 + 20; // 20-80%
  }

  private async getActiveConnections(): Promise<number> {
    // In production, this would count active connections
    // For now, simulate active connections
    return Math.floor(Math.random() * 100) + 10; // 10-110 connections
  }

  private async getCacheHitRate(): Promise<number> {
    // In production, this would calculate cache hit rate
    // For now, simulate cache hit rate
    return Math.random() * 30 + 70; // 70-100%
  }

  private async getDatabaseConnections(): Promise<number> {
    // In production, this would count database connections
    // For now, simulate database connections
    return Math.floor(Math.random() * 20) + 5; // 5-25 connections
  }

  /**
   * Public API methods
   */

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MonitoringMetrics | null {
    return this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : null;
  }

  /**
   * Get metrics history
   */
  getMetricsHistory(limit: number = 100): MonitoringMetrics[] {
    return this.metrics.slice(-limit);
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  /**
   * Get all alerts
   */
  getAllAlerts(limit: number = 50): Alert[] {
    return this.alerts.slice(-limit);
  }

  /**
   * Resolve an alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = true;
      this.emit('alert-resolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Add custom alert threshold
   */
  addAlertThreshold(threshold: AlertThreshold): void {
    this.alertThresholds.push(threshold);
  }

  /**
   * Add custom health check
   */
  addHealthCheck(name: string, healthCheck: () => Promise<HealthCheckResult>): void {
    this.healthChecks.set(name, healthCheck);
  }

  /**
   * Get system status summary
   */
  getSystemStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: MonitoringMetrics | null;
    activeAlerts: number;
    criticalAlerts: number;
  } {
    const currentMetrics = this.getCurrentMetrics();
    const activeAlerts = this.getActiveAlerts();
    const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (criticalAlerts.length > 0) {
      status = 'unhealthy';
    } else if (activeAlerts.length > 0) {
      status = 'degraded';
    }

    return {
      status,
      metrics: currentMetrics,
      activeAlerts: activeAlerts.length,
      criticalAlerts: criticalAlerts.length,
    };
  }

  /**
   * Generate monitoring report
   */
  generateReport(timeRangeMs: number = 3600000): {
    summary: any;
    metrics: MonitoringMetrics[];
    alerts: Alert[];
    recommendations: string[];
  } {
    const now = Date.now();
    const startTime = now - timeRangeMs;

    const metricsInRange = this.metrics.filter(m => m.timestamp >= startTime);
    const alertsInRange = this.alerts.filter(a => a.timestamp >= startTime);

    const summary = {
      timeRange: `${new Date(startTime).toISOString()} - ${new Date(now).toISOString()}`,
      totalMetrics: metricsInRange.length,
      totalAlerts: alertsInRange.length,
      criticalAlerts: alertsInRange.filter(a => a.severity === 'critical').length,
      averageResponseTime: metricsInRange.length > 0 
        ? metricsInRange.reduce((sum, m) => sum + m.responseTime, 0) / metricsInRange.length 
        : 0,
      averageErrorRate: metricsInRange.length > 0 
        ? metricsInRange.reduce((sum, m) => sum + m.errorRate, 0) / metricsInRange.length 
        : 0,
    };

    const recommendations = this.generateRecommendations(metricsInRange, alertsInRange);

    return {
      summary,
      metrics: metricsInRange,
      alerts: alertsInRange,
      recommendations,
    };
  }

  /**
   * Generate recommendations based on metrics and alerts
   */
  private generateRecommendations(metrics: MonitoringMetrics[], alerts: Alert[]): string[] {
    const recommendations: string[] = [];

    if (alerts.length === 0) {
      recommendations.push('System is performing well with no active alerts');
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    if (criticalAlerts.length > 0) {
      recommendations.push(`Address ${criticalAlerts.length} critical alerts immediately`);
    }

    const highAlerts = alerts.filter(a => a.severity === 'high');
    if (highAlerts.length > 0) {
      recommendations.push(`Review ${highAlerts.length} high-severity alerts`);
    }

    if (metrics.length > 0) {
      const avgResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / metrics.length;
      if (avgResponseTime > 1500) {
        recommendations.push('Consider optimizing response times - average is above 1.5 seconds');
      }

      const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;
      if (avgErrorRate > 2) {
        recommendations.push('Investigate error sources - error rate is above 2%');
      }

      const avgCacheHitRate = metrics.reduce((sum, m) => sum + m.cacheHitRate, 0) / metrics.length;
      if (avgCacheHitRate < 80) {
        recommendations.push('Optimize caching strategy - hit rate is below 80%');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Continue monitoring system performance');
      recommendations.push('Consider implementing additional performance optimizations');
    }

    return recommendations;
  }
}

export { ProductionMonitoringService, MonitoringMetrics, Alert, HealthCheckResult, AlertThreshold };