/**
 * Security Monitoring Service
 * 
 * Comprehensive security monitoring and alerting system for detecting
 * and responding to security threats in real-time.
 */

import { EventEmitter } from 'events';
import { securityConfig } from '../config/securityConfig';
import AuditLoggingService from './auditLoggingService';

const auditLoggingService = new AuditLoggingService();
import crypto from 'crypto';

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  source: string;
  timestamp: Date;
  details: Record<string, any>;
  ipAddress?: string;
  userAgent?: string;
  userId?: string;
  sessionId?: string;
}

export enum SecurityEventType {
  AUTHENTICATION_FAILURE = 'authentication_failure',
  AUTHORIZATION_VIOLATION = 'authorization_violation',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
  BRUTE_FORCE_ATTACK = 'brute_force_attack',
  SQL_INJECTION_ATTEMPT = 'sql_injection_attempt',
  XSS_ATTEMPT = 'xss_attempt',
  CSRF_ATTEMPT = 'csrf_attempt',
  RATE_LIMIT_EXCEEDED = 'rate_limit_exceeded',
  DDOS_ATTACK = 'ddos_attack',
  DATA_BREACH_ATTEMPT = 'data_breach_attempt',
  PRIVILEGE_ESCALATION = 'privilege_escalation',
  MALICIOUS_FILE_UPLOAD = 'malicious_file_upload',
  SMART_CONTRACT_EXPLOIT = 'smart_contract_exploit',
  WALLET_COMPROMISE = 'wallet_compromise',
  PHISHING_ATTEMPT = 'phishing_attempt',
  VULNERABILITY_EXPLOIT = 'vulnerability_exploit',
  COMPLIANCE_VIOLATION = 'compliance_violation',
  DATA_EXFILTRATION = 'data_exfiltration',
  SYSTEM_COMPROMISE = 'system_compromise',
}

export enum SecuritySeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface SecurityAlert {
  id: string;
  eventId: string;
  title: string;
  description: string;
  severity: SecuritySeverity;
  timestamp: Date;
  acknowledged: boolean;
  resolvedAt?: Date;
  assignedTo?: string;
  actions: SecurityAction[];
}

export interface SecurityAction {
  type: 'block_ip' | 'suspend_user' | 'require_mfa' | 'notify_admin' | 'auto_remediate';
  parameters: Record<string, any>;
  executedAt?: Date;
  result?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByType: Record<SecurityEventType, number>;
  eventsBySeverity: Record<SecuritySeverity, number>;
  averageResponseTime: number;
  falsePositiveRate: number;
  threatDetectionRate: number;
  incidentResolutionTime: number;
}

class SecurityMonitoringService extends EventEmitter {
  private events: Map<string, SecurityEvent> = new Map();
  private alerts: Map<string, SecurityAlert> = new Map();
  private blockedIPs: Set<string> = new Set();
  private suspiciousActivities: Map<string, number> = new Map();
  private rateLimitCounters: Map<string, { count: number; resetTime: number }> = new Map();

  constructor() {
    super();
    this.initializeMonitoring();
  }

  /**
   * Initialize security monitoring
   */
  private initializeMonitoring(): void {
    // Set up periodic cleanup
    setInterval(() => {
      this.cleanupOldEvents();
      this.cleanupRateLimitCounters();
    }, 60000); // Every minute

    // Set up threat intelligence updates
    setInterval(() => {
      this.updateThreatIntelligence();
    }, 3600000); // Every hour

    console.log('Security monitoring service initialized');
  }

  /**
   * Record a security event
   */
  async recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'>): Promise<SecurityEvent> {
    const securityEvent: SecurityEvent = {
      ...event,
      id: crypto.randomUUID(),
      timestamp: new Date(),
    };

    // Store event
    this.events.set(securityEvent.id, securityEvent);

    // Log to audit system
    await auditLoggingService.createAuditLog({
      actionType: 'security_event',
      actorType: 'system',
      newState: securityEvent,
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
    });

    // Analyze event for threats
    await this.analyzeSecurityEvent(securityEvent);

    // Emit event for real-time processing
    this.emit('securityEvent', securityEvent);

