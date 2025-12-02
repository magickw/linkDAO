/// <reference path="../types/express.d.ts" />

import { Request, Response } from 'express';
import { sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { enhancedCommunityReportingService } from '../services/enhancedCommunityReportingService';
import { createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class EnhancedCommunityReportingController {
  /**
   * Submit enhanced community report
   * POST /community-reporting/enhanced/submit
   */
  async submitEnhancedReport(req: Request, res: Response): Promise<void> {
    try {
      const { targetType, targetId, reportType, reason, evidence } = req.body;
      const reporterId = req.user?.id;

      if (!reporterId) {
        res.status(401).json(createErrorResponse(
          'UNAUTHORIZED',
          'User must be authenticated to submit reports'
        ));
        return;
      }

      if (!targetType || !targetId || !reportType || !reason) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'targetType, targetId, reportType, and reason are required'
        ));
        return;
      }

      const validTargetTypes = ['post', 'user', 'comment', 'listing'];
      if (!validTargetTypes.includes(targetType)) {
        res.status(400).json(createErrorResponse(
          'INVALID_TARGET_TYPE',
          `targetType must be one of: ${validTargetTypes.join(', ')}`
        ));
        return;
      }

      logger.info('Submitting enhanced community report', {
        reporterId,
        targetType,
        targetId,
        reportType
      });

      const report = await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId,
        targetType,
        targetId,
        reportType: sanitizeString(reportType),
        reason: sanitizeString(reason),
        evidence: evidence ? evidence.map((e: string) => sanitizeString(e)) : undefined
      });

      res.status(201).json(createSuccessResponse(report, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error submitting enhanced community report:', error);
      
      if (error.message.includes('Insufficient reputation weight')) {
        res.status(403).json(createErrorResponse(
          'INSUFFICIENT_REPUTATION',
          'Your reputation score is too low to submit reports. Continue participating positively in the community to increase your reputation.',
          { error: error.message }
        ));
      } else if (error.message.includes('already reported')) {
        res.status(409).json(createErrorResponse(
          'DUPLICATE_REPORT',
          'You have already reported this content',
          { error: error.message }
        ));
      } else {
        res.status(500).json(createErrorResponse(
          'REPORT_SUBMISSION_FAILED',
          'Failed to submit community report',
          { error: error.message }
        ));
      }
    }
  }

  /**
   * Calculate consensus-based reporting weight
   * GET /community-reporting/enhanced/weight/:userId
   */
  async calculateReportingWeight(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { reportType } = req.query;

      if (!userId) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_ID',
          'userId is required'
        ));
        return;
      }

      logger.info('Calculating consensus-based reporting weight', { userId, reportType });

      const weight = await enhancedCommunityReportingService.calculateConsensusBasedWeight(
        userId,
        reportType as string || 'general'
      );

      res.status(200).json(createSuccessResponse(weight, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error calculating reporting weight:', error);
      res.status(500).json(createErrorResponse(
        'WEIGHT_CALCULATION_FAILED',
        'Failed to calculate reporting weight',
        { error: error.message }
      ));
    }
  }

  /**
   * Process validation result (called by workflow system)
   * POST /community-reporting/enhanced/validate
   */
  async processValidationResult(req: Request, res: Response): Promise<void> {
    try {
      const { reportId, validatorVotes } = req.body;

      if (!reportId || !validatorVotes || !Array.isArray(validatorVotes)) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'reportId and validatorVotes array are required'
        ));
        return;
      }

      // Validate vote structure
      for (const vote of validatorVotes) {
        if (!vote.userId || !vote.vote || !['validate', 'reject'].includes(vote.vote) || vote.weight === undefined) {
          res.status(400).json(createErrorResponse(
            'INVALID_VOTE_STRUCTURE',
            'Each vote must have userId, vote (validate/reject), and weight'
          ));
          return;
        }
      }

      logger.info('Processing validation result', { reportId, voteCount: validatorVotes.length });

      const result = await enhancedCommunityReportingService.processValidationResult(reportId, validatorVotes);

      res.status(200).json(createSuccessResponse(result, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error processing validation result:', error);
      res.status(500).json(createErrorResponse(
        'VALIDATION_PROCESSING_FAILED',
        'Failed to process validation result',
        { error: error.message }
      ));
    }
  }

  /**
   * Get enhanced reporting analytics
   * GET /community-reporting/enhanced/analytics
   */
  async getEnhancedAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;

      let timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Default: last 30 days
        end: new Date()
      };

      if (startDate && endDate) {
        const start = new Date(startDate as string);
        const end = new Date(endDate as string);
        
        if (isNaN(start.getTime()) || isNaN(end.getTime())) {
          res.status(400).json(createErrorResponse(
            'INVALID_DATE_RANGE',
            'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)'
          ));
          return;
        }
        
        if (start >= end) {
          res.status(400).json(createErrorResponse(
            'INVALID_DATE_RANGE',
            'Start date must be before end date'
          ));
          return;
        }

        timeRange = { start, end };
      }

      logger.info('Getting enhanced reporting analytics', { timeRange });

      const analytics = await enhancedCommunityReportingService.getEnhancedReportingAnalytics(timeRange);

      res.status(200).json(createSuccessResponse(analytics, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting enhanced reporting analytics:', error);
      res.status(500).json(createErrorResponse(
        'ANALYTICS_FAILED',
        'Failed to get reporting analytics',
        { error: error.message }
      ));
    }
  }

  /**
   * Get report details with validation status
   * GET /community-reporting/enhanced/report/:reportId
   */
  async getReportDetails(req: Request, res: Response): Promise<void> {
    try {
      const { reportId } = req.params;

      if (!reportId) {
        res.status(400).json(createErrorResponse(
          'MISSING_REPORT_ID',
          'reportId is required'
        ));
        return;
      }

      logger.info('Getting report details', { reportId });

      // This would retrieve detailed report information
      const reportDetails = {
        id: reportId,
        reporterId: 'user123',
        targetType: 'post',
        targetId: 'post456',
        reportType: 'spam',
        reason: 'This post contains spam content',
        evidence: ['screenshot1.png', 'screenshot2.png'],
        status: 'validated',
        consensusScore: 0.75,
        reporterWeight: 1.2,
        validationVotes: 8,
        rejectionVotes: 2,
        createdAt: new Date().toISOString(),
        validatedAt: new Date().toISOString(),
        validationDetails: {
          participatingUsers: 10,
          consensusReason: 'Consensus achieved with 75% validation rate',
          rewardsDistributed: 16,
          penaltiesApplied: 1
        }
      };

      res.status(200).json(createSuccessResponse(reportDetails, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting report details:', error);
      res.status(500).json(createErrorResponse(
        'REPORT_RETRIEVAL_FAILED',
        'Failed to get report details',
        { error: error.message }
      ));
    }
  }

  /**
   * Get user's reporting history
   * GET /community-reporting/enhanced/user/:userId/history
   */
  async getUserReportingHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit = 20, offset = 0 } = req.query;

      if (!userId) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_ID',
          'userId is required'
        ));
        return;
      }

      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string) || 20));
      const offsetNum = Math.max(0, parseInt(offset as string) || 0);

      logger.info('Getting user reporting history', { userId, limit: limitNum, offset: offsetNum });

      // This would retrieve user's reporting history
      const history = {
        reports: [
          {
            id: 'report1',
            targetType: 'post',
            targetId: 'post123',
            reportType: 'spam',
            reason: 'Spam content',
            status: 'validated',
            consensusScore: 0.8,
            reporterWeight: 1.2,
            createdAt: new Date().toISOString(),
            reward: 12
          },
          {
            id: 'report2',
            targetType: 'comment',
            targetId: 'comment456',
            reportType: 'harassment',
            reason: 'Personal attack',
            status: 'rejected',
            consensusScore: 0.3,
            reporterWeight: 1.1,
            createdAt: new Date().toISOString(),
            penalty: -2
          }
        ],
        totalCount: 25,
        accuracyRate: 0.72,
        totalRewards: 84,
        totalPenalties: 4,
        currentWeight: 1.15
      };

      res.status(200).json(createSuccessResponse(history, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting user reporting history:', error);
      res.status(500).json(createErrorResponse(
        'HISTORY_RETRIEVAL_FAILED',
        'Failed to get user reporting history',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reporting leaderboard
   * GET /community-reporting/enhanced/leaderboard
   */
  async getReportingLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { period = '30d', limit = 10 } = req.query;

      const limitNum = Math.min(50, Math.max(1, parseInt(limit as string) || 10));
      const validPeriods = ['7d', '30d', '90d', '1y'];
      const periodStr = validPeriods.includes(period as string) ? period as string : '30d';

      logger.info('Getting reporting leaderboard', { period: periodStr, limit: limitNum });

      // This would calculate leaderboard based on period
      const leaderboard = [
        {
          rank: 1,
          userId: 'user123',
          username: 'CommunityGuardian',
          reportCount: 45,
          accuracyRate: 0.89,
          totalRewards: 234,
          currentWeight: 1.8,
          badges: ['TopReporter', 'AccuracyExpert']
        },
        {
          rank: 2,
          userId: 'user456',
          username: 'QualityController',
          reportCount: 38,
          accuracyRate: 0.85,
          totalRewards: 198,
          currentWeight: 1.6,
          badges: ['TopReporter']
        },
        {
          rank: 3,
          userId: 'user789',
          username: 'SpamHunter',
          reportCount: 52,
          accuracyRate: 0.78,
          totalRewards: 187,
          currentWeight: 1.5,
          badges: ['VolumeLeader']
        }
      ].slice(0, limitNum);

      res.status(200).json(createSuccessResponse(leaderboard, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting reporting leaderboard:', error);
      res.status(500).json(createErrorResponse(
        'LEADERBOARD_GENERATION_FAILED',
        'Failed to generate reporting leaderboard',
        { error: error.message }
      ));
    }
  }
}

export const enhancedCommunityReportingController = new EnhancedCommunityReportingController();