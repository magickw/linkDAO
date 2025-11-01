import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import { enhancedSystemHealthService, SystemHealthScore } from './enhancedSystemHealthService';
import { safeLogger } from '../utils/safeLogger';
import { systemHealthMonitoringService, HealthMetrics, SystemAlert } from './systemHealthMonitoringService';
import { safeLogger } from '../utils/safeLogger';

export interface MLAlertRule {
  id: string;
  name: string;
  description: string;
  type: 'threshold' | 'anomaly' | 'pattern' | 'correlation';
  severity: 'info' | 'warning' | 'critical';
  enabled: boolean;
  
  // ML-specific properties
  model: 'statistical' | 'isolation_forest' | 'lstm' | 'ensemble';
  sensitivity: number; // 0-1, higher = more sensitive
  learningPeriod: number; // hours of data needed for training
  
  // Threshold-based rules
  thresholds?: {
    metric: string;
    operator: '>' | '<' | '==' | '!=' | 'between';
    value: number | [number, number];
    duration?: number; // seconds the condition must persist
  };
  
  // Pattern-based rules
  patterns?: {
    sequence: string[]; // sequence of events/states
    timeWindow: number; // seconds
    minOccurrences: number;
  };
  
  // Correlation rules
  correlations?: {
    primaryMetric: string;
    correlatedMetrics: string[];
    correlationThreshold: number; // -1 to 1
    lagSeconds?: number;
  };
  
  // Alert routing
  routing: {
    channels: ('email' | 'slack' | 'webhook' | 'sms' | 'dashboard')[];
    escalation: {
      levels: Array<{
        delay: number; // minutes
        channels: ('email' | 'slack' | 'webhook' | 'sms')[];
        recipients: string[];
      }>;
    };
    suppressionRules: {
      cooldownMinutes: number;
      maxAlertsPerHour: number;
      similarAlertWindow: number; // minutes
    };
  };
}

export interface AlertContext {
  id: string;
  ruleId: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'critical';
  title: string;
  message: string;
  
  // ML insights
  confidence: number; // 0-1
  anomalyScore?: number;
  predictedImpact: 'low' | 'medium' | 'high' | 'critical';
  rootCauseAnalysis: {
    primaryCause: string;
    contributingFactors: string[];
    affectedComponents: string[];
    recommendedActions: string[];
  };
  
  // Context data
  metrics: Record<string, number>;
  trends: Record<string, 'up' | 'down' | 'stable'>;
  correlatedEvents: Array<{
    eventType: string;
    timestamp: Date;
    correlation: number;
  }>;
  
  // Alert lifecycle
  status: 'active' | 'acknowledged' | 'resolved' | 'suppressed';
  acknowledgedBy?: string;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
  escalationLevel: number;
  suppressedUntil?: Date;
}

export interface AlertCorrelation {
  alertIds: string[];
  correlationType: 'cascade' | 'common_cause' | 'temporal' | 'spatial';
  confidence: number;
  rootCause?: string;
  impactAssessment: {
    affectedServices: string[];
    estimatedDowntime?: number;
    businessImpact: 'low' | 'medium' | 'high' | 'critical';
  };
}

/**
 * Intelligent Alerting System with ML-based prioritization and correlation
 */
export class IntelligentAlertingService extends EventEmitter {
  private alertRules: Map<string, MLAlertRule> = new Map();
  private activeAlerts: Map<string, AlertContext> = new Map();
  private alertHistory: AlertContext[] = [];
  private alertCorrelations: AlertCorrelation[] = [];
  
  // ML models and data
  private anomalyDetectionModel: any = null;
  private alertPriorityModel: any = null;
  private trainingData: Array<{ metrics: Record<string, number>; alert: boolean }> = [];
  
  // Alert fatigue prevention
  private alertCounts: Map<string, { count: number; resetTime: Date }> = new Map();
  private suppressedRules: Map<string, Date> = new Map();
  
  private monitoringInterval?: NodeJS.Timeout;
  private correlationInterval?: NodeJS.Timeout;

  constructor() {
    super();
    this.setupDefaultRules();
    this.startIntelligentMonitoring();
    this.initializeMLModels();
  }

