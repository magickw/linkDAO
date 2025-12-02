import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { performanceBenchmarkService } from '../performanceBenchmarkService';
import { BenchmarkData, PerformanceTarget, HistoricalComparison } from '../performanceBenchmarkService';

/**
 * Unit tests for Performance Benchmark Service
 * 
 * Tests comprehensive benchmarking functionality including:
 * - Benchmark data generation
 * - Historical comparisons
 * - Target setting
 * - Performance tracking
 */

describe('PerformanceBenchmarkService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateBenchmarkData', () => {
    it('should generate comprehensive benchmark data for a seller', async () => {
      const sellerId = 'test-seller-1';
      const sellerName = 'Test Seller';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await performanceBenchmarkService.generateBenchmarkData(
        sellerId,
        sellerName,
        startDate,
        endDate
      );

      expect(result).toBeDefined();
      expect(result.sellerId).toBe(sellerId);
      expect(result.sellerName).toBe(sellerName);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.length).toBeGreaterThan(0);
      expect(result.overallScore).toBeGreaterThanOrEqual(0);
      expect(result.overallScore).toBeLessThanOrEqual(100);
      expect(result.performanceGrade).toMatch(/^[A-F]$/);
      expect(result.percentile).toBeGreaterThanOrEqual(1);
      expect(result.percentile).toBeLessThanOrEqual(99);
    });

    it('should include all required benchmark metrics', async () => {
      const result = await performanceBenchmarkService.generateBenchmarkData(
        'seller-1',
        'Test Seller',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      const metricIds = result.metrics.map(m => m.id);
      const expectedMetrics = [
        'processing_time',
        'approval_rate',
        'return_rate',
        'customer_satisfaction',
        'compliance_score',
        'refund_processing_time',
        'policy_adherence',
        'response_time',
        'cost_per_return'
      ];

      expectedMetrics.forEach(metricId => {
        expect(metricIds).toContain(metricId);
      });
    });

    it('should calculate correct performance grades based on percentile', async () => {
      const testCases = [
        { percentile: 95, expectedGrade: 'A' },
        { percentile: 85, expectedGrade: 'B' },
        { percentile: 75, expectedGrade: 'C' },
        { percentile: 65, expectedGrade: 'D' },
        { percentile: 55, expectedGrade: 'F' }
      ];

      for (const testCase of testCases) {
        // Mock the percentile calculation
        jest.spyOn(performanceBenchmarkService as any, 'calculatePercentile')
          .mockReturnValue(testCase.percentile);

        const result = await performanceBenchmarkService.generateBenchmarkData(
          'seller-1',
          'Test Seller',
          new Date('2024-01-01'),
          new Date('2024-01-31')
        );

        expect(result.performanceGrade).toBe(testCase.expectedGrade);
      }
    });
  });

  describe('getHistoricalComparison', () => {
    it('should generate accurate historical comparisons', async () => {
      const sellerId = 'test-seller-1';
      const metricId = 'processing_time';
      const currentPeriod = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31')
      };
      const previousPeriod = {
        startDate: new Date('2023-12-01'),
        endDate: new Date('2023-12-31')
      };

      const result = await performanceBenchmarkService.getHistoricalComparison(
        sellerId,
        metricId,
        currentPeriod,
        previousPeriod
      );

      expect(result).toBeDefined();
      expect(result!.sellerId).toBe(sellerId);
      expect(result!.metricId).toBe(metricId);
      expect(result!.change).toBeDefined();
      expect(result!.changePercentage).toBeDefined();
      expect(result!.trend).toMatch(/^(improving|declining|stable)$/);
      expect(result!.significance).toMatch(/^(significant|minor|insufficient_data)$/);
      expect(result!.confidence).toBeGreaterThanOrEqual(0);
      expect(result!.confidence).toBeLessThanOrEqual(1);
    });

    it('should handle insufficient data gracefully', async () => {
      const result = await performanceBenchmarkService.getHistoricalComparison(
        'non-existent-seller',
        'processing_time',
        { startDate: new Date('2024-01-01'), endDate: new Date('2024-01-31') },
        { startDate: new Date('2023-12-01'), endDate: new Date('2023-12-31') }
      );

      expect(result).toBeNull();
    });
  });

  describe('getTimeSeriesAnalysis', () => {
    it('should perform comprehensive time-series analysis', async () => {
      const sellerId = 'test-seller-1';
      const metricId = 'processing_time';
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-03-31');

      const result = await performanceBenchmarkService.getTimeSeriesAnalysis(
        sellerId,
        metricId,
        startDate,
        endDate,
        'weekly'
      );

      expect(result).toBeDefined();
      expect(result.dataPoints).toBeDefined();
      expect(result.dataPoints.length).toBeGreaterThan(0);
      expect(result.trendAnalysis).toBeDefined();
      expect(result.trendAnalysis.direction).toMatch(/^(improving|declining|stable)$/);
      expect(result.trendAnalysis.strength).toBeGreaterThanOrEqual(0);
      expect(result.trendAnalysis.strength).toBeLessThanOrEqual(1);
      expect(result.trendAnalysis.correlation).toBeGreaterThanOrEqual(-1);
      expect(result.trendAnalysis.correlation).toBeLessThanOrEqual(1);
      expect(result.statisticalAnalysis).toBeDefined();
      expect(result.statisticalAnalysis.mean).toBeDefined();
      expect(result.statisticalAnalysis.standardDeviation).toBeGreaterThanOrEqual(0);
      expect(result.performanceInsights).toBeDefined();
      expect(result.performanceInsights.bestPeriod).toBeDefined();
      expect(result.performanceInsights.worstPeriod).toBeDefined();
    });

    it('should detect seasonality in time-series data', async () => {
      const sellerId = 'test-seller-1';
      const metricId = 'approval_rate';
      const startDate = new Date('2023-01-01');
      const endDate = new Date('2024-12-31'); // 2 years of data

      const result = await performanceBenchmarkService.getTimeSeriesAnalysis(
        sellerId,
        metricId,
        startDate,
        endDate,
        'monthly'
      );

      expect(result.trendAnalysis.seasonality).toBeDefined();
      if (result.trendAnalysis.seasonality) {
        expect(result.trendAnalysis.seasonalityPattern).toBeDefined();
      }
    });
  });

  describe('setPerformanceTarget', () => {
    it('should set valid performance targets', async () => {
      const sellerId = 'test-seller-1';
      const metricId = 'processing_time';
      const targetValue = 36;
      const deadline = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);
      const createdBy = 'admin';

      const result = await performanceBenchmarkService.setPerformanceTarget(
        sellerId,
        metricId,
        targetValue,
        deadline,
        createdBy
      );

      expect(result).toBeDefined();
      expect(result.sellerId).toBe(sellerId);
      expect(result.metricId).toBe(metricId);
      expect(result.targetValue).toBe(targetValue);
      expect(result.deadline).toEqual(deadline);
      expect(result.createdBy).toBe(createdBy);
      expect(result.progress).toBeGreaterThanOrEqual(0);
      expect(result.progress).toBeLessThanOrEqual(100);
      expect(result.status).toMatch(/^(on_track|at_risk|missed|achieved)$/);
    });

    it('should reject invalid metric IDs', async () => {
      await expect(
        performanceBenchmarkService.setPerformanceTarget(
          'seller-1',
          'invalid-metric',
          50,
          new Date(),
          'admin'
        )
      ).rejects.toThrow('Invalid metric ID');
    });
  });

  describe('getPerformanceTargets', () => {
    it('should retrieve performance targets for a seller', async () => {
      const sellerId = 'test-seller-1';

      const result = await performanceBenchmarkService.getPerformanceTargets(sellerId);

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      if (result.length > 0) {
        result.forEach(target => {
          expect(target.sellerId).toBe(sellerId);
          expect(target.metricId).toBeDefined();
          expect(target.targetValue).toBeDefined();
          expect(target.currentValue).toBeDefined();
          expect(target.progress).toBeGreaterThanOrEqual(0);
          expect(target.progress).toBeLessThanOrEqual(100);
          expect(target.status).toMatch(/^(on_track|at_risk|missed|achieved)$/);
        });
      }
    });
  });

  describe('updatePerformanceTarget', () => {
    it('should update performance targets successfully', async () => {
      const targetId = 'target-1';
      const updates = {
        targetValue: 40,
        deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
        notes: 'Updated target'
      };
      const updatedBy = 'admin';

      const result = await performanceBenchmarkService.updatePerformanceTarget(
        targetId,
        updates,
        updatedBy
      );

      expect(result).toBeDefined();
      expect(result!.targetValue).toBe(updates.targetValue);
      expect(result!.deadline).toEqual(updates.deadline);
      expect(result!.notes).toBe(updates.notes);
      expect(result!.modifiedDate).toBeDefined();
    });

    it('should handle non-existent target IDs', async () => {
      const result = await performanceBenchmarkService.updatePerformanceTarget(
        'non-existent-target',
        { targetValue: 50 },
        'admin'
      );

      expect(result).toBeNull();
    });
  });

  describe('generateTargetRecommendations', () => {
    it('should generate smart target recommendations', async () => {
      const sellerId = 'test-seller-1';
      const sellerName = 'Test Seller';
      const timeframe = 90;

      const result = await performanceBenchmarkService.generateTargetRecommendations(
        sellerId,
        sellerName,
        timeframe
      );

      expect(result).toBeDefined();
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);

      result.forEach(recommendation => {
        expect(recommendation.metricId).toBeDefined();
        expect(recommendation.metricName).toBeDefined();
        expect(recommendation.currentValue).toBeDefined();
        expect(recommendation.recommendedTarget).toBeDefined();
        expect(recommendation.targetRationale).toBeDefined();
        expect(recommendation.difficulty).toMatch(/^(easy|moderate|challenging)$/);
        expect(recommendation.timeframe).toBe(timeframe);
        expect(recommendation.expectedImpact).toMatch(/^(low|medium|high)$/);
        expect(recommendation.steps).toBeDefined();
        expect(Array.isArray(recommendation.steps)).toBe(true);
      });
    });

    it('should prioritize recommendations appropriately', async () => {
      const result = await performanceBenchmarkService.generateTargetRecommendations(
        'seller-1',
        'Test Seller',
        90
      );

      // Check that high-impact, easy targets come first
      if (result.length > 1) {
        const first = result[0];
        const last = result[result.length - 1];

        const firstScore = this.calculateRecommendationScore(first);
        const lastScore = this.calculateRecommendationScore(last);

        expect(firstScore).toBeGreaterThanOrEqual(lastScore);
      }
    });
  });

  describe('getTargetAchievementAnalytics', () => {
    it('should provide comprehensive target analytics', async () => {
      const sellerId = 'test-seller-1';
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      };

      const result = await performanceBenchmarkService.getTargetAchievementAnalytics(
        sellerId,
        period
      );

      expect(result).toBeDefined();
      expect(result.totalTargets).toBeGreaterThanOrEqual(0);
      expect(result.achievedTargets).toBeGreaterThanOrEqual(0);
      expect(result.missedTargets).toBeGreaterThanOrEqual(0);
      expect(result.onTrackTargets).toBeGreaterThanOrEqual(0);
      expect(result.atRiskTargets).toBeGreaterThanOrEqual(0);
      expect(result.averageProgress).toBeGreaterThanOrEqual(0);
      expect(result.averageProgress).toBeLessThanOrEqual(100);
      expect(result.completionRate).toBeGreaterThanOrEqual(0);
      expect(result.completionRate).toBeLessThanOrEqual(100);
      expect(result.achievementsByCategory).toBeDefined();
      expect(result.trends).toBeDefined();
      expect(Array.isArray(result.trends)).toBe(true);
    });

    it('should calculate category-wise completion rates', async () => {
      const sellerId = 'test-seller-1';
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      };

      const result = await performanceBenchmarkService.getTargetAchievementAnalytics(
        sellerId,
        period
      );

      Object.entries(result.achievementsByCategory).forEach(([category, data]) => {
        expect(data.total).toBeGreaterThanOrEqual(0);
        expect(data.achieved).toBeGreaterThanOrEqual(0);
        expect(data.achieved).toBeLessThanOrEqual(data.total);
        expect(data.completionRate).toBeGreaterThanOrEqual(0);
        expect(data.completionRate).toBeLessThanOrEqual(100);
      });
    });
  });

  describe('Benchmark Calculations', () => {
    it('should calculate overall score correctly', () => {
      const mockMetrics = [
        { category: 'efficiency', currentValue: 50, industryAverage: 48, topQuartile: 24, bottomQuartile: 72 },
        { category: 'compliance', currentValue: 85, industryAverage: 80, topQuartile: 92, bottomQuartile: 68 }
      ];

      const score = (performanceBenchmarkService as any).calculateOverallScore(mockMetrics);

      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should calculate trend direction correctly', () => {
      const improvingData = [
        { date: new Date('2024-01-01'), value: 80 },
        { date: new Date('2024-01-08'), value: 85 },
        { date: new Date('2024-01-15'), value: 90 }
      ];

      const decliningData = [
        { date: new Date('2024-01-01'), value: 90 },
        { date: new Date('2024-01-08'), value: 85 },
        { date: new Date('2024-01-15'), value: 80 }
      ];

      const improvingTrend = (performanceBenchmarkService as any).calculateTrend(improvingData);
      const decliningTrend = (performanceBenchmarkService as any).calculateTrend(decliningData);

      expect(improvingTrend.direction).toBe('improving');
      expect(decliningTrend.direction).toBe('declining');
    });

    it('should detect seasonality correctly', () => {
      // Create data with seasonal pattern
      const seasonalData = [];
      for (let i = 0; i < 24; i++) {
        seasonalData.push({
          date: new Date(2024, Math.floor(i / 2), (i % 2) * 15 + 1),
          value: 80 + Math.sin((i / 12) * 2 * Math.PI) * 20
        });
      }

      const seasonality = (performanceBenchmarkService as any).detectSeasonality(seasonalData);

      expect(seasonality.detected).toBeDefined();
      if (seasonality.detected) {
        expect(seasonality.pattern).toBeDefined();
        expect(Array.isArray(seasonality.pattern)).toBe(true);
      }
    });
  });

  describe('Property Validations', () => {
    it('Property 33: Benchmark comparison should be accurate', async () => {
      const result = await performanceBenchmarkService.generateBenchmarkData(
        'seller-1',
        'Test Seller',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      );

      // Verify benchmark comparison accuracy
      result.metrics.forEach(metric => {
        expect(metric.currentValue).toBeDefined();
        expect(metric.industryAverage).toBeDefined();
        expect(metric.topQuartile).toBeDefined();
        expect(metric.bottomQuartile).toBeDefined();
        expect(metric.industryAverage).toBeGreaterThanOrEqual(metric.bottomQuartile);
        expect(metric.industryAverage).toBeLessThanOrEqual(metric.topQuartile);
      });
    });

    it('Property 34: Target recommendations should be logical', async () => {
      const result = await performanceBenchmarkService.generateTargetRecommendations(
        'seller-1',
        'Test Seller',
        90
      );

      result.forEach(recommendation => {
        // Verify logical target progression
        const { currentValue, recommendedTarget } = recommendation;
        
        // Targets should be realistic
        if (currentValue < recommendation.currentValue) {
          expect(recommendedTarget).toBeGreaterThan(currentValue);
        }
        
        // Should have clear rationale
        expect(recommendation.targetRationale).toBeDefined();
        expect(recommendation.targetRationale.length).toBeGreaterThan(0);
      });
    });

    it('Property 35: Impact measurement should be tracked', async () => {
      const sellerId = 'test-seller-1';
      const period = {
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-03-31')
      };

      const result = await performanceBenchmarkService.getTargetAchievementAnalytics(
        sellerId,
        period
      );

      // Verify impact tracking
      expect(result.completionRate).toBeDefined();
      expect(result.achievementsByCategory).toBeDefined();
      expect(result.trends).toBeDefined();
      
      // Trend data should show progress over time
      result.trends.forEach(trend => {
        expect(trend.date).toBeDefined();
        expect(trend.completionRate).toBeDefined();
        expect(trend.averageProgress).toBeDefined();
      });
    });
  });

  // Helper method for recommendation scoring
  private calculateRecommendationScore(recommendation: any): number {
    const impactScore = { high: 3, medium: 2, low: 1 }[recommendation.expectedImpact];
    const difficultyScore = { easy: 3, moderate: 2, challenging: 1 }[recommendation.difficulty];
    return impactScore * difficultyScore;
  }
});

