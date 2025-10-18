/**
 * Compliance Monitoring Routes
 * 
 * API endpoints for compliance framework management, violation tracking,
 * and regulatory reporting functionality.
 */

import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { complianceMonitoringService } from '../services/complianceMonitoringService';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * Get compliance dashboard
 */
router.get('/dashboard', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dashboard = await complianceMonitoringService.getComplianceDashboard();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    console.error('Error getting compliance dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance dashboard',
    });
  }
});

/**
 * Get compliance frameworks
 */
router.get('/frameworks', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { enabled } = req.query;

    let frameworks = complianceMonitoringService.getFrameworks();

    if (enabled !== undefined) {
      const isEnabled = enabled === 'true';
      frameworks = frameworks.filter(f => f.enabled === isEnabled);
    }

    res.json({
      success: true,
      data: frameworks,
    });
  } catch (error) {
    console.error('Error getting compliance frameworks:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance frameworks',
    });
  }
});

/**
 * Get specific compliance framework
 */
router.get('/frameworks/:frameworkId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { frameworkId } = req.params;

    const framework = complianceMonitoringService.getFramework(frameworkId);

    if (!framework) {
      return res.status(404).json({
        success: false,
        error: 'Compliance framework not found',
      });
    }

    res.json({
      success: true,
      data: framework,
    });
  } catch (error) {
    console.error('Error getting compliance framework:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance framework',
    });
  }
});

/**
 * Get compliance violations
 */
router.get('/violations', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      frameworkId,
      severity,
      status,
      limit = 100,
      offset = 0,
    } = req.query;

    let violations = complianceMonitoringService.getViolations(frameworkId as string);

    // Apply filters
    if (severity) {
      violations = violations.filter(v => v.severity === severity);
    }
    if (status) {
      violations = violations.filter(v => v.status === status);
    }

    // Sort by timestamp (newest first)
    violations.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    // Apply pagination
    const total = violations.length;
    const paginatedViolations = violations.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    res.json({
      success: true,
      data: {
        violations: paginatedViolations,
        total,
        hasMore: total > parseInt(offset as string) + parseInt(limit as string),
      },
    });
  } catch (error) {
    console.error('Error getting compliance violations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance violations',
    });
  }
});

/**
 * Get specific compliance violation
 */
router.get('/violations/:violationId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { violationId } = req.params;

    const violations = complianceMonitoringService.getViolations();
    const violation = violations.find(v => v.id === violationId);

    if (!violation) {
      return res.status(404).json({
        success: false,
        error: 'Compliance violation not found',
      });
    }

    res.json({
      success: true,
      data: violation,
    });
  } catch (error) {
    console.error('Error getting compliance violation:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance violation',
    });
  }
});

/**
 * Update compliance violation status
 */
router.patch('/violations/:violationId/status', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { violationId } = req.params;
    const { status, notes, assignedTo } = req.body;

    const validStatuses = ['open', 'investigating', 'remediated', 'accepted', 'false_positive'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    complianceMonitoringService.updateViolationStatus(violationId, status, notes);

    // Update assignedTo if provided
    const violations = complianceMonitoringService.getViolations();
    const violation = violations.find(v => v.id === violationId);
    if (violation && assignedTo) {
      violation.assignedTo = assignedTo;
    }

    res.json({
      success: true,
      message: 'Violation status updated successfully',
    });
  } catch (error) {
    console.error('Error updating violation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update violation status',
    });
  }
});

/**
 * Generate compliance report
 */
router.post('/reports', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { frameworkId, reportType, startDate, endDate } = req.body;

    if (!frameworkId || !reportType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'frameworkId, reportType, startDate, and endDate are required',
      });
    }

    const validReportTypes = ['assessment', 'violation', 'remediation', 'certification'];
    if (!validReportTypes.includes(reportType)) {
      return res.status(400).json({
        success: false,
        error: `Invalid report type. Must be one of: ${validReportTypes.join(', ')}`,
      });
    }

    const report = await complianceMonitoringService.generateComplianceReport(
      frameworkId,
      reportType,
      new Date(startDate),
      new Date(endDate)
    );

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error generating compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate compliance report',
    });
  }
});

/**
 * Get compliance reports
 */
router.get('/reports', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      frameworkId,
      reportType,
      limit = 50,
    } = req.query;

    let reports = complianceMonitoringService.getReports();

    // Apply filters
    if (frameworkId) {
      reports = reports.filter(r => r.frameworkId === frameworkId);
    }
    if (reportType) {
      reports = reports.filter(r => r.type === reportType);
    }

    // Sort by generation date (newest first)
    reports.sort((a, b) => b.generatedAt.getTime() - a.generatedAt.getTime());

    // Limit results
    const limitedReports = reports.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        reports: limitedReports,
        total: reports.length,
      },
    });
  } catch (error) {
    console.error('Error getting compliance reports:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance reports',
    });
  }
});

/**
 * Get specific compliance report
 */
