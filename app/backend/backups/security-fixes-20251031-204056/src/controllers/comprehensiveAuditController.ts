/**
 * Comprehensive Audit Controller
 * 
 * Controller for managing comprehensive audit logging, search,
 * visualization, and compliance reporting functionality.
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AuthenticatedRequest } from '../middleware/auth';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { comprehensiveAuditService } from '../services/comprehensiveAuditService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class ComprehensiveAuditController {
  /**
   * Get audit dashboard overview
   */
  async getAuditDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        timeRange = '24h',
        includeAnalytics = true,
        includeVisualizations = false,
      } = req.query;

      // Calculate date range
      const endDate = new Date();
      const startDate = new Date();
      
      switch (timeRange) {
        case '1h':
          startDate.setHours(startDate.getHours() - 1);
          break;
        case '24h':
          startDate.setDate(startDate.getDate() - 1);
          break;
        case '7d':
          startDate.setDate(startDate.getDate() - 7);
          break;
        case '30d':
          startDate.setDate(startDate.getDate() - 30);
          break;
        default:
          startDate.setDate(startDate.getDate() - 1);
      }

      const criteria = { startDate, endDate };

      // Get basic audit data
      const auditData = await comprehensiveAuditService.searchAuditEvents({
        ...criteria,
        limit: 1000,
      });

      const dashboard: any = {
        overview: {
          totalEvents: auditData.total,
          timeRange,
          dateRange: { startDate, endDate },
        },
        recentEvents: auditData.events.slice(0, 20),
      };

      // Add analytics if requested
      if (includeAnalytics === true || includeAnalytics === 'true') {
        const analytics = await comprehensiveAuditService.generateAuditAnalytics(criteria);
        dashboard.analytics = analytics;
      }

      // Add visualizations if requested
      if (includeVisualizations === true || includeVisualizations === 'true') {
        const [timeline, heatmap] = await Promise.all([
          comprehensiveAuditService.generateAuditVisualization('timeline', criteria),
          comprehensiveAuditService.generateAuditVisualization('heatmap', criteria),
        ]);
        
        dashboard.visualizations = {
          timeline,
          heatmap,
        };
      }

      res.json({
        success: true,
        data: dashboard,
      });
    } catch (error) {
      safeLogger.error('Error getting audit dashboard:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit dashboard',
      });
    }
  }

  /**
   * Search audit events with advanced filtering
   */
  async searchAuditEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        actorId,
        actionType,
        resourceType,
        severity,
        category,
        tags,
        outcome,
        complianceFlags,
        textSearch,
        limit = 100,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc',
      } = req.query;

      const criteria = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        actorId: actorId as string,
        actionType: actionType as string,
        resourceType: resourceType as string,
        severity: severity as string,
        category: category as string,
        tags: tags ? (tags as string).split(',') : undefined,
        outcome: outcome as string,
        complianceFlags: complianceFlags ? (complianceFlags as string).split(',') : undefined,
        textSearch: textSearch as string,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc',
      };

      const result = await comprehensiveAuditService.searchAuditEvents(criteria);

      res.json({
        success: true,
        data: result,
        pagination: {
          limit: criteria.limit,
          offset: criteria.offset,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      safeLogger.error('Error searching audit events:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search audit events',
      });
    }
  }

  /**
   * Generate audit visualization
   */
  async generateVisualization(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { type } = req.params;
      const criteria = req.body;

      // Validate visualization type
      const validTypes = ['timeline', 'heatmap', 'network', 'treemap', 'sankey'];
      if (!validTypes.includes(type)) {
        res.status(400).json({
          success: false,
          error: `Invalid visualization type. Must be one of: ${validTypes.join(', ')}`,
        });
        return;
      }

      const visualization = await comprehensiveAuditService.generateAuditVisualization(
        type as any,
        criteria
      );

      res.json({
        success: true,
        data: visualization,
      });
    } catch (error) {
      safeLogger.error('Error generating audit visualization:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit visualization',
      });
    }
  }

  /**
   * Generate audit analytics
   */
  async generateAnalytics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const criteria = req.body;

      const analytics = await comprehensiveAuditService.generateAuditAnalytics(criteria);

      res.json({
        success: true,
        data: analytics,
      });
    } catch (error) {
      safeLogger.error('Error generating audit analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate audit analytics',
      });
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { reportType, startDate, endDate, format = 'json' } = req.body;

      if (!reportType || !startDate || !endDate) {
        res.status(400).json({
          success: false,
          error: 'reportType, startDate, and endDate are required',
        });
        return;
      }

      const report = await comprehensiveAuditService.generateComplianceReport(
        reportType,
        new Date(startDate),
        new Date(endDate)
      );

      if (format === 'pdf') {
        // Generate PDF report (would need PDF generation library)
        res.status(501).json({
          success: false,
          error: 'PDF format not yet implemented',
        });
        return;
      }

      res.json({
        success: true,
        data: report,
      });
    } catch (error) {
      safeLogger.error('Error generating compliance report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate compliance report',
      });
    }
  }

  /**
   * Export audit data
   */
  async exportAuditData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { criteria, format = 'json' } = req.body;

      if (!['json', 'csv', 'xml'].includes(format)) {
        res.status(400).json({
          success: false,
          error: 'Invalid format. Must be json, csv, or xml',
        });
        return;
      }

      const exportData = await comprehensiveAuditService.exportAuditData(criteria, format);

      const contentType = {
        json: 'application/json',
        csv: 'text/csv',
        xml: 'application/xml',
      }[format];

      const filename = `audit-export-${new Date().toISOString().split('T')[0]}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      safeLogger.error('Error exporting audit data:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export audit data',
      });
    }
  }

  /**
   * Validate audit data integrity
   */
  async validateIntegrity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const validation = await comprehensiveAuditService.validateAuditIntegrity();

      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      safeLogger.error('Error validating audit integrity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate audit integrity',
      });
    }
  }

  /**
   * Record audit event
   */
  async recordAuditEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const eventData = req.body;

      // Validate required fields
      if (!eventData.actionType || !eventData.actorId || !eventData.resourceType) {
        res.status(400).json({
          success: false,
          error: 'actionType, actorId, and resourceType are required',
        });
        return;
      }

      // Add request metadata
      eventData.metadata = {
        ...eventData.metadata,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        sessionId: req.session?.id,
        requestId: req.id,
        source: eventData.metadata?.source || 'api',
        severity: eventData.metadata?.severity || 'medium',
        category: eventData.metadata?.category || 'general',
        tags: eventData.metadata?.tags || [],
      };

      // Set default values
      eventData.outcome = eventData.outcome || 'success';
      eventData.complianceFlags = eventData.complianceFlags || [];
      eventData.retentionPolicy = eventData.retentionPolicy || 'default';

      const auditEvent = await comprehensiveAuditService.recordAuditEvent(eventData);

      res.json({
        success: true,
        data: auditEvent,
      });
    } catch (error) {
      safeLogger.error('Error recording audit event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record audit event',
      });
    }
  }

  /**
   * Get audit event by ID
   */
  async getAuditEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { eventId } = req.params;

      // Search for the specific event
      const result = await comprehensiveAuditService.searchAuditEvents({
        textSearch: eventId,
        limit: 1,
      });

      const event = result.events.find(e => e.id === eventId);

      if (!event) {
        res.status(404).json({
          success: false,
          error: 'Audit event not found',
        });
        return;
      }

      res.json({
        success: true,
        data: event,
      });
    } catch (error) {
      safeLogger.error('Error getting audit event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit event',
      });
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        startDate,
        endDate,
        groupBy = 'day',
      } = req.query;

      const criteria = {
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      };

      const analytics = await comprehensiveAuditService.generateAuditAnalytics(criteria);

      // Generate time-based statistics
      const statistics = {
        overview: {
          totalEvents: analytics.totalEvents,
          uniqueActors: Object.keys(analytics.eventsByActor).length,
          actionTypes: Object.keys(analytics.eventsByType).length,
          averageEventsPerDay: analytics.timeSeriesData.length > 0 
            ? analytics.totalEvents / Math.max(1, analytics.timeSeriesData.length / 24)
            : 0,
        },
        distributions: {
          byType: analytics.eventsByType,
          byActor: analytics.eventsByActor,
          byOutcome: analytics.eventsByOutcome,
          bySeverity: analytics.eventsBySeverity,
          byCategory: analytics.eventsByCategory,
        },
        trends: {
          timeSeriesData: analytics.timeSeriesData,
          topActors: analytics.topActors,
        },
        security: {
          suspiciousPatterns: analytics.suspiciousPatterns,
          failureRate: analytics.eventsByOutcome.failure 
            ? (analytics.eventsByOutcome.failure / analytics.totalEvents) * 100
            : 0,
        },
      };

      res.json({
        success: true,
        data: statistics,
      });
    } catch (error) {
      safeLogger.error('Error getting audit statistics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get audit statistics',
      });
    }
  }

  /**
   * Get available filter options
   */
  async getFilterOptions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Get recent events to extract filter options
      const result = await comprehensiveAuditService.searchAuditEvents({
        limit: 1000,
      });

      const events = result.events;

      const filters = {
        actionTypes: [...new Set(events.map(e => e.actionType))].sort(),
        actorTypes: [...new Set(events.map(e => e.actorType))].sort(),
        resourceTypes: [...new Set(events.map(e => e.resourceType))].sort(),
        severities: [...new Set(events.map(e => e.metadata.severity))].sort(),
        categories: [...new Set(events.map(e => e.metadata.category))].sort(),
        outcomes: [...new Set(events.map(e => e.outcome))].sort(),
        tags: [...new Set(events.flatMap(e => e.metadata.tags))].sort(),
        complianceFlags: [...new Set(events.flatMap(e => e.complianceFlags))].sort(),
        dateRange: events.length > 0 ? {
          earliest: Math.min(...events.map(e => e.timestamp.getTime())),
          latest: Math.max(...events.map(e => e.timestamp.getTime())),
        } : null,
      };

      res.json({
        success: true,
        data: filters,
      });
    } catch (error) {
      safeLogger.error('Error getting filter options:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get filter options',
      });
    }
  }

  /**
   * Get audit trail for specific resource
   */
  async getResourceAuditTrail(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { resourceType, resourceId } = req.params;
      const { limit = 100, offset = 0 } = req.query;

      const criteria = {
        resourceType,
        resourceId,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
        sortBy: 'timestamp',
        sortOrder: 'desc' as const,
      };

      const result = await comprehensiveAuditService.searchAuditEvents(criteria);

      res.json({
        success: true,
        data: {
          resourceType,
          resourceId,
          auditTrail: result.events,
          total: result.total,
          hasMore: result.hasMore,
        },
      });
    } catch (error) {
      safeLogger.error('Error getting resource audit trail:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get resource audit trail',
      });
    }
  }

  /**
   * Get actor activity summary
   */
  async getActorActivity(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { actorId } = req.params;
      const { 
        startDate,
        endDate,
        limit = 100,
        includeAnalytics = true,
      } = req.query;

      const criteria = {
        actorId,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        sortBy: 'timestamp',
        sortOrder: 'desc' as const,
      };

      const result = await comprehensiveAuditService.searchAuditEvents(criteria);

      const response: any = {
        actorId,
        recentActivity: result.events,
        total: result.total,
      };

      if (includeAnalytics === true || includeAnalytics === 'true') {
        const analytics = await comprehensiveAuditService.generateAuditAnalytics(criteria);
        response.analytics = {
          actionTypes: analytics.eventsByType,
          outcomes: analytics.eventsByOutcome,
          severities: analytics.eventsBySeverity,
          categories: analytics.eventsByCategory,
          timeSeriesData: analytics.timeSeriesData,
        };
      }

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      safeLogger.error('Error getting actor activity:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get actor activity',
      });
    }
  }
}

export const comprehensiveAuditController = new ComprehensiveAuditController();