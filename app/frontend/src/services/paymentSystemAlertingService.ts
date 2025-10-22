/**
 * Payment System Alerting Service
 * Handles alerting for service unavailability and system issues
 */

import { paymentSystemHealthMonitor } from './paymentSystemHealthMonitor';
import { costChangeNotificationService } from './costChangeNotificationService';

interface AlertRule {
  id: string;
  name: string;
  condition: AlertCondition;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  cooldownMinutes: number; // Minimum time between alerts
  actions: AlertAction[];
  lastTriggered?: Date;
}

interface AlertCondition {
  type: 'metric_threshold' | 'service_unavailable' | 'error_rate' | 'response_time' | 'accuracy_degraded';
  metricName?: string;
  serviceName?: string;
  operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  threshold: number;
  duration?: number; // Minutes the condition must persist
}

interface AlertAction {
  type: 'notification' | 'email' | 'webhook' | 'fallback_service' | 'circuit_breaker';
  config: any;
}

interface Alert {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  isResolved: boolean;
  resolvedAt?: Date;
  metadata: any;
}

interface EscalationRule {
  id: string;
  severity: 'medium' | 'high' | 'critical';
  escalateAfterMinutes: number;
  escalateTo: 'high' | 'critical';
  actions: AlertAction[];
}

export class PaymentSystemAlertingService {
  private alertRules: Map<string, AlertRule> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();
  private escalationRules: Map<string, EscalationRule> = new Map();
  private conditionHistory: Map<string, { timestamp: Date; value: number }[]> = new Map();
  private listeners: Map<string, Set<Function>> = new Map();
  private isActive = false;
  private checkInterval?: NodeJS.Timeout;

  constructor() {
    this.initializeDefaultRules();
    this.initializeEscalationRules();
  }

  /**
   * Start the alerting service
   */
  start(): void {
    if (this.isActive) return;

    console.log('Starting payment system alerting service');
    this.isActive = true;

    // Listen to health monitor events
    paymentSystemHealthMonitor.on('metric_updated', (metric: any) => {
      this.checkMetricAlerts(metric);
    });

    paymentSystemHealthMonitor.on('service_status_updated', (status: any) => {
      this.checkServiceAlerts(status);
    });

    paymentSystemHealthMonitor.on('alert_created', (alert: any) => {
      this.handleSystemAlert(alert);
    });

    // Start periodic alert checking
    this.checkInterval = setInterval(() => {
      this.checkAllAlerts();
      this.checkEscalations();
    }, 60000); // Check every minute

    this.emit('alerting_started', { timestamp: new Date() });
  }

  /**
   * Stop the alerting service
   */
  stop(): void {
    if (!this.isActive) return;

    console.log('Stopping payment system alerting service');
    this.isActive = false;

    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
    }

