import { ReviewService } from '../services/reviewService';
import { ReputationService } from '../services/reputationService';

// Mock the services
jest.mock('../services/databaseService', () => ({
  DatabaseService: jest.fn().mockImplementation(() => ({
    db: {
      select: jest.fn().mockReturnThis(),
      from: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      insert: jest.fn().mockReturnThis(),
      values: jest.fn().mockReturnThis(),
      returning: jest.fn(),
      update: jest.fn().mockReturnThis(),
      set: jest.fn().mockReturnThis(),
      leftJoin: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      offset: jest.fn().mockReturnThis(),
      groupBy: jest.fn().mockReturnThis()
    }
  }))
}));

jest.mock('../services/reputationService', () => ({
  ReputationService: jest.fn().mockImplementation(() => ({
    getUserReputation: jest.fn(),
    updateUserReputation: jest.fn()
  }))
}));

describe('ReviewService', () => {
  let reviewService: ReviewService;
  let mockDb: any;

  beforeEach(() => {
    reviewService = new ReviewService();
    // Access the mocked db through the service's private property
    mockDb = (reviewService as any).databaseService.db;
    
    // Reset all mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submitReview', () => {
    const mockReviewData = {
      reviewerId: 'reviewer-123',
      revieweeId: 'reviewee-456',
      orderId: 1,
      rating: 5,
      title: 'Great product!',
      comment: 'Excellent quality and fast shipping.'
    };

    it('should successfully submit a review for verified purchase', async () => {
      // Mock verified purchase check
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, buyerId: 'reviewer-123', sellerId: 'reviewee-456', status: 'completed' }
      ]);

      // Mock no existing review
      mockDb.select().from().where().limit.mockResolvedValueOnce([]);

      // Mock order data
      mockDb.select().from().where().limit.mockResolvedValueOnce([
        { listingId: 1 }
      ]);

      // Mock review creation
      const mockCreatedReview = {
        id: 1,
        ...mockReviewData,
        listingId: 1,
        verificationStatus: 'verified',
        helpfulVotes: 0,
        reportCount: 0,
        moderationStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      mockDb.insert().values().returning.mockResolvedValueOnce([mockCreatedReview]);

      const result = await reviewService.submitReview(mockReviewData);

      expect(result).toBeDefined();
      expect(result.rating).toBe(5);
      expect(result.verificationStatus).toBe('verified');
      expect(mockDb.insert).toHaveBeenCalled();
    });

    it('should reject review for unverified purchase', async () => {
      // Mock no verified purchase
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([]);

      await expect(reviewService.submitReview(mockReviewData))
        .rejects.toThrow('Review can only be submitted for verified purchases');
    });

    it('should reject duplicate review for same order', async () => {
      // Mock verified purchase
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, buyerId: 'reviewer-123', sellerId: 'reviewee-456', status: 'completed' }
      ]);

      // Mock existing review
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, reviewerId: 'reviewer-123', orderId: 1 }
      ]);

      await expect(reviewService.submitReview(mockReviewData))
        .rejects.toThrow('Review already exists for this order');
    });

    it('should reject invalid rating', async () => {
      const invalidReviewData = { ...mockReviewData, rating: 6 };

      // Mock verified purchase
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, buyerId: 'reviewer-123', sellerId: 'reviewee-456', status: 'completed' }
      ]);

      // Mock no existing review
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([]);

      await expect(reviewService.submitReview(invalidReviewData))
        .rejects.toThrow('Rating must be between 1 and 5');
    });
  });

  describe('getReviewsForUser', () => {
    it('should return reviews with pagination and stats', async () => {
      const userId = 'user-123';
      const mockReviews = [
        {
          review: {
            id: 1,
            reviewerId: 'reviewer-1',
            revieweeId: userId,
            orderId: 1,
            rating: 5,
            title: 'Great!',
            comment: 'Excellent',
            verificationStatus: 'verified',
            helpfulVotes: 3,
            reportCount: 0,
            moderationStatus: 'active',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
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
      ];

      // Mock reviews query
      mockDatabaseService.db.select().from().leftJoin().where().orderBy().limit().offset.mockResolvedValueOnce(mockReviews);

      // Mock count query
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]);

      // Mock stats queries
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([
        { totalReviews: 1, averageRating: 5 }
      ]);
      mockDatabaseService.db.select().from().where().groupBy.mockResolvedValueOnce([
        { rating: 5, count: 1 }
      ]);
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]);
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]);

      const result = await reviewService.getReviewsForUser(userId);

      expect(result.reviews).toHaveLength(1);
      expect(result.reviews[0].rating).toBe(5);
      expect(result.stats.totalReviews).toBe(1);
      expect(result.stats.averageRating).toBe(5);
      expect(result.pagination.total).toBe(1);
    });

    it('should apply filters correctly', async () => {
      const userId = 'user-123';
      const filters = {
        rating: 5,
        verifiedOnly: true,
        sortBy: 'rating_high' as const,
        limit: 10,
        offset: 0
      };

      // Mock empty results for simplicity
      mockDatabaseService.db.select().from().leftJoin().where().orderBy().limit().offset.mockResolvedValueOnce([]);
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 0 }]);

      // Mock stats
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([
        { totalReviews: 0, averageRating: 0 }
      ]);
      mockDatabaseService.db.select().from().where().groupBy.mockResolvedValueOnce([]);
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 0 }]);
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 0 }]);

      const result = await reviewService.getReviewsForUser(userId, filters);

      expect(result.reviews).toHaveLength(0);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.offset).toBe(0);
    });
  });

  describe('markReviewHelpful', () => {
    it('should create new helpfulness vote', async () => {
      const reviewId = 1;
      const userId = 'user-123';
      const isHelpful = true;

      // Mock no existing vote
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([]);

      // Mock insert
      mockDatabaseService.db.insert().values.mockResolvedValueOnce(undefined);

      // Mock update helpful count
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 1 }]);
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      await reviewService.markReviewHelpful(reviewId, userId, isHelpful);

      expect(mockDatabaseService.db.insert).toHaveBeenCalled();
      expect(mockDatabaseService.db.update).toHaveBeenCalled();
    });

    it('should update existing helpfulness vote', async () => {
      const reviewId = 1;
      const userId = 'user-123';
      const isHelpful = false;

      // Mock existing vote
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, reviewId, userId, isHelpful: true }
      ]);

      // Mock update
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      // Mock update helpful count
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 0 }]);
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      await reviewService.markReviewHelpful(reviewId, userId, isHelpful);

      expect(mockDatabaseService.db.update).toHaveBeenCalledTimes(2); // Once for vote, once for count
    });
  });

  describe('reportReview', () => {
    it('should create review report', async () => {
      const reviewId = 1;
      const reporterId = 'reporter-123';
      const reason = 'spam';
      const description = 'This is clearly spam';

      // Mock no existing report
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([]);

      // Mock insert report
      mockDatabaseService.db.insert().values.mockResolvedValueOnce(undefined);

      // Mock update report count
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      // Mock check report count (below threshold)
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { reportCount: 2 }
      ]);

      await reviewService.reportReview(reviewId, reporterId, reason, description);

      expect(mockDatabaseService.db.insert).toHaveBeenCalled();
      expect(mockDatabaseService.db.update).toHaveBeenCalled();
    });

    it('should reject duplicate report from same user', async () => {
      const reviewId = 1;
      const reporterId = 'reporter-123';
      const reason = 'spam';

      // Mock existing report
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { id: 1, reviewId, reporterId }
      ]);

      await expect(reviewService.reportReview(reviewId, reporterId, reason))
        .rejects.toThrow('You have already reported this review');
    });

    it('should auto-flag review with too many reports', async () => {
      const reviewId = 1;
      const reporterId = 'reporter-123';
      const reason = 'spam';

      // Mock no existing report
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([]);

      // Mock insert report
      mockDatabaseService.db.insert().values.mockResolvedValueOnce(undefined);

      // Mock update report count
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      // Mock check report count (above threshold)
      mockDatabaseService.db.select().from().where().limit.mockResolvedValueOnce([
        { reportCount: 5 }
      ]);

      // Mock flag review
      mockDatabaseService.db.update().set().where.mockResolvedValueOnce(undefined);

      await reviewService.reportReview(reviewId, reporterId, reason);

      expect(mockDatabaseService.db.update).toHaveBeenCalledTimes(2); // Report count + flag
    });
  });

  describe('detectFakeReviews', () => {
    it('should detect suspicious review patterns', async () => {
      const userId = 'user-123';
      
      // Mock reviews with suspicious patterns
      const mockReviews = [
        // Too many 5-star reviews in short period
        ...Array(12).fill(null).map((_, i) => ({
          id: i + 1,
          revieweeId: userId,
          rating: 5,
          comment: 'Great product!',
          createdAt: new Date().toISOString() // Recent date
        }))
      ];

      mockDatabaseService.db.select().from().where.mockResolvedValueOnce(mockReviews);

      const result = await reviewService.detectFakeReviews(userId);

      expect(result.riskScore).toBeGreaterThan(0);
      expect(result.reasons).toContain('Unusually high number of 5-star reviews in recent period');
      expect(result.suspiciousReviews.length).toBeGreaterThan(0);
    });

    it('should return low risk for normal review patterns', async () => {
      const userId = 'user-123';
      
      // Mock normal review distribution
      const mockReviews = [
        { id: 1, revieweeId: userId, rating: 4, comment: 'Good', createdAt: '2024-01-01' },
        { id: 2, revieweeId: userId, rating: 5, comment: 'Great', createdAt: '2024-01-15' },
        { id: 3, revieweeId: userId, rating: 3, comment: 'OK', createdAt: '2024-02-01' }
      ];

      mockDatabaseService.db.select().from().where.mockResolvedValueOnce(mockReviews);

      const result = await reviewService.detectFakeReviews(userId);

      expect(result.riskScore).toBe(0);
      expect(result.reasons).toHaveLength(0);
      expect(result.suspiciousReviews).toHaveLength(0);
    });
  });

  describe('getReviewStats', () => {
    it('should calculate review statistics correctly', async () => {
      const userId = 'user-123';

      // Mock basic stats
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([
        { totalReviews: 10, averageRating: 4.2 }
      ]);

      // Mock rating distribution
      mockDatabaseService.db.select().from().where().groupBy.mockResolvedValueOnce([
        { rating: 5, count: 4 },
        { rating: 4, count: 3 },
        { rating: 3, count: 2 },
        { rating: 2, count: 1 },
        { rating: 1, count: 0 }
      ]);

      // Mock verified count
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 8 }]);

      // Mock recent count
      mockDatabaseService.db.select().from().where.mockResolvedValueOnce([{ count: 3 }]);

      const stats = await reviewService.getReviewStats(userId);

      expect(stats.totalReviews).toBe(10);
      expect(stats.averageRating).toBe(4.2);
      expect(stats.ratingDistribution[5]).toBe(4);
      expect(stats.ratingDistribution[4]).toBe(3);
      expect(stats.verifiedReviewsCount).toBe(8);
      expect(stats.recentReviewsCount).toBe(3);
    });
  });
});
