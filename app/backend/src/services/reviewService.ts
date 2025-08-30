// Temporary stub for review service to fix build issues

export interface ReviewData {
  reviewerId: string;
  revieweeId: string;
  orderId: number;
  rating: number;
  title?: string;
  comment?: string;
}

export class ReviewService {
  async submitReview(data: ReviewData) {
    return {
      id: 'stub-review-id',
      ...data,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  async getReviewById(reviewId: string) {
    return null;
  }

  async getReviewsByUser(userId: string) {
    return [];
  }

  async getReviewsForUser(userId: string, filters?: any) {
    return [];
  }

  async getReviewStats(userId: string) {
    return {
      totalReviews: 0,
      averageRating: 0,
      ratingDistribution: {}
    };
  }

  async markReviewHelpful(reviewId: number, userId: string, isHelpful: boolean) {
    throw new Error('Review service not implemented');
  }

  async reportReview(reviewId: number, reporterId: string, reason: string, description?: string) {
    throw new Error('Review service not implemented');
  }

  async deleteReview(reviewId: string) {
    throw new Error('Review service not implemented');
  }

  async moderateReview(reviewId: string, action: string, reason?: string) {
    throw new Error('Review service not implemented');
  }

  async detectFakeReviews(userId: string) {
    return {
      suspiciousReviews: [],
      confidence: 0
    };
  }

  async flagReview(reviewId: number, reason: string) {
    throw new Error('Review service not implemented');
  }
}

export const reviewService = new ReviewService();