import { Post, CreatePostInput, UpdatePostInput } from '../models/Post';
import { requestManager } from './requestManager';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Post API Service
 * Provides functions to interact with the backend post API endpoints
 */
export class PostService {
  /**
   * Create a new post
   * @param data - Post data to create
   * @returns The created post
   */
  static async createPost(data: CreatePostInput): Promise<Post> {
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
        const tokenResponse = await fetch(`${BACKEND_API_BASE_URL}/api/csrf-token`, {
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
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts`, {
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
          throw new Error(error.error || 'Unauthorized to create post');
        }
        if (response.status === 503) {
          // Service unavailable - throw appropriate error to prevent data loss
          console.warn('Post service unavailable (503), cannot create post');
          throw new Error('Service temporarily unavailable. Please try again later.');
        }
        if (response.status === 429) {
          // Rate limited - throw appropriate error
          console.warn('Post service rate limited (429), cannot create post');
          throw new Error('Too many requests. Please wait before creating another post.');
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to create post (HTTP ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // If backend is unavailable, throw error instead of returning mock data
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.log('Backend unavailable for post creation');
        throw new Error('Service temporarily unavailable. Please try again later.');
      }
      
      throw error;
    }
  }

  /**
   * Get a post by its ID
   * @param id - Post ID
   * @returns The post or null if not found
   */
  static async getPostById(id: string): Promise<Post | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
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
          console.warn('Post service unavailable (503), returning null');
          return null;
        }
        if (response.status === 429) {
          // Rate limited - return null instead of throwing to prevent UI crashes
          console.warn('Post service rate limited (429), returning null');
          return null;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch post (HTTP ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get posts by author
   * @param author - Author address
   * @returns Array of posts by the author
   */
  static async getPostsByAuthor(author: string): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/author/${author}`, {
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
          console.warn('Post service unavailable (503), returning empty array');
          return [];
        }
        if (response.status === 429) {
          // Rate limited - return empty array instead of throwing to prevent UI crashes
          console.warn('Post service rate limited (429), returning empty array');
          return [];
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch posts (HTTP ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get posts by tag
   * @param tag - Tag to filter by
   * @returns Array of posts with the tag
   */
  static async getPostsByTag(tag: string): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/tag/${tag}`, {
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
          console.warn('Post service unavailable (503), returning empty array');
          return [];
        }
        if (response.status === 429) {
          // Rate limited - return empty array instead of throwing to prevent UI crashes
          console.warn('Post service rate limited (429), returning empty array');
          return [];
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to fetch posts (HTTP ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Update an existing post
   * @param id - Post ID
   * @param data - Updated post data
   * @returns The updated post
   */
  static async updatePost(id: string, data: UpdatePostInput): Promise<Post> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
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
          throw new Error(error.error || 'Unauthorized to update post');
        }
        if (response.status === 503) {
          // Service unavailable - throw appropriate error
          console.warn('Post service unavailable (503), cannot update post');
          throw new Error('Post service temporarily unavailable. Please try again later.');
        }
        if (response.status === 429) {
          // Rate limited - throw appropriate error
          console.warn('Post service rate limited (429), cannot update post');
          throw new Error('Too many requests. Please wait before updating the post again.');
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to update post (HTTP ${response.status})`);
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Delete a post
   * @param id - Post ID
   * @returns True if deleted, false if not found
   */
  static async deletePost(id: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/${id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — return false
          console.warn('Unauthorized to delete post');
          return false;
        }
        if (response.status === 503) {
          // Service unavailable - return false to prevent UI crashes
          console.warn('Post service unavailable (503), cannot delete post');
          return false;
        }
        if (response.status === 429) {
          // Rate limited - return false to prevent UI crashes
          console.warn('Post service rate limited (429), cannot delete post');
          return false;
        }
        const error = await response.json();
        throw new Error(error.error || `Failed to delete post (HTTP ${response.status})`);
      }
      
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get all posts
   * @returns Array of all posts
   */
  static async getAllPosts(): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch posts');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get user feed
   * @param forUser - User address to get feed for (optional)
   * @returns Array of posts in the user's feed
   */
  static async getFeed(forUser?: string): Promise<Post[]> {
    try {
      let url = `${BACKEND_API_BASE_URL}/api/posts/feed`;
      if (forUser) {
        url += `?forUser=${encodeURIComponent(forUser)}`;
      }
      
      console.log(`Fetching feed from: ${url}`);
      
      return await requestManager.request<Post[]>(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      }, {
        timeout: 15000, // Increased timeout for feed requests
        retries: 1, // Reduced retries for feed to prevent spam
        deduplicate: true
      });
    } catch (error: any) {
      console.error(`Error fetching feed:`, error);
      console.log('Error properties:', { 
        isServiceUnavailable: error.isServiceUnavailable, 
        status: error.status, 
        message: error.message,
        name: error.name
      });
      
      // If backend is unavailable, return empty array instead of mock data
      if (error.isServiceUnavailable || error.status === 503 || error.message?.includes('Service temporarily unavailable')) {
        console.log('Backend unavailable, returning empty feed');
        return [];
      }
      
      throw error;
    }
  }

  /**
   * Get posts by community
   * @param communityId - Community ID to get posts for
   * @returns Array of posts in the community
   */
  static async getPostsByCommunity(communityId: string): Promise<Post[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts/community/${communityId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch posts');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
}