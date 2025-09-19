import { EventEmitter } from 'events';
import { SecurityAlert } from './ContractMonitor';

export interface AlertRule {
  id: string;
  name: string;
  condition: (data: any) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  cooldownMs: number;
  lastTriggered?: Date;
}

export interface NotificationChannel {
  type: 'email' | 'slack' | 'webhook' | 'sms';
  config: any;
  enabled: boolean;
}

export class AlertingSystem extends EventEmitter {
  private rules: Map<string, AlertRule> = new Map();
  private channels: Map<string, NotificationChannel> = new Map();
  private alertHistory: SecurityAlert[] = [];
  private maxHistorySize = 1000;

  constructor() {
    super();
    this.setupDefaultRules();
  }

  private setupDefaultRules() {
    // High gas usage alert
    this.addRule({
      id: 'high-gas-usage',
      name: 'High Gas Usage',
      condition: (data) => data.gasUsed && data.gasUsed > 500000,
      severity: 'medium',
      cooldownMs: 300000 // 5 minutes
    });

    // Contract pause alert
    this.addRule({
      id: 'contract-paused',
      name: 'Contract Emergency Pause',
      condition: (data) => data.alertType === 'EMERGENCY_PAUSE',
      severity: 'critical',
      cooldownMs: 0 // No cooldown for critical alerts
    });

    // High error rate alert
    this.addRule({
      id: 'high-error-rate',
      name: 'High Error Rate',
      condition: (data) => {
        if (!data.metrics) return false;
        const errorRate = data.metrics.errorCount / Math.max(data.metrics.transactionCount, 1);
        return errorRate > 0.1; // 10% error rate
      },
      severity: 'high',
      cooldownMs: 600000 // 10 minutes
    });

    // Large value transfer alert
    this.addRule({
      id: 'large-transfer',
      name: 'Large Value Transfer',
      condition: (data) => data.alertType === 'LARGE_TRANSFER',
      severity: 'medium',
      cooldownMs: 60000 // 1 minute
    });

    // Ownership change alert
    this.addRule({
      id: 'ownership-change',
      name: 'Contract Ownership Change',
      condition: (data) => data.alertType === 'OWNERSHIP_TRANSFER',
      severity: 'high',
      cooldownMs: 0 // No cooldown for ownership changes
    });

    // Contract unresponsive alert
    this.addRule({
      id: 'contract-unresponsive',
      name: 'Contract Unresponsive',
      condition: (data) => data.alertType === 'CONTRACT_UNRESPONSIVE',
      severity: 'critical',
      cooldownMs: 300000 // 5 minutes
    });
  }

  addRule(rule: AlertRule) {
    this.rules.set(rule.id, rule);
  }

  removeRule(ruleId: string) {
    this.rules.delete(ruleId);
  }

  addNotificationChannel(id: string, channel: NotificationChannel) {
    this.channels.set(id, channel);
  }

  removeNotificationChannel(id: string) {
    this.channels.delete(id);
  }

  async processAlert(data: any) {
    for (const [ruleId, rule] of this.rules) {
      if (this.shouldTriggerRule(rule, data)) {
        const alert: SecurityAlert = {
          severity: rule.severity,
          contractAddress: data.contractAddress || 'unknown',
          alertType: rule.name,
          description: this.generateAlertDescription(rule, data),
          timestamp: new Date()
        };

        await this.sendAlert(alert);
        this.recordAlert(alert);
        rule.lastTriggered = new Date();
      }
    }
  }

  private shouldTriggerRule(rule: AlertRule, data: any): boolean {
    // Check if rule condition is met
    if (!rule.condition(data)) {
      return false;
    }

    // Check cooldown period
    if (rule.lastTriggered && rule.cooldownMs > 0) {
      const timeSinceLastTrigger = Date.now() - rule.lastTriggered.getTime();
      if (timeSinceLastTrigger < rule.cooldownMs) {
        return false;
      }
    }

    return true;
  }

