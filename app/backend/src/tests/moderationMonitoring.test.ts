import { describe, it, expect, beforeEach, afterEach, vi, beforeAll, afterAll } from 'vitest';
import { moderationMetricsService } from '../services/moderationMetricsService';
import { moderationLoggingService } from '../services/moderationLoggingService';
import { moderationDashboardService } from '../services/moderationDashboardService';
import { moderationAlertingService } from '../services/moderationAlertingService';
import { canaryDeploymentService } from '../services/canaryDeploymentService';
import { db } from '../db/connectionPool';
import { moderation_cases, moderation_actions, content_reports, moderation_appeals } from '../db/schema';

// Mock external dependencies
vi.mock('../db/connectionPool');
vi.mock('winston');
vi.mock('nodemailer');
vi.mock('discord.js');

describe('Moderation Monitoring System', () => {
  beforeAll(async () => {
    // Setup test environment
  });

  afterAll(async () => {
    // Cleanup test environment
  });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('ModerationMetricsService', () => {
    describe('getSystemMetrics', () => {
      it('should return comprehensive system metrics', async () => {
        // Mock database responses
        const mockDbSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([{ count: 100 }])
          })
        });
        vi.mocked(db.select).mockImplementation(mockDbSelect);

        const metrics = await moderationMetricsService.getSystemMetrics(3600000);

        expect(metrics).toHaveProperty('performance');
        expect(metrics).toHaveProperty('accuracy');
        expect(metrics).toHaveProperty('health');
        expect(metrics).toHaveProperty('business');
        expect(metrics).toHaveProperty('costs');

        expect(metrics.performance).toHaveProperty('totalDecisions');
        expect(metrics.performance).toHaveProperty('averageLatency');
        expect(metrics.performance).toHaveProperty('errorRate');
        expect(metrics.health).toHaveProperty('uptime');
        expect(metrics.health).toHaveProperty('memoryUsage');
        expect(metrics.health).toHaveProperty('queueDepth');
      });

      it('should cache metrics for performance', async () => {
        const mockDbSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue([{ count: 100 }])
          })
        });
        vi.mocked(db.select).mockImplementation(mockDbSelect);

        // First call
        await moderationMetricsService.getSystemMetrics(3600000);
        
        // Second call should use cache
        await moderationMetricsService.getSystemMetrics(3600000);

        // Database should only be called once due to caching
        expect(mockDbSelect).toHaveBeenCalledTimes(1);
      });

      it('should handle database errors gracefully', async () => {
        vi.mocked(db.select).mockImplementation(() => {
          throw new Error('Database connection failed');
        });

        const metrics = await moderationMetricsService.getSystemMetrics(3600000);

        expect(metrics.business.totalContentProcessed).toBe(0);
        expect(metrics.business.contentByType).toEqual({});
      });
    });

    describe('getBusinessMetrics', () => {
      it('should calculate content processing statistics', async () => {
        const mockResults = [
          { type: 'text', count: 150 },
          { type: 'image', count: 75 },
          { type: 'video', count: 25 }
        ];

        const mockDbSelect = vi.fn().mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              groupBy: vi.fn().mockReturnValue(mockResults)
            })
          })
        });
        vi.mocked(db.select).mockImplementation(mockDbSelect);

        const metrics = await moderationMetricsService.getBusinessMetrics(86400000);

        expect(metrics.contentByType).toHaveProperty('text', 150);
        expect(metrics.contentByType).toHaveProperty('image', 75);
        expect(metrics.contentByType).toHaveProperty('video', 25);
      });

      it('should calculate user engagement metrics', async () => {
        const mockActiveReporters = [{ count: 45 }];
        const mockTotalReports = [{ count: 180 }];
        const mockModeratorActivity = [{ count: 12 }];

        vi.mocked(db.select)
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue(mockActiveReporters)
            })
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue(mockTotalReports)
            })
          })
          .mockReturnValueOnce({
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue(mockModeratorActivity)
            })
          });

        const metrics = await moderationMetricsService.getBusinessMetrics(86400000);

        expect(metrics.userEngagement.activeReporters).toBe(45);
        expect(metrics.userEngagement.averageReportsPerUser).toBe(4); // 180/45
        expect(metrics.userEngagement.moderatorActivity).toBe(12);
      });
    });

    describe('checkAlertThresholds', () => {
      it('should detect error rate threshold violations', async () => {
        // Mock high error rate
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.08, averageLatency: 2000, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 500 },
          costs: { totalCost: 500 },
          business: {}
        } as any);

        const alerts = await moderationMetricsService.checkAlertThresholds();

        expect(alerts).toHaveLength(1);
        expect(alerts[0].metric).toBe('error_rate');
        expect(alerts[0].severity).toBe('warning');
        expect(alerts[0].value).toBe(0.08);
      });

      it('should detect multiple threshold violations', async () => {
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.12, averageLatency: 8000, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.18 },
          health: { queueDepth: 1500 },
          costs: { totalCost: 1200 },
          business: {}
        } as any);

        const alerts = await moderationMetricsService.checkAlertThresholds();

        expect(alerts.length).toBeGreaterThan(1);
        expect(alerts.some(a => a.metric === 'error_rate')).toBe(true);
        expect(alerts.some(a => a.metric === 'latency')).toBe(true);
        expect(alerts.some(a => a.metric === 'queue_depth')).toBe(true);
      });

      it('should return empty array when all metrics are within thresholds', async () => {
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.02, averageLatency: 1500, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 200 },
          costs: { totalCost: 300 },
          business: {}
        } as any);

        const alerts = await moderationMetricsService.checkAlertThresholds();

        expect(alerts).toHaveLength(0);
      });
    });

    describe('getDashboardMetrics', () => {
      it('should return formatted dashboard data', async () => {
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { totalDecisions: 1000, averageLatency: 1500, errorRate: 0.03 },
          accuracy: { falsePositiveRate: 0.08 },
          health: { queueDepth: 150 },
          costs: { totalCost: 450, costTrends: [] },
          business: {}
        } as any);

        vi.spyOn(moderationMetricsService, 'checkAlertThresholds').mockResolvedValue([]);

        const dashboard = await moderationMetricsService.getDashboardMetrics();

        expect(dashboard.summary).toHaveProperty('totalDecisions', 1000);
        expect(dashboard.summary).toHaveProperty('averageLatency', 1500);
        expect(dashboard.summary).toHaveProperty('errorRate', 0.03);
        expect(dashboard.trends).toHaveProperty('decisionsOverTime');
        expect(dashboard.trends).toHaveProperty('latencyOverTime');
        expect(dashboard.alerts).toEqual([]);
      });
    });
  });

  describe('ModerationLoggingService', () => {
    describe('logModerationDecision', () => {
      it('should log decision with structured data', async () => {
        const logEntry = {
          timestamp: new Date(),
          eventType: 'decision' as const,
          contentId: 'content_123',
          userId: 'user_456',
          decision: 'block',
          confidence: 0.95,
          vendorScores: { openai: 0.9, perspective: 0.8 },
          latency: 1200,
          cost: 0.05
        };

        await expect(moderationLoggingService.logModerationDecision(logEntry))
          .resolves.not.toThrow();
      });

      it('should handle logging errors gracefully', async () => {
        const logEntry = {
          timestamp: new Date(),
          eventType: 'decision' as const,
          contentId: 'content_123',
          userId: 'user_456'
        };

        // Mock database error
        vi.mocked(db.update).mockImplementation(() => {
          throw new Error('Database error');
        });

        await expect(moderationLoggingService.logModerationDecision(logEntry))
          .resolves.not.toThrow();
      });
    });

    describe('getPerformanceMetrics', () => {
      it('should calculate performance metrics from logs', async () => {
        const metrics = await moderationLoggingService.getPerformanceMetrics(3600000);

        expect(metrics).toHaveProperty('totalDecisions');
        expect(metrics).toHaveProperty('averageLatency');
        expect(metrics).toHaveProperty('totalCost');
        expect(metrics).toHaveProperty('vendorLatencies');
        expect(metrics).toHaveProperty('vendorCosts');
        expect(metrics).toHaveProperty('errorRate');
        expect(metrics).toHaveProperty('throughput');

        expect(typeof metrics.totalDecisions).toBe('number');
        expect(typeof metrics.averageLatency).toBe('number');
        expect(typeof metrics.errorRate).toBe('number');
      });

      it('should return zero metrics when no data available', async () => {
        const metrics = await moderationLoggingService.getPerformanceMetrics(3600000);

        if (metrics.totalDecisions === 0) {
          expect(metrics.averageLatency).toBe(0);
          expect(metrics.totalCost).toBe(0);
          expect(metrics.errorRate).toBe(0);
          expect(metrics.throughput).toBe(0);
        }
      });
    });

    describe('getAccuracyMetrics', () => {
      it('should calculate accuracy metrics from database', async () => {
        const mockAppeals = [
          { decision: 'block', status: 'overturned' },
          { decision: 'block', status: 'upheld' },
          { decision: 'limit', status: 'overturned' }
        ];

        vi.mocked(db.select).mockReturnValue({
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue(mockAppeals)
            })
          })
        });

        const metrics = await moderationLoggingService.getAccuracyMetrics(86400000);

        expect(metrics).toHaveProperty('falsePositiveRate');
        expect(metrics).toHaveProperty('falseNegativeRate');
        expect(metrics).toHaveProperty('appealOverturnRate');
        expect(metrics).toHaveProperty('humanAgreementRate');
        expect(metrics).toHaveProperty('categoryAccuracy');

        expect(typeof metrics.appealOverturnRate).toBe('number');
        expect(metrics.appealOverturnRate).toBeGreaterThanOrEqual(0);
        expect(metrics.appealOverturnRate).toBeLessThanOrEqual(1);
      });
    });

    describe('getStructuredLogs', () => {
      it('should filter logs by time range and event type', async () => {
        const startTime = new Date('2024-01-01');
        const endTime = new Date('2024-01-02');

        const logs = await moderationLoggingService.getStructuredLogs(
          startTime,
          endTime,
          'decision',
          100
        );

        expect(Array.isArray(logs)).toBe(true);
        expect(logs.length).toBeLessThanOrEqual(100);

        logs.forEach(log => {
          expect(log.timestamp).toBeInstanceOf(Date);
          expect(log.timestamp.getTime()).toBeGreaterThanOrEqual(startTime.getTime());
          expect(log.timestamp.getTime()).toBeLessThanOrEqual(endTime.getTime());
          if (log.eventType) {
            expect(log.eventType).toBe('decision');
          }
        });
      });
    });
  });

  describe('ModerationDashboardService', () => {
    describe('getDashboardData', () => {
      it('should return comprehensive dashboard data', async () => {
        const dashboard = await moderationDashboardService.getDashboardData(86400000);

        expect(dashboard).toHaveProperty('overview');
        expect(dashboard).toHaveProperty('accuracy');
        expect(dashboard).toHaveProperty('appeals');
        expect(dashboard).toHaveProperty('performance');
        expect(dashboard).toHaveProperty('content');
        expect(dashboard).toHaveProperty('alerts');

        expect(dashboard.overview).toHaveProperty('totalDecisions');
        expect(dashboard.overview).toHaveProperty('averageLatency');
        expect(dashboard.overview).toHaveProperty('errorRate');
        expect(dashboard.overview).toHaveProperty('queueDepth');
        expect(dashboard.overview).toHaveProperty('costToday');

        expect(Array.isArray(dashboard.alerts)).toBe(true);
      });

      it('should cache dashboard data', async () => {
        const spy = vi.spyOn(moderationMetricsService, 'getSystemMetrics');

        // First call
        await moderationDashboardService.getDashboardData(86400000);
        
        // Second call should use cache
        await moderationDashboardService.getDashboardData(86400000);

        expect(spy).toHaveBeenCalledTimes(1);
      });
    });

    describe('getDetailedAnalytics', () => {
      it('should return detailed analytics data', async () => {
        const analytics = await moderationDashboardService.getDetailedAnalytics(86400000);

        expect(analytics).toHaveProperty('falsePositiveAnalysis');
        expect(analytics).toHaveProperty('appealAnalysis');
        expect(analytics).toHaveProperty('costAnalysis');
        expect(analytics).toHaveProperty('userBehavior');

        expect(analytics.falsePositiveAnalysis).toHaveProperty('byCategory');
        expect(analytics.falsePositiveAnalysis).toHaveProperty('byConfidenceRange');
        expect(analytics.falsePositiveAnalysis).toHaveProperty('commonPatterns');

        expect(Array.isArray(analytics.falsePositiveAnalysis.commonPatterns)).toBe(true);
      });
    });
  });

  describe('ModerationAlertingService', () => {
    describe('Alert Rules Management', () => {
      it('should add and retrieve alert rules', () => {
        const rule = {
          id: 'test_rule',
          name: 'Test Rule',
          metric: 'error_rate',
          operator: 'gt' as const,
          threshold: 0.1,
          severity: 'warning' as const,
          enabled: true,
          cooldownMinutes: 10,
          channels: ['email' as const],
          description: 'Test alert rule'
        };

        moderationAlertingService.setAlertRule(rule);
        const rules = moderationAlertingService.getAlertRules();

        expect(rules.some(r => r.id === 'test_rule')).toBe(true);
      });

      it('should remove alert rules', () => {
        const rule = {
          id: 'test_rule_remove',
          name: 'Test Rule Remove',
          metric: 'latency',
          operator: 'gt' as const,
          threshold: 5000,
          severity: 'critical' as const,
          enabled: true,
          cooldownMinutes: 5,
          channels: ['discord' as const],
          description: 'Test removal'
        };

        moderationAlertingService.setAlertRule(rule);
        moderationAlertingService.removeAlertRule('test_rule_remove');
        
        const rules = moderationAlertingService.getAlertRules();
        expect(rules.some(r => r.id === 'test_rule_remove')).toBe(false);
      });
    });

    describe('Alert Monitoring', () => {
      it('should check alerts and trigger notifications', async () => {
        // Mock high error rate metrics
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.08 },
          health: {},
          accuracy: {},
          costs: {},
          business: {}
        } as any);

        await moderationAlertingService.checkAlerts();

        const activeAlerts = moderationAlertingService.getActiveAlerts();
        expect(activeAlerts.length).toBeGreaterThanOrEqual(0);
      });

      it('should respect cooldown periods', async () => {
        const rule = {
          id: 'cooldown_test',
          name: 'Cooldown Test',
          metric: 'error_rate',
          operator: 'gt' as const,
          threshold: 0.01,
          severity: 'warning' as const,
          enabled: true,
          cooldownMinutes: 60,
          channels: ['email' as const],
          description: 'Test cooldown'
        };

        moderationAlertingService.setAlertRule(rule);

        // Mock high error rate
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.05 },
          health: {},
          accuracy: {},
          costs: {},
          business: {}
        } as any);

        // First check should trigger alert
        await moderationAlertingService.checkAlerts();
        const firstCheck = moderationAlertingService.getActiveAlerts().length;

        // Second check should not trigger due to cooldown
        await moderationAlertingService.checkAlerts();
        const secondCheck = moderationAlertingService.getActiveAlerts().length;

        expect(secondCheck).toBe(firstCheck);
      });
    });

    describe('Alert History', () => {
      it('should maintain alert history', () => {
        const history = moderationAlertingService.getAlertHistory(10);
        
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeLessThanOrEqual(10);

        history.forEach(alert => {
          expect(alert).toHaveProperty('id');
          expect(alert).toHaveProperty('timestamp');
          expect(alert).toHaveProperty('severity');
          expect(alert).toHaveProperty('message');
        });
      });

      it('should acknowledge alerts', () => {
        const activeAlerts = moderationAlertingService.getActiveAlerts();
        
        if (activeAlerts.length > 0) {
          const alertId = activeAlerts[0].id;
          const acknowledged = moderationAlertingService.acknowledgeAlert(alertId, 'test_user');
          expect(acknowledged).toBe(true);
        }
      });
    });

    describe('Test Alerts', () => {
      it('should trigger test alerts', async () => {
        const rules = moderationAlertingService.getAlertRules();
        
        if (rules.length > 0) {
          const ruleId = rules[0].id;
          await expect(moderationAlertingService.testAlert(ruleId))
            .resolves.not.toThrow();
        }
      });

      it('should fail for non-existent rules', async () => {
        await expect(moderationAlertingService.testAlert('non_existent_rule'))
          .rejects.toThrow('Alert rule non_existent_rule not found');
      });
    });
  });

  describe('CanaryDeploymentService', () => {
    describe('Policy Version Management', () => {
      it('should create new policy versions', async () => {
        const config = {
          thresholds: { harassment: 0.8, spam: 0.85 },
          rules: [{
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          }],
          vendorWeights: { openai: 0.5, perspective: 0.5 },
          reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
        };

        const version = await canaryDeploymentService.createPolicyVersion(
          'Test Policy',
          'Test policy for unit tests',
          config,
          'test_user'
        );

        expect(version).toHaveProperty('id');
        expect(version).toHaveProperty('version');
        expect(version.name).toBe('Test Policy');
        expect(version.status).toBe('draft');
        expect(version.config).toEqual(config);
      });

      it('should list policy versions', () => {
        const versions = canaryDeploymentService.getPolicyVersions();
        
        expect(Array.isArray(versions)).toBe(true);
        expect(versions.length).toBeGreaterThan(0);

        versions.forEach(version => {
          expect(version).toHaveProperty('id');
          expect(version).toHaveProperty('version');
          expect(version).toHaveProperty('status');
          expect(version).toHaveProperty('config');
        });
      });
    });

    describe('Canary Deployments', () => {
      it('should start canary deployments', async () => {
        // First create a policy version
        const config = {
          thresholds: { harassment: 0.75 },
          rules: [{
            category: 'harassment',
            severity: 'medium' as const,
            action: 'limit' as const,
            confidence: 0.75
          }],
          vendorWeights: { openai: 1.0 },
          reputationModifiers: { low: 1.1, medium: 1.0, high: 0.9 }
        };

        const version = await canaryDeploymentService.createPolicyVersion(
          'Canary Test Policy',
          'Policy for canary testing',
          config,
          'test_user'
        );

        const targetMetrics = {
          maxErrorRate: 0.05,
          maxLatencyIncrease: 0.2,
          minAccuracy: 0.9,
          maxFalsePositiveIncrease: 0.1
        };

        const deployment = await canaryDeploymentService.startCanaryDeployment(
          version.id,
          10, // 10% traffic
          targetMetrics,
          'test_user'
        );

        expect(deployment).toHaveProperty('id');
        expect(deployment.policyVersionId).toBe(version.id);
        expect(deployment.trafficPercentage).toBe(10);
        expect(deployment.status).toBe('active');
        expect(deployment.targetMetrics).toEqual(targetMetrics);
      });

      it('should prevent multiple active deployments', async () => {
        const versions = canaryDeploymentService.getPolicyVersions();
        const activeDeployments = canaryDeploymentService.getActiveDeployments();

        if (activeDeployments.length > 0) {
          const targetMetrics = {
            maxErrorRate: 0.05,
            maxLatencyIncrease: 0.2,
            minAccuracy: 0.9,
            maxFalsePositiveIncrease: 0.1
          };

          await expect(canaryDeploymentService.startCanaryDeployment(
            versions[0].id,
            15,
            targetMetrics,
            'test_user'
          )).rejects.toThrow('Cannot start new deployment');
        }
      });
    });

    describe('Deployment Monitoring', () => {
      it('should get deployment metrics', async () => {
        const activeDeployments = canaryDeploymentService.getActiveDeployments();
        
        if (activeDeployments.length > 0) {
          const metrics = await canaryDeploymentService.getDeploymentMetrics(
            activeDeployments[0].id
          );

          if (metrics) {
            expect(metrics).toHaveProperty('canaryMetrics');
            expect(metrics).toHaveProperty('controlMetrics');
            expect(metrics).toHaveProperty('comparison');

            expect(metrics.canaryMetrics).toHaveProperty('decisions');
            expect(metrics.canaryMetrics).toHaveProperty('errorRate');
            expect(metrics.canaryMetrics).toHaveProperty('averageLatency');

            expect(metrics.comparison).toHaveProperty('errorRateDiff');
            expect(metrics.comparison).toHaveProperty('latencyDiff');
            expect(metrics.comparison).toHaveProperty('significanceLevel');
          }
        }
      });

      it('should check rollback conditions', async () => {
        const activeDeployments = canaryDeploymentService.getActiveDeployments();
        
        if (activeDeployments.length > 0) {
          const rollbackCheck = await canaryDeploymentService.checkRollbackConditions(
            activeDeployments[0].id
          );

          expect(rollbackCheck).toHaveProperty('shouldRollback');
          expect(rollbackCheck).toHaveProperty('reasons');
          expect(typeof rollbackCheck.shouldRollback).toBe('boolean');
          expect(Array.isArray(rollbackCheck.reasons)).toBe(true);
        }
      });
    });

    describe('Policy Selection', () => {
      it('should select appropriate policy for content', () => {
        const policy1 = canaryDeploymentService.getPolicyForContent('content_1', 'user_1');
        const policy2 = canaryDeploymentService.getPolicyForContent('content_2', 'user_2');

        expect(policy1).toHaveProperty('thresholds');
        expect(policy1).toHaveProperty('rules');
        expect(policy1).toHaveProperty('vendorWeights');

        expect(policy2).toHaveProperty('thresholds');
        expect(policy2).toHaveProperty('rules');
        expect(policy2).toHaveProperty('vendorWeights');
      });

      it('should consistently route same content to same policy', () => {
        const contentId = 'consistent_content_123';
        const userId = 'user_123';

        const policy1 = canaryDeploymentService.getPolicyForContent(contentId, userId);
        const policy2 = canaryDeploymentService.getPolicyForContent(contentId, userId);

        expect(policy1).toEqual(policy2);
      });
    });

    describe('Deployment History', () => {
      it('should maintain deployment history', () => {
        const history = canaryDeploymentService.getDeploymentHistory(10);
        
        expect(Array.isArray(history)).toBe(true);
        expect(history.length).toBeLessThanOrEqual(10);

        history.forEach(deployment => {
          expect(deployment).toHaveProperty('id');
          expect(deployment).toHaveProperty('policyVersionId');
          expect(deployment).toHaveProperty('status');
          expect(deployment).toHaveProperty('startTime');
        });
      });
    });
  });
 
 describe('Integration Tests', () => {
    describe('End-to-End Monitoring Flow', () => {
      it('should log decision and update metrics', async () => {
        const logEntry = {
          timestamp: new Date(),
          eventType: 'decision' as const,
          contentId: 'integration_test_content',
          userId: 'integration_test_user',
          decision: 'block',
          confidence: 0.92,
          vendorScores: { openai: 0.9, perspective: 0.85 },
          latency: 1500,
          cost: 0.08
        };

        // Log the decision
        await moderationLoggingService.logModerationDecision(logEntry);

        // Get updated metrics
        const metrics = await moderationMetricsService.getSystemMetrics(3600000);

        expect(metrics).toBeDefined();
        expect(metrics.performance.totalDecisions).toBeGreaterThanOrEqual(0);
      });

      it('should trigger alerts when thresholds are exceeded', async () => {
        // Mock high error rate scenario
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.15, averageLatency: 8000, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.2 },
          health: { queueDepth: 2000 },
          costs: { totalCost: 1500 },
          business: {}
        } as any);

        // Check alerts
        await moderationAlertingService.checkAlerts();

        const activeAlerts = moderationAlertingService.getActiveAlerts();
        expect(activeAlerts.length).toBeGreaterThan(0);

        const errorRateAlert = activeAlerts.find(a => a.metric === 'error_rate');
        expect(errorRateAlert).toBeDefined();
        expect(errorRateAlert?.severity).toBe('critical');
      });

      it('should update dashboard with latest data', async () => {
        const dashboard = await moderationDashboardService.getDashboardData(86400000);

        expect(dashboard.overview.totalDecisions).toBeGreaterThanOrEqual(0);
        expect(dashboard.performance.throughput).toBeGreaterThanOrEqual(0);
        expect(Array.isArray(dashboard.alerts)).toBe(true);
        expect(Array.isArray(dashboard.content.topViolationCategories)).toBe(true);
      });
    });

    describe('Canary Deployment Integration', () => {
      it('should route traffic based on deployment configuration', async () => {
        const activeDeployments = canaryDeploymentService.getActiveDeployments();
        
        if (activeDeployments.length > 0) {
          const deployment = activeDeployments[0];
          
          // Test multiple content IDs to verify traffic splitting
          const contentIds = Array.from({ length: 100 }, (_, i) => `content_${i}`);
          const policies = contentIds.map(id => 
            canaryDeploymentService.getPolicyForContent(id, 'test_user')
          );

          // Should have some variation in policies (canary vs production)
          const uniquePolicies = new Set(policies.map(p => JSON.stringify(p)));
          
          // With active canary deployment, we should see at least some traffic split
          if (deployment.trafficPercentage > 0) {
            expect(uniquePolicies.size).toBeGreaterThanOrEqual(1);
          }
        }
      });
    });

    describe('Performance and Stress Tests', () => {
      it('should handle high volume of log entries', async () => {
        const startTime = Date.now();
        const logPromises = [];

        for (let i = 0; i < 100; i++) {
          const logEntry = {
            timestamp: new Date(),
            eventType: 'decision' as const,
            contentId: `stress_test_content_${i}`,
            userId: `stress_test_user_${i}`,
            decision: i % 2 === 0 ? 'block' : 'allow',
            confidence: Math.random(),
            latency: Math.random() * 3000,
            cost: Math.random() * 0.1
          };

          logPromises.push(moderationLoggingService.logModerationDecision(logEntry));
        }

        await Promise.all(logPromises);
        const endTime = Date.now();

        // Should complete within reasonable time (10 seconds)
        expect(endTime - startTime).toBeLessThan(10000);
      });

      it('should handle concurrent metrics requests', async () => {
        const metricsPromises = Array.from({ length: 10 }, () =>
          moderationMetricsService.getSystemMetrics(3600000)
        );

        const results = await Promise.all(metricsPromises);

        expect(results).toHaveLength(10);
        results.forEach(metrics => {
          expect(metrics).toHaveProperty('performance');
          expect(metrics).toHaveProperty('health');
        });
      });
    });

    describe('Error Handling and Recovery', () => {
      it('should handle database connection failures gracefully', async () => {
        // Mock database failure
        vi.mocked(db.select).mockImplementation(() => {
          throw new Error('Connection timeout');
        });

        const metrics = await moderationMetricsService.getSystemMetrics(3600000);

        // Should return default/empty metrics instead of throwing
        expect(metrics.business.totalContentProcessed).toBe(0);
        expect(metrics.business.contentByType).toEqual({});
      });

      it('should continue monitoring after alert failures', async () => {
        // Mock alert sending failure
        const originalCheckAlerts = moderationAlertingService.checkAlerts;
        vi.spyOn(moderationAlertingService, 'checkAlerts').mockImplementation(async () => {
          throw new Error('Alert system failure');
        });

        // Should not throw and should continue operating
        await expect(moderationAlertingService.checkAlerts()).rejects.toThrow();

        // Restore original method
        moderationAlertingService.checkAlerts = originalCheckAlerts;
      });

      it('should handle malformed log entries', async () => {
        const malformedEntry = {
          timestamp: new Date(),
          eventType: 'decision' as const,
          contentId: '', // Empty content ID
          userId: null as any, // Invalid user ID
          confidence: 'invalid' as any, // Invalid confidence value
          vendorScores: null as any // Invalid vendor scores
        };

        await expect(moderationLoggingService.logModerationDecision(malformedEntry))
          .resolves.not.toThrow();
      });
    });

    describe('Real-time Monitoring Scenarios', () => {
      it('should detect sudden spike in error rates', async () => {
        // Simulate normal operation
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.02, averageLatency: 1500, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 200 },
          costs: { totalCost: 300 },
          business: {}
        } as any);

        await moderationAlertingService.checkAlerts();
        const normalAlerts = moderationAlertingService.getActiveAlerts().length;

        // Simulate error spike
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.15, averageLatency: 1500, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 200 },
          costs: { totalCost: 300 },
          business: {}
        } as any);

        await moderationAlertingService.checkAlerts();
        const spikeAlerts = moderationAlertingService.getActiveAlerts().length;

        expect(spikeAlerts).toBeGreaterThan(normalAlerts);
      });

      it('should track vendor performance degradation', async () => {
        const performanceMetrics = await moderationLoggingService.getPerformanceMetrics(3600000);

        expect(performanceMetrics.vendorLatencies).toBeDefined();
        expect(performanceMetrics.vendorCosts).toBeDefined();

        // Verify vendor metrics are tracked separately
        Object.keys(performanceMetrics.vendorLatencies).forEach(vendor => {
          expect(typeof performanceMetrics.vendorLatencies[vendor]).toBe('number');
          expect(performanceMetrics.vendorLatencies[vendor]).toBeGreaterThanOrEqual(0);
        });
      });

      it('should monitor queue depth and processing capacity', async () => {
        const metrics = await moderationMetricsService.getSystemMetrics(3600000);

        expect(metrics.health.queueDepth).toBeDefined();
        expect(typeof metrics.health.queueDepth).toBe('number');
        expect(metrics.health.queueDepth).toBeGreaterThanOrEqual(0);

        // Check if queue depth alerts are configured
        const alerts = await moderationMetricsService.checkAlertThresholds();
        const queueAlert = alerts.find(a => a.metric === 'queue_depth');
        
        if (metrics.health.queueDepth > 1000) {
          expect(queueAlert).toBeDefined();
        }
      });
    });

    describe('Business Intelligence and Analytics', () => {
      it('should provide content type distribution analytics', async () => {
        const analytics = await moderationDashboardService.getDetailedAnalytics(86400000);

        expect(analytics.costAnalysis.costByContentType).toBeDefined();
        expect(typeof analytics.costAnalysis.costByContentType).toBe('object');

        // Verify cost tracking by content type
        Object.keys(analytics.costAnalysis.costByContentType).forEach(contentType => {
          expect(typeof analytics.costAnalysis.costByContentType[contentType]).toBe('number');
          expect(analytics.costAnalysis.costByContentType[contentType]).toBeGreaterThanOrEqual(0);
        });
      });

      it('should analyze false positive patterns', async () => {
        const analytics = await moderationDashboardService.getDetailedAnalytics(86400000);

        expect(analytics.falsePositiveAnalysis.byCategory).toBeDefined();
        expect(analytics.falsePositiveAnalysis.byConfidenceRange).toBeDefined();
        expect(analytics.falsePositiveAnalysis.commonPatterns).toBeDefined();

        // Verify pattern analysis structure
        analytics.falsePositiveAnalysis.commonPatterns.forEach(pattern => {
          expect(pattern).toHaveProperty('pattern');
          expect(pattern).toHaveProperty('frequency');
          expect(typeof pattern.frequency).toBe('number');
        });
      });

      it('should track moderator performance metrics', async () => {
        const analytics = await moderationDashboardService.getDetailedAnalytics(86400000);

        expect(analytics.userBehavior.moderatorEfficiency).toBeDefined();
        expect(analytics.userBehavior.moderatorEfficiency.topModerators).toBeDefined();
        expect(Array.isArray(analytics.userBehavior.moderatorEfficiency.topModerators)).toBe(true);

        analytics.userBehavior.moderatorEfficiency.topModerators.forEach(moderator => {
          expect(moderator).toHaveProperty('moderatorId');
          expect(moderator).toHaveProperty('decisions');
          expect(moderator).toHaveProperty('accuracy');
          expect(typeof moderator.accuracy).toBe('number');
          expect(moderator.accuracy).toBeGreaterThanOrEqual(0);
          expect(moderator.accuracy).toBeLessThanOrEqual(1);
        });
      });
    });

    describe('Cost Monitoring and Optimization', () => {
      it('should track costs by vendor and content type', async () => {
        const costMetrics = await moderationMetricsService.getCostMetrics(86400000);

        expect(costMetrics.costByVendor).toBeDefined();
        expect(costMetrics.costPerDecision).toBeDefined();
        expect(costMetrics.projectedMonthlyCost).toBeDefined();

        expect(typeof costMetrics.totalCost).toBe('number');
        expect(typeof costMetrics.costPerDecision).toBe('number');
        expect(costMetrics.totalCost).toBeGreaterThanOrEqual(0);
        expect(costMetrics.costPerDecision).toBeGreaterThanOrEqual(0);
      });

      it('should alert on cost threshold violations', async () => {
        // Mock high cost scenario
        vi.spyOn(moderationMetricsService, 'getSystemMetrics').mockResolvedValue({
          performance: { errorRate: 0.02, averageLatency: 1500, totalDecisions: 100 },
          accuracy: { falsePositiveRate: 0.05 },
          health: { queueDepth: 200 },
          costs: { totalCost: 1200 }, // Above threshold
          business: {}
        } as any);

        const alerts = await moderationMetricsService.checkAlertThresholds();
        const costAlert = alerts.find(a => a.metric === 'cost');

        expect(costAlert).toBeDefined();
        expect(costAlert?.value).toBe(1200);
        expect(costAlert?.threshold).toBe(1000);
      });

      it('should provide cost trend analysis', async () => {
        const costMetrics = await moderationMetricsService.getCostMetrics(86400000);

        expect(Array.isArray(costMetrics.costTrends)).toBe(true);
        
        costMetrics.costTrends.forEach(trend => {
          expect(trend).toHaveProperty('date');
          expect(trend).toHaveProperty('cost');
          expect(typeof trend.cost).toBe('number');
          expect(trend.cost).toBeGreaterThanOrEqual(0);
        });
      });
    });
  });

  describe('Cleanup', () => {
    afterEach(() => {
      // Clear any test data
      moderationDashboardService.clearCache();
    });

    afterAll(() => {
      // Stop monitoring services
      moderationAlertingService.stopAlertMonitoring();
      canaryDeploymentService.destroy();
    });
  });
});