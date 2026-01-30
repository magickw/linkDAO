/**
 * Security Monitoring Service
 * Tracks security events and provides alerts for suspicious activity
 */

import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { authAttempts, authSessions } from '../db/schema';
import { eq, and, gt, sql, desc } from 'drizzle-orm';

interface SecurityEvent {
  type: 'login_success' | 'login_failure' | 'session_created' | 'session_revoked' | 'suspicious_activity';
  userId?: string;
  walletAddress: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

interface SecurityAlert {
  level: 'low' | 'medium' | 'high' | 'critical';
  type: string;
  message: string;
  walletAddress: string;
  details: Record<string, any>;
  timestamp: Date;
}

export class SecurityMonitoringService {
  private static instance: SecurityMonitoringService;
  private eventBuffer: SecurityEvent[] = [];
  private alertThresholds = {
    multipleFailedLogins: 5, // Alert after 5 failed attempts
    rapidSessionCreation: 10, // Alert after 10 sessions in 1 hour
    unusualLocation: true, // Alert on location change
    unusualDevice: true, // Alert on device change
  };

  private constructor() {}

  static getInstance(): SecurityMonitoringService {
    if (!SecurityMonitoringService.instance) {
      SecurityMonitoringService.instance = new SecurityMonitoringService();
    }
    return SecurityMonitoringService.instance;
  }

  /**
   * Log a security event
   */
  async logEvent(event: SecurityEvent): Promise<void> {
    try {
      // Add to buffer
      this.eventBuffer.push(event);

      // Check for suspicious patterns
      await this.checkForSuspiciousActivity(event);

      // Log to console for now (in production, send to monitoring service)
      safeLogger.info('Security event:', {
        type: event.type,
        walletAddress: event.walletAddress,
        timestamp: event.timestamp
      });
    } catch (error) {
      safeLogger.error('Failed to log security event:', error);
    }
  }

  /**
   * Check for suspicious activity patterns
   */
  private async checkForSuspiciousActivity(event: SecurityEvent): Promise<void> {
    try {
      const alerts: SecurityAlert[] = [];

      // Check 1: Multiple failed login attempts
      if (event.type === 'login_failure') {
        const failedAttempts = await this.getRecentFailedAttempts(
          event.walletAddress,
          15 * 60 * 1000 // 15 minutes
        );

        if (failedAttempts >= this.alertThresholds.multipleFailedLogins) {
          alerts.push({
            level: 'high',
            type: 'multiple_failed_logins',
            message: `Multiple failed login attempts detected (${failedAttempts} in 15 minutes)`,
            walletAddress: event.walletAddress,
            details: { failedAttempts, timeframe: '15 minutes' },
            timestamp: new Date()
          });
        }
      }

      // Check 2: Rapid session creation
      if (event.type === 'session_created') {
        const recentSessions = await this.getRecentSessionCreations(
          event.walletAddress,
          60 * 60 * 1000 // 1 hour
        );

        if (recentSessions >= this.alertThresholds.rapidSessionCreation) {
          alerts.push({
            level: 'medium',
            type: 'rapid_session_creation',
            message: `Rapid session creation detected (${recentSessions} sessions in 1 hour)`,
            walletAddress: event.walletAddress,
            details: { recentSessions, timeframe: '1 hour' },
            timestamp: new Date()
          });
        }
      }

      // Check 3: Unusual IP address
      if (event.type === 'login_success' && event.ipAddress) {
        const lastLogin = await this.getLastSuccessfulLogin(event.walletAddress);

        if (lastLogin && lastLogin.ipAddress !== event.ipAddress) {
          alerts.push({
            level: 'medium',
            type: 'location_change',
            message: `Login from new IP address detected`,
            walletAddress: event.walletAddress,
            details: {
              previousIp: lastLogin.ipAddress,
              currentIp: event.ipAddress,
              previousLoginTime: lastLogin.timestamp
            },
            timestamp: new Date()
          });
        }
      }

      // Process alerts
      for (const alert of alerts) {
        await this.processAlert(alert);
      }
    } catch (error) {
      safeLogger.error('Failed to check for suspicious activity:', error);
    }
  }

  /**
   * Process a security alert
   */
  private async processAlert(alert: SecurityAlert): Promise<void> {
    try {
      // Log alert
      safeLogger.warn('🚨 SECURITY ALERT:', {
        level: alert.level,
        type: alert.type,
        message: alert.message,
        walletAddress: alert.walletAddress,
        details: alert.details,
        timestamp: alert.timestamp
      });

      // In production, you would:
      // 1. Send to alerting system (Slack, PagerDuty, etc.)
      // 2. Store in security alerts table
      // 3. Potentially trigger automated responses (e.g., lock account)
      // 4. Send notification to user

      // For now, just log
      if (alert.level === 'high' || alert.level === 'critical') {
        console.error('🚨 CRITICAL SECURITY ALERT:', alert);
      }
    } catch (error) {
      safeLogger.error('Failed to process security alert:', error);
    }
  }

