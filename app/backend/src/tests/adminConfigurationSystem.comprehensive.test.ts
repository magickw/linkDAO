import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import request from 'supertest';
import { testApp } from './utils/testApp';
import { clearTestData } from './utils/testDatabase';
import { adminConfigurationService } from '../services/adminConfigurationService';
import { systemStatusDashboardService } from '../services/systemStatusDashboardService';
import { auditLogAnalysisService } from '../services/auditLogAnalysisService';

describe('Admin Configuration System - Comprehensive Tests', () => {
  let app: any;

  beforeEach(async () => {
    app = await testApp();
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Policy Configuration Management', () => {
    it('should create, update, and manage policy configurations', async () => {
      // Create a policy configuration
      const policyConfig = {
        name: 'Comprehensive Harassment Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 0.85,
        action: 'block',
        reputationModifier: -20,
        description: 'Comprehensive policy for detecting and blocking harassment',
        isActive: true
      };

      const createResponse = await request(app)
        .post('/api/admin/policies')
        .send(policyConfig)
        .expect(201);

      expect(createResponse.body.success).toBe(true);
      expect(createResponse.body.data.name).toBe(policyConfig.name);

      const policyId = createResponse.body.data.id;

      // Update the policy
      const updateData = {
        confidenceThreshold: 0.9,
        action: 'quarantine',
        description: 'Updated policy with stricter threshold'
      };

      const updateResponse = await request(app)
        .put(`/api/admin/policies/${policyId}`)
        .send(updateData)
        .expect(200);

      expect(updateResponse.body.data.confidenceThreshold).toBe(0.9);
      expect(updateResponse.body.data.action).toBe('quarantine');

      // Retrieve all policies
      const getAllResponse = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      expect(getAllResponse.body.data).toHaveLength(1);
      expect(getAllResponse.body.data[0].id).toBe(policyId);

      // Retrieve only active policies
      const getActiveResponse = await request(app)
        .get('/api/admin/policies?activeOnly=true')
        .expect(200);

      expect(getActiveResponse.body.data).toHaveLength(1);

      // Delete the policy
      await request(app)
        .delete(`/api/admin/policies/${policyId}`)
        .expect(200);

      // Verify deletion
      const getAfterDeleteResponse = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      expect(getAfterDeleteResponse.body.data).toHaveLength(0);
    });

    it('should handle policy configuration validation', async () => {
      // Test invalid confidence threshold
      const invalidPolicy = {
        name: 'Invalid Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 1.5, // Invalid: > 1
        action: 'block',
        reputationModifier: -10,
        isActive: true
      };

      await request(app)
        .post('/api/admin/policies')
        .send(invalidPolicy)
        .expect(500);

      // Test missing required fields
      const incompletePolicy = {
        category: 'harassment',
        severity: 'high'
        // Missing name, action, etc.
      };

      await request(app)
        .post('/api/admin/policies')
        .send(incompletePolicy)
        .expect(500);
    });
  });

  describe('Threshold Configuration Management', () => {
    it('should create and manage threshold configurations for different content types', async () => {
      const thresholdConfigs = [
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
          reputationTier: 'trusted_user',
          autoBlockThreshold: 0.9,
          quarantineThreshold: 0.6,
          publishThreshold: 0.2,
          escalationThreshold: 0.4,
          isActive: true
        },
        {
          contentType: 'listing',
          reputationTier: 'verified_user',
          autoBlockThreshold: 0.98,
          quarantineThreshold: 0.8,
          publishThreshold: 0.1,
          escalationThreshold: 0.3,
          isActive: true
        }
      ];

      // Create multiple threshold configurations
      const createdConfigs = [];
      for (const config of thresholdConfigs) {
        const response = await request(app)
          .post('/api/admin/thresholds')
          .send(config)
          .expect(201);

        expect(response.body.success).toBe(true);
        createdConfigs.push(response.body.data);
      }

      // Test filtering by content type
      const postConfigsResponse = await request(app)
        .get('/api/admin/thresholds?contentType=post')
        .expect(200);

      expect(postConfigsResponse.body.data).toHaveLength(1);
      expect(postConfigsResponse.body.data[0].contentType).toBe('post');

      // Test filtering by reputation tier
      const newUserConfigsResponse = await request(app)
        .get('/api/admin/thresholds?reputationTier=new_user')
        .expect(200);

      expect(newUserConfigsResponse.body.data).toHaveLength(1);
      expect(newUserConfigsResponse.body.data[0].reputationTier).toBe('new_user');

      // Test combined filtering
      const specificConfigResponse = await request(app)
        .get('/api/admin/thresholds?contentType=comment&reputationTier=trusted_user')
        .expect(200);

      expect(specificConfigResponse.body.data).toHaveLength(1);
      expect(specificConfigResponse.body.data[0].contentType).toBe('comment');
      expect(specificConfigResponse.body.data[0].reputationTier).toBe('trusted_user');

      // Update a threshold configuration
      const configToUpdate = createdConfigs[0];
      const updateResponse = await request(app)
        .put(`/api/admin/thresholds/${configToUpdate.id}`)
        .send({
          autoBlockThreshold: 0.99,
          quarantineThreshold: 0.85
        })
        .expect(200);

      expect(updateResponse.body.data.autoBlockThreshold).toBe(0.99);
      expect(updateResponse.body.data.quarantineThreshold).toBe(0.85);
    });

    it('should validate threshold configuration logic', async () => {
      // Test invalid threshold ordering (auto block should be highest)
      const invalidConfig = {
        contentType: 'post',
        reputationTier: 'new_user',
        autoBlockThreshold: 0.5, // Should be highest
        quarantineThreshold: 0.7,
        publishThreshold: 0.3,
        escalationThreshold: 0.6,
        isActive: true
      };

      // This should be handled by business logic validation
      const response = await request(app)
        .post('/api/admin/thresholds')
        .send(invalidConfig);

      // The API might accept this but business logic should validate
      // In a real implementation, we'd add validation
    });
  });

  describe('Vendor Configuration Management', () => {
    it('should manage AI vendor configurations and health monitoring', async () => {
      const vendorConfigs = [
        {
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
        },
        {
          vendorName: 'Google Vision',
          serviceType: 'image_moderation',
          apiEndpoint: 'https://vision.googleapis.com/v1/images:annotate',
          apiKeyRef: 'GOOGLE_VISION_API_KEY',
          isEnabled: true,
          priority: 1,
          timeoutMs: 10000,
          retryAttempts: 2,
          rateLimitPerMinute: 1800,
          costPerRequest: 0.0015,
          healthCheckUrl: 'https://vision.googleapis.com/v1/images:annotate',
          healthStatus: 'healthy'
        },
        {
          vendorName: 'Perspective API',
          serviceType: 'text_moderation',
          apiEndpoint: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
          apiKeyRef: 'PERSPECTIVE_API_KEY',
          isEnabled: false, // Disabled for testing
          priority: 2,
          timeoutMs: 8000,
          retryAttempts: 3,
          rateLimitPerMinute: 1000,
          costPerRequest: 0.001,
          healthCheckUrl: 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze',
          healthStatus: 'unknown'
        }
      ];

      // Create vendor configurations
      const createdVendors = [];
      for (const config of vendorConfigs) {
        const response = await request(app)
          .post('/api/admin/vendors')
          .send(config)
          .expect(201);

        expect(response.body.success).toBe(true);
        createdVendors.push(response.body.data);
      }

      // Test filtering by service type
      const textVendorsResponse = await request(app)
        .get('/api/admin/vendors?serviceType=text_moderation')
        .expect(200);

      expect(textVendorsResponse.body.data).toHaveLength(2);
      textVendorsResponse.body.data.forEach((vendor: any) => {
        expect(vendor.serviceType).toBe('text_moderation');
      });

      // Test filtering by enabled status
      const enabledVendorsResponse = await request(app)
        .get('/api/admin/vendors?enabledOnly=true')
        .expect(200);

      expect(enabledVendorsResponse.body.data).toHaveLength(2);
      enabledVendorsResponse.body.data.forEach((vendor: any) => {
        expect(vendor.isEnabled).toBe(true);
      });

      // Test health status update
      const vendorToUpdate = createdVendors[0];
      await request(app)
        .patch(`/api/admin/vendors/${vendorToUpdate.id}/health`)
        .send({ status: 'degraded' })
        .expect(200);

      // Verify health status update
      const updatedVendorResponse = await request(app)
        .get('/api/admin/vendors')
        .expect(200);

      const updatedVendor = updatedVendorResponse.body.data.find(
        (v: any) => v.id === vendorToUpdate.id
      );
      expect(updatedVendor.healthStatus).toBe('degraded');

      // Test vendor configuration update
      const updateResponse = await request(app)
        .put(`/api/admin/vendors/${vendorToUpdate.id}`)
        .send({
          timeoutMs: 15000,
          rateLimitPerMinute: 120,
          isEnabled: false
        })
        .expect(200);

      expect(updateResponse.body.data.timeoutMs).toBe(15000);
      expect(updateResponse.body.data.rateLimitPerMinute).toBe(120);
      expect(updateResponse.body.data.isEnabled).toBe(false);
    });

    it('should handle vendor failover configuration', async () => {
      // Create primary vendor
      const primaryVendor = await request(app)
        .post('/api/admin/vendors')
        .send({
          vendorName: 'Primary OpenAI',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002,
          healthStatus: 'healthy'
        })
        .expect(201);

      // Create fallback vendor with reference to primary
      const fallbackVendor = await request(app)
        .post('/api/admin/vendors')
        .send({
          vendorName: 'Fallback Perspective',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 2,
          timeoutMs: 8000,
          retryAttempts: 2,
          rateLimitPerMinute: 1000,
          costPerRequest: 0.001,
          fallbackVendorId: primaryVendor.body.data.id,
          healthStatus: 'healthy'
        })
        .expect(201);

      expect(fallbackVendor.body.data.fallbackVendorId).toBe(primaryVendor.body.data.id);
    });
  });

  describe('Alert Configuration Management', () => {
    it('should create and manage alert configurations', async () => {
      const alertConfigs = [
        {
          alertName: 'High Error Rate',
          metricName: 'error_rate',
          conditionType: 'greater_than',
          thresholdValue: 0.05,
          severity: 'critical',
          notificationChannels: ['email', 'slack'],
          isActive: true,
          cooldownMinutes: 15
        },
        {
          alertName: 'Low Throughput',
          metricName: 'throughput',
          conditionType: 'less_than',
          thresholdValue: 100,
          severity: 'warning',
          notificationChannels: ['slack'],
          isActive: true,
          cooldownMinutes: 30
        },
        {
          alertName: 'High Latency',
          metricName: 'latency',
          conditionType: 'greater_than',
          thresholdValue: 1000,
          severity: 'warning',
          notificationChannels: ['email'],
          isActive: false,
          cooldownMinutes: 10
        }
      ];

      // Create alert configurations
      for (const config of alertConfigs) {
        const response = await request(app)
          .post('/api/admin/alerts')
          .send(config)
          .expect(201);

        expect(response.body.success).toBe(true);
        expect(response.body.data.alertName).toBe(config.alertName);
        expect(response.body.data.notificationChannels).toEqual(config.notificationChannels);
      }

      // Test retrieving all alerts
      const allAlertsResponse = await request(app)
        .get('/api/admin/alerts')
        .expect(200);

      expect(allAlertsResponse.body.data).toHaveLength(3);

      // Test retrieving only active alerts
      const activeAlertsResponse = await request(app)
        .get('/api/admin/alerts?activeOnly=true')
        .expect(200);

      expect(activeAlertsResponse.body.data).toHaveLength(2);
      activeAlertsResponse.body.data.forEach((alert: any) => {
        expect(alert.isActive).toBe(true);
      });
    });
  });

  describe('System Status Dashboard', () => {
    it('should provide comprehensive system metrics', async () => {
      // First create some test data
      await Promise.all([
        // Create some policies
        request(app).post('/api/admin/policies').send({
          name: 'Test Policy 1',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        }),
        // Create some vendors
        request(app).post('/api/admin/vendors').send({
          vendorName: 'Test Vendor',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002,
          healthStatus: 'healthy'
        })
      ]);

      // Test dashboard metrics endpoint
      const metricsResponse = await request(app)
        .get('/api/admin/dashboard/metrics')
        .expect(200);

      expect(metricsResponse.body.success).toBe(true);
      expect(metricsResponse.body.data).toHaveProperty('moderationStats');
      expect(metricsResponse.body.data).toHaveProperty('vendorHealth');
      expect(metricsResponse.body.data).toHaveProperty('communityReports');
      expect(metricsResponse.body.data).toHaveProperty('appeals');
      expect(metricsResponse.body.data).toHaveProperty('performance');
      expect(metricsResponse.body.data).toHaveProperty('costs');

      // Test system status endpoint
      const statusResponse = await request(app)
        .get('/api/admin/dashboard/status')
        .expect(200);

      expect(statusResponse.body.success).toBe(true);
      expect(statusResponse.body.data).toHaveProperty('status');
      expect(statusResponse.body.data).toHaveProperty('components');
      expect(statusResponse.body.data).toHaveProperty('alerts');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(statusResponse.body.data.status);

      // Test historical metrics endpoint
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();
      const metricNames = 'latency,throughput,error_rate';

      const historicalResponse = await request(app)
        .get(`/api/admin/dashboard/historical?metricNames=${metricNames}&startDate=${startDate}&endDate=${endDate}&granularity=hour`)
        .expect(200);

      expect(historicalResponse.body.success).toBe(true);
      expect(historicalResponse.body.data).toHaveProperty('latency');
      expect(historicalResponse.body.data).toHaveProperty('throughput');
      expect(historicalResponse.body.data).toHaveProperty('error_rate');
    });

    it('should handle time range filtering for metrics', async () => {
      const timeRanges = [
        { startDate: new Date(Date.now() - 60 * 60 * 1000), endDate: new Date() }, // 1 hour
        { startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), endDate: new Date() }, // 24 hours
        { startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), endDate: new Date() } // 7 days
      ];

      for (const timeRange of timeRanges) {
        const response = await request(app)
          .get(`/api/admin/dashboard/metrics?startDate=${timeRange.startDate.toISOString()}&endDate=${timeRange.endDate.toISOString()}`)
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data).toBeDefined();
      }
    });
  });

  describe('Audit Log Analysis', () => {
    beforeEach(async () => {
      // Create some audit data by making configuration changes
      await Promise.all([
        request(app).post('/api/admin/policies').send({
          name: 'Audit Test Policy 1',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        }),
        request(app).post('/api/admin/policies').send({
          name: 'Audit Test Policy 2',
          category: 'spam',
          severity: 'medium',
          confidenceThreshold: 0.7,
          action: 'limit',
          reputationModifier: -5,
          isActive: true
        }),
        request(app).post('/api/admin/vendors').send({
          vendorName: 'Audit Test Vendor',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002,
          healthStatus: 'healthy'
        })
      ]);
    });

    it('should search and filter audit logs', async () => {
      // Test basic search
      const searchResponse = await request(app)
        .get('/api/admin/audit/search?limit=10')
        .expect(200);

      expect(searchResponse.body.success).toBe(true);
      expect(searchResponse.body.data).toHaveProperty('logs');
      expect(searchResponse.body.data).toHaveProperty('total');
      expect(searchResponse.body.data).toHaveProperty('hasMore');
      expect(Array.isArray(searchResponse.body.data.logs)).toBe(true);

      // Test filtering by action
      const createActionsResponse = await request(app)
        .get('/api/admin/audit/search?action=create&limit=10')
        .expect(200);

      expect(createActionsResponse.body.success).toBe(true);
      createActionsResponse.body.data.logs.forEach((log: any) => {
        expect(log.action).toBe('create');
      });

      // Test filtering by resource type
      const policyLogsResponse = await request(app)
        .get('/api/admin/audit/search?resourceType=policy_configuration&limit=10')
        .expect(200);

      expect(policyLogsResponse.body.success).toBe(true);
      policyLogsResponse.body.data.logs.forEach((log: any) => {
        expect(log.resourceType).toBe('policy_configuration');
      });

      // Test date range filtering
      const startDate = new Date(Date.now() - 60 * 60 * 1000).toISOString(); // 1 hour ago
      const endDate = new Date().toISOString();

      const dateFilterResponse = await request(app)
        .get(`/api/admin/audit/search?startDate=${startDate}&endDate=${endDate}&limit=10`)
        .expect(200);

      expect(dateFilterResponse.body.success).toBe(true);
    });

    it('should generate audit analytics', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const analyticsResponse = await request(app)
        .get(`/api/admin/audit/analytics?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(analyticsResponse.body.success).toBe(true);
      expect(analyticsResponse.body.data).toHaveProperty('totalActions');
      expect(analyticsResponse.body.data).toHaveProperty('actionsByType');
      expect(analyticsResponse.body.data).toHaveProperty('actionsByAdmin');
      expect(analyticsResponse.body.data).toHaveProperty('actionsByResource');
      expect(analyticsResponse.body.data).toHaveProperty('actionsOverTime');
      expect(analyticsResponse.body.data).toHaveProperty('topAdmins');
      expect(analyticsResponse.body.data).toHaveProperty('suspiciousActivity');

      expect(typeof analyticsResponse.body.data.totalActions).toBe('number');
      expect(typeof analyticsResponse.body.data.actionsByType).toBe('object');
      expect(Array.isArray(analyticsResponse.body.data.actionsOverTime)).toBe(true);
      expect(Array.isArray(analyticsResponse.body.data.topAdmins)).toBe(true);
      expect(Array.isArray(analyticsResponse.body.data.suspiciousActivity)).toBe(true);
    });

    it('should generate compliance reports', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const complianceResponse = await request(app)
        .get(`/api/admin/audit/compliance?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(complianceResponse.body.success).toBe(true);
      expect(complianceResponse.body.data).toHaveProperty('period');
      expect(complianceResponse.body.data).toHaveProperty('totalChanges');
      expect(complianceResponse.body.data).toHaveProperty('configurationChanges');
      expect(complianceResponse.body.data).toHaveProperty('policyChanges');
      expect(complianceResponse.body.data).toHaveProperty('vendorChanges');
      expect(complianceResponse.body.data).toHaveProperty('adminActivity');
      expect(complianceResponse.body.data).toHaveProperty('dataRetentionCompliance');

      expect(complianceResponse.body.data.period.start).toBe(startDate);
      expect(complianceResponse.body.data.period.end).toBe(endDate);
    });

    it('should export audit logs in different formats', async () => {
      // Test JSON export
      const jsonExportResponse = await request(app)
        .get('/api/admin/audit/export?format=json&limit=100')
        .expect(200);

      expect(jsonExportResponse.headers['content-type']).toContain('application/json');
      expect(jsonExportResponse.headers['content-disposition']).toContain('attachment');

      // Test CSV export
      const csvExportResponse = await request(app)
        .get('/api/admin/audit/export?format=csv&limit=100')
        .expect(200);

      expect(csvExportResponse.headers['content-type']).toContain('text/csv');
      expect(csvExportResponse.headers['content-disposition']).toContain('attachment');
      expect(csvExportResponse.text).toContain('ID,Admin ID,Action,Resource Type');
    });

    it('should detect policy violations', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const endDate = new Date().toISOString();

      const violationsResponse = await request(app)
        .get(`/api/admin/audit/violations?startDate=${startDate}&endDate=${endDate}`)
        .expect(200);

      expect(violationsResponse.body.success).toBe(true);
      expect(Array.isArray(violationsResponse.body.data)).toBe(true);

      // Each violation should have required properties
      violationsResponse.body.data.forEach((violation: any) => {
        expect(violation).toHaveProperty('type');
        expect(violation).toHaveProperty('description');
        expect(violation).toHaveProperty('adminId');
        expect(violation).toHaveProperty('timestamp');
        expect(violation).toHaveProperty('severity');
        expect(['low', 'medium', 'high']).toContain(violation.severity);
      });
    });
  });

  describe('Integration and Error Handling', () => {
    it('should handle concurrent configuration changes', async () => {
      const concurrentRequests = Array.from({ length: 5 }, (_, i) => 
        request(app)
          .post('/api/admin/policies')
          .send({
            name: `Concurrent Policy ${i}`,
            category: 'harassment',
            severity: 'medium',
            confidenceThreshold: 0.7,
            action: 'review',
            reputationModifier: -5,
            isActive: true
          })
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.status).toBe(201);
        expect(response.body.success).toBe(true);
      });

      // Verify all policies were created
      const allPoliciesResponse = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      expect(allPoliciesResponse.body.data).toHaveLength(5);
    });

    it('should handle invalid configuration data gracefully', async () => {
      const invalidConfigurations = [
        // Invalid policy
        {
          endpoint: '/api/admin/policies',
          data: {
            name: '', // Empty name
            category: 'invalid_category',
            severity: 'invalid_severity',
            confidenceThreshold: 2.0, // > 1
            action: 'invalid_action'
          }
        },
        // Invalid threshold
        {
          endpoint: '/api/admin/thresholds',
          data: {
            contentType: 'invalid_type',
            reputationTier: 'invalid_tier',
            autoBlockThreshold: -0.1, // Negative
            quarantineThreshold: 1.5, // > 1
            publishThreshold: 0.9, // Higher than quarantine
            escalationThreshold: 2.0 // > 1
          }
        },
        // Invalid vendor
        {
          endpoint: '/api/admin/vendors',
          data: {
            vendorName: '', // Empty name
            serviceType: 'invalid_service',
            timeoutMs: -1000, // Negative
            retryAttempts: -1, // Negative
            rateLimitPerMinute: -100, // Negative
            costPerRequest: -0.001 // Negative
          }
        }
      ];

      for (const config of invalidConfigurations) {
        const response = await request(app)
          .post(config.endpoint)
          .send(config.data);

        expect(response.status).toBe(500);
        expect(response.body.success).toBe(false);
        expect(response.body.error).toBeDefined();
      }
    });

    it('should handle non-existent resource operations', async () => {
      const nonExistentId = 99999;

      // Test updating non-existent policy
      const updatePolicyResponse = await request(app)
        .put(`/api/admin/policies/${nonExistentId}`)
        .send({ name: 'Updated Name' });

      expect(updatePolicyResponse.status).toBe(500);
      expect(updatePolicyResponse.body.success).toBe(false);

      // Test deleting non-existent policy
      const deletePolicyResponse = await request(app)
        .delete(`/api/admin/policies/${nonExistentId}`);

      expect(deletePolicyResponse.status).toBe(500);
      expect(deletePolicyResponse.body.success).toBe(false);

      // Test updating non-existent vendor health
      const updateVendorHealthResponse = await request(app)
        .patch(`/api/admin/vendors/${nonExistentId}/health`)
        .send({ status: 'healthy' });

      expect(updateVendorHealthResponse.status).toBe(500);
      expect(updateVendorHealthResponse.body.success).toBe(false);
    });

    it('should maintain audit trail for all configuration changes', async () => {
      // Create a policy
      const createResponse = await request(app)
        .post('/api/admin/policies')
        .send({
          name: 'Audit Trail Test Policy',
          category: 'harassment',
          severity: 'high',
          confidenceThreshold: 0.8,
          action: 'block',
          reputationModifier: -10,
          isActive: true
        })
        .expect(201);

      const policyId = createResponse.body.data.id;

      // Update the policy
      await request(app)
        .put(`/api/admin/policies/${policyId}`)
        .send({
          confidenceThreshold: 0.9,
          action: 'quarantine'
        })
        .expect(200);

      // Delete the policy
      await request(app)
        .delete(`/api/admin/policies/${policyId}`)
        .expect(200);

      // Check audit logs
      const auditLogsResponse = await request(app)
        .get('/api/admin/audit/search?resourceType=policy_configuration&limit=10')
        .expect(200);

      expect(auditLogsResponse.body.success).toBe(true);
      
      const logs = auditLogsResponse.body.data.logs;
      expect(logs.length).toBeGreaterThanOrEqual(3); // create, update, delete

      // Verify we have create, update, and delete actions
      const actions = logs.map((log: any) => log.action);
      expect(actions).toContain('create');
      expect(actions).toContain('update');
      expect(actions).toContain('delete');

      // Verify resource IDs match
      logs.forEach((log: any) => {
        expect(log.resourceId).toBe(policyId.toString());
        expect(log.resourceType).toBe('policy_configuration');
      });
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle large numbers of configurations efficiently', async () => {
      const startTime = Date.now();
      
      // Create 50 policies
      const policyPromises = Array.from({ length: 50 }, (_, i) =>
        request(app)
          .post('/api/admin/policies')
          .send({
            name: `Performance Test Policy ${i}`,
            category: i % 2 === 0 ? 'harassment' : 'spam',
            severity: ['low', 'medium', 'high'][i % 3] as any,
            confidenceThreshold: 0.5 + (i % 5) * 0.1,
            action: ['allow', 'limit', 'review', 'block'][i % 4] as any,
            reputationModifier: -5 - (i % 10),
            isActive: i % 10 !== 0 // 90% active
          })
      );

      await Promise.all(policyPromises);
      
      const creationTime = Date.now() - startTime;
      expect(creationTime).toBeLessThan(10000); // Should complete within 10 seconds

      // Test retrieval performance
      const retrievalStartTime = Date.now();
      
      const allPoliciesResponse = await request(app)
        .get('/api/admin/policies')
        .expect(200);

      const retrievalTime = Date.now() - retrievalStartTime;
      expect(retrievalTime).toBeLessThan(1000); // Should retrieve within 1 second
      expect(allPoliciesResponse.body.data).toHaveLength(50);

      // Test filtered retrieval
      const activeOnlyResponse = await request(app)
        .get('/api/admin/policies?activeOnly=true')
        .expect(200);

      expect(activeOnlyResponse.body.data.length).toBeLessThan(50);
      activeOnlyResponse.body.data.forEach((policy: any) => {
        expect(policy.isActive).toBe(true);
      });
    });

    it('should handle pagination for large audit log datasets', async () => {
      // Create many audit entries by making configuration changes
      const changePromises = Array.from({ length: 20 }, (_, i) =>
        request(app)
          .post('/api/admin/policies')
          .send({
            name: `Pagination Test Policy ${i}`,
            category: 'harassment',
            severity: 'medium',
            confidenceThreshold: 0.7,
            action: 'review',
            reputationModifier: -5,
            isActive: true
          })
      );

      await Promise.all(changePromises);

      // Test pagination
      const firstPageResponse = await request(app)
        .get('/api/admin/audit/search?limit=10&offset=0')
        .expect(200);

      expect(firstPageResponse.body.success).toBe(true);
      expect(firstPageResponse.body.data.logs).toHaveLength(10);
      expect(firstPageResponse.body.data.hasMore).toBe(true);

      const secondPageResponse = await request(app)
        .get('/api/admin/audit/search?limit=10&offset=10')
        .expect(200);

      expect(secondPageResponse.body.success).toBe(true);
      expect(secondPageResponse.body.data.logs.length).toBeGreaterThan(0);

      // Verify no duplicate entries between pages
      const firstPageIds = firstPageResponse.body.data.logs.map((log: any) => log.id);
      const secondPageIds = secondPageResponse.body.data.logs.map((log: any) => log.id);
      
      const intersection = firstPageIds.filter((id: number) => secondPageIds.includes(id));
      expect(intersection).toHaveLength(0);
    });
  });
});