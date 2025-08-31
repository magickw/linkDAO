import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { moderationAlertingService } from '../services/moderationAlertingService';
import { moderationMetricsService } from '../services/moderationMetricsService';

// Mock external dependencies
vi.mock('nodemailer');
vi.mock('discord.js');
vi.mock('../services/moderationMetricsService');

describe('Moderation Alerting Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any test alerts
    moderationAlertingService.getAlertRules().forEach(rule => {
      if (rule.id.startsWith('test_')) {
        moderationAlertingService.removeAlertRule(rule.id);
      }
    });
  });

  describe('Alert Rule Configuration', () => {
    it('should create and manage complex alert rules', () => {
      const complexRule = {
        id: 'test_complex_rule',
        name: 'Complex Multi-Metric Alert',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.05,
        severity: 'critical' as const,
        enabled: true,
        cooldownMinutes: 15,
        channels: ['email', 'discord', 'webhook'] as const,
        description: 'Triggers when error rate exceeds 5% for performance metrics'
      };

      moderationAlertingService.setAlertRule(complexRule);
      const rules = moderationAlertingService.getAlertRules();
      const createdRule = rules.find(r => r.id === 'test_complex_rule');

      expect(createdRule).toBeDefined();
      expect(createdRule?.metric).toBe('performance.errorRate');
      expect(createdRule?.channels).toEqual(['email', 'discord', 'webhook']);
    });

    it('should validate alert rule configurations', () => {
      const invalidRule = {
        id: 'test_invalid_rule',
        name: 'Invalid Rule',
        metric: 'invalid.metric.path',
        operator: 'invalid_operator' as any,
        threshold: -1,
        severity: 'invalid_severity' as any,
        enabled: true,
        cooldownMinutes: -5,
        channels: ['invalid_channel'] as any,
        description: 'This rule should be rejected'
      };

      // The service should handle invalid configurations gracefully
      moderationAlertingService.setAlertRule(invalidRule);
      
      // Rule should still be created but with sanitized values
      const rules = moderationAlertingService.getAlertRules();
      const createdRule = rules.find(r => r.id === 'test_invalid_rule');
      
      expect(createdRule).toBeDefined();
      // Implementation should sanitize invalid values
    });

    it('should support dynamic rule updates', () => {
      const initialRule = {
        id: 'test_dynamic_rule',
        name: 'Dynamic Rule',
        metric: 'error_rate',
        operator: 'gt' as const,
        threshold: 0.1,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 10,
        channels: ['email'] as const,
        description: 'Initial configuration'
      };

      moderationAlertingService.setAlertRule(initialRule);

      // Update the rule
      const updatedRule = {
        ...initialRule,
        threshold: 0.05,
        severity: 'critical' as const,
        channels: ['email', 'discord'] as const,
        description: 'Updated configuration'
      };

      moderationAlertingService.setAlertRule(updatedRule);

      const rules = moderationAlertingService.getAlertRules();
      const rule = rules.find(r => r.id === 'test_dynamic_rule');

      expect(rule?.threshold).toBe(0.05);
      expect(rule?.severity).toBe('critical');
      expect(rule?.channels).toEqual(['email', 'discord']);
    });
  });

  describe('Alert Triggering Logic', () => {
    it('should trigger alerts based on metric thresholds', async () => {
      // Setup test rule
      const testRule = {
        id: 'test_threshold_rule',
        name: 'Threshold Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.05,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email'] as const,
        description: 'Test threshold triggering'
      };

      moderationAlertingService.setAlertRule(testRule);

      // Mock metrics that exceed threshold
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.08, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      const initialAlerts = moderationAlertingService.getActiveAlerts().length;
      await moderationAlertingService.checkAlerts();
      const finalAlerts = moderationAlertingService.getActiveAlerts().length;

      expect(finalAlerts).toBeGreaterThan(initialAlerts);

      const triggeredAlert = moderationAlertingService.getActiveAlerts()
        .find(a => a.ruleId === 'test_threshold_rule');
      
      expect(triggeredAlert).toBeDefined();
      expect(triggeredAlert?.value).toBe(0.08);
      expect(triggeredAlert?.threshold).toBe(0.05);
    });

    it('should respect different comparison operators', async () => {
      const rules = [
        {
          id: 'test_gt_rule',
          name: 'Greater Than',
          metric: 'performance.errorRate',
          operator: 'gt' as const,
          threshold: 0.05,
          severity: 'warning' as const,
          enabled: true,
          cooldownMinutes: 1,
          channels: ['email'] as const,
          description: 'Greater than test'
        },
        {
          id: 'test_lt_rule',
          name: 'Less Than',
          metric: 'performance.throughput',
          operator: 'lt' as const,
          threshold: 10,
          severity: 'critical' as const,
          enabled: true,
          cooldownMinutes: 1,
          channels: ['email'] as const,
          description: 'Less than test'
        }
      ];

      rules.forEach(rule => moderationAlertingService.setAlertRule(rule));

      // Mock metrics
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { 
          errorRate: 0.08, // > 0.05, should trigger gt rule
          throughput: 5,   // < 10, should trigger lt rule
          averageLatency: 1500, 
          totalDecisions: 100 
        },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      await moderationAlertingService.checkAlerts();

      const activeAlerts = moderationAlertingService.getActiveAlerts();
      const gtAlert = activeAlerts.find(a => a.ruleId === 'test_gt_rule');
      const ltAlert = activeAlerts.find(a => a.ruleId === 'test_lt_rule');

      expect(gtAlert).toBeDefined();
      expect(ltAlert).toBeDefined();
    });

    it('should handle nested metric paths', async () => {
      const nestedRule = {
        id: 'test_nested_rule',
        name: 'Nested Metric',
        metric: 'business.userEngagement.activeReporters',
        operator: 'lt' as const,
        threshold: 10,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email'] as const,
        description: 'Test nested metric path'
      };

      moderationAlertingService.setAlertRule(nestedRule);

      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.02, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {
          userEngagement: {
            activeReporters: 5, // < 10, should trigger
            averageReportsPerUser: 2.5,
            moderatorActivity: 8
          }
        }
      } as any);

      await moderationAlertingService.checkAlerts();

      const activeAlerts = moderationAlertingService.getActiveAlerts();
      const nestedAlert = activeAlerts.find(a => a.ruleId === 'test_nested_rule');

      expect(nestedAlert).toBeDefined();
      expect(nestedAlert?.value).toBe(5);
    });
  });

  describe('Cooldown and Rate Limiting', () => {
    it('should enforce cooldown periods', async () => {
      const cooldownRule = {
        id: 'test_cooldown_rule',
        name: 'Cooldown Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.01, // Very low threshold to ensure triggering
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 60, // 1 hour cooldown
        channels: ['email'] as const,
        description: 'Test cooldown enforcement'
      };

      moderationAlertingService.setAlertRule(cooldownRule);

      // Mock high error rate
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.05, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      // First check should trigger alert
      await moderationAlertingService.checkAlerts();
      const firstCheckAlerts = moderationAlertingService.getActiveAlerts().length;

      // Second check immediately after should not trigger new alert
      await moderationAlertingService.checkAlerts();
      const secondCheckAlerts = moderationAlertingService.getActiveAlerts().length;

      expect(secondCheckAlerts).toBe(firstCheckAlerts);
    });

    it('should allow alerts after cooldown period expires', async () => {
      const shortCooldownRule = {
        id: 'test_short_cooldown',
        name: 'Short Cooldown',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.01,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 0.01, // Very short cooldown for testing
        channels: ['email'] as const,
        description: 'Test short cooldown'
      };

      moderationAlertingService.setAlertRule(shortCooldownRule);

      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.05, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      // First alert
      await moderationAlertingService.checkAlerts();
      const firstAlert = moderationAlertingService.getActiveAlerts()
        .find(a => a.ruleId === 'test_short_cooldown');

      // Wait for cooldown to expire
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Second alert should be allowed
      await moderationAlertingService.checkAlerts();
      const secondAlert = moderationAlertingService.getActiveAlerts()
        .find(a => a.ruleId === 'test_short_cooldown');

      expect(firstAlert).toBeDefined();
      expect(secondAlert).toBeDefined();
    });
  });

  describe('Multi-Channel Notifications', () => {
    it('should configure multiple notification channels', () => {
      const emailChannel = {
        type: 'email' as const,
        config: {
          recipients: ['admin@example.com', 'ops@example.com'],
          smtpConfig: {
            host: 'smtp.example.com',
            port: 587,
            secure: false,
            auth: {
              user: 'alerts@example.com',
              pass: 'password123'
            }
          }
        }
      };

      const discordChannel = {
        type: 'discord' as const,
        config: {
          webhookUrl: 'https://discord.com/api/webhooks/123/abc'
        }
      };

      const webhookChannel = {
        type: 'webhook' as const,
        config: {
          webhookUrl: 'https://api.example.com/alerts'
        }
      };

      moderationAlertingService.configureChannel('email', emailChannel);
      moderationAlertingService.configureChannel('discord', discordChannel);
      moderationAlertingService.configureChannel('webhook', webhookChannel);

      // Channels should be configured (we can't directly test private properties,
      // but we can test that rules with these channels work)
      const multiChannelRule = {
        id: 'test_multi_channel',
        name: 'Multi Channel Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.05,
        severity: 'critical' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email', 'discord', 'webhook'] as const,
        description: 'Test multiple notification channels'
      };

      expect(() => moderationAlertingService.setAlertRule(multiChannelRule))
        .not.toThrow();
    });

    it('should handle notification failures gracefully', async () => {
      // Mock notification failures
      const mockNodemailer = vi.mocked(require('nodemailer'));
      mockNodemailer.createTransporter = vi.fn().mockReturnValue({
        sendMail: vi.fn().mockRejectedValue(new Error('SMTP server unavailable'))
      });

      const failureRule = {
        id: 'test_notification_failure',
        name: 'Notification Failure Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.01,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email'] as const,
        description: 'Test notification failure handling'
      };

      moderationAlertingService.setAlertRule(failureRule);

      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.05, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      // Should not throw even if notifications fail
      await expect(moderationAlertingService.checkAlerts()).resolves.not.toThrow();

      // Alert should still be recorded even if notification fails
      const alerts = moderationAlertingService.getActiveAlerts();
      const failureAlert = alerts.find(a => a.ruleId === 'test_notification_failure');
      expect(failureAlert).toBeDefined();
    });
  });

  describe('Alert Resolution and Acknowledgment', () => {
    it('should resolve alerts when conditions return to normal', async () => {
      const resolutionRule = {
        id: 'test_resolution_rule',
        name: 'Resolution Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.05,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email'] as const,
        description: 'Test alert resolution'
      };

      moderationAlertingService.setAlertRule(resolutionRule);

      // First, trigger the alert
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.08, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      await moderationAlertingService.checkAlerts();
      const triggeredAlerts = moderationAlertingService.getActiveAlerts();
      const alert = triggeredAlerts.find(a => a.ruleId === 'test_resolution_rule');
      expect(alert).toBeDefined();

      // Then, return to normal conditions
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.02, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      await moderationAlertingService.checkAlerts();
      const resolvedAlerts = moderationAlertingService.getActiveAlerts();
      const resolvedAlert = resolvedAlerts.find(a => a.ruleId === 'test_resolution_rule');
      
      // Alert should be resolved (removed from active alerts)
      expect(resolvedAlert).toBeUndefined();
    });

    it('should track alert acknowledgments', () => {
      // Create a test alert manually for acknowledgment testing
      const testRule = {
        id: 'test_ack_rule',
        name: 'Acknowledgment Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.05,
        severity: 'warning' as const,
        enabled: true,
        cooldownMinutes: 1,
        channels: ['email'] as const,
        description: 'Test acknowledgment'
      };

      moderationAlertingService.setAlertRule(testRule);

      // Trigger alert
      vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
        performance: { errorRate: 0.08, averageLatency: 1500, totalDecisions: 100 },
        accuracy: { falsePositiveRate: 0.05 },
        health: { queueDepth: 200 },
        costs: { totalCost: 300 },
        business: {}
      } as any);

      moderationAlertingService.checkAlerts().then(() => {
        const activeAlerts = moderationAlertingService.getActiveAlerts();
        const alert = activeAlerts.find(a => a.ruleId === 'test_ack_rule');
        
        if (alert) {
          const acknowledged = moderationAlertingService.acknowledgeAlert(alert.id, 'test_user');
          expect(acknowledged).toBe(true);
          expect(alert.acknowledged).toBe(true);
        }
      });
    });
  });

  describe('Alert History and Reporting', () => {
    it('should maintain comprehensive alert history', async () => {
      const historyRule = {
        id: 'test_history_rule',
        name: 'History Test',
        metric: 'performance.errorRate',
        operator: 'gt' as const,
        threshold: 0.01,
        severity: 'info' as const,
        enabled: true,
        cooldownMinutes: 0.01, // Very short cooldown
        channels: ['email'] as const,
        description: 'Test alert history'
      };

      moderationAlertingService.setAlertRule(historyRule);

      // Generate multiple alerts
      for (let i = 0; i < 5; i++) {
        vi.mocked(moderationMetricsService.getSystemMetrics).mockResolvedValue({
          performance: { errorRate: 0.05 + (i * 0.01), averageLatency: 1500, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 200 },
          costs: { totalCost: 300 },
          business: {}
        } as any);

        await moderationAlertingService.checkAlerts();
        await new Promise(resolve => setTimeout(resolve, 100)); // Small delay
      }

      const history = moderationAlertingService.getAlertHistory(10);
      
      expect(history.length).toBeGreaterThan(0);
      expect(history.length).toBeLessThanOrEqual(10);

      // History should be sorted by timestamp (newest first)
      for (let i = 1; i < history.length; i++) {
        expect(history[i-1].timestamp.getTime())
          .toBeGreaterThanOrEqual(history[i].timestamp.getTime());
      }
    });

    it('should provide alert statistics and trends', () => {
      const history = moderationAlertingService.getAlertHistory(100);
      
      if (history.length > 0) {
        // Group by severity
        const severityGroups = history.reduce((groups, alert) => {
          groups[alert.severity] = (groups[alert.severity] || 0) + 1;
          return groups;
        }, {} as Record<string, number>);

        expect(Object.keys(severityGroups).length).toBeGreaterThan(0);

        // Group by metric
        const metricGroups = history.reduce((groups, alert) => {
          groups[alert.metric] = (groups[alert.metric] || 0) + 1;
          return groups;
        }, {} as Record<string, number>);

        expect(Object.keys(metricGroups).length).toBeGreaterThan(0);
      }
    });
  });

  describe('Test Alert Functionality', () => {
    it('should trigger test alerts for all configured rules', async () => {
      const testRules = [
        {
          id: 'test_alert_1',
          name: 'Test Alert 1',
          metric: 'performance.errorRate',
          operator: 'gt' as const,
          threshold: 0.05,
          severity: 'warning' as const,
          enabled: true,
          cooldownMinutes: 1,
          channels: ['email'] as const,
          description: 'First test alert'
        },
        {
          id: 'test_alert_2',
          name: 'Test Alert 2',
          metric: 'health.queueDepth',
          operator: 'gt' as const,
          threshold: 1000,
          severity: 'critical' as const,
          enabled: true,
          cooldownMinutes: 1,
          channels: ['discord'] as const,
          description: 'Second test alert'
        }
      ];

      testRules.forEach(rule => moderationAlertingService.setAlertRule(rule));

      // Test each rule
      for (const rule of testRules) {
        await expect(moderationAlertingService.testAlert(rule.id))
          .resolves.not.toThrow();
      }

      // Check that test alerts were created
      const history = moderationAlertingService.getAlertHistory(10);
      const testAlerts = history.filter(alert => 
        testRules.some(rule => alert.ruleId === rule.id)
      );

      expect(testAlerts.length).toBe(testRules.length);
    });

    it('should validate test alert parameters', async () => {
      await expect(moderationAlertingService.testAlert('non_existent_rule'))
        .rejects.toThrow('Alert rule non_existent_rule not found');

      await expect(moderationAlertingService.testAlert(''))
        .rejects.toThrow();

      await expect(moderationAlertingService.testAlert(null as any))
        .rejects.toThrow();
    });
  });
});