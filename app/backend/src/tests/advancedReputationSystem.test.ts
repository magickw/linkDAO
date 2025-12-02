import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { advancedReputationService } from '../services/advancedReputationService';
import { enhancedCommunityReportingService } from '../services/enhancedCommunityReportingService';
import { db } from '../db';
import { 
  userReputationScores, 
  reputationChangeEvents, 
  communityReports,
  users
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock dependencies
jest.mock('../services/adminWebSocketService');

describe('Advanced Reputation System', () => {
  let testUserId: string;
  let testReporterId: string;

  beforeEach(async () => {
    // Create test users
    const [user1] = await db.insert(users).values({
      id: 'test-user-123',
      walletAddress: '0x1234567890abcdef',
      email: 'test@example.com',
      role: 'user'
    }).returning();
    testUserId = user1.id;

    const [user2] = await db.insert(users).values({
      id: 'test-reporter-123',
      walletAddress: '0xabcdef1234567890',
      email: 'reporter@example.com',
      role: 'user'
    }).returning();
    testReporterId = user2.id;

    // Create initial reputation scores
    await db.insert(userReputationScores).values([
      {
        id: 'reputation-123',
        userId: testUserId,
        overallScore: 75,
        moderationScore: 80,
        reportingScore: 70,
        juryScore: 65,
        trustScore: 78,
        activityScore: 82,
        consistencyScore: 76,
        lastUpdated: new Date()
      },
      {
        id: 'reputation-reporter-123',
        userId: testReporterId,
        overallScore: 85,
        moderationScore: 88,
        reportingScore: 92,
        juryScore: 80,
        trustScore: 87,
        activityScore: 89,
        consistencyScore: 83,
        lastUpdated: new Date()
      }
    ]);
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(communityReports).where(eq(communityReports.reporterId, testReporterId));
    await db.delete(reputationChangeEvents).where(eq(reputationChangeEvents.userId, testUserId));
    await db.delete(userReputationScores).where(inArray(userReputationScores.userId, [testUserId, testReporterId]));
    await db.delete(users).where(inArray(users.id, [testUserId, testReporterId]));
  });

  describe('Advanced Reputation Impact Calculation', () => {
    it('should calculate advanced impact with time decay and contextual multipliers', async () => {
      const impact = await advancedReputationService.calculateAdvancedImpact(
        testUserId,
        'policy_violation',
        { transactionValue: 500 },
        { userHistory: { previousViolations: 1, successfulAppeals: 2 } }
      );

      expect(impact).toHaveProperty('baseImpact');
      expect(impact).toHaveProperty('timeDecayFactor');
      expect(impact).toHaveProperty('contextualMultiplier');
      expect(impact).toHaveProperty('networkEffect');
      expect(impact).toHaveProperty('predictedImpact');
      expect(impact).toHaveProperty('confidence');
      
      expect(impact.baseImpact).toBe(-10); // Base penalty for policy violation
      expect(impact.contextualMultiplier).toBeGreaterThan(1); // High reputation user gets less penalty
      expect(impact.confidence).toBeGreaterThanOrEqual(0.3);
    });

    it('should apply time decay for repeated violations', async () => {
      // Add some recent violation events
      await db.insert(reputationChangeEvents).values([
        {
          id: 'event-1',
          userId: testUserId,
          eventType: 'policy_violation',
          scoreChange: -10,
          previousScore: 80,
          newScore: 70,
          reason: 'Test violation 1',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) // 5 days ago
        },
        {
          id: 'event-2',
          userId: testUserId,
          eventType: 'policy_violation',
          scoreChange: -8,
          previousScore: 70,
          newScore: 62,
          reason: 'Test violation 2',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
        }
      ]);

      const impact = await advancedReputationService.calculateAdvancedImpact(
        testUserId,
        'policy_violation',
        {},
        {}
      );

      expect(impact.timeDecayFactor).toBeLessThan(1); // Recent violations reduce impact
    });
  });

  describe('Advanced Reputation Change Application', () => {
    it('should apply reputation change with advanced impact calculation', async () => {
      const update = await advancedReputationService.applyAdvancedReputationChange(
        testUserId,
        'helpful_report',
        5,
        'Helpful community report',
        { reportId: 'report-123' },
        { source: 'community_validation' }
      );

      expect(update.userId).toBe(testUserId);
      expect(update.change).toBeGreaterThan(0);
      expect(update.newScore).toBeGreaterThan(update.previousScore);
      expect(update.impactAnalysis).toBeDefined();
      expect(update.reason).toBe('Helpful community report');
    });

    it('should handle real-time notifications', async () => {
      const updatePromise = new Promise((resolve) => {
        advancedReputationService.once('reputationUpdated', (update) => {
          resolve(update);
        });
      });

      await advancedReputationService.applyAdvancedReputationChange(
        testUserId,
        'community_contribution',
        3,
        'Community contribution recognized'
      );

      const update = await updatePromise;
      expect(update).toHaveProperty('userId', testUserId);
      expect(update).toHaveProperty('change', 3);
    });
  });

  describe('Progressive Penalty System', () => {
    it('should configure progressive penalty system', async () => {
      const penaltyConfig = {
        violationType: 'spam',
        severityLevels: [
          {
            level: 1,
            threshold: 0,
            basePenalty: 5,
            escalationMultiplier: 1.0,
            recoveryTimeDays: 7
          },
          {
            level: 2,
            threshold: 3,
            basePenalty: 10,
            escalationMultiplier: 1.5,
            recoveryTimeDays: 14
          }
        ],
        escalationRules: [
          {
            condition: 'repeat_offender',
            multiplier: 1.3,
            description: 'Repeat offender escalation'
          }
        ],
        recoveryConfig: {
          baseRecoveryRate: 1,
          goodBehaviorBonus: 2,
          timeDecayFactor: 0.95
        }
      };

      await expect(advancedReputationService.configureProgressivePenalty(penaltyConfig))
        .resolves.not.toThrow();
    });

    it('should apply progressive penalty with escalation', async () => {
      // Configure penalty first
      await advancedReputationService.configureProgressivePenalty({
        violationType: 'harassment',
        severityLevels: [
          {
            level: 1,
            threshold: 0,
            basePenalty: 15,
            escalationMultiplier: 1.0,
            recoveryTimeDays: 14
          }
        ],
        escalationRules: [],
        recoveryConfig: {
          baseRecoveryRate: 1,
          goodBehaviorBonus: 2,
          timeDecayFactor: 0.9
        }
      });

      const result = await advancedReputationService.applyProgressivePenalty(
        testUserId,
        'harassment',
        { severity: 'medium', repeatOffender: false },
        { context: 'community_report' }
      );

      expect(result.change).toBeLessThan(0); // Should be a penalty
      expect(result.reason).toContain('Progressive penalty');
      expect(result.impactAnalysis).toBeDefined();
    });
  });

  describe('Bulk Reputation Operations', () => {
    it('should perform bulk reputation operation', async () => {
      const operation = await advancedReputationService.performBulkReputationOperation({
        userIds: [testUserId, testReporterId],
        operationType: 'adjustment',
        changes: {
          [testUserId]: 5,
          [testReporterId]: 3
        },
        justification: 'Bulk adjustment for community contributions',
        performedBy: 'admin-123'
      });

      expect(operation.operationId).toBeDefined();
      expect(operation.status).toBe('pending');
      expect(operation.userIds).toHaveLength(2);
      expect(operation.changes[testUserId]).toBe(5);
      expect(operation.changes[testReporterId]).toBe(3);
    });
  });

  describe('Advanced Reputation Analytics', () => {
    it('should provide comprehensive reputation analytics', async () => {
      // Add some historical data
      await db.insert(reputationChangeEvents).values([
        {
          id: 'analytics-1',
          userId: testUserId,
          eventType: 'community_contribution',
          scoreChange: 3,
          previousScore: 72,
          newScore: 75,
          reason: 'Community contribution',
          createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'analytics-2',
          userId: testUserId,
          eventType: 'helpful_report',
          scoreChange: 2,
          previousScore: 75,
          newScore: 77,
          reason: 'Helpful report',
          createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000)
        }
      ]);

      const analytics = await advancedReputationService.getAdvancedReputationAnalytics(testUserId);

      expect(analytics.userId).toBe(testUserId);
      expect(analytics.currentScore).toBe(75);
      expect(analytics.scoreTrend).toBeDefined();
      expect(analytics.volatility).toBeDefined();
      expect(analytics.anomalyScore).toBeDefined();
      expect(analytics.prediction).toBeDefined();
      expect(analytics.networkInfluence).toBeDefined();
    });

    it('should detect anomalies in reputation changes', async () => {
      // Add anomalous data
      await db.insert(reputationChangeEvents).values([
        {
          id: 'anomaly-1',
          userId: testUserId,
          eventType: 'policy_violation',
          scoreChange: -20,
          previousScore: 75,
          newScore: 55,
          reason: 'Major violation',
          createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000)
        },
        {
          id: 'anomaly-2',
          userId: testUserId,
          eventType: 'community_contribution',
          scoreChange: 25,
          previousScore: 55,
          newScore: 80,
          reason: 'Exceptional contribution',
          createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
        }
      ]);

      const analytics = await advancedReputationService.getAdvancedReputationAnalytics(testUserId);
      
      expect(analytics.anomalyScore).toBeGreaterThan(0);
      expect(analytics.prediction.riskFactors).toContain('high_volatility');
    });
  });

  describe('Enhanced Community Reporting', () => {
    it('should submit enhanced community report', async () => {
      const report = await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId: testReporterId,
        targetType: 'post',
        targetId: 'post-123',
        reportType: 'spam',
        reason: 'This post contains spam links',
        evidence: ['screenshot1.png']
      });

      expect(report.id).toBeDefined();
      expect(report.reporterId).toBe(testReporterId);
      expect(report.targetType).toBe('post');
      expect(report.status).toBe('pending');
      expect(report.reporterWeight).toBeGreaterThan(0);
    });

    it('should calculate consensus-based reporting weight', async () => {
      const weight = await enhancedCommunityReportingService.calculateConsensusBasedWeight(
        testReporterId,
        'spam'
      );

      expect(weight.reporterId).toBe(testReporterId);
      expect(weight.baseWeight).toBeGreaterThan(0.8); // High reputation user
      expect(weight.accuracyScore).toBeGreaterThanOrEqual(0.5);
      expect(weight.communityTrust).toBeGreaterThanOrEqual(0.5);
      expect(weight.finalWeight).toBeGreaterThan(1.0); // Should have bonus
    });

    it('should process validation result with consensus', async () => {
      // First create a report
      const report = await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId: testReporterId,
        targetType: 'user',
        targetId: testUserId,
        reportType: 'harassment',
        reason: 'Inappropriate behavior'
      });

      const validatorVotes = [
        { userId: 'validator1', vote: 'validate' as const, weight: 1.2 },
        { userId: 'validator2', vote: 'validate' as const, weight: 1.0 },
        { userId: 'validator3', vote: 'validate' as const, weight: 0.8 },
        { userId: 'validator4', vote: 'reject' as const, weight: 0.9 },
        { userId: 'validator5', vote: 'reject' as const, weight: 1.1 }
      ];

      const result = await enhancedCommunityReportingService.processValidationResult(
        report.id,
        validatorVotes
      );

      expect(result.reportId).toBe(report.id);
      expect(result.isValid).toBe(true); // 3 validate vs 2 reject
      expect(result.consensusScore).toBeGreaterThan(0.6);
      expect(result.participatingUsers).toBe(5);
      expect(result.rewards.length).toBeGreaterThan(0);
      expect(result.penalties.length).toBeGreaterThan(0);
    });

    it('should get enhanced reporting analytics', async () => {
      // Create some test reports
      await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId: testReporterId,
        targetType: 'post',
        targetId: 'post-1',
        reportType: 'spam',
        reason: 'Spam content 1'
      });

      await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId: testReporterId,
        targetType: 'post',
        targetId: 'post-2',
        reportType: 'spam',
        reason: 'Spam content 2'
      });

      const timeRange = {
        start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: new Date()
      };

      const analytics = await enhancedCommunityReportingService.getEnhancedReportingAnalytics(timeRange);

      expect(analytics.totalReports).toBeGreaterThanOrEqual(2);
      expect(analytics.topReporters).toBeDefined();
      expect(analytics.reportingTrends).toBeDefined();
      expect(analytics.consensusRate).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete reputation and reporting workflow', async () => {
      // 1. Submit a community report
      const report = await enhancedCommunityReportingService.submitEnhancedReport({
        reporterId: testReporterId,
        targetType: 'post',
        targetId: 'test-post-123',
        reportType: 'inappropriate_content',
        reason: 'Content violates community guidelines',
        evidence: ['screenshot.png']
      });

      expect(report.status).toBe('pending');

      // 2. Calculate impact on reported user
      const impact = await advancedReputationService.calculateAdvancedImpact(
        testUserId,
        'reported_content',
        { reportId: report.id, severity: 'medium' },
        {}
      );

      expect(impact.baseImpact).toBeLessThan(0);

      // 3. Apply progressive penalty if report is validated
      const validatorVotes = [
        { userId: 'validator1', vote: 'validate' as const, weight: 1.0 },
        { userId: 'validator2', vote: 'validate' as const, weight: 1.2 },
        { userId: 'validator3', vote: 'validate' as const, weight: 0.8 }
      ];

      const validationResult = await enhancedCommunityReportingService.processValidationResult(
        report.id,
        validatorVotes
      );

      expect(validationResult.isValid).toBe(true);

      // 4. Apply penalty to reported user
      if (validationResult.isValid) {
        const penaltyResult = await advancedReputationService.applyProgressivePenalty(
          testUserId,
          'inappropriate_content',
          { severity: 'medium', validatedBy: 'community_consensus' },
          { reportId: report.id, consensusScore: validationResult.consensusScore }
        );

        expect(penaltyResult.change).toBeLessThan(0);
      }

      // 5. Get updated analytics
      const analytics = await advancedReputationService.getAdvancedReputationAnalytics(testUserId);
      expect(analytics.currentScore).toBeLessThan(75); // Score should decrease after penalty
    });
  });
});

