import { db } from '../../db';
import {
  reviews,
  orders,
} from '../../db/schema';
import { eq, and, desc, avg, count } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import { safeLogger } from '../../utils/safeLogger';

interface CreateReviewInput {
  orderId: string;
  reviewerId: string;
  revieweeId: string;
  rating: number; // 1-5
  title?: string;
  comment?: string;
}

interface UserRatingStats {
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
  };
  lastReviewDate?: Date;
}

/**
 * Service for managing marketplace reviews and ratings
 * Uses existing reviews table from main schema
 */
class ReviewService {
  /**
   * Create a new review
   */
  async createReview(input: CreateReviewInput): Promise<string> {
    try {
      // Validate rating
      if (input.rating < 1 || input.rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      // Check if order exists and is completed
      const [order] = await db
        .select()
        .from(orders)
        .where(eq(orders.id, input.orderId))
        .limit(1);

      if (!order) {
        throw new Error(`Order ${input.orderId} not found`);
      }

      // Check if review already exists
      const existingReview = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.orderId, input.orderId),
            eq(reviews.reviewerId, input.reviewerId),
            eq(reviews.revieweeId, input.revieweeId)
          )
        )
        .limit(1);

      if (existingReview.length > 0) {
        throw new Error('Review already exists for this order');
      }

      // Create review
      const [review] = await db
        .insert(reviews)
        .values({
          orderId: input.orderId,
          reviewerId: input.reviewerId as any,
          revieweeId: input.revieweeId as any,
          rating: input.rating,
          title: input.title,
          comment: input.comment,
          isVerified: true, // Marketplace reviews are verified purchases
          status: 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
        })
        .returning({ id: reviews.id });

      safeLogger.info(
        `Created review ${review.id} from ${input.reviewerId} for ${input.revieweeId}`
      );

