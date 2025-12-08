import * as os from 'os';
import { healthMonitoringService, SystemHealth } from './healthMonitoringService';
import { logger } from '../utils/logger';

interface DashboardMetrics {
  timestamp: string;
  system: {
    status: string;
    uptime: number;
    version: string;
    environment: string;
  };
  performance: {
    responseTime: {
      avg: number;
      p95: number;
      p99: number;
    };
    throughput: number;
    errorRate: number;
    requestCount: number;
  };
  resources: {
    memory: {
      used: number;
      total: number;
      usage: number;
    };
    cpu: {
      user: number;
      system: number;
    };
    connections: number;
  };
  services: Array<{
    name: string;
    status: string;
    responseTime?: number;
    impact: string;
  }>;
  dependencies: Array<{
    name: string;
    status: string;
    impact: string;
    affectedServices: string[];
  }>;
  alerts: {
    active: number;
    critical: number;
    warnings: number;
    recent: Array<{
      level: string;
      message: string;
      timestamp: string;
    }>;
  };
}

interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: DashboardMetrics) => boolean;
  severity: 'warning' | 'critical';
  message: (metrics: DashboardMetrics) => string;
  cooldown: number; // minutes
  enabled: boolean;
}

interface AlertHistory {
  id: string;
  ruleId: string;
  severity: 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved?: number;
  acknowledged?: boolean;
}

export class MonitoringDashboardService {
  private static instance: MonitoringDashboardService;
  private metricsHistory: DashboardMetrics[] = [];
  private alertRules: Map<string, AlertRule> = new Map();
  private alertHistory: AlertHistory[] = [];
  private lastAlertTimes: Map<string, number> = new Map();
  private maxHistorySize = 1440; // 24 hours of minute-by-minute data

  private constructor() {
    this.setupDefaultAlertRules();
    this.startMetricsCollection();
  }

  static getInstance(): MonitoringDashboardService {
    if (!MonitoringDashboardService.instance) {
      MonitoringDashboardService.instance = new MonitoringDashboardService();
    }
    return MonitoringDashboardService.instance;
  }

  // Setup default alert rules
  private setupDefaultAlertRules(): void {
    // High error rate alert
    this.addAlertRule({
      id: 'high_error_rate',
      name: 'High Error Rate',
      condition: (metrics) => metrics.performance.errorRate > 5,
      severity: 'critical',
      message: (metrics) => `Error rate is ${metrics.performance.errorRate.toFixed(2)}% (threshold: 5%)`,
      cooldown: 5,
      enabled: true
    });

    // Slow response time alert
    this.addAlertRule({
      id: 'slow_response_time',
      name: 'Slow Response Time',
      condition: (metrics) => metrics.performance.responseTime.p95 > 2000,
      severity: 'warning',
      message: (metrics) => `95th percentile response time is ${metrics.performance.responseTime.p95}ms (threshold: 2000ms)`,
      cooldown: 10,
      enabled: true
    });

    // High memory usage alert
    this.addAlertRule({
      id: 'high_memory_usage',
      name: 'High Memory Usage',
      condition: (metrics) => metrics.resources.memory.usage > 85,
      severity: 'warning',
      message: (metrics) => `Memory usage is ${metrics.resources.memory.usage}% (threshold: 85%)`,
      cooldown: 15,
      enabled: true
    });

    // Critical memory usage alert
    this.addAlertRule({
      id: 'critical_memory_usage',
      name: 'Critical Memory Usage',
      condition: (metrics) => metrics.resources.memory.usage > 95,
      severity: 'critical',
      message: (metrics) => `Memory usage is ${metrics.resources.memory.usage}% (threshold: 95%)`,
      cooldown: 5,
      enabled: true
    });

    // Service unhealthy alert
    this.addAlertRule({
      id: 'service_unhealthy',
      name: 'Service Unhealthy',
      condition: (metrics) => metrics.services.some(s => s.status === 'unhealthy' && s.impact === 'critical'),
      severity: 'critical',
      message: (metrics) => {
        const unhealthyServices = metrics.services.filter(s => s.status === 'unhealthy' && s.impact === 'critical');
        return `Critical services unhealthy: ${unhealthyServices.map(s => s.name).join(', ')}`;
      },
      cooldown: 5,
      enabled: true
    });

    // Dependency failure alert
    this.addAlertRule({
      id: 'dependency_failure',
      name: 'Critical Dependency Failure',
      condition: (metrics) => metrics.dependencies.some(d => d.status === 'unhealthy' && d.impact === 'critical'),
      severity: 'critical',
      message: (metrics) => {
        const failedDeps = metrics.dependencies.filter(d => d.status === 'unhealthy' && d.impact === 'critical');
        return `Critical dependencies failed: ${failedDeps.map(d => d.name).join(', ')}`;
      },
      cooldown: 5,
      enabled: true
    });

    // Low throughput alert
    this.addAlertRule({
      id: 'low_throughput',
      name: 'Low Throughput',
      condition: (metrics) => metrics.performance.throughput < 0.1 && metrics.system.uptime > 300000, // After 5 minutes
      severity: 'warning',
      message: (metrics) => `Low throughput: ${metrics.performance.throughput.toFixed(2)} req/s`,
      cooldown: 30,
      enabled: true
    });
  }

