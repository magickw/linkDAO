import { moderationMetricsService } from './moderationMetricsService';
import { moderationLoggingService } from './moderationLoggingService';
import nodemailer from 'nodemailer';
import { WebhookClient } from 'discord.js';

export interface AlertRule {
  id: string;
  name: string;
  metric: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  cooldownMinutes: number;
  channels: ('email' | 'discord' | 'webhook')[];
  description: string;
}

export interface AlertNotification {
  id: string;
  ruleId: string;
  metric: string;
  value: number;
  threshold: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
}

export interface AlertChannel {
  type: 'email' | 'discord' | 'webhook';
  config: {
    recipients?: string[];
    webhookUrl?: string;
    smtpConfig?: {
      host: string;
      port: number;
      secure: boolean;
      auth: {
        user: string;
        pass: string;
      };
    };
  };
}

class ModerationAlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, AlertNotification> = new Map();
  private alertHistory: AlertNotification[] = [];
  private lastAlertTimes: Map<string, Date> = new Map();
  private channels: Map<string, AlertChannel> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeDefaultRules();
    this.startAlertMonitoring();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'high_error_rate',
        name: 'High Error Rate',
        metric: 'error_rate',
        operator: 'gt',
        threshold: 0.05,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 15,
        channels: ['email', 'discord'],
        description: 'Error rate exceeds 5%'
      },
      {
        id: 'high_latency',
        name: 'High Latency',
        metric: 'average_latency',
        operator: 'gt',
        threshold: 5000,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 10,
        channels: ['discord'],
        description: 'Average latency exceeds 5 seconds'
      },
      {
        id: 'high_false_positive_rate',
        name: 'High False Positive Rate',
        metric: 'false_positive_rate',
        operator: 'gt',
        threshold: 0.15,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 30,
        channels: ['email'],
        description: 'False positive rate exceeds 15%'
      },
      {
        id: 'queue_backup',
        name: 'Queue Backup',
        metric: 'queue_depth',
        operator: 'gt',
        threshold: 1000,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        channels: ['email', 'discord'],
        description: 'Moderation queue depth exceeds 1000 items'
      },
      {
        id: 'high_cost',
        name: 'High Cost',
        metric: 'total_cost',
        operator: 'gt',
        threshold: 1000,
        severity: 'warning',
        enabled: true,
        cooldownMinutes: 60,
        channels: ['email'],
        description: 'Hourly costs exceed $1000'
      },
      {
        id: 'system_degradation',
        name: 'System Degradation',
        metric: 'throughput',
        operator: 'lt',
        threshold: 10,
        severity: 'critical',
        enabled: true,
        cooldownMinutes: 5,
        channels: ['email', 'discord'],
        description: 'System throughput below 10 decisions/second'
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });
  }

  /**
   * Start continuous alert monitoring
   */
  private startAlertMonitoring(): void {
    // Check alerts every minute
    this.checkInterval = setInterval(async () => {
      await this.checkAlerts();
    }, 60000);
  }

  /**
   * Stop alert monitoring
   */
  stopAlertMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check all alert rules and trigger notifications
   */
  async checkAlerts(): Promise<void> {
    try {
      const metrics = await moderationMetricsService.getSystemMetrics();
      const now = new Date();

      for (const [ruleId, rule] of this.alertRules) {
        if (!rule.enabled) continue;

        // Check cooldown
        const lastAlert = this.lastAlertTimes.get(ruleId);
        if (lastAlert && now.getTime() - lastAlert.getTime() < rule.cooldownMinutes * 60000) {
          continue;
        }

        const metricValue = this.getMetricValue(metrics, rule.metric);
        if (metricValue === null) continue;

        const shouldAlert = this.evaluateRule(metricValue, rule);
        
        if (shouldAlert) {
          await this.triggerAlert(rule, metricValue);
          this.lastAlertTimes.set(ruleId, now);
        } else {
          // Check if we should resolve an existing alert
          const existingAlert = this.activeAlerts.get(ruleId);
          if (existingAlert && !existingAlert.resolvedAt) {
            await this.resolveAlert(ruleId);
          }
        }
      }

    } catch (error) {
      await moderationLoggingService.logModerationError('system', error as Error, {
        context: 'alert_monitoring'
      });
    }
  }

  /**
   * Trigger an alert notification
   */
  private async triggerAlert(rule: AlertRule, value: number): Promise<void> {
    const alertId = `${rule.id}_${Date.now()}`;
    const alert: AlertNotification = {
      id: alertId,
      ruleId: rule.id,
      metric: rule.metric,
      value,
      threshold: rule.threshold,
      severity: rule.severity,
      message: `${rule.name}: ${rule.description}. Current value: ${value}, Threshold: ${rule.threshold}`,
      timestamp: new Date(),
      acknowledged: false
    };

    // Store alert
    this.activeAlerts.set(rule.id, alert);
    this.alertHistory.push(alert);

    // Send notifications
    await this.sendNotifications(alert, rule.channels);

    // Log the alert
    await moderationLoggingService.logModerationError('system', new Error(alert.message), {
      alertId,
      ruleId: rule.id,
      severity: rule.severity,
      metric: rule.metric,
      value,
      threshold: rule.threshold
    });
  }

  /**
   * Resolve an active alert
   */
  private async resolveAlert(ruleId: string): Promise<void> {
    const alert = this.activeAlerts.get(ruleId);
    if (!alert) return;

    alert.resolvedAt = new Date();
    this.activeAlerts.delete(ruleId);

    // Send resolution notification
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      const resolutionMessage = `RESOLVED: ${rule.name} - Metric ${rule.metric} is now within acceptable range`;
      await this.sendNotifications({
        ...alert,
        message: resolutionMessage,
        severity: 'info'
      }, rule.channels);
    }
  }

  /**
   * Send notifications through configured channels
   */
  private async sendNotifications(alert: AlertNotification, channels: string[]): Promise<void> {
    const promises = channels.map(async (channelType) => {
      try {
        switch (channelType) {
          case 'email':
            await this.sendEmailNotification(alert);
            break;
          case 'discord':
            await this.sendDiscordNotification(alert);
            break;
          case 'webhook':
            await this.sendWebhookNotification(alert);
            break;
        }
      } catch (error) {
        console.error(`Failed to send ${channelType} notification:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: AlertNotification): Promise<void> {
    const emailChannel = this.channels.get('email');
    if (!emailChannel?.config.smtpConfig || !emailChannel.config.recipients) {
      return;
    }

    const transporter = nodemailer.createTransporter(emailChannel.config.smtpConfig);

    const subject = `[${alert.severity.toUpperCase()}] Moderation System Alert: ${alert.message}`;
    const html = `
      <h2>Moderation System Alert</h2>
      <p><strong>Severity:</strong> ${alert.severity}</p>
      <p><strong>Metric:</strong> ${alert.metric}</p>
      <p><strong>Current Value:</strong> ${alert.value}</p>
      <p><strong>Threshold:</strong> ${alert.threshold}</p>
      <p><strong>Time:</strong> ${alert.timestamp.toISOString()}</p>
      <p><strong>Message:</strong> ${alert.message}</p>
      <hr>
      <p><em>This is an automated alert from the AI Content Moderation System.</em></p>
    `;

    await transporter.sendMail({
      from: emailChannel.config.smtpConfig.auth.user,
      to: emailChannel.config.recipients.join(', '),
      subject,
      html
    });
  }

  /**
   * Send Discord notification
   */
  private async sendDiscordNotification(alert: AlertNotification): Promise<void> {
    const discordChannel = this.channels.get('discord');
    if (!discordChannel?.config.webhookUrl) {
      return;
    }

    const webhook = new WebhookClient({ url: discordChannel.config.webhookUrl });

    const color = alert.severity === 'critical' ? 0xFF0000 : 
                  alert.severity === 'warning' ? 0xFFA500 : 0x00FF00;

    await webhook.send({
      embeds: [{
        title: `🚨 Moderation System Alert`,
        description: alert.message,
        color,
        fields: [
          { name: 'Severity', value: alert.severity.toUpperCase(), inline: true },
          { name: 'Metric', value: alert.metric, inline: true },
          { name: 'Value', value: alert.value.toString(), inline: true },
          { name: 'Threshold', value: alert.threshold.toString(), inline: true },
          { name: 'Time', value: alert.timestamp.toISOString(), inline: false }
        ],
        timestamp: alert.timestamp.toISOString()
      }]
    });
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: AlertNotification): Promise<void> {
    const webhookChannel = this.channels.get('webhook');
    if (!webhookChannel?.config.webhookUrl) {
      return;
    }

    const payload = {
      alert_id: alert.id,
      rule_id: alert.ruleId,
      metric: alert.metric,
      value: alert.value,
      threshold: alert.threshold,
      severity: alert.severity,
      message: alert.message,
      timestamp: alert.timestamp.toISOString()
    };

    const response = await fetch(webhookChannel.config.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook request failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Get metric value from metrics object
   */
  private getMetricValue(metrics: any, metricPath: string): number | null {
    const paths = metricPath.split('.');
    let value = metrics;

    for (const path of paths) {
      if (value && typeof value === 'object' && path in value) {
        value = value[path];
      } else {
        return null;
      }
    }

    return typeof value === 'number' ? value : null;
  }

  /**
   * Evaluate if a rule should trigger
   */
  private evaluateRule(value: number, rule: AlertRule): boolean {
    switch (rule.operator) {
      case 'gt': return value > rule.threshold;
      case 'gte': return value >= rule.threshold;
      case 'lt': return value < rule.threshold;
      case 'lte': return value <= rule.threshold;
      case 'eq': return value === rule.threshold;
      default: return false;
    }
  }

  // Public API methods

  /**
   * Add or update an alert rule
   */
  setAlertRule(rule: AlertRule): void {
    this.alertRules.set(rule.id, rule);
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): void {
    this.alertRules.delete(ruleId);
    this.activeAlerts.delete(ruleId);
    this.lastAlertTimes.delete(ruleId);
  }

  /**
   * Get all alert rules
   */
  getAlertRules(): AlertRule[] {
    return Array.from(this.alertRules.values());
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertNotification[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit: number = 100): AlertNotification[] {
    return this.alertHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Acknowledge an alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    for (const alert of this.activeAlerts.values()) {
      if (alert.id === alertId) {
        alert.acknowledged = true;
        return true;
      }
    }
    return false;
  }

  /**
   * Configure notification channel
   */
  configureChannel(type: string, channel: AlertChannel): void {
    this.channels.set(type, channel);
  }

  /**
   * Test alert system
   */
  async testAlert(ruleId: string): Promise<void> {
    const rule = this.alertRules.get(ruleId);
    if (!rule) {
      throw new Error(`Alert rule ${ruleId} not found`);
    }

    await this.triggerAlert(rule, rule.threshold + 1);
  }
}

export const moderationAlertingService = new ModerationAlertingService();