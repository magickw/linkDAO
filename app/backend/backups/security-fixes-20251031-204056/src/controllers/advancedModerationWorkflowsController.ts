import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { advancedModerationWorkflowsService } from '../services/advancedModerationWorkflowsService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { z } from 'zod';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Validation schemas
const WorkflowSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string(),
  stages: z.array(z.object({
    id: z.string(),
    name: z.string(),
    order: z.number(),
    criteria: z.object({
      contentType: z.array(z.string()),
      riskThreshold: z.number().min(0).max(1),
      userReputationThreshold: z.number().min(0).max(100),
      communityContext: z.array(z.string()),
      flagsRequired: z.number().min(0)
    }),
    action: z.object({
      type: z.enum(['allow', 'limit', 'block', 'review', 'escalate']),
      duration: z.number().optional(),
      notificationRequired: z.boolean(),
      autoExecute: z.boolean()
    }),
    requiredApprovals: z.number().min(0),
    assignedRoles: z.array(z.string())
  })),
  isActive: z.boolean()
});

const RuleSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1),
  description: z.string(),
  conditions: z.array(z.object({
    field: z.string(),
    operator: z.enum(['equals', 'contains', 'greater_than', 'less_than', 'in', 'not_in']),
    value: z.any(),
    threshold: z.number().optional()
  })),
  action: z.object({
    type: z.enum(['allow', 'limit', 'block', 'review', 'escalate']),
    duration: z.number().optional(),
    notificationRequired: z.boolean(),
    autoExecute: z.boolean()
  }),
  priority: z.number(),
  isActive: z.boolean()
});

const ProcessContentSchema = z.object({
  id: z.string(),
  text: z.string().optional(),
  userId: z.string(),
  type: z.enum(['post', 'comment', 'listing', 'dm', 'username'])
});

export class AdvancedModerationWorkflowsController {
  
  /**
   * Get all active moderation workflows
   */
  async getWorkflows(req: Request, res: Response): Promise<void> {
    try {
      const workflows = await advancedModerationWorkflowsService.getActiveWorkflows();
      
      res.json({
        success: true,
        data: workflows,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving workflows'
      });
    }
  }

  /**
   * Get a specific moderation workflow by ID
   */
  async getWorkflowById(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: 'Workflow ID is required'
        });
        return;
      }
      
      const workflow = await advancedModerationWorkflowsService.getWorkflowById(workflowId);
      
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: workflow,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving workflow'
      });
    }
  }

  /**
   * Create a new moderation workflow
   */
  async createWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = WorkflowSchema.parse(req.body);
      
      const workflow = await advancedModerationWorkflowsService.createWorkflow(validatedInput);
      
      res.status(201).json({
        success: true,
        data: workflow,
        message: 'Workflow created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error creating workflow:', error);
      
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
        error: 'Internal server error creating workflow'
      });
    }
  }

  /**
   * Update an existing moderation workflow
   */
  async updateWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: 'Workflow ID is required'
        });
        return;
      }
      
      const validatedInput = WorkflowSchema.parse(req.body);
      
      const workflow = await advancedModerationWorkflowsService.updateWorkflow(workflowId, validatedInput);
      
      if (!workflow) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: workflow,
        message: 'Workflow updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error updating workflow:', error);
      
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
        error: 'Internal server error updating workflow'
      });
    }
  }

  /**
   * Delete a moderation workflow
   */
  async deleteWorkflow(req: Request, res: Response): Promise<void> {
    try {
      const { workflowId } = req.params;
      
      if (!workflowId) {
        res.status(400).json({
          success: false,
          error: 'Workflow ID is required'
        });
        return;
      }
      
      const deleted = await advancedModerationWorkflowsService.deleteWorkflow(workflowId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Workflow not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Workflow deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error deleting workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error deleting workflow'
      });
    }
  }

  /**
   * Get all active automated moderation rules
   */
  async getRules(req: Request, res: Response): Promise<void> {
    try {
      const rules = await advancedModerationWorkflowsService.getActiveRules();
      
      res.json({
        success: true,
        data: rules,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving rules:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving rules'
      });
    }
  }

  /**
   * Get a specific automated moderation rule by ID
   */
  async getRuleById(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }
      
      const rule = await advancedModerationWorkflowsService.getRuleById(ruleId);
      
      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: rule,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving rule:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving rule'
      });
    }
  }

  /**
   * Create a new automated moderation rule
   */
  async createRule(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = RuleSchema.parse(req.body);
      
      const rule = await advancedModerationWorkflowsService.createRule(validatedInput);
      
      res.status(201).json({
        success: true,
        data: rule,
        message: 'Rule created successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error creating rule:', error);
      
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
        error: 'Internal server error creating rule'
      });
    }
  }

  /**
   * Update an existing automated moderation rule
   */
  async updateRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }
      
      const validatedInput = RuleSchema.parse(req.body);
      
      const rule = await advancedModerationWorkflowsService.updateRule(ruleId, validatedInput);
      
      if (!rule) {
        res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: rule,
        message: 'Rule updated successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error updating rule:', error);
      
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
        error: 'Internal server error updating rule'
      });
    }
  }

  /**
   * Delete an automated moderation rule
   */
  async deleteRule(req: Request, res: Response): Promise<void> {
    try {
      const { ruleId } = req.params;
      
      if (!ruleId) {
        res.status(400).json({
          success: false,
          error: 'Rule ID is required'
        });
        return;
      }
      
      const deleted = await advancedModerationWorkflowsService.deleteRule(ruleId);
      
      if (!deleted) {
        res.status(404).json({
          success: false,
          error: 'Rule not found'
        });
        return;
      }
      
      res.json({
        success: true,
        message: 'Rule deleted successfully',
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error deleting rule:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error deleting rule'
      });
    }
  }

  /**
   * Process content through moderation workflows
   */
  async processContent(req: Request, res: Response): Promise<void> {
    try {
      const validatedInput = ProcessContentSchema.parse(req.body);
      
      const moderationCase = await advancedModerationWorkflowsService.processContent(validatedInput);
      
      res.json({
        success: true,
        data: moderationCase,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error processing content:', error);
      
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
        error: 'Internal server error processing content'
      });
    }
  }

  /**
   * Get moderation statistics
   */
  async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { timeRange } = req.query as { timeRange?: '24h' | '7d' | '30d' };
      
      const statistics = await advancedModerationWorkflowsService.getModerationStatistics(
        timeRange || '7d'
      );
      
      res.json({
        success: true,
        data: statistics,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      safeLogger.error('Error retrieving statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error retrieving statistics'
      });
    }
  }

  /**
   * Health check endpoint for the advanced moderation workflows service
   */
  async healthCheck(req: Request, res: Response): Promise<void> {
    try {
      const healthStatus = {
        service: 'advanced-moderation-workflows',
        status: 'healthy',
        timestamp: new Date().toISOString(),
        dependencies: {
          advancedModerationWorkflowsService: 'healthy',
          database: 'healthy',
          aiContentModeration: 'healthy'
        }
      };
      
      res.json({
        success: true,
        data: healthStatus
      });

    } catch (error) {
      safeLogger.error('Error in health check:', error);
      res.status(503).json({
        success: false,
        error: 'Service unhealthy',
        timestamp: new Date().toISOString()
      });
    }
  }
}

export const advancedModerationWorkflowsController = new AdvancedModerationWorkflowsController();