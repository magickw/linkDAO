/**
 * Review Service
 * Handles fetching and submitting product/seller reviews
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

export interface Review {
  id: string;
  reviewerId: string;
  reviewerName: string;
  reviewerAvatar?: string;
  revieweeId: string;
  orderId?: string;
  rating: number;
  title: string;
  comment: string;
  helpfulCount: number;
  createdAt: string;
}

export interface ReviewStats {
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: Record<number, number>;
}

export interface SubmitReviewData {
  revieweeId: string;
  orderId?: string;
  rating: number;
  title: string;
  comment: string;
}

class ReviewService {
  private baseUrl = `${ENV.BACKEND_URL}/api/reviews`;

  /**
   * Get reviews for a specific user/seller
   */
  async getReviewsForUser(userId: string, filters?: { limit?: number; offset?: number; minRating?: number }): Promise<Review[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/user/${userId}`, {
        params: filters
      });
      const data = response.data.data || response.data;
      return data.reviews || data || [];
    } catch (error) {
      console.error('Error fetching reviews:', error);
      return [];
    }
  }

  /**
   * Get reviews for a specific product
   */
  async getReviewsForProduct(productId: string): Promise<Review[]> {
    try {
      // Assuming product reviews are fetched via product-specific endpoint or by seller ID with product filter
      const response = await apiClient.get(`${this.baseUrl}/product/${productId}`);
      const data = response.data.data || response.data;
      return data.reviews || data || [];
    } catch (error) {
      console.error('Error fetching product reviews:', error);
      // Fallback: try fetching by seller if product-specific endpoint doesn't exist yet
      return [];
    }
  }

  /**
   * Get review statistics
   */
  async getReviewStats(userId: string): Promise<ReviewStats | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/user/${userId}/stats`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching review stats:', error);
      return null;
    }
  }

  /**
   * Submit a new review
   */
  async submitReview(reviewData: SubmitReviewData): Promise<{ success: boolean; data?: Review; error?: string }> {
    try {
      const response = await apiClient.post(this.baseUrl, reviewData);
      if (response.data && response.data.success) {
        return { success: true, data: response.data.data };
      }
      return { success: false, error: response.data.message || 'Failed to submit review' };
    } catch (error: any) {
      console.error('Error submitting review:', error);
      return { success: false, error: error.response?.data?.message || error.message || 'Failed to submit review' };
    }
  }

  /**
   * Mark a review as helpful
   */
  async markHelpful(reviewId: string): Promise<boolean> {
    try {
      const response = await apiClient.post(`${this.baseUrl}/${reviewId}/helpful`);
      return response.data && response.data.success;
    } catch (error) {
      console.error('Error marking review helpful:', error);
      return false;
    }
  }
}

export const reviewService = new ReviewService();
