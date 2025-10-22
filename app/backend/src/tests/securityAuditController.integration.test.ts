/**
 * Security Audit Controller Integration Tests
 * Test the REST API endpoints for security audit logging
 */

import request from 'supertest';
import express from 'express';
import securityAuditRoutes from '../routes/securityAuditRoutes';
import { securityAuditLoggingService } from '../services/securityAuditLoggingService';

const app = express();
app.use(express.json());

// Mock middleware
app.use((req, res, next) => {
  req.user = { id: 'test-user', role: 'admin' };
  next();
});

app.use('/api/security-audit', securityAuditRoutes);

describe('Security Audit Controller Integration Tests', () => {
  beforeAll(async () => {
    await securityAuditLoggingService.initialize();
  });

  beforeEach(async () => {
    // Clear events before each test
    securityAuditLoggingService['auditEvents'].clear();
    securityAuditLoggingService['eventBuffer'] = [];
  });

  describe('POST /api/security-audit/events/authentication', () => {
    it('should log authentication event successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/authentication')
        .send({
          userId: 'user123',
          action: 'login',
          outcome: 'success',
          details: { method: 'password' }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
      expect(response.body.data.eventId).toMatch(/^audit_\d+_[a-z0-9]+$/);
    });

    it('should handle authentication failure events', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/authentication')
        .send({
          userId: 'user123',
          action: 'login',
          outcome: 'failure',
          details: { reason: 'invalid_password' }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
    });
  });

  describe('POST /api/security-audit/events/data-access', () => {
    it('should log data access event successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/data-access')
        .send({
          userId: 'user123',
          resource: 'user_profiles',
          action: 'read',
          outcome: 'success',
          details: { recordCount: 5 }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
    });

    it('should require all mandatory fields', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/data-access')
        .send({
          userId: 'user123',
          // Missing resource, action, outcome
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/security-audit/events/admin-action', () => {
    it('should log admin action successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/admin-action')
        .send({
          adminUserId: 'admin123',
          action: 'delete_user',
          targetResource: 'user_management',
          outcome: 'success',
          details: { targetUserId: 'user456' }
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
    });

    it('should require all mandatory fields for admin actions', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/admin-action')
        .send({
          adminUserId: 'admin123',
          // Missing action, targetResource, outcome
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/security-audit/events/security-incident', () => {
    it('should log security incident successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/security-incident')
        .send({
          incidentType: 'brute_force_attack',
          severity: 'critical',
          details: {
            attemptCount: 50,
            timeWindow: '5 minutes',
            targetUser: 'admin'
          },
          threatIndicators: ['suspicious_ip', 'high_frequency']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.eventId).toBeDefined();
    });

    it('should require mandatory fields for security incidents', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/security-incident')
        .send({
          incidentType: 'brute_force_attack',
          // Missing severity and details
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/security-audit/events', () => {
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

    it('should query all events without filters', async () => {
      const response = await request(app)
        .get('/api/security-audit/events')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.pagination).toBeDefined();
    });

    it('should filter events by category', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?categories=authentication')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach((event: any) => {
        expect(event.category).toBe('authentication');
      });
    });

    it('should filter events by severity', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?severities=warning')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach((event: any) => {
        expect(event.severity).toBe('warning');
      });
    });

    it('should filter events by user ID', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?userIds=user1')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach((event: any) => {
        expect(event.userId).toBe('user1');
      });
    });

    it('should filter events by risk score range', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?riskScoreMin=5.0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      response.body.data.forEach((event: any) => {
        expect(event.riskScore).toBeGreaterThanOrEqual(5.0);
      });
    });

    it('should apply pagination', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?limit=2&offset=0')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      expect(response.body.data.length).toBeLessThanOrEqual(2);
      expect(response.body.pagination.limit).toBe(2);
      expect(response.body.pagination.offset).toBe(0);
    });

    it('should sort events by timestamp', async () => {
      const response = await request(app)
        .get('/api/security-audit/events?sortBy=timestamp&sortOrder=desc')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeInstanceOf(Array);
      
      if (response.body.data.length > 1) {
        for (let i = 1; i < response.body.data.length; i++) {
          const prev = new Date(response.body.data[i - 1].timestamp);
          const curr = new Date(response.body.data[i].timestamp);
          expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
        }
      }
    });
  });

  describe('POST /api/security-audit/reports/generate', () => {
    beforeEach(async () => {
      // Set up test events for reporting
      await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );
      await securityAuditLoggingService.logSecurityIncident(
        'suspicious_activity',
        'critical',
        '10.0.0.1',
        { description: 'Test incident' }
      );
    });

    it('should generate audit report successfully', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .post('/api/security-audit/reports/generate')
        .send({
          startDate: yesterday.toISOString(),
          endDate: now.toISOString(),
          includeRecommendations: true
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reportId).toBeDefined();
      expect(response.body.data.summary).toBeDefined();
      expect(response.body.data.trends).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
    });

    it('should require start and end dates', async () => {
      const response = await request(app)
        .post('/api/security-audit/reports/generate')
        .send({
          // Missing startDate and endDate
          includeRecommendations: true
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/security-audit/statistics', () => {
    beforeEach(async () => {
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
    });

    it('should return audit statistics', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/security-audit/statistics?startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalEvents).toBeDefined();
      expect(response.body.data.eventsByCategory).toBeDefined();
      expect(response.body.data.eventsBySeverity).toBeDefined();
      expect(response.body.data.averageRiskScore).toBeDefined();
      expect(response.body.data.highRiskEvents).toBeDefined();
      expect(response.body.data.criticalEvents).toBeDefined();
      expect(response.body.data.failedEvents).toBeDefined();
      expect(response.body.data.uniqueUsers).toBeDefined();
      expect(response.body.data.uniqueIpAddresses).toBeDefined();
    });

    it('should require start and end dates for statistics', async () => {
      const response = await request(app)
        .get('/api/security-audit/statistics')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/security-audit/compliance/summary', () => {
    beforeEach(async () => {
      await securityAuditLoggingService.logDataAccessEvent(
        'user1',
        'personal_data',
        'read',
        'success',
        '192.168.1.1'
      );
    });

    it('should return compliance summary', async () => {
      const now = new Date();
      const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      const response = await request(app)
        .get(`/api/security-audit/compliance/summary?startDate=${yesterday.toISOString()}&endDate=${now.toISOString()}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalComplianceEvents).toBeDefined();
      expect(response.body.data.complianceByRegulation).toBeDefined();
      expect(response.body.data.complianceViolations).toBeDefined();
      expect(response.body.data.gdprEvents).toBeDefined();
      expect(response.body.data.soxEvents).toBeDefined();
      expect(response.body.data.hipaaEvents).toBeDefined();
      expect(response.body.data.iso27001Events).toBeDefined();
    });
  });

  describe('POST /api/security-audit/compliance/rules', () => {
    it('should create compliance rule successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/compliance/rules')
        .send({
          name: 'Test GDPR Rule',
          description: 'Test rule for GDPR compliance',
          regulation: 'GDPR',
          eventTypes: ['data_access'],
          conditions: { resource: { contains: ['personal_data'] } },
          actions: ['log_compliance'],
          severity: 'medium'
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.ruleId).toBeDefined();
      expect(response.body.data.ruleId).toMatch(/^rule_\d+_[a-z0-9]+$/);
    });

    it('should require mandatory fields for compliance rules', async () => {
      const response = await request(app)
        .post('/api/security-audit/compliance/rules')
        .send({
          name: 'Test Rule',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('POST /api/security-audit/retention/policies', () => {
    it('should create retention policy successfully', async () => {
      const response = await request(app)
        .post('/api/security-audit/retention/policies')
        .send({
          name: 'Test Retention Policy',
          description: 'Test policy for data retention',
          categories: ['authentication'],
          retentionPeriodDays: 365,
          archiveAfterDays: 90,
          encryptionRequired: true,
          complianceRequirements: ['GDPR']
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.policyId).toBeDefined();
      expect(response.body.data.policyId).toMatch(/^policy_\d+_[a-z0-9]+$/);
    });

    it('should require mandatory fields for retention policies', async () => {
      const response = await request(app)
        .post('/api/security-audit/retention/policies')
        .send({
          name: 'Test Policy',
          // Missing required fields
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });

  describe('GET /api/security-audit/export', () => {
    beforeEach(async () => {
      await securityAuditLoggingService.logAuthenticationEvent(
        'user1',
        'login',
        'success',
        '192.168.1.1'
      );
    });

    it('should export audit data in JSON format', async () => {
      const response = await request(app)
        .get('/api/security-audit/export?format=json&encrypt=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.exportId).toBeDefined();
      expect(response.body.data.format).toBe('json');
      expect(response.body.data.encrypted).toBe(false);
    });

    it('should export audit data in CSV format', async () => {
      const response = await request(app)
        .get('/api/security-audit/export?format=csv&encrypt=false')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.format).toBe('csv');
    });

    it('should export encrypted audit data', async () => {
      const response = await request(app)
        .get('/api/security-audit/export?format=json&encrypt=true')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.encrypted).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      // Mock service to throw error
      const originalMethod = securityAuditLoggingService.logAuthenticationEvent;
      securityAuditLoggingService.logAuthenticationEvent = jest.fn().mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .post('/api/security-audit/events/authentication')
        .send({
          userId: 'user123',
          action: 'login',
          outcome: 'success'
        })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();

      // Restore original method
      securityAuditLoggingService.logAuthenticationEvent = originalMethod;
    });

    it('should validate request data', async () => {
      const response = await request(app)
        .post('/api/security-audit/events/data-access')
        .send({
          // Invalid/missing data
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toContain('required');
    });
  });
});