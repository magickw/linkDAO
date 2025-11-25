/// <reference lib="dom" />

// Enhanced logger implementation with structured logging and performance monitoring
interface LogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  service: string;
  environment: string;
  requestId?: string;
  correlationId?: string;
  userId?: string;
  sessionId?: string;
  metadata?: any;
  performance?: {
    responseTime?: number;
    memoryUsage?: NodeJS.MemoryUsage;
    cpuUsage?: NodeJS.CpuUsage;
  };
  error?: {
    name?: string;
    message?: string;
    stack?: string;
    code?: string;
    statusCode?: number;
  };
}

interface AlertConfig {
  enabled: boolean;
  webhookUrl?: string;
  emailRecipients?: string[];
  slackChannel?: string;
}

class EnhancedLogger {
  private service: string = 'marketplace-api';
  private environment: string = process.env.NODE_ENV || 'development';
  private alertConfig: AlertConfig = {
    enabled: process.env.ALERTS_ENABLED === 'true',
    webhookUrl: process.env.ALERT_WEBHOOK_URL,
    emailRecipients: process.env.ALERT_EMAIL_RECIPIENTS?.split(','),
    slackChannel: process.env.ALERT_SLACK_CHANNEL
  };

  private formatLogEntry(level: LogEntry['level'], message: string, meta?: any): LogEntry {
    const timestamp = new Date().toISOString();
    
    return {
      timestamp,
      level,
      message,
      service: this.service,
      environment: this.environment,
      requestId: meta?.requestId,
      correlationId: meta?.correlationId,
      userId: meta?.userId,
      sessionId: meta?.sessionId,
      metadata: meta ? { ...meta } : undefined,
      performance: meta?.performance || this.getPerformanceMetrics(),
      error: meta?.error
    };
  }

  private getPerformanceMetrics() {
    return {
      memoryUsage: process.memoryUsage(),
      cpuUsage: process.cpuUsage()
    };
  }

  private async sendAlert(logEntry: LogEntry): Promise<void> {
    if (!this.alertConfig.enabled) return;

    try {
      // Send webhook alert
      if (this.alertConfig.webhookUrl) {
        await this.sendWebhookAlert(logEntry);
      }

      // Send email alert (placeholder - would integrate with email service)
      if (this.alertConfig.emailRecipients?.length) {
        await this.sendEmailAlert(logEntry);
      }

      // Send Slack alert (placeholder - would integrate with Slack API)
      if (this.alertConfig.slackChannel) {
        await this.sendSlackAlert(logEntry);
      }
    } catch (alertError) {
      console.error('Failed to send alert:', alertError);
    }
  }

  private async sendWebhookAlert(logEntry: LogEntry): Promise<void> {
    if (!this.alertConfig.webhookUrl) return;

    const alertPayload = {
      service: logEntry.service,
      level: logEntry.level,
      message: logEntry.message,
      timestamp: logEntry.timestamp,
      environment: logEntry.environment,
      requestId: logEntry.requestId,
      error: logEntry.error,
      metadata: {
        url: logEntry.metadata?.request?.url,
        method: logEntry.metadata?.request?.method,
        statusCode: logEntry.error?.statusCode,
        responseTime: logEntry.performance?.responseTime
      }
    };

    try {
      const response = await fetch(this.alertConfig.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alertPayload)
      });

