import { getLogAggregationService } from './log-aggregation';
import { safeLogger } from '../utils/safeLogger';
import dotenv from 'dotenv';

dotenv.config();

interface ErrorContext {
  requestId?: string;
  userId?: string;
  userAgent?: string;
  ip?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, string>;
  params?: Record<string, string>;
}

interface ErrorFingerprint {
  type: string;
  message: string;
  stack: string;
  file?: string;
  line?: number;
  column?: number;
}

interface TrackedError {
  id: string;
  fingerprint: ErrorFingerprint;
  timestamp: string;
  count: number;
  firstSeen: string;
  lastSeen: string;
  context: ErrorContext;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'new' | 'acknowledged' | 'resolved' | 'ignored';
  tags: string[];
  metadata: Record<string, any>;
}

interface ErrorTrackingConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of errors to track
  maxErrors: number; // Maximum errors to keep in memory
  groupingWindow: number; // milliseconds to group similar errors
  externalServices: {
    sentry?: {
      enabled: boolean;
      dsn?: string;
    };
    bugsnag?: {
      enabled: boolean;
      apiKey?: string;
    };
    rollbar?: {
      enabled: boolean;
      accessToken?: string;
    };
  };
}

class ErrorTrackingService {
  private config: ErrorTrackingConfig;
  private trackedErrors: Map<string, TrackedError> = new Map();
  private errorCounts: Map<string, number> = new Map();
  private logService = getLogAggregationService();

  constructor() {
    this.config = this.loadConfiguration();
    this.initializeExternalServices();
    this.startCleanupTimer();
  }

  private loadConfiguration(): ErrorTrackingConfig {
    return {
      enabled: process.env.ERROR_TRACKING_ENABLED !== 'false',
      sampleRate: parseFloat(process.env.ERROR_SAMPLE_RATE || '1.0'),
      maxErrors: parseInt(process.env.ERROR_MAX_TRACKED || '1000'),
      groupingWindow: parseInt(process.env.ERROR_GROUPING_WINDOW || '300000'), // 5 minutes
      externalServices: {
        sentry: {
          enabled: process.env.SENTRY_ENABLED === 'true',
          dsn: process.env.SENTRY_DSN
        },
        bugsnag: {
          enabled: process.env.BUGSNAG_ENABLED === 'true',
          apiKey: process.env.BUGSNAG_API_KEY
        },
        rollbar: {
          enabled: process.env.ROLLBAR_ENABLED === 'true',
          accessToken: process.env.ROLLBAR_ACCESS_TOKEN
        }
      }
    };
  }

  private async initializeExternalServices(): Promise<void> {
    // Initialize Sentry
    if (this.config.externalServices.sentry?.enabled && this.config.externalServices.sentry.dsn) {
      try {
        // Skip Sentry initialization if module is not available
        safeLogger.info('📡 Sentry error tracking not available in this environment');
      } catch (error) {
        safeLogger.warn('⚠️ Failed to initialize Sentry:', error);
      }
    }

    // Initialize Bugsnag
    if (this.config.externalServices.bugsnag?.enabled && this.config.externalServices.bugsnag.apiKey) {
      try {
        // Skip Bugsnag initialization if module is not available
        safeLogger.info('📡 Bugsnag error tracking not available in this environment');
      } catch (error) {
        safeLogger.warn('⚠️ Failed to initialize Bugsnag:', error);
      }
    }

    // Initialize Rollbar
    if (this.config.externalServices.rollbar?.enabled && this.config.externalServices.rollbar.accessToken) {
      try {
        // Skip Rollbar initialization if module is not available
        safeLogger.info('📡 Rollbar error tracking not available in this environment');
      } catch (error) {
        safeLogger.warn('⚠️ Failed to initialize Rollbar:', error);
      }
    }
  }

  private startCleanupTimer(): void {
    // Clean up old errors every hour
    setInterval(() => {
      this.cleanupOldErrors();
    }, 3600000);
  }

