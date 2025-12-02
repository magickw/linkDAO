/// <reference path="../types/express.d.ts" />

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { advancedReputationService } from '../services/advancedReputationService';
import { createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export class AdvancedReputationController {
  /**
   * Calculate advanced reputation impact for an event
   * POST /reputation/advanced/impact
   */
  async calculateImpact(req: Request, res: Response): Promise<void> {
    try {
      const { userId, eventType, eventData, context } = req.body;

      if (!userId || !eventType) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'userId and eventType are required'
        ));
        return;
      }

      logger.info('Calculating advanced reputation impact', { userId, eventType });

      const impact = await advancedReputationService.calculateAdvancedImpact(
        userId,
        eventType,
        eventData || {},
        context || {}
      );

      res.status(200).json(createSuccessResponse(impact, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error calculating advanced reputation impact:', error);
      res.status(500).json(createErrorResponse(
        'IMPACT_CALCULATION_FAILED',
        'Failed to calculate reputation impact',
        { error: error.message }
      ));
    }
  }

  /**
   * Apply advanced reputation change with impact analysis
   * POST /reputation/advanced/apply
   */
  async applyAdvancedChange(req: Request, res: Response): Promise<void> {
    try {
      const { 
        userId, 
        eventType, 
        scoreChange, 
        reason, 
        eventData, 
        context, 
        performedBy 
      } = req.body;

      if (!userId || !eventType || scoreChange === undefined || !reason) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'userId, eventType, scoreChange, and reason are required'
        ));
        return;
      }

      logger.info('Applying advanced reputation change', { 
        userId, 
        eventType, 
        scoreChange, 
        reason,
        performedBy: performedBy || req.user?.id 
      });

      const update = await advancedReputationService.applyAdvancedReputationChange(
        userId,
        eventType,
        scoreChange,
        reason,
        eventData || {},
        context || {},
        performedBy || req.user?.id
      );

      res.status(200).json(createSuccessResponse(update, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error applying advanced reputation change:', error);
      res.status(500).json(createErrorResponse(
        'REPUTATION_CHANGE_FAILED',
        'Failed to apply reputation change',
        { error: error.message }
      ));
    }
  }

  /**
   * Get advanced reputation analytics
   * GET /reputation/advanced/analytics/:userId
   */
  async getAdvancedAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_ID',
          'userId is required'
        ));
        return;
      }

      logger.info('Getting advanced reputation analytics', { userId });

      const analytics = await advancedReputationService.getAdvancedReputationAnalytics(userId);

      res.status(200).json(createSuccessResponse(analytics, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting advanced reputation analytics:', error);
      res.status(500).json(createErrorResponse(
        'ANALYTICS_FAILED',
        'Failed to get reputation analytics',
        { error: error.message }
      ));
    }
  }

  /**
   * Perform bulk reputation operation
   * POST /reputation/advanced/bulk
   */
  async performBulkOperation(req: Request, res: Response): Promise<void> {
    try {
      const { userIds, operationType, changes, justification } = req.body;

      if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_IDS',
          'userIds array is required and must not be empty'
        ));
        return;
      }

      if (!operationType || !['adjustment', 'penalty', 'restoration'].includes(operationType)) {
        res.status(400).json(createErrorResponse(
          'INVALID_OPERATION_TYPE',
          'operationType must be one of: adjustment, penalty, restoration'
        ));
        return;
      }

      if (!changes || typeof changes !== 'object') {
        res.status(400).json(createErrorResponse(
          'MISSING_CHANGES',
          'changes object is required'
        ));
        return;
      }

      if (!justification || justification.trim().length < 10) {
        res.status(400).json(createErrorResponse(
          'MISSING_JUSTIFICATION',
          'justification is required and must be at least 10 characters'
        ));
        return;
      }

      logger.info('Initiating bulk reputation operation', { 
        userCount: userIds.length, 
        operationType,
        performedBy: req.user?.id 
      });

      const operation = await advancedReputationService.performBulkReputationOperation({
        userIds,
        operationType,
        changes,
        justification: justification.trim(),
        performedBy: req.user?.id
      });

      res.status(202).json(createSuccessResponse(operation, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error initiating bulk reputation operation:', error);
      res.status(500).json(createErrorResponse(
        'BULK_OPERATION_FAILED',
        'Failed to initiate bulk reputation operation',
        { error: error.message }
      ));
    }
  }

  /**
   * Get bulk operation status
   * GET /reputation/advanced/bulk/:operationId/status
   */
  async getBulkOperationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { operationId } = req.params;

      if (!operationId) {
        res.status(400).json(createErrorResponse(
          'MISSING_OPERATION_ID',
          'operationId is required'
        ));
        return;
      }

      logger.info('Getting bulk operation status', { operationId });

      // This would retrieve from the service - for now, return a mock response
      const status = {
        operationId,
        status: 'completed',
        progress: 100,
        processedUsers: 10,
        totalUsers: 10,
        errors: [],
        completedAt: new Date().toISOString()
      };

      res.status(200).json(createSuccessResponse(status, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting bulk operation status:', error);
      res.status(500).json(createErrorResponse(
        'STATUS_CHECK_FAILED',
        'Failed to get bulk operation status',
        { error: error.message }
      ));
    }
  }

  /**
   * Configure progressive penalty system
   * POST /reputation/advanced/penalties/configure
   */
  async configureProgressivePenalty(req: Request, res: Response): Promise<void> {
    try {
      const config = req.body;

      if (!config.violationType || !config.severityLevels || !Array.isArray(config.severityLevels)) {
        res.status(400).json(createErrorResponse(
          'MISSING_CONFIGURATION',
          'violationType and severityLevels array are required'
        ));
        return;
      }

      if (!config.escalationRules || !Array.isArray(config.escalationRules)) {
        res.status(400).json(createErrorResponse(
          'MISSING_ESCALATION_RULES',
          'escalationRules array is required'
        ));
        return;
      }

      if (!config.recoveryConfig) {
        res.status(400).json(createErrorResponse(
          'MISSING_RECOVERY_CONFIG',
          'recoveryConfig is required'
        ));
        return;
      }

      logger.info('Configuring progressive penalty system', { 
        violationType: config.violationType,
        configuredBy: req.user?.id 
      });

      await advancedReputationService.configureProgressivePenalty(config);

      res.status(201).json(createSuccessResponse({ 
        message: 'Progressive penalty system configured successfully',
        violationType: config.violationType 
      }, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error configuring progressive penalty:', error);
      res.status(500).json(createErrorResponse(
        'CONFIGURATION_FAILED',
        'Failed to configure progressive penalty system',
        { error: error.message }
      ));
    }
  }

  /**
   * Apply progressive penalty with dynamic escalation
   * POST /reputation/advanced/penalties/apply
   */
  async applyProgressivePenalty(req: Request, res: Response): Promise<void> {
    try {
      const { userId, violationType, violationData, context } = req.body;

      if (!userId || !violationType) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'userId and violationType are required'
        ));
        return;
      }

      logger.info('Applying progressive penalty', { 
        userId, 
        violationType,
        appliedBy: req.user?.id 
      });

      const result = await advancedReputationService.applyProgressivePenalty(
        userId,
        violationType,
        violationData || {},
        context || {}
      );

      res.status(200).json(createSuccessResponse(result, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error applying progressive penalty:', error);
      res.status(500).json(createErrorResponse(
        'PENALTY_APPLICATION_FAILED',
        'Failed to apply progressive penalty',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reputation impact prediction
   * POST /reputation/advanced/predict
   */
  async predictReputationImpact(req: Request, res: Response): Promise<void> {
    try {
      const { userId, eventType, eventData, context } = req.body;

      if (!userId || !eventType) {
        res.status(400).json(createErrorResponse(
          'MISSING_PARAMETERS',
          'userId and eventType are required'
        ));
        return;
      }

      logger.info('Predicting reputation impact', { userId, eventType });

      // This would use the prediction model from advancedReputationService
      const prediction = {
        predictedScoreChange: 5,
        confidence: 0.8,
        riskFactors: ['high_volatility', 'recent_violations'],
        recommendations: [
          'Consider smaller penalty due to user history',
          'Monitor for repeat violations'
        ]
      };

      res.status(200).json(createSuccessResponse(prediction, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error predicting reputation impact:', error);
      res.status(500).json(createErrorResponse(
        'PREDICTION_FAILED',
        'Failed to predict reputation impact',
        { error: error.message }
      ));
    }
  }

  /**
   * Get reputation network influence
   * GET /reputation/advanced/network/:userId
   */
  async getNetworkInfluence(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_ID',
          'userId is required'
        ));
        return;
      }

      logger.info('Getting reputation network influence', { userId });

      // This would calculate network influence
      const networkInfluence = {
        influenceScore: 75,
        connectedUsers: 42,
        averagePeerScore: 68,
        influenceRank: 15,
        networkGraph: {
          nodes: [
            { id: userId, score: 75, type: 'user' },
            { id: 'user2', score: 80, type: 'peer' },
            { id: 'user3', score: 65, type: 'peer' }
          ],
          edges: [
            { source: userId, target: 'user2', weight: 0.8 },
            { source: userId, target: 'user3', weight: 0.6 }
          ]
        }
      };

      res.status(200).json(createSuccessResponse(networkInfluence, {
        requestId: res.locals.requestId
      }));
    } catch (error) {
      logger.error('Error getting network influence:', error);
      res.status(500).json(createErrorResponse(
        'NETWORK_ANALYSIS_FAILED',
        'Failed to calculate network influence',
        { error: error.message }
      ));
    }
  }

  /**
   * Get real-time reputation updates
   * GET /reputation/advanced/realtime/:userId
   */
  async getRealTimeUpdates(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json(createErrorResponse(
          'MISSING_USER_ID',
          'userId is required'
        ));
        return;
      }

      // Set up Server-Sent Events for real-time updates
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Cache-Control'
      });

      // Send initial connection message
      res.write('data: ' + JSON.stringify({
        type: 'connected',
        message: 'Real-time reputation updates connected',
        timestamp: new Date().toISOString()
      }) + '\n\n');

      // Set up event listener for reputation updates
      const updateHandler = (update: any) => {
        if (update.userId === userId) {
          res.write('data: ' + JSON.stringify({
            type: 'reputation_update',
            data: update,
            timestamp: new Date().toISOString()
          }) + '\n\n');
        }
      };

      advancedReputationService.on('reputationUpdated', updateHandler);

      // Clean up on client disconnect
      req.on('close', () => {
        advancedReputationService.off('reputationUpdated', updateHandler);
      });

    } catch (error) {
      logger.error('Error setting up real-time updates:', error);
      res.status(500).json(createErrorResponse(
        'REALTIME_SETUP_FAILED',
        'Failed to setup real-time updates',
        { error: error.message }
      ));
    }
  }
}

export const advancedReputationController = new AdvancedReputationController();