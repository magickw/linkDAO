/**
 * Security Event Logger
 * Structured logging for security events with PII sanitization
 */

import { safeLogger } from '../utils/safeLogger';
import { RedisService } from '../services/redisService';

const redisService = RedisService.getInstance();

// Security event types
export enum SecurityEventType {
    // Authentication events
    AUTH_SUCCESS = 'auth.success',
    AUTH_FAILURE = 'auth.failure',
    AUTH_LOCKOUT = 'auth.lockout',
    TOKEN_REVOKED = 'auth.token_revoked',
    PASSWORD_RESET = 'auth.password_reset',
    MFA_ENABLED = 'auth.mfa_enabled',
    MFA_DISABLED = 'auth.mfa_disabled',

    // Authorization events
    AUTHZ_DENIED = 'authz.denied',
    PRIVILEGE_ESCALATION_ATTEMPT = 'authz.privilege_escalation',

    // CSRF events
    CSRF_VALIDATION_FAILED = 'csrf.validation_failed',
    CSRF_TOKEN_MISMATCH = 'csrf.token_mismatch',

    // Rate limiting events
    RATE_LIMIT_EXCEEDED = 'rate_limit.exceeded',
    RATE_LIMIT_WARNING = 'rate_limit.warning',

    // File upload events
    FILE_UPLOAD_REJECTED = 'file.upload_rejected',
    MALICIOUS_FILE_DETECTED = 'file.malicious_detected',

    // Admin events
    ADMIN_ACTION = 'admin.action',
    ADMIN_LOGIN = 'admin.login',
    CRITICAL_OPERATION = 'admin.critical_operation',

    // Suspicious activity
    SUSPICIOUS_ACTIVITY = 'security.suspicious',
    BRUTE_FORCE_ATTEMPT = 'security.brute_force',
    SQL_INJECTION_ATTEMPT = 'security.sql_injection',
    XSS_ATTEMPT = 'security.xss',

    // Data access
    SENSITIVE_DATA_ACCESS = 'data.sensitive_access',
    DATA_EXPORT = 'data.export',

    // System events
    SECURITY_CONFIG_CHANGE = 'system.security_config_change',
    ENCRYPTION_KEY_ROTATION = 'system.key_rotation'
}

// Security event severity levels
export enum SecurityEventSeverity {
    INFO = 'info',
    WARNING = 'warning',
    ERROR = 'error',
    CRITICAL = 'critical'
}

interface SecurityEvent {
    type: SecurityEventType;
    severity: SecurityEventSeverity;
    timestamp: number;
    userId?: string;
    userAddress?: string;
    ip?: string;
    userAgent?: string;
    path?: string;
    method?: string;
    message: string;
    metadata?: Record<string, any>;
}

// PII fields that should be sanitized
const PII_FIELDS = [
    'email',
    'phone',
    'phoneNumber',
    'ssn',
    'socialSecurityNumber',
    'creditCard',
    'cardNumber',
    'password',
    'token',
    'secret',
    'apiKey',
    'privateKey',
    'address', // physical address, not wallet
    'streetAddress',
    'postalCode',
    'zipCode'
];

export class SecurityEventLogger {
    /**
     * Log a security event
     */
    async logEvent(event: Omit<SecurityEvent, 'timestamp'>): Promise<void> {
        const fullEvent: SecurityEvent = {
            ...event,
            timestamp: Date.now(),
            metadata: this.sanitizePII(event.metadata || {})
        };

        // Log to console based on severity
        switch (event.severity) {
            case SecurityEventSeverity.CRITICAL:
                safeLogger.error(`[SecurityEvent:CRITICAL] ${event.type}`, fullEvent);
                break;
            case SecurityEventSeverity.ERROR:
                safeLogger.error(`[SecurityEvent:ERROR] ${event.type}`, fullEvent);
                break;
            case SecurityEventSeverity.WARNING:
                safeLogger.warn(`[SecurityEvent:WARNING] ${event.type}`, fullEvent);
                break;
            default:
                safeLogger.info(`[SecurityEvent:INFO] ${event.type}`, fullEvent);
        }

        // Store in Redis for analysis (keep for 30 days)
        try {
            const key = `security:event:${fullEvent.timestamp}:${event.type}`;
            await redisService.set(key, fullEvent, 30 * 24 * 60 * 60);

            // Add to event type index
            const typeKey = `security:events:${event.type}`;
            const events = await redisService.get(typeKey) || [];
            events.push({
                timestamp: fullEvent.timestamp,
                severity: event.severity,
                userId: event.userId,
                message: event.message
            });

            // Keep last 1000 events per type
            if (events.length > 1000) {
                events.shift();
            }

            await redisService.set(typeKey, events, 30 * 24 * 60 * 60);

            // Add to severity index
            const severityKey = `security:events:severity:${event.severity}`;
            const severityEvents = await redisService.get(severityKey) || [];
            severityEvents.push({
                timestamp: fullEvent.timestamp,
                type: event.type,
                userId: event.userId,
                message: event.message
            });

            // Keep last 1000 events per severity
            if (severityEvents.length > 1000) {
                severityEvents.shift();
            }

            await redisService.set(severityKey, severityEvents, 30 * 24 * 60 * 60);

            // Trigger alerts for critical events
            if (event.severity === SecurityEventSeverity.CRITICAL) {
                await this.triggerCriticalAlert(fullEvent);
            }
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to store security event:', error);
        }
    }

