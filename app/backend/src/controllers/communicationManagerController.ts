import { Request, Response } from 'express';
import { communicationManagerService } from '../services/communicationManagerService';
import { safeLogger } from '../utils/safeLogger';
import { z } from 'zod';

// Validation schemas
const dateRangeSchema = z.object({
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined)
});

const communicationLogSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid(),
  senderAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  recipientAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/i),
  contentPreview: z.string().max(1000),
  messageType: z.string(),
  metadata: z.any().optional()
});

const escalationTriggerSchema = z.object({
  conversationId: z.string().uuid(),
  messageId: z.string().uuid().optional(),
  triggerType: z.enum(['high_volume', 'negative_sentiment', 'keywords', 'manual', 'timeout']),
  thresholdValue: z.number().optional(),
  currentValue: z.number().optional(),
  notes: z.string().optional()
});

const resolveEscalationSchema = z.object({
  escalationId: z.string().uuid(),
  resolutionNotes: z.string().min(1),
  resolvedBy: z.string().optional()
});

export class CommunicationManagerController {
  constructor() {
    // Bind all methods to ensure 'this' context is preserved
    this.logCommunication = this.logCommunication.bind(this);
    this.getCommunicationLogs = this.getCommunicationLogs.bind(this);
    this.createEscalationTrigger = this.createEscalationTrigger.bind(this);
    this.resolveEscalation = this.resolveEscalation.bind(this);
    this.getEscalationTriggers = this.getEscalationTriggers.bind(this);
    this.routeEscalation = this.routeEscalation.bind(this);
    this.preserveEscalationContext = this.preserveEscalationContext.bind(this);
    this.getCommunicationPatterns = this.getCommunicationPatterns.bind(this);
    this.getCommunicationAnalytics = this.getCommunicationAnalytics.bind(this);
  }

