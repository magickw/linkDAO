import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { EnhancedPost, FeedFilter, InfiniteScrollState, FeedError } from '../../types/feed';
import { FeedService } from '../../services/feedService';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import VirtualFeed from './VirtualFeed';
import { useFeedCache } from '@/hooks/useFeedCache';
import { FeedSkeleton, LoadingSpinner as SkeletonLoadingSpinner } from '@/components/animations/LoadingSkeletons';
import { analyticsService } from '@/services/analyticsService';

interface InfiniteScrollFeedProps {
  filter: FeedFilter;
  onPostsLoad: (posts: EnhancedPost[]) => void;
  children: (posts: EnhancedPost[], state: InfiniteScrollState) => React.ReactNode;
  className?: string;
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  initialLoad?: boolean;
  postsPerPage?: number;
  onError?: (error: FeedError) => void;
  enableVirtualization?: boolean; // Enable virtual scrolling for large feeds
  virtualHeight?: number; // Height of the virtualized list
  itemHeight?: number; // Height of each item in the virtualized list
}

const InfiniteScrollFeed = React.memo(({
  filter,
  onPostsLoad,
  children,
  className = '',
  threshold = 1000,
  initialLoad = true,
  postsPerPage = 20,
  onError,
  enableVirtualization = false,
  virtualHeight = 600,
  itemHeight = 300
}: InfiniteScrollFeedProps) => {
  const { isMobile } = useMobileOptimization();
  // Use useMemo to prevent unnecessary re-renders
  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [scrollState, setScrollState] = useState<InfiniteScrollState>({
    hasMore: true,
    isLoading: false,
    page: 1,
    totalPages: 1,
    error: undefined
  });

  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingRef = useRef<HTMLDivElement | null>(null);
  const lastFilterRef = useRef<string>('');

  // Create a stable filter key for comparison
  const filterKey = useMemo(() => JSON.stringify(filter), [filter]);

  // Use caching hook for feed data
  const { data: cachedData, error: cacheError, isLoading: isCacheLoading, mutate } = useFeedCache(
    filter,
    scrollState.page,
    {
      cacheTime: 30000, // 30 seconds cache
      revalidateOnFocus: false,
      dedupingInterval: 30000
    }
  );

  // Load more posts - memoized
  const loadMorePosts = useCallback(async (page: number, isInitial: boolean = false) => {
    if (scrollState.isLoading) return;

    setScrollState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      // Try to get data from cache first
      const response = await FeedService.getEnhancedFeed(filter, page, postsPerPage);
      
      setScrollState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: response.hasMore,
        page: page,
        totalPages: response.totalPages
      }));

      if (isInitial) {
        setPosts(response.posts);
      } else {
        setPosts(prev => [...prev, ...response.posts]);
      }

      onPostsLoad(response.posts);
    } catch (error: any) {
      const feedError: FeedError = {
        code: error.code || 'FEED_LOAD_ERROR',
        message: error.message || 'Failed to load posts',
        timestamp: new Date(),
        retryable: error.retryable !== false
      };
      
      setScrollState(prev => ({
        ...prev,
        isLoading: false,
        error: feedError.message
      }));
      
      if (onError) {
        onError(feedError);
      }
    }
  }, [filter, postsPerPage, onPostsLoad, scrollState.isLoading, onError]);

  // Reset and load initial posts when filter changes - memoized with proper dependencies
  useEffect(() => {
    if (filterKey !== lastFilterRef.current) {
      lastFilterRef.current = filterKey;
      setPosts([]);
      setScrollState({
        hasMore: true,
        isLoading: false,
        page: 1,
        totalPages: 1,
        error: undefined
      });

      if (initialLoad) {
        loadMorePosts(1, true);
      }
    }
  }, [filterKey, initialLoad, loadMorePosts]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (!loadingRef.current || !scrollState.hasMore || scrollState.isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && scrollState.hasMore && !scrollState.isLoading) {
          loadMorePosts(scrollState.page + 1);
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    observer.observe(loadingRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMorePosts, scrollState.hasMore, scrollState.isLoading, scrollState.page, threshold]);

  // Manual refresh function - memoized
  const refresh = useCallback(() => {
    setPosts([]);
    setScrollState({
      hasMore: true,
      isLoading: false,
      page: 1,
      totalPages: 1,
      error: undefined
    });
    loadMorePosts(1, true);
  }, [loadMorePosts]);

  // Retry on error - memoized
  const retry = useCallback(() => {
    if (posts.length === 0) {
      loadMorePosts(1, true);
    } else {
      loadMorePosts(scrollState.page + 1);
    }
  }, [loadMorePosts, posts.length, scrollState.page]);

  // Add pull-to-refresh for mobile
  const [pullStart, setPullStart] = useState(0);
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (isMobile && e.touches[0].clientY === 0) {
      setPullStart(e.touches[0].clientY);
    }
  }, [isMobile]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (isMobile && pullStart > 0) {
      const distance = e.touches[0].clientY - pullStart;
      if (distance > 0 && window.scrollY === 0) {
        e.preventDefault();
        setPullDistance(Math.min(distance, 100)); // Max 100px pull
      }
    }
  }, [isMobile, pullStart]);

  const handleTouchEnd = useCallback(() => {
    if (isMobile && pullDistance > 50) { // Pull threshold of 50px
      setIsRefreshing(true);
      refresh();
      
      // Track pull to refresh
      analyticsService.trackUserEvent('feed_pull_to_refresh', {
        timestamp: new Date()
      });
      
      setTimeout(() => setIsRefreshing(false), 1000); // Simulate refresh
    }
    setPullStart(0);
    setPullDistance(0);
  }, [isMobile, pullDistance, refresh]);

  // Memoized pull-to-refresh indicator
  const pullToRefreshIndicator = useMemo(() => {
    if (!isMobile || pullDistance <= 0) return null;
    
    return (
      <div className="flex justify-center py-2 bg-gray-100 dark:bg-gray-800">
        <div className="flex items-center space-x-2">
          {isRefreshing ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-500"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Refreshing...</span>
            </>
          ) : pullDistance > 50 ? (
            <>
              <svg className="h-4 w-4 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-400">Release to refresh</span>
            </>
          ) : (
            <>
              <svg className="h-4 w-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
              <span className="text-sm text-gray-600 dark:text-gray-400">Pull to refresh</span>
            </>
          )}
        </div>
      </div>
    );
  }, [isMobile, pullDistance, isRefreshing]);

  // Memoized loading trigger
  const loadingTrigger = useMemo(() => {
    if (!scrollState.hasMore) return null;
    
    return (
      <div
        ref={loadingRef}
        className="flex items-center justify-center py-8"
      >
        {scrollState.isLoading ? (
          <LoadingSpinner />
        ) : scrollState.error ? (
          <ErrorState error={scrollState.error} onRetry={retry} />
        ) : (
          <div className="text-gray-500 dark:text-gray-400 text-sm flex flex-col items-center">
            {isMobile ? (
              <>
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
                <span>Pull up to load more</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
                <span>Scroll to load more posts...</span>
              </>
            )}
          </div>
        )}
      </div>
    );
  }, [scrollState.hasMore, scrollState.isLoading, scrollState.error, isMobile, retry]);

  // Memoized end of feed indicator
  const endOfFeedIndicator = useMemo(() => {
    if (scrollState.hasMore || posts.length === 0) return null;
    
    return (
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
    );
  }, [scrollState.hasMore, posts.length, refresh]);

  // Memoized virtual feed
  const virtualFeed = useMemo(() => {
    if (!enableVirtualization || posts.length < 50) return null;
    
    return (
      <VirtualFeed
        posts={posts}
        height={virtualHeight}
        itemHeight={itemHeight}
        onReaction={async (postId, reactionType, amount) => {
          console.log('Reaction', postId, reactionType, amount);
        }}
        onTip={async (postId, amount, token) => {
          console.log('Tip', postId, amount, token);
        }}
        onExpand={() => {
          console.log('Expand post');
        }}
      />
    );
  }, [enableVirtualization, posts, virtualHeight, itemHeight]);

  // Memoized regular feed with proper optimization
  const regularFeed = useMemo(() => {
    if (enableVirtualization && posts.length >= 50) return null;
    
    return children(posts, { ...scrollState, refresh, retry } as any);
  }, [enableVirtualization, posts.length, children, posts, scrollState, refresh, retry]);

  return (
    <div 
      className={className}
      ref={containerRef}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={isMobile && pullDistance > 0 ? { transform: `translateY(${pullDistance}px)` } : {}}
    >
      {pullToRefreshIndicator}
      
      {virtualFeed || regularFeed}
      
      {/* Loading trigger element */}
      {loadingTrigger}
      
      {/* End of feed indicator */}
      {endOfFeedIndicator}
    </div>
  );
});

