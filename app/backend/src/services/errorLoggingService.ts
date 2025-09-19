import { Request } from 'express';
import { AppError } from '../middleware/errorHandler';

export interface ErrorLogEntry {
  id: string;
  timestamp: Date;
  level: 'error' | 'warn' | 'info';
  code: string;
  message: string;
  statusCode?: number;
  stack?: string;
  context: {
    method?: string;
    url?: string;
    userAgent?: string;
    ip?: string;
    userId?: string;
    requestId?: string;
    additionalData?: any;
  };
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  tags: string[];
}

export interface ErrorStats {
  totalErrors: number;
  errorsByCode: { [code: string]: number };
  errorsByLevel: { [level: string]: number };
  recentErrors: ErrorLogEntry[];
  topErrors: Array<{ code: string; count: number; lastOccurred: Date }>;
  resolutionRate: number;
  averageResolutionTime: number;
}

export class ErrorLoggingService {
  private static logs: ErrorLogEntry[] = [];
  private static maxLogs = 10000; // Keep last 10k logs in memory
  private static alertThresholds = {
    errorRate: 10, // errors per minute
    criticalErrors: 5, // critical errors per hour
    unresolved: 50 // unresolved errors
  };

  // Log an error with context
  static logError(
    error: AppError | Error,
    req?: Request,
    additionalContext?: any
  ): string {
    const errorId = this.generateErrorId();
    const isAppError = error instanceof AppError;

    const logEntry: ErrorLogEntry = {
      id: errorId,
      timestamp: new Date(),
      level: this.getLogLevel(error),
      code: isAppError ? error.code : 'UNKNOWN_ERROR',
      message: error.message,
      statusCode: isAppError ? error.statusCode : undefined,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      context: {
        method: req?.method,
        url: req?.originalUrl,
        userAgent: req?.get('User-Agent'),
        ip: req?.ip,
        userId: (req as any)?.user?.id,
        requestId: req?.headers['x-request-id'] as string,
        additionalData: additionalContext
      },
      resolved: false,
      tags: this.generateTags(error, req)
    };

    // Add to logs
    this.logs.push(logEntry);

    // Trim logs if exceeding max
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Check for alerts
    this.checkAlerts();

    // Console logging based on level
    this.consoleLog(logEntry);

    return errorId;
  }

  // Mark error as resolved
  static resolveError(errorId: string, resolvedBy: string): boolean {
    const logEntry = this.logs.find(log => log.id === errorId);
    if (logEntry && !logEntry.resolved) {
      logEntry.resolved = true;
      logEntry.resolvedAt = new Date();
      logEntry.resolvedBy = resolvedBy;
      return true;
    }
    return false;
  }

  // Get error statistics
  static getErrorStats(timeRange?: { start: Date; end: Date }): ErrorStats {
    let filteredLogs = this.logs;

    if (timeRange) {
      filteredLogs = this.logs.filter(
        log => log.timestamp >= timeRange.start && log.timestamp <= timeRange.end
      );
    }

    const errorsByCode: { [code: string]: number } = {};
    const errorsByLevel: { [level: string]: number } = {};
    const resolvedErrors = filteredLogs.filter(log => log.resolved);

    filteredLogs.forEach(log => {
      errorsByCode[log.code] = (errorsByCode[log.code] || 0) + 1;
      errorsByLevel[log.level] = (errorsByLevel[log.level] || 0) + 1;
    });

    // Calculate top errors
    const topErrors = Object.entries(errorsByCode)
      .map(([code, count]) => ({
        code,
        count,
        lastOccurred: filteredLogs
          .filter(log => log.code === code)
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0]?.timestamp || new Date()
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Calculate resolution metrics
    const resolutionTimes = resolvedErrors
      .filter(log => log.resolvedAt)
      .map(log => log.resolvedAt!.getTime() - log.timestamp.getTime());

    const averageResolutionTime = resolutionTimes.length > 0
      ? resolutionTimes.reduce((sum, time) => sum + time, 0) / resolutionTimes.length
      : 0;

    return {
      totalErrors: filteredLogs.length,
      errorsByCode,
      errorsByLevel,
      recentErrors: filteredLogs
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 20),
      topErrors,
      resolutionRate: filteredLogs.length > 0 ? (resolvedErrors.length / filteredLogs.length) * 100 : 0,
      averageResolutionTime: Math.round(averageResolutionTime / 1000) // Convert to seconds
    };
  }

  // Search errors by criteria
  static searchErrors(criteria: {
    code?: string;
    level?: string;
    resolved?: boolean;
    userId?: string;
    timeRange?: { start: Date; end: Date };
    tags?: string[];
    limit?: number;
  }): ErrorLogEntry[] {
    let results = this.logs;

    if (criteria.code) {
      results = results.filter(log => log.code === criteria.code);
    }

    if (criteria.level) {
      results = results.filter(log => log.level === criteria.level);
    }

    if (criteria.resolved !== undefined) {
      results = results.filter(log => log.resolved === criteria.resolved);
    }

    if (criteria.userId) {
      results = results.filter(log => log.context.userId === criteria.userId);
    }

    if (criteria.timeRange) {
      results = results.filter(
        log => log.timestamp >= criteria.timeRange!.start && 
               log.timestamp <= criteria.timeRange!.end
      );
    }

    if (criteria.tags && criteria.tags.length > 0) {
      results = results.filter(log => 
        criteria.tags!.some(tag => log.tags.includes(tag))
      );
    }

    // Sort by timestamp (newest first)
    results = results.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply limit
    if (criteria.limit) {
      results = results.slice(0, criteria.limit);
    }

    return results;
  }

  // Export logs for external analysis
  static exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'csv') {
      const headers = [
        'ID', 'Timestamp', 'Level', 'Code', 'Message', 'StatusCode',
        'Method', 'URL', 'UserAgent', 'IP', 'UserID', 'Resolved', 'Tags'
      ];

      const rows = this.logs.map(log => [
        log.id,
        log.timestamp.toISOString(),
        log.level,
        log.code,
        `"${log.message.replace(/"/g, '""')}"`,
        log.statusCode || '',
        log.context.method || '',
        log.context.url || '',
        `"${(log.context.userAgent || '').replace(/"/g, '""')}"`,
        log.context.ip || '',
        log.context.userId || '',
        log.resolved,
        `"${log.tags.join(', ')}"`
      ]);

      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    return JSON.stringify(this.logs, null, 2);
  }