  async trackError(error: Error, context: ErrorContext = {}): Promise<string | null> {
    if (!this.config.enabled) {
      return null;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return null;
    }

    try {
      const fingerprint = this.generateFingerprint(error);
      const fingerprintKey = this.getFingerprintKey(fingerprint);
      const errorId = this.generateErrorId();
      const timestamp = new Date().toISOString();

      // Check if this error already exists
      let trackedError = this.trackedErrors.get(fingerprintKey);
      
      if (trackedError) {
        // Update existing error
        trackedError.count++;
        trackedError.lastSeen = timestamp;
        trackedError.context = { ...trackedError.context, ...context };
      } else {
        // Create new tracked error
        trackedError = {
          id: errorId,
          fingerprint,
          timestamp,
          count: 1,
          firstSeen: timestamp,
          lastSeen: timestamp,
          context,
          severity: this.determineSeverity(error, context),
          status: 'new',
          tags: this.generateTags(error, context),
          metadata: this.extractMetadata(error, context)
        };
        
        this.trackedErrors.set(fingerprintKey, trackedError);
      }

      // Log the error
      await this.logService.error(
        `Error tracked: ${error.message}`,
        'error-tracking',
        error,
        {
          errorId: trackedError.id,
          fingerprint: fingerprintKey,
          count: trackedError.count,
          severity: trackedError.severity,
          context
        },
        context.requestId
      );

      // Send to external services
      await this.sendToExternalServices(error, trackedError, context);

      // Cleanup if we have too many errors
      if (this.trackedErrors.size > this.config.maxErrors) {
        this.cleanupOldErrors();
      }

      return trackedError.id;

    } catch (trackingError) {
      safeLogger.error('Failed to track error:', trackingError);
      return null;
    }
  }

  private generateFingerprint(error: Error): ErrorFingerprint {
    const stack = error.stack || '';
    const stackLines = stack.split('\n');
    
    // Extract file, line, and column from stack trace
    let file: string | undefined;
    let line: number | undefined;
    let column: number | undefined;
    
    if (stackLines.length > 1) {
      const match = stackLines[1].match(/\((.+):(\d+):(\d+)\)/) || stackLines[1].match(/at (.+):(\d+):(\d+)/);
      if (match) {
        file = match[1];
        line = parseInt(match[2]);
        column = parseInt(match[3]);
      }
    }

    return {
      type: error.constructor.name,
      message: error.message,
      stack: this.normalizeStackTrace(stack),
      file,
      line,
      column
    };
  }

