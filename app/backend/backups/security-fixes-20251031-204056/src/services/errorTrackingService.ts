import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { Redis } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import * as crypto from 'crypto';
import { safeLogger } from '../utils/safeLogger';

interface ErrorContext {
  userId?: string;
  sessionId?: string;
  requestId?: string;
  userAgent?: string;
  ipAddress?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  timestamp: Date;
}

interface ErrorDetails {
  id: string;
  message: string;
  stack?: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'application' | 'database' | 'network' | 'validation' | 'authentication' | 'authorization' | 'payment' | 'blockchain';
  context: ErrorContext;
  fingerprint: string;
  count: number;
  firstSeen: Date;
  lastSeen: Date;
  resolved: boolean;
  resolvedAt?: Date;
  resolvedBy?: string;
  tags: string[];
  metadata: Record<string, any>;
}

interface ErrorPattern {
  fingerprint: string;
  pattern: string;
  frequency: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  affectedUsers: number;
  firstOccurrence: Date;
  lastOccurrence: Date;
  suggestedFix?: string;
}

interface ErrorAnalytics {
  totalErrors: number;
  errorRate: number;
  topErrors: ErrorPattern[];
  errorsByCategory: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  errorTrends: Array<{
    timestamp: Date;
    count: number;
    category: string;
  }>;
  affectedUsers: number;
  resolvedErrors: number;
  averageResolutionTime: number;
}

export class ErrorTrackingService extends EventEmitter {
  private redis: Redis;
  private errors: Map<string, ErrorDetails> = new Map();
  private patterns: Map<string, ErrorPattern> = new Map();
  private readonly MAX_ERRORS_IN_MEMORY = 10000;
  private readonly ERROR_RETENTION_DAYS = 30;

  constructor(redisUrl: string) {
    super();
    
    this.redis = new Redis(redisUrl, {
      retryDelayOnFailover: 100,
      enableReadyCheck: false,
      maxRetriesPerRequest: 3,
      keyPrefix: 'errors:'
    });

    this.setupCleanupInterval();
  }

  // Main error tracking method
  async trackError(
    error: Error | string,
    context: Partial<ErrorContext> = {},
    options: {
      severity?: 'low' | 'medium' | 'high' | 'critical';
      category?: string;
      tags?: string[];
      metadata?: Record<string, any>;
    } = {}
  ): Promise<string> {
    const startTime = performance.now();
    
    try {
      const errorMessage = typeof error === 'string' ? error : error.message;
      const errorStack = typeof error === 'string' ? undefined : error.stack;
      const errorType = typeof error === 'string' ? 'CustomError' : error.constructor.name;

      // Generate unique fingerprint for error grouping
      const fingerprint = this.generateErrorFingerprint(errorMessage, errorStack, context);
      
      // Check if this error pattern already exists
      let existingError = await this.getErrorByFingerprint(fingerprint);
      
      if (existingError) {
        // Update existing error
        existingError.count++;
        existingError.lastSeen = new Date();
        existingError.context = { ...context, timestamp: new Date() };
        
        // Update metadata if provided
        if (options.metadata) {
          existingError.metadata = { ...existingError.metadata, ...options.metadata };
        }
        
        await this.updateError(existingError);
        this.updateErrorPattern(existingError);
        
        return existingError.id;
      } else {
        // Create new error record
        const errorId = crypto.randomUUID();
        const now = new Date();
        
        const errorDetails: ErrorDetails = {
          id: errorId,
          message: errorMessage,
          stack: errorStack,
          type: errorType,
          severity: options.severity || this.determineSeverity(errorMessage, errorType),
          category: (options.category as any) || this.categorizeError(errorMessage, errorType),
          context: { ...context, timestamp: now },
          fingerprint,
          count: 1,
          firstSeen: now,
          lastSeen: now,
          resolved: false,
          tags: options.tags || [],
          metadata: options.metadata || {}
        };

        // Store error
        await this.storeError(errorDetails);
        this.errors.set(fingerprint, errorDetails);
        
        // Update patterns
        this.updateErrorPattern(errorDetails);
        
        // Emit event for real-time monitoring
        this.emit('errorTracked', errorDetails);
        
        // Check if this is a critical error that needs immediate attention
        if (errorDetails.severity === 'critical') {
          this.emit('criticalError', errorDetails);
        }
        
        return errorId;
      }
    } catch (trackingError) {
      safeLogger.error('Error tracking failed:', trackingError);
      // Don't throw - we don't want error tracking to break the application
      return 'tracking-failed';
    } finally {
      const duration = performance.now() - startTime;
      if (duration > 100) {
        safeLogger.warn(`Slow error tracking: ${duration.toFixed(2)}ms`);
      }
    }
  }

