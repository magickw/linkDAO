import React, { useState, useCallback, useEffect } from 'react';
import { FeedFilter, FeedSortType, EnhancedPost, Web3SortType } from '../../types/feed';
import { AdvancedFeedFilters } from './AdvancedFeedFilters';
import { EnhancedFeedSortingTabs } from './EnhancedFeedSortingTabs';
import { Web3MetricsSorting } from './Web3MetricsSorting';
import { EngagementMetricsDisplay } from './EngagementMetricsDisplay';
import { BookmarkSystem } from './BookmarkSystem';
import { ViewTrackingSystem, ViewCountDisplay } from './ViewTrackingSystem';
import { TrendingIndicators } from './TrendingIndicators';
import { useFeedPreferences } from '../../hooks/useFeedPreferences';

interface AdvancedFeedSystemProps {
  posts: EnhancedPost[];
  onFilterChange: (filter: FeedFilter) => void;
  onPostsUpdate: (posts: EnhancedPost[]) => void;
  communityName?: string;
  showAdvancedMetrics?: boolean;
  className?: string;
}

interface FeedViewMode {
  mode: 'compact' | 'detailed' | 'cards';
  showMetrics: boolean;
  showTrending: boolean;
  showBookmarks: boolean;
}

export const AdvancedFeedSystem: React.FC<AdvancedFeedSystemProps> = ({
  posts,
  onFilterChange,
  onPostsUpdate,
  communityName,
  showAdvancedMetrics = true,
  className = ''
}) => {
  const { getFullFilter, savePreferences } = useFeedPreferences();
  
  // State
  const [currentFilter, setCurrentFilter] = useState<FeedFilter>(getFullFilter());
  const [viewMode, setViewMode] = useState<FeedViewMode>({
    mode: 'cards',
    showMetrics: true,
    showTrending: true,
    showBookmarks: true
  });
  const [activeTab, setActiveTab] = useState<'basic' | 'advanced' | 'web3'>('basic');
  const [sortedPosts, setSortedPosts] = useState<EnhancedPost[]>(posts);

  // Handle filter changes
  const handleFilterChange = useCallback((newFilter: Partial<FeedFilter>) => {
    const updatedFilter = { ...currentFilter, ...newFilter };
    setCurrentFilter(updatedFilter);
    onFilterChange(updatedFilter);
    savePreferences({ lastFilter: updatedFilter });
  }, [currentFilter, onFilterChange, savePreferences]);

  // Handle Web3 sorting
  const handleWeb3Sort = useCallback((sortType: Web3SortType, direction: 'asc' | 'desc') => {
    handleFilterChange({
      web3Sort: sortType,
      web3SortDirection: direction
    });
  }, [handleFilterChange]);

  // Handle view mode changes
  const handleViewModeChange = useCallback((newViewMode: Partial<FeedViewMode>) => {
    const updatedViewMode = { ...viewMode, ...newViewMode };
    setViewMode(updatedViewMode);
    savePreferences({ viewMode: updatedViewMode });
  }, [viewMode, savePreferences]);

  // Handle bookmark changes
  const handleBookmarkChange = useCallback((postId: string, isBookmarked: boolean) => {
    const updatedPosts = posts.map(post => 
      post.id === postId ? { ...post, isBookmarked } : post
    );
    onPostsUpdate(updatedPosts);
  }, [posts, onPostsUpdate]);

  // Handle view tracking
  const handleViewTracked = useCallback((postId: string, viewData: any) => {
    const updatedPosts = posts.map(post => 
      post.id === postId ? { ...post, views: post.views + 1 } : post
    );
    onPostsUpdate(updatedPosts);
  }, [posts, onPostsUpdate]);

  // Sort posts based on current filter
  useEffect(() => {
    let sorted = [...posts];

    // Apply Web3 sorting if specified
    if (currentFilter.web3Sort) {
      sorted.sort((a, b) => {
        let aValue = 0;
        let bValue = 0;

        switch (currentFilter.web3Sort) {
          case Web3SortType.TOKEN_ACTIVITY:
            aValue = a.reactions.reduce((sum, r) => sum + r.totalAmount, 0) + 
                    a.tips.reduce((sum, t) => sum + t.amount, 0);
            bValue = b.reactions.reduce((sum, r) => sum + r.totalAmount, 0) + 
                    b.tips.reduce((sum, t) => sum + t.amount, 0);
            break;
          case Web3SortType.STAKING_AMOUNT:
            aValue = a.reactions.reduce((sum, r) => sum + r.totalAmount, 0);
            bValue = b.reactions.reduce((sum, r) => sum + r.totalAmount, 0);
            break;
          case Web3SortType.TIP_AMOUNT:
            aValue = a.tips.reduce((sum, t) => sum + t.amount, 0);
            bValue = b.tips.reduce((sum, t) => sum + t.amount, 0);
            break;
          case Web3SortType.UNIQUE_STAKERS:
            aValue = new Set(a.reactions.flatMap(r => r.users.map(u => u.address))).size;
            bValue = new Set(b.reactions.flatMap(r => r.users.map(u => u.address))).size;
            break;
          case Web3SortType.ENGAGEMENT_VELOCITY:
            const aAge = Date.now() - new Date(a.createdAt).getTime();
            const bAge = Date.now() - new Date(b.createdAt).getTime();
            aValue = a.engagementScore / (aAge / (1000 * 60 * 60)); // per hour
            bValue = b.engagementScore / (bAge / (1000 * 60 * 60)); // per hour
            break;
          default:
            aValue = a.engagementScore;
            bValue = b.engagementScore;
        }

        return currentFilter.web3SortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      });
    } else {
      // Apply basic sorting
      switch (currentFilter.sortBy) {
        case FeedSortType.NEW:
          sorted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
          break;
        case FeedSortType.TOP:
          sorted.sort((a, b) => b.engagementScore - a.engagementScore);
          break;
        case FeedSortType.RISING:
          sorted.sort((a, b) => (b.trendingScore || 0) - (a.trendingScore || 0));
          break;
        case FeedSortType.HOT:
        default:
          // Hot algorithm combines engagement and recency
          sorted.sort((a, b) => {
            const aHotScore = a.engagementScore * (1 + (a.trendingScore || 0) / 1000);
            const bHotScore = b.engagementScore * (1 + (b.trendingScore || 0) / 1000);
            return bHotScore - aHotScore;
          });
      }
    }

    setSortedPosts(sorted);
  }, [posts, currentFilter]);

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Filter and Sort Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        {/* Tab Navigation */}
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setActiveTab('basic')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'basic'
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Basic Sorting
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'advanced'
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              Advanced Filters
            </button>
            <button
              onClick={() => setActiveTab('web3')}
              className={`px-3 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                activeTab === 'web3'
                  ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              💎 Web3 Metrics
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-4">
          {activeTab === 'basic' && (
            <EnhancedFeedSortingTabs
              activeSort={currentFilter.sortBy}
              activeTimeRange={currentFilter.timeRange}
              onSortChange={(sort) => handleFilterChange({ sortBy: sort })}
              onTimeRangeChange={(timeRange) => handleFilterChange({ timeRange })}
            />
          )}

          {activeTab === 'advanced' && (
            <AdvancedFeedFilters
              filter={currentFilter}
              onFilterChange={handleFilterChange}
            />
          )}

          {activeTab === 'web3' && (
            <Web3MetricsSorting
              onSortChange={handleWeb3Sort}
              currentSort={currentFilter.web3Sort}
              currentDirection={currentFilter.web3SortDirection}
            />
          )}
        </div>
      </div>

      {/* View Mode Controls */}
      <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            View Mode:
          </span>
          <div className="flex items-center space-x-2">
            {(['compact', 'detailed', 'cards'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => handleViewModeChange({ mode })}
                className={`px-3 py-1 text-xs font-medium rounded transition-colors duration-200 ${
                  viewMode.mode === mode
                    ? 'bg-primary-100 dark:bg-primary-900/20 text-primary-700 dark:text-primary-300'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {mode.charAt(0).toUpperCase() + mode.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={viewMode.showMetrics}
              onChange={(e) => handleViewModeChange({ showMetrics: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Show Metrics</span>
          </label>
          <label className="flex items-center space-x-2 text-sm">
            <input
              type="checkbox"
              checked={viewMode.showTrending}
              onChange={(e) => handleViewModeChange({ showTrending: e.target.checked })}
              className="w-4 h-4 text-primary-600 bg-gray-100 border-gray-300 rounded focus:ring-primary-500"
            />
            <span className="text-gray-700 dark:text-gray-300">Show Trending</span>
          </label>
        </div>
      </div>

      {/* Posts Feed */}
      <div className="space-y-4">
        {sortedPosts.map((post, index) => (
          <div
            key={post.id}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 ${
              viewMode.mode === 'compact' ? 'p-4' : 'p-6'
            }`}
          >
            {/* View Tracking */}
            <ViewTrackingSystem
              post={post}
              onViewTracked={handleViewTracked}
              className="absolute inset-0 pointer-events-none"
            />

            {/* Post Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center text-white font-medium">
                  {post.author.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">
                    {post.author}
                  </div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    {new Date(post.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <ViewCountDisplay post={post} showDetailed={viewMode.mode === 'detailed'} />
                {viewMode.showBookmarks && (
                  <BookmarkSystem
                    post={post}
                    onBookmarkChange={handleBookmarkChange}
                    size={viewMode.mode === 'compact' ? 'sm' : 'md'}
                  />
                )}
              </div>
            </div>

            {/* Trending Indicators */}
            {viewMode.showTrending && post.trendingScore && post.trendingScore > 50 && (
              <div className="mb-4">
                <TrendingIndicators
                  post={post}
                  communityName={communityName}
                  showAlgorithmInfo={viewMode.mode === 'detailed'}
                />
              </div>
            )}

            {/* Post Content */}
            <div className="mb-4">
              <p className="text-gray-900 dark:text-white">
                Post content for {post.id}...
              </p>
              {post.tags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {post.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2 py-1 text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-full"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Engagement Metrics */}
            {viewMode.showMetrics && showAdvancedMetrics && (
              <div className="mb-4">
                <EngagementMetricsDisplay
                  post={post}
                  showDetailed={viewMode.mode === 'detailed'}
                  showRealTimeUpdates={true}
                />
              </div>
            )}

            {/* Post Actions */}
            <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
                  <span>👍</span>
                  <span className="text-sm">{post.reactions.reduce((sum, r) => sum + r.users.length, 0)}</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
                  <span>💬</span>
                  <span className="text-sm">{post.comments}</span>
                </button>
                <button className="flex items-center space-x-1 text-gray-500 dark:text-gray-400 hover:text-primary-600 dark:hover:text-primary-400 transition-colors duration-200">
                  <span>🔄</span>
                  <span className="text-sm">{post.shares}</span>
                </button>
              </div>

              <div className="text-sm text-gray-500 dark:text-gray-400">
                Score: {post.engagementScore}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Results Summary */}
      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Showing {sortedPosts.length} posts
          {currentFilter.web3Sort && (
            <span> • Sorted by {currentFilter.web3Sort.replace('_', ' ')}</span>
          )}
          {currentFilter.postTypes?.length && (
            <span> • Filtered by {currentFilter.postTypes.join(', ')}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdvancedFeedSystem;