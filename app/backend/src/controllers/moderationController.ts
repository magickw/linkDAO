import { Request, Response } from 'express';
import { moderatorAuthService, ModeratorProfile } from '../services/moderatorAuthService';
import { reviewQueueService, QueueFilters, QueueSortOptions } from '../services/reviewQueueService';
import { moderatorDecisionService, DecisionRequest, BulkDecisionRequest } from '../services/moderatorDecisionService';
import { moderatorActivityService } from '../services/moderatorActivityService';
import { z } from 'zod';

// Request validation schemas
const QueueFiltersSchema = z.object({
  status: z.array(z.string()).optional(),
  contentType: z.array(z.string()).optional(),
  severity: z.array(z.string()).optional(),
  reportCount: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  confidence: z.object({
    min: z.number().min(0).max(1).optional(),
    max: z.number().min(0).max(1).optional()
  }).optional(),
  ageHours: z.object({
    min: z.number().optional(),
    max: z.number().optional()
  }).optional(),
  assignedTo: z.string().optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

const QueueSortSchema = z.object({
  field: z.enum(['created_at', 'risk_score', 'confidence', 'report_count', 'priority_score']).default('created_at'),
  direction: z.enum(['asc', 'desc']).default('desc')
});

const DecisionRequestSchema = z.object({
  caseId: z.number(),
  decision: z.enum(['allow', 'limit', 'block', 'review']),
  reasonCode: z.string().min(1).max(48),
  rationale: z.string().min(10).max(1000),
  templateId: z.string().optional(),
  customDuration: z.number().min(0).optional(),
  escalate: z.boolean().optional(),
  notifyUser: z.boolean().optional(),
  additionalEvidence: z.object({
    screenshots: z.array(z.string()).optional(),
    notes: z.string().optional(),
    externalReferences: z.array(z.string()).optional()
  }).optional()
});

const BulkDecisionRequestSchema = z.object({
  caseIds: z.array(z.number()).min(1).max(50),
  decision: z.enum(['allow', 'limit', 'block', 'review']),
  reasonCode: z.string().min(1).max(48),
  rationale: z.string().min(10).max(1000),
  templateId: z.string().optional()
});

export class ModerationController {
  /**
   * Get moderator profile and permissions
   */
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Get performance metrics for last 30 days
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 30);
      
      const metrics = await moderatorActivityService.getPerformanceMetrics(
        moderator.id,
        startDate,
        endDate
      );

      res.json({
        profile: moderator,
        metrics,
        permissions: moderator.permissions
      });
    } catch (error) {
      console.error('Error getting moderator profile:', error);
      res.status(500).json({ error: 'Failed to get profile' });
    }
  }

  /**
   * Get review queue with filtering and pagination
   */
  async getReviewQueue(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Validate query parameters
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
      
      const filters: QueueFilters = QueueFiltersSchema.parse(req.query.filters || {});
      const sort: QueueSortOptions = QueueSortSchema.parse(req.query.sort || {});

      const result = await reviewQueueService.getQueue(
        moderator,
        page,
        limit,
        filters,
        sort
      );

      res.json(result);
    } catch (error) {
      console.error('Error getting review queue:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid query parameters', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to get review queue' });
      }
    }
  }

  /**
   * Get next case for moderator
   */
  async getNextCase(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      const nextCase = await reviewQueueService.getNextCase(moderator);
      
      if (!nextCase) {
        res.status(204).json({ message: 'No cases available' });
        return;
      }

      // Log case assignment
      await moderatorActivityService.logActivity(
        moderator.id,
        'case_assigned',
        { caseId: nextCase.case.id },
        req.sessionID,
        req.ip,
        req.get('User-Agent')
      );

      res.json(nextCase);
    } catch (error) {
      console.error('Error getting next case:', error);
      res.status(500).json({ error: 'Failed to get next case' });
    }
  }

  /**
   * Assign specific case to moderator
   */
  async assignCase(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      const caseId = parseInt(req.params.caseId);

      if (isNaN(caseId)) {
        res.status(400).json({ error: 'Invalid case ID' });
        return;
      }

      const assigned = await reviewQueueService.assignCase(caseId, moderator.id);
      
      if (!assigned) {
        res.status(409).json({ error: 'Case already assigned or not available' });
        return;
      }

      await moderatorActivityService.logActivity(
        moderator.id,
        'case_assigned',
        { caseId },
        req.sessionID,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ success: true, message: 'Case assigned successfully' });
    } catch (error) {
      console.error('Error assigning case:', error);
      res.status(500).json({ error: 'Failed to assign case' });
    }
  }

  /**
   * Release case assignment
   */
  async releaseCase(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      const caseId = parseInt(req.params.caseId);

      if (isNaN(caseId)) {
        res.status(400).json({ error: 'Invalid case ID' });
        return;
      }

      const released = await reviewQueueService.releaseCase(caseId, moderator.id);
      
      if (!released) {
        res.status(404).json({ error: 'Case not found or not assigned to you' });
        return;
      }

      await moderatorActivityService.logActivity(
        moderator.id,
        'case_released',
        { caseId },
        req.sessionID,
        req.ip,
        req.get('User-Agent')
      );

      res.json({ success: true, message: 'Case released successfully' });
    } catch (error) {
      console.error('Error releasing case:', error);
      res.status(500).json({ error: 'Failed to release case' });
    }
  }

  /**
   * Make moderation decision
   */
  async makeDecision(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Validate request body
      const decisionRequest = DecisionRequestSchema.parse(req.body);

      // Track decision start time
      await moderatorActivityService.trackCaseReviewStart(
        moderator.id,
        decisionRequest.caseId,
        req.sessionID
      );

      // Process the decision
      const result = await moderatorDecisionService.processDecision(moderator, decisionRequest);

      if (!result.success) {
        res.status(400).json({ error: result.error });
        return;
      }

      // Track decision completion
      await moderatorActivityService.trackCaseReviewComplete(
        moderator.id,
        decisionRequest.caseId,
        decisionRequest.decision,
        req.sessionID
      );

      res.json({
        success: true,
        actionId: result.actionId,
        evidenceCid: result.evidenceCid,
        reputationChange: result.reputationChange
      });
    } catch (error) {
      console.error('Error making decision:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to process decision' });
      }
    }
  }

  /**
   * Process bulk decisions
   */
  async makeBulkDecisions(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Check bulk action permission
      if (!moderator.permissions.canAccessBulkActions) {
        res.status(403).json({ error: 'Bulk actions not permitted' });
        return;
      }

      // Validate request body
      const bulkRequest = BulkDecisionRequestSchema.parse(req.body);

      // Process bulk decisions
      const result = await moderatorDecisionService.processBulkDecisions(moderator, bulkRequest);

      await moderatorActivityService.logActivity(
        moderator.id,
        'bulk_decisions',
        {
          totalCases: bulkRequest.caseIds.length,
          successful: result.successful.length,
          failed: result.failed.length,
          decision: bulkRequest.decision
        },
        req.sessionID,
        req.ip,
        req.get('User-Agent')
      );

      res.json(result);
    } catch (error) {
      console.error('Error making bulk decisions:', error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: 'Invalid request data', details: error.errors });
      } else {
        res.status(500).json({ error: 'Failed to process bulk decisions' });
      }
    }
  }

  /**
   * Get policy templates
   */
  async getPolicyTemplates(req: Request, res: Response): Promise<void> {
    try {
      const contentType = req.query.contentType as string;
      const severity = req.query.severity as string;

      const templates = await moderatorDecisionService.getPolicyTemplates(contentType, severity);
      
      res.json(templates);
    } catch (error) {
      console.error('Error getting policy templates:', error);
      res.status(500).json({ error: 'Failed to get policy templates' });
    }
  }

  /**
   * Get moderator decision history
   */
  async getDecisionHistory(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      const page = parseInt(req.query.page as string) || 1;
      const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);

      const history = await moderatorDecisionService.getDecisionHistory(
        moderator.id,
        page,
        limit
      );

      res.json(history);
    } catch (error) {
      console.error('Error getting decision history:', error);
      res.status(500).json({ error: 'Failed to get decision history' });
    }
  }

  /**
   * Get performance dashboard
   */
  async getPerformanceDashboard(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      const dashboard = await moderatorActivityService.getRealTimeDashboard(moderator.id);
      
      res.json(dashboard);
    } catch (error) {
      console.error('Error getting performance dashboard:', error);
      res.status(500).json({ error: 'Failed to get dashboard data' });
    }
  }

  /**
   * Generate performance report
   */
  async getPerformanceReport(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Parse date range from query parameters
      const startDate = req.query.startDate 
        ? new Date(req.query.startDate as string)
        : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // Default: 30 days ago
      
      const endDate = req.query.endDate 
        ? new Date(req.query.endDate as string)
        : new Date(); // Default: now

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        res.status(400).json({ error: 'Invalid date format' });
        return;
      }

      const report = await moderatorActivityService.generatePerformanceReport(
        moderator.id,
        startDate,
        endDate
      );

      res.json(report);
    } catch (error) {
      console.error('Error generating performance report:', error);
      res.status(500).json({ error: 'Failed to generate report' });
    }
  }

  /**
   * Start moderator session
   */
  async startSession(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      await moderatorActivityService.startSession(moderator.id, req.sessionID);
      
      res.json({ success: true, sessionId: req.sessionID });
    } catch (error) {
      console.error('Error starting session:', error);
      res.status(500).json({ error: 'Failed to start session' });
    }
  }

  /**
   * End moderator session
   */
  async endSession(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      await moderatorActivityService.endSession(moderator.id, req.sessionID);
      
      res.json({ success: true });
    } catch (error) {
      console.error('Error ending session:', error);
      res.status(500).json({ error: 'Failed to end session' });
    }
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Get basic queue with no items to get stats only
      const result = await reviewQueueService.getQueue(moderator, 1, 1);
      
      res.json(result.stats);
    } catch (error) {
      console.error('Error getting queue stats:', error);
      res.status(500).json({ error: 'Failed to get queue statistics' });
    }
  }

  /**
   * Health check for moderator interface
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const moderator = (req as any).moderator as ModeratorProfile;
      
      // Check daily limits
      const dailyLimit = await moderatorAuthService.checkDailyLimit(moderator.id);
      
      res.json({
        status: 'healthy',
        moderatorId: moderator.id,
        permissions: moderator.permissions,
        dailyLimit,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error in health check:', error);
      res.status(500).json({ error: 'Health check failed' });
    }
  }
}

export const moderationController = new ModerationController();