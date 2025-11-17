import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';
import { useMobileAccessibility } from '@/hooks/useMobileAccessibility';

interface VirtualItem<T = any> {
  id: string;
  data: T;
  height?: number;
}

interface MobileVirtualScrollingProps<T> {
  items: VirtualItem<T>[];
  renderItem: (item: VirtualItem<T>, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight?: number;
  overscan?: number;
  onEndReached?: () => void;
  onRefresh?: () => Promise<void>;
  refreshing?: boolean;
  loading?: boolean;
  hasMore?: boolean;
  endReachedThreshold?: number;
  className?: string;
  emptyComponent?: React.ReactNode;
  loadingComponent?: React.ReactNode;
  errorComponent?: React.ReactNode;
  error?: string | null;
}

export const MobileVirtualScrolling = <T,>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 5,
  onEndReached,
  onRefresh,
  refreshing = false,
  loading = false,
  hasMore = true,
  endReachedThreshold = 0.8,
  className = '',
  emptyComponent,
  loadingComponent,
  errorComponent,
  error
}: MobileVirtualScrollingProps<T>) => {
  const {
    triggerHapticFeedback,
    mobileOptimizedClasses,
    safeAreaInsets
  } = useMobileOptimization();

  const {
    announceToScreenReader,
    accessibilityClasses
  } = useMobileAccessibility();

  const [scrollTop, setScrollTop] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [touchStart, setTouchStart] = useState<{ y: number; time: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const endReachedRef = useRef(false);

  const actualContainerHeight = containerHeight || (typeof window !== 'undefined' ? window.innerHeight : 600);
  const totalHeight = items.length * itemHeight;
  const visibleStart = Math.floor(scrollTop / itemHeight);
  const visibleEnd = Math.min(
    visibleStart + Math.ceil(actualContainerHeight / itemHeight) + overscan,
    items.length
  );

  const startIndex = Math.max(0, visibleStart - overscan);
  const endIndex = Math.min(items.length, visibleEnd + overscan);
  const visibleItems = items.slice(startIndex, endIndex);

  const offsetY = startIndex * itemHeight;

  // Handle scroll events
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const target = e.target as HTMLDivElement;
    const newScrollTop = target.scrollTop;
    setScrollTop(newScrollTop);

    // Check if we've reached the end
    const scrollPercentage = (newScrollTop + actualContainerHeight) / totalHeight;
    if (scrollPercentage >= endReachedThreshold && !endReachedRef.current && hasMore && !loading) {
      endReachedRef.current = true;
      onEndReached?.();
      announceToScreenReader('Loading more content');
    }

    // Reset end reached flag when scrolling up
    if (scrollPercentage < endReachedThreshold - 0.1) {
      endReachedRef.current = false;
    }
  }, [actualContainerHeight, totalHeight, endReachedThreshold, hasMore, loading, onEndReached, announceToScreenReader]);

  // Pull to refresh handling
  const handleTouchStart = (e: React.TouchEvent) => {
    if (scrollTop === 0) {
      setTouchStart({
        y: e.touches[0].clientY,
        time: Date.now()
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const deltaY = currentY - touchStart.y;

    if (deltaY > 0) {
      e.preventDefault();
      const distance = Math.min(deltaY * 0.5, 100);
      setPullDistance(distance);

      if (distance > 60) {
        triggerHapticFeedback('medium');
      }
    }
  };

  const handleTouchEnd = async () => {
    if (pullDistance > 60 && onRefresh && !refreshing) {
      setIsRefreshing(true);
      triggerHapticFeedback('medium');
      announceToScreenReader('Refreshing content');

      try {
        await onRefresh();
        announceToScreenReader('Content refreshed');
      } catch (error) {
        announceToScreenReader('Failed to refresh content');
      } finally {
        setIsRefreshing(false);
      }
    }

    setTouchStart(null);
    setPullDistance(0);
  };

  // Keyboard navigation with actual scroll position update
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current || !scrollElementRef.current) return;

      const scrollElement = scrollElementRef.current;
      let newScrollTop = scrollTop;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          newScrollTop = Math.min(scrollTop + itemHeight, totalHeight - actualContainerHeight);
          break;
        case 'ArrowUp':
          e.preventDefault();
          newScrollTop = Math.max(scrollTop - itemHeight, 0);
          break;
        case 'PageDown':
          e.preventDefault();
          newScrollTop = Math.min(scrollTop + actualContainerHeight, totalHeight - actualContainerHeight);
          break;
        case 'PageUp':
          e.preventDefault();
          newScrollTop = Math.max(scrollTop - actualContainerHeight, 0);
          break;
        case 'Home':
          e.preventDefault();
          newScrollTop = 0;
          break;
        case 'End':
          e.preventDefault();
          newScrollTop = totalHeight - actualContainerHeight;
          break;
      }

      if (newScrollTop !== scrollTop) {
        scrollElement.scrollTop = newScrollTop;
        setScrollTop(newScrollTop);
        // Trigger scroll event to update visible items
        const event = new Event('scroll', { bubbles: true });
        scrollElement.dispatchEvent(event);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('keydown', handleKeyDown);
      return () => container.removeEventListener('keydown', handleKeyDown);
    }
  }, [itemHeight, totalHeight, actualContainerHeight, scrollTop, handleScroll]);

  // Error state
  if (error && errorComponent) {
    return (
      <div className={`${className} ${mobileOptimizedClasses}`}>
        {errorComponent}
      </div>
    );
  }

  // Empty state
  if (items.length === 0 && !loading && emptyComponent) {
    return (
      <div className={`${className} ${mobileOptimizedClasses}`}>
        {emptyComponent}
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`
        relative overflow-hidden ${className} ${mobileOptimizedClasses} ${accessibilityClasses}
      `}
      style={{ 
        height: containerHeight || '100%',
        paddingBottom: safeAreaInsets.bottom
      }}
      tabIndex={0}
      role="list"
      aria-label="Virtual scrolling list"
    >
      {/* Pull to refresh indicator */}
      <AnimatePresence>
        {(pullDistance > 0 || isRefreshing) && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="absolute top-0 left-0 right-0 z-10 flex items-center justify-center py-4 bg-white dark:bg-gray-900"
            style={{ transform: `translateY(${Math.max(pullDistance - 60, 0)}px)` }}
          >
            <div className="flex items-center space-x-2">
              {isRefreshing || refreshing ? (
                <>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" as any }}
                    className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full"
                  />
                  <span className="text-sm text-gray-600 dark:text-gray-400">Refreshing...</span>
                </>
              ) : pullDistance > 60 ? (
                <>
                  <svg className="w-5 h-5 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span className="text-sm text-blue-500">Release to refresh</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                  </svg>
                  <span className="text-sm text-gray-400">Pull to refresh</span>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Virtual scroll container */}
      <div
        ref={scrollElementRef}
        className="overflow-auto hardware-accelerated"
        style={{ height: '100%' }}
        onScroll={handleScroll}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Virtual spacer */}
        <div style={{ height: totalHeight, position: 'relative' }}>
          {/* Visible items */}
          <div
            style={{
              transform: `translateY(${offsetY}px)`,
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
          >
            {visibleItems.map((item, index) => (
              <div
                key={item.id}
                style={{ height: item.height || itemHeight }}
                role="listitem"
                aria-setsize={items.length}
                aria-posinset={startIndex + index + 1}
              >
                {renderItem(item, startIndex + index)}
              </div>
            ))}
          </div>
        </div>

        {/* Loading indicator */}
        {loading && (
          <div className="flex items-center justify-center py-8">
            {loadingComponent || (
              <div className="flex items-center space-x-2">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" as any }}
                  className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">Loading...</span>
              </div>
            )}
          </div>
        )}

        {/* End of list indicator */}
        {!hasMore && items.length > 0 && (
          <div className="flex items-center justify-center py-8">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              You've reached the end
            </span>
          </div>
        )}
      </div>
    </div>
  );
};