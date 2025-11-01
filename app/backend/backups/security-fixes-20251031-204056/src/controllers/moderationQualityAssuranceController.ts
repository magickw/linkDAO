import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { moderationQualityAssuranceService } from '../services/moderationQualityAssuranceService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const AuditDecisionSchema = z.object({
  caseId: z.string(),
  auditorId: z.string()
});

const QualityMetricsSchema = z.object({
  moderatorId: z.string(),
  timeRange: z.number().min(1).max(365).optional().default(30)
});

const FeedbackSchema = z.object({
  sourceType: z.enum(['user', 'moderator', 'system', 'appeal']),
  caseId: z.string(),
  moderatorId: z.string(),
  feedbackType: z.enum(['positive', 'negative', 'neutral']),
  category: z.string(),
  description: z.string(),
  actionTaken: z.string().optional().default(''),
  resolved: z.boolean().optional().default(false)
});

const CalibrationSessionSchema = z.object({
  moderatorIds: z.array(z.string()).min(1),
  facilitatorId: z.string(),
  objectives: z.array(z.string()).min(1)
});

const CalibrationResultSchema = z.object({
  sessionId: z.string(),
  moderatorId: z.string(),
  decisions: z.array(z.object({
    caseId: z.string(),
    decision: z.string(),
    confidence: z.number().min(0).max(1),
    timeSpent: z.number().min(0) // seconds
  }))
});

const PerformanceEvaluationSchema = z.object({
  moderatorIds: z.array(z.string()).optional(),
  timeRange: z.number().min(1).max(365).optional().default(30),
  includeTrainingRecommendations: z.boolean().optional().default(true)
});

export class ModerationQualityAssuranceController {

