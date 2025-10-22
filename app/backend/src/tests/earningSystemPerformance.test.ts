import { describe, it, expect, beforeAll, afterAll, jest } from '@jest/globals';
import { earningActivityService } from '../services/earningActivityService';
import { referralService } from '../services/referralService';
import { marketplaceRewardsService } from '../services/marketplaceRewardsService';
import { db } from '../db/index';
import { 
  earningActivities, 
  referrals, 
  marketplaceRewards,
  dailyEarningLimits,
  userEarningStats
} from '../db/schema';
import { eq } from 'drizzle-orm';

// Mock external dependencies
jest.mock('../services/notificationService');
jest.mock('../services/reputationService');

describe('Earning System Performance Tests', () => {
  const testUserIds = Array.from({ length: 100 }, (_, i) => `perf-user-${i}`);
  
  beforeAll(async () => {
    // Clean up any existing test data
    for (const userId of testUserIds) {
      await db.delete(earningActivities).where(eq(earningActivities.userId, userId));
      await db.delete(referrals).where(eq(referrals.referrerId, userId));
      await db.delete(marketplaceRewards).where(eq(marketplaceRewards.buyerId, userId));
      await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, userId));
      await db.delete(userEarningStats).where(eq(userEarningStats.userId, userId));
    }
  });

  afterAll(async () => {
    // Clean up test data
    for (const userId of testUserIds) {
      await db.delete(earningActivities).where(eq(earningActivities.userId, userId));
      await db.delete(referrals).where(eq(referrals.referrerId, userId));
      await db.delete(marketplaceRewards).where(eq(marketplaceRewards.buyerId, userId));
      await db.delete(dailyEarningLimits).where(eq(dailyEarningLimits.userId, userId));
      await db.delete(userEarningStats).where(eq(userEarningStats.userId, userId));
    }
  });

  describe('High Volume Activity Processing', () => {
    it('should handle 1000 concurrent earning activities efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Create 1000 earning activities across 100 users
      for (let i = 0; i < 1000; i++) {
        const userId = testUserIds[i % testUserIds.length];
        promises.push(
          earningActivityService.processEarningActivity({
            userId,
            activityType: 'post',
            activityId: `load-test-${i}`,
            isPremiumUser: Math.random() > 0.5,
            qualityScore: 1.0 + Math.random(),
            metadata: {
              loadTest: true,
              batchId: Math.floor(i / 100)
            }
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Processed 1000 activities in ${duration}ms`);

      // Performance expectations
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      // Check success rate
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      const successRate = (successfulResults.length / results.length) * 100;
      
      expect(successRate).toBeGreaterThan(70); // At least 70% success rate
      console.log(`Success rate: ${successRate.toFixed(2)}%`);
    }, 60000); // 60 second timeout

    it('should efficiently process batch referral operations', async () => {
      const startTime = Date.now();
      const promises = [];

      // Create 500 referral relationships
      for (let i = 0; i < 500; i++) {
        const referrerId = testUserIds[i % 50]; // 50 referrers
        const refereeId = `referee-${i}`;
        
        promises.push(
          referralService.createReferral({
            referrerId,
            refereeId,
            tier: Math.floor(Math.random() * 3) + 1,
            bonusPercentage: 10 + Math.floor(Math.random() * 15)
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Processed 500 referrals in ${duration}ms`);

      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      
      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      expect(successfulResults.length).toBeGreaterThan(400); // Most should succeed
    }, 30000);

    it('should handle high-volume marketplace transactions', async () => {
      const startTime = Date.now();
      const promises = [];

      // Process 200 marketplace transactions
      for (let i = 0; i < 200; i++) {
        const buyerId = testUserIds[i % 50];
        const sellerId = testUserIds[(i + 25) % 50];
        
        promises.push(
          marketplaceRewardsService.processMarketplaceRewards({
            orderId: 100000 + i,
            buyerId,
            sellerId,
            transactionAmount: 100 + Math.random() * 1000,
            isPremiumBuyer: Math.random() > 0.7,
            isPremiumSeller: Math.random() > 0.7
          })
        );
      }

      await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Processed 200 marketplace transactions in ${duration}ms`);

      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, 25000);
  });

  describe('Database Query Performance', () => {
    it('should efficiently retrieve user statistics for multiple users', async () => {
      // First, create some earning history for users
      const setupPromises = [];
      for (let i = 0; i < 50; i++) {
        const userId = testUserIds[i];
        for (let j = 0; j < 5; j++) {
          setupPromises.push(
            earningActivityService.processEarningActivity({
              userId,
              activityType: 'comment',
              activityId: `setup-${i}-${j}`,
              isPremiumUser: false
            })
          );
        }
      }
      await Promise.allSettled(setupPromises);

      // Now test query performance
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 50; i++) {
        promises.push(earningActivityService.getUserEarningStats(testUserIds[i]));
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Retrieved stats for 50 users in ${duration}ms`);

      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
      expect(results.length).toBe(50);
      
      // Verify data integrity
      results.forEach(stats => {
        expect(parseFloat(stats.totalTokensEarned)).toBeGreaterThan(0);
        expect(stats.totalActivities).toBeGreaterThan(0);
      });
    });

    it('should efficiently retrieve activity feeds for multiple users', async () => {
      const startTime = Date.now();
      const promises = [];

      for (let i = 0; i < 30; i++) {
        promises.push(
          earningActivityService.getUserActivityFeed(testUserIds[i], 20, 0)
        );
      }

      const results = await Promise.all(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Retrieved activity feeds for 30 users in ${duration}ms`);

      expect(duration).toBeLessThan(1500); // Should complete within 1.5 seconds
      expect(results.length).toBe(30);
    });

    it('should efficiently generate leaderboards', async () => {
      const startTime = Date.now();

      const [earningLeaderboard, referralLeaderboard] = await Promise.all([
        earningActivityService.getEarningLeaderboard('weekly', 50),
        referralService.getReferralLeaderboard(50)
      ]);

      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Generated leaderboards in ${duration}ms`);

      expect(duration).toBeLessThan(1000); // Should complete within 1 second
      expect(earningLeaderboard.length).toBeGreaterThan(0);
    });
  });

  describe('Memory and Resource Usage', () => {
    it('should not cause memory leaks during intensive operations', async () => {
      const initialMemory = process.memoryUsage();
      
      // Perform intensive operations
      const promises = [];
      for (let batch = 0; batch < 10; batch++) {
        for (let i = 0; i < 50; i++) {
          const userId = testUserIds[i % 20];
          promises.push(
            earningActivityService.processEarningActivity({
              userId,
              activityType: 'post',
              activityId: `memory-test-${batch}-${i}`,
              isPremiumUser: false
            })
          );
        }
        
        // Process in batches to avoid overwhelming the system
        if (promises.length >= 100) {
          await Promise.allSettled(promises.splice(0, 100));
        }
      }
      
      // Process remaining promises
      if (promises.length > 0) {
        await Promise.allSettled(promises);
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage();
      const memoryIncrease = finalMemory.heapUsed - initialMemory.heapUsed;
      const memoryIncreaseMB = memoryIncrease / (1024 * 1024);

      console.log(`Memory increase: ${memoryIncreaseMB.toFixed(2)}MB`);

      // Memory increase should be reasonable (less than 100MB)
      expect(memoryIncreaseMB).toBeLessThan(100);
    }, 60000);
  });

  describe('Rate Limiting and Abuse Prevention', () => {
    it('should effectively rate limit rapid requests', async () => {
      const userId = testUserIds[0];
      const startTime = Date.now();
      const promises = [];

      // Try to process 100 activities rapidly for the same user
      for (let i = 0; i < 100; i++) {
        promises.push(
          earningActivityService.processEarningActivity({
            userId,
            activityType: 'post',
            activityId: `rate-limit-${i}`,
            isPremiumUser: false
          })
        );
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      const successfulResults = results.filter(r => 
        r.status === 'fulfilled' && r.value.success
      );
      const limitedResults = results.filter(r => 
        r.status === 'fulfilled' && !r.value.success && r.value.dailyLimitReached
      );

      console.log(`Rate limiting test: ${successfulResults.length} successful, ${limitedResults.length} limited`);

      // Should have limited some requests due to daily limits
      expect(limitedResults.length).toBeGreaterThan(0);
      expect(successfulResults.length).toBeLessThan(100);
      
      // Should complete quickly despite rate limiting
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('Concurrent User Scenarios', () => {
    it('should handle mixed concurrent operations efficiently', async () => {
      const startTime = Date.now();
      const promises = [];

      // Mix of different operations
      for (let i = 0; i < 200; i++) {
        const userId = testUserIds[i % 30];
        const operation = i % 4;

        switch (operation) {
          case 0:
            // Earning activity
            promises.push(
              earningActivityService.processEarningActivity({
                userId,
                activityType: 'post',
                activityId: `mixed-${i}`,
                isPremiumUser: false
              })
            );
            break;
          case 1:
            // Get user stats
            promises.push(earningActivityService.getUserEarningStats(userId));
            break;
          case 2:
            // Get activity feed
            promises.push(earningActivityService.getUserActivityFeed(userId, 10, 0));
            break;
          case 3:
            // Marketplace transaction
            promises.push(
              marketplaceRewardsService.processMarketplaceRewards({
                orderId: 200000 + i,
                buyerId: userId,
                sellerId: testUserIds[(i + 15) % 30],
                transactionAmount: 500,
                isPremiumBuyer: false,
                isPremiumSeller: false
              })
            );
            break;
        }
      }

      const results = await Promise.allSettled(promises);
      const endTime = Date.now();
      const duration = endTime - startTime;

      console.log(`Mixed operations completed in ${duration}ms`);

      expect(duration).toBeLessThan(20000); // Should complete within 20 seconds
      
      const successfulResults = results.filter(r => r.status === 'fulfilled');
      const successRate = (successfulResults.length / results.length) * 100;
      
      expect(successRate).toBeGreaterThan(80); // At least 80% success rate
      console.log(`Mixed operations success rate: ${successRate.toFixed(2)}%`);
    }, 30000);
  });
});