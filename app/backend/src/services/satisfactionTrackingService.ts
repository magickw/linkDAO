import { eq, and, desc, sql, gte, lte, avg, count } from 'drizzle-orm';
import { safeLogger } from '../utils/safeLogger';
import { db } from '../db';
import { disputes, users, escrows } from '../db/schema';

export interface SatisfactionSurvey {
  id: string;
  disputeId: number;
  userId: string;
  userType: 'buyer' | 'seller';
  overallSatisfaction: number; // 1-5 scale
  resolutionFairness: number; // 1-5 scale
  processEfficiency: number; // 1-5 scale
  communicationQuality: number; // 1-5 scale
  outcomeAcceptance: number; // 1-5 scale
  wouldRecommend: boolean;
  feedback: string;
  improvementSuggestions: string[];
  submittedAt: Date;
  responseTime: number; // seconds to complete survey
}

export interface SatisfactionMetrics {
  disputeId: number;
  overallScore: number; // 0-1 scale
  buyerSatisfaction?: number;
  sellerSatisfaction?: number;
  resolutionQuality: number;
  processEfficiency: number;
  communicationScore: number;
  outcomeAcceptance: number;
  recommendationRate: number;
  responseRate: number;
  averageResponseTime: number;
  improvementAreas: string[];
}

export interface SatisfactionPrediction {
  disputeId: number;
  predictedBuyerSatisfaction: number;
  predictedSellerSatisfaction: number;
  predictedOverallSatisfaction: number;
  confidence: number;
  factors: PredictionFactor[];
  recommendations: string[];
}

export interface PredictionFactor {
  factor: string;
  impact: number; // -1 to 1
  weight: number; // 0-1
  description: string;
}

export interface SatisfactionAnalytics {
  timeframe: string;
  totalSurveys: number;
  responseRate: number;
  averageOverallSatisfaction: number;
  satisfactionTrends: SatisfactionTrend[];
  categoryBreakdown: CategorySatisfaction[];
  arbitratorPerformance: ArbitratorSatisfaction[];
  improvementOpportunities: ImprovementOpportunity[];
  benchmarkComparison: BenchmarkData;
}

export interface SatisfactionTrend {
  period: string;
  overallSatisfaction: number;
  buyerSatisfaction: number;
  sellerSatisfaction: number;
  responseRate: number;
  sampleSize: number;
}

export interface CategorySatisfaction {
  category: string;
  averageSatisfaction: number;
  sampleSize: number;
  trends: number[]; // Last 12 periods
  topIssues: string[];
}

export interface ArbitratorSatisfaction {
  arbitratorId: string;
  averageSatisfaction: number;
  casesHandled: number;
  strengths: string[];
  improvementAreas: string[];
  trendDirection: 'improving' | 'stable' | 'declining';
}

export interface ImprovementOpportunity {
  area: string;
  currentScore: number;
  targetScore: number;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  priority: number;
  recommendations: string[];
}

export interface BenchmarkData {
  industryAverage: number;
  topPerformerAverage: number;
  ourPerformance: number;
  percentileRank: number;
  gapAnalysis: string[];
}

export interface FeedbackAnalysis {
  sentiment: 'positive' | 'neutral' | 'negative';
  themes: FeedbackTheme[];
  actionableInsights: string[];
  urgentIssues: string[];
}

export interface FeedbackTheme {
  theme: string;
  frequency: number;
  sentiment: number; // -1 to 1
  examples: string[];
  suggestedActions: string[];
}

export class SatisfactionTrackingService {
  /**
   * Create and send satisfaction survey
   */
  async createSatisfactionSurvey(disputeId: number): Promise<{ surveyIds: string[] }> {
    try {
      // Get dispute participants
      const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
      
      if (!dispute) {
        throw new Error('Dispute not found');
      }

      // Note: There's a schema mismatch - disputes.escrowId is integer but escrows.id is UUID
      // For now, we'll handle this case by returning null
      const [escrow] = null; // TODO: Fix schema mismatch between disputes.escrowId and escrows.id

      if (!escrow) {
        throw new Error('Escrow not found');
      }

      const surveyIds = [];

      // Create survey for buyer
      if (escrow.buyerId) {
        const buyerSurveyId = await this.generateSurveyId();
        await this.sendSurveyToUser(buyerSurveyId, disputeId, escrow.buyerId, 'buyer');
        surveyIds.push(buyerSurveyId);
      }

      // Create survey for seller
      if (escrow.sellerId) {
        const sellerSurveyId = await this.generateSurveyId();
        await this.sendSurveyToUser(sellerSurveyId, disputeId, escrow.sellerId, 'seller');
        surveyIds.push(sellerSurveyId);
      }

      return { surveyIds };
    } catch (error) {
      safeLogger.error('Error creating satisfaction survey:', error);
      throw error;
    }
  }

