import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { cohortAnalysisService } from '../services/cohortAnalysisService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const cohortAnalysisSchema = z.object({
  startDate: z.string().transform(str => new Date(str)),
  endDate: z.string().transform(str => new Date(str)),
  cohortType: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly'),
  retentionPeriods: z.number().min(1).max(24).optional().default(12)
});

const cohortComparisonSchema = z.object({
  cohortA: z.string(),
  cohortB: z.string(),
  cohortType: z.enum(['daily', 'weekly', 'monthly']).optional().default('monthly')
});

const userRetentionSchema = z.object({
  userId: z.string().uuid(),
  cohortPeriod: z.string().optional()
});

export class CohortAnalysisController {
  /**
   * Generate comprehensive cohort analysis
   */
  async getCohortAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortAnalysisSchema.parse(req.query);

      const analysis = await cohortAnalysisService.generateCohortAnalysis(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.cohortType,
        validatedData.retentionPeriods
      );

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      safeLogger.error('Error getting cohort analysis:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cohort analysis'
      });
    }
  }

  /**
   * Compare two specific cohorts
   */
  async compareCohorts(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortComparisonSchema.parse(req.body);

      const comparison = await cohortAnalysisService.compareCohorts(
        validatedData.cohortA,
        validatedData.cohortB,
        validatedData.cohortType
      );

      res.json({
        success: true,
        data: comparison
      });
    } catch (error) {
      safeLogger.error('Error comparing cohorts:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid request data',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to compare cohorts'
      });
    }
  }

  /**
   * Get user retention metrics
   */
  async getUserRetentionMetrics(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = userRetentionSchema.parse(req.query);

      const metrics = await cohortAnalysisService.getUserRetentionMetrics(
        validatedData.userId,
        validatedData.cohortPeriod
      );

      if (!metrics) {
        res.status(404).json({
          success: false,
          message: 'User not found'
        });
        return;
      }

      res.json({
        success: true,
        data: metrics
      });
    } catch (error) {
      safeLogger.error('Error getting user retention metrics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve user retention metrics'
      });
    }
  }

  /**
   * Get cohort retention heatmap data
   */
  async getCohortHeatmapData(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortAnalysisSchema.parse(req.query);

      const analysis = await cohortAnalysisService.generateCohortAnalysis(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.cohortType,
        validatedData.retentionPeriods
      );

      // Transform data for heatmap visualization
      const heatmapData = analysis.cohorts.map(cohort => ({
        cohortPeriod: cohort.cohortPeriod,
        cohortSize: cohort.cohortSize,
        retentionRates: cohort.retentionRates,
        periods: cohort.periods
      }));

      res.json({
        success: true,
        data: {
          heatmapData,
          cohortType: validatedData.cohortType,
          retentionPeriods: validatedData.retentionPeriods,
          dateRange: {
            startDate: validatedData.startDate,
            endDate: validatedData.endDate
          }
        }
      });
    } catch (error) {
      safeLogger.error('Error getting cohort heatmap data:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cohort heatmap data'
      });
    }
  }

  /**
   * Get retention trends analysis
   */
  async getRetentionTrends(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortAnalysisSchema.parse(req.query);

      const analysis = await cohortAnalysisService.generateCohortAnalysis(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.cohortType,
        validatedData.retentionPeriods
      );

      res.json({
        success: true,
        data: {
          retentionTrends: analysis.retentionTrends,
          overallRetentionRate: analysis.overallRetentionRate,
          averageCohortSize: analysis.averageCohortSize,
          bestPerformingCohort: analysis.bestPerformingCohort,
          worstPerformingCohort: analysis.worstPerformingCohort
        }
      });
    } catch (error) {
      safeLogger.error('Error getting retention trends:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve retention trends'
      });
    }
  }

  /**
   * Get churn analysis
   */
  async getChurnAnalysis(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortAnalysisSchema.parse(req.query);

      const analysis = await cohortAnalysisService.generateCohortAnalysis(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.cohortType,
        validatedData.retentionPeriods
      );

      res.json({
        success: true,
        data: analysis.churnAnalysis
      });
    } catch (error) {
      safeLogger.error('Error getting churn analysis:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve churn analysis'
      });
    }
  }

  /**
   * Get cohort summary statistics
   */
  async getCohortSummary(req: Request, res: Response): Promise<void> {
    try {
      const validatedData = cohortAnalysisSchema.parse(req.query);

      const analysis = await cohortAnalysisService.generateCohortAnalysis(
        validatedData.startDate,
        validatedData.endDate,
        validatedData.cohortType,
        validatedData.retentionPeriods
      );

      // Calculate summary statistics
      const totalUsers = analysis.cohorts.reduce((sum, cohort) => sum + cohort.cohortSize, 0);
      const totalCohorts = analysis.cohorts.length;
      const avgLifetimeValue = analysis.cohorts.reduce((sum, cohort) => sum + cohort.averageLifetimeValue, 0) / totalCohorts;
      const avgChurnRate = analysis.cohorts.reduce((sum, cohort) => sum + cohort.churnRate, 0) / totalCohorts;

      // Get retention rate distribution
      const retentionDistribution = analysis.cohorts.map(cohort => ({
        cohortPeriod: cohort.cohortPeriod,
        firstPeriodRetention: cohort.retentionRates[1] || 0,
        lastPeriodRetention: cohort.retentionRates[cohort.retentionRates.length - 1] || 0
      }));

      const summary = {
        totalUsers,
        totalCohorts,
        averageCohortSize: analysis.averageCohortSize,
        overallRetentionRate: analysis.overallRetentionRate,
        averageLifetimeValue: avgLifetimeValue,
        averageChurnRate: avgChurnRate,
        retentionDistribution,
        bestPerformingCohort: {
          period: analysis.bestPerformingCohort.cohortPeriod,
          size: analysis.bestPerformingCohort.cohortSize,
          retentionRate: analysis.bestPerformingCohort.retentionRates[1] || 0
        },
        worstPerformingCohort: {
          period: analysis.worstPerformingCohort.cohortPeriod,
          size: analysis.worstPerformingCohort.cohortSize,
          retentionRate: analysis.worstPerformingCohort.retentionRates[1] || 0
        }
      };

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      safeLogger.error('Error getting cohort summary:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          message: 'Invalid query parameters',
          errors: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: 'Failed to retrieve cohort summary'
      });
    }
  }
}

export const cohortAnalysisController = new CohortAnalysisController();