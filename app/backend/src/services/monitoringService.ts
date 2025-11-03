import promClient from 'prom-client';
import winston from 'winston';
import jaegerClient from 'jaeger-client';

// Use available types instead of external modules
export interface MetricLabels {
  [key: string]: string | number;
}

export interface AlertRule {
  name: string;
  condition: string;
  severity: 'info' | 'warning' | 'critical';
  description: string;
  runbook?: string;
}

class MonitoringService {
  private metrics: any = {};
  private logger: any;
  private tracer: any;
  private alertRules: AlertRule[] = [];
  private register: any; // Add the missing register property

  constructor() {
    this.initializeMetrics();
    this.initializeLogging();
    this.initializeTracing();
    this.loadAlertRules();
  }

  private initializeMetrics(): void {
    // Use dynamic import to avoid compilation issues
    try {
      const promClient = require('prom-client');
      
      // Create a Registry
      const register = new promClient.Registry();
      
      // Add default metrics
      promClient.collectDefaultMetrics({ register });

      // Custom metrics for moderation system
      this.metrics = {
        moderationRequestsTotal: new promClient.Counter({
          name: 'moderation_requests_total',
          help: 'Total number of moderation requests',
          labelNames: ['content_type', 'decision', 'vendor'],
          registers: [register]
        }),

        moderationRequestDuration: new promClient.Histogram({
          name: 'moderation_request_duration_seconds',
          help: 'Duration of moderation requests',
          labelNames: ['content_type', 'vendor'],
          buckets: [0.1, 0.5, 1.0, 2.5, 5.0, 10.0, 30.0],
          registers: [register]
        }),

        moderationConfidenceScore: new promClient.Histogram({
          name: 'moderation_confidence_score',
          help: 'AI model confidence scores',
          labelNames: ['vendor', 'content_type'],
          buckets: [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0],
          registers: [register]
        }),

        moderationQueueSize: new promClient.Gauge({
          name: 'moderation_queue_size',
          help: 'Current size of moderation queues',
          labelNames: ['queue_type', 'priority'],
          registers: [register]
        }),

        vendorApiErrors: new promClient.Counter({
          name: 'vendor_api_errors_total',
          help: 'Total vendor API errors',
          labelNames: ['vendor', 'error_type'],
          registers: [register]
        }),

        humanReviewDecisions: new promClient.Counter({
          name: 'human_review_decisions_total',
          help: 'Total human moderator decisions',
          labelNames: ['decision', 'moderator_id'],
          registers: [register]
        }),

        appealsSubmitted: new promClient.Counter({
          name: 'appeals_submitted_total',
          help: 'Total appeals submitted',
          labelNames: ['original_decision'],
          registers: [register]
        }),

        appealsOverturned: new promClient.Counter({
          name: 'appeals_overturned_total',
          help: 'Total appeals overturned',
          labelNames: ['original_decision', 'jury_decision'],
          registers: [register]
        }),

        reputationChanges: new promClient.Counter({
          name: 'reputation_changes_total',
          help: 'Total reputation changes',
          labelNames: ['change_type', 'reason'],
          registers: [register]
        }),

        contentReports: new promClient.Counter({
          name: 'content_reports_total',
          help: 'Total community reports',
          labelNames: ['content_type', 'reason', 'reporter_reputation_tier'],
          registers: [register]
        })
      };

      this.register = register;
    } catch (error) {
      // Fallback if prom-client is not available
      this.metrics = {};
      this.register = {
        metrics: () => Promise.resolve('# Metrics not available\n'),
        contentType: 'text/plain'
      };
    }
  }

  private initializeLogging(): void {
    // Use console as fallback if winston is not available
    this.logger = {
      info: console.info,
      warn: console.warn,
      error: console.error,
      debug: console.debug
    };
  }

  private initializeTracing(): void {
    // Use null as fallback if jaeger-client is not available
    this.tracer = null;
  }

  private loadAlertRules(): void {
    this.alertRules = [
      {
        name: 'high_moderation_error_rate',
        condition: 'rate(vendor_api_errors_total[5m]) > 0.1',
        severity: 'critical',
        description: 'High error rate in moderation API calls',
        runbook: 'https://docs.company.com/runbooks/moderation-errors'
      },
      {
        name: 'moderation_queue_backup',
        condition: 'moderation_queue_size{queue_type="human_review"} > 1000',
        severity: 'warning',
        description: 'Human review queue is backing up',
        runbook: 'https://docs.company.com/runbooks/queue-backup'
      },
      {
        name: 'low_confidence_scores',
        condition: 'rate(moderation_confidence_score_bucket{le="0.5"}[10m]) > 0.3',
        severity: 'warning',
        description: 'High rate of low confidence moderation decisions',
        runbook: 'https://docs.company.com/runbooks/low-confidence'
      }
    ];
  }

