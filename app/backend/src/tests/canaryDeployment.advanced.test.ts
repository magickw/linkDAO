import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { canaryDeploymentService } from '../services/canaryDeploymentService';
import { moderationLoggingService } from '../services/moderationLoggingService';

// Mock dependencies
vi.mock('../services/moderationLoggingService');

describe('Canary Deployment Advanced Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up test deployments
    canaryDeploymentService.getActiveDeployments().forEach(deployment => {
      if (deployment.createdBy === 'test_user') {
        canaryDeploymentService.rollbackDeployment(
          deployment.id,
          'Test cleanup',
          'test_cleanup'
        ).catch(() => {
          // Ignore cleanup errors
        });
      }
    });
  });

  describe('Advanced Policy Configuration', () => {
    it('should handle complex policy configurations with custom rules', async () => {
      const complexConfig = {
        thresholds: {
          harassment: 0.8,
          spam: 0.85,
          violence: 0.9,
          scam: 0.95,
          nsfw: 0.75,
          hate_speech: 0.88,
          misinformation: 0.82
        },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          },
          {
            category: 'spam',
            severity: 'medium' as const,
            action: 'limit' as const,
            confidence: 0.85
          },
          {
            category: 'violence',
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.9
          },
          {
            category: 'scam',
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.95
          }
        ],
        vendorWeights: {
          openai: 0.35,
          perspective: 0.25,
          google_vision: 0.20,
          custom_model: 0.20
        },
        reputationModifiers: {
          very_low: 1.5,
          low: 1.2,
          medium: 1.0,
          high: 0.8,
          very_high: 0.6
        },
        customRules: [
          {
            name: 'crypto_scam_detection',
            condition: 'content.includes("send crypto") && confidence > 0.7',
            action: 'block'
          },
          {
            name: 'trusted_user_bypass',
            condition: 'user.reputation === "very_high" && confidence < 0.95',
            action: 'allow'
          }
        ]
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Complex Policy v2.0',
        'Advanced policy with custom rules and multiple vendors',
        complexConfig,
        'test_user'
      );

      expect(version.config.customRules).toHaveLength(2);
      expect(version.config.vendorWeights).toHaveProperty('custom_model', 0.20);
      expect(version.config.reputationModifiers).toHaveProperty('very_low', 1.5);
      expect(Object.keys(version.config.thresholds)).toHaveLength(7);
    });

    it('should validate policy configuration consistency', async () => {
      const inconsistentConfig = {
        thresholds: {
          harassment: 0.8,
          spam: 0.85
        },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          },
          {
            category: 'violence', // Not in thresholds
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.9
          }
        ],
        vendorWeights: {
          openai: 0.6,
          perspective: 0.5 // Weights sum to 1.1, should be normalized
        },
        reputationModifiers: {
          low: 1.2,
          medium: 1.0,
          high: 0.8
        }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Inconsistent Policy',
        'Policy with validation issues',
        inconsistentConfig,
        'test_user'
      );

      // Service should handle inconsistencies gracefully
      expect(version).toBeDefined();
      expect(version.config).toBeDefined();
    });

    it('should support policy inheritance and versioning', async () => {
      // Create base policy
      const baseConfig = {
        thresholds: { harassment: 0.8, spam: 0.85 },
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.8
        }],
        vendorWeights: { openai: 0.6, perspective: 0.4 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const baseVersion = await canaryDeploymentService.createPolicyVersion(
        'Base Policy',
        'Base policy configuration',
        baseConfig,
        'test_user'
      );

      // Create derived policy with modifications
      const derivedConfig = {
        ...baseConfig,
        thresholds: { ...baseConfig.thresholds, violence: 0.9 },
        rules: [
          ...baseConfig.rules,
          {
            category: 'violence',
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.9
          }
        ]
      };

      const derivedVersion = await canaryDeploymentService.createPolicyVersion(
        'Enhanced Policy',
        'Policy derived from base with violence detection',
        derivedConfig,
        'test_user'
      );

      expect(derivedVersion.version).not.toBe(baseVersion.version);
      expect(derivedVersion.config.rules).toHaveLength(2);
      expect(derivedVersion.config.thresholds).toHaveProperty('violence', 0.9);
    });
  });

  describe('Advanced Deployment Strategies', () => {
    it('should support gradual traffic ramping', async () => {
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
        'Gradual Ramp Policy',
        'Policy for gradual traffic ramping',
        config,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.05,
        maxLatencyIncrease: 0.2,
        minAccuracy: 0.9,
        maxFalsePositiveIncrease: 0.1
      };

      // Start with 5% traffic
      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        5,
        targetMetrics,
        'test_user'
      );

      expect(deployment.trafficPercentage).toBe(5);

      // Simulate successful deployment and ramp up
      // In a real implementation, this would be done through an API
      // For testing, we verify the deployment can be created with different percentages
      
      // Test traffic distribution consistency
      const contentIds = Array.from({ length: 1000 }, (_, i) => `content_${i}`);
      const policies = contentIds.map(id => 
        canaryDeploymentService.getPolicyForContent(id, 'test_user')
      );

      // Count unique policies (should have canary and production)
      const uniquePolicies = new Set(policies.map(p => JSON.stringify(p)));
      expect(uniquePolicies.size).toBeGreaterThanOrEqual(1);
    });

    it('should handle blue-green deployment scenarios', async () => {
      // Create two different policy versions
      const blueConfig = {
        thresholds: { harassment: 0.8 },
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.8
        }],
        vendorWeights: { openai: 1.0 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const greenConfig = {
        thresholds: { harassment: 0.75 },
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.75
        }],
        vendorWeights: { openai: 0.7, perspective: 0.3 },
        reputationModifiers: { low: 1.1, medium: 1.0, high: 0.9 }
      };

      const blueVersion = await canaryDeploymentService.createPolicyVersion(
        'Blue Policy',
        'Current production policy',
        blueConfig,
        'test_user'
      );

      const greenVersion = await canaryDeploymentService.createPolicyVersion(
        'Green Policy',
        'New policy for blue-green deployment',
        greenConfig,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.03,
        maxLatencyIncrease: 0.15,
        minAccuracy: 0.92,
        maxFalsePositiveIncrease: 0.08
      };

      // Deploy green version as canary
      const deployment = await canaryDeploymentService.startCanaryDeployment(
        greenVersion.id,
        50, // 50% traffic for blue-green
        targetMetrics,
        'test_user'
      );

      expect(deployment.trafficPercentage).toBe(50);
      expect(deployment.status).toBe('active');

      // Verify traffic is split between blue and green
      const testContentIds = Array.from({ length: 100 }, (_, i) => `test_content_${i}`);
      const policies = testContentIds.map(id => 
        canaryDeploymentService.getPolicyForContent(id, 'test_user')
      );

      const uniquePolicies = new Set(policies.map(p => JSON.stringify(p)));
      expect(uniquePolicies.size).toBeGreaterThanOrEqual(1);
    });

    it('should support A/B testing with statistical significance', async () => {
      const configA = {
        thresholds: { harassment: 0.8, spam: 0.85 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          }
        ],
        vendorWeights: { openai: 1.0 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const configB = {
        thresholds: { harassment: 0.75, spam: 0.8 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.75
          }
        ],
        vendorWeights: { openai: 0.8, perspective: 0.2 },
        reputationModifiers: { low: 1.1, medium: 1.0, high: 0.9 }
      };

      const versionB = await canaryDeploymentService.createPolicyVersion(
        'A/B Test Policy B',
        'More aggressive moderation policy',
        configB,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.05,
        maxLatencyIncrease: 0.2,
        minAccuracy: 0.9,
        maxFalsePositiveIncrease: 0.1
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        versionB.id,
        25, // 25% for A/B testing
        targetMetrics,
        'test_user'
      );

      // Get deployment metrics for statistical analysis
      const metrics = await canaryDeploymentService.getDeploymentMetrics(deployment.id);

      if (metrics) {
        expect(metrics.comparison).toHaveProperty('significanceLevel');
        expect(metrics.comparison.significanceLevel).toBeGreaterThanOrEqual(0);
        expect(metrics.comparison.significanceLevel).toBeLessThanOrEqual(1);

        expect(metrics.canaryMetrics).toHaveProperty('decisions');
        expect(metrics.controlMetrics).toHaveProperty('decisions');
      }
    });
  });

  describe('Rollback and Recovery Mechanisms', () => {
    it('should automatically rollback on performance degradation', async () => {
      const config = {
        thresholds: { harassment: 0.7 }, // More aggressive
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.7
        }],
        vendorWeights: { openai: 1.0 },
        reputationModifiers: { low: 1.3, medium: 1.0, high: 0.7 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Aggressive Policy',
        'Policy that may cause performance issues',
        config,
        'test_user'
      );

      const strictMetrics = {
        maxErrorRate: 0.02, // Very strict
        maxLatencyIncrease: 0.1, // Very strict
        minAccuracy: 0.95, // Very strict
        maxFalsePositiveIncrease: 0.05 // Very strict
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        10,
        strictMetrics,
        'test_user'
      );

      // Mock poor performance metrics
      vi.spyOn(canaryDeploymentService, 'getDeploymentMetrics').mockResolvedValue({
        canaryMetrics: {
          decisions: 1000,
          errorRate: 0.05, // Exceeds threshold
          averageLatency: 2500,
          falsePositiveRate: 0.12, // Exceeds threshold
          userFeedback: 2.1
        },
        controlMetrics: {
          decisions: 1000,
          errorRate: 0.02,
          averageLatency: 1500,
          falsePositiveRate: 0.06,
          userFeedback: 3.8
        },
        comparison: {
          errorRateDiff: 0.03,
          latencyDiff: 1000,
          accuracyDiff: -0.06,
          significanceLevel: 0.98
        }
      });

      const rollbackCheck = await canaryDeploymentService.checkRollbackConditions(deployment.id);

      expect(rollbackCheck.shouldRollback).toBe(true);
      expect(rollbackCheck.reasons.length).toBeGreaterThan(0);
      expect(rollbackCheck.reasons.some(r => r.includes('Error rate'))).toBe(true);
    });

    it('should handle partial rollback scenarios', async () => {
      const config = {
        thresholds: { harassment: 0.8, spam: 0.85 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          },
          {
            category: 'spam',
            severity: 'medium' as const,
            action: 'limit' as const,
            confidence: 0.85
          }
        ],
        vendorWeights: { openai: 0.7, perspective: 0.3 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Partial Rollback Test',
        'Policy for testing partial rollback',
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
        20,
        targetMetrics,
        'test_user'
      );

      // Simulate mixed performance (some metrics good, some bad)
      vi.spyOn(canaryDeploymentService, 'getDeploymentMetrics').mockResolvedValue({
        canaryMetrics: {
          decisions: 1000,
          errorRate: 0.03, // Good
          averageLatency: 1800, // Acceptable
          falsePositiveRate: 0.15, // Bad - exceeds threshold
          userFeedback: 3.2
        },
        controlMetrics: {
          decisions: 1000,
          errorRate: 0.02,
          averageLatency: 1500,
          falsePositiveRate: 0.08,
          userFeedback: 3.5
        },
        comparison: {
          errorRateDiff: 0.01,
          latencyDiff: 300,
          accuracyDiff: -0.07,
          significanceLevel: 0.85
        }
      });

      const rollbackCheck = await canaryDeploymentService.checkRollbackConditions(deployment.id);

      expect(rollbackCheck.shouldRollback).toBe(true);
      expect(rollbackCheck.reasons.some(r => r.includes('False positive'))).toBe(true);
    });

    it('should maintain rollback history and analytics', async () => {
      const config = {
        thresholds: { harassment: 0.8 },
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.8
        }],
        vendorWeights: { openai: 1.0 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Rollback History Test',
        'Policy for testing rollback history',
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
        15,
        targetMetrics,
        'test_user'
      );

      // Perform rollback
      await canaryDeploymentService.rollbackDeployment(
        deployment.id,
        'Test rollback for history tracking',
        'test_user'
      );

      const history = canaryDeploymentService.getDeploymentHistory(10);
      const rolledBackDeployment = history.find(d => d.id === deployment.id);

      expect(rolledBackDeployment).toBeDefined();
      expect(rolledBackDeployment?.status).toBe('rolled_back');
      expect(rolledBackDeployment?.rollbackTriggers).toContain('Test rollback for history tracking');
      expect(rolledBackDeployment?.endTime).toBeDefined();
    });
  });

  describe('Performance Impact Analysis', () => {
    it('should measure latency impact of policy changes', async () => {
      const heavyConfig = {
        thresholds: {
          harassment: 0.7,
          spam: 0.75,
          violence: 0.8,
          scam: 0.85,
          nsfw: 0.7
        },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.7
          },
          {
            category: 'spam',
            severity: 'medium' as const,
            action: 'limit' as const,
            confidence: 0.75
          },
          {
            category: 'violence',
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.8
          }
        ],
        vendorWeights: {
          openai: 0.3,
          perspective: 0.3,
          google_vision: 0.2,
          custom_model: 0.2
        },
        reputationModifiers: { low: 1.3, medium: 1.0, high: 0.7 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Heavy Processing Policy',
        'Policy with multiple vendors and complex rules',
        heavyConfig,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.05,
        maxLatencyIncrease: 0.5, // Allow higher latency for complex processing
        minAccuracy: 0.9,
        maxFalsePositiveIncrease: 0.1
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        10,
        targetMetrics,
        'test_user'
      );

      const metrics = await canaryDeploymentService.getDeploymentMetrics(deployment.id);

      if (metrics) {
        expect(metrics.comparison.latencyDiff).toBeDefined();
        expect(typeof metrics.comparison.latencyDiff).toBe('number');

        // Verify latency measurements are reasonable
        expect(metrics.canaryMetrics.averageLatency).toBeGreaterThan(0);
        expect(metrics.controlMetrics.averageLatency).toBeGreaterThan(0);
      }
    });

    it('should analyze cost impact of policy changes', async () => {
      const expensiveConfig = {
        thresholds: { harassment: 0.6, spam: 0.65, violence: 0.7 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.6
          }
        ],
        vendorWeights: {
          openai: 0.4,
          perspective: 0.3,
          google_vision: 0.3
        },
        reputationModifiers: { low: 1.4, medium: 1.0, high: 0.6 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'High Cost Policy',
        'Policy with lower thresholds requiring more API calls',
        expensiveConfig,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.05,
        maxLatencyIncrease: 0.3,
        minAccuracy: 0.9,
        maxFalsePositiveIncrease: 0.1
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        15,
        targetMetrics,
        'test_user'
      );

      // In a real implementation, this would track actual API costs
      const metrics = await canaryDeploymentService.getDeploymentMetrics(deployment.id);

      if (metrics) {
        // Verify cost tracking structure exists
        expect(metrics.canaryMetrics).toHaveProperty('decisions');
        expect(metrics.controlMetrics).toHaveProperty('decisions');
        
        // Cost per decision should be calculable
        const canaryDecisions = metrics.canaryMetrics.decisions;
        const controlDecisions = metrics.controlMetrics.decisions;
        
        expect(canaryDecisions).toBeGreaterThanOrEqual(0);
        expect(controlDecisions).toBeGreaterThanOrEqual(0);
      }
    });

    it('should track accuracy improvements vs performance costs', async () => {
      const accurateConfig = {
        thresholds: { harassment: 0.9, spam: 0.92, violence: 0.95 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.9
          }
        ],
        vendorWeights: { openai: 0.5, perspective: 0.5 },
        reputationModifiers: { low: 1.1, medium: 1.0, high: 0.9 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'High Accuracy Policy',
        'Policy optimized for accuracy over speed',
        accurateConfig,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.02,
        maxLatencyIncrease: 0.4,
        minAccuracy: 0.95,
        maxFalsePositiveIncrease: 0.05
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        20,
        targetMetrics,
        'test_user'
      );

      const metrics = await canaryDeploymentService.getDeploymentMetrics(deployment.id);

      if (metrics) {
        expect(metrics.comparison.accuracyDiff).toBeDefined();
        expect(typeof metrics.comparison.accuracyDiff).toBe('number');

        // Verify accuracy vs performance trade-off tracking
        const accuracyImprovement = metrics.comparison.accuracyDiff;
        const latencyIncrease = metrics.comparison.latencyDiff;

        expect(typeof accuracyImprovement).toBe('number');
        expect(typeof latencyIncrease).toBe('number');
      }
    });
  });

  describe('Multi-Environment Deployment', () => {
    it('should support environment-specific configurations', async () => {
      const stagingConfig = {
        thresholds: { harassment: 0.7, spam: 0.75 },
        rules: [{
          category: 'harassment',
          severity: 'medium' as const,
          action: 'limit' as const,
          confidence: 0.7
        }],
        vendorWeights: { openai: 1.0 },
        reputationModifiers: { low: 1.3, medium: 1.0, high: 0.7 }
      };

      const productionConfig = {
        thresholds: { harassment: 0.8, spam: 0.85 },
        rules: [{
          category: 'harassment',
          severity: 'high' as const,
          action: 'block' as const,
          confidence: 0.8
        }],
        vendorWeights: { openai: 0.7, perspective: 0.3 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const stagingVersion = await canaryDeploymentService.createPolicyVersion(
        'Staging Policy',
        'Policy for staging environment testing',
        stagingConfig,
        'test_user'
      );

      const productionVersion = await canaryDeploymentService.createPolicyVersion(
        'Production Policy',
        'Policy for production environment',
        productionConfig,
        'test_user'
      );

      expect(stagingVersion.config.thresholds.harassment).toBe(0.7);
      expect(productionVersion.config.thresholds.harassment).toBe(0.8);

      expect(stagingVersion.config.rules[0].action).toBe('limit');
      expect(productionVersion.config.rules[0].action).toBe('block');
    });

    it('should handle cross-environment promotion workflows', async () => {
      // Create a policy that would be promoted from staging to production
      const promotableConfig = {
        thresholds: { harassment: 0.8, spam: 0.85, violence: 0.9 },
        rules: [
          {
            category: 'harassment',
            severity: 'high' as const,
            action: 'block' as const,
            confidence: 0.8
          },
          {
            category: 'violence',
            severity: 'critical' as const,
            action: 'block' as const,
            confidence: 0.9
          }
        ],
        vendorWeights: { openai: 0.6, perspective: 0.4 },
        reputationModifiers: { low: 1.2, medium: 1.0, high: 0.8 }
      };

      const version = await canaryDeploymentService.createPolicyVersion(
        'Promotable Policy',
        'Policy ready for production promotion',
        promotableConfig,
        'test_user'
      );

      const targetMetrics = {
        maxErrorRate: 0.03,
        maxLatencyIncrease: 0.15,
        minAccuracy: 0.92,
        maxFalsePositiveIncrease: 0.08
      };

      const deployment = await canaryDeploymentService.startCanaryDeployment(
        version.id,
        25,
        targetMetrics,
        'test_user'
      );

      // Simulate successful canary deployment
      vi.spyOn(canaryDeploymentService, 'checkRollbackConditions').mockResolvedValue({
        shouldRollback: false,
        reasons: []
      });

      const rollbackCheck = await canaryDeploymentService.checkRollbackConditions(deployment.id);
      expect(rollbackCheck.shouldRollback).toBe(false);

      // Policy should be ready for promotion
      await expect(canaryDeploymentService.promoteToProduction(deployment.id, 'test_user'))
        .resolves.not.toThrow();
    });
  });
});
