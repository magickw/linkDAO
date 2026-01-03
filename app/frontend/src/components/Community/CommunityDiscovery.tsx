/**
 * CommunityDiscovery Component
 * Community search with full-text search, filtering, trending, and recommendations
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Community } from '../../models/Community';
import { CommunityService } from '../../services/communityService';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { InfiniteScroll } from '../ui/InfiniteScroll';
import { CommunityCardEnhanced as CommunityCard } from './CommunityCardEnhanced';
import { formatNumber } from '../../utils/formatters';
import { NoSearchResultsEmptyState } from './EmptyState';

interface CommunityDiscoveryProps {
  onCommunitySelect?: (community: Community) => void;
  showJoinButton?: boolean;
  maxResults?: number;
}

interface SearchFilters {
  category: string;
  tags: string[];
  memberRange: 'any' | 'small' | 'medium' | 'large';
  activityLevel: 'any' | 'low' | 'medium' | 'high';
  isPublic?: boolean;
}

interface TrendingCommunity extends Community {
  trendingScore: number;
  growthRate: number;
  activityLevel: 'low' | 'medium' | 'high';
}

const CommunityDiscovery: React.FC<CommunityDiscoveryProps> = ({
  onCommunitySelect,
  showJoinButton = true,
  maxResults = 50
}) => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [trendingCommunities, setTrendingCommunities] = useState<TrendingCommunity[]>([]);
  const [recommendedCommunities, setRecommendedCommunities] = useState<Community[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'search' | 'trending' | 'recommended'>('trending');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<SearchFilters>({
    category: 'all',
    tags: [],
    memberRange: 'any',
    activityLevel: 'any',
    isPublic: true
  });

  // Available categories and tags
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'defi', label: 'DeFi' },
    { value: 'nft', label: 'NFTs' },
    { value: 'gaming', label: 'Gaming' },
    { value: 'dao', label: 'DAOs' },
    { value: 'trading', label: 'Trading' },
    { value: 'development', label: 'Development' },
    { value: 'general', label: 'General' }
  ];

  const popularTags = [
    'ethereum', 'bitcoin', 'web3', 'blockchain', 'crypto',
    'metaverse', 'ai', 'governance', 'yield-farming', 'staking'
  ];

  // Search communities
  const searchCommunities = useCallback(async (
    query: string = searchQuery,
    pageNum: number = 1,
    reset: boolean = true
  ) => {
    try {
      if (pageNum === 1) {
        setLoading(true);
        setError(null);
      } else {
        setLoadingMore(true);
      }

      const params = new URLSearchParams({
        q: query,
        page: pageNum.toString(),
        limit: '20',
        ...(filters.category !== 'all' && { category: filters.category }),
        ...(filters.tags.length > 0 && { tags: filters.tags.join(',') }),
        ...(filters.memberRange !== 'any' && { memberRange: filters.memberRange }),
        ...(filters.activityLevel !== 'any' && { activityLevel: filters.activityLevel }),
        ...(filters.isPublic !== undefined && { isPublic: filters.isPublic.toString() })
      });

      const response = await fetch(`/api/communities/search?${params}`);

      if (!response.ok) {
        throw new Error('Failed to search communities');
      }

      const data = await response.json();

      if (reset || pageNum === 1) {
        setCommunities(data.communities);
      } else {
        setCommunities(prev => [...prev, ...data.communities]);
      }

      setHasMore(data.hasMore);
      setPage(pageNum);
    } catch (err) {
      console.error('Error searching communities:', err);
      setError(err instanceof Error ? err.message : 'Failed to search communities');
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [searchQuery, filters]);

  // Load trending communities
  const loadTrendingCommunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/communities/trending?limit=20');

      if (!response.ok) {
        throw new Error('Failed to load trending communities');
      }

      const data = await response.json();
      setTrendingCommunities(data.communities);
    } catch (err) {
      console.error('Error loading trending communities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load trending communities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load recommended communities
  const loadRecommendedCommunities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/communities/recommended?limit=20');

      if (!response.ok) {
        throw new Error('Failed to load recommended communities');
      }

      const data = await response.json();
      setRecommendedCommunities(data.communities);
    } catch (err) {
      console.error('Error loading recommended communities:', err);
      setError(err instanceof Error ? err.message : 'Failed to load recommended communities');
    } finally {
      setLoading(false);
    }
  }, []);

  // Load more search results
  const loadMore = useCallback(() => {
    if (!loadingMore && hasMore && activeTab === 'search') {
      searchCommunities(searchQuery, page + 1, false);
    }
  }, [searchCommunities, searchQuery, page, loadingMore, hasMore, activeTab]);

  // Handle search input change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    if (value.trim()) {
      setActiveTab('search');
    }
  };

  // Handle filter change
  const handleFilterChange = (newFilters: Partial<SearchFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  // Handle tag toggle
  const handleTagToggle = (tag: string) => {
    setFilters(prev => ({
      ...prev,
      tags: prev.tags.includes(tag)
        ? prev.tags.filter(t => t !== tag)
        : [...prev.tags, tag]
    }));
  };

  // Handle community join
  const handleJoinCommunity = async (communityId: string) => {
    try {
      const response = await fetch(`/api/communities/${communityId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        throw new Error('Failed to join community');
      }

      // Update community in local state
      const updateCommunityList = (communities: Community[]) =>
        communities.map(community =>
          community.id === communityId
            ? { ...community, memberCount: community.memberCount + 1 }
            : community
        );

      setCommunities(updateCommunityList);
      setTrendingCommunities(prev => updateCommunityList(prev as Community[]) as TrendingCommunity[]);
      setRecommendedCommunities(updateCommunityList);
    } catch (error) {
      console.error('Error joining community:', error);
    }
  };

  // Load data based on active tab
  useEffect(() => {
    switch (activeTab) {
      case 'search':
        if (searchQuery.trim()) {
          searchCommunities(searchQuery, 1, true);
        }
        break;
      case 'trending':
        loadTrendingCommunities();
        break;
      case 'recommended':
        loadRecommendedCommunities();
        break;
    }
  }, [activeTab, searchCommunities, loadTrendingCommunities, loadRecommendedCommunities, searchQuery]);

  // Search when filters change
  useEffect(() => {
    if (activeTab === 'search' && searchQuery.trim()) {
      searchCommunities(searchQuery, 1, true);
    }
  }, [filters, searchCommunities, activeTab, searchQuery]);

  // Get current communities to display
  const currentCommunities = useMemo(() => {
    switch (activeTab) {
      case 'search':
        return communities;
      case 'trending':
        return trendingCommunities;
      case 'recommended':
        return recommendedCommunities;
      default:
        return [];
    }
  }, [activeTab, communities, trendingCommunities, recommendedCommunities]);

  return (
    <div className="community-discovery">
      {/* Search Header */}
      <div className="discovery-header">
        <h2>Discover Communities</h2>
        <p>Find and join communities that match your interests</p>
      </div>

      {/* Search Bar */}
      <div className="search-section">
        <div className="search-bar">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z" />
          </svg>
          <input
            type="text"
            placeholder="Search communities..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="discovery-tabs">
        <button
          onClick={() => setActiveTab('trending')}
          className={`tab ${activeTab === 'trending' ? 'active' : ''}`}
        >
          🔥 Trending
        </button>
        <button
          onClick={() => setActiveTab('recommended')}
          className={`tab ${activeTab === 'recommended' ? 'active' : ''}`}
        >
          ⭐ Recommended
        </button>
        {searchQuery.trim() && (
          <button
            onClick={() => setActiveTab('search')}
            className={`tab ${activeTab === 'search' ? 'active' : ''}`}
          >
            🔍 Search Results
          </button>
        )}
      </div>

      {/* Filters */}
      {activeTab === 'search' && (
        <div className="filters-section">
          <div className="filter-row">
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange({ category: e.target.value })}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>

            <select
              value={filters.memberRange}
              onChange={(e) => handleFilterChange({ memberRange: e.target.value as any })}
              className="filter-select"
            >
              <option value="any">Any Size</option>
              <option value="small">Small (&lt;100)</option>
              <option value="medium">Medium (100-1K)</option>
              <option value="large">Large (&gt;1K)</option>
            </select>

            <select
              value={filters.activityLevel}
              onChange={(e) => handleFilterChange({ activityLevel: e.target.value as any })}
              className="filter-select"
            >
              <option value="any">Any Activity</option>
              <option value="high">Very Active</option>
              <option value="medium">Moderately Active</option>
              <option value="low">Less Active</option>
            </select>
          </div>

          {/* Popular Tags */}
          <div className="tags-section">
            <span className="tags-label">Popular Tags:</span>
            <div className="tags-list">
              {popularTags.map(tag => (
                <button
                  key={tag}
                  onClick={() => handleTagToggle(tag)}
                  className={`tag-button ${filters.tags.includes(tag) ? 'active' : ''}`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Results */}
      <div className="discovery-results">
        {loading && currentCommunities.length === 0 ? (
          <div className="loading-state">
            <LoadingSpinner size="lg" />
            <p>Loading communities...</p>
          </div>
        ) : error ? (
          <div className="error-state">
            <h3>Failed to load communities</h3>
            <p>{error}</p>
            <button
              onClick={() => {
                switch (activeTab) {
                  case 'search':
                    searchCommunities(searchQuery, 1, true);
                    break;
                  case 'trending':
                    loadTrendingCommunities();
                    break;
                  case 'recommended':
                    loadRecommendedCommunities();
                    break;
                }
              }}
              className="retry-button"
            >
              Try Again
            </button>
          </div>
        ) : currentCommunities.length === 0 ? (
          <NoSearchResultsEmptyState
            searchQuery={activeTab === 'search' ? searchQuery : undefined}
            onClearSearch={activeTab === 'search' ? () => {
              setSearchQuery('');
              setFilters(prev => ({ ...prev, category: 'all', tags: [], memberRange: 'any', activityLevel: 'any' }));
            } : undefined}
          />
        ) : (
          <InfiniteScroll
            hasMore={hasMore && activeTab === 'search'}
            loadMore={loadMore}
            loading={loadingMore}
          >
            <div className="communities-grid">
              {currentCommunities.map(community => (
                <CommunityCard
                  key={community.id}
                  community={community}
                  onSelect={onCommunitySelect}
                  onJoin={showJoinButton ? handleJoinCommunity : undefined}
                  showTrendingInfo={activeTab === 'trending'}
                />
              ))}
            </div>
          </InfiniteScroll>
        )}
      </div>

      <style jsx>{`
        .community-discovery {
          max-width: 1200px;
          margin: 0 auto;
          padding: 2rem;
        }

        .discovery-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .discovery-header h2 {
          color: var(--text-primary);
          margin: 0 0 0.5rem 0;
        }

        .discovery-header p {
          color: var(--text-secondary);
          margin: 0;
        }

        .search-section {
          margin-bottom: 2rem;
        }

        .search-bar {
          display: flex;
          align-items: center;
          gap: 1rem;
          padding: 1rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          max-width: 600px;
          margin: 0 auto;
        }

        .search-bar svg {
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        .search-input {
          flex: 1;
          border: none;
          background: none;
          color: var(--text-primary);
          font-size: 1rem;
        }

        .search-input:focus {
          outline: none;
        }

        .search-input::placeholder {
          color: var(--text-secondary);
        }

        .discovery-tabs {
          display: flex;
          justify-content: center;
          gap: 1rem;
          margin-bottom: 2rem;
        }

        .tab {
          padding: 0.75rem 1.5rem;
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-weight: 500;
        }

        .tab:hover {
          background: var(--bg-tertiary);
          color: var(--text-primary);
        }

        .tab.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .filters-section {
          background: var(--bg-secondary);
          border: 1px solid var(--border-light);
          border-radius: 0.5rem;
          padding: 1.5rem;
          margin-bottom: 2rem;
        }

        .filter-row {
          display: flex;
          gap: 1rem;
          margin-bottom: 1rem;
        }

        .filter-select {
          padding: 0.5rem;
          background: var(--bg-primary);
          border: 1px solid var(--border-light);
          border-radius: 0.25rem;
          color: var(--text-primary);
          cursor: pointer;
          flex: 1;
        }

        .filter-select:focus {
          outline: none;
          border-color: var(--primary-color);
        }

        .tags-section {
          display: flex;
          align-items: center;
          gap: 1rem;
          flex-wrap: wrap;
        }

        .tags-label {
          color: var(--text-secondary);
          font-weight: 500;
          white-space: nowrap;
        }

        .tags-list {
          display: flex;
          gap: 0.5rem;
          flex-wrap: wrap;
        }

        .tag-button {
          padding: 0.25rem 0.75rem;
          background: var(--bg-tertiary);
          border: 1px solid var(--border-light);
          border-radius: 1rem;
          color: var(--text-secondary);
          cursor: pointer;
          transition: all 0.2s ease;
          font-size: 0.875rem;
        }

        .tag-button:hover {
          background: var(--bg-quaternary);
          color: var(--text-primary);
        }

        .tag-button.active {
          background: var(--primary-color);
          color: white;
          border-color: var(--primary-color);
        }

        .loading-state,
        .error-state,
        .empty-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 3rem;
          text-align: center;
        }

        .loading-state p,
        .error-state p,
        .empty-state p {
          color: var(--text-secondary);
          margin: 1rem 0;
        }

        .error-state h3,
        .empty-state h3 {
          color: var(--text-primary);
          margin-bottom: 0.5rem;
        }

        .retry-button {
          padding: 0.75rem 1.5rem;
          background: var(--primary-color);
          color: white;
          border: none;
          border-radius: 0.5rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .retry-button:hover {
          background: var(--primary-color-dark);
        }

        .communities-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
          gap: 1.5rem;
        }

        /* Responsive Design */
        @media (max-width: 768px) {
          .community-discovery {
            padding: 1rem;
          }

          .discovery-tabs {
            flex-wrap: wrap;
            justify-content: center;
          }

          .filter-row {
            flex-direction: column;
          }

          .tags-section {
            flex-direction: column;
            align-items: flex-start;
          }

          .communities-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default CommunityDiscovery;