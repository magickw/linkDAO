import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { ENV_CONFIG } from '@/config/environment';
import { authService } from './authService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class PostService {
  static async createPost(data: CreatePostInput): Promise<Post> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content: data.content,
          communityId: data.dao,
          mediaUrls: data.media,
          tags: data.tags,
          title: data.title,
          pollData: data.poll,
          proposalData: data.proposal
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to create post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async getPost(id: string): Promise<Post | null> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${id}`, {
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
        throw new Error(error.error || `Failed to fetch post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching post:', error);
      throw error;
    }
  }

  // Alias for getPost for consistency
  static async getPostById(id: string): Promise<Post | null> {
    return this.getPost(id);
  }

  static async updatePost(id: string, data: UpdatePostInput): Promise<Post> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  static async deletePost(id: string): Promise<boolean> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete post: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  static async addReaction(
    postId: string,
    type: string,
    tokenAmount: number = 0
  ): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/react`, {
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
      console.error('Error adding reaction to post:', error);
      throw error;
    }
  }

  static async sendTip(
    postId: string,
    amount: number,
    tokenType: string,
    message?: string
  ): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/tip`, {
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
      console.error('Error sending tip to post:', error);
      throw error;
    }
  }

  static async getPostComments(
    postId: string,
    page: number = 1,
    limit: number = 20,
    sort: string = 'newest'
  ): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

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

  static async addComment(
    postId: string,
    content: string,
    parentCommentId?: string
  ): Promise<any> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          content,
          parentCommentId
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to add comment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error adding comment to post:', error);
      throw error;
    }
  }

  static async getCommunityPosts(
    communityId: string,
    page: number = 1,
    limit: number = 20,
    sort: string = 'new'
  ): Promise<{ posts: Post[]; pagination: any }> {
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

  static async getPostsByCommunity(
    communityId: string,
    page: number = 1,
    limit: number = 20,
    sort: string = 'new'
  ): Promise<Post[]> {
    try {
      const result = await this.getCommunityPosts(communityId, page, limit, sort);
      return result.posts || [];
    } catch (error) {
      console.error('Error fetching posts by community:', error);
      throw error;
    }
  }

  static async getFeed(forUser?: string): Promise<Post[]> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const params = new URLSearchParams();
      if (forUser) params.append('forUser', forUser);

      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/feed${params.toString() ? `?${params}` : ''}`,
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
        throw new Error(error.error || `Failed to fetch feed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  }

  static async getPostsByAuthor(author: string): Promise<Post[]> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/posts/author/${author}`,
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
        throw new Error(error.error || `Failed to fetch posts by author: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching posts by author:', error);
      throw error;
    }
  }
}