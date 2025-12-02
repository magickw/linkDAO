import { CustomerExperienceService, customerExperienceService } from '../services/customerExperienceService';
import { satisfactionTrackingService } from '../services/satisfactionTrackingService';
import { analyticsService } from '../services/analyticsService';

// Mock the dependencies
jest.mock('../services/satisfactionTrackingService');
jest.mock('../services/analyticsService');
jest.mock('../utils/safeLogger', () => ({
  safeLogger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn()
  }
}));

describe('CustomerExperienceService', () => {
  let service: CustomerExperienceService;

  beforeEach(() => {
    service = new CustomerExperienceService();
    jest.clearAllMocks();
  });

  describe('getSatisfactionMetrics', () => {
    it('should return satisfaction metrics', async () => {
      const mockAnalytics = {
        averageOverallSatisfaction: 0.85,
        responseRate: 0.75,
        totalSurveys: 100,
        categoryBreakdown: [
          {
            category: 'Product Quality',
            averageSatisfaction: 0.9,
            sampleSize: 50,
            trends: [0.8, 0.85, 0.9]
          }
        ]
      };

      (satisfactionTrackingService.getSatisfactionAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await service.getSatisfactionMetrics();

      expect(result).toEqual({
        overallSatisfaction: 0.85,
        responseRate: 0.75,
        totalSurveys: 100,
        satisfactionTrend: 0.1,
        categoryBreakdown: [
          {
            category: 'Product Quality',
            satisfaction: 0.9,
            volume: 50,
            trend: 0.1
          }
        ]
      });
    });

    it('should handle errors gracefully', async () => {
      (satisfactionTrackingService.getSatisfactionAnalytics as jest.Mock).mockRejectedValue(new Error('Test error'));

      await expect(service.getSatisfactionMetrics()).rejects.toThrow('Failed to retrieve customer satisfaction metrics');
    });
  });

  describe('analyzeFeedback', () => {
    it('should analyze feedback and return themes', async () => {
      const mockFeedbackAnalysis = {
        themes: [
          {
            theme: 'Delivery Speed',
            sentiment: 0.3,
            frequency: 15,
            examples: ['Slow delivery', 'Took too long'],
            suggestedActions: ['Improve logistics']
          }
        ]
      };

      (satisfactionTrackingService.analyzeFeedback as jest.Mock).mockResolvedValue(mockFeedbackAnalysis);

      const result = await service.analyzeFeedback(['Slow delivery', 'Took too long']);

      expect(result).toEqual([
        {
          theme: 'Delivery Speed',
          sentiment: 'positive',
          frequency: 15,
          examples: ['Slow delivery', 'Took too long'],
          impact: 0.3
        }
      ]);
    });

    it('should handle negative sentiment', async () => {
      const mockFeedbackAnalysis = {
        themes: [
          {
            theme: 'Poor Support',
            sentiment: -0.5,
            frequency: 10,
            examples: ['Bad support', 'Unhelpful agents'],
            suggestedActions: ['Train staff']
          }
        ]
      };

      (satisfactionTrackingService.analyzeFeedback as jest.Mock).mockResolvedValue(mockFeedbackAnalysis);

      const result = await service.analyzeFeedback(['Bad support', 'Unhelpful agents']);

      expect(result[0].sentiment).toBe('negative');
    });

    it('should handle neutral sentiment', async () => {
      const mockFeedbackAnalysis = {
        themes: [
          {
            theme: 'Average Experience',
            sentiment: 0.05,
            frequency: 5,
            examples: ['It was okay'],
            suggestedActions: ['Maintain standards']
          }
        ]
      };

      (satisfactionTrackingService.analyzeFeedback as jest.Mock).mockResolvedValue(mockFeedbackAnalysis);

      const result = await service.analyzeFeedback(['It was okay']);

      expect(result[0].sentiment).toBe('neutral');
    });
  });

  describe('calculateExperienceScore', () => {
    it('should calculate experience score based on components', async () => {
      const mockSatisfactionAnalytics = {
        averageOverallSatisfaction: 0.8,
        benchmarkComparison: {
          industryAverage: 0.75,
          topPerformerAverage: 0.9,
          percentileRank: 75
        }
      };

      const mockOverviewMetrics = {
        conversionRate: 3.5,
        averageOrderValue: 100,
        totalRevenue: 10000
      };

      (satisfactionTrackingService.getSatisfactionAnalytics as jest.Mock).mockResolvedValue(mockSatisfactionAnalytics);
      (analyticsService.getOverviewMetrics as jest.Mock).mockResolvedValue(mockOverviewMetrics);

      const result = await service.calculateExperienceScore();

      expect(result.score).toBeGreaterThan(0);
      expect(result.components.satisfaction).toBe(0.8);
      expect(result.benchmarks.industryAverage).toBe(0.75);
    });
  });

  describe('identifyIssueCorrelations', () => {
    it('should identify issue correlations', async () => {
      const mockAnalytics = {
        improvementOpportunities: [
          {
            area: 'processEfficiency',
            currentScore: 0.6,
            targetScore: 0.85,
            impact: 'high',
            effort: 'medium',
            priority: 1,
            recommendations: ['Streamline workflow']
          }
        ]
      };

      (satisfactionTrackingService.getSatisfactionAnalytics as jest.Mock).mockResolvedValue(mockAnalytics);

      const result = await service.identifyIssueCorrelations();

      expect(result).toHaveLength(1);
      expect(result[0].issueType).toBe('processEfficiency');
      expect(result[0].frequency).toBe(100);
    });
  });

  describe('generateExperienceReport', () => {
    it('should generate a comprehensive experience report', async () => {
      const mockSatisfaction = {
        overallSatisfaction: 0.85,
        responseRate: 0.75,
        totalSurveys: 100,
        satisfactionTrend: 0.1,
        categoryBreakdown: []
      };

      const mockExperienceScore = {
        score: 0.82,
        components: {
          satisfaction: 0.85,
          easeOfUse: 0.8,
          supportQuality: 0.75,
          valuePerception: 0.88
        },
        benchmarks: {
          industryAverage: 0.75,
          topPerformers: 0.9,
          ourPercentile: 75
        }
      };

      const mockIssueCorrelations = [
        {
          issueType: 'processEfficiency',
          frequency: 100,
          satisfactionImpact: -0.3,
          resolutionRate: 0.75,
          commonContexts: ['Streamline workflow']
        }
      ];

      jest.spyOn(service, 'getSatisfactionMetrics').mockResolvedValue(mockSatisfaction);
      jest.spyOn(service, 'calculateExperienceScore').mockResolvedValue(mockExperienceScore);
      jest.spyOn(service, 'identifyIssueCorrelations').mockResolvedValue(mockIssueCorrelations);

      const result = await service.generateExperienceReport();

      expect(result.satisfaction).toEqual(mockSatisfaction);
      expect(result.experienceScore).toEqual(mockExperienceScore);
      expect(result.issueCorrelations).toEqual(mockIssueCorrelations);
      expect(result.improvementRecommendations).toBeDefined();
    });
  });
});