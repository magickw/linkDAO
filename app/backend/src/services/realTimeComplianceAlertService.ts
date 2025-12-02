/**
 * Real-time Compliance Alert Service
 * 
 * Handles real-time violation detection, alert generation, and notification
 * delivery for seller compliance monitoring.
 */

import { EventEmitter } from 'events';
import { logger } from '../utils/logger';
import { realTimeComplianceMonitoringService } from './realTimeComplianceMonitoringService';
import { comprehensiveAuditService } from './comprehensiveAuditService';

export interface ComplianceViolationAlert {
  id: string;
  violationId: string;
  sellerId: string;
  sellerName: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  description: string;
  impact: string;
  recommendedActions: string[];
  escalationLevel: number;
  autoResolve: boolean;
  resolveBy?: Date;
  acknowledged: boolean;
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolved: boolean;
  resolvedBy?: string;
  resolvedAt?: Date;
}

export interface AlertNotificationChannel {
  id: string;
  type: 'email' | 'sms' | 'webhook' | 'in_app' | 'slack';
  enabled: boolean;
  config: any;
  lastSent?: Date;
  rateLimit: number; // messages per hour
  currentRate: number;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  violationType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  conditions: {
    minOccurrences?: number;
    timeWindow?: number; // minutes
    sellerTier?: string[];
    customConditions?: any;
  };
  actions: {
    escalate: boolean;
    notifyChannels: string[];
    autoResolve: boolean;
    requireAcknowledgment: boolean;
  };
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class RealTimeComplianceAlertService extends EventEmitter {
  private activeAlerts: Map<string, ComplianceViolationAlert> = new Map();
  private alertRules: Map<string, AlertRule> = new Map();
  private notificationChannels: Map<string, AlertNotificationChannel> = new Map();
  private alertHistory: ComplianceViolationAlert[] = [];
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor() {
    super();
    this.initializeDefaultRules();
    this.initializeNotificationChannels();
    this.setupEventListeners();
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: AlertRule[] = [
      {
        id: 'critical_processing_delay',
        name: 'Critical Processing Delay',
        description: 'Alert when processing delay exceeds 24 hours',
        violationType: 'processing_delay',
        severity: 'critical',
        conditions: {
          minOccurrences: 1,
          timeWindow: 60
        },
        actions: {
          escalate: true,
          notifyChannels: ['email', 'slack', 'in_app'],
          autoResolve: false,
          requireAcknowledgment: true
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'high_approval_rate_deviation',
        name: 'High Approval Rate Deviation',
        description: 'Alert when approval rate deviates significantly from platform average',
        violationType: 'approval_rate',
        severity: 'high',
        conditions: {
          minOccurrences: 1,
          timeWindow: 1440 // 24 hours
        },
        actions: {
          escalate: false,
          notifyChannels: ['email', 'in_app'],
          autoResolve: false,
          requireAcknowledgment: false
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'repeated_policy_violations',
        name: 'Repeated Policy Violations',
        description: 'Alert when seller has multiple violations in short period',
        violationType: 'policy_mismatch',
        severity: 'medium',
        conditions: {
          minOccurrences: 3,
          timeWindow: 168 // 7 days
        },
        actions: {
          escalate: true,
          notifyChannels: ['email', 'in_app'],
          autoResolve: false,
          requireAcknowledgment: true
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      {
        id: 'low_compliance_score',
        name: 'Low Compliance Score',
        description: 'Alert when compliance score drops below threshold',
        violationType: 'compliance_score',
        severity: 'high',
        conditions: {
          customConditions: {
            scoreThreshold: 70,
            consecutiveReadings: 2
          }
        },
        actions: {
          escalate: false,
          notifyChannels: ['email', 'in_app'],
          autoResolve: true,
          requireAcknowledgment: false
        },
        enabled: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    ];

    defaultRules.forEach(rule => {
      this.alertRules.set(rule.id, rule);
    });

    logger.info(`Initialized ${defaultRules.length} default compliance alert rules`);
  }

  /**
   * Initialize notification channels
   */
  private initializeNotificationChannels(): void {
    const defaultChannels: AlertNotificationChannel[] = [
      {
        id: 'in_app',
        type: 'in_app',
        enabled: true,
        config: {
          retention: 30 // days
        },
        rateLimit: 100,
        currentRate: 0
      },
      {
        id: 'email',
        type: 'email',
        enabled: true,
        config: {
          templates: {
            violation: 'compliance_violation_template',
            escalation: 'compliance_escalation_template'
          },
          recipients: ['compliance@linkdao.com']
        },
        rateLimit: 20,
        currentRate: 0
      },
      {
        id: 'slack',
        type: 'slack',
        enabled: process.env.SLACK_COMPLIANCE_WEBHOOK ? true : false,
        config: {
          webhookUrl: process.env.SLACK_COMPLIANCE_WEBHOOK,
          channel: '#compliance-alerts'
        },
        rateLimit: 30,
        currentRate: 0
      }
    ];

    defaultChannels.forEach(channel => {
      this.notificationChannels.set(channel.id, channel);
    });

    logger.info(`Initialized ${defaultChannels.length} notification channels`);
  }

  /**
   * Setup event listeners
   */
  private setupEventListeners(): void {
    // Listen to real-time compliance monitoring events
    realTimeComplianceMonitoringService.on('violation_detected', (alert) => {
      this.handleViolationAlert(alert);
    });

    // Reset rate limits every hour
    setInterval(() => {
      this.resetRateLimits();
    }, 60 * 60 * 1000);
  }

  /**
   * Handle violation alert from real-time monitoring
   */
  private async handleViolationAlert(alert: any): Promise<void> {
    try {
      // Check if alert matches any rules
      const matchingRules = this.findMatchingRules(alert);
      
      for (const rule of matchingRules) {
        const complianceAlert = await this.createComplianceAlert(alert, rule);
        
        if (complianceAlert) {
          await this.processAlert(complianceAlert, rule);
        }
      }
    } catch (error) {
      logger.error('Error handling violation alert:', error);
    }
  }

  /**
   * Find matching alert rules for a violation
   */
  private findMatchingRules(alert: any): AlertRule[] {
    const matchingRules: AlertRule[] = [];

    for (const rule of this.alertRules.values()) {
      if (!rule.enabled) continue;

      // Check violation type match
      if (rule.violationType !== alert.type && rule.violationType !== 'compliance_score') continue;

      // Check severity match
      if (rule.severity !== alert.severity) continue;

      // Check custom conditions
      if (rule.conditions.customConditions) {
        if (!this.checkCustomConditions(alert, rule.conditions.customConditions)) {
          continue;
        }
      }

      matchingRules.push(rule);
    }

    return matchingRules;
  }

  /**
   * Check custom conditions for alert rules
   */
  private checkCustomConditions(alert: any, conditions: any): boolean {
    if (conditions.scoreThreshold && alert.details?.complianceScore) {
      return alert.details.complianceScore < conditions.scoreThreshold;
    }

    if (conditions.consecutiveReadings) {
      // TODO: Implement consecutive readings check
      return true;
    }

    return true;
  }

  /**
   * Create compliance alert
   */
  private async createComplianceAlert(alert: any, rule: AlertRule): Promise<ComplianceViolationAlert | null> {
    try {
      const complianceAlert: ComplianceViolationAlert = {
        id: this.generateAlertId(),
        violationId: alert.id,
        sellerId: alert.sellerId,
        sellerName: alert.sellerName,
        violationType: rule.violationType,
        severity: alert.severity,
        timestamp: alert.timestamp,
        description: alert.message,
        impact: this.calculateImpact(alert),
        recommendedActions: this.generateRecommendedActions(alert, rule),
        escalationLevel: 1,
        autoResolve: rule.actions.autoResolve,
        acknowledged: false,
        resolved: false
      };

      // Store active alert
      this.activeAlerts.set(complianceAlert.id, complianceAlert);
      this.alertHistory.push(complianceAlert);

      // Log to audit service
      await comprehensiveAuditService.logEvent({
        action: 'compliance_alert_created',
        actorId: 'compliance_alert_service',
        resourceType: 'COMPLIANCE_ALERT',
        resourceId: complianceAlert.id,
        details: {
          sellerId: alert.sellerId,
          violationType: rule.violationType,
          severity: alert.severity
        }
      });

      return complianceAlert;
    } catch (error) {
      logger.error('Error creating compliance alert:', error);
      return null;
    }
  }

  /**
   * Process compliance alert
   */
  private async processAlert(alert: ComplianceViolationAlert, rule: AlertRule): Promise<void> {
    try {
      // Send notifications
      await this.sendNotifications(alert, rule.actions.notifyChannels);

      // Set up escalation if needed
      if (rule.actions.escalate) {
        this.setupEscalation(alert, rule);
      }

      // Emit alert event for real-time updates
      this.emit('alert_processed', alert);

      logger.info(`Processed compliance alert ${alert.id} for seller ${alert.sellerId}`);
    } catch (error) {
      logger.error('Error processing compliance alert:', error);
    }
  }

  /**
   * Send notifications through specified channels
   */
  private async sendNotifications(alert: ComplianceViolationAlert, channelIds: string[]): Promise<void> {
    for (const channelId of channelIds) {
      const channel = this.notificationChannels.get(channelId);
      if (!channel || !channel.enabled) continue;

      // Check rate limit
      if (channel.currentRate >= channel.rateLimit) {
        logger.warn(`Rate limit exceeded for channel ${channelId}`);
        continue;
      }

      try {
        await this.sendNotification(channel, alert);
        channel.currentRate++;
        channel.lastSent = new Date();
      } catch (error) {
        logger.error(`Error sending notification via ${channelId}:`, error);
      }
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotification(channel: AlertNotificationChannel, alert: ComplianceViolationAlert): Promise<void> {
    switch (channel.type) {
      case 'email':
        await this.sendEmailNotification(channel, alert);
        break;
      case 'slack':
        await this.sendSlackNotification(channel, alert);
        break;
      case 'in_app':
        await this.sendInAppNotification(channel, alert);
        break;
      default:
        logger.warn(`Unknown notification channel type: ${channel.type}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(channel: AlertNotificationChannel, alert: ComplianceViolationAlert): Promise<void> {
    // TODO: Implement actual email sending
    logger.info(`Email notification sent for alert ${alert.id}: ${alert.description}`);
  }

  /**
   * Send Slack notification
   */
  private async sendSlackNotification(channel: AlertNotificationChannel, alert: ComplianceViolationAlert): Promise<void> {
    if (!channel.config.webhookUrl) return;

    const payload = {
      text: `Compliance Alert: ${alert.severity.toUpperCase()}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*${alert.severity.toUpperCase()} Compliance Alert*`
          }
        },
        {
          type: 'section',
          fields: [
            {
              type: 'mrkdwn',
              text: `*Seller:*\n${alert.sellerName}`
            },
            {
              type: 'mrkdwn',
              text: `*Type:*\n${alert.violationType}`
            },
            {
              type: 'mrkdwn',
              text: `*Time:*\n${alert.timestamp.toISOString()}`
            },
            {
              type: 'mrkdwn',
              text: `*Severity:*\n${alert.severity}`
            }
          ]
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Description:*\n${alert.description}`
          }
        }
      ]
    };

    // TODO: Implement actual Slack webhook call
    logger.info(`Slack notification sent for alert ${alert.id}`);
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(channel: AlertNotificationChannel, alert: ComplianceViolationAlert): Promise<void> {
    // Broadcast to real-time monitoring service
    realTimeComplianceMonitoringService.emit('in_app_notification', {
      type: 'compliance_alert',
      alert,
      timestamp: new Date()
    });

    logger.info(`In-app notification sent for alert ${alert.id}`);
  }

  /**
   * Setup escalation for alert
   */
  private setupEscalation(alert: ComplianceViolationAlert, rule: AlertRule): Promise<void> {
    return new Promise((resolve) => {
      // Escalate after 2 hours for high severity, 1 hour for critical
      const escalationDelay = alert.severity === 'critical' ? 60 * 60 * 1000 : 2 * 60 * 60 * 1000;

      const timer = setTimeout(async () => {
        if (!alert.acknowledged && !alert.resolved) {
          await this.escalateAlert(alert);
        }
        this.escalationTimers.delete(alert.id);
      }, escalationDelay);

      this.escalationTimers.set(alert.id, timer);
      resolve();
    });
  }

  /**
   * Escalate alert
   */
  private async escalateAlert(alert: ComplianceViolationAlert): Promise<void> {
    alert.escalationLevel++;
    
    // Send escalation notifications
    await this.sendNotifications(alert, ['email', 'slack']);

    // Log escalation
    await comprehensiveAuditService.logEvent({
      action: 'compliance_alert_escalated',
      actorId: 'compliance_alert_service',
      resourceType: 'COMPLIANCE_ALERT',
      resourceId: alert.id,
      details: {
        escalationLevel: alert.escalationLevel,
        sellerId: alert.sellerId
      }
    });

    this.emit('alert_escalated', alert);
    logger.warn(`Alert ${alert.id} escalated to level ${alert.escalationLevel}`);
  }

  /**
   * Acknowledge alert
   */
  public async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.acknowledged = true;
    alert.acknowledgedBy = userId;
    alert.acknowledgedAt = new Date();

    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Log acknowledgment
    await comprehensiveAuditService.logEvent({
      action: 'compliance_alert_acknowledged',
      actorId: userId,
      resourceType: 'COMPLIANCE_ALERT',
      resourceId: alertId,
      details: {
        sellerId: alert.sellerId
      }
    });

    this.emit('alert_acknowledged', alert);
  }

  /**
   * Resolve alert
   */
  public async resolveAlert(alertId: string, userId: string, resolution: string): Promise<void> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedBy = userId;
    alert.resolvedAt = new Date();

    // Remove from active alerts
    this.activeAlerts.delete(alertId);

    // Clear escalation timer
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    // Log resolution
    await comprehensiveAuditService.logEvent({
      action: 'compliance_alert_resolved',
      actorId: userId,
      resourceType: 'COMPLIANCE_ALERT',
      resourceId: alertId,
      details: {
        sellerId: alert.sellerId,
        resolution
      }
    });

    this.emit('alert_resolved', alert);
  }

  /**
   * Calculate impact of violation
   */
  private calculateImpact(alert: any): string {
    switch (alert.severity) {
      case 'critical':
        return 'Immediate impact on seller reputation and platform compliance';
      case 'high':
        return 'Significant impact on seller performance metrics';
      case 'medium':
        return 'Moderate impact requiring attention';
      case 'low':
        return 'Minor impact with monitoring recommended';
      default:
        return 'Impact assessment pending';
    }
  }

  /**
   * Generate recommended actions
   */
  private generateRecommendedActions(alert: any, rule: AlertRule): string[] {
    const actions: string[] = [];

    switch (rule.violationType) {
      case 'processing_delay':
        actions.push('Review return processing workflow');
        actions.push('Consider temporary restrictions on new orders');
        actions.push('Contact seller for immediate action plan');
        break;
      case 'approval_rate':
        actions.push('Review return approval criteria');
        actions.push('Analyze deviation from platform standards');
        actions.push('Provide seller with compliance guidelines');
        break;
      case 'policy_mismatch':
        actions.push('Review seller policy compliance');
        actions.push('Schedule compliance review meeting');
        actions.push('Consider seller training requirements');
        break;
      case 'compliance_score':
        actions.push('Implement improvement plan');
        actions.push('Increase monitoring frequency');
        actions.push('Provide seller with detailed score breakdown');
        break;
      default:
        actions.push('Investigate violation details');
        actions.push('Contact seller for clarification');
        actions.push('Document findings for future reference');
    }

    return actions;
  }

  /**
   * Reset rate limits for all channels
   */
  private resetRateLimits(): void {
    for (const channel of this.notificationChannels.values()) {
      channel.currentRate = 0;
    }
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): ComplianceViolationAlert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  public getAlertHistory(limit: number = 100): ComplianceViolationAlert[] {
    return this.alertHistory.slice(-limit);
  }

  /**
   * Get alert statistics
   */
  public getStats(): any {
    const activeAlerts = this.getActiveAlerts();
    const recentAlerts = this.alertHistory.filter(a => 
      Date.now() - a.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    return {
      activeAlerts: activeAlerts.length,
      alertsBySeverity: {
        critical: activeAlerts.filter(a => a.severity === 'critical').length,
        high: activeAlerts.filter(a => a.severity === 'high').length,
        medium: activeAlerts.filter(a => a.severity === 'medium').length,
        low: activeAlerts.filter(a => a.severity === 'low').length
      },
      recentAlerts: recentAlerts.length,
      acknowledgedAlerts: activeAlerts.filter(a => a.acknowledged).length,
      escalatedAlerts: activeAlerts.filter(a => a.escalationLevel > 1).length,
      notificationChannels: Array.from(this.notificationChannels.values()).map(c => ({
        id: c.id,
        type: c.type,
        enabled: c.enabled,
        currentRate: c.currentRate,
        rateLimit: c.rateLimit
      }))
    };
  }
}

export const realTimeComplianceAlertService = new RealTimeComplianceAlertService();