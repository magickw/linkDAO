/**
 * Security Analytics Service
 * 
 * Advanced security metrics collection, risk assessment, trend analysis,
 * and optimization recommendation engine for comprehensive security analytics.
 */

import { EventEmitter } from 'events';
import { safeLogger } from '../utils/safeLogger';
import crypto from 'crypto';
import { securityConfig } from '../config/securityConfig';
import { securityMonitoringService, SecurityEvent, SecuritySeverity } from './securityMonitoringService';
import { securityThreatDetectionService } from './securityThreatDetectionService';
import { complianceMonitoringService } from './complianceMonitoringService';
import { comprehensiveAuditService } from './comprehensiveAuditService';

export interface SecurityMetrics {
  timestamp: Date;
  overallRiskScore: number;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  securityEvents: {
    total: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
    byOutcome: Record<string, number>;
  };
  threatDetections: {
    total: number;
    active: number;
    resolved: number;
    falsePositives: number;
  };
  vulnerabilities: {
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  compliance: {
    overallScore: number;
    violations: number;
    frameworks: Record<string, number>;
  };
  performance: {
    responseTime: number;
    availability: number;
    errorRate: number;
  };
}

export interface RiskAssessment {
  id: string;
  timestamp: Date;
  overallRisk: number;
  riskFactors: RiskFactor[];
  recommendations: SecurityRecommendation[];
  trends: RiskTrend[];
  mitigationStrategies: MitigationStrategy[];
}

export interface RiskFactor {
  category: 'technical' | 'operational' | 'compliance' | 'external';
  name: string;
  description: string;
  impact: number; // 1-100
  likelihood: number; // 1-100
  riskScore: number; // impact * likelihood / 100
  evidence: string[];
  mitigated: boolean;
}

export interface SecurityRecommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: 'prevention' | 'detection' | 'response' | 'recovery';
  title: string;
  description: string;
  implementation: {
    effort: 'low' | 'medium' | 'high';
    cost: 'low' | 'medium' | 'high';
    timeline: string;
    resources: string[];
  };
  expectedImpact: {
    riskReduction: number;
    complianceImprovement: number;
    performanceImpact: number;
  };
  dependencies: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
}

export interface RiskTrend {
  period: string;
  riskScore: number;
  change: number;
  factors: string[];
}

export interface MitigationStrategy {
  id: string;
  name: string;
  description: string;
  applicableRisks: string[];
  effectiveness: number; // 1-100
  implementationComplexity: 'low' | 'medium' | 'high';
  cost: 'low' | 'medium' | 'high';
  timeToImplement: string;
  prerequisites: string[];
}

export interface SecurityTrend {
  metric: string;
  timeframe: string;
  dataPoints: Array<{
    timestamp: Date;
    value: number;
    context?: Record<string, any>;
  }>;
  trend: 'improving' | 'stable' | 'degrading';
  changeRate: number;
  forecast: Array<{
    timestamp: Date;
    predictedValue: number;
    confidence: number;
  }>;
}

export interface SecurityDashboard {
  overview: {
    riskScore: number;
    threatLevel: string;
    securityPosture: 'excellent' | 'good' | 'fair' | 'poor';
    lastUpdated: Date;
  };
  realTimeMetrics: SecurityMetrics;
  riskAssessment: RiskAssessment;
  trends: SecurityTrend[];
  recommendations: SecurityRecommendation[];
  alerts: Array<{
    id: string;
    severity: string;
    message: string;
    timestamp: Date;
    acknowledged: boolean;
  }>;
  complianceStatus: {
    overallScore: number;
    frameworks: Array<{
      name: string;
      score: number;
      status: string;
    }>;
  };
}

export interface SecurityForecast {
  timeframe: string;
  predictions: Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    factors: string[];
  }>;
  scenarios: Array<{
    name: string;
    probability: number;
    impact: string;
    description: string;
    mitigations: string[];
  }>;
}

class SecurityAnalyticsService extends EventEmitter {
  private metricsHistory: Map<string, SecurityMetrics[]> = new Map();
  private riskAssessments: Map<string, RiskAssessment> = new Map();
  private recommendations: Map<string, SecurityRecommendation> = new Map();
  private trends: Map<string, SecurityTrend> = new Map();
  private mitigationStrategies: Map<string, MitigationStrategy> = new Map();

