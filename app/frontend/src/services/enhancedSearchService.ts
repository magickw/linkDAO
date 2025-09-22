import {
  EnhancedSearchFilters,
  EnhancedSearchResults,
  SearchSuggestion,
  CommunityRecommendation,
  UserRecommendation,
  DiscoveryContent,
  HashtagResult,
  TopicResult,
  BookmarkItem,
  FollowAction,
  JoinAction,
  LearningData,
  SearchAnalytics
} from '../types/enhancedSearch';

const BACKEND_API_BASE_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

/**
 * Enhanced Search and Discovery Service
 * Provides comprehensive search, discovery, and recommendation functionality
 * with real-time suggestions, learning algorithms, and social proof
 */
export class EnhancedSearchService {
  private static searchCache = new Map<string, { data: any; timestamp: number }>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static readonly SUGGESTION_CACHE_TTL = 2 * 60 * 1000; // 2 minutes

  /**
   * Perform enhanced search with real-time suggestions and content previews
   */
  static async search(
    query: string,
    filters: EnhancedSearchFilters = {},
    limit: number = 20,
    offset: number = 0,
    userId?: string
  ): Promise<EnhancedSearchResults> {
    const cacheKey = `search:${query}:${JSON.stringify(filters)}:${limit}:${offset}:${userId}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const startTime = Date.now();
      
      const searchParams = new URLSearchParams({
        q: query,
        limit: limit.toString(),
        offset: offset.toString(),
        ...(userId && { userId }),
        ...Object.fromEntries(
          Object.entries(filters).map(([key, value]) => [
            key,
            Array.isArray(value) ? value.join(',') : value?.toString() || ''
          ]).filter(([, value]) => value !== '')
        )
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/enhanced?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Enhanced search failed');
      }
      
      const result = await response.json();
      result.searchTime = Date.now() - startTime;
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      // Track search analytics
      await this.trackSearchAnalytics({
        query,
        filters,
        resultCount: result.totalResults,
        clickThroughRate: 0, // Will be updated when user clicks
        searchTime: result.searchTime,
        timestamp: new Date(),
        userId,
        sessionId: this.getSessionId()
      });
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get real-time search suggestions with content previews
   */
  static async getSearchSuggestions(
    query: string,
    type: 'all' | 'posts' | 'communities' | 'users' | 'hashtags' = 'all',
    limit: number = 10,
    userId?: string
  ): Promise<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) return [];

    const cacheKey = `suggestions:${query}:${type}:${limit}:${userId}`;
    const cached = this.getCachedResult(cacheKey, this.SUGGESTION_CACHE_TTL);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // Shorter timeout for suggestions
    
    try {
      const searchParams = new URLSearchParams({
        q: query,
        type,
        limit: limit.toString(),
        ...(userId && { userId })
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/suggestions/enhanced?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        // Fail silently for suggestions
        return [];
      }
      
      const suggestions = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, suggestions, this.SUGGESTION_CACHE_TTL);
      
      return suggestions;
    } catch (error) {
      clearTimeout(timeoutId);
      // Fail silently for suggestions
      return [];
    }
  }

  /**
   * Get community recommendations based on user interests and activity
   */
  static async getCommunityRecommendations(
    userId?: string,
    basedOn: 'activity' | 'interests' | 'network' | 'trending' = 'interests',
    limit: number = 10,
    excludeJoined: boolean = true
  ): Promise<CommunityRecommendation[]> {
    const cacheKey = `community-recs:${userId}:${basedOn}:${limit}:${excludeJoined}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        basedOn,
        limit: limit.toString(),
        excludeJoined: excludeJoined.toString(),
        ...(userId && { userId })
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/recommendations/communities/enhanced?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch community recommendations');
      }
      
