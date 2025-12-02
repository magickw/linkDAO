import { db } from '../db/index';
import { 
  returnAdminAlerts,
  returns,
  refundFinancialRecords,
  returnAnalyticsHourly,
  returnAnalyticsDaily
} from '../db/schema';
import { eq, and, gte, lte, sql, desc, count, avg, sum, max, min } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { redisService } from './redisService';
import { v4 as uuidv4 } from 'uuid';
import { fraudDetectionEngine } from './fraudDetectionEngine';
import { refundMonitoringService } from './refundMonitoringService';
import { returnAnalyticsService } from './returnAnalyticsService';

// ============================================================================
// TYPES AND INTERFACES
// ============================================================================

export interface AlertConfig {
  id: string;
  name: string;
  description: string;
  alertType: ReturnAlertType;
  severity: AlertSeverity;
  enabled: boolean;
  threshold: number;
  comparisonOperator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  timeWindowMinutes: number;
  cooldownMinutes: number;
  recipients: string[]; // Admin user IDs or email addresses
  channels: AlertChannelType[];
  escalationPolicy?: EscalationPolicy;
  escalationHistory?: AlertEscalation[];
  createdAt: Date;
  updatedAt: Date;
}

export interface EscalationPolicy {
  escalateAfterMinutes: number;
  escalateTo: string[]; // Admin user IDs or email addresses
  escalateToChannels: AlertChannelType[];
  repeatEscalationAfterMinutes?: number; // For repeated escalations
  maxEscalationLevels?: number; // Maximum escalation levels
}

export type ReturnAlertType = 
  | 'volume_spike'
  | 'processing_delay'
  | 'refund_failure_spike'
  | 'high_risk_pattern'
  | 'fraud_detected'
  | 'policy_violation'
  | 'sla_breach'
  | 'provider_degradation'
  | 'system_error'
  | 'return_rate_increase'
  | 'high_value_return_spike'
  | 'repeat_returner'
  | 'geographic_anomaly'
  | 'reason_pattern_abuse';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export type AlertChannelType = 
  | 'email'
  | 'sms'
  | 'in_app'
  | 'webhook'
  | 'slack'
  | 'teams'
  | 'pagerduty';

export interface ReturnAlert {
  id: string;
  alertType: ReturnAlertType;
  severity: AlertSeverity;
  title: string;
  description: string;
  affectedEntityType?: string;
  affectedEntityId?: string;
  triggerMetric?: string;
  triggerThreshold?: number;
  actualValue?: number;
  contextData?: any;
  recommendedActions?: string[];
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
  resolvedAt?: Date;
  resolvedBy?: string;
  resolutionNotes?: string;
  notifiedAdmins?: string[];
  notificationSentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AlertNotification {
  alertId: string;
  channel: AlertChannelType;
  recipient: string;
  sentAt: Date;
  status: 'pending' | 'sent' | 'failed';
  errorMessage?: string;
}

export interface AlertEscalation {
  id: string;
  alertId: string;
  level: number;
  escalatedAt: Date;
  escalatedTo: string[];
  escalatedChannels: AlertChannelType[];
  reason: string;
  acknowledgedAt?: Date;
  acknowledgedBy?: string;
}

// ============================================================================
// RETURN ALERT MANAGER SERVICE
// ============================================================================

export class ReturnAlertManagerService {
  private configs: Map<string, AlertConfig> = new Map();
  private activeAlerts: Map<string, ReturnAlert> = new Map();
  private lastCheckTimes: Map<string, Date> = new Map();
  private notificationHistory: Map<string, AlertNotification[]> = new Map();
  private checkInterval: NodeJS.Timeout | null = null;
  private readonly CHECK_INTERVAL_MS = 60000; // 1 minute

  constructor() {
    this.initializeDefaultConfigs();
    this.startAlertChecking();
  }

  // ========================================================================
  // INITIALIZATION
  // ========================================================================

