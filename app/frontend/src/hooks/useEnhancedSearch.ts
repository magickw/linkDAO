import { useState, useEffect, useCallback, useRef } from 'react';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { EnhancedSearchService } from '../services/enhancedSearchService';
import {
  EnhancedSearchFilters,
  EnhancedSearchResults,
  SearchSuggestion,
  CommunityRecommendation,
  UserRecommendation,
  DiscoveryContent,
  HashtagResult,
  TopicResult,
  LearningData
} from '../types/enhancedSearch';

export interface UseEnhancedSearchOptions {
  debounceMs?: number;
  enableSuggestions?: boolean;
  enableLearning?: boolean;
  trackAnalytics?: boolean;
}

export interface UseEnhancedSearchReturn {
  // Search state
  query: string;
  setQuery: (query: string) => void;
  filters: EnhancedSearchFilters;
  setFilters: (filters: EnhancedSearchFilters) => void;
  results: EnhancedSearchResults | null;
  loading: boolean;
  error: string | null;
  
  // Suggestions
  suggestions: SearchSuggestion[];
  showSuggestions: boolean;
  setShowSuggestions: (show: boolean) => void;
  
  // Search actions
  search: (searchQuery?: string, searchFilters?: EnhancedSearchFilters) => Promise<void>;
  clearSearch: () => void;
  loadMore: () => Promise<void>;
  
  // Recommendations
  communityRecommendations: CommunityRecommendation[];
  userRecommendations: UserRecommendation[];
  loadRecommendations: () => Promise<void>;
  
  // Discovery
  discoveryContent: DiscoveryContent | null;
  loadDiscoveryContent: () => Promise<void>;
  
  // Hashtag/Topic discovery
  exploreHashtag: (hashtag: string) => Promise<HashtagResult>;
  exploreTopic: (topic: string) => Promise<TopicResult>;
  
  // Community search
  searchInCommunity: (communityId: string, searchQuery: string) => Promise<void>;
  
  // Actions
  bookmarkItem: (type: string, itemId: string, title: string, description?: string) => Promise<void>;
  followItem: (type: string, targetId: string) => Promise<void>;
  joinCommunity: (communityId: string) => Promise<void>;
  
  // Analytics
  trackClick: (resultType: string, resultId: string, position: number) => void;
  
  // Pagination
  hasMore: boolean;
  page: number;
}

