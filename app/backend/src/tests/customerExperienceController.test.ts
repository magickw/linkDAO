import { Request, Response } from 'express';
import { customerExperienceController } from '../controllers/customerExperienceController';
import { customerExperienceService } from '../services/customerExperienceService';

// Mock the service
jest.mock('../services/customerExperienceService');

// Mock response object
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res as Response;
};

describe('CustomerExperienceController', () => {
  let mockReq: Partial<Request>;
  let mockRes: Response;

  beforeEach(() => {
    mockReq = {};
    mockRes = mockResponse();
    jest.clearAllMocks();
  });

  describe('getSatisfactionMetrics', () => {
    it('should return satisfaction metrics', async () => {
      const mockMetrics = {
        overallSatisfaction: 0.85,
        responseRate: 0.75,
        totalSurveys: 100,
        satisfactionTrend: 0.1,
        categoryBreakdown: []
      };

      (customerExperienceService.getSatisfactionMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      mockReq.query = {};
      await customerExperienceController.getSatisfactionMetrics(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockMetrics,
        timestamp: expect.any(String)
      });
    });

    it('should handle service errors', async () => {
      (customerExperienceService.getSatisfactionMetrics as jest.Mock).mockRejectedValue(new Error('Service error'));

      mockReq.query = {};
      await customerExperienceController.getSatisfactionMetrics(mockReq as Request, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Failed to retrieve satisfaction metrics',
        message: 'Service error'
      });
    });
  });

  describe('analyzeFeedback', () => {
    it('should analyze feedback and return themes', async () => {
      const mockThemes = [
        {
          theme: 'Delivery Speed',
          sentiment: 'positive',
          frequency: 15,
          examples: ['Slow delivery'],
          impact: 0.3
        }
      ];

      (customerExperienceService.analyzeFeedback as jest.Mock).mockResolvedValue(mockThemes);

      mockReq.body = {
        feedbackTexts: ['Slow delivery']
      };

      await customerExperienceController.analyzeFeedback(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockThemes,
        timestamp: expect.any(String)
      });
    });

    it('should handle validation errors', async () => {
      mockReq.body = {
        feedbackTexts: [] // Empty array should fail validation
      };

      await customerExperienceController.analyzeFeedback(mockReq as Request, mockRes);

      expect(mockRes.status).toHaveBeenCalledWith(400);
    });
  });

  describe('getExperienceScore', () => {
    it('should return experience score', async () => {
      const mockScore = {
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

      (customerExperienceService.calculateExperienceScore as jest.Mock).mockResolvedValue(mockScore);

      mockReq.query = {};
      await customerExperienceController.getExperienceScore(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockScore,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getIssueCorrelations', () => {
    it('should return issue correlations', async () => {
      const mockCorrelations = [
        {
          issueType: 'processEfficiency',
          frequency: 100,
          satisfactionImpact: -0.3,
          resolutionRate: 0.75,
          commonContexts: ['Streamline workflow']
        }
      ];

      (customerExperienceService.identifyIssueCorrelations as jest.Mock).mockResolvedValue(mockCorrelations);

      mockReq.query = {};
      await customerExperienceController.getIssueCorrelations(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockCorrelations,
        timestamp: expect.any(String)
      });
    });
  });

  describe('generateExperienceReport', () => {
    it('should generate experience report', async () => {
      const mockReport = {
        period: {
          start: new Date(),
          end: new Date()
        },
        satisfaction: {
          overallSatisfaction: 0.85,
          responseRate: 0.75,
          totalSurveys: 100,
          satisfactionTrend: 0.1,
          categoryBreakdown: []
        },
        experienceScore: {
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
        },
        issueCorrelations: [],
        improvementRecommendations: []
      };

      (customerExperienceService.generateExperienceReport as jest.Mock).mockResolvedValue(mockReport);

      mockReq.query = {};
      await customerExperienceController.generateExperienceReport(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockReport,
        timestamp: expect.any(String)
      });
    });
  });

  describe('getImprovementRecommendations', () => {
    it('should return improvement recommendations', async () => {
      const mockRecommendations = [
        {
          area: 'Overall Satisfaction',
          currentScore: 0.85,
          targetScore: 0.95,
          priority: 'high',
          actions: ['Improve customer support']
        }
      ];

      const mockReport = {
        period: {
          start: new Date(),
          end: new Date()
        },
        satisfaction: {} as any,
        experienceScore: {} as any,
        issueCorrelations: [],
        improvementRecommendations: mockRecommendations
      };

      (customerExperienceService.generateExperienceReport as jest.Mock).mockResolvedValue(mockReport);

      mockReq.query = {};
      await customerExperienceController.getImprovementRecommendations(mockReq as Request, mockRes);

      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockRecommendations,
        timestamp: expect.any(String)
      });
    });
  });
});