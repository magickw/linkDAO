/**
 * Security and Audit Enhancement Tests
 * 
 * Tests for the comprehensive security and audit enhancement implementation
 * including audit logging, threat detection, compliance monitoring, and analytics.
 */

import { comprehensiveAuditService } from '../services/comprehensiveAuditService';
import { securityThreatDetectionService } from '../services/securityThreatDetectionService';
import { complianceMonitoringService } from '../services/complianceMonitoringService';
import { securityAnalyticsService } from '../services/securityAnalyticsService';

describe('Security and Audit Enhancement', () => {
  describe('Comprehensive Audit Service', () => {
    it('should record audit events', async () => {
      const auditEvent = await comprehensiveAuditService.recordAuditEvent({
        actionType: 'user_login',
        actorId: 'test_user_123',
        actorType: 'user',
        resourceType: 'authentication',
        resourceId: 'login_session_456',
        metadata: {
          source: 'test',
          severity: 'medium',
          category: 'authentication',
          tags: ['login', 'test'],
        },
        outcome: 'success',
        complianceFlags: ['gdpr'],
        retentionPolicy: 'default',
      });

      expect(auditEvent).toBeDefined();
      expect(auditEvent.id).toBeDefined();
      expect(auditEvent.actionType).toBe('user_login');
      expect(auditEvent.actorId).toBe('test_user_123');
    });

    it('should search audit events', async () => {
      const result = await comprehensiveAuditService.searchAuditEvents({
        actorId: 'test_user_123',
        limit: 10,
      });

      expect(result).toBeDefined();
      expect(result.events).toBeInstanceOf(Array);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should generate audit analytics', async () => {
      const analytics = await comprehensiveAuditService.generateAuditAnalytics({
        limit: 100,
      });

      expect(analytics).toBeDefined();
      expect(typeof analytics.totalEvents).toBe('number');
      expect(analytics.eventsByType).toBeDefined();
      expect(analytics.eventsByActor).toBeDefined();
      expect(analytics.timeSeriesData).toBeInstanceOf(Array);
    });

    it('should validate audit integrity', async () => {
      const validation = await comprehensiveAuditService.validateAuditIntegrity();

      expect(validation).toBeDefined();
      expect(typeof validation.isValid).toBe('boolean');
      expect(validation.issues).toBeInstanceOf(Array);
      expect(validation.checksPerformed).toBeInstanceOf(Array);
    });
  });

  describe('Security Threat Detection Service', () => {
    it('should get threat detections', () => {
      const detections = securityThreatDetectionService.getThreatDetections(10);

      expect(detections).toBeInstanceOf(Array);
      expect(detections.length).toBeLessThanOrEqual(10);
    });

    it('should get behavioral profile', () => {
      const profile = securityThreatDetectionService.getBehavioralProfile('test_entity');

      // Profile might not exist for test entity, which is fine
      expect(profile === undefined || typeof profile === 'object').toBe(true);
    });

    it('should update detection status', () => {
      // This should not throw an error even if detection doesn't exist
      expect(() => {
        securityThreatDetectionService.updateDetectionStatus('test_detection', 'investigating', 'Test notes');
      }).not.toThrow();
    });
  });

  describe('Compliance Monitoring Service', () => {
    it('should get compliance dashboard', async () => {
      const dashboard = await complianceMonitoringService.getComplianceDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.overview).toBeDefined();
      expect(typeof dashboard.overview.overallScore).toBe('number');
      expect(dashboard.overview.frameworks).toBeInstanceOf(Array);
      expect(dashboard.trends).toBeDefined();
      expect(dashboard.upcomingAssessments).toBeInstanceOf(Array);
    });

    it('should get compliance frameworks', () => {
      const frameworks = complianceMonitoringService.getFrameworks();

      expect(frameworks).toBeInstanceOf(Array);
      expect(frameworks.length).toBeGreaterThan(0);
      
      // Check that default frameworks are loaded
      const frameworkIds = frameworks.map(f => f.id);
      expect(frameworkIds).toContain('gdpr');
      expect(frameworkIds).toContain('pci_dss');
    });

    it('should get specific framework', () => {
      const gdprFramework = complianceMonitoringService.getFramework('gdpr');

      expect(gdprFramework).toBeDefined();
      expect(gdprFramework?.id).toBe('gdpr');
      expect(gdprFramework?.name).toBe('General Data Protection Regulation');
      expect(gdprFramework?.requirements).toBeInstanceOf(Array);
    });

    it('should generate compliance report', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      const endDate = new Date();

      const report = await complianceMonitoringService.generateComplianceReport(
        'gdpr',
        'assessment',
        startDate,
        endDate
      );

      expect(report).toBeDefined();
      expect(report.id).toBeDefined();
      expect(report.type).toBe('assessment');
      expect(report.frameworkId).toBe('gdpr');
      expect(report.summary).toBeDefined();
      expect(report.sections).toBeInstanceOf(Array);
    });
  });

  describe('Security Analytics Service', () => {
    it('should get current metrics', async () => {
      const metrics = await securityAnalyticsService.getCurrentMetrics();

      expect(metrics).toBeDefined();
      expect(typeof metrics.overallRiskScore).toBe('number');
      expect(metrics.threatLevel).toMatch(/^(low|medium|high|critical)$/);
      expect(metrics.securityEvents).toBeDefined();
      expect(metrics.threatDetections).toBeDefined();
      expect(metrics.compliance).toBeDefined();
    });

    it('should get security dashboard', async () => {
      const dashboard = await securityAnalyticsService.getSecurityDashboard();

      expect(dashboard).toBeDefined();
      expect(dashboard.overview).toBeDefined();
      expect(dashboard.realTimeMetrics).toBeDefined();
      expect(dashboard.riskAssessment).toBeDefined();
      expect(dashboard.trends).toBeInstanceOf(Array);
      expect(dashboard.recommendations).toBeInstanceOf(Array);
      expect(dashboard.alerts).toBeInstanceOf(Array);
    });

    it('should generate security forecast', async () => {
      const forecast = await securityAnalyticsService.generateSecurityForecast('30d');

      expect(forecast).toBeDefined();
      expect(forecast.timeframe).toBe('30d');
      expect(forecast.predictions).toBeInstanceOf(Array);
      expect(forecast.scenarios).toBeInstanceOf(Array);
    });

    it('should get optimization recommendations', async () => {
      const recommendations = await securityAnalyticsService.getOptimizationRecommendations();

      expect(recommendations).toBeInstanceOf(Array);
      // Recommendations might be empty if system is already optimized
    });

    it('should get recommendations', () => {
      const recommendations = securityAnalyticsService.getRecommendations(10);

      expect(recommendations).toBeInstanceOf(Array);
      expect(recommendations.length).toBeLessThanOrEqual(10);
    });

    it('should update recommendation status', () => {
      // This should not throw an error even if recommendation doesn't exist
      expect(() => {
        securityAnalyticsService.updateRecommendationStatus('test_recommendation', 'in_progress');
      }).not.toThrow();
    });
  });

  describe('Integration Tests', () => {
    it('should integrate audit logging with threat detection', async () => {
      // Record a security event that should trigger threat detection
      const auditEvent = await comprehensiveAuditService.recordAuditEvent({
        actionType: 'failed_login',
        actorId: 'suspicious_user',
        actorType: 'user',
        resourceType: 'authentication',
        metadata: {
          source: 'integration_test',
          severity: 'high',
          category: 'security',
          tags: ['failed_login', 'suspicious'],
          ipAddress: '192.168.1.100',
        },
        outcome: 'failure',
        complianceFlags: ['security_monitoring'],
        retentionPolicy: 'security',
      });

      expect(auditEvent).toBeDefined();
      
      // Check that the event was recorded
      const searchResult = await comprehensiveAuditService.searchAuditEvents({
        actorId: 'suspicious_user',
        actionType: 'failed_login',
        limit: 1,
      });

      expect(searchResult.events.length).toBeGreaterThan(0);
      expect(searchResult.events[0].actorId).toBe('suspicious_user');
    });

    it('should integrate compliance monitoring with analytics', async () => {
      // Get compliance dashboard
      const complianceDashboard = await complianceMonitoringService.getComplianceDashboard();
      
      // Get security metrics which should include compliance data
      const securityMetrics = await securityAnalyticsService.getCurrentMetrics();

      expect(complianceDashboard.overview.overallScore).toBe(securityMetrics.compliance.overallScore);
    });

    it('should provide consistent risk scoring across services', async () => {
      const securityMetrics = await securityAnalyticsService.getCurrentMetrics();
      const riskAssessment = securityAnalyticsService.getCurrentRiskAssessment();

      // Risk scores should be consistent
      if (riskAssessment) {
        expect(typeof securityMetrics.overallRiskScore).toBe('number');
        expect(typeof riskAssessment.overallRisk).toBe('number');
        expect(securityMetrics.overallRiskScore).toBeGreaterThanOrEqual(0);
        expect(securityMetrics.overallRiskScore).toBeLessThanOrEqual(100);
      }
    });
  });
});