  // Private helper methods
  private static generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private static getLogLevel(error: Error): 'error' | 'warn' | 'info' {
    if (error instanceof AppError) {
      if (error.statusCode >= 500) return 'error';
      if (error.statusCode >= 400) return 'warn';
      return 'info';
    }
    return 'error';
  }

  private static generateTags(error: Error, req?: Request): string[] {
    const tags: string[] = [];

    if (error instanceof AppError) {
      tags.push(`status:${error.statusCode}`);
      tags.push(`code:${error.code}`);
    }

    if (req) {
      tags.push(`method:${req.method}`);
      if (req.originalUrl.includes('/api/')) {
        tags.push('api');
      }
      if (req.originalUrl.includes('/marketplace/')) {
        tags.push('marketplace');
      }
    }

    // Add error type tags
    if (error.message.includes('timeout')) tags.push('timeout');
    if (error.message.includes('network')) tags.push('network');
    if (error.message.includes('validation')) tags.push('validation');
    if (error.message.includes('payment')) tags.push('payment');
    if (error.message.includes('upload')) tags.push('upload');

    return tags;
  }

  private static consoleLog(logEntry: ErrorLogEntry): void {
    const logMessage = {
      id: logEntry.id,
      timestamp: logEntry.timestamp.toISOString(),
      level: logEntry.level,
      code: logEntry.code,
      message: logEntry.message,
      context: logEntry.context,
      tags: logEntry.tags
    };

    switch (logEntry.level) {
      case 'error':
        console.error('🚨 ERROR:', JSON.stringify(logMessage, null, 2));
        break;
      case 'warn':
        console.warn('⚠️ WARNING:', JSON.stringify(logMessage, null, 2));
        break;
      case 'info':
        console.info('ℹ️ INFO:', JSON.stringify(logMessage, null, 2));
        break;
    }
  }

  private static checkAlerts(): void {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    // Check error rate (errors per minute)
    const recentErrors = this.logs.filter(log => log.timestamp >= oneMinuteAgo);
    if (recentErrors.length >= this.alertThresholds.errorRate) {
      console.error(`🚨 HIGH ERROR RATE ALERT: ${recentErrors.length} errors in the last minute`);
    }

    // Check critical errors (errors per hour)
    const criticalErrors = this.logs.filter(
      log => log.timestamp >= oneHourAgo && log.level === 'error'
    );
    if (criticalErrors.length >= this.alertThresholds.criticalErrors) {
      console.error(`🚨 CRITICAL ERROR ALERT: ${criticalErrors.length} critical errors in the last hour`);
    }

    // Check unresolved errors
    const unresolvedErrors = this.logs.filter(log => !log.resolved);
    if (unresolvedErrors.length >= this.alertThresholds.unresolved) {
      console.error(`🚨 UNRESOLVED ERROR ALERT: ${unresolvedErrors.length} unresolved errors`);
    }
  }

  // Health check method
  static getHealthStatus(): {
    status: 'healthy' | 'degraded' | 'unhealthy';
    metrics: {
      totalLogs: number;
      errorRate: number;
      criticalErrors: number;
      unresolvedErrors: number;
    };
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60000);
    const oneHourAgo = new Date(now.getTime() - 3600000);

    const recentErrors = this.logs.filter(log => log.timestamp >= oneMinuteAgo);
    const criticalErrors = this.logs.filter(
      log => log.timestamp >= oneHourAgo && log.level === 'error'
    );
    const unresolvedErrors = this.logs.filter(log => !log.resolved);

    const metrics = {
      totalLogs: this.logs.length,
      errorRate: recentErrors.length,
      criticalErrors: criticalErrors.length,
      unresolvedErrors: unresolvedErrors.length
    };

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (
      metrics.errorRate >= this.alertThresholds.errorRate ||
      metrics.criticalErrors >= this.alertThresholds.criticalErrors
    ) {
      status = 'unhealthy';
    } else if (metrics.unresolvedErrors >= this.alertThresholds.unresolved / 2) {
      status = 'degraded';
    }

    return { status, metrics };
  }
}