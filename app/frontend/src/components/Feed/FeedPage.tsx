import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { FeedFilter, FeedSortType } from '../../types/feed';
import { EnhancedPost } from '../EnhancedPostCard/EnhancedPostCard';
import { FeedService } from '../../services/feedService';
import { useFeedSortingPreferences } from '../../hooks/useFeedPreferences';
import { useIntelligentCache } from '../../hooks/useIntelligentCache';
import EnhancedPostCard from '../EnhancedPostCard/EnhancedPostCard';
import { FeedSortingHeader } from './FeedSortingTabs';
import LoadingSkeletons from '../LoadingSkeletons/PostCardSkeleton';
import { ErrorBoundary } from '../ErrorHandling/ErrorBoundary';

interface FeedPageProps {
  communityId?: string;
  initialFilter?: Partial<FeedFilter>;
  className?: string;
  showHeader?: boolean;
  enablePullToRefresh?: boolean;
}

const PRELOAD_THRESHOLD = 10; // Load more when this many items from end

export default function FeedPage({
  communityId,
  initialFilter = {},
  className = '',
  showHeader = true,
  enablePullToRefresh = true
}: FeedPageProps) {
  // Hooks
  const { currentSort, currentTimeRange, updateSort, updateTimeRange } = useFeedSortingPreferences();
  const { cacheWithStrategy, invalidateByTags, predictivePreload } = useIntelligentCache();

  // State
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [filter, setFilter] = useState<FeedFilter>({
    sortBy: currentSort,
    timeRange: currentTimeRange,
    communityId,
    ...initialFilter
  });
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [refreshing, setRefreshing] = useState(false);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);
  const pullToRefreshRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef(false);
  const lastFilterRef = useRef<string>('');

  // Memoized filter key for comparison
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Load posts with intelligent caching
  const loadPosts = useCallback(async (pageNum: number, isRefresh: boolean = false) => {
    if (loadingRef.current && !isRefresh) return;
    
    loadingRef.current = true;
    setLoading(true);
    setError(null);

    try {
      // Try cache first for better performance
      const cacheKey = `feed-${filterKey}-${pageNum}`;
      let cachedResponse = null;
      
      if (!isRefresh) {
        cachedResponse = await cacheWithStrategy(
          `/api/feed/enhanced?${new URLSearchParams({
            sortBy: filter.sortBy,
            page: pageNum.toString(),
            limit: '20',
            ...(filter.timeRange && { timeRange: filter.timeRange }),
            ...(filter.communityId && { communityId: filter.communityId }),
            ...(filter.tags?.length && { tags: filter.tags.join(',') }),
            ...(filter.author && { author: filter.author })
          }).toString()}`,
          'feed',
          ['feed', 'posts', ...(filter.communityId ? [`community-${filter.communityId}`] : [])]
        );
      }

      let response;
      if (cachedResponse && !isRefresh) {
        response = await cachedResponse.json();
      } else {
        response = await FeedService.getEnhancedFeed(filter, pageNum, 20);
      }

      if (isRefresh || pageNum === 1) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }

      setHasMore(response.hasMore);
      setPage(pageNum);

      // Predictive preloading for next page
      if (response.hasMore && pageNum === 1) {
        setTimeout(() => {
          predictivePreload('current-user', 'viewing_feed', {
            filter,
            currentPage: pageNum
          });
        }, 1000);
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to load posts';
      setError(errorMessage);
      console.error('Error loading posts:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
      loadingRef.current = false;
    }
  }, [filter, filterKey, cacheWithStrategy, predictivePreload]);

  // Load more posts for infinite scroll
  const loadMore = useCallback(() => {
    if (!hasMore || loading || loadingRef.current) return;
    loadPosts(page + 1);
  }, [hasMore, loading, page, loadPosts]);

  // Refresh feed
  const refresh = useCallback(async () => {
    setRefreshing(true);
    
    // Invalidate cache for current filter
    await invalidateByTags(['feed', 'posts']);
    
    // Reset state and reload
    setPage(1);
    setHasMore(true);
    await loadPosts(1, true);
  }, [loadPosts, invalidateByTags]);

  // Handle filter changes
  useEffect(() => {
    if (filterKey !== lastFilterRef.current) {
      lastFilterRef.current = filterKey;
      
      // Reset state for new filter
      setPosts([]);
      setPage(1);
      setHasMore(true);
      setError(null);
      
      // Load posts with new filter
      loadPosts(1, true);
    }
  }, [filterKey, loadPosts]);

  // Update filter when preferences change
  useEffect(() => {
    setFilter(prev => ({
      ...prev,
      sortBy: currentSort,
      timeRange: currentTimeRange,
      communityId
    }));
  }, [currentSort, currentTimeRange, communityId]);

  // Handle sorting changes
  const handleSortChange = useCallback((sort: FeedSortType) => {
    updateSort(sort, true);
    setFilter(prev => ({ ...prev, sortBy: sort }));
  }, [updateSort]);

  // Handle time range changes
  const handleTimeRangeChange = useCallback((timeRange: string) => {
    updateTimeRange(timeRange, true);
    setFilter(prev => ({ ...prev, timeRange }));
  }, [updateTimeRange]);

  // Pull to refresh setup
  useEffect(() => {
    if (!enablePullToRefresh || !pullToRefreshRef.current) return;

    let startY = 0;
    let currentY = 0;
    let isPulling = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (containerRef.current?.scrollTop === 0) {
        startY = e.touches[0].clientY;
        isPulling = true;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isPulling) return;
      
      currentY = e.touches[0].clientY;
      const pullDistance = currentY - startY;
      
      if (pullDistance > 0 && pullDistance < 100) {
        e.preventDefault();
        if (pullToRefreshRef.current) {
          pullToRefreshRef.current.style.transform = `translateY(${pullDistance}px)`;
          pullToRefreshRef.current.style.opacity = `${pullDistance / 100}`;
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling) return;
      
      const pullDistance = currentY - startY;
      
      if (pullDistance > 80) {
        refresh();
      }
      
      if (pullToRefreshRef.current) {
        pullToRefreshRef.current.style.transform = 'translateY(0)';
        pullToRefreshRef.current.style.opacity = '0';
      }
      
      isPulling = false;
      startY = 0;
      currentY = 0;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('touchstart', handleTouchStart, { passive: false });
      container.addEventListener('touchmove', handleTouchMove, { passive: false });
      container.addEventListener('touchend', handleTouchEnd);

      return () => {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [enablePullToRefresh, refresh]);

  // Intersection observer for infinite scroll
  const observerRef = useRef<IntersectionObserver | null>(null);
  const lastPostElementRef = useCallback((node: HTMLDivElement) => {
    if (loading) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) {
        loadMore();
      }
    });
    if (node) observerRef.current.observe(node);
  }, [loading, hasMore, loadMore]);

  // Error state
  if (error && posts.length === 0) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <FeedHeader
            filter={filter}
            onSortChange={handleSortChange}
            onTimeRangeChange={handleTimeRangeChange}
          />
        )}
        <ErrorState error={error} onRetry={() => loadPosts(1, true)} />
      </div>
    );
  }

  // Empty state
  if (!loading && posts.length === 0 && !error) {
    return (
      <div className={`${className}`}>
        {showHeader && (
          <FeedHeader
            filter={filter}
            onSortChange={handleSortChange}
            onTimeRangeChange={handleTimeRangeChange}
          />
        )}
        <EmptyFeedState filter={filter} onRefresh={refresh} />
      </div>
    );
  }

  return (
    <div className={`${className} relative`} ref={containerRef}>
      {/* Pull to refresh indicator */}
      {enablePullToRefresh && (
        <div
          ref={pullToRefreshRef}
          className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4 bg-white dark:bg-gray-800 shadow-sm opacity-0 transform -translate-y-full transition-all duration-200"
        >
          <div className="flex items-center space-x-2 text-primary-600 dark:text-primary-400">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-current border-t-transparent" />
            <span className="text-sm font-medium">
              {refreshing ? 'Refreshing...' : 'Pull to refresh'}
            </span>
          </div>
        </div>
      )}

      {/* Feed header */}
      {showHeader && (
        <FeedHeader
          filter={filter}
          onSortChange={handleSortChange}
          onTimeRangeChange={handleTimeRangeChange}
          refreshing={refreshing}
          onRefresh={refresh}
        />
      )}

      {/* Feed list */}
      <div className="relative">
        {/* Initial loading state */}
        {loading && posts.length === 0 && (
          <div className="space-y-6 p-4">
            {[...Array(3)].map((_, i) => (
              <LoadingSkeletons key={i} />
            ))}
          </div>
        )}

        {/* Posts list */}
        {posts.length > 0 && (
          <div className="space-y-6 p-4">
            {posts.map((post, index) => (
              <div
                key={post.id}
                ref={index === posts.length - 1 ? lastPostElementRef : null}
              >
                <ErrorBoundary fallback={<PostErrorFallback />}>
                  <EnhancedPostCard
                    post={post}
                    showSocialProof={true}
                    showTrending={true}
                    className="transition-all duration-200 hover:shadow-lg"
                  />
                </ErrorBoundary>
              </div>
            ))}
          </div>
        )}

        {/* Loading more indicator */}
        {loading && posts.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary-600 border-t-transparent" />
          </div>
        )}

        {/* End of feed indicator */}
        {!hasMore && posts.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
                🎉 You've reached the end!
              </div>
              <button
                onClick={refresh}
                className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium transition-colors duration-200"
              >
                Refresh feed
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Feed header component
interface FeedHeaderProps {
  filter: FeedFilter;
  onSortChange: (sort: FeedSortType) => void;
  onTimeRangeChange: (timeRange: string) => void;
  refreshing?: boolean;
  onRefresh?: () => void;
}

function FeedHeader({
  filter,
  onSortChange,
  onTimeRangeChange,
  refreshing = false,
  onRefresh
}: FeedHeaderProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
          {filter.communityId ? 'Community Feed' : 'Your Feed'}
        </h2>
        
        {onRefresh && (
          <button
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center space-x-2 px-3 py-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 disabled:opacity-50 transition-colors duration-200"
          >
            <div className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}>
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </div>
            <span>{refreshing ? 'Refreshing...' : 'Refresh'}</span>
          </button>
        )}
      </div>

      <FeedSortingHeader
        activeSort={filter.sortBy}
        activeTimeRange={filter.timeRange || 'day'}
        onSortChange={onSortChange}
        onTimeRangeChange={onTimeRangeChange}
        showTimeRange={filter.sortBy !== FeedSortType.NEW}
        showCounts={false}
      />
    </div>
  );
}

