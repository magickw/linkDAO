import React, { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useEnhancedSearch } from '../../hooks/useEnhancedSearch';
import { EnhancedSearchFilters, SearchSuggestion } from '../../types/enhancedSearch';
import { SearchResultsView } from './SearchResultsView';
import { SearchSuggestions } from './SearchSuggestions';
import { SearchFilters } from './SearchFilters';
import { LoadingSkeletons } from '../LoadingSkeletons';

interface EnhancedSearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: EnhancedSearchFilters;
  onResultSelect?: (type: 'post' | 'community' | 'user', id: string) => void;
  className?: string;
  showFilters?: boolean;
  placeholder?: string;
  communityId?: string; // For community-specific search
}

export function EnhancedSearchInterface({
  initialQuery = '',
  initialFilters = {},
  onResultSelect,
  className = '',
  showFilters = true,
  placeholder = 'Search posts, communities, users, hashtags, and topics...',
  communityId
}: EnhancedSearchInterfaceProps) {
  const router = useRouter();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    filters,
    setFilters,
    results,
    loading,
    error,
    suggestions,
    showSuggestions,
    setShowSuggestions,
    search,
    clearSearch,
    loadMore,
    hasMore,
    trackClick,
    bookmarkItem,
    followItem,
    joinCommunity,
    searchInCommunity
  } = useEnhancedSearch({
    debounceMs: 300,
    enableSuggestions: true,
    enableLearning: true,
    trackAnalytics: true
  });

  const [activeTab, setActiveTab] = useState<'all' | 'posts' | 'communities' | 'users'>('all');

  // Initialize from props
  useEffect(() => {
    if (initialQuery && initialQuery !== query) {
      setQuery(initialQuery);
    }
    if (Object.keys(initialFilters).length > 0) {
      setFilters({ ...filters, ...initialFilters });
    }
  }, [initialQuery, initialFilters]);

  // Handle search submission
  const handleSearch = async (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    setShowSuggestions(false);
    
    if (communityId) {
      await searchInCommunity(communityId, finalQuery);
    } else {
      await search(finalQuery, { ...filters, type: activeTab === 'all' ? undefined : activeTab });
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: SearchSuggestion) => {
    let searchText = suggestion.text;
    
    if (suggestion.type === 'hashtag') {
      searchText = `#${suggestion.text}`;
    } else if (suggestion.type === 'user') {
      searchText = `@${suggestion.text}`;
    }
    
    setQuery(searchText);
    handleSearch(searchText);
  };

  // Handle result click
  const handleResultClick = (type: 'post' | 'community' | 'user', id: string, position: number) => {
    trackClick(type, id, position);
    
    if (onResultSelect) {
      onResultSelect(type, id);
    } else {
      // Default navigation behavior
      switch (type) {
        case 'community':
          router.push(`/dashboard?community=${id}`);
          break;
        case 'user':
          router.push(`/profile?user=${id}`);
          break;
        case 'post':
          // Navigate to post detail or highlight in feed
          break;
      }
    }
  };

  // Handle tab change
  const handleTabChange = (tab: typeof activeTab) => {
    setActiveTab(tab);
    if (query.trim()) {
      search(query, { ...filters, type: tab === 'all' ? undefined : tab });
    }
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<EnhancedSearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
  };

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(event.target as Node) &&
        !searchInputRef.current?.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className={`max-w-6xl mx-auto ${className}`}>
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        {/* Search Input */}
        <div className="relative mb-6">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              } else if (e.key === 'ArrowDown' && suggestions.length > 0) {
                e.preventDefault();
                setShowSuggestions(true);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder={placeholder}
            className="block w-full pl-12 pr-16 py-4 text-lg border border-gray-300 dark:border-gray-600 rounded-xl leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-all duration-200"
          />
          
          {/* Search Actions */}
          <div className="absolute inset-y-0 right-0 flex items-center space-x-2 pr-4">
            {query && (
              <button
                onClick={clearSearch}
                className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                title="Clear search"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              onClick={() => handleSearch()}
              disabled={loading}
              className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Search"
            >
              {loading ? (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>

          {/* Search Suggestions */}
          {showSuggestions && suggestions.length > 0 && (
            <SearchSuggestions
              ref={suggestionsRef}
              suggestions={suggestions}
              onSelect={handleSuggestionSelect}
              onClose={() => setShowSuggestions(false)}
            />
          )}
        </div>

        {/* Search Tabs */}
        {!communityId && (
          <div className="flex space-x-1 mb-6">
            {[
              { id: 'all', label: 'All', icon: '🔍', count: results?.totalResults },
              { id: 'posts', label: 'Posts', icon: '📝', count: results?.posts.length },
              { id: 'communities', label: 'Communities', icon: '👥', count: results?.communities.length },
              { id: 'users', label: 'Users', icon: '👤', count: results?.users.length }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
                {tab.count !== undefined && tab.count > 0 && (
                  <span className={`px-2 py-0.5 text-xs rounded-full ${
                    activeTab === tab.id
                      ? 'bg-primary-200 text-primary-800 dark:bg-primary-800 dark:text-primary-200'
                      : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}

        {/* Search Filters */}
        {showFilters && (
          <SearchFilters
            filters={filters}
            onChange={handleFilterChange}
            activeTab={activeTab}
            communityId={communityId}
          />
        )}

        {/* Search Stats */}
        {results && (
          <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div>
              Found {results.totalResults.toLocaleString()} results for "{query}"
              {results.searchTime && (
                <span className="ml-2">({results.searchTime}ms)</span>
              )}
            </div>
            {error && (
              <div className="text-red-600 dark:text-red-400">
                {error}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Search Results */}
      {loading && !results ? (
        <LoadingSkeletons.SearchResults />
      ) : results ? (
        <SearchResultsView
          results={results}
          activeTab={activeTab}
          onResultClick={handleResultClick}
          onBookmark={bookmarkItem}
          onFollow={followItem}
          onJoin={joinCommunity}
          onLoadMore={loadMore}
          hasMore={hasMore}
          loading={loading}
        />
      ) : query.trim() && !loading ? (
        <div className="text-center py-12">
          <div className="mx-auto h-12 w-12 text-gray-400 mb-4">
            <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No results found</h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            No results found for "{query}". Try adjusting your search terms or filters.
          </p>
          <button
            onClick={clearSearch}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Clear Search
          </button>
        </div>
      ) : null}
    </div>
  );
}