import { Request, Response } from 'express';
import { securityAuditService, SecurityAuditEvent, SecurityIncident, TamperDetectionRecord } from '../services/securityAuditService';
import { safeLogger } from '../utils/safeLogger';
import { z } from 'zod';

// Validation schemas
const auditEventSchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  ipAddress: z.string(),
  userAgent: z.string().optional(),
  actionType: z.string(),
  resourceType: z.string(),
  resourceId: z.string().optional(),
  actionCategory: z.enum(['read', 'write', 'approve', 'reject', 'export', 'configure']),
  beforeState: z.any().optional(),
  afterState: z.any().optional(),
  changes: z.record(z.any()).optional(),
  reason: z.string().optional(),
  justification: z.string().optional(),
  riskScore: z.number().min(0).max(10),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  outcome: z.enum(['success', 'failure', 'partial']),
  complianceFlags: z.array(z.string()),
  requiresApproval: z.boolean().optional(),
  approvedBy: z.string().optional(),
  approvedAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

const auditQuerySchema = z.object({
  userId: z.string().optional(),
  sessionId: z.string().optional(),
  actionType: z.string().optional(),
  resourceType: z.string().optional(),
  resourceId: z.string().optional(),
  startDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  endDate: z.string().optional().transform(val => val ? new Date(val) : undefined),
  severity: z.string().optional(),
  outcome: z.string().optional(),
  limit: z.number().optional(),
  offset: z.number().optional(),
  orderBy: z.enum(['timestamp', 'riskScore', 'severity']).optional(),
  sortOrder: z.enum(['asc', 'desc']).optional()
});

const incidentReportSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  category: z.string(),
  title: z.string(),
  description: z.string(),
  affectedSystems: z.array(z.string()),
  indicators: z.array(z.string())
});

const tamperDetectionSchema = z.object({
  resourceType: z.string(),
  resourceId: z.string(),
  expectedHash: z.string(),
  actualHash: z.string(),
  detectedBy: z.string(),
  discrepancy: z.string()
});

const tamperResolutionSchema = z.object({
  recordId: z.string(),
  resolutionNotes: z.string(),
  resolvedBy: z.string()
});

