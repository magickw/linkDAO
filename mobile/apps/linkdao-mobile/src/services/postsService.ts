/**
 * Posts Service
 * API service for posts and feed operations
 */

import { apiClient } from '@linkdao/shared';
import { Post } from '../store';

export interface CreatePostData {
  content: string;
  attachments?: Array<{
    type: 'image' | 'video' | 'link';
    url: string;
    thumbnail?: string;
  }>;
  communityId?: string;
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
    const response = await apiClient.get<{ posts: Post[]; hasMore: boolean; nextCursor?: string }>(
      `/api/posts?page=${page}&limit=${limit}`
    );

    if (response.success && response.data) {
      return {
        posts: response.data.posts,
        hasMore: response.data.hasMore,
        nextCursor: response.data.nextCursor,
      };
    }

    return { posts: [], hasMore: false };
  }

  /**
   * Get post by ID
   */
  async getPost(id: string): Promise<Post | null> {
    const response = await apiClient.get<Post>(`/api/posts/${id}`);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Create new post
   */
  async createPost(data: CreatePostData): Promise<Post | null> {
    const response = await apiClient.post<Post>('/api/posts', data);

    if (response.success && response.data) {
      return response.data;
    }

    return null;
  }

  /**
   * Update post
   */
  async updatePost(id: string, data: Partial<CreatePostData>): Promise<Post | null> {
    const response = await apiClient.put<Post>(`/api/posts/${id}`, data);

    if (response.success && response.data) {
      return response.data;
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
    const response = await apiClient.get<{ posts: Post[]; hasMore: boolean; nextCursor?: string }>(
      `/api/communities/${communityId}/posts?page=${page}&limit=${limit}`
    );

    if (response.success && response.data) {
      return {
        posts: response.data.posts,
        hasMore: response.data.hasMore,
        nextCursor: response.data.nextCursor,
      };
    }

    return { posts: [], hasMore: false };
  }
}

export const postsService = new PostsService();