  private initializeDefaultConfigs(): void {
    // Volume spike alert
    this.setAlertConfig({
      id: 'vol-spike-001',
      name: 'Return Volume Spike',
      description: 'Alert when return volume exceeds normal patterns',
      alertType: 'volume_spike',
      severity: 'high',
      enabled: true,
      threshold: 2.0, // 2x normal volume
      comparisonOperator: 'gt',
      timeWindowMinutes: 60,
      cooldownMinutes: 30,
      recipients: ['admin@linkdao.io'],
      channels: ['email', 'in_app'],
    });

    // Processing delay alert
    this.setAlertConfig({
      id: 'proc-delay-001',
      name: 'Return Processing Delay',
      description: 'Alert when returns exceed SLA processing times',
      alertType: 'processing_delay',
      severity: 'medium',
      enabled: true,
      threshold: 48, // 48 hours
      comparisonOperator: 'gt',
      timeWindowMinutes: 1440, // 24 hours
      cooldownMinutes: 60,
      recipients: ['admin@linkdao.io'],
      channels: ['email', 'in_app'],
    });

    // Refund failure spike alert
    this.setAlertConfig({
      id: 'refund-fail-001',
      name: 'Refund Failure Spike',
      description: 'Alert when refund failure rate exceeds threshold',
      alertType: 'refund_failure_spike',
      severity: 'high',
      enabled: true,
      threshold: 0.1, // 10% failure rate
      comparisonOperator: 'gt',
      timeWindowMinutes: 60,
      cooldownMinutes: 30,
      recipients: ['admin@linkdao.io', 'finance@linkdao.io'],
      channels: ['email', 'in_app', 'pagerduty'],
    });

    // High risk pattern alert
    this.setAlertConfig({
      id: 'high-risk-001',
      name: 'High Risk Return Pattern',
      description: 'Alert when high-risk return patterns are detected',
      alertType: 'high_risk_pattern',
      severity: 'high',
      enabled: true,
      threshold: 80, // Risk score threshold
      comparisonOperator: 'gt',
      timeWindowMinutes: 1440, // 24 hours
      cooldownMinutes: 15,
      recipients: ['admin@linkdao.io', 'risk@linkdao.io'],
      channels: ['email', 'in_app', 'pagerduty'],
    });

    // Fraud detected alert
    this.setAlertConfig({
      id: 'fraud-detected-001',
      name: 'Fraud Detected',
      description: 'Alert when fraud is detected in return requests',
      alertType: 'fraud_detected',
      severity: 'critical',
      enabled: true,
      threshold: 90, // Fraud confidence threshold
      comparisonOperator: 'gt',
      timeWindowMinutes: 1440, // 24 hours
      cooldownMinutes: 5,
      recipients: ['admin@linkdao.io', 'security@linkdao.io'],
      channels: ['email', 'in_app', 'pagerduty', 'sms'],
    });

    // SLA breach alert
    this.setAlertConfig({
      id: 'sla-breach-001',
      name: 'SLA Breach',
      description: 'Alert when SLA for return processing is breached',
      alertType: 'sla_breach',
      severity: 'high',
      enabled: true,
      threshold: 72, // 72 hours
      comparisonOperator: 'gt',
      timeWindowMinutes: 1440, // 24 hours
      cooldownMinutes: 60,
      recipients: ['admin@linkdao.io'],
      channels: ['email', 'in_app'],
    });

    // Provider degradation alert
    this.setAlertConfig({
      id: 'provider-deg-001',
      name: 'Payment Provider Degradation',
      description: 'Alert when payment provider performance degrades',
      alertType: 'provider_degradation',
      severity: 'high',
      enabled: true,
      threshold: 0.95, // 95% success rate threshold
      comparisonOperator: 'lt',
      timeWindowMinutes: 60,
      cooldownMinutes: 30,
      recipients: ['admin@linkdao.io', 'finance@linkdao.io'],
      channels: ['email', 'in_app', 'pagerduty'],
    });
  }

  private startAlertChecking(): void {
    this.checkInterval = setInterval(async () => {
      try {
        await this.checkAllAlerts();
      } catch (error) {
        safeLogger.error('Error during alert checking cycle:', error);
      }
    }, this.CHECK_INTERVAL_MS);
  }

  // ========================================================================
  // ALERT CONFIGURATION MANAGEMENT
  // ========================================================================

  /**
   * Get all alert configurations
   */
  getAlertConfigs(): AlertConfig[] {
    return Array.from(this.configs.values());
  }

  /**
   * Get alert configuration by ID
   */
  getAlertConfig(configId: string): AlertConfig | undefined {
    return this.configs.get(configId);
  }

  /**
   * Set or update alert configuration
   */
  setAlertConfig(config: Omit<AlertConfig, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): AlertConfig {
    const configId = config.id || `config-${uuidv4()}`;
    const now = new Date();
    
    const alertConfig: AlertConfig = {
      id: configId,
      name: config.name,
      description: config.description,
      alertType: config.alertType,
      severity: config.severity,
      enabled: config.enabled,
      threshold: config.threshold,
      comparisonOperator: config.comparisonOperator,
      timeWindowMinutes: config.timeWindowMinutes,
      cooldownMinutes: config.cooldownMinutes,
      recipients: config.recipients,
      channels: config.channels,
      escalationPolicy: config.escalationPolicy,
      createdAt: now,
      updatedAt: now
    };

    this.configs.set(configId, alertConfig);
    return alertConfig;
  }

  /**
   * Delete alert configuration
   */
  deleteAlertConfig(configId: string): boolean {
    return this.configs.delete(configId);
  }

