/**
 * Virtual Scroll Manager for Community Enhancements
 * Optimized virtual scrolling for large community and post lists
 */

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { EnhancedCommunityData, EnhancedPost } from '../../../types/communityEnhancements';

interface VirtualScrollManagerProps<T> {
  items: T[];
  itemHeight: number | ((item: T, index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  overscan?: number;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  onScroll?: (scrollTop: number) => void;
  scrollToIndex?: number;
  enableAnimations?: boolean;
  bufferSize?: number;
  estimatedItemSize?: number;
}

interface VirtualItem<T> {
  index: number;
  item: T;
  offset: number;
  size: number;
  isVisible: boolean;
}

/**
 * Enhanced Virtual Scroll Manager with performance optimizations
 */
export function VirtualScrollManager<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 3,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
  onScroll,
  scrollToIndex,
  enableAnimations = true,
  bufferSize = 5,
  estimatedItemSize = 100
}: VirtualScrollManagerProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const itemSizeCache = useRef<Map<number, number>>(new Map());
  const itemOffsetCache = useRef<Map<number, number>>(new Map());
  const renderCache = useRef<Map<number, React.ReactNode>>(new Map());
  const intersectionObserverRef = useRef<IntersectionObserver>();
  const visibleItemsRef = useRef<Set<number>>(new Set());

  // Performance monitoring
  const performanceMetrics = useRef({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    scrollEventCount: 0,
    cacheHitRate: 0
  });

  // Get item size with caching
  const getItemSize = useCallback((item: T, index: number): number => {
    const cached = itemSizeCache.current.get(index);
    if (cached !== undefined) {
      performanceMetrics.current.cacheHitRate++;
      return cached;
    }

    const size = typeof itemHeight === 'function' 
      ? itemHeight(item, index) 
      : itemHeight;
    
    itemSizeCache.current.set(index, size);
    return size;
  }, [itemHeight]);

