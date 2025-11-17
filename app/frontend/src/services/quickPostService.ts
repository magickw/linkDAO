import { QuickPost, CreateQuickPostInput, UpdateQuickPostInput } from '../models/QuickPost';
import { ENV_CONFIG } from '@/config/environment';
import { authService } from './authService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class QuickPostService {
  static async createQuickPost(data: CreateQuickPostInput): Promise<QuickPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    // Get or create session ID
    let sessionId = localStorage.getItem('sessionId');
    if (!sessionId) {
      sessionId = crypto.randomUUID();
      localStorage.setItem('sessionId', sessionId);
    }
    
    // Fetch CSRF token
    let csrfToken = sessionStorage.getItem('csrfToken');
    if (!csrfToken) {
      try {
        const tokenResponse = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/csrf-token`, {
          headers: { 'x-session-id': sessionId }
        });
        if (tokenResponse.ok) {
          const { data } = await tokenResponse.json();
          csrfToken = data.csrfToken;
          sessionStorage.setItem('csrfToken', csrfToken);
        }
      } catch (e) {
        console.error('Failed to fetch CSRF token:', e);
      }
    }
    
    try {
      // Get auth headers from authService to include JWT token
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          ...(csrfToken && { 'x-csrf-token': csrfToken }),
          ...authHeaders // Include auth headers with JWT token
        },
        body: JSON.stringify({
          content: data.content,
          author: data.author,
          parentId: data.parentId,
          media: data.media,
          tags: data.tags,
          onchainRef: data.onchainRef,
          poll: data.poll,
          proposal: data.proposal
        }),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — throw appropriate error
          const error = await response.json();
          throw new Error(error.error || 'Unauthorized to create quick post');
        }
        if (response.status === 503) {
          // Service unavailable - throw appropriate error to prevent data loss
          console.warn('QuickPost service unavailable (503), cannot create quick post');
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        if (response.status === 429) {
          // Rate limited - throw appropriate error
          console.warn('QuickPost service rate limited (429), cannot create quick post');
          throw new Error('Too many requests. Please wait before creating another quick post.');
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to create quick post (HTTP ${response.status})`);
      }
      
      const result = await response.json();
      return result.data || result;
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
      const authHeaders = authService.getAuthHeaders();
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
      const authHeaders = authService.getAuthHeaders();
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
      const authHeaders = authService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
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

      const authHeaders = authService.getAuthHeaders();
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
      const authHeaders = authService.getAuthHeaders();
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
      const authHeaders = authService.getAuthHeaders();
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