  /**
   * Submit satisfaction survey response
   */
  async submitSurveyResponse(surveyResponse: Omit<SatisfactionSurvey, 'id' | 'submittedAt'>): Promise<SatisfactionSurvey> {
    try {
      const survey: SatisfactionSurvey = {
        ...surveyResponse,
        id: await this.generateSurveyId(),
        submittedAt: new Date()
      };

      // Store survey response
      await this.storeSurveyResponse(survey);

      // Update dispute satisfaction metrics
      await this.updateDisputeSatisfactionMetrics(survey.disputeId);

      // Analyze feedback for immediate issues
      if (survey.overallSatisfaction <= 2) {
        await this.flagLowSatisfactionCase(survey);
      }

      return survey;
    } catch (error) {
      safeLogger.error('Error submitting survey response:', error);
      throw error;
    }
  }

  /**
   * Calculate satisfaction metrics for a dispute
   */
  async calculateSatisfactionMetrics(disputeId: number): Promise<SatisfactionMetrics> {
    try {
      const surveys = await this.getSurveysByDispute(disputeId);
      
      if (surveys.length === 0) {
        return this.getDefaultMetrics(disputeId);
      }

      const buyerSurveys = surveys.filter(s => s.userType === 'buyer');
      const sellerSurveys = surveys.filter(s => s.userType === 'seller');

      const metrics: SatisfactionMetrics = {
        disputeId,
        overallScore: this.calculateOverallScore(surveys),
        buyerSatisfaction: buyerSurveys.length > 0 ? this.calculateAverageSatisfaction(buyerSurveys) : undefined,
        sellerSatisfaction: sellerSurveys.length > 0 ? this.calculateAverageSatisfaction(sellerSurveys) : undefined,
        resolutionQuality: this.calculateAverageScore(surveys, 'resolutionFairness'),
        processEfficiency: this.calculateAverageScore(surveys, 'processEfficiency'),
        communicationScore: this.calculateAverageScore(surveys, 'communicationQuality'),
        outcomeAcceptance: this.calculateAverageScore(surveys, 'outcomeAcceptance'),
        recommendationRate: this.calculateRecommendationRate(surveys),
        responseRate: await this.calculateResponseRate(disputeId),
        averageResponseTime: this.calculateAverageResponseTime(surveys),
        improvementAreas: this.identifyImprovementAreas(surveys)
      };

      return metrics;
    } catch (error) {
      safeLogger.error('Error calculating satisfaction metrics:', error);
      throw error;
    }
  }

  /**
   * Predict satisfaction before resolution
   */
  async predictSatisfaction(disputeId: number): Promise<SatisfactionPrediction> {
    try {
      // Get dispute data
      const disputeData = await this.getDisputeData(disputeId);
      
      // Extract prediction features
      const features = await this.extractSatisfactionFeatures(disputeData);
      
      // Get historical data for similar cases
      const historicalData = await this.getHistoricalSatisfactionData(features);
      
      // Calculate predictions
      const predictions = this.calculateSatisfactionPredictions(features, historicalData);
      
      // Generate factors and recommendations
      const factors = this.generatePredictionFactors(features);
      const recommendations = this.generateSatisfactionRecommendations(predictions, factors);

      return {
        disputeId,
        predictedBuyerSatisfaction: predictions.buyer,
        predictedSellerSatisfaction: predictions.seller,
        predictedOverallSatisfaction: predictions.overall,
        confidence: predictions.confidence,
        factors,
        recommendations
      };
    } catch (error) {
      safeLogger.error('Error predicting satisfaction:', error);
      throw error;
    }
  }