// Add display name and proper comparison function for debugging
InfiniteScrollFeed.displayName = 'InfiniteScrollFeed';

// Add proper comparison function for React.memo
const areEqual = (prevProps: InfiniteScrollFeedProps, nextProps: InfiniteScrollFeedProps) => {
  return (
    prevProps.filter === nextProps.filter ||
    JSON.stringify(prevProps.filter) === JSON.stringify(nextProps.filter)
  );
};

export default React.memo(InfiniteScrollFeed, areEqual);

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <div className="flex flex-col items-center space-y-3">
        <SkeletonLoadingSpinner size="md" color="primary" className="" />
        <span className="text-gray-600 dark:text-gray-400 text-sm">
          Loading more posts...
        </span>
      </div>
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
    <div className="text-center py-8">
      <div className="text-red-600 dark:text-red-400 mb-4">
        <svg className="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
        <p className="text-lg font-medium">Failed to load feed</p>
        <p className="text-sm mt-1">{error}</p>
      </div>
      <button
        onClick={onRetry}
        className="
          px-5 py-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg
          text-sm font-medium transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
          inline-flex items-center
        "
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        Try Again
      </button>
    </div>
  );
}

// Hook for managing infinite scroll state
export function useInfiniteScroll(
  filter: FeedFilter,
  options: {
    postsPerPage?: number;
    threshold?: number;
    autoLoad?: boolean;
  } = {}
) {
  const {
    postsPerPage = 20,
    threshold = 1000,
    autoLoad = true
  } = options;

  const [posts, setPosts] = useState<EnhancedPost[]>([]);
  const [state, setState] = useState<InfiniteScrollState>({
    hasMore: true,
    isLoading: false,
    page: 1,
    totalPages: 1
  });

  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await FeedService.getEnhancedFeed(
        filter,
        state.page,
        postsPerPage
      );

      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: response.hasMore,
        page: prev.page + 1,
        totalPages: response.totalPages
      }));

      setPosts(prev => [...prev, ...response.posts]);
    } catch (error: any) {
      const feedError: FeedError = {
        code: error.code || 'FEED_LOAD_ERROR',
        message: error.message || 'Failed to load posts',
        timestamp: new Date(),
        retryable: error.retryable !== false
      };
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: feedError.message
      }));
    }
  }, [filter, state.isLoading, state.hasMore, state.page, postsPerPage]);

  const reset = useCallback(() => {
    setPosts([]);
    setState({
      hasMore: true,
      isLoading: false,
      page: 1,
      totalPages: 1
    });
  }, []);

  const refresh = useCallback(async () => {
    reset();
    
    setState(prev => ({ ...prev, isLoading: true }));

    try {
      const response = await FeedService.getEnhancedFeed(filter, 1, postsPerPage);
      
      setState({
        hasMore: response.hasMore,
        isLoading: false,
        page: 2,
        totalPages: response.totalPages
      });

      setPosts(response.posts);
    } catch (error: any) {
      const feedError: FeedError = {
        code: error.code || 'FEED_REFRESH_ERROR',
        message: error.message || 'Failed to refresh posts',
        timestamp: new Date(),
        retryable: error.retryable !== false
      };
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: feedError.message
      }));
    }
  }, [filter, postsPerPage, reset]);

  // Auto-load initial posts
  useEffect(() => {
    if (autoLoad) {
      refresh();
    }
  }, [JSON.stringify(filter), autoLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    posts,
    state,
    loadMore,
    refresh,
    reset
  };
}