    return securityEvent;
  }

  /**
   * Analyze security event for threats
   */
  private async analyzeSecurityEvent(event: SecurityEvent): Promise<void> {
    // Check for brute force attacks
    if (event.type === SecurityEventType.AUTHENTICATION_FAILURE) {
      await this.detectBruteForceAttack(event);
    }

    // Check for suspicious patterns
    if (event.ipAddress) {
      await this.detectSuspiciousActivity(event);
    }

    // Check for DDoS attacks
    if (event.type === SecurityEventType.RATE_LIMIT_EXCEEDED) {
      await this.detectDDoSAttack(event);
    }

    // Check for injection attacks
    if (event.type === SecurityEventType.SQL_INJECTION_ATTEMPT || 
        event.type === SecurityEventType.XSS_ATTEMPT) {
      await this.handleInjectionAttack(event);
    }

    // Auto-escalate critical events
    if (event.severity === SecuritySeverity.CRITICAL) {
      await this.createSecurityAlert(event);
    }
  }

  /**
   * Detect brute force attacks
   */
  private async detectBruteForceAttack(event: SecurityEvent): Promise<void> {
    const key = `brute_force_${event.ipAddress || event.userId}`;
    const current = this.suspiciousActivities.get(key) || 0;
    const newCount = current + 1;

    this.suspiciousActivities.set(key, newCount);

    if (newCount >= securityConfig.authentication.maxLoginAttempts) {
      const bruteForceEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        type: SecurityEventType.BRUTE_FORCE_ATTACK,
        severity: SecuritySeverity.HIGH,
        source: 'security_monitoring',
        timestamp: new Date(),
        details: {
          originalEvent: event.id,
          attemptCount: newCount,
          timeWindow: '15 minutes',
        },
        ipAddress: event.ipAddress,
        userAgent: event.userAgent,
        userId: event.userId,
      };

      await this.recordSecurityEvent(bruteForceEvent);
      await this.executeSecurityAction({
        type: 'block_ip',
        parameters: { 
          ipAddress: event.ipAddress,
          duration: securityConfig.authentication.lockoutDuration,
        },
      });
    }
  }

  /**
   * Detect suspicious activity patterns
   */
  private async detectSuspiciousActivity(event: SecurityEvent): Promise<void> {
    const ipKey = `suspicious_${event.ipAddress}`;
    const current = this.suspiciousActivities.get(ipKey) || 0;
    
    // Increment suspicion score based on event type
    let suspicionIncrease = 1;
    switch (event.type) {
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        suspicionIncrease = 5;
        break;
      case SecurityEventType.AUTHORIZATION_VIOLATION:
        suspicionIncrease = 3;
        break;
      case SecurityEventType.RATE_LIMIT_EXCEEDED:
        suspicionIncrease = 2;
        break;
    }

    const newScore = current + suspicionIncrease;
    this.suspiciousActivities.set(ipKey, newScore);

    // Threshold for suspicious activity
    if (newScore >= 10) {
      const suspiciousEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecuritySeverity.MEDIUM,
        source: 'security_monitoring',
        timestamp: new Date(),
        details: {
          suspicionScore: newScore,
          recentEvents: Array.from(this.events.values())
            .filter(e => e.ipAddress === event.ipAddress)
            .slice(-10),
        },
        ipAddress: event.ipAddress,
      };

      await this.recordSecurityEvent(suspiciousEvent);
    }
  }

  /**
   * Detect DDoS attacks
   */
  private async detectDDoSAttack(event: SecurityEvent): Promise<void> {
    if (!securityConfig.ddosProtection.enabled) return;

    const now = Date.now();
    const windowStart = now - 60000; // 1 minute window

    // Count recent rate limit events
    const recentEvents = Array.from(this.events.values())
      .filter(e => 
        e.type === SecurityEventType.RATE_LIMIT_EXCEEDED &&
        e.timestamp.getTime() > windowStart
      );

    if (recentEvents.length >= securityConfig.ddosProtection.threshold) {
      const ddosEvent: SecurityEvent = {
        id: crypto.randomUUID(),
        type: SecurityEventType.DDOS_ATTACK,
        severity: SecuritySeverity.CRITICAL,
        source: 'security_monitoring',
        timestamp: new Date(),
        details: {
          eventCount: recentEvents.length,
          timeWindow: '1 minute',
          affectedIPs: [...new Set(recentEvents.map(e => e.ipAddress))],
        },
      };

      await this.recordSecurityEvent(ddosEvent);
      await this.createSecurityAlert(ddosEvent);
    }
  }

  /**
   * Handle injection attacks
   */
  private async handleInjectionAttack(event: SecurityEvent): Promise<void> {
    // Immediately block IP for injection attempts
    if (event.ipAddress) {
      await this.executeSecurityAction({
        type: 'block_ip',
        parameters: {
          ipAddress: event.ipAddress,
          duration: 3600000, // 1 hour
          reason: 'Injection attack attempt',
        },
      });
    }

    // Create high-priority alert
    await this.createSecurityAlert(event);
  }

  /**
   * Create security alert
   */
  private async createSecurityAlert(event: SecurityEvent): Promise<SecurityAlert> {
    const alert: SecurityAlert = {
      id: crypto.randomUUID(),
      eventId: event.id,
      title: this.getAlertTitle(event),
      description: this.getAlertDescription(event),
      severity: event.severity,
      timestamp: new Date(),
      acknowledged: false,
      actions: this.getRecommendedActions(event),
    };

    this.alerts.set(alert.id, alert);

    // Send notifications
    await this.sendSecurityNotification(alert);

    // Auto-execute critical actions
    if (event.severity === SecuritySeverity.CRITICAL) {
      for (const action of alert.actions) {
        if (action.type !== 'notify_admin') {
          await this.executeSecurityAction(action);
        }
      }
    }

    this.emit('securityAlert', alert);
    return alert;
  }

  /**
   * Execute security action
   */
  private async executeSecurityAction(action: SecurityAction): Promise<void> {
    try {
      switch (action.type) {
        case 'block_ip':
          await this.blockIP(action.parameters.ipAddress, action.parameters.duration);
          break;
        case 'suspend_user':
          await this.suspendUser(action.parameters.userId, action.parameters.reason);
          break;
        case 'require_mfa':
          await this.requireMFA(action.parameters.userId);
          break;
        case 'notify_admin':
          await this.notifyAdministrators(action.parameters);
          break;
        case 'auto_remediate':
          await this.autoRemediate(action.parameters);
          break;
      }

      action.executedAt = new Date();
      action.result = 'success';
    } catch (error) {
      action.executedAt = new Date();
      action.result = `failed: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error('Failed to execute security action:', error);
    }
  }

  /**
   * Block IP address
   */
  private async blockIP(ipAddress: string, duration: number): Promise<void> {
    this.blockedIPs.add(ipAddress);
    
    // Remove from blocked list after duration
    setTimeout(() => {
      this.blockedIPs.delete(ipAddress);
    }, duration);

    console.log(`Blocked IP ${ipAddress} for ${duration}ms`);
  }

  /**
   * Check if IP is blocked
   */
  public isIPBlocked(ipAddress: string): boolean {
    return this.blockedIPs.has(ipAddress);
  }

  /**
   * Suspend user account
   */
  private async suspendUser(userId: string, reason: string): Promise<void> {
    // Implementation would integrate with user management system
    console.log(`Suspended user ${userId} for reason: ${reason}`);
  }

  /**
   * Require MFA for user
   */
  private async requireMFA(userId: string): Promise<void> {
    // Implementation would integrate with authentication system
    console.log(`Required MFA for user ${userId}`);
  }

  /**
   * Notify administrators
   */
  private async notifyAdministrators(parameters: Record<string, any>): Promise<void> {
    // Implementation would integrate with notification system
    console.log('Notified administrators:', parameters);
  }

  /**
   * Auto-remediate security issue
   */
  private async autoRemediate(parameters: Record<string, any>): Promise<void> {
    // Implementation would include automated remediation actions
    console.log('Auto-remediated security issue:', parameters);
  }

  /**
   * Get security metrics
   */
  public getSecurityMetrics(): SecurityMetrics {
    const events = Array.from(this.events.values());
    const alerts = Array.from(this.alerts.values());

    const eventsByType = events.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<SecurityEventType, number>);

    const eventsBySeverity = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<SecuritySeverity, number>);

    const resolvedAlerts = alerts.filter(a => a.resolvedAt);
    const averageResponseTime = resolvedAlerts.length > 0
      ? resolvedAlerts.reduce((sum, alert) => {
          return sum + (alert.resolvedAt!.getTime() - alert.timestamp.getTime());
        }, 0) / resolvedAlerts.length
      : 0;

    return {
      totalEvents: events.length,
      eventsByType,
      eventsBySeverity,
      averageResponseTime,
      falsePositiveRate: 0.05, // Would be calculated based on historical data
      threatDetectionRate: 0.95, // Would be calculated based on historical data
      incidentResolutionTime: averageResponseTime,
    };
  }

  /**
   * Get recent security events
   */
  public getRecentEvents(limit: number = 100): SecurityEvent[] {
    return Array.from(this.events.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(): SecurityAlert[] {
    return Array.from(this.alerts.values())
      .filter(alert => !alert.resolvedAt)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Acknowledge alert
   */
  public async acknowledgeAlert(alertId: string, userId: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.acknowledged = true;
      alert.assignedTo = userId;
      
      await auditLoggingService.createAuditLog({
        actionType: 'alert_acknowledged',
        actorId: userId,
        actorType: 'user',
        newState: { alertId, acknowledged: true },
      });
    }
  }

  /**
   * Resolve alert
   */
  public async resolveAlert(alertId: string, userId: string, resolution: string): Promise<void> {
    const alert = this.alerts.get(alertId);
    if (alert) {
      alert.resolvedAt = new Date();
      alert.assignedTo = userId;
      
      await auditLoggingService.createAuditLog({
        actionType: 'alert_resolved',
        actorId: userId,
        actorType: 'user',
        newState: { alertId, resolved: true, resolution },
      });
    }
  }

  // Helper methods
  private getAlertTitle(event: SecurityEvent): string {
    const titles = {
      [SecurityEventType.BRUTE_FORCE_ATTACK]: 'Brute Force Attack Detected',
      [SecurityEventType.SQL_INJECTION_ATTEMPT]: 'SQL Injection Attempt',
      [SecurityEventType.XSS_ATTEMPT]: 'Cross-Site Scripting Attempt',
      [SecurityEventType.DDOS_ATTACK]: 'DDoS Attack in Progress',
      [SecurityEventType.SUSPICIOUS_ACTIVITY]: 'Suspicious Activity Detected',
      [SecurityEventType.SMART_CONTRACT_EXPLOIT]: 'Smart Contract Exploit Attempt',
      [SecurityEventType.DATA_BREACH_ATTEMPT]: 'Data Breach Attempt',
      [SecurityEventType.PRIVILEGE_ESCALATION]: 'Privilege Escalation Attempt',
    };

    return titles[event.type] || `Security Event: ${event.type}`;
  }

  private getAlertDescription(event: SecurityEvent): string {
    return `Security event detected: ${event.type} with severity ${event.severity}. Source: ${event.source}. Details: ${JSON.stringify(event.details)}`;
  }

  private getRecommendedActions(event: SecurityEvent): SecurityAction[] {
    const actions: SecurityAction[] = [];

    // Always notify admin for high/critical events
    if (event.severity === SecuritySeverity.HIGH || event.severity === SecuritySeverity.CRITICAL) {
      actions.push({
        type: 'notify_admin',
        parameters: { event: event.id, severity: event.severity },
      });
    }

    // Specific actions based on event type
    switch (event.type) {
      case SecurityEventType.BRUTE_FORCE_ATTACK:
      case SecurityEventType.SQL_INJECTION_ATTEMPT:
      case SecurityEventType.XSS_ATTEMPT:
        if (event.ipAddress) {
          actions.push({
            type: 'block_ip',
            parameters: { ipAddress: event.ipAddress, duration: 3600000 },
          });
        }
        break;
      
      case SecurityEventType.PRIVILEGE_ESCALATION:
        if (event.userId) {
          actions.push({
            type: 'suspend_user',
            parameters: { userId: event.userId, reason: 'Privilege escalation attempt' },
          });
        }
        break;
      
      case SecurityEventType.SUSPICIOUS_ACTIVITY:
        if (event.userId) {
          actions.push({
            type: 'require_mfa',
            parameters: { userId: event.userId },
          });
        }
        break;
    }

    return actions;
  }

  private async sendSecurityNotification(alert: SecurityAlert): Promise<void> {
    // Implementation would integrate with notification channels
    console.log(`Security notification sent for alert: ${alert.title}`);
  }

  private cleanupOldEvents(): void {
    const cutoff = Date.now() - (24 * 60 * 60 * 1000); // 24 hours
    
    for (const [id, event] of this.events.entries()) {
      if (event.timestamp.getTime() < cutoff) {
        this.events.delete(id);
      }
    }
  }

  private cleanupRateLimitCounters(): void {
    const now = Date.now();
    
    for (const [key, counter] of this.rateLimitCounters.entries()) {
      if (now > counter.resetTime) {
        this.rateLimitCounters.delete(key);
      }
    }
  }

  private async updateThreatIntelligence(): Promise<void> {
    // Implementation would fetch latest threat intelligence
    console.log('Updated threat intelligence');
  }
}

export const securityMonitoringService = new SecurityMonitoringService();
export default securityMonitoringService;