  /**
   * Audit a moderation decision for quality assurance
   */
  async auditDecision(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = AuditDecisionSchema.parse(req.body);
      
      const audit = await moderationQualityAssuranceService.auditModerationDecision(
        validatedInput.caseId,
        validatedInput.auditorId
      );

      res.json({
        success: true,
        data: {
          audit,
          summary: {
            agreement: audit.agreement,
            auditScore: audit.auditScore,
            discrepancyCount: audit.discrepancies.length,
            severityBreakdown: this.analyzeDiscrepancySeverity(audit.discrepancies),
            actionItemCount: audit.actionItems.length
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error auditing decision:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid audit parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during audit'
      });
    }
  }

  /**
   * Calculate quality metrics for a moderator
   */
  async getQualityMetrics(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = QualityMetricsSchema.parse(req.query);
      
      const metrics = await moderationQualityAssuranceService.calculateQualityMetrics(
        validatedInput.moderatorId,
        validatedInput.timeRange
      );

      res.json({
        success: true,
        data: {
          moderatorId: validatedInput.moderatorId,
          timeRange: validatedInput.timeRange,
          metrics,
          analysis: {
            overallGrade: this.calculateOverallGrade(metrics),
            strengths: this.identifyMetricStrengths(metrics),
            weaknesses: this.identifyMetricWeaknesses(metrics),
            benchmarkComparison: this.compareToBenchmarks(metrics)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error calculating quality metrics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid metrics parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error calculating metrics'
      });
    }
  }

  /**
   * Evaluate comprehensive moderator performance
   */
  async evaluatePerformance(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = PerformanceEvaluationSchema.parse(req.body);
      
      // If no specific moderators provided, evaluate all active moderators
      const moderatorIds = validatedInput.moderatorIds || await this.getActiveModerators();
      
      const evaluations = await Promise.all(
        moderatorIds.map(id => 
          moderationQualityAssuranceService.evaluateModeratorPerformance(id, validatedInput.timeRange)
        )
      );

      // Team-level analysis
      const teamAnalysis = this.analyzeTeamPerformance(evaluations);

      res.json({
        success: true,
        data: {
          evaluations,
          teamAnalysis,
          parameters: {
            timeRange: validatedInput.timeRange,
            moderatorCount: evaluations.length,
            includeTrainingRecommendations: validatedInput.includeTrainingRecommendations
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error evaluating performance:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid evaluation parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error evaluating performance'
      });
    }
  }

  /**
   * Submit feedback for continuous improvement
   */
  async submitFeedback(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = FeedbackSchema.parse(req.body);
      
      const feedback = await moderationQualityAssuranceService.processFeedback(validatedInput);

      res.json({
        success: true,
        data: {
          feedback,
          impact: {
            feedbackType: feedback.feedbackType,
            category: feedback.category,
            processingStatus: 'processed',
            expectedImprovements: this.predictFeedbackImpact(feedback)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error submitting feedback:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid feedback data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error processing feedback'
      });
    }
  }

  /**
   * Create a calibration session for moderator training
   */
  async createCalibrationSession(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = CalibrationSessionSchema.parse(req.body);
      
      const session = await moderationQualityAssuranceService.createCalibrationSession(
        validatedInput.moderatorIds,
        validatedInput.facilitatorId,
        validatedInput.objectives
      );

      res.json({
        success: true,
        data: {
          session,
          instructions: {
            participantCount: session.moderatorIds.length,
            testCaseCount: session.testCases.length,
            estimatedDuration: this.estimateSessionDuration(session),
            nextSteps: [
              'Participants will receive session invitations',
              'Complete test cases within allocated time',
              'Results will be analyzed for calibration insights'
            ]
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error creating calibration session:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid session parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error creating session'
      });
    }
  }

  /**
   * Submit calibration session results
   */
  async submitCalibrationResults(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = CalibrationResultSchema.parse(req.body);
      
      const result = await moderationQualityAssuranceService.processCalibrationResults(
        validatedInput.sessionId,
        validatedInput.moderatorId,
        validatedInput.decisions
      );

      res.json({
        success: true,
        data: {
          result,
          analysis: {
            performanceLevel: this.categorizeCalibrationPerformance(result.accuracy),
            consistencyLevel: this.categorizeConsistency(result.consistencyWithPeers),
            efficiencyLevel: this.categorizeEfficiency(result.timeToDecision),
            recommendations: this.generateCalibrationRecommendations(result)
          }
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error submitting calibration results:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid calibration results',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error processing results'
      });
    }
  }

  /**
   * Get training recommendations for moderators
   */
  async getTrainingRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { moderatorId, timeRange = 30 } = req.query;
      
      if (!moderatorId || typeof moderatorId !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Moderator ID is required'
        });
        return;
      }

      // Get performance evaluation to generate recommendations
      const performance = await moderationQualityAssuranceService.evaluateModeratorPerformance(
        moderatorId,
        Number(timeRange)
      );

      const recommendations = await moderationQualityAssuranceService.generateTrainingRecommendations(
        moderatorId,
        performance.metrics,
        performance.improvementAreas
      );

      res.json({
        success: true,
        data: {
          moderatorId,
          currentPerformance: {
            grade: performance.performanceGrade,
            trend: performance.trend,
            strengths: performance.strengths,
            improvementAreas: performance.improvementAreas
          },
          recommendations: recommendations.map(rec => ({
            ...rec,
            urgency: this.calculateTrainingUrgency(rec, performance.metrics)
          })),
          trainingPlan: this.createTrainingPlan(recommendations)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting training recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error getting recommendations'
      });
    }
  }

  /**
   * Get quality assurance dashboard data
   */
  async getQADashboard(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange = 30 } = req.query;
      
      // Get all active moderators
      const moderatorIds = await this.getActiveModerators();
      
      // Get performance evaluations for all moderators
      const evaluations = await Promise.all(
        moderatorIds.slice(0, 20).map(id => // Limit to 20 for performance
          moderationQualityAssuranceService.evaluateModeratorPerformance(id, Number(timeRange))
        )
      );

      // Calculate team metrics
      const teamMetrics = this.calculateTeamMetrics(evaluations);
      
      // Identify trends and insights
      const insights = this.generateQAInsights(evaluations, teamMetrics);

      res.json({
        success: true,
        data: {
          overview: {
            totalModerators: evaluations.length,
            timeRange: Number(timeRange),
            lastUpdated: new Date().toISOString()
          },
          teamMetrics,
          topPerformers: evaluations
            .sort((a, b) => this.calculatePerformanceScore(b.metrics) - this.calculatePerformanceScore(a.metrics))
            .slice(0, 5),
          improvementOpportunities: evaluations
            .filter(e => e.performanceGrade === 'C' || e.performanceGrade === 'D')
            .slice(0, 5),
          insights,
          alerts: this.generateQAAlerts(evaluations, teamMetrics)
        },
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error getting QA dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error getting dashboard data'
      });
    }
  }

