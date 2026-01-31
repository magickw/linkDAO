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
import { Post, convertBackendPostToPost } from '../models/Post';
import { convertBackendStatusToStatus } from '../models/Status';
import { fuzzySearch, tokenizeSearch } from './fuzzySearchUtils';
import { aiSuggestionService } from './aiSuggestionService';

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
      
      // Convert backend posts to frontend models
      if (Array.isArray(result.posts)) {
        result.posts = result.posts.map((post: any) => {
          if (post.isStatus === true) {
            return convertBackendStatusToStatus(post);
          } else {
            return convertBackendPostToPost(post);
          }
        });
      }
      
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
   * Get real-time search suggestions with content previews and AI enhancements
   */
  static async getSearchSuggestions(
    query: string,
    type: 'all' | 'posts' | 'communities' | 'users' | 'hashtags' = 'all',
    limit: number = 10,
    userId?: string,
    context?: {
      recentCommunities?: string[];
      searchHistory?: string[];
    }
  ): Promise<SearchSuggestion[]> {
    if (!query.trim() || query.length < 2) return [];

    const cacheKey = `suggestions:${query}:${type}:${limit}:${userId}`;
    const cached = this.getCachedResult(cacheKey, this.SUGGESTION_CACHE_TTL);
    if (cached) return cached;

    try {
      // Try AI-powered suggestions first
      const aiSuggestions = await aiSuggestionService.getSearchSuggestions(
        query, 
        { userId, ...context }, 
        limit
      );
      
      // Convert AI suggestions to SearchSuggestion format
      if (aiSuggestions.length > 0) {
        const aiSearchSuggestions: SearchSuggestion[] = aiSuggestions.map(text => ({
          text,
          type: 'community', // Default to community for demo
          trending: Math.random() > 0.7, // Random trending for demo
          verified: Math.random() > 0.8 // Random verified for demo
        }));
        
        // Cache the result
        this.setCachedResult(cacheKey, aiSearchSuggestions, this.SUGGESTION_CACHE_TTL);
        return aiSearchSuggestions;
      }

      // Fallback to backend suggestions
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
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
        // Fail silently for suggestions but log the status
        console.warn(`Search suggestions backend returned status ${response.status}`);
        return [];
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        console.warn('Search suggestions backend returned non-JSON response');
        return [];
      }

      const suggestions = await response.json();
      
      // Cache the result
      this.setCachedResult(cacheKey, suggestions, this.SUGGESTION_CACHE_TTL);
      
      return suggestions;
    } catch (error) {
      // Ensure timeout is cleared even on error
      if (typeof timeoutId !== 'undefined') {
        clearTimeout(timeoutId);
      }
      
      // Fail silently for suggestions
      console.warn('Search suggestions failed:', error);
      return [];
    }
  }

  /**
   * Perform fuzzy search on communities with enhanced matching
   * @param query - Search query
   * @param communities - Array of communities to search
   * @param limit - Maximum results
   * @returns Array of matching communities with scores
   */
  static fuzzySearchCommunities(
    query: string,
    communities: any[], // Using any[] to avoid circular dependencies
    limit: number = 10
  ): any[] {
    if (!query || communities.length === 0) return [];

    // Perform fuzzy search on multiple fields
    const fuzzyResults = fuzzySearch(
      communities,
      query,
      ['name', 'displayName', 'description', 'category', 'tags'],
      {
        threshold: 0.6,
        includeScore: true,
        shouldSort: true
      }
    );

    // Perform token-based search for multi-word queries
    const tokenResults = tokenizeSearch(
      communities,
      query,
      ['name', 'displayName', 'description', 'category', 'tags'],
      {
        threshold: 0.7,
        includeScore: true,
        shouldSort: true
      }
    );

    // Combine results and deduplicate
    const combinedResults = new Map<string, any & { fuzzyScore?: number; tokenScore?: number }>();
    
    // Add fuzzy results
    fuzzyResults.forEach(result => {
      const key = result.item.id || JSON.stringify(result.item);
      combinedResults.set(key, {
        ...result.item,
        fuzzyScore: result.score
      });
    });
    
    // Add token results
    tokenResults.forEach(result => {
      const key = result.item.id || JSON.stringify(result.item);
      if (combinedResults.has(key)) {
        const existing = combinedResults.get(key)!;
        combinedResults.set(key, {
          ...existing,
          tokenScore: result.score
        });
      } else {
        combinedResults.set(key, {
          ...result.item,
          tokenScore: result.score
        });
      }
    });

    // Convert to array and sort by combined scores
    const resultsArray = Array.from(combinedResults.values());
    
    resultsArray.sort((a, b) => {
      // Calculate combined score (lower is better)
      const scoreA = (a.fuzzyScore || 1) * 0.6 + (a.tokenScore || 1) * 0.4;
      const scoreB = (b.fuzzyScore || 1) * 0.6 + (b.tokenScore || 1) * 0.4;
      return scoreA - scoreB;
    });

    return resultsArray.slice(0, limit);
  }

  /**
   * Get AI-powered community recommendations
   * @param communities - All available communities
   * @param query - Search query or context
   * @param limit - Maximum recommendations
   * @returns Array of recommended communities
   */
  static async getAICommunityRecommendations(
    communities: any[], // Using any[] to avoid circular dependencies
    query: string,
    limit: number = 10
  ): Promise<any[]> {
    if (communities.length === 0) return [];

    // Update AI service cache
    aiSuggestionService.updateCommunityCache(communities);
    
    // Get related communities based on query
    const relatedCommunities = await aiSuggestionService.getRelatedCommunities(
      query,
      communities,
      limit
    );
    
    return relatedCommunities;
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
      
      // Convert backend posts to frontend models
      if (Array.isArray(result.topPosts)) {
        result.topPosts = result.topPosts.map((post: any) => {
          if (post.isStatus === true) {
            return convertBackendStatusToStatus(post);
          } else {
            return convertBackendPostToPost(post);
          }
        });
      }
      
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
      
      // Convert backend posts to frontend models
      if (Array.isArray(result.recentPosts)) {
        result.recentPosts = result.recentPosts.map((post: any) => {
          if (post.isStatus === true) {
            return convertBackendStatusToStatus(post);
          } else {
            return convertBackendPostToPost(post);
          }
        });
      }
      
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

      const response = await fetch(`${BACKEND_API_BASE_URL}/api/search/enhanced/discovery?${searchParams}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Failed to fetch discovery content');
      }
      
      const result = await response.json();
      
      // Helper function to convert backend posts to frontend models
      const convertPostList = (posts: any[]) => {
        if (!Array.isArray(posts)) return [];
        return posts.map((post: any) => {
          if (post.isStatus === true) {
            return convertBackendStatusToStatus(post);
          } else {
            return convertBackendPostToPost(post);
          }
        });
      };

      // Convert backend posts to frontend models in different sections
      if (result.trending?.posts) {
        result.trending.posts = convertPostList(result.trending.posts);
      }
      if (result.recommendations?.posts) {
        result.recommendations.posts = convertPostList(result.recommendations.posts);
      }
      if (result.personalized) {
        if (result.personalized.forYou) {
          result.personalized.forYou = convertPostList(result.personalized.forYou);
        }
        if (result.personalized.basedOnActivity) {
          result.personalized.basedOnActivity = convertPostList(result.personalized.basedOnActivity);
        }
        if (result.personalized.fromNetwork) {
          result.personalized.fromNetwork = convertPostList(result.personalized.fromNetwork);
        }
      }
      
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
      
      // Record search for AI training
      this.recordSearch(query);
    } catch (error) {
      // Fail silently for analytics
      console.warn('Failed to track click-through:', error);
    }
  }

  /**
   * Record search behavior for AI training
   */
  static recordSearch(query: string): void {
    aiSuggestionService.recordSearch(query);
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