  /**
   * Log communication for audit trail
   */
  async logCommunication(req: Request, res: Response): Promise<void> {
    try {
      const parsed = communicationLogSchema.parse(req.body);
      const communicationData = {
        conversationId: parsed.conversationId,
        messageId: parsed.messageId,
        senderAddress: parsed.senderAddress,
        recipientAddress: parsed.recipientAddress,
        contentPreview: parsed.contentPreview,
        messageType: parsed.messageType,
        metadata: parsed.metadata
      };

      const logEntry = await communicationManagerService.logCommunication(communicationData);

      res.status(201).json({
        success: true,
        data: logEntry,
        message: 'Communication logged successfully'
      });
    } catch (error) {
      safeLogger.error('Error logging communication:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to log communication',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get communication logs
   */
  async getCommunicationLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userAddress, conversationId, messageType } = req.query;
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const logs = await communicationManagerService.getCommunicationLogs({
        userAddress: userAddress as string,
        conversationId: conversationId as string,
        messageType: messageType as string,
        startDate,
        endDate
      });

      res.json({
        success: true,
        data: logs,
        count: logs.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting communication logs:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve communication logs',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create escalation trigger
   */
  async createEscalationTrigger(req: Request, res: Response): Promise<void> {
    try {
      const parsed = escalationTriggerSchema.parse(req.body);
      const triggerData = {
        conversationId: parsed.conversationId,
        messageId: parsed.messageId,
        triggerType: parsed.triggerType,
        thresholdValue: parsed.thresholdValue,
        currentValue: parsed.currentValue,
        notes: parsed.notes
      };

      const trigger = await communicationManagerService.createEscalationTrigger(triggerData);

      res.status(201).json({
        success: true,
        data: trigger,
        message: 'Escalation trigger created successfully'
      });
    } catch (error) {
      safeLogger.error('Error creating escalation trigger:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to create escalation trigger',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resolve escalation
   */
  async resolveEscalation(req: Request, res: Response): Promise<void> {
    try {
      const { escalationId } = req.params;
      const resolutionData = resolveEscalationSchema.parse({
        escalationId,
        ...req.body
      });

      const success = await communicationManagerService.resolveEscalation(
        resolutionData.escalationId,
        resolutionData.resolutionNotes,
        resolutionData.resolvedBy
      );

      if (success) {
        res.json({
          success: true,
          message: 'Escalation resolved successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to resolve escalation'
        });
      }
    } catch (error) {
      safeLogger.error('Error resolving escalation:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to resolve escalation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get escalation triggers
   */
  async getEscalationTriggers(req: Request, res: Response): Promise<void> {
    try {
      const { conversationId, resolved, triggerType } = req.query;

      const triggers = await communicationManagerService.getEscalationTriggers({
        conversationId: conversationId as string,
        resolved: resolved ? resolved === 'true' : undefined,
        triggerType: triggerType as string
      });

      res.json({
        success: true,
        data: triggers,
        count: triggers.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting escalation triggers:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to retrieve escalation triggers',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Route escalation to team
   */
  async routeEscalation(req: Request, res: Response): Promise<void> {
    try {
      const { escalationId } = req.params;
      const { teamRoutingRules } = req.body;

      // First get the escalation trigger
      const triggers = await communicationManagerService.getEscalationTriggers({
        conversationId: escalationId // Using conversationId as a placeholder
      });

      if (triggers.length === 0) {
        res.status(404).json({
          success: false,
          error: 'Escalation trigger not found'
        });
        return;
      }

      const assignedTeam = await communicationManagerService.routeEscalation(
        triggers[0],
        teamRoutingRules
      );

      res.json({
        success: true,
        data: {
          escalationId,
          assignedTeam
        },
        message: 'Escalation routed successfully'
      });
    } catch (error) {
      safeLogger.error('Error routing escalation:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to route escalation',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Preserve escalation context
   */
  async preserveEscalationContext(req: Request, res: Response): Promise<void> {
    try {
      const { escalationId } = req.params;
      const { contextData } = req.body;

      const success = await communicationManagerService.preserveEscalationContext(
        escalationId,
        contextData
      );

      if (success) {
        res.json({
          success: true,
          message: 'Escalation context preserved successfully'
        });
      } else {
        res.status(500).json({
          success: false,
          error: 'Failed to preserve escalation context'
        });
      }
    } catch (error) {
      safeLogger.error('Error preserving escalation context:', error);

      res.status(500).json({
        success: false,
        error: 'Failed to preserve escalation context',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get communication patterns
   */
  async getCommunicationPatterns(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const patterns = await communicationManagerService.detectCommunicationPatterns(startDate, endDate);

      res.json({
        success: true,
        data: patterns,
        count: patterns.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error detecting communication patterns:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to detect communication patterns',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get communication analytics
   */
  async getCommunicationAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = dateRangeSchema.parse(req.query);

      const analytics = await communicationManagerService.generateCommunicationAnalytics(startDate, endDate);

      res.json({
        success: true,
        data: analytics,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating communication analytics:', error);

      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid request data',
          details: error.errors
        });
        return;
      }

      res.status(500).json({
        success: false,
        error: 'Failed to generate communication analytics',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance with error handling
let _controllerInstance: CommunicationManagerController;

try {
  _controllerInstance = new CommunicationManagerController();
} catch (error) {
  safeLogger.error('Failed to initialize CommunicationManagerController:', error);
  // Create a fallback controller with stub methods that return errors
  _controllerInstance = {
    logCommunication: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    getCommunicationLogs: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    createEscalationTrigger: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    resolveEscalation: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    getEscalationTriggers: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    routeEscalation: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    preserveEscalationContext: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    getCommunicationPatterns: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    },
    getCommunicationAnalytics: async (req: Request, res: Response) => {
      res.status(503).json({
        success: false,
        error: 'Communication manager service unavailable',
        message: 'Controller initialization failed'
      });
    }
  } as any;
}

export const communicationManagerController = _controllerInstance;