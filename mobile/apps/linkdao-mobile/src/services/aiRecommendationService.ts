/**
 * AI Recommendation Service
 * Provides AI-powered content recommendations for users
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface Recommendation {
  id: string;
  type: 'post' | 'community' | 'user' | 'product';
  itemId: string;
  title: string;
  description: string;
  score: number;
  reason: string;
  metadata?: {
    category?: string;
    tags?: string[];
    author?: string;
    thumbnail?: string;
  };
}

export interface RecommendationPreferences {
  interests: string[];
  categories: string[];
  excludeCategories: string[];
  minScore: number;
  maxResults: number;
}

export interface UserBehavior {
  userId: string;
  actions: Array<{
    type: 'view' | 'like' | 'comment' | 'share' | 'tip' | 'purchase';
    itemId: string;
    itemType: string;
    timestamp: Date;
    duration?: number;
  }>;
}

class AIRecommendationService {
  private baseUrl = `${ENV.BACKEND_URL}/api/ai`;

  /**
   * Get personalized content recommendations
   */
  async getRecommendations(
    type?: 'post' | 'community' | 'user' | 'product',
    preferences?: Partial<RecommendationPreferences>
  ): Promise<Recommendation[]> {
    try {
      const params: any = {};
      if (type) params.type = type;
      if (preferences) {
        if (preferences.interests) params.interests = preferences.interests.join(',');
        if (preferences.categories) params.categories = preferences.categories.join(',');
        if (preferences.excludeCategories) params.exclude = preferences.excludeCategories.join(',');
        if (preferences.minScore) params.minScore = preferences.minScore;
        if (preferences.maxResults) params.limit = preferences.maxResults;
      }

      const response = await apiClient.get(`${this.baseUrl}/recommendations`, { params });
      const data = response.data.data || response.data;
      return this.transformRecommendations(data.recommendations || data || []);
    } catch (error) {
      console.error('Error fetching recommendations:', error);
      return [];
    }
  }

  /**
   * Get trending content
   */
  async getTrending(limit: number = 10): Promise<Recommendation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/trending`, { params: { limit } });
      const data = response.data.data || response.data;
      return this.transformRecommendations(data.trending || data || []);
    } catch (error) {
      console.error('Error fetching trending:', error);
      return [];
    }
  }

  /**
   * Get similar items
   */
  async getSimilarItems(itemId: string, itemType: string, limit: number = 5): Promise<Recommendation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/similar`, {
        params: { itemId, itemType, limit }
      });
      const data = response.data.data || response.data;
      return this.transformRecommendations(data.similar || data || []);
    } catch (error) {
      console.error('Error fetching similar items:', error);
      return [];
    }
  }

  /**
   * Get community recommendations
   */
  async getCommunityRecommendations(): Promise<Recommendation[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/recommendations/communities`);
      const data = response.data.data || response.data;
      return this.transformRecommendations(data.communities || data || []);
    } catch (error) {
      console.error('Error fetching community recommendations:', error);
      return [];
    }
  }

  /**
   * Track user behavior for better recommendations
   */
  async trackBehavior(behavior: Omit<UserBehavior['actions'][0], 'timestamp'>): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/behavior`, {
        ...behavior,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error tracking behavior:', error);
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(preferences: Partial<RecommendationPreferences>): Promise<{ success: boolean }> {
    try {
      await apiClient.post(`${this.baseUrl}/preferences`, preferences);
      return { success: true };
    } catch (error) {
      console.error('Error updating preferences:', error);
      return { success: false };
    }
  }

  /**
   * Get user's recommendation preferences
   */
  async getPreferences(): Promise<RecommendationPreferences | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/preferences`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  }

  // Helper methods
  private transformRecommendations(data: any[]): Recommendation[] {
    return data.map((item) => ({
      id: item.id || '',
      type: item.type || 'post',
      itemId: item.itemId || item.id || '',
      title: item.title || '',
      description: item.description || '',
      score: item.score || 0,
      reason: item.reason || '',
      metadata: item.metadata || {},
    }));
  }
}

export const aiRecommendationService = new AIRecommendationService();