import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/router';
import { useWeb3 } from '@/context/Web3Context';
import { useToast } from '@/context/ToastContext';
import { SearchService, SearchFilters, SearchResults } from '@/services/searchService';
import { Post } from '@/models/Post';
import { Community } from '@/models/Community';
import { UserProfile } from '@/models/UserProfile';
import Web3SocialPostCard from '@/components/Web3SocialPostCard';
import { LoadingSkeletons } from '@/components/LoadingSkeletons';
import { EmptyState } from '@/components/FallbackStates';

interface SearchInterfaceProps {
  initialQuery?: string;
  initialFilters?: SearchFilters;
  onResultSelect?: (type: 'post' | 'community' | 'user', id: string) => void;
  className?: string;
}

type SearchTab = 'all' | 'posts' | 'communities' | 'users';

export default function SearchInterface({
  initialQuery = '',
  initialFilters = {},
  onResultSelect,
  className = ''
}: SearchInterfaceProps) {
  const router = useRouter();
  const { address, isConnected } = useWeb3();
  const { addToast } = useToast();
  
  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<{
    posts: string[];
    communities: string[];
    users: string[];
    hashtags: string[];
  }>({ posts: [], communities: [], users: [], hashtags: [] });
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [page, setPage] = useState(0);
  
  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search function
  const performSearch = useCallback(async (searchQuery: string, searchFilters: SearchFilters, pageNum: number = 0) => {
    if (!searchQuery.trim()) {
      setResults(null);
      return;
    }

    try {
      setLoading(true);
      
      const searchResults = await SearchService.search(
        searchQuery,
        { ...searchFilters, type: activeTab === 'all' ? undefined : activeTab },
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
      
      // Update URL with search params
      const searchParams = new URLSearchParams();
      searchParams.set('q', searchQuery);
      if (activeTab !== 'all') searchParams.set('type', activeTab);
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value && value !== 'all') {
          searchParams.set(key, Array.isArray(value) ? value.join(',') : value.toString());
        }
      });
      
      router.replace(`/search?${searchParams.toString()}`, undefined, { shallow: true });
    } catch (error) {
      console.error('Search error:', error);
      addToast(error instanceof Error ? error.message : 'Search failed', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, router, addToast]);

  // Get search suggestions
  const getSuggestions = useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setSuggestions({ posts: [], communities: [], users: [], hashtags: [] });
      return;
    }

    try {
      const suggestions = await SearchService.getSearchSuggestions(searchQuery, 'all', 5);
      setSuggestions(suggestions);
    } catch (error) {
      // Fail silently for suggestions
      setSuggestions({ posts: [], communities: [], users: [], hashtags: [] });
    }
  }, []);

  // Handle input change with debouncing
  const handleInputChange = (value: string) => {
    setQuery(value);
    setShowSuggestions(true);
    
    // Clear previous debounce
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    
    // Debounce suggestions
    debounceRef.current = setTimeout(() => {
      getSuggestions(value);
    }, 300);
  };

  // Handle search submission
  const handleSearch = (searchQuery?: string) => {
    const finalQuery = searchQuery || query;
    setShowSuggestions(false);
    setPage(0);
    performSearch(finalQuery, filters, 0);
  };

  // Handle filter changes
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    setPage(0);
    if (query.trim()) {
      performSearch(query, updatedFilters, 0);
    }
  };

  // Handle tab change
  const handleTabChange = (tab: SearchTab) => {
    setActiveTab(tab);
    setPage(0);
    if (query.trim()) {
      performSearch(query, filters, 0);
    }
  };

  // Load more results
  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1;
      setPage(nextPage);
      performSearch(query, filters, nextPage);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: string, type: string) => {
    if (type === 'hashtags') {
      setQuery(`#${suggestion}`);
      handleSearch(`#${suggestion}`);
    } else {
      setQuery(suggestion);
      handleSearch(suggestion);
    }
    setShowSuggestions(false);
  };

  // Handle result selection
  const handleResultClick = (type: 'post' | 'community' | 'user', id: string) => {
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

  // Initialize from URL params
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const urlQuery = urlParams.get('q');
    const urlType = urlParams.get('type') as SearchTab;
    
    if (urlQuery) {
      setQuery(urlQuery);
      if (urlType && ['all', 'posts', 'communities', 'users'].includes(urlType)) {
        setActiveTab(urlType);
      }
      performSearch(urlQuery, filters, 0);
    }
  }, []);

  const hasSuggestions = suggestions.posts.length > 0 || 
                       suggestions.communities.length > 0 || 
                       suggestions.users.length > 0 || 
                       suggestions.hashtags.length > 0;

  return (
    <div className={`max-w-4xl mx-auto ${className}`}>
      {/* Search Header */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
        {/* Search Input */}
        <div className="relative mb-4">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            ref={searchInputRef}
            type="text"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleSearch();
              } else if (e.key === 'Escape') {
                setShowSuggestions(false);
              }
            }}
            onFocus={() => setShowSuggestions(true)}
            placeholder="Search posts, communities, users, or hashtags..."
            className="block w-full pl-10 pr-12 py-3 border border-gray-300 dark:border-gray-600 rounded-lg leading-5 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
          <button
            onClick={() => handleSearch()}
            className="absolute inset-y-0 right-0 pr-3 flex items-center"
          >
            <svg className="h-5 w-5 text-gray-400 hover:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>

          {/* Search Suggestions */}
          {showSuggestions && hasSuggestions && (
            <div
              ref={suggestionsRef}
              className="absolute z-50 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-96 overflow-y-auto"
            >
              {suggestions.hashtags.length > 0 && (
                <div className="p-2">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Hashtags</div>
                  {suggestions.hashtags.map((hashtag) => (
                    <button
                      key={hashtag}
                      onClick={() => handleSuggestionSelect(hashtag, 'hashtags')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                    >
                      <span className="text-primary-600 dark:text-primary-400">#</span>
                      <span>{hashtag}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {suggestions.communities.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Communities</div>
                  {suggestions.communities.map((community) => (
                    <button
                      key={community}
                      onClick={() => handleSuggestionSelect(community, 'communities')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                    >
                      <span className="text-orange-600 dark:text-orange-400">r/</span>
                      <span>{community}</span>
                    </button>
                  ))}
                </div>
              )}
              
              {suggestions.users.length > 0 && (
                <div className="p-2 border-t border-gray-200 dark:border-gray-700">
                  <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Users</div>
                  {suggestions.users.map((user) => (
                    <button
                      key={user}
                      onClick={() => handleSuggestionSelect(user, 'users')}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 rounded flex items-center space-x-2"
                    >
                      <span className="text-blue-600 dark:text-blue-400">@</span>
                      <span>{user}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Search Tabs */}
        <div className="flex space-x-1 mb-4">
          {[
            { id: 'all', label: 'All', icon: '🔍' },
            { id: 'posts', label: 'Posts', icon: '📝' },
            { id: 'communities', label: 'Communities', icon: '👥' },
            { id: 'users', label: 'Users', icon: '👤' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id as SearchTab)}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-100 text-primary-800 dark:bg-primary-900 dark:text-primary-200'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Search Filters */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Time Range Filter */}
          <select
            value={filters.timeRange || 'all'}
            onChange={(e) => handleFilterChange({ timeRange: e.target.value as any })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="all">All Time</option>
            <option value="hour">Past Hour</option>
            <option value="day">Past Day</option>
            <option value="week">Past Week</option>
            <option value="month">Past Month</option>
            <option value="year">Past Year</option>
          </select>

          {/* Sort By Filter */}
          <select
            value={filters.sortBy || 'relevance'}
            onChange={(e) => handleFilterChange({ sortBy: e.target.value as any })}
            className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="relevance">Most Relevant</option>
            <option value="recent">Most Recent</option>
            <option value="popular">Most Popular</option>
            <option value="trending">Trending</option>
          </select>

          {/* Category Filter (for communities/posts) */}
          {(activeTab === 'all' || activeTab === 'communities' || activeTab === 'posts') && (
            <select
              value={filters.category || 'all'}
              onChange={(e) => handleFilterChange({ category: e.target.value === 'all' ? undefined : e.target.value })}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="all">All Categories</option>
              <option value="Technology">Technology</option>
              <option value="Gaming">Gaming</option>
              <option value="Art">Art</option>
              <option value="Music">Music</option>
              <option value="Sports">Sports</option>
              <option value="Education">Education</option>
              <option value="Business">Business</option>
              <option value="Science">Science</option>
            </select>
          )}
        </div>
      </div>

      {/* Search Results */}
      {loading && !results ? (
        <LoadingSkeletons.SearchResults />
      ) : results ? (
        <div className="space-y-6">
          {/* Results Summary */}
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Found {results.totalResults.toLocaleString()} results for "{query}"
          </div>

          {/* All Results or Filtered Results */}
          {(activeTab === 'all' || activeTab === 'posts') && results.posts.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Posts</h3>
              <div className="space-y-4">
                {results.posts.map((post) => (
                  <Web3SocialPostCard
                    key={post.id}
                    post={post}
                    profile={{ handle: 'Unknown', ens: '', avatarCid: 'https://placehold.co/40' }}
                    onTip={async () => {}}
                    onExpand={() => handleResultClick('post', post.id)}
                    className="cursor-pointer hover:shadow-md transition-shadow"
                  />
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'communities') && results.communities.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Communities</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {results.communities.map((community) => (
                  <div
                    key={community.id}
                    onClick={() => handleResultClick('community', community.id)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      {community.avatar ? (
                        <img src={community.avatar} alt={community.displayName} className="w-10 h-10 rounded-full" />
                      ) : (
                        <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-secondary-500 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold">{community.displayName.charAt(0).toUpperCase()}</span>
                        </div>
                      )}
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{community.displayName}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">r/{community.name}</p>
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">{community.description}</p>
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                      <span>{community.memberCount.toLocaleString()} members</span>
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">{community.category}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {(activeTab === 'all' || activeTab === 'users') && results.users.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Users</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {results.users.map((user) => (
                  <div
                    key={user.address}
                    onClick={() => handleResultClick('user', user.address)}
                    className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 cursor-pointer hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-center space-x-3 mb-2">
                      <img 
                        src={user.avatarCid || 'https://placehold.co/40'} 
                        alt={user.handle || 'User'} 
                        className="w-10 h-10 rounded-full" 
                      />
                      <div>
                        <h4 className="font-semibold text-gray-900 dark:text-white">{user.handle || 'Anonymous'}</h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{user.ens || `${user.address.slice(0, 6)}...${user.address.slice(-4)}`}</p>
                      </div>
                    </div>
                    {user.bioCid && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{user.bioCid}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Load More Button */}
          {hasMore && (
            <div className="text-center">
              <button
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Loading...' : 'Load More'}
              </button>
            </div>
          )}
        </div>
      ) : query.trim() && !loading ? (
        <EmptyState
          title="No results found"
          description={`No results found for "${query}". Try adjusting your search terms or filters.`}
          icon={
            <svg className="mx-auto h-12 w-12 text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
      ) : null}
    </div>
  );
}