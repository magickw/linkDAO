/**
 * Comprehensive Audit Routes
 * 
 * API endpoints for advanced audit logging, search, visualization,
 * and compliance reporting functionality.
 */

import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { AuthenticatedRequest } from '../middleware/auth';
import { comprehensiveAuditService } from '../services/comprehensiveAuditService';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Search audit events with advanced filtering
 */
router.get('/events/search', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
    });
  } catch (error) {
    safeLogger.error('Error searching audit events:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to search audit events',
    });
  }
});

/**
 * Generate audit visualization
 */
router.post('/visualizations/:type', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { type } = req.params;
    const criteria = req.body;

    // Validate visualization type
    const validTypes = ['timeline', 'heatmap', 'network', 'treemap', 'sankey'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({
        success: false,
        error: `Invalid visualization type. Must be one of: ${validTypes.join(', ')}`,
      });
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
});

/**
 * Generate audit analytics
 */
router.post('/analytics', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
});

/**
 * Generate compliance report
 */
router.post('/compliance/reports', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { reportType, startDate, endDate } = req.body;

    if (!reportType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'reportType, startDate, and endDate are required',
      });
    }

    const report = await comprehensiveAuditService.generateComplianceReport(
      reportType,
      new Date(startDate),
      new Date(endDate)
    );

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
});

/**
 * Export audit data
 */
router.post('/export', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { criteria, format = 'json' } = req.body;

    if (!['json', 'csv', 'xml'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be json, csv, or xml',
      });
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
});

/**
 * Validate audit data integrity
 */
router.get('/integrity/validate', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
});

/**
 * Record audit event (for internal use)
 */
router.post('/events', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const eventData = req.body;

    // Add request metadata
    eventData.metadata = {
      ...eventData.metadata,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      // sessionId: req.session?.id, // Not available in AuthenticatedRequest
      // requestId: req.id, // Not available in AuthenticatedRequest
    };

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
});

/**
 * Get audit event by ID
 */
router.get('/events/:eventId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { eventId } = req.params;

    // Search for the specific event
    const result = await comprehensiveAuditService.searchAuditEvents({
      textSearch: eventId,
      limit: 1,
    });

    const event = result.events.find(e => e.id === eventId);

    if (!event) {
      return res.status(404).json({
        success: false,
        error: 'Audit event not found',
      });
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
});

/**
 * Get audit statistics
 */
router.get('/statistics', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
});

/**
 * Get available filter options
 */
router.get('/filters', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
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
});

export default router;