  /**
   * Get comprehensive satisfaction analytics
   */
  async getSatisfactionAnalytics(timeframe: string = '30d'): Promise<SatisfactionAnalytics> {
    try {
      const endDate = new Date();
      const startDate = this.getStartDate(timeframe);

      // Get all surveys in timeframe
      const surveys = await this.getSurveysInTimeframe(startDate, endDate);
      
      // Calculate basic metrics
      const totalSurveys = surveys.length;
      const responseRate = await this.calculateOverallResponseRate(startDate, endDate);
      const averageOverallSatisfaction = this.calculateAverageSatisfaction(surveys);

      // Generate trends
      const satisfactionTrends = await this.generateSatisfactionTrends(startDate, endDate);
      
      // Category breakdown
      const categoryBreakdown = await this.generateCategoryBreakdown(surveys);
      
      // Arbitrator performance
      const arbitratorPerformance = await this.generateArbitratorPerformance(surveys);
      
      // Improvement opportunities
      const improvementOpportunities = await this.identifyImprovementOpportunities(surveys);
      
      // Benchmark comparison
      const benchmarkComparison = await this.getBenchmarkComparison(averageOverallSatisfaction);

      return {
        timeframe,
        totalSurveys,
        responseRate,
        averageOverallSatisfaction,
        satisfactionTrends,
        categoryBreakdown,
        arbitratorPerformance,
        improvementOpportunities,
        benchmarkComparison
      };
    } catch (error) {
      safeLogger.error('Error getting satisfaction analytics:', error);
      throw error;
    }
  }

  /**
   * Analyze feedback text for insights
   */
  async analyzeFeedback(feedback: string[]): Promise<FeedbackAnalysis> {
    try {
      const themes = await this.extractFeedbackThemes(feedback);
      const sentiment = this.calculateOverallSentiment(feedback);
      const actionableInsights = this.extractActionableInsights(themes);
      const urgentIssues = this.identifyUrgentIssues(themes, feedback);

      return {
        sentiment,
        themes,
        actionableInsights,
        urgentIssues
      };
    } catch (error) {
      safeLogger.error('Error analyzing feedback:', error);
      throw error;
    }
  }

  /**
   * Generate satisfaction improvement recommendations
   */
  async generateImprovementRecommendations(disputeId?: number): Promise<string[]> {
    try {
      let surveys: SatisfactionSurvey[];
      
      if (disputeId) {
        surveys = await this.getSurveysByDispute(disputeId);
      } else {
        // Get recent surveys for general recommendations
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days
        surveys = await this.getSurveysInTimeframe(startDate, endDate);
      }

      const recommendations = [];

      // Analyze low satisfaction areas
      const lowSatisfactionAreas = this.identifyLowSatisfactionAreas(surveys);
      
      for (const area of lowSatisfactionAreas) {
        recommendations.push(...this.getRecommendationsForArea(area));
      }

      // Analyze feedback themes
      const feedback = surveys.map(s => s.feedback).filter(f => f && f.trim().length > 0);
      if (feedback.length > 0) {
        const feedbackAnalysis = await this.analyzeFeedback(feedback);
        recommendations.push(...feedbackAnalysis.actionableInsights);
      }

      // Remove duplicates and prioritize
      return [...new Set(recommendations)].slice(0, 10);
    } catch (error) {
      safeLogger.error('Error generating improvement recommendations:', error);
      return [];
    }
  }

  // Private helper methods