  /**
   * Get recent failed login attempts
   */
  private async getRecentFailedAttempts(
    walletAddress: string,
    timeframeMs: number
  ): Promise<number> {
    try {
      const timeframeAgo = new Date(Date.now() - timeframeMs);

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.walletAddress, walletAddress),
            eq(authAttempts.success, false),
            gt(authAttempts.createdAt, timeframeAgo)
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Failed to get recent failed attempts:', error);
      return 0;
    }
  }

  /**
   * Get recent session creations
   */
  private async getRecentSessionCreations(
    walletAddress: string,
    timeframeMs: number
  ): Promise<number> {
    try {
      const timeframeAgo = new Date(Date.now() - timeframeMs);

      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(authSessions)
        .where(
          and(
            eq(authSessions.walletAddress, walletAddress),
            gt(authSessions.createdAt, timeframeAgo)
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      safeLogger.error('Failed to get recent session creations:', error);
      return 0;
    }
  }

  /**
   * Get last successful login
   */
  private async getLastSuccessfulLogin(
    walletAddress: string
  ): Promise<{ ipAddress: string; timestamp: Date } | null> {
    try {
      const result = await db
        .select({
          ipAddress: authAttempts.ipAddress,
          timestamp: authAttempts.createdAt
        })
        .from(authAttempts)
        .where(
          and(
            eq(authAttempts.walletAddress, walletAddress),
            eq(authAttempts.success, true)
          )
        )
        .orderBy(desc(authAttempts.createdAt))
        .limit(1);

      if (result.length > 0) {
        return {
          ipAddress: result[0].ipAddress || 'unknown',
          timestamp: result[0].timestamp
        };
      }

      return null;
    } catch (error) {
      safeLogger.error('Failed to get last successful login:', error);
      return null;
    }
  }

  /**
   * Get security summary for a user
   */
  async getSecuritySummary(walletAddress: string): Promise<{
    failedLogins24h: number;
    successfulLogins24h: number;
    activeSessions: number;
    lastLogin: Date | null;
    lastFailedLogin: Date | null;
    riskLevel: 'low' | 'medium' | 'high';
  }> {
    try {
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

      const [failedLogins, successfulLogins, activeSessions] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)` })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.walletAddress, walletAddress),
              eq(authAttempts.success, false),
              gt(authAttempts.createdAt, oneDayAgo)
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.walletAddress, walletAddress),
              eq(authAttempts.success, true),
              gt(authAttempts.createdAt, oneDayAgo)
            )
          ),
        db
          .select({ count: sql<number>`count(*)` })
          .from(authSessions)
          .where(
            and(
              eq(authSessions.walletAddress, walletAddress),
              eq(authSessions.isActive, true)
            )
          )
      ]);

      const failedLogins24h = failedLogins[0]?.count || 0;
      const successfulLogins24h = successfulLogins[0]?.count || 0;
      const activeSessionsCount = activeSessions[0]?.count || 0;

      // Get last login attempts
      const [lastSuccess, lastFailure] = await Promise.all([
        db
          .select({ createdAt: authAttempts.createdAt })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.walletAddress, walletAddress),
              eq(authAttempts.success, true)
            )
          )
          .orderBy(desc(authAttempts.createdAt))
          .limit(1),
        db
          .select({ createdAt: authAttempts.createdAt })
          .from(authAttempts)
          .where(
            and(
              eq(authAttempts.walletAddress, walletAddress),
              eq(authAttempts.success, false)
            )
          )
          .orderBy(desc(authAttempts.createdAt))
          .limit(1)
      ]);

      const lastLogin = lastSuccess[0]?.createdAt || null;
      const lastFailedLogin = lastFailure[0]?.createdAt || null;

      // Calculate risk level
      let riskLevel: 'low' | 'medium' | 'high' = 'low';

      if (failedLogins24h >= 10 || activeSessionsCount > 5) {
        riskLevel = 'high';
      } else if (failedLogins24h >= 5 || activeSessionsCount > 3) {
        riskLevel = 'medium';
      }

      return {
        failedLogins24h,
        successfulLogins24h,
        activeSessions: activeSessionsCount,
        lastLogin,
        lastFailedLogin,
        riskLevel
      };
    } catch (error) {
      safeLogger.error('Failed to get security summary:', error);
      return {
        failedLogins24h: 0,
        successfulLogins24h: 0,
        activeSessions: 0,
        lastLogin: null,
        lastFailedLogin: null,
        riskLevel: 'low'
      };
    }
  }
}

export const securityMonitoringService = SecurityMonitoringService.getInstance();