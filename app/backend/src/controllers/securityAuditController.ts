/**
 * Security Audit Controller
 * REST API endpoints for security audit logging and reporting
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { securityAuditLoggingService, AuditQuery } from '../services/securityAuditLoggingService';

export class SecurityAuditController {
  /**
   * Query audit events with filters
   */
  async queryAuditEvents(req: Request, res: Response): Promise<void> {
    try {
      const query: AuditQuery = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        eventTypes: req.query.eventTypes ? (req.query.eventTypes as string).split(',') : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        severities: req.query.severities ? (req.query.severities as string).split(',') : undefined,
        userIds: req.query.userIds ? (req.query.userIds as string).split(',') : undefined,
        ipAddresses: req.query.ipAddresses ? (req.query.ipAddresses as string).split(',') : undefined,
        outcomes: req.query.outcomes ? (req.query.outcomes as string).split(',') : undefined,
        riskScoreMin: req.query.riskScoreMin ? parseFloat(req.query.riskScoreMin as string) : undefined,
        riskScoreMax: req.query.riskScoreMax ? parseFloat(req.query.riskScoreMax as string) : undefined,
        complianceFlags: req.query.complianceFlags ? (req.query.complianceFlags as string).split(',') : undefined,
        correlationId: req.query.correlationId as string,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 100,
        offset: req.query.offset ? parseInt(req.query.offset as string) : 0,
        sortBy: req.query.sortBy as 'timestamp' | 'riskScore' | 'severity',
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const events = await securityAuditLoggingService.queryAuditEvents(query);

      res.json({
        success: true,
        data: events,
        pagination: {
          limit: query.limit,
          offset: query.offset,
          total: events.length
        }
      });
    } catch (error) {
      safeLogger.error('Error querying audit events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to query audit events'
      });
    }
  }

  /**
   * Generate audit report for a date range
   */
  async generateAuditReport(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate, includeRecommendations = true } = req.body;

      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const report = await securityAuditLoggingService.generateAuditReport(
        new Date(startDate),
        new Date(endDate),
        includeRecommendations
      );

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      safeLogger.error('Error generating audit report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit report'
      });
    }
  }

  /**
   * Log a security event manually
   */
  async logSecurityEvent(req: Request, res: Response): Promise<void> {
    try {
      const {
        category,
        eventType,
        severity,
        userId,
        sessionId,
        resource,
        action,
        outcome,
        details = {},
        riskScore,
        complianceFlags = [],
        correlationId,
        threatIndicators = []
      } = req.body;

      // Get IP address from request
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      const eventId = await securityAuditLoggingService.logSecurityEvent({
        category,
        eventType,
        severity,
        userId,
        sessionId,
        ipAddress,
        userAgent,
        resource,
        action,
        outcome,
        details,
        riskScore,
        complianceFlags,
        correlationId,
        threatIndicators
      });

      res.status(201).json({
        success: true,
        data: { eventId }
      });
    } catch (error) {
      safeLogger.error('Error logging security event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to log security event'
      });
    }
  }

  /**
   * Log authentication event
   */
  async logAuthenticationEvent(req: Request, res: Response): Promise<void> {
    try {
      const { userId, action, outcome, details = {} } = req.body;
      
      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';
      const userAgent = req.get('User-Agent');

      const eventId = await securityAuditLoggingService.logAuthenticationEvent(
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
        error: 'Failed to log authentication event'
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

      const ipAddress = req.ip || req.connection.remoteAddress || 'unknown';

      const eventId = await securityAuditLoggingService.logDataAccessEvent(
        userId,
        resource,
        action,
        outcome,
        ipAddress,
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
        error: 'Failed to log data access event'
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

      const eventId = await securityAuditLoggingService.logAdminAction(
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
        error: 'Failed to log admin action'
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

      const eventId = await securityAuditLoggingService.logSecurityIncident(
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
        error: 'Failed to log security incident'
      });
    }
  }

  /**
   * Create compliance rule
   */
  async createComplianceRule(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        regulation,
        eventTypes,
        conditions,
        actions,
        isActive = true,
        severity
      } = req.body;

      if (!name || !regulation || !eventTypes || !conditions || !actions || !severity) {
        res.status(400).json({
          success: false,
          error: 'name, regulation, eventTypes, conditions, actions, and severity are required'
        });
        return;
      }

      const ruleId = await securityAuditLoggingService.createComplianceRule({
        name,
        description,
        regulation,
        eventTypes,
        conditions,
        actions,
        isActive,
        severity
      });

      res.status(201).json({
        success: true,
        data: { ruleId }
      });
    } catch (error) {
      safeLogger.error('Error creating compliance rule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create compliance rule'
      });
    }
  }

  /**
   * Create retention policy
   */
  async createRetentionPolicy(req: Request, res: Response): Promise<void> {
    try {
      const {
        name,
        description,
        categories,
        retentionPeriodDays,
        archiveAfterDays,
        encryptionRequired = false,
        complianceRequirements = [],
        isActive = true
      } = req.body;

      if (!name || !categories || !retentionPeriodDays) {
        res.status(400).json({
          success: false,
          error: 'name, categories, and retentionPeriodDays are required'
        });
        return;
      }

      const policyId = await securityAuditLoggingService.createRetentionPolicy({
        name,
        description,
        categories,
        retentionPeriodDays,
        archiveAfterDays,
        encryptionRequired,
        complianceRequirements,
        isActive
      });

      res.status(201).json({
        success: true,
        data: { policyId }
      });
    } catch (error) {
      safeLogger.error('Error creating retention policy:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create retention policy'
      });
    }
  }

  /**
   * Export audit data
   */
  async exportAuditData(req: Request, res: Response): Promise<void> {
    try {
      const query: AuditQuery = {
        startDate: req.query.startDate ? new Date(req.query.startDate as string) : undefined,
        endDate: req.query.endDate ? new Date(req.query.endDate as string) : undefined,
        eventTypes: req.query.eventTypes ? (req.query.eventTypes as string).split(',') : undefined,
        categories: req.query.categories ? (req.query.categories as string).split(',') : undefined,
        severities: req.query.severities ? (req.query.severities as string).split(',') : undefined,
        userIds: req.query.userIds ? (req.query.userIds as string).split(',') : undefined,
        ipAddresses: req.query.ipAddresses ? (req.query.ipAddresses as string).split(',') : undefined,
        outcomes: req.query.outcomes ? (req.query.outcomes as string).split(',') : undefined,
        riskScoreMin: req.query.riskScoreMin ? parseFloat(req.query.riskScoreMin as string) : undefined,
        riskScoreMax: req.query.riskScoreMax ? parseFloat(req.query.riskScoreMax as string) : undefined,
        complianceFlags: req.query.complianceFlags ? (req.query.complianceFlags as string).split(',') : undefined,
        correlationId: req.query.correlationId as string
      };

      const format = (req.query.format as 'json' | 'csv' | 'xml') || 'json';
      const encrypt = req.query.encrypt === 'true';

      const exportId = await securityAuditLoggingService.exportAuditData(query, format, encrypt);

      res.json({
        success: true,
        data: { exportId, format, encrypted: encrypt }
      });
    } catch (error) {
      safeLogger.error('Error exporting audit data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit data'
      });
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const events = await securityAuditLoggingService.queryAuditEvents({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      });

      const statistics = {
        totalEvents: events.length,
        eventsByCategory: events.reduce((acc, event) => {
          acc[event.category] = (acc[event.category] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        eventsBySeverity: events.reduce((acc, event) => {
          acc[event.severity] = (acc[event.severity] || 0) + 1;
          return acc;
        }, {} as Record<string, number>),
        averageRiskScore: events.length > 0 
          ? events.reduce((sum, event) => sum + event.riskScore, 0) / events.length 
          : 0,
        highRiskEvents: events.filter(e => e.riskScore >= 7.0).length,
        criticalEvents: events.filter(e => e.severity === 'critical').length,
        failedEvents: events.filter(e => e.outcome === 'failure').length,
        uniqueUsers: new Set(events.filter(e => e.userId).map(e => e.userId)).size,
        uniqueIpAddresses: new Set(events.map(e => e.ipAddress)).size
      };

      res.json({
        success: true,
        data: statistics
      });
    } catch (error) {
      safeLogger.error('Error getting audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit statistics'
      });
    }
  }

  /**
   * Get compliance summary
   */
  async getComplianceSummary(req: Request, res: Response): Promise<void> {
    try {
      const { startDate, endDate } = req.query;
      
      if (!startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'Start date and end date are required'
        });
        return;
      }

      const events = await securityAuditLoggingService.queryAuditEvents({
        startDate: new Date(startDate as string),
        endDate: new Date(endDate as string)
      });

      const complianceEvents = events.filter(e => e.complianceFlags.length > 0);
      
      const complianceSummary = {
        totalComplianceEvents: complianceEvents.length,
        complianceByRegulation: complianceEvents.reduce((acc, event) => {
          event.complianceFlags.forEach(flag => {
            acc[flag] = (acc[flag] || 0) + 1;
          });
          return acc;
        }, {} as Record<string, number>),
        complianceViolations: events.filter(e => 
          e.complianceFlags.length > 0 && 
          (e.severity === 'error' || e.severity === 'critical' || e.outcome === 'failure')
        ).length,
        gdprEvents: complianceEvents.filter(e => e.complianceFlags.includes('GDPR')).length,
        soxEvents: complianceEvents.filter(e => e.complianceFlags.includes('SOX')).length,
        hipaaEvents: complianceEvents.filter(e => e.complianceFlags.includes('HIPAA')).length,
        iso27001Events: complianceEvents.filter(e => e.complianceFlags.includes('ISO27001')).length
      };

      res.json({
        success: true,
        data: complianceSummary
      });
    } catch (error) {
      safeLogger.error('Error getting compliance summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get compliance summary'
      });
    }
  }
}

export const securityAuditController = new SecurityAuditController();