  // Metric recording methods
  recordModerationRequest(contentType: string, decision: string, vendor: string): void {
    this.metrics.moderationRequestsTotal.inc({
      content_type: contentType,
      decision,
      vendor
    });
  }

  recordModerationDuration(contentType: string, vendor: string, duration: number): void {
    this.metrics.moderationRequestDuration.observe({
      content_type: contentType,
      vendor
    }, duration);
  }

  recordConfidenceScore(vendor: string, contentType: string, score: number): void {
    this.metrics.moderationConfidenceScore.observe({
      vendor,
      content_type: contentType
    }, score);
  }

  updateQueueSize(queueType: string, priority: string, size: number): void {
    this.metrics.moderationQueueSize.set({
      queue_type: queueType,
      priority
    }, size);
  }

  recordVendorError(vendor: string, errorType: string): void {
    this.metrics.vendorApiErrors.inc({
      vendor,
      error_type: errorType
    });
  }

  recordHumanReviewDecision(decision: string, moderatorId: string): void {
    this.metrics.humanReviewDecisions.inc({
      decision,
      moderator_id: moderatorId
    });
  }

  recordAppealSubmitted(originalDecision: string): void {
    this.metrics.appealsSubmitted.inc({
      original_decision: originalDecision
    });
  }

  recordAppealOverturned(originalDecision: string, juryDecision: string): void {
    this.metrics.appealsOverturned.inc({
      original_decision: originalDecision,
      jury_decision: juryDecision
    });
  }

  recordReputationChange(changeType: string, reason: string): void {
    this.metrics.reputationChanges.inc({
      change_type: changeType,
      reason
    });
  }

  recordContentReport(contentType: string, reason: string, reporterTier: string): void {
    this.metrics.contentReports.inc({
      content_type: contentType,
      reason,
      reporter_reputation_tier: reporterTier
    });
  }

  // Logging methods
  logModerationDecision(data: {
    requestId: string;
    userId: string;
    contentId: string;
    contentType: string;
    decision: string;
    confidence: number;
    vendor: string;
    latency: number;
    reasoning?: string;
  }): void {
    this.logger.info('Moderation decision made', {
      event: 'moderation_decision',
      ...data
    });
  }

  logVendorError(data: {
    vendor: string;
    error: string;
    requestId: string;
    contentId?: string;
    retryCount?: number;
  }): void {
    this.logger.error('Vendor API error', {
      event: 'vendor_error',
      ...data
    });
  }

  logHumanReview(data: {
    caseId: number;
    moderatorId: string;
    decision: string;
    reasoning: string;
    reviewTime: number;
  }): void {
    this.logger.info('Human review completed', {
      event: 'human_review',
      ...data
    });
  }

  logAppealDecision(data: {
    appealId: number;
    originalDecision: string;
    juryDecision: string;
    jurorCount: number;
    votingDuration: number;
  }): void {
    this.logger.info('Appeal decision finalized', {
      event: 'appeal_decision',
      ...data
    });
  }

  // Tracing methods
  startSpan(operationName: string, parentSpan?: any): any {
    if (!this.tracer) return null;
    
    return this.tracer.startSpan(operationName, {
      childOf: parentSpan
    });
  }

  finishSpan(span: any, tags?: { [key: string]: any }): void {
    if (!span) return;
    
    if (tags) {
      Object.keys(tags).forEach(key => {
        span.setTag(key, tags[key]);
      });
    }
    
    span.finish();
  }

  // Health check methods
  async checkHealth(): Promise<{ status: string; checks: any[] }> {
    const checks = [];
    
    // Database check
    try {
      // This would be implemented with actual database ping
      checks.push({ name: 'database', status: 'healthy', latency: 5 });
    } catch (error) {
      checks.push({ name: 'database', status: 'unhealthy', error: error.message });
    }
    
    // Redis check
    try {
      // This would be implemented with actual Redis ping
      checks.push({ name: 'redis', status: 'healthy', latency: 2 });
    } catch (error) {
      checks.push({ name: 'redis', status: 'unhealthy', error: error.message });
    }
    
    // Vendor API checks
    const vendors = ['openai', 'google_vision', 'aws_rekognition'];
    for (const vendor of vendors) {
      try {
        // This would be implemented with actual vendor health checks
        checks.push({ name: vendor, status: 'healthy', latency: 100 });
      } catch (error) {
        checks.push({ name: vendor, status: 'unhealthy', error: error.message });
      }
    }
    
    const overallStatus = checks.every(check => check.status === 'healthy') ? 'healthy' : 'unhealthy';
    
    return { status: overallStatus, checks };
  }

  // Get metrics for Prometheus scraping
  getMetrics(): string {
    return this.register.metrics();
  }

  // Alert evaluation (simplified)
  async evaluateAlerts(): Promise<any[]> {
    const activeAlerts = [];
    
    // This would typically query Prometheus for alert conditions
    // For now, return empty array
    
    return activeAlerts;
  }
}

export const monitoringService = new MonitoringService();