// Empty feed state
interface EmptyFeedStateProps {
  filter: FeedFilter;
  onRefresh: () => void;
}

function EmptyFeedState({ filter, onRefresh }: EmptyFeedStateProps) {
  const getSortDescription = (sort: FeedSortType) => {
    switch (sort) {
      case FeedSortType.HOT: return 'trending posts';
      case FeedSortType.NEW: return 'recent posts';
      case FeedSortType.TOP: return 'top-rated posts';
      case FeedSortType.RISING: return 'rising posts';
      default: return 'posts';
    }
  };

  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-4">📭</div>
      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
        No {getSortDescription(filter.sortBy)} found
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-6">
        {filter.communityId 
          ? 'This community doesn\'t have any posts matching your criteria yet.'
          : 'Try adjusting your filters or check back later for new content.'
        }
      </p>
      <button
        onClick={onRefresh}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Refresh Feed
      </button>
    </div>
  );
}

// Error state component
interface ErrorStateProps {
  error: string;
  onRetry: () => void;
}

function ErrorState({ error, onRetry }: ErrorStateProps) {
  return (
    <div className="text-center py-12">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-lg font-medium">Failed to load feed</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="px-6 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-medium transition-colors duration-200"
      >
        Try Again
      </button>
    </div>
  );
}

// Post error fallback
function PostErrorFallback() {
  return (
    <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
      <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <span className="text-sm font-medium">Failed to load post</span>
      </div>
    </div>
  );
}