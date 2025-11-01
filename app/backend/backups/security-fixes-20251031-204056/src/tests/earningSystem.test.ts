import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { earningActivityService } from '../services/earningActivityService';
import { referralService } from '../services/referralService';
import { marketplaceRewardsService } from '../services/marketplaceRewardsService';
import { db } from '../db/index';
import { 
  earningActivities, 
  referrals, 
  marketplaceRewards,
  dailyEarningLimits,
  userEarningStats,
  earningConfig
} from '../db/schema';
import { eq, and } from 'drizzle-orm';

// Mock external dependencies
jest.mock('../services/notificationService');
jest.mock('../services/reputationService');

describe('Earning System Mechanics', () => {
  const testUserId = 'test-user-123';
  const testRefereeId = 'test-referee-456';
  const testOrderId = 12345;

  beforeEach(async () => {
    // Clean up test data
    await db.delete(earningActivities).where(eq(earningActivities.userId, testUserId));
    await db.delete(referrals).where(eq(referrals.referrerId, testUserId));
    await db.delete(marketplaceRewards).where(eq(marketplaceRewards.buyerId, testUserId));
    await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, testUserId));
    await db.delete(userEarningStats).where(eq(userEarningStats.userId, testUserId));
  });

  afterEach(async () => {
    // Clean up test data
    await db.delete(earningActivities).where(eq(earningActivities.userId, testUserId));
    await db.delete(referrals).where(eq(referrals.referrerId, testUserId));
    await db.delete(marketplaceRewards).where(eq(marketplaceRewards.buyerId, testUserId));
    await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, testUserId));
    await db.delete(userEarningStats).where(eq(userEarningStats.userId, testUserId));
  });

  describe('Earning Activity Service', () => {
    it('should process post creation earning successfully', async () => {
      const result = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '123',
        qualityScore: 1.5,
        isPremiumUser: false,
        metadata: {
          postId: 123,
          contentLength: 500
        }
      });

      expect(result.success).toBe(true);
      expect(result.tokensEarned).toBeGreaterThan(0);
      expect(result.baseReward).toBe(10); // Default post reward
      expect(result.multiplier).toBeGreaterThan(1); // Quality multiplier applied
    });

    it('should apply premium bonus correctly', async () => {
      const regularResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '124',
        isPremiumUser: false
      });

      const premiumResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '125',
        isPremiumUser: true
      });

      expect(premiumResult.tokensEarned).toBeGreaterThan(regularResult.tokensEarned);
      expect(premiumResult.premiumBonus).toBeGreaterThan(0);
    });

    it('should enforce daily earning limits', async () => {
      // Process multiple activities to reach daily limit
      const activities = [];
      for (let i = 0; i < 15; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `post-${i}`,
          isPremiumUser: false
        });
        activities.push(result);
      }

      // Check that some activities were limited
      const successfulActivities = activities.filter(a => a.success);
      const limitedActivities = activities.filter(a => !a.success && a.dailyLimitReached);

      expect(successfulActivities.length).toBeGreaterThan(0);
      expect(limitedActivities.length).toBeGreaterThan(0);
    });

    it('should calculate quality scores correctly', async () => {
      const lowQualityResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '126',
        qualityScore: 0.8,
        isPremiumUser: false
      });

      const highQualityResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '127',
        qualityScore: 1.8,
        isPremiumUser: false
      });

      expect(highQualityResult.tokensEarned).toBeGreaterThan(lowQualityResult.tokensEarned);
    });

    it('should update user earning statistics', async () => {
      await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'post',
        activityId: '128',
        isPremiumUser: false
      });

      const stats = await earningActivityService.getUserEarningStats(testUserId);
      
      expect(parseFloat(stats.totalTokensEarned)).toBeGreaterThan(0);
      expect(stats.totalActivities).toBe(1);
    });

    it('should create activity feed entries', async () => {
      await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'comment',
        activityId: '129',
        isPremiumUser: false
      });

      const feed = await earningActivityService.getUserActivityFeed(testUserId, 10, 0);
      
      expect(feed.length).toBe(1);
      expect(feed[0].activityType).toBe('comment');
      expect(parseFloat(feed[0].tokensEarned)).toBeGreaterThan(0);
    });
  });

  describe('Referral Service', () => {
    it('should create referral relationship successfully', async () => {
      const result = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId,
        tier: 1,
        bonusPercentage: 10
      });

      expect(result.success).toBe(true);
      expect(result.referralCode).toBeDefined();
      expect(result.referralCode?.length).toBe(8);
    });

    it('should prevent duplicate referral relationships', async () => {
      // Create first referral
      await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId
      });

      // Try to create duplicate
      const duplicateResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId
      });

      expect(duplicateResult.success).toBe(false);
      expect(duplicateResult.message).toContain('already exists');
    });

    it('should validate referral codes correctly', async () => {
      const createResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId
      });

      const validationResult = await referralService.validateReferralCode(createResult.referralCode!);
      
      expect(validationResult.valid).toBe(true);
      expect(validationResult.referrerId).toBe(testUserId);
    });

    it('should reject invalid referral codes', async () => {
      const validationResult = await referralService.validateReferralCode('INVALID123');
      
      expect(validationResult.valid).toBe(false);
      expect(validationResult.message).toContain('Invalid referral code');
    });

    it('should calculate referral statistics correctly', async () => {
      // Create multiple referrals
      for (let i = 0; i < 3; i++) {
        await referralService.createReferral({
          referrerId: testUserId,
          refereeId: `referee-${i}`,
          tier: 1
        });
      }

      const stats = await referralService.getReferralStats(testUserId);
      
      expect(stats.totalReferrals).toBe(3);
      expect(stats.activeReferrals).toBe(3);
      expect(stats.totalEarned).toBeGreaterThan(0);
    });

    it('should process activity bonuses for referrers', async () => {
      // Create referral relationship
      await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId,
        bonusPercentage: 15
      });

      // Process activity bonus
      await referralService.processActivityBonus(testRefereeId, 100);

      const stats = await referralService.getReferralStats(testUserId);
      expect(stats.totalEarned).toBeGreaterThan(50); // Should include signup bonus + activity bonus
    });
  });

  describe('Marketplace Rewards Service', () => {
    it('should process marketplace transaction rewards', async () => {
      await marketplaceRewardsService.processMarketplaceRewards({
        orderId: testOrderId,
        buyerId: testUserId,
        sellerId: 'seller-123',
        transactionAmount: 1000,
        isPremiumBuyer: false,
        isPremiumSeller: false
      });

      const stats = await marketplaceRewardsService.getUserMarketplaceStats(testUserId);
      
      expect(stats.totalTransactions).toBe(1);
      expect(stats.totalVolume).toBe(1000);
      expect(stats.totalRewardsEarned).toBeGreaterThan(0);
    });

    it('should apply volume-based tier multipliers', async () => {
      // Process multiple high-value transactions to reach higher tier
      for (let i = 0; i < 5; i++) {
        await marketplaceRewardsService.processMarketplaceRewards({
          orderId: testOrderId + i,
          buyerId: testUserId,
          sellerId: 'seller-123',
          transactionAmount: 2000,
          isPremiumBuyer: false,
          isPremiumSeller: false
        });
      }

      const stats = await marketplaceRewardsService.getUserMarketplaceStats(testUserId);
      
      expect(stats.totalVolume).toBe(10000);
      expect(stats.currentTier.name).not.toBe('Bronze'); // Should have upgraded
      expect(stats.currentTier.buyerMultiplier).toBeGreaterThan(1.0);
    });

    it('should create and track marketplace challenges', async () => {
      const challengeResult = await marketplaceRewardsService.createMarketplaceChallenge({
        name: 'Test Challenge',
        description: 'Complete 5 transactions',
        challengeType: 'weekly',
        targetValue: 5,
        rewardAmount: 100,
        bonusMultiplier: 1.5
      });

      expect(challengeResult.success).toBe(true);
      expect(challengeResult.challengeId).toBeDefined();

      const challenges = await marketplaceRewardsService.getActiveMarketplaceChallenges(testUserId);
      expect(challenges.length).toBeGreaterThan(0);
    });

    it('should track user progress in challenges', async () => {
      // Create a challenge
      await marketplaceRewardsService.createMarketplaceChallenge({
        name: 'Transaction Challenge',
        description: 'Complete 3 transactions',
        challengeType: 'daily',
        targetValue: 3,
        rewardAmount: 50
      });

      // Process transactions to make progress
      for (let i = 0; i < 2; i++) {
        await marketplaceRewardsService.processMarketplaceRewards({
          orderId: testOrderId + i,
          buyerId: testUserId,
          sellerId: 'seller-123',
          transactionAmount: 500,
          isPremiumBuyer: false,
          isPremiumSeller: false
        });
      }

      const challenges = await marketplaceRewardsService.getActiveMarketplaceChallenges(testUserId);
      const userChallenge = challenges.find(c => c.userProgress);
      
      expect(userChallenge).toBeDefined();
      expect(userChallenge?.userProgress?.currentProgress).toBe(2);
      expect(userChallenge?.userProgress?.isCompleted).toBe(false);
    });
  });

  describe('Abuse Prevention', () => {
    it('should prevent rapid-fire earning attempts', async () => {
      const promises = [];
      
      // Try to process many activities simultaneously
      for (let i = 0; i < 20; i++) {
        promises.push(
          earningActivityService.processEarningActivity({
            userId: testUserId,
            activityType: 'post',
            activityId: `rapid-${i}`,
            isPremiumUser: false
          })
        );
      }

      const results = await Promise.all(promises);
      const successfulResults = results.filter(r => r.success);
      const limitedResults = results.filter(r => !r.success && r.dailyLimitReached);

      // Should have some successful and some limited due to daily limits
      expect(successfulResults.length).toBeGreaterThan(0);
      expect(limitedResults.length).toBeGreaterThan(0);
    });

    it('should validate activity data integrity', async () => {
      // Test with invalid activity type
      const invalidResult = await earningActivityService.processEarningActivity({
        userId: testUserId,
        activityType: 'invalid_type' as any,
        isPremiumUser: false
      });

      expect(invalidResult.success).toBe(false);
    });
  });

  describe('Performance and Scalability', () => {
    it('should handle concurrent earning activities efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Process multiple activities concurrently
      for (let i = 0; i < 10; i++) {
        promises.push(
          earningActivityService.processEarningActivity({
            userId: `user-${i}`,
            activityType: 'comment',
            activityId: `comment-${i}`,
            isPremiumUser: false
          })
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (less than 5 seconds)
      expect(duration).toBeLessThan(5000);
      
      // All activities should be processed successfully
      const successfulResults = results.filter(r => r.success);
      expect(successfulResults.length).toBe(10);
    });

    it('should efficiently query user statistics', async () => {
      // Create some earning history
      for (let i = 0; i < 5; i++) {
        await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `perf-${i}`,
          isPremiumUser: false
        });
      }

      const startTime = Date.now();
      
      // Query statistics multiple times
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(earningActivityService.getUserEarningStats(testUserId));
      }

      await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete quickly (less than 1 second)
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain consistent earning statistics', async () => {
      // Process several activities
      const activities = [];
      for (let i = 0; i < 3; i++) {
        const result = await earningActivityService.processEarningActivity({
          userId: testUserId,
          activityType: 'post',
          activityId: `consistency-${i}`,
          isPremiumUser: false
        });
        activities.push(result);
      }

      // Calculate expected totals
      const expectedTotal = activities
        .filter(a => a.success)
        .reduce((sum, a) => sum + a.tokensEarned, 0);

      // Check user statistics
      const stats = await earningActivityService.getUserEarningStats(testUserId);
      const actualTotal = parseFloat(stats.totalTokensEarned);

      expect(Math.abs(actualTotal - expectedTotal)).toBeLessThan(0.01); // Allow for small floating point differences
    });

    it('should maintain referral relationship integrity', async () => {
      // Create referral
      const createResult = await referralService.createReferral({
        referrerId: testUserId,
        refereeId: testRefereeId
      });

      // Verify referral exists and is valid
      const validationResult = await referralService.validateReferralCode(createResult.referralCode!);
      expect(validationResult.valid).toBe(true);

      // Check referral history
      const history = await referralService.getUserReferralHistory(testUserId);
      expect(history.length).toBe(1);
      expect(history[0].refereeId).toBe(testRefereeId);
    });
  });
});