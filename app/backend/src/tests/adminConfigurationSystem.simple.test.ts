import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { testApp } from './utils/testApp';
import { clearTestData } from './utils/testDatabase';

describe('Admin Configuration System - Simple Integration Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = await testApp();
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Admin Routes Integration', () => {
    it('should have all admin routes accessible', async () => {
      // Test policy routes
      await request(app).get('/api/admin/policies').expect(200);
      
      // Test threshold routes
      await request(app).get('/api/admin/thresholds').expect(200);
      
      // Test vendor routes
      await request(app).get('/api/admin/vendors').expect(200);
      
      // Test alert routes
      await request(app).get('/api/admin/alerts').expect(200);
      
      // Test dashboard routes
      await request(app).get('/api/admin/dashboard/metrics').expect(200);
      await request(app).get('/api/admin/dashboard/status').expect(200);
      
      // Test audit routes
      await request(app).get('/api/admin/audit/search').expect(200);
      await request(app).get('/api/admin/audit/logs').expect(200);
    });

    it('should create and manage a complete configuration workflow', async () => {
      // 1. Create a policy configuration
      const policyResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Integration Test Policy',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          description: 'Test policy for integration',
          isActive: true
        })
        .expect(201);

      expect(policyResponse.body.success).toBe(true);
      const policyId = policyResponse.body.data.id;

      // 2. Create a threshold configuration
      const thresholdResponse = await request(app)
        .post('/api/admin/thresholds')
        .send({
          contentType: 'post',
          reputationTier: 'new_user',
          autoBlockThreshold: 0.95,
          quarantineThreshold: 0.7,
          publishThreshold: 0.3,
          escalationThreshold: 0.5,
          isActive: true
        })
        .expect(201);

      expect(thresholdResponse.body.success).toBe(true);
      const thresholdId = thresholdResponse.body.data.id;

      // 3. Create a vendor configuration
      const vendorResponse = await request(app)
        .post('/api/admin/vendors')
        .send({
          vendorName: 'Integration Test Vendor',
          serviceType: 'text_moderation',
          apiEndpoint: 'https://api.example.com/moderate',
          apiKeyRef: 'TEST_API_KEY',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.001,
          healthStatus: 'healthy'
        })
        .expect(201);

      expect(vendorResponse.body.success).toBe(true);
      const vendorId = vendorResponse.body.data.id;

      // 4. Create an alert configuration
      const alertResponse = await request(app)
        .post('/api/admin/alerts')
        .send({
          alertName: 'Integration Test Alert',
          metricName: 'error_rate',
          conditionType: 'greater_than',
          thresholdValue: 0.05,
          severity: 'warning',
          notificationChannels: ['email'],
          isActive: true,
          cooldownMinutes: 10
        })
        .expect(201);

      expect(alertResponse.body.success).toBe(true);
      const alertId = alertResponse.body.data.id;

      // 5. Verify all configurations exist
      const allPoliciesResponse = await request(app).get('/api/admin/policies').expect(200);
      expect(allPoliciesResponse.body.data.some((p: any) => p.id === policyId)).toBe(true);

      const allThresholdsResponse = await request(app).get('/api/admin/thresholds').expect(200);
      expect(allThresholdsResponse.body.data.some((t: any) => t.id === thresholdId)).toBe(true);

      const allVendorsResponse = await request(app).get('/api/admin/vendors').expect(200);
      expect(allVendorsResponse.body.data.some((v: any) => v.id === vendorId)).toBe(true);

      const allAlertsResponse = await request(app).get('/api/admin/alerts').expect(200);
      expect(allAlertsResponse.body.data.some((a: any) => a.id === alertId)).toBe(true);

      // 6. Check audit logs were created
      const auditLogsResponse = await request(app).get('/api/admin/audit/search?limit=10').expect(200);
      expect(auditLogsResponse.body.success).toBe(true);
      expect(auditLogsResponse.body.data.logs.length).toBeGreaterThan(0);

      // Verify audit logs contain our operations
      const logs = auditLogsResponse.body.data.logs;
      const hasCreateActions = logs.some((log: any) => log.action === 'create');
      expect(hasCreateActions).toBe(true);

      // 7. Test dashboard metrics
      const metricsResponse = await request(app).get('/api/admin/dashboard/metrics').expect(200);
      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toHaveProperty('moderationStats');
      expect(metricsResponse.body.data).toHaveProperty('vendorHealth');

      // 8. Test system status
      const statusResponse = await request(app).get('/api/admin/dashboard/status').expect(200);
      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('status');
      expect(statusResponse.body.data).toHaveProperty('components');
    });

    it('should handle configuration updates and maintain audit trail', async () => {
      // Create initial configuration
      const createResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Update Test Policy',
          category: 'spam',
          severity: 'medium',
          confidenceThreshold: 0.7,
          action: 'review',
          reputationModifier: -5,
          isActive: true
        })
        .expect(201);

      const policyId = createResponse.body.data.id;

      // Update the configuration
      const updateResponse = await request(app)
        .put(`/api/admin/policies/${policyId}`)
        .send({
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10
        })
        .expect(200);

      expect(updateResponse.body.data.confidenceThreshold).toBe(0.8);
      expect(updateResponse.body.data.action).toBe('block');

      // Check audit trail
      const auditResponse = await request(app)
        .get('/api/admin/audit/search?resourceType=policy_configuration&limit=10')
        .expect(200);

      const logs = auditResponse.body.data.logs;
      const createLog = logs.find((log: any) => log.action === 'create' && log.resourceId === policyId.toString());
      const updateLog = logs.find((log: any) => log.action === 'update' && log.resourceId === policyId.toString());

      expect(createLog).toBeDefined();
      expect(updateLog).toBeDefined();
      expect(updateLog.oldValues).toBeDefined();
      expect(updateLog.newValues).toBeDefined();

      // Delete the configuration
      await request(app)
        .delete(`/api/admin/policies/${policyId}`)
        .expect(200);

      // Verify deletion in audit trail
      const finalAuditResponse = await request(app)
        .get('/api/admin/audit/search?resourceType=policy_configuration&limit=10')
        .expect(200);

      const finalLogs = finalAuditResponse.body.data.logs;
      const deleteLog = finalLogs.find((log: any) => log.action === 'delete' && log.resourceId === policyId.toString());
      expect(deleteLog).toBeDefined();
    });

    it('should provide analytics and compliance reporting', async () => {
      // Create some test data
      await Promise.all([
        request(app).post('/api/admin/policies').send({
          name: 'Analytics Test Policy 1',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        }),
        request(app).post('/api/admin/policies').send({
          name: 'Analytics Test Policy 2',
          category: 'spam',
          severity: 'medium',
          confidenceThreshold: 0.7,
          action: 'limit',
          reputationModifier: -5,
          isActive: true
        })
      ]);

      // Test analytics
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const analyticsResponse = await request(app)
        .get(`/api/admin/audit/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toHaveProperty('totalActions');
      expect(analyticsResponse.body.data).toHaveProperty('actionsByType');
      expect(analyticsResponse.body.data).toHaveProperty('topAdmins');
      expect(analyticsResponse.body.data.totalActions).toBeGreaterThan(0);

      // Test compliance report
      const complianceResponse = await request(app)
        .get(`/api/admin/audit/compliance?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(complianceResponse.body.success).toBe(true);
      expect(complianceResponse.body.data).toHaveProperty('period');
      expect(complianceResponse.body.data).toHaveProperty('totalChanges');
      expect(complianceResponse.body.data).toHaveProperty('adminActivity');
    });

    it('should handle error scenarios gracefully', async () => {
      // Test invalid policy creation
      const invalidPolicyResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          // Missing required fields
          category: 'harassment'
        })
        .expect(500);

      expect(invalidPolicyResponse.body.success).toBe(false);
      expect(invalidPolicyResponse.body.error).toBeDefined();

      // Test non-existent resource update
      const nonExistentUpdateResponse = await request(app)
        .put('/api/admin/policies/99999')
        .send({ name: 'Updated Name' })
        .expect(500);

      expect(nonExistentUpdateResponse.body.success).toBe(false);

      // Test invalid date range in analytics
      const invalidAnalyticsResponse = await request(app)
        .get('/api/admin/audit/analytics?startDate=invalid-date&endDate=also-invalid')
        .expect(500);

      expect(invalidAnalyticsResponse.body.success).toBe(false);
    });
  });

  describe('System Integration Health Check', () => {
    it('should verify all admin services are properly integrated', async () => {
      // Test that all services can be instantiated and basic operations work
      const healthChecks = [
        // Policy service
        request(app).get('/api/admin/policies').expect(200),
        
        // Threshold service
        request(app).get('/api/admin/thresholds').expect(200),
        
        // Vendor service
        request(app).get('/api/admin/vendors').expect(200),
        
        // Alert service
        request(app).get('/api/admin/alerts').expect(200),
        
        // Dashboard service
        request(app).get('/api/admin/dashboard/metrics').expect(200),
        request(app).get('/api/admin/dashboard/status').expect(200),
        
        // Audit service
        request(app).get('/api/admin/audit/search').expect(200),
        request(app).get('/api/admin/audit/logs').expect(200)
      ];

      const results = await Promise.allSettled(healthChecks);
      const failures = results.filter(result => result.status === 'rejected');
      
      expect(failures).toHaveLength(0);
    });
  });
});
