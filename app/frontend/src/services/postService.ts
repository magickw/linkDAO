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
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create post');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      // If backend is unavailable, return a mock post
      if (error instanceof Error && (error.message.includes('fetch') || error.message.includes('Failed to fetch'))) {
        console.log('Backend unavailable, returning mock post data');
        return {
          id: `mock-${Date.now()}`,
          author: data.author,
          parentId: data.parentId || null,
          contentCid: data.content,
          mediaCids: data.media || [],
          tags: data.tags || [],
          createdAt: new Date(),
          onchainRef: data.onchainRef || ''
        };
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
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch post');
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
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update post');
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
      
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete post');
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
      
      // If backend is unavailable, return mock data
      if (error.isServiceUnavailable || error.status === 503 || error.message?.includes('Service temporarily unavailable')) {
        console.log('Backend unavailable, returning mock feed data');
        return [
          {
            id: 'mock-1',
            author: '0x1234567890123456789012345678901234567890',
            parentId: null,
            contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z4',
            mediaCids: [],
            tags: ['welcome', 'mock'],
            createdAt: new Date(),
            onchainRef: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          },
          {
            id: 'mock-2',
            author: '0x0987654321098765432109876543210987654321',
            parentId: null,
            contentCid: 'bafybeicg6vkh5j5n5z4y4vzgq3v3z4vzgq3v3z4vzgq3v3z4vzgq3v3z5',
            mediaCids: [],
            tags: ['backend', 'status'],
            createdAt: new Date(Date.now() - 60000),
            onchainRef: '0x0987654321abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
          }
        ];
      }
      
      throw error;
    }
  }
}