router.get('/reports/:reportId', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { reportId } = req.params;

    const reports = complianceMonitoringService.getReports();
    const report = reports.find(r => r.id === reportId);

    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Compliance report not found',
      });
    }

    res.json({
      success: true,
      data: report,
    });
  } catch (error) {
    console.error('Error getting compliance report:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance report',
    });
  }
});

/**
 * Get compliance requirements for a framework
 */
router.get('/frameworks/:frameworkId/requirements', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { frameworkId } = req.params;
    const { category, status, mandatory } = req.query;

    const framework = complianceMonitoringService.getFramework(frameworkId);

    if (!framework) {
      return res.status(404).json({
        success: false,
        error: 'Compliance framework not found',
      });
    }

    let requirements = framework.requirements;

    // Apply filters
    if (category) {
      requirements = requirements.filter(r => r.category === category);
    }
    if (status) {
      requirements = requirements.filter(r => r.status === status);
    }
    if (mandatory !== undefined) {
      const isMandatory = mandatory === 'true';
      requirements = requirements.filter(r => r.mandatory === isMandatory);
    }

    res.json({
      success: true,
      data: {
        requirements,
        total: requirements.length,
        framework: {
          id: framework.id,
          name: framework.name,
          version: framework.version,
        },
      },
    });
  } catch (error) {
    console.error('Error getting compliance requirements:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance requirements',
    });
  }
});

/**
 * Trigger compliance assessment
 */
router.post('/frameworks/:frameworkId/assess', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { frameworkId } = req.params;
    const { requirementIds } = req.body;

    const framework = complianceMonitoringService.getFramework(frameworkId);

    if (!framework) {
      return res.status(404).json({
        success: false,
        error: 'Compliance framework not found',
      });
    }

    // This would trigger an assessment
    // For now, return a placeholder response
    const assessmentResult = {
      frameworkId,
      assessmentId: `assessment_${Date.now()}`,
      startedAt: new Date(),
      status: 'in_progress',
      requirementsToAssess: requirementIds || framework.requirements.map(r => r.id),
      estimatedCompletion: new Date(Date.now() + 30 * 60 * 1000), // 30 minutes
    };

    res.json({
      success: true,
      data: assessmentResult,
      message: 'Compliance assessment started',
    });
  } catch (error) {
    console.error('Error starting compliance assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to start compliance assessment',
    });
  }
});

/**
 * Get compliance statistics
 */
router.get('/statistics', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      frameworkId,
      timeRange = '30d',
    } = req.query;

    // Calculate time window
    const now = Date.now();
    let timeWindow: number;
    
    switch (timeRange) {
      case '7d':
        timeWindow = 7 * 24 * 60 * 60 * 1000;
        break;
      case '30d':
        timeWindow = 30 * 24 * 60 * 60 * 1000;
        break;
      case '90d':
        timeWindow = 90 * 24 * 60 * 60 * 1000;
        break;
      default:
        timeWindow = 30 * 24 * 60 * 60 * 1000;
    }

    const startDate = new Date(now - timeWindow);
    const endDate = new Date(now);

    let frameworks = complianceMonitoringService.getFrameworks();
    if (frameworkId) {
      frameworks = frameworks.filter(f => f.id === frameworkId);
    }

    let violations = complianceMonitoringService.getViolations(frameworkId as string);
    violations = violations.filter(v => v.timestamp >= startDate && v.timestamp <= endDate);

    const statistics = {
      overview: {
        totalFrameworks: frameworks.length,
        averageScore: frameworks.length > 0 
          ? Math.round(frameworks.reduce((sum, f) => sum + f.complianceScore, 0) / frameworks.length)
          : 0,
        totalViolations: violations.length,
        criticalViolations: violations.filter(v => v.severity === 'critical').length,
        openViolations: violations.filter(v => v.status === 'open').length,
        remediatedViolations: violations.filter(v => v.status === 'remediated').length,
      },
      frameworkScores: frameworks.map(f => ({
        id: f.id,
        name: f.name,
        score: f.complianceScore,
        lastAssessment: f.lastAssessment,
      })),
      violationsByFramework: frameworks.map(f => ({
        frameworkId: f.id,
        frameworkName: f.name,
        violations: violations.filter(v => v.frameworkId === f.id).length,
      })),
      violationsBySeverity: {
        critical: violations.filter(v => v.severity === 'critical').length,
        high: violations.filter(v => v.severity === 'high').length,
        medium: violations.filter(v => v.severity === 'medium').length,
        low: violations.filter(v => v.severity === 'low').length,
      },
      violationsByStatus: {
        open: violations.filter(v => v.status === 'open').length,
        investigating: violations.filter(v => v.status === 'investigating').length,
        remediated: violations.filter(v => v.status === 'remediated').length,
        accepted: violations.filter(v => v.status === 'accepted').length,
        false_positive: violations.filter(v => v.status === 'false_positive').length,
      },
      trends: {
        violationTrend: generateViolationTrend(violations, timeWindow),
        scoreTrend: generateScoreTrend(frameworks, timeWindow),
      },
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    console.error('Error getting compliance statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get compliance statistics',
    });
  }
});

