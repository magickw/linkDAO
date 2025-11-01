import { logger } from '../utils/logger';
import { alertService } from '../services/alertService';

// Error severity levels
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

// Error categories for better organization
export enum ErrorCategory {
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  DATABASE = 'database',
  NETWORK = 'network',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SECURITY = 'security',
  PERFORMANCE = 'performance',
  SYSTEM = 'system',
  USER_INPUT = 'user_input',
  CONFIGURATION = 'configuration'
}

// Comprehensive error information interface
export interface ErrorInfo {
  id: string;
  timestamp: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  code: string;
  message: string;
  stack?: string;
  context: {
    requestId?: string;
    correlationId?: string;
    userId?: string;
    sessionId?: string;
    ip?: string;
    userAgent?: string;
    method?: string;
    url?: string;
    path?: string;
    query?: any;
    body?: any;
    headers?: Record<string, string>;
  };
  technical: {
    errorName?: string;
    errorCode?: string;
    statusCode?: number;
    originalMessage?: string;
    fileName?: string;
    lineNumber?: number;
    columnNumber?: number;
  };
  business: {
    operation?: string;
    entityId?: string;
    entityType?: string;
    impact?: string;
    affectedUsers?: number;
  };
  performance: {
    responseTime?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
    dbQueryTime?: number;
    cacheHits?: number;
    cacheMisses?: number;
  };
  resolution?: {
    status: 'pending' | 'investigating' | 'resolved' | 'ignored';
    assignedTo?: string;
    notes?: string;
    resolvedAt?: string;
    resolution?: string;
  };
  metadata?: Record<string, any>;
}

// Error pattern for detecting recurring issues
interface ErrorPattern {
  signature: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  examples: string[]; // Error IDs
}

// Error statistics for monitoring
interface ErrorStats {
  totalErrors: number;
  errorsByCategory: Record<ErrorCategory, number>;
  errorsBySeverity: Record<ErrorSeverity, number>;
  errorsByHour: Record<string, number>;
  topErrorPatterns: ErrorPattern[];
  errorRate: number; // errors per minute
  mttr: number; // mean time to resolution in minutes
}

export class ErrorLoggingService {
  private static instance: ErrorLoggingService;
  private errorPatterns: Map<string, ErrorPattern> = new Map();
  private errorStats: ErrorStats = {
    totalErrors: 0,
    errorsByCategory: {} as Record<ErrorCategory, number>,
    errorsBySeverity: {} as Record<ErrorSeverity, number>,
    errorsByHour: {},
    topErrorPatterns: [],
    errorRate: 0,
    mttr: 0
  };

  public static getInstance(): ErrorLoggingService {
    if (!ErrorLoggingService.instance) {
      ErrorLoggingService.instance = new ErrorLoggingService();
    }
    return ErrorLoggingService.instance;
  }

