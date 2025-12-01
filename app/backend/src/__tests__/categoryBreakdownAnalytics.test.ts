import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { returnTrendAnalysisService } from '../services/returnTrendAnalysisService';
import type { AnalyticsPeriod } from '../services/returnTrendAnalysisService';

// Mock dependencies
jest.mock('../db/index');
jest.mock('../services/redisService');
jest.mock('../utils/safeLogger');

describe('Category Breakdown Analytics', () => {
  const testPeriod: AnalyticsPeriod = {
    start: '2024-01-01T00:00:00Z',
    end: '2024-01-31T23:59:59Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getCategoryBreakdownAnalytics', () => {
    it('should return category breakdown analytics with all required fields', async () => {
      // This test validates Property 4: Comprehensive Trend Analysis (category dimension)
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('categories');
      expect(result).toHaveProperty('topCategories');
      expect(result).toHaveProperty('bottomCategories');
      expect(result).toHaveProperty('categoryComparison');
      expect(result).toHaveProperty('insights');
    });

    it('should include category-wise return rates', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 0) {
        const category = result.categories[0];
        expect(category).toHaveProperty('categoryId');
        expect(category).toHaveProperty('categoryName');
        expect(category).toHaveProperty('totalReturns');
        expect(category).toHaveProperty('returnRate');
        expect(category).toHaveProperty('averageProcessingTime');
        expect(category).toHaveProperty('approvalRate');
        expect(category).toHaveProperty('totalRefundAmount');
        expect(category).toHaveProperty('averageRefundAmount');
        expect(category).toHaveProperty('percentageOfTotalReturns');
        expect(category).toHaveProperty('trendDirection');
        expect(category).toHaveProperty('monthOverMonthChange');
      }
    });

    it('should provide category performance comparison', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categoryComparison.length > 0) {
        const comparison = result.categoryComparison[0];
        expect(comparison).toHaveProperty('categoryId');
        expect(comparison).toHaveProperty('categoryName');
        expect(comparison).toHaveProperty('currentPeriodReturns');
        expect(comparison).toHaveProperty('previousPeriodReturns');
        expect(comparison).toHaveProperty('percentageChange');
        expect(comparison).toHaveProperty('trend');
        expect(['improving', 'worsening', 'stable']).toContain(comparison.trend);
      }
    });

    it('should include category trend analysis', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 0) {
        const category = result.categories[0];
        expect(['increasing', 'decreasing', 'stable']).toContain(category.trendDirection);
        expect(typeof category.monthOverMonthChange).toBe('number');
      }
    });

    it('should identify top performing categories', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      expect(Array.isArray(result.topCategories)).toBe(true);
      expect(result.topCategories.length).toBeLessThanOrEqual(5);

      // Top categories should be sorted by total returns descending
      for (let i = 1; i < result.topCategories.length; i++) {
        expect(result.topCategories[i - 1].totalReturns).toBeGreaterThanOrEqual(
          result.topCategories[i].totalReturns
        );
      }
    });

    it('should identify bottom performing categories', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      expect(Array.isArray(result.bottomCategories)).toBe(true);
      expect(result.bottomCategories.length).toBeLessThanOrEqual(5);
    });

    it('should generate actionable insights', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      expect(Array.isArray(result.insights)).toBe(true);
      expect(result.insights.length).toBeGreaterThan(0);

      // Each insight should be a non-empty string
      result.insights.forEach(insight => {
        expect(typeof insight).toBe('string');
        expect(insight.length).toBeGreaterThan(0);
      });
    });

    it('should calculate percentage of total returns correctly', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 0) {
        // Sum of all percentages should be approximately 100%
        const totalPercentage = result.categories.reduce(
          (sum, cat) => sum + cat.percentageOfTotalReturns,
          0
        );

        expect(totalPercentage).toBeGreaterThan(99);
        expect(totalPercentage).toBeLessThan(101);
      }
    });

    it('should handle seller-specific analytics', async () => {
      const sellerId = 'test-seller-123';
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(
        testPeriod,
        sellerId
      );

      expect(result).toBeDefined();
      expect(result).toHaveProperty('categories');
    });

    it('should cache results for performance', async () => {
      // First call
      const result1 = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      // Second call should use cache
      const result2 = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      expect(result1).toEqual(result2);
    });
  });

  describe('Category Comparison', () => {
    it('should detect improving categories', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      const improvingCategories = result.categoryComparison.filter(c => c.trend === 'improving');

      improvingCategories.forEach(category => {
        // Improving means returns decreased
        expect(category.percentageChange).toBeLessThan(0);
      });
    });

    it('should detect worsening categories', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      const worseningCategories = result.categoryComparison.filter(c => c.trend === 'worsening');

      worseningCategories.forEach(category => {
        // Worsening means returns increased
        expect(category.percentageChange).toBeGreaterThan(0);
      });
    });

    it('should sort comparisons by significance', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      // Comparisons should be sorted by absolute percentage change
      for (let i = 1; i < result.categoryComparison.length; i++) {
        const prevChange = Math.abs(result.categoryComparison[i - 1].percentageChange);
        const currentChange = Math.abs(result.categoryComparison[i].percentageChange);

        expect(prevChange).toBeGreaterThanOrEqual(currentChange);
      }
    });
  });

  describe('Insights Generation', () => {
    it('should identify highest return volume category', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 0) {
        const highestVolumeInsight = result.insights.find(insight =>
          insight.includes('highest return volume')
        );

        expect(highestVolumeInsight).toBeDefined();
      }
    });

    it('should flag significant changes', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      const significantChanges = result.categoryComparison.filter(
        c => Math.abs(c.percentageChange) > 20
      );

      if (significantChanges.length > 0) {
        const changeInsight = result.insights.find(
          insight => insight.includes('significant') && insight.includes('returns')
        );

        expect(changeInsight).toBeDefined();
      }
    });

    it('should identify processing time variations', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 1) {
        const avgProcessingTime =
          result.categories.reduce((sum, c) => sum + c.averageProcessingTime, 0) /
          result.categories.length;

        const slowCategories = result.categories.filter(
          c => c.averageProcessingTime > avgProcessingTime * 1.5
        );

        if (slowCategories.length > 0) {
          const processingInsight = result.insights.find(insight =>
            insight.includes('processing times')
          );

          expect(processingInsight).toBeDefined();
        }
      }
    });

    it('should identify approval rate variations', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 1) {
        const avgApprovalRate =
          result.categories.reduce((sum, c) => sum + c.approvalRate, 0) /
          result.categories.length;

        const lowApprovalCategories = result.categories.filter(
          c => c.approvalRate < avgApprovalRate * 0.8
        );

        if (lowApprovalCategories.length > 0) {
          const approvalInsight = result.insights.find(insight =>
            insight.includes('approval rates')
          );

          expect(approvalInsight).toBeDefined();
        }
      }
    });

    it('should identify high refund amount categories', async () => {
      const result = await returnTrendAnalysisService.getCategoryBreakdownAnalytics(testPeriod);

      if (result.categories.length > 0 && result.categories[0].averageRefundAmount > 0) {
        const refundInsight = result.insights.find(insight =>
          insight.includes('highest average refund amount')
        );

        expect(refundInsight).toBeDefined();
      }
    });
  });
});
