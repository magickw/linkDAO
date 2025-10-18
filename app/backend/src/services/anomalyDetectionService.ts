import { db } from '../db/connection';
import { users, products, orders } from '../db/schema';
import { eq, sql, and, gte, lte, desc, asc, count, sum, avg } from 'drizzle-orm';
import { Redis } from 'ioredis';

export interface AnomalyDetectionResult {
  anomalyId: string;
  detectedAt: Date;
  anomalyType: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  affectedMetrics: string[];
  possibleCauses: string[];
  recommendedActions: string[];
  confidence: number;
  metadata: Record<string, any>;
}

export interface AnomalyAlert {
  id: string;
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  affectedEntity: string;
  detectionTime: Date;
  confidence: number;
  suggestedActions: string[];
  investigationData: Record<string, any>;
}

export interface AnomalyThreshold {
  metric: string;
  upperBound?: number;
  lowerBound?: number;
  percentileThreshold?: number;
  standardDeviations?: number;
  timeWindow: number; // minutes
}

export interface StatisticalAnomaly {
  metric: string;
  currentValue: number;
  expectedValue: number;
  deviation: number;
  zScore: number;
  percentile: number;
  isAnomaly: boolean;
}

export interface MLAnomalyModel {
  modelId: string;
  modelType: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor' | 'statistical';
  features: string[];
  trainingData: any[];
  threshold: number;
  lastTrained: Date;
}

export class AnomalyDetectionService {
  private redis: Redis;
  private readonly CACHE_TTL = 300; // 5 minutes
  private readonly ANOMALY_HISTORY_DAYS = 30;

  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Real-time anomaly monitoring and alerting system
   */
  async monitorRealTimeAnomalies(): Promise<AnomalyAlert[]> {
    try {
      const alerts: AnomalyAlert[] = [];

      // Run parallel anomaly detection across different domains
      const [
        userBehaviorAnomalies,
        transactionAnomalies,
        systemPerformanceAnomalies,
        contentAnomalies,
        securityAnomalies
      ] = await Promise.all([
        this.detectUserBehaviorAnomalies(),
        this.detectTransactionAnomalies(),
        this.detectSystemPerformanceAnomalies(),
        this.detectContentAnomalies(),
        this.detectSecurityAnomalies()
      ]);

      alerts.push(
        ...userBehaviorAnomalies,
        ...transactionAnomalies,
        ...systemPerformanceAnomalies,
        ...contentAnomalies,
        ...securityAnomalies
      );

      // Store alerts and trigger notifications for critical ones
      for (const alert of alerts) {
        await this.storeAnomalyAlert(alert);
        
        if (alert.severity === 'critical' || alert.severity === 'high') {
          await this.triggerImmediateAlert(alert);
        }
      }

      return alerts;
    } catch (error) {
      console.error('Error monitoring real-time anomalies:', error);
      throw new Error('Failed to monitor real-time anomalies');
    }
  }

  /**
   * Statistical anomaly detection using Z-score and percentile analysis
   */
  async detectStatisticalAnomalies(
    metrics: string[],
    timeWindow: number = 60
  ): Promise<StatisticalAnomaly[]> {
    try {
      const anomalies: StatisticalAnomaly[] = [];

      for (const metric of metrics) {
        const historicalData = await this.getMetricHistory(metric, timeWindow);
        
        if (historicalData.length < 10) {
          continue; // Need sufficient data for statistical analysis
        }

        const currentValue = historicalData[historicalData.length - 1];
        const values = historicalData.slice(0, -1); // Exclude current value
        
        // Calculate statistical measures
        const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
        const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
        const standardDeviation = Math.sqrt(variance);
        
        // Calculate Z-score
        const zScore = standardDeviation > 0 ? (currentValue - mean) / standardDeviation : 0;
        
        // Calculate percentile
        const sortedValues = [...values].sort((a, b) => a - b);
        const percentile = this.calculatePercentile(sortedValues, currentValue);
        
        // Determine if it's an anomaly
        const isAnomaly = Math.abs(zScore) > 2.5 || percentile < 5 || percentile > 95;
        
        anomalies.push({
          metric,
          currentValue,
          expectedValue: mean,
          deviation: Math.abs(currentValue - mean),
          zScore,
          percentile,
          isAnomaly
        });
      }

      return anomalies;
    } catch (error) {
      console.error('Error detecting statistical anomalies:', error);
      throw new Error('Failed to detect statistical anomalies');
    }
  }

