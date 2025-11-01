import { Logger } from 'winston';
import winston from 'winston';
import { moderation_cases, moderation_actions, content_reports } from '../db/schema';
import { db } from '../db/connectionPool';
import { eq } from 'drizzle-orm';

export interface ModerationLogEntry {
  timestamp: Date;
  eventType: 'decision' | 'action' | 'appeal' | 'report' | 'error';
  caseId?: number;
  contentId: string;
  userId: string;
  decision?: string;
  confidence?: number;
  vendorScores?: Record<string, number>;
  latency?: number;
  cost?: number;
  moderatorId?: string;
  reasoning?: string;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  totalDecisions: number;
  averageLatency: number;
  totalCost: number;
  vendorLatencies: Record<string, number>;
  vendorCosts: Record<string, number>;
  errorRate: number;
  throughput: number;
}

export interface AccuracyMetrics {
  falsePositiveRate: number;
  falseNegativeRate: number;
  appealOverturnRate: number;
  humanAgreementRate: number;
  categoryAccuracy: Record<string, number>;
}

class ModerationLoggingService {
  private logger: Logger;
  private metricsBuffer: ModerationLogEntry[] = [];
  private readonly BUFFER_SIZE = 1000;
  private readonly FLUSH_INTERVAL = 30000; // 30 seconds

  constructor() {
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      defaultMeta: { service: 'moderation' },
      transports: [
        new winston.transports.File({ 
          filename: 'logs/moderation-error.log', 
          level: 'error' 
        }),
        new winston.transports.File({ 
          filename: 'logs/moderation-combined.log' 
        }),
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });

