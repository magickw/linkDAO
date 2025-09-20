import React, { useState, useEffect, useCallback, useRef } from 'react';
import { EnhancedPost, FeedFilter, InfiniteScrollState } from '../../types/feed';
import { FeedService } from '../../services/feedService';

interface InfiniteScrollFeedProps {
  filter: FeedFilter;
  onPostsLoad: (posts: EnhancedPost[]) => void;
  children: (posts: EnhancedPost[], state: InfiniteScrollState) => React.ReactNode;
  className?: string;
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  initialLoad?: boolean;
  postsPerPage?: number;
}

export default function InfiniteScrollFeed({
  filter,
  onPostsLoad,
  children,
  className = '',
  threshold = 1000,
  initialLoad = true,
  postsPerPage = 20
}: InfiniteScrollFeedProps) {
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
  const filterKey = JSON.stringify(filter);

  // Load more posts
  const loadMorePosts = useCallback(async (page: number, isInitial: boolean = false) => {
    if (scrollState.isLoading) return;

    setScrollState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
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
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load posts';
      setScrollState(prev => ({
        ...prev,
        isLoading: false,
        error: errorMessage
      }));
    }
  }, [filter, postsPerPage, onPostsLoad, scrollState.isLoading]);

  // Reset and load initial posts when filter changes
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

  // Manual refresh function
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

  // Retry on error
  const retry = useCallback(() => {
    if (posts.length === 0) {
      loadMorePosts(1, true);
    } else {
      loadMorePosts(scrollState.page + 1);
    }
  }, [loadMorePosts, posts.length, scrollState.page]);

  return (
    <div className={className}>
      {children(posts, { ...scrollState, refresh, retry } as any)}
      
      {/* Loading trigger element */}
      {scrollState.hasMore && (
        <div
          ref={loadingRef}
          className="flex items-center justify-center py-8"
        >
          {scrollState.isLoading ? (
            <LoadingSpinner />
          ) : scrollState.error ? (
            <ErrorState error={scrollState.error} onRetry={retry} />
          ) : (
            <div className="text-gray-500 dark:text-gray-400 text-sm">
              Scroll to load more posts...
            </div>
          )}
        </div>
      )}
      
      {/* End of feed indicator */}
      {!scrollState.hasMore && posts.length > 0 && (
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
  );
}

// Loading spinner component
function LoadingSpinner() {
  return (
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-500" />
      <span className="text-gray-600 dark:text-gray-400 text-sm">
        Loading more posts...
      </span>
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
    <div className="text-center py-4">
      <div className="text-red-600 dark:text-red-400 text-sm mb-3">
        ⚠️ {error}
      </div>
      <button
        onClick={onRetry}
        className="
          px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg
          text-sm font-medium transition-colors duration-200
          focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
        "
      >
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load posts'
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
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh posts'
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