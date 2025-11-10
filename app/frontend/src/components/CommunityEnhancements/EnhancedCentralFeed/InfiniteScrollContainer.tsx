import React, { 
  useState, 
  useEffect, 
  useCallback, 
  useRef, 
  useMemo,
  useLayoutEffect 
} from 'react';
import { EnhancedPost } from '../../../types/communityEnhancements';
import { FeedFilter, InfiniteScrollState } from '../../../types/feed';

interface InfiniteScrollContainerProps {
  // Data and loading
  items: EnhancedPost[];
  hasMore: boolean;
  isLoading: boolean;
  error?: string;
  
  // Callbacks
  onLoadMore: () => Promise<void>;
  onRetry?: () => void;
  onRefresh?: () => void;
  
  // Rendering
  renderItem: (item: EnhancedPost, index: number) => React.ReactNode;
  renderLoading?: () => React.ReactNode;
  renderError?: (error: string, onRetry: () => void) => React.ReactNode;
  renderEmpty?: () => React.ReactNode;
  renderEndOfFeed?: () => React.ReactNode;
  
  // Configuration
  threshold?: number; // Distance from bottom to trigger load (in pixels)
  itemHeight?: number; // For virtual scrolling
  overscan?: number; // Number of items to render outside viewport
  enableVirtualScrolling?: boolean;
  enableLoadMoreButton?: boolean; // Fallback option
  className?: string;
  
  // Scroll position restoration
  scrollKey?: string; // Unique key for scroll position storage
  restoreScrollPosition?: boolean;
  
  // Performance
  debounceMs?: number;
  maxItems?: number; // Limit for performance
}

interface VirtualScrollState {
  startIndex: number;
  endIndex: number;
  scrollTop: number;
  containerHeight: number;
}

const SCROLL_POSITION_KEY = 'infiniteScrollPosition';
const DEFAULT_ITEM_HEIGHT = 200;
const DEFAULT_OVERSCAN = 5;
const DEFAULT_THRESHOLD = 1000;
const DEFAULT_DEBOUNCE = 100;