    this.emit('alerting_stopped', { timestamp: new Date() });
  }

  /**
   * Add custom alert rule
   */
  addAlertRule(rule: Omit<AlertRule, 'id'>): string {
    const id = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const alertRule: AlertRule = {
      id,
      ...rule
    };

    this.alertRules.set(id, alertRule);
    console.log('Added alert rule:', alertRule);
    
    this.emit('rule_added', alertRule);
    return id;
  }

  /**
   * Remove alert rule
   */
  removeAlertRule(ruleId: string): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      this.alertRules.delete(ruleId);
      console.log('Removed alert rule:', rule);
      this.emit('rule_removed', rule);
    }
  }

  /**
   * Enable/disable alert rule
   */
  toggleAlertRule(ruleId: string, enabled: boolean): void {
    const rule = this.alertRules.get(ruleId);
    if (rule) {
      rule.enabled = enabled;
      console.log(`${enabled ? 'Enabled' : 'Disabled'} alert rule:`, rule.name);
      this.emit('rule_toggled', { rule, enabled });
    }
  }

  /**
   * Check metric-based alerts
   */
  private checkMetricAlerts(metric: any): void {
    const relevantRules = Array.from(this.alertRules.values()).filter(
      rule => rule.enabled && 
              rule.condition.type === 'metric_threshold' && 
              rule.condition.metricName === metric.name
    );

    for (const rule of relevantRules) {
      this.evaluateRule(rule, metric.value);
    }
  }

  /**
   * Check service-based alerts
   */
  private checkServiceAlerts(status: any): void {
    const relevantRules = Array.from(this.alertRules.values()).filter(
      rule => rule.enabled && 
              rule.condition.serviceName === status.serviceName
    );

    for (const rule of relevantRules) {
      let value: number;
      
      switch (rule.condition.type) {
        case 'service_unavailable':
          value = status.isAvailable ? 1 : 0;
          break;
        case 'error_rate':
          value = status.errorRate;
          break;
        case 'response_time':
          value = status.responseTime;
          break;
        default:
          continue;
      }

      this.evaluateRule(rule, value);
    }
  }

  /**
   * Evaluate alert rule
   */
  private evaluateRule(rule: AlertRule, currentValue: number): void {
    const { condition } = rule;
    let shouldAlert = false;

    // Check threshold condition
    switch (condition.operator) {
      case 'gt':
        shouldAlert = currentValue > condition.threshold;
        break;
      case 'gte':
        shouldAlert = currentValue >= condition.threshold;
        break;
      case 'lt':
        shouldAlert = currentValue < condition.threshold;
        break;
      case 'lte':
        shouldAlert = currentValue <= condition.threshold;
        break;
      case 'eq':
        shouldAlert = currentValue === condition.threshold;
        break;
    }

    if (!shouldAlert) {
      // Condition not met, resolve any active alerts for this rule
      this.resolveAlertsForRule(rule.id);
      return;
    }

    // Check duration requirement
    if (condition.duration && condition.duration > 0) {
      const historyKey = `${rule.id}_${condition.metricName || condition.serviceName}`;
      let history = this.conditionHistory.get(historyKey) || [];
      
      // Add current value to history
      history.push({ timestamp: new Date(), value: currentValue });
      
      // Keep only relevant history
      const cutoff = Date.now() - (condition.duration * 60 * 1000);
      history = history.filter(h => h.timestamp.getTime() > cutoff);
      this.conditionHistory.set(historyKey, history);

      // Check if condition has persisted for required duration
      const durationMet = history.length > 0 && 
                         history.every(h => this.evaluateThreshold(h.value, condition));

      if (!durationMet) return;
    }

    // Check cooldown period
    if (rule.lastTriggered) {
      const timeSinceLastAlert = Date.now() - rule.lastTriggered.getTime();
      const cooldownMs = rule.cooldownMinutes * 60 * 1000;
      
      if (timeSinceLastAlert < cooldownMs) return;
    }

    // Trigger alert
    this.triggerAlert(rule, currentValue);
  }

  /**
   * Trigger alert
   */
  private triggerAlert(rule: AlertRule, currentValue: number): void {
    const alertId = `alert_${rule.id}_${Date.now()}`;
    
    const alert: Alert = {
      id: alertId,
      ruleId: rule.id,
      title: this.generateAlertTitle(rule, currentValue),
      message: this.generateAlertMessage(rule, currentValue),
      severity: rule.severity,
      timestamp: new Date(),
      isResolved: false,
      metadata: {
        ruleName: rule.name,
        condition: rule.condition,
        currentValue,
        threshold: rule.condition.threshold
      }
    };

    this.activeAlerts.set(alertId, alert);
    rule.lastTriggered = new Date();

    console.warn('Alert triggered:', alert);

    // Execute alert actions
    this.executeAlertActions(rule.actions, alert);

    this.emit('alert_triggered', alert);
  }

  /**
   * Execute alert actions
   */
  private executeAlertActions(actions: AlertAction[], alert: Alert): void {
    for (const action of actions) {
      try {
        switch (action.type) {
          case 'notification':
            this.sendNotification(alert, action.config);
            break;
          case 'email':
            this.sendEmail(alert, action.config);
            break;
          case 'webhook':
            this.sendWebhook(alert, action.config);
            break;
          case 'fallback_service':
            this.activateFallbackService(alert, action.config);
            break;
          case 'circuit_breaker':
            this.activateCircuitBreaker(alert, action.config);
            break;
        }
      } catch (error) {
        console.error('Failed to execute alert action:', action.type, error);
      }
    }
  }

  /**
   * Send notification
   */
  private sendNotification(alert: Alert, config: any): void {
    // Use console.log as a fallback since emit is private
    console.log('System Alert:', {
      id: alert.id,
      type: 'system_alert',
      severity: alert.severity,
      title: alert.title,
      message: alert.message,
      timestamp: alert.timestamp,
      actionButtons: [
        {
          label: 'Acknowledge',
          action: 'custom',
          data: { alertId: alert.id }
        },
        {
          label: 'View Details',
          action: 'custom',
          data: { alertId: alert.id, action: 'details' }
        }
      ]
    });
  }

  /**
   * Send email alert (placeholder)
   */
  private sendEmail(alert: Alert, config: any): void {
    console.log('Email alert would be sent:', {
      to: config.recipients,
      subject: alert.title,
      body: alert.message,
      alert
    });
    // In production, integrate with email service
  }

  /**
   * Send webhook alert
   */
  private async sendWebhook(alert: Alert, config: any): Promise<void> {
    try {
      const response = await fetch(config.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...config.headers
        },
        body: JSON.stringify({
          alert,
          timestamp: new Date().toISOString(),
          source: 'payment-system-alerting'
        })
      });

      if (!response.ok) {
        throw new Error(`Webhook failed: ${response.status} ${response.statusText}`);
      }

      console.log('Webhook alert sent successfully');
    } catch (error) {
      console.error('Failed to send webhook alert:', error);
    }
  }

  /**
   * Activate fallback service
   */
  private activateFallbackService(alert: Alert, config: any): void {
    console.log('Activating fallback service:', config.serviceName);
    
    // Emit event for fallback activation
    this.emit('fallback_activated', {
      alertId: alert.id,
      serviceName: config.serviceName,
      fallbackConfig: config
    });
  }

  /**
   * Activate circuit breaker
   */
  private activateCircuitBreaker(alert: Alert, config: any): void {
    console.log('Activating circuit breaker for:', config.serviceName);
    
    // Emit event for circuit breaker activation
    this.emit('circuit_breaker_activated', {
      alertId: alert.id,
      serviceName: config.serviceName,
      duration: config.durationMinutes || 10
    });
  }

  /**
   * Handle system alerts from health monitor
   */
  private handleSystemAlert(systemAlert: any): void {
    // Convert system alert to our alert format
    const alert: Alert = {
      id: `system_${systemAlert.id}`,
      ruleId: 'system_generated',
      title: systemAlert.title,
      message: systemAlert.message,
      severity: systemAlert.severity,
      timestamp: systemAlert.timestamp,
      isResolved: systemAlert.isResolved,
      resolvedAt: systemAlert.resolvedAt,
      metadata: {
        type: systemAlert.type,
        affectedServices: systemAlert.affectedServices,
        source: 'health_monitor'
      }
    };

    this.activeAlerts.set(alert.id, alert);

    // Send notification for critical system alerts
    if (alert.severity === 'critical' || alert.severity === 'high') {
      this.sendNotification(alert, {});
    }

    this.emit('system_alert_handled', alert);
  }

  /**
   * Check all alerts periodically
   */
  private checkAllAlerts(): void {
    // Get current health summary
    const healthSummary = paymentSystemHealthMonitor.getHealthSummary();

    // Check each metric against rules
    for (const metric of healthSummary.metrics) {
      this.checkMetricAlerts(metric);
    }

    // Check each service against rules
    for (const service of healthSummary.services) {
      this.checkServiceAlerts(service);
    }
  }

  /**
   * Check for alert escalations
   */
  private checkEscalations(): void {
    const now = Date.now();

    for (const alert of this.activeAlerts.values()) {
      if (alert.isResolved) continue;

      const escalationRule = this.escalationRules.get(alert.severity);
      if (!escalationRule) continue;

      const alertAge = now - alert.timestamp.getTime();
      const escalationThreshold = escalationRule.escalateAfterMinutes * 60 * 1000;

      if (alertAge >= escalationThreshold) {
        this.escalateAlert(alert, escalationRule);
      }
    }
  }

  /**
   * Escalate alert
   */
  private escalateAlert(alert: Alert, escalationRule: EscalationRule): void {
    console.warn('Escalating alert:', alert.id, 'from', alert.severity, 'to', escalationRule.escalateTo);

    // Update alert severity
    alert.severity = escalationRule.escalateTo;

    // Execute escalation actions
    this.executeAlertActions(escalationRule.actions, alert);

    this.emit('alert_escalated', {
      alert,
      previousSeverity: escalationRule.severity,
      newSeverity: escalationRule.escalateTo
    });
  }

  /**
   * Resolve alerts for a specific rule
   */
  private resolveAlertsForRule(ruleId: string): void {
    for (const alert of this.activeAlerts.values()) {
      if (alert.ruleId === ruleId && !alert.isResolved) {
        alert.isResolved = true;
        alert.resolvedAt = new Date();
        this.emit('alert_resolved', alert);
      }
    }
  }

  /**
   * Manually resolve alert
   */
  resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (alert && !alert.isResolved) {
      alert.isResolved = true;
      alert.resolvedAt = new Date();
      console.log('Alert resolved manually:', alertId);
      this.emit('alert_resolved', alert);
    }
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values())
      .filter(alert => !alert.isResolved)
      .sort((a, b) => {
        // Sort by severity, then by timestamp
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const severityDiff = severityOrder[b.severity] - severityOrder[a.severity];
        if (severityDiff !== 0) return severityDiff;
        return b.timestamp.getTime() - a.timestamp.getTime();
      });
  }

  /**
   * Get alert history
   */
  getAlertHistory(hours: number = 24): Alert[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return Array.from(this.activeAlerts.values())
      .filter(alert => alert.timestamp.getTime() > cutoff)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Helper methods
  private initializeDefaultRules(): void {
    // Gas fee service availability
    this.addAlertRule({
      name: 'Gas Fee Service Unavailable',
      condition: {
        type: 'service_unavailable',
        serviceName: 'gas_fee_estimation',
        operator: 'eq',
        threshold: 0,
        duration: 2 // 2 minutes
      },
      severity: 'critical',
      enabled: true,
      cooldownMinutes: 10,
      actions: [
        { type: 'notification', config: {} },
        { type: 'fallback_service', config: { serviceName: 'gas_fee_estimation' } }
      ]
    });

    // High gas fee service error rate
    this.addAlertRule({
      name: 'High Gas Fee Service Error Rate',
      condition: {
        type: 'error_rate',
        serviceName: 'gas_fee_estimation',
        operator: 'gte',
        threshold: 50,
        duration: 5
      },
      severity: 'high',
      enabled: true,
      cooldownMinutes: 15,
      actions: [
        { type: 'notification', config: {} }
      ]
    });

    // Exchange rate service unavailable
    this.addAlertRule({
      name: 'Exchange Rate Service Unavailable',
      condition: {
        type: 'service_unavailable',
        serviceName: 'exchange_rate_service',
        operator: 'eq',
        threshold: 0,
        duration: 3
      },
      severity: 'high',
      enabled: true,
      cooldownMinutes: 10,
      actions: [
        { type: 'notification', config: {} }
      ]
    });

    // Prioritization performance degraded
    this.addAlertRule({
      name: 'Prioritization Performance Degraded',
      condition: {
        type: 'metric_threshold',
        metricName: 'prioritization_processing_time',
        operator: 'gte',
        threshold: 1000,
        duration: 5
      },
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 20,
      actions: [
        { type: 'notification', config: {} }
      ]
    });

    // Gas estimation accuracy degraded
    this.addAlertRule({
      name: 'Gas Estimation Accuracy Degraded',
      condition: {
        type: 'metric_threshold',
        metricName: 'gas_estimation_accuracy',
        operator: 'lt',
        threshold: 70,
        duration: 10
      },
      severity: 'medium',
      enabled: true,
      cooldownMinutes: 30,
      actions: [
        { type: 'notification', config: {} }
      ]
    });
  }

  private initializeEscalationRules(): void {
    // Escalate medium alerts to high after 30 minutes
    this.escalationRules.set('medium', {
      id: 'escalate_medium_to_high',
      severity: 'medium',
      escalateAfterMinutes: 30,
      escalateTo: 'high',
      actions: [
        { type: 'notification', config: { escalated: true } }
      ]
    });

    // Escalate high alerts to critical after 60 minutes
    this.escalationRules.set('high', {
      id: 'escalate_high_to_critical',
      severity: 'high',
      escalateAfterMinutes: 60,
      escalateTo: 'critical',
      actions: [
        { type: 'notification', config: { escalated: true } },
        { type: 'email', config: { recipients: ['admin@example.com'] } }
      ]
    });
  }

  private evaluateThreshold(value: number, condition: AlertCondition): boolean {
    switch (condition.operator) {
      case 'gt': return value > condition.threshold;
      case 'gte': return value >= condition.threshold;
      case 'lt': return value < condition.threshold;
      case 'lte': return value <= condition.threshold;
      case 'eq': return value === condition.threshold;
      default: return false;
    }
  }

  private generateAlertTitle(rule: AlertRule, currentValue: number): string {
    const { condition } = rule;
    
    if (condition.type === 'service_unavailable') {
      return `${condition.serviceName} Service Unavailable`;
    }
    
    if (condition.type === 'metric_threshold') {
      return `${condition.metricName} Threshold Exceeded`;
    }
    
    return rule.name;
  }

  private generateAlertMessage(rule: AlertRule, currentValue: number): string {
    const { condition } = rule;
    
    if (condition.type === 'service_unavailable') {
      return `The ${condition.serviceName} service is currently unavailable`;
    }
    
    if (condition.type === 'metric_threshold') {
      return `${condition.metricName} is ${currentValue} (threshold: ${condition.threshold})`;
    }
    
    if (condition.type === 'error_rate') {
      return `Error rate for ${condition.serviceName} is ${currentValue}% (threshold: ${condition.threshold}%)`;
    }
    
    if (condition.type === 'response_time') {
      return `Response time for ${condition.serviceName} is ${currentValue}ms (threshold: ${condition.threshold}ms)`;
    }
    
    return `Alert condition met: ${currentValue} ${condition.operator} ${condition.threshold}`;
  }

  // Event system
  on(event: string, callback: Function): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
  }

  off(event: string, callback: Function): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(event: string, data?: any): void {
    const eventListeners = this.listeners.get(event);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in alerting service event callback:', error);
        }
      });
    }
  }
}

// Export singleton instance
export const paymentSystemAlertingService = new PaymentSystemAlertingService();

export default PaymentSystemAlertingService;