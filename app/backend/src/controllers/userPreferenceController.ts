/**
 * User Preference Controller
 * Handles HTTP requests for user payment preferences
 */

import { Request, Response } from 'express';
import { userPreferenceService, TransactionContext } from '../services/userPreferenceService';

export class UserPreferenceController {
  /**
   * Get user payment preferences
   */
  async getUserPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Ensure user can only access their own preferences
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
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

  /**
   * Update payment preference based on transaction
   */
  async updatePaymentPreference(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { methodType, context }: { methodType: string; context: TransactionContext } = req.body;
      
      // Ensure user can only update their own preferences
      if (req.user?.id !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
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

  /**
   * Get recommended payment method
   */
  async getRecommendation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { availableMethods } = req.query;
      
      // Ensure user can only get their own recommendations
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      if (!availableMethods || typeof availableMethods !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Available methods are required'
        });
        return;
      }

      const methods = availableMethods.split(',');
      const preferences = await userPreferenceService.getUserPaymentPreferences(userId);
      const recommendation = userPreferenceService.getRecommendedMethod(methods, preferences);
      
      res.json({
        success: true,
        data: {
          recommendedMethod: recommendation,
          availableMethods: methods,
          preferences: preferences.preferredMethods.map(p => ({
            methodType: p.methodType,
            preferenceScore: p.preferenceScore,
            usageCount: p.usageCount,
            lastUsed: p.lastUsed
          }))
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

  /**
   * Add preference override
   */
  async addPreferenceOverride(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { 
        overrideType, 
        methodType, 
        priorityBoost, 
        expiresAt, 
        reason, 
        networkId, 
        metadata 
      } = req.body;
      
      // Ensure user can only add overrides for themselves
      if (req.user?.id !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Validate override type
      const validOverrideTypes = ['manual_selection', 'temporary_preference', 'network_specific'];
      if (!validOverrideTypes.includes(overrideType)) {
        res.status(400).json({
          success: false,
          message: 'Invalid override type'
        });
        return;
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

  /**
   * Reset user preferences to defaults
   */
  async resetPreferences(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Ensure user can only reset their own preferences
      if (req.user?.id !== userId) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
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

  /**
   * Get user payment analytics
   */
  async getAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const days = parseInt(req.query.days as string) || 30;
      
      // Ensure user can only access their own analytics
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      // Validate days parameter
      if (days < 1 || days > 365) {
        res.status(400).json({
          success: false,
          message: 'Days must be between 1 and 365'
        });
        return;
      }

      const analytics = await userPreferenceService.getUserPaymentAnalytics(userId, days);
      
      res.json({
        success: true,
        data: {
          ...analytics,
          period: `${days} days`
        }
      });
    } catch (error) {
      console.error('Error getting user payment analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to get user payment analytics'
      });
    }
  }

  /**
   * Admin endpoint to cleanup expired preference overrides
   */
  async cleanupExpiredOverrides(req: Request, res: Response): Promise<void> {
    try {
      // Only allow admin users to cleanup expired overrides
      if (!req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Admin access required'
        });
        return;
      }

      const deletedCount = await userPreferenceService.cleanupExpiredOverrides();
      
      res.json({
        success: true,
        message: `Cleaned up ${deletedCount} expired preference overrides`,
        data: { deletedCount }
      });
    } catch (error) {
      console.error('Error cleaning up expired overrides:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to cleanup expired overrides'
      });
    }
  }

  /**
   * Calculate preference score for a specific method
   */
  async calculatePreferenceScore(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { methodType } = req.query;
      
      // Ensure user can only access their own preferences
      if (req.user?.id !== userId && !req.user?.isAdmin) {
        res.status(403).json({
          success: false,
          message: 'Access denied'
        });
        return;
      }

      if (!methodType || typeof methodType !== 'string') {
        res.status(400).json({
          success: false,
          message: 'Method type is required'
        });
        return;
      }

      const preferences = await userPreferenceService.getUserPaymentPreferences(userId);
      const score = userPreferenceService.calculatePreferenceScore(methodType, preferences);
      
      res.json({
        success: true,
        data: {
          methodType,
          preferenceScore: score,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Error calculating preference score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate preference score'
      });
    }
  }
}

export const userPreferenceController = new UserPreferenceController();