  /**
   * Log an error with comprehensive context and analysis
   */
  public async logError(
    error: Error | any,
    context: Partial<ErrorInfo['context']> = {},
    technical: Partial<ErrorInfo['technical']> = {},
    business: Partial<ErrorInfo['business']> = {},
    performance: Partial<ErrorInfo['performance']> = {},
    metadata: Record<string, any> = {}
  ): Promise<string> {
    const errorId = this.generateErrorId();
    const timestamp = new Date().toISOString();
    
    // Analyze error to determine category and severity
    const analysis = this.analyzeError(error, context, technical, business);
    
    // Create comprehensive error info
    const errorInfo: ErrorInfo = {
      id: errorId,
      timestamp,
      severity: analysis.severity,
      category: analysis.category,
      code: technical.errorCode || analysis.code,
      message: error.message || 'Unknown error',
      stack: error.stack,
      context: {
        requestId: context.requestId,
        correlationId: context.correlationId,
        userId: context.userId,
        sessionId: context.sessionId,
        ip: context.ip,
        userAgent: context.userAgent,
        method: context.method,
        url: context.url,
        path: context.path,
        query: context.query,
        body: this.sanitizeBody(context.body),
        headers: this.sanitizeHeaders(context.headers)
      },
      technical: {
        errorName: error.name,
        errorCode: error.code || technical.errorCode,
        statusCode: technical.statusCode || this.getStatusCodeFromError(error),
        originalMessage: error.message,
        fileName: this.extractFileName(error.stack),
        lineNumber: this.extractLineNumber(error.stack),
        columnNumber: this.extractColumnNumber(error.stack),
        ...technical
      },
      business: {
        operation: business.operation,
        entityId: business.entityId,
        entityType: business.entityType,
        impact: business.impact || this.assessBusinessImpact(analysis.severity, analysis.category),
        affectedUsers: business.affectedUsers,
        ...business
      },
      performance: {
        responseTime: performance.responseTime,
        memoryUsage: performance.memoryUsage || process.memoryUsage(),
        cpuUsage: performance.cpuUsage || process.cpuUsage(),
        dbQueryTime: performance.dbQueryTime,
        cacheHits: performance.cacheHits,
        cacheMisses: performance.cacheMisses,
        ...performance
      },
      resolution: {
        status: 'pending'
      },
      metadata
    };

    // Update error patterns and statistics
    await this.updateErrorPatterns(errorInfo);
    this.updateErrorStats(errorInfo);

    // Log the error with appropriate level
    await this.logWithLevel(errorInfo);

    // Handle alerts and notifications
    await this.handleAlertsAndNotifications(errorInfo);

    // Store error for analysis (in production, this might go to a database)
    await this.storeError(errorInfo);

    return errorId;
  }

  /**
   * Analyze error to determine category, severity, and code
   */
  private analyzeError(
    error: any,
    context: Partial<ErrorInfo['context']>,
    technical: Partial<ErrorInfo['technical']>,
    business: Partial<ErrorInfo['business']>
  ): { category: ErrorCategory; severity: ErrorSeverity; code: string } {
    let category = ErrorCategory.SYSTEM;
    let severity = ErrorSeverity.MEDIUM;
    let code = 'UNKNOWN_ERROR';

    // Analyze by error type/name
    if (error.name === 'ValidationError') {
      category = ErrorCategory.VALIDATION;
      severity = ErrorSeverity.LOW;
      code = 'VALIDATION_ERROR';
    } else if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      category = ErrorCategory.AUTHENTICATION;
      severity = ErrorSeverity.MEDIUM;
      code = 'AUTHENTICATION_ERROR';
    } else if (error.name === 'UnauthorizedError') {
      category = ErrorCategory.AUTHORIZATION;
      severity = ErrorSeverity.MEDIUM;
      code = 'AUTHORIZATION_ERROR';
    } else if (error.name === 'DatabaseError' || error.name === 'SequelizeError') {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.HIGH;
      code = 'DATABASE_ERROR';
    } else if (error.name === 'MulterError') {
      category = ErrorCategory.USER_INPUT;
      severity = ErrorSeverity.LOW;
      code = 'FILE_UPLOAD_ERROR';
    }