      const recommendations = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, recommendations);
      
      return recommendations;
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
   */
  static async getUserRecommendations(
    userId?: string,
    basedOn: 'mutual_connections' | 'shared_interests' | 'similar_activity' | 'community_based' = 'mutual_connections',
    limit: number = 10
  ): Promise<UserRecommendation[]> {
    const cacheKey = `user-recs:${userId}:${basedOn}:${limit}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        basedOn,
        limit: limit.toString(),
        ...(userId && { userId })
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/recommendations/users/enhanced?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch user recommendations');
      }
      
      const recommendations = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, recommendations);
      
      return recommendations;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get hashtag-based content discovery with engagement metrics
   */
  static async getHashtagDiscovery(
    hashtag: string,
    timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
    limit: number = 20,
    offset: number = 0
  ): Promise<HashtagResult> {
    const cacheKey = `hashtag:${hashtag}:${timeRange}:${limit}:${offset}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        timeRange,
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/hashtags/${encodeURIComponent(hashtag)}/discovery?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch hashtag discovery');
      }
      
      const result = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      return result;
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
   */
  static async getTopicDiscovery(
    topic: string,
    limit: number = 20,
    offset: number = 0
  ): Promise<TopicResult> {
    const cacheKey = `topic:${topic}:${limit}:${offset}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    try {
      const searchParams = new URLSearchParams({
        limit: limit.toString(),
        offset: offset.toString()
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/topics/${encodeURIComponent(topic)}/discovery?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch topic discovery');
      }
      
      const result = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Get comprehensive discovery content for the discovery page
   */
  static async getDiscoveryContent(
    userId?: string,
    preferences?: string[]
  ): Promise<DiscoveryContent> {
    const cacheKey = `discovery:${userId}:${preferences?.join(',')}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    
    try {
      const searchParams = new URLSearchParams({
        ...(userId && { userId }),
        ...(preferences && { preferences: preferences.join(',') })
      });

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/discovery?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to fetch discovery content');
      }
      
      const result = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timeout');
      }
      
      throw error;
    }
  }

  /**
   * Community-specific search with advanced filtering
   */
  static async searchInCommunity(
    communityId: string,
    query: string,
    filters: EnhancedSearchFilters = {},
    limit: number = 20,
    offset: number = 0
  ): Promise<EnhancedSearchResults> {
    const cacheKey = `community-search:${communityId}:${query}:${JSON.stringify(filters)}:${limit}:${offset}`;
    const cached = this.getCachedResult(cacheKey);
    if (cached) return cached;

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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/search?${searchParams}`, {
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
      
      const result = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, result);
      
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Search timeout');
      }
      
      throw error;
    }
  }

  /**
   * Bookmark content for later
   */
  static async bookmarkItem(
    type: 'post' | 'community' | 'user' | 'hashtag' | 'topic',
    itemId: string,
    title: string,
    description?: string,
    thumbnail?: string,
    tags: string[] = [],
    folder?: string
  ): Promise<BookmarkItem> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/bookmarks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          type,
          itemId,
          title,
          description,
          thumbnail,
          tags,
          folder
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bookmark item');
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
   * Follow user, community, hashtag, or topic
   */
  static async followItem(
    type: 'user' | 'community' | 'hashtag' | 'topic',
    targetId: string
  ): Promise<FollowAction> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/follow`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({
          type: 'follow',
          targetType: type,
          targetId
        })
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to follow item');
      }
      
      // Clear relevant caches
      this.clearCacheByPattern(`user-recs:`);
      this.clearCacheByPattern(`community-recs:`);
      
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
   * Join community
   */
  static async joinCommunity(communityId: string): Promise<JoinAction> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    try {
      const response = await fetch(`${BACKEND_API_BASE_URL}/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to join community');
      }
      
      // Clear relevant caches
      this.clearCacheByPattern(`community-recs:`);
      this.clearCacheByPattern(`discovery:`);
      
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
   * Update learning algorithm with user behavior
   */
  static async updateLearningData(
    userId: string,
    data: Partial<LearningData>
  ): Promise<void> {
    try {
      await fetch(`${BACKEND_API_BASE_URL}/api/learning/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data)
      });
      
      // Clear recommendation caches to reflect updated learning
      this.clearCacheByPattern(`user-recs:${userId}`);
      this.clearCacheByPattern(`community-recs:${userId}`);
      this.clearCacheByPattern(`discovery:${userId}`);
    } catch (error) {
      // Fail silently for learning data updates
      console.warn('Failed to update learning data:', error);
    }
  }

  /**
   * Track search analytics for improving recommendations
   */
  private static async trackSearchAnalytics(analytics: SearchAnalytics): Promise<void> {
    try {
      await fetch(`${BACKEND_API_BASE_URL}/api/analytics/search`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(analytics)
      });
    } catch (error) {
      // Fail silently for analytics
      console.warn('Failed to track search analytics:', error);
    }
  }

  /**
   * Track click-through for improving search relevance
   */
  static async trackClickThrough(
    query: string,
    resultType: 'post' | 'community' | 'user',
    resultId: string,
    position: number,
    userId?: string
  ): Promise<void> {
    try {
      await fetch(`${BACKEND_API_BASE_URL}/api/analytics/click-through`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query,
          resultType,
          resultId,
          position,
          userId,
          timestamp: new Date(),
          sessionId: this.getSessionId()
        })
      });
    } catch (error) {
      // Fail silently for analytics
      console.warn('Failed to track click-through:', error);
    }
  }

  // Cache management methods
  private static getCachedResult(key: string, ttl: number = this.CACHE_TTL): any {
    const cached = this.searchCache.get(key);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  }

  private static setCachedResult(key: string, data: any, ttl: number = this.CACHE_TTL): void {
    this.searchCache.set(key, { data, timestamp: Date.now() });
    
    // Clean up old cache entries
    if (this.searchCache.size > 1000) {
      const cutoff = Date.now() - ttl;
      for (const [k, v] of this.searchCache.entries()) {
        if (v.timestamp < cutoff) {
          this.searchCache.delete(k);
        }
      }
    }
  }

  private static clearCacheByPattern(pattern: string): void {
    for (const key of this.searchCache.keys()) {
      if (key.includes(pattern)) {
        this.searchCache.delete(key);
      }
    }
  }

  private static getSessionId(): string {
    let sessionId = sessionStorage.getItem('search-session-id');
    if (!sessionId) {
      sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem('search-session-id', sessionId);
    }
    return sessionId;
  }

  /**
   * Clear all search caches
   */
  static clearCache(): void {
    this.searchCache.clear();
  }
}