import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { Comment, CreateCommentInput, CommunityPost } from '../models/CommunityPost';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class CommunityPostService {
  static async createPost(communityId: string, data: CreatePostInput): Promise<Post> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
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

  static async getPostStats(postId: string): Promise<{ commentCount: number }> {
    try {
      // Use the same approach as getPostCommentCount to get the comment count
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch post comments');
      }

      const result = await response.json();
      const comments = result.data || result;
      const commentCount = Array.isArray(comments) ? comments.length : 0;

      return { commentCount };
    } catch (error) {
      console.error('Error fetching post stats:', error);
      return { commentCount: 0 };
    }
  }

  /**
   * Get replies to a specific comment with exponential backoff for errors
   */
  static async getCommentReplies(
    commentId: string,
    options?: {
      limit?: number;
    }
  ): Promise<Comment[]> {
    const maxRetries = 3;
    const baseDelay = 1000; // 1 second

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const params = new URLSearchParams();
        if (options?.limit) params.append('limit', options.limit.toString());

        let authHeaders = enhancedAuthService.getAuthHeaders();

        // Add development token if needed
        if (!authHeaders['Authorization'] && ENV_CONFIG.IS_DEVELOPMENT) {
          const devToken = `dev_session_${Date.now()}_0xee034b53d4ccb101b2a4faec27708be507197350_${Date.now()}`;
          authHeaders['Authorization'] = `Bearer ${devToken}`;
        }

        const response = await fetch(
          `${BACKEND_API_BASE_URL}/api/comments/${commentId}/replies?${params}`,
          {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              ...authHeaders
            }
          }
        );

        // Handle rate limiting and service unavailable with exponential backoff
        if (response.status === 503 || response.status === 429) {
          if (attempt < maxRetries) {
            const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000; // Add jitter
            console.warn(`Service unavailable (${response.status}), retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue; // Retry
          }
          // Max retries reached
          throw new Error(`Service temporarily unavailable. Please try again later.`);
        }

        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: response.statusText }));
          throw new Error(error.error || `Failed to fetch comment replies: ${response.statusText}`);
        }

        const result = await response.json();
        return result.data || result;
      } catch (error) {
        // If this is the last attempt or a non-retryable error, handle it
        if (attempt === maxRetries || (error instanceof Error && !error.message.includes('Service temporarily unavailable'))) {
          console.error('Error fetching comment replies:', error);
          return []; // Return empty array on error to prevent UI breakage
        }
        // Otherwise, retry on next iteration
      }
    }

    // Fallback (should not reach here)
    return [];
  }

  static async getPost(communityId: string, postId: string): Promise<Post | null> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
    sort: string = 'newest'
  ): Promise<{ posts: CommunityPost[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort
      });

      const authHeaders = enhancedAuthService.getAuthHeaders();
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

  /**
   * Get aggregated feed from all communities the user has joined
   * This is more efficient than fetching from each community individually
   */
  static async getFollowedCommunitiesFeed(
    page: number = 1,
    limit: number = 20,
    sort: string = 'new',
    timeRange: string = 'all'
  ): Promise<{ posts: CommunityPost[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        sort,
        timeRange
      });

      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/feed?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: response.statusText }));
        throw new Error(error.error || `Failed to fetch followed communities feed: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching followed communities feed:', error);
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      let authHeaders = enhancedAuthService.getAuthHeaders();
      const hasAuthToken = authHeaders['Authorization'] && authHeaders['Authorization'] !== 'Bearer null';

      // Debug logging
      console.log('Creating comment:', {
        postId: data.postId,
        hasAuthToken,
        tokenPreview: hasAuthToken ? authHeaders['Authorization']?.substring(0, 20) + '...' : 'none',
        isAuthenticated: enhancedAuthService.isAuthenticated(),
        sessionData: enhancedAuthService.getSessionStatus(),
        allHeaders: authHeaders
      });

      // Add development token if needed
      if (!authHeaders['Authorization'] && ENV_CONFIG.IS_DEVELOPMENT) {
        const devToken = `dev_session_${Date.now()}_0xee034b53d4ccb101b2a4faec27708be507197350_${Date.now()}`;
        authHeaders['Authorization'] = `Bearer ${devToken}`;
        console.log('Using development token');
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${data.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({
          author: data.author,
          content: data.content,
          parentCommentId: data.parentId,
          media: data.media
        })
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        console.error('Comment creation failed:', {
          status: response.status,
          statusText: response.statusText,
          error,
          hasAuthToken,
          requestUrl: `${BACKEND_API_BASE_URL}/api/feed/${data.postId}/comments`,
          requestBody: {
            author: data.author,
            content: data.content,
            parentCommentId: data.parentId,
            media: data.media
          }
        });

        // If authentication failed, try to refresh the token
        if ((response.status === 401 || response.status === 403) && enhancedAuthService.isAuthenticated()) {
          console.log('Attempting to refresh authentication token...');
          try {
            const refreshResult = await enhancedAuthService.refreshToken();
            if (refreshResult.success) {
              console.log('Token refreshed successfully, retrying comment creation...');
              // Retry the request with the new token
              authHeaders = enhancedAuthService.getAuthHeaders();
              const retryResponse = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${data.postId}/comments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...authHeaders
                },
                body: JSON.stringify({
                  author: data.author,
                  content: data.content,
                  parentCommentId: data.parentId,
                  media: data.media
                })
              });

              if (retryResponse.ok) {
                const result = await retryResponse.json();
                return result.data || result;
              }
            }
          } catch (refreshError) {
            console.error('Token refresh failed:', refreshError);
          }
        }

        // Provide helpful error messages
        if (response.status === 401 || response.status === 403) {
          const errorCode = error.error?.code || error.code;
          if (errorCode === 'MISSING_TOKEN' || errorCode === 'NO_TOKEN') {
            throw new Error('Please sign in to comment on posts. Click the wallet icon in the header to connect and authenticate.');
          } else if (errorCode === 'INVALID_TOKEN' || errorCode === 'TOKEN_EXPIRED' || errorCode === 'TOKEN_INVALID' || errorCode === 'TOKEN_VALIDATION_FAILED') {
            throw new Error('Your session has expired. Please refresh the page and sign in again to comment.');
          } else {
            throw new Error('Authentication required. Please sign in to comment on posts.');
          }
        }

        throw new Error(error.error || error.message || `Failed to create comment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string, author: string): Promise<boolean> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify({ author })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete comment: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting comment:', error);
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
      // Backend route expects sortBy parameter
      if (options?.sortBy) {
        params.append('sortBy', options.sortBy);
      }
      if (options?.limit) params.append('limit', options.limit.toString());

      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?${params}`,
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
      // Backend returns { success: true, data: { comments: [...], pagination: {...} } }
      // Extract the comments array from the response
      if (result.data) {
        // If data is an object with a comments property, extract it
        if (typeof result.data === 'object' && result.data.comments && Array.isArray(result.data.comments)) {
          return result.data.comments;
        }
        // If data is already an array, return it (backward compatibility)
        if (Array.isArray(result.data)) {
          return result.data;
        }
      }
      // Fallback: if result is an array, return it
      if (Array.isArray(result)) {
        return result;
      }
      // If result is an object with comments property, extract it
      if (result.comments && Array.isArray(result.comments)) {
        return result.comments;
      }
      // Default: return empty array
      return [];
    } catch (error) {
      console.error('Error fetching post comments:', error);
      throw error;
    }
  }



  static async getPinnedPosts(communityId: string): Promise<CommunityPost[]> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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
      const authHeaders = enhancedAuthService.getAuthHeaders();
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

  static async getPostCommentCount(postId: string): Promise<number> {
    try {
      // Use the same endpoint as getPostComments but with a small limit to just get the count
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/feed/${postId}/comments?limit=1`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch post comments');
      }

      const result = await response.json();
      const comments = result.data || result;
      return Array.isArray(comments) ? comments.length : 0;
    } catch (error) {
      console.error('Error fetching post comment count:', error);
      return 0;
    }
  }
}