    // Analyze by error code
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      category = ErrorCategory.NETWORK;
      severity = ErrorSeverity.HIGH;
      code = 'CONNECTION_ERROR';
    } else if (error.code === 'ETIMEDOUT') {
      category = ErrorCategory.PERFORMANCE;
      severity = ErrorSeverity.MEDIUM;
      code = 'TIMEOUT_ERROR';
    }

    // Analyze by status code
    if (technical.statusCode) {
      if (technical.statusCode >= 500) {
        severity = ErrorSeverity.HIGH;
      } else if (technical.statusCode >= 400) {
        severity = ErrorSeverity.MEDIUM;
      }
    }

    // Analyze by message content
    const message = error.message?.toLowerCase() || '';
    if (message.includes('rate limit')) {
      category = ErrorCategory.SECURITY;
      severity = ErrorSeverity.MEDIUM;
      code = 'RATE_LIMIT_EXCEEDED';
    } else if (message.includes('cors')) {
      category = ErrorCategory.SECURITY;
      severity = ErrorSeverity.MEDIUM;
      code = 'CORS_ERROR';
    } else if (message.includes('sql') || message.includes('query')) {
      category = ErrorCategory.DATABASE;
      severity = ErrorSeverity.HIGH;
      code = 'DATABASE_QUERY_ERROR';
    }

    // Analyze by business context
    if (business.operation) {
      if (business.operation.includes('payment') || business.operation.includes('transaction')) {
        severity = ErrorSeverity.CRITICAL;
        category = ErrorCategory.BUSINESS_LOGIC;
      } else if (business.operation.includes('auth')) {
        category = ErrorCategory.AUTHENTICATION;
      }
    }

    // Analyze by performance impact
    if (context.method && context.url) {
      if (context.url.includes('/api/auth') || context.url.includes('/api/payment')) {
        severity = ErrorSeverity.HIGH;
      }
    }

    return { category, severity, code };
  }

  /**
   * Update error patterns for trend analysis
   */
  private async updateErrorPatterns(errorInfo: ErrorInfo): Promise<void> {
    const signature = this.generateErrorSignature(errorInfo);
    const existing = this.errorPatterns.get(signature);

    if (existing) {
      existing.count++;
      existing.lastSeen = errorInfo.timestamp;
      existing.examples.push(errorInfo.id);
      
      // Keep only recent examples (last 10)
      if (existing.examples.length > 10) {
        existing.examples = existing.examples.slice(-10);
      }

      // Escalate severity if pattern is recurring frequently
      if (existing.count > 10 && existing.severity !== ErrorSeverity.CRITICAL) {
        existing.severity = this.escalateSeverity(existing.severity);
        
        // Alert on pattern escalation
        await this.alertOnPatternEscalation(existing, errorInfo);
      }
    } else {
      this.errorPatterns.set(signature, {
        signature,
        count: 1,
        firstSeen: errorInfo.timestamp,
        lastSeen: errorInfo.timestamp,
        severity: errorInfo.severity,
        category: errorInfo.category,
        examples: [errorInfo.id]
      });
    }

    // Clean up old patterns (older than 24 hours)
    this.cleanupOldPatterns();
  }

  /**
   * Generate error signature for pattern matching
   */
  private generateErrorSignature(errorInfo: ErrorInfo): string {
    const components = [
      errorInfo.category,
      errorInfo.code,
      errorInfo.technical.errorName,
      errorInfo.context.path,
      errorInfo.context.method
    ].filter(Boolean);

    return components.join(':');
  }

  /**
   * Update error statistics
   */
  private updateErrorStats(errorInfo: ErrorInfo): void {
    this.errorStats.totalErrors++;
    
    // Update category stats
    this.errorStats.errorsByCategory[errorInfo.category] = 
      (this.errorStats.errorsByCategory[errorInfo.category] || 0) + 1;
    
    // Update severity stats
    this.errorStats.errorsBySeverity[errorInfo.severity] = 
      (this.errorStats.errorsBySeverity[errorInfo.severity] || 0) + 1;
    
    // Update hourly stats
    const hour = new Date(errorInfo.timestamp).toISOString().substring(0, 13);
    this.errorStats.errorsByHour[hour] = (this.errorStats.errorsByHour[hour] || 0) + 1;
    
    // Update top patterns
    this.errorStats.topErrorPatterns = Array.from(this.errorPatterns.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
    
    // Calculate error rate (errors in last hour)
    const lastHour = new Date(Date.now() - 3600000).toISOString().substring(0, 13);
    this.errorStats.errorRate = this.errorStats.errorsByHour[lastHour] || 0;
  }

  /**
   * Log error with appropriate level based on severity
   */
  private async logWithLevel(errorInfo: ErrorInfo): Promise<void> {
    const logData = {
      errorId: errorInfo.id,
      category: errorInfo.category,
      severity: errorInfo.severity,
      code: errorInfo.code,
      context: errorInfo.context,
      technical: errorInfo.technical,
      business: errorInfo.business,
      performance: errorInfo.performance,
      metadata: errorInfo.metadata
    };

    switch (errorInfo.severity) {
      case ErrorSeverity.CRITICAL:
        logger.error(`CRITICAL ERROR: ${errorInfo.message}`, { ...logData, critical: true });
        break;
      case ErrorSeverity.HIGH:
        logger.error(`HIGH SEVERITY ERROR: ${errorInfo.message}`, logData);
        break;
      case ErrorSeverity.MEDIUM:
        logger.warn(`MEDIUM SEVERITY ERROR: ${errorInfo.message}`, logData);
        break;
      case ErrorSeverity.LOW:
        logger.info(`LOW SEVERITY ERROR: ${errorInfo.message}`, logData);
        break;
    }
  }

  /**
   * Handle alerts and notifications based on error severity and patterns
   */
  private async handleAlertsAndNotifications(errorInfo: ErrorInfo): Promise<void> {
    try {
      // Always alert on critical errors
      if (errorInfo.severity === ErrorSeverity.CRITICAL) {
        await alertService.createAlert(
          'service_down',
          `Critical Error: ${errorInfo.code}`,
          errorInfo.message,
          'system',
          {
            errorId: errorInfo.id,
            category: errorInfo.category,
            context: errorInfo.context,
            technical: errorInfo.technical,
            business: errorInfo.business
          },
          'critical'
        );
      }

      // Alert on high severity errors in critical paths
      if (errorInfo.severity === ErrorSeverity.HIGH && this.isCriticalPath(errorInfo)) {
        await alertService.createAlert(
          'high_error_rate',
          `High Severity Error in Critical Path: ${errorInfo.code}`,
          errorInfo.message,
          'system',
          {
            errorId: errorInfo.id,
            category: errorInfo.category,
            path: errorInfo.context.path
          },
          'high'
        );
      }

      // Alert on security-related errors
      if (errorInfo.category === ErrorCategory.SECURITY) {
        await alertService.createAlert(
          'security_breach',
          `Security Error: ${errorInfo.code}`,
          errorInfo.message,
          'security',
          {
            errorId: errorInfo.id,
            ip: errorInfo.context.ip,
            userAgent: errorInfo.context.userAgent,
            context: errorInfo.context
          },
          errorInfo.severity === ErrorSeverity.CRITICAL ? 'critical' : 'high'
        );
      }

      // Alert on database errors
      if (errorInfo.category === ErrorCategory.DATABASE && errorInfo.severity >= ErrorSeverity.HIGH) {
        await alertService.createAlert(
          'database_connection',
          `Database Error: ${errorInfo.code}`,
          errorInfo.message,
          'infrastructure',
          {
            errorId: errorInfo.id,
            technical: errorInfo.technical,
            performance: errorInfo.performance
          },
          'high'
        );
      }

    } catch (alertError) {
      logger.error('Failed to create error alert', {
        originalErrorId: errorInfo.id,
        alertError: alertError.message
      });
    }
  }

  /**
   * Store error for later analysis (placeholder for database storage)
   */
  private async storeError(errorInfo: ErrorInfo): Promise<void> {
    // In a production environment, this would store to a database
    // For now, we'll just log that it would be stored
    logger.debug('Error stored for analysis', {
      errorId: errorInfo.id,
      category: errorInfo.category,
      severity: errorInfo.severity
    });
  }

  /**
   * Utility methods
   */
  private generateErrorId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 12);
    return `err_${timestamp}_${random}`;
  }

  private sanitizeBody(body: any): any {
    if (!body || typeof body !== 'object') return body;
    
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'privateKey', 'signature'];
    const sanitized = { ...body };
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private sanitizeHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key'];
    
    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  private getStatusCodeFromError(error: any): number {
    return error.statusCode || error.status || 500;
  }

  private extractFileName(stack?: string): string | undefined {
    if (!stack) return undefined;
    const match = stack.match(/at .* \((.+):(\d+):(\d+)\)/);
    return match ? match[1].split('/').pop() : undefined;
  }

  private extractLineNumber(stack?: string): number | undefined {
    if (!stack) return undefined;
    const match = stack.match(/at .* \((.+):(\d+):(\d+)\)/);
    return match ? parseInt(match[2], 10) : undefined;
  }

  private extractColumnNumber(stack?: string): number | undefined {
    if (!stack) return undefined;
    const match = stack.match(/at .* \((.+):(\d+):(\d+)\)/);
    return match ? parseInt(match[3], 10) : undefined;
  }

  private assessBusinessImpact(severity: ErrorSeverity, category: ErrorCategory): string {
    if (severity === ErrorSeverity.CRITICAL) {
      return 'Service disruption, immediate attention required';
    } else if (severity === ErrorSeverity.HIGH) {
      if (category === ErrorCategory.DATABASE) {
        return 'Data operations affected, user experience degraded';
      } else if (category === ErrorCategory.AUTHENTICATION) {
        return 'User authentication issues, access problems';
      }
      return 'Significant functionality impacted';
    } else if (severity === ErrorSeverity.MEDIUM) {
      return 'Minor functionality affected, monitoring required';
    }
    return 'Minimal impact, informational';
  }

  private escalateSeverity(currentSeverity: ErrorSeverity): ErrorSeverity {
    switch (currentSeverity) {
      case ErrorSeverity.LOW:
        return ErrorSeverity.MEDIUM;
      case ErrorSeverity.MEDIUM:
        return ErrorSeverity.HIGH;
      case ErrorSeverity.HIGH:
        return ErrorSeverity.CRITICAL;
      default:
        return currentSeverity;
    }
  }

  private async alertOnPatternEscalation(pattern: ErrorPattern, errorInfo: ErrorInfo): Promise<void> {
    await alertService.createAlert(
      'high_error_rate',
      `Error Pattern Escalated: ${pattern.signature}`,
      `Error pattern has been escalated to ${pattern.severity} after ${pattern.count} occurrences`,
      'system',
      {
        pattern: pattern.signature,
        count: pattern.count,
        severity: pattern.severity,
        category: pattern.category,
        latestErrorId: errorInfo.id
      },
      'high'
    );
  }

  private isCriticalPath(errorInfo: ErrorInfo): boolean {
    const criticalPaths = [
      '/api/auth',
      '/api/payment',
      '/api/orders',
      '/api/marketplace/checkout'
    ];
    
    return criticalPaths.some(path => errorInfo.context.path?.startsWith(path));
  }

  private cleanupOldPatterns(): void {
    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
    
    for (const [signature, pattern] of Array.from(this.errorPatterns.entries())) {
      if (new Date(pattern.lastSeen).getTime() < oneDayAgo) {
        this.errorPatterns.delete(signature);
      }
    }
  }

  /**
   * Public methods for accessing error information
   */
  public getErrorStats(): ErrorStats {
    return { ...this.errorStats };
  }

  public getErrorPatterns(): ErrorPattern[] {
    return Array.from(this.errorPatterns.values());
  }

  public async getErrorById(errorId: string): Promise<ErrorInfo | null> {
    // In production, this would query the database
    // For now, return null as we're not storing errors persistently
    return null;
  }

  public async searchErrors(criteria: {
    category?: ErrorCategory;
    severity?: ErrorSeverity;
    startDate?: string;
    endDate?: string;
    limit?: number;
  }): Promise<ErrorInfo[]> {
    // In production, this would query the database
    // For now, return empty array
    return [];
  }
}

// Export singleton instance
export const errorLoggingService = ErrorLoggingService.getInstance();

// Export convenience functions
export const logError = (
  error: Error | any,
  context?: Partial<ErrorInfo['context']>,
  technical?: Partial<ErrorInfo['technical']>,
  business?: Partial<ErrorInfo['business']>,
  performance?: Partial<ErrorInfo['performance']>,
  metadata?: Record<string, any>
) => errorLoggingService.logError(error, context, technical, business, performance, metadata);

export const getErrorStats = () => errorLoggingService.getErrorStats();
export const getErrorPatterns = () => errorLoggingService.getErrorPatterns();
