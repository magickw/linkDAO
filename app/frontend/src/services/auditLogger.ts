/**
 * Audit Logger Service
 * Logs all security-relevant events
 */

export type AuditEventType =
  | 'wallet_created'
  | 'wallet_imported'
  | 'wallet_deleted'
  | 'wallet_unlocked'
  | 'wallet_locked'
  | 'transaction_signed'
  | 'transaction_simulated'
  | 'authentication_success'
  | 'authentication_failure'
  | 'session_created'
  | 'session_destroyed'
  | 'session_locked'
  | 'session_unlocked'
  | 'biometric_enabled'
  | 'biometric_disabled'
  | 'biometric_authentication_success'
  | 'biometric_authentication_failure'
  | 'permission_granted'
  | 'permission_revoked'
  | 'role_assigned'
  | 'role_removed'
  | 'admin_action'
  | 'security_alert'
  | 'rate_limit_exceeded'
  | 'phishing_detected'
  | 'suspicious_activity'
  | 'data_export'
  | 'data_import'
  | 'settings_changed'
  | 'api_call'
  | 'error_occurred';

export interface AuditEvent {
  id: string;
  timestamp: number;
  type: AuditEventType;
  userId?: string;
  walletAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: any;
  severity?: 'info' | 'warning' | 'error' | 'critical';
  category?: 'security' | 'authentication' | 'wallet' | 'transaction' | 'admin' | 'system';
}

export interface AuditFilter {
  userId?: string;
  walletAddress?: string;
  type?: AuditEventType;
  severity?: AuditEvent['severity'];
  category?: AuditEvent['category'];
  startTime?: number;
  endTime?: number;
}

/**
 * Audit Logger Service
 */
export class AuditLogger {
  private static instance: AuditLogger;
  private events: AuditEvent[] = [];
  private maxEvents: number = 1000;
  private flushInterval: NodeJS.Timeout | null = null;
  private flushThreshold: number = 100;
  private backendUrl: string | null = null;

  private constructor() {
    // Initialize periodic flush
    this.startPeriodicFlush();
  }

