import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { reputationService } from '../services/reputationService';

describe('Reputation Integration Tests', () => {
  const testUserId = 'integration-test-user';
  const testCaseId = 12345;
  const testReportId = 67890;
  const testAppealId = 54321;

  beforeEach(async () => {
    // Initialize test user reputation
    await reputationService.initializeUserReputation(testUserId);
  });

  afterEach(async () => {
    // Clean up test data would go here in a real implementation
    // For now, we'll rely on the mocked database
  });

  describe('Policy Violation Workflow', () => {
    it('should correctly apply escalating penalties for repeat violations', async () => {
      // First violation - should be minor penalty
      await reputationService.applyViolationPenalty(testUserId, testCaseId, 'spam', 'low');
      
      let reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.violationCount).toBe(1);
      expect(reputation?.overallScore).toBeLessThan(1000);
      
      const firstScore = reputation?.overallScore || 0;

      // Second violation - should have higher penalty
      await reputationService.applyViolationPenalty(testUserId, testCaseId + 1, 'harassment', 'medium');
      
      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.violationCount).toBe(2);
      
      const secondScore = reputation?.overallScore || 0;
      const secondPenalty = firstScore - secondScore;
      const firstPenalty = 1000 - firstScore;
      
      // Second penalty should be larger due to escalation
      expect(secondPenalty).toBeGreaterThan(firstPenalty);

      // Third violation - should trigger rate limiting
      await reputationService.applyViolationPenalty(testUserId, testCaseId + 2, 'hate_speech', 'high');
      
      const penalties = await reputationService.getActivePenalties(testUserId);
      expect(penalties.length).toBeGreaterThan(0);
      expect(penalties.some(p => p.penaltyType === 'rate_limit')).toBe(true);
    });

    it('should apply critical penalties for severe violations', async () => {
      await reputationService.applyViolationPenalty(testUserId, testCaseId, 'violence', 'critical');
      
      const reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.overallScore).toBeLessThan(600); // Should be heavily penalized
      expect(reputation?.reputationTier).toBe('bronze');
    });
  });

  describe('Community Reporting Workflow', () => {
    it('should reward accurate reports and penalize false ones', async () => {
      // Start with base reputation
      let reputation = await reputationService.getUserReputation(testUserId);
      const initialScore = reputation?.overallScore || 1000;

      // Submit accurate report
      await reputationService.rewardHelpfulReport(testUserId, testReportId, 0.95);
      
      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.overallScore).toBeGreaterThan(initialScore);
      expect(reputation?.helpfulReportsCount).toBe(1);
      
      const afterRewardScore = reputation?.overallScore || 0;

      // Submit false report
      await reputationService.penalizeFalseReport(testUserId, testReportId + 1);
      
      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.overallScore).toBeLessThan(afterRewardScore);
      expect(reputation?.falseReportsCount).toBe(1);
    });

    it('should adjust reporting weight based on reputation', () => {
      // Test different reputation levels
      expect(reputationService.getReportingWeight(400)).toBe(0.5);  // Low reputation
      expect(reputationService.getReportingWeight(1000)).toBe(1.0); // Normal reputation
      expect(reputationService.getReportingWeight(2000)).toBe(1.5); // High reputation
    });

    it('should escalate penalties for multiple false reports', async () => {
      const initialReputation = await reputationService.getUserReputation(testUserId);
      const initialScore = initialReputation?.overallScore || 1000;

      // First false report
      await reputationService.penalizeFalseReport(testUserId, testReportId);
      let reputation = await reputationService.getUserReputation(testUserId);
      const firstPenalty = initialScore - (reputation?.overallScore || 0);

      // Second false report - should have higher penalty
      await reputationService.penalizeFalseReport(testUserId, testReportId + 1);
      reputation = await reputationService.getUserReputation(testUserId);
      const totalPenalty = initialScore - (reputation?.overallScore || 0);
      const secondPenalty = totalPenalty - firstPenalty;

      expect(secondPenalty).toBeGreaterThan(firstPenalty);
      expect(reputation?.falseReportsCount).toBe(2);
    });
  });

  describe('Appeals and Restoration Workflow', () => {
    it('should restore reputation for successful appeals', async () => {
      // Apply initial violation
      await reputationService.applyViolationPenalty(testUserId, testCaseId, 'harassment', 'high');
      
      let reputation = await reputationService.getUserReputation(testUserId);
      const penalizedScore = reputation?.overallScore || 0;
      const originalPenalty = 1000 - penalizedScore;

      // Successful appeal should restore most of the penalty
      await reputationService.restoreReputationForAppeal(testUserId, testAppealId, originalPenalty);
      
      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.overallScore).toBeGreaterThan(penalizedScore);
      expect(reputation?.successfulAppealsCount).toBe(1);
      
      // Should restore 75% + bonus, so final score should be higher than original penalty restoration
      const restoredScore = reputation?.overallScore || 0;
      const netRestoration = restoredScore - penalizedScore;
      expect(netRestoration).toBeGreaterThan(originalPenalty * 0.75);
    });
  });

  describe('Jury Performance Workflow', () => {
    it('should track jury performance and update reputation accordingly', async () => {
      // Simulate correct jury decision
      await reputationService.updateJurorPerformance(
        testUserId,
        testAppealId,
        'uphold',
        true,  // was majority
        true,  // was correct
        1000,  // stake amount
        45     // response time in minutes
      );

      let reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.overallScore).toBeGreaterThan(1000); // Should be rewarded
      expect(reputation?.juryDecisionsCount).toBe(1);

      // Simulate incorrect jury decision
      await reputationService.updateJurorPerformance(
        testUserId,
        testAppealId + 1,
        'overturn',
        false, // was minority
        false, // was incorrect
        1000,  // stake amount
        120    // slower response time
      );

      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.juryDecisionsCount).toBe(2);
      expect(reputation?.juryAccuracyRate).toBe(0.5); // 1 correct out of 2
    });

    it('should determine jury eligibility based on reputation and accuracy', async () => {
      // New user should not be eligible
      let isEligible = await reputationService.isEligibleForJury(testUserId);
      expect(isEligible).toBe(false); // Low accuracy rate initially

      // Simulate several correct jury decisions to build up accuracy
      for (let i = 0; i < 5; i++) {
        await reputationService.updateJurorPerformance(
          testUserId,
          testAppealId + i,
          'uphold',
          true,
          true,
          1000,
          60
        );
      }

      // Should now be eligible with good accuracy and sufficient reputation
      isEligible = await reputationService.isEligibleForJury(testUserId);
      expect(isEligible).toBe(true);
    });
  });

  describe('Moderation Strictness Adjustment', () => {
    it('should adjust moderation strictness based on user reputation', async () => {
      // Test with default reputation (1000)
      let strictness = await reputationService.getModerationStrictness(testUserId);
      expect(strictness).toBe(1.0); // Should be normal strictness

      // Apply violations to lower reputation
      await reputationService.applyViolationPenalty(testUserId, testCaseId, 'spam', 'medium');
      await reputationService.applyViolationPenalty(testUserId, testCaseId + 1, 'harassment', 'medium');

      // Should now have higher strictness for low reputation user
      strictness = await reputationService.getModerationStrictness(testUserId);
      expect(strictness).toBeGreaterThan(1.0);
    });
  });

  describe('Reputation Tier Calculation', () => {
    it('should correctly calculate reputation tiers', async () => {
      let reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.reputationTier).toBe('silver'); // Default 1000 score

      // Apply multiple violations to drop to bronze
      for (let i = 0; i < 3; i++) {
        await reputationService.applyViolationPenalty(testUserId, testCaseId + i, 'spam', 'medium');
      }

      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.reputationTier).toBe('bronze');
      expect(reputation?.overallScore).toBeLessThan(1000);

      // Reward helpful reports to increase reputation
      for (let i = 0; i < 10; i++) {
        await reputationService.rewardHelpfulReport(testUserId, testReportId + i, 0.9);
      }

      reputation = await reputationService.getUserReputation(testUserId);
      expect(reputation?.reputationTier).toMatch(/gold|platinum|diamond/);
      expect(reputation?.helpfulReportsCount).toBe(10);
    });
  });

  describe('Progressive Penalty System', () => {
    it('should apply increasingly severe penalties for repeat violations', async () => {
      const penalties = [];

      // Apply violations and track penalties
      for (let i = 1; i <= 8; i++) {
        await reputationService.applyViolationPenalty(
          testUserId, 
          testCaseId + i, 
          'harassment', 
          'medium'
        );

        const activePenalties = await reputationService.getActivePenalties(testUserId);
        penalties.push(activePenalties);
      }

      // Should have rate limiting after 2 violations
      expect(penalties[1].some(p => p.penaltyType === 'rate_limit')).toBe(true);

      // Should have content review after 3 violations
      expect(penalties[2].some(p => p.penaltyType === 'content_review')).toBe(true);

      // Should have posting restrictions after 5 violations
      expect(penalties[4].some(p => p.penaltyType === 'posting_restriction')).toBe(true);

      // Should have temporary ban after 7 violations
      expect(penalties[6].some(p => p.penaltyType === 'temporary_ban')).toBe(true);
    });
  });

  describe('Cross-System Integration', () => {
    it('should maintain consistency across different reputation events', async () => {
      const events = [];

      // Mix of different reputation events
      await reputationService.applyViolationPenalty(testUserId, testCaseId, 'spam', 'low');
      events.push('violation');

      await reputationService.rewardHelpfulReport(testUserId, testReportId, 0.8);
      events.push('helpful_report');

      await reputationService.penalizeFalseReport(testUserId, testReportId + 1);
      events.push('false_report');

      await reputationService.updateJurorPerformance(testUserId, testAppealId, 'uphold', true, true, 1000, 60);
      events.push('jury_correct');

      await reputationService.restoreReputationForAppeal(testUserId, testAppealId + 1, 100);
      events.push('successful_appeal');

      // Verify final state is consistent
      const finalReputation = await reputationService.getUserReputation(testUserId);
      
      expect(finalReputation?.violationCount).toBe(1);
      expect(finalReputation?.helpfulReportsCount).toBe(1);
      expect(finalReputation?.falseReportsCount).toBe(1);
      expect(finalReputation?.juryDecisionsCount).toBe(1);
      expect(finalReputation?.successfulAppealsCount).toBe(1);

      // Overall score should reflect all events
      expect(finalReputation?.overallScore).toBeDefined();
      expect(finalReputation?.reputationTier).toBeDefined();
    });
  });
});
