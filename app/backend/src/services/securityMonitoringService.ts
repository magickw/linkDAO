import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../utils/logger';

/**
 * Security Monitoring and Alerting Service for LDAO Token Acquisition System
 * Provides real-time security monitoring, threat detection, and alerting
 */

export interface SecurityAlert {
  id: string;
  timestamp: Date;
  alert_type: 'AUTHENTICATION_ANOMALY' | 'TRANSACTION_ANOMALY' | 'SYSTEM_INTRUSION' | 'DATA_BREACH' | 'COMPLIANCE_VIOLATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  title: string;
  description: string;
  source: string;
  affected_resources: string[];
  indicators: SecurityIndicator[];
  status: 'OPEN' | 'INVESTIGATING' | 'RESOLVED' | 'FALSE_POSITIVE';
  assigned_to?: string;
  resolution_notes?: string;
  resolved_at?: Date;
}

export interface SecurityIndicator {
  indicator_type: string;
  value: string;
  confidence: number;
  first_seen: Date;
  last_seen: Date;
  occurrences: number;
}

export interface SecurityMetric {
  metric_name: string;
  value: number;
  threshold: number;
  timestamp: Date;
  status: 'NORMAL' | 'WARNING' | 'CRITICAL';
}

export interface ThreatIntelligence {
  indicator: string;
  indicator_type: 'IP' | 'DOMAIN' | 'HASH' | 'EMAIL' | 'USER_AGENT';
  threat_type: string;
  confidence: number;
  source: string;
  first_seen: Date;
  last_updated: Date;
  description: string;
}

export interface SecurityDashboard {
  timestamp: Date;
  alerts: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    open: number;
  };
  metrics: SecurityMetric[];
  threat_indicators: number;
  incidents: number;
  compliance_status: 'COMPLIANT' | 'NON_COMPLIANT' | 'UNDER_REVIEW';
}

export enum SecuritySeverity {
  INFO = 'INFO',
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export type SecurityEventType = 
  | 'AUTHENTICATION_FAILURE'
  | 'AUTHORIZATION_VIOLATION'
  | 'DATA_BREACH_ATTEMPT'
  | 'PRIVILEGE_ESCALATION'
  | 'MALWARE_DETECTED'
  | 'UNUSUAL_ACTIVITY'
  | 'SYSTEM_INTRUSION'
  | 'CONFIGURATION_CHANGE';

export interface SecurityEvent {
  id: string;
  timestamp: Date;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  description: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
}

export class SecurityMonitoringService extends EventEmitter {
  private alerts: Map<string, SecurityAlert> = new Map();
  private metrics: Map<string, SecurityMetric[]> = new Map();
  private threatIntelligence: Map<string, ThreatIntelligence> = new Map();
  private monitoringRules: Map<string, any> = new Map();

  constructor() {
    super();
    this.initializeMonitoringRules();
    this.startMetricsCollection();
  }

  /**
   * Record a security event
   */
  async recordSecurityEvent(eventData: {
    type: SecurityEventType;
    severity: SecuritySeverity;
    source: string;
    details?: Record<string, any>;
    ipAddress?: string;
    userAgent?: string;
    userId?: string;
  }): Promise<SecurityEvent> {
    const event: SecurityEvent = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      type: eventData.type,
      severity: eventData.severity,
      source: eventData.source,
      description: eventData.details?.reason || 'Security event recorded',
      userId: eventData.userId,
      ipAddress: eventData.ipAddress,
      userAgent: eventData.userAgent,
      details: eventData.details
    };

    logger.info('Security event recorded', {
      eventId: event.id,
      type: event.type,
      severity: event.severity,
      source: event.source,
      userId: event.userId
    });

    this.emit('securityEvent', event);

    // Create alert if severity is high enough
    if ([SecuritySeverity.HIGH, SecuritySeverity.CRITICAL].includes(event.severity)) {
      await this.createAlertFromEvent(event);
    }

    return event;
  }