export function useEnhancedSearch(options: UseEnhancedSearchOptions = {}): UseEnhancedSearchReturn {
  const {
    debounceMs = 300,
    enableSuggestions = true,
    enableLearning = true,
    trackAnalytics = true
  } = options;

  const { address } = useWeb3();
  const { addToast } = useToast();

  // Search state
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<EnhancedSearchFilters>({});
  const [results, setResults] = useState<EnhancedSearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  // Suggestions state
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Recommendations state
  const [communityRecommendations, setCommunityRecommendations] = useState<CommunityRecommendation[]>([]);
  const [userRecommendations, setUserRecommendations] = useState<UserRecommendation[]>([]);

  // Discovery state
  const [discoveryContent, setDiscoveryContent] = useState<DiscoveryContent | null>(null);

  // Refs for debouncing and cleanup
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const suggestionsDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const learningDataRef = useRef<Partial<LearningData>>({
    searchQueries: [],
    clickedResults: [],
    engagementPatterns: {
      preferredContentTypes: [],
      activeTimeRanges: [],
      favoriteTopics: [],
      communityInterests: []
    },
    preferences: {
      sortPreference: 'relevance',
      filterPreferences: {},
      contentPreferences: []
    }
  });

  // Debounced search function
  const search = useCallback(async (
    searchQuery?: string,
    searchFilters?: EnhancedSearchFilters,
    pageNum: number = 0
  ) => {
    const finalQuery = searchQuery ?? query;
    const finalFilters = searchFilters ?? filters;

    if (!finalQuery.trim()) {
      setResults(null);
      setError(null);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const searchResults = await EnhancedSearchService.search(
        finalQuery,
        finalFilters,
        20,
        pageNum * 20,
        address
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
          hashtags: [...prev.hashtags, ...searchResults.hashtags],
          topics: [...prev.topics, ...searchResults.topics],
        } : searchResults);
      }

      setHasMore(searchResults.hasMore);
      setPage(pageNum);

      // Update learning data
      if (enableLearning && address) {
        learningDataRef.current.searchQueries = [
          ...(learningDataRef.current.searchQueries || []),
          finalQuery
        ].slice(-50); // Keep last 50 queries

        await EnhancedSearchService.updateLearningData(address, learningDataRef.current);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Search failed';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [query, filters, address, addToast, enableLearning]);

  // Debounced suggestions function
  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (!enableSuggestions || !searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const suggestions = await EnhancedSearchService.getSearchSuggestions(
        searchQuery,
        'all',
        10,
        address
      );
      setSuggestions(suggestions);
    } catch (error) {
      // Fail silently for suggestions
      setSuggestions([]);
    }
  }, [enableSuggestions, address]);

  // Handle query changes with debouncing
  const handleQueryChange = useCallback((newQuery: string) => {
    setQuery(newQuery);
    setShowSuggestions(true);

    // Clear previous debounce timers
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (suggestionsDebounceRef.current) {
      clearTimeout(suggestionsDebounceRef.current);
    }

    // Debounce suggestions (shorter delay)
    suggestionsDebounceRef.current = setTimeout(() => {
      getSuggestions(newQuery);
    }, 200);

    // Debounce search (longer delay)
    debounceRef.current = setTimeout(() => {
      if (newQuery.trim()) {
        search(newQuery, filters, 0);
      }
    }, debounceMs);
  }, [search, filters, debounceMs, getSuggestions]);

  // Load more results
  const loadMore = useCallback(async () => {
    if (!loading && hasMore && results) {
      await search(query, filters, page + 1);
    }
  }, [loading, hasMore, results, search, query, filters, page]);

  // Clear search
  const clearSearch = useCallback(() => {
    setQuery('');
    setResults(null);
    setError(null);
    setSuggestions([]);
    setShowSuggestions(false);
    setPage(0);
    setHasMore(false);
  }, []);

  // Load recommendations
  const loadRecommendations = useCallback(async () => {
    try {
      const [communityRecs, userRecs] = await Promise.all([
        EnhancedSearchService.getCommunityRecommendations(address, 'interests', 10),
        EnhancedSearchService.getUserRecommendations(address, 'mutual_connections', 10)
      ]);

      setCommunityRecommendations(communityRecs);
      setUserRecommendations(userRecs);
    } catch (error) {
      console.warn('Failed to load recommendations:', error);
    }
  }, [address]);

  // Load discovery content
  const loadDiscoveryContent = useCallback(async () => {
    try {
      const content = await EnhancedSearchService.getDiscoveryContent(
        address,
        learningDataRef.current.preferences?.contentPreferences
      );
      setDiscoveryContent(content);
    } catch (error) {
      console.warn('Failed to load discovery content:', error);
    }
  }, [address]);

  // Explore hashtag
  const exploreHashtag = useCallback(async (hashtag: string): Promise<HashtagResult> => {
    return await EnhancedSearchService.getHashtagDiscovery(hashtag);
  }, []);

  // Explore topic
  const exploreTopic = useCallback(async (topic: string): Promise<TopicResult> => {
    return await EnhancedSearchService.getTopicDiscovery(topic);
  }, []);

  // Search in community
  const searchInCommunity = useCallback(async (communityId: string, searchQuery: string) => {
    try {
      setLoading(true);
      setError(null);

      const searchResults = await EnhancedSearchService.searchInCommunity(
        communityId,
        searchQuery,
        filters,
        20,
        0
      );

      setResults(searchResults);
      setHasMore(searchResults.hasMore);
      setPage(0);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Community search failed';
      setError(errorMessage);
      addToast(errorMessage, 'error');
    } finally {
      setLoading(false);
    }
  }, [filters, addToast]);

  // Bookmark item
  const bookmarkItem = useCallback(async (
    type: string,
    itemId: string,
    title: string,
    description?: string
  ) => {
    try {
      await EnhancedSearchService.bookmarkItem(
        type as any,
        itemId,
        title,
        description
      );
      addToast('Item bookmarked successfully', 'success');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to bookmark item';
      addToast(errorMessage, 'error');
    }
  }, [addToast]);

  // Follow item
  const followItem = useCallback(async (type: string, targetId: string) => {
    try {
      await EnhancedSearchService.followItem(type as any, targetId);
      addToast(`Successfully followed ${type}`, 'success');
      
      // Reload recommendations to reflect the change
      await loadRecommendations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : `Failed to follow ${type}`;
      addToast(errorMessage, 'error');
    }
  }, [addToast, loadRecommendations]);

  // Join community
  const joinCommunity = useCallback(async (communityId: string) => {
    try {
      await EnhancedSearchService.joinCommunity(communityId);
      addToast('Successfully joined community', 'success');
      
      // Reload recommendations to reflect the change
      await loadRecommendations();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to join community';
      addToast(errorMessage, 'error');
    }
  }, [addToast, loadRecommendations]);

  // Track click-through
  const trackClick = useCallback((resultType: string, resultId: string, position: number) => {
    if (trackAnalytics && query) {
      EnhancedSearchService.trackClickThrough(query, resultType as any, resultId, position, address);
      
      // Update learning data
      if (enableLearning && address) {
        learningDataRef.current.clickedResults = [
          ...(learningDataRef.current.clickedResults || []),
          {
            type: resultType as any,
            id: resultId,
            position,
            timestamp: new Date()
          }
        ].slice(-100); // Keep last 100 clicks

        EnhancedSearchService.updateLearningData(address, learningDataRef.current);
      }
    }
  }, [trackAnalytics, query, address, enableLearning]);

  // Handle filter changes
  const handleFiltersChange = useCallback((newFilters: EnhancedSearchFilters) => {
    setFilters(newFilters);
    setPage(0);
    
    // Update learning preferences
    if (enableLearning && address) {
      learningDataRef.current.preferences = {
        ...learningDataRef.current.preferences,
        filterPreferences: newFilters,
        sortPreference: newFilters.sortBy || 'relevance',
        contentPreferences: learningDataRef.current.preferences?.contentPreferences || []
      };
    }
    
    if (query.trim()) {
      search(query, newFilters, 0);
    }
  }, [query, search, enableLearning, address]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (suggestionsDebounceRef.current) {
        clearTimeout(suggestionsDebounceRef.current);
      }
    };
  }, []);

  // Load initial recommendations when user connects
  useEffect(() => {
    if (address) {
      loadRecommendations();
      loadDiscoveryContent();
    }
  }, [address, loadRecommendations, loadDiscoveryContent]);

  return {
    // Search state
    query,
    setQuery: handleQueryChange,
    filters,
    setFilters: handleFiltersChange,
    results,
    loading,
    error,
    
    // Suggestions
    suggestions,
    showSuggestions,
    setShowSuggestions,
    
    // Search actions
    search,
    clearSearch,
    loadMore,
    
    // Recommendations
    communityRecommendations,
    userRecommendations,
    loadRecommendations,
    
    // Discovery
    discoveryContent,
    loadDiscoveryContent,
    
    // Hashtag/Topic discovery
    exploreHashtag,
    exploreTopic,
    
    // Community search
    searchInCommunity,
    
    // Actions
    bookmarkItem,
    followItem,
    joinCommunity,
    
    // Analytics
    trackClick,
    
    // Pagination
    hasMore,
    page
  };
}