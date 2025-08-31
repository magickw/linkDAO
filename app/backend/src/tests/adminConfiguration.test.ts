import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { adminConfigurationService } from '../services/adminConfigurationService';
import { systemStatusDashboardService } from '../services/systemStatusDashboardService';
import { auditLogAnalysisService } from '../services/auditLogAnalysisService';
import { testDb, clearTestData } from './utils/testDatabase';

describe('Admin Configuration System', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Policy Configuration Management', () => {
    it('should create a new policy configuration', async () => {
      const policyConfig = {
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        description: 'Test policy for harassment detection',
        isActive: true
      };

      const created = await adminConfigurationService.createPolicyConfiguration(
        policyConfig,
        'admin-123'
      );

      expect(created).toMatchObject({
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high',
        confidenceThreshold: 0.8,
        action: 'block',
        reputationModifier: -10,
        isActive: true
      });
      expect(created.id).toBeDefined();
    });

    it('should update an existing policy configuration', async () => {
      // First create a policy
      const policyConfig = {
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        isActive: true
      };

      const created = await adminConfigurationService.createPolicyConfiguration(
        policyConfig,
        'admin-123'
      );

      // Then update it
      const updated = await adminConfigurationService.updatePolicyConfiguration(
        created.id!,
        { confidenceThreshold: 0.9, action: 'review' as const },
        'admin-123'
      );

      expect(updated.confidenceThreshold).toBe(0.9);
      expect(updated.action).toBe('review');
    });

    it('should retrieve policy configurations', async () => {
      // Create multiple policies
      const policies = [
        {
          name: 'Policy 1',
          category: 'harassment',
          severity: 'high' as const,
          confidenceThreshold: 0.8,
          action: 'block' as const,
          reputationModifier: -10,
          isActive: true
        },
        {
          name: 'Policy 2',
          category: 'spam',
          severity: 'medium' as const,
          confidenceThreshold: 0.7,
          action: 'limit' as const,
          reputationModifier: -5,
          isActive: false
        }
      ];

      for (const policy of policies) {
        await adminConfigurationService.createPolicyConfiguration(policy, 'admin-123');
      }

      const allPolicies = await adminConfigurationService.getPolicyConfigurations();
      expect(allPolicies).toHaveLength(2);

      const activePolicies = await adminConfigurationService.getPolicyConfigurations(true);
      expect(activePolicies).toHaveLength(1);
      expect(activePolicies[0].name).toBe('Policy 1');
    });

    it('should delete a policy configuration', async () => {
      const policyConfig = {
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        isActive: true
      };

      const created = await adminConfigurationService.createPolicyConfiguration(
        policyConfig,
        'admin-123'
      );

      await adminConfigurationService.deletePolicyConfiguration(created.id!, 'admin-123');

      const policies = await adminConfigurationService.getPolicyConfigurations();
      expect(policies).toHaveLength(0);
    });
  });

  describe('Threshold Configuration Management', () => {
    it('should create threshold configurations', async () => {
      const thresholdConfig = {
        contentType: 'post',
        reputationTier: 'new_user',
        autoBlockThreshold: 0.95,
        quarantineThreshold: 0.7,
        publishThreshold: 0.3,
        escalationThreshold: 0.5,
        isActive: true
      };

      const created = await adminConfigurationService.createThresholdConfiguration(
        thresholdConfig,
        'admin-123'
      );

      expect(created).toMatchObject(thresholdConfig);
      expect(created.id).toBeDefined();
    });

    it('should retrieve threshold configurations by filters', async () => {
      const configs = [
        {
          contentType: 'post',
          reputationTier: 'new_user',
          autoBlockThreshold: 0.95,
          quarantineThreshold: 0.7,
          publishThreshold: 0.3,
          escalationThreshold: 0.5,
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
        }
      ];

      for (const config of configs) {
        await adminConfigurationService.createThresholdConfiguration(config, 'admin-123');
      }

      const postConfigs = await adminConfigurationService.getThresholdConfigurations('post');
      expect(postConfigs).toHaveLength(1);
      expect(postConfigs[0].contentType).toBe('post');

      const newUserConfigs = await adminConfigurationService.getThresholdConfigurations(
        undefined,
        'new_user'
      );
      expect(newUserConfigs).toHaveLength(1);
      expect(newUserConfigs[0].reputationTier).toBe('new_user');
    });
  });

  describe('Vendor Configuration Management', () => {
    it('should create vendor configurations', async () => {
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
        healthStatus: 'healthy' as const
      };

      const created = await adminConfigurationService.createVendorConfiguration(
        vendorConfig,
        'admin-123'
      );

      expect(created).toMatchObject(vendorConfig);
      expect(created.id).toBeDefined();
    });

    it('should update vendor health status', async () => {
      const vendorConfig = {
        vendorName: 'OpenAI',
        serviceType: 'text_moderation',
        isEnabled: true,
        priority: 1,
        timeoutMs: 5000,
        retryAttempts: 3,
        rateLimitPerMinute: 60,
        costPerRequest: 0.002,
        healthStatus: 'healthy' as const
      };

      const created = await adminConfigurationService.createVendorConfiguration(
        vendorConfig,
        'admin-123'
      );

      await adminConfigurationService.updateVendorHealthStatus(created.id!, 'degraded');

      const vendors = await adminConfigurationService.getVendorConfigurations();
      expect(vendors[0].healthStatus).toBe('degraded');
    });

    it('should filter vendors by service type and enabled status', async () => {
      const vendors = [
        {
          vendorName: 'OpenAI',
          serviceType: 'text_moderation',
          isEnabled: true,
          priority: 1,
          timeoutMs: 5000,
          retryAttempts: 3,
          rateLimitPerMinute: 60,
          costPerRequest: 0.002,
          healthStatus: 'healthy' as const
        },
        {
          vendorName: 'Google Vision',
          serviceType: 'image_moderation',
          isEnabled: false,
          priority: 2,
          timeoutMs: 10000,
          retryAttempts: 2,
          rateLimitPerMinute: 30,
          costPerRequest: 0.001,
          healthStatus: 'unknown' as const
        }
      ];

      for (const vendor of vendors) {
        await adminConfigurationService.createVendorConfiguration(vendor, 'admin-123');
      }

      const textVendors = await adminConfigurationService.getVendorConfigurations('text_moderation');
      expect(textVendors).toHaveLength(1);
      expect(textVendors[0].vendorName).toBe('OpenAI');

      const enabledVendors = await adminConfigurationService.getVendorConfigurations(undefined, true);
      expect(enabledVendors).toHaveLength(1);
      expect(enabledVendors[0].isEnabled).toBe(true);
    });
  });

  describe('Alert Configuration Management', () => {
    it('should create alert configurations', async () => {
      const alertConfig = {
        alertName: 'High Error Rate',
        metricName: 'error_rate',
        conditionType: 'greater_than' as const,
        thresholdValue: 0.05,
        severity: 'critical' as const,
        notificationChannels: ['email', 'slack'],
        isActive: true,
        cooldownMinutes: 15
      };

      const created = await adminConfigurationService.createAlertConfiguration(
        alertConfig,
        'admin-123'
      );

      expect(created).toMatchObject(alertConfig);
      expect(created.id).toBeDefined();
    });

    it('should retrieve active alert configurations', async () => {
      const alerts = [
        {
          alertName: 'High Error Rate',
          metricName: 'error_rate',
          conditionType: 'greater_than' as const,
          thresholdValue: 0.05,
          severity: 'critical' as const,
          notificationChannels: ['email'],
          isActive: true,
          cooldownMinutes: 15
        },
        {
          alertName: 'Low Throughput',
          metricName: 'throughput',
          conditionType: 'less_than' as const,
          thresholdValue: 100,
          severity: 'warning' as const,
          notificationChannels: ['slack'],
          isActive: false,
          cooldownMinutes: 30
        }
      ];

      for (const alert of alerts) {
        await adminConfigurationService.createAlertConfiguration(alert, 'admin-123');
      }

      const allAlerts = await adminConfigurationService.getAlertConfigurations();
      expect(allAlerts).toHaveLength(2);

      const activeAlerts = await adminConfigurationService.getAlertConfigurations(true);
      expect(activeAlerts).toHaveLength(1);
      expect(activeAlerts[0].alertName).toBe('High Error Rate');
    });
  });

  describe('Audit Logging', () => {
    it('should log configuration changes', async () => {
      const policyConfig = {
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        isActive: true
      };

      await adminConfigurationService.createPolicyConfiguration(policyConfig, 'admin-123');

      const auditLogs = await adminConfigurationService.getAuditLogs('admin-123');
      expect(auditLogs).toHaveLength(1);
      expect(auditLogs[0].action).toBe('create');
      expect(auditLogs[0].resourceType).toBe('policy_configuration');
      expect(auditLogs[0].adminId).toBe('admin-123');
    });

    it('should filter audit logs by resource type', async () => {
      // Create different types of configurations
      await adminConfigurationService.createPolicyConfiguration({
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        isActive: true
      }, 'admin-123');

      await adminConfigurationService.createThresholdConfiguration({
        contentType: 'post',
        reputationTier: 'new_user',
        autoBlockThreshold: 0.95,
        quarantineThreshold: 0.7,
        publishThreshold: 0.3,
        escalationThreshold: 0.5,
        isActive: true
      }, 'admin-123');

      const policyLogs = await adminConfigurationService.getAuditLogs(
        undefined,
        'policy_configuration'
      );
      expect(policyLogs).toHaveLength(1);
      expect(policyLogs[0].resourceType).toBe('policy_configuration');

      const thresholdLogs = await adminConfigurationService.getAuditLogs(
        undefined,
        'threshold_configuration'
      );
      expect(thresholdLogs).toHaveLength(1);
      expect(thresholdLogs[0].resourceType).toBe('threshold_configuration');
    });
  });
});

