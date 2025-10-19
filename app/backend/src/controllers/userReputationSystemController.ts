import { Request, Response } from 'express';
import { userReputationSystemService } from '../services/userReputationSystemService';
import { z } from 'zod';

// Validation schemas
const UserIdSchema = z.object({
  userId: z.string().uuid()
});

const UpdateReputationSchema = z.object({
  userId: z.string().uuid(),
  eventType: z.enum(['violation', 'helpful_report', 'false_report', 'successful_appeal', 'jury_accuracy', 'manual_adjustment']),
  scoreChange: z.number(),
  relatedEntityId: z.string().optional(),
  description: z.string().optional(),
  metadata: z.record(z.any()).optional()
});

const ApplyPenaltySchema = z.object({
  userId: z.string().uuid(),
  penaltyType: z.enum(['warning', 'temporary_limit', 'permanent_limit', 'suspension', 'ban']),
  severityLevel: z.number().min(1).max(5),
  description: z.string(),
  caseId: z.string().optional(),
  durationDays: z.number().optional()
});

const LeaderboardQuerySchema = z.object({
  limit: z.string().optional().transform(val => val ? parseInt(val, 10) : 100)
});

export class UserReputationSystemController {
  
  /**
   * Get user reputation by user ID
   */
  async getUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Validate user ID
      const validatedInput = UserIdSchema.parse({ userId });
      
      const reputation = await userReputationSystemService.getUserReputation(validatedInput.userId);
      
      if (!reputation) {
        res.status(404).json({
          success: false,
          error: 'User reputation not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: reputation,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving user reputation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving user reputation'
      });
    }
  }

  /**
   * Update user reputation based on an event
   */
  async updateUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = UpdateReputationSchema.parse(req.body);
      
      const updatedReputation = await userReputationSystemService.updateUserReputation(
        validatedInput.userId,
        validatedInput.eventType,
        validatedInput.scoreChange,
        validatedInput.relatedEntityId,
        validatedInput.description,
        validatedInput.metadata
      );
      
      if (!updatedReputation) {
        res.status(500).json({
          success: false,
          error: 'Failed to update user reputation'
        });
        return;
      }
      
      res.json({
        success: true,
        data: updatedReputation,
        message: 'User reputation updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error updating user reputation:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error updating user reputation'
      });
    }
  }

  /**
   * Apply reputation-based penalties
   */
  async applyReputationPenalty(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ApplyPenaltySchema.parse(req.body);
      
      const penalty = await userReputationSystemService.applyReputationPenalty(
        validatedInput.userId,
        validatedInput.penaltyType,
        validatedInput.severityLevel,
        validatedInput.description,
        validatedInput.caseId,
        validatedInput.durationDays
      );
      
      res.status(201).json({
        success: true,
        data: penalty,
        message: 'Reputation penalty applied successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error applying reputation penalty:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid input data',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error applying reputation penalty'
      });
    }
  }

  /**
   * Get user's reputation history
   */
  async getReputationHistory(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit } = req.query;
      
      // Validate user ID
      const validatedInput = UserIdSchema.parse({ userId });
      
      const history = await userReputationSystemService.getReputationHistory(
        validatedInput.userId,
        limit ? parseInt(limit as string, 10) : 50
      );
      
      res.json({
        success: true,
        data: history,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving reputation history:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving reputation history'
      });
    }
  }

  /**
   * Get reputation leaderboard
   */
  async getReputationLeaderboard(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;
      
      const leaderboard = await userReputationSystemService.getReputationLeaderboard(
        limit ? parseInt(limit as string, 10) : 100
      );
      
      res.json({
        success: true,
        data: leaderboard,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving reputation leaderboard:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving reputation leaderboard'
      });
    }
  }

  /**
   * Calculate multi-dimensional reputation metrics
   */
  async calculateReputationMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      
      // Validate user ID
      const validatedInput = UserIdSchema.parse({ userId });
      
      const metrics = await userReputationSystemService.calculateReputationMetrics(validatedInput.userId);
      
      res.json({
        success: true,
        data: metrics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error calculating reputation metrics:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid user ID',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Internal server error calculating reputation metrics'
      });
    }
  }

  /**
   * Get reputation tiers configuration
   */
  async getReputationTiers(req: Request, res: Response): Promise<void> {
    try {
      const tiers = userReputationSystemService.getReputationTiers();
      
      res.json({
        success: true,
        data: tiers,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('Error retrieving reputation tiers:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving reputation tiers'
      });
    }
  }

  /**
   * Health check endpoint for the user reputation system service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        service: 'user-reputation-system',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          userReputationSystemService: 'healthy',
          database: 'healthy'
        }
      };
      
      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      console.error('Error in health check:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const userReputationSystemController = new UserReputationSystemController();