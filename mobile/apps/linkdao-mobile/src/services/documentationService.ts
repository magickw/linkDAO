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
      return this.getMockCategories();
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
      return this.getMockArticles();
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
      return this.getMockFAQs();
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

  // Mock data methods
  private getMockCategories(): DocCategory[] {
    return [
      {
        id: '1',
        name: 'Getting Started',
        icon: '🚀',
        description: 'Learn the basics of LinkDAO',
        articlesCount: 8,
      },
      {
        id: '2',
        name: 'Wallet Setup',
        icon: '👛',
        description: 'Configure your crypto wallet',
        articlesCount: 5,
      },
      {
        id: '3',
        name: 'Governance',
        icon: '🗳️',
        description: 'Participate in DAO governance',
        articlesCount: 6,
      },
      {
        id: '4',
        name: 'Marketplace',
        icon: '🛒',
        description: 'Buy and sell on the marketplace',
        articlesCount: 10,
      },
      {
        id: '5',
        name: 'Staking',
        icon: '💰',
        description: 'Earn rewards by staking',
        articlesCount: 4,
      },
      {
        id: '6',
        name: 'Security',
        icon: '🔒',
        description: 'Keep your account secure',
        articlesCount: 7,
      },
    ];
  }

  private getMockArticles(): DocArticle[] {
    return [
      {
        id: '1',
        title: 'Introduction to LinkDAO',
        slug: 'introduction',
        category: 'Getting Started',
        excerpt: 'Learn what LinkDAO is and how it works',
        content: 'LinkDAO is a decentralized autonomous organization...',
        lastUpdated: '2024-01-15',
        readTime: 5,
        tags: ['intro', 'dao', 'overview'],
      },
      {
        id: '2',
        title: 'Creating Your Account',
        slug: 'creating-account',
        category: 'Getting Started',
        excerpt: 'Step-by-step guide to creating your account',
        content: 'To create your account, follow these steps...',
        lastUpdated: '2024-01-10',
        readTime: 3,
        tags: ['account', 'signup', 'tutorial'],
      },
      {
        id: '3',
        title: 'Connecting Your Wallet',
        slug: 'connecting-wallet',
        category: 'Wallet Setup',
        excerpt: 'How to connect MetaMask or other wallets',
        content: 'LinkDAO supports multiple wallet providers...',
        lastUpdated: '2024-01-12',
        readTime: 4,
        tags: ['wallet', 'metamask', 'connect'],
      },
      {
        id: '4',
        title: 'Voting on Proposals',
        slug: 'voting-proposals',
        category: 'Governance',
        excerpt: 'Participate in DAO decision-making',
        content: 'Voting is a key part of LinkDAO governance...',
        lastUpdated: '2024-01-08',
        readTime: 6,
        tags: ['governance', 'voting', 'proposals'],
      },
      {
        id: '5',
        title: 'Buying on the Marketplace',
        slug: 'buying-marketplace',
        category: 'Marketplace',
        excerpt: 'How to purchase products and services',
        content: 'The LinkDAO marketplace offers...',
        lastUpdated: '2024-01-14',
        readTime: 5,
        tags: ['marketplace', 'buying', 'shopping'],
      },
    ];
  }

  private getMockFAQs(): FAQ[] {
    return [
      {
        id: '1',
        question: 'What is LinkDAO?',
        answer: 'LinkDAO is a decentralized autonomous organization built on blockchain technology...',
        category: 'General',
        helpful: 45,
        views: 234,
      },
      {
        id: '2',
        question: 'How do I connect my wallet?',
        answer: 'You can connect your wallet by clicking the "Connect Wallet" button...',
        category: 'Wallet',
        helpful: 38,
        views: 189,
      },
      {
        id: '3',
        question: 'What are LDAO tokens used for?',
        answer: 'LDAO tokens are used for governance, staking, and accessing premium features...',
        category: 'Tokens',
        helpful: 52,
        views: 312,
      },
      {
        id: '4',
        question: 'How do I earn rewards?',
        answer: 'You can earn rewards by staking LDAO tokens, participating in governance...',
        category: 'Rewards',
        helpful: 41,
        views: 267,
      },
      {
        id: '5',
        question: 'Is my data secure?',
        answer: 'Yes, LinkDAO uses blockchain technology and encryption to secure your data...',
        category: 'Security',
        helpful: 67,
        views: 423,
      },
    ];
  }
}

export const documentationService = new DocumentationService();