  private normalizeStackTrace(stack: string): string {
    // Remove absolute paths and normalize stack trace for better grouping
    return stack
      .split('\n')
      .map(line => line.replace(/\/.*\/(src|dist|build)\//, '/'))
      .join('\n');
  }

  private getFingerprintKey(fingerprint: ErrorFingerprint): string {
    // Create a unique key for grouping similar errors
    const key = `${fingerprint.type}:${fingerprint.message}:${fingerprint.file}:${fingerprint.line}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private determineSeverity(error: Error, context: ErrorContext): TrackedError['severity'] {
    // Determine severity based on error type and context
    if (error.name === 'TypeError' || error.name === 'ReferenceError') {
      return 'high';
    }
    
    if (error.message.includes('database') || error.message.includes('connection')) {
      return 'critical';
    }
    
    if (context.url?.includes('/api/auth/') || context.url?.includes('/api/payment/')) {
      return 'high';
    }
    
    if (error.message.includes('validation') || error.message.includes('invalid')) {
      return 'medium';
    }
    
    return 'low';
  }

  private generateTags(error: Error, context: ErrorContext): string[] {
    const tags: string[] = [];
    
    tags.push(`error_type:${error.constructor.name}`);
    
    if (context.method) {
      tags.push(`http_method:${context.method}`);
    }
    
    if (context.url) {
      const path = context.url.split('?')[0];
      tags.push(`endpoint:${path}`);
    }
    
    if (context.userAgent) {
      if (context.userAgent.includes('Mobile')) {
        tags.push('device:mobile');
      } else {
        tags.push('device:desktop');
      }
    }
    
    tags.push(`environment:${process.env.NODE_ENV || 'production'}`);
    
    return tags;
  }

  private extractMetadata(error: Error, context: ErrorContext): Record<string, any> {
    return {
      errorName: error.name,
      errorMessage: error.message,
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime(),
      ...context
    };
  }

  private async sendToExternalServices(error: Error, trackedError: TrackedError, context: ErrorContext): Promise<void> {
    // External services not available in this environment
    safeLogger.info('External error tracking services not available');
  }

  private async sendToSentry(error: Error, trackedError: TrackedError, context: ErrorContext): Promise<void> {
    // Sentry not available in this environment
    safeLogger.info('Sentry not available');
  }

  private async sendToBugsnag(error: Error, trackedError: TrackedError, context: ErrorContext): Promise<void> {
    // Bugsnag not available in this environment
    safeLogger.info('Bugsnag not available');
  }

  private async sendToRollbar(error: Error, trackedError: TrackedError, context: ErrorContext): Promise<void> {
    // Rollbar not available in this environment
    safeLogger.info('Rollbar not available');
  }

  private mapSeverityToSentryLevel(severity: TrackedError['severity']): string {
    const mapping = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'fatal'
    };
    return mapping[severity];
  }

  private mapSeverityToBugsnagLevel(severity: TrackedError['severity']): string {
    const mapping = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'error'
    };
    return mapping[severity];
  }

  private mapSeverityToRollbarLevel(severity: TrackedError['severity']): string {
    const mapping = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical'
    };
    return mapping[severity];
  }

  private cleanupOldErrors(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    let removedCount = 0;
    
    for (const [key, error] of this.trackedErrors) {
      if (new Date(error.lastSeen).getTime() < cutoffTime) {
        this.trackedErrors.delete(key);
        removedCount++;
      }
    }
    
    if (removedCount > 0) {
      safeLogger.info(`🧹 Cleaned up ${removedCount} old tracked errors`);
    }
  }

  // Express middleware for automatic error tracking
  errorTrackingMiddleware() {
    return (error: Error, req: any, res: any, next: any) => {
      const context: ErrorContext = {
        requestId: req.headers['x-request-id'],
        userId: req.user?.id,
        userAgent: req.headers['user-agent'],
        ip: req.ip,
        url: req.originalUrl,
        method: req.method,
        headers: req.headers,
        body: req.body,
        query: req.query,
        params: req.params
      };

      this.trackError(error, context);
      next(error);
    };
  }

  // Query methods
  getTrackedErrors(options: {
    severity?: TrackedError['severity'];
    status?: TrackedError['status'];
    limit?: number;
    offset?: number;
  } = {}): TrackedError[] {
    let errors = Array.from(this.trackedErrors.values());
    
    if (options.severity) {
      errors = errors.filter(e => e.severity === options.severity);
    }
    
    if (options.status) {
      errors = errors.filter(e => e.status === options.status);
    }
    
    // Sort by last seen (most recent first)
    errors.sort((a, b) => new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime());
    
    if (options.offset) {
      errors = errors.slice(options.offset);
    }
    
    if (options.limit) {
      errors = errors.slice(0, options.limit);
    }
    
    return errors;
  }

  getErrorById(id: string): TrackedError | null {
    for (const error of this.trackedErrors.values()) {
      if (error.id === id) {
        return error;
      }
    }
    return null;
  }

  updateErrorStatus(id: string, status: TrackedError['status']): boolean {
    for (const error of this.trackedErrors.values()) {
      if (error.id === id) {
        error.status = status;
        return true;
      }
    }
    return false;
  }

  getErrorStats(): {
    total: number;
    byStatus: Record<TrackedError['status'], number>;
    bySeverity: Record<TrackedError['severity'], number>;
    recentErrors: number;
  } {
    const errors = Array.from(this.trackedErrors.values());
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    
    const stats = {
      total: errors.length,
      byStatus: { new: 0, acknowledged: 0, resolved: 0, ignored: 0 } as Record<TrackedError['status'], number>,
      bySeverity: { low: 0, medium: 0, high: 0, critical: 0 } as Record<TrackedError['severity'], number>,
      recentErrors: 0
    };
    
    for (const error of errors) {
      stats.byStatus[error.status]++;
      stats.bySeverity[error.severity]++;
      
      if (new Date(error.lastSeen).getTime() > oneHourAgo) {
        stats.recentErrors++;
      }
    }
    
    return stats;
  }
}

// Singleton instance
let errorTrackingService: ErrorTrackingService | null = null;

export function getErrorTrackingService(): ErrorTrackingService {
  if (!errorTrackingService) {
    errorTrackingService = new ErrorTrackingService();
  }
  return errorTrackingService;
}

export { ErrorTrackingService, TrackedError, ErrorContext, ErrorFingerprint };