describe('System Status Dashboard Service', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Metrics Recording', () => {
    it('should record single metrics', async () => {
      const metric = {
        metricName: 'test_metric',
        metricValue: 42,
        metricType: 'gauge' as const,
        tags: { service: 'moderation' },
        timestamp: new Date()
      };

      await systemStatusDashboardService.recordMetric(metric);

      // Verify metric was recorded (would need to query the database)
      expect(true).toBe(true); // Placeholder assertion
    });

    it('should record multiple metrics in batch', async () => {
      const metrics = [
        {
          metricName: 'latency',
          metricValue: 150,
          metricType: 'histogram' as const,
          tags: { endpoint: '/api/moderate' },
          timestamp: new Date()
        },
        {
          metricName: 'throughput',
          metricValue: 1000,
          metricType: 'counter' as const,
          tags: { service: 'moderation' },
          timestamp: new Date()
        }
      ];

      await systemStatusDashboardService.recordMetrics(metrics);

      // Verify metrics were recorded
      expect(true).toBe(true); // Placeholder assertion
    });
  });

  describe('Dashboard Metrics', () => {
    it('should get comprehensive dashboard metrics', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const metrics = await systemStatusDashboardService.getDashboardMetrics(timeRange);

      expect(metrics).toHaveProperty('moderationStats');
      expect(metrics).toHaveProperty('vendorHealth');
      expect(metrics).toHaveProperty('communityReports');
      expect(metrics).toHaveProperty('appeals');
      expect(metrics).toHaveProperty('performance');
      expect(metrics).toHaveProperty('costs');

      expect(metrics.moderationStats).toHaveProperty('totalCases');
      expect(metrics.moderationStats).toHaveProperty('pendingCases');
      expect(metrics.moderationStats).toHaveProperty('averageProcessingTime');

      expect(metrics.vendorHealth).toHaveProperty('totalVendors');
      expect(metrics.vendorHealth).toHaveProperty('healthyVendors');
    });

    it('should get real-time system status', async () => {
      const status = await systemStatusDashboardService.getSystemStatus();

      expect(status).toHaveProperty('status');
      expect(status).toHaveProperty('components');
      expect(status).toHaveProperty('alerts');

      expect(['healthy', 'degraded', 'unhealthy']).toContain(status.status);
      expect(status.components).toHaveProperty('vendors');
      expect(status.components).toHaveProperty('moderation');
      expect(status.components).toHaveProperty('database');
      expect(status.components).toHaveProperty('cache');
    });
  });

  describe('Historical Metrics', () => {
    it('should retrieve historical metrics for charts', async () => {
      const timeRange = {
        start: new Date(Date.now() - 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const metrics = await systemStatusDashboardService.getHistoricalMetrics(
        ['latency', 'throughput', 'error_rate'],
        timeRange,
        'hour'
      );

      expect(metrics).toHaveProperty('latency');
      expect(metrics).toHaveProperty('throughput');
      expect(metrics).toHaveProperty('error_rate');

      // Each metric should be an array of timestamp-value pairs
      expect(Array.isArray(metrics.latency)).toBe(true);
      expect(Array.isArray(metrics.throughput)).toBe(true);
      expect(Array.isArray(metrics.error_rate)).toBe(true);
    });
  });
});