  /**
   * Setup default intelligent alert rules
   */
  private setupDefaultRules(): void {
    // Anomaly-based memory usage alert
    this.addAlertRule({
      id: 'memory_anomaly_ml',
      name: 'Memory Usage Anomaly (ML)',
      description: 'Detects unusual memory usage patterns using machine learning',
      type: 'anomaly',
      severity: 'warning',
      enabled: true,
      model: 'isolation_forest',
      sensitivity: 0.7,
      learningPeriod: 24,
      routing: {
        channels: ['dashboard', 'slack'],
        escalation: {
          levels: [
            {
              delay: 15,
              channels: ['email'],
              recipients: ['ops-team@linkdao.io']
            },
            {
              delay: 30,
              channels: ['sms'],
              recipients: ['on-call-engineer']
            }
          ]
        },
        suppressionRules: {
          cooldownMinutes: 30,
          maxAlertsPerHour: 3,
          similarAlertWindow: 10
        }
      }
    });

    // Pattern-based service failure cascade
    this.addAlertRule({
      id: 'service_cascade_pattern',
      name: 'Service Failure Cascade Pattern',
      description: 'Detects patterns indicating cascading service failures',
      type: 'pattern',
      severity: 'critical',
      enabled: true,
      model: 'statistical',
      sensitivity: 0.8,
      learningPeriod: 72,
      patterns: {
        sequence: ['database_slow', 'api_timeout', 'service_failure'],
        timeWindow: 300, // 5 minutes
        minOccurrences: 2
      },
      routing: {
        channels: ['dashboard', 'slack', 'email', 'sms'],
        escalation: {
          levels: [
            {
              delay: 5,
              channels: ['sms'],
              recipients: ['incident-commander']
            }
          ]
        },
        suppressionRules: {
          cooldownMinutes: 60,
          maxAlertsPerHour: 2,
          similarAlertWindow: 30
        }
      }
    });

    // Correlation-based performance degradation
    this.addAlertRule({
      id: 'performance_correlation',
      name: 'Performance Degradation Correlation',
      description: 'Detects correlated performance issues across services',
      type: 'correlation',
      severity: 'warning',
      enabled: true,
      model: 'ensemble',
      sensitivity: 0.6,
      learningPeriod: 48,
      correlations: {
        primaryMetric: 'response_time',
        correlatedMetrics: ['cpu_usage', 'memory_usage', 'error_rate'],
        correlationThreshold: 0.7,
        lagSeconds: 60
      },
      routing: {
        channels: ['dashboard', 'slack'],
        escalation: {
          levels: [
            {
              delay: 20,
              channels: ['email'],
              recipients: ['performance-team@linkdao.io']
            }
          ]
        },
        suppressionRules: {
          cooldownMinutes: 45,
          maxAlertsPerHour: 4,
          similarAlertWindow: 15
        }
      }
    });
  }

  /**
   * Add alert rule
   */
  addAlertRule(rule: MLAlertRule): void {
    this.alertRules.set(rule.id, rule);
    this.emit('alertRuleAdded', rule);
  }

  /**
   * Start intelligent monitoring
   */
  private startIntelligentMonitoring(): void {
    // Monitor every 30 seconds
    this.monitoringInterval = setInterval(async () => {
      try {
        await this.evaluateAlertRules();
        await this.updateMLModels();
        await this.processAlertFatiguePrevention();
      } catch (error) {
        safeLogger.error('Intelligent alerting error:', error);
        this.emit('alertingError', error);
      }
    }, 30000);

    // Correlation analysis every 2 minutes
    this.correlationInterval = setInterval(async () => {
      try {
        await this.performAlertCorrelation();
        await this.performRootCauseAnalysis();
      } catch (error) {
        safeLogger.error('Alert correlation error:', error);
      }
    }, 120000);

    // Listen to system events
    enhancedSystemHealthService.on('anomalyDetected', (anomaly) => {
      this.handleAnomalyEvent(anomaly);
    });

    systemHealthMonitoringService.on('alertTriggered', (alert: SystemAlert) => {
      this.handleSystemAlert(alert);
    });
  }

