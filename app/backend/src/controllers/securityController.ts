/**
 * Security Controller
 * 
 * API endpoints for security monitoring, compliance management,
 * and vulnerability assessment in the Web3 marketplace.
 */

import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../middleware/auth';
import { securityMonitoringService } from '../services/securityMonitoringService';
import { complianceService } from '../services/complianceService';
import { vulnerabilityScanner } from '../services/vulnerabilityScanner';
import { keyManagementService } from '../services/keyManagementService';
import { auditLoggingService } from '../services/auditLoggingService';

export class SecurityController {
  /**
   * Get security dashboard overview
   */
  async getSecurityDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Check admin permissions
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const [
        securityMetrics,
        activeAlerts,
        recentEvents,
        latestScan,
        complianceStatus,
      ] = await Promise.all([
        securityMonitoringService.getSecurityMetrics(),
        securityMonitoringService.getActiveAlerts(),
        securityMonitoringService.getRecentEvents(50),
        vulnerabilityScanner.getLatestScanReport(),
        this.getComplianceStatus(),
      ]);

      const dashboard = {
        overview: {
          totalEvents: securityMetrics.totalEvents,
          activeAlerts: activeAlerts.length,
          criticalVulnerabilities: latestScan?.summary.criticalCount || 0,
          complianceScore: complianceStatus.score,
          lastScanDate: latestScan?.timestamp,
          threatLevel: this.calculateOverallThreatLevel(securityMetrics, activeAlerts),
        },
        metrics: securityMetrics,
        alerts: activeAlerts.slice(0, 10), // Top 10 alerts
        recentEvents: recentEvents.slice(0, 20), // Last 20 events
        vulnerabilities: latestScan?.vulnerabilities.slice(0, 10) || [],
        compliance: complianceStatus,
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Error getting security dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get security events with filtering
   */
  async getSecurityEvents(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const {
        limit = 100,
        offset = 0,
        severity,
        type,
        startDate,
        endDate,
      } = req.query;

      const events = securityMonitoringService.getRecentEvents(
        parseInt(limit as string) + parseInt(offset as string)
      );

      let filteredEvents = events;

      // Apply filters
      if (severity) {
        filteredEvents = filteredEvents.filter(event => event.severity === severity);
      }
      if (type) {
        filteredEvents = filteredEvents.filter(event => event.type === type);
      }
      if (startDate) {
        const start = new Date(startDate as string);
        filteredEvents = filteredEvents.filter(event => event.timestamp >= start);
      }
      if (endDate) {
        const end = new Date(endDate as string);
        filteredEvents = filteredEvents.filter(event => event.timestamp <= end);
      }

      // Apply pagination
      const paginatedEvents = filteredEvents.slice(
        parseInt(offset as string),
        parseInt(offset as string) + parseInt(limit as string)
      );

      res.json({
        events: paginatedEvents,
        total: filteredEvents.length,
        hasMore: filteredEvents.length > parseInt(offset as string) + parseInt(limit as string),
      });
    } catch (error) {
      console.error('Error getting security events:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get security alerts
   */
  async getSecurityAlerts(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { status = 'active' } = req.query;

      let alerts;
      if (status === 'active') {
        alerts = securityMonitoringService.getActiveAlerts();
      } else {
        // Would need to implement getAllAlerts method
        alerts = securityMonitoringService.getActiveAlerts();
      }

      res.json({ alerts });
    } catch (error) {
      console.error('Error getting security alerts:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Acknowledge security alert
   */
  async acknowledgeAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { alertId } = req.params;
      const userId = req.user.id || req.user.userId;

      await securityMonitoringService.acknowledgeAlert(alertId, userId);

      res.json({ message: 'Alert acknowledged successfully' });
    } catch (error) {
      console.error('Error acknowledging alert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Resolve security alert
   */
  async resolveAlert(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { alertId } = req.params;
      const { resolution } = req.body;
      const userId = req.user.id || req.user.userId;

      await securityMonitoringService.resolveAlert(alertId, userId, resolution);

      res.json({ message: 'Alert resolved successfully' });
    } catch (error) {
      console.error('Error resolving alert:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Start vulnerability scan
   */
  async startVulnerabilityScan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      // Start scan asynchronously
      vulnerabilityScanner.performComprehensiveScan()
        .then(report => {
          console.log(`Vulnerability scan completed: ${report.id}`);
        })
        .catch(error => {
          console.error('Vulnerability scan failed:', error);
        });

      res.json({ message: 'Vulnerability scan started' });
    } catch (error) {
      console.error('Error starting vulnerability scan:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get vulnerability reports
   */
  async getVulnerabilityReports(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const reports = vulnerabilityScanner.getScanHistory();
      res.json({ reports });
    } catch (error) {
      console.error('Error getting vulnerability reports:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Update vulnerability status
   */
  async updateVulnerabilityStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { vulnerabilityId } = req.params;
      const { status } = req.body;
      const userId = req.user.id || req.user.userId;

      await vulnerabilityScanner.updateVulnerabilityStatus(vulnerabilityId, status, userId);

      res.json({ message: 'Vulnerability status updated successfully' });
    } catch (error) {
      console.error('Error updating vulnerability status:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get compliance dashboard
   */
  async getComplianceDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const [
        complianceStatus,
        retentionCompliance,
        recentReports,
      ] = await Promise.all([
        this.getComplianceStatus(),
        complianceService.checkDataRetentionCompliance(),
        this.getRecentComplianceReports(),
      ]);

      const dashboard = {
        status: complianceStatus,
        dataRetention: retentionCompliance,
        recentReports,
        recommendations: this.generateComplianceRecommendations(complianceStatus),
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Error getting compliance dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate compliance report
   */
  async generateComplianceReport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { reportType, startDate, endDate } = req.body;

      const report = await complianceService.generateComplianceReport({
        reportType,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
      });

      res.json({ report });
    } catch (error) {
      console.error('Error generating compliance report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle data export request
   */
  async requestDataExport(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request = await complianceService.handleDataExportRequest(userId, userId);

      res.json({ request });
    } catch (error) {
      console.error('Error requesting data export:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle data deletion request
   */
  async requestDataDeletion(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request = await complianceService.handleDataDeletionRequest(userId, userId);

      res.json({ request });
    } catch (error) {
      console.error('Error requesting data deletion:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Handle opt-out request
   */
  async requestOptOut(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const request = await complianceService.handleOptOutRequest(userId, userId);

      res.json({ request });
    } catch (error) {
      console.error('Error requesting opt-out:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Record user consent
   */
  async recordConsent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userId = req.user?.id || req.user?.userId;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }

      const { consentType, consentGiven, consentVersion } = req.body;

      const consent = await complianceService.recordConsent({
        userId,
        consentType,
        consentGiven,
        consentVersion,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('User-Agent') || 'unknown',
      });

      res.json({ consent });
    } catch (error) {
      console.error('Error recording consent:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get key management dashboard
   */
  async getKeyManagementDashboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const keys = keyManagementService.listKeys();
      const keysByType = this.groupKeysByType(keys);
      const keysByStatus = this.groupKeysByStatus(keys);
      const upcomingRotations = this.getUpcomingRotations(keys);

      const dashboard = {
        summary: {
          totalKeys: keys.length,
          activeKeys: keys.filter(k => k.status === 'active').length,
          expiredKeys: keys.filter(k => k.status === 'expired').length,
          upcomingRotations: upcomingRotations.length,
        },
        keysByType,
        keysByStatus,
        upcomingRotations,
        recentKeys: keys.slice(0, 10),
      };

      res.json(dashboard);
    } catch (error) {
      console.error('Error getting key management dashboard:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Generate new key
   */
  async generateKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { type, algorithm, keySize, purpose, expiresAt, tags } = req.body;

      const keyMetadata = await keyManagementService.generateKey({
        type,
        algorithm,
        keySize,
        purpose,
        expiresAt: expiresAt ? new Date(expiresAt) : undefined,
        tags,
      });

      res.json({ key: keyMetadata });
    } catch (error) {
      console.error('Error generating key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Rotate key
   */
  async rotateKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { keyId } = req.params;
      const userId = req.user.id || req.user.userId;

      const newKey = await keyManagementService.rotateKey(keyId, userId);

      res.json({ key: newKey });
    } catch (error) {
      console.error('Error rotating key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Revoke key
   */
  async revokeKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { keyId } = req.params;
      const { reason } = req.body;
      const userId = req.user.id || req.user.userId;

      await keyManagementService.revokeKey(keyId, reason, userId);

      res.json({ message: 'Key revoked successfully' });
    } catch (error) {
      console.error('Error revoking key:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get audit logs
   */
  async getAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const {
        limit = 100,
        offset = 0,
        actorId,
        actionType,
        startDate,
        endDate,
      } = req.query;

      const auditTrail = await auditLoggingService.getAuditTrail({
        actorId: actorId as string,
        actionType: actionType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string),
      });

      res.json(auditTrail);
    } catch (error) {
      console.error('Error getting audit logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Export audit logs
   */
  async exportAuditLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user || !this.hasAdminPermissions(req.user)) {
        res.status(403).json({ error: 'Insufficient permissions' });
        return;
      }

      const { format = 'json', startDate, endDate } = req.query;

      const exportData = await auditLoggingService.exportAuditTrail({
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        format: format as 'json' | 'csv',
      });

      const contentType = format === 'csv' ? 'text/csv' : 'application/json';
      const filename = `audit-logs-${new Date().toISOString().split('T')[0]}.${format}`;

      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(exportData);
    } catch (error) {
      console.error('Error exporting audit logs:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  // Helper methods
  private hasAdminPermissions(user: any): boolean {
    return user.role === 'admin' || user.permissions?.includes('admin:read');
  }

  private calculateOverallThreatLevel(metrics: any, alerts: any[]): string {
    const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
    const highAlerts = alerts.filter(a => a.severity === 'high').length;

    if (criticalAlerts > 0) return 'critical';
    if (highAlerts > 3) return 'high';
    if (highAlerts > 0 || alerts.length > 10) return 'medium';
    return 'low';
  }

  private async getComplianceStatus(): Promise<any> {
    // Implementation would calculate actual compliance status
    return {
      score: 85,
      gdprCompliant: true,
      ccpaCompliant: true,
      pciCompliant: false,
      lastAssessment: new Date(),
      issues: [
        'PCI DSS compliance assessment needed',
        'Data retention policy review required',
      ],
    };
  }

  private async getRecentComplianceReports(): Promise<any[]> {
    // Implementation would fetch actual reports
    return [];
  }

  private generateComplianceRecommendations(status: any): string[] {
    const recommendations: string[] = [];

    if (!status.pciCompliant) {
      recommendations.push('Complete PCI DSS compliance assessment');
    }

    if (status.score < 90) {
      recommendations.push('Improve overall compliance score');
    }

    return recommendations;
  }

  private groupKeysByType(keys: any[]): Record<string, number> {
    return keys.reduce((acc, key) => {
      acc[key.type] = (acc[key.type] || 0) + 1;
      return acc;
    }, {});
  }

  private groupKeysByStatus(keys: any[]): Record<string, number> {
    return keys.reduce((acc, key) => {
      acc[key.status] = (acc[key.status] || 0) + 1;
      return acc;
    }, {});
  }

  private getUpcomingRotations(keys: any[]): any[] {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

    return keys.filter(key => {
      if (!key.expiresAt) return false;
      const expiresAt = new Date(key.expiresAt);
      return expiresAt <= thirtyDaysFromNow && expiresAt > now;
    });
  }
}

export const securityController = new SecurityController();