  private generateAlertDescription(rule: AlertRule, data: any): string {
    switch (rule.id) {
      case 'high-gas-usage':
        return `High gas usage detected: ${data.gasUsed} gas used`;
      case 'contract-paused':
        return `Contract emergency pause triggered: ${data.description}`;
      case 'high-error-rate':
        const errorRate = (data.metrics.errorCount / Math.max(data.metrics.transactionCount, 1) * 100).toFixed(2);
        return `High error rate detected: ${errorRate}% (${data.metrics.errorCount}/${data.metrics.transactionCount})`;
      case 'large-transfer':
        return `Large value transfer detected: ${data.description}`;
      case 'ownership-change':
        return `Contract ownership changed: ${data.description}`;
      case 'contract-unresponsive':
        return `Contract is unresponsive: ${data.description}`;
      default:
        return data.description || `Alert triggered for rule: ${rule.name}`;
    }
  }

  private async sendAlert(alert: SecurityAlert) {
    for (const [channelId, channel] of this.channels) {
      if (!channel.enabled) continue;

      try {
        await this.sendToChannel(channel, alert);
      } catch (error) {
        console.error(`Failed to send alert to channel ${channelId}:`, error);
      }
    }

    this.emit('alertSent', alert);
  }

  private async sendToChannel(channel: NotificationChannel, alert: SecurityAlert) {
    switch (channel.type) {
      case 'webhook':
        await this.sendWebhook(channel.config, alert);
        break;
      case 'slack':
        await this.sendSlack(channel.config, alert);
        break;
      case 'email':
        await this.sendEmail(channel.config, alert);
        break;
      case 'sms':
        await this.sendSMS(channel.config, alert);
        break;
    }
  }

  private async sendWebhook(config: any, alert: SecurityAlert) {
    const response = await fetch(config.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headers
      },
      body: JSON.stringify({
        alert,
        timestamp: alert.timestamp.toISOString(),
        severity: alert.severity,
        contract: alert.contractAddress,
        description: alert.description
      })
    });

    if (!response.ok) {
      throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
    }
  }

  private async sendSlack(config: any, alert: SecurityAlert) {
    const color = this.getSeverityColor(alert.severity);
    const payload = {
      text: `🚨 Smart Contract Alert`,
      attachments: [{
        color,
        fields: [
          {
            title: 'Severity',
            value: alert.severity.toUpperCase(),
            short: true
          },
          {
            title: 'Contract',
            value: alert.contractAddress,
            short: true
          },
          {
            title: 'Alert Type',
            value: alert.alertType,
            short: true
          },
          {
            title: 'Description',
            value: alert.description,
            short: false
          }
        ],
        ts: Math.floor(alert.timestamp.getTime() / 1000)
      }]
    };

    const response = await fetch(config.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack notification failed: ${response.status}`);
    }
  }

  private async sendEmail(config: any, alert: SecurityAlert) {
    // Implementation would depend on email service (SendGrid, AWS SES, etc.)
    console.log(`Email alert would be sent to ${config.recipients}: ${alert.description}`);
  }

  private async sendSMS(config: any, alert: SecurityAlert) {
    // Implementation would depend on SMS service (Twilio, AWS SNS, etc.)
    console.log(`SMS alert would be sent to ${config.phoneNumbers}: ${alert.description}`);
  }

  private getSeverityColor(severity: string): string {
    switch (severity) {
      case 'critical': return 'danger';
      case 'high': return 'warning';
      case 'medium': return '#ff9500';
      case 'low': return 'good';
      default: return '#cccccc';
    }
  }

  private recordAlert(alert: SecurityAlert) {
    this.alertHistory.unshift(alert);
    
    // Maintain history size limit
    if (this.alertHistory.length > this.maxHistorySize) {
      this.alertHistory = this.alertHistory.slice(0, this.maxHistorySize);
    }
  }

  getAlertHistory(limit?: number): SecurityAlert[] {
    return limit ? this.alertHistory.slice(0, limit) : this.alertHistory;
  }

  getAlertStats() {
    const stats = {
      total: this.alertHistory.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      last24h: 0
    };

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const alert of this.alertHistory) {
      stats[alert.severity]++;
      if (alert.timestamp > oneDayAgo) {
        stats.last24h++;
      }
    }

    return stats;
  }
}