  /**
   * Initialize ML models
   */
  private async initializeMLModels(): Promise<void> {
    try {
      // Initialize anomaly detection model (simplified)
      this.anomalyDetectionModel = {
        type: 'isolation_forest',
        threshold: 0.1,
        trained: false,
        features: ['memory_usage', 'cpu_usage', 'response_time', 'error_rate']
      };

      // Initialize alert priority model
      this.alertPriorityModel = {
        type: 'ensemble',
        weights: {
          severity: 0.4,
          confidence: 0.3,
          business_impact: 0.2,
          historical_accuracy: 0.1
        },
        trained: false
      };

      this.emit('mlModelsInitialized');
    } catch (error) {
      safeLogger.error('ML model initialization failed:', error);
      this.emit('mlInitializationFailed', error);
    }
  }

  /**
   * Evaluate all alert rules
   */
  private async evaluateAlertRules(): Promise<void> {
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
    
    if (!currentMetrics || !healthScore) return;

    for (const [ruleId, rule] of this.alertRules) {
      if (!rule.enabled) continue;

      try {
        const shouldAlert = await this.evaluateRule(rule, currentMetrics, healthScore);
        
        if (shouldAlert) {
          await this.triggerIntelligentAlert(rule, currentMetrics, healthScore);
        }
      } catch (error) {
        safeLogger.error(`Rule evaluation failed for ${ruleId}:`, error);
      }
    }
  }

