import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { Comment, CreateCommentInput, CommunityPost } from '../models/CommunityPost';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';
import { csrfService } from './csrfService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class CommunityPostService {
  static async createPost(communityId: string, data: CreatePostInput): Promise<Post> {
    try {
      // Get base auth headers from enhancedAuthService
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }
      
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
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

  static async updatePost(communityId: string, postId: string, data: UpdatePostInput): Promise<Post> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
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
        throw new Error(error.error || `Failed to update community post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating community post:', error);
      throw error;
    }
  }

  static async deletePost(communityId: string, postId: string, authorAddress: string): Promise<void> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          authorAddress
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete community post: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting community post:', error);
      throw error;
    }
  }

  static async getPost(communityId: string, postId: string): Promise<Post> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts/${postId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting post:', error);
      throw error;
    }
  }

  static async getPosts(communityId: string, page: number = 1, limit: number = 10, filters?: Record<string, any>): Promise<{ posts: Post[], total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/posts?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get posts: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  }

  static async createComment(data: CreateCommentInput): Promise<Comment> {
    try {
      // Get base auth headers from enhancedAuthService
      let authHeaders = await enhancedAuthService.getAuthHeaders();
      let hasAuthToken = authHeaders['Authorization'] && authHeaders['Authorization'] !== 'Bearer null';

      // Debug logging
      console.log('Creating comment:', {
        postId: data.postId,
        hasAuthToken,
        tokenPreview: hasAuthToken ? authHeaders['Authorization']?.substring(0, 20) + '...' : 'none',
        isAuthenticated: enhancedAuthService.isAuthenticated(),
        sessionData: enhancedAuthService.getSessionStatus(),
        allHeaders: authHeaders
      });

      // Add development token if needed or if auth is invalid
      if ((!hasAuthToken || authHeaders['Authorization'] === 'Bearer null') && ENV_CONFIG.IS_DEVELOPMENT) {
        const devToken = `dev_session_${data.author || '0xee034b53d4ccb101b2a4faec27708be507197350'}_${Date.now()}`;
        authHeaders['Authorization'] = `Bearer ${devToken}`;
        hasAuthToken = true;
        console.log('Using development token');
      }

      // If still no valid auth headers, throw error
      if (!hasAuthToken) {
        throw new Error('No valid authentication token available');
      }

      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      // Use the correct endpoint for creating comments
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${data.postId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
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
          requestUrl: `${BACKEND_API_BASE_URL}/api/posts/${data.postId}/comments`,
          requestBody: {
            author: data.author,
            content: data.content,
            parentCommentId: data.parentId,
            media: data.media
          }
        });

        // If it's a 401 error, try to refresh the session and retry
        if (response.status === 401) {
          try {
            console.log('Attempting to refresh authentication...');
            const refreshResult = await enhancedAuthService.refreshToken();
            
            if (refreshResult.success) {
              console.log('Token refresh successful, retrying request...');
              // Get new auth headers after refresh
              const newAuthHeaders = await enhancedAuthService.getAuthHeaders();
              
              // Add CSRF headers for authenticated requests
              let retryHeaders = { ...newAuthHeaders };
              try {
                const csrfHeaders = await csrfService.getCSRFHeaders();
                Object.assign(retryHeaders, csrfHeaders);
              } catch (error) {
                console.warn('Failed to get CSRF headers for retry:', error);
              }
              
              // Retry the request with fresh token
              const retryResponse = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${data.postId}/comments`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  ...retryHeaders
                },
                body: JSON.stringify({
                  author: data.author,
                  content: data.content,
                  parentCommentId: data.parentId,
                  media: data.media
                })
              });

              if (!retryResponse.ok) {
                const retryError = await retryResponse.json().catch(() => ({}));
                throw new Error(retryError.error || `Failed to create comment after retry: ${retryResponse.statusText}`);
              }

              const retryResult = await retryResponse.json();
              return retryResult.data || retryResult;
            } else {
              throw new Error('Authentication refresh failed');
            }
          } catch (refreshError) {
            console.error('Authentication refresh failed:', refreshError);
            throw new Error('Authentication refresh failed');
          }
        }

        throw new Error(error.error || `Failed to create comment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating comment:', error);
      throw error;
    }
  }

  static async getCommentReplies(commentId: string): Promise<Comment[]> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}/replies`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get comment replies: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting comment replies:', error);
      throw error;
    }
  }

  static async deleteComment(commentId: string, authorAddress: string): Promise<void> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          authorAddress
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to delete comment: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw error;
    }
  }

  static async voteComment(commentId: string, voteType: 'upvote' | 'downvote'): Promise<void> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn(' failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}/vote`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          voteType
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to vote on comment: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Error voting on comment:', error);
      throw error;
    }
  }

  static async updateComment(commentId: string, content: string): Promise<Comment> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRF();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/comments/${commentId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: JSON.stringify({
          content,
          isEdited: true
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update comment: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating comment:', error);
      throw error;
    }
  }

  static async getCommunity(communityId: string): Promise<CommunityPost> {
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get community: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting community:', error);
      throw error;
    }
  }

  static async getCommunities(page: number = 1, limit: number = 10): Promise<{ communities: CommunityPost[], total: number; page: number; totalPages: number }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`Failed to get communities: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting communities:', error);
      throw error;
    }
  }

  static async joinCommunity(communityId: string): Promise<any> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to join community: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error joining community:', error);
      throw error;
    }
  }

  static async leaveCommunity(communityId: string): Promise<any> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/leave`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to leave community: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error leaving community:', error);
      throw error;
    }
  }

  static async getMembershipStatus(communityId: string): Promise<any> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      
      // Add CSRF headers for authenticated requests
      let headers = { ...authHeaders };
      try {
        const csrfHeaders = await csrfService.getCSRFHeaders();
        Object.assign(headers, csrfHeaders);
      } catch (error) {
        console.warn('Failed to get CSRF headers:', error);
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/membership/status`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...headers
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to get membership status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting membership status:', error);
      throw error;
    }
  }
}

export default CommunityPostService;