  // Get item offset with caching
  const getItemOffset = useCallback((index: number): number => {
    const cached = itemOffsetCache.current.get(index);
    if (cached !== undefined) return cached;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSize(items[i], i);
    }
    
    itemOffsetCache.current.set(index, offset);
    return offset;
  }, [items, getItemSize]);

  // Calculate total height
  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemSize(items[i], i);
    }
    return total;
  }, [items, getItemSize, itemHeight]);

  // Binary search for start index (optimized for variable heights)
  const findStartIndex = useCallback((scrollOffset: number): number => {
    if (typeof itemHeight === 'number') {
      return Math.floor(scrollOffset / itemHeight);
    }

    let low = 0;
    let high = items.length - 1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const offset = getItemOffset(mid);

      if (offset === scrollOffset) {
        return mid;
      } else if (offset < scrollOffset) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }

    return Math.max(0, high);
  }, [items.length, getItemOffset, itemHeight]);

  // Calculate visible range with overscan
  const visibleRange = useMemo(() => {
    const start = findStartIndex(scrollTop);
    let end = start;
    let currentOffset = getItemOffset(start);

    // Find end index
    while (end < items.length - 1 && currentOffset < scrollTop + containerHeight) {
      end++;
      currentOffset += getItemSize(items[end], end);
    }

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    };
  }, [scrollTop, containerHeight, findStartIndex, getItemOffset, getItemSize, items, overscan]);

  // Get virtual items with optimized rendering
  const virtualItems = useMemo((): VirtualItem<T>[] => {
    const startTime = performance.now();
    const items_to_render: VirtualItem<T>[] = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= 0 && i < items.length) {
        const isVisible = i >= visibleRange.start + overscan && i <= visibleRange.end - overscan;
        
        items_to_render.push({
          index: i,
          item: items[i],
          offset: getItemOffset(i),
          size: getItemSize(items[i], i),
          isVisible
        });
      }
    }

    // Update performance metrics
    const renderTime = performance.now() - startTime;
    performanceMetrics.current.renderCount++;
    performanceMetrics.current.lastRenderTime = renderTime;
    performanceMetrics.current.averageRenderTime = 
      (performanceMetrics.current.averageRenderTime + renderTime) / 2;
    
    return items_to_render;
  }, [items, visibleRange, getItemOffset, getItemSize, overscan]);

  // Optimized scroll handler with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const newScrollTop = element.scrollTop;
    
    setScrollTop(newScrollTop);
    setIsScrolling(true);
    onScroll?.(newScrollTop);

    // Update performance metrics
    performanceMetrics.current.scrollEventCount++;

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Load more when near bottom
    if (onLoadMore && hasNextPage && !isLoading) {
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const threshold = scrollHeight - clientHeight - (estimatedItemSize * 3);
      
      if (newScrollTop >= threshold) {
        onLoadMore();
      }
    }
  }, [onScroll, onLoadMore, hasNextPage, isLoading, estimatedItemSize]);

  // Scroll to specific index with smooth animation
  const scrollToIndexInternal = useCallback((index: number, behavior: ScrollBehavior = 'smooth') => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) return;

    const element = scrollElementRef.current;
    const targetOffset = getItemOffset(index);
    
    element.scrollTo({
      top: targetOffset,
      behavior
    });
  }, [items.length, getItemOffset]);

  // Handle external scroll to index
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      scrollToIndexInternal(scrollToIndex);
    }
  }, [scrollToIndex, scrollToIndexInternal]);

  // Setup intersection observer for visibility tracking
  useEffect(() => {
    if (!scrollElementRef.current) return;

    intersectionObserverRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          const index = parseInt(entry.target.getAttribute('data-index') || '0');
          if (entry.isIntersecting) {
            visibleItemsRef.current.add(index);
          } else {
            visibleItemsRef.current.delete(index);
          }
        });
      },
      {
        root: scrollElementRef.current,
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    return () => {
      intersectionObserverRef.current?.disconnect();
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      intersectionObserverRef.current?.disconnect();
    };
  }, []);

  // Render cached item or create new one
  const renderCachedItem = useCallback((virtualItem: VirtualItem<T>) => {
    const { index, item, isVisible } = virtualItem;
    
    // Check render cache first
    if (!isScrolling && renderCache.current.has(index)) {
      return renderCache.current.get(index);
    }

    const renderedItem = renderItem(item, index, isVisible);
    
    // Cache rendered item if not scrolling
    if (!isScrolling) {
      renderCache.current.set(index, renderedItem);
      
      // Limit cache size
      if (renderCache.current.size > bufferSize * 2) {
        const oldestKey = renderCache.current.keys().next().value;
        if (oldestKey !== undefined) {
          renderCache.current.delete(oldestKey);
        }
      }
    }

    return renderedItem;
  }, [renderItem, isScrolling, bufferSize]);

  // Clear caches when items change
  useEffect(() => {
    itemSizeCache.current.clear();
    itemOffsetCache.current.clear();
    renderCache.current.clear();
  }, [items]);

  const containerStyle: React.CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    willChange: 'scroll-position'
  };

  const innerStyle: React.CSSProperties = {
    height: totalHeight,
    position: 'relative',
    contain: 'layout style paint'
  };

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-scroll-manager ${className} ${isScrolling ? 'scrolling' : ''}`}
      style={containerStyle}
      onScroll={handleScroll}
      data-testid="virtual-scroll-manager"
    >
      <div style={innerStyle}>
        <AnimatePresence mode="popLayout">
          {virtualItems.map((virtualItem) => {
            const { index, offset, size } = virtualItem;
            
            return (
              <motion.div
                key={index}
                data-index={index}
                initial={enableAnimations ? { opacity: 0, y: 20 } : undefined}
                animate={enableAnimations ? { opacity: 1, y: 0 } : undefined}
                exit={enableAnimations ? { opacity: 0, y: -20 } : undefined}
                transition={enableAnimations ? { 
                  duration: 0.2, 
                  ease: 'easeOut',
                  delay: isScrolling ? 0 : Math.min(0.1, (index % 5) * 0.02)
                } : undefined}
                style={{
                  position: 'absolute',
                  top: offset,
                  left: 0,
                  width: '100%',
                  height: size,
                  contain: 'layout style paint'
                }}
              >
                {renderCachedItem(virtualItem)}
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-white/80 backdrop-blur-sm border-t"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Loading more items...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

/**
 * Hook for virtual scroll performance monitoring
 */
export function useVirtualScrollPerformance() {
  const [metrics, setMetrics] = useState({
    renderCount: 0,
    averageRenderTime: 0,
    lastRenderTime: 0,
    scrollEventCount: 0,
    cacheHitRate: 0,
    memoryUsage: 0
  });

  // Temporarily disable problematic code
  /*
  const updateMetrics = useCallback(() => {
    // Get memory usage if available
    const memoryUsage = (performance as any).memory?.usedJSHeapSize || 0;
    
    setMetrics({
      renderCount: performanceMetrics.current.renderCount,
      averageRenderTime: performanceMetrics.current.averageRenderTime,
      lastRenderTime: performanceMetrics.current.lastRenderTime,
      scrollEventCount: performanceMetrics.current.scrollEventCount,
      cacheHitRate: performanceMetrics.current.cacheHitRate,
      memoryUsage
    });
  }, []);

  useEffect(() => {
    const interval = setInterval(updateMetrics, 1000);
    return () => clearInterval(interval);
  }, [updateMetrics]);

  const resetMetrics = useCallback(() => {
    performanceMetrics.current = {
      renderCount: 0,
      averageRenderTime: 0,
      lastRenderTime: 0,
      scrollEventCount: 0,
      cacheHitRate: 0
    };
    updateMetrics();
  }, [updateMetrics]);
  */

  // Simple placeholder implementation
  const updateMetrics = useCallback(() => {
    // Do nothing for now
  }, []);

  const resetMetrics = useCallback(() => {
    // Do nothing for now
  }, []);

  return {
    metrics,
    updateMetrics,
    resetMetrics
  };
}

/**
 * Optimized Virtual Grid for community icons and cards
 */
interface VirtualGridManagerProps<T> {
  items: T[];
  itemWidth: number;
  itemHeight: number;
  containerWidth: number;
  containerHeight: number;
  renderItem: (item: T, index: number) => React.ReactNode;
  gap?: number;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  enableAnimations?: boolean;
}

export function VirtualGridManager<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 8,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
  enableAnimations = true
}: VirtualGridManagerProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();

  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const totalHeight = rowsCount * (itemHeight + gap) - gap;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.min(
      startRow + Math.ceil(containerHeight / (itemHeight + gap)) + 2,
      rowsCount - 1
    );

    return {
      startRow: Math.max(0, startRow - 1),
      endRow: Math.min(rowsCount - 1, endRow + 1),
      startIndex: Math.max(0, (startRow - 1) * columnsCount),
      endIndex: Math.min(items.length - 1, (endRow + 1) * columnsCount + columnsCount - 1)
    };
  }, [scrollTop, itemHeight, gap, containerHeight, rowsCount, columnsCount, items.length]);

  // Get visible items with positions
  const visibleItems = useMemo(() => {
    const visibleItems = [];
    
    for (let i = visibleRange.startIndex; i <= visibleRange.endIndex && i < items.length; i++) {
      const row = Math.floor(i / columnsCount);
      const col = i % columnsCount;
      
      visibleItems.push({
        index: i,
        item: items[i],
        x: col * (itemWidth + gap),
        y: row * (itemHeight + gap)
      });
    }
    
    return visibleItems;
  }, [items, visibleRange, columnsCount, itemWidth, itemHeight, gap]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    setIsScrolling(true);

    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    // Set scrolling to false after scroll ends
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    // Load more when near bottom
    if (onLoadMore && hasNextPage && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const threshold = scrollHeight - clientHeight - (itemHeight * 2);
      
      if (newScrollTop >= threshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasNextPage, isLoading, itemHeight]);

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-grid-manager ${className} ${isScrolling ? 'scrolling' : ''}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative',
        willChange: 'scroll-position'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%',
          contain: 'layout style paint'
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleItems.map(({ index, item, x, y }) => (
            <motion.div
              key={index}
              initial={enableAnimations ? { opacity: 0, scale: 0.8 } : undefined}
              animate={enableAnimations ? { opacity: 1, scale: 1 } : undefined}
              exit={enableAnimations ? { opacity: 0, scale: 0.8 } : undefined}
              transition={enableAnimations ? { 
                duration: 0.2, 
                ease: 'easeOut',
                delay: isScrolling ? 0 : (index % columnsCount) * 0.05
              } : undefined}
              style={{
                position: 'absolute',
                left: x,
                top: y,
                width: itemWidth,
                height: itemHeight,
                contain: 'layout style paint'
              }}
            >
              {renderItem(item, index)}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-white/80 backdrop-blur-sm border-t"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-blue-500 border-t-transparent"></div>
            <span className="text-sm text-gray-600">Loading more items...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

export default VirtualScrollManager;