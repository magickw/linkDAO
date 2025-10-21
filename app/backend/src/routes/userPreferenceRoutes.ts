/**
 * User Preference Routes
 * API endpoints for managing user payment preferences
 */

import { Router } from 'express';
import { userPreferenceService } from '../services/userPreferenceService';
import { authMiddleware } from '../middleware/authMiddleware';
import { body, param, query, validationResult } from 'express-validator';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

/**
 * GET /api/user-preferences/:userId
 * Get user payment preferences
 */
router.get(
  '/:userId',
  [
    param('userId').isUUID().withMessage('Invalid user ID format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      
      // Ensure user can only access their own preferences
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const preferences = await userPreferenceService.getUserPaymentPreferences(userId);
      
      res.json({
        success: true,
        data: preferences
      });
    } catch (error) {
      console.error('Error getting user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user preferences'
      });
    }
  }
);

/**
 * POST /api/user-preferences/:userId/update
 * Update payment preference based on transaction
 */
router.post(
  '/:userId/update',
  [
    param('userId').isUUID().withMessage('Invalid user ID format'),
    body('methodType').isString().notEmpty().withMessage('Payment method type is required'),
    body('context').isObject().withMessage('Transaction context is required'),
    body('context.amount').isNumeric().withMessage('Transaction amount must be numeric'),
    body('context.currency').isString().notEmpty().withMessage('Currency is required'),
    body('context.wasPreferred').isBoolean().withMessage('wasPreferred must be boolean'),
    body('context.wasSuggested').isBoolean().withMessage('wasSuggested must be boolean')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { methodType, context } = req.body;
      
      // Ensure user can only update their own preferences
      if (req.user?.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await userPreferenceService.updatePaymentPreference(userId, methodType, context);
      
      res.json({
        success: true,
        message: 'Payment preference updated successfully'
      });
    } catch (error) {
      console.error('Error updating payment preference:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update payment preference'
      });
    }
  }
);

/**
 * GET /api/user-preferences/:userId/recommendation
 * Get recommended payment method
 */
router.get(
  '/:userId/recommendation',
  [
    param('userId').isUUID().withMessage('Invalid user ID format'),
    query('availableMethods').isString().notEmpty().withMessage('Available methods are required')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { availableMethods } = req.query;
      
      // Ensure user can only get their own recommendations
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const methods = (availableMethods as string).split(',');
      const preferences = await userPreferenceService.getUserPaymentPreferences(userId);
      const recommendation = userPreferenceService.getRecommendedMethod(methods, preferences);
      
      res.json({
        success: true,
        data: {
          recommendedMethod: recommendation,
          availableMethods: methods,
          preferences: preferences.preferredMethods
        }
      });
    } catch (error) {
      console.error('Error getting payment recommendation:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get payment recommendation'
      });
    }
  }
);

/**
 * POST /api/user-preferences/:userId/override
 * Add preference override
 */
router.post(
  '/:userId/override',
  [
    param('userId').isUUID().withMessage('Invalid user ID format'),
    body('overrideType').isIn(['manual_selection', 'temporary_preference', 'network_specific'])
      .withMessage('Invalid override type'),
    body('methodType').isString().notEmpty().withMessage('Payment method type is required'),
    body('priorityBoost').optional().isInt({ min: -10, max: 10 })
      .withMessage('Priority boost must be between -10 and 10'),
    body('expiresAt').optional().isISO8601().withMessage('Invalid expiration date format'),
    body('reason').optional().isString().withMessage('Reason must be a string')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const { overrideType, methodType, priorityBoost, expiresAt, reason, networkId, metadata } = req.body;
      
      // Ensure user can only add overrides for themselves
      if (req.user?.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await userPreferenceService.addPreferenceOverride(userId, overrideType, methodType, {
        networkId,
        priorityBoost,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        reason,
        metadata
      });
      
      res.json({
        success: true,
        message: 'Preference override added successfully'
      });
    } catch (error) {
      console.error('Error adding preference override:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to add preference override'
      });
    }
  }
);

/**
 * DELETE /api/user-preferences/:userId/reset
 * Reset user preferences to defaults
 */
router.delete(
  '/:userId/reset',
  [
    param('userId').isUUID().withMessage('Invalid user ID format')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      
      // Ensure user can only reset their own preferences
      if (req.user?.id !== userId) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      await userPreferenceService.resetUserPreferences(userId);
      
      res.json({
        success: true,
        message: 'User preferences reset successfully'
      });
    } catch (error) {
      console.error('Error resetting user preferences:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to reset user preferences'
      });
    }
  }
);

/**
 * GET /api/user-preferences/:userId/analytics
 * Get user payment analytics
 */
router.get(
  '/:userId/analytics',
  [
    param('userId').isUUID().withMessage('Invalid user ID format'),
    query('days').optional().isInt({ min: 1, max: 365 }).withMessage('Days must be between 1 and 365')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          errors: errors.array()
        });
      }

      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      // Ensure user can only access their own analytics
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Access denied'
        });
      }

      const analytics = await userPreferenceService.getUserPaymentAnalytics(userId, days);
      
      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      console.error('Error getting user payment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user payment analytics'
      });
    }
  }
);

/**
 * POST /api/user-preferences/cleanup-expired
 * Admin endpoint to cleanup expired preference overrides
 */
router.post(
  '/cleanup-expired',
  async (req, res) => {
    try {
      // Only allow admin users to cleanup expired overrides
      if (!req.user?.isAdmin) {
        return res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
      }

      const deletedCount = await userPreferenceService.cleanupExpiredOverrides();
      
      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired preference overrides`
      });
    } catch (error) {
      console.error('Error cleaning up expired overrides:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired overrides'
      });
    }
  }
);

export default router;