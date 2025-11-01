/**
 * Automated Tier Upgrade Controller
 * Handles HTTP endpoints for automated tier upgrade functionality
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { getAutomatedTierUpgradeService } from '../services/automatedTierUpgradeService';
import { z } from 'zod';

// Validation schemas
const walletAddressSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
});

const evaluationRequestSchema = z.object({
  walletAddress: z.string().min(1, 'Wallet address is required'),
  force: z.boolean().optional().default(false),
});

class AutomatedTierUpgradeController {
  /**
   * Get tier progression tracking for a seller
   */
  async getTierProgressionTracking(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = walletAddressSchema.parse(req.params);

      const progression = await getAutomatedTierUpgradeService().getTierProgressionTracking(walletAddress);

      res.json({
        success: true,
        data: progression,
      });

    } catch (error) {
      safeLogger.error('Error getting tier progression tracking:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get tier progression tracking',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Trigger manual tier evaluation for a seller
   */
  async triggerTierEvaluation(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress, force } = evaluationRequestSchema.parse(req.body);

      const evaluation = await getAutomatedTierUpgradeService().triggerManualEvaluation(walletAddress);

      res.json({
        success: true,
        data: evaluation,
        message: evaluation.upgradeEligible 
          ? `Tier upgrade processed: ${evaluation.currentTier} → ${evaluation.evaluatedTier}`
          : 'No tier upgrade available at this time',
      });

    } catch (error) {
      safeLogger.error('Error triggering tier evaluation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to trigger tier evaluation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get tier criteria and requirements
   */
  async getTierCriteria(req: Request, res: Response): Promise<void> {
    try {
      const criteria = getAutomatedTierUpgradeService().getTierCriteria();

      res.json({
        success: true,
        data: criteria,
      });

    } catch (error) {
      safeLogger.error('Error getting tier criteria:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get tier criteria',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get evaluation statistics
   */
  async getEvaluationStatistics(req: Request, res: Response): Promise<void> {
    try {
      const stats = await getAutomatedTierUpgradeService().getEvaluationStatistics();

      res.json({
        success: true,
        data: stats || {
          message: 'No evaluation statistics available yet',
        },
      });

    } catch (error) {
      safeLogger.error('Error getting evaluation statistics:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get evaluation statistics',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Run batch tier evaluation (admin only)
   */
  async runBatchEvaluation(req: Request, res: Response): Promise<void> {
    try {
      // This would typically require admin authentication
      // For now, we'll just trigger the batch evaluation
      
      // Run batch evaluation asynchronously
      getAutomatedTierUpgradeService().runBatchTierEvaluation()
        .catch(error => safeLogger.error('Batch evaluation error:', error));

      res.json({
        success: true,
        message: 'Batch tier evaluation started',
        timestamp: new Date().toISOString(),
      });

    } catch (error) {
      safeLogger.error('Error running batch evaluation:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to run batch evaluation',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get seller tier evaluation history
   */
  async getTierEvaluationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = walletAddressSchema.parse(req.params);

      // This would fetch historical evaluation data from database
      // For now, return a mock response
      const history = {
        walletAddress,
        evaluations: [
          {
            date: new Date().toISOString(),
            tier: 'bronze',
            eligible: false,
            requirementsMet: 2,
            totalRequirements: 4,
          },
        ],
        totalEvaluations: 1,
        lastUpgrade: null,
      };

      res.json({
        success: true,
        data: history,
      });

    } catch (error) {
      safeLogger.error('Error getting tier evaluation history:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get tier evaluation history',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Get tier upgrade notifications for a seller
   */
  async getTierUpgradeNotifications(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = walletAddressSchema.parse(req.params);

      // This would fetch tier upgrade notifications from database
      // For now, return a mock response
      const notifications = {
        walletAddress,
        notifications: [],
        unreadCount: 0,
      };

      res.json({
        success: true,
        data: notifications,
      });

    } catch (error) {
      safeLogger.error('Error getting tier upgrade notifications:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request parameters',
          details: error.errors,
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to get tier upgrade notifications',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  /**
   * Health check for automated tier upgrade service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const stats = await getAutomatedTierUpgradeService().getEvaluationStatistics();
      
      res.json({
        success: true,
        status: 'healthy',
        service: 'automated-tier-upgrade',
        timestamp: new Date().toISOString(),
        lastEvaluation: stats?.timestamp || null,
      });

    } catch (error) {
      safeLogger.error('Health check error:', error);
      
      res.status(503).json({
        success: false,
        status: 'unhealthy',
        service: 'automated-tier-upgrade',
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const automatedTierUpgradeController = new AutomatedTierUpgradeController();
export default automatedTierUpgradeController;
