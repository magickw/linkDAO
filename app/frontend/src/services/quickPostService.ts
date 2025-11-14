import { QuickPost, CreateQuickPostInput, UpdateQuickPostInput } from '../models/QuickPost';
import { requestManager } from './requestManager';
import { authService } from './authService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * QuickPost API Service
 * Provides functions to interact with the backend quickPost API endpoints
 */
export class QuickPostService {
  /**
   * Create a new quick post
   * @param data - QuickPost data to create
   * @returns The created quick post
   */
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
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-session-id': sessionId,
          ...(csrfToken && { 'x-csrf-token': csrfToken }),
        },
        body: JSON.stringify(data),
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

  /**
   * Get a quick post by its ID
   * @param id - QuickPost ID
   * @returns The quick post or null if not found
   */
  static async getQuickPostById(id: string): Promise<QuickPost | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return null;
        }
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — return null in context where user may not be logged in
          return null;
        }
        if (response.status === 503) {
          // Service unavailable - return null instead of throwing to prevent UI crashes
          console.warn('QuickPost service unavailable (503), returning null');
          return null;
        }
        if (response.status === 429) {
          // Rate limited - return null instead of throwing to prevent UI crashes
          console.warn('QuickPost service rate limited (429), returning null');
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch quick post (HTTP ${response.status})`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get quick posts by author
   * @param author - Author address
   * @returns Array of quick posts by the author
   */
  static async getQuickPostsByAuthor(author: string): Promise<QuickPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/author/${author}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — return empty array in context where user may not be logged in
          return [];
        }
        if (response.status === 503) {
          // Service unavailable - return empty array instead of throwing to prevent UI crashes
          console.warn('QuickPost service unavailable (503), returning empty array');
          return [];
        }
        if (response.status === 429) {
          // Rate limited - return empty array instead of throwing to prevent UI crashes
          console.warn('QuickPost service rate limited (429), returning empty array');
          return [];
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch quick posts (HTTP ${response.status})`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get quick posts by tag
   * @param tag - Tag to filter by
   * @returns Array of quick posts with the tag
   */
  static async getQuickPostsByTag(tag: string): Promise<QuickPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/tag/${tag}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — return empty array in context where user may not be logged in
          return [];
        }
        if (response.status === 503) {
          // Service unavailable - return empty array instead of throwing to prevent UI crashes
          console.warn('QuickPost service unavailable (503), returning empty array');
          return [];
        }
        if (response.status === 429) {
          // Rate limited - return empty array instead of throwing to prevent UI crashes
          console.warn('QuickPost service rate limited (429), returning empty array');
          return [];
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch quick posts (HTTP ${response.status})`);
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get user quick post feed
   * @param forUser - User address to get feed for (optional)
   * @returns Array of quick posts in the user's feed
   */
  static async getQuickPostFeed(forUser?: string): Promise<QuickPost[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/quick-posts/feed`;
      if (forUser) {
        url += `?forUser=${encodeURIComponent(forUser)}`;
      }
      
      console.log(`Fetching quick post feed from: ${url}`);
      
      // Get auth headers from authService to include JWT token
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders // Include auth headers with JWT token
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch quick post feed');
      }
      
      const result = await response.json();
      return result.data || result;
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      console.error(`Error fetching quick post feed:`, error);
      console.log('Error properties:', { 
        isServiceUnavailable: error.isServiceUnavailable, 
        status: error.status, 
        message: error.message,
        name: error.name
      });
      
      // If backend is unavailable, return empty array instead of mock data
      if (error.isServiceUnavailable || error.status === 503 || error.message?.includes('Service temporarily unavailable')) {
        console.log('Backend unavailable, returning empty quick post feed');
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Update an existing quick post
   * @param id - QuickPost ID
   * @param data - Updated quick post data
   * @returns The updated quick post
   */
  static async updateQuickPost(id: string, data: UpdateQuickPostInput): Promise<QuickPost> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — throw appropriate error
          const error = await response.json();
          throw new Error(error.error || 'Unauthorized to update quick post');
        }
        if (response.status === 503) {
          // Service unavailable - throw appropriate error
          console.warn('QuickPost service unavailable (503), cannot update quick post');
          throw new Error('QuickPost service temporarily unavailable. Please try again later.');
        }
        if (response.status === 429) {
          // Rate limited - throw appropriate error
          console.warn('QuickPost service rate limited (429), cannot update quick post');
          throw new Error('Too many requests. Please wait before updating the quick post again.');
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to update quick post (HTTP ${response.status})`);
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
        console.log('Backend unavailable for quick post update');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      throw error;
    }
  }

  /**
   * Delete a quick post
   * @param id - QuickPost ID
   * @returns True if deletion was successful
   */
  static async deleteQuickPost(id: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/quick-posts/${id}`, {
        method: 'DELETE',
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — throw appropriate error
          const error = await response.json();
          throw new Error(error.error || 'Unauthorized to delete quick post');
        }
        if (response.status === 503) {
          // Service unavailable - throw appropriate error
          console.warn('QuickPost service unavailable (503), cannot delete quick post');
          throw new Error('QuickPost service temporarily unavailable. Please try again later.');
        }
        if (response.status === 429) {
          // Rate limited - throw appropriate error
          console.warn('QuickPost service rate limited (429), cannot delete quick post');
          throw new Error('Too many requests. Please wait before deleting another quick post.');
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to delete quick post (HTTP ${response.status})`);
      }
      
      return true;
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      // If backend is unavailable, throw error instead of returning mock data
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.log('Backend unavailable for quick post deletion');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }

      throw error;
    }
  }
}