  /**
   * Create alert from security event
   */
  private async createAlertFromEvent(event: SecurityEvent): Promise<void> {
    const alertId = crypto.randomUUID();
    
    // Convert SecuritySeverity enum to string literal
    const severity = event.severity as string as SecurityAlert['severity'];
    
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: event.timestamp,
      alert_type: this.getAlertTypeFromEventType(event.type),
      severity: severity,
      title: `${event.type} detected`,
      description: event.description || 'Security alert generated from event',
      source: event.source,
      affected_resources: event.userId ? [event.userId] : [],
      indicators: event.ipAddress ? [{
        indicator_type: 'IP',
        value: event.ipAddress,
        confidence: 0.8,
        first_seen: event.timestamp,
        last_seen: event.timestamp,
        occurrences: 1
      }] : [],
      status: 'OPEN'
    };

    this.alerts.set(alertId, alert);

    logger.warn('Security alert created from event', {
      alertId,
      eventType: event.type,
      severity: event.severity
    });

    this.emit('securityAlert', alert);
  }

  /**
   * Get alert type from event type
   */
  private getAlertTypeFromEventType(eventType: SecurityEventType): SecurityAlert['alert_type'] {
    switch (eventType) {
      case 'AUTHENTICATION_FAILURE':
        return 'AUTHENTICATION_ANOMALY';
      case 'AUTHORIZATION_VIOLATION':
        return 'SYSTEM_INTRUSION';
      case 'DATA_BREACH_ATTEMPT':
        return 'DATA_BREACH';
      case 'PRIVILEGE_ESCALATION':
        return 'SYSTEM_INTRUSION';
      case 'MALWARE_DETECTED':
        return 'SYSTEM_INTRUSION';
      case 'UNUSUAL_ACTIVITY':
        return 'SYSTEM_INTRUSION';
      case 'SYSTEM_INTRUSION':
        return 'SYSTEM_INTRUSION';
      case 'CONFIGURATION_CHANGE':
        return 'SYSTEM_INTRUSION';
      default:
        return 'SYSTEM_INTRUSION';
    }
  }

  /**
   * Initialize security monitoring rules
   */
  private initializeMonitoringRules(): void {
    // Failed login monitoring
    this.monitoringRules.set('FAILED_LOGIN_THRESHOLD', {
      metric: 'failed_logins_per_minute',
      threshold: 10,
      window_minutes: 5,
      severity: 'HIGH',
      action: 'CREATE_ALERT'
    });

    // Large transaction monitoring
    this.monitoringRules.set('LARGE_TRANSACTION_THRESHOLD', {
      metric: 'transaction_amount',
      threshold: 50000,
      severity: 'MEDIUM',
      action: 'CREATE_ALERT'
    });

    // Unusual IP activity
    this.monitoringRules.set('UNUSUAL_IP_ACTIVITY', {
      metric: 'unique_ips_per_user',
      threshold: 5,
      window_hours: 1,
      severity: 'MEDIUM',
      action: 'CREATE_ALERT'
    });

    // System resource monitoring
    this.monitoringRules.set('HIGH_CPU_USAGE', {
      metric: 'cpu_usage_percent',
      threshold: 90,
      severity: 'HIGH',
      action: 'CREATE_ALERT'
    });

    // Database connection monitoring
    this.monitoringRules.set('HIGH_DB_CONNECTIONS', {
      metric: 'active_db_connections',
      threshold: 100,
      severity: 'MEDIUM',
      action: 'CREATE_ALERT'
    });
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    // Collect metrics every minute
    setInterval(() => {
      this.collectSecurityMetrics();
    }, 60000);

    // Evaluate rules every 30 seconds
    setInterval(() => {
      this.evaluateMonitoringRules();
    }, 30000);
  }

  /**
   * Collect security metrics
   */
  private async collectSecurityMetrics(): Promise<void> {
    try {
      const timestamp = new Date();

      // Collect various security metrics
      const metrics = [
        await this.collectFailedLoginMetrics(),
        await this.collectTransactionMetrics(),
        await this.collectSystemMetrics(),
        await this.collectNetworkMetrics(),
        await this.collectDatabaseMetrics()
      ];

      // Store metrics
      for (const metric of metrics.flat()) {
        if (!this.metrics.has(metric.metric_name)) {
          this.metrics.set(metric.metric_name, []);
        }
        
        const metricHistory = this.metrics.get(metric.metric_name)!;
        metricHistory.push(metric);
        
        // Keep only last 1000 data points
        if (metricHistory.length > 1000) {
          metricHistory.shift();
        }
      }

    } catch (error) {
      logger.error('Error collecting security metrics', { error });
    }
  }

  /**
   * Collect failed login metrics
   */
  private async collectFailedLoginMetrics(): Promise<SecurityMetric[]> {
    // This would integrate with your authentication system
    // For now, simulate metrics
    const failedLogins = Math.floor(Math.random() * 20);
    
    return [{
      metric_name: 'failed_logins_per_minute',
      value: failedLogins,
      threshold: 10,
      timestamp: new Date(),
      status: failedLogins > 10 ? 'CRITICAL' : failedLogins > 5 ? 'WARNING' : 'NORMAL'
    }];
  }

  /**
   * Collect transaction metrics
   */
  private async collectTransactionMetrics(): Promise<SecurityMetric[]> {
    // This would integrate with your transaction system
    const transactionCount = Math.floor(Math.random() * 100);
    const avgTransactionAmount = Math.random() * 10000;
    
    return [
      {
        metric_name: 'transactions_per_minute',
        value: transactionCount,
        threshold: 50,
        timestamp: new Date(),
        status: transactionCount > 50 ? 'WARNING' : 'NORMAL'
      },
      {
        metric_name: 'average_transaction_amount',
        value: avgTransactionAmount,
        threshold: 5000,
        timestamp: new Date(),
        status: avgTransactionAmount > 5000 ? 'WARNING' : 'NORMAL'
      }
    ];
  }

  /**
   * Collect system metrics
   */
  private async collectSystemMetrics(): Promise<SecurityMetric[]> {
    // This would integrate with system monitoring
    const cpuUsage = Math.random() * 100;
    const memoryUsage = Math.random() * 100;
    
    return [
      {
        metric_name: 'cpu_usage_percent',
        value: cpuUsage,
        threshold: 80,
        timestamp: new Date(),
        status: cpuUsage > 90 ? 'CRITICAL' : cpuUsage > 80 ? 'WARNING' : 'NORMAL'
      },
      {
        metric_name: 'memory_usage_percent',
        value: memoryUsage,
        threshold: 85,
        timestamp: new Date(),
        status: memoryUsage > 95 ? 'CRITICAL' : memoryUsage > 85 ? 'WARNING' : 'NORMAL'
      }
    ];
  }

  /**
   * Collect network metrics
   */
  private async collectNetworkMetrics(): Promise<SecurityMetric[]> {
    const uniqueIPs = Math.floor(Math.random() * 1000);
    const suspiciousRequests = Math.floor(Math.random() * 10);
    
    return [
      {
        metric_name: 'unique_ips_per_minute',
        value: uniqueIPs,
        threshold: 500,
        timestamp: new Date(),
        status: uniqueIPs > 800 ? 'WARNING' : 'NORMAL'
      },
      {
        metric_name: 'suspicious_requests_per_minute',
        value: suspiciousRequests,
        threshold: 5,
        timestamp: new Date(),
        status: suspiciousRequests > 10 ? 'CRITICAL' : suspiciousRequests > 5 ? 'WARNING' : 'NORMAL'
      }
    ];
  }

  /**
   * Collect database metrics
   */
  private async collectDatabaseMetrics(): Promise<SecurityMetric[]> {
    const activeConnections = Math.floor(Math.random() * 150);
    const queryTime = Math.random() * 1000;
    
    return [
      {
        metric_name: 'active_db_connections',
        value: activeConnections,
        threshold: 100,
        timestamp: new Date(),
        status: activeConnections > 120 ? 'CRITICAL' : activeConnections > 100 ? 'WARNING' : 'NORMAL'
      },
      {
        metric_name: 'average_query_time_ms',
        value: queryTime,
        threshold: 500,
        timestamp: new Date(),
        status: queryTime > 1000 ? 'WARNING' : 'NORMAL'
      }
    ];
  }

  /**
   * Evaluate monitoring rules
   */
  private async evaluateMonitoringRules(): Promise<void> {
    for (const [ruleId, rule] of this.monitoringRules) {
      try {
        const metricHistory = this.metrics.get(rule.metric);
        if (!metricHistory || metricHistory.length === 0) continue;

        const latestMetric = metricHistory[metricHistory.length - 1];
        
        if (this.shouldTriggerAlert(rule, latestMetric, metricHistory)) {
          await this.createAlert(ruleId, rule, latestMetric);
        }
      } catch (error) {
        logger.error('Error evaluating monitoring rule', { ruleId, error });
      }
    }
  }

  /**
   * Check if alert should be triggered
   */
  private shouldTriggerAlert(rule: any, latestMetric: SecurityMetric, history: SecurityMetric[]): boolean {
    // Basic threshold check
    if (latestMetric.value <= rule.threshold) {
      return false;
    }

    // Check if we already have a recent alert for this rule
    const recentAlerts = Array.from(this.alerts.values())
      .filter(alert => 
        alert.source === rule.metric &&
        alert.status === 'OPEN' &&
        Date.now() - alert.timestamp.getTime() < 5 * 60 * 1000 // 5 minutes
      );

    if (recentAlerts.length > 0) {
      return false; // Don't spam alerts
    }

    // Additional rule-specific logic
    if (rule.window_minutes) {
      const windowStart = new Date(Date.now() - rule.window_minutes * 60 * 1000);
      const windowMetrics = history.filter(m => m.timestamp >= windowStart);
      const avgValue = windowMetrics.reduce((sum, m) => sum + m.value, 0) / windowMetrics.length;
      return avgValue > rule.threshold;
    }

    return true;
  }

  /**
   * Create security alert
   */
  private async createAlert(ruleId: string, rule: any, metric: SecurityMetric): Promise<void> {
    const alertId = crypto.randomUUID();
    
    const alert: SecurityAlert = {
      id: alertId,
      timestamp: new Date(),
      alert_type: this.getAlertType(rule.metric),
      severity: rule.severity,
      title: `${rule.metric} threshold exceeded`,
      description: `${rule.metric} value ${metric.value} exceeds threshold ${rule.threshold}`,
      source: rule.metric,
      affected_resources: [rule.metric],
      indicators: [{
        indicator_type: rule.metric,
        value: metric.value.toString(),
        confidence: 0.9,
        first_seen: metric.timestamp,
        last_seen: metric.timestamp,
        occurrences: 1
      }],
      status: 'OPEN'
    };

    this.alerts.set(alertId, alert);

    logger.warn('Security alert created', {
      alertId,
      alertType: alert.alert_type,
      severity: alert.severity,
      metric: rule.metric,
      value: metric.value,
      threshold: rule.threshold
    });

    this.emit('securityAlert', alert);

    // Trigger automated response if configured
    await this.triggerAutomatedResponse(alert);
  }

  /**
   * Get alert type based on metric
   */
  private getAlertType(metric: string): SecurityAlert['alert_type'] {
    if (metric.includes('login')) return 'AUTHENTICATION_ANOMALY';
    if (metric.includes('transaction')) return 'TRANSACTION_ANOMALY';
    if (metric.includes('ip') || metric.includes('request')) return 'SYSTEM_INTRUSION';
    return 'SYSTEM_INTRUSION';
  }

  /**
   * Trigger automated response
   */
  private async triggerAutomatedResponse(alert: SecurityAlert): Promise<void> {
    try {
      switch (alert.severity) {
        case 'CRITICAL':
          await this.handleCriticalAlert(alert);
          break;
        case 'HIGH':
          await this.handleHighAlert(alert);
          break;
        case 'MEDIUM':
          await this.handleMediumAlert(alert);
          break;
        case 'LOW':
          await this.handleLowAlert(alert);
          break;
      }
    } catch (error) {
      logger.error('Error in automated response', { alertId: alert.id, error });
    }
  }

  /**
   * Handle critical alerts
   */
  private async handleCriticalAlert(alert: SecurityAlert): Promise<void> {
    logger.error('CRITICAL SECURITY ALERT', { alert });
    
    // Immediate actions for critical alerts
    switch (alert.alert_type) {
      case 'SYSTEM_INTRUSION':
        // Block suspicious IPs, enable additional monitoring
        break;
      case 'DATA_BREACH':
        // Isolate affected systems, preserve evidence
        break;
      case 'AUTHENTICATION_ANOMALY':
        // Temporarily lock affected accounts
        break;
    }

    // Notify security team immediately
    await this.notifySecurityTeam(alert, 'IMMEDIATE');
  }

  /**
   * Handle high alerts
   */
  private async handleHighAlert(alert: SecurityAlert): Promise<void> {
    logger.warn('HIGH SECURITY ALERT', { alert });
    
    // Enhanced monitoring and notification
    await this.notifySecurityTeam(alert, 'URGENT');
  }

  /**
   * Handle medium alerts
   */
  private async handleMediumAlert(alert: SecurityAlert): Promise<void> {
    logger.warn('MEDIUM SECURITY ALERT', { alert });
    
    // Standard notification
    await this.notifySecurityTeam(alert, 'NORMAL');
  }

  /**
   * Handle low alerts
   */
  private async handleLowAlert(alert: SecurityAlert): Promise<void> {
    logger.info('LOW SECURITY ALERT', { alert });
    
    // Log for review
  }

  /**
   * Notify security team
   */
  private async notifySecurityTeam(alert: SecurityAlert, priority: 'IMMEDIATE' | 'URGENT' | 'NORMAL'): Promise<void> {
    // This would integrate with your notification system (email, Slack, PagerDuty, etc.)
    logger.info('Notifying security team', {
      alertId: alert.id,
      priority,
      severity: alert.severity,
      alertType: alert.alert_type
    });

    // Simulate notification
    this.emit('securityTeamNotified', { alert, priority });
  }

  /**
   * Add threat intelligence indicator
   */
  async addThreatIndicator(
    indicator: string,
    indicatorType: ThreatIntelligence['indicator_type'],
    threatType: string,
    confidence: number,
    source: string,
    description: string
  ): Promise<void> {
    const threatIntel: ThreatIntelligence = {
      indicator,
      indicator_type: indicatorType,
      threat_type: threatType,
      confidence,
      source,
      first_seen: new Date(),
      last_updated: new Date(),
      description
    };

    this.threatIntelligence.set(indicator, threatIntel);

    logger.info('Threat intelligence indicator added', {
      indicator,
      indicatorType,
      threatType,
      confidence,
      source
    });

    this.emit('threatIndicatorAdded', threatIntel);
  }

  /**
   * Check if indicator is known threat
   */
  isKnownThreat(indicator: string): ThreatIntelligence | null {
    return this.threatIntelligence.get(indicator) || null;
  }

  /**
   * Update alert status
   */
  async updateAlertStatus(
    alertId: string,
    status: SecurityAlert['status'],
    assignedTo?: string,
    resolutionNotes?: string
  ): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (!alert) {
      throw new Error(`Alert not found: ${alertId}`);
    }

    alert.status = status;
    if (assignedTo) alert.assigned_to = assignedTo;
    if (resolutionNotes) alert.resolution_notes = resolutionNotes;
    if (status === 'RESOLVED' || status === 'FALSE_POSITIVE') {
      alert.resolved_at = new Date();
    }

    logger.info('Alert status updated', {
      alertId,
      status,
      assignedTo,
      resolutionNotes
    });

    this.emit('alertStatusUpdated', alert);
  }

  /**
   * Get security dashboard
   */
  getSecurityDashboard(): SecurityDashboard {
    const alerts = Array.from(this.alerts.values());
    const recentMetrics = this.getRecentMetrics();

    return {
      timestamp: new Date(),
      alerts: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'CRITICAL').length,
        high: alerts.filter(a => a.severity === 'HIGH').length,
        medium: alerts.filter(a => a.severity === 'MEDIUM').length,
        low: alerts.filter(a => a.severity === 'LOW').length,
        open: alerts.filter(a => a.status === 'OPEN').length
      },
      metrics: recentMetrics,
      threat_indicators: this.threatIntelligence.size,
      incidents: alerts.filter(a => a.severity === 'CRITICAL' || a.severity === 'HIGH').length,
      compliance_status: this.getComplianceStatus()
    };
  }

  /**
   * Get recent metrics
   */
  private getRecentMetrics(): SecurityMetric[] {
    const recentMetrics: SecurityMetric[] = [];
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    for (const [metricName, metricHistory] of this.metrics) {
      const recentMetric = metricHistory
        .filter(m => m.timestamp >= oneHourAgo)
        .pop(); // Get most recent

      if (recentMetric) {
        recentMetrics.push(recentMetric);
      }
    }

    return recentMetrics;
  }

  /**
   * Get compliance status
   */
  private getComplianceStatus(): SecurityDashboard['compliance_status'] {
    const criticalAlerts = Array.from(this.alerts.values())
      .filter(a => a.severity === 'CRITICAL' && a.status === 'OPEN');

    if (criticalAlerts.length > 0) {
      return 'NON_COMPLIANT';
    }

    const highAlerts = Array.from(this.alerts.values())
      .filter(a => a.severity === 'HIGH' && a.status === 'OPEN');

    if (highAlerts.length > 0) {
      return 'UNDER_REVIEW';
    }

    return 'COMPLIANT';
  }

  /**
   * Get security metrics
   */
  getSecurityMetrics(): any {
    // Return mock metrics for now
    return {
      totalEvents: this.alerts.size,
      activeAlerts: Array.from(this.alerts.values()).filter(a => a.status === 'OPEN').length,
      criticalAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'CRITICAL').length,
      warningAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'HIGH' || a.severity === 'MEDIUM').length,
      infoAlerts: Array.from(this.alerts.values()).filter(a => a.severity === 'LOW').length,
      recentEvents: [],
      topEventTypes: [],
      severityDistribution: {
        critical: Array.from(this.alerts.values()).filter(a => a.severity === 'CRITICAL').length,
        high: Array.from(this.alerts.values()).filter(a => a.severity === 'HIGH').length,
        medium: Array.from(this.alerts.values()).filter(a => a.severity === 'MEDIUM').length,
        low: Array.from(this.alerts.values()).filter(a => a.severity === 'LOW').length,
        info: 0
      }
    };
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'INVESTIGATING';
      alert.assigned_to = userId;
      // In a real implementation, you would update the database
    }
  }

  /**
   * Resolve security alert
   */
  async resolveAlert(alertId: string, userId: string, resolution: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolution_notes = resolution;
      alert.resolved_at = new Date();
      alert.assigned_to = userId;
      // In a real implementation, you would update the database
    }
  }

  /**
   * Get alerts by status
   */
  getAlerts(status: SecurityAlert['status']): SecurityAlert[] {
    return Array.from(this.alerts.values()).filter(alert => alert.status === status);
  }

  /**
   * Get metrics for a specific metric name
   */
  getMetrics(metricName: string, hours: number = 24): SecurityMetric[] {
    const metricHistory = this.metrics.get(metricName);
    if (!metricHistory) return [];

    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    return metricHistory.filter(m => m.timestamp >= cutoff);
  }

  /**
   * Get threat intelligence indicators
   */
  getThreatIntelligence(): ThreatIntelligence[] {
    return Array.from(this.threatIntelligence.values());
  }

  // Added for securityAnalyticsService compatibility
  getRecentEvents(limit: number = 100): any[] {
    // Return empty array as placeholder since we don't have events stored
    return [];
  }

  getActiveAlerts(): any[] {
    // Return active alerts
    return this.getAlerts('OPEN');
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