export class SecurityAuditController {
  /**
   * Initialize the security audit service
   */
  async initializeService(req: Request, res: Response): Promise<void> {
    try {
      await securityAuditService.initialize();
      
      res.json({
        success: true,
        message: 'Security audit service initialized successfully'
      });
    } catch (error) {
      safeLogger.error('Error initializing security audit service:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to initialize security audit service',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log a security event manually
   */
  async logSecurityEvent(req: Request, res: Response): Promise<void> {
    try {
      const eventData = auditEventSchema.parse(req.body);
      
      const eventId = await securityAuditService.logSecurityEvent(eventData);
      
      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging security event:', error);
      
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
        error: 'Failed to log security event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log authentication event
   */
  async logAuthenticationEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action, outcome, details = {} } = req.body;
      
      if (!userId || !action || !outcome) {
        res.status(400).json({
          success: false,
          error: 'userId, action, and outcome are required'
        });
        return;
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      const eventId = await securityAuditService.logAuthenticationEvent(
        userId,
        action,
        outcome,
        ipAddress,
        details,
        userAgent
      );
      
      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging authentication event:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to log authentication event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log data access event
   */
  async logDataAccessEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, resource, action, outcome, details = {} } = req.body;
      
      if (!userId || !resource || !action || !outcome) {
        res.status(400).json({
          success: false,
          error: 'userId, resource, action, and outcome are required'
        });
        return;
      }
      
      const eventId = await securityAuditService.logDataAccessEvent(
        userId,
        resource,
        action,
        outcome,
        details
      );
      
      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging data access event:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to log data access event',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log admin action
   */
  async logAdminAction(req: Request, res: Response): Promise<void> {
    try {
      const { adminUserId, action, targetResource, outcome, details = {} } = req.body;
      
      if (!adminUserId || !action || !targetResource || !outcome) {
        res.status(400).json({
          success: false,
          error: 'adminUserId, action, targetResource, and outcome are required'
        });
        return;
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      const eventId = await securityAuditService.logAdminAction(
        adminUserId,
        action,
        targetResource,
        outcome,
        ipAddress,
        details
      );
      
      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging admin action:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to log admin action',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Log security incident
   */
  async logSecurityIncident(req: Request, res: Response): Promise<void> {
    try {
      const { incidentType, severity, details, threatIndicators = [] } = req.body;
      
      if (!incidentType || !severity || !details) {
        res.status(400).json({
          success: false,
          error: 'incidentType, severity, and details are required'
        });
        return;
      }
      
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      const eventId = await securityAuditService.logSecurityIncident(
        incidentType,
        severity,
        ipAddress,
        details,
        threatIndicators
      );
      
      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging security incident:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to log security incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Query audit events
   */
  async queryAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const queryData = auditQuerySchema.parse(req.query);
      
      const events = await securityAuditService.queryAuditEvents(queryData);
      
      res.json({
        success: true,
        data: events,
        count: events.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error querying audit events:', error);
      
      if (error instanceof z.ZodError) {
        res.status(400).json({
          success: false,
          error: 'Invalid query parameters',
          details: error.errors
        });
        return;
      }
      
      res.status(500).json({
        success: false,
        error: 'Failed to query audit events',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Report a security incident
   */
  async reportIncident(req: Request, res: Response): Promise<void> {
    try {
      const incidentData = incidentReportSchema.parse(req.body);
      
      const incident = await securityAuditService.reportIncident(
        incidentData.severity,
        incidentData.category,
        incidentData.title,
        incidentData.description,
        incidentData.affectedSystems,
        incidentData.indicators
      );
      
      res.status(201).json({
        success: true,
        data: incident
      });
    } catch (error) {
      safeLogger.error('Error reporting incident:', error);
      
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
        error: 'Failed to report incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get incident by ID
   */
  async getIncident(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      
      const incident = securityAuditService.getIncident(incidentId);
      
      if (!incident) {
        res.status(404).json({
          success: false,
          error: 'Incident not found'
        });
        return;
      }
      
      res.json({
        success: true,
        data: incident
      });
    } catch (error) {
      safeLogger.error('Error getting incident:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get incident',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all incidents
   */
  async getAllIncidents(req: Request, res: Response): Promise<void> {
    try {
      const incidents = securityAuditService.getAllIncidents();
      
      res.json({
        success: true,
        data: incidents,
        count: incidents.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error getting incidents:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to get incidents',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update incident status
   */
  async updateIncidentStatus(req: Request, res: Response): Promise<void> {
    try {
      const { incidentId } = req.params;
      const { status, updatedBy } = req.body;
      
      if (!status || !updatedBy) {
        res.status(400).json({
          success: false,
          error: 'status and updatedBy are required'
        });
        return;
      }
      
      const success = await securityAuditService.updateIncidentStatus(
        incidentId,
        status,
        updatedBy
      );
      
      if (success) {
        res.json({
          success: true,
          message: 'Incident status updated successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Incident not found'
        });
      }
    } catch (error) {
      safeLogger.error('Error updating incident status:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to update incident status',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Record tamper detection
   */
  async recordTamperDetection(req: Request, res: Response): Promise<void> {
    try {
      const tamperData = tamperDetectionSchema.parse(req.body);
      
      const record = await securityAuditService.recordTamperDetection(
        tamperData.resourceType,
        tamperData.resourceId,
        tamperData.expectedHash,
        tamperData.actualHash,
        tamperData.detectedBy,
        tamperData.discrepancy
      );
      
      res.status(201).json({
        success: true,
        data: record
      });
    } catch (error) {
      safeLogger.error('Error recording tamper detection:', error);
      
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
        error: 'Failed to record tamper detection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Resolve tamper detection
   */
  async resolveTamperDetection(req: Request, res: Response): Promise<void> {
    try {
      const resolutionData = tamperResolutionSchema.parse(req.body);
      
      const success = await securityAuditService.resolveTamperDetection(
        resolutionData.recordId,
        resolutionData.resolutionNotes,
        resolutionData.resolvedBy
      );
      
      if (success) {
        res.json({
          success: true,
          message: 'Tamper detection resolved successfully'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Tamper detection record not found'
        });
      }
    } catch (error) {
      safeLogger.error('Error resolving tamper detection:', error);
      
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
        error: 'Failed to resolve tamper detection',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Generate audit report
   */
  async generateAuditReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
        return;
      }
      
      const report = await securityAuditService.generateAuditReport(
        new Date(startDate as string),
        new Date(endDate as string),
        req.query as any
      );
      
      res.json({
        success: true,
        data: report,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      safeLogger.error('Error generating audit report:', error);
      
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit report',
        message: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}

// Export singleton instance
export const securityAuditController = new SecurityAuditController();