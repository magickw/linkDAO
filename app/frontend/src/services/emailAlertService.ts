/**
 * Email Alert Service for Critical Support Metrics
 * Monitors metrics and triggers email alerts when thresholds are exceeded
 */

import { supportAnalyticsService, SupportAnalytics } from './supportAnalyticsService';

export interface AlertThreshold {
  metric: string;
  operator: 'greater_than' | 'less_than' | 'equals';
  value: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface AlertConfig {
  enabled: boolean;
  thresholds: AlertThreshold[];
  recipients: string[];
  frequency: 'immediate' | 'hourly' | 'daily';
  lastSent?: Date;
}

export interface Alert {
  id: string;
  metric: string;
  currentValue: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
}

class EmailAlertService {
  private config: AlertConfig = {
    enabled: false,
    thresholds: this.getDefaultThresholds(),
    recipients: [],
    frequency: 'immediate'
  };

  private activeAlerts: Map<string, Alert> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.loadConfig();
  }

  /**
   * Get default alert thresholds
   */
  private getDefaultThresholds(): AlertThreshold[] {
    return [
      {
        metric: 'avgResponseTime',
        operator: 'greater_than',
        value: 4,
        severity: 'high'
      },
      {
        metric: 'unresolvedTickets',
        operator: 'greater_than',
        value: 50,
        severity: 'critical'
      },
      {
        metric: 'documentationEffectiveness',
        operator: 'less_than',
        value: 70,
        severity: 'medium'
      },
      {
        metric: 'ticketsWithDocViews',
        operator: 'greater_than',
        value: 30,
        severity: 'high'
      },
      {
        metric: 'resolutionRate',
        operator: 'less_than',
        value: 80,
        severity: 'high'
      }
    ];
  }

