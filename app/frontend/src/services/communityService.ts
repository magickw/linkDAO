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
import { enhancedAuthService } from './enhancedAuthService';
import { cacheInvalidationService } from './communityCache';

// Get the backend API base URL from environment variables
import { API_BASE_URL, API_ENDPOINTS } from '../config/api';
const BACKEND_API_BASE_URL = API_BASE_URL;

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
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}`,
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
      // Check if we're offline
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        console.log(`[communityService] Offline, attempting to fetch community ${id} from cache`);
        const cachedCommunity = await this.offlineCacheService.getCachedCommunity(id);
        if (cachedCommunity) {
          return cachedCommunity;
        }
        // If not in cache and offline, we can't do anything
        return null;
      }

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${id}`,
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
          // Suppress warning for 404s as they are expected for deleted/missing communities
          console.debug(`[communityService] Community not found with ID: ${id}`);
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

          // Add a small delay before retrying to avoid overwhelming the service
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
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
        // For other errors, throw to be caught by outer catch
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`Failed to fetch community (${response.status} ${response.statusText}): ${errorText}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        return null;
      }

      const community = data.data;

      // Cache the community for offline support
      await this.offlineCacheService.cacheCommunity(community);

      return community;
    } catch (error) {
      clearTimeout(timeoutId);

      // Try to get from cache on network errors
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError')) {
        const cached = await this.offlineCacheService.getCachedCommunity(id);
        if (cached) {
          console.warn('Network error, returning cached community data');
          return cached;
        }
      }

      console.error('Error fetching community:', error);
      return null;
    }
  }

  /**
   * Get a community by its slug with offline support
   * @param slug - Community slug
   * @returns The community or null if not found
   */
  static async getCommunityBySlug(slug: string): Promise<Community | null> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${slug}`,
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
          const cached = await this.offlineCacheService.getCachedCommunity(slug);
          if (cached) {
            console.warn('Community service unavailable (503), returning cached data');
            return cached;
          }
          console.warn('Community service unavailable (503), returning null');

          // Add a small delay before retrying to avoid overwhelming the service
          await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
          return null;
        }
        if (response.status === 429) {
          // Rate limited - try to get from cache
          const cached = await this.offlineCacheService.getCachedCommunity(slug);
          if (cached) {
            console.warn('Community service rate limited (429), returning cached data');
            return cached;
          }
          console.warn('Community service rate limited (429), returning null');
          return null;
        }
        // For other errors, throw to be caught by outer catch
        throw new Error(`Failed to fetch community by slug: ${response.status}`);
      }

      const data = await response.json();

      // Handle different response structures
      if (!data.success && !data.data && !Array.isArray(data) && typeof data === 'object') {
        // If data is already a community object, return it
        if (data.id && data.name) {
          // Cache the community for offline support
          await this.offlineCacheService.cacheCommunity(data);
          return data;
        }
        return null;
      }

      if (!data.success || !data.data) {
        return null;
      }

      const community = data.data;

      // Cache the community for offline support
      await this.offlineCacheService.cacheCommunity(community);

      return community;
    } catch (error) {
      clearTimeout(timeoutId);

      // Try to get from cache on network errors
      if (error instanceof Error && (error.name === 'AbortError' || error.name === 'TypeError')) {
        const cached = await this.offlineCacheService.getCachedCommunity(slug);
        if (cached) {
          console.warn('Network error, returning cached community data');
          return cached;
        }
      }

      console.error('Error fetching community by slug:', error);
      return null;
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
          let url = `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}`;
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

          try {
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
          } catch (error) {
            // Handle specific error cases with better fallbacks
            console.error('Error fetching communities:', error);

            // Try to get from offline cache - we'll use fallback data since there's no method to get all communities
            console.warn('Network error, but no cached communities available');
            return [];

            // Return empty array instead of throwing to prevent UI crashes
            console.warn('Returning empty communities array due to persistent errors');
            return [];
          }
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
 * Get communities that belong to the current user (both created and member of)
 * @param page - Page number (default: 1)
 * @param limit - Number of items per page (default: 100)
 * @returns Paginated list of user's communities
 */
  static async getMyCommunities(page: number = 1, limit: number = 100): Promise<{ communities: Community[]; pagination: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/my-communities?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...enhancedAuthService.getAuthHeaders(),
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        // If 401, user is not authenticated - return empty list instead of throwing
        if (response.status === 401) {
          console.warn('User not authenticated, returning empty community list');
          return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
        }
        throw new Error((json && (json.error || json.message)) || 'Failed to fetch my communities');
      }

      // Normalize payload to expected structure
      // Backend wraps response in createSuccessResponse({ communities, pagination })
      // which creates: { success: true, data: { communities: [...], pagination: {...} } }
      if (json && typeof json === 'object') {
        // Check wrapped response first (most common case)
        if (json.data && typeof json.data === 'object') {
          if (Array.isArray(json.data.communities)) {
            return {
              communities: json.data.communities,
              pagination: json.data.pagination || { page: 1, limit, total: json.data.communities.length, totalPages: 1 }
            };
          }
        }
        // Fallback: Check direct structure (for backwards compatibility)
        if (Array.isArray(json.communities)) {
          return {
            communities: json.communities,
            pagination: json.pagination || { page: 1, limit, total: json.communities.length, totalPages: 1 }
          };
        }
      }
      // Fallback: If response is a plain array
      if (Array.isArray(json)) {
        return { communities: json, pagination: { page: 1, limit, total: json.length, totalPages: 1 } };
      }
      // Default: Return empty
      console.warn('Unexpected response structure from getMyCommunities:', json);
      return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }

      throw error;
    }
  }

  /**
   * Get communities created by the current user
   * @param page - Page number (default: 1)
   * @param limit - Number of items per page (default: 100)
   * @returns Paginated list of user's created communities
   */
  static async getMyCreatedCommunities(page: number = 1, limit: number = 100): Promise<{ communities: Community[]; pagination: any }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/user/created?page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...enhancedAuthService.getAuthHeaders(),
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        // If 401, user is not authenticated - return empty list instead of throwing
        if (response.status === 401) {
          console.warn('User not authenticated, returning empty created communities list');
          return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
        }
        // If 404, endpoint might not exist yet - return empty list
        if (response.status === 404) {
          console.warn('Created communities endpoint not found, returning empty list');
          return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
        }
        throw new Error((json && (json.error || json.message)) || 'Failed to fetch created communities');
      }

      // Normalize payload to expected structure
      // Backend wraps response in createSuccessResponse({ communities, pagination })
      // which creates: { success: true, data: { communities: [...], pagination: {...} } }
      if (json && typeof json === 'object') {
        // Check wrapped response first (most common case)
        if (json.data && typeof json.data === 'object') {
          if (Array.isArray(json.data.communities)) {
            return {
              communities: json.data.communities,
              pagination: json.data.pagination || { page: 1, limit, total: json.data.communities.length, totalPages: 1 }
            };
          }
        }
        // Fallback: Check direct structure (for backwards compatibility)
        if (Array.isArray(json.communities)) {
          return {
            communities: json.communities,
            pagination: json.pagination || { page: 1, limit, total: json.communities.length, totalPages: 1 }
          };
        }
      }
      // Fallback: If response is a plain array
      if (Array.isArray(json)) {
        return { communities: json, pagination: { page: 1, limit, total: json.length, totalPages: 1 } };
      }
      // Default: Return empty
      console.warn('Unexpected response structure from getMyCreatedCommunities:', json);
      return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
    } catch (error) {
      clearTimeout(timeoutId);

      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Request timeout fetching created communities, returning empty list');
        return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
      }

      // Return empty list instead of throwing to prevent UI crashes
      console.warn('Error fetching created communities, returning empty list:', error);
      return { communities: [], pagination: { page: 1, limit, total: 0, totalPages: 0 } };
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
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/name/${name}`,
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
   * Get user's community memberships
   * @returns Array of community IDs that the user has joined
   */
  static async getUserCommunityMemberships(): Promise<string[]> {
    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/user/memberships`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...enhancedAuthService.getAuthHeaders(),
          },
        },
        COMMUNITY_RETRY_OPTIONS
      );

      if (!response.ok) {
        throw new Error(`Failed to fetch user community memberships: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !data.data) {
        return [];
      }

      // Return array of community IDs
      return data.data.map((membership: any) => membership.communityId);
    } catch (error) {
      console.error('Error fetching user community memberships:', error);
      return [];
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
      // Get authentication headers
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${id}`,
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
      // Handle backend's wrapped response structure: { success: true, data: {...} }
      const community = (json?.data || json) as Community;

      // Update cache
      if (community) {
        await this.offlineCacheService.cacheCommunity(community);
        
        // Invalidate community cache when avatar is updated
        if (data.avatar !== undefined) {
          cacheInvalidationService.invalidateCommunity(id);
        }
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
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${id}`,
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
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/search?q=${encodeURIComponent(query)}&limit=${limit}`,
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
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/trending?limit=${limit}`,
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

  /**
   * Vote on a governance proposal
   * @param communityId - Community ID
   * @param proposalId - Proposal ID
   * @param vote - Vote type ('yes', 'no', 'abstain')
   * @param stakeAmount - Amount of tokens to stake
   * @returns Vote result
   */
  static async voteOnProposal(
    communityId: string,
    proposalId: string,
    vote: 'yes' | 'no' | 'abstain',
    stakeAmount: number = 0
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/governance/${proposalId}/vote`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ vote, stakeAmount }),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to cast vote');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Create a delegation
   * @param communityId - Community ID
   * @param delegatorAddress - Address of the delegator
   * @param delegateAddress - Address of the delegate
   * @param expiryDate - Optional expiry date
   * @param metadata - Optional metadata
   * @returns Delegation result
   */
  static async createDelegation(
    communityId: string,
    delegatorAddress: string,
    delegateAddress: string,
    expiryDate?: Date,
    metadata?: any
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/delegations`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            delegatorAddress,
            delegateAddress,
            expiryDate: expiryDate?.toISOString(),
            metadata
          }),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to create delegation');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Revoke a delegation
   * @param communityId - Community ID
   * @param delegatorAddress - Address of the delegator
   * @returns Revoke result
   */
  static async revokeDelegation(
    communityId: string,
    delegatorAddress: string
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/delegations`,
        {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({ delegatorAddress }),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to revoke delegation');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get delegations received as a delegate
   * @param communityId - Community ID
   * @param delegateAddress - Address of the delegate
   * @param page - Page number
   * @param limit - Page limit
   * @returns Delegations list
   */
  static async getDelegationsAsDelegate(
    communityId: string,
    delegateAddress: string,
    page: number = 1,
    limit: number = 10
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/delegations?delegateAddress=${delegateAddress}&page=${page}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to get delegations');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Create a proxy vote
   * @param proposalId - Proposal ID
   * @param proxyAddress - Address of the proxy
   * @param voterAddress - Address of the voter
   * @param vote - Vote type
   * @param reason - Optional reason
   * @returns Proxy vote result
   */
  static async createProxyVote(
    proposalId: string,
    proxyAddress: string,
    voterAddress: string,
    vote: 'yes' | 'no' | 'abstain',
    reason?: string
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/proxy-votes`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            proposalId,
            proxyAddress,
            voterAddress,
            vote,
            reason
          }),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to create proxy vote');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Create a subscription tier
   * @param communityId - Community ID
   * @param tierData - Subscription tier data
   * @returns Created tier
   */
  static async createSubscriptionTier(
    communityId: string,
    tierData: {
      name: string;
      description?: string;
      price: string;
      currency: string;
      benefits: string[];
      accessLevel: 'view' | 'interact' | 'full';
      durationDays?: number;
      metadata?: any;
    }
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/subscription-tiers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify(tierData),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to create subscription tier');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get subscription tiers for a community
   * @param communityId - Community ID
   * @returns Subscription tiers
   */
  static async getSubscriptionTiers(communityId: string): Promise<any[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/subscription-tiers`,
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

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to get subscription tiers');
      }

      return json.data || [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Subscribe user to a tier
   * @param communityId - Community ID
   * @param tierId - Tier ID
   * @param paymentTxHash - Optional payment transaction hash
   * @param metadata - Optional metadata
   * @returns Subscription result
   */
  static async subscribeUser(
    communityId: string,
    tierId: string,
    paymentTxHash?: string,
    metadata?: any
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/subscriptions`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          body: JSON.stringify({
            tierId,
            paymentTxHash,
            metadata
          }),
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to subscribe user');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get user subscriptions
   * @param communityId - Community ID
   * @returns User subscriptions
   */
  static async getUserSubscriptions(communityId: string): Promise<any[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/${communityId}/subscriptions`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders,
          },
          signal: controller.signal,
        },
        COMMUNITY_RETRY_OPTIONS
      );

      clearTimeout(timeoutId);

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to get user subscriptions');
      }

      return json.data || [];
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Search communities
   * @param query - Search query
   * @param options - Search options
   * @returns Search results
   */
  static async searchCommunitiesAdvanced(
    query: string,
    options: {
      page?: number;
      limit?: number;
      category?: string;
      sort?: 'relevance' | 'newest' | 'members' | 'posts' | 'name';
    } = {}
  ): Promise<any> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const params = new URLSearchParams({
        q: query,
        page: String(options.page || 1),
        limit: String(options.limit || 10),
        sort: options.sort || 'relevance',
        ...(options.category && { category: options.category })
      });

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/search/query?${params}`,
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

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to search communities');
      }

      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Get feed from followed communities
   * @param options - Feed options
   * @returns Feed with posts and pagination
   */
  static async getFollowedCommunitiesFeed(options: {
    page: number;
    limit: number;
    sort: string;
    timeRange: string;
  }): Promise<{ posts: any[]; pagination: any }> {
    try {
      const authHeaders = enhancedAuthService.getAuthHeaders();
      const params = new URLSearchParams({
        page: options.page.toString(),
        limit: options.limit.toString(),
        sort: options.sort,
        timeRange: options.timeRange
      });

      const response = await fetchWithRetry(
        `${BACKEND_API_BASE_URL}${API_ENDPOINTS.COMMUNITIES}/feed?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...authHeaders
          }
        },
        COMMUNITY_RETRY_OPTIONS
      );

      const json = await safeJson(response);

      if (!response.ok) {
        throw new Error((json && (json.error || json.message)) || 'Failed to fetch community feed');
      }

      return json || { posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    } catch (error) {
      console.error('Error fetching community feed:', error);
      return { posts: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
  }
}