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
      return [];
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
      return [];
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
      return [];
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
      return [];
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
}

export const blogService = new BlogService();