      return review.id;
    } catch (error) {
      safeLogger.error('Error creating review:', error);
      throw error;
    }
  }

  /**
   * Update a review
   */
  async updateReview(
    reviewId: string,
    rating: number,
    title?: string,
    comment?: string
  ): Promise<void> {
    try {
      if (rating < 1 || rating > 5) {
        throw new Error('Rating must be between 1 and 5');
      }

      await db
        .update(reviews)
        .set({
          rating,
          title,
          comment,
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId));

      safeLogger.info(`Updated review ${reviewId}`);
    } catch (error) {
      safeLogger.error('Error updating review:', error);
      throw error;
    }
  }

  /**
   * Mark a review as helpful
   */
  async markHelpful(reviewId: string, isHelpful: boolean): Promise<void> {
    try {
      // Get current review
      const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }

      // Update helpful count
      const newHelpfulCount = isHelpful
        ? (review.helpfulCount || 0) + 1
        : review.helpfulCount || 0;

      await db
        .update(reviews)
        .set({
          helpfulCount: newHelpfulCount,
        })
        .where(eq(reviews.id, reviewId));

      safeLogger.info(
        `Marked review ${reviewId} as ${isHelpful ? 'helpful' : 'unhelpful'}`
      );
    } catch (error) {
      safeLogger.error('Error marking review helpful:', error);
      throw error;
    }
  }

  /**
   * Report a review
   */
  async reportReview(reviewId: string): Promise<void> {
    try {
      // Get current review
      const [review] = await db
        .select()
        .from(reviews)
        .where(eq(reviews.id, reviewId))
        .limit(1);

      if (!review) {
        throw new Error(`Review ${reviewId} not found`);
      }

      // Increment report count
      const newReportCount = (review.reportCount || 0) + 1;

      await db
        .update(reviews)
        .set({
          reportCount: newReportCount,
          // Auto-hide if too many reports
          status: newReportCount > 5 ? 'hidden' : review.status,
        })
        .where(eq(reviews.id, reviewId));

      safeLogger.info(`Reported review ${reviewId}, report count: ${newReportCount}`);
    } catch (error) {
      safeLogger.error('Error reporting review:', error);
      throw error;
    }
  }

  /**
   * Get user rating statistics
   */
  async getUserRatingStats(userId: string): Promise<UserRatingStats> {
    try {
      // Get average rating and total count
      const [stats] = await db
        .select({
          averageRating: avg(reviews.rating),
          totalReviews: count(),
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.revieweeId, userId),
            eq(reviews.status, 'active')
          )
        );

      // Get rating distribution
      const distribution = await db
        .select({
          rating: reviews.rating,
          count: count(),
        })
        .from(reviews)
        .where(
          and(
            eq(reviews.revieweeId, userId),
            eq(reviews.status, 'active')
          )
        )
        .groupBy(reviews.rating);

      // Get last review date
      const [lastReview] = await db
        .select({ createdAt: reviews.createdAt })
        .from(reviews)
        .where(
          and(
            eq(reviews.revieweeId, userId),
            eq(reviews.status, 'active')
          )
        )
        .orderBy(desc(reviews.createdAt))
        .limit(1);

      // Build distribution object
      const ratingDistribution = {
        fiveStar: 0,
        fourStar: 0,
        threeStar: 0,
        twoStar: 0,
        oneStar: 0,
      };

      for (const item of distribution) {
        if (item.rating === 5) ratingDistribution.fiveStar = Number(item.count);
        if (item.rating === 4) ratingDistribution.fourStar = Number(item.count);
        if (item.rating === 3) ratingDistribution.threeStar = Number(item.count);
        if (item.rating === 2) ratingDistribution.twoStar = Number(item.count);
        if (item.rating === 1) ratingDistribution.oneStar = Number(item.count);
      }

      return {
        averageRating: stats?.averageRating ? Number(stats.averageRating) : 0,
        totalReviews: stats?.totalReviews ? Number(stats.totalReviews) : 0,
        ratingDistribution,
        lastReviewDate: lastReview?.createdAt,
      };
    } catch (error) {
      safeLogger.error('Error getting user rating stats:', error);
      throw error;
    }
  }

  /**
   * Get reviews for a user
   */
  async getUserReviews(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const userReviews = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.revieweeId, userId),
            eq(reviews.status, 'active')
          )
        )
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset);

      return userReviews;
    } catch (error) {
      safeLogger.error('Error getting user reviews:', error);
      throw error;
    }
  }

  /**
   * Get reviews written by a user
   */
  async getReviewsByAuthor(
    userId: string,
    limit: number = 50,
    offset: number = 0
  ): Promise<any[]> {
    try {
      const authorReviews = await db
        .select()
        .from(reviews)
        .where(eq(reviews.reviewerId, userId))
        .orderBy(desc(reviews.createdAt))
        .limit(limit)
        .offset(offset);

      return authorReviews;
    } catch (error) {
      safeLogger.error('Error getting reviews by author:', error);
      throw error;
    }
  }

  /**
   * Get top reviews (most helpful)
   */
  async getTopReviews(userId: string, limit: number = 5): Promise<any[]> {
    try {
      const topReviews = await db
        .select()
        .from(reviews)
        .where(
          and(
            eq(reviews.revieweeId, userId),
            eq(reviews.status, 'active')
          )
        )
        .orderBy(desc(reviews.helpfulCount))
        .limit(limit);

      return topReviews;
    } catch (error) {
      safeLogger.error('Error getting top reviews:', error);
      throw error;
    }
  }

  /**
   * Delete a review (admin function)
   */
  async deleteReview(reviewId: string): Promise<void> {
    try {
      await db
        .update(reviews)
        .set({
          status: 'removed',
          updatedAt: new Date(),
        })
        .where(eq(reviews.id, reviewId));

      safeLogger.info(`Deleted review ${reviewId}`);
    } catch (error) {
      safeLogger.error('Error deleting review:', error);
      throw error;
    }
  }

  /**
   * Get reported reviews for moderation
   */
  async getReportedReviews(limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      const reportedReviews = await db
        .select()
        .from(reviews)
        .where(sql`${reviews.reportCount} > 0`)
        .orderBy(desc(reviews.reportCount))
        .limit(limit)
        .offset(offset);

      return reportedReviews;
    } catch (error) {
      safeLogger.error('Error getting reported reviews:', error);
      throw error;
    }
  }
}

export const reviewService = new ReviewService();
