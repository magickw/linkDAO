import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';
import { post as postRequest } from './globalFetchWrapper';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class PostService {
  private static async handleResponse(response: Response, context: string): Promise<any> {
    if (!response.ok) {
      let errorMessage = `${context}: ${response.statusText} (${response.status})`;
      try {
        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const error = await response.json();
          if (error.error) errorMessage = error.error;
          else if (error.message) errorMessage = error.message;
        } else {
          const text = await response.text();
          // Only use text if it's not HTML and reasonably short
          if (text && text.length < 200 && !text.trim().startsWith('<')) {
            errorMessage = text;
          }
        }
      } catch (e) {
        // Fallback to default error message
      }
      throw new Error(errorMessage);
    }

    try {
      const result = await response.json();
      return result.data || result;
    } catch (error) {
      throw new Error(`${context}: Invalid JSON response`);
    }
  }

  static async createPost(data: CreatePostInput): Promise<Post> {
    try {
      // If communityId is provided, create post in community
      // Otherwise, create a quick post on user's timeline
      const endpoint = data.communityId
        ? `${BACKEND_API_BASE_URL}/api/communities/${data.communityId}/posts`
        : `${BACKEND_API_BASE_URL}/api/posts`;

      // Use global fetch wrapper which handles token refresh automatically
      const response = await postRequest(endpoint, {
        content: data.content,
        author: data.author,
        type: 'text', // Default post type
        visibility: 'public', // Default visibility
        tags: data.tags,
        media: data.media,
        parentId: data.parentId,
        onchainRef: data.onchainRef,
        title: data.title,
        pollData: data.poll,
        proposalData: data.proposal
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create post');
      }

      return response.data;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async getPost(id: string): Promise<Post | null> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      if (response.status === 404) {
        return null;
      }

      return this.handleResponse(response, 'Failed to fetch post');
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
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'PUT',
        headers: await enhancedAuthService.getAuthHeaders(),
        body: JSON.stringify(data)
      });

      return this.handleResponse(response, 'Failed to update post');
    } catch (error) {
      console.error('Error updating post:', error);
      throw error;
    }
  }

  static async deletePost(id: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      // Handle specific status codes
      if (response.status === 404) {
        throw new Error('Post not found. It may have already been deleted or does not exist.');
      }
      
      if (response.status === 401) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      if (response.status === 403) {
        throw new Error('You do not have permission to delete this post.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete post: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      // Re-throw the error so it can be handled by the calling code
      throw error;
    }
  }

  static async addReaction(
    postId: string,
    type: string,
    tokenAmount: number = 0
  ): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/react`, {
        method: 'POST',
        headers: await enhancedAuthService.getAuthHeaders(),
        body: JSON.stringify({
          type,
          tokenAmount
        })
      });

      return this.handleResponse(response, 'Failed to add reaction');
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
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/tip`, {
        method: 'POST',
        headers: await enhancedAuthService.getAuthHeaders(),
        body: JSON.stringify({
          amount,
          tokenType,
          message
        })
      });

      return this.handleResponse(response, 'Failed to send tip');
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch comments');
    } catch (error) {
      console.error('Error fetching post comments:', error);
      throw error;
    }
  }

  static async addComment(
    postId: string,
    content: string,
    parentId?: string
  ): Promise<any> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments`, {
        method: 'POST',
        headers: await enhancedAuthService.getAuthHeaders(),
        body: JSON.stringify({
          content,
          parentId
        })
      });

      return this.handleResponse(response, 'Failed to add comment');
    } catch (error) {
      console.error('Error adding comment to post:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string): Promise<boolean> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Failed to delete comment: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  static async getFeed(
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch feed');
    } catch (error) {
      console.error('Error fetching feed:', error);
      throw error;
    }
  }

  static async getCommunityFeed(
    communityId: string,
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/feed?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch community feed');
    } catch (error) {
      console.error('Error fetching community feed:', error);
      throw error;
    }
  }

  static async getTrendingPosts(limit: number = 10): Promise<Post[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/trending?limit=${limit}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch trending posts');
    } catch (error) {
      console.error('Error fetching trending posts:', error);
      throw error;
    }
  }

  static async searchPosts(query: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams({
        q: query,
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/search?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to search posts');
    } catch (error) {
      console.error('Error searching posts:', error);
      throw error;
    }
  }

  // Additional methods that were missing but referenced in tests and hooks

  static async getPostsByAuthor(author: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/author/${author}?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch posts by author');
    } catch (error) {
      console.error('Error fetching posts by author:', error);
      throw error;
    }
  }

  static async getPostsByTag(tag: string, page: number = 1, limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/tag/${tag}?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch posts by tag');
    } catch (error) {
      console.error('Error fetching posts by tag:', error);
      throw error;
    }
  }

  static async getAllPosts(page: number = 1, limit: number = 20): Promise<any> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts?${params}`, {
        method: 'GET',
        headers: await enhancedAuthService.getAuthHeaders()
      });

      return this.handleResponse(response, 'Failed to fetch all posts');
    } catch (error) {
      console.error('Error fetching all posts:', error);
      throw error;
    }
  }
}