  // Helper methods for analysis and insights

  private analyzeDiscrepancySeverity(discrepancies: any[]): Record<string, number> {
    const severityCount = { minor: 0, moderate: 0, major: 0, critical: 0 };
    
    discrepancies.forEach(d => {
      severityCount[d.severity]++;
    });
    
    return severityCount;
  }

  private calculateOverallGrade(metrics: any): string {
    const score = (
      metrics.accuracy * 0.25 +
      metrics.consistency * 0.20 +
      metrics.efficiency * 0.15 +
      (1 - metrics.appealRate) * 0.15 +
      (1 - metrics.reversalRate) * 0.10 +
      metrics.userSatisfaction * 0.10 +
      metrics.slaCompliance * 0.05
    );

    if (score >= 0.95) return 'A+';
    if (score >= 0.90) return 'A';
    if (score >= 0.85) return 'B+';
    if (score >= 0.80) return 'B';
    if (score >= 0.75) return 'C+';
    if (score >= 0.70) return 'C';
    return 'D';
  }

  private identifyMetricStrengths(metrics: any): string[] {
    const strengths: string[] = [];
    
    if (metrics.accuracy >= 0.90) strengths.push('Excellent accuracy');
    if (metrics.consistency >= 0.85) strengths.push('High consistency');
    if (metrics.efficiency >= 0.80) strengths.push('Efficient processing');
    if (metrics.appealRate <= 0.05) strengths.push('Low appeal rate');
    if (metrics.slaCompliance >= 0.95) strengths.push('Excellent SLA compliance');
    
    return strengths;
  }

  private identifyMetricWeaknesses(metrics: any): string[] {
    const weaknesses: string[] = [];
    
    if (metrics.accuracy < 0.80) weaknesses.push('Low accuracy');
    if (metrics.consistency < 0.75) weaknesses.push('Inconsistent decisions');
    if (metrics.efficiency < 0.70) weaknesses.push('Slow processing');
    if (metrics.appealRate > 0.15) weaknesses.push('High appeal rate');
    if (metrics.slaCompliance < 0.85) weaknesses.push('Poor SLA compliance');
    
    return weaknesses;
  }

  private compareToBenchmarks(metrics: any): any {
    const benchmarks = {
      accuracy: 0.85,
      consistency: 0.80,
      efficiency: 0.75,
      appealRate: 0.10,
      reversalRate: 0.05,
      slaCompliance: 0.90
    };

    return {
      accuracy: metrics.accuracy >= benchmarks.accuracy ? 'above' : 'below',
      consistency: metrics.consistency >= benchmarks.consistency ? 'above' : 'below',
      efficiency: metrics.efficiency >= benchmarks.efficiency ? 'above' : 'below',
      appealRate: metrics.appealRate <= benchmarks.appealRate ? 'above' : 'below',
      reversalRate: metrics.reversalRate <= benchmarks.reversalRate ? 'above' : 'below',
      slaCompliance: metrics.slaCompliance >= benchmarks.slaCompliance ? 'above' : 'below'
    };
  }