  /**
   * Enable/disable alert configuration
   */
  toggleAlertConfig(configId: string, enabled: boolean): boolean {
    const config = this.configs.get(configId);
    if (!config) return false;
    
    config.enabled = enabled;
    config.updatedAt = new Date();
    this.configs.set(configId, config);
    return true;
  }

  // ========================================================================
  // ALERT CHECKING AND GENERATION
  // ========================================================================

  /**
   * Check all enabled alert configurations
   */
  async checkAllAlerts(): Promise<void> {
    const now = new Date();
    
    for (const config of this.configs.values()) {
      if (!config.enabled) continue;
      
      // Check cooldown period
      const lastCheck = this.lastCheckTimes.get(config.id);
      if (lastCheck) {
        const cooldownMs = config.cooldownMinutes * 60 * 1000;
        if (now.getTime() - lastCheck.getTime() < cooldownMs) {
          continue;
        }
      }
      
      try {
        const shouldTrigger = await this.evaluateAlertCondition(config);
        if (shouldTrigger) {
          await this.generateAlert(config);
          this.lastCheckTimes.set(config.id, now);
        }
      } catch (error) {
        safeLogger.error(`Error evaluating alert ${config.id}:`, error);
      }
    }
  }

  /**
   * Evaluate if an alert condition should trigger
   */
  private async evaluateAlertCondition(config: AlertConfig): Promise<boolean> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.timeWindowMinutes * 60 * 1000);
    
