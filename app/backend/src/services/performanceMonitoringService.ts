import { logger } from '../utils/logger';
import { EventEmitter } from 'events';

export interface PerformanceMetrics {
  timestamp: Date;
  responseTime: number;
  endpoint: string;
  method: string;
  statusCode: number;
  memoryUsage?: NodeJS.MemoryUsage;
  cpuUsage?: NodeJS.CpuUsage;
  databaseQueryTime?: number;
  cacheHitRate?: number;
  errorCount?: number;
}

export interface AlertThresholds {
  responseTime: number; // ms
  errorRate: number; // percentage
  memoryUsage: number; // MB
  cpuUsage: number; // percentage
  databaseQueryTime: number; // ms
}

export interface PerformanceAlert {
  id: string;
  type: 'response_time' | 'error_rate' | 'memory_usage' | 'cpu_usage' | 'database_performance';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  metric: PerformanceMetrics;
  threshold: number;
  timestamp: Date;
  resolved: boolean;
  resolvedAt?: Date;
}

export class PerformanceMonitoringService extends EventEmitter {
  private static instance: PerformanceMonitoringService;
  private metrics: PerformanceMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private thresholds: AlertThresholds;
  private metricsWindow: number = 3600000; // 1 hour in ms
  private alertCooldowns: Map<string, Date> = new Map();
  private monitoringInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.thresholds = {
      responseTime: 300, // 300ms
      errorRate: 5, // 5%
      memoryUsage: 1024, // 1GB
      cpuUsage: 80, // 80%
      databaseQueryTime: 100 // 100ms
    };
    this.startMonitoring();
  }

  static getInstance(): PerformanceMonitoringService {
    if (!PerformanceMonitoringService.instance) {
      PerformanceMonitoringService.instance = new PerformanceMonitoringService();
    }
    return PerformanceMonitoringService.instance;
  }

  private startMonitoring(): void {
    // Collect system metrics every 30 seconds
    this.monitoringInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, 30000);

    // Clean old metrics every 5 minutes
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 300000);

    logger.info('Performance monitoring service started');
  }

  private collectSystemMetrics(): void {
    try {
      const memUsage = process.memoryUsage();
      const cpuUsage = process.cpuUsage();

      // Check memory usage
      const memoryMB = memUsage.heapUsed / 1024 / 1024;
      if (memoryMB > this.thresholds.memoryUsage) {
        this.createAlert({
          type: 'memory_usage',
          severity: memoryMB > this.thresholds.memoryUsage * 1.5 ? 'critical' : 'high',
          message: `High memory usage: ${memoryMB.toFixed(2)}MB`,
          metric: {
            timestamp: new Date(),
            responseTime: 0,
            endpoint: 'system',
            method: 'MONITOR',
            statusCode: 200,
            memoryUsage: memUsage,
            cpuUsage
          },
          threshold: this.thresholds.memoryUsage
        });
      }

      // Check CPU usage (simplified)
      const cpuPercent = (cpuUsage.user + cpuUsage.system) / 1000000; // Convert to seconds
      if (cpuPercent > this.thresholds.cpuUsage) {
        this.createAlert({
          type: 'cpu_usage',
          severity: cpuPercent > this.thresholds.cpuUsage * 1.5 ? 'critical' : 'high',
          message: `High CPU usage: ${cpuPercent.toFixed(2)}%`,
          metric: {
            timestamp: new Date(),
            responseTime: 0,
            endpoint: 'system',
            method: 'MONITOR',
            statusCode: 200,
            memoryUsage: memUsage,
            cpuUsage
          },
          threshold: this.thresholds.cpuUsage
        });
      }
    } catch (error) {
      logger.error('Failed to collect system metrics', { error });
    }
  }

  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.metricsWindow);
    this.metrics = this.metrics.filter(metric => metric.timestamp > cutoffTime);
  }

  recordMetric(metric: Omit<PerformanceMetrics, 'timestamp'>): void {
    const fullMetric: PerformanceMetrics = {
      ...metric,
      timestamp: new Date()
    };

    this.metrics.push(fullMetric);

    // Check for performance issues
    this.checkPerformanceThresholds(fullMetric);

    // Emit metric for real-time monitoring
    this.emit('metric', fullMetric);
  }

  recordRequest(
    method: string,
    endpoint: string,
    responseTime: number,
    statusCode: number,
    error?: any
  ): void {
    const metric: Omit<PerformanceMetrics, 'timestamp'> = {
      method,
      endpoint,
      responseTime,
      statusCode,
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage(),
      errorCount: statusCode >= 400 ? 1 : 0
    };

    this.recordMetric(metric);
  }

  private checkPerformanceThresholds(metric: PerformanceMetrics): void {
    // Check response time
    if (metric.responseTime > this.thresholds.responseTime) {
      this.createAlert({
        type: 'response_time',
        severity: metric.responseTime > this.thresholds.responseTime * 2 ? 'critical' : 'high',
        message: `Slow response time: ${metric.responseTime}ms for ${metric.method} ${metric.endpoint}`,
        metric,
        threshold: this.thresholds.responseTime
      });
    }

    // Check database query time
    if (metric.databaseQueryTime && metric.databaseQueryTime > this.thresholds.databaseQueryTime) {
      this.createAlert({
        type: 'database_performance',
        severity: metric.databaseQueryTime > this.thresholds.databaseQueryTime * 2 ? 'critical' : 'high',
        message: `Slow database query: ${metric.databaseQueryTime}ms`,
        metric,
        threshold: this.thresholds.databaseQueryTime
      });
    }

    // Check error rate
    if (metric.statusCode >= 400) {
      this.checkErrorRate(metric);
    }
  }

  private checkErrorRate(metric: PerformanceMetrics): void {
    const recentMetrics = this.metrics.filter(m => 
      m.timestamp > new Date(Date.now() - 300000) && // Last 5 minutes
      m.endpoint === metric.endpoint
    );

    if (recentMetrics.length < 10) return; // Not enough data

    const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / recentMetrics.length) * 100;

    if (errorRate > this.thresholds.errorRate) {
      this.createAlert({
        type: 'error_rate',
        severity: errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'high',
        message: `High error rate: ${errorRate.toFixed(2)}% for ${metric.endpoint}`,
        metric,
        threshold: this.thresholds.errorRate
      });
    }
  }

  private createAlert(alertData: Omit<PerformanceAlert, 'id' | 'timestamp' | 'resolved'>): void {
    // Check cooldown to prevent alert spam
    const cooldownKey = `${alertData.type}-${alertData.metric.endpoint}`;
    const lastAlert = this.alertCooldowns.get(cooldownKey);
    
    if (lastAlert && Date.now() - lastAlert.getTime() < 60000) { // 1 minute cooldown
      return;
    }

    const alert: PerformanceAlert = {
      ...alertData,
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date(),
      resolved: false
    };

    this.alerts.push(alert);
    this.alertCooldowns.set(cooldownKey, new Date());

    // Emit alert for real-time notifications
    this.emit('alert', alert);

    logger.warn('Performance alert created', {
      alertId: alert.id,
      type: alert.type,
      severity: alert.severity,
      message: alert.message
    });
  }

  getMetrics(timeRange?: { start: Date; end: Date }): PerformanceMetrics[] {
    if (!timeRange) {
      return this.metrics;
    }

    return this.metrics.filter(metric => 
      metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
    );
  }

  getAlerts(resolved?: boolean): PerformanceAlert[] {
    return this.alerts.filter(alert => resolved === undefined || alert.resolved === resolved);
  }

  resolveAlert(alertId: string): boolean {
    const alert = this.alerts.find(a => a.id === alertId);
    if (!alert) return false;

    alert.resolved = true;
    alert.resolvedAt = new Date();

    this.emit('alertResolved', alert);
    logger.info('Performance alert resolved', { alertId });

    return true;
  }

  updateThresholds(newThresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Performance thresholds updated', { thresholds: this.thresholds });
  }

  getPerformanceReport(timeRange?: { start: Date; end: Date }): {
    summary: {
      totalRequests: number;
      averageResponseTime: number;
      errorRate: number;
      p95ResponseTime: number;
      p99ResponseTime: number;
    };
    endpoints: Array<{
      endpoint: string;
      requestCount: number;
      averageResponseTime: number;
      errorRate: number;
    }>;
    alerts: PerformanceAlert[];
  } {
    const metrics = this.getMetrics(timeRange);
    const alerts = this.getAlerts(false);

    if (metrics.length === 0) {
      return {
        summary: {
          totalRequests: 0,
          averageResponseTime: 0,
          errorRate: 0,
          p95ResponseTime: 0,
          p99ResponseTime: 0
        },
        endpoints: [],
        alerts
      };
    }

    // Calculate percentiles
    const responseTimes = metrics.map(m => m.responseTime).sort((a, b) => a - b);
    const p95Index = Math.floor(responseTimes.length * 0.95);
    const p99Index = Math.floor(responseTimes.length * 0.99);

    const totalRequests = metrics.length;
    const averageResponseTime = metrics.reduce((sum, m) => sum + m.responseTime, 0) / totalRequests;
    const errorCount = metrics.filter(m => m.statusCode >= 400).length;
    const errorRate = (errorCount / totalRequests) * 100;

    // Group by endpoint
    const endpointGroups = metrics.reduce((groups, metric) => {
      const key = metric.endpoint;
      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(metric);
      return groups;
    }, {} as Record<string, PerformanceMetrics[]>);

    const endpoints = Object.entries(endpointGroups).map(([endpoint, endpointMetrics]) => {
      const endpointRequestCount = endpointMetrics.length;
      const endpointAverageResponseTime = endpointMetrics.reduce((sum, m) => sum + m.responseTime, 0) / endpointRequestCount;
      const endpointErrorCount = endpointMetrics.filter(m => m.statusCode >= 400).length;
      const endpointErrorRate = (endpointErrorCount / endpointRequestCount) * 100;

      return {
        endpoint,
        requestCount: endpointRequestCount,
        averageResponseTime: endpointAverageResponseTime,
        errorRate: endpointErrorRate
      };
    });

    return {
      summary: {
        totalRequests,
        averageResponseTime,
        errorRate,
        p95ResponseTime: responseTimes[p95Index] || 0,
        p99ResponseTime: responseTimes[p99Index] || 0
      },
      endpoints,
      alerts
    };
  }

  getHealthStatus(): {
    status: 'healthy' | 'warning' | 'critical';
    checks: Array<{
      name: string;
      status: 'pass' | 'fail' | 'warn';
      message?: string;
    }>;
  } {
    const checks = [];
    let overallStatus: 'healthy' | 'warning' | 'critical' = 'healthy';

    // Check response times
    const recentMetrics = this.metrics.filter(m => 
      m.timestamp > new Date(Date.now() - 300000) // Last 5 minutes
    );

    if (recentMetrics.length > 0) {
      const avgResponseTime = recentMetrics.reduce((sum, m) => sum + m.responseTime, 0) / recentMetrics.length;
      if (avgResponseTime > this.thresholds.responseTime * 2) {
        checks.push({
          name: 'response_time',
          status: 'fail',
          message: `Average response time: ${avgResponseTime.toFixed(2)}ms`
        });
        overallStatus = 'critical';
      } else if (avgResponseTime > this.thresholds.responseTime) {
        checks.push({
          name: 'response_time',
          status: 'warn',
          message: `Average response time: ${avgResponseTime.toFixed(2)}ms`
        });
        overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
      } else {
        checks.push({
          name: 'response_time',
          status: 'pass'
        });
      }
    }

    // Check error rate
    if (recentMetrics.length > 10) {
      const errorCount = recentMetrics.filter(m => m.statusCode >= 400).length;
      const errorRate = (errorCount / recentMetrics.length) * 100;
      
      if (errorRate > this.thresholds.errorRate * 2) {
        checks.push({
          name: 'error_rate',
          status: 'fail',
          message: `Error rate: ${errorRate.toFixed(2)}%`
        });
        overallStatus = 'critical';
      } else if (errorRate > this.thresholds.errorRate) {
        checks.push({
          name: 'error_rate',
          status: 'warn',
          message: `Error rate: ${errorRate.toFixed(2)}%`
        });
        overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
      } else {
        checks.push({
          name: 'error_rate',
          status: 'pass'
        });
      }
    }

    // Check memory usage
    const memUsage = process.memoryUsage();
    const memoryMB = memUsage.heapUsed / 1024 / 1024;
    
    if (memoryMB > this.thresholds.memoryUsage * 1.5) {
      checks.push({
        name: 'memory_usage',
        status: 'fail',
        message: `Memory usage: ${memoryMB.toFixed(2)}MB`
      });
      overallStatus = 'critical';
    } else if (memoryMB > this.thresholds.memoryUsage) {
      checks.push({
        name: 'memory_usage',
        status: 'warn',
        message: `Memory usage: ${memoryMB.toFixed(2)}MB`
      });
      overallStatus = overallStatus === 'healthy' ? 'warning' : overallStatus;
    } else {
      checks.push({
        name: 'memory_usage',
        status: 'pass'
      });
    }

    return {
      status: overallStatus,
      checks
    };
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    logger.info('Performance monitoring service stopped');
  }
}

export const performanceMonitoringService = PerformanceMonitoringService.getInstance();