describe('Advanced Reputation System Performance', () => {
  it('should handle concurrent reputation calculations', async () => {
    const calculations = Array.from({ length: 10 }, (_, i) => 
      advancedReputationService.calculateAdvancedImpact(
        'test-user-123',
        'community_contribution',
        { contributionLevel: i + 1 },
        {}
      )
    );

    const results = await Promise.all(calculations);
    
    expect(results).toHaveLength(10);
    results.forEach(result => {
      expect(result).toHaveProperty('baseImpact');
      expect(result).toHaveProperty('confidence');
    });
  });

  it('should handle bulk operations efficiently', async () => {
    const userIds = Array.from({ length: 20 }, (_, i) => `bulk-user-${i}`);
    const changes: Record<string, number> = {};
    
    userIds.forEach(userId => {
      changes[userId] = Math.floor(Math.random() * 10) + 1;
    });

    const startTime = Date.now();
    const operation = await advancedReputationService.performBulkReputationOperation({
      userIds,
      operationType: 'adjustment',
      changes,
      justification: 'Performance test bulk adjustment',
      performedBy: 'test-admin'
    });
    
    const endTime = Date.now();
    
    expect(operation.operationId).toBeDefined();
    expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
  });

  it('should handle large analytics queries efficiently', async () => {
    // Add more historical data
    const historicalEvents = Array.from({ length: 50 }, (_, i) => ({
      id: `perf-event-${i}`,
      userId: testUserId,
      eventType: i % 2 === 0 ? 'community_contribution' : 'helpful_report',
      scoreChange: Math.floor(Math.random() * 5) + 1,
      previousScore: 70 + i,
      newScore: 70 + i + (Math.floor(Math.random() * 5) + 1),
      reason: `Performance test event ${i}`,
      createdAt: new Date(Date.now() - (30 - i) * 24 * 60 * 60 * 1000)
    }));

    await db.insert(reputationChangeEvents).values(historicalEvents);

    const startTime = Date.now();
    const analytics = await advancedReputationService.getAdvancedReputationAnalytics(testUserId);
    const endTime = Date.now();
    
    expect(analytics).toHaveProperty('scoreTrend');
    expect(analytics.scoreTrend.length).toBeGreaterThan(0);
    expect(endTime - startTime).toBeLessThan(3000); // Should complete within 3 seconds
  });
});