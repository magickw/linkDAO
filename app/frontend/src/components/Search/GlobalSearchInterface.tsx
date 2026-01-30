/**
 * GlobalSearchInterface Component
 * Unified search across posts, communities, and users
 * Implements requirements 4.1, 4.4, 5.1 from the interconnected social platform spec
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';
import { SearchResults } from './SearchResults';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchFilters } from './SearchFilters';
import { SearchHistory } from './SearchHistory';
import { useGlobalSearch } from '../../hooks/useGlobalSearch';
import { useDebounce } from '../../hooks/useDebounce';
import { LoadingSpinner } from '../ui/LoadingSpinner';

export interface SearchQuery {
  query: string;
  filters: {
    type?: 'all' | 'posts' | 'communities' | 'users' | 'hashtags';
    timeRange?: 'all' | '24h' | '7d' | '30d';
    sortBy?: 'relevance' | 'recent' | 'popular';
    communityId?: string;
    authorAddress?: string;
  };
}

export interface SearchResult {
  id: string;
  type: 'post' | 'community' | 'user' | 'hashtag';
  title: string;
  description: string;
  imageUrl?: string;
  url: string;
  metadata: {
    authorName?: string;
    authorAddress?: string;
    communityName?: string;
    memberCount?: number;
    postCount?: number;
    createdAt: string;
    relevanceScore: number;
    engagement?: {
      likes: number;
      comments: number;
      reposts: number;
    };
  };
}

interface GlobalSearchInterfaceProps {
  className?: string;
  placeholder?: string;
  showFilters?: boolean;
  showHistory?: boolean;
  showSuggestions?: boolean;
  onResultSelect?: (result: SearchResult) => void;
  initialQuery?: string;
  compact?: boolean;
}

export const GlobalSearchInterface: React.FC<GlobalSearchInterfaceProps> = ({
  className = '',
  placeholder = 'Search content...',
  showFilters = true,
  showHistory = true,
  showSuggestions = true,
  onResultSelect,
  initialQuery = '',
  compact = false
}) => {
  // Add keyboard shortcut effect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Press '/' to focus search
      if (e.key === '/' && e.target instanceof HTMLElement && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  
  const [query, setQuery] = useState(initialQuery);
  const [filters, setFilters] = useState<SearchQuery['filters']>({
    type: 'all',
    timeRange: 'all',
    sortBy: 'relevance'
  });
  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [selectedResultIndex, setSelectedResultIndex] = useState(-1);

  // Debounce search query to avoid excessive API calls
  const debouncedQuery = useDebounce(query, 300);

  // Use global search hook
  const {
    results,
    suggestions,
    history,
    loading,
    error,
    search,
    getSuggestions,
    addToHistory,
    clearHistory,
    saveSearch
  } = useGlobalSearch();

  // Perform search when debounced query or filters change
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      search({ query: debouncedQuery, filters });
      setShowResults(true);
    } else {
      setShowResults(false);
    }
  }, [debouncedQuery, filters, search]);

  // Get suggestions when query changes
  useEffect(() => {
    if (query.trim().length >= 1 && showSuggestions) {
      getSuggestions(query);
    }
  }, [query, getSuggestions, showSuggestions]);

  // Handle input focus
  const handleFocus = () => {
    setIsExpanded(true);
    if (query.trim().length >= 2) {
      setShowResults(true);
    }
  };

  // Handle input blur
  const handleBlur = (e: React.FocusEvent) => {
    // Delay hiding to allow clicking on results
    setTimeout(() => {
      if (!e.currentTarget.contains(document.activeElement)) {
        setIsExpanded(false);
        setShowResults(false);
        setSelectedResultIndex(-1);
      }
    }, 200);
  };

  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newQuery = e.target.value;
    setQuery(newQuery);
    setSelectedResultIndex(-1);
    
    if (newQuery.trim().length === 0) {
      setShowResults(false);
    }
  };

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showResults || results.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedResultIndex(prev => 
          prev < results.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedResultIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedResultIndex >= 0) {
          handleResultSelect(results[selectedResultIndex]);
        } else if (query.trim()) {
          handleSearch();
        }
        break;
      case 'Escape':
        setShowResults(false);
        setIsExpanded(false);
        searchInputRef.current?.blur();
        break;
    }
  };

  // Handle search submission
  const handleSearch = () => {
    if (query.trim()) {
      addToHistory(query);
      
      if (onResultSelect) {
        // Custom result handling
        return;
      }
      
      // Navigate to search results page
      const searchParams = new URLSearchParams({
        q: query,
        ...Object.fromEntries(
          Object.entries(filters).filter(([_, value]) => value && value !== 'all')
        )
      });
      
      router.push(`/search?${searchParams.toString()}`);
      setShowResults(false);
      setIsExpanded(false);
    }
  };

  // Handle result selection
  const handleResultSelect = (result: SearchResult) => {
    addToHistory(query);
    
    if (onResultSelect) {
      onResultSelect(result);
    } else {
      router.push(result.url);
    }
    
    setShowResults(false);
    setIsExpanded(false);
    searchInputRef.current?.blur();
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string) => {
    setQuery(suggestion);
    search({ query: suggestion, filters });
    setShowResults(true);
  };

  // Handle history item selection
  const handleHistorySelect = (historyQuery: string) => {
    setQuery(historyQuery);
    search({ query: historyQuery, filters });
    setShowResults(true);
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<SearchQuery['filters']>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    
    if (query.trim().length >= 2) {
      search({ query, filters: updatedFilters });
    }
  };

  // Handle saved search
  const handleSaveSearch = () => {
    if (query.trim()) {
      saveSearch({ query, filters }, `Search: ${query}`);
    }
  };

  // Memoized results for performance
  const displayResults = useMemo(() => {
    return results.map((result, index) => ({
      ...result,
      isSelected: index === selectedResultIndex
    }));
  }, [results, selectedResultIndex]);

  return (
    <div className={`global-search-interface relative ${className}`}>
      {/* Search Input */}
      <div className={`
        relative transition-all duration-200
        ${isExpanded ? 'z-50' : 'z-10'}
        ${compact ? 'w-full' : 'w-full max-w-2xl mx-auto'}
      `}>
        <div className="relative">
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={handleInputChange}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`
              w-full px-4 py-3 pl-12 pr-20
              border border-gray-300 dark:border-gray-600
              rounded-lg
              bg-white dark:bg-gray-800
              text-gray-900 dark:text-white
              placeholder-gray-500 dark:placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent
              transition-all duration-200
              ${isExpanded ? 'shadow-lg' : 'shadow-sm'}
              ${compact ? 'text-sm py-2' : 'text-base'}
            `}
          />
          
          {/* Search Icon */}
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2">
            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>

          {/* Loading/Clear Button and Shortcut Hint */}
          <div className="absolute right-4 top-1/2 transform -translate-y-1/2 flex items-center space-x-2">
            {/* Keyboard shortcut hint */}
            <div className="hidden sm:block text-xs text-gray-400 dark:text-gray-500 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
              /
            </div>
            
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : query ? (
              <button
                onClick={() => {
                  setQuery('');
                  setShowResults(false);
                  searchInputRef.current?.focus();
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            ) : null}
          </div>
        </div>

        {/* Search Dropdown */}
        {isExpanded && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl max-h-96 overflow-hidden z-50" style={{ maxWidth: 'calc(100vw - 2rem)' }}>
            {/* Filters */}
            {showFilters && !compact && (
              <div className="border-b border-gray-200 dark:border-gray-700 p-4">
                <SearchFilters
                  filters={filters}
                  onChange={handleFilterChange}
                  compact={true}
                />
              </div>
            )}

            {/* Content */}
            <div className="max-h-80 overflow-y-auto">
              {showResults && query.trim().length >= 2 ? (
                // Search Results
                <div>
                  {error ? (
                    <div className="p-4 text-center text-red-600 dark:text-red-400">
                      <p>Error searching: {error}</p>
                    </div>
                  ) : displayResults.length > 0 ? (
                    <SearchResults
                      results={displayResults}
                      onResultSelect={handleResultSelect}
                      compact={true}
                    />
                  ) : !loading ? (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <p>No results found for "{query}"</p>
                    </div>
                  ) : null}
                </div>
              ) : (
                // Suggestions and History
                <div>
                  {/* Suggestions */}
                  {showSuggestions && suggestions.length > 0 && query.trim().length >= 1 && (
                    <div className="border-b border-gray-200 dark:border-gray-700">
                      <SearchSuggestions
                        suggestions={suggestions}
                        onSuggestionSelect={handleSuggestionSelect}
                        query={query}
                      />
                    </div>
                  )}

                  {/* History */}
                  {showHistory && history.length > 0 && query.trim().length === 0 && (
                    <SearchHistory
                      history={history}
                      onHistorySelect={handleHistorySelect}
                      onClearHistory={clearHistory}
                    />
                  )}

                  {/* Empty State */}
                  {query.trim().length === 0 && history.length === 0 && (
                    <div className="p-4 text-center text-gray-500 dark:text-gray-400">
                      <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                      <p className="text-sm">Start typing to search</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Footer Actions */}
            {query.trim().length >= 2 && (
              <div className="border-t border-gray-200 dark:border-gray-700 p-3 flex items-center justify-between">
                <button
                  onClick={handleSaveSearch}
                  className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Save search
                </button>
                
                <button
                  onClick={handleSearch}
                  className="text-sm bg-blue-600 text-white px-3 py-1.5 rounded-md hover:bg-blue-700"
                >
                  View all results
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Backdrop */}
      {isExpanded && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-25 z-40"
          onClick={() => {
            setIsExpanded(false);
            setShowResults(false);
          }}
        />
      )}
    </div>
  );
};

export default GlobalSearchInterface;