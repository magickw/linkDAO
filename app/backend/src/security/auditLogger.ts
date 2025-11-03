/**
 * Audit Logging System for Security Monitoring and Compliance
 * Comprehensive audit logging for the enhanced social dashboard backend
 */

import { Request } from 'express';
import { safeLogger } from '../utils/safeLogger';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

export interface AuditLogEntry {
  id: string;
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'critical';
  category: AuditCategory;
  action: string;
  userId?: string;
  walletAddress?: string;
  ipAddress?: string;
  userAgent?: string;
  resource?: string;
  details: Record<string, any>;
  result: 'success' | 'failure' | 'blocked';
  riskScore?: number;
  sessionId?: string;
  correlationId?: string;
}

export type AuditCategory = 
  | 'authentication'
  | 'authorization'
  | 'data_access'
  | 'data_modification'
  | 'transaction'
  | 'security_event'
  | 'system_event'
  | 'compliance'
  | 'privacy'
  | 'content_moderation';

export interface AuditLogConfig {
  logLevel: 'info' | 'warn' | 'error' | 'critical';
  enableFileLogging: boolean;
  enableDatabaseLogging: boolean;
  enableRemoteLogging: boolean;
  logDirectory: string;
  maxFileSize: number;
  maxFiles: number;
  encryptLogs: boolean;
  compressLogs: boolean;
  retentionDays: number;
  remoteEndpoint?: string;
  apiKey?: string;
}

export interface SecurityMetrics {
  totalEvents: number;
  eventsByCategory: Record<AuditCategory, number>;
  eventsByLevel: Record<string, number>;
  failureRate: number;
  topRiskyUsers: Array<{ userId: string; riskScore: number; eventCount: number }>;
  suspiciousPatterns: SuspiciousPattern[];
}

export interface SuspiciousPattern {
  pattern: string;
  description: string;
  occurrences: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  firstSeen: Date;
  lastSeen: Date;
}

export class AuditLogger {
  private static instance: AuditLogger;
  private config: AuditLogConfig;
  private logBuffer: AuditLogEntry[] = [];
  private flushInterval: NodeJS.Timeout | null = null;
  private encryptionKey: Buffer | null = null;

  private static readonly DEFAULT_CONFIG: AuditLogConfig = {
    logLevel: 'info',
    enableFileLogging: true,
    enableDatabaseLogging: true,
    enableRemoteLogging: false,
    logDirectory: './logs/audit',
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 30,
    encryptLogs: true,
    compressLogs: true,
    retentionDays: 90
  };

  private constructor(config: Partial<AuditLogConfig> = {}) {
    this.config = { ...AuditLogger.DEFAULT_CONFIG, ...config };
    this.initialize();
  }

  public static getInstance(config?: Partial<AuditLogConfig>): AuditLogger {
    if (!AuditLogger.instance) {
      AuditLogger.instance = new AuditLogger(config);
    }
    return AuditLogger.instance;
  }

  /**
   * Initialize the audit logger
   */
  private async initialize(): Promise<void> {
    try {
      // Create log directory
      if (this.config.enableFileLogging) {
        await fs.mkdir(this.config.logDirectory, { recursive: true });
      }

      // Initialize encryption
      if (this.config.encryptLogs) {
        this.encryptionKey = crypto.randomBytes(32);
      }

      // Start flush interval
      this.startFlushInterval();

      // Log initialization
      await this.log({
        level: 'info',
        category: 'system_event',
        action: 'audit_logger_initialized',
        details: {
          config: {
            ...this.config,
            apiKey: this.config.apiKey ? '[REDACTED]' : undefined
          }
        },
        result: 'success'
      });

    } catch (error) {
      safeLogger.error('Failed to initialize audit logger:', error);
    }
  }

  /**
   * Log an audit event
   */
  public async log(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): Promise<void> {
    try {
      const auditEntry: AuditLogEntry = {
        id: this.generateId(),
        timestamp: new Date(),
        ...entry
      };

      // Check log level
      if (!this.shouldLog(entry.level)) {
        return;
      }

      // Add to buffer
      this.logBuffer.push(auditEntry);

      // Immediate flush for critical events
      if (entry.level === 'critical') {
        await this.flush();
      }

    } catch (error) {
      safeLogger.error('Failed to log audit entry:', error);
    }
  }

