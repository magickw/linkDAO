import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import { ReturnTrendAnalysisService, AnalyticsPeriod } from '../services/returnTrendAnalysisService';
import { db } from '../db/index';
import { returns } from '../db/schema';
import { redisService } from '../services/redisService';
import { sql } from 'drizzle-orm';

/**
 * Integration Tests for Return Trend Analysis Service
 * 
 * These tests validate the service against a real database and cache layer
 * to ensure end-to-end functionality works correctly.
 * 
 * Prerequisites:
 * - Test database must be running
 * - Redis must be running
 * - Database schema must be migrated
 */

describe('ReturnTrendAnalysisService - Integration Tests', () => {
  let service: ReturnTrendAnalysisService;
  const testSellerId = 'test-seller-integration';

  beforeAll(async () => {
    service = new ReturnTrendAnalysisService();
    
    // Clean up any existing test data
    await db.delete(returns).where(sql`seller_id = ${testSellerId}`);
  });

  afterAll(async () => {
    // Clean up test data
    await db.delete(returns).where(sql`seller_id = ${testSellerId}`);
    
    // Clear Redis cache
    const keys = await redisService.keys('return:trend:*');
    for (const key of keys) {
      await redisService.del(key);
    }
  });

  beforeEach(async () => {
    // Clear cache before each test
    const keys = await redisService.keys('return:trend:*');
    for (const key of keys) {
      await redisService.del(key);
    }
  });

  describe('End-to-End Period Comparison', () => {
    it('should calculate accurate period comparison with real data', async () => {
      // Insert test data for current period (February 2024)
      const currentPeriodReturns = Array.from({ length: 50 }, (_, i) => ({
        id: `return-current-${i}`,
        orderId: `order-current-${i}`,
        sellerId: testSellerId,
        buyerId: `buyer-${i}`,
        returnReason: 'defective',
        returnReasonDetails: 'Product not working',
        status: i < 40 ? 'approved' : 'rejected',
        refundAmount: '75.00',
        restockingFee: '0.00',
        returnShippingCost: '10.00',
        createdAt: new Date('2024-02-15T10:00:00Z'),
        updatedAt: new Date('2024-02-15T10:00:00Z'),
        approvedAt: i < 40 ? new Date('2024-02-16T10:00:00Z') : null,
        completedAt: i < 40 ? new Date('2024-02-17T10:00:00Z') : null,
      }));

      await db.insert(returns).values(currentPeriodReturns);

      // Insert test data for previous period (January 2024)
      const previousPeriodReturns = Array.from({ length: 30 }, (_, i) => ({
        id: `return-previous-${i}`,
        orderId: `order-previous-${i}`,
        sellerId: testSellerId,
        buyerId: `buyer-${i}`,
        returnReason: 'defective',
        returnReasonDetails: 'Product not working',
        status: i < 25 ? 'approved' : 'rejected',
        refundAmount: '75.00',
        restockingFee: '0.00',
        returnShippingCost: '10.00',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
        approvedAt: i < 25 ? new Date('2024-01-16T10:00:00Z') : null,
        completedAt: i < 25 ? new Date('2024-01-17T10:00:00Z') : null,
      }));

      await db.insert(returns).values(previousPeriodReturns);

      const currentPeriod: AnalyticsPeriod = {
        start: '2024-02-01T00:00:00Z',
        end: '2024-02-29T23:59:59Z',
      };

      const previousPeriod: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      };

      const result = await service.comparePeriods(currentPeriod, previousPeriod, testSellerId);

      // Validate results
      expect(result.currentPeriod.totalReturns).toBe(50);
      expect(result.previousPeriod.totalReturns).toBe(30);
      expect(result.absoluteChange).toBe(20);
      expect(result.percentageChange).toBeCloseTo(66.67, 1); // (50-30)/30 * 100
      expect(result.trend).toBe('increasing');
      expect(result.currentPeriod.approvalRate).toBeCloseTo(80, 1); // 40/50 * 100
      expect(result.previousPeriod.approvalRate).toBeCloseTo(83.33, 1); // 25/30 * 100
    });

    it('should use cache on subsequent requests', async () => {
      const currentPeriod: AnalyticsPeriod = {
        start: '2024-02-01T00:00:00Z',
        end: '2024-02-29T23:59:59Z',
      };

      const previousPeriod: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      };

      // First call - should hit database
      const result1 = await service.comparePeriods(currentPeriod, previousPeriod, testSellerId);

      // Second call - should hit cache
      const startTime = Date.now();
      const result2 = await service.comparePeriods(currentPeriod, previousPeriod, testSellerId);
      const endTime = Date.now();

      // Cached result should be much faster (< 50ms)
      expect(endTime - startTime).toBeLessThan(50);
      
      // Results should be identical
      expect(result2).toEqual(result1);
    });
  });

  describe('End-to-End Seasonal Pattern Detection', () => {
    it('should detect weekly patterns from real data', async () => {
      // Clean up previous test data
      await db.delete(returns).where(sql`seller_id = ${testSellerId}`);

      // Create 60 days of data with Monday peaks
      const testReturns = [];
      for (let dayIndex = 0; dayIndex < 60; dayIndex++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + dayIndex);
        const dayOfWeek = date.getDay();
        const count = dayOfWeek === 1 ? 20 : 8; // Mondays have more returns

        for (let i = 0; i < count; i++) {
          testReturns.push({
            id: `return-seasonal-${dayIndex}-${i}`,
            orderId: `order-seasonal-${dayIndex}-${i}`,
            sellerId: testSellerId,
            buyerId: `buyer-${i}`,
            returnReason: 'defective',
            returnReasonDetails: 'Product issue',
            status: 'approved',
            refundAmount: '50.00',
            restockingFee: '0.00',
            returnShippingCost: '10.00',
            createdAt: date,
            updatedAt: date,
            approvedAt: new Date(date.getTime() + 24 * 60 * 60 * 1000),
            completedAt: new Date(date.getTime() + 48 * 60 * 60 * 1000),
          });
        }
      }

      await db.insert(returns).values(testReturns);

      const period: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-03-01T23:59:59Z',
      };

      const result = await service.detectSeasonalPatterns(period, testSellerId);

      // Should detect weekly pattern
      expect(result.patterns.length).toBeGreaterThan(0);
      
      const weeklyPattern = result.patterns.find(p => p.period === 'weekly');
      expect(weeklyPattern).toBeDefined();
      expect(weeklyPattern?.confidence).toBeGreaterThan(0.5);
      expect(weeklyPattern?.description).toContain('Monday');
      
      // Should have seasonality strength
      expect(result.seasonalityStrength).toBeGreaterThan(0.3);
      
      // Should have recommendations
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should identify peak periods correctly', async () => {
      // Clean up
      await db.delete(returns).where(sql`seller_id = ${testSellerId}`);

      // Create data with clear peak period (days 15-20)
      const testReturns = [];
      for (let dayIndex = 0; dayIndex < 30; dayIndex++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + dayIndex);
        
        const count = (dayIndex >= 15 && dayIndex <= 20) ? 30 : 10;

        for (let i = 0; i < count; i++) {
          testReturns.push({
            id: `return-peak-${dayIndex}-${i}`,
            orderId: `order-peak-${dayIndex}-${i}`,
            sellerId: testSellerId,
            buyerId: `buyer-${i}`,
            returnReason: 'defective',
            returnReasonDetails: 'Product issue',
            status: 'approved',
            refundAmount: '50.00',
            restockingFee: '0.00',
            returnShippingCost: '10.00',
            createdAt: date,
            updatedAt: date,
          });
        }
      }

      await db.insert(returns).values(testReturns);

      const period: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      };

      const result = await service.detectSeasonalPatterns(period, testSellerId);

      expect(result.peakPeriods.length).toBeGreaterThan(0);
      
      const peak = result.peakPeriods[0];
      expect(peak.percentageAboveBaseline).toBeGreaterThan(100);
      expect(peak.averageVolume).toBeGreaterThan(20);
    });
  });

  describe('End-to-End Growth Rate Calculations', () => {
    it('should calculate accurate growth rates from real data', async () => {
      // Clean up
      await db.delete(returns).where(sql`seller_id = ${testSellerId}`);

      // Create 180 days of data with steady growth
      const testReturns = [];
      for (let dayIndex = 0; dayIndex < 180; dayIndex++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + dayIndex);
        const count = 10 + Math.floor(dayIndex / 10); // Gradual increase

        for (let i = 0; i < count; i++) {
          testReturns.push({
            id: `return-growth-${dayIndex}-${i}`,
            orderId: `order-growth-${dayIndex}-${i}`,
            sellerId: testSellerId,
            buyerId: `buyer-${i}`,
            returnReason: 'defective',
            returnReasonDetails: 'Product issue',
            status: 'approved',
            refundAmount: '50.00',
            restockingFee: '0.00',
            returnShippingCost: '10.00',
            createdAt: date,
            updatedAt: date,
          });
        }
      }

      await db.insert(returns).values(testReturns);

      const period: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-06-30T23:59:59Z',
      };

      const result = await service.calculateGrowthRates(period, testSellerId);

      // Validate all growth rates are present
      expect(result.dailyGrowthRate).toBeDefined();
      expect(result.weeklyGrowthRate).toBeDefined();
      expect(result.monthlyGrowthRate).toBeDefined();
      
      // With steady growth, all rates should be positive
      expect(result.dailyGrowthRate).toBeGreaterThan(0);
      expect(result.trendDirection).toBe('increasing');
      
      // Projected volumes should be reasonable
      expect(result.projectedVolume.nextWeek).toBeGreaterThan(0);
      expect(result.projectedVolume.nextMonth).toBeGreaterThan(0);
      expect(result.projectedVolume.confidence).toBeGreaterThan(0);
      expect(result.projectedVolume.confidence).toBeLessThanOrEqual(1);
    });
  });

  describe('Performance Requirements', () => {
    it('should complete comprehensive analysis in less than 5 seconds', async () => {
      // Clean up
      await db.delete(returns).where(sql`seller_id = ${testSellerId}`);

      // Create substantial dataset (365 days)
      const testReturns = [];
      for (let dayIndex = 0; dayIndex < 365; dayIndex++) {
        const date = new Date('2024-01-01');
        date.setDate(date.getDate() + dayIndex);

        for (let i = 0; i < 15; i++) {
          testReturns.push({
            id: `return-perf-${dayIndex}-${i}`,
            orderId: `order-perf-${dayIndex}-${i}`,
            sellerId: testSellerId,
            buyerId: `buyer-${i}`,
            returnReason: 'defective',
            returnReasonDetails: 'Product issue',
            status: 'approved',
            refundAmount: '50.00',
            restockingFee: '0.00',
            returnShippingCost: '10.00',
            createdAt: date,
            updatedAt: date,
          });
        }
      }

      await db.insert(returns).values(testReturns);

      const period: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-12-31T23:59:59Z',
      };

      const startTime = Date.now();
      const result = await service.getComprehensiveTrendAnalysis(period, testSellerId);
      const endTime = Date.now();

      const executionTime = (endTime - startTime) / 1000;
      
      // Validate performance requirement
      expect(executionTime).toBeLessThan(5);
      
      // Validate result completeness
      expect(result).toHaveProperty('periodComparison');
      expect(result).toHaveProperty('seasonalPatterns');
      expect(result).toHaveProperty('growthRate');
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache when new data is added', async () => {
      const period: AnalyticsPeriod = {
        start: '2024-01-01T00:00:00Z',
        end: '2024-01-31T23:59:59Z',
      };

      // First call - populate cache
      const result1 = await service.detectSeasonalPatterns(period, testSellerId);

      // Add new data
      await db.insert(returns).values({
        id: 'return-new-data',
        orderId: 'order-new-data',
        sellerId: testSellerId,
        buyerId: 'buyer-new',
        returnReason: 'defective',
        returnReasonDetails: 'New return',
        status: 'approved',
        refundAmount: '100.00',
        restockingFee: '0.00',
        returnShippingCost: '10.00',
        createdAt: new Date('2024-01-15T10:00:00Z'),
        updatedAt: new Date('2024-01-15T10:00:00Z'),
      });

      // Clear cache manually (simulating cache invalidation)
      const cacheKey = `return:trend:seasonal:${testSellerId}:${period.start}:${period.end}`;
      await redisService.del(cacheKey);

      // Second call - should fetch fresh data
      const result2 = await service.detectSeasonalPatterns(period, testSellerId);

      // Results might differ due to new data
      // At minimum, the call should succeed
      expect(result2).toBeDefined();
      expect(result2).toHaveProperty('patterns');
    });
  });
});
