import { QuickPost, CreateQuickPostInput, UpdateQuickPostInput } from '../models/QuickPost';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class QuickPostService {
  static async createQuickPost(data: CreateQuickPostInput): Promise<QuickPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout (allows for IPFS uploads)

    // Get or create session ID
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }

    // Fetch CSRF token with timeout
    let csrfToken = sessionStorage.getItem('csrfToken');
    if (!csrfToken) {
      try {
        const csrfController = new AbortController();
        const csrfTimeoutId = setTimeout(() => csrfController.abort(), 5000); // 5 second timeout for CSRF

        const tokenResponse = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/csrf-token`, {
          headers: { 'x-session-id': sessionId },
          signal: csrfController.signal
        });

        clearTimeout(csrfTimeoutId);

        if (tokenResponse.ok) {
          const { data } = await tokenResponse.json();
          csrfToken = data.csrfToken;
          sessionStorage.setItem('csrfToken', csrfToken);
        }
      } catch (e) {
        console.error('Failed to fetch CSRF token:', e);
        // Continue without CSRF token - backend should handle this gracefully
      }
    }

    try {
      // Get auth headers from enhancedAuthService to include JWT token
      let authHeaders = enhancedAuthService.getAuthHeaders();
      
      // Check if we have a valid token
      if (!authHeaders['Authorization']) {
        // For development mode, create a development token
        if (ENV_CONFIG.IS_DEVELOPMENT) {
          const devToken = `dev_session_${Date.now()}_0xee034b53d4ccb101b2a4faec27708be507197350_${Date.now()}`;
          authHeaders['Authorization'] = `Bearer ${devToken}`;
        } else {
          throw new Error('Authentication required. Please log in again.');
        }
      }

      // Use global fetch wrapper which handles token refresh automatically
      const { post } = await import('./globalFetchWrapper');
      const response = await post(`${BACKEND_API_BASE_URL}/api/quick-posts`, {
        content: data.content,
        parentId: data.parentId,
        media: data.media,
        tags: data.tags,
        onchainRef: data.onchainRef,
        poll: data.poll,
        proposal: data.proposal
      });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create quick post');
      }

      return response.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // If backend is unavailable, throw error instead of returning mock data
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.log('Backend unavailable for quick post creation');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      throw error;
    }
  }

  static async getQuickPost(id: string): Promise<QuickPost | null> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
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
        throw new Error(`Failed to fetch quick post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching quick post:', error);
      throw error;
    }
  }

  static async updateQuickPost(id: string, data: UpdateQuickPostInput): Promise<QuickPost> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update quick post: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating quick post:', error);
      throw error;
    }
  }

  static async deleteQuickPost(id: string): Promise<boolean> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      
      // Check if we have a valid token
      if (!authHeaders['Authorization']) {
        throw new Error('Authentication required. Please log in again.');
      }
      
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
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
        const error = await response.json().catch(() => ({}));
        throw new Error(error.error || `Failed to delete quick post: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting quick post:', error);
      throw error;
    }
  }

  static async getQuickPostsByAuthor(
    authorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: QuickPost[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/author/${authorId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch quick posts: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching quick posts by author:', error);
      throw error;
    }
  }

  static async addReaction(
    quickPostId: string,
    type: string,
    tokenAmount: number = 0
  ): Promise<any> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${quickPostId}/react`, {
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
      console.error('Error adding reaction to quick post:', error);
      throw error;
    }
  }

  static async sendTip(
    quickPostId: string,
    amount: number,
    tokenType: string,
    message?: string
  ): Promise<any> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${quickPostId}/tip`, {
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
      console.error('Error sending tip to quick post:', error);
      throw error;
    }
  }
}