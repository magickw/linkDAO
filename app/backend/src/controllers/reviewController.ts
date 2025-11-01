import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { ReviewService } from '../services/reviewService';
import { ReputationService } from '../services/reputationService';
import { validateReview } from '../models/validation';

export class ReviewController {
  private reviewService: ReviewService;
  private reputationService: ReputationService;

  constructor() {
    this.reviewService = new ReviewService();
    this.reputationService = new ReputationService();
  }

  /**
   * Submit a new review
   */
  async submitReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewerId, revieweeId, orderId, rating, title, comment } = req.body;

      // Validate input
      const validatedData = validateReview({
        reviewerId,
        revieweeId,
        orderId,
        rating,
        title,
        comment
      });

      // Submit review
      const review = await this.reviewService.submitReview(validatedData);

      res.status(201).json({
        success: true,
        data: review
      });
    } catch (error: any) {
      safeLogger.error('Error submitting review:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to submit review'
      });
    }
  }

  /**
   * Get reviews for a user
   */
  async getReviewsForUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        rating,
        verifiedOnly,
        sortBy,
        limit,
        offset
      } = req.query;

      const filters = {
        rating: rating ? parseInt(rating as string) : undefined,
        verifiedOnly: verifiedOnly === 'true',
        sortBy: sortBy as any,
        limit: limit ? parseInt(limit as string) : 20,
        offset: offset ? parseInt(offset as string) : 0
      };

      const result = await this.reviewService.getReviewsForUser(userId, filters);

      res.json({
        success: true,
        data: result
      });
    } catch (error: any) {
      safeLogger.error('Error getting reviews for user:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get reviews'
      });
    }
  }

  /**
   * Get review statistics for a user
   */
  async getReviewStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const stats = await this.reviewService.getReviewStats(userId);

      res.json({
        success: true,
        data: stats
      });
    } catch (error: any) {
      safeLogger.error('Error getting review stats:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get review statistics'
      });
    }
  }

  /**
   * Mark a review as helpful or not helpful
   */
  async markReviewHelpful(req: Request, res: Response): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { userId, isHelpful } = req.body;

      if (!userId || typeof isHelpful !== 'boolean') {
        res.status(400).json({
          success: false,
          error: 'userId and isHelpful are required'
        });
        return;
      }

      await this.reviewService.markReviewHelpful(
        parseInt(reviewId),
        userId,
        isHelpful
      );

      res.json({
        success: true,
        message: 'Review helpfulness updated'
      });
    } catch (error: any) {
      safeLogger.error('Error marking review helpful:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update review helpfulness'
      });
    }
  }

  /**
   * Report a review for moderation
   */
  async reportReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { reporterId, reason, description } = req.body;

      if (!reporterId || !reason) {
        res.status(400).json({
          success: false,
          error: 'reporterId and reason are required'
        });
        return;
      }

      await this.reviewService.reportReview(
        parseInt(reviewId),
        reporterId,
        reason,
        description
      );

      res.json({
        success: true,
        message: 'Review reported successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error reporting review:', error);
      res.status(400).json({
        success: false,
        error: error.message || 'Failed to report review'
      });
    }
  }

  /**
   * Get seller rankings based on reputation
   */
  async getSellerRankings(req: Request, res: Response): Promise<void> {
    try {
      const { limit, category } = req.query;

      const rankings = await this.reputationService.getSellerRankings(
        limit ? parseInt(limit as string) : 50,
        category as string
      );

      res.json({
        success: true,
        data: rankings
      });
    } catch (error: any) {
      safeLogger.error('Error getting seller rankings:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get seller rankings'
      });
    }
  }

  /**
   * Detect fake reviews for a user
   */
  async detectFakeReviews(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const detection = await this.reviewService.detectFakeReviews(userId);

      res.json({
        success: true,
        data: detection
      });
    } catch (error: any) {
      safeLogger.error('Error detecting fake reviews:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to detect fake reviews'
      });
    }
  }

  /**
   * Get user reputation with review-enhanced scoring
   */
  async getUserReputation(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      const reputation = await this.reputationService.getUserReputation(userId);

      if (!reputation) {
        res.status(404).json({
          success: false,
          error: 'User reputation not found'
        });
        return;
      }

      res.json({
        success: true,
        data: reputation
      });
    } catch (error: any) {
      safeLogger.error('Error getting user reputation:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user reputation'
      });
    }
  }

  /**
   * Admin endpoint to flag a review
   */
  async flagReview(req: Request, res: Response): Promise<void> {
    try {
      const { reviewId } = req.params;
      const { reason } = req.body;

      if (!reason) {
        res.status(400).json({
          success: false,
          error: 'Reason is required'
        });
        return;
      }

      await this.reviewService.flagReview(parseInt(reviewId), reason);

      res.json({
        success: true,
        message: 'Review flagged successfully'
      });
    } catch (error: any) {
      safeLogger.error('Error flagging review:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to flag review'
      });
    }
  }
}
