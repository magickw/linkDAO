/**
 * Security Audit Logging Service Tests
 * Comprehensive test suite for security audit logging functionality
 */

import { securityAuditLoggingService, SecurityAuditEvent } from '../services/securityAuditLoggingService';

describe('SecurityAuditLoggingService', () => {
  beforeAll(async () => {
    await securityAuditLoggingService.initialize();
  });

  afterEach(() => {
    // Clear events after each test
    securityAuditLoggingService['auditEvents'].clear();
    securityAuditLoggingService['eventBuffer'] = [];
  });

  describe('Event Logging', () => {
    it('should log a basic security event', async () => {
      const eventId = await securityAuditLoggingService.logSecurityEvent({
        category: 'authentication',
        eventType: 'user_login',
        severity: 'info',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        resource: 'login_system',
        action: 'login_attempt',
        outcome: 'success',
        details: { method: 'password' },
        riskScore: 2.0,
        complianceFlags: ['GDPR']
      });

      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^audit_\d+_[a-z0-9]+$/);
    });

    it('should log authentication events with proper risk scoring', async () => {
      // Successful login
      const successEventId = await securityAuditLoggingService.logAuthenticationEvent(
        'user123',
        'login',
        'success',
        '192.168.1.1',
        { method: 'password' }
      );

      // Failed login
      const failureEventId = await securityAuditLoggingService.logAuthenticationEvent(
        'user123',
        'login',
        'failure',
        '192.168.1.1',
        { method: 'password', reason: 'invalid_credentials' }
      );

      expect(successEventId).toBeDefined();
      expect(failureEventId).toBeDefined();

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const successEvent = events.find(e => e.eventId === successEventId);
      const failureEvent = events.find(e => e.eventId === failureEventId);

      expect(successEvent?.riskScore).toBeLessThan(failureEvent?.riskScore || 0);
    });

    it('should log data access events with appropriate risk calculation', async () => {
      const eventId = await securityAuditLoggingService.logDataAccessEvent(
        'user123',
        'user_data',
        'read',
        'success',
        '192.168.1.1',
        { recordCount: 10 }
      );

      expect(eventId).toBeDefined();

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const event = events.find(e => e.eventId === eventId);

      expect(event?.category).toBe('data_access');
      expect(event?.riskScore).toBeGreaterThan(2.0); // Sensitive resource access
    });

    it('should log admin actions with high risk scores', async () => {
      const eventId = await securityAuditLoggingService.logAdminAction(
        'admin123',
        'delete_user',
        'user_management',
        'success',
        '192.168.1.100',
        { targetUserId: 'user456' }
      );

      expect(eventId).toBeDefined();

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const event = events.find(e => e.eventId === eventId);

      expect(event?.category).toBe('admin_action');
      expect(event?.riskScore).toBeGreaterThan(4.0); // Admin actions have higher base risk
    });

    it('should log security incidents with threat indicators', async () => {
      const eventId = await securityAuditLoggingService.logSecurityIncident(
        'brute_force_attack',
        'critical',
        '10.0.0.1',
        { attemptCount: 50, timeWindow: '5 minutes' },
        ['suspicious_ip', 'high_frequency_attempts']
      );

      expect(eventId).toBeDefined();

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const event = events.find(e => e.eventId === eventId);

      expect(event?.category).toBe('security_event');
      expect(event?.severity).toBe('critical');
      expect(event?.threatIndicators).toContain('suspicious_ip');
      expect(event?.riskScore).toBeGreaterThan(8.0);
    });
  });

  describe('Event Querying', () => {
    beforeEach(async () => {
      // Set up test events
      await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );
      await securityAuditLoggingService.logAuthenticationEvent(
        'user2',
        'login',
        'failure',
        '192.168.1.2'
      );
      await securityAuditLoggingService.logDataAccessEvent(
        'user1',
        'sensitive_data',
        'read',
        'success',
        '192.168.1.1'
      );
    });

    it('should query events by category', async () => {
      const authEvents = await securityAuditLoggingService.queryAuditEvents({
        categories: ['authentication']
      });

      expect(authEvents).toHaveLength(2);
      authEvents.forEach(event => {
        expect(event.category).toBe('authentication');
      });
    });

    it('should query events by severity', async () => {
      const warningEvents = await securityAuditLoggingService.queryAuditEvents({
        severities: ['warning']
      });

      expect(warningEvents.length).toBeGreaterThan(0);
      warningEvents.forEach(event => {
        expect(event.severity).toBe('warning');
      });
    });

    it('should query events by user ID', async () => {
      const user1Events = await securityAuditLoggingService.queryAuditEvents({
        userIds: ['user1']
      });

      expect(user1Events.length).toBeGreaterThan(0);
      user1Events.forEach(event => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should query events by IP address', async () => {
      const ipEvents = await securityAuditLoggingService.queryAuditEvents({
        ipAddresses: ['192.168.1.1']
      });

      expect(ipEvents.length).toBeGreaterThan(0);
      ipEvents.forEach(event => {
        expect(event.ipAddress).toBe('192.168.1.1');
      });
    });

    it('should query events by risk score range', async () => {
      const highRiskEvents = await securityAuditLoggingService.queryAuditEvents({
        riskScoreMin: 5.0
      });

      highRiskEvents.forEach(event => {
        expect(event.riskScore).toBeGreaterThanOrEqual(5.0);
      });
    });

    it('should query events by date range', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

      const recentEvents = await securityAuditLoggingService.queryAuditEvents({
        startDate: oneHourAgo,
        endDate: now
      });

      recentEvents.forEach(event => {
        expect(event.timestamp).toBeInstanceOf(Date);
        expect(event.timestamp.getTime()).toBeGreaterThanOrEqual(oneHourAgo.getTime());
        expect(event.timestamp.getTime()).toBeLessThanOrEqual(now.getTime());
      });
    });

    it('should apply pagination correctly', async () => {
      const page1 = await securityAuditLoggingService.queryAuditEvents({
        limit: 2,
        offset: 0
      });

      const page2 = await securityAuditLoggingService.queryAuditEvents({
        limit: 2,
        offset: 2
      });

      expect(page1).toHaveLength(2);
      expect(page2.length).toBeLessThanOrEqual(2);

      // Ensure no overlap
      const page1Ids = page1.map(e => e.eventId);
      const page2Ids = page2.map(e => e.eventId);
      const intersection = page1Ids.filter(id => page2Ids.includes(id));
      expect(intersection).toHaveLength(0);
    });

    it('should sort events correctly', async () => {
      const eventsByTimestamp = await securityAuditLoggingService.queryAuditEvents({
        sortBy: 'timestamp',
        sortOrder: 'desc'
      });

      for (let i = 1; i < eventsByTimestamp.length; i++) {
        expect(eventsByTimestamp[i - 1].timestamp.getTime())
          .toBeGreaterThanOrEqual(eventsByTimestamp[i].timestamp.getTime());
      }

      const eventsByRisk = await securityAuditLoggingService.queryAuditEvents({
        sortBy: 'riskScore',
        sortOrder: 'desc'
      });

      for (let i = 1; i < eventsByRisk.length; i++) {
        expect(eventsByRisk[i - 1].riskScore)
          .toBeGreaterThanOrEqual(eventsByRisk[i].riskScore);
      }
    });
  });

  describe('Audit Reporting', () => {
    beforeEach(async () => {
      // Set up test events for reporting
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );
      await securityAuditLoggingService.logAuthenticationEvent(
        'user2',
        'login',
        'failure',
        '192.168.1.2'
      );
      await securityAuditLoggingService.logSecurityIncident(
        'suspicious_activity',
        'critical',
        '10.0.0.1',
        { description: 'Multiple failed login attempts' }
      );
    });

    it('should generate comprehensive audit report', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const report = await securityAuditLoggingService.generateAuditReport(
        yesterday,
        now,
        true
      );

      expect(report.reportId).toBeDefined();
      expect(report.generatedAt).toBeInstanceOf(Date);
      expect(report.timeRange.start).toEqual(yesterday);
      expect(report.timeRange.end).toEqual(now);

      expect(report.summary.totalEvents).toBeGreaterThan(0);
      expect(report.summary.eventsByCategory).toBeDefined();
      expect(report.summary.eventsBySeverity).toBeDefined();
      expect(report.summary.topRiskEvents).toBeDefined();
      expect(report.summary.suspiciousActivities).toBeDefined();

      expect(report.trends.dailyEventCounts).toBeDefined();
      expect(report.trends.riskScoreTrend).toBeDefined();
      expect(report.trends.topUsers).toBeDefined();
      expect(report.trends.topIpAddresses).toBeDefined();

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should include recommendations in report', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const report = await securityAuditLoggingService.generateAuditReport(
        yesterday,
        now,
        true
      );

      expect(report.recommendations).toBeDefined();
      expect(Array.isArray(report.recommendations)).toBe(true);
    });

    it('should exclude recommendations when requested', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const report = await securityAuditLoggingService.generateAuditReport(
        yesterday,
        now,
        false
      );

      expect(report.recommendations).toHaveLength(0);
    });
  });

  describe('Compliance Rules', () => {
    it('should create compliance rule', async () => {
      const ruleId = await securityAuditLoggingService.createComplianceRule({
        name: 'Test GDPR Rule',
        description: 'Test rule for GDPR compliance',
        regulation: 'GDPR',
        eventTypes: ['data_access'],
        conditions: { resource: { contains: ['personal_data'] } },
        actions: ['log_compliance'],
        isActive: true,
        severity: 'medium'
      });

      expect(ruleId).toBeDefined();
      expect(ruleId).toMatch(/^rule_\d+_[a-z0-9]+$/);
    });

    it('should apply compliance rules to events', async () => {
      // Create a compliance rule
      await securityAuditLoggingService.createComplianceRule({
        name: 'Personal Data Access Rule',
        description: 'Flag personal data access for GDPR',
        regulation: 'GDPR',
        eventTypes: ['data_access'],
        conditions: { resource: { contains: ['personal_data'] } },
        actions: ['log_compliance'],
        isActive: true,
        severity: 'medium'
      });

      // Log an event that should trigger the rule
      const eventId = await securityAuditLoggingService.logDataAccessEvent(
        'user123',
        'personal_data_table',
        'read',
        'success',
        '192.168.1.1'
      );

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const event = events.find(e => e.eventId === eventId);

      expect(event?.complianceFlags).toContain('GDPR');
    });
  });

  describe('Retention Policies', () => {
    it('should create retention policy', async () => {
      const policyId = await securityAuditLoggingService.createRetentionPolicy({
        name: 'Test Retention Policy',
        description: 'Test policy for data retention',
        categories: ['authentication'],
        retentionPeriodDays: 365,
        archiveAfterDays: 90,
        encryptionRequired: true,
        complianceRequirements: ['GDPR'],
        isActive: true
      });

      expect(policyId).toBeDefined();
      expect(policyId).toMatch(/^policy_\d+_[a-z0-9]+$/);
    });
  });

  describe('Data Export', () => {
    beforeEach(async () => {
      await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );
    });

    it('should export audit data in JSON format', async () => {
      const exportId = await securityAuditLoggingService.exportAuditData(
        {},
        'json',
        false
      );

      expect(exportId).toBeDefined();
      expect(exportId).toMatch(/^export_\d+_[a-z0-9]+$/);
    });

    it('should export audit data in CSV format', async () => {
      const exportId = await securityAuditLoggingService.exportAuditData(
        {},
        'csv',
        false
      );

      expect(exportId).toBeDefined();
    });

    it('should export audit data in XML format', async () => {
      const exportId = await securityAuditLoggingService.exportAuditData(
        {},
        'xml',
        false
      );

      expect(exportId).toBeDefined();
    });

    it('should export encrypted audit data', async () => {
      const exportId = await securityAuditLoggingService.exportAuditData(
        {},
        'json',
        true
      );

      expect(exportId).toBeDefined();
    });
  });

  describe('Risk Scoring', () => {
    it('should calculate higher risk for failed operations', async () => {
      const successEventId = await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );

      const failureEventId = await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'failure',
        '192.168.1.1'
      );

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const successEvent = events.find(e => e.eventId === successEventId);
      const failureEvent = events.find(e => e.eventId === failureEventId);

      expect(failureEvent?.riskScore).toBeGreaterThan(successEvent?.riskScore || 0);
    });

    it('should calculate higher risk for sensitive resources', async () => {
      const normalEventId = await securityAuditLoggingService.logDataAccessEvent(
        'user1',
        'public_data',
        'read',
        'success',
        '192.168.1.1'
      );

      const sensitiveEventId = await securityAuditLoggingService.logDataAccessEvent(
        'user1',
        'payment_info',
        'read',
        'success',
        '192.168.1.1'
      );

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const normalEvent = events.find(e => e.eventId === normalEventId);
      const sensitiveEvent = events.find(e => e.eventId === sensitiveEventId);

      expect(sensitiveEvent?.riskScore).toBeGreaterThan(normalEvent?.riskScore || 0);
    });

    it('should calculate higher risk for admin actions', async () => {
      const readEventId = await securityAuditLoggingService.logAdminAction(
        'admin1',
        'view_users',
        'user_management',
        'success',
        '192.168.1.100'
      );

      const deleteEventId = await securityAuditLoggingService.logAdminAction(
        'admin1',
        'delete_user',
        'user_management',
        'success',
        '192.168.1.100'
      );

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const readEvent = events.find(e => e.eventId === readEventId);
      const deleteEvent = events.find(e => e.eventId === deleteEventId);

      expect(deleteEvent?.riskScore).toBeGreaterThan(readEvent?.riskScore || 0);
    });
  });

  describe('Event Enrichment', () => {
    it('should enrich events with device fingerprint', async () => {
      const eventId = await securityAuditLoggingService.logSecurityEvent({
        category: 'authentication',
        eventType: 'login',
        severity: 'info',
        userId: 'user123',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        resource: 'login_system',
        action: 'login',
        outcome: 'success',
        details: {},
        riskScore: 2.0,
        complianceFlags: []
      });

      const events = await securityAuditLoggingService.queryAuditEvents({});
      const event = events.find(e => e.eventId === eventId);

      expect(event?.deviceFingerprint).toBeDefined();
      expect(event?.deviceFingerprint).toMatch(/^[a-f0-9]{16}$/);
    });
  });
});