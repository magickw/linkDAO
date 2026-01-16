/**
 * Blog Service
 * Handles blog posts and articles
 */

import { apiClient } from './apiClient';
import { ENV } from '../constants/environment';

// Types
export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  author: {
    name: string;
    avatar: string;
  };
  coverImage?: string;
  category: string;
  tags: string[];
  publishedAt: string;
  readTime: number;
  views: number;
  likes: number;
}

export interface BlogCategory {
  id: string;
  name: string;
  slug: string;
  postCount: number;
}

class BlogService {
  private baseUrl = `${ENV.BACKEND_URL}/api/blog`;

  /**
   * Get all blog posts
   */
  async getPosts(limit: number = 10, offset: number = 0): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/posts`, {
        params: { limit, offset }
      });
      const data = response.data.data || response.data;
      return data.posts || data || [];
    } catch (error) {
      console.error('Error fetching blog posts:', error);
      return this.getMockPosts(limit);
    }
  }

  /**
   * Get featured posts
   */
  async getFeaturedPosts(limit: number = 3): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/featured`, {
        params: { limit }
      });
      const data = response.data.data || response.data;
      return data.posts || data || [];
    } catch (error) {
      console.error('Error fetching featured posts:', error);
      return this.getMockPosts(limit).slice(0, limit);
    }
  }

  /**
   * Get post by slug
   */
  async getPost(slug: string): Promise<BlogPost | null> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/post/${slug}`);
      const data = response.data.data || response.data;
      return data;
    } catch (error) {
      console.error('Error fetching post:', error);
      return null;
    }
  }

  /**
   * Get posts by category
   */
  async getPostsByCategory(categorySlug: string): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/category/${categorySlug}`);
      const data = response.data.data || response.data;
      return data.posts || data || [];
    } catch (error) {
      console.error('Error fetching category posts:', error);
      return this.getMockPosts();
    }
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<BlogCategory[]> {
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
   * Search posts
   */
  async search(query: string): Promise<BlogPost[]> {
    try {
      const response = await apiClient.get(`${this.baseUrl}/search`, {
        params: { q: query }
      });
      const data = response.data.data || response.data;
      return data.posts || data || [];
    } catch (error) {
      console.error('Error searching posts:', error);
      return [];
    }
  }

  /**
   * Like a post
   */
  async likePost(postId: string): Promise<void> {
    try {
      await apiClient.post(`${this.baseUrl}/post/${postId}/like`);
    } catch (error) {
      console.error('Error liking post:', error);
    }
  }

  // Mock data methods
  private getMockPosts(limit: number = 10): BlogPost[] {
    return [
      {
        id: '1',
        title: 'Welcome to LinkDAO: A New Era of Decentralized Governance',
        slug: 'welcome-to-linkdao',
        excerpt: 'Discover how LinkDAO is revolutionizing the way communities make decisions together.',
        content: 'LinkDAO represents a paradigm shift in how we think about community governance...',
        author: {
          name: 'LinkDAO Team',
          avatar: 'https://i.pravatar.cc/150?img=1',
        },
        coverImage: 'https://picsum.photos/800/400?random=20',
        category: 'Announcements',
        tags: ['dao', 'governance', 'launch'],
        publishedAt: '2024-01-15',
        readTime: 8,
        views: 1234,
        likes: 89,
      },
      {
        id: '2',
        title: 'Understanding LDAO Token Economics',
        slug: 'ldao-token-economics',
        excerpt: 'A deep dive into the tokenomics and utility of the LDAO governance token.',
        content: 'The LDAO token serves multiple purposes within the LinkDAO ecosystem...',
        author: {
          name: 'Economics Team',
          avatar: 'https://i.pravatar.cc/150?img=2',
        },
        coverImage: 'https://picsum.photos/800/400?random=21',
        category: 'Tokens',
        tags: ['ldao', 'tokenomics', 'economics'],
        publishedAt: '2024-01-12',
        readTime: 10,
        views: 987,
        likes: 76,
      },
      {
        id: '3',
        title: 'How to Participate in Governance Proposals',
        slug: 'governance-proposals-guide',
        excerpt: 'Step-by-step guide to voting on proposals and shaping the future of LinkDAO.',
        content: 'Governance is at the heart of LinkDAO. Here\'s how you can participate...',
        author: {
          name: 'Governance Team',
          avatar: 'https://i.pravatar.cc/150?img=3',
        },
        coverImage: 'https://picsum.photos/800/400?random=22',
        category: 'Tutorials',
        tags: ['governance', 'voting', 'tutorial'],
        publishedAt: '2024-01-10',
        readTime: 7,
        views: 756,
        likes: 54,
      },
      {
        id: '4',
        title: 'Staking LDAO: Earn While You Govern',
        slug: 'staking-ldao-guide',
        excerpt: 'Learn how to stake your LDAO tokens and earn rewards while participating in governance.',
        content: 'Staking is a great way to earn passive income while supporting the network...',
        author: {
          name: 'DeFi Team',
          avatar: 'https://i.pravatar.cc/150?img=4',
        },
        coverImage: 'https://picsum.photos/800/400?random=23',
        category: 'Staking',
        tags: ['staking', 'rewards', 'defi'],
        publishedAt: '2024-01-08',
        readTime: 6,
        views: 623,
        likes: 48,
      },
      {
        id: '5',
        title: 'Security Best Practices for Your LinkDAO Account',
        slug: 'security-best-practices',
        excerpt: 'Essential tips to keep your account and assets secure in the decentralized world.',
        content: 'Security is paramount in the world of Web3. Follow these best practices...',
        author: {
          name: 'Security Team',
          avatar: 'https://i.pravatar.cc/150?img=5',
        },
        coverImage: 'https://picsum.photos/800/400?random=24',
        category: 'Security',
        tags: ['security', 'wallet', 'safety'],
        publishedAt: '2024-01-05',
        readTime: 9,
        views: 892,
        likes: 67,
      },
    ].slice(0, limit);
  }

  private getMockCategories(): BlogCategory[] {
    return [
      {
        id: '1',
        name: 'Announcements',
        slug: 'announcements',
        postCount: 15,
      },
      {
        id: '2',
        name: 'Tutorials',
        slug: 'tutorials',
        postCount: 28,
      },
      {
        id: '3',
        name: 'Tokens',
        slug: 'tokens',
        postCount: 12,
      },
      {
        id: '4',
        name: 'Governance',
        slug: 'governance',
        postCount: 18,
      },
      {
        id: '5',
        name: 'Staking',
        slug: 'staking',
        postCount: 9,
      },
      {
        id: '6',
        name: 'Security',
        slug: 'security',
        postCount: 14,
      },
    ];
  }
}

export const blogService = new BlogService();