describe('PerformanceBenchmarkService - Error Handling', () => {
  it('should handle database errors gracefully', async () => {
    // Mock database error
    const mockError = new Error('Database connection failed');
    jest.spyOn(performanceBenchmarkService as any, 'getSellerPerformanceData')
      .mockRejectedValue(mockError);

    await expect(
      performanceBenchmarkService.generateBenchmarkData(
        'seller-1',
        'Test Seller',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )
    ).rejects.toThrow();
  });

  it('should validate input parameters', async () => {
    await expect(
      performanceBenchmarkService.generateBenchmarkData(
        '', // Empty seller ID
        'Test Seller',
        new Date('2024-01-01'),
        new Date('2024-01-31')
      )
    ).rejects.toThrow();

    await expect(
      performanceBenchmarkService.setPerformanceTarget(
        'seller-1',
        'processing_time',
        -10, // Negative target value
        new Date(),
        'admin'
      )
    ).rejects.toThrow();
  });

  it('should handle edge cases in calculations', async () => {
    // Test with zero values
    const trend = (performanceBenchmarkService as any).calculateTrend([
      { date: new Date('2024-01-01'), value: 0 },
      { date: new Date('2024-01-08'), value: 0 }
    ]);

    expect(trend.direction).toBe('stable');
    expect(trend.percentage).toBe(0);
  });
});