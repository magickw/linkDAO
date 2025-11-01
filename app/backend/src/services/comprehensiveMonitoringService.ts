import { logger } from '../utils/logger';
import { alertService } from './alertService';
import { errorLoggingService, ErrorSeverity, ErrorCategory } from './errorLoggingService';
import { enhancedRateLimitingService } from '../middleware/enhancedRateLimiting';
import { performanceMonitoringService } from './performanceMonitoringService';

// Monitoring metrics interface
interface SystemMetrics {
  timestamp: string;
  system: {
    uptime: number;
    memory: NodeJS.MemoryUsage;
    cpu: NodeJS.CpuUsage;
    loadAverage: number[];
    freeMemory: number;
    totalMemory: number;
  };
  application: {
    activeConnections: number;
    totalRequests: number;
    errorRate: number;
    averageResponseTime: number;
    slowRequests: number;
    rateLimitViolations: number;
  };
  database: {
    connectionPoolSize: number;
    activeQueries: number;
    averageQueryTime: number;
    slowQueries: number;
    connectionErrors: number;
  };
  cache: {
    hitRate: number;
    missRate: number;
    evictions: number;
    memoryUsage: number;
  };
  security: {
    suspiciousRequests: number;
    blockedIPs: number;
    authenticationFailures: number;
    rateLimitBlocks: number;
  };
}

// Health check status
interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  services: {
    database: ServiceHealth;
    cache: ServiceHealth;
    externalAPIs: ServiceHealth;
    fileSystem: ServiceHealth;
  };
  metrics: SystemMetrics;
  alerts: AlertSummary[];
}

interface ServiceHealth {
  status: 'up' | 'down' | 'degraded';
  responseTime?: number;
  lastCheck: string;
  error?: string;
}

interface AlertSummary {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

// Monitoring thresholds
interface MonitoringThresholds {
  errorRate: number; // errors per minute
  responseTime: number; // milliseconds
  memoryUsage: number; // percentage
  cpuUsage: number; // percentage
  diskUsage: number; // percentage
  dbConnectionPool: number; // percentage
  cacheHitRate: number; // percentage
  rateLimitViolations: number; // per minute
}

export class ComprehensiveMonitoringService {
  private static instance: ComprehensiveMonitoringService;
  private metrics: SystemMetrics[] = [];
  private alerts: AlertSummary[] = [];
  private monitoringInterval: NodeJS.Timeout | null = null;
  private healthCheckInterval: NodeJS.Timeout | null = null;
  
  private thresholds: MonitoringThresholds = {
    errorRate: 10, // 10 errors per minute
    responseTime: 2000, // 2 seconds
    memoryUsage: 85, // 85%
    cpuUsage: 80, // 80%
    diskUsage: 90, // 90%
    dbConnectionPool: 90, // 90%
    cacheHitRate: 70, // 70%
    rateLimitViolations: 50 // 50 per minute
  };

  public static getInstance(): ComprehensiveMonitoringService {
    if (!ComprehensiveMonitoringService.instance) {
      ComprehensiveMonitoringService.instance = new ComprehensiveMonitoringService();
    }
    return ComprehensiveMonitoringService.instance;
  }

