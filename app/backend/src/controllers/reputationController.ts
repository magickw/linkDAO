import { Request, Response } from 'express';
import { reputationService } from '../services/reputationService';
import { z } from 'zod';

// Validation schemas
const applyViolationSchema = z.object({
  userId: z.string().uuid(),
  caseId: z.number().int().positive(),
  violationType: z.string().min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical'])
});

const rewardReportSchema = z.object({
  userId: z.string().uuid(),
  reportId: z.number().int().positive(),
  accuracy: z.number().min(0).max(1)
});

const penalizeReportSchema = z.object({
  userId: z.string().uuid(),
  reportId: z.number().int().positive()
});

const restoreAppealSchema = z.object({
  userId: z.string().uuid(),
  appealId: z.number().int().positive(),
  originalPenalty: z.number().positive()
});

const updateJurorSchema = z.object({
  jurorId: z.string().uuid(),
  appealId: z.number().int().positive(),
  vote: z.enum(['uphold', 'overturn', 'partial']),
  wasMajority: z.boolean(),
  wasCorrect: z.boolean(),
  stakeAmount: z.number().positive(),
  responseTimeMinutes: z.number().int().positive()
});

export class ReputationController {
  /**
   * Get user's reputation score and details
   */
  async getUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const reputation = await reputationService.getUserReputation(userId);
      
      if (!reputation) {
        res.status(404).json({ error: 'User reputation not found' });
        return;
      }

      res.json({
        success: true,
        data: reputation
      });
    } catch (error) {
      console.error('Error getting user reputation:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Apply violation penalty to user
   */
  async applyViolationPenalty(req: Request, res: Response): Promise<void> {
    try {
      const validation = applyViolationSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors
        });
        return;
      }

      const { userId, caseId, violationType, severity } = validation.data;

      await reputationService.applyViolationPenalty(userId, caseId, violationType, severity);

      const updatedReputation = await reputationService.getUserReputation(userId);

      res.json({
        success: true,
        message: 'Violation penalty applied successfully',
        data: updatedReputation
      });
    } catch (error) {
      console.error('Error applying violation penalty:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reward user for helpful report
   */
  async rewardHelpfulReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = rewardReportSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors
        });
        return;
      }

      const { userId, reportId, accuracy } = validation.data;

      await reputationService.rewardHelpfulReport(userId, reportId, accuracy);

      const updatedReputation = await reputationService.getUserReputation(userId);

      res.json({
        success: true,
        message: 'Helpful report reward applied successfully',
        data: updatedReputation
      });
    } catch (error) {
      console.error('Error rewarding helpful report:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Penalize user for false report
   */
  async penalizeFalseReport(req: Request, res: Response): Promise<void> {
    try {
      const validation = penalizeReportSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors
        });
        return;
      }

      const { userId, reportId } = validation.data;

      await reputationService.penalizeFalseReport(userId, reportId);

      const updatedReputation = await reputationService.getUserReputation(userId);

      res.json({
        success: true,
        message: 'False report penalty applied successfully',
        data: updatedReputation
      });
    } catch (error) {
      console.error('Error penalizing false report:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Restore reputation for successful appeal
   */
  async restoreReputationForAppeal(req: Request, res: Response): Promise<void> {
    try {
      const validation = restoreAppealSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors
        });
        return;
      }

      const { userId, appealId, originalPenalty } = validation.data;

      await reputationService.restoreReputationForAppeal(userId, appealId, originalPenalty);

      const updatedReputation = await reputationService.getUserReputation(userId);

      res.json({
        success: true,
        message: 'Reputation restored for successful appeal',
        data: updatedReputation
      });
    } catch (error) {
      console.error('Error restoring reputation for appeal:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update juror performance
   */
  async updateJurorPerformance(req: Request, res: Response): Promise<void> {
    try {
      const validation = updateJurorSchema.safeParse(req.body);
      
      if (!validation.success) {
        res.status(400).json({ 
          error: 'Invalid request data',
          details: validation.error.errors
        });
        return;
      }

      const { jurorId, appealId, vote, wasMajority, wasCorrect, stakeAmount, responseTimeMinutes } = validation.data;

      await reputationService.updateJurorPerformance(
        jurorId, 
        appealId, 
        vote, 
        wasMajority, 
        wasCorrect, 
        stakeAmount, 
        responseTimeMinutes
      );

      const updatedReputation = await reputationService.getUserReputation(jurorId);

      res.json({
        success: true,
        message: 'Juror performance updated successfully',
        data: updatedReputation
      });
    } catch (error) {
      console.error('Error updating juror performance:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get moderation strictness for user
   */
  async getModerationStrictness(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const strictness = await reputationService.getModerationStrictness(userId);

      res.json({
        success: true,
        data: {
          userId,
          strictnessMultiplier: strictness
        }
      });
    } catch (error) {
      console.error('Error getting moderation strictness:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if user is eligible for jury duty
   */
  async checkJuryEligibility(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const isEligible = await reputationService.isEligibleForJury(userId);

      res.json({
        success: true,
        data: {
          userId,
          isEligible
        }
      });
    } catch (error) {
      console.error('Error checking jury eligibility:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get active penalties for user
   */
  async getActivePenalties(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const penalties = await reputationService.getActivePenalties(userId);

      res.json({
        success: true,
        data: {
          userId,
          penalties
        }
      });
    } catch (error) {
      console.error('Error getting active penalties:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get reporting weight for user
   */
  async getReportingWeight(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const reputation = await reputationService.getUserReputation(userId);
      
      if (!reputation) {
        res.status(404).json({ error: 'User reputation not found' });
        return;
      }

      const weight = reputationService.getReportingWeight(reputation.reportingScore);

      res.json({
        success: true,
        data: {
          userId,
          reportingScore: reputation.reportingScore,
          reportingWeight: weight
        }
      });
    } catch (error) {
      console.error('Error getting reporting weight:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Initialize reputation for new user
   */
  async initializeUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.body;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      await reputationService.initializeUserReputation(userId);
      const reputation = await reputationService.getUserReputation(userId);

      res.json({
        success: true,
        message: 'User reputation initialized successfully',
        data: reputation
      });
    } catch (error) {
      console.error('Error initializing user reputation:', error);
      res.status(500).json({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

export const reputationController = new ReputationController();