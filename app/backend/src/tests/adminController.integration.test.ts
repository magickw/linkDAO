import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { testApp } from './utils/testApp';
import { clearTestData } from './utils/testDatabase';

describe('Admin Controller Integration Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = await testApp();
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Policy Configuration Endpoints', () => {
    it('POST /api/admin/policies - should create policy configuration', async () => {
      const policyConfig = {
        name: 'Test Harassment Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 0.85,
        action: 'block',
        reputationModifier: -15,
        description: 'Policy for detecting harassment content',
        isActive: true
      };

      const response = await request(app)
        .post('/api/admin/policies')
        .send(policyConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        name: 'Test Harassment Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 0.85,
        action: 'block'
      });
      expect(response.body.data.id).toBeDefined();
    });

    it('GET /api/admin/policies - should retrieve policy configurations', async () => {
      // First create a policy
      const policyConfig = {
        name: 'Test Policy',
        category: 'spam',
        severity: 'medium',
        confidenceThreshold: 0.7,
        action: 'limit',
        reputationModifier: -5,
        isActive: true
      };

      await request(app)
        .post('/api/admin/policies')
        .send(policyConfig)
        .expect(201);

      // Then retrieve all policies
      const response = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Test Policy');
    });

    it('GET /api/admin/policies?activeOnly=true - should retrieve only active policies', async () => {
      // Create active and inactive policies
      const activePolicy = {
        name: 'Active Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 0.8,
        action: 'block',
        reputationModifier: -10,
        isActive: true
      };

      const inactivePolicy = {
        name: 'Inactive Policy',
        category: 'spam',
        severity: 'low',
        confidenceThreshold: 0.5,
        action: 'allow',
        reputationModifier: 0,
        isActive: false
      };

      await request(app).post('/api/admin/policies').send(activePolicy);
      await request(app).post('/api/admin/policies').send(inactivePolicy);

      const response = await request(app)
        .get('/api/admin/policies?activeOnly=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('Active Policy');
      expect(response.body.data[0].isActive).toBe(true);
    });

    it('PUT /api/admin/policies/:id - should update policy configuration', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Test Policy',
          category: 'harassment',
          severity: 'medium',
          confidenceThreshold: 0.7,
          action: 'review',
          reputationModifier: -5,
          isActive: true
        });

      const policyId = createResponse.body.data.id;

      // Update the policy
      const updateData = {
        severity: 'high',
        confidenceThreshold: 0.9,
        action: 'block',
        reputationModifier: -15
      };

      const response = await request(app)
        .put(`/api/admin/policies/${policyId}`)
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.severity).toBe('high');
      expect(response.body.data.confidenceThreshold).toBe(0.9);
      expect(response.body.data.action).toBe('block');
    });

    it('DELETE /api/admin/policies/:id - should delete policy configuration', async () => {
      // Create a policy first
      const createResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Test Policy',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        });

      const policyId = createResponse.body.data.id;

      // Delete the policy
      await request(app)
        .delete(`/api/admin/policies/${policyId}`)
        .expect(200);

      // Verify it's deleted
      const response = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      expect(response.body.data).toHaveLength(0);
    });
  });

  describe('Threshold Configuration Endpoints', () => {
    it('POST /api/admin/thresholds - should create threshold configuration', async () => {
      const thresholdConfig = {
        contentType: 'post',
        reputationTier: 'new_user',
        autoBlockThreshold: 0.95,
        quarantineThreshold: 0.75,
        publishThreshold: 0.3,
        escalationThreshold: 0.6,
        isActive: true
      };

      const response = await request(app)
        .post('/api/admin/thresholds')
        .send(thresholdConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject(thresholdConfig);
      expect(response.body.data.id).toBeDefined();
    });

    it('GET /api/admin/thresholds - should retrieve threshold configurations', async () => {
      const thresholdConfig = {
        contentType: 'comment',
        reputationTier: 'trusted_user',
        autoBlockThreshold: 0.9,
        quarantineThreshold: 0.6,
        publishThreshold: 0.2,
        escalationThreshold: 0.4,
        isActive: true
      };

      await request(app)
        .post('/api/admin/thresholds')
        .send(thresholdConfig);

      const response = await request(app)
        .get('/api/admin/thresholds')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].contentType).toBe('comment');
    });

    it('GET /api/admin/thresholds?contentType=post - should filter by content type', async () => {
      const configs = [
        {
          contentType: 'post',
          reputationTier: 'new_user',
          autoBlockThreshold: 0.95,
          quarantineThreshold: 0.75,
          publishThreshold: 0.3,
          escalationThreshold: 0.6,
          isActive: true
        },
        {
          contentType: 'comment',
          reputationTier: 'new_user',
          autoBlockThreshold: 0.9,
          quarantineThreshold: 0.7,
          publishThreshold: 0.25,
          escalationThreshold: 0.5,
          isActive: true
        }
      ];

      for (const config of configs) {
        await request(app).post('/api/admin/thresholds').send(config);
      }

      const response = await request(app)
        .get('/api/admin/thresholds?contentType=post')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].contentType).toBe('post');
    });
  });

  describe('Vendor Configuration Endpoints', () => {
    it('POST /api/admin/vendors - should create vendor configuration', async () => {
      const vendorConfig = {
        vendorName: 'OpenAI',
        serviceType: 'text_moderation',
        apiEndpoint: 'https://api.openai.com/v1/moderations',
        apiKeyRef: 'OPENAI_API_KEY',
        isEnabled: true,
        priority: 1,
        timeoutMs: 5000,
        retryAttempts: 3,
        rateLimitPerMinute: 60,
        costPerRequest: 0.002,
        healthCheckUrl: 'https://api.openai.com/v1/models',
        healthStatus: 'healthy'
      };

      const response = await request(app)
        .post('/api/admin/vendors')
        .send(vendorConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        vendorName: 'OpenAI',
        serviceType: 'text_moderation',
        isEnabled: true,
        priority: 1
      });
    });

    it('PATCH /api/admin/vendors/:id/health - should update vendor health status', async () => {
      // Create vendor first
      const createResponse = await request(app)
        .post('/api/admin/vendors')
        .send({
          vendorName: 'Test Vendor',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.001,
          healthStatus: 'healthy'
        });

      const vendorId = createResponse.body.data.id;

      // Update health status
      await request(app)
        .patch(`/api/admin/vendors/${vendorId}/health`)
        .send({ status: 'degraded' })
        .expect(200);

      // Verify update
      const response = await request(app)
        .get('/api/admin/vendors')
        .expect(200);

      const vendor = response.body.data.find((v: any) => v.id === vendorId);
      expect(vendor.healthStatus).toBe('degraded');
    });

    it('GET /api/admin/vendors?enabledOnly=true - should filter enabled vendors', async () => {
      const vendors = [
        {
          vendorName: 'Enabled Vendor',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.001,
          healthStatus: 'healthy'
        },
        {
          vendorName: 'Disabled Vendor',
          serviceType: 'image_moderation',
          isEnabled: false,
          priority: 2,
          timeoutMs: 10000,
          retryAttempts: 2,
          rateLimitPerMinute: 30,
          costPerRequest: 0.002,
          healthStatus: 'unknown'
        }
      ];

      for (const vendor of vendors) {
        await request(app).post('/api/admin/vendors').send(vendor);
      }

      const response = await request(app)
        .get('/api/admin/vendors?enabledOnly=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].vendorName).toBe('Enabled Vendor');
      expect(response.body.data[0].isEnabled).toBe(true);
    });
  });

  describe('Alert Configuration Endpoints', () => {
    it('POST /api/admin/alerts - should create alert configuration', async () => {
      const alertConfig = {
        alertName: 'High Error Rate Alert',
        metricName: 'error_rate',
        conditionType: 'greater_than',
        thresholdValue: 0.05,
        severity: 'critical',
        notificationChannels: ['email', 'slack'],
        isActive: true,
        cooldownMinutes: 15
      };

      const response = await request(app)
        .post('/api/admin/alerts')
        .send(alertConfig)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toMatchObject({
        alertName: 'High Error Rate Alert',
        metricName: 'error_rate',
        severity: 'critical',
        isActive: true
      });
      expect(response.body.data.notificationChannels).toEqual(['email', 'slack']);
    });

    it('GET /api/admin/alerts?activeOnly=true - should retrieve active alerts', async () => {
      const alerts = [
        {
          alertName: 'Active Alert',
          metricName: 'latency',
          conditionType: 'greater_than',
          thresholdValue: 1000,
          severity: 'warning',
          notificationChannels: ['email'],
          isActive: true,
          cooldownMinutes: 10
        },
        {
          alertName: 'Inactive Alert',
          metricName: 'throughput',
          conditionType: 'less_than',
          thresholdValue: 100,
          severity: 'info',
          notificationChannels: ['slack'],
          isActive: false,
          cooldownMinutes: 5
        }
      ];

      for (const alert of alerts) {
        await request(app).post('/api/admin/alerts').send(alert);
      }

      const response = await request(app)
        .get('/api/admin/alerts?activeOnly=true')
        .expect(200);

      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].alertName).toBe('Active Alert');
      expect(response.body.data[0].isActive).toBe(true);
    });
  });

  describe('System Status Dashboard Endpoints', () => {
    it('GET /api/admin/dashboard/metrics - should retrieve dashboard metrics', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/metrics')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('moderationStats');
      expect(response.body.data).toHaveProperty('vendorHealth');
      expect(response.body.data).toHaveProperty('communityReports');
      expect(response.body.data).toHaveProperty('appeals');
      expect(response.body.data).toHaveProperty('performance');
      expect(response.body.data).toHaveProperty('costs');
    });

    it('GET /api/admin/dashboard/metrics with date range - should filter by date', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/dashboard/metrics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toBeDefined();
    });

    it('GET /api/admin/dashboard/status - should retrieve system status', async () => {
      const response = await request(app)
        .get('/api/admin/dashboard/status')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('status');
      expect(response.body.data).toHaveProperty('components');
      expect(response.body.data).toHaveProperty('alerts');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.data.status);
      expect(response.body.data.components).toHaveProperty('vendors');
      expect(response.body.data.components).toHaveProperty('moderation');
    });

    it('GET /api/admin/dashboard/historical - should retrieve historical metrics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      const metricNames = 'latency,throughput,error_rate';

      const response = await request(app)
        .get(`/api/admin/dashboard/historical?metricNames=${metricNames}&startDate=${startDate}&endDate=${endDate}&granularity=hour`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('latency');
      expect(response.body.data).toHaveProperty('throughput');
      expect(response.body.data).toHaveProperty('error_rate');

      expect(Array.isArray(response.body.data.latency)).toBe(true);
      expect(Array.isArray(response.body.data.throughput)).toBe(true);
      expect(Array.isArray(response.body.data.error_rate)).toBe(true);
    });
  });

  describe('Audit Log Analysis Endpoints', () => {
    beforeEach(async () => {
      // Create some audit data by making configuration changes
      await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Test Policy for Audit',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        });
    });

    it('GET /api/admin/audit/search - should search audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit/search?action=create&resourceType=policy_configuration&limit=10')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('logs');
      expect(response.body.data).toHaveProperty('total');
      expect(response.body.data).toHaveProperty('hasMore');

      expect(Array.isArray(response.body.data.logs)).toBe(true);
      expect(typeof response.body.data.total).toBe('number');
      expect(typeof response.body.data.hasMore).toBe('boolean');
    });

    it('GET /api/admin/audit/analytics - should retrieve audit analytics', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/audit/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('totalActions');
      expect(response.body.data).toHaveProperty('actionsByType');
      expect(response.body.data).toHaveProperty('actionsByAdmin');
      expect(response.body.data).toHaveProperty('actionsOverTime');
      expect(response.body.data).toHaveProperty('topAdmins');
      expect(response.body.data).toHaveProperty('suspiciousActivity');
    });

    it('GET /api/admin/audit/compliance - should generate compliance report', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/audit/compliance?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveProperty('period');
      expect(response.body.data).toHaveProperty('totalChanges');
      expect(response.body.data).toHaveProperty('configurationChanges');
      expect(response.body.data).toHaveProperty('adminActivity');
      expect(response.body.data).toHaveProperty('dataRetentionCompliance');
    });

    it('GET /api/admin/audit/export - should export audit logs as JSON', async () => {
      const response = await request(app)
        .get('/api/admin/audit/export?format=json&limit=100')
        .expect(200);

      expect(response.headers['content-type']).toContain('application/json');
      expect(response.headers['content-disposition']).toContain('attachment');
      
      // Response should be valid JSON
      const data = JSON.parse(response.text);
      expect(Array.isArray(data)).toBe(true);
    });

    it('GET /api/admin/audit/export - should export audit logs as CSV', async () => {
      const response = await request(app)
        .get('/api/admin/audit/export?format=csv&limit=100')
        .expect(200);

      expect(response.headers['content-type']).toContain('text/csv');
      expect(response.headers['content-disposition']).toContain('attachment');
      expect(response.text).toContain('ID,Admin ID,Action,Resource Type');
    });

    it('GET /api/admin/audit/violations - should detect policy violations', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const response = await request(app)
        .get(`/api/admin/audit/violations?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);

      // Each violation should have required properties
      response.body.data.forEach((violation: any) => {
        expect(violation).toHaveProperty('type');
        expect(violation).toHaveProperty('description');
        expect(violation).toHaveProperty('adminId');
        expect(violation).toHaveProperty('timestamp');
        expect(violation).toHaveProperty('severity');
        expect(['low', 'medium', 'high']).toContain(violation.severity);
      });
    });

    it('GET /api/admin/audit/logs - should retrieve audit logs', async () => {
      const response = await request(app)
        .get('/api/admin/audit/logs?limit=50')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(Array.isArray(response.body.data)).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle invalid policy configuration data', async () => {
      const invalidConfig = {
        name: '', // Invalid: empty name
        category: 'invalid_category',
        severity: 'invalid_severity',
        confidenceThreshold: 1.5, // Invalid: > 1
        action: 'invalid_action'
      };

      const response = await request(app)
        .post('/api/admin/policies')
        .send(invalidConfig)
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle non-existent resource updates', async () => {
      const response = await request(app)
        .put('/api/admin/policies/99999')
        .send({ name: 'Updated Name' })
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });

    it('should handle invalid date ranges in analytics', async () => {
      const response = await request(app)
        .get('/api/admin/audit/analytics?startDate=invalid-date&endDate=also-invalid')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBeDefined();
    });
  });
});
