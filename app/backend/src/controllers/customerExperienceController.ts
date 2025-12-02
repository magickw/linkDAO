import { Request, Response } from 'express';
import { customerExperienceService } from '../services/customerExperienceService';
import { safeLogger } from '../utils/safeLogger';
import { z } from 'zod';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const feedbackAnalysisSchema = z.object({
  feedbackTexts: z.array(z.string()).min(1, "At least one feedback text is required")
});

export class CustomerExperienceController {
  /**
   * Get customer satisfaction metrics
   */
  async getSatisfactionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const metrics = await customerExperienceService.getSatisfactionMetrics(startDate, endDate);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting satisfaction metrics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve satisfaction metrics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Analyze customer feedback for themes and insights
   */
  async analyzeFeedback(req: Request, res: Response): Promise<void> {
    try {
      const { feedbackTexts } = feedbackAnalysisSchema.parse(req.body);
      
      const themes = await customerExperienceService.analyzeFeedback(feedbackTexts);
      
      res.json({
        success: true,
        data: themes,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error analyzing feedback:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to analyze feedback',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get experience score
   */
  async getExperienceScore(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const score = await customerExperienceService.calculateExperienceScore(startDate, endDate);
      
      res.json({
        success: true,
        data: score,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error calculating experience score:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate experience score',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get issue correlations
   */
  async getIssueCorrelations(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const correlations = await customerExperienceService.identifyIssueCorrelations(startDate, endDate);
      
      res.json({
        success: true,
        data: correlations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error identifying issue correlations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to identify issue correlations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate comprehensive experience report
   */
  async generateExperienceReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      const report = await customerExperienceService.generateExperienceReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating experience report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate experience report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get improvement recommendations
   */
  async getImprovementRecommendations(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);
      
      // Generate a full report to get recommendations
      const report = await customerExperienceService.generateExperienceReport(startDate, endDate);
      
      res.json({
        success: true,
        data: report.improvementRecommendations,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting improvement recommendations:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get improvement recommendations',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const customerExperienceController = new CustomerExperienceController();