  private async generateSurveyId(): Promise<string> {
    return `survey_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private async sendSurveyToUser(surveyId: string, disputeId: number, userId: string, userType: 'buyer' | 'seller'): Promise<void> {
    // In production, send email/notification with survey link
    safeLogger.info(`Sending satisfaction survey ${surveyId} to ${userType} ${userId} for dispute ${disputeId}`);
  }

  private async storeSurveyResponse(survey: SatisfactionSurvey): Promise<void> {
    // In production, store in dedicated satisfaction_surveys table
    safeLogger.info(`Stored survey response ${survey.id} for dispute ${survey.disputeId}`);
  }

  private async updateDisputeSatisfactionMetrics(disputeId: number): Promise<void> {
    const metrics = await this.calculateSatisfactionMetrics(disputeId);
    // In production, update dispute record with satisfaction metrics
    safeLogger.info(`Updated satisfaction metrics for dispute ${disputeId}:`, metrics.overallScore);
  }

  private async flagLowSatisfactionCase(survey: SatisfactionSurvey): Promise<void> {
    // Flag for immediate review
    safeLogger.info(`Low satisfaction case flagged: Dispute ${survey.disputeId}, Score: ${survey.overallSatisfaction}`);
    
    // In production, create alert for admin team
    // await alertService.createAlert({
    //   type: 'low_satisfaction',
    //   disputeId: survey.disputeId,
    //   severity: 'high',
    //   message: `User ${survey.userId} rated satisfaction as ${survey.overallSatisfaction}/5`
    // });
  }

  private async getSurveysByDispute(disputeId: number): Promise<SatisfactionSurvey[]> {
    // Mock implementation - in production, query satisfaction_surveys table
    return [
      {
        id: 'survey_1',
        disputeId,
        userId: 'user_1',
        userType: 'buyer',
        overallSatisfaction: 4,
        resolutionFairness: 4,
        processEfficiency: 3,
        communicationQuality: 4,
        outcomeAcceptance: 4,
        wouldRecommend: true,
        feedback: 'The resolution was fair and the process was clear.',
        improvementSuggestions: ['Faster response times'],
        submittedAt: new Date(),
        responseTime: 180
      }
    ];
  }

  private getDefaultMetrics(disputeId: number): SatisfactionMetrics {
    return {
      disputeId,
      overallScore: 0,
      resolutionQuality: 0,
      processEfficiency: 0,
      communicationScore: 0,
      outcomeAcceptance: 0,
      recommendationRate: 0,
      responseRate: 0,
      averageResponseTime: 0,
      improvementAreas: []
    };
  }

  private calculateOverallScore(surveys: SatisfactionSurvey[]): number {
    if (surveys.length === 0) return 0;
    
    const totalScore = surveys.reduce((sum, survey) => sum + survey.overallSatisfaction, 0);
    return (totalScore / surveys.length) / 5; // Convert to 0-1 scale
  }

  private calculateAverageSatisfaction(surveys: SatisfactionSurvey[]): number {
    if (surveys.length === 0) return 0;
    
    const totalScore = surveys.reduce((sum, survey) => sum + survey.overallSatisfaction, 0);
    return totalScore / surveys.length;
  }

  private calculateAverageScore(surveys: SatisfactionSurvey[], field: keyof SatisfactionSurvey): number {
    if (surveys.length === 0) return 0;
    
    const totalScore = surveys.reduce((sum, survey) => {
      const value = survey[field];
      return sum + (typeof value === 'number' ? value : 0);
    }, 0);
    
    return (totalScore / surveys.length) / 5; // Convert to 0-1 scale
  }

  private calculateRecommendationRate(surveys: SatisfactionSurvey[]): number {
    if (surveys.length === 0) return 0;
    
    const recommendCount = surveys.filter(s => s.wouldRecommend).length;
    return recommendCount / surveys.length;
  }

  private async calculateResponseRate(disputeId: number): Promise<number> {
    // Mock implementation - in production, calculate actual response rate
    return 0.75; // 75% response rate
  }

  private calculateAverageResponseTime(surveys: SatisfactionSurvey[]): number {
    if (surveys.length === 0) return 0;
    
    const totalTime = surveys.reduce((sum, survey) => sum + survey.responseTime, 0);
    return totalTime / surveys.length;
  }

  private identifyImprovementAreas(surveys: SatisfactionSurvey[]): string[] {
    const areas = [];
    
    const avgEfficiency = this.calculateAverageScore(surveys, 'processEfficiency');
    const avgCommunication = this.calculateAverageScore(surveys, 'communicationQuality');
    const avgFairness = this.calculateAverageScore(surveys, 'resolutionFairness');
    
    if (avgEfficiency < 0.7) areas.push('Process Efficiency');
    if (avgCommunication < 0.7) areas.push('Communication Quality');
    if (avgFairness < 0.7) areas.push('Resolution Fairness');
    
    return areas;
  }

  private async getDisputeData(disputeId: number): Promise<any> {
    const [dispute] = await db.select().from(disputes).where(eq(disputes.id, disputeId)).limit(1);
    // Note: There's a schema mismatch - disputes.escrowId is integer but escrows.id is UUID
    // For now, we'll handle this case by returning null
    const [escrow] = null; // TODO: Fix schema mismatch between disputes.escrowId and escrows.id

    return { dispute, escrow };
  }

  private async extractSatisfactionFeatures(disputeData: any): Promise<any> {
    return {
      disputeType: disputeData.dispute?.disputeType || 'unknown',
      escrowAmount: parseFloat(disputeData.escrow?.amount || '0'),
      resolutionTime: this.calculateResolutionTime(disputeData.dispute),
      evidenceCount: disputeData.evidence?.length || 0,
      arbitratorExperience: 150, // Mock arbitrator experience
      communicationCount: 5 // Mock communication count
    };
  }

  private calculateResolutionTime(dispute: any): number {
    if (!dispute?.createdAt || !dispute?.resolvedAt) return 0;
    
    const created = new Date(dispute.createdAt).getTime();
    const resolved = new Date(dispute.resolvedAt).getTime();
    
    return Math.floor((resolved - created) / (1000 * 60 * 60)); // Hours
  }

  private async getHistoricalSatisfactionData(features: any): Promise<any[]> {
    // Mock historical data - in production, query database
    return [
      { features: { disputeType: features.disputeType }, satisfaction: 3.8 },
      { features: { disputeType: features.disputeType }, satisfaction: 4.1 },
      { features: { disputeType: features.disputeType }, satisfaction: 3.9 }
    ];
  }

  private calculateSatisfactionPredictions(features: any, historicalData: any[]): any {
    // Simple prediction based on historical averages
    const avgSatisfaction = historicalData.reduce((sum, data) => sum + data.satisfaction, 0) / historicalData.length;
    
    // Adjust based on features
    let prediction = avgSatisfaction;
    
    if (features.resolutionTime > 168) prediction -= 0.3; // Long resolution time
    if (features.escrowAmount > 1000) prediction -= 0.2; // High stakes
    if (features.evidenceCount > 5) prediction += 0.1; // Good evidence
    
    return {
      buyer: Math.max(1, Math.min(5, prediction + 0.1)),
      seller: Math.max(1, Math.min(5, prediction - 0.1)),
      overall: Math.max(1, Math.min(5, prediction)),
      confidence: 0.75
    };
  }

  private generatePredictionFactors(features: any): PredictionFactor[] {
    const factors = [];
    
    if (features.resolutionTime > 168) {
      factors.push({
        factor: 'Resolution Time',
        impact: -0.3,
        weight: 0.25,
        description: 'Long resolution time may decrease satisfaction'
      });
    }
    
    if (features.escrowAmount > 1000) {
      factors.push({
        factor: 'Financial Stakes',
        impact: -0.2,
        weight: 0.2,
        description: 'High financial amount increases pressure'
      });
    }
    
    return factors;
  }

  private generateSatisfactionRecommendations(predictions: any, factors: PredictionFactor[]): string[] {
    const recommendations = [];
    
    if (predictions.overall < 3.5) {
      recommendations.push('Consider expedited resolution process');
      recommendations.push('Increase communication frequency');
    }
    
    const negativeFactors = factors.filter(f => f.impact < 0);
    if (negativeFactors.length > 0) {
      recommendations.push('Address identified risk factors proactively');
    }
    
    return recommendations;
  }

  private getStartDate(timeframe: string): Date {
    const now = new Date();
    const days = parseInt(timeframe.replace('d', ''));
    return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  }

  private async getSurveysInTimeframe(startDate: Date, endDate: Date): Promise<SatisfactionSurvey[]> {
    // Mock implementation - in production, query database with date range
    return [];
  }

  private async calculateOverallResponseRate(startDate: Date, endDate: Date): Promise<number> {
    // Mock implementation
    return 0.68; // 68% response rate
  }

  private async generateSatisfactionTrends(startDate: Date, endDate: Date): Promise<SatisfactionTrend[]> {
    // Mock trends data
    return [
      {
        period: '2024-01',
        overallSatisfaction: 3.8,
        buyerSatisfaction: 3.9,
        sellerSatisfaction: 3.7,
        responseRate: 0.65,
        sampleSize: 120
      }
    ];
  }

  private async generateCategoryBreakdown(surveys: SatisfactionSurvey[]): Promise<CategorySatisfaction[]> {
    // Mock category breakdown
    return [
      {
        category: 'Product Quality',
        averageSatisfaction: 3.9,
        sampleSize: 45,
        trends: [3.8, 3.9, 4.0, 3.9],
        topIssues: ['Product not as described', 'Quality concerns']
      }
    ];
  }

  private async generateArbitratorPerformance(surveys: SatisfactionSurvey[]): Promise<ArbitratorSatisfaction[]> {
    // Mock arbitrator performance
    return [
      {
        arbitratorId: 'arbitrator_1',
        averageSatisfaction: 4.2,
        casesHandled: 85,
        strengths: ['Clear communication', 'Fair decisions'],
        improvementAreas: ['Response time'],
        trendDirection: 'improving'
      }
    ];
  }

  private async identifyImprovementOpportunities(surveys: SatisfactionSurvey[]): Promise<ImprovementOpportunity[]> {
    return [
      {
        area: 'Communication Quality',
        currentScore: 3.6,
        targetScore: 4.2,
        impact: 'high',
        effort: 'medium',
        priority: 1,
        recommendations: ['Implement automated status updates', 'Provide communication templates']
      }
    ];
  }

  private async getBenchmarkComparison(ourPerformance: number): Promise<BenchmarkData> {
    return {
      industryAverage: 3.7,
      topPerformerAverage: 4.3,
      ourPerformance,
      percentileRank: 65,
      gapAnalysis: ['Communication speed', 'Resolution transparency']
    };
  }

  private async extractFeedbackThemes(feedback: string[]): Promise<FeedbackTheme[]> {
    // Simple theme extraction - in production, use NLP
    const themes = [
      {
        theme: 'Communication',
        frequency: 15,
        sentiment: 0.2,
        examples: ['Need better updates', 'Communication was clear'],
        suggestedActions: ['Implement automated updates', 'Improve response times']
      }
    ];
    
    return themes;
  }

  private calculateOverallSentiment(feedback: string[]): 'positive' | 'neutral' | 'negative' {
    // Simple sentiment analysis - in production, use NLP
    return 'neutral';
  }

  private extractActionableInsights(themes: FeedbackTheme[]): string[] {
    return themes.flatMap(theme => theme.suggestedActions);
  }

  private identifyUrgentIssues(themes: FeedbackTheme[], feedback: string[]): string[] {
    const urgent = [];
    
    // Look for urgent keywords
    const urgentKeywords = ['urgent', 'immediate', 'critical', 'emergency'];
    
    for (const text of feedback) {
      if (urgentKeywords.some(keyword => text.toLowerCase().includes(keyword))) {
        urgent.push(text);
      }
    }
    
    return urgent.slice(0, 5); // Top 5 urgent issues
  }

  private identifyLowSatisfactionAreas(surveys: SatisfactionSurvey[]): string[] {
    const areas = [];
    
    const avgEfficiency = this.calculateAverageScore(surveys, 'processEfficiency');
    const avgCommunication = this.calculateAverageScore(surveys, 'communicationQuality');
    const avgFairness = this.calculateAverageScore(surveys, 'resolutionFairness');
    
    if (avgEfficiency < 0.6) areas.push('processEfficiency');
    if (avgCommunication < 0.6) areas.push('communicationQuality');
    if (avgFairness < 0.6) areas.push('resolutionFairness');
    
    return areas;
  }

  private getRecommendationsForArea(area: string): string[] {
    const recommendations: Record<string, string[]> = {
      processEfficiency: [
        'Streamline dispute resolution workflow',
        'Implement automated case routing',
        'Reduce manual processing steps'
      ],
      communicationQuality: [
        'Provide regular status updates',
        'Improve response time to user inquiries',
        'Use clearer communication templates'
      ],
      resolutionFairness: [
        'Enhance arbitrator training',
        'Implement peer review process',
        'Provide more detailed resolution explanations'
      ]
    };
    
    return recommendations[area] || [];
  }
}

export const satisfactionTrackingService = new SatisfactionTrackingService();