    // Start periodic metrics flush
    setInterval(() => this.flushMetrics(), this.FLUSH_INTERVAL);
  }

  /**
   * Log a moderation decision with structured data
   */
  async logModerationDecision(entry: ModerationLogEntry): Promise<void> {
    try {
      // Add to structured log
      this.logger.info('moderation_decision', {
        ...entry,
        timestamp: entry.timestamp.toISOString()
      });

      // Add to metrics buffer
      this.metricsBuffer.push(entry);

      // Flush if buffer is full
      if (this.metricsBuffer.length >= this.BUFFER_SIZE) {
        await this.flushMetrics();
      }

      // Store in database for audit trail
      if (entry.caseId) {
        await this.updateCaseAuditLog(entry);
      }

    } catch (error) {
      this.logger.error('Failed to log moderation decision', {
        error: error instanceof Error ? error.message : 'Unknown error',
        entry
      });
    }
  }

  /**
   * Log moderation action (block, limit, etc.)
   */
  async logModerationAction(
    userId: string,
    contentId: string,
    action: string,
    moderatorId?: string,
    reasoning?: string
  ): Promise<void> {
    const entry: ModerationLogEntry = {
      timestamp: new Date(),
      eventType: 'action',
      contentId,
      userId,
      decision: action,
      moderatorId,
      reasoning
    };

    await this.logModerationDecision(entry);
  }

  /**
   * Log appeal submission and outcome
   */
  async logAppealEvent(
    caseId: number,
    contentId: string,
    userId: string,
    eventType: 'submitted' | 'decided',
    outcome?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: ModerationLogEntry = {
      timestamp: new Date(),
      eventType: 'appeal',
      caseId,
      contentId,
      userId,
      decision: outcome,
      metadata: {
        appealEventType: eventType,
        ...metadata
      }
    };

    await this.logModerationDecision(entry);
  }

  /**
   * Log community report
   */
  async logCommunityReport(
    contentId: string,
    reporterId: string,
    reason: string,
    weight: number
  ): Promise<void> {
    const entry: ModerationLogEntry = {
      timestamp: new Date(),
      eventType: 'report',
      contentId,
      userId: reporterId,
      metadata: {
        reason,
        weight
      }
    };

    await this.logModerationDecision(entry);
  }

  /**
   * Log system errors and failures
   */
  async logModerationError(
    contentId: string,
    error: Error,
    context?: Record<string, any>
  ): Promise<void> {
    const entry: ModerationLogEntry = {
      timestamp: new Date(),
      eventType: 'error',
      contentId,
      userId: 'system',
      metadata: {
        error: error.message,
        stack: error.stack,
        ...context
      }
    };

    this.logger.error('moderation_error', {
      ...entry,
      timestamp: entry.timestamp.toISOString()
    });

    this.metricsBuffer.push(entry);
  }

  /**
   * Calculate performance metrics from recent logs
   */
  async getPerformanceMetrics(timeWindow: number = 3600000): Promise<PerformanceMetrics> {
    const cutoff = new Date(Date.now() - timeWindow);
    const recentEntries = this.metricsBuffer.filter(
      entry => entry.timestamp >= cutoff && entry.eventType === 'decision'
    );

    if (recentEntries.length === 0) {
      return {
        totalDecisions: 0,
        averageLatency: 0,
        totalCost: 0,
        vendorLatencies: {},
        vendorCosts: {},
        errorRate: 0,
        throughput: 0
      };
    }

    const totalLatency = recentEntries.reduce((sum, entry) => sum + (entry.latency || 0), 0);
    const totalCost = recentEntries.reduce((sum, entry) => sum + (entry.cost || 0), 0);
    const errorEntries = this.metricsBuffer.filter(
      entry => entry.timestamp >= cutoff && entry.eventType === 'error'
    );

    // Calculate vendor-specific metrics
    const vendorLatencies: Record<string, number> = {};
    const vendorCosts: Record<string, number> = {};
    const vendorCounts: Record<string, number> = {};

    recentEntries.forEach(entry => {
      if (entry.vendorScores) {
        Object.keys(entry.vendorScores).forEach(vendor => {
          if (!vendorLatencies[vendor]) {
            vendorLatencies[vendor] = 0;
            vendorCosts[vendor] = 0;
            vendorCounts[vendor] = 0;
          }
          vendorLatencies[vendor] += entry.latency || 0;
          vendorCosts[vendor] += (entry.cost || 0) / Object.keys(entry.vendorScores!).length;
          vendorCounts[vendor]++;
        });
      }
    });

    // Average vendor metrics
    Object.keys(vendorLatencies).forEach(vendor => {
      if (vendorCounts[vendor] > 0) {
        vendorLatencies[vendor] /= vendorCounts[vendor];
        vendorCosts[vendor] /= vendorCounts[vendor];
      }
    });

    return {
      totalDecisions: recentEntries.length,
      averageLatency: totalLatency / recentEntries.length,
      totalCost,
      vendorLatencies,
      vendorCosts,
      errorRate: errorEntries.length / (recentEntries.length + errorEntries.length),
      throughput: recentEntries.length / (timeWindow / 1000) // decisions per second
    };
  }

  /**
   * Calculate accuracy metrics from database
   */
  async getAccuracyMetrics(timeWindow: number = 86400000): Promise<AccuracyMetrics> {
    const cutoff = new Date(Date.now() - timeWindow);

    try {
      // Get cases with appeals
      const appealedCases = await db
        .select()
        .from(moderation_cases)
        .where(eq(moderation_cases.status, 'appealed'))
        .limit(1000);

      // Calculate overturn rate
      const totalAppeals = appealedCases.length;
      const overturned = appealedCases.filter(
        case_ => case_.decision !== case_.status
      ).length;

      // Get human review cases for agreement rate
      const humanReviewCases = await db
        .select()
        .from(moderation_cases)
        .limit(1000);

      // Calculate category-specific accuracy
      const categoryAccuracy: Record<string, number> = {};
      const categoryGroups = humanReviewCases.reduce((groups, case_) => {
        const category = case_.reasonCode || 'unknown';
        if (!groups[category]) groups[category] = [];
        groups[category].push(case_);
        return groups;
      }, {} as Record<string, any[]>);

      Object.keys(categoryGroups).forEach(category => {
        const cases = categoryGroups[category];
        const accurate = cases.filter(case_ => case_.confidence > 0.8).length;
        categoryAccuracy[category] = cases.length > 0 ? accurate / cases.length : 0;
      });

      return {
        falsePositiveRate: 0.05, // Placeholder - would calculate from appeal outcomes
        falseNegativeRate: 0.03, // Placeholder - would calculate from missed content
        appealOverturnRate: totalAppeals > 0 ? overturned / totalAppeals : 0,
        humanAgreementRate: 0.92, // Placeholder - would calculate from human vs AI agreement
        categoryAccuracy
      };

    } catch (error) {
      this.logger.error('Failed to calculate accuracy metrics', { error });
      return {
        falsePositiveRate: 0,
        falseNegativeRate: 0,
        appealOverturnRate: 0,
        humanAgreementRate: 0,
        categoryAccuracy: {}
      };
    }
  }

  /**
   * Get structured logs for analysis
   */
  async getStructuredLogs(
    startTime: Date,
    endTime: Date,
    eventType?: string,
    limit: number = 1000
  ): Promise<ModerationLogEntry[]> {
    return this.metricsBuffer
      .filter(entry => {
        const timeMatch = entry.timestamp >= startTime && entry.timestamp <= endTime;
        const typeMatch = !eventType || entry.eventType === eventType;
        return timeMatch && typeMatch;
      })
      .slice(0, limit);
  }

  /**
   * Flush metrics buffer to persistent storage
   */
  private async flushMetrics(): Promise<void> {
    if (this.metricsBuffer.length === 0) return;

    try {
      // In a real implementation, this would write to a time-series database
      // like InfluxDB, Prometheus, or CloudWatch
      this.logger.info('metrics_flush', {
        count: this.metricsBuffer.length,
        timestamp: new Date().toISOString()
      });

      // Keep only recent entries in memory
      const cutoff = new Date(Date.now() - 3600000); // 1 hour
      this.metricsBuffer = this.metricsBuffer.filter(
        entry => entry.timestamp >= cutoff
      );

    } catch (error) {
      this.logger.error('Failed to flush metrics', { error });
    }
  }

  /**
   * Update case audit log in database
   */
  private async updateCaseAuditLog(entry: ModerationLogEntry): Promise<void> {
    if (!entry.caseId) return;

    try {
      // Update the case with latest decision info
      await db
        .update(moderation_cases)
        .set({
          updatedAt: entry.timestamp,
          decision: entry.decision,
          confidence: entry.confidence,
          vendorScores: entry.vendorScores
        })
        .where(eq(moderation_cases.id, entry.caseId));

    } catch (error) {
      this.logger.error('Failed to update case audit log', {
        error,
        caseId: entry.caseId
      });
    }
  }
}

export const moderationLoggingService = new ModerationLoggingService();