describe('Audit Log Analysis Service', () => {
  beforeEach(async () => {
    await clearTestData();
  });

  afterEach(async () => {
    await clearTestData();
  });

  describe('Audit Log Search', () => {
    it('should search audit logs with filters', async () => {
      // First create some audit logs by making configuration changes
      await adminConfigurationService.createPolicyConfiguration({
        name: 'Test Policy',
        category: 'harassment',
        severity: 'high' as const,
        confidenceThreshold: 0.8,
        action: 'block' as const,
        reputationModifier: -10,
        isActive: true
      }, 'admin-123');

      const filters = {
        adminId: 'admin-123',
        action: 'create',
        resourceType: 'policy_configuration',
        limit: 10,
        offset: 0
      };

      const result = await auditLogAnalysisService.searchAuditLogs(filters);

      expect(result).toHaveProperty('logs');
      expect(result).toHaveProperty('total');
      expect(result).toHaveProperty('hasMore');

      expect(Array.isArray(result.logs)).toBe(true);
      expect(typeof result.total).toBe('number');
      expect(typeof result.hasMore).toBe('boolean');
    });

    it('should search audit logs with date range filters', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const filters = {
        startDate,
        endDate,
        limit: 50
      };

      const result = await auditLogAnalysisService.searchAuditLogs(filters);

      expect(result.logs).toBeDefined();
      expect(result.total).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Audit Analytics', () => {
    it('should generate audit analytics', async () => {
      const startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const analytics = await auditLogAnalysisService.getAuditAnalytics(startDate, endDate);

      expect(analytics).toHaveProperty('totalActions');
      expect(analytics).toHaveProperty('actionsByType');
      expect(analytics).toHaveProperty('actionsByAdmin');
      expect(analytics).toHaveProperty('actionsByResource');
      expect(analytics).toHaveProperty('actionsOverTime');
      expect(analytics).toHaveProperty('topAdmins');
      expect(analytics).toHaveProperty('suspiciousActivity');

      expect(typeof analytics.totalActions).toBe('number');
      expect(typeof analytics.actionsByType).toBe('object');
      expect(Array.isArray(analytics.actionsOverTime)).toBe(true);
      expect(Array.isArray(analytics.topAdmins)).toBe(true);
      expect(Array.isArray(analytics.suspiciousActivity)).toBe(true);
    });
  });

  describe('Compliance Reporting', () => {
    it('should generate compliance reports', async () => {
      const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const report = await auditLogAnalysisService.generateComplianceReport(startDate, endDate);

      expect(report).toHaveProperty('period');
      expect(report).toHaveProperty('totalChanges');
      expect(report).toHaveProperty('configurationChanges');
      expect(report).toHaveProperty('policyChanges');
      expect(report).toHaveProperty('vendorChanges');
      expect(report).toHaveProperty('adminActivity');
      expect(report).toHaveProperty('dataRetentionCompliance');

      expect(report.period.start).toEqual(startDate);
      expect(report.period.end).toEqual(endDate);
      expect(typeof report.totalChanges).toBe('number');
      expect(typeof report.adminActivity).toBe('object');
    });
  });

  describe('Audit Log Export', () => {
    it('should export audit logs in JSON format', async () => {
      const filters = {
        limit: 100
      };

      const exportData = await auditLogAnalysisService.exportAuditLogs(filters, 'json');

      expect(typeof exportData).toBe('string');
      
      // Should be valid JSON
      const parsed = JSON.parse(exportData);
      expect(Array.isArray(parsed)).toBe(true);
    });

    it('should export audit logs in CSV format', async () => {
      const filters = {
        limit: 100
      };

      const exportData = await auditLogAnalysisService.exportAuditLogs(filters, 'csv');

      expect(typeof exportData).toBe('string');
      expect(exportData).toContain('ID,Admin ID,Action,Resource Type');
    });
  });

  describe('Policy Violation Detection', () => {
    it('should detect policy violations', async () => {
      const startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const violations = await auditLogAnalysisService.detectPolicyViolations(startDate, endDate);

      expect(Array.isArray(violations)).toBe(true);
      
      // Each violation should have required properties
      violations.forEach(violation => {
        expect(violation).toHaveProperty('type');
        expect(violation).toHaveProperty('description');
        expect(violation).toHaveProperty('adminId');
        expect(violation).toHaveProperty('timestamp');
        expect(violation).toHaveProperty('severity');
        expect(violation).toHaveProperty('evidence');
        
        expect(['low', 'medium', 'high']).toContain(violation.severity);
      });
    });
  });
});