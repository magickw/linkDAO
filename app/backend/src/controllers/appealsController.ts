import { Request, Response } from 'express';
import { appealsService, AppealSubmission, AppealStatusUpdate } from '../services/appealsService';
import { z } from 'zod';

// Request validation schemas
const AppealSubmissionRequestSchema = z.object({
  caseId: z.number().positive(),
  reasoning: z.string().min(50).max(2000),
  stakeAmount: z.string().regex(/^\d+(\.\d{1,8})?$/),
  evidenceUrls: z.array(z.string().url()).optional(),
  contactInfo: z.string().email().optional()
});

const AppealStatusUpdateRequestSchema = z.object({
  status: z.enum(['open', 'jury_selection', 'voting', 'decided', 'executed']),
  juryDecision: z.enum(['uphold', 'overturn', 'partial']).optional(),
  decisionCid: z.string().optional()
});

const PaginationSchema = z.object({
  page: z.number().min(1).default(1),
  limit: z.number().min(1).max(100).default(20)
});

export class AppealsController {
  /**
   * Submit a new appeal
   * POST /api/appeals
   */
  async submitAppeal(req: Request, res: Response): Promise<void> {
    try {
      // Get user ID from authenticated request
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate request body
      const validatedData = AppealSubmissionRequestSchema.parse(req.body);

      const submission: AppealSubmission = {
        ...validatedData,
        appellantId: userId
      };

      const result = await appealsService.submitAppeal(submission);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.status(201).json({
        success: true,
        appealId: result.appealId,
        message: 'Appeal submitted successfully'
      });
    } catch (error) {
      console.error('Error submitting appeal:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      } else {
        res.status(500).json({ error: 'Failed to submit appeal' });
      }
    }
  }

  /**
   * Get appeal details
   * GET /api/appeals/:appealId
   */
  async getAppeal(req: Request, res: Response): Promise<void> {
    try {
      const appealId = parseInt(req.params.appealId);
      if (isNaN(appealId)) {
        res.status(400).json({ error: 'Invalid appeal ID' });
        return;
      }

      const userId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      const appeal = await appealsService.getAppealCase(appealId);
      if (!appeal) {
        res.status(404).json({ error: 'Appeal not found' });
        return;
      }

      // Check access permissions
      const canAccess = 
        appeal.appellantId === userId || // Appeal owner
        userRole === 'moderator' ||     // Moderators
        userRole === 'admin';           // Admins

      if (!canAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      res.json(appeal);
    } catch (error) {
      console.error('Error getting appeal:', error);
      res.status(500).json({ error: 'Failed to get appeal' });
    }
  }

  /**
   * Get user's appeals
   * GET /api/appeals/user/:userId
   */
  async getUserAppeals(req: Request, res: Response): Promise<void> {
    try {
      const targetUserId = req.params.userId;
      const requestingUserId = (req as any).user?.id;
      const userRole = (req as any).user?.role;

      // Check access permissions
      const canAccess = 
        targetUserId === requestingUserId || // Own appeals
        userRole === 'moderator' ||         // Moderators
        userRole === 'admin';               // Admins

      if (!canAccess) {
        res.status(403).json({ error: 'Access denied' });
        return;
      }

      // Validate pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await appealsService.getUserAppeals(targetUserId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error getting user appeals:', error);
      res.status(500).json({ error: 'Failed to get user appeals' });
    }
  }

  /**
   * Get appeals by status (admin/moderator only)
   * GET /api/appeals/status/:status
   */
  async getAppealsByStatus(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Check admin/moderator permissions
      if (!['moderator', 'admin'].includes(userRole)) {
        res.status(403).json({ error: 'Moderator or admin access required' });
        return;
      }

      const status = req.params.status;
      const validStatuses = ['open', 'jury_selection', 'voting', 'decided', 'executed'];
      
      if (!validStatuses.includes(status)) {
        res.status(400).json({ error: 'Invalid status' });
        return;
      }

      // Validate pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await appealsService.getAppealsByStatus(status, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error getting appeals by status:', error);
      res.status(500).json({ error: 'Failed to get appeals by status' });
    }
  }

  /**
   * Update appeal status (admin/system only)
   * PUT /api/appeals/:appealId/status
   */
  async updateAppealStatus(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;
      const userId = (req as any).user?.id;

      // Check admin permissions
      if (userRole !== 'admin') {
        res.status(403).json({ error: 'Admin access required' });
        return;
      }

      const appealId = parseInt(req.params.appealId);
      if (isNaN(appealId)) {
        res.status(400).json({ error: 'Invalid appeal ID' });
        return;
      }

      // Validate request body
      const validatedData = AppealStatusUpdateRequestSchema.parse(req.body);

      const update: AppealStatusUpdate = {
        appealId,
        ...validatedData,
        executedBy: userId
      };

      const result = await appealsService.updateAppealStatus(update);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      res.json({
        success: true,
        message: 'Appeal status updated successfully'
      });
    } catch (error) {
      console.error('Error updating appeal status:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors 
        });
      } else {
        res.status(500).json({ error: 'Failed to update appeal status' });
      }
    }
  }

  /**
   * Get appeal statistics (admin/moderator only)
   * GET /api/appeals/stats
   */
  async getAppealStats(req: Request, res: Response): Promise<void> {
    try {
      const userRole = (req as any).user?.role;

      // Check admin/moderator permissions
      if (!['moderator', 'admin'].includes(userRole)) {
        res.status(403).json({ error: 'Moderator or admin access required' });
        return;
      }

      // Get appeals by status for statistics
      const statuses = ['open', 'jury_selection', 'voting', 'decided', 'executed'];
      const stats: any = {};

      for (const status of statuses) {
        const result = await appealsService.getAppealsByStatus(status, 1, 1);
        stats[status] = result.total;
      }

      // Calculate additional metrics
      const totalAppeals = Object.values(stats).reduce((sum: number, count: any) => sum + count, 0);
      const activeAppeals = stats.open + stats.jury_selection + stats.voting;
      const completedAppeals = stats.decided + stats.executed;

      res.json({
        byStatus: stats,
        summary: {
          total: totalAppeals,
          active: activeAppeals,
          completed: completedAppeals,
          completionRate: totalAppeals > 0 ? (completedAppeals / totalAppeals) * 100 : 0
        }
      });
    } catch (error) {
      console.error('Error getting appeal stats:', error);
      res.status(500).json({ error: 'Failed to get appeal statistics' });
    }
  }

  /**
   * Check if a case can be appealed
   * GET /api/appeals/check/:caseId
   */
  async checkAppealEligibility(req: Request, res: Response): Promise<void> {
    try {
      const caseId = parseInt(req.params.caseId);
      if (isNaN(caseId)) {
        res.status(400).json({ error: 'Invalid case ID' });
        return;
      }

      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // This would check case eligibility
      // For now, return a basic response
      res.json({
        canAppeal: true,
        requiredStake: '100',
        reason: 'Case is eligible for appeal'
      });
    } catch (error) {
      console.error('Error checking appeal eligibility:', error);
      res.status(500).json({ error: 'Failed to check appeal eligibility' });
    }
  }

  /**
   * Get my appeals (convenience endpoint)
   * GET /api/appeals/my
   */
  async getMyAppeals(req: Request, res: Response): Promise<void> {
    try {
      const userId = (req as any).user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      // Validate pagination parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const result = await appealsService.getUserAppeals(userId, page, limit);

      res.json(result);
    } catch (error) {
      console.error('Error getting my appeals:', error);
      res.status(500).json({ error: 'Failed to get appeals' });
    }
  }
}

export const appealsController = new AppealsController();