export default function InfiniteScrollContainer({
  items,
  hasMore,
  isLoading,
  error,
  onLoadMore,
  onRetry,
  onRefresh,
  renderItem,
  renderLoading,
  renderError,
  renderEmpty,
  renderEndOfFeed,
  threshold = DEFAULT_THRESHOLD,
  itemHeight = DEFAULT_ITEM_HEIGHT,
  overscan = DEFAULT_OVERSCAN,
  enableVirtualScrolling = true,
  enableLoadMoreButton = false,
  className = '',
  scrollKey,
  restoreScrollPosition = true,
  debounceMs = DEFAULT_DEBOUNCE,
  maxItems
}: InfiniteScrollContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadingTriggerRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const isLoadingRef = useRef(false);
  const hasRestoredScrollRef = useRef(false);

  // Virtual scrolling state
  const [virtualState, setVirtualState] = useState<VirtualScrollState>({
    startIndex: 0,
    endIndex: 0,
    scrollTop: 0,
    containerHeight: 0
  });

  // Calculate visible items for virtual scrolling
  const visibleItems = useMemo(() => {
    if (!enableVirtualScrolling || !items.length) {
      return items.slice(0, maxItems).map((item, index) => ({
        item,
        index,
        originalIndex: index
      }));
    }

    const { startIndex, endIndex } = virtualState;
    const start = Math.max(0, startIndex - overscan);
    const end = Math.min(items.length, endIndex + overscan);

    return items.slice(start, end).map((item, index) => ({
      item,
      index: start + index,
      originalIndex: start + index
    }));
  }, [items, virtualState, enableVirtualScrolling, overscan, maxItems]);

  // Calculate total height for virtual scrolling
  const totalHeight = useMemo(() => {
    if (!enableVirtualScrolling) return 'auto';
    return items.length * itemHeight;
  }, [items.length, itemHeight, enableVirtualScrolling]);

  // Calculate offset for virtual scrolling
  const offsetY = useMemo(() => {
    if (!enableVirtualScrolling) return 0;
    const start = Math.max(0, virtualState.startIndex - overscan);
    return start * itemHeight;
  }, [virtualState.startIndex, itemHeight, enableVirtualScrolling, overscan]);

  // Debounced load more function
  const debouncedLoadMore = useCallback(
    debounce(async () => {
      if (isLoadingRef.current || !hasMore || error) return;
      
      isLoadingRef.current = true;
      try {
        await onLoadMore();
      } finally {
        isLoadingRef.current = false;
      }
    }, debounceMs),
    [onLoadMore, hasMore, error, debounceMs]
  );

  // Handle scroll for virtual scrolling
  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    if (!enableVirtualScrolling) return;

    const container = event.currentTarget;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;

    // Calculate visible range
    const startIndex = Math.floor(scrollTop / itemHeight);
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight)
    );

    setVirtualState(prev => ({
      ...prev,
      startIndex,
      endIndex,
      scrollTop,
      containerHeight
    }));

    // Save scroll position for restoration
    if (scrollKey && restoreScrollPosition) {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        sessionStorage.setItem(
          `${SCROLL_POSITION_KEY}_${scrollKey}`,
          JSON.stringify({
            scrollTop,
            timestamp: Date.now()
          })
        );
      }, 200);
    }
  }, [enableVirtualScrolling, itemHeight, items.length, scrollKey, restoreScrollPosition]);

  // Helper function to safely access sessionStorage
  const getSessionStorage = () => {
    if (typeof window !== 'undefined' && window.sessionStorage) {
      return window.sessionStorage;
    }
    return null;
  };

  // Save scroll position
  useEffect(() => {
    if (!enableVirtualScrolling || !scrollKey) return;
    
    const handleScroll = () => {
      if (!containerRef.current) return;
      
      const scrollTop = containerRef.current.scrollTop;
      
      // Debounce scroll events
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      
      scrollTimeoutRef.current = setTimeout(() => {
        const sessionStorage = getSessionStorage();
        if (sessionStorage) {
          sessionStorage.setItem(
            `${SCROLL_POSITION_KEY}_${scrollKey}`,
            JSON.stringify({
              scrollTop,
              timestamp: Date.now()
            })
          );
        }
      }, 200);
    };
    
    const container = containerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [enableVirtualScrolling, itemHeight, items.length, scrollKey, restoreScrollPosition]);

  // Restore scroll position
  useLayoutEffect(() => {
    if (!restoreScrollPosition || !scrollKey || hasRestoredScrollRef.current) {
      return;
    }

    const sessionStorage = getSessionStorage();
    if (sessionStorage) {
      const savedPosition = sessionStorage.getItem(`${SCROLL_POSITION_KEY}_${scrollKey}`);
      if (savedPosition && containerRef.current) {
        try {
          const { scrollTop, timestamp } = JSON.parse(savedPosition);
          
          // Only restore if saved within last 30 minutes
          if (Date.now() - timestamp < 30 * 60 * 1000) {
            containerRef.current.scrollTop = scrollTop;
            hasRestoredScrollRef.current = true;
          }
        } catch (error) {
          console.warn('Failed to restore scroll position:', error);
        }
      }
    }
  }, [restoreScrollPosition, scrollKey, items.length]);

  // Set up intersection observer for infinite scroll
  useEffect(() => {
    if (enableVirtualScrolling || !loadingTriggerRef.current || !hasMore || isLoading) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const target = entries[0];
        if (target.isIntersecting && hasMore && !isLoading) {
          debouncedLoadMore();
        }
      },
      {
        root: null,
        rootMargin: `${threshold}px`,
        threshold: 0.1
      }
    );

    observer.observe(loadingTriggerRef.current);
    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [debouncedLoadMore, hasMore, isLoading, threshold, enableVirtualScrolling]);

  // Handle virtual scroll loading trigger
  useEffect(() => {
    if (!enableVirtualScrolling || !hasMore || isLoading) return;

    const { endIndex } = virtualState;
    const loadTriggerIndex = items.length - Math.ceil(threshold / itemHeight);
    
    if (endIndex >= loadTriggerIndex) {
      debouncedLoadMore();
    }
  }, [virtualState.endIndex, items.length, hasMore, isLoading, threshold, itemHeight, enableVirtualScrolling, debouncedLoadMore]);

  // Initialize virtual scroll state
  useEffect(() => {
    if (!enableVirtualScrolling || !containerRef.current) return;

    const container = containerRef.current;
    const containerHeight = container.clientHeight;
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil(containerHeight / itemHeight)
    );

    setVirtualState(prev => ({
      ...prev,
      containerHeight,
      endIndex
    }));
  }, [enableVirtualScrolling, itemHeight, items.length]);

  // Handle retry
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      debouncedLoadMore();
    }
  }, [onRetry, debouncedLoadMore]);

  // Handle manual load more
  const handleLoadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      debouncedLoadMore();
    }
  }, [isLoading, hasMore, debouncedLoadMore]);

  // Render empty state
  if (!items.length && !isLoading && !error) {
    return (
      <div className={`infinite-scroll-container ${className}`}>
        {renderEmpty ? renderEmpty() : <DefaultEmptyState />}
      </div>
    );
  }

  return (
    <div 
      ref={containerRef}
      className={`infinite-scroll-container ${className}`}
      onScroll={handleScroll}
      style={{
        height: enableVirtualScrolling ? '100%' : 'auto',
        overflowY: enableVirtualScrolling ? 'auto' : 'visible'
      }}
    >
      {/* Virtual scroll content */}
      <div
        style={{
          height: totalHeight,
          position: 'relative'
        }}
      >
        <div
          style={{
            transform: `translateY(${offsetY}px)`,
            position: enableVirtualScrolling ? 'absolute' : 'static',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {visibleItems.map(({ item, index, originalIndex }) => (
            <div
              key={item.id}
              style={{
                height: enableVirtualScrolling ? itemHeight : 'auto'
              }}
            >
              {renderItem(item, originalIndex || index)}
            </div>
          ))}
        </div>
      </div>

      {/* Loading trigger for non-virtual scroll */}
      {!enableVirtualScrolling && hasMore && (
        <div
          ref={loadingTriggerRef}
          className="loading-trigger"
          style={{ height: '1px', margin: '0' }}
        />
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          {renderLoading ? renderLoading() : <DefaultLoadingState />}
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="flex items-center justify-center py-8">
          {renderError ? renderError(error, handleRetry) : (
            <DefaultErrorState error={error} onRetry={handleRetry} />
          )}
        </div>
      )}

      {/* Load more button (fallback) */}
      {enableLoadMoreButton && hasMore && !isLoading && !error && (
        <div className="flex items-center justify-center py-8">
          <button
            onClick={handleLoadMore}
            className="
              px-6 py-3 bg-primary-600 hover:bg-primary-700 text-white rounded-lg
              font-medium transition-colors duration-200
              focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2
              disabled:opacity-50 disabled:cursor-not-allowed
            "
            disabled={isLoading}
          >
            Load More
          </button>
        </div>
      )}

      {/* End of feed */}
      {!hasMore && items.length > 0 && (
        <div className="flex items-center justify-center py-8">
          {renderEndOfFeed ? renderEndOfFeed() : (
            <DefaultEndOfFeedState onRefresh={onRefresh} />
          )}
        </div>
      )}
    </div>
  );
}

// Default components
function DefaultLoadingState() {
  return (
    <div className="flex items-center space-x-3">
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-300 border-t-primary-500" />
      <span className="text-gray-600 dark:text-gray-400 text-sm">
        Loading more posts...
      </span>
    </div>
  );
}

function DefaultErrorState({ error, onRetry }: { error: string; onRetry: () => void }) {
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

function DefaultEmptyState() {
  return (
    <div className="text-center py-12">
      <div className="text-gray-500 dark:text-gray-400 text-lg mb-2">
        No posts found
      </div>
      <div className="text-gray-400 dark:text-gray-500 text-sm">
        Be the first to share something with the community!
      </div>
    </div>
  );
}

function DefaultEndOfFeedState({ onRefresh }: { onRefresh?: () => void }) {
  return (
    <div className="text-center">
      <div className="text-gray-500 dark:text-gray-400 text-sm mb-2">
        🎉 You've reached the end!
      </div>
      {onRefresh && (
        <button
          onClick={onRefresh}
          className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm font-medium transition-colors duration-200"
        >
          Refresh feed
        </button>
      )}
    </div>
  );
}

// Utility function for debouncing
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// Hook for using the infinite scroll container
export function useInfiniteScrollContainer<T = EnhancedPost>(
  loadFunction: (page: number) => Promise<{ items: T[]; hasMore: boolean; totalPages?: number }>,
  options: {
    initialLoad?: boolean;
    itemsPerPage?: number;
    maxItems?: number;
    resetDeps?: any[];
  } = {}
) {
  const {
    initialLoad = true,
    itemsPerPage = 20,
    maxItems,
    resetDeps = []
  } = options;

  const [items, setItems] = useState<T[]>([]);
  const [state, setState] = useState<InfiniteScrollState>({
    hasMore: true,
    isLoading: false,
    page: 1,
    totalPages: 1,
    error: undefined
  });

  const loadMore = useCallback(async () => {
    if (state.isLoading || !state.hasMore) return;

    setState(prev => ({ ...prev, isLoading: true, error: undefined }));

    try {
      const response = await loadFunction(state.page);
      
      setState(prev => ({
        ...prev,
        isLoading: false,
        hasMore: response.hasMore,
        page: prev.page + 1,
        totalPages: response.totalPages || prev.totalPages
      }));

      setItems(prev => {
        const newItems = [...prev, ...response.items];
        return maxItems ? newItems.slice(0, maxItems) : newItems;
      });
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load items'
      }));
    }
  }, [loadFunction, state.isLoading, state.hasMore, state.page, maxItems]);

  const refresh = useCallback(async () => {
    setItems([]);
    setState({
      hasMore: true,
      isLoading: true,
      page: 1,
      totalPages: 1,
      error: undefined
    });

    try {
      const response = await loadFunction(1);
      
      setState({
        hasMore: response.hasMore,
        isLoading: false,
        page: 2,
        totalPages: response.totalPages || 1,
        error: undefined
      });

      const newItems = maxItems ? response.items.slice(0, maxItems) : response.items;
      setItems(newItems);
    } catch (error) {
      setState(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Failed to refresh items'
      }));
    }
  }, [loadFunction, maxItems]);

  const retry = useCallback(() => {
    if (items.length === 0) {
      refresh();
    } else {
      loadMore();
    }
  }, [items.length, refresh, loadMore]);

  // Reset when dependencies change
  useEffect(() => {
    if (resetDeps.length > 0) {
      refresh();
    }
  }, resetDeps); // eslint-disable-line react-hooks/exhaustive-deps

  // Initial load
  useEffect(() => {
    if (initialLoad && items.length === 0 && !state.isLoading) {
      refresh();
    }
  }, [initialLoad]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    items,
    ...state,
    loadMore,
    refresh,
    retry
  };
}