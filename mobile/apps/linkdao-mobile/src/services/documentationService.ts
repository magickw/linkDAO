/**
 * Documentation Service
 * Handles documentation and help content
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface DocCategory {
  id: string;
  name: string;
  icon: string;
  description: string;
  articlesCount: number;
}

export interface DocArticle {
  id: string;
  title: string;
  slug: string;
  category: string;
  excerpt: string;
  content: string;
  lastUpdated: string;
  readTime: number;
  tags: string[];
}

export interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
  views: number;
}

class DocumentationService {
  private baseUrl = `${ENV.BACKEND_URL}/api/docs`;

  /**
   * Get all documentation categories
   */
  async getCategories(): Promise<DocCategory[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/categories`);
      const data = response.data.data || response.data;
      return data.categories || data || [];
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(categoryId: string): Promise<DocArticle[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/category/${categoryId}`);
      const data = response.data.data || response.data;
      return data.articles || data || [];
    } catch (error) {
      console.error('Error fetching articles:', error);
      return [];
    }
  }

  /**
   * Get article by slug
   */
  async getArticle(slug: string): Promise<DocArticle | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/article/${slug}`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching article:', error);
      return null;
    }
  }

  /**
   * Search documentation
   */
  async search(query: string): Promise<DocArticle[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/search`, {
        params: { q: query }
      });
      const data = response.data.data || response.data;
      return data.articles || data || [];
    } catch (error) {
      console.error('Error searching documentation:', error);
      return [];
    }
  }

  /**
   * Get FAQs
   */
  async getFAQs(category?: string): Promise<FAQ[]> {
    try {
      const params: any = {};
      if (category) params.category = category;
      
      const response = await apiClient.get(`${this.baseUrl}/faq`, { params });
      const data = response.data.data || response.data;
      return data.faqs || data || [];
    } catch (error) {
      console.error('Error fetching FAQs:', error);
      return [];
    }
  }

  /**
   * Mark FAQ as helpful
   */
  async markFAQHelpful(faqId: string, helpful: boolean): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/faq/${faqId}/feedback`, { helpful });
    } catch (error) {
      console.error('Error marking FAQ helpful:', error);
    }
  }
}

export const documentationService = new DocumentationService();