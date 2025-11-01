import request from 'supertest';
import express from 'express';
import reviewRoutes from '../routes/reviewRoutes';
import { ReviewService } from '../services/reviewService';
import { ReputationService } from '../services/reputationService';

// Mock services
jest.mock('../services/reviewService');
jest.mock('../services/reputationService');
jest.mock('../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user-123', walletAddress: '0x123' };
    next();
  }
}));

describe('Review Controller Integration Tests', () => {
  let app: express.Application;
  let mockReviewService: jest.Mocked<ReviewService>;
  let mockReputationService: jest.Mocked<ReputationService>;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api', reviewRoutes);

    mockReviewService = new ReviewService() as jest.Mocked<ReviewService>;
    mockReputationService = new ReputationService() as jest.Mocked<ReputationService>;

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('POST /api/reviews', () => {
    const validReviewData = {
      reviewerId: 'reviewer-123',
      revieweeId: 'reviewee-456',
      orderId: 1,
      rating: 5,
      title: 'Great product!',
      comment: 'Excellent quality and fast shipping.'
    };

    it('should successfully submit a valid review', async () => {
      const mockReview = {
        id: 1,
        ...validReviewData,
        verificationStatus: 'verified' as const,
        helpfulVotes: 0,
        reportCount: 0,
        moderationStatus: 'active' as const,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockReviewService.submitReview = jest.fn().mockResolvedValue(mockReview);

      const response = await request(app)
        .post('/api/reviews')
        .send(validReviewData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.rating).toBe(5);
      expect(mockReviewService.submitReview).toHaveBeenCalledWith(validReviewData);
    });

    it('should return 400 for invalid review data', async () => {
      const invalidReviewData = {
        ...validReviewData,
        rating: 6 // Invalid rating
      };

      const response = await request(app)
        .post('/api/reviews')
        .send(invalidReviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Validation failed');
    });

    it('should return 400 when review submission fails', async () => {
      mockReviewService.submitReview = jest.fn().mockRejectedValue(
        new Error('Review can only be submitted for verified purchases')
      );

      const response = await request(app)
        .post('/api/reviews')
        .send(validReviewData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Review can only be submitted for verified purchases');
    });
  });

  describe('GET /api/users/:userId/reviews', () => {
    it('should return reviews for a user', async () => {
      const userId = 'user-123';
      const mockResult = {
        reviews: [
          {
            id: 1,
            reviewerId: 'reviewer-1',
            revieweeId: userId,
            orderId: 1,
            rating: 5,
            title: 'Great!',
            comment: 'Excellent',
            verificationStatus: 'verified' as const,
            helpfulVotes: 3,
            reportCount: 0,
            moderationStatus: 'active' as const,
            createdAt: new Date(),
            updatedAt: new Date(),
            reviewer: {
              id: 'reviewer-1',
              walletAddress: '0x123',
              handle: 'reviewer1'
            },
            reviewee: {
              id: userId,
              walletAddress: '0x456',
              handle: 'user123'
            }
          }
        ],
        stats: {
          totalReviews: 1,
          averageRating: 5,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 1 },
          verifiedReviewsCount: 1,
          recentReviewsCount: 1
        },
        pagination: {
          total: 1,
          limit: 20,
          offset: 0
        }
      };

      mockReviewService.getReviewsForUser = jest.fn().mockResolvedValue(mockResult);

      const response = await request(app)
        .get(`/api/users/${userId}/reviews`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.reviews).toHaveLength(1);
      expect(response.body.data.stats.totalReviews).toBe(1);
    });

    it('should apply query filters', async () => {
      const userId = 'user-123';
      const mockResult = {
        reviews: [],
        stats: {
          totalReviews: 0,
          averageRating: 0,
          ratingDistribution: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
          verifiedReviewsCount: 0,
          recentReviewsCount: 0
        },
        pagination: { total: 0, limit: 10, offset: 0 }
      };

      mockReviewService.getReviewsForUser = jest.fn().mockResolvedValue(mockResult);

      await request(app)
        .get(`/api/users/${userId}/reviews`)
        .query({
          rating: '5',
          verifiedOnly: 'true',
          sortBy: 'rating_high',
          limit: '10',
          offset: '0'
        })
        .expect(200);

      expect(mockReviewService.getReviewsForUser).toHaveBeenCalledWith(userId, {
        rating: 5,
        verifiedOnly: true,
        sortBy: 'rating_high',
        limit: 10,
        offset: 0
      });
    });
  });

  describe('GET /api/users/:userId/reviews/stats', () => {
    it('should return review statistics', async () => {
      const userId = 'user-123';
      const mockStats = {
        totalReviews: 25,
        averageRating: 4.2,
        ratingDistribution: { 1: 1, 2: 2, 3: 5, 4: 8, 5: 9 },
        verifiedReviewsCount: 20,
        recentReviewsCount: 5
      };

      mockReviewService.getReviewStats = jest.fn().mockResolvedValue(mockStats);

      const response = await request(app)
        .get(`/api/users/${userId}/reviews/stats`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalReviews).toBe(25);
      expect(response.body.data.averageRating).toBe(4.2);
    });
  });

  describe('POST /api/reviews/:reviewId/helpful', () => {
    it('should mark review as helpful', async () => {
      const reviewId = '1';
      const requestData = {
        userId: 'user-123',
        isHelpful: true
      };

      mockReviewService.markReviewHelpful = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review helpfulness updated');
      expect(mockReviewService.markReviewHelpful).toHaveBeenCalledWith(1, 'user-123', true);
    });

    it('should return 400 for missing required fields', async () => {
      const reviewId = '1';
      const requestData = {
        userId: 'user-123'
        // Missing isHelpful
      };

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/helpful`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('userId and isHelpful are required');
    });
  });

  describe('POST /api/reviews/:reviewId/report', () => {
    it('should report a review', async () => {
      const reviewId = '1';
      const requestData = {
        reporterId: 'reporter-123',
        reason: 'spam',
        description: 'This is clearly spam'
      };

      mockReviewService.reportReview = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/report`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review reported successfully');
      expect(mockReviewService.reportReview).toHaveBeenCalledWith(
        1, 'reporter-123', 'spam', 'This is clearly spam'
      );
    });

    it('should return 400 for missing required fields', async () => {
      const reviewId = '1';
      const requestData = {
        reporterId: 'reporter-123'
        // Missing reason
      };

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/report`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('reporterId and reason are required');
    });

    it('should handle duplicate report error', async () => {
      const reviewId = '1';
      const requestData = {
        reporterId: 'reporter-123',
        reason: 'spam'
      };

      mockReviewService.reportReview = jest.fn().mockRejectedValue(
        new Error('You have already reported this review')
      );

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/report`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('You have already reported this review');
    });
  });

  describe('GET /api/sellers/rankings', () => {
    it('should return seller rankings', async () => {
      const mockRankings = [
        {
          userId: 'user-1',
          walletAddress: '0x123',
          handle: 'seller1',
          reputationScore: 900,
          tier: 'Master',
          reviewStats: {
            averageRating: 4.8,
            totalReviews: 50,
            verifiedReviewsRatio: 0.9
          },
          rank: 1
        },
        {
          userId: 'user-2',
          walletAddress: '0x456',
          handle: 'seller2',
          reputationScore: 850,
          tier: 'Expert',
          reviewStats: {
            averageRating: 4.5,
            totalReviews: 30,
            verifiedReviewsRatio: 0.85
          },
          rank: 2
        }
      ];

      mockReputationService.getSellerRankings = jest.fn().mockResolvedValue(mockRankings);

      const response = await request(app)
        .get('/api/sellers/rankings')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].rank).toBe(1);
      expect(response.body.data[1].rank).toBe(2);
    });

    it('should apply limit parameter', async () => {
      mockReputationService.getSellerRankings = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/sellers/rankings')
        .query({ limit: '25' })
        .expect(200);

      expect(mockReputationService.getSellerRankings).toHaveBeenCalledWith(25, undefined);
    });
  });

  describe('GET /api/users/:userId/reputation', () => {
    it('should return user reputation', async () => {
      const userId = 'user-123';
      const mockReputation = {
        walletAddress: '0x123',
        totalScore: 850,
        tier: 'Expert',
        factors: {
          daoProposalSuccessRate: 80,
          votingParticipation: 85,
          investmentAdviceAccuracy: 75,
          communityContribution: 70,
          onchainActivity: 90
        },
        lastUpdated: new Date()
      };

      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(mockReputation);

      const response = await request(app)
        .get(`/api/users/${userId}/reputation`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.totalScore).toBe(850);
      expect(response.body.data.tier).toBe('Expert');
    });

    it('should return 404 for user with no reputation', async () => {
      const userId = 'user-no-reputation';

      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get(`/api/users/${userId}/reputation`)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User reputation not found');
    });
  });

  describe('GET /api/users/:userId/reviews/fake-detection', () => {
    it('should detect fake reviews', async () => {
      const userId = 'user-123';
      const mockDetection = {
        suspiciousReviews: [1, 2, 3],
        riskScore: 75,
        reasons: [
          'Unusually high number of 5-star reviews in recent period',
          'Unusual rating distribution with too many extreme ratings'
        ]
      };

      mockReviewService.detectFakeReviews = jest.fn().mockResolvedValue(mockDetection);

      const response = await request(app)
        .get(`/api/users/${userId}/reviews/fake-detection`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskScore).toBe(75);
      expect(response.body.data.suspiciousReviews).toHaveLength(3);
      expect(response.body.data.reasons).toHaveLength(2);
    });
  });

  describe('POST /api/reviews/:reviewId/flag', () => {
    it('should flag a review', async () => {
      const reviewId = '1';
      const requestData = {
        reason: 'Inappropriate content'
      };

      mockReviewService.flagReview = jest.fn().mockResolvedValue(undefined);

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/flag`)
        .send(requestData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe('Review flagged successfully');
      expect(mockReviewService.flagReview).toHaveBeenCalledWith(1, 'Inappropriate content');
    });

    it('should return 400 for missing reason', async () => {
      const reviewId = '1';
      const requestData = {};

      const response = await request(app)
        .post(`/api/reviews/${reviewId}/flag`)
        .send(requestData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Reason is required');
    });
  });
});