  /**
   * Log authentication event
   */
  public async logAuth(
    action: 'login' | 'logout' | 'login_failed' | 'session_expired',
    req: Request,
    userId?: string,
    walletAddress?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: action === 'login_failed' ? 'warn' : 'info',
      category: 'authentication',
      action,
      userId,
      walletAddress,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).session?.id,
      details,
      result: action === 'login_failed' ? 'failure' : 'success'
    });
  }

  /**
   * Log authorization event
   */
  public async logAuthz(
    action: string,
    req: Request,
    resource: string,
    userId?: string,
    allowed: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: allowed ? 'info' : 'warn',
      category: 'authorization',
      action,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      resource,
      sessionId: (req as any).session?.id,
      details,
      result: allowed ? 'success' : 'blocked'
    });
  }

  /**
   * Log data access event
   */
  public async logDataAccess(
    action: string,
    req: Request,
    resource: string,
    userId?: string,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: 'info',
      category: 'data_access',
      action,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      resource,
      sessionId: (req as any).session?.id,
      details,
      result: 'success'
    });
  }

  /**
   * Log data modification event
   */
  public async logDataModification(
    action: string,
    req: Request,
    resource: string,
    userId?: string,
    oldValue?: any,
    newValue?: any,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: 'info',
      category: 'data_modification',
      action,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      resource,
      sessionId: (req as any).session?.id,
      details: {
        ...details,
        oldValue: this.sanitizeValue(oldValue),
        newValue: this.sanitizeValue(newValue)
      },
      result: 'success'
    });
  }

  /**
   * Log transaction event
   */
  public async logTransaction(
    action: string,
    req: Request,
    transactionHash?: string,
    walletAddress?: string,
    amount?: string,
    token?: string,
    success: boolean = true,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: success ? 'info' : 'error',
      category: 'transaction',
      action,
      walletAddress,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).session?.id,
      details: {
        ...details,
        transactionHash,
        amount,
        token
      },
      result: success ? 'success' : 'failure'
    });
  }

  /**
   * Log security event
   */
  public async logSecurity(
    action: string,
    req: Request,
    level: 'info' | 'warn' | 'error' | 'critical' = 'warn',
    userId?: string,
    riskScore?: number,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level,
      category: 'security_event',
      action,
      userId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      sessionId: (req as any).session?.id,
      riskScore,
      details,
      result: level === 'critical' ? 'blocked' : 'success'
    });
  }

  /**
   * Log content moderation event
   */
  public async logContentModeration(
    action: string,
    req: Request,
    contentId: string,
    contentType: string,
    moderatorId?: string,
    automated: boolean = false,
    details: Record<string, any> = {}
  ): Promise<void> {
    await this.log({
      level: 'info',
      category: 'content_moderation',
      action,
      userId: moderatorId,
      ipAddress: this.getClientIP(req),
      userAgent: req.get('User-Agent'),
      resource: `${contentType}:${contentId}`,
      sessionId: (req as any).session?.id,
      details: {
        ...details,
        contentId,
        contentType,
        automated
      },
      result: 'success'
    });
  }

  /**
   * Get security metrics
   */
  public async getSecurityMetrics(
    startDate: Date,
    endDate: Date
  ): Promise<SecurityMetrics> {
    try {
      // This would typically query a database
      // For now, we'll analyze the current buffer and recent logs
      const logs = await this.getLogsInRange(startDate, endDate);

      const totalEvents = logs.length;
      const eventsByCategory: Record<AuditCategory, number> = {} as any;
      const eventsByLevel: Record<string, number> = {};
      const userRiskScores: Record<string, { total: number; count: number }> = {};

      logs.forEach(log => {
        // Count by category
        eventsByCategory[log.category] = (eventsByCategory[log.category] || 0) + 1;

        // Count by level
        eventsByLevel[log.level] = (eventsByLevel[log.level] || 0) + 1;

        // Track user risk scores
        if (log.userId && log.riskScore) {
          if (!userRiskScores[log.userId]) {
            userRiskScores[log.userId] = { total: 0, count: 0 };
          }
          userRiskScores[log.userId].total += log.riskScore;
          userRiskScores[log.userId].count += 1;
        }
      });

      const failureEvents = logs.filter(log => log.result === 'failure' || log.result === 'blocked');
      const failureRate = totalEvents > 0 ? failureEvents.length / totalEvents : 0;

      const topRiskyUsers = Object.entries(userRiskScores)
        .map(([userId, scores]) => ({
          userId,
          riskScore: scores.total / scores.count,
          eventCount: scores.count
        }))
        .sort((a, b) => b.riskScore - a.riskScore)
        .slice(0, 10);

      const suspiciousPatterns = await this.detectSuspiciousPatterns(logs);

      return {
        totalEvents,
        eventsByCategory,
        eventsByLevel,
        failureRate,
        topRiskyUsers,
        suspiciousPatterns
      };

    } catch (error) {
      safeLogger.error('Failed to get security metrics:', error);
      throw error;
    }
  }

  /**
   * Search audit logs
   */
  public async searchLogs(
    filters: {
      startDate?: Date;
      endDate?: Date;
      level?: string;
      category?: AuditCategory;
      userId?: string;
      walletAddress?: string;
      action?: string;
      result?: string;
    },
    limit: number = 100,
    offset: number = 0
  ): Promise<AuditLogEntry[]> {
    try {
      // This would typically query a database
      // For now, we'll search through available logs
      const allLogs = await this.getAllLogs();

      let filteredLogs = allLogs;

      if (filters.startDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp >= filters.startDate!);
      }

      if (filters.endDate) {
        filteredLogs = filteredLogs.filter(log => log.timestamp <= filters.endDate!);
      }

      if (filters.level) {
        filteredLogs = filteredLogs.filter(log => log.level === filters.level);
      }

      if (filters.category) {
        filteredLogs = filteredLogs.filter(log => log.category === filters.category);
      }

      if (filters.userId) {
        filteredLogs = filteredLogs.filter(log => log.userId === filters.userId);
      }

      if (filters.walletAddress) {
        filteredLogs = filteredLogs.filter(log => 
          log.walletAddress?.toLowerCase() === filters.walletAddress!.toLowerCase()
        );
      }

      if (filters.action) {
        filteredLogs = filteredLogs.filter(log => 
          log.action.toLowerCase().includes(filters.action!.toLowerCase())
        );
      }

      if (filters.result) {
        filteredLogs = filteredLogs.filter(log => log.result === filters.result);
      }

      return filteredLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(offset, offset + limit);

    } catch (error) {
      safeLogger.error('Failed to search logs:', error);
      throw error;
    }
  }

  /**
   * Flush log buffer to storage
   */
  private async flush(): Promise<void> {
    if (this.logBuffer.length === 0) {
      return;
    }

    const logsToFlush = [...this.logBuffer];
    this.logBuffer = [];

    try {
      // Write to file
      if (this.config.enableFileLogging) {
        await this.writeToFile(logsToFlush);
      }

      // Write to database
      if (this.config.enableDatabaseLogging) {
        await this.writeToDatabase(logsToFlush);
      }

      // Send to remote endpoint
      if (this.config.enableRemoteLogging && this.config.remoteEndpoint) {
        await this.sendToRemote(logsToFlush);
      }

    } catch (error) {
      safeLogger.error('Failed to flush audit logs:', error);
      // Put logs back in buffer for retry
      this.logBuffer.unshift(...logsToFlush);
    }
  }

  /**
   * Write logs to file
   */
  private async writeToFile(logs: AuditLogEntry[]): Promise<void> {
    try {
      const logFile = path.join(
        this.config.logDirectory,
        `audit-${new Date().toISOString().split('T')[0]}.log`
      );

      const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      
      let dataToWrite = logLines;
      
      // Encrypt if enabled
      if (this.config.encryptLogs && this.encryptionKey) {
        dataToWrite = this.encrypt(logLines);
      }

      await fs.appendFile(logFile, dataToWrite);

      // Check file size and rotate if needed
      await this.rotateLogsIfNeeded(logFile);

    } catch (error) {
      safeLogger.error('Failed to write logs to file:', error);
      throw error;
    }
  }

  /**
   * Write logs to database
   */
  private async writeToDatabase(logs: AuditLogEntry[]): Promise<void> {
    try {
      // This would typically use your database connection
      // For now, we'll just log to console
      safeLogger.info(`Would write ${logs.length} audit logs to database`);
    } catch (error) {
      safeLogger.error('Failed to write logs to database:', error);
      throw error;
    }
  }

  /**
   * Send logs to remote endpoint
   */
  private async sendToRemote(logs: AuditLogEntry[]): Promise<void> {
    try {
      if (!this.config.remoteEndpoint || !this.config.apiKey) {
        return;
      }

      const response = await fetch(this.config.remoteEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`
        },
        body: JSON.stringify({ logs })
      });

      if (!response.ok) {
        throw new Error(`Remote logging failed: ${response.statusText}`);
      }

    } catch (error) {
      safeLogger.error('Failed to send logs to remote endpoint:', error);
      throw error;
    }
  }

  /**
   * Helper methods
   */
  private generateId(): string {
    return `audit_${Date.now()}_${crypto.randomBytes(8).toString('hex')}`;
  }

  private shouldLog(level: string): boolean {
    const levels = ['info', 'warn', 'error', 'critical'];
    const configLevelIndex = levels.indexOf(this.config.logLevel);
    const entryLevelIndex = levels.indexOf(level);
    return entryLevelIndex >= configLevelIndex;
  }

  private getClientIP(req: Request): string {
    return (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
           req.connection.remoteAddress ||
           req.socket.remoteAddress ||
           'unknown';
  }

  private sanitizeValue(value: any): any {
    if (typeof value === 'string') {
      // Remove potential sensitive data
      return value.replace(/password|token|key|secret/gi, '[REDACTED]');
    }
    if (typeof value === 'object' && value !== null) {
      const sanitized: any = {};
      for (const [key, val] of Object.entries(value)) {
        if (/password|token|key|secret/i.test(key)) {
          sanitized[key] = '[REDACTED]';
        } else {
          sanitized[key] = this.sanitizeValue(val);
        }
      }
      return sanitized;
    }
    return value;
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      return data;
    }

    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', this.encryptionKey);
      let encrypted = cipher.update(data, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch {
      return data;
    }
  }

  private startFlushInterval(): void {
    this.flushInterval = setInterval(() => {
      this.flush().catch(safeLogger.error);
    }, 5000); // Flush every 5 seconds
  }

  private async rotateLogsIfNeeded(logFile: string): Promise<void> {
    try {
      const stats = await fs.stat(logFile);
      if (stats.size > this.config.maxFileSize) {
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const rotatedFile = logFile.replace('.log', `-${timestamp}.log`);
        await fs.rename(logFile, rotatedFile);

        // Compress if enabled
        if (this.config.compressLogs) {
          // Would implement compression here
        }
      }
    } catch (error) {
      safeLogger.error('Failed to rotate logs:', error);
    }
  }

  private async getLogsInRange(startDate: Date, endDate: Date): Promise<AuditLogEntry[]> {
    // This would typically query a database
    // For now, return empty array
    return [];
  }

  private async getAllLogs(): Promise<AuditLogEntry[]> {
    // This would typically query a database
    // For now, return current buffer
    return [...this.logBuffer];
  }

  private async detectSuspiciousPatterns(logs: AuditLogEntry[]): Promise<SuspiciousPattern[]> {
    const patterns: SuspiciousPattern[] = [];

    // Detect multiple failed login attempts
    const failedLogins = logs.filter(log => 
      log.category === 'authentication' && 
      log.action === 'login_failed'
    );

    if (failedLogins.length > 5) {
      patterns.push({
        pattern: 'multiple_failed_logins',
        description: 'Multiple failed login attempts detected',
        occurrences: failedLogins.length,
        riskLevel: 'high',
        firstSeen: failedLogins[failedLogins.length - 1].timestamp,
        lastSeen: failedLogins[0].timestamp
      });
    }

    // Detect unusual access patterns
    const accessLogs = logs.filter(log => log.category === 'data_access');
    const ipCounts: Record<string, number> = {};
    
    accessLogs.forEach(log => {
      if (log.ipAddress) {
        ipCounts[log.ipAddress] = (ipCounts[log.ipAddress] || 0) + 1;
      }
    });

    Object.entries(ipCounts).forEach(([ip, count]) => {
      if (count > 100) {
        patterns.push({
          pattern: 'high_volume_access',
          description: `High volume access from IP ${ip}`,
          occurrences: count,
          riskLevel: count > 500 ? 'critical' : 'high',
          firstSeen: new Date(),
          lastSeen: new Date()
        });
      }
    });

    return patterns;
  }
}

export default AuditLogger;
