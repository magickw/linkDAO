/**
 * Security Monitoring Service
 * Monitors for security incidents and suspicious activity
 */

// Security event types
export enum SecurityEventType {
  // Authentication events
  LOGIN_SUCCESS = 'LOGIN_SUCCESS',
  LOGIN_FAILURE = 'LOGIN_FAILURE',
  LOCKOUT_TRIGGERED = 'LOCKOUT_TRIGGERED',
  PASSWORD_CHANGE = 'PASSWORD_CHANGE',

  // Transaction events
  TRANSACTION_SIGNED = 'TRANSACTION_SIGNED',
  TRANSACTION_BLOCKED = 'TRANSACTION_BLOCKED',
  LARGE_TRANSACTION = 'LARGE_TRANSACTION',
  SUSPICIOUS_ADDRESS = 'SUSPICIOUS_ADDRESS',

  // Phishing events
  PHISHING_DETECTED = 'PHISHING_DETECTED',
  MALICIOUS_ADDRESS = 'MALICIOUS_ADDRESS',

  // System events
  WALLET_CREATED = 'WALLET_CREATED',
  WALLET_IMPORTED = 'WALLET_IMPORTED',
  WALLET_EXPORTED = 'WALLET_EXPORTED',
  WALLET_DELETED = 'WALLET_DELETED',

  // Error events
  ENCRYPTION_ERROR = 'ENCRYPTION_ERROR',
  DECRYPTION_ERROR = 'DECRYPTION_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Anomaly events
  UNUSUAL_ACTIVITY = 'UNUSUAL_ACTIVITY',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  BETA_LIMIT_EXCEEDED = 'BETA_LIMIT_EXCEEDED',
}

export enum SecuritySeverity {
  INFO = 'INFO',
  WARNING = 'WARNING',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

export interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: number;
  message: string;
  metadata?: Record<string, any>;
  userAgent?: string;
  walletAddress?: string;
}

// Configuration
const CONFIG = {
  maxEventsStored: 1000,
  alertThresholds: {
    loginFailures: 3, // Alert after 3 failures
    transactionBlocked: 1, // Alert on any blocked transaction
    largeTransactions: 5, // Alert after 5 large transactions in a day
  },
  reportingEndpoint: '/api/security/events', // Backend endpoint for reporting
  enableRemoteReporting: false, // Enable to send events to backend
};

