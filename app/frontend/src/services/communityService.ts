import { 
  Community, 
  CreateCommunityInput, 
  UpdateCommunityInput 
} from '../models/Community';
import { CommunityOfflineCacheService } from './communityOfflineCacheService';
import { fetchWithRetry, RetryOptions } from './retryUtils';
import { communityPerformanceService } from './communityPerformanceService';
import { requestManager } from './requestManager';
import { communityCircuitBreaker } from './circuitBreaker';
import { globalRequestCoalescer } from '../hooks/useRequestCoalescing';
import { authService } from './authService';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

// Default retry options for community API calls
const COMMUNITY_RETRY_OPTIONS: RetryOptions = {
  maxRetries: 3,
  initialDelay: 1000,
  maxDelay: 10000,
  shouldRetry: (error: any) => {
    // Retry on network errors, 5xx errors, and 429 (rate limited)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return true;
    }
    
    if (error.response) {
      const status = error.response.status;
      return status >= 500 || status === 429 || status === 503;
    }
    
    return false;
  }
};

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
  private static offlineCacheService = CommunityOfflineCacheService.getInstance();

  /**
   * Create a new community
   * @param data - Community data to create
   * @returns The created community
   */
  static async createCommunity(data: CreateCommunityInput): Promise<Community> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities`,
        {
          method: 'POST',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to create community');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'create_community',
          data: { communityData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Community creation queued for when online');
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get a community by its ID with offline support
   * @param id - Community ID
   * @returns The community or null if not found
   */
  static async getCommunityById(id: string): Promise<Community | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${id}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
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
          // Service unavailable - try to get from cache
          const cached = await this.offlineCacheService.getCachedCommunity(id);
          if (cached) {
            console.warn('Community service unavailable (503), returning cached data');
            return cached;
          }
          console.warn('Community service unavailable (503), returning null');
          return null;
        }
        if (response.status === 429) {
          // Rate limited - try to get from cache
          const cached = await this.offlineCacheService.getCachedCommunity(id);
          if (cached) {
            console.warn('Community service rate limited (429), returning cached data');
            return cached;
          }
          console.warn('Community service rate limited (429), returning null');
          return null;
        }
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || `Failed to fetch community (HTTP ${response.status})`);
      }
      
      const json = await safeJson(response);
      const community = (json as Community) || null;
      
      // Track community view for performance metrics
      if (community) {
        // Increment view count
        community.viewCount = (community.viewCount || 0) + 1;
        community.lastActiveAt = new Date();
        
        // Track view event
        communityPerformanceService.trackEvent({
          eventType: 'view_recorded',
          communityId: community.id,
          userId: 'anonymous', // This would be the actual user ID in a real implementation
          timestamp: new Date(),
          metadata: {
            viewCount: community.viewCount
          }
        });
        
        // Cache the community for offline use
        await this.offlineCacheService.cacheCommunity(community);
      }
      
      return community;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, try to get from cache
      if (!this.offlineCacheService.isOnlineStatus()) {
        const cached = await this.offlineCacheService.getCachedCommunity(id);
        if (cached) {
          console.warn('Offline mode, returning cached community data');
          return cached;
        }
      }
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get a community by its name with offline support
   * @param name - Community name (unique identifier)
   * @returns The community or null if not found
   */
  static async getCommunityByName(name: string): Promise<Community | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/name/${name}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
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
   * Get all communities with offline support and request coalescing
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
    // Create cache key based on parameters
    const cacheKey = `communities:${JSON.stringify(params || {})}`;
    
    // Use circuit breaker and request coalescing
    return communityCircuitBreaker.execute(
      () => globalRequestCoalescer.request(
        cacheKey,
        async () => {
          let url = `${BACKEND_API_BASE_URL}/communities`;
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
          
          const response = await requestManager.request(url, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          }, {
            timeout: 15000,
            retries: 2,
            deduplicate: true
          });
          
          // Normalize payload to an array regardless of envelope shape
          let communities: Community[] = [];
          if (Array.isArray(response)) communities = response;
          else if (response && typeof response === 'object' && Array.isArray((response as any)?.data)) communities = (response as any).data;
          else if (response && typeof response === 'object' && Array.isArray((response as any)?.communities)) communities = (response as any).communities;
          else if (response && typeof response === 'object' && (response as any)?.data && Array.isArray((response as any).data?.communities)) communities = (response as any).data.communities;
          else if (response && typeof response === 'object' && Array.isArray((response as any)?.results)) communities = (response as any).results;
          else if (response && typeof response === 'object' && Array.isArray((response as any)?.items)) communities = (response as any).items;
          else if (response && typeof response === 'object' && (response as any)?.data && typeof (response as any).data === 'object' && Array.isArray((response as any).data?.items)) communities = (response as any).data.items;
          else communities = [];

          return communities;
        },
        120000 // 2 minute cache
      ),
      () => {
        // Fallback data when circuit is open
        console.log('Using fallback communities data');
        return [
          {
            id: 'linkdao',
            name: 'LinkDAO',
            description: 'The main LinkDAO community',
            memberCount: 1000,
            isPublic: true,
            category: 'dao',
            tags: ['dao', 'governance'],
            createdAt: new Date(),
            updatedAt: new Date()
          } as Community
        ];
      }
    );
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
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${id}`,
        {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify(data),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to update community');
      }
      
      const json = await safeJson(response);
      const community = json as Community;
      
      // Update cache
      if (community) {
        await this.offlineCacheService.cacheCommunity(community);
      }
      
      return community;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'update_community',
          data: { communityId: id, updateData: data },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Community update queued for when online');
      }
      
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
      // Get authentication headers
      const authHeaders = authService.getAuthHeaders();
      
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/${id}`,
        {
          method: 'DELETE',
          headers: authHeaders,
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        if (response.status === 404) {
          return false;
        }
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || 'Failed to delete community');
      }
      
      // Clear cache
      await this.offlineCacheService.clearCommunityCache(id);
      
      return true;
    } catch (error) {
      clearTimeout(timeoutId);
      
      // If offline, queue the action
      if (!this.offlineCacheService.isOnlineStatus()) {
        await this.offlineCacheService.queueOfflineAction({
          type: 'delete_community',
          data: { communityId: id },
          timestamp: new Date(),
          retryCount: 0,
          maxRetries: 3
        });
        throw new Error('Community deletion queued for when online');
      }
      
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/search?q=${encodeURIComponent(query)}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
      clearTimeout(timeoutId);
      
      // Gracefully handle common non-success statuses
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Unauthenticated/Unauthorized — return empty array in context where user may not be logged in
          return [];
        }
        if (response.status === 503) {
          // Service unavailable - return empty array instead of throwing to prevent UI crashes
          console.warn('Community service unavailable (503), returning empty array');
          return [];
        }
        if (response.status === 429) {
          // Rate limited - return empty array instead of throwing to prevent UI crashes
          console.warn('Community service rate limited (429), returning empty array');
          return [];
        }
        const error = await safeJson(response);
        throw new Error((error && (error.error || error.message)) || `Failed to search communities (HTTP ${response.status})`);
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
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}/communities/trending?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );
      
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