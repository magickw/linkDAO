import { logger } from '../utils/logger';

// Alert types and interfaces
interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: Date;
  source: string;
  metadata?: any;
  resolved?: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
}

type AlertType = 
  | 'service_down'
  | 'high_error_rate'
  | 'slow_response'
  | 'database_connection'
  | 'memory_usage'
  | 'disk_space'
  | 'authentication_failure'
  | 'security_breach'
  | 'rate_limit_exceeded'
  | 'circuit_breaker_open'
  | 'external_service_failure';

type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

interface AlertChannel {
  name: string;
  enabled: boolean;
  send(alert: Alert): Promise<void>;
}

interface AlertRule {
  type: AlertType;
  condition: (data: any) => boolean;
  severity: AlertSeverity;
  cooldown: number; // milliseconds
  channels: string[];
}

class AlertService {
  private alerts: Map<string, Alert> = new Map();
  private channels: Map<string, AlertChannel> = new Map();
  private rules: AlertRule[] = [];
  private lastAlertTimes: Map<string, number> = new Map();

  constructor() {
    this.initializeDefaultChannels();
    this.initializeDefaultRules();
  }

  private initializeDefaultChannels(): void {
    // Console channel (always available)
    this.addChannel({
      name: 'console',
      enabled: true,
      send: async (alert: Alert) => {
        const logLevel = alert.severity === 'critical' || alert.severity === 'high' ? 'error' : 'warn';
        logger[logLevel](`ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`, {
          alertId: alert.id,
          type: alert.type,
          message: alert.message,
          source: alert.source,
          metadata: alert.metadata,
          critical: alert.severity === 'critical'
        });
      }
    });

    // Webhook channel
    if (process.env.ALERT_WEBHOOK_URL) {
      this.addChannel({
        name: 'webhook',
        enabled: true,
        send: async (alert: Alert) => {
          try {
            const response = await fetch(process.env.ALERT_WEBHOOK_URL!, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'marketplace-api-alerts/1.0'
              },
              body: JSON.stringify({
                alert_id: alert.id,
                type: alert.type,
                severity: alert.severity,
                title: alert.title,
                message: alert.message,
                timestamp: alert.timestamp.toISOString(),
                source: alert.source,
                metadata: alert.metadata,
                environment: process.env.NODE_ENV
              })
            });

            if (!response.ok) {
              throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
            }
          } catch (error) {
            logger.error('Failed to send webhook alert', {
              alertId: alert.id,
              error: error instanceof Error ? error.message : 'Unknown error',
              webhookUrl: process.env.ALERT_WEBHOOK_URL
            });
          }
        }
      });
    }

    // Email channel (placeholder - would integrate with email service)
    if (process.env.ALERT_EMAIL_RECIPIENTS) {
      this.addChannel({
        name: 'email',
        enabled: true,
        send: async (alert: Alert) => {
          // Placeholder for email integration
          logger.info('Email alert would be sent', {
            alertId: alert.id,
            recipients: process.env.ALERT_EMAIL_RECIPIENTS,
            subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
            message: alert.message
          });
        }
      });
    }

    // Slack channel (placeholder - would integrate with Slack API)
    if (process.env.SLACK_WEBHOOK_URL) {
      this.addChannel({
        name: 'slack',
        enabled: true,
        send: async (alert: Alert) => {
          try {
            const color = this.getSeverityColor(alert.severity);
            const slackPayload = {
              text: `Alert: ${alert.title}`,
              attachments: [{
                color,
                fields: [
                  { title: 'Severity', value: alert.severity.toUpperCase(), short: true },
                  { title: 'Type', value: alert.type, short: true },
                  { title: 'Source', value: alert.source, short: true },
                  { title: 'Time', value: alert.timestamp.toISOString(), short: true },
                  { title: 'Message', value: alert.message, short: false }
                ]
              }]
            };

            const response = await fetch(process.env.SLACK_WEBHOOK_URL!, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(slackPayload)
            });

            if (!response.ok) {
              throw new Error(`Slack webhook failed: ${response.status}`);
            }
          } catch (error) {
            logger.error('Failed to send Slack alert', {
              alertId: alert.id,
              error: error instanceof Error ? error.message : 'Unknown error'
            });
          }
        }
      });
    }
  }

  private initializeDefaultRules(): void {
    // High error rate rule
    this.addRule({
      type: 'high_error_rate',
      condition: (data: { errorRate: number; requestCount: number }) => 
        data.errorRate > 0.05 && data.requestCount > 10,
      severity: 'high',
      cooldown: 300000, // 5 minutes
      channels: ['console', 'webhook', 'slack']
    });

    // Service down rule
    this.addRule({
      type: 'service_down',
      condition: (data: { isHealthy: boolean }) => !data.isHealthy,
      severity: 'critical',
      cooldown: 60000, // 1 minute
      channels: ['console', 'webhook', 'email', 'slack']
    });

    // Slow response rule
    this.addRule({
      type: 'slow_response',
      condition: (data: { responseTime: number }) => data.responseTime > 5000,
      severity: 'medium',
      cooldown: 600000, // 10 minutes
      channels: ['console', 'webhook']
    });

    // Database connection rule
    this.addRule({
      type: 'database_connection',
      condition: (data: { connected: boolean }) => !data.connected,
      severity: 'critical',
      cooldown: 120000, // 2 minutes
      channels: ['console', 'webhook', 'email', 'slack']
    });

    // Memory usage rule
    this.addRule({
      type: 'memory_usage',
      condition: (data: { memoryUsage: number }) => data.memoryUsage > 0.9, // 90%
      severity: 'high',
      cooldown: 300000, // 5 minutes
      channels: ['console', 'webhook', 'slack']
    });

    // Authentication failure rule
    this.addRule({
      type: 'authentication_failure',
      condition: (data: { failureRate: number }) => data.failureRate > 0.1, // 10%
      severity: 'medium',
      cooldown: 600000, // 10 minutes
      channels: ['console', 'webhook']
    });
  }

  private getSeverityColor(severity: AlertSeverity): string {
    switch (severity) {
      case 'critical': return '#ff0000';
      case 'high': return '#ff8800';
      case 'medium': return '#ffaa00';
      case 'low': return '#00aa00';
      default: return '#888888';
    }
  }

  // Add a new alert channel
  addChannel(channel: AlertChannel): void {
    this.channels.set(channel.name, channel);
  }

  // Add a new alert rule
  addRule(rule: AlertRule): void {
    this.rules.push(rule);
  }

  // Create and send an alert
  async createAlert(
    type: AlertType,
    title: string,
    message: string,
    source: string,
    metadata?: any,
    severity?: AlertSeverity
  ): Promise<string> {
    const alertId = this.generateAlertId();
    
    // Find matching rule or use provided severity
    const rule = this.rules.find(r => r.type === type);
    const alertSeverity = severity || rule?.severity || 'medium';

    // Check cooldown
    const cooldownKey = `${type}_${source}`;
    const lastAlertTime = this.lastAlertTimes.get(cooldownKey) || 0;
    const cooldown = rule?.cooldown || 300000; // Default 5 minutes
    
    if (Date.now() - lastAlertTime < cooldown) {
      logger.debug(`Alert suppressed due to cooldown: ${type}`, {
        cooldownKey,
        remainingCooldown: cooldown - (Date.now() - lastAlertTime)
      });
      return alertId;
    }

    const alert: Alert = {
      id: alertId,
      type,
      severity: alertSeverity,
      title,
      message,
      timestamp: new Date(),
      source,
      metadata,
      resolved: false
    };

    // Store alert
    this.alerts.set(alertId, alert);
    this.lastAlertTimes.set(cooldownKey, Date.now());

    // Send to channels
    const channels = rule?.channels || ['console'];
    await this.sendToChannels(alert, channels);

    return alertId;
  }

  // Send alert to specified channels
  private async sendToChannels(alert: Alert, channelNames: string[]): Promise<void> {
    const sendPromises = channelNames
      .map(name => this.channels.get(name))
      .filter(channel => channel && channel.enabled)
      .map(channel => channel!.send(alert));

    try {
      await Promise.allSettled(sendPromises);
    } catch (error) {
      logger.error('Failed to send alert to some channels', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Resolve an alert
  resolveAlert(alertId: string, resolvedBy?: string): boolean {
    const alert = this.alerts.get(alertId);
    if (!alert || alert.resolved) {
      return false;
    }

    alert.resolved = true;
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;

    logger.info(`Alert resolved: ${alert.title}`, {
      alertId,
      resolvedBy,
      duration: alert.resolvedAt.getTime() - alert.timestamp.getTime()
    });

    return true;
  }

  // Get alert by ID
  getAlert(alertId: string): Alert | undefined {
    return this.alerts.get(alertId);
  }

  // Get all alerts with optional filters
  getAlerts(filters?: {
    type?: AlertType;
    severity?: AlertSeverity;
    resolved?: boolean;
    source?: string;
    limit?: number;
  }): Alert[] {
    let alerts = Array.from(this.alerts.values());

    if (filters) {
      if (filters.type) {
        alerts = alerts.filter(alert => alert.type === filters.type);
      }
      if (filters.severity) {
        alerts = alerts.filter(alert => alert.severity === filters.severity);
      }
      if (filters.resolved !== undefined) {
        alerts = alerts.filter(alert => alert.resolved === filters.resolved);
      }
      if (filters.source) {
        alerts = alerts.filter(alert => alert.source === filters.source);
      }
      if (filters.limit) {
        alerts = alerts.slice(0, filters.limit);
      }
    }

    return alerts.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Get alert statistics
  getAlertStats(): {
    total: number;
    unresolved: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<string, number>;
    recentCount: number; // Last 24 hours
  } {
    const alerts = Array.from(this.alerts.values());
    const now = Date.now();
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const stats = {
      total: alerts.length,
      unresolved: alerts.filter(a => !a.resolved).length,
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0
      } as Record<AlertSeverity, number>,
      byType: {} as Record<string, number>,
      recentCount: alerts.filter(a => a.timestamp.getTime() > dayAgo).length
    };

    alerts.forEach(alert => {
      stats.bySeverity[alert.severity]++;
      stats.byType[alert.type] = (stats.byType[alert.type] || 0) + 1;
    });

    return stats;
  }

  // Clean up old resolved alerts
  cleanupOldAlerts(maxAge: number = 7 * 24 * 60 * 60 * 1000): number { // Default 7 days
    const cutoff = Date.now() - maxAge;
    let cleaned = 0;

    for (const [id, alert] of Array.from(this.alerts.entries())) {
      if (alert.resolved && alert.resolvedAt && alert.resolvedAt.getTime() < cutoff) {
        this.alerts.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.info(`Cleaned up ${cleaned} old resolved alerts`);
    }

    return cleaned;
  }

  // Generate unique alert ID
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
  }

  // Convenience methods for common alerts
  async alertServiceDown(serviceName: string, error?: any): Promise<string> {
    return this.createAlert(
      'service_down',
      `Service Down: ${serviceName}`,
      `The ${serviceName} service is not responding or has failed health checks.`,
      serviceName,
      { error: error ? error.message : undefined }
    );
  }

  async alertHighErrorRate(endpoint: string, errorRate: number, requestCount: number): Promise<string> {
    return this.createAlert(
      'high_error_rate',
      `High Error Rate: ${endpoint}`,
      `Error rate of ${(errorRate * 100).toFixed(2)}% detected for ${endpoint} (${requestCount} requests)`,
      endpoint,
      { errorRate, requestCount }
    );
  }

  async alertSlowResponse(endpoint: string, responseTime: number): Promise<string> {
    return this.createAlert(
      'slow_response',
      `Slow Response: ${endpoint}`,
      `Response time of ${responseTime}ms detected for ${endpoint}`,
      endpoint,
      { responseTime }
    );
  }

  async alertDatabaseConnection(error: any): Promise<string> {
    return this.createAlert(
      'database_connection',
      'Database Connection Failed',
      'Unable to connect to the database. All database operations are failing.',
      'database',
      { error: error.message, code: error.code }
    );
  }

  async alertHighMemoryUsage(usage: number): Promise<string> {
    return this.createAlert(
      'memory_usage',
      'High Memory Usage',
      `Memory usage is at ${(usage * 100).toFixed(1)}% of available memory.`,
      'system',
      { memoryUsage: usage }
    );
  }
}

// Export singleton instance
export const alertService = new AlertService();

// Export types
export type { Alert, AlertType, AlertSeverity, AlertChannel, AlertRule };