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
      return this.getMockRecommendations(type);
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
      return this.getMockTrending(limit);
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
      return this.getMockCommunityRecommendations();
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

  // Mock data for development
  private getMockRecommendations(type?: string): Recommendation[] {
    const allRecommendations: Recommendation[] = [
      {
        id: '1',
        type: 'post',
        itemId: 'post-1',
        title: 'Understanding DeFi Yield Farming Strategies',
        description: 'A comprehensive guide to maximizing returns through yield farming protocols...',
        score: 0.95,
        reason: 'Based on your interest in DeFi and blockchain',
        metadata: {
          category: 'education',
          tags: ['defi', 'yield', 'farming', 'blockchain'],
          author: '0x1234...5678',
        },
      },
      {
        id: '2',
        type: 'community',
        itemId: 'community-1',
        title: 'DeFi Enthusiasts',
        description: 'Join 15,000+ members discussing the latest in decentralized finance...',
        score: 0.92,
        reason: 'Popular community matching your interests',
        metadata: {
          category: 'defi',
          tags: ['defi', 'trading', 'investing'],
        },
      },
      {
        id: '3',
        type: 'product',
        itemId: 'product-1',
        title: 'Hardware Wallet Bundle',
        description: 'Secure your crypto with this premium hardware wallet package...',
        score: 0.88,
        reason: 'Trending in security products',
        metadata: {
          category: 'security',
          tags: ['hardware', 'wallet', 'security'],
        },
      },
      {
        id: '4',
        type: 'post',
        itemId: 'post-2',
        title: 'NFT Market Analysis: Q4 2025',
        description: 'Deep dive into NFT market trends and predictions for the coming quarter...',
        score: 0.85,
        reason: 'Popular in your communities',
        metadata: {
          category: 'nft',
          tags: ['nft', 'market', 'analysis'],
          author: '0x8765...4321',
        },
      },
      {
        id: '5',
        type: 'user',
        itemId: 'user-1',
        title: 'Crypto Analyst Pro',
        description: 'Expert insights and market analysis from a trusted source...',
        score: 0.82,
        reason: 'Highly followed by similar users',
        metadata: {
          category: 'analysis',
          tags: ['crypto', 'analysis', 'trading'],
        },
      },
    ];

    if (type) {
      return allRecommendations.filter((r) => r.type === type);
    }
    return allRecommendations;
  }

  private getMockTrending(limit: number): Recommendation[] {
    return this.getMockRecommendations().slice(0, limit);
  }

  private getMockCommunityRecommendations(): Recommendation[] {
    return this.getMockRecommendations('community');
  }
}

export const aiRecommendationService = new AIRecommendationService();