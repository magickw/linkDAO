import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { sql } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface SellerError {
  id: string;
  sellerId: string;
  errorType: 'api' | 'component' | 'cache' | 'network' | 'validation' | 'security' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  stack?: string;
  context: {
    component?: string;
    endpoint?: string;
    userAgent?: string;
    url?: string;
    userId?: string;
    sessionId?: string;
    timestamp: string;
    metadata?: any;
  };
  fingerprint: string; // For error grouping
  count: number;
  firstSeen: string;
  lastSeen: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
}

export interface ErrorAlert {
  id: string;
  sellerId: string;
  errorId: string;
  alertType: 'new_error' | 'error_spike' | 'critical_error' | 'error_threshold';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  threshold?: number;
  currentValue?: number;
  timestamp: string;
  acknowledged: boolean;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
}

export interface ErrorMetrics {
  sellerId: string;
  timeframe: string;
  totalErrors: number;
  errorRate: number;
  errorsByType: Record<string, number>;
  errorsBySeverity: Record<string, number>;
  topErrors: Array<{
    fingerprint: string;
    message: string;
    count: number;
    lastSeen: string;
  }>;
  trends: Array<{
    timestamp: string;
    errorCount: number;
    errorRate: number;
  }>;
}

export class SellerErrorTrackingService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly ERROR_RETENTION_DAYS = 90;
  private readonly ALERT_THRESHOLDS = {
    error_rate: 5, // 5% error rate threshold
    error_spike: 10, // 10x increase in errors
    critical_errors: 1, // Any critical error triggers alert
  };

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Track a seller error
   */
  async trackError(
    sellerId: string,
    error: {
      type: string;
      severity: 'low' | 'medium' | 'high' | 'critical';
      message: string;
      stack?: string;
      context: any;
    }
  ): Promise<SellerError> {
    try {
      const fingerprint = this.generateErrorFingerprint(error.message, error.stack, error.context);
      const timestamp = new Date().toISOString();

      // Check if this error already exists
      const existingError = await this.getErrorByFingerprint(sellerId, fingerprint);

      if (existingError) {
        // Update existing error
        const updatedError = await this.updateExistingError(existingError, timestamp);
        
        // Check for error spikes
        await this.checkErrorSpike(sellerId, updatedError);
        
        return updatedError;
      } else {
        // Create new error
        const newError = await this.createNewError(sellerId, error, fingerprint, timestamp);
        
        // Check for critical error alerts
        if (error.severity === 'critical') {
          await this.createErrorAlert(sellerId, newError, 'critical_error');
        }
        
        return newError;
      }
    } catch (err) {
      safeLogger.error('Error tracking seller error:', err);
      throw new Error('Failed to track seller error');
    }
  }

  /**
   * Get error metrics for a seller
   */
  async getErrorMetrics(
    sellerId: string,
    timeframe: 'hour' | 'day' | 'week' | 'month' = 'day'
  ): Promise<ErrorMetrics> {
    try {
      const cacheKey = `seller:errors:metrics:${sellerId}:${timeframe}`;
      const cached = await this.redis.get(cacheKey);
      
      if (cached) {
        return JSON.parse(cached);
      }

      const timeframeSql = this.getTimeframeSql(timeframe);
      
      // Get error counts and rates
      const errorStats = await db.execute(sql`
        SELECT 
          COUNT(*) as total_errors,
          COUNT(DISTINCT fingerprint) as unique_errors,
          COUNT(*) FILTER (WHERE error_type = 'api') as api_errors,
          COUNT(*) FILTER (WHERE error_type = 'component') as component_errors,
          COUNT(*) FILTER (WHERE error_type = 'cache') as cache_errors,
          COUNT(*) FILTER (WHERE error_type = 'network') as network_errors,
          COUNT(*) FILTER (WHERE severity = 'low') as low_severity,
          COUNT(*) FILTER (WHERE severity = 'medium') as medium_severity,
          COUNT(*) FILTER (WHERE severity = 'high') as high_severity,
          COUNT(*) FILTER (WHERE severity = 'critical') as critical_severity
        FROM seller_errors 
        WHERE seller_id = ${sellerId} 
          AND last_seen >= NOW() - INTERVAL '1 ${sql.raw(timeframe)}'
      `);

      // Get top errors
      const topErrors = await db.execute(sql`
        SELECT fingerprint, message, count, last_seen
        FROM seller_errors 
        WHERE seller_id = ${sellerId} 
          AND last_seen >= NOW() - INTERVAL '1 ${sql.raw(timeframe)}'
        ORDER BY count DESC 
        LIMIT 10
      `);

      // Get error trends
      const trends = await db.execute(sql`
        SELECT 
          ${sql.raw(timeframeSql)} as period,
          COUNT(*) as error_count,
          COUNT(*)::float / NULLIF(
            (SELECT COUNT(*) FROM seller_requests 
             WHERE seller_id = ${sellerId} 
               AND created_at >= ${sql.raw(timeframeSql)}), 0
          ) * 100 as error_rate
        FROM seller_errors 
        WHERE seller_id = ${sellerId} 
          AND last_seen >= NOW() - INTERVAL '30 ${sql.raw(timeframe)}s'
        GROUP BY ${sql.raw(timeframeSql)}
        ORDER BY period DESC
        LIMIT 30
      `);

      const stats = errorStats[0];
      const totalRequests = await this.getTotalRequests(sellerId, timeframe);
      const errorRate = totalRequests > 0 ? (Number(stats?.total_errors) / totalRequests) * 100 : 0;

      const metrics: ErrorMetrics = {
        sellerId,
        timeframe,
        totalErrors: Number(stats?.total_errors) || 0,
        errorRate,
        errorsByType: {
          api: Number(stats?.api_errors) || 0,
          component: Number(stats?.component_errors) || 0,
          cache: Number(stats?.cache_errors) || 0,
          network: Number(stats?.network_errors) || 0,
        },
        errorsBySeverity: {
          low: Number(stats?.low_severity) || 0,
          medium: Number(stats?.medium_severity) || 0,
          high: Number(stats?.high_severity) || 0,
          critical: Number(stats?.critical_severity) || 0,
        },
        topErrors: topErrors.map(row => ({
          fingerprint: String(row.fingerprint),
          message: String(row.message),
          count: Number(row.count),
          lastSeen: String(row.last_seen)
        })),
        trends: trends.map(row => ({
          timestamp: String(row.period),
          errorCount: Number(row.error_count),
          errorRate: Number(row.error_rate) || 0
        }))
      };

      await this.redis.setex(cacheKey, this.CACHE_TTL, JSON.stringify(metrics));
      return metrics;

    } catch (error) {
      safeLogger.error('Error getting error metrics:', error);
      throw new Error('Failed to retrieve error metrics');
    }
  }

  /**
   * Get error alerts for a seller
   */
  async getErrorAlerts(
    sellerId: string,
    acknowledged?: boolean
  ): Promise<ErrorAlert[]> {
    try {
      let query = sql`
        SELECT * FROM seller_error_alerts 
        WHERE seller_id = ${sellerId}
      `;

      if (acknowledged !== undefined) {
        query = sql`${query} AND acknowledged = ${acknowledged}`;
      }

      query = sql`${query} ORDER BY timestamp DESC LIMIT 50`;

      const result = await db.execute(query);
      
      return result.map(row => ({
        id: String(row.id),
        sellerId: String(row.seller_id),
        errorId: String(row.error_id),
        alertType: String(row.alert_type) as any,
        severity: String(row.severity) as any,
        title: String(row.title),
        description: String(row.description),
        threshold: row.threshold ? Number(row.threshold) : undefined,
        currentValue: row.current_value ? Number(row.current_value) : undefined,
        timestamp: String(row.timestamp),
        acknowledged: Boolean(row.acknowledged),
        acknowledgedAt: row.acknowledged_at ? String(row.acknowledged_at) : undefined,
        acknowledgedBy: row.acknowledged_by ? String(row.acknowledged_by) : undefined
      }));

    } catch (error) {
      safeLogger.error('Error getting error alerts:', error);
      return [];
    }
  }

  /**
   * Acknowledge an error alert
   */
  async acknowledgeAlert(
    alertId: string,
    acknowledgedBy: string
  ): Promise<void> {
    try {
      const acknowledgedAt = new Date().toISOString();

      await db.execute(sql`
        UPDATE seller_error_alerts 
        SET acknowledged = true, 
            acknowledged_at = ${acknowledgedAt},
            acknowledged_by = ${acknowledgedBy}
        WHERE id = ${alertId}
      `);

    } catch (error) {
      safeLogger.error('Error acknowledging alert:', error);
      throw new Error('Failed to acknowledge alert');
    }
  }

  /**
   * Resolve an error
   */
  async resolveError(
    errorId: string,
    resolvedBy: string,
    resolution?: string
  ): Promise<void> {
    try {
      const resolvedAt = new Date().toISOString();

      await db.execute(sql`
        UPDATE seller_errors 
        SET resolved = true, 
            resolved_at = ${resolvedAt},
            resolved_by = ${resolvedBy}
        WHERE id = ${errorId}
      `);

      // Also resolve related alerts
      await db.execute(sql`
        UPDATE seller_error_alerts 
        SET acknowledged = true,
            acknowledged_at = ${resolvedAt},
            acknowledged_by = ${resolvedBy}
        WHERE error_id = ${errorId} AND acknowledged = false
      `);

    } catch (error) {
      safeLogger.error('Error resolving error:', error);
      throw new Error('Failed to resolve error');
    }
  }

  /**
   * Get error details by ID
   */
  async getErrorById(errorId: string): Promise<SellerError | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM seller_errors WHERE id = ${errorId}
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: String(row.id),
        sellerId: String(row.seller_id),
        errorType: String(row.error_type) as any,
        severity: String(row.severity) as any,
        message: String(row.message),
        stack: row.stack ? String(row.stack) : undefined,
        context: JSON.parse(String(row.context)),
        fingerprint: String(row.fingerprint),
        count: Number(row.count),
        firstSeen: String(row.first_seen),
        lastSeen: String(row.last_seen),
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
        resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined
      };

    } catch (error) {
      safeLogger.error('Error getting error by ID:', error);
      return null;
    }
  }

  /**
   * Clean up old errors
   */
  async cleanupOldErrors(): Promise<number> {
    try {
      const result = await db.execute(sql`
        DELETE FROM seller_errors 
        WHERE last_seen < NOW() - INTERVAL '${sql.raw(this.ERROR_RETENTION_DAYS.toString())} days'
          AND resolved = true
        RETURNING 1 as count
      `);

      // In Drizzle ORM, the result is an array of rows
      // For DELETE with RETURNING, we get the returned rows
      return result.length;
    } catch (error) {
      safeLogger.error('Error cleaning up old errors:', error);
      return 0;
    }
  }

  // Private helper methods

  private generateErrorFingerprint(message: string, stack?: string, context?: any): string {
    // Create a unique fingerprint for error grouping
    const key = `${message}:${stack?.split('\n')[0] || ''}:${context?.component || ''}`;
    return Buffer.from(key).toString('base64').substring(0, 32);
  }

  private async getErrorByFingerprint(sellerId: string, fingerprint: string): Promise<SellerError | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM seller_errors 
        WHERE seller_id = ${sellerId} AND fingerprint = ${fingerprint}
      `);

      if (result.length === 0) {
        return null;
      }

      const row = result[0];
      return {
        id: String(row.id),
        sellerId: String(row.seller_id),
        errorType: String(row.error_type) as any,
        severity: String(row.severity) as any,
        message: String(row.message),
        stack: row.stack ? String(row.stack) : undefined,
        context: JSON.parse(String(row.context)),
        fingerprint: String(row.fingerprint),
        count: Number(row.count),
        firstSeen: String(row.first_seen),
        lastSeen: String(row.last_seen),
        resolved: Boolean(row.resolved),
        resolvedAt: row.resolved_at ? String(row.resolved_at) : undefined,
        resolvedBy: row.resolved_by ? String(row.resolved_by) : undefined
      };

    } catch (error) {
      safeLogger.error('Error getting error by fingerprint:', error);
      return null;
    }
  }

  private async updateExistingError(existingError: SellerError, timestamp: string): Promise<SellerError> {
    const newCount = existingError.count + 1;

    await db.execute(sql`
      UPDATE seller_errors 
      SET count = ${newCount}, 
          last_seen = ${timestamp}
      WHERE id = ${existingError.id}
    `);

    return {
      ...existingError,
      count: newCount,
      lastSeen: timestamp
    };
  }

  private async createNewError(
    sellerId: string,
    error: any,
    fingerprint: string,
    timestamp: string
  ): Promise<SellerError> {
    const errorId = `error-${sellerId}-${Date.now()}`;

    await db.execute(sql`
      INSERT INTO seller_errors (
        id, seller_id, error_type, severity, message, stack, context,
        fingerprint, count, first_seen, last_seen, resolved
      ) VALUES (
        ${errorId}, ${sellerId}, ${error.type}, ${error.severity}, ${error.message},
        ${error.stack || null}, ${JSON.stringify(error.context)}, ${fingerprint},
        1, ${timestamp}, ${timestamp}, false
      )
    `);

    return {
      id: errorId,
      sellerId,
      errorType: error.type,
      severity: error.severity,
      message: error.message,
      stack: error.stack,
      context: error.context,
      fingerprint,
      count: 1,
      firstSeen: timestamp,
      lastSeen: timestamp,
      resolved: false
    };
  }

  private async checkErrorSpike(sellerId: string, error: SellerError): Promise<void> {
    // Check if error count has spiked significantly
    const recentCount = await this.getRecentErrorCount(sellerId, error.fingerprint, '1 hour');
    const historicalAverage = await this.getHistoricalErrorAverage(sellerId, error.fingerprint);

    if (recentCount > historicalAverage * this.ALERT_THRESHOLDS.error_spike) {
      await this.createErrorAlert(sellerId, error, 'error_spike', {
        threshold: historicalAverage * this.ALERT_THRESHOLDS.error_spike,
        currentValue: recentCount
      });
    }
  }

  private async createErrorAlert(
    sellerId: string,
    error: SellerError,
    alertType: 'new_error' | 'error_spike' | 'critical_error' | 'error_threshold',
    options?: { threshold?: number; currentValue?: number }
  ): Promise<void> {
    const alertId = `alert-${sellerId}-${Date.now()}`;
    const timestamp = new Date().toISOString();

    const alertTitles = {
      new_error: 'New Error Detected',
      error_spike: 'Error Spike Detected',
      critical_error: 'Critical Error Occurred',
      error_threshold: 'Error Threshold Exceeded'
    };

    const alertDescriptions = {
      new_error: `A new error has been detected: ${error.message}`,
      error_spike: `Error "${error.message}" has spiked significantly`,
      critical_error: `Critical error occurred: ${error.message}`,
      error_threshold: `Error rate has exceeded the configured threshold`
    };

    await db.execute(sql`
      INSERT INTO seller_error_alerts (
        id, seller_id, error_id, alert_type, severity, title, description,
        threshold, current_value, timestamp, acknowledged
      ) VALUES (
        ${alertId}, ${sellerId}, ${error.id}, ${alertType}, ${error.severity},
        ${alertTitles[alertType]}, ${alertDescriptions[alertType]},
        ${options?.threshold || null}, ${options?.currentValue || null},
        ${timestamp}, false
      )
    `);

    // Send real-time notification
    await this.sendAlertNotification(sellerId, {
      id: alertId,
      sellerId,
      errorId: error.id,
      alertType,
      severity: error.severity,
      title: alertTitles[alertType],
      description: alertDescriptions[alertType],
      threshold: options?.threshold,
      currentValue: options?.currentValue,
      timestamp,
      acknowledged: false
    });
  }

  private async sendAlertNotification(sellerId: string, alert: ErrorAlert): Promise<void> {
    try {
      // Send to Redis pub/sub for real-time notifications
      await this.redis.publish(
        `seller:error-alerts:${sellerId}`,
        JSON.stringify(alert)
      );

      // Could also integrate with email, Slack, etc.
    } catch (error) {
      safeLogger.error('Error sending alert notification:', error);
    }
  }

  private async getRecentErrorCount(sellerId: string, fingerprint: string, timeframe: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT count FROM seller_errors 
      WHERE seller_id = ${sellerId} 
        AND fingerprint = ${fingerprint}
        AND last_seen >= NOW() - INTERVAL '${sql.raw(timeframe)}'
    `);

    return result.length > 0 ? Number(result[0].count) : 0;
  }

  private async getHistoricalErrorAverage(sellerId: string, fingerprint: string): Promise<number> {
    const result = await db.execute(sql`
      SELECT AVG(count) as avg_count FROM seller_errors 
      WHERE seller_id = ${sellerId} 
        AND fingerprint = ${fingerprint}
        AND last_seen >= NOW() - INTERVAL '7 days'
        AND last_seen < NOW() - INTERVAL '1 hour'
    `);

    return result.length > 0 ? Number(result[0].avg_count) || 1 : 1;
  }

  private async getTotalRequests(sellerId: string, timeframe: string): Promise<number> {
    // This would query a requests table to get total request count
    // For now, return a mock value
    return 1000;
  }

  private getTimeframeSql(timeframe: string): string {
    switch (timeframe) {
      case 'hour':
        return 'DATE_TRUNC(\'hour\', last_seen)';
      case 'day':
        return 'DATE_TRUNC(\'day\', last_seen)';
      case 'week':
        return 'DATE_TRUNC(\'week\', last_seen)';
      case 'month':
        return 'DATE_TRUNC(\'month\', last_seen)';
      default:
        return 'DATE_TRUNC(\'day\', last_seen)';
    }
  }
}

export const sellerErrorTrackingService = new SellerErrorTrackingService();