  /**
   * Load configuration from localStorage
   */
  private loadConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      const savedConfig = localStorage.getItem('support_alert_config');
      if (savedConfig) {
        this.config = { ...this.config, ...JSON.parse(savedConfig) };
      }
    } catch (error) {
      console.error('Error loading alert config:', error);
    }
  }

  /**
   * Save configuration to localStorage
   */
  private saveConfig(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem('support_alert_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Error saving alert config:', error);
    }
  }

  /**
   * Update alert configuration
   */
  updateConfig(config: Partial<AlertConfig>): void {
    this.config = { ...this.config, ...config };
    this.saveConfig();

    if (this.config.enabled) {
      this.startMonitoring();
    } else {
      this.stopMonitoring();
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AlertConfig {
    return { ...this.config };
  }

  /**
   * Start monitoring metrics
   */
  startMonitoring(): void {
    if (this.checkInterval) {
      return;
    }

    // Check every 5 minutes
    this.checkInterval = setInterval(() => {
      this.checkMetrics();
    }, 5 * 60 * 1000);

    // Initial check
    this.checkMetrics();
  }

  /**
   * Stop monitoring metrics
   */
  stopMonitoring(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
  }

  /**
   * Check metrics against thresholds
   */
  private async checkMetrics(): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const analytics = await supportAnalyticsService.getSupportAnalytics(7);
      const metrics = this.extractMetrics(analytics);

      const triggeredAlerts: Alert[] = [];

      for (const threshold of this.config.thresholds) {
        const currentValue = metrics[threshold.metric];
        if (currentValue === undefined) continue;

        const isTriggered = this.checkThreshold(currentValue, threshold);

        if (isTriggered) {
          const alertId = `${threshold.metric}_${threshold.operator}_${threshold.value}`;

          // Check if this alert is already active
          if (!this.activeAlerts.has(alertId)) {
            const alert: Alert = {
              id: alertId,
              metric: threshold.metric,
              currentValue,
              threshold: threshold.value,
              severity: threshold.severity,
              message: this.generateAlertMessage(threshold.metric, currentValue, threshold),
              timestamp: new Date()
            };

            this.activeAlerts.set(alertId, alert);
            triggeredAlerts.push(alert);
          }
        }
      }

      if (triggeredAlerts.length > 0) {
        await this.sendAlertEmail(triggeredAlerts);
      }
    } catch (error) {
      console.error('Error checking metrics:', error);
    }
  }

  /**
   * Extract metrics from analytics
   */
  private extractMetrics(analytics: SupportAnalytics): Record<string, number> {
    const unresolvedTickets = analytics.summary.totalTickets -
      (analytics.summary.totalTickets * 0.9); // Estimate

    return {
      avgResponseTime: analytics.summary.averageResolutionTime,
      unresolvedTickets,
      documentationEffectiveness: analytics.summary.documentationEffectiveness,
      ticketsWithDocViews: analytics.summary.ticketsWithDocViews,
      resolutionRate: ((analytics.summary.totalTickets - unresolvedTickets) / analytics.summary.totalTickets) * 100
    };
  }

  /**
   * Check if threshold is exceeded
   */
  private checkThreshold(value: number, threshold: AlertThreshold): boolean {
    switch (threshold.operator) {
      case 'greater_than':
        return value > threshold.value;
      case 'less_than':
        return value < threshold.value;
      case 'equals':
        return value === threshold.value;
      default:
        return false;
    }
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(metric: string, value: number, threshold: AlertThreshold): string {
    const metricNames: Record<string, string> = {
      avgResponseTime: 'Average Response Time',
      unresolvedTickets: 'Unresolved Tickets',
      documentationEffectiveness: 'Documentation Effectiveness',
      ticketsWithDocViews: 'Tickets with Documentation Views',
      resolutionRate: 'Resolution Rate'
    };

    const metricName = metricNames[metric] || metric;
    const operator = threshold.operator === 'greater_than' ? 'above' :
                     threshold.operator === 'less_than' ? 'below' : 'equal to';

    return `${metricName} is ${operator} threshold: ${value.toFixed(2)} (threshold: ${threshold.value})`;
  }

  /**
   * Send alert email
   */
  private async sendAlertEmail(alerts: Alert[]): Promise<void> {
    if (!this.shouldSendEmail()) {
      return;
    }

    try {
      const response = await fetch('/api/support-alerts/send', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          alerts,
          recipients: this.config.recipients,
          severity: this.getHighestSeverity(alerts)
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to send alert email');
      }

      this.config.lastSent = new Date();
      this.saveConfig();

      console.log('Alert email sent successfully');
    } catch (error) {
      console.error('Error sending alert email:', error);
    }
  }

  /**
   * Check if email should be sent based on frequency
   */
  private shouldSendEmail(): boolean {
    if (this.config.frequency === 'immediate') {
      return true;
    }

    if (!this.config.lastSent) {
      return true;
    }

    const now = new Date();
    const lastSent = new Date(this.config.lastSent);
    const hoursSinceLastSent = (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60);

    if (this.config.frequency === 'hourly' && hoursSinceLastSent >= 1) {
      return true;
    }

    if (this.config.frequency === 'daily' && hoursSinceLastSent >= 24) {
      return true;
    }

    return false;
  }

  /**
   * Get highest severity from alerts
   */
  private getHighestSeverity(alerts: Alert[]): 'low' | 'medium' | 'high' | 'critical' {
    const severityOrder = { low: 1, medium: 2, high: 3, critical: 4 };
    let highest: 'low' | 'medium' | 'high' | 'critical' = 'low';

    for (const alert of alerts) {
      if (severityOrder[alert.severity] > severityOrder[highest]) {
        highest = alert.severity;
      }
    }

    return highest;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Clear alert
   */
  clearAlert(alertId: string): void {
    this.activeAlerts.delete(alertId);
  }

  /**
   * Clear all alerts
   */
  clearAllAlerts(): void {
    this.activeAlerts.clear();
  }

  /**
   * Test alert configuration
   */
  async testAlert(): Promise<boolean> {
    const testAlert: Alert = {
      id: 'test',
      metric: 'test',
      currentValue: 100,
      threshold: 50,
      severity: 'low',
      message: 'This is a test alert',
      timestamp: new Date()
    };

    try {
      await this.sendAlertEmail([testAlert]);
      return true;
    } catch (error) {
      console.error('Test alert failed:', error);
      return false;
    }
  }
}

export const emailAlertService = new EmailAlertService();