  // Add custom alert rule
  addAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
    logger.info(`Alert rule added: ${rule.name}`, { ruleId: rule.id, severity: rule.severity });
  }

  // Remove alert rule
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    logger.info(`Alert rule removed: ${ruleId}`);
  }

  // Update alert rule
  updateAlertRule(ruleId: string, updates: Partial<AlertRule>): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.set(ruleId, { ...rule, ...updates });
      logger.info(`Alert rule updated: ${ruleId}`, updates);
    }
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    // Skip in test environment
    if (process.env.NODE_ENV === 'test') {
      return;
    }

    // Collect metrics every minute
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        logger.error('Metrics collection failed', error);
      }
    }, 60000); // 1 minute

    // Initial collection
    setTimeout(() => this.collectMetrics(), 5000);
  }

  // Collect current metrics
  private async collectMetrics(): Promise<void> {
    try {
      const health = await healthMonitoringService.performHealthCheck();
      const systemMetrics = healthMonitoringService.getMetrics();
      const totalSystemMemory = os.totalmem();
      
      const metrics: DashboardMetrics = {
        timestamp: new Date().toISOString(),
        system: {
          status: health.status,
          uptime: health.uptime,
          version: health.version,
          environment: health.environment
        },
        performance: {
          responseTime: health.metrics.responseTime || { avg: 0, p95: 0, p99: 0 },
          throughput: health.metrics.throughput || 0,
          errorRate: health.metrics.errorRate,
          requestCount: health.metrics.totalRequests
        },
        resources: {
          memory: {
            used: health.metrics.memory.heapUsed,
            total: health.metrics.memory.heapTotal,
            usage: Math.round((health.metrics.memory.rss / totalSystemMemory) * 100)
          },
          cpu: {
            user: health.metrics.cpu?.user || 0,
            system: health.metrics.cpu?.system || 0
          },
          connections: health.metrics.activeConnections || 0
        },
        services: health.services.map(s => ({
          name: s.name,
          status: s.status,
          responseTime: s.responseTime,
          impact: s.impact || 'unknown'
        })),
        dependencies: health.dependencies.map(d => ({
          name: d.name,
          status: d.status,
          impact: d.impact,
          affectedServices: d.affectedServices
        })),
        alerts: {
          active: health.alerts?.active || 0,
          critical: health.alerts?.critical || 0,
          warnings: health.alerts?.warnings || 0,
          recent: healthMonitoringService.getActiveAlerts().slice(0, 10).map(a => ({
            level: a.level,
            message: a.message,
            timestamp: a.timestamp
          }))
        }
      };

      // Add to history
      this.metricsHistory.push(metrics);
      
      // Trim history to max size
      if (this.metricsHistory.length > this.maxHistorySize) {
        this.metricsHistory = this.metricsHistory.slice(-this.maxHistorySize);
      }

      // Check alert rules
      await this.checkAlertRules(metrics);

      logger.debug('Metrics collected', {
        timestamp: metrics.timestamp,
        status: metrics.system.status,
        errorRate: metrics.performance.errorRate,
        memoryUsage: metrics.resources.memory.usage
      });

    } catch (error) {
      logger.error('Failed to collect metrics', error);
    }
  }

  // Check alert rules against current metrics
  private async checkAlertRules(metrics: DashboardMetrics): Promise<void> {
    const now = Date.now();

    for (const [ruleId, rule] of this.alertRules.entries()) {
      if (!rule.enabled) continue;

      // Check cooldown
      const lastAlert = this.lastAlertTimes.get(ruleId);
      if (lastAlert && (now - lastAlert) < (rule.cooldown * 60 * 1000)) {
        continue;
      }

      try {
        if (rule.condition(metrics)) {
          const message = rule.message(metrics);
          
          // Create alert
          const alert: AlertHistory = {
            id: `${ruleId}_${now}`,
            ruleId,
            severity: rule.severity,
            message,
            timestamp: now
          };

          this.alertHistory.push(alert);
          this.lastAlertTimes.set(ruleId, now);

          // Log alert
          if (rule.severity === 'critical') {
            logger.error(`CRITICAL ALERT: ${rule.name}`, {
              ruleId,
              message,
              metrics: this.getRelevantMetrics(metrics, ruleId)
            });
          } else {
            logger.warn(`WARNING ALERT: ${rule.name}`, {
              ruleId,
              message,
              metrics: this.getRelevantMetrics(metrics, ruleId)
            });
          }

          // Send external alerts (webhook, email, etc.)
          await this.sendExternalAlert(alert, metrics);
        }
      } catch (error) {
        logger.error(`Alert rule evaluation failed: ${ruleId}`, error);
      }
    }

    // Clean up old alert history (keep last 1000 alerts)
    if (this.alertHistory.length > 1000) {
      this.alertHistory = this.alertHistory.slice(-1000);
    }
  }

  // Get relevant metrics for alert context
  private getRelevantMetrics(metrics: DashboardMetrics, ruleId: string): any {
    switch (ruleId) {
      case 'high_error_rate':
      case 'low_throughput':
        return {
          errorRate: metrics.performance.errorRate,
          throughput: metrics.performance.throughput,
          requestCount: metrics.performance.requestCount
        };
      case 'slow_response_time':
        return metrics.performance.responseTime;
      case 'high_memory_usage':
      case 'critical_memory_usage':
        return metrics.resources.memory;
      case 'service_unhealthy':
        return metrics.services.filter(s => s.status !== 'healthy');
      case 'dependency_failure':
        return metrics.dependencies.filter(d => d.status !== 'healthy');
      default:
        return {};
    }
  }

  // Send external alert notifications
  private async sendExternalAlert(alert: AlertHistory, metrics: DashboardMetrics): Promise<void> {
    try {
      // Webhook notification
      if (process.env.ALERT_WEBHOOK_URL) {
        await this.sendWebhookAlert(alert, metrics);
      }

      // Email notification (placeholder)
      if (process.env.ALERT_EMAIL_ENABLED === 'true') {
        await this.sendEmailAlert(alert, metrics);
      }

      // Slack notification (placeholder)
      if (process.env.ALERT_SLACK_WEBHOOK) {
        await this.sendSlackAlert(alert, metrics);
      }

    } catch (error) {
      logger.error('Failed to send external alert', { alertId: alert.id, error });
    }
  }

  // Send webhook alert
  private async sendWebhookAlert(alert: AlertHistory, metrics: DashboardMetrics): Promise<void> {
    const webhookUrl = process.env.ALERT_WEBHOOK_URL;
    if (!webhookUrl) return;

    const payload = {
      alert: {
        id: alert.id,
        rule: alert.ruleId,
        severity: alert.severity,
        message: alert.message,
        timestamp: new Date(alert.timestamp).toISOString()
      },
      system: {
        status: metrics.system.status,
        environment: metrics.system.environment,
        uptime: metrics.system.uptime
      },
      metrics: this.getRelevantMetrics(metrics, alert.ruleId)
    };

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkDAO-Marketplace-Monitor/1.0'
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      logger.info('Webhook alert sent successfully', { alertId: alert.id, webhookUrl });
    } catch (error) {
      logger.error('Webhook alert failed', { alertId: alert.id, error });
    }
  }

  // Send email alert (placeholder)
  private async sendEmailAlert(alert: AlertHistory, metrics: DashboardMetrics): Promise<void> {
    // This would integrate with an email service like SendGrid, AWS SES, etc.
    logger.info('Email alert would be sent', {
      alertId: alert.id,
      recipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(',')
    });
  }

  // Send Slack alert (placeholder)
  private async sendSlackAlert(alert: AlertHistory, metrics: DashboardMetrics): Promise<void> {
    const slackWebhook = process.env.ALERT_SLACK_WEBHOOK;
    if (!slackWebhook) return;

    const color = alert.severity === 'critical' ? 'danger' : 'warning';
    const emoji = alert.severity === 'critical' ? '🚨' : '⚠️';

    const payload = {
      text: `${emoji} ${alert.severity.toUpperCase()} Alert`,
      attachments: [
        {
          color,
          title: alert.message,
          fields: [
            {
              title: 'Environment',
              value: metrics.system.environment,
              short: true
            },
            {
              title: 'System Status',
              value: metrics.system.status,
              short: true
            },
            {
              title: 'Timestamp',
              value: new Date(alert.timestamp).toISOString(),
              short: false
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(slackWebhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });

      if (!response.ok) {
        throw new Error(`Slack webhook failed: ${response.status}`);
      }

      logger.info('Slack alert sent successfully', { alertId: alert.id });
    } catch (error) {
      logger.error('Slack alert failed', { alertId: alert.id, error });
    }
  }

  // Get dashboard data
  getDashboardData(timeRange?: { start: Date; end: Date }): {
    current: DashboardMetrics | null;
    history: DashboardMetrics[];
    alerts: AlertHistory[];
    rules: AlertRule[];
  } {
    let history = this.metricsHistory;
    let alerts = this.alertHistory;

    if (timeRange) {
      const startTime = timeRange.start.getTime();
      const endTime = timeRange.end.getTime();
      
      history = history.filter(m => {
        const timestamp = new Date(m.timestamp).getTime();
        return timestamp >= startTime && timestamp <= endTime;
      });

      alerts = alerts.filter(a => a.timestamp >= startTime && a.timestamp <= endTime);
    }

    return {
      current: this.metricsHistory[this.metricsHistory.length - 1] || null,
      history,
      alerts,
      rules: Array.from(this.alertRules.values())
    };
  }

  // Get performance trends
  getPerformanceTrends(hours: number = 24): {
    responseTime: Array<{ timestamp: string; avg: number; p95: number; p99: number }>;
    throughput: Array<{ timestamp: string; value: number }>;
    errorRate: Array<{ timestamp: string; value: number }>;
    memoryUsage: Array<{ timestamp: string; value: number }>;
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentMetrics = this.metricsHistory.filter(m => 
      new Date(m.timestamp).getTime() > cutoff
    );

    return {
      responseTime: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        avg: m.performance.responseTime.avg,
        p95: m.performance.responseTime.p95,
        p99: m.performance.responseTime.p99
      })),
      throughput: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.performance.throughput
      })),
      errorRate: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.performance.errorRate
      })),
      memoryUsage: recentMetrics.map(m => ({
        timestamp: m.timestamp,
        value: m.resources.memory.usage
      }))
    };
  }

  // Acknowledge alert
  acknowledgeAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.acknowledged = true;
      logger.info(`Alert acknowledged: ${alertId}`);
      return true;
    }
    return false;
  }

  // Resolve alert
  resolveAlert(alertId: string): boolean {
    const alert = this.alertHistory.find(a => a.id === alertId);
    if (alert) {
      alert.resolved = Date.now();
      logger.info(`Alert resolved: ${alertId}`);
      return true;
    }
    return false;
  }

  // Get alert statistics
  getAlertStatistics(hours: number = 24): {
    total: number;
    critical: number;
    warnings: number;
    acknowledged: number;
    resolved: number;
    byRule: Record<string, number>;
  } {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    const recentAlerts = this.alertHistory.filter(a => a.timestamp > cutoff);

    const byRule: Record<string, number> = {};
    recentAlerts.forEach(alert => {
      byRule[alert.ruleId] = (byRule[alert.ruleId] || 0) + 1;
    });

    return {
      total: recentAlerts.length,
      critical: recentAlerts.filter(a => a.severity === 'critical').length,
      warnings: recentAlerts.filter(a => a.severity === 'warning').length,
      acknowledged: recentAlerts.filter(a => a.acknowledged).length,
      resolved: recentAlerts.filter(a => a.resolved).length,
      byRule
    };
  }

  // Cleanup method for tests
  cleanup(): void {
    this.metricsHistory = [];
    this.alertHistory = [];
    this.lastAlertTimes.clear();
  }
}

// Export singleton instance
export const monitoringDashboardService = MonitoringDashboardService.getInstance();