  /**
   * Evaluate individual alert rule
   */
  private async evaluateRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): Promise<boolean> {
    // Check if rule is suppressed
    const suppressedUntil = this.suppressedRules.get(rule.id);
    if (suppressedUntil && suppressedUntil > new Date()) {
      return false;
    }

    // Check alert fatigue limits
    if (this.isAlertFatigued(rule.id)) {
      return false;
    }

    switch (rule.type) {
      case 'threshold':
        return this.evaluateThresholdRule(rule, metrics, healthScore);
      case 'anomaly':
        return await this.evaluateAnomalyRule(rule, metrics, healthScore);
      case 'pattern':
        return this.evaluatePatternRule(rule, metrics, healthScore);
      case 'correlation':
        return this.evaluateCorrelationRule(rule, metrics, healthScore);
      default:
        return false;
    }
  }

  /**
   * Evaluate threshold-based rule
   */
  private evaluateThresholdRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): boolean {
    if (!rule.thresholds) return false;

    const { metric, operator, value } = rule.thresholds;
    const currentValue = this.extractMetricValue(metrics, healthScore, metric);

    switch (operator) {
      case '>':
        return currentValue > (value as number);
      case '<':
        return currentValue < (value as number);
      case '==':
        return currentValue === (value as number);
      case '!=':
        return currentValue !== (value as number);
      case 'between':
        const [min, max] = value as [number, number];
        return currentValue >= min && currentValue <= max;
      default:
        return false;
    }
  }

  /**
   * Evaluate anomaly-based rule
   */
  private async evaluateAnomalyRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): Promise<boolean> {
    if (!this.anomalyDetectionModel?.trained) {
      // Use statistical anomaly detection as fallback
      return this.evaluateStatisticalAnomaly(rule, metrics, healthScore);
    }

    // Extract features for ML model
    const features = this.extractMLFeatures(metrics, healthScore);
    
    // Simplified anomaly detection (would use actual ML model)
    const anomalyScore = this.calculateAnomalyScore(features);
    
    return anomalyScore > (1 - rule.sensitivity);
  }

  /**
   * Evaluate pattern-based rule
   */
  private evaluatePatternRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): boolean {
    if (!rule.patterns) return false;

    // Simplified pattern detection
    // In real implementation, this would analyze event sequences
    const recentEvents = this.getRecentEvents(rule.patterns.timeWindow);
    const patternMatches = this.findPatternMatches(recentEvents, rule.patterns.sequence);
    
    return patternMatches >= rule.patterns.minOccurrences;
  }

  /**
   * Evaluate correlation-based rule
   */
  private evaluateCorrelationRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): boolean {
    if (!rule.correlations) return false;

    const primaryValue = this.extractMetricValue(metrics, healthScore, rule.correlations.primaryMetric);
    const correlatedValues = rule.correlations.correlatedMetrics.map(metric =>
      this.extractMetricValue(metrics, healthScore, metric)
    );

    // Calculate correlation (simplified)
    const correlations = correlatedValues.map(value => 
      this.calculateCorrelation(primaryValue, value)
    );

    const avgCorrelation = correlations.reduce((a, b) => a + b, 0) / correlations.length;
    
    return Math.abs(avgCorrelation) > rule.correlations.correlationThreshold;
  }

  /**
   * Trigger intelligent alert
   */
  private async triggerIntelligentAlert(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): Promise<void> {
    const alertId = this.generateAlertId();
    
    // Perform root cause analysis
    const rootCauseAnalysis = await this.performRootCauseAnalysisForRule(rule, metrics, healthScore);
    
    // Calculate confidence and impact
    const confidence = this.calculateAlertConfidence(rule, metrics, healthScore);
    const predictedImpact = this.predictAlertImpact(rule, metrics, healthScore);
    
    // Create alert context
    const alertContext: AlertContext = {
      id: alertId,
      ruleId: rule.id,
      timestamp: new Date(),
      severity: rule.severity,
      title: rule.name,
      message: this.generateAlertMessage(rule, metrics, healthScore),
      confidence,
      predictedImpact,
      rootCauseAnalysis,
      metrics: this.extractRelevantMetrics(metrics, healthScore, rule),
      trends: this.extractMetricTrends(metrics, healthScore),
      correlatedEvents: [],
      status: 'active',
      escalationLevel: 0
    };

    // Store alert
    this.activeAlerts.set(alertId, alertContext);
    this.alertHistory.push(alertContext);
    
    // Trim history
    if (this.alertHistory.length > 10000) {
      this.alertHistory = this.alertHistory.slice(-10000);
    }

    // Update alert counts for fatigue prevention
    this.updateAlertCounts(rule.id);

    // Route alert
    await this.routeAlert(alertContext, rule);

    this.emit('intelligentAlertTriggered', alertContext);
  }

  /**
   * Extract metric value
   */
  private extractMetricValue(metrics: HealthMetrics, healthScore: SystemHealthScore, metricName: string): number {
    switch (metricName) {
      case 'memory_usage':
        return metrics.systemLoad.memory;
      case 'cpu_usage':
        return metrics.systemLoad.cpu;
      case 'overall_health_score':
        return healthScore.overall;
      case 'response_time':
        return Object.values(metrics.services).reduce((sum, service) => 
          sum + (service.responseTime || 0), 0) / Object.keys(metrics.services).length;
      case 'error_rate':
        return Object.values(metrics.services).reduce((sum, service) => 
          sum + (service.errorRate || 0), 0) / Object.keys(metrics.services).length;
      case 'failed_services':
        return Object.values(metrics.services).filter(service => service.status === 'failed').length;
      default:
        return 0;
    }
  }

  /**
   * Extract ML features
   */
  private extractMLFeatures(metrics: HealthMetrics, healthScore: SystemHealthScore): Record<string, number> {
    return {
      memory_usage: metrics.systemLoad.memory,
      cpu_usage: metrics.systemLoad.cpu,
      response_time: this.extractMetricValue(metrics, healthScore, 'response_time'),
      error_rate: this.extractMetricValue(metrics, healthScore, 'error_rate'),
      overall_health_score: healthScore.overall,
      failed_services: this.extractMetricValue(metrics, healthScore, 'failed_services'),
      degradation_mode: metrics.degradationState.mode === 'emergency' ? 2 : 
                       metrics.degradationState.mode === 'degraded' ? 1 : 0
    };
  }

  /**
   * Calculate anomaly score (simplified)
   */
  private calculateAnomalyScore(features: Record<string, number>): number {
    // Simplified anomaly scoring
    // In real implementation, this would use trained ML model
    const weights = {
      memory_usage: 0.3,
      cpu_usage: 0.2,
      response_time: 0.25,
      error_rate: 0.25
    };

    let score = 0;
    for (const [feature, value] of Object.entries(features)) {
      const weight = weights[feature as keyof typeof weights] || 0;
      const normalizedValue = Math.min(1, value / 100); // Normalize to 0-1
      score += normalizedValue * weight;
    }

    return score;
  }

  /**
   * Evaluate statistical anomaly
   */
  private evaluateStatisticalAnomaly(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): boolean {
    // Use historical data for statistical analysis
    const recentHistory = enhancedSystemHealthService.getHealthScoreHistory(50);
    if (recentHistory.length < 10) return false;

    const currentScore = healthScore.overall;
    const historicalScores = recentHistory.map(h => h.score.overall);
    
    const mean = historicalScores.reduce((a, b) => a + b, 0) / historicalScores.length;
    const stdDev = Math.sqrt(
      historicalScores.reduce((sum, score) => sum + Math.pow(score - mean, 2), 0) / historicalScores.length
    );

    const zScore = Math.abs(currentScore - mean) / stdDev;
    const threshold = 2 * rule.sensitivity; // Adjust threshold based on sensitivity

    return zScore > threshold;
  }

  /**
   * Get recent events (simplified)
   */
  private getRecentEvents(timeWindowSeconds: number): string[] {
    // In real implementation, this would query event log
    return ['database_slow', 'api_timeout']; // Placeholder
  }

  /**
   * Find pattern matches
   */
  private findPatternMatches(events: string[], pattern: string[]): number {
    // Simplified pattern matching
    let matches = 0;
    for (let i = 0; i <= events.length - pattern.length; i++) {
      const slice = events.slice(i, i + pattern.length);
      if (JSON.stringify(slice) === JSON.stringify(pattern)) {
        matches++;
      }
    }
    return matches;
  }

  /**
   * Calculate correlation (simplified)
   */
  private calculateCorrelation(value1: number, value2: number): number {
    // Simplified correlation calculation
    // In real implementation, this would use historical data
    return Math.random() * 2 - 1; // Placeholder: -1 to 1
  }

  /**
   * Perform root cause analysis for rule
   */
  private async performRootCauseAnalysisForRule(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): Promise<AlertContext['rootCauseAnalysis']> {
    const analysis = {
      primaryCause: 'Unknown',
      contributingFactors: [] as string[],
      affectedComponents: [] as string[],
      recommendedActions: [] as string[]
    };

    // Analyze based on rule type and current state
    if (rule.type === 'anomaly' && metrics.systemLoad.memory > 80) {
      analysis.primaryCause = 'High memory usage';
      analysis.contributingFactors.push('Memory leak possible', 'High traffic load');
      analysis.affectedComponents.push('Application server', 'Database connections');
      analysis.recommendedActions.push('Restart services', 'Scale horizontally', 'Investigate memory leaks');
    }

    if (rule.type === 'pattern') {
      analysis.primaryCause = 'Cascading service failures';
      analysis.contributingFactors.push('Database performance', 'Network latency');
      analysis.affectedComponents.push('API Gateway', 'Microservices');
      analysis.recommendedActions.push('Check database health', 'Review service dependencies');
    }

    // Add affected components based on failed services
    const failedServices = Object.keys(metrics.services).filter(
      serviceName => metrics.services[serviceName].status === 'failed'
    );
    analysis.affectedComponents.push(...failedServices);

    return analysis;
  }

  /**
   * Calculate alert confidence
   */
  private calculateAlertConfidence(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on rule type
    switch (rule.type) {
      case 'threshold':
        confidence = 0.9; // High confidence for threshold rules
        break;
      case 'anomaly':
        confidence = rule.sensitivity * 0.8; // Based on sensitivity
        break;
      case 'pattern':
        confidence = 0.7; // Medium confidence for patterns
        break;
      case 'correlation':
        confidence = 0.6; // Lower confidence for correlations
        break;
    }

    // Adjust based on system state
    if (metrics.degradationState.mode === 'emergency') {
      confidence += 0.2;
    }

    // Adjust based on multiple failing services
    const failedServices = Object.values(metrics.services).filter(s => s.status === 'failed').length;
    if (failedServices > 1) {
      confidence += 0.1;
    }

    return Math.min(1, Math.max(0, confidence));
  }

  /**
   * Predict alert impact
   */
  private predictAlertImpact(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): AlertContext['predictedImpact'] {
    // Base impact on rule severity
    let impact: AlertContext['predictedImpact'] = rule.severity === 'critical' ? 'critical' :
                                                  rule.severity === 'warning' ? 'medium' : 'low';

    // Adjust based on system health
    if (healthScore.overall < 50) {
      impact = 'critical';
    } else if (healthScore.overall < 70) {
      impact = impact === 'low' ? 'medium' : 'high';
    }

    // Adjust based on degradation state
    if (metrics.degradationState.mode === 'emergency') {
      impact = 'critical';
    }

    return impact;
  }

  /**
   * Generate alert message
   */
  private generateAlertMessage(
    rule: MLAlertRule, 
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore
  ): string {
    const baseMessage = rule.description;
    const currentHealth = healthScore.overall.toFixed(1);
    const memoryUsage = metrics.systemLoad.memory.toFixed(1);
    const failedServices = Object.values(metrics.services).filter(s => s.status === 'failed').length;

    return `${baseMessage}. Current system health: ${currentHealth}%, Memory: ${memoryUsage}%, Failed services: ${failedServices}`;
  }

  /**
   * Extract relevant metrics
   */
  private extractRelevantMetrics(
    metrics: HealthMetrics, 
    healthScore: SystemHealthScore, 
    rule: MLAlertRule
  ): Record<string, number> {
    return {
      overall_health: healthScore.overall,
      memory_usage: metrics.systemLoad.memory,
      cpu_usage: metrics.systemLoad.cpu,
      response_time: this.extractMetricValue(metrics, healthScore, 'response_time'),
      error_rate: this.extractMetricValue(metrics, healthScore, 'error_rate'),
      failed_services: this.extractMetricValue(metrics, healthScore, 'failed_services')
    };
  }

  /**
   * Extract metric trends
   */
  private extractMetricTrends(metrics: HealthMetrics, healthScore: SystemHealthScore): Record<string, 'up' | 'down' | 'stable'> {
    // Simplified trend extraction
    return {
      health_score: healthScore.trends.direction === 'improving' ? 'up' : 
                   healthScore.trends.direction === 'degrading' ? 'down' : 'stable',
      memory_usage: 'stable', // Would calculate from history
      response_time: 'stable',
      error_rate: 'stable'
    };
  }

  /**
   * Check if alert is fatigued
   */
  private isAlertFatigued(ruleId: string): boolean {
    const rule = this.alertRules.get(ruleId);
    if (!rule) return false;

    const alertCount = this.alertCounts.get(ruleId);
    if (!alertCount) return false;

    const now = new Date();
    
    // Reset count if hour has passed
    if (now > alertCount.resetTime) {
      this.alertCounts.delete(ruleId);
      return false;
    }

    return alertCount.count >= rule.routing.suppressionRules.maxAlertsPerHour;
  }

  /**
   * Update alert counts
   */
  private updateAlertCounts(ruleId: string): void {
    const now = new Date();
    const resetTime = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now

    const current = this.alertCounts.get(ruleId);
    if (current && now < current.resetTime) {
      current.count++;
    } else {
      this.alertCounts.set(ruleId, { count: 1, resetTime });
    }
  }

  /**
   * Route alert through configured channels
   */
  private async routeAlert(alert: AlertContext, rule: MLAlertRule): Promise<void> {
    // Route to immediate channels
    for (const channel of rule.routing.channels) {
      try {
        await this.sendAlertToChannel(alert, channel);
      } catch (error) {
        safeLogger.error(`Failed to send alert to ${channel}:`, error);
      }
    }

    // Schedule escalation if configured
    if (rule.routing.escalation.levels.length > 0) {
      this.scheduleEscalation(alert, rule);
    }
  }

  /**
   * Send alert to specific channel
   */
  private async sendAlertToChannel(alert: AlertContext, channel: string): Promise<void> {
    switch (channel) {
      case 'dashboard':
        this.emit('dashboardAlert', alert);
        break;
      case 'slack':
        await this.sendSlackAlert(alert);
        break;
      case 'email':
        await this.sendEmailAlert(alert);
        break;
      case 'webhook':
        await this.sendWebhookAlert(alert);
        break;
      case 'sms':
        await this.sendSMSAlert(alert);
        break;
    }
  }

  /**
   * Send Slack alert
   */
  private async sendSlackAlert(alert: AlertContext): Promise<void> {
    // Implementation would integrate with Slack API
    safeLogger.info(`Slack alert: ${alert.title} - ${alert.message}`);
  }

  /**
   * Send email alert
   */
  private async sendEmailAlert(alert: AlertContext): Promise<void> {
    // Implementation would integrate with email service
    safeLogger.info(`Email alert: ${alert.title} - ${alert.message}`);
  }

  /**
   * Send webhook alert
   */
  private async sendWebhookAlert(alert: AlertContext): Promise<void> {
    // Implementation would send HTTP POST to webhook URL
    safeLogger.info(`Webhook alert: ${alert.title} - ${alert.message}`);
  }

  /**
   * Send SMS alert
   */
  private async sendSMSAlert(alert: AlertContext): Promise<void> {
    // Implementation would integrate with SMS service
    safeLogger.info(`SMS alert: ${alert.title} - ${alert.message}`);
  }

  /**
   * Schedule escalation
   */
  private scheduleEscalation(alert: AlertContext, rule: MLAlertRule): void {
    rule.routing.escalation.levels.forEach((level, index) => {
      setTimeout(async () => {
        // Check if alert is still active and not acknowledged
        const currentAlert = this.activeAlerts.get(alert.id);
        if (currentAlert && currentAlert.status === 'active') {
          currentAlert.escalationLevel = index + 1;
          
          // Send escalation alerts
          for (const channel of level.channels) {
            try {
              await this.sendAlertToChannel(currentAlert, channel);
            } catch (error) {
              safeLogger.error(`Escalation alert failed for ${channel}:`, error);
            }
          }
          
          this.emit('alertEscalated', { alert: currentAlert, level: index + 1 });
        }
      }, level.delay * 60 * 1000); // Convert minutes to milliseconds
    });
  }

  /**
   * Update ML models with new data
   */
  private async updateMLModels(): Promise<void> {
    // Collect training data
    const currentMetrics = systemHealthMonitoringService.getCurrentMetrics();
    const healthScore = enhancedSystemHealthService.getCurrentHealthScore();
    
    if (currentMetrics && healthScore) {
      const features = this.extractMLFeatures(currentMetrics, healthScore);
      const hasAlert = this.activeAlerts.size > 0;
      
      this.trainingData.push({ metrics: features, alert: hasAlert });
      
      // Trim training data
      if (this.trainingData.length > 10000) {
        this.trainingData = this.trainingData.slice(-10000);
      }
      
      // Retrain models periodically (simplified)
      if (this.trainingData.length > 100 && this.trainingData.length % 100 === 0) {
        await this.retrainModels();
      }
    }
  }

  /**
   * Retrain ML models
   */
  private async retrainModels(): Promise<void> {
    try {
      // Simplified model retraining
      if (this.anomalyDetectionModel) {
        this.anomalyDetectionModel.trained = true;
        this.anomalyDetectionModel.lastTrained = new Date();
      }
      
      if (this.alertPriorityModel) {
        this.alertPriorityModel.trained = true;
        this.alertPriorityModel.lastTrained = new Date();
      }
      
      this.emit('modelsRetrained', {
        trainingDataSize: this.trainingData.length,
        timestamp: new Date()
      });
    } catch (error) {
      safeLogger.error('Model retraining failed:', error);
      this.emit('modelRetrainingFailed', error);
    }
  }

  /**
   * Process alert fatigue prevention
   */
  private async processAlertFatiguePrevention(): Promise<void> {
    const now = new Date();
    
    // Clean up expired alert counts
    for (const [ruleId, alertCount] of this.alertCounts.entries()) {
      if (now > alertCount.resetTime) {
        this.alertCounts.delete(ruleId);
      }
    }
    
    // Clean up expired suppressions
    for (const [ruleId, suppressedUntil] of this.suppressedRules.entries()) {
      if (now > suppressedUntil) {
        this.suppressedRules.delete(ruleId);
      }
    }
  }

  /**
   * Perform alert correlation
   */
  private async performAlertCorrelation(): Promise<void> {
    const activeAlerts = Array.from(this.activeAlerts.values());
    if (activeAlerts.length < 2) return;

    // Find correlated alerts
    const correlations = this.findAlertCorrelations(activeAlerts);
    
    for (const correlation of correlations) {
      this.alertCorrelations.push(correlation);
      this.emit('alertCorrelationDetected', correlation);
    }
    
    // Trim correlation history
    if (this.alertCorrelations.length > 1000) {
      this.alertCorrelations = this.alertCorrelations.slice(-1000);
    }
  }

  /**
   * Find alert correlations
   */
  private findAlertCorrelations(alerts: AlertContext[]): AlertCorrelation[] {
    const correlations: AlertCorrelation[] = [];
    
    // Temporal correlation (alerts within time window)
    const timeWindow = 5 * 60 * 1000; // 5 minutes
    for (let i = 0; i < alerts.length; i++) {
      for (let j = i + 1; j < alerts.length; j++) {
        const timeDiff = Math.abs(alerts[i].timestamp.getTime() - alerts[j].timestamp.getTime());
        
        if (timeDiff <= timeWindow) {
          correlations.push({
            alertIds: [alerts[i].id, alerts[j].id],
            correlationType: 'temporal',
            confidence: 0.7,
            impactAssessment: {
              affectedServices: [...new Set([
                ...alerts[i].rootCauseAnalysis.affectedComponents,
                ...alerts[j].rootCauseAnalysis.affectedComponents
              ])],
              businessImpact: 'medium'
            }
          });
        }
      }
    }
    
    return correlations;
  }

  /**
   * Perform root cause analysis
   */
  private async performRootCauseAnalysis(): Promise<void> {
    // Analyze correlations to identify root causes
    const recentCorrelations = this.alertCorrelations.filter(
      c => Date.now() - c.alertIds.length < 10 * 60 * 1000 // Last 10 minutes
    );
    
    for (const correlation of recentCorrelations) {
      if (!correlation.rootCause) {
        correlation.rootCause = await this.identifyRootCause(correlation);
      }
    }
  }

  /**
   * Identify root cause for correlation
   */
  private async identifyRootCause(correlation: AlertCorrelation): Promise<string> {
    // Simplified root cause identification
    const alerts = correlation.alertIds.map(id => this.activeAlerts.get(id)).filter(Boolean) as AlertContext[];
    
    if (alerts.length === 0) return 'Unknown';
    
    // Look for common factors
    const commonFactors = alerts[0].rootCauseAnalysis.contributingFactors.filter(factor =>
      alerts.every(alert => alert.rootCauseAnalysis.contributingFactors.includes(factor))
    );
    
    return commonFactors.length > 0 ? commonFactors[0] : 'Multiple system issues';
  }

  /**
   * Handle anomaly event from enhanced system health service
   */
  private handleAnomalyEvent(anomaly: any): void {
    // Process anomaly and potentially trigger alerts
    this.emit('anomalyProcessed', anomaly);
  }

  /**
   * Handle system alert from base monitoring
   */
  private handleSystemAlert(alert: SystemAlert): void {
    // Enhance system alert with ML insights
    this.emit('systemAlertEnhanced', alert);
  }

  /**
   * Generate unique alert ID
   */
  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): AlertContext[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Get alert history
   */
  getAlertHistory(limit?: number): AlertContext[] {
    const actualLimit = limit || this.alertHistory.length;
    return this.alertHistory.slice(-actualLimit);
  }

  /**
   * Get alert correlations
   */
  getAlertCorrelations(): AlertCorrelation[] {
    return this.alertCorrelations;
  }

  /**
   * Acknowledge alert
   */
  acknowledgeAlert(alertId: string, acknowledgedBy: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert && alert.status === 'active') {
      alert.status = 'acknowledged';
      alert.acknowledgedBy = acknowledgedBy;
      alert.acknowledgedAt = new Date();
      
      this.emit('alertAcknowledged', alert);
      return true;
    }
    return false;
  }

  /**
   * Resolve alert
   */
  resolveAlert(alertId: string): boolean {
    const alert = this.activeAlerts.get(alertId);
    if (alert) {
      alert.status = 'resolved';
      alert.resolvedAt = new Date();
      
      this.activeAlerts.delete(alertId);
      this.emit('alertResolved', alert);
      return true;
    }
    return false;
  }

  /**
   * Suppress alert rule
   */
  suppressAlertRule(ruleId: string, durationMinutes: number): void {
    const suppressUntil = new Date(Date.now() + durationMinutes * 60 * 1000);
    this.suppressedRules.set(ruleId, suppressUntil);
    
    this.emit('alertRuleSuppressed', { ruleId, suppressUntil });
  }

  /**
   * Stop monitoring
   */
  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = undefined;
    }
    
    if (this.correlationInterval) {
      clearInterval(this.correlationInterval);
      this.correlationInterval = undefined;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopMonitoring();
    this.removeAllListeners();
  }
}

export const intelligentAlertingService = new IntelligentAlertingService();