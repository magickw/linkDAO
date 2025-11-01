import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { satisfactionTrackingService } from '../services/satisfactionTrackingService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class SatisfactionTrackingController {
  /**
   * Create satisfaction survey for dispute participants
   */
  async createSatisfactionSurvey(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const result = await satisfactionTrackingService.createSatisfactionSurvey(parseInt(disputeId));

      res.json({
        success: true,
        ...result
      });

    } catch (error) {
      safeLogger.error('Error creating satisfaction survey:', error);
      res.status(500).json({ 
        error: 'Failed to create satisfaction survey',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Submit satisfaction survey response
   */
  async submitSurveyResponse(req: Request, res: Response): Promise<void> {
    try {
      const {
        disputeId,
        userId,
        userType,
        overallSatisfaction,
        resolutionFairness,
        processEfficiency,
        communicationQuality,
        outcomeAcceptance,
        wouldRecommend,
        feedback,
        improvementSuggestions,
        responseTime
      } = req.body;

      // Validate required fields
      if (!disputeId || !userId || !userType || overallSatisfaction === undefined) {
        res.status(400).json({ 
          error: 'Missing required fields: disputeId, userId, userType, overallSatisfaction' 
        });
        return;
      }

      // Validate satisfaction scores (1-5 scale)
      const scores = [overallSatisfaction, resolutionFairness, processEfficiency, communicationQuality, outcomeAcceptance];
      if (scores.some(score => score !== undefined && (score < 1 || score > 5))) {
        res.status(400).json({ error: 'Satisfaction scores must be between 1 and 5' });
        return;
      }

      const surveyResponse = {
        disputeId: parseInt(disputeId),
        userId,
        userType,
        overallSatisfaction,
        resolutionFairness: resolutionFairness || overallSatisfaction,
        processEfficiency: processEfficiency || overallSatisfaction,
        communicationQuality: communicationQuality || overallSatisfaction,
        outcomeAcceptance: outcomeAcceptance || overallSatisfaction,
        wouldRecommend: wouldRecommend !== undefined ? wouldRecommend : overallSatisfaction >= 4,
        feedback: feedback || '',
        improvementSuggestions: improvementSuggestions || [],
        responseTime: responseTime || 0
      };

      const survey = await satisfactionTrackingService.submitSurveyResponse(surveyResponse);

      res.json({
        success: true,
        survey: {
          id: survey.id,
          submittedAt: survey.submittedAt,
          overallSatisfaction: survey.overallSatisfaction
        }
      });

    } catch (error) {
      safeLogger.error('Error submitting survey response:', error);
      res.status(500).json({ 
        error: 'Failed to submit survey response',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get satisfaction metrics for a dispute
   */
  async getSatisfactionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const metrics = await satisfactionTrackingService.calculateSatisfactionMetrics(parseInt(disputeId));

      res.json({
        success: true,
        metrics
      });

    } catch (error) {
      safeLogger.error('Error getting satisfaction metrics:', error);
      res.status(500).json({ 
        error: 'Failed to get satisfaction metrics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Predict satisfaction for ongoing dispute
   */
  async predictSatisfaction(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      if (!disputeId) {
        res.status(400).json({ error: 'Dispute ID is required' });
        return;
      }

      const prediction = await satisfactionTrackingService.predictSatisfaction(parseInt(disputeId));

      res.json({
        success: true,
        prediction
      });

    } catch (error) {
      safeLogger.error('Error predicting satisfaction:', error);
      res.status(500).json({ 
        error: 'Failed to predict satisfaction',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get comprehensive satisfaction analytics
   */
  async getSatisfactionAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '30d', category, arbitrator } = req.query;

      const analytics = await satisfactionTrackingService.getSatisfactionAnalytics(timeframe as string);

      // Filter by category or arbitrator if specified
      let filteredAnalytics = analytics;
      
      if (category) {
        filteredAnalytics.categoryBreakdown = analytics.categoryBreakdown.filter(
          cat => cat.category.toLowerCase().includes((category as string).toLowerCase())
        );
      }

      if (arbitrator) {
        filteredAnalytics.arbitratorPerformance = analytics.arbitratorPerformance.filter(
          arb => arb.arbitratorId === arbitrator
        );
      }

      res.json({
        success: true,
        analytics: filteredAnalytics
      });

    } catch (error) {
      safeLogger.error('Error getting satisfaction analytics:', error);
      res.status(500).json({ 
        error: 'Failed to get satisfaction analytics',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze feedback text for insights
   */
  async analyzeFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedback } = req.body;

      if (!feedback || !Array.isArray(feedback)) {
        res.status(400).json({ error: 'Feedback array is required' });
        return;
      }

      const analysis = await satisfactionTrackingService.analyzeFeedback(feedback);

      res.json({
        success: true,
        analysis
      });

    } catch (error) {
      safeLogger.error('Error analyzing feedback:', error);
      res.status(500).json({ 
        error: 'Failed to analyze feedback',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate improvement recommendations
   */
  async generateImprovementRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { disputeId } = req.params;

      const recommendations = await satisfactionTrackingService.generateImprovementRecommendations(
        disputeId ? parseInt(disputeId) : undefined
      );

      res.json({
        success: true,
        recommendations
      });

    } catch (error) {
      safeLogger.error('Error generating improvement recommendations:', error);
      res.status(500).json({ 
        error: 'Failed to generate improvement recommendations',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get satisfaction dashboard data
   */
  async getSatisfactionDashboard(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '30d' } = req.query;

      // Get comprehensive analytics
      const analytics = await satisfactionTrackingService.getSatisfactionAnalytics(timeframe as string);
      
      // Get improvement recommendations
      const recommendations = await satisfactionTrackingService.generateImprovementRecommendations();

      // Generate dashboard summary
      const dashboard = {
        summary: {
          averageSatisfaction: analytics.averageOverallSatisfaction,
          responseRate: analytics.responseRate,
          totalSurveys: analytics.totalSurveys,
          trendDirection: this.calculateTrendDirection(analytics.satisfactionTrends),
          performanceLevel: this.getPerformanceLevel(analytics.averageOverallSatisfaction)
        },
        keyMetrics: {
          satisfactionScore: analytics.averageOverallSatisfaction,
          responseRate: analytics.responseRate,
          recommendationRate: this.calculateRecommendationRate(analytics),
          improvementOpportunities: analytics.improvementOpportunities.length
        },
        trends: analytics.satisfactionTrends,
        topIssues: this.extractTopIssues(analytics.categoryBreakdown),
        recommendations: recommendations.slice(0, 5), // Top 5 recommendations
        benchmarks: analytics.benchmarkComparison
      };

      res.json({
        success: true,
        dashboard
      });

    } catch (error) {
      safeLogger.error('Error getting satisfaction dashboard:', error);
      res.status(500).json({ 
        error: 'Failed to get satisfaction dashboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get satisfaction trends over time
   */
  async getSatisfactionTrends(req: Request, res: Response): Promise<void> {
    try {
      const { timeframe = '90d', granularity = 'weekly' } = req.query;

      // Mock trend data - in production, calculate from actual data
      const trends = this.generateMockTrends(timeframe as string, granularity as string);

      res.json({
        success: true,
        trends: {
          timeframe,
          granularity,
          data: trends,
          summary: {
            averageChange: this.calculateAverageChange(trends),
            volatility: this.calculateVolatility(trends),
            direction: this.getTrendDirection(trends)
          }
        }
      });

    } catch (error) {
      safeLogger.error('Error getting satisfaction trends:', error);
      res.status(500).json({ 
        error: 'Failed to get satisfaction trends',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Private helper methods

  private calculateTrendDirection(trends: any[]): 'improving' | 'stable' | 'declining' {
    if (trends.length < 2) return 'stable';
    
    const recent = trends.slice(-3);
    const older = trends.slice(-6, -3);
    
    if (recent.length === 0 || older.length === 0) return 'stable';
    
    const recentAvg = recent.reduce((sum, t) => sum + t.overallSatisfaction, 0) / recent.length;
    const olderAvg = older.reduce((sum, t) => sum + t.overallSatisfaction, 0) / older.length;
    
    const change = recentAvg - olderAvg;
    
    if (change > 0.1) return 'improving';
    if (change < -0.1) return 'declining';
    return 'stable';
  }

  private getPerformanceLevel(score: number): 'excellent' | 'good' | 'fair' | 'poor' {
    if (score >= 4.5) return 'excellent';
    if (score >= 4.0) return 'good';
    if (score >= 3.5) return 'fair';
    return 'poor';
  }

  private calculateRecommendationRate(analytics: any): number {
    // Mock calculation - in production, calculate from actual data
    return 0.78; // 78% would recommend
  }

  private extractTopIssues(categoryBreakdown: any[]): string[] {
    return categoryBreakdown
      .flatMap(category => category.topIssues)
      .slice(0, 5);
  }

  private generateMockTrends(timeframe: string, granularity: string): any[] {
    const periods = granularity === 'daily' ? 30 : granularity === 'weekly' ? 12 : 6;
    const trends = [];
    
    for (let i = 0; i < periods; i++) {
      trends.push({
        period: `Period ${i + 1}`,
        overallSatisfaction: 3.5 + Math.random() * 1.0,
        buyerSatisfaction: 3.6 + Math.random() * 1.0,
        sellerSatisfaction: 3.4 + Math.random() * 1.0,
        responseRate: 0.6 + Math.random() * 0.3,
        sampleSize: Math.floor(Math.random() * 50) + 20
      });
    }
    
    return trends;
  }

  private calculateAverageChange(trends: any[]): number {
    if (trends.length < 2) return 0;
    
    let totalChange = 0;
    for (let i = 1; i < trends.length; i++) {
      totalChange += trends[i].overallSatisfaction - trends[i - 1].overallSatisfaction;
    }
    
    return totalChange / (trends.length - 1);
  }

  private calculateVolatility(trends: any[]): number {
    if (trends.length < 2) return 0;
    
    const values = trends.map(t => t.overallSatisfaction);
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    
    return Math.sqrt(variance);
  }

  private getTrendDirection(trends: any[]): 'up' | 'down' | 'stable' {
    if (trends.length < 2) return 'stable';
    
    const first = trends[0].overallSatisfaction;
    const last = trends[trends.length - 1].overallSatisfaction;
    const change = last - first;
    
    if (change > 0.1) return 'up';
    if (change < -0.1) return 'down';
    return 'stable';
  }
}

export const satisfactionTrackingController = new SatisfactionTrackingController();