  /**
   * ML-based anomaly detection using multiple algorithms
   */
  async detectMLAnomalies(
    features: Record<string, number>,
    modelType: 'isolation_forest' | 'one_class_svm' | 'local_outlier_factor' = 'isolation_forest'
  ): Promise<{ isAnomaly: boolean; score: number; confidence: number }> {
    try {
      // Get or train the ML model
      const model = await this.getOrTrainMLModel(modelType, Object.keys(features));
      
      // Apply the model to detect anomalies
      const result = await this.applyMLModel(model, features);
      
      return result;
    } catch (error) {
      console.error('Error detecting ML anomalies:', error);
      return { isAnomaly: false, score: 0, confidence: 0 };
    }
  }

  /**
   * Anomaly classification and severity assessment
   */
  async classifyAnomaly(anomaly: AnomalyDetectionResult): Promise<{
    category: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    priority: number;
    escalationRequired: boolean;
  }> {
    try {
      // Classify based on anomaly type and affected metrics
      const category = this.categorizeAnomaly(anomaly);
      
      // Assess severity based on multiple factors
      const severity = this.assessAnomalySeverity(anomaly);
      
      // Calculate priority score
      const priority = this.calculatePriorityScore(anomaly, severity);
      
      // Determine if escalation is required
      const escalationRequired = severity === 'critical' || 
                                (severity === 'high' && priority > 80);

      return {
        category,
        severity,
        priority,
        escalationRequired
      };
    } catch (error) {
      console.error('Error classifying anomaly:', error);
      return {
        category: 'unknown',
        severity: 'low',
        priority: 0,
        escalationRequired: false
      };
    }
  }

  /**
   * Root cause analysis for detected anomalies
   */
  async investigateAnomaly(anomalyId: string): Promise<{
    rootCauses: string[];
    correlatedEvents: any[];
    impactAssessment: string;
    recommendedActions: string[];
    investigationData: Record<string, any>;
  }> {
    try {
      // Get anomaly details
      const anomaly = await this.getAnomalyById(anomalyId);
      
      if (!anomaly) {
        throw new Error('Anomaly not found');
      }

      // Analyze correlated events around the time of detection
      const correlatedEvents = await this.findCorrelatedEvents(
        anomaly.detectedAt,
        anomaly.affectedMetrics
      );

      // Identify potential root causes
      const rootCauses = await this.identifyRootCauses(anomaly, correlatedEvents);

      // Assess impact
      const impactAssessment = await this.assessAnomalyImpact(anomaly);

      // Generate recommended actions
      const recommendedActions = await this.generateRecommendedActions(anomaly, rootCauses);

      // Compile investigation data
      const investigationData = {
        anomalyDetails: anomaly,
        correlatedEvents,
        timelineAnalysis: await this.analyzeTimeline(anomaly.detectedAt),
        systemState: await this.captureSystemState(anomaly.detectedAt),
        historicalComparison: await this.compareWithHistoricalData(anomaly)
      };

      return {
        rootCauses,
        correlatedEvents,
        impactAssessment,
        recommendedActions,
        investigationData
      };
    } catch (error) {
      console.error('Error investigating anomaly:', error);
      throw new Error('Failed to investigate anomaly');
    }
  }

  /**
   * Configure anomaly detection thresholds
   */
  async configureThresholds(thresholds: AnomalyThreshold[]): Promise<void> {
    try {
      for (const threshold of thresholds) {
        await this.redis.hset(
          'anomaly_thresholds',
          threshold.metric,
          JSON.stringify(threshold)
        );
      }
    } catch (error) {
      console.error('Error configuring thresholds:', error);
      throw new Error('Failed to configure anomaly thresholds');
    }
  }