    /**
     * Sanitize PII from metadata
     */
    private sanitizePII(metadata: Record<string, any>): Record<string, any> {
        const sanitized = { ...metadata };

        for (const field of PII_FIELDS) {
            if (sanitized[field]) {
                if (field === 'email') {
                    // Partially redact email
                    sanitized[field] = this.redactEmail(sanitized[field]);
                } else {
                    sanitized[field] = '[REDACTED]';
                }
            }
        }

        // Recursively sanitize nested objects
        for (const key in sanitized) {
            if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
                sanitized[key] = this.sanitizePII(sanitized[key]);
            }
        }

        return sanitized;
    }

    /**
     * Partially redact email address
     */
    private redactEmail(email: string): string {
        if (!email || typeof email !== 'string') return '[REDACTED]';

        const [local, domain] = email.split('@');
        if (!local || !domain) return '[REDACTED]';

        const visibleChars = Math.min(3, Math.floor(local.length / 2));
        const redactedLocal = local.substring(0, visibleChars) + '***';

        return `${redactedLocal}@${domain}`;
    }

    /**
     * Trigger alert for critical security events
     */
    private async triggerCriticalAlert(event: SecurityEvent): Promise<void> {
        // Store in critical alerts queue
        try {
            const alertKey = `security:alerts:critical`;
            const alerts = await redisService.get(alertKey) || [];
            alerts.push({
                timestamp: event.timestamp,
                type: event.type,
                message: event.message,
                userId: event.userId,
                ip: event.ip
            });

            // Keep last 100 critical alerts
            if (alerts.length > 100) {
                alerts.shift();
            }

            await redisService.set(alertKey, alerts, 30 * 24 * 60 * 60);

            // In production, this would trigger:
            // - Email notifications to security team
            // - Slack/Discord webhooks
            // - PagerDuty alerts
            // - SIEM integration
            safeLogger.error('[SecurityAlert:CRITICAL]', {
                type: event.type,
                message: event.message,
                userId: event.userId,
                ip: event.ip
            });
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to trigger critical alert:', error);
        }
    }

    /**
     * Get security events by type
     */
    async getEventsByType(type: SecurityEventType, limit: number = 100): Promise<any[]> {
        try {
            const typeKey = `security:events:${type}`;
            const events = await redisService.get(typeKey) || [];
            return events.slice(-limit).reverse();
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to get events by type:', error);
            return [];
        }
    }

    /**
     * Get security events by severity
     */
    async getEventsBySeverity(severity: SecurityEventSeverity, limit: number = 100): Promise<any[]> {
        try {
            const severityKey = `security:events:severity:${severity}`;
            const events = await redisService.get(severityKey) || [];
            return events.slice(-limit).reverse();
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to get events by severity:', error);
            return [];
        }
    }

    /**
     * Get critical alerts
     */
    async getCriticalAlerts(limit: number = 100): Promise<any[]> {
        try {
            const alertKey = `security:alerts:critical`;
            const alerts = await redisService.get(alertKey) || [];
            return alerts.slice(-limit).reverse();
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to get critical alerts:', error);
            return [];
        }
    }

    /**
     * Get security event statistics
     */
    async getEventStatistics(timeRange: number = 24 * 60 * 60 * 1000): Promise<Record<string, number>> {
        const stats: Record<string, number> = {};
        const cutoff = Date.now() - timeRange;

        try {
            for (const type of Object.values(SecurityEventType)) {
                const events = await this.getEventsByType(type as SecurityEventType, 1000);
                stats[type] = events.filter(e => e.timestamp >= cutoff).length;
            }
        } catch (error) {
            safeLogger.error('[SecurityEventLogger] Failed to get event statistics:', error);
        }

        return stats;
    }
}

// Singleton instance
export const securityEventLogger = new SecurityEventLogger();

// Helper functions for common security events
export const logAuthSuccess = (userId: string, ip: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.AUTH_SUCCESS,
        severity: SecurityEventSeverity.INFO,
        userId,
        ip,
        message: 'User authenticated successfully'
    });

export const logAuthFailure = (userId: string | undefined, ip: string, reason: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.AUTH_FAILURE,
        severity: SecurityEventSeverity.WARNING,
        userId,
        ip,
        message: `Authentication failed: ${reason}`
    });

export const logCSRFFailure = (ip: string, path: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.CSRF_VALIDATION_FAILED,
        severity: SecurityEventSeverity.WARNING,
        ip,
        path,
        message: 'CSRF validation failed'
    });

export const logRateLimitExceeded = (userId: string | undefined, ip: string, endpoint: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.RATE_LIMIT_EXCEEDED,
        severity: SecurityEventSeverity.WARNING,
        userId,
        ip,
        message: `Rate limit exceeded for endpoint: ${endpoint}`
    });

export const logSuspiciousActivity = (userId: string | undefined, ip: string, description: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.SUSPICIOUS_ACTIVITY,
        severity: SecurityEventSeverity.ERROR,
        userId,
        ip,
        message: description
    });

export const logMaliciousFile = (userId: string, ip: string, filename: string, reason: string) =>
    securityEventLogger.logEvent({
        type: SecurityEventType.MALICIOUS_FILE_DETECTED,
        severity: SecurityEventSeverity.CRITICAL,
        userId,
        ip,
        message: `Malicious file detected: ${filename}`,
        metadata: { filename, reason }
    });