  private async getActiveModerators(): Promise<string[]> {
    // Mock implementation - would query database for active moderators
    return ['mod_001', 'mod_002', 'mod_003', 'mod_004', 'mod_005'];
  }

  private analyzeTeamPerformance(evaluations: any[]): any {
    const totalModerators = evaluations.length;
    
    return {
      averageGrade: this.calculateAverageGrade(evaluations),
      gradeDistribution: this.calculateGradeDistribution(evaluations),
      topPerformers: evaluations.filter(e => ['A+', 'A'].includes(e.performanceGrade)).length,
      needsImprovement: evaluations.filter(e => ['C', 'D'].includes(e.performanceGrade)).length,
      trends: {
        improving: evaluations.filter(e => e.trend === 'improving').length,
        stable: evaluations.filter(e => e.trend === 'stable').length,
        declining: evaluations.filter(e => e.trend === 'declining').length
      }
    };
  }

  private predictFeedbackImpact(feedback: any): string[] {
    const impacts: string[] = [];
    
    if (feedback.feedbackType === 'negative') {
      impacts.push('Model accuracy improvement expected');
      impacts.push('Policy clarification may be needed');
    } else if (feedback.feedbackType === 'positive') {
      impacts.push('Reinforcement of good practices');
      impacts.push('Confidence boost for moderator');
    }
    
    return impacts;
  }

  private estimateSessionDuration(session: any): number {
    // Estimate 5 minutes per test case
    return session.testCases.length * 5;
  }

  private categorizeCalibrationPerformance(accuracy: number): string {
    if (accuracy >= 0.90) return 'Excellent';
    if (accuracy >= 0.80) return 'Good';
    if (accuracy >= 0.70) return 'Fair';
    return 'Needs Improvement';
  }

  private categorizeConsistency(consistency: number): string {
    if (consistency >= 0.85) return 'High';
    if (consistency >= 0.75) return 'Medium';
    return 'Low';
  }

  private categorizeEfficiency(timeToDecision: number): string {
    if (timeToDecision <= 120) return 'Fast'; // 2 minutes
    if (timeToDecision <= 300) return 'Average'; // 5 minutes
    return 'Slow';
  }

  private generateCalibrationRecommendations(result: any): string[] {
    const recommendations: string[] = [];
    
    if (result.accuracy < 0.80) {
      recommendations.push('Review policy guidelines and decision criteria');
    }
    
    if (result.consistencyWithPeers < 0.75) {
      recommendations.push('Participate in peer calibration sessions');
    }
    
    if (result.timeToDecision > 300) {
      recommendations.push('Practice with decision-making frameworks');
    }
    
    return recommendations;
  }

  private calculateTrainingUrgency(recommendation: any, metrics: any): 'low' | 'medium' | 'high' | 'urgent' {
    if (recommendation.priority === 'urgent') return 'urgent';
    if (recommendation.priority === 'high') return 'high';
    
    // Adjust based on performance metrics
    const overallScore = this.calculatePerformanceScore(metrics);
    if (overallScore < 0.70) return 'high';
    if (overallScore < 0.80) return 'medium';
    
    return 'low';
  }

  private createTrainingPlan(recommendations: any[]): any {
    const sortedRecs = recommendations.sort((a, b) => {
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      return (priorityOrder[b.priority as keyof typeof priorityOrder] || 0) - (priorityOrder[a.priority as keyof typeof priorityOrder] || 0);
    });

    return {
      totalDuration: recommendations.reduce((sum, rec) => sum + rec.estimatedDuration, 0),
      phases: [
        {
          phase: 'Immediate',
          recommendations: sortedRecs.filter(r => r.priority === 'urgent' || r.priority === 'high'),
          duration: sortedRecs.filter(r => r.priority === 'urgent' || r.priority === 'high')
            .reduce((sum, rec) => sum + rec.estimatedDuration, 0)
        },
        {
          phase: 'Short-term',
          recommendations: sortedRecs.filter(r => r.priority === 'medium'),
          duration: sortedRecs.filter(r => r.priority === 'medium')
            .reduce((sum, rec) => sum + rec.estimatedDuration, 0)
        },
        {
          phase: 'Long-term',
          recommendations: sortedRecs.filter(r => r.priority === 'low'),
          duration: sortedRecs.filter(r => r.priority === 'low')
            .reduce((sum, rec) => sum + rec.estimatedDuration, 0)
        }
      ]
    };
  }

