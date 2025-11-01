import { logger } from '../utils/logger';

// Performance metrics interface
interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  maxResponseTime: number;
  minResponseTime: number;
  errorRate: number;
  throughput: number; // requests per second
  lastUpdated: Date;
}

interface EndpointMetrics extends PerformanceMetrics {
  endpoint: string;
  method: string;
}

interface ServiceMetrics {
  overall: PerformanceMetrics;
  endpoints: Map<string, EndpointMetrics>;
  alerts: AlertMetric[];
}

interface AlertMetric {
  type: 'high_error_rate' | 'slow_response' | 'high_throughput' | 'service_down';
  message: string;
  timestamp: Date;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

class PerformanceMonitoringService {
  private metrics: ServiceMetrics = {
    overall: this.createEmptyMetrics(),
    endpoints: new Map(),
    alerts: []
  };

  private readonly ALERT_THRESHOLDS = {
    ERROR_RATE: 0.05, // 5%
    SLOW_RESPONSE: 2000, // 2 seconds
    VERY_SLOW_RESPONSE: 5000, // 5 seconds
    HIGH_THROUGHPUT: 100, // requests per second
    MAX_ALERTS: 100 // Maximum alerts to keep in memory
  };

  private createEmptyMetrics(): PerformanceMetrics {
    return {
      requestCount: 0,
      errorCount: 0,
      averageResponseTime: 0,
      maxResponseTime: 0,
      minResponseTime: Infinity,
      errorRate: 0,
      throughput: 0,
      lastUpdated: new Date()
    };
  }

  // Record a request and its performance metrics
  recordRequest(
    method: string,
    endpoint: string,
    responseTime: number,
    statusCode: number,
    error?: any
  ): void {
    const isError = statusCode >= 400;
    const endpointKey = `${method} ${endpoint}`;

    // Update overall metrics
    this.updateMetrics(this.metrics.overall, responseTime, isError);

    // Update endpoint-specific metrics
    if (!this.metrics.endpoints.has(endpointKey)) {
      this.metrics.endpoints.set(endpointKey, {
        ...this.createEmptyMetrics(),
        endpoint,
        method
      });
    }

    const endpointMetrics = this.metrics.endpoints.get(endpointKey)!;
    this.updateMetrics(endpointMetrics, responseTime, isError);

    // Check for alerts
    this.checkAlerts(endpointKey, endpointMetrics, responseTime, statusCode, error);

    // Log performance data
    this.logPerformanceData(method, endpoint, responseTime, statusCode, isError);
  }

  private updateMetrics(metrics: PerformanceMetrics, responseTime: number, isError: boolean): void {
    metrics.requestCount++;
    
    if (isError) {
      metrics.errorCount++;
    }

    // Update response time metrics
    metrics.maxResponseTime = Math.max(metrics.maxResponseTime, responseTime);
    metrics.minResponseTime = Math.min(metrics.minResponseTime, responseTime);
    
    // Calculate new average response time
    const totalTime = (metrics.averageResponseTime * (metrics.requestCount - 1)) + responseTime;
    metrics.averageResponseTime = totalTime / metrics.requestCount;

    // Calculate error rate
    metrics.errorRate = metrics.errorCount / metrics.requestCount;

    // Calculate throughput (simplified - would need time window in production)
    const timeWindow = (Date.now() - metrics.lastUpdated.getTime()) / 1000; // seconds
    if (timeWindow > 0) {
      metrics.throughput = metrics.requestCount / Math.max(timeWindow, 1);
    }

    metrics.lastUpdated = new Date();
  }

  private checkAlerts(
    endpointKey: string,
    metrics: EndpointMetrics,
    responseTime: number,
    statusCode: number,
    error?: any
  ): void {
    const alerts: AlertMetric[] = [];

    // Check error rate
    if (metrics.errorRate > this.ALERT_THRESHOLDS.ERROR_RATE && metrics.requestCount > 10) {
      alerts.push({
        type: 'high_error_rate',
        message: `High error rate detected for ${endpointKey}: ${(metrics.errorRate * 100).toFixed(2)}%`,
        timestamp: new Date(),
        severity: metrics.errorRate > 0.1 ? 'critical' : 'high',
        metadata: {
          endpoint: endpointKey,
          errorRate: metrics.errorRate,
          errorCount: metrics.errorCount,
          requestCount: metrics.requestCount
        }
      });
    }

    // Check slow response times
    if (responseTime > this.ALERT_THRESHOLDS.VERY_SLOW_RESPONSE) {
      alerts.push({
        type: 'slow_response',
        message: `Very slow response detected for ${endpointKey}: ${responseTime}ms`,
        timestamp: new Date(),
        severity: 'critical',
        metadata: {
          endpoint: endpointKey,
          responseTime,
          statusCode,
          error: error ? error.message : undefined
        }
      });
    } else if (responseTime > this.ALERT_THRESHOLDS.SLOW_RESPONSE) {
      alerts.push({
        type: 'slow_response',
        message: `Slow response detected for ${endpointKey}: ${responseTime}ms`,
        timestamp: new Date(),
        severity: 'medium',
        metadata: {
          endpoint: endpointKey,
          responseTime,
          statusCode
        }
      });
    }

    // Check high throughput
    if (metrics.throughput > this.ALERT_THRESHOLDS.HIGH_THROUGHPUT) {
      alerts.push({
        type: 'high_throughput',
        message: `High throughput detected for ${endpointKey}: ${metrics.throughput.toFixed(2)} req/s`,
        timestamp: new Date(),
        severity: 'medium',
        metadata: {
          endpoint: endpointKey,
          throughput: metrics.throughput,
          requestCount: metrics.requestCount
        }
      });
    }

    // Add alerts and log them
    alerts.forEach(alert => {
      this.addAlert(alert);
      logger.warn(alert.message, {
        alertType: alert.type,
        severity: alert.severity,
        metadata: alert.metadata,
        critical: alert.severity === 'critical'
      });
    });
  }

