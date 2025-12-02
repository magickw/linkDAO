/**
 * Compliance Actions API Routes
 * 
 * REST API endpoints for compliance actions including warnings,
 * suspensions, investigations, and reinstatements.
 */

import { Router } from 'express';
import { body, param, query } from 'express-validator';
import { complianceActionsService } from '../services/complianceActionsService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * Generate warning for seller
 * POST /api/compliance/actions/warning
 */
router.post('/warning', [
  body('sellerId').notEmpty().withMessage('Seller ID is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('severity').isIn(['low', 'medium', 'high']).withMessage('Invalid severity'),
  body('createdBy').notEmpty().withMessage('Created by is required'),
  body('notes').optional().isString(),
  body('requiresResponse').optional().isBoolean(),
  body('responseDeadline').optional().isISO8601(),
  body('effectiveDate').optional().isISO8601()
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { sellerId, reason, severity, createdBy, notes, requiresResponse, responseDeadline, effectiveDate } = req.body;

    const warning = await complianceActionsService.generateWarning(
      sellerId,
      reason,
      severity,
      {
        notes,
        requiresResponse,
        responseDeadline: responseDeadline ? new Date(responseDeadline) : undefined,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        createdBy
      }
    );

    res.status(201).json({
      success: true,
      data: warning
    });
  } catch (error) {
    logger.error('Error generating warning:', error);
    res.status(500).json({
      error: 'Failed to generate warning',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Suspend seller
 * POST /api/compliance/actions/suspend
 */
router.post('/suspend', [
  body('sellerId').notEmpty().withMessage('Seller ID is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('suspensionType').isIn(['temporary', 'indefinite']).withMessage('Invalid suspension type'),
  body('createdBy').notEmpty().withMessage('Created by is required'),
  body('duration').optional().isInt({ min: 1 }).withMessage('Duration must be a positive integer'),
  body('restrictedActivities').optional().isArray(),
  body('appealAllowed').optional().isBoolean(),
  body('appealDeadline').optional().isISO8601(),
  body('notes').optional().isString(),
  body('effectiveDate').optional().isISO8601()
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { 
      sellerId, 
      reason, 
      suspensionType, 
      createdBy, 
      duration, 
      restrictedActivities, 
      appealAllowed, 
      appealDeadline, 
      notes, 
      effectiveDate 
    } = req.body;

    const suspension = await complianceActionsService.suspendSeller(
      sellerId,
      reason,
      suspensionType,
      {
        duration,
        restrictedActivities,
        appealAllowed,
        appealDeadline: appealDeadline ? new Date(appealDeadline) : undefined,
        notes,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        createdBy
      }
    );

    res.status(201).json({
      success: true,
      data: suspension
    });
  } catch (error) {
    logger.error('Error suspending seller:', error);
    res.status(500).json({
      error: 'Failed to suspend seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Start investigation
 * POST /api/compliance/actions/investigate
 */
router.post('/investigate', [
  body('sellerId').notEmpty().withMessage('Seller ID is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('priority').isIn(['low', 'medium', 'high', 'urgent']).withMessage('Invalid priority'),
  body('createdBy').notEmpty().withMessage('Created by is required'),
  body('investigationScope').optional().isArray(),
  body('evidenceRequired').optional().isArray(),
  body('deadline').optional().isISO8601(),
  body('assignedTo').optional().isString(),
  body('notes').optional().isString()
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { 
      sellerId, 
      reason, 
      priority, 
      createdBy, 
      investigationScope, 
      evidenceRequired, 
      deadline, 
      assignedTo, 
      notes 
    } = req.body;

    const investigation = await complianceActionsService.startInvestigation(
      sellerId,
      reason,
      priority,
      {
        investigationScope,
        evidenceRequired,
        deadline: deadline ? new Date(deadline) : undefined,
        assignedTo,
        notes,
        createdBy
      }
    );

    res.status(201).json({
      success: true,
      data: investigation
    });
  } catch (error) {
    logger.error('Error starting investigation:', error);
    res.status(500).json({
      error: 'Failed to start investigation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Reinstate seller
 * POST /api/compliance/actions/reinstate
 */
router.post('/reinstate', [
  body('sellerId').notEmpty().withMessage('Seller ID is required'),
  body('previousSuspensionId').notEmpty().withMessage('Previous suspension ID is required'),
  body('reason').notEmpty().withMessage('Reason is required'),
  body('createdBy').notEmpty().withMessage('Created by is required'),
  body('reinstatementConditions').optional().isArray(),
  body('probationPeriod').optional().isInt({ min: 0 }).withMessage('Probation period must be a non-negative integer'),
  body('monitoringRequired').optional().isBoolean(),
  body('complianceRequirements').optional().isArray(),
  body('notes').optional().isString(),
  body('effectiveDate').optional().isISO8601()
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { 
      sellerId, 
      previousSuspensionId, 
      reason, 
      createdBy, 
      reinstatementConditions, 
      probationPeriod, 
      monitoringRequired, 
      complianceRequirements, 
      notes, 
      effectiveDate 
    } = req.body;

    const reinstatement = await complianceActionsService.reinstateSeller(
      sellerId,
      previousSuspensionId,
      reason,
      {
        reinstatementConditions,
        probationPeriod,
        monitoringRequired,
        complianceRequirements,
        notes,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : undefined,
        createdBy
      }
    );

    res.status(201).json({
      success: true,
      data: reinstatement
    });
  } catch (error) {
    logger.error('Error reinstating seller:', error);
    res.status(500).json({
      error: 'Failed to reinstate seller',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get active actions for seller
 * GET /api/compliance/actions/seller/:sellerId/active
 */
router.get('/seller/:sellerId/active', [
  param('sellerId').notEmpty().withMessage('Seller ID is required')
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { sellerId } = req.params;
    const activeActions = await complianceActionsService.getActiveActions(sellerId);

    res.json({
      success: true,
      data: activeActions
    });
  } catch (error) {
    logger.error('Error getting active actions:', error);
    res.status(500).json({
      error: 'Failed to get active actions',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get action history for seller
 * GET /api/compliance/actions/seller/:sellerId/history
 */
router.get('/seller/:sellerId/history', [
  param('sellerId').notEmpty().withMessage('Seller ID is required'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100')
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { sellerId } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit) : 50;
    
    const actionHistory = await complianceActionsService.getActionHistory(sellerId, limit);

    res.json({
      success: true,
      data: actionHistory
    });
  } catch (error) {
    logger.error('Error getting action history:', error);
    res.status(500).json({
      error: 'Failed to get action history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Update action status
 * PATCH /api/compliance/actions/:actionId/status
 */
router.patch('/:actionId/status', [
  param('actionId').notEmpty().withMessage('Action ID is required'),
  body('status').isIn(['pending', 'active', 'expired', 'cancelled']).withMessage('Invalid status')
], async (req: any, res: any) => {
  try {
    const errors = req.validationErrors();
    if (errors.length > 0) {
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    const { actionId } = req.params;
    const { status } = req.body;

    await complianceActionsService.updateActionStatus(actionId, status);

    res.json({
      success: true,
      message: 'Action status updated successfully'
    });
  } catch (error) {
    logger.error('Error updating action status:', error);
    res.status(500).json({
      error: 'Failed to update action status',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * Get action statistics
 * GET /api/compliance/actions/stats
 */
router.get('/stats', async (req: any, res: any) => {
  try {
    const stats = complianceActionsService.getActionStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting action statistics:', error);
    res.status(500).json({
      error: 'Failed to get action statistics',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;