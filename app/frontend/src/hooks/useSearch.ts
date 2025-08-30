import { useState, useEffect, useCallback } from 'react';
import { SearchService, SearchFilters, SearchResults } from '@/services/searchService';
import { Post } from '@/models/Post';
import { Community } from '@/models/Community';
import { UserProfile } from '@/models/UserProfile';

interface UseSearchOptions {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  autoSearch?: boolean;
  debounceMs?: number;
}

interface UseSearchReturn {
  // State
  query: string;
  filters: SearchFilters;
  results: SearchResults | null;
  suggestions: {
    posts: string[];
    communities: string[];
    users: string[];
    hashtags: string[];
  };
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  page: number;

  // Actions
  setQuery: (query: string) => void;
  setFilters: (filters: SearchFilters) => void;
  search: (searchQuery?: string, searchFilters?: SearchFilters) => Promise<void>;
  loadMore: () => Promise<void>;
  getSuggestions: (searchQuery: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;
}

export function useSearch(options: UseSearchOptions = {}): UseSearchReturn {
  const {
    initialQuery = '',
    initialFilters = {},
    autoSearch = false,
    debounceMs = 300
  } = options;

  // State
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [suggestions, setSuggestions] = useState({
    posts: [],
    communities: [],
    users: [],
    hashtags: []
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);

  // Debounce timer
  const [debounceTimer, setDebounceTimer] = useState<NodeJS.Timeout | null>(null);

  // Search function
  const search = useCallback(async (searchQuery?: string, searchFilters?: SearchFilters, pageNum: number = 0) => {
    const finalQuery = searchQuery ?? query;
    const finalFilters = searchFilters ?? filters;

    if (!finalQuery.trim()) {
      setResults(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchResults = await SearchService.search(
        finalQuery,
        finalFilters,
        20,
        pageNum * 20
      );

      if (pageNum === 0) {
        setResults(searchResults);
      } else {
        // Append results for pagination
        setResults(prev => prev ? {
          ...searchResults,
          posts: [...prev.posts, ...searchResults.posts],
          communities: [...prev.communities, ...searchResults.communities],
          users: [...prev.users, ...searchResults.users],
        } : searchResults);
      }

      setHasMore(searchResults.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Search error:', err);
      setError(err instanceof Error ? err.message : 'Search failed');
    } finally {
      setLoading(false);
    }
  }, [query, filters]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      await search(query, filters, nextPage);
    }
  }, [loading, hasMore, page, query, filters, search]);

  // Get search suggestions
  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions({ posts: [], communities: [], users: [], hashtags: [] });
      return;
    }

    try {
      const suggestions = await SearchService.getSearchSuggestions(searchQuery, 'all', 5);
      setSuggestions(suggestions);
    } catch (err) {
      // Fail silently for suggestions
      setSuggestions({ posts: [], communities: [], users: [], hashtags: [] });
    }
  }, []);

  // Debounced search for auto-search
  const debouncedSearch = useCallback((searchQuery: string) => {
    if (debounceTimer) {
      clearTimeout(debounceTimer);
    }

    const timer = setTimeout(() => {
      if (autoSearch && searchQuery.trim()) {
        search(searchQuery, filters, 0);
      }
    }, debounceMs);

    setDebounceTimer(timer);
  }, [debounceTimer, autoSearch, debounceMs, search, filters]);

  // Clear results
  const clearResults = useCallback(() => {
    setResults(null);
    setPage(0);
    setHasMore(false);
  }, []);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-search when query changes (if enabled)
  useEffect(() => {
    if (autoSearch) {
      debouncedSearch(query);
    }

    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [query, autoSearch, debouncedSearch, debounceTimer]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
    };
  }, [debounceTimer]);

  return {
    // State
    query,
    filters,
    results,
    suggestions,
    loading,
    error,
    hasMore,
    page,

    // Actions
    setQuery,
    setFilters,
    search,
    loadMore,
    getSuggestions,
    clearResults,
    clearError
  };
}

// Hook for trending content
interface UseTrendingReturn {
  trendingData: {
    posts: Post[];
    communities: Community[];
    hashtags: string[];
    topics: string[];
  } | null;
  trendingHashtags: { tag: string; count: number; growth: number }[];
  loading: boolean;
  error: string | null;
  refresh: (timeRange?: 'hour' | 'day' | 'week' | 'month') => Promise<void>;
}

export function useTrending(
  timeRange: 'hour' | 'day' | 'week' | 'month' = 'day',
  limit: number = 10
): UseTrendingReturn {
  const [trendingData, setTrendingData] = useState<{
    posts: Post[];
    communities: Community[];
    hashtags: string[];
    topics: string[];
  } | null>(null);
  const [trendingHashtags, setTrendingHashtags] = useState<{ tag: string; count: number; growth: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (selectedTimeRange?: 'hour' | 'day' | 'week' | 'month') => {
    const finalTimeRange = selectedTimeRange ?? timeRange;
    
    try {
      setLoading(true);
      setError(null);

      const [trending, hashtags] = await Promise.all([
        SearchService.getTrendingContent(finalTimeRange, limit),
        SearchService.getTrendingHashtags(finalTimeRange, limit)
      ]);

      setTrendingData(trending);
      setTrendingHashtags(hashtags);
    } catch (err) {
      console.error('Error loading trending content:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending content');
    } finally {
      setLoading(false);
    }
  }, [timeRange, limit]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    trendingData,
    trendingHashtags,
    loading,
    error,
    refresh
  };
}

// Hook for recommendations
interface UseRecommendationsReturn {
  recommendedCommunities: Community[];
  recommendedUsers: UserProfile[];
  loading: boolean;
  error: string | null;
  refresh: (basedOn?: 'activity' | 'interests' | 'network' | 'trending') => Promise<void>;
}

export function useRecommendations(
  userId?: string,
  basedOn: 'activity' | 'interests' | 'network' | 'trending' = 'activity',
  limit: number = 10
): UseRecommendationsReturn {
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [recommendedUsers, setRecommendedUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (selectedBasedOn?: 'activity' | 'interests' | 'network' | 'trending') => {
    const finalBasedOn = selectedBasedOn ?? basedOn;
    
    try {
      setLoading(true);
      setError(null);

      const options = {
        userId,
        limit,
        excludeJoined: true,
        basedOn: finalBasedOn
      };

      const [communities, users] = await Promise.all([
        SearchService.getRecommendedCommunities(options),
        SearchService.getRecommendedUsers(options)
      ]);

      setRecommendedCommunities(communities);
      setRecommendedUsers(users);
    } catch (err) {
      console.error('Error loading recommendations:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommendations');
    } finally {
      setLoading(false);
    }
  }, [userId, basedOn, limit]);

  // Initial load
  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    recommendedCommunities,
    recommendedUsers,
    loading,
    error,
    refresh
  };
}