  static getInstance(): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger();
    }
    return AuditLogger.instance;
  }

  /**
   * Set backend URL for sending audit logs
   */
  setBackendUrl(url: string): void {
    this.backendUrl = url;
  }

  /**
   * Log an audit event
   */
  log(event: Omit<AuditEvent, 'id' | 'timestamp'>): void {
    const auditEvent: AuditEvent = {
      ...event,
      id: this.generateEventId(),
      timestamp: Date.now(),
      severity: event.severity || 'info',
      category: event.category || this.getCategoryFromType(event.type)
    };

    this.events.push(auditEvent);

    // Keep only last N events
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }

    // Auto-flush if threshold reached
    if (this.events.length >= this.flushThreshold) {
      this.flush();
    }

    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`[AUDIT] ${auditEvent.type}:`, auditEvent);
    }
  }

  /**
   * Log wallet creation
   */
  logWalletCreated(userId: string, walletAddress: string, details?: any): void {
    this.log({
      type: 'wallet_created',
      userId,
      walletAddress,
      details,
      category: 'wallet',
      severity: 'info'
    });
  }

  /**
   * Log wallet import
   */
  logWalletImported(userId: string, walletAddress: string, details?: any): void {
    this.log({
      type: 'wallet_imported',
      userId,
      walletAddress,
      details,
      category: 'wallet',
      severity: 'info'
    });
  }

  /**
   * Log wallet deletion
   */
  logWalletDeleted(userId: string, walletAddress: string, details?: any): void {
    this.log({
      type: 'wallet_deleted',
      userId,
      walletAddress,
      details,
      category: 'wallet',
      severity: 'warning'
    });
  }

  /**
   * Log transaction signing
   */
  logTransactionSigned(userId: string, walletAddress: string, details?: any): void {
    this.log({
      type: 'transaction_signed',
      userId,
      walletAddress,
      details,
      category: 'transaction',
      severity: 'info'
    });
  }

  /**
   * Log authentication success
   */
  logAuthenticationSuccess(userId: string, details?: any): void {
    this.log({
      type: 'authentication_success',
      userId,
      details,
      category: 'authentication',
      severity: 'info'
    });
  }

  /**
   * Log authentication failure
   */
  logAuthenticationFailure(userId: string, reason: string, details?: any): void {
    this.log({
      type: 'authentication_failure',
      userId,
      details: { reason, ...details },
      category: 'authentication',
      severity: 'warning'
    });
  }

  /**
   * Log security alert
   */
  logSecurityAlert(userId: string, alert: string, details?: any): void {
    this.log({
      type: 'security_alert',
      userId,
      details: { alert, ...details },
      category: 'security',
      severity: 'critical'
    });
  }

  /**
   * Log phishing detection
   */
  logPhishingDetected(userId: string, walletAddress: string, targetAddress: string, details?: any): void {
    this.log({
      type: 'phishing_detected',
      userId,
      walletAddress,
      details: { targetAddress, ...details },
      category: 'security',
      severity: 'critical'
    });
  }

  /**
   * Log rate limit exceeded
   */
  logRateLimitExceeded(userId: string, operation: string, details?: any): void {
    this.log({
      type: 'rate_limit_exceeded',
      userId,
      details: { operation, ...details },
      category: 'security',
      severity: 'warning'
    });
  }

  /**
   * Get events with optional filtering
   */
  getEvents(filter?: AuditFilter): AuditEvent[] {
    let filtered = [...this.events];

    if (filter) {
      if (filter.userId) {
        filtered = filtered.filter(e => e.userId === filter.userId);
      }
      if (filter.walletAddress) {
        filtered = filtered.filter(e => e.walletAddress === filter.walletAddress);
      }
      if (filter.type) {
        filtered = filtered.filter(e => e.type === filter.type);
      }
      if (filter.severity) {
        filtered = filtered.filter(e => e.severity === filter.severity);
      }
      if (filter.category) {
        filtered = filtered.filter(e => e.category === filter.category);
      }
      if (filter.startTime) {
        filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
      }
      if (filter.endTime) {
        filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
      }
    }

    return filtered;
  }

  /**
   * Get events by user
   */
  getEventsByUser(userId: string, limit?: number): AuditEvent[] {
    const events = this.events.filter(e => e.userId === userId);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get events by wallet
   */
  getEventsByWallet(walletAddress: string, limit?: number): AuditEvent[] {
    const events = this.events.filter(e => e.walletAddress === walletAddress);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get events by severity
   */
  getEventsBySeverity(severity: AuditEvent['severity'], limit?: number): AuditEvent[] {
    const events = this.events.filter(e => e.severity === severity);
    return limit ? events.slice(-limit) : events;
  }

  /**
   * Get recent events
   */
  getRecentEvents(limit: number = 50): AuditEvent[] {
    return this.events.slice(-limit);
  }

  /**
   * Get statistics
   */
  getStats(): {
    totalEvents: number;
    eventsByType: Record<AuditEventType, number>;
    eventsBySeverity: Record<AuditEvent['severity'], number>;
    eventsByCategory: Record<AuditEvent['category'], number>;
    uniqueUsers: number;
    uniqueWallets: number;
  } {
    const eventsByType: Record<AuditEventType, number> = {} as any;
    const eventsBySeverity: Record<AuditEvent['severity'], number> = {
      info: 0,
      warning: 0,
      error: 0,
      critical: 0
    };
    const eventsByCategory: Record<AuditEvent['category'], number> = {
      security: 0,
      authentication: 0,
      wallet: 0,
      transaction: 0,
      admin: 0,
      system: 0
    };
    const uniqueUsers = new Set<string>();
    const uniqueWallets = new Set<string>();

    this.events.forEach(event => {
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;
      eventsBySeverity[event.severity]++;
      eventsByCategory[event.category]++;

      if (event.userId) {
        uniqueUsers.add(event.userId);
      }
      if (event.walletAddress) {
        uniqueWallets.add(event.walletAddress);
      }
    });

    return {
      totalEvents: this.events.length,
      eventsByType,
      eventsBySeverity,
      eventsByCategory,
      uniqueUsers: uniqueUsers.size,
      uniqueWallets: uniqueWallets.size
    };
  }

  /**
   * Flush events to backend
   */
  async flush(): Promise<void> {
    if (!this.backendUrl || this.events.length === 0) {
      return;
    }

    const eventsToFlush = [...this.events];
    this.events = [];

    try {
      await fetch(`${this.backendUrl}/api/audit/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ events: eventsToFlush }),
      });
    } catch (error) {
      console.error('Failed to flush audit logs:', error);
      // Re-add events to the queue if flush failed
      this.events = [...eventsToFlush, ...this.events];
    }
  }

  /**
   * Start periodic flush
   */
  private startPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    this.flushInterval = setInterval(() => {
      this.flush();
    }, 60000); // Flush every minute
  }

  /**
   * Stop periodic flush
   */
  stopPeriodicFlush(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
      this.flushInterval = null;
    }
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
  }

  /**
   * Export events as JSON
   */
  exportAsJSON(filter?: AuditFilter): string {
    const events = this.getEvents(filter);
    return JSON.stringify(events, null, 2);
  }

  /**
   * Export events as CSV
   */
  exportAsCSV(filter?: AuditFilter): string {
    const events = this.getEvents(filter);
    const headers = ['id', 'timestamp', 'type', 'userId', 'walletAddress', 'severity', 'category', 'details'];
    const rows = events.map(e => [
      e.id,
      e.timestamp,
      e.type,
      e.userId || '',
      e.walletAddress || '',
      e.severity,
      e.category,
      JSON.stringify(e.details || {})
    ]);

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get category from event type
   */
  private getCategoryFromType(type: AuditEventType): AuditEvent['category'] {
    if (type.startsWith('wallet')) return 'wallet';
    if (type.startsWith('transaction')) return 'transaction';
    if (type.startsWith('authentication') || type.startsWith('biometric') || type.startsWith('session')) return 'authentication';
    if (type.startsWith('admin') || type.startsWith('permission') || type.startsWith('role')) return 'admin';
    if (type.startsWith('security') || type.startsWith('phishing') || type.startsWith('rate_limit') || type.startsWith('suspicious')) return 'security';
    return 'system';
  }
}

export const auditLogger = AuditLogger.getInstance();