  private addAlert(alert: AlertMetric): void {
    this.metrics.alerts.unshift(alert);
    
    // Keep only the most recent alerts
    if (this.metrics.alerts.length > this.ALERT_THRESHOLDS.MAX_ALERTS) {
      this.metrics.alerts = this.metrics.alerts.slice(0, this.ALERT_THRESHOLDS.MAX_ALERTS);
    }
  }

  private logPerformanceData(
    method: string,
    endpoint: string,
    responseTime: number,
    statusCode: number,
    isError: boolean
  ): void {
    const logLevel = isError ? 'warn' : responseTime > this.ALERT_THRESHOLDS.SLOW_RESPONSE ? 'warn' : 'info';
    
    logger[logLevel](`API Performance: ${method} ${endpoint}`, {
      performance: {
        responseTime,
        statusCode,
        isError
      },
      endpoint: `${method} ${endpoint}`,
      operation: 'api_request'
    });
  }

  // Get current metrics
  getMetrics(): ServiceMetrics {
    return {
      overall: { ...this.metrics.overall },
      endpoints: new Map(this.metrics.endpoints),
      alerts: [...this.metrics.alerts]
    };
  }

  // Get metrics for a specific endpoint
  getEndpointMetrics(method: string, endpoint: string): EndpointMetrics | null {
    const key = `${method} ${endpoint}`;
    const metrics = this.metrics.endpoints.get(key);
    return metrics ? { ...metrics } : null;
  }

  // Get recent alerts
  getRecentAlerts(limit: number = 10): AlertMetric[] {
    return this.metrics.alerts.slice(0, limit);
  }

  // Get alerts by severity
  getAlertsBySeverity(severity: AlertMetric['severity']): AlertMetric[] {
    return this.metrics.alerts.filter(alert => alert.severity === severity);
  }

  // Reset metrics (useful for testing or periodic resets)
  resetMetrics(): void {
    this.metrics = {
      overall: this.createEmptyMetrics(),
      endpoints: new Map(),
      alerts: []
    };
    
    logger.info('Performance metrics reset', {
      operation: 'metrics_reset',
      timestamp: new Date().toISOString()
    });
  }

  // Get health status based on metrics
  getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    issues: string[];
    metrics: {
      errorRate: number;
      averageResponseTime: number;
      recentAlerts: number;
    };
  } {
    const { overall, alerts } = this.metrics;
    const recentAlerts = alerts.filter(alert => 
      Date.now() - alert.timestamp.getTime() < 300000 // Last 5 minutes
    );
    
    const criticalAlerts = recentAlerts.filter(alert => alert.severity === 'critical');
    const issues: string[] = [];
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    // Check for critical issues
    if (criticalAlerts.length > 0) {
      status = 'unhealthy';
      issues.push(`${criticalAlerts.length} critical alerts in the last 5 minutes`);
    }
    
    // Check error rate
    if (overall.errorRate > 0.1) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`High error rate: ${(overall.errorRate * 100).toFixed(2)}%`);
    }
    
    // Check response times
    if (overall.averageResponseTime > this.ALERT_THRESHOLDS.SLOW_RESPONSE) {
      status = status === 'healthy' ? 'degraded' : status;
      issues.push(`Slow average response time: ${overall.averageResponseTime.toFixed(0)}ms`);
    }
    
    return {
      status,
      issues,
      metrics: {
        errorRate: overall.errorRate,
        averageResponseTime: overall.averageResponseTime,
        recentAlerts: recentAlerts.length
      }
    };
  }

  // Generate performance report
  generateReport(): {
    summary: PerformanceMetrics;
    topEndpoints: EndpointMetrics[];
    slowestEndpoints: EndpointMetrics[];
    errorProneEndpoints: EndpointMetrics[];
    recentAlerts: AlertMetric[];
  } {
    const endpointArray = Array.from(this.metrics.endpoints.values());
    
    return {
      summary: { ...this.metrics.overall },
      topEndpoints: endpointArray
        .sort((a, b) => b.requestCount - a.requestCount)
        .slice(0, 10),
      slowestEndpoints: endpointArray
        .sort((a, b) => b.averageResponseTime - a.averageResponseTime)
        .slice(0, 10),
      errorProneEndpoints: endpointArray
        .filter(endpoint => endpoint.errorRate > 0)
        .sort((a, b) => b.errorRate - a.errorRate)
        .slice(0, 10),
      recentAlerts: this.getRecentAlerts(20)
    };
  }
}

// Export singleton instance
export const performanceMonitoringService = new PerformanceMonitoringService();

// Export types
export type { PerformanceMetrics, EndpointMetrics, ServiceMetrics, AlertMetric };