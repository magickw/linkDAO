import { 
  Community, 
  CreateCommunityInput, 
  UpdateCommunityInput 
} from '../models/Community';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Community API Service
 * Provides functions to interact with the backend community API endpoints
 */
// Helper to safely parse JSON without throwing if body is empty or non-JSON
async function safeJson(response: Response): Promise<any> {
  try {
    const ct = response.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return null;
    return await response.json();
  } catch {
    return null;
  }
}

export class CommunityService {
  /**
   * Create a new community
   * @param data - Community data to create
   * @returns The created community
   */
  static async createCommunity(data: CreateCommunityInput): Promise<Community> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to create community');
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
   * Get a community by its ID
   * @param id - Community ID
   * @returns The community or null if not found
   */
  static async getCommunityById(id: string): Promise<Community | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${id}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
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
          console.warn('Community service unavailable (503), returning null');
          return null;
        }
        if (response.status === 429) {
          // Rate limited - return null instead of throwing to prevent UI crashes
          console.warn('Community service rate limited (429), returning null');
          return null;
        }
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || `Failed to fetch community (HTTP ${response.status})`);
      }
      
      const json = await safeJson(response);
      return (json as Community) || null;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get a community by its name
   * @param name - Community name (unique identifier)
   * @returns The community or null if not found
   */
  static async getCommunityByName(name: string): Promise<Community | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/name/${name}`, {
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
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to fetch community');
      }
      
      const json = await safeJson(response);
      return (json as Community) || null;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get all communities
   * @param params - Optional query parameters
   * @returns Array of communities
   */
  static async getAllCommunities(params?: {
    category?: string;
    tags?: string[];
    isPublic?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<Community[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      let url = `${BACKEND_API_BASE_URL}/api/communities`;
      const searchParams = new URLSearchParams();
      
      if (params) {
        if (params.category) searchParams.append('category', params.category);
        if (params.tags) searchParams.append('tags', params.tags.join(','));
        if (params.isPublic !== undefined) searchParams.append('isPublic', params.isPublic.toString());
        if (params.limit) searchParams.append('limit', params.limit.toString());
        if (params.offset) searchParams.append('offset', params.offset.toString());
      }
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to fetch communities');
      }
      
      const json = await safeJson(response);
      // Normalize payload to an array regardless of envelope shape
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.communities)) return json.communities;
      if (Array.isArray(json?.results)) return json.results;
      if (Array.isArray(json?.items)) return json.items;
      if (Array.isArray(json?.data?.items)) return json.data.items;
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Update an existing community
   * @param id - Community ID
   * @param data - Updated community data
   * @returns The updated community
   */
  static async updateCommunity(id: string, data: UpdateCommunityInput): Promise<Community> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to update community');
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
   * Delete a community
   * @param id - Community ID
   * @returns True if deleted, false if not found
   */
  static async deleteCommunity(id: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${id}`, {
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
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to delete community');
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
   * Search communities by name or description
   * @param query - Search query
   * @param limit - Maximum number of results
   * @returns Array of matching communities
   */
  static async searchCommunities(query: string, limit: number = 20): Promise<Community[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/search?q=${encodeURIComponent(query)}&limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to search communities');
      }
      
      const json = await safeJson(response);
      // Normalize payload to an array regardless of envelope shape
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.communities)) return json.communities;
      if (Array.isArray(json?.results)) return json.results;
      if (Array.isArray(json?.items)) return json.items;
      if (Array.isArray(json?.data?.items)) return json.data.items;
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get trending communities
   * @param limit - Maximum number of results
   * @returns Array of trending communities
   */
  static async getTrendingCommunities(limit: number = 10): Promise<Community[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/trending?limit=${limit}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to fetch trending communities');
      }
      
      const json = await safeJson(response);
      // Normalize payload to an array regardless of envelope shape
      if (Array.isArray(json)) return json;
      if (Array.isArray(json?.data)) return json.data;
      if (Array.isArray(json?.communities)) return json.communities;
      if (Array.isArray(json?.results)) return json.results;
      if (Array.isArray(json?.items)) return json.items;
      if (Array.isArray(json?.data?.items)) return json.data.items;
      return [];
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }
}