// Storage keys
const STORAGE_KEY = 'linkdao_security_events';
const STORAGE_KEY_ALERTS = 'linkdao_security_alerts';

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private listeners: ((event: SecurityEvent) => void)[] = [];

  private constructor() {
    this.loadEvents();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  /**
   * Load events from storage
   */
  private loadEvents(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.events = JSON.parse(stored);
      }
    } catch {
      this.events = [];
    }
  }

  /**
   * Save events to storage
   */
  private saveEvents(): void {
    try {
      // Keep only recent events
      if (this.events.length > CONFIG.maxEventsStored) {
        this.events = this.events.slice(-CONFIG.maxEventsStored);
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.events));
    } catch {
      // Ignore storage errors
    }
  }

  /**
   * Generate unique event ID
   */
  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    severity: SecuritySeverity,
    message: string,
    metadata?: Record<string, any>,
    walletAddress?: string
  ): SecurityEvent {
    const event: SecurityEvent = {
      id: this.generateId(),
      type,
      severity,
      timestamp: Date.now(),
      message,
      metadata: {
        ...metadata,
        // Sanitize sensitive data
        ...(metadata?.privateKey ? { privateKey: '[REDACTED]' } : {}),
        ...(metadata?.mnemonic ? { mnemonic: '[REDACTED]' } : {}),
        ...(metadata?.password ? { password: '[REDACTED]' } : {}),
      },
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      walletAddress: walletAddress ? this.maskAddress(walletAddress) : undefined,
    };

    this.events.push(event);
    this.saveEvents();

    // Notify listeners
    this.listeners.forEach((listener) => listener(event));

    // Check for alerts
    this.checkAlerts(event);

    // Send to backend if enabled
    if (CONFIG.enableRemoteReporting) {
      this.reportToBackend(event);
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      this.logToConsole(event);
    }

    return event;
  }

  /**
   * Mask wallet address for privacy
   */
  private maskAddress(address: string): string {
    if (address.length < 10) return address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  /**
   * Log to console with appropriate styling
   */
  private logToConsole(event: SecurityEvent): void {
    const styles = {
      [SecuritySeverity.INFO]: 'color: blue',
      [SecuritySeverity.WARNING]: 'color: orange',
      [SecuritySeverity.ERROR]: 'color: red',
      [SecuritySeverity.CRITICAL]: 'color: red; font-weight: bold',
    };

    console.log(
      `%c[SECURITY ${event.severity}] ${event.type}: ${event.message}`,
      styles[event.severity],
      event.metadata || ''
    );
  }

  /**
   * Check if alert thresholds are exceeded
   */
  private checkAlerts(event: SecurityEvent): void {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneHourAgo = now - 60 * 60 * 1000;

    // Check login failures in last hour
    if (event.type === SecurityEventType.LOGIN_FAILURE) {
      const recentFailures = this.events.filter(
        (e) => e.type === SecurityEventType.LOGIN_FAILURE && e.timestamp > oneHourAgo
      ).length;

      if (recentFailures >= CONFIG.alertThresholds.loginFailures) {
        this.triggerAlert('MULTIPLE_LOGIN_FAILURES', {
          count: recentFailures,
          timeframe: '1 hour',
        });
      }
    }

    // Check blocked transactions
    if (event.type === SecurityEventType.TRANSACTION_BLOCKED) {
      this.triggerAlert('TRANSACTION_BLOCKED', event.metadata);
    }

    // Check large transactions today
    if (event.type === SecurityEventType.LARGE_TRANSACTION) {
      const largeToday = this.events.filter(
        (e) => e.type === SecurityEventType.LARGE_TRANSACTION && e.timestamp > oneDayAgo
      ).length;

      if (largeToday >= CONFIG.alertThresholds.largeTransactions) {
        this.triggerAlert('MULTIPLE_LARGE_TRANSACTIONS', {
          count: largeToday,
          timeframe: '24 hours',
        });
      }
    }

    // Critical events always trigger alerts
    if (event.severity === SecuritySeverity.CRITICAL) {
      this.triggerAlert('CRITICAL_EVENT', {
        type: event.type,
        message: event.message,
      });
    }
  }

  /**
   * Trigger a security alert
   */
  private triggerAlert(alertType: string, data: any): void {
    const alert = {
      type: alertType,
      timestamp: Date.now(),
      data,
    };

    // Store alert
    try {
      const stored = localStorage.getItem(STORAGE_KEY_ALERTS);
      const alerts = stored ? JSON.parse(stored) : [];
      alerts.push(alert);
      localStorage.setItem(STORAGE_KEY_ALERTS, JSON.stringify(alerts.slice(-100)));
    } catch {
      // Ignore
    }

    // In production, this would send to an alerting service
    console.warn('[SECURITY ALERT]', alertType, data);
  }

  /**
   * Report event to backend (if enabled)
   */
  private async reportToBackend(event: SecurityEvent): Promise<void> {
    try {
      await fetch(CONFIG.reportingEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(event),
      });
    } catch {
      // Silently fail - don't disrupt user experience
    }
  }

  /**
   * Subscribe to security events
   */
  subscribe(listener: (event: SecurityEvent) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 50): SecurityEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Get events by type
   */
  getEventsByType(type: SecurityEventType): SecurityEvent[] {
    return this.events.filter((e) => e.type === type);
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: SecuritySeverity): SecurityEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  /**
   * Get security statistics
   */
  getStats(): {
    totalEvents: number;
    last24Hours: number;
    bySeverity: Record<SecuritySeverity, number>;
    byType: Record<string, number>;
  } {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const bySeverity: Record<SecuritySeverity, number> = {
      [SecuritySeverity.INFO]: 0,
      [SecuritySeverity.WARNING]: 0,
      [SecuritySeverity.ERROR]: 0,
      [SecuritySeverity.CRITICAL]: 0,
    };

    const byType: Record<string, number> = {};

    this.events.forEach((event) => {
      bySeverity[event.severity]++;
      byType[event.type] = (byType[event.type] || 0) + 1;
    });

    return {
      totalEvents: this.events.length,
      last24Hours: this.events.filter((e) => e.timestamp > oneDayAgo).length,
      bySeverity,
      byType,
    };
  }

  /**
   * Clear all events (for testing)
   */
  clearEvents(): void {
    this.events = [];
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(STORAGE_KEY_ALERTS);
  }
}

// Export singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Convenience functions
export const logSecurityEvent = (
  type: SecurityEventType,
  severity: SecuritySeverity,
  message: string,
  metadata?: Record<string, any>,
  walletAddress?: string
) => securityMonitor.logEvent(type, severity, message, metadata, walletAddress);

export const logInfo = (type: SecurityEventType, message: string, metadata?: Record<string, any>) =>
  securityMonitor.logEvent(type, SecuritySeverity.INFO, message, metadata);

export const logWarning = (type: SecurityEventType, message: string, metadata?: Record<string, any>) =>
  securityMonitor.logEvent(type, SecuritySeverity.WARNING, message, metadata);

export const logError = (type: SecurityEventType, message: string, metadata?: Record<string, any>) =>
  securityMonitor.logEvent(type, SecuritySeverity.ERROR, message, metadata);

export const logCritical = (type: SecurityEventType, message: string, metadata?: Record<string, any>) =>
  securityMonitor.logEvent(type, SecuritySeverity.CRITICAL, message, metadata);