  private calculateTeamMetrics(evaluations: any[]): any {
    const metrics = evaluations.map(e => e.metrics);
    
    return {
      averageAccuracy: metrics.reduce((sum, m) => sum + m.accuracy, 0) / metrics.length,
      averageConsistency: metrics.reduce((sum, m) => sum + m.consistency, 0) / metrics.length,
      averageEfficiency: metrics.reduce((sum, m) => sum + m.efficiency, 0) / metrics.length,
      averageAppealRate: metrics.reduce((sum, m) => sum + m.appealRate, 0) / metrics.length,
      averageSLACompliance: metrics.reduce((sum, m) => sum + m.slaCompliance, 0) / metrics.length
    };
  }

  private generateQAInsights(evaluations: any[], teamMetrics: any): string[] {
    const insights: string[] = [];
    
    if (teamMetrics.averageAccuracy < 0.80) {
      insights.push('Team accuracy below target - consider additional training');
    }
    
    if (teamMetrics.averageAppealRate > 0.15) {
      insights.push('High appeal rate indicates potential policy clarity issues');
    }
    
    const decliningCount = evaluations.filter(e => e.trend === 'declining').length;
    if (decliningCount > evaluations.length * 0.2) {
      insights.push(`${decliningCount} moderators showing declining performance`);
    }
    
    return insights;
  }

  private generateQAAlerts(evaluations: any[], teamMetrics: any): any[] {
    const alerts: any[] = [];
    
    // Critical performance alerts
    const criticalPerformers = evaluations.filter(e => e.performanceGrade === 'D');
    if (criticalPerformers.length > 0) {
      alerts.push({
        type: 'critical',
        message: `${criticalPerformers.length} moderators with critical performance`,
        action: 'Immediate intervention required'
      });
    }
    
    // Team metric alerts
    if (teamMetrics.averageAccuracy < 0.75) {
      alerts.push({
        type: 'warning',
        message: 'Team accuracy below acceptable threshold',
        action: 'Review training programs'
      });
    }
    
    return alerts;
  }

  private calculateAverageGrade(evaluations: any[]): string {
    const gradePoints = { 'A+': 4.3, 'A': 4.0, 'B+': 3.3, 'B': 3.0, 'C+': 2.3, 'C': 2.0, 'D': 1.0 };
    const avgPoints = evaluations.reduce((sum, e) => sum + (gradePoints[e.performanceGrade as keyof typeof gradePoints] || 1), 0) / evaluations.length;
    
    if (avgPoints >= 4.0) return 'A';
    if (avgPoints >= 3.5) return 'B+';
    if (avgPoints >= 3.0) return 'B';
    if (avgPoints >= 2.5) return 'C+';
    if (avgPoints >= 2.0) return 'C';
    return 'D';
  }

  private calculateGradeDistribution(evaluations: any[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    
    evaluations.forEach(e => {
      distribution[e.performanceGrade] = (distribution[e.performanceGrade] || 0) + 1;
    });
    
    return distribution;
  }

  private calculatePerformanceScore(metrics: any): number {
    return (
      metrics.accuracy * 0.25 +
      metrics.consistency * 0.20 +
      metrics.efficiency * 0.15 +
      (1 - metrics.appealRate) * 0.15 +
      (1 - metrics.reversalRate) * 0.10 +
      metrics.userSatisfaction * 0.10 +
      metrics.slaCompliance * 0.05
    );
  }
}

export const moderationQualityAssuranceController = new ModerationQualityAssuranceController();