/**
 * Export compliance data
 */
router.post('/export', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      frameworkId,
      dataType = 'violations',
      format = 'json',
      startDate,
      endDate,
    } = req.body;

    if (!['json', 'csv', 'xml'].includes(format)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid format. Must be json, csv, or xml',
      });
    }

    let exportData: any;

    switch (dataType) {
      case 'violations':
        exportData = complianceMonitoringService.getViolations(frameworkId);
        break;
      case 'frameworks':
        exportData = frameworkId 
          ? [complianceMonitoringService.getFramework(frameworkId)]
          : complianceMonitoringService.getFrameworks();
        break;
      case 'reports':
        exportData = complianceMonitoringService.getReports();
        if (frameworkId) {
          exportData = exportData.filter((r: any) => r.frameworkId === frameworkId);
        }
        break;
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid data type. Must be violations, frameworks, or reports',
        });
    }

    // Apply date filtering if provided
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      
      if (dataType === 'violations') {
        exportData = exportData.filter((v: any) => v.timestamp >= start && v.timestamp <= end);
      } else if (dataType === 'reports') {
        exportData = exportData.filter((r: any) => r.generatedAt >= start && r.generatedAt <= end);
      }
    }

    let formattedData: string;
    let contentType: string;
    let fileExtension: string;

    switch (format) {
      case 'json':
        formattedData = JSON.stringify(exportData, null, 2);
        contentType = 'application/json';
        fileExtension = 'json';
        break;
      case 'csv':
        formattedData = convertToCSV(exportData, dataType);
        contentType = 'text/csv';
        fileExtension = 'csv';
        break;
      case 'xml':
        formattedData = convertToXML(exportData, dataType);
        contentType = 'application/xml';
        fileExtension = 'xml';
        break;
      default:
        throw new Error('Unsupported format');
    }

    const filename = `compliance-${dataType}-${new Date().toISOString().split('T')[0]}.${fileExtension}`;

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(formattedData);
  } catch (error) {
    console.error('Error exporting compliance data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to export compliance data',
    });
  }
});

// Helper functions
function generateViolationTrend(violations: any[], timeWindow: number): Array<{ date: Date; count: number }> {
  const days = Math.ceil(timeWindow / (24 * 60 * 60 * 1000));
  const trend: Array<{ date: Date; count: number }> = [];
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    const dayStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
    
    const count = violations.filter(v => v.timestamp >= dayStart && v.timestamp < dayEnd).length;
    trend.push({ date: dayStart, count });
  }
  
  return trend;
}

function generateScoreTrend(frameworks: any[], timeWindow: number): Array<{ date: Date; score: number }> {
  // Placeholder implementation - would fetch historical scores
  const days = Math.ceil(timeWindow / (24 * 60 * 60 * 1000));
  const trend: Array<{ date: Date; score: number }> = [];
  
  const currentScore = frameworks.length > 0 
    ? Math.round(frameworks.reduce((sum, f) => sum + f.complianceScore, 0) / frameworks.length)
    : 0;
  
  for (let i = days - 1; i >= 0; i--) {
    const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
    // Simulate slight variations in historical scores
    const variation = Math.random() * 10 - 5; // ±5 points
    const score = Math.max(0, Math.min(100, currentScore + variation));
    trend.push({ date, score: Math.round(score) });
  }
  
  return trend;
}

function convertToCSV(data: any[], dataType: string): string {
  if (!data || data.length === 0) return '';
  
  let headers: string[];
  let rows: string[][];
  
  switch (dataType) {
    case 'violations':
      headers = ['ID', 'Framework', 'Requirement', 'Severity', 'Status', 'Timestamp', 'Description'];
      rows = data.map(v => [
        v.id,
        v.frameworkId,
        v.requirementId,
        v.severity,
        v.status,
        v.timestamp.toISOString(),
        v.description.replace(/,/g, ';'), // Escape commas
      ]);
      break;
    case 'frameworks':
      headers = ['ID', 'Name', 'Version', 'Score', 'Enabled', 'Last Assessment'];
      rows = data.map(f => [
        f.id,
        f.name,
        f.version,
        f.complianceScore.toString(),
        f.enabled.toString(),
        f.lastAssessment ? f.lastAssessment.toISOString() : '',
      ]);
      break;
    default:
      headers = ['Data'];
      rows = data.map(item => [JSON.stringify(item)]);
  }
  
  return [headers, ...rows].map(row => row.join(',')).join('\n');
}

function convertToXML(data: any[], dataType: string): string {
  const xmlItems = data.map(item => {
    const xmlFields = Object.entries(item)
      .map(([key, value]) => `<${key}>${value}</${key}>`)
      .join('');
    return `<${dataType.slice(0, -1)}>${xmlFields}</${dataType.slice(0, -1)}>`;
  }).join('');
  
  return `<?xml version="1.0" encoding="UTF-8"?><${dataType}>${xmlItems}</${dataType}>`;
}

export default router;