import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { Comment, CreateCommentInput, CommunityPost } from '../models/CommunityPost';
import { ENV_CONFIG } from '@/config/environment';
import { authService } from './authService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class CommunityPostService {
  static async createPost(communityId: string, data: CreatePostInput): Promise<Post> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content: data.content,
          title: data.title,
          mediaUrls: data.media,
          tags: data.tags,
          pollData: data.poll,
          proposalData: data.proposal
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create community post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating community post:', error);
      throw error;
    }
  }

  static async createCommunityPost(data: {
    communityId: string;
    title: string;
    content: string;
    tags?: string[];
    author: string;
    flair?: string;
  }): Promise<Post> {
    return this.createPost(data.communityId, {
      title: data.title,
      content: data.content,
      tags: data.tags || [],
      author: data.author,
      communityId: data.communityId
    });
  }

  static async getPost(communityId: string, postId: string): Promise<Post | null> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch community post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching community post:', error);
      throw error;
    }
  }

  static async updatePost(communityId: string, postId: string, data: UpdatePostInput): Promise<Post> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update community post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating community post:', error);
      throw error;
    }
  }

  static async deletePost(communityId: string, postId: string): Promise<boolean> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete community post: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting community post:', error);
      throw error;
    }
  }

  static async getCommunityPosts(
    communityId: string,
    page: number = 1,
    limit: number = 20,
    sort: string = 'new'
  ): Promise<{ posts: CommunityPost[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch community posts: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching community posts:', error);
      throw error;
    }
  }

  static async addReaction(
    communityId: string,
    postId: string,
    type: string,
    tokenAmount: number = 0
  ): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}/react`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          type,
          tokenAmount
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to add reaction: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error adding reaction to community post:', error);
      throw error;
    }
  }

  static async sendTip(
    communityId: string,
    postId: string,
    amount: number,
    tokenType: string,
    message?: string
  ): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}/tip`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          amount,
          tokenType,
          message
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to send tip: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error sending tip to community post:', error);
      throw error;
    }
  }

  static async createComment(data: CreateCommentInput): Promise<Comment> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/community-posts/${data.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          author: data.author,
          content: data.content,
          parentCommentId: data.parentId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create comment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  static async getPostComments(
    postId: string,
    options?: {
      sortBy?: 'best' | 'new' | 'top' | 'controversial';
      limit?: number;
    }
  ): Promise<Comment[]> {
    try {
      const params = new URLSearchParams();
      if (options?.sortBy) params.append('sortBy', options.sortBy);
      if (options?.limit) params.append('limit', options.limit.toString());

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/community-posts/${postId}/comments?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch comments: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching post comments:', error);
      throw error;
    }
  }

  static async getPostStats(postId: string): Promise<{ commentCount: number }> {
    try {
      // Get all comments to count them
      // Note: This is a temporary implementation. Ideally, the backend should have a dedicated stats endpoint
      const comments = await this.getPostComments(postId, { limit: 1000 });
      return {
        commentCount: comments.length
      };
    } catch (error) {
      console.error('Error fetching post stats:', error);
      // Return default stats on error
      return {
        commentCount: 0
      };
    }
  }

  static async getPinnedPosts(communityId: string): Promise<CommunityPost[]> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts?pinned=true`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch pinned posts: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data?.posts || result.posts || [];
    } catch (error) {
      console.error('Error fetching pinned posts:', error);
      throw error;
    }
  }

  static async pinPost(postId: string, sortOrder?: number): Promise<CommunityPost> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/posts/${postId}/pin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ sortOrder })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to pin post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error pinning post:', error);
      throw error;
    }
  }

  static async unpinPost(postId: string): Promise<void> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/posts/${postId}/unpin`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to unpin post: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error unpinning post:', error);
      throw error;
    }
  }

  static async reorderPinnedPosts(communityId: string, postIds: string[]): Promise<void> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/reorder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          },
          body: JSON.stringify({ postIds })
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to reorder pinned posts: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error reordering pinned posts:', error);
      throw error;
    }
  }
}