  constructor() {
    super();
    this.initializeService();
  }

  /**
   * Initialize security analytics service
   */
  private initializeService(): void {
    // Set up mitigation strategies
    this.setupMitigationStrategies();

    // Set up periodic metrics collection
    setInterval(() => {
      this.collectSecurityMetrics();
    }, 5 * 60 * 1000); // Every 5 minutes

    // Set up hourly risk assessment
    setInterval(() => {
      this.performRiskAssessment();
    }, 60 * 60 * 1000); // Every hour

    // Set up daily trend analysis
    setInterval(() => {
      this.analyzeTrends();
    }, 24 * 60 * 60 * 1000); // Daily

    // Set up recommendation engine
    setInterval(() => {
      this.generateRecommendations();
    }, 6 * 60 * 60 * 1000); // Every 6 hours

    safeLogger.info('Security analytics service initialized');
  }

  /**
   * Collect comprehensive security metrics
   */
  async collectSecurityMetrics(): Promise<SecurityMetrics> {
    const timestamp = new Date();

    // Get security events
    const securityEvents = securityMonitoringService.getRecentEvents(1000);
    const recentEvents = securityEvents.filter(
      e => timestamp.getTime() - e.timestamp.getTime() < 24 * 60 * 60 * 1000 // Last 24 hours
    );

    // Get threat detections
    const threatDetections = securityThreatDetectionService.getThreatDetections(100);
    const recentThreats = threatDetections.filter(
      t => timestamp.getTime() - t.timestamp.getTime() < 24 * 60 * 60 * 1000
    );

    // Get compliance status
    const complianceDashboard = await complianceMonitoringService.getComplianceDashboard();

    // Calculate overall risk score
    const overallRiskScore = this.calculateOverallRiskScore(
      recentEvents,
      recentThreats,
      complianceDashboard
    );

    const metrics: SecurityMetrics = {
      timestamp,
      overallRiskScore,
      threatLevel: this.determineThreatLevel(overallRiskScore),
      securityEvents: {
        total: recentEvents.length,
        byType: this.groupBy(recentEvents, 'type'),
        bySeverity: this.groupBy(recentEvents, 'severity'),
        byOutcome: this.groupBy(recentEvents, e => e.details?.outcome || 'unknown'),
      },
      threatDetections: {
        total: recentThreats.length,
        active: recentThreats.filter(t => t.status === 'detected' || t.status === 'investigating').length,
        resolved: recentThreats.filter(t => t.status === 'mitigated').length,
        falsePositives: recentThreats.filter(t => t.status === 'false_positive').length,
      },
      vulnerabilities: await this.getVulnerabilityMetrics(),
      compliance: {
        overallScore: complianceDashboard.overview.overallScore,
        violations: complianceDashboard.overview.criticalViolations,
        frameworks: complianceDashboard.overview.frameworks.reduce((acc, f) => {
          acc[f.name] = f.score;
          return acc;
        }, {} as Record<string, number>),
      },
      performance: await this.getPerformanceMetrics(),
    };

    // Store metrics
    const dayKey = timestamp.toISOString().split('T')[0];
    if (!this.metricsHistory.has(dayKey)) {
      this.metricsHistory.set(dayKey, []);
    }
    this.metricsHistory.get(dayKey)!.push(metrics);

    // Emit metrics event
    this.emit('metricsCollected', metrics);

    return metrics;
  }

  /**
   * Perform comprehensive risk assessment
   */
  async performRiskAssessment(): Promise<RiskAssessment> {
    const assessment: RiskAssessment = {
      id: crypto.randomUUID(),
      timestamp: new Date(),
      overallRisk: 0,
      riskFactors: await this.identifyRiskFactors(),
      recommendations: [],
      trends: this.calculateRiskTrends(),
      mitigationStrategies: Array.from(this.mitigationStrategies.values()),
    };

    // Calculate overall risk
    assessment.overallRisk = this.calculateOverallRisk(assessment.riskFactors);

    // Generate recommendations based on risk factors
    assessment.recommendations = await this.generateRiskBasedRecommendations(assessment.riskFactors);

    // Store assessment
    this.riskAssessments.set(assessment.id, assessment);

    // Emit assessment event
    this.emit('riskAssessmentCompleted', assessment);

    return assessment;
  }

