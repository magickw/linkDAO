/**
 * Posts Service
 * API service for posts and feed operations
 */

import { apiClient } from '@linkdao/shared';
import { Post } from '../store';
import { offlineManager } from './offlineManager';

export interface CreatePostData {
  content: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'link';
    url: string;
    thumbnail?: string;
  }>;
  communityId?: string;
  mediaUrls?: string[];
  tags?: string[];
  pollData?: {
    question: string;
    options: string[];
    duration: number;
  };
  shareToSocialMedia?: {
    twitter?: boolean;
    facebook?: boolean;
    linkedin?: boolean;
    threads?: boolean;
  };
}

export interface PostsResponse {
  posts: Post[];
  hasMore: boolean;
  nextCursor?: string;
}

class PostsService {
  /**
   * Get feed posts
   */
  async getFeed(page: number = 1, limit: number = 20): Promise<PostsResponse> {
    const cacheKey = `feed_p${page}_l${limit}`;

    // Try to get from cache first
    if (page === 1) {
      const cached = await offlineManager.getCachedData<PostsResponse>(cacheKey);
      if (cached) {
        console.log('[PostsService] Returning cached feed');
        // Fetch fresh data in background to update cache
        this.getFeedFromApi(page, limit, cacheKey).catch(console.error);
        return cached;
      }
    }

    return this.getFeedFromApi(page, limit, cacheKey);
  }

  /**
   * Internal helper to fetch feed from API and update cache
   */
  private async getFeedFromApi(page: number, limit: number, cacheKey: string): Promise<PostsResponse> {
    const response = await apiClient.get<any>(
      `/api/feed?page=${page}&limit=${limit}`
    );

    if (response.success && response.data && response.data.data) {
      const feedData = response.data.data;
      
      const hasMore = feedData.pagination 
        ? feedData.pagination.page < feedData.pagination.totalPages
        : (feedData.hasMore || false);

      const result = {
        posts: feedData.posts || [],
        hasMore: hasMore,
        nextCursor: feedData.nextCursor,
      };

      // Cache the first page
      if (page === 1) {
        await offlineManager.cacheData(cacheKey, result, 600000); // 10 minutes
      }

      return result;
    }

    return { posts: [], hasMore: false };
  }

  /**
   * Get post by ID
   */
  async getPost(id: string): Promise<Post | null> {
    const response = await apiClient.get<any>(`/api/posts/${id}`);

    // Handle nested response: response.data (axios body) -> response.data.data (payload) -> response.data.data.post (actual object)
    // Or sometimes just response.data.data if the endpoint returns the object directly
    if (response.success && response.data) {
        if (response.data.data && response.data.data.post) {
            return response.data.data.post;
        }
        if (response.data.data) {
            return response.data.data;
        }
    }

    return null;
  }

  /**
   * Create new post
   */
  async createPost(data: CreatePostData): Promise<Post | null> {
    const response = await apiClient.post<any>('/api/posts', data);

    if (response.success && response.data && response.data.data) {
      return response.data.data;
    }

    return null;
  }

  /**
   * Update post
   */
  async updatePost(id: string, data: Partial<CreatePostData>): Promise<Post | null> {
    const response = await apiClient.put<any>(`/api/posts/${id}`, data);

    if (response.success && response.data && response.data.data) {
      return response.data.data;
    }

    return null;
  }

  /**
   * Delete post
   */
  async deletePost(id: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/posts/${id}`);
    return response.success;
  }

  /**
   * Like post
   */
  async likePost(id: string): Promise<boolean> {
    const response = await apiClient.post(`/api/posts/${id}/like`);
    return response.success;
  }

  /**
   * Unlike post
   */
  async unlikePost(id: string): Promise<boolean> {
    const response = await apiClient.delete(`/api/posts/${id}/like`);
    return response.success;
  }

  /**
   * Get community posts
   */
  async getCommunityPosts(communityId: string, page: number = 1, limit: number = 20): Promise<PostsResponse> {
    const response = await apiClient.get<any>(
      `/api/communities/${communityId}/posts?page=${page}&limit=${limit}`
    );

    if (response.success && response.data && response.data.data) {
      const feedData = response.data.data;
      
      const hasMore = feedData.pagination 
        ? feedData.pagination.page < feedData.pagination.totalPages
        : (feedData.hasMore || false);

      return {
        posts: feedData.posts || [],
        hasMore: hasMore,
        nextCursor: feedData.nextCursor,
      };
    }

    return { posts: [], hasMore: false };
  }
}

export const postsService = new PostsService();