      if (!response.ok) {
        throw new Error(`Webhook alert failed: ${response.status}`);
      }
    } catch (error) {
      console.error('Webhook alert failed:', error);
    }
  }

  private async sendEmailAlert(logEntry: LogEntry): Promise<void> {
    // Placeholder for email integration
    console.info('Email alert would be sent to:', this.alertConfig.emailRecipients);
  }

  private async sendSlackAlert(logEntry: LogEntry): Promise<void> {
    // Placeholder for Slack integration
    console.info('Slack alert would be sent to:', this.alertConfig.slackChannel);
  }

  private shouldAlert(level: LogEntry['level'], meta?: any): boolean {
    // Alert on all errors
    if (level === 'error') return true;
    
    // Alert on critical warnings
    if (level === 'warn' && meta?.critical) return true;
    
    // Alert on slow requests (> 5 seconds)
    if (meta?.performance?.responseTime > 5000) return true;
    
    // Alert on high memory usage (> 500MB)
    if (meta?.performance?.memoryUsage?.heapUsed > 500 * 1024 * 1024) return true;
    
    return false;
  }

  info(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('info', message, meta);
    
    if (this.environment === 'development') {
      console.info(`[${logEntry.timestamp}] INFO: ${message}`, meta || '');
    } else {
      console.info(JSON.stringify(logEntry));
    }

    if (this.shouldAlert('info', meta)) {
      this.sendAlert(logEntry);
    }
  }

  warn(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('warn', message, meta);
    
    if (this.environment === 'development') {
      console.warn(`[${logEntry.timestamp}] WARN: ${message}`, meta || '');
    } else {
      console.warn(JSON.stringify(logEntry));
    }

    if (this.shouldAlert('warn', meta)) {
      this.sendAlert(logEntry);
    }
  }

  error(message: string, meta?: any): void {
    const logEntry = this.formatLogEntry('error', message, meta);
    
    if (this.environment === 'development') {
      console.error(`[${logEntry.timestamp}] ERROR: ${message}`, meta || '');
    } else {
      console.error(JSON.stringify(logEntry));
    }

    // Always try to send alerts for errors
    this.sendAlert(logEntry);
  }

  debug(message: string, meta?: any): void {
    // Only log debug messages in development
    if (this.environment !== 'development') return;
    
    const logEntry = this.formatLogEntry('debug', message, meta);
    console.debug(`[${logEntry.timestamp}] DEBUG: ${message}`, meta || '');
  }

  // Performance monitoring methods
  startTimer(label: string): () => number {
    const start = Date.now();
    return () => {
      const duration = Date.now() - start;
      this.info(`Performance: ${label}`, {
        performance: { responseTime: duration },
        label
      });
      return duration;
    };
  }

  logPerformance(operation: string, duration: number, meta?: any): void {
    const level = duration > 2000 ? 'warn' : 'info';
    const message = `Performance: ${operation} took ${duration}ms`;
    
    this[level](message, {
      ...meta,
      performance: { responseTime: duration },
      operation
    });
  }

  // Error rate monitoring
  private errorCounts: Map<string, { count: number, lastReset: number }> = new Map();

  trackErrorRate(errorCode: string): void {
    const now = Date.now();
    const key = errorCode;
    const current = this.errorCounts.get(key) || { count: 0, lastReset: now };
    
    // Reset counter every hour
    if (now - current.lastReset > 3600000) {
      current.count = 0;
      current.lastReset = now;
    }
    
    current.count++;
    this.errorCounts.set(key, current);
    
    // Alert if error rate is high (> 10 errors per hour)
    if (current.count > 10) {
      this.error(`High error rate detected for ${errorCode}`, {
        errorCode,
        errorCount: current.count,
        timeWindow: '1 hour',
        critical: true
      });
    }
  }

  // Service health monitoring
  logServiceHealth(serviceName: string, isHealthy: boolean, responseTime?: number, error?: any): void {
    const message = `Service ${serviceName} health check: ${isHealthy ? 'HEALTHY' : 'UNHEALTHY'}`;
    const level = isHealthy ? 'info' : 'error';
    
    this[level](message, {
      service: serviceName,
      healthy: isHealthy,
      performance: responseTime ? { responseTime } : undefined,
      error: error ? {
        name: error.name,
        message: error.message,
        code: error.code
      } : undefined,
      critical: !isHealthy
    });
  }
}

// Export singleton instance
export const logger = new EnhancedLogger();

// Export types for use in other modules
export type { LogEntry, AlertConfig };
