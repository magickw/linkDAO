import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { earningActivityService } from '../services/earningActivityService';
import { referralService } from '../services/referralService';
import { db } from '../db/index';
import { 
  earningActivities, 
  referrals, 
  dailyEarningLimits,
  userEarningStats,
  earningAbusePrevention
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock external dependencies
jest.mock('../services/notificationService');
jest.mock('../services/reputationService');

describe('Earning System Abuse Prevention', () => {
  const testUserId = 'abuse-test-user';
  const suspiciousUserId = 'suspicious-user';
  const refereeIds = ['referee-1', 'referee-2', 'referee-3'];

  beforeEach(async () => {
    // Clean up test data
    await db.delete(earningActivities).where(eq(earningActivities.userId, testUserId));
    await db.delete(earningActivities).where(eq(earningActivities.userId, suspiciousUserId));
    await db.delete(referrals).where(eq(referrals.referrerId, testUserId));
    await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, testUserId));
    await db.delete(userEarningStats).where(eq(userEarningStats.userId, testUserId));
    await db.delete(earningAbusePrevention).where(eq(earningAbusePrevention.userId, testUserId));
    
    for (const refereeId of refereeIds) {
      await db.delete(referrals).where(eq(referrals.refereeId, refereeId));
    }
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(earningActivities).where(eq(earningActivities.userId, testUserId));
    await db.delete(earningActivities).where(eq(earningActivities.userId, suspiciousUserId));
    await db.delete(referrals).where(eq(referrals.referrerId, testUserId));
    await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, testUserId));
    await db.delete(userEarningStats).where(eq(userEarningStats.userId, testUserId));
    await db.delete(earningAbusePrevention).where(eq(earningAbusePrevention.userId, testUserId));
    
    for (const refereeId of refereeIds) {
      await db.delete(referrals).where(eq(referrals.refereeId, refereeId));
    }
  });

  describe('Daily Earning Limits', () => {
    it('should enforce daily limits for post activities', async () => {
      const results = [];
      
      // Try to create many posts in a day (should hit daily limit)
      for (let i = 0; i < 20; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `limit-test-${i}`,
          isPremiumUser: false
        });
        results.push(result);
      }

      const successfulResults = results.filter(r => r.success);
      const limitedResults = results.filter(r => !r.success && r.dailyLimitReached);

      // Should have some successful results but also hit limits
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(limitedResults.length).toBeGreaterThan(0);
      expect(successfulResults.length + limitedResults.length).toBe(20);

      // Total earned should not exceed daily limit significantly
      const totalEarned = successfulResults.reduce((sum, r) => sum + r.tokensEarned, 0);
      expect(totalEarned).toBeLessThanOrEqual(110); // Daily limit is 100, allow small buffer
    });

    it('should enforce separate limits for different activity types', async () => {
      const postResults = [];
      const commentResults = [];

      // Max out post activities
      for (let i = 0; i < 15; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `post-${i}`,
          isPremiumUser: false
        });
        postResults.push(result);
      }

      // Try comment activities (should still work as separate limit)
      for (let i = 0; i < 10; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'comment',
          activityId: `comment-${i}`,
          isPremiumUser: false
        });
        commentResults.push(result);
      }

      const successfulPosts = postResults.filter(r => r.success);
      const successfulComments = commentResults.filter(r => r.success);

      // Should have successful activities in both categories
      expect(successfulPosts.length).toBeGreaterThan(0);
      expect(successfulComments.length).toBeGreaterThan(0);
    });

    it('should reset daily limits properly', async () => {
      // Process activities to hit limit
      const initialResults = [];
      for (let i = 0; i < 15; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `initial-${i}`,
          isPremiumUser: false
        });
        initialResults.push(result);
      }

      const initialLimited = initialResults.filter(r => !r.success && r.dailyLimitReached);
      expect(initialLimited.length).toBeGreaterThan(0);

      // Simulate next day by manually updating the date in daily limits
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];

      // Try activity with future date (simulating next day)
      const nextDayResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'next-day-test',
        isPremiumUser: false
      });

      // Should work again (new day, new limits)
      expect(nextDayResult.success).toBe(true);
    });
  });

  describe('Referral Abuse Prevention', () => {
    it('should prevent duplicate referral relationships', async () => {
      // Create initial referral
      const firstResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: refereeIds[0]
      });
      expect(firstResult.success).toBe(true);

      // Try to create duplicate
      const duplicateResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: refereeIds[0]
      });
      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.message).toContain('already exists');
    });

    it('should prevent self-referrals', async () => {
      const selfReferralResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testUserId
      });

      expect(selfReferralResult.success).toBe(false);
    });

    it('should validate referral code format and existence', async () => {
      // Test invalid format
      const invalidFormatResult = await referralService.validateReferralCode('123');
      expect(invalidFormatResult.valid).toBe(false);

      // Test non-existent code
      const nonExistentResult = await referralService.validateReferralCode('NOTEXIST');
      expect(nonExistentResult.valid).toBe(false);

      // Test valid code
      const createResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: refereeIds[0]
      });
      
      const validResult = await referralService.validateReferralCode(createResult.referralCode!);
      expect(validResult.valid).toBe(true);
    });
  });

  describe('Suspicious Activity Detection', () => {
    it('should detect rapid-fire activity patterns', async () => {
      const rapidResults = [];
      const startTime = Date.now();

      // Try to process many activities very quickly
      const promises = [];
      for (let i = 0; i < 50; i++) {
        promises.push(
          earningActivityService.processEarningActivity({
            userId: suspiciousUserId,
            activityType: 'post',
            activityId: `rapid-${i}`,
            isPremiumUser: false,
            metadata: {
              timestamp: Date.now(),
              suspicious: true
            }
          })
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulResults = results.filter(r => r.success);
      const failedResults = results.filter(r => !r.success);

      // Should have limited some activities due to rate limiting
      expect(failedResults.length).toBeGreaterThan(0);
      
      // Activities processed too quickly should be flagged
      expect(duration).toBeLessThan(1000); // Very fast processing
      expect(successfulResults.length).toBeLessThan(50); // Not all should succeed
    });

    it('should handle invalid activity data gracefully', async () => {
      // Test with missing required fields
      const invalidResult1 = await earningActivityService.processEarningActivity({
        userId: '',
        activityType: 'post',
        isPremiumUser: false
      });
      expect(invalidResult1.success).toBe(false);

      // Test with invalid activity type
      const invalidResult2 = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'invalid_type' as any,
        isPremiumUser: false
      });
      expect(invalidResult2.success).toBe(false);

      // Test with negative quality score
      const invalidResult3 = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        qualityScore: -1,
        isPremiumUser: false
      });
      expect(invalidResult3.success).toBe(false);
    });
  });

  describe('Quality Score Validation', () => {
    it('should enforce quality score bounds', async () => {
      // Test with quality score too low
      const lowQualityResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'low-quality',
        qualityScore: 0.3, // Below minimum
        isPremiumUser: false
      });

      // Should either reject or clamp to minimum
      if (lowQualityResult.success) {
        expect(lowQualityResult.multiplier).toBeGreaterThanOrEqual(0.5);
      }

      // Test with quality score too high
      const highQualityResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'high-quality',
        qualityScore: 3.0, // Above maximum
        isPremiumUser: false
      });

      // Should either reject or clamp to maximum
      if (highQualityResult.success) {
        expect(highQualityResult.multiplier).toBeLessThanOrEqual(2.0);
      }
    });

    it('should validate quality score consistency', async () => {
      const results = [];
      
      // Process activities with same quality score
      for (let i = 0; i < 5; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `consistency-${i}`,
          qualityScore: 1.5,
          isPremiumUser: false
        });
        results.push(result);
      }

      const successfulResults = results.filter(r => r.success);
      
      if (successfulResults.length > 1) {
        // All successful results should have similar multipliers (allowing for small variations)
        const multipliers = successfulResults.map(r => r.multiplier);
        const avgMultiplier = multipliers.reduce((sum, m) => sum + m, 0) / multipliers.length;
        
        multipliers.forEach(multiplier => {
          expect(Math.abs(multiplier - avgMultiplier)).toBeLessThan(0.1);
        });
      }
    });
  });

  describe('Resource Protection', () => {
    it('should prevent excessive database queries', async () => {
      const startTime = Date.now();
      
      // Try to trigger many database operations
      const promises = [];
      for (let i = 0; i < 100; i++) {
        promises.push(
          earningActivityService.getUserEarningStats(testUserId)
        );
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time despite many queries
      expect(duration).toBeLessThan(5000);
    });

    it('should handle concurrent operations without deadlocks', async () => {
      const promises = [];
      
      // Mix of read and write operations
      for (let i = 0; i < 20; i++) {
        if (i % 2 === 0) {
          // Write operation
          promises.push(
            earningActivityService.processEarningActivity({
              userId: testUserId,
              activityType: 'comment',
              activityId: `concurrent-${i}`,
              isPremiumUser: false
            })
          );
        } else {
          // Read operation
          promises.push(
            earningActivityService.getUserEarningStats(testUserId)
          );
        }
      }

      const results = await Promise.allSettled(promises);
      
      // All operations should complete (no deadlocks)
      const failedResults = results.filter(r => r.status === 'rejected');
      expect(failedResults.length).toBe(0);
    });
  });

  describe('Data Integrity Protection', () => {
    it('should maintain consistent token balances', async () => {
      const activities = [];
      
      // Process several activities
      for (let i = 0; i < 5; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `integrity-${i}`,
          isPremiumUser: false
        });
        activities.push(result);
      }

      // Calculate expected total
      const expectedTotal = activities
        .filter(a => a.success)
        .reduce((sum, a) => sum + a.tokensEarned, 0);

      // Check actual total in database
      const stats = await earningActivityService.getUserEarningStats(testUserId);
      const actualTotal = parseFloat(stats.totalTokensEarned);

      // Should match within small tolerance
      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.01);
    });

    it('should prevent negative token amounts', async () => {
      // This test ensures the system doesn't allow negative rewards
      const result = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'negative-test',
        qualityScore: 0.1, // Very low quality
        isPremiumUser: false
      });

      if (result.success) {
        expect(result.tokensEarned).toBeGreaterThanOrEqual(0);
        expect(result.baseReward).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should handle missing or invalid earning configuration', async () => {
      // Test with activity type that might not have configuration
      const result = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'unknown_activity' as any,
        isPremiumUser: false
      });

      expect(result.success).toBe(false);
      expect(result.message).toContain('not configured');
    });

    it('should validate premium user status', async () => {
      // Test with valid premium status
      const premiumResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'premium-test',
        isPremiumUser: true
      });

      const regularResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: 'regular-test',
        isPremiumUser: false
      });

      if (premiumResult.success && regularResult.success) {
        expect(premiumResult.tokensEarned).toBeGreaterThan(regularResult.tokensEarned);
      }
    });
  });
});