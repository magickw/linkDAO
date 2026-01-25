/**
 * Global Search Service
 * Frontend service for unified search functionality
 * Implements requirements 4.1, 4.4, 5.1 from the interconnected social platform spec
 */

import { SearchQuery, SearchResult } from '../components/Search/GlobalSearchInterface';
import { enhancedAuthService } from './enhancedAuthService';

interface SearchOptions {
  signal?: AbortSignal;
}

interface SearchResponse {
  results: SearchResult[];
  totalCount: number;
  hasMore: boolean;
  suggestions?: string[];
  facets?: Record<string, any>;
}

interface SavedSearch {
  id: string;
  name: string;
  query: string;
  filters: Record<string, any>;
  createdAt: Date;
}

class GlobalSearchService {
  private static instance: GlobalSearchService;
  private baseUrl = '/api/search';

  static getInstance(): GlobalSearchService {
    if (!GlobalSearchService.instance) {
      GlobalSearchService.instance = new GlobalSearchService();
    }
    return GlobalSearchService.instance;
  }

  /**
   * Perform global search across all content types
   */
  async search(query: SearchQuery, options: SearchOptions = {}): Promise<SearchResponse> {
    try {
      const params = new URLSearchParams();
      params.append('q', query.query);
      
      if (query.filters.type && query.filters.type !== 'all') {
        params.append('type', query.filters.type);
      }
      
      if (query.filters.timeRange && query.filters.timeRange !== 'all') {
        params.append('timeRange', query.filters.timeRange);
      }
      
      if (query.filters.sortBy && query.filters.sortBy !== 'relevance') {
        params.append('sortBy', query.filters.sortBy);
      }
      
      if (query.filters.communityId) {
        params.append('communityId', query.filters.communityId);
      }
      
      if (query.filters.authorAddress) {
        params.append('authorAddress', query.filters.authorAddress);
      }

      const response = await fetch(`${this.baseUrl}?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      return {
        results: data.results.map(this.transformSearchResult),
        totalCount: data.totalCount,
        hasMore: data.hasMore,
        suggestions: data.suggestions,
        facets: data.facets
      };
    } catch (error) {
      console.error('Search error:', error);
      throw error;
    }
  }

  /**
   * Get search suggestions and autocomplete
   */
  async getSuggestions(query: string, options: SearchOptions = {}): Promise<string[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      params.append('limit', '10');

      const response = await fetch(`${this.baseUrl}/suggestions?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
        signal: options.signal,
      });

      if (!response.ok) {
        throw new Error(`Suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.suggestions || [];
    } catch (error) {
      console.error('Suggestions error:', error);
      return [];
    }
  }

  /**
   * Get trending search terms
   */
  async getTrendingSearches(timeRange: '24h' | '7d' | '30d' = '24h'): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/trending?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Trending searches failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.trending || [];
    } catch (error) {
      console.error('Trending searches error:', error);
      return [];
    }
  }

  /**
   * Save search for later
   */
  async saveSearch(savedSearch: SavedSearch): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/saved`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
        body: JSON.stringify(savedSearch),
      });

      if (!response.ok) {
        throw new Error(`Save search failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Save search error:', error);
      throw error;
    }
  }

  /**
   * Get saved searches
   */
  async getSavedSearches(): Promise<SavedSearch[]> {
    try {
      const response = await fetch(`${this.baseUrl}/saved`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Get saved searches failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.savedSearches.map((search: any) => ({
        ...search,
        createdAt: new Date(search.createdAt)
      }));
    } catch (error) {
      console.error('Get saved searches error:', error);
      return [];
    }
  }

  /**
   * Delete saved search
   */
  async deleteSavedSearch(id: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/saved/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Delete saved search failed: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Delete saved search error:', error);
      throw error;
    }
  }

  /**
   * Get search analytics
   */
  async getSearchAnalytics(timeRange: '24h' | '7d' | '30d' = '7d'): Promise<{
    totalSearches: number;
    uniqueQueries: number;
    topQueries: Array<{ query: string; count: number }>;
    searchesByType: Record<string, number>;
    averageResultsPerSearch: number;
    clickThroughRate: number;
  }> {
    try {
      const response = await fetch(`${this.baseUrl}/analytics?timeRange=${timeRange}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Search analytics failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Search analytics error:', error);
      throw error;
    }
  }

  /**
   * Track search interaction (click, view, etc.)
   */
  async trackSearchInteraction(
    query: string,
    resultId: string,
    interactionType: 'click' | 'view' | 'share',
    metadata?: Record<string, any>
  ): Promise<void> {
    try {
      await fetch(`${this.baseUrl}/track`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
        body: JSON.stringify({
          query,
          resultId,
          interactionType,
          metadata,
          timestamp: new Date().toISOString()
        }),
      });
    } catch (error) {
      console.error('Track search interaction error:', error);
      // Don't throw error for tracking failures
    }
  }

  /**
   * Get search facets for advanced filtering
   */
  async getSearchFacets(query: string): Promise<{
    communities: Array<{ id: string; name: string; count: number }>;
    authors: Array<{ address: string; name: string; count: number }>;
    hashtags: Array<{ tag: string; count: number }>;
    timeRanges: Array<{ range: string; count: number }>;
  }> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);

      const response = await fetch(`${this.baseUrl}/facets?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Search facets failed: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Search facets error:', error);
      return {
        communities: [],
        authors: [],
        hashtags: [],
        timeRanges: []
      };
    }
  }

  /**
   * Perform semantic search using AI/ML
   */
  async semanticSearch(query: string, options: {
    type?: string;
    limit?: number;
    threshold?: number;
  } = {}): Promise<SearchResult[]> {
    try {
      const params = new URLSearchParams();
      params.append('q', query);
      
      if (options.type) params.append('type', options.type);
      if (options.limit) params.append('limit', options.limit.toString());
      if (options.threshold) params.append('threshold', options.threshold.toString());

      const response = await fetch(`${this.baseUrl}/semantic?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Semantic search failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.results.map(this.transformSearchResult);
    } catch (error) {
      console.error('Semantic search error:', error);
      return [];
    }
  }

  /**
   * Get personalized search recommendations
   */
  async getPersonalizedRecommendations(limit: number = 10): Promise<SearchResult[]> {
    try {
      const response = await fetch(`${this.baseUrl}/recommendations?limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${enhancedAuthService.getAuthToken()}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Recommendations failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.recommendations.map(this.transformSearchResult);
    } catch (error) {
      console.error('Recommendations error:', error);
      return [];
    }
  }

  // Private helper methods

  private getAuthToken(): string {
    return localStorage.getItem('token') || localStorage.getItem('authToken') || localStorage.getItem('auth_token') || '';
  }

  private transformSearchResult(data: any): SearchResult {
    return {
      id: data.id,
      type: data.type,
      title: data.title,
      description: data.description,
      imageUrl: data.imageUrl,
      url: data.url,
      metadata: {
        authorName: data.metadata?.authorName,
        authorAddress: data.metadata?.authorAddress,
        communityName: data.metadata?.communityName,
        memberCount: data.metadata?.memberCount,
        postCount: data.metadata?.postCount,
        createdAt: data.metadata?.createdAt || new Date().toISOString(),
        relevanceScore: data.metadata?.relevanceScore || 0,
        engagement: data.metadata?.engagement
      }
    };
  }
}

export const globalSearchService = GlobalSearchService.getInstance();
export default globalSearchService;