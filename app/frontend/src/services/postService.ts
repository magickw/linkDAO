import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { ENV_CONFIG } from '@/config/environment';
import { authService } from './authService';

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
      const authHeaders = authService.getAuthHeaders();

      // If communityId is provided, create post in community
      // Otherwise, create a quick post on user's timeline
      const endpoint = data.communityId
        ? `${BACKEND_API_BASE_URL}/api/communities/${data.communityId}/posts`
        : `${BACKEND_API_BASE_URL}/api/posts`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
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
        })
      });

      return this.handleResponse(response, 'Failed to create post');
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  static async getPost(id: string): Promise<Post | null> {
    try {
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
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
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
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
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      await this.handleResponse(response, 'Failed to delete post');
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

      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
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

      return this.handleResponse(response, 'Failed to add comment');
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

      return this.handleResponse(response, 'Failed to fetch community posts');
    } catch (error) {
      console.error('Error fetching community posts:', error);
      // Return empty results if there's an error to prevent breaking the UI
      return {
        posts: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0
        }
      };
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
      // Return empty array if there's an error to prevent breaking the UI
      return [];
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

      return this.handleResponse(response, 'Failed to fetch feed');
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

      return this.handleResponse(response, 'Failed to fetch posts by author');
    } catch (error) {
      console.error('Error fetching posts by author:', error);
      throw error;
    }
  }
}