  /**
   * Analyze security trends
   */
  async analyzeTrends(): Promise<SecurityTrend[]> {
    const trends: SecurityTrend[] = [];

    // Analyze different metrics
    const metricsToAnalyze = [
      'overallRiskScore',
      'securityEvents.total',
      'threatDetections.total',
      'compliance.overallScore',
      'vulnerabilities.critical',
    ];

    for (const metric of metricsToAnalyze) {
      const trend = await this.analyzeTrendForMetric(metric);
      if (trend) {
        trends.push(trend);
        this.trends.set(metric, trend);
      }
    }

    return trends;
  }

  /**
   * Generate security recommendations
   */
  async generateRecommendations(): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];

    // Get latest metrics and risk assessment
    const latestMetrics = await this.getLatestMetrics();
    const latestAssessment = this.getLatestRiskAssessment();

    if (!latestMetrics || !latestAssessment) {
      return recommendations;
    }

    // Generate recommendations based on various factors
    recommendations.push(...this.generateMetricsBasedRecommendations(latestMetrics));
    recommendations.push(...this.generateTrendBasedRecommendations());
    recommendations.push(...this.generateComplianceRecommendations(latestMetrics));
    recommendations.push(...this.generatePerformanceRecommendations(latestMetrics));

    // Store recommendations
    recommendations.forEach(rec => {
      this.recommendations.set(rec.id, rec);
    });

    return recommendations;
  }

  /**
   * Get security dashboard
   */
  async getSecurityDashboard(): Promise<SecurityDashboard> {
    const latestMetrics = await this.getLatestMetrics();
    const latestAssessment = this.getLatestRiskAssessment();
    const recentRecommendations = this.getRecentRecommendations(10);
    const activeTrends = Array.from(this.trends.values()).slice(0, 5);

    // Get active alerts
    const alerts = securityMonitoringService.getActiveAlerts().map(alert => ({
      id: alert.id,
      severity: alert.severity,
      message: alert.title,
      timestamp: alert.timestamp,
      acknowledged: alert.acknowledged,
    }));

    const dashboard: SecurityDashboard = {
      overview: {
        riskScore: latestMetrics?.overallRiskScore || 0,
        threatLevel: latestMetrics?.threatLevel || 'low',
        securityPosture: this.determineSecurityPosture(latestMetrics),
        lastUpdated: latestMetrics?.timestamp || new Date(),
      },
      realTimeMetrics: latestMetrics || await this.collectSecurityMetrics(),
      riskAssessment: latestAssessment || await this.performRiskAssessment(),
      trends: activeTrends,
      recommendations: recentRecommendations,
      alerts,
      complianceStatus: {
        overallScore: latestMetrics?.compliance.overallScore || 0,
        frameworks: Object.entries(latestMetrics?.compliance.frameworks || {}).map(([name, score]) => ({
          name,
          score,
          status: this.getComplianceStatus(score),
        })),
      },
    };

    return dashboard;
  }

  /**
   * Generate security forecast
   */
  async generateSecurityForecast(timeframe: string = '30d'): Promise<SecurityForecast> {
    const predictions = await this.generatePredictions(timeframe);
    const scenarios = this.generateSecurityScenarios();

    const forecast: SecurityForecast = {
      timeframe,
      predictions,
      scenarios,
    };

    return forecast;
  }

  /**
   * Get security optimization recommendations
   */
  async getOptimizationRecommendations(): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];

    // Analyze current security posture
    const latestMetrics = await this.getLatestMetrics();
    if (!latestMetrics) return recommendations;

    // Performance optimization recommendations
    if (latestMetrics.performance.responseTime > 500) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'medium',
        category: 'prevention',
        title: 'Optimize Security Middleware Performance',
        description: 'Security checks are impacting response times. Consider optimizing authentication and authorization middleware.',
        implementation: {
          effort: 'medium',
          cost: 'low',
          timeline: '2-3 weeks',
          resources: ['Backend Developer', 'Security Engineer'],
        },
        expectedImpact: {
          riskReduction: 5,
          complianceImprovement: 0,
          performanceImpact: 30,
        },
        dependencies: [],
        status: 'pending',
      });
    }

    // Threat detection optimization
    if (latestMetrics.threatDetections.falsePositives > latestMetrics.threatDetections.total * 0.2) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'high',
        category: 'detection',
        title: 'Tune Threat Detection Rules',
        description: 'High false positive rate detected. Review and tune threat detection patterns to improve accuracy.',
        implementation: {
          effort: 'medium',
          cost: 'low',
          timeline: '1-2 weeks',
          resources: ['Security Analyst', 'ML Engineer'],
        },
        expectedImpact: {
          riskReduction: 15,
          complianceImprovement: 5,
          performanceImpact: 10,
        },
        dependencies: [],
        status: 'pending',
      });
    }

    // Compliance optimization
    if (latestMetrics.compliance.overallScore < 85) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'high',
        category: 'prevention',
        title: 'Improve Compliance Posture',
        description: 'Compliance score below target. Focus on addressing critical violations and implementing missing controls.',
        implementation: {
          effort: 'high',
          cost: 'medium',
          timeline: '4-6 weeks',
          resources: ['Compliance Officer', 'Security Engineer', 'Legal Team'],
        },
        expectedImpact: {
          riskReduction: 25,
          complianceImprovement: 20,
          performanceImpact: -5,
        },
        dependencies: ['Legal approval', 'Budget allocation'],
        status: 'pending',
      });
    }

    return recommendations;
  }

  // Private helper methods

  private calculateOverallRiskScore(
    events: SecurityEvent[],
    threats: any[],
    compliance: any
  ): number {
    let riskScore = 0;

    // Event-based risk (30% weight)
    const criticalEvents = events.filter(e => e.severity === SecuritySeverity.CRITICAL).length;
    const highEvents = events.filter(e => e.severity === SecuritySeverity.HIGH).length;
    const eventRisk = Math.min(100, (criticalEvents * 10 + highEvents * 5));
    riskScore += eventRisk * 0.3;

    // Threat-based risk (25% weight)
    const activeThreats = threats.filter(t => t.status === 'detected' || t.status === 'investigating').length;
    const threatRisk = Math.min(100, activeThreats * 15);
    riskScore += threatRisk * 0.25;

    // Compliance-based risk (25% weight)
    const complianceRisk = Math.max(0, 100 - compliance.overview.overallScore);
    riskScore += complianceRisk * 0.25;

    // Vulnerability-based risk (20% weight)
    // This would be calculated from vulnerability scanner results
    const vulnerabilityRisk = 20; // Placeholder
    riskScore += vulnerabilityRisk * 0.2;

    return Math.min(100, Math.round(riskScore));
  }

  private determineThreatLevel(riskScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (riskScore >= 80) return 'critical';
    if (riskScore >= 60) return 'high';
    if (riskScore >= 30) return 'medium';
    return 'low';
  }

  private determineSecurityPosture(metrics: SecurityMetrics | null): 'excellent' | 'good' | 'fair' | 'poor' {
    if (!metrics) return 'poor';
    
    if (metrics.overallRiskScore <= 20 && metrics.compliance.overallScore >= 95) return 'excellent';
    if (metrics.overallRiskScore <= 40 && metrics.compliance.overallScore >= 85) return 'good';
    if (metrics.overallRiskScore <= 60 && metrics.compliance.overallScore >= 70) return 'fair';
    return 'poor';
  }

  private async identifyRiskFactors(): Promise<RiskFactor[]> {
    const riskFactors: RiskFactor[] = [];

    // Technical risk factors
    const latestMetrics = await this.getLatestMetrics();
    if (latestMetrics) {
      if (latestMetrics.vulnerabilities.critical > 0) {
        riskFactors.push({
          category: 'technical',
          name: 'Critical Vulnerabilities',
          description: `${latestMetrics.vulnerabilities.critical} critical vulnerabilities detected`,
          impact: 90,
          likelihood: 70,
          riskScore: 63,
          evidence: ['Vulnerability scan results'],
          mitigated: false,
        });
      }

      if (latestMetrics.threatDetections.active > 5) {
        riskFactors.push({
          category: 'technical',
          name: 'Active Threat Detections',
          description: `${latestMetrics.threatDetections.active} active threats requiring attention`,
          impact: 80,
          likelihood: 60,
          riskScore: 48,
          evidence: ['Threat detection logs'],
          mitigated: false,
        });
      }
    }

    // Operational risk factors
    if (latestMetrics?.performance.errorRate > 0.05) {
      riskFactors.push({
        category: 'operational',
        name: 'High Error Rate',
        description: 'System error rate above acceptable threshold',
        impact: 60,
        likelihood: 80,
        riskScore: 48,
        evidence: ['System logs', 'Performance metrics'],
        mitigated: false,
      });
    }

    // Compliance risk factors
    if (latestMetrics?.compliance.violations > 0) {
      riskFactors.push({
        category: 'compliance',
        name: 'Compliance Violations',
        description: `${latestMetrics.compliance.violations} active compliance violations`,
        impact: 70,
        likelihood: 90,
        riskScore: 63,
        evidence: ['Compliance audit results'],
        mitigated: false,
      });
    }

    return riskFactors;
  }

  private calculateOverallRisk(riskFactors: RiskFactor[]): number {
    if (riskFactors.length === 0) return 0;
    
    // Calculate weighted average risk score
    const totalRisk = riskFactors.reduce((sum, factor) => sum + factor.riskScore, 0);
    return Math.round(totalRisk / riskFactors.length);
  }

  private calculateRiskTrends(): RiskTrend[] {
    const trends: RiskTrend[] = [];
    
    // Get historical risk assessments
    const assessments = Array.from(this.riskAssessments.values())
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());

    if (assessments.length >= 2) {
      const latest = assessments[assessments.length - 1];
      const previous = assessments[assessments.length - 2];
      
      trends.push({
        period: 'recent',
        riskScore: latest.overallRisk,
        change: latest.overallRisk - previous.overallRisk,
        factors: latest.riskFactors.map(f => f.name),
      });
    }

    return trends;
  }

  private async generateRiskBasedRecommendations(riskFactors: RiskFactor[]): Promise<SecurityRecommendation[]> {
    const recommendations: SecurityRecommendation[] = [];

    for (const factor of riskFactors) {
      if (factor.riskScore > 50 && !factor.mitigated) {
        recommendations.push({
          id: crypto.randomUUID(),
          priority: factor.riskScore > 70 ? 'critical' : 'high',
          category: 'prevention',
          title: `Mitigate ${factor.name}`,
          description: `Address high-risk factor: ${factor.description}`,
          implementation: {
            effort: factor.impact > 80 ? 'high' : 'medium',
            cost: 'medium',
            timeline: factor.riskScore > 70 ? '1-2 weeks' : '2-4 weeks',
            resources: ['Security Team'],
          },
          expectedImpact: {
            riskReduction: Math.round(factor.riskScore * 0.8),
            complianceImprovement: factor.category === 'compliance' ? 15 : 5,
            performanceImpact: 0,
          },
          dependencies: [],
          status: 'pending',
        });
      }
    }

    return recommendations;
  }

  private generateMetricsBasedRecommendations(metrics: SecurityMetrics): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // High security event volume
    if (metrics.securityEvents.total > 100) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'medium',
        category: 'detection',
        title: 'Optimize Security Event Processing',
        description: 'High volume of security events detected. Consider implementing event filtering and prioritization.',
        implementation: {
          effort: 'medium',
          cost: 'low',
          timeline: '2-3 weeks',
          resources: ['Security Engineer'],
        },
        expectedImpact: {
          riskReduction: 10,
          complianceImprovement: 5,
          performanceImpact: 15,
        },
        dependencies: [],
        status: 'pending',
      });
    }

    return recommendations;
  }

  private generateTrendBasedRecommendations(): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    // Analyze trends for degrading metrics
    for (const trend of this.trends.values()) {
      if (trend.trend === 'degrading' && Math.abs(trend.changeRate) > 20) {
        recommendations.push({
          id: crypto.randomUUID(),
          priority: 'medium',
          category: 'prevention',
          title: `Address Degrading ${trend.metric}`,
          description: `${trend.metric} is showing a degrading trend with ${trend.changeRate}% change.`,
          implementation: {
            effort: 'medium',
            cost: 'medium',
            timeline: '3-4 weeks',
            resources: ['Security Team', 'Operations Team'],
          },
          expectedImpact: {
            riskReduction: 15,
            complianceImprovement: 5,
            performanceImpact: 5,
          },
          dependencies: [],
          status: 'pending',
        });
      }
    }

    return recommendations;
  }

  private generateComplianceRecommendations(metrics: SecurityMetrics): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    if (metrics.compliance.overallScore < 80) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'high',
        category: 'prevention',
        title: 'Improve Compliance Score',
        description: `Compliance score (${metrics.compliance.overallScore}%) is below target. Address violations and implement missing controls.`,
        implementation: {
          effort: 'high',
          cost: 'medium',
          timeline: '4-6 weeks',
          resources: ['Compliance Team', 'Security Team'],
        },
        expectedImpact: {
          riskReduction: 20,
          complianceImprovement: 25,
          performanceImpact: -5,
        },
        dependencies: ['Management approval'],
        status: 'pending',
      });
    }

    return recommendations;
  }

  private generatePerformanceRecommendations(metrics: SecurityMetrics): SecurityRecommendation[] {
    const recommendations: SecurityRecommendation[] = [];

    if (metrics.performance.responseTime > 1000) {
      recommendations.push({
        id: crypto.randomUUID(),
        priority: 'medium',
        category: 'prevention',
        title: 'Optimize Security Performance',
        description: 'Security controls are impacting system performance. Consider optimization strategies.',
        implementation: {
          effort: 'medium',
          cost: 'low',
          timeline: '2-3 weeks',
          resources: ['Performance Engineer', 'Security Engineer'],
        },
        expectedImpact: {
          riskReduction: 5,
          complianceImprovement: 0,
          performanceImpact: 25,
        },
        dependencies: [],
        status: 'pending',
      });
    }

    return recommendations;
  }

  private async analyzeTrendForMetric(metric: string): Promise<SecurityTrend | null> {
    // Get historical data for the metric
    const dataPoints = this.getHistoricalDataForMetric(metric);
    
    if (dataPoints.length < 5) return null; // Need at least 5 data points

    // Calculate trend
    const trend = this.calculateTrendDirection(dataPoints);
    const changeRate = this.calculateChangeRate(dataPoints);
    const forecast = this.generateForecast(dataPoints);

    return {
      metric,
      timeframe: '30d',
      dataPoints,
      trend,
      changeRate,
      forecast,
    };
  }

  private getHistoricalDataForMetric(metric: string): Array<{ timestamp: Date; value: number }> {
    const dataPoints: Array<{ timestamp: Date; value: number }> = [];
    
    // Extract data from metrics history
    for (const [date, metrics] of this.metricsHistory.entries()) {
      for (const m of metrics) {
        const value = this.extractMetricValue(m, metric);
        if (value !== null) {
          dataPoints.push({ timestamp: m.timestamp, value });
        }
      }
    }
    
    return dataPoints.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private extractMetricValue(metrics: SecurityMetrics, metricPath: string): number | null {
    const parts = metricPath.split('.');
    let value: any = metrics;
    
    for (const part of parts) {
      if (value && typeof value === 'object' && part in value) {
        value = value[part];
      } else {
        return null;
      }
    }
    
    return typeof value === 'number' ? value : null;
  }

  private calculateTrendDirection(dataPoints: Array<{ timestamp: Date; value: number }>): 'improving' | 'stable' | 'degrading' {
    if (dataPoints.length < 2) return 'stable';
    
    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    const change = ((last - first) / first) * 100;
    
    if (change > 10) return 'degrading'; // Assuming higher values are worse for most security metrics
    if (change < -10) return 'improving';
    return 'stable';
  }

  private calculateChangeRate(dataPoints: Array<{ timestamp: Date; value: number }>): number {
    if (dataPoints.length < 2) return 0;
    
    const first = dataPoints[0].value;
    const last = dataPoints[dataPoints.length - 1].value;
    
    return Math.round(((last - first) / first) * 100);
  }

  private generateForecast(dataPoints: Array<{ timestamp: Date; value: number }>): Array<{
    timestamp: Date;
    predictedValue: number;
    confidence: number;
  }> {
    // Simple linear regression for forecasting
    const forecast: Array<{ timestamp: Date; predictedValue: number; confidence: number }> = [];
    
    if (dataPoints.length < 3) return forecast;
    
    // Calculate trend line
    const n = dataPoints.length;
    const sumX = dataPoints.reduce((sum, point, index) => sum + index, 0);
    const sumY = dataPoints.reduce((sum, point) => sum + point.value, 0);
    const sumXY = dataPoints.reduce((sum, point, index) => sum + index * point.value, 0);
    const sumXX = dataPoints.reduce((sum, point, index) => sum + index * index, 0);
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    
    // Generate forecast for next 7 days
    const lastTimestamp = dataPoints[dataPoints.length - 1].timestamp.getTime();
    const dayMs = 24 * 60 * 60 * 1000;
    
    for (let i = 1; i <= 7; i++) {
      const futureTimestamp = new Date(lastTimestamp + i * dayMs);
      const predictedValue = Math.max(0, slope * (n + i - 1) + intercept);
      const confidence = Math.max(0.3, 1 - (i * 0.1)); // Decreasing confidence over time
      
      forecast.push({
        timestamp: futureTimestamp,
        predictedValue: Math.round(predictedValue),
        confidence: Math.round(confidence * 100),
      });
    }
    
    return forecast;
  }

  private async generatePredictions(timeframe: string): Promise<Array<{
    metric: string;
    currentValue: number;
    predictedValue: number;
    confidence: number;
    factors: string[];
  }>> {
    const predictions: Array<{
      metric: string;
      currentValue: number;
      predictedValue: number;
      confidence: number;
      factors: string[];
    }> = [];

    const latestMetrics = await this.getLatestMetrics();
    if (!latestMetrics) return predictions;

    // Predict risk score
    predictions.push({
      metric: 'Overall Risk Score',
      currentValue: latestMetrics.overallRiskScore,
      predictedValue: Math.max(0, latestMetrics.overallRiskScore + Math.random() * 20 - 10),
      confidence: 75,
      factors: ['Historical trends', 'Current threat landscape', 'Compliance status'],
    });

    // Predict threat detections
    predictions.push({
      metric: 'Threat Detections',
      currentValue: latestMetrics.threatDetections.total,
      predictedValue: Math.round(latestMetrics.threatDetections.total * (1 + Math.random() * 0.4 - 0.2)),
      confidence: 65,
      factors: ['Attack patterns', 'Seasonal variations', 'Security improvements'],
    });

    return predictions;
  }

  private generateSecurityScenarios(): Array<{
    name: string;
    probability: number;
    impact: string;
    description: string;
    mitigations: string[];
  }> {
    return [
      {
        name: 'Advanced Persistent Threat',
        probability: 15,
        impact: 'High',
        description: 'Sophisticated attacker gains persistent access to systems',
        mitigations: ['Enhanced monitoring', 'Zero-trust architecture', 'Regular security assessments'],
      },
      {
        name: 'Compliance Audit Failure',
        probability: 25,
        impact: 'Medium',
        description: 'Regulatory audit identifies significant compliance gaps',
        mitigations: ['Proactive compliance monitoring', 'Regular internal audits', 'Staff training'],
      },
      {
        name: 'Data Breach',
        probability: 10,
        impact: 'Critical',
        description: 'Unauthorized access to sensitive customer data',
        mitigations: ['Data encryption', 'Access controls', 'Incident response plan'],
      },
    ];
  }

  private setupMitigationStrategies(): void {
    const strategies: MitigationStrategy[] = [
      {
        id: 'zero_trust',
        name: 'Zero Trust Architecture',
        description: 'Implement zero trust security model with continuous verification',
        applicableRisks: ['insider_threats', 'lateral_movement', 'privilege_escalation'],
        effectiveness: 85,
        implementationComplexity: 'high',
        cost: 'high',
        timeToImplement: '6-12 months',
        prerequisites: ['Network segmentation', 'Identity management system'],
      },
      {
        id: 'enhanced_monitoring',
        name: 'Enhanced Security Monitoring',
        description: 'Deploy advanced SIEM and behavioral analytics',
        applicableRisks: ['advanced_threats', 'data_exfiltration', 'anomalous_behavior'],
        effectiveness: 75,
        implementationComplexity: 'medium',
        cost: 'medium',
        timeToImplement: '3-6 months',
        prerequisites: ['Log aggregation', 'Baseline behavior models'],
      },
      {
        id: 'automated_response',
        name: 'Automated Incident Response',
        description: 'Implement automated threat response and remediation',
        applicableRisks: ['fast_spreading_threats', 'after_hours_attacks', 'resource_constraints'],
        effectiveness: 70,
        implementationComplexity: 'medium',
        cost: 'medium',
        timeToImplement: '2-4 months',
        prerequisites: ['Threat detection system', 'Response playbooks'],
      },
    ];

    strategies.forEach(strategy => {
      this.mitigationStrategies.set(strategy.id, strategy);
    });
  }

  private async getLatestMetrics(): Promise<SecurityMetrics | null> {
    // Get the most recent metrics
    const today = new Date().toISOString().split('T')[0];
    const todayMetrics = this.metricsHistory.get(today);
    
    if (todayMetrics && todayMetrics.length > 0) {
      return todayMetrics[todayMetrics.length - 1];
    }
    
    // If no metrics for today, collect new ones
    return await this.collectSecurityMetrics();
  }

  private getLatestRiskAssessment(): RiskAssessment | null {
    const assessments = Array.from(this.riskAssessments.values());
    if (assessments.length === 0) return null;
    
    return assessments.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())[0];
  }

  private getRecentRecommendations(limit: number): SecurityRecommendation[] {
    return Array.from(this.recommendations.values())
      .sort((a, b) => {
        // Sort by priority first, then by ID (newest first)
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        const aPriority = priorityOrder[a.priority];
        const bPriority = priorityOrder[b.priority];
        
        if (aPriority !== bPriority) {
          return bPriority - aPriority;
        }
        
        return b.id.localeCompare(a.id);
      })
      .slice(0, limit);
  }

  private async getVulnerabilityMetrics(): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  }> {
    // This would integrate with vulnerability scanner
    // For now, return placeholder data
    return {
      total: 15,
      critical: 2,
      high: 5,
      medium: 6,
      low: 2,
    };
  }

  private async getPerformanceMetrics(): Promise<{
    responseTime: number;
    availability: number;
    errorRate: number;
  }> {
    // This would integrate with performance monitoring
    // For now, return placeholder data
    return {
      responseTime: 250, // ms
      availability: 99.9, // %
      errorRate: 0.02, // %
    };
  }

  private getComplianceStatus(score: number): string {
    if (score >= 95) return 'excellent';
    if (score >= 85) return 'good';
    if (score >= 70) return 'fair';
    return 'poor';
  }

  private groupBy<T>(items: T[], keyFn: string | ((item: T) => string)): Record<string, number> {
    return items.reduce((acc, item) => {
      const key = typeof keyFn === 'string' ? (item as any)[keyFn] : keyFn(item);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }

  // Public API methods
  public async getCurrentMetrics(): Promise<SecurityMetrics> {
    return await this.getLatestMetrics() || await this.collectSecurityMetrics();
  }

  public getCurrentRiskAssessment(): RiskAssessment | null {
    return this.getLatestRiskAssessment();
  }

  public getRecommendations(limit?: number): SecurityRecommendation[] {
    return this.getRecentRecommendations(limit || 50);
  }

  public getTrends(): SecurityTrend[] {
    return Array.from(this.trends.values());
  }

  public updateRecommendationStatus(recommendationId: string, status: SecurityRecommendation['status']): void {
    const recommendation = this.recommendations.get(recommendationId);
    if (recommendation) {
      recommendation.status = status;
    }
  }
}

export const securityAnalyticsService = new SecurityAnalyticsService();
export default securityAnalyticsService;
