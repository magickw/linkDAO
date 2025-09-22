import { Post } from '../models/Post';
import { Community } from '../models/Community';
import { UserProfile } from '../models/UserProfile';

// Get the backend API base URL from environment variables
const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

export interface SearchFilters {
  type?: 'all' | 'posts' | 'communities' | 'users';
  timeRange?: 'all' | 'hour' | 'day' | 'week' | 'month' | 'year';
  sortBy?: 'relevance' | 'recent' | 'popular' | 'trending';
  category?: string;
  tags?: string[];
  author?: string;
  community?: string;
}

export interface SearchResults {
  posts: Post[];
  communities: Community[];
  users: UserProfile[];
  hashtags: string[];
  totalResults: number;
  hasMore: boolean;
}

export interface TrendingContent {
  posts: Post[];
  communities: Community[];
  hashtags: string[];
  topics: string[];
}

export interface RecommendationOptions {
  userId?: string;
  limit?: number;
  excludeJoined?: boolean;
  basedOn?: 'activity' | 'interests' | 'network' | 'trending';
}

/**
 * Search and Discovery API Service
 * Provides comprehensive search, trending, and recommendation functionality
 */
export class SearchService {
  /**
   * Perform a comprehensive search across posts, communities, and users
   * @param query - Search query string
   * @param filters - Optional search filters
   * @param limit - Maximum number of results per type
   * @param offset - Pagination offset
   * @returns Search results
   */
  static async search(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<SearchResults> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout for search
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Search failed');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Search posts with advanced filtering
   * @param query - Search query
   * @param filters - Post-specific filters
   * @param limit - Maximum results
   * @param offset - Pagination offset
   * @returns Array of matching posts
   */
  static async searchPosts(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: Post[]; hasMore: boolean; total: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/posts?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Post search failed');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Search communities with filters
   * @param query - Search query
   * @param filters - Community-specific filters
   * @param limit - Maximum results
   * @param offset - Pagination offset
   * @returns Array of matching communities
   */
  static async searchCommunities(
    query: string,
    filters: SearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ communities: Community[]; hasMore: boolean; total: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/communities?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Community search failed');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Search users/profiles
   * @param query - Search query
   * @param limit - Maximum results
   * @param offset - Pagination offset
   * @returns Array of matching users
   */
  static async searchUsers(
    query: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ users: UserProfile[]; hasMore: boolean; total: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/users?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'User search failed');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get trending content across the platform
   * @param timeRange - Time range for trending calculation
   * @param limit - Maximum results per category
   * @returns Trending content
   */
  static async getTrendingContent(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 10
  ): Promise<TrendingContent> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/trending?timeRange=${timeRange}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch trending content');
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
   * Get trending hashtags
   * @param timeRange - Time range for trending calculation
   * @param limit - Maximum number of hashtags
   * @returns Array of trending hashtags with counts
   */
  static async getTrendingHashtags(
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 20
  ): Promise<{ tag: string; count: number; growth: number }[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/trending/hashtags?timeRange=${timeRange}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch trending hashtags');
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
   * Get community recommendations for a user
   * @param options - Recommendation options
   * @returns Array of recommended communities
   */
  static async getRecommendedCommunities(
    options: RecommendationOptions = {}
  ): Promise<Community[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams();
      if (options.userId) searchParams.append('userId', options.userId);
      if (options.limit) searchParams.append('limit', options.limit.toString());
      if (options.excludeJoined) searchParams.append('excludeJoined', 'true');
      if (options.basedOn) searchParams.append('basedOn', options.basedOn);

      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/recommendations/communities?${searchParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch community recommendations');
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
   * Get user recommendations (people to follow)
   * @param options - Recommendation options
   * @returns Array of recommended users
   */
  static async getRecommendedUsers(
    options: RecommendationOptions = {}
  ): Promise<UserProfile[]> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams();
      if (options.userId) searchParams.append('userId', options.userId);
      if (options.limit) searchParams.append('limit', options.limit.toString());
      if (options.basedOn) searchParams.append('basedOn', options.basedOn);

      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/recommendations/users?${searchParams}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user recommendations');
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
   * Get posts by hashtag
   * @param hashtag - Hashtag to search for (without #)
   * @param filters - Additional filters
   * @param limit - Maximum results
   * @param offset - Pagination offset
   * @returns Posts containing the hashtag
   */
  static async getPostsByHashtag(
    hashtag: string,
    filters: SearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<{ posts: Post[]; hasMore: boolean; total: number }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        hashtag: hashtag.replace('#', ''),
        limit: limit.toString(),
        offset: offset.toString(),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/hashtags/${hashtag.replace('#', '')}/posts?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch hashtag posts');
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
   * Get topic-based content discovery
   * @param topic - Topic/category to explore
   * @param limit - Maximum results
   * @returns Content related to the topic
   */
  static async getTopicContent(
    topic: string,
    limit: number = 20
  ): Promise<{ posts: Post[]; communities: Community[]; hashtags: string[] }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/topics/${encodeURIComponent(topic)}?limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch topic content');
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
   * Get search suggestions as user types
   * @param query - Partial search query
   * @param type - Type of suggestions to get
   * @param limit - Maximum suggestions
   * @returns Array of search suggestions
   */
  static async getSearchSuggestions(
    query: string,
    type: 'all' | 'posts' | 'communities' | 'users' | 'hashtags' = 'all',
    limit: number = 10
  ): Promise<{
    posts: string[];
    communities: string[];
    users: string[];
    hashtags: string[];
  }> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // Shorter timeout for suggestions
    
    try {
      const response = await fetch(
        `${BACKEND_API_BASE_URL}/api/search/suggestions?q=${encodeURIComponent(query)}&type=${type}&limit=${limit}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
        }
      );
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch suggestions');
      }
      
      return response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        // For suggestions, we can fail silently on timeout
        return { posts: [], communities: [], users: [], hashtags: [] };
      }
      
      throw error;
    }
  }
}