  /**
   * Get anomaly detection statistics and performance metrics
   */
  async getAnomalyStatistics(days: number = 7): Promise<{
    totalAnomalies: number;
    anomaliesBySeverity: Record<string, number>;
    anomaliesByType: Record<string, number>;
    falsePositiveRate: number;
    detectionAccuracy: number;
    averageDetectionTime: number;
    topAffectedMetrics: Array<{ metric: string; count: number }>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const result = await db.execute(sql`
        SELECT 
          COUNT(*) as total_anomalies,
          COUNT(CASE WHEN severity = 'low' THEN 1 END) as low_severity,
          COUNT(CASE WHEN severity = 'medium' THEN 1 END) as medium_severity,
          COUNT(CASE WHEN severity = 'high' THEN 1 END) as high_severity,
          COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_severity,
          COUNT(CASE WHEN is_false_positive = true THEN 1 END) as false_positives,
          AVG(EXTRACT(EPOCH FROM (resolved_at - detected_at))) as avg_detection_time
        FROM anomaly_detections
        WHERE detected_at >= ${startDate}
      `);

      const stats = result[0];
      const totalAnomalies = Number(stats?.total_anomalies) || 0;
      const falsePositives = Number(stats?.false_positives) || 0;

      // Get anomalies by type
      const typeResult = await db.execute(sql`
        SELECT anomaly_type, COUNT(*) as count
        FROM anomaly_detections
        WHERE detected_at >= ${startDate}
        GROUP BY anomaly_type
        ORDER BY count DESC
      `);

      // Get top affected metrics
      const metricsResult = await db.execute(sql`
        SELECT 
          jsonb_array_elements_text(affected_metrics) as metric,
          COUNT(*) as count
        FROM anomaly_detections
        WHERE detected_at >= ${startDate}
        GROUP BY metric
        ORDER BY count DESC
        LIMIT 10
      `);

      return {
        totalAnomalies,
        anomaliesBySeverity: {
          low: Number(stats?.low_severity) || 0,
          medium: Number(stats?.medium_severity) || 0,
          high: Number(stats?.high_severity) || 0,
          critical: Number(stats?.critical_severity) || 0
        },
        anomaliesByType: typeResult.reduce((acc: any, row: any) => {
          acc[row.anomaly_type] = Number(row.count);
          return acc;
        }, {}),
        falsePositiveRate: totalAnomalies > 0 ? (falsePositives / totalAnomalies) * 100 : 0,
        detectionAccuracy: totalAnomalies > 0 ? ((totalAnomalies - falsePositives) / totalAnomalies) * 100 : 0,
        averageDetectionTime: Number(stats?.avg_detection_time) || 0,
        topAffectedMetrics: metricsResult.map((row: any) => ({
          metric: row.metric,
          count: Number(row.count)
        }))
      };
    } catch (error) {
      console.error('Error getting anomaly statistics:', error);
      throw new Error('Failed to get anomaly statistics');
    }
  }

  // Private helper methods

  private async detectUserBehaviorAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Detect unusual login patterns
      const loginAnomalies = await this.detectLoginAnomalies();
      alerts.push(...loginAnomalies);

      // Detect unusual user activity patterns
      const activityAnomalies = await this.detectActivityAnomalies();
      alerts.push(...activityAnomalies);

      // Detect unusual engagement patterns
      const engagementAnomalies = await this.detectEngagementAnomalies();
      alerts.push(...engagementAnomalies);

    } catch (error) {
      console.error('Error detecting user behavior anomalies:', error);
    }

    return alerts;
  }

  private async detectTransactionAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Detect unusual transaction volumes
      const volumeAnomalies = await this.detectTransactionVolumeAnomalies();
      alerts.push(...volumeAnomalies);

      // Detect unusual transaction amounts
      const amountAnomalies = await this.detectTransactionAmountAnomalies();
      alerts.push(...amountAnomalies);

      // Detect unusual failure rates
      const failureAnomalies = await this.detectTransactionFailureAnomalies();
      alerts.push(...failureAnomalies);

    } catch (error) {
      console.error('Error detecting transaction anomalies:', error);
    }

    return alerts;
  }

  private async detectSystemPerformanceAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Detect CPU usage anomalies
      const cpuAnomalies = await this.detectCPUAnomalies();
      alerts.push(...cpuAnomalies);

      // Detect memory usage anomalies
      const memoryAnomalies = await this.detectMemoryAnomalies();
      alerts.push(...memoryAnomalies);

      // Detect response time anomalies
      const responseTimeAnomalies = await this.detectResponseTimeAnomalies();
      alerts.push(...responseTimeAnomalies);

    } catch (error) {
      console.error('Error detecting system performance anomalies:', error);
    }

    return alerts;
  }

  private async detectContentAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Detect unusual content creation patterns
      const creationAnomalies = await this.detectContentCreationAnomalies();
      alerts.push(...creationAnomalies);

      // Detect unusual moderation patterns
      const moderationAnomalies = await this.detectModerationAnomalies();
      alerts.push(...moderationAnomalies);

    } catch (error) {
      console.error('Error detecting content anomalies:', error);
    }

    return alerts;
  }

  private async detectSecurityAnomalies(): Promise<AnomalyAlert[]> {
    const alerts: AnomalyAlert[] = [];

    try {
      // Detect unusual access patterns
      const accessAnomalies = await this.detectAccessPatternAnomalies();
      alerts.push(...accessAnomalies);

      // Detect potential security threats
      const threatAnomalies = await this.detectSecurityThreats();
      alerts.push(...threatAnomalies);

    } catch (error) {
      console.error('Error detecting security anomalies:', error);
    }

    return alerts;
  }

  // Specific anomaly detection methods (mock implementations)

  private async detectLoginAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze login patterns
    return [];
  }

  private async detectActivityAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze user activity patterns
    return [];
  }

  private async detectEngagementAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze engagement patterns
    return [];
  }

  private async detectTransactionVolumeAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze transaction volumes
    return [];
  }

  private async detectTransactionAmountAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze transaction amounts
    return [];
  }

  private async detectTransactionFailureAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze transaction failure rates
    return [];
  }

  private async detectCPUAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze CPU usage patterns
    return [];
  }

  private async detectMemoryAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze memory usage patterns
    return [];
  }

  private async detectResponseTimeAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze response time patterns
    return [];
  }

  private async detectContentCreationAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze content creation patterns
    return [];
  }

  private async detectModerationAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze moderation patterns
    return [];
  }

  private async detectAccessPatternAnomalies(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze access patterns
    return [];
  }

  private async detectSecurityThreats(): Promise<AnomalyAlert[]> {
    // Mock implementation - would analyze security threats
    return [];
  }

  private async getMetricHistory(metric: string, timeWindow: number): Promise<number[]> {
    // Mock implementation - would get actual metric history
    return Array.from({ length: 50 }, () => Math.random() * 100);
  }

  private calculatePercentile(sortedValues: number[], value: number): number {
    const index = sortedValues.findIndex(v => v >= value);
    return index === -1 ? 100 : (index / sortedValues.length) * 100;
  }

  private async getOrTrainMLModel(
    modelType: string,
    features: string[]
  ): Promise<MLAnomalyModel> {
    // Mock implementation - would get or train actual ML model
    return {
      modelId: `${modelType}_${Date.now()}`,
      modelType: modelType as any,
      features,
      trainingData: [],
      threshold: 0.5,
      lastTrained: new Date()
    };
  }

  private async applyMLModel(
    model: MLAnomalyModel,
    features: Record<string, number>
  ): Promise<{ isAnomaly: boolean; score: number; confidence: number }> {
    // Mock implementation - would apply actual ML model
    const score = Math.random();
    return {
      isAnomaly: score > model.threshold,
      score,
      confidence: Math.random() * 0.5 + 0.5
    };
  }

  private categorizeAnomaly(anomaly: AnomalyDetectionResult): string {
    // Categorize based on anomaly type and affected metrics
    if (anomaly.anomalyType.includes('security')) return 'security';
    if (anomaly.anomalyType.includes('performance')) return 'performance';
    if (anomaly.anomalyType.includes('user')) return 'user_behavior';
    if (anomaly.anomalyType.includes('transaction')) return 'financial';
    if (anomaly.anomalyType.includes('content')) return 'content';
    return 'system';
  }

  private assessAnomalySeverity(anomaly: AnomalyDetectionResult): 'low' | 'medium' | 'high' | 'critical' {
    // Assess severity based on confidence, affected metrics, and type
    if (anomaly.confidence > 0.9 && anomaly.affectedMetrics.length > 3) return 'critical';
    if (anomaly.confidence > 0.8 && anomaly.affectedMetrics.length > 2) return 'high';
    if (anomaly.confidence > 0.6) return 'medium';
    return 'low';
  }

  private calculatePriorityScore(
    anomaly: AnomalyDetectionResult,
    severity: string
  ): number {
    let score = 0;
    
    // Base score from severity
    switch (severity) {
      case 'critical': score += 80; break;
      case 'high': score += 60; break;
      case 'medium': score += 40; break;
      case 'low': score += 20; break;
    }
    
    // Add confidence factor
    score += anomaly.confidence * 20;
    
    // Add affected metrics factor
    score += Math.min(anomaly.affectedMetrics.length * 5, 20);
    
    return Math.min(score, 100);
  }

  private async storeAnomalyAlert(alert: AnomalyAlert): Promise<void> {
    try {
      await db.execute(sql`
        INSERT INTO anomaly_detections (
          anomaly_id, anomaly_type, severity, title, description,
          affected_entity_type, affected_entity_id, confidence,
          suggested_actions, investigation_data, detected_at
        ) VALUES (
          ${alert.id}, ${alert.type}, ${alert.severity}, ${alert.title},
          ${alert.description}, 'system', ${alert.affectedEntity},
          ${alert.confidence}, ${JSON.stringify(alert.suggestedActions)},
          ${JSON.stringify(alert.investigationData)}, ${alert.detectionTime}
        )
      `);
    } catch (error) {
      console.error('Error storing anomaly alert:', error);
    }
  }

  private async triggerImmediateAlert(alert: AnomalyAlert): Promise<void> {
    // Mock implementation - would trigger immediate notifications
    console.log(`CRITICAL ANOMALY DETECTED: ${alert.title}`);
  }

  private async getAnomalyById(anomalyId: string): Promise<AnomalyDetectionResult | null> {
    try {
      const result = await db.execute(sql`
        SELECT * FROM anomaly_detections WHERE anomaly_id = ${anomalyId}
      `);

      if (result.length === 0) return null;

      const row = result[0];
      return {
        anomalyId: String(row.anomaly_id),
        detectedAt: new Date(String(row.detected_at)),
        anomalyType: String(row.anomaly_type),
        severity: String(row.severity) as any,
        affectedMetrics: JSON.parse(String(row.affected_metrics) || '[]'),
        possibleCauses: JSON.parse(String(row.possible_causes) || '[]'),
        recommendedActions: JSON.parse(String(row.suggested_actions) || '[]'),
        confidence: Number(row.confidence),
        metadata: JSON.parse(String(row.investigation_data) || '{}')
      };
    } catch (error) {
      console.error('Error getting anomaly by ID:', error);
      return null;
    }
  }

  private async findCorrelatedEvents(
    detectionTime: Date,
    affectedMetrics: string[]
  ): Promise<any[]> {
    // Mock implementation - would find correlated events
    return [];
  }

  private async identifyRootCauses(
    anomaly: AnomalyDetectionResult,
    correlatedEvents: any[]
  ): Promise<string[]> {
    // Mock implementation - would identify root causes
    return ['Unknown cause - requires manual investigation'];
  }

  private async assessAnomalyImpact(anomaly: AnomalyDetectionResult): Promise<string> {
    // Mock implementation - would assess impact
    return `${anomaly.severity} impact on ${anomaly.affectedMetrics.join(', ')}`;
  }

  private async generateRecommendedActions(
    anomaly: AnomalyDetectionResult,
    rootCauses: string[]
  ): Promise<string[]> {
    // Mock implementation - would generate recommendations
    return [
      'Monitor affected metrics closely',
      'Review system logs for additional context',
      'Consider scaling resources if performance-related'
    ];
  }

  private async analyzeTimeline(detectionTime: Date): Promise<any> {
    // Mock implementation - would analyze timeline
    return {};
  }

  private async captureSystemState(detectionTime: Date): Promise<any> {
    // Mock implementation - would capture system state
    return {};
  }

  private async compareWithHistoricalData(anomaly: AnomalyDetectionResult): Promise<any> {
    // Mock implementation - would compare with historical data
    return {};
  }
}

export const anomalyDetectionService = new AnomalyDetectionService();