  // Generate unique fingerprint for error grouping
  private generateErrorFingerprint(
    message: string, 
    stack?: string, 
    context?: Partial<ErrorContext>
  ): string {
    // Normalize error message (remove dynamic parts like IDs, timestamps)
    const normalizedMessage = this.normalizeErrorMessage(message);
    
    // Use first few lines of stack trace for fingerprinting
    const stackLines = stack ? stack.split('\n').slice(0, 3).join('\n') : '';
    const normalizedStack = this.normalizeStackTrace(stackLines);
    
    // Include relevant context for fingerprinting
    const contextKey = context?.url ? new URL(context.url).pathname : '';
    
    const fingerprintData = `${normalizedMessage}|${normalizedStack}|${contextKey}`;
    return crypto.createHash('sha256').update(fingerprintData).digest('hex').substring(0, 16);
  }

  private normalizeErrorMessage(message: string): string {
    return message
      .replace(/\b\d+\b/g, 'N') // Replace numbers with N
      .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, 'UUID') // Replace UUIDs
      .replace(/0x[a-f0-9]+/gi, 'ADDRESS') // Replace hex addresses
      .replace(/"[^"]*"/g, '"STRING"') // Replace quoted strings
      .toLowerCase();
  }

  private normalizeStackTrace(stack: string): string {
    return stack
      .replace(/:\d+:\d+/g, ':N:N') // Replace line:column numbers
      .replace(/\([^)]*\)/g, '()') // Remove file paths in parentheses
      .replace(/at .* \(/g, 'at FUNC ('); // Normalize function names
  }

  private determineSeverity(message: string, type: string): 'low' | 'medium' | 'high' | 'critical' {
    const criticalKeywords = ['payment', 'security', 'auth', 'database', 'crash', 'fatal'];
    const highKeywords = ['error', 'failed', 'timeout', 'connection'];
    const mediumKeywords = ['warning', 'deprecated', 'invalid'];
    
    const lowerMessage = message.toLowerCase();
    const lowerType = type.toLowerCase();
    
    if (criticalKeywords.some(keyword => lowerMessage.includes(keyword) || lowerType.includes(keyword))) {
      return 'critical';
    }
    
    if (highKeywords.some(keyword => lowerMessage.includes(keyword) || lowerType.includes(keyword))) {
      return 'high';
    }
    
    if (mediumKeywords.some(keyword => lowerMessage.includes(keyword) || lowerType.includes(keyword))) {
      return 'medium';
    }
    
    return 'low';
  }

  private categorizeError(message: string, type: string): string {
    const lowerMessage = message.toLowerCase();
    const lowerType = type.toLowerCase();
    
    if (lowerMessage.includes('database') || lowerMessage.includes('sql') || lowerMessage.includes('query')) {
      return 'database';
    }
    
    if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('timeout')) {
      return 'network';
    }
    
    if (lowerMessage.includes('validation') || lowerMessage.includes('invalid') || lowerType.includes('validation')) {
      return 'validation';
    }
    
    if (lowerMessage.includes('auth') || lowerMessage.includes('unauthorized') || lowerMessage.includes('forbidden')) {
      return 'authentication';
    }
    
    if (lowerMessage.includes('payment') || lowerMessage.includes('stripe') || lowerMessage.includes('transaction')) {
      return 'payment';
    }
    
    if (lowerMessage.includes('blockchain') || lowerMessage.includes('web3') || lowerMessage.includes('contract')) {
      return 'blockchain';
    }
    
    return 'application';
  }

  // Storage methods
  private async storeError(error: ErrorDetails): Promise<void> {
    const key = `error:${error.fingerprint}`;
    await this.redis.setex(key, this.ERROR_RETENTION_DAYS * 24 * 60 * 60, JSON.stringify(error));
    
    // Add to sorted set for time-based queries
    await this.redis.zadd('errors:timeline', error.lastSeen.getTime(), error.fingerprint);
    
    // Add to category sets
    await this.redis.sadd(`errors:category:${error.category}`, error.fingerprint);
    await this.redis.sadd(`errors:severity:${error.severity}`, error.fingerprint);
  }

  private async updateError(error: ErrorDetails): Promise<void> {
    await this.storeError(error);
  }

  private async getErrorByFingerprint(fingerprint: string): Promise<ErrorDetails | null> {
    // Check memory first
    if (this.errors.has(fingerprint)) {
      return this.errors.get(fingerprint)!;
    }
    
    // Check Redis
    const key = `error:${fingerprint}`;
    const errorData = await this.redis.get(key);
    
    if (errorData) {
      const error = JSON.parse(errorData) as ErrorDetails;
      // Convert date strings back to Date objects
      error.firstSeen = new Date(error.firstSeen);
      error.lastSeen = new Date(error.lastSeen);
      error.context.timestamp = new Date(error.context.timestamp);
      
      // Store in memory for faster access
      this.errors.set(fingerprint, error);
      return error;
    }
    
    return null;
  }

  // Pattern analysis
  private updateErrorPattern(error: ErrorDetails): void {
    let pattern = this.patterns.get(error.fingerprint);
    
    if (pattern) {
      pattern.frequency = error.count;
      pattern.lastOccurrence = error.lastSeen;
      pattern.trend = this.calculateTrend(pattern);
    } else {
      pattern = {
        fingerprint: error.fingerprint,
        pattern: error.message,
        frequency: error.count,
        trend: 'stable',
        affectedUsers: 1, // Would need to track unique users
        firstOccurrence: error.firstSeen,
        lastOccurrence: error.lastSeen,
        suggestedFix: this.generateSuggestedFix(error)
      };
    }
    
    this.patterns.set(error.fingerprint, pattern);
  }

  private calculateTrend(pattern: ErrorPattern): 'increasing' | 'decreasing' | 'stable' {
    // Simplified trend calculation - in production, this would analyze historical data
    const recentFrequency = pattern.frequency;
    const timeSinceFirst = Date.now() - pattern.firstOccurrence.getTime();
    const hoursSinceFirst = timeSinceFirst / (1000 * 60 * 60);
    
    if (hoursSinceFirst < 1) return 'stable';
    
    const frequencyPerHour = recentFrequency / hoursSinceFirst;
    
    if (frequencyPerHour > 10) return 'increasing';
    if (frequencyPerHour < 1) return 'decreasing';
    return 'stable';
  }

  private generateSuggestedFix(error: ErrorDetails): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('database') || message.includes('sql')) {
      return 'Check database connection and query syntax. Consider adding proper error handling and connection pooling.';
    }
    
    if (message.includes('timeout')) {
      return 'Increase timeout values or optimize the operation causing the timeout. Check network connectivity.';
    }
    
    if (message.includes('validation')) {
      return 'Review input validation rules and ensure proper data sanitization.';
    }
    
    if (message.includes('unauthorized') || message.includes('forbidden')) {
      return 'Check authentication and authorization logic. Verify user permissions.';
    }
    
    if (message.includes('payment')) {
      return 'Review payment processing logic and check integration with payment providers.';
    }
    
    return 'Review the error context and stack trace to identify the root cause.';
  }

  // Analytics and reporting
  async getErrorAnalytics(
    startDate?: Date,
    endDate?: Date,
    category?: string
  ): Promise<ErrorAnalytics> {
    const end = endDate || new Date();
    const start = startDate || new Date(end.getTime() - 24 * 60 * 60 * 1000); // Last 24 hours
    
    // Get errors in time range
    const errorFingerprints = await this.redis.zrangebyscore(
      'errors:timeline',
      start.getTime(),
      end.getTime()
    );
    
    const errors: ErrorDetails[] = [];
    for (const fingerprint of errorFingerprints) {
      const error = await this.getErrorByFingerprint(fingerprint);
      if (error && (!category || error.category === category)) {
        errors.push(error);
      }
    }
    
    // Calculate analytics
    const totalErrors = errors.reduce((sum, error) => sum + error.count, 0);
    const uniqueErrors = errors.length;
    const resolvedErrors = errors.filter(e => e.resolved).length;
    
    // Group by category
    const errorsByCategory: Record<string, number> = {};
    const errorsBySeverity: Record<string, number> = {};
    
    errors.forEach(error => {
      errorsByCategory[error.category] = (errorsByCategory[error.category] || 0) + error.count;
      errorsBySeverity[error.severity] = (errorsBySeverity[error.severity] || 0) + error.count;
    });
    
    // Get top error patterns
    const topErrors = Array.from(this.patterns.values())
      .sort((a, b) => b.frequency - a.frequency)
      .slice(0, 10);
    
    // Calculate error trends (simplified)
    const errorTrends = this.calculateErrorTrends(errors, start, end);
    
    // Calculate affected users (simplified - would need actual user tracking)
    const affectedUsers = new Set(errors.map(e => e.context.userId).filter(Boolean)).size;
    
    // Calculate average resolution time
    const resolvedErrorsWithTime = errors.filter(e => e.resolved && e.resolvedAt);
    const averageResolutionTime = resolvedErrorsWithTime.length > 0
      ? resolvedErrorsWithTime.reduce((sum, error) => {
          const resolutionTime = error.resolvedAt!.getTime() - error.firstSeen.getTime();
          return sum + resolutionTime;
        }, 0) / resolvedErrorsWithTime.length
      : 0;
    
    return {
      totalErrors,
      errorRate: totalErrors / Math.max(1, uniqueErrors), // Simplified error rate
      topErrors,
      errorsByCategory,
      errorsBySeverity,
      errorTrends,
      affectedUsers,
      resolvedErrors,
      averageResolutionTime: averageResolutionTime / (1000 * 60 * 60) // Convert to hours
    };
  }

  private calculateErrorTrends(
    errors: ErrorDetails[],
    start: Date,
    end: Date
  ): Array<{ timestamp: Date; count: number; category: string }> {
    const trends: Array<{ timestamp: Date; count: number; category: string }> = [];
    const hourlyBuckets = new Map<string, Map<string, number>>();
    
    // Group errors by hour and category
    errors.forEach(error => {
      const hour = new Date(error.lastSeen);
      hour.setMinutes(0, 0, 0);
      const hourKey = hour.toISOString();
      
      if (!hourlyBuckets.has(hourKey)) {
        hourlyBuckets.set(hourKey, new Map());
      }
      
      const categoryMap = hourlyBuckets.get(hourKey)!;
      categoryMap.set(error.category, (categoryMap.get(error.category) || 0) + error.count);
    });
    
    // Convert to trend format
    hourlyBuckets.forEach((categoryMap, hourKey) => {
      categoryMap.forEach((count, category) => {
        trends.push({
          timestamp: new Date(hourKey),
          count,
          category
        });
      });
    });
    
    return trends.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  // Error resolution
  async resolveError(fingerprint: string, resolvedBy: string): Promise<boolean> {
    const error = await this.getErrorByFingerprint(fingerprint);
    if (!error) return false;
    
    error.resolved = true;
    error.resolvedAt = new Date();
    error.resolvedBy = resolvedBy;
    
    await this.updateError(error);
    this.emit('errorResolved', error);
    
    return true;
  }

  async addErrorTag(fingerprint: string, tag: string): Promise<boolean> {
    const error = await this.getErrorByFingerprint(fingerprint);
    if (!error) return false;
    
    if (!error.tags.includes(tag)) {
      error.tags.push(tag);
      await this.updateError(error);
    }
    
    return true;
  }

  async updateErrorMetadata(fingerprint: string, metadata: Record<string, any>): Promise<boolean> {
    const error = await this.getErrorByFingerprint(fingerprint);
    if (!error) return false;
    
    error.metadata = { ...error.metadata, ...metadata };
    await this.updateError(error);
    
    return true;
  }

  // Search and filtering
  async searchErrors(query: {
    message?: string;
    category?: string;
    severity?: string;
    resolved?: boolean;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ErrorDetails[]> {
    const errors: ErrorDetails[] = [];
    
    // Get all error fingerprints in time range
    const end = query.endDate || new Date();
    const start = query.startDate || new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000); // Last 7 days
    
    const fingerprints = await this.redis.zrangebyscore(
      'errors:timeline',
      start.getTime(),
      end.getTime()
    );
    
    for (const fingerprint of fingerprints) {
      const error = await this.getErrorByFingerprint(fingerprint);
      if (!error) continue;
      
      // Apply filters
      if (query.message && !error.message.toLowerCase().includes(query.message.toLowerCase())) {
        continue;
      }
      
      if (query.category && error.category !== query.category) {
        continue;
      }
      
      if (query.severity && error.severity !== query.severity) {
        continue;
      }
      
      if (query.resolved !== undefined && error.resolved !== query.resolved) {
        continue;
      }
      
      errors.push(error);
      
      if (query.limit && errors.length >= query.limit) {
        break;
      }
    }
    
    return errors.sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  // Cleanup and maintenance
  private setupCleanupInterval(): void {
    // Clean up old errors every hour
    setInterval(async () => {
      await this.cleanupOldErrors();
    }, 60 * 60 * 1000);
  }

  private async cleanupOldErrors(): Promise<void> {
    try {
      const cutoffTime = Date.now() - (this.ERROR_RETENTION_DAYS * 24 * 60 * 60 * 1000);
      
      // Remove old errors from timeline
      await this.redis.zremrangebyscore('errors:timeline', 0, cutoffTime);
      
      // Clean up memory cache
      if (this.errors.size > this.MAX_ERRORS_IN_MEMORY) {
        const sortedErrors = Array.from(this.errors.entries())
          .sort(([, a], [, b]) => b.lastSeen.getTime() - a.lastSeen.getTime());
        
        // Keep only the most recent errors
        this.errors.clear();
        sortedErrors.slice(0, this.MAX_ERRORS_IN_MEMORY / 2).forEach(([key, error]) => {
          this.errors.set(key, error);
        });
      }
      
      safeLogger.info('Error cleanup completed');
    } catch (error) {
      safeLogger.error('Error cleanup failed:', error);
    }
  }

  // Health check
  async healthCheck(): Promise<{
    redis: boolean;
    memoryUsage: number;
    errorCount: number;
    patternCount: number;
  }> {
    try {
      await this.redis.ping();
      
      return {
        redis: true,
        memoryUsage: this.errors.size,
        errorCount: this.errors.size,
        patternCount: this.patterns.size
      };
    } catch (error) {
      return {
        redis: false,
        memoryUsage: this.errors.size,
        errorCount: this.errors.size,
        patternCount: this.patterns.size
      };
    }
  }

  // Cleanup
  async close(): Promise<void> {
    await this.redis.quit();
    this.removeAllListeners();
  }
}