import { Status, CreateStatusInput, UpdateStatusInput } from '../models/Status';
import { ENV_CONFIG } from '@/config/environment';
import { enhancedAuthService } from './enhancedAuthService';

// Use centralized environment config to ensure consistent backend URL
const BACKEND_API_BASE_URL = ENV_CONFIG.BACKEND_URL;

export class StatusService {
  static async createStatus(data: CreateStatusInput): Promise<Status> {
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

        const tokenResponse = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/csrf-token`, {
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
      let authHeaders = await enhancedAuthService.getAuthHeaders();

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

      // Add session ID and CSRF token to headers
      const headers = {
        ...authHeaders,
        'x-session-id': sessionId
      };

      if (csrfToken) {
        headers['x-csrf-token'] = csrfToken;
      }

      // Use global fetch wrapper which handles token refresh automatically
      const { post } = await import('./globalFetchWrapper');
      const response = await post(`${BACKEND_API_BASE_URL}/api/statuses`, {
        content: data.content,
        parentId: data.parentId,
        media: data.media,
        tags: data.tags,
        onchainRef: data.onchainRef,
        poll: data.poll,
        proposal: data.proposal
      }, { headers });

      if (!response.success) {
        throw new Error(response.error || 'Failed to create status');
      }

      return response.data;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // If backend is unavailable, throw error instead of returning mock data
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.log('Backend unavailable for status creation');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      throw error;
    }
  }

  static async getStatus(id: string): Promise<Status | null> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${id}`, {
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
        throw new Error(`Failed to fetch status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching status:', error);
      throw error;
    }
  }

  static async updateStatus(id: string, data: UpdateStatusInput): Promise<Status> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        },
        body: JSON.stringify(data)
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to update status: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error updating status:', error);
      throw error;
    }
  }

  static async deleteStatus(id: string): Promise<boolean> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();

      // Check if we have a valid token
      if (!authHeaders['Authorization']) {
        throw new Error('Authentication required. Please log in again.');
      }

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${id}`, {
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
        throw new Error(error.error || `Failed to delete status: ${response.statusText}`);
      }

      return true;
    } catch (error) {
      console.error('Error deleting status:', error);
      throw error;
    }
  }

  static async getStatusesByAuthor(
    authorId: string,
    page: number = 1,
    limit: number = 20
  ): Promise<{ posts: Status[]; pagination: any }> {
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString()
      });

      const authHeaders = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/author/${authorId}?${params}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders
        }
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch statuses: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error fetching statuses by author:', error);
      throw error;
    }
  }

  static async addReaction(
    statusId: string,
    type: string,
    tokenAmount: number = 0
  ): Promise<any> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${statusId}/react`, {
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
        // Handle 401 errors specifically
        if (response.status === 401) {
          console.error('Authentication error: Session expired');
          // Try to refresh the session and retry once
          try {
            await enhancedAuthService.refreshToken();
            const retryAuthHeaders = await enhancedAuthService.getAuthHeaders();
            const retryResponse = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${statusId}/react`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                ...retryAuthHeaders
              },
              body: JSON.stringify({
                type,
                tokenAmount
              })
            });

            if (retryResponse.ok) {
              const result = await retryResponse.json();
              return result.data || result;
            }
          } catch (retryError) {
            console.error('Retry after token refresh failed:', retryError);
          }

          throw new Error('Your session has expired. Please refresh the page and sign in again.');
        }

        const error = await response.json();
        throw new Error(error.error || `Failed to add reaction: ${response.statusText}`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error reacting:', error);
      throw error;
    }
  }

  static async sendTip(
    statusId: string,
    amount: number,
    tokenType: string,
    message?: string
  ): Promise<any> {
    try {
      const authHeaders = await enhancedAuthService.getAuthHeaders();
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/statuses/${statusId}/tip`, {
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
      console.error('Error sending tip to status:', error);
      throw error;
    }
  }
}