    try {
      let currentValue: number | null = null;
      
      switch (config.alertType) {
        case 'volume_spike':
          currentValue = await this.getReturnVolume(windowStart, now);
          break;
          
        case 'processing_delay':
          currentValue = await this.getAverageProcessingTime(windowStart, now);
          break;
          
        case 'refund_failure_spike':
          currentValue = await this.getRefundFailureRate(windowStart, now);
          break;
          
        case 'high_risk_pattern':
          currentValue = await this.getHighRiskReturnCount(windowStart, now);
          break;
          
        case 'fraud_detected':
          currentValue = await this.getFraudDetectionCount(windowStart, now);
          break;
          
        case 'sla_breach':
          currentValue = await this.getSLABreachCount(windowStart, now);
          break;
          
        case 'provider_degradation':
          currentValue = await this.getProviderSuccessRate(windowStart, now);
          break;
          
        case 'return_rate_increase':
          currentValue = await this.getReturnRate(windowStart, now);
          break;
          
        default:
          safeLogger.warn(`Unknown alert type: ${config.alertType}`);
          return false;
      }
      
      if (currentValue === null) {
        return false;
      }
      
      // Compare with threshold based on operator
      switch (config.comparisonOperator) {
        case 'gt':
          return currentValue > config.threshold;
        case 'lt':
          return currentValue < config.threshold;
        case 'eq':
          return currentValue === config.threshold;
        case 'gte':
          return currentValue >= config.threshold;
        case 'lte':
          return currentValue <= config.threshold;
        default:
          return false;
      }
    } catch (error) {
      safeLogger.error(`Error evaluating alert condition for ${config.alertType}:`, error);
      return false;
    }
  }

  // ========================================================================
  // METRIC CALCULATION METHODS
  // ========================================================================

  /**
   * Get return volume in time window
   */
  private async getReturnVolume(start: Date, end: Date): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(returns)
        .where(
          and(
            gte(returns.createdAt, start),
            lte(returns.createdAt, end)
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting return volume:', error);
      return 0;
    }
  }

  /**
   * Get average processing time in hours
   */
  private async getAverageProcessingTime(start: Date, end: Date): Promise<number> {
    try {
      const result = await db
        .select({ avgTime: avg(returnAnalyticsDaily.avgTotalResolutionTime) })
        .from(returnAnalyticsDaily)
        .where(
          and(
            gte(returnAnalyticsDaily.date, start.toISOString().split('T')[0]),
            lte(returnAnalyticsDaily.date, end.toISOString().split('T')[0]),
            sql`${returnAnalyticsDaily.avgTotalResolutionTime} IS NOT NULL`
          )
        );
      
      return result[0]?.avgTime ? parseFloat(result[0].avgTime) : 0;
    } catch (error) {
      safeLogger.error('Error getting average processing time:', error);
      return 0;
    }
  }

  /**
   * Get refund failure rate (0-1)
   */
  private async getRefundFailureRate(start: Date, end: Date): Promise<number> {
    try {
      const totalResult = await db
        .select({ count: count() })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, start),
            lte(refundFinancialRecords.createdAt, end)
          )
        );
      
      const failedResult = await db
        .select({ count: count() })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, start),
            lte(refundFinancialRecords.createdAt, end),
            eq(refundFinancialRecords.status, 'failed')
          )
        );
      
      const total = totalResult[0]?.count || 0;
      const failed = failedResult[0]?.count || 0;
      
      return total > 0 ? failed / total : 0;
    } catch (error) {
      safeLogger.error('Error getting refund failure rate:', error);
      return 0;
    }
  }

  /**
   * Get count of high-risk returns
   */
  private async getHighRiskReturnCount(start: Date, end: Date): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(returns)
        .where(
          and(
            gte(returns.createdAt, start),
            lte(returns.createdAt, end),
            sql`${returns.riskScore} >= 80`
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting high-risk return count:', error);
      return 0;
    }
  }

  /**
   * Get count of fraud detections
   */
  private async getFraudDetectionCount(start: Date, end: Date): Promise<number> {
    try {
      const result = await db
        .select({ count: count() })
        .from(returns)
        .where(
          and(
            gte(returns.createdAt, start),
            lte(returns.createdAt, end),
            sql`${returns.riskScore} >= 90`
          )
        );
      
      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Error getting fraud detection count:', error);
      return 0;
    }
  }

  /**
   * Get count of SLA breaches
   */
  private async getSLABreachCount(start: Date, end: Date): Promise<number> {
    try {
      const result = await db
        .select({ count: sum(returnAnalyticsDaily.statusCompleted) })
        .from(returnAnalyticsDaily)
        .where(
          and(
            gte(returnAnalyticsDaily.date, start.toISOString().split('T')[0]),
            lte(returnAnalyticsDaily.date, end.toISOString().split('T')[0]),
            sql`${returnAnalyticsDaily.avgTotalResolutionTime} > 72`
          )
        );
      
      return result[0]?.count ? parseInt(result[0].count.toString()) : 0;
    } catch (error) {
      safeLogger.error('Error getting SLA breach count:', error);
      return 0;
    }
  }

  /**
   * Get payment provider success rate
   */
  private async getProviderSuccessRate(start: Date, end: Date): Promise<number> {
    try {
      // This is a simplified implementation - in practice, you'd want to check
      // the refund_provider_performance table for more detailed metrics
      const totalResult = await db
        .select({ count: count() })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, start),
            lte(refundFinancialRecords.createdAt, end)
          )
        );
      
      const successfulResult = await db
        .select({ count: count() })
        .from(refundFinancialRecords)
        .where(
          and(
            gte(refundFinancialRecords.createdAt, start),
            lte(refundFinancialRecords.createdAt, end),
            eq(refundFinancialRecords.status, 'completed')
          )
        );
      
      const total = totalResult[0]?.count || 0;
      const successful = successfulResult[0]?.count || 0;
      
      return total > 0 ? successful / total : 1;
    } catch (error) {
      safeLogger.error('Error getting provider success rate:', error);
      return 1;
    }
  }

  /**
   * Get return rate (returns / orders)
   */
  private async getReturnRate(start: Date, end: Date): Promise<number> {
    try {
      // This would require access to order data which is not shown in the schema
      // For now, we'll return a placeholder
      return 0;
    } catch (error) {
      safeLogger.error('Error getting return rate:', error);
      return 0;
    }
  }

  // ========================================================================
  // ALERT GENERATION AND MANAGEMENT
  // ========================================================================

  /**
   * Generate an alert based on configuration
   */
  private async generateAlert(config: AlertConfig): Promise<ReturnAlert> {
    const alertId = `alert-${uuidv4()}`;
    const now = new Date();
    
    // Calculate current value for context
    const currentValue = await this.getCurrentValueForAlert(config);
    
    const alert: ReturnAlert = {
      id: alertId,
      alertType: config.alertType,
      severity: config.severity,
      title: config.name,
      description: `${config.description}. Current value: ${currentValue}, Threshold: ${config.threshold}`,
      triggerMetric: config.alertType,
      triggerThreshold: config.threshold,
      actualValue: currentValue,
      contextData: {
        configId: config.id,
        timeWindowMinutes: config.timeWindowMinutes,
        evaluatedAt: now.toISOString()
      },
      recommendedActions: this.getRecommendedActions(config.alertType),
      status: 'active',
      createdAt: now,
      updatedAt: now
    };
    
    // Store in active alerts
    this.activeAlerts.set(alertId, alert);
    
    // Store in database
    try {
      await db.insert(returnAdminAlerts).values({
        alertType: alert.alertType,
        severity: alert.severity,
        title: alert.title,
        description: alert.description,
        affectedEntityType: alert.affectedEntityType,
        affectedEntityId: alert.affectedEntityId,
        triggerMetric: alert.triggerMetric,
        triggerThreshold: alert.triggerThreshold,
        actualValue: alert.actualValue,
        contextData: alert.contextData,
        recommendedActions: alert.recommendedActions,
        status: alert.status,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      });
    } catch (error) {
      safeLogger.error('Error storing alert in database:', error);
    }
    
    // Send notifications
    await this.sendNotifications(alert, config);
    
    safeLogger.info(`Generated alert ${alertId}: ${alert.title}`, {
      alertType: alert.alertType,
      severity: alert.severity
    });
    
    return alert;
  }

  /**
   * Get current value for alert context
   */
  private async getCurrentValueForAlert(config: AlertConfig): Promise<number> {
    const now = new Date();
    const windowStart = new Date(now.getTime() - config.timeWindowMinutes * 60 * 1000);
    
    try {
      switch (config.alertType) {
        case 'volume_spike':
          return await this.getReturnVolume(windowStart, now);
        case 'processing_delay':
          return await this.getAverageProcessingTime(windowStart, now);
        case 'refund_failure_spike':
          return await this.getRefundFailureRate(windowStart, now);
        case 'high_risk_pattern':
          return await this.getHighRiskReturnCount(windowStart, now);
        case 'fraud_detected':
          return await this.getFraudDetectionCount(windowStart, now);
        case 'sla_breach':
          return await this.getSLABreachCount(windowStart, now);
        case 'provider_degradation':
          return await this.getProviderSuccessRate(windowStart, now);
        default:
          return 0;
      }
    } catch (error) {
      safeLogger.error(`Error getting current value for alert ${config.alertType}:`, error);
      return 0;
    }
  }

  /**
   * Get recommended actions based on alert type
   */
  private getRecommendedActions(alertType: ReturnAlertType): string[] {
    switch (alertType) {
      case 'volume_spike':
        return [
          'Review recent return requests for patterns',
          'Assign additional staff to process returns',
          'Check for system issues causing return spikes'
        ];
      case 'processing_delay':
        return [
          'Investigate processing bottlenecks',
          'Assign priority to delayed returns',
          'Notify affected customers'
        ];
      case 'refund_failure_spike':
        return [
          'Check payment provider status',
          'Review refund processing workflows',
          'Contact payment provider support if needed'
        ];
      case 'high_risk_pattern':
        return [
          'Review high-risk returns manually',
          'Update fraud detection models',
          'Consider temporary policy changes'
        ];
      case 'fraud_detected':
        return [
          'Immediately review flagged returns',
          'Block suspicious accounts',
          'Notify security team',
          'Update fraud prevention measures'
        ];
      case 'sla_breach':
        return [
          'Prioritize breached SLA returns',
          'Investigate root causes of delays',
          'Implement corrective measures'
        ];
      case 'provider_degradation':
        return [
          'Check payment provider status pages',
          'Contact provider support',
          'Consider fallback payment methods',
          'Notify finance team'
        ];
      default:
        return ['Review the alert details and take appropriate action'];
    }
  }

  // ========================================================================
  // NOTIFICATION SYSTEM
  // ========================================================================

  /**
   * Send notifications for an alert
   */
  private async sendNotifications(alert: ReturnAlert, config: AlertConfig): Promise<void> {
    const notifications: AlertNotification[] = [];
    
    for (const channel of config.channels) {
      for (const recipient of config.recipients) {
        try {
          const notification: AlertNotification = {
            alertId: alert.id,
            channel,
            recipient,
            sentAt: new Date(),
            status: 'pending'
          };
          
          await this.sendNotification(alert, channel, recipient);
          notification.status = 'sent';
          notifications.push(notification);
        } catch (error) {
          safeLogger.error(`Failed to send ${channel} notification to ${recipient}:`, error);
          notifications.push({
            alertId: alert.id,
            channel,
            recipient,
            sentAt: new Date(),
            status: 'failed',
            errorMessage: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }
    }
    
    this.notificationHistory.set(alert.id, notifications);
    
    // Update alert with notification info
    alert.notifiedAdmins = config.recipients;
    alert.notificationSentAt = new Date();
    alert.updatedAt = new Date();
    
    this.activeAlerts.set(alert.id, alert);
    
    // Update database
    try {
      await db
        .update(returnAdminAlerts)
        .set({
          notifiedAdmins: alert.notifiedAdmins,
          notificationSentAt: alert.notificationSentAt,
          updatedAt: alert.updatedAt
        })
        .where(eq(returnAdminAlerts.id, alert.id));
    } catch (error) {
      safeLogger.error('Error updating alert notification status:', error);
    }
  }

  /**
   * Send notification through specific channel
   */
  private async sendNotification(alert: ReturnAlert, channel: AlertChannelType, recipient: string): Promise<void> {
    switch (channel) {
      case 'email':
        await this.sendEmailNotification(alert, recipient);
        break;
      case 'sms':
        await this.sendSmsNotification(alert, recipient);
        break;
      case 'in_app':
        await this.sendInAppNotification(alert, recipient);
        break;
      case 'webhook':
        await this.sendWebhookNotification(alert, recipient);
        break;
      default:
        safeLogger.warn(`Unsupported notification channel: ${channel}`);
    }
  }

  /**
   * Send email notification
   */
  private async sendEmailNotification(alert: ReturnAlert, recipient: string): Promise<void> {
    // In a real implementation, this would integrate with an email service
    safeLogger.info(`Email notification sent for alert ${alert.id}`, {
      recipient,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      body: alert.description
    });
    
    // Placeholder for actual email service integration
    // Example with nodemailer or similar:
    /*
    const transporter = nodemailer.createTransport({
      // Email service configuration
    });
    
    await transporter.sendMail({
      from: process.env.ALERT_EMAIL_FROM,
      to: recipient,
      subject: `[${alert.severity.toUpperCase()}] ${alert.title}`,
      text: alert.description,
      html: this.generateAlertEmailHtml(alert)
    });
    */
  }

  /**
   * Send SMS notification
   */
  private async sendSmsNotification(alert: ReturnAlert, recipient: string): Promise<void> {
    // In a real implementation, this would integrate with an SMS service
    safeLogger.info(`SMS notification sent for alert ${alert.id}`, {
      recipient,
      message: `${alert.title}: ${alert.description.substring(0, 160)}`
    });
    
    // Placeholder for actual SMS service integration
    // Example with Twilio or similar:
    /*
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    
    await client.messages.create({
      body: `${alert.title}: ${alert.description.substring(0, 160)}`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient
    });
    */
  }

  /**
   * Send in-app notification
   */
  private async sendInAppNotification(alert: ReturnAlert, recipient: string): Promise<void> {
    // In a real implementation, this would integrate with the in-app notification system
    safeLogger.info(`In-app notification sent for alert ${alert.id}`, {
      recipient,
      title: alert.title,
      message: alert.description
    });
    
    // Placeholder for actual in-app notification integration
    // This would typically involve storing the notification in a database
    // and having the frontend poll for new notifications
  }

  /**
   * Send webhook notification
   */
  private async sendWebhookNotification(alert: ReturnAlert, recipient: string): Promise<void> {
    try {
      const response = await fetch(recipient, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'LinkDAO-Return-Alert-System/1.0'
        },
        body: JSON.stringify({
          alert: {
            id: alert.id,
            type: alert.alertType,
            severity: alert.severity,
            title: alert.title,
            description: alert.description,
            timestamp: alert.createdAt.toISOString(),
            context: alert.contextData
          },
          service: 'LinkDAO Return Monitoring',
          environment: process.env.NODE_ENV || 'development'
        })
      });
      
      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }
      
      safeLogger.info(`Webhook notification sent for alert ${alert.id}`, {
        recipient,
        status: response.status
      });
    } catch (error) {
      safeLogger.error(`Failed to send webhook notification for alert ${alert.id}:`, error);
      throw error;
    }
  }

  // ========================================================================
  // ALERT MANAGEMENT
  // ========================================================================

  /**
   * Get all active alerts
   */
  getActiveAlerts(): ReturnAlert[] {
    return Array.from(this.activeAlerts.values()).filter(alert => alert.status === 'active');
  }

  /**
   * Get alert by ID
   */
  getAlert(alertId: string): ReturnAlert | undefined {
    return this.activeAlerts.get(alertId);
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string, acknowledgedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    alert.status = 'acknowledged';
    alert.acknowledgedAt = new Date();
    alert.acknowledgedBy = acknowledgedBy;
    alert.updatedAt = new Date();
    
    this.activeAlerts.set(alertId, alert);
    
    // Update database
    try {
      await db
        .update(returnAdminAlerts)
        .set({
          status: 'acknowledged',
          acknowledgedAt: alert.acknowledgedAt,
          acknowledgedBy: alert.acknowledgedBy,
          updatedAt: alert.updatedAt
        })
        .where(eq(returnAdminAlerts.id, alertId));
      
      return true;
    } catch (error) {
      safeLogger.error('Error acknowledging alert in database:', error);
      return false;
    }
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string, resolvedBy: string, resolutionNotes?: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    alert.status = 'resolved';
    alert.resolvedAt = new Date();
    alert.resolvedBy = resolvedBy;
    alert.resolutionNotes = resolutionNotes;
    alert.updatedAt = new Date();
    
    this.activeAlerts.set(alertId, alert);
    
    // Update database
    try {
      await db
        .update(returnAdminAlerts)
        .set({
          status: 'resolved',
          resolvedAt: alert.resolvedAt,
          resolvedBy: alert.resolvedBy,
          resolutionNotes: alert.resolutionNotes,
          updatedAt: alert.updatedAt
        })
        .where(eq(returnAdminAlerts.id, alertId));
      
      return true;
    } catch (error) {
      safeLogger.error('Error resolving alert in database:', error);
      return false;
    }
  }

  /**
   * Dismiss an alert
   */
  async dismissAlert(alertId: string, dismissedBy: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    alert.status = 'dismissed';
    alert.resolvedAt = new Date();
    alert.resolvedBy = dismissedBy;
    alert.updatedAt = new Date();
    
    this.activeAlerts.set(alertId, alert);
    
    // Update database
    try {
      await db
        .update(returnAdminAlerts)
        .set({
          status: 'dismissed',
          resolvedAt: alert.resolvedAt,
          resolvedBy: alert.resolvedBy,
          updatedAt: alert.updatedAt
        })
        .where(eq(returnAdminAlerts.id, alertId));
      
      return true;
    } catch (error) {
      safeLogger.error('Error dismissing alert in database:', error);
      return false;
    }
  }

  /**
   * Get alert history
   */
  async getAlertHistory(limit: number = 100): Promise<ReturnAlert[]> {
    try {
      const alerts = await db
        .select()
        .from(returnAdminAlerts)
        .orderBy(desc(returnAdminAlerts.createdAt))
        .limit(limit);
      
      return alerts.map(alert => ({
        id: alert.id,
        alertType: alert.alertType as ReturnAlertType,
        severity: alert.severity as AlertSeverity,
        title: alert.title,
        description: alert.description,
        affectedEntityType: alert.affectedEntityType || undefined,
        affectedEntityId: alert.affectedEntityId || undefined,
        triggerMetric: alert.triggerMetric || undefined,
        triggerThreshold: alert.triggerThreshold ? Number(alert.triggerThreshold) : undefined,
        actualValue: alert.actualValue ? Number(alert.actualValue) : undefined,
        contextData: alert.contextData,
        recommendedActions: alert.recommendedActions as string[] | undefined,
        status: alert.status as 'active' | 'acknowledged' | 'resolved' | 'dismissed',
        acknowledgedAt: alert.acknowledgedAt || undefined,
        acknowledgedBy: alert.acknowledgedBy || undefined,
        resolvedAt: alert.resolvedAt || undefined,
        resolvedBy: alert.resolvedBy || undefined,
        resolutionNotes: alert.resolutionNotes || undefined,
        notifiedAdmins: alert.notifiedAdmins as string[] | undefined,
        notificationSentAt: alert.notificationSentAt || undefined,
        createdAt: alert.createdAt,
        updatedAt: alert.updatedAt
      }));
    } catch (error) {
      safeLogger.error('Error getting alert history:', error);
      return [];
    }
  }

  /**
   * Get alert statistics
   */
  async getAlertStats(): Promise<{
    total: number;
    bySeverity: Record<AlertSeverity, number>;
    byType: Record<ReturnAlertType, number>;
    unresolved: number;
  }> {
    try {
      const alerts = await this.getAlertHistory(1000);
      
      const stats = {
        total: alerts.length,
        bySeverity: {
          low: 0,
          medium: 0,
          high: 0,
          critical: 0
        } as Record<AlertSeverity, number>,
        byType: {} as Record<ReturnAlertType, number>,
        unresolved: 0
      };
      
      for (const alert of alerts) {
        stats.bySeverity[alert.severity]++;
        stats.byType[alert.alertType] = (stats.byType[alert.alertType] || 0) + 1;
        if (alert.status === 'active') {
          stats.unresolved++;
        }
      }
      
      return stats;
    } catch (error) {
      safeLogger.error('Error getting alert stats:', error);
      return {
        total: 0,
        bySeverity: { low: 0, medium: 0, high: 0, critical: 0 },
        byType: {} as Record<ReturnAlertType, number>,
        unresolved: 0
      };
    }
  }

  // ========================================================================
  // ESCALATION MECHANISMS
  // ========================================================================

  /**
   * Check and process alert escalations
   */
  private async checkAlertEscalations(): Promise<void> {
    const now = new Date();
    
    for (const alert of this.activeAlerts.values()) {
      // Skip if alert is not active
      if (alert.status !== 'active') continue;
      
      // Find the config for this alert
      const config = Array.from(this.configs.values()).find(c => c.alertType === alert.alertType);
      if (!config || !config.escalationPolicy) continue;
      
      // Check if alert should be escalated based on time
      const timeSinceCreation = (now.getTime() - alert.createdAt.getTime()) / (1000 * 60); // in minutes
      
      if (timeSinceCreation >= config.escalationPolicy.escalateAfterMinutes) {
        await this.escalateAlert(alert, config);
      }
      
      // Check for repeated escalations
      if (config.escalationPolicy.repeatEscalationAfterMinutes) {
        const lastEscalation = alert.contextData?.lastEscalationTime;
        if (lastEscalation) {
          const timeSinceLastEscalation = (now.getTime() - new Date(lastEscalation).getTime()) / (1000 * 60);
          if (timeSinceLastEscalation >= config.escalationPolicy.repeatEscalationAfterMinutes) {
            await this.escalateAlert(alert, config);
          }
        }
      }
    }
  }

  /**
   * Escalate an alert according to its policy
   */
  private async escalateAlert(alert: ReturnAlert, config: AlertConfig): Promise<void> {
    if (!config.escalationPolicy) return;
    
    try {
      // Create escalation record
      const escalation: AlertEscalation = {
        id: `escalation-${uuidv4()}`,
        alertId: alert.id,
        level: (alert.contextData?.escalationLevel || 0) + 1,
        escalatedAt: new Date(),
        escalatedTo: config.escalationPolicy.escalateTo,
        escalatedChannels: config.escalationPolicy.escalateToChannels,
        reason: `Alert escalated automatically after ${config.escalationPolicy.escalateAfterMinutes} minutes`
      };
      
      // Update alert with escalation info
      alert.contextData = {
        ...alert.contextData,
        escalationLevel: escalation.level,
        lastEscalationTime: escalation.escalatedAt.toISOString()
      };
      
      // Store escalation in alert context
      if (!alert.contextData.escalations) {
        alert.contextData.escalations = [];
      }
      alert.contextData.escalations.push(escalation);
      
      // Send escalation notifications
      await this.sendEscalationNotifications(alert, escalation);
      
      // Update alert in memory
      this.activeAlerts.set(alert.id, alert);
      
      safeLogger.info(`Alert ${alert.id} escalated to level ${escalation.level}`, {
        alertId: alert.id,
        escalationLevel: escalation.level
      });
    } catch (error) {
      safeLogger.error(`Error escalating alert ${alert.id}:`, error);
    }
  }

  /**
   * Send escalation notifications
   */
  private async sendEscalationNotifications(alert: ReturnAlert, escalation: AlertEscalation): Promise<void> {
    if (!escalation.escalatedTo || !escalation.escalatedChannels) return;
    
    for (const channel of escalation.escalatedChannels) {
      for (const recipient of escalation.escalatedTo) {
        try {
          await this.sendNotification({
            ...alert,
            title: `[ESCALATED] ${alert.title}`,
            description: `This alert has been escalated to level ${escalation.level}. Original alert: ${alert.description}`
          }, channel, recipient);
        } catch (error) {
          safeLogger.error(`Failed to send escalation ${channel} notification to ${recipient}:`, error);
        }
      }
    }
  }

  /**
   * Manually escalate an alert
   */
  async manuallyEscalateAlert(alertId: string, escalatedBy: string, reason: string): Promise<boolean> {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return false;
    
    try {
      // Create escalation record
      const escalation: AlertEscalation = {
        id: `escalation-${uuidv4()}`,
        alertId: alert.id,
        level: (alert.contextData?.escalationLevel || 0) + 1,
        escalatedAt: new Date(),
        escalatedTo: [], // Will be populated by the escalation policy or manually
        escalatedChannels: ['email', 'in_app'], // Default channels for manual escalation
        reason: `Manually escalated by ${escalatedBy}: ${reason}`
      };
      
      // Update alert with escalation info
      alert.contextData = {
        ...alert.contextData,
        escalationLevel: escalation.level,
        lastEscalationTime: escalation.escalatedAt.toISOString()
      };
      
      // Store escalation in alert context
      if (!alert.contextData.escalations) {
        alert.contextData.escalations = [];
      }
      alert.contextData.escalations.push(escalation);
      
      // Update alert status if needed
      alert.updatedAt = new Date();
      
      // Update in memory
      this.activeAlerts.set(alertId, alert);
      
      // Update in database
      try {
        await db
          .update(returnAdminAlerts)
          .set({
            contextData: alert.contextData,
            updatedAt: alert.updatedAt
          })
          .where(eq(returnAdminAlerts.id, alertId));
      } catch (error) {
        safeLogger.error('Error updating escalated alert in database:', error);
      }
      
      safeLogger.info(`Alert ${alertId} manually escalated by ${escalatedBy}`, {
        alertId,
        escalatedBy,
        reason
      });
      
      return true;
    } catch (error) {
      safeLogger.error(`Error manually escalating alert ${alertId}:`, error);
      return false;
    }
  }

  /**
   * Get escalation history for an alert
   */
  getAlertEscalationHistory(alertId: string): AlertEscalation[] {
    const alert = this.activeAlerts.get(alertId);
    if (!alert || !alert.contextData?.escalations) {
      return [];
    }
    
    return alert.contextData.escalations as AlertEscalation[];
  }

  // ========================================================================
  // CLEANUP AND SHUTDOWN
  // ========================================================================

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }
    
    this.configs.clear();
    this.activeAlerts.clear();
    this.lastCheckTimes.clear();
    this.notificationHistory.clear();
  }
}

// Export singleton instance
export const returnAlertManagerService = new ReturnAlertManagerService();