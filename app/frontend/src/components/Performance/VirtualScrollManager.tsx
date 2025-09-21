import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface VirtualScrollConfig {
  itemHeight: number | ((index: number) => number);
  bufferSize: number;
  threshold: number;
  preloadCount: number;
  recycleNodes: boolean;
  enableSmoothing: boolean;
  targetFPS: number;
}

interface VirtualScrollManagerProps<T> {
  items: T[];
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  config?: Partial<VirtualScrollConfig>;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  onScroll?: (scrollTop: number, visibleRange: { start: number; end: number }) => void;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
  enablePreloading?: boolean;
  preloadDistance?: number;
}

const DEFAULT_CONFIG: VirtualScrollConfig = {
  itemHeight: 100,
  bufferSize: 5,
  threshold: 200,
  preloadCount: 10,
  recycleNodes: true,
  enableSmoothing: true,
  targetFPS: 60
};

export const VirtualScrollManager = memo(function VirtualScrollManager<T>({
  items,
  containerHeight,
  renderItem,
  config = {},
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
  onScroll,
  scrollToIndex,
  scrollToAlignment = 'auto',
  enablePreloading = true,
  preloadDistance = 1000
}: VirtualScrollManagerProps<T>) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };
  
  const [scrollTop, setScrollTop] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [frameRate, setFrameRate] = useState(60);
  
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemSizeCache = useRef<Map<number, number>>(new Map());
  const itemOffsetCache = useRef<Map<number, number>>(new Map());
  const scrollTimeoutRef = useRef<NodeJS.Timeout>();
  const frameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(performance.now());

  // Performance monitoring
  const measureFrameRate = useCallback(() => {
    const now = performance.now();
    const delta = now - lastFrameTimeRef.current;
    
    if (delta >= 1000) {
      setFrameRate(Math.round((frameCountRef.current * 1000) / delta));
      frameCountRef.current = 0;
      lastFrameTimeRef.current = now;
    }
    
    frameCountRef.current++;
  }, []);

  // Calculate item size with caching
  const getItemSize = useCallback((index: number): number => {
    if (typeof finalConfig.itemHeight === 'function') {
      const cached = itemSizeCache.current.get(index);
      if (cached !== undefined) return cached;
      
      const size = finalConfig.itemHeight(index);
      itemSizeCache.current.set(index, size);
      return size;
    }
    return finalConfig.itemHeight as number;
  }, [finalConfig.itemHeight]);

  // Calculate item offset with caching
  const getItemOffset = useCallback((index: number): number => {
    if (typeof finalConfig.itemHeight === 'number') {
      return index * finalConfig.itemHeight;
    }

    const cached = itemOffsetCache.current.get(index);
    if (cached !== undefined) return cached;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSize(i);
    }
    
    itemOffsetCache.current.set(index, offset);
    return offset;
  }, [getItemSize, finalConfig.itemHeight]);

  // Calculate total size
  const totalSize = useMemo(() => {
    if (typeof finalConfig.itemHeight === 'number') {
      return items.length * finalConfig.itemHeight;
    }

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemSize(i);
    }
    return total;
  }, [items.length, getItemSize, finalConfig.itemHeight]);

  // Find start index for variable heights using binary search
  const findStartIndex = useCallback((scrollOffset: number): number => {
    if (typeof finalConfig.itemHeight === 'number') {
      return Math.floor(scrollOffset / finalConfig.itemHeight);
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
  }, [items.length, getItemOffset, finalConfig.itemHeight]);

  // Calculate visible range with buffer
  const visibleRange = useMemo(() => {
    const start = findStartIndex(scrollTop);
    let end = start;
    let currentOffset = getItemOffset(start);

    // Find end index
    while (end < items.length - 1 && currentOffset < scrollTop + containerHeight) {
      end++;
      currentOffset += getItemSize(end);
    }

    return {
      start: Math.max(0, start - finalConfig.bufferSize),
      end: Math.min(items.length - 1, end + finalConfig.bufferSize)
    };
  }, [scrollTop, containerHeight, findStartIndex, getItemOffset, getItemSize, items.length, finalConfig.bufferSize]);

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const itemsToRender = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= 0 && i < items.length) {
        itemsToRender.push({
          index: i,
          item: items[i],
          offset: getItemOffset(i),
          size: getItemSize(i),
          isVisible: i >= visibleRange.start + finalConfig.bufferSize && 
                    i <= visibleRange.end - finalConfig.bufferSize
        });
      }
    }
    
    return itemsToRender;
  }, [items, visibleRange, getItemOffset, getItemSize, finalConfig.bufferSize]);

  // Smooth scroll handler with throttling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const newScrollTop = element.scrollTop;
    
    // Throttle scroll updates for performance
    if (finalConfig.enableSmoothing) {
      requestAnimationFrame(() => {
        setScrollTop(newScrollTop);
        measureFrameRate();
      });
    } else {
      setScrollTop(newScrollTop);
    }

    setIsScrolling(true);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Set scroll end timeout
    scrollTimeoutRef.current = setTimeout(() => {
      setIsScrolling(false);
    }, 150);

    onScroll?.(newScrollTop, visibleRange);

    // Preload content when approaching end
    if (enablePreloading && onLoadMore && hasNextPage && !isLoading) {
      const scrollHeight = element.scrollHeight;
      const clientHeight = element.clientHeight;
      const threshold = scrollHeight - clientHeight - preloadDistance;
      
      if (newScrollTop >= threshold) {
        onLoadMore();
      }
    }
  }, [onScroll, visibleRange, onLoadMore, hasNextPage, isLoading, enablePreloading, preloadDistance, finalConfig.enableSmoothing, measureFrameRate]);

  // Scroll to specific index
  const scrollToIndexInternal = useCallback((index: number, alignment: string = 'auto') => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) return;

    const element = scrollElementRef.current;
    const itemOffset = getItemOffset(index);
    const itemSize = getItemSize(index);
    const currentScroll = scrollTop;

    let targetScroll = itemOffset;

    switch (alignment) {
      case 'start':
        targetScroll = itemOffset;
        break;
      case 'center':
        targetScroll = itemOffset - (containerHeight - itemSize) / 2;
        break;
      case 'end':
        targetScroll = itemOffset - containerHeight + itemSize;
        break;
      case 'auto':
        if (itemOffset < currentScroll) {
          targetScroll = itemOffset;
        } else if (itemOffset + itemSize > currentScroll + containerHeight) {
          targetScroll = itemOffset - containerHeight + itemSize;
        } else {
          return; // Already visible
        }
        break;
    }

    targetScroll = Math.max(0, Math.min(targetScroll, totalSize - containerHeight));

    if (finalConfig.enableSmoothing) {
      element.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    } else {
      element.scrollTop = targetScroll;
    }
  }, [items.length, getItemOffset, getItemSize, scrollTop, containerHeight, totalSize, finalConfig.enableSmoothing]);

  // Handle external scroll to index
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      scrollToIndexInternal(scrollToIndex, scrollToAlignment);
    }
  }, [scrollToIndex, scrollToAlignment, scrollToIndexInternal]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const containerStyle: React.CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    willChange: isScrolling ? 'scroll-position' : 'auto'
  };

  const innerStyle: React.CSSProperties = {
    height: totalSize,
    position: 'relative'
  };

  return (
    <div className={`virtual-scroll-manager ${className}`}>
      {/* Performance indicator */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-10 bg-black/80 text-white px-2 py-1 rounded text-xs">
          {frameRate} FPS | {visibleItems.length} items
        </div>
      )}

      <div
        ref={scrollElementRef}
        className="virtual-scroll-container"
        data-testid="virtual-scroll-container"
        style={containerStyle}
        onScroll={handleScroll}
      >
        <div style={innerStyle}>
          <AnimatePresence mode="popLayout">
            {visibleItems.map(({ index, item, offset, size, isVisible }) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ 
                  duration: finalConfig.enableSmoothing ? 0.2 : 0,
                  ease: "easeOut"
                }}
                style={{
                  position: 'absolute',
                  top: offset,
                  left: 0,
                  height: size,
                  width: '100%',
                  transform: finalConfig.enableSmoothing && isScrolling ? 
                    'translateZ(0)' : 'none' // Enable hardware acceleration when scrolling
                }}
              >
                {renderItem(item, index, isVisible)}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        
        {/* Loading indicator */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute bottom-0 left-0 right-0 flex justify-center p-4 bg-white/80 backdrop-blur-sm"
          >
            <div className="flex items-center space-x-2">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
              <span className="text-sm text-gray-600">Loading more content...</span>
            </div>
          </motion.div>
        )}

        {/* Scroll indicator */}
        {isScrolling && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 text-white px-2 py-1 rounded text-xs"
          >
            {Math.round((scrollTop / (totalSize - containerHeight)) * 100)}%
          </motion.div>
        )}
      </div>
    </div>
  );
}) as <T>(props: VirtualScrollManagerProps<T>) => JSX.Element;

// Hook for managing virtual scroll state
export function useVirtualScroll<T>(
  items: T[],
  itemHeight: number | ((index: number) => number),
  containerHeight: number,
  config?: Partial<VirtualScrollConfig>
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 0 });
  const [isScrolling, setIsScrolling] = useState(false);
  
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  const handleScroll = useCallback((newScrollTop: number, newVisibleRange: { start: number; end: number }) => {
    setScrollTop(newScrollTop);
    setVisibleRange(newVisibleRange);
  }, []);

  const scrollToIndex = useCallback((index: number, alignment: 'start' | 'center' | 'end' | 'auto' = 'auto') => {
    // This would be implemented by the component using this hook
    console.log(`Scroll to index ${index} with alignment ${alignment}`);
  }, []);

  return {
    scrollTop,
    visibleRange,
    isScrolling,
    handleScroll,
    scrollToIndex,
    config: finalConfig
  };
}

export default VirtualScrollManager;