  /**
   * Start comprehensive monitoring
   */
  public startMonitoring(intervalMs: number = 60000): void {
    logger.info('Starting comprehensive monitoring service', {
      interval: intervalMs,
      thresholds: this.thresholds
    });

    // Collect metrics every minute
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.collectMetrics();
        await this.analyzeMetrics();
        await this.checkThresholds();
      } catch (error) {
        logger.error('Error in monitoring cycle', {
          error: error.message,
          stack: error.stack
        });
      }
    }, intervalMs);

    // Health checks every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthChecks();
      } catch (error) {
        logger.error('Error in health check cycle', {
          error: error.message,
          stack: error.stack
        });
      }
    }, 30000);

    // Initial collection
    this.collectMetrics();
    this.performHealthChecks();
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }

    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    logger.info('Comprehensive monitoring service stopped');
  }

  /**
   * Collect system and application metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();
    
    // System metrics
    const systemMetrics = {
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
      loadAverage: process.platform === 'linux' ? require('os').loadavg() : [0, 0, 0],
      freeMemory: require('os').freemem(),
      totalMemory: require('os').totalmem()
    };

    // Application metrics
    const errorStats = errorLoggingService.getErrorStats();
    const rateLimitStats = await enhancedRateLimitingService.getStatistics();
    
    const applicationMetrics = {
      activeConnections: (global as any).activeConnections || 0,
      totalRequests: errorStats.totalErrors + (global as any).successfulRequests || 0,
      errorRate: errorStats.errorRate,
      averageResponseTime: await this.getAverageResponseTime(),
      slowRequests: await this.getSlowRequestCount(),
      rateLimitViolations: rateLimitStats.blockedRequests
    };

    // Database metrics (placeholder - would integrate with actual DB monitoring)
    const databaseMetrics = {
      connectionPoolSize: 10, // Would get from actual DB pool
      activeQueries: 0,
      averageQueryTime: 0,
      slowQueries: 0,
      connectionErrors: 0
    };

    // Cache metrics (placeholder - would integrate with actual cache monitoring)
    const cacheMetrics = {
      hitRate: 85,
      missRate: 15,
      evictions: 0,
      memoryUsage: 0
    };

    // Security metrics
    const securityMetrics = {
      suspiciousRequests: await this.getSuspiciousRequestCount(),
      blockedIPs: await this.getBlockedIPCount(),
      authenticationFailures: await this.getAuthFailureCount(),
      rateLimitBlocks: rateLimitStats.blockedRequests
    };

    const metrics: SystemMetrics = {
      timestamp,
      system: systemMetrics,
      application: applicationMetrics,
      database: databaseMetrics,
      cache: cacheMetrics,
      security: securityMetrics
    };

    // Store metrics (keep last 24 hours)
    this.metrics.push(metrics);
    if (this.metrics.length > 1440) { // 24 hours * 60 minutes
      this.metrics = this.metrics.slice(-1440);
    }

    // Log metrics
    logger.info('System metrics collected', {
      timestamp,
      memory: {
        used: Math.round(systemMetrics.memory.heapUsed / 1024 / 1024),
        total: Math.round(systemMetrics.memory.heapTotal / 1024 / 1024),
        percentage: Math.round((systemMetrics.memory.heapUsed / systemMetrics.memory.heapTotal) * 100)
      },
      application: {
        errorRate: applicationMetrics.errorRate,
        averageResponseTime: applicationMetrics.averageResponseTime,
        rateLimitViolations: applicationMetrics.rateLimitViolations
      }
    });
  }

  /**
   * Analyze metrics for trends and anomalies
   */
  private async analyzeMetrics(): Promise<void> {
    if (this.metrics.length < 5) return; // Need at least 5 data points

    const recent = this.metrics.slice(-5);
    const current = recent[recent.length - 1];
    const previous = recent[recent.length - 2];

    // Analyze memory usage trend
    const memoryTrend = this.calculateTrend(recent.map(m => m.system.memory.heapUsed));
    if (memoryTrend > 0.1 && current.system.memory.heapUsed > previous.system.memory.heapUsed * 1.2) {
      await this.createAlert(
        'memory_leak_suspected',
        'Potential Memory Leak Detected',
        `Memory usage increasing rapidly: ${Math.round(current.system.memory.heapUsed / 1024 / 1024)}MB`,
        'high'
      );
    }

    // Analyze error rate trend
    const errorTrend = this.calculateTrend(recent.map(m => m.application.errorRate));
    if (errorTrend > 0.5 && current.application.errorRate > this.thresholds.errorRate) {
      await this.createAlert(
        'error_rate_spike',
        'Error Rate Spike Detected',
        `Error rate increasing: ${current.application.errorRate} errors/min`,
        'high'
      );
    }

    // Analyze response time trend
    const responseTrend = this.calculateTrend(recent.map(m => m.application.averageResponseTime));
    if (responseTrend > 0.3 && current.application.averageResponseTime > this.thresholds.responseTime) {
      await this.createAlert(
        'performance_degradation',
        'Performance Degradation Detected',
        `Response time increasing: ${current.application.averageResponseTime}ms`,
        'medium'
      );
    }
  }

  /**
   * Check metrics against thresholds
   */
  private async checkThresholds(): Promise<void> {
    if (this.metrics.length === 0) return;

    const current = this.metrics[this.metrics.length - 1];

    // Memory usage check
    const memoryPercentage = (current.system.memory.heapUsed / current.system.memory.heapTotal) * 100;
    if (memoryPercentage > this.thresholds.memoryUsage) {
      await this.createAlert(
        'high_memory_usage',
        'High Memory Usage',
        `Memory usage at ${Math.round(memoryPercentage)}%`,
        memoryPercentage > 95 ? 'critical' : 'high'
      );
    }

    // Error rate check
    if (current.application.errorRate > this.thresholds.errorRate) {
      await this.createAlert(
        'high_error_rate',
        'High Error Rate',
        `Error rate: ${current.application.errorRate} errors/min`,
        current.application.errorRate > this.thresholds.errorRate * 2 ? 'critical' : 'high'
      );
    }

    // Response time check
    if (current.application.averageResponseTime > this.thresholds.responseTime) {
      await this.createAlert(
        'slow_response_time',
        'Slow Response Time',
        `Average response time: ${current.application.averageResponseTime}ms`,
        current.application.averageResponseTime > this.thresholds.responseTime * 2 ? 'high' : 'medium'
      );
    }

    // Rate limit violations check
    if (current.application.rateLimitViolations > this.thresholds.rateLimitViolations) {
      await this.createAlert(
        'high_rate_limit_violations',
        'High Rate Limit Violations',
        `Rate limit violations: ${current.application.rateLimitViolations}/min`,
        'medium'
      );
    }

    // Security checks
    if (current.security.suspiciousRequests > 10) {
      await this.createAlert(
        'suspicious_activity',
        'Suspicious Activity Detected',
        `${current.security.suspiciousRequests} suspicious requests detected`,
        'high'
      );
    }
  }

  /**
   * Perform health checks on various services
   */
  private async performHealthChecks(): Promise<void> {
    const healthStatus: HealthStatus = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabaseHealth(),
        cache: await this.checkCacheHealth(),
        externalAPIs: await this.checkExternalAPIsHealth(),
        fileSystem: await this.checkFileSystemHealth()
      },
      metrics: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : {} as SystemMetrics,
      alerts: this.alerts.slice(-10) // Last 10 alerts
    };

    // Determine overall health status
    const serviceStatuses = Object.values(healthStatus.services).map(s => s.status);
    if (serviceStatuses.includes('down')) {
      healthStatus.status = 'unhealthy';
    } else if (serviceStatuses.includes('degraded')) {
      healthStatus.status = 'degraded';
    }

    // Log health status
    logger.info('Health check completed', {
      status: healthStatus.status,
      services: Object.entries(healthStatus.services).map(([name, service]) => ({
        name,
        status: service.status,
        responseTime: service.responseTime
      }))
    });

    // Alert on unhealthy status
    if (healthStatus.status === 'unhealthy') {
      await this.createAlert(
        'system_unhealthy',
        'System Health Check Failed',
        'One or more critical services are down',
        'critical'
      );
    }
  }

  /**
   * Individual health check methods
   */
  private async checkDatabaseHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Placeholder for actual database health check
      // In production, this would ping the database
      await new Promise(resolve => setTimeout(resolve, 10)); // Simulate DB check
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkCacheHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Placeholder for actual cache health check
      await new Promise(resolve => setTimeout(resolve, 5)); // Simulate cache check
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkExternalAPIsHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      // Placeholder for external API health checks
      await new Promise(resolve => setTimeout(resolve, 50)); // Simulate API check
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  private async checkFileSystemHealth(): Promise<ServiceHealth> {
    const start = Date.now();
    try {
      const fs = require('fs').promises;
      await fs.access('./'); // Check if we can access current directory
      
      return {
        status: 'up',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      return {
        status: 'down',
        responseTime: Date.now() - start,
        lastCheck: new Date().toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Utility methods
   */
  private calculateTrend(values: number[]): number {
    if (values.length < 2) return 0;
    
    const first = values[0];
    const last = values[values.length - 1];
    
    return first === 0 ? 0 : (last - first) / first;
  }

  private async createAlert(
    type: string,
    title: string,
    message: string,
    severity: 'low' | 'medium' | 'high' | 'critical'
  ): Promise<void> {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    const alert: AlertSummary = {
      id: alertId,
      type,
      severity,
      message: title,
      timestamp: new Date().toISOString(),
      acknowledged: false
    };

    this.alerts.push(alert);
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(-100);
    }

    // Map to valid alert types
    const alertTypeMap: Record<string, any> = {
      'memory_leak_suspected': 'memory_usage',
      'error_rate_spike': 'high_error_rate',
      'performance_degradation': 'slow_response',
      'high_memory_usage': 'memory_usage',
      'high_error_rate': 'high_error_rate',
      'slow_response_time': 'slow_response',
      'high_rate_limit_violations': 'rate_limit_exceeded',
      'suspicious_activity': 'security_breach',
      'system_unhealthy': 'service_down'
    };

    const validAlertType = alertTypeMap[type] || 'service_down';

    // Create system alert
    await alertService.createAlert(
      validAlertType,
      title,
      message,
      'system',
      { alertId },
      severity
    );

    logger.warn(`Monitoring alert created: ${title}`, {
      alertId,
      type,
      severity,
      message
    });
  }

  private async getAverageResponseTime(): Promise<number> {
    // Placeholder - would integrate with actual performance monitoring
    return 150;
  }

  private async getSlowRequestCount(): Promise<number> {
    // Placeholder - would count requests > threshold
    return 0;
  }

  private async getSuspiciousRequestCount(): Promise<number> {
    // Placeholder - would count flagged requests
    return 0;
  }

  private async getBlockedIPCount(): Promise<number> {
    // Placeholder - would count blocked IPs
    return 0;
  }

  private async getAuthFailureCount(): Promise<number> {
    // Placeholder - would count auth failures
    return 0;
  }

  /**
   * Public methods for accessing monitoring data
   */
  public getMetrics(hours: number = 1): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metrics.filter(m => new Date(m.timestamp).getTime() > cutoff);
  }

  public getAlerts(acknowledged: boolean = false): AlertSummary[] {
    return this.alerts.filter(a => a.acknowledged === acknowledged);
  }

  public async acknowledgeAlert(alertId: string): Promise<void> {
    const alert = this.alerts.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info(`Alert acknowledged: ${alertId}`);
    }
  }

  public updateThresholds(newThresholds: Partial<MonitoringThresholds>): void {
    this.thresholds = { ...this.thresholds, ...newThresholds };
    logger.info('Monitoring thresholds updated', { thresholds: this.thresholds });
  }

  public getThresholds(): MonitoringThresholds {
    return { ...this.thresholds };
  }

  public async getCurrentHealthStatus(): Promise<HealthStatus> {
    await this.performHealthChecks();
    return {
      status: 'healthy', // This would be determined by the health checks
      timestamp: new Date().toISOString(),
      services: {
        database: await this.checkDatabaseHealth(),
        cache: await this.checkCacheHealth(),
        externalAPIs: await this.checkExternalAPIsHealth(),
        fileSystem: await this.checkFileSystemHealth()
      },
      metrics: this.metrics.length > 0 ? this.metrics[this.metrics.length - 1] : {} as SystemMetrics,
      alerts: this.alerts.slice(-10)
    };
  }
}

// Export singleton instance
export const comprehensiveMonitoringService = ComprehensiveMonitoringService.getInstance();
