/**
 * Security Service
 * Implements rate limiting, session timeouts, and security audit logging
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuthStore } from '../store/authStore';

// Since we need to access the store instance, we'll get it when needed
const authStore = useAuthStore;

// Security configuration
const SECURITY_CONFIG = {
  // Rate limiting
  MAX_AUTH_ATTEMPTS: 5,
  AUTH_WINDOW_MS: 5 * 60 * 1000, // 5 minutes
  LOCKOUT_DURATION_MS: 15 * 60 * 1000, // 15 minutes
  
  // Session timeouts
  SESSION_TIMEOUT_MS: 24 * 60 * 60 * 1000, // 24 hours
  INACTIVE_TIMEOUT_MS: 30 * 60 * 1000, // 30 minutes
  
  // Audit logging
  AUDIT_LOG_RETENTION_DAYS: 30,
  MAX_AUDIT_LOG_SIZE: 1000,
};

// Storage keys
const STORAGE_KEYS = {
  AUTH_ATTEMPTS: 'security_auth_attempts',
  SESSION_START: 'security_session_start',
  LAST_ACTIVITY: 'security_last_activity',
  AUDIT_LOG: 'security_audit_log',
  LOCKOUT_END: 'security_lockout_end',
};

// Audit event types
export type AuditEventType = 
  | 'AUTH_SUCCESS'
  | 'AUTH_FAILED'
  | 'AUTH_LOCKOUT'
  | 'SESSION_EXPIRED'
  | 'SESSION_TIMEOUT'
  | 'RATE_LIMIT_EXCEEDED'
  | 'WALLET_CONNECTED'
  | 'WALLET_DISCONNECTED'
  | 'SIGNATURE_REQUESTED'
  | 'SIGNATURE_APPROVED'
  | 'SIGNATURE_REJECTED'
  | 'SECURITY_VIOLATION';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  eventType: AuditEventType;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  details?: Record<string, any>;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

export interface AuthAttempt {
  timestamp: number;
  success: boolean;
  ipAddress?: string;
}

class SecurityService {
  private lastActivityTime: number = Date.now();
  private activityTimer: NodeJS.Timeout | null = null;
  private sessionTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initializeTimers();
    this.setupActivityTracking();
  }

  /**
   * Initialize security timers
   */
  private initializeTimers() {
    // Session timeout timer
    this.sessionTimer = setInterval(() => {
      this.checkSessionTimeout();
    }, 60 * 1000); // Check every minute

    // Activity tracking timer
    this.activityTimer = setInterval(() => {
      this.checkInactivityTimeout();
    }, 30 * 1000); // Check every 30 seconds
  }

  /**
   * Setup activity tracking
   */
  private setupActivityTracking() {
    // Track user activity
    const trackActivity = () => {
      this.lastActivityTime = Date.now();
      this.updateLastActivity();
    };

    // Listen for various user interactions
    if (typeof window !== 'undefined') {
      window.addEventListener('touchstart', trackActivity);
      window.addEventListener('keypress', trackActivity);
      window.addEventListener('scroll', trackActivity);
    }
  }

  /**
   * Check if authentication is currently locked out
   */
  async isLockedOut(): Promise<boolean> {
    try {
      const lockoutEnd = await AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_END);
      if (!lockoutEnd) return false;

      const lockoutEndTime = parseInt(lockoutEnd, 10);
      const now = Date.now();

      if (now < lockoutEndTime) {
        return true;
      } else {
        // Lockout period expired, clear it
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCKOUT_END);
        return false;
      }
    } catch (error) {
      console.error('Error checking lockout status:', error);
      return false;
    }
  }

  /**
   * Record an authentication attempt
   */
  async recordAuthAttempt(success: boolean, ipAddress?: string): Promise<void> {
    try {
      const now = Date.now();
      const attempt: AuthAttempt = {
        timestamp: now,
        success,
        ipAddress
      };

      // Get existing attempts
      const attemptsJson = await AsyncStorage.getItem(STORAGE_KEYS.AUTH_ATTEMPTS);
      const attempts: AuthAttempt[] = attemptsJson ? JSON.parse(attemptsJson) : [];

      // Add new attempt
      attempts.push(attempt);

      // Filter out old attempts outside the window
      const cutoffTime = now - SECURITY_CONFIG.AUTH_WINDOW_MS;
      const recentAttempts = attempts.filter(a => a.timestamp > cutoffTime);

      // Save updated attempts
      await AsyncStorage.setItem(STORAGE_KEYS.AUTH_ATTEMPTS, JSON.stringify(recentAttempts));

      // Check if we need to enforce lockout
      if (!success) {
        const failedAttempts = recentAttempts.filter(a => !a.success);
        if (failedAttempts.length >= SECURITY_CONFIG.MAX_AUTH_ATTEMPTS) {
          await this.enforceLockout();
        }
      }

      // Log the attempt
      await this.logAuditEvent(
        success ? 'AUTH_SUCCESS' : 'AUTH_FAILED',
        success ? 'LOW' : 'MEDIUM',
        { 
          success,
          attemptCount: recentAttempts.length,
          failedCount: recentAttempts.filter(a => !a.success).length
        }
      );

    } catch (error) {
      console.error('Error recording auth attempt:', error);
    }
  }

  /**
   * Enforce authentication lockout
   */
  private async enforceLockout(): Promise<void> {
    try {
      const lockoutEnd = Date.now() + SECURITY_CONFIG.LOCKOUT_DURATION_MS;
      await AsyncStorage.setItem(STORAGE_KEYS.LOCKOUT_END, lockoutEnd.toString());
      
      await this.logAuditEvent('AUTH_LOCKOUT', 'HIGH', {
        duration: SECURITY_CONFIG.LOCKOUT_DURATION_MS
      });

      console.warn('Authentication locked out due to excessive failed attempts');
    } catch (error) {
      console.error('Error enforcing lockout:', error);
    }
  }

  /**
   * Check session timeout
   */
  private async checkSessionTimeout(): Promise<void> {
    try {
      const sessionStart = await AsyncStorage.getItem(STORAGE_KEYS.SESSION_START);
      if (!sessionStart) return;

      const startTime = parseInt(sessionStart, 10);
      const now = Date.now();
      const sessionAge = now - startTime;

      if (sessionAge > SECURITY_CONFIG.SESSION_TIMEOUT_MS) {
        await this.handleSessionExpired();
      }
    } catch (error) {
      console.error('Error checking session timeout:', error);
    }
  }

  /**
   * Check inactivity timeout
   */
  private async checkInactivityTimeout(): Promise<void> {
    try {
      const lastActivity = await AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY);
      if (!lastActivity) return;

      const lastActivityTime = parseInt(lastActivity, 10);
      const now = Date.now();
      const inactiveDuration = now - lastActivityTime;

      if (inactiveDuration > SECURITY_CONFIG.INACTIVE_TIMEOUT_MS) {
        await this.handleSessionTimeout();
      }
    } catch (error) {
      console.error('Error checking inactivity timeout:', error);
    }
  }

  /**
   * Handle session expiration
   */
  private async handleSessionExpired(): Promise<void> {
    try {
      await this.logAuditEvent('SESSION_EXPIRED', 'MEDIUM');
      await this.clearSessionData();
      
      // Clear auth store
      authStore.getState().logout();
      
      console.log('Session expired due to maximum duration');
    } catch (error) {
      console.error('Error handling session expiration:', error);
    }
  }

  /**
   * Handle session timeout due to inactivity
   */
  private async handleSessionTimeout(): Promise<void> {
    try {
      await this.logAuditEvent('SESSION_TIMEOUT', 'LOW');
      await this.clearSessionData();
      
      // Clear auth store
      authStore.getState().logout();
      
      console.log('Session timed out due to inactivity');
    } catch (error) {
      console.error('Error handling session timeout:', error);
    }
  }

  /**
   * Start a new session
   */
  async startSession(): Promise<void> {
    try {
      const now = Date.now().toString();
      await AsyncStorage.setItem(STORAGE_KEYS.SESSION_START, now);
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, now);
      
      await this.logAuditEvent('AUTH_SUCCESS', 'LOW', {
        sessionStart: now
      });
    } catch (error) {
      console.error('Error starting session:', error);
    }
  }

  /**
   * Update last activity timestamp
   */
  private async updateLastActivity(): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.LAST_ACTIVITY, Date.now().toString());
    } catch (error) {
      console.error('Error updating last activity:', error);
    }
  }

  /**
   * Log a security audit event
   */
  async logAuditEvent(
    eventType: AuditEventType,
    severity: AuditLogEntry['severity'] = 'LOW',
    details?: Record<string, any>
  ): Promise<void> {
    try {
      const entry: AuditLogEntry = {
        id: Math.random().toString(36).substr(2, 9),
        timestamp: new Date(),
        eventType,
        userId: authStore.getState().user?.id,
        severity,
        details
      };

      // Get existing logs
      const logsJson = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      const logs: AuditLogEntry[] = logsJson ? JSON.parse(logsJson) : [];

      // Add new entry
      logs.push(entry);

      // Clean up old entries
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - SECURITY_CONFIG.AUDIT_LOG_RETENTION_DAYS);
      
      const cleanedLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );

      // Limit log size
      if (cleanedLogs.length > SECURITY_CONFIG.MAX_AUDIT_LOG_SIZE) {
        cleanedLogs.splice(0, cleanedLogs.length - SECURITY_CONFIG.MAX_AUDIT_LOG_SIZE);
      }

      // Save updated logs
      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(cleanedLogs));

      // Console logging for critical events
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        console.warn(`SECURITY ALERT [${eventType}]:`, details);
      }

    } catch (error) {
      console.error('Error logging audit event:', error);
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(limit?: number): Promise<AuditLogEntry[]> {
    try {
      const logsJson = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      const logs: AuditLogEntry[] = logsJson ? JSON.parse(logsJson) : [];
      
      // Sort by timestamp (newest first)
      logs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      
      return limit ? logs.slice(0, limit) : logs;
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  /**
   * Clear session data
   */
  private async clearSessionData(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.SESSION_START,
        STORAGE_KEYS.LAST_ACTIVITY,
        STORAGE_KEYS.AUTH_ATTEMPTS
      ]);
    } catch (error) {
      console.error('Error clearing session data:', error);
    }
  }

  /**
   * Cleanup old audit logs
   */
  async cleanupOldLogs(): Promise<void> {
    try {
      const logsJson = await AsyncStorage.getItem(STORAGE_KEYS.AUDIT_LOG);
      if (!logsJson) return;

      const logs: AuditLogEntry[] = JSON.parse(logsJson);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - SECURITY_CONFIG.AUDIT_LOG_RETENTION_DAYS);
      
      const cleanedLogs = logs.filter(log => 
        new Date(log.timestamp) > cutoffDate
      );

      await AsyncStorage.setItem(STORAGE_KEYS.AUDIT_LOG, JSON.stringify(cleanedLogs));
    } catch (error) {
      console.error('Error cleaning up old logs:', error);
    }
  }

  /**
   * Reset security state (for testing/debugging)
   */
  async resetSecurityState(): Promise<void> {
    try {
      await AsyncStorage.multiRemove([
        STORAGE_KEYS.AUTH_ATTEMPTS,
        STORAGE_KEYS.SESSION_START,
        STORAGE_KEYS.LAST_ACTIVITY,
        STORAGE_KEYS.AUDIT_LOG,
        STORAGE_KEYS.LOCKOUT_END
      ]);
      
      this.lastActivityTime = Date.now();
    } catch (error) {
      console.error('Error resetting security state:', error);
    }
  }

  /**
   * Get security status
   */
  async getSecurityStatus(): Promise<{
    isLockedOut: boolean;
    lockoutEndTime?: number;
    sessionStartTime?: number;
    lastActivityTime?: number;
    recentAttempts: number;
    failedAttempts: number;
  }> {
    try {
      const [
        lockoutEnd,
        sessionStart,
        lastActivity,
        attemptsJson
      ] = await Promise.all([
        AsyncStorage.getItem(STORAGE_KEYS.LOCKOUT_END),
        AsyncStorage.getItem(STORAGE_KEYS.SESSION_START),
        AsyncStorage.getItem(STORAGE_KEYS.LAST_ACTIVITY),
        AsyncStorage.getItem(STORAGE_KEYS.AUTH_ATTEMPTS)
      ]);

      const attempts: AuthAttempt[] = attemptsJson ? JSON.parse(attemptsJson) : [];
      const now = Date.now();
      const cutoffTime = now - SECURITY_CONFIG.AUTH_WINDOW_MS;
      const recentAttempts = attempts.filter(a => a.timestamp > cutoffTime);
      
      return {
        isLockedOut: lockoutEnd ? now < parseInt(lockoutEnd, 10) : false,
        lockoutEndTime: lockoutEnd ? parseInt(lockoutEnd, 10) : undefined,
        sessionStartTime: sessionStart ? parseInt(sessionStart, 10) : undefined,
        lastActivityTime: lastActivity ? parseInt(lastActivity, 10) : undefined,
        recentAttempts: recentAttempts.length,
        failedAttempts: recentAttempts.filter(a => !a.success).length
      };
    } catch (error) {
      console.error('Error getting security status:', error);
      return {
        isLockedOut: false,
        recentAttempts: 0,
        failedAttempts: 0
      };
    }
  }
}

// Export singleton instance
export const securityService = new SecurityService();
export default securityService;