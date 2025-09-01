import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';

interface VirtualScrollingProps<T> {
  items: T[];
  itemHeight: number | ((index: number) => number);
  containerHeight: number;
  renderItem: (item: T, index: number, isVisible: boolean) => React.ReactNode;
  overscan?: number;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
  isLoading?: boolean;
  className?: string;
  horizontal?: boolean;
  estimatedItemSize?: number;
  onScroll?: (scrollTop: number, scrollLeft: number) => void;
  scrollToIndex?: number;
  scrollToAlignment?: 'start' | 'center' | 'end' | 'auto';
}

export function VirtualScrolling<T>({
  items,
  itemHeight,
  containerHeight,
  renderItem,
  overscan = 5,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = '',
  horizontal = false,
  estimatedItemSize = 50,
  onScroll,
  scrollToIndex,
  scrollToAlignment = 'auto'
}: VirtualScrollingProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);
  const itemSizeCache = useRef<Map<number, number>>(new Map());
  const itemOffsetCache = useRef<Map<number, number>>(new Map());

  // Calculate item size
  const getItemSize = useCallback((index: number): number => {
    if (typeof itemHeight === 'function') {
      const cached = itemSizeCache.current.get(index);
      if (cached !== undefined) return cached;
      
      const size = itemHeight(index);
      itemSizeCache.current.set(index, size);
      return size;
    }
    return itemHeight;
  }, [itemHeight]);

  // Calculate item offset
  const getItemOffset = useCallback((index: number): number => {
    if (typeof itemHeight === 'number') {
      return index * itemHeight;
    }

    const cached = itemOffsetCache.current.get(index);
    if (cached !== undefined) return cached;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += getItemSize(i);
    }
    
    itemOffsetCache.current.set(index, offset);
    return offset;
  }, [getItemSize]);

  // Calculate total size
  const totalSize = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }

    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemSize(i);
    }
    return total;
  }, [items.length, getItemSize, itemHeight]);

  // Find start index for variable heights
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

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const scrollOffset = horizontal ? scrollLeft : scrollTop;
    const containerSize = horizontal ? containerHeight : containerHeight; // In real app, you'd pass containerWidth for horizontal
    
    const start = findStartIndex(scrollOffset);
    let end = start;
    let currentOffset = getItemOffset(start);

    // Find end index
    while (end < items.length - 1 && currentOffset < scrollOffset + containerSize) {
      end++;
      currentOffset += getItemSize(end);
    }

    return {
      start: Math.max(0, start - overscan),
      end: Math.min(items.length - 1, end + overscan)
    };
  }, [horizontal ? scrollLeft : scrollTop, containerHeight, findStartIndex, getItemOffset, getItemSize, items.length, overscan, horizontal]);

  // Get visible items with their positions
  const visibleItems = useMemo(() => {
    const items_to_render = [];
    
    for (let i = visibleRange.start; i <= visibleRange.end; i++) {
      if (i >= 0 && i < items.length) {
        items_to_render.push({
          index: i,
          item: items[i],
          offset: getItemOffset(i),
          size: getItemSize(i)
        });
      }
    }
    
    return items_to_render;
  }, [items, visibleRange, getItemOffset, getItemSize]);

  // Handle scroll
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const newScrollTop = element.scrollTop;
    const newScrollLeft = element.scrollLeft;
    
    setScrollTop(newScrollTop);
    setScrollLeft(newScrollLeft);
    onScroll?.(newScrollTop, newScrollLeft);

    // Load more when near bottom/right
    if (onLoadMore && hasNextPage && !isLoading) {
      const scrollSize = horizontal ? element.scrollWidth : element.scrollHeight;
      const clientSize = horizontal ? element.clientWidth : element.clientHeight;
      const scrollOffset = horizontal ? newScrollLeft : newScrollTop;
      const threshold = scrollSize - clientSize - (estimatedItemSize * 3);
      
      if (scrollOffset >= threshold) {
        onLoadMore();
      }
    }
  }, [onScroll, onLoadMore, hasNextPage, isLoading, estimatedItemSize, horizontal]);

  // Scroll to specific index
  const scrollToIndexInternal = useCallback((index: number, alignment: string = 'auto') => {
    if (!scrollElementRef.current || index < 0 || index >= items.length) return;

    const element = scrollElementRef.current;
    const itemOffset = getItemOffset(index);
    const itemSize = getItemSize(index);
    const containerSize = horizontal ? element.clientWidth : element.clientHeight;
    const currentScroll = horizontal ? scrollLeft : scrollTop;

    let targetScroll = itemOffset;

    switch (alignment) {
      case 'start':
        targetScroll = itemOffset;
        break;
      case 'center':
        targetScroll = itemOffset - (containerSize - itemSize) / 2;
        break;
      case 'end':
        targetScroll = itemOffset - containerSize + itemSize;
        break;
      case 'auto':
        if (itemOffset < currentScroll) {
          targetScroll = itemOffset;
        } else if (itemOffset + itemSize > currentScroll + containerSize) {
          targetScroll = itemOffset - containerSize + itemSize;
        } else {
          return; // Already visible
        }
        break;
    }

    targetScroll = Math.max(0, Math.min(targetScroll, totalSize - containerSize));

    if (horizontal) {
      element.scrollLeft = targetScroll;
    } else {
      element.scrollTop = targetScroll;
    }
  }, [items.length, getItemOffset, getItemSize, horizontal, scrollLeft, scrollTop, totalSize]);

  // Handle external scroll to index
  useEffect(() => {
    if (scrollToIndex !== undefined) {
      scrollToIndexInternal(scrollToIndex, scrollToAlignment);
    }
  }, [scrollToIndex, scrollToAlignment, scrollToIndexInternal]);

  const containerStyle: React.CSSProperties = {
    height: containerHeight,
    overflow: 'auto',
    position: 'relative',
    ...(horizontal ? { overflowX: 'auto', overflowY: 'hidden' } : {})
  };

  const innerStyle: React.CSSProperties = horizontal
    ? {
        width: totalSize,
        height: '100%',
        position: 'relative'
      }
    : {
        height: totalSize,
        position: 'relative'
      };

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-scroll-container ${className}`}
      data-testid="virtual-scroll-container"
      style={containerStyle}
      onScroll={handleScroll}
    >
      <div style={innerStyle}>
        {visibleItems.map(({ index, item, offset, size }) => (
          <motion.div
            key={index}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.2 }}
            style={{
              position: 'absolute',
              ...(horizontal
                ? {
                    left: offset,
                    top: 0,
                    width: size,
                    height: '100%'
                  }
                : {
                    top: offset,
                    left: 0,
                    height: size,
                    width: '100%'
                  })
            }}
          >
            {renderItem(item, index, true)}
          </motion.div>
        ))}
      </div>
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center p-4 absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Loading more...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Grid virtual scrolling for 2D layouts
interface VirtualGridProps<T> {
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
}

export function VirtualGrid<T>({
  items,
  itemWidth,
  itemHeight,
  containerWidth,
  containerHeight,
  renderItem,
  gap = 0,
  onLoadMore,
  hasNextPage = false,
  isLoading = false,
  className = ''
}: VirtualGridProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const scrollElementRef = useRef<HTMLDivElement>(null);

  // Calculate grid dimensions
  const columnsCount = Math.floor((containerWidth + gap) / (itemWidth + gap));
  const rowsCount = Math.ceil(items.length / columnsCount);
  const totalHeight = rowsCount * (itemHeight + gap) - gap;

  // Calculate visible range
  const visibleRange = useMemo(() => {
    const startRow = Math.floor(scrollTop / (itemHeight + gap));
    const endRow = Math.min(
      startRow + Math.ceil(containerHeight / (itemHeight + gap)) + 1,
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
    const scrollTop = e.currentTarget.scrollTop;
    setScrollTop(scrollTop);

    // Load more when near bottom
    if (onLoadMore && hasNextPage && !isLoading) {
      const scrollHeight = e.currentTarget.scrollHeight;
      const clientHeight = e.currentTarget.clientHeight;
      const threshold = scrollHeight - clientHeight - (itemHeight * 2);
      
      if (scrollTop >= threshold) {
        onLoadMore();
      }
    }
  }, [onLoadMore, hasNextPage, isLoading, itemHeight]);

  return (
    <div
      ref={scrollElementRef}
      className={`virtual-grid-container ${className}`}
      style={{
        width: containerWidth,
        height: containerHeight,
        overflow: 'auto',
        position: 'relative'
      }}
      onScroll={handleScroll}
    >
      <div
        style={{
          height: totalHeight,
          position: 'relative',
          width: '100%'
        }}
      >
        {visibleItems.map(({ index, item, x, y }) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: (index % columnsCount) * 0.05 }}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              width: itemWidth,
              height: itemHeight
            }}
          >
            {renderItem(item, index)}
          </motion.div>
        ))}
      </div>
      
      {isLoading && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex justify-center p-4 absolute bottom-0 left-0 right-0 bg-white/80 backdrop-blur-sm"
        >
          <div className="flex items-center space-x-2">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-500"></div>
            <span className="text-sm text-gray-600">Loading more products...</span>
          </div>
        </motion.div>
      )}
    </div>
  );
}

// Hook for managing virtual scrolling state
export function useVirtualScrolling<T>(
  items: T[],
  itemHeight: number | ((index: number) => number),
  containerHeight: number
) {
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  
  const getItemSize = useCallback((index: number): number => {
    return typeof itemHeight === 'function' ? itemHeight(index) : itemHeight;
  }, [itemHeight]);

  const visibleRange = useMemo(() => {
    if (typeof itemHeight === 'number') {
      const start = Math.floor(scrollTop / itemHeight);
      const end = Math.min(
        start + Math.ceil(containerHeight / itemHeight),
        items.length - 1
      );
      return { start, end };
    }

    // For variable heights, this would need more complex calculation
    let start = 0;
    let end = items.length - 1;
    let currentOffset = 0;

    // Find start
    for (let i = 0; i < items.length; i++) {
      if (currentOffset >= scrollTop) {
        start = i;
        break;
      }
      currentOffset += getItemSize(i);
    }

    // Find end
    currentOffset = 0;
    for (let i = 0; i < items.length; i++) {
      if (currentOffset >= scrollTop + containerHeight) {
        end = i;
        break;
      }
      currentOffset += getItemSize(i);
    }

    return { start, end };
  }, [scrollTop, containerHeight, items.length, getItemSize, itemHeight]);

  const scrollToIndex = useCallback((index: number) => {
    if (typeof itemHeight === 'number') {
      const targetScrollTop = index * itemHeight;
      setScrollTop(targetScrollTop);
    } else {
      let targetScrollTop = 0;
      for (let i = 0; i < index; i++) {
        targetScrollTop += getItemSize(i);
      }
      setScrollTop(targetScrollTop);
    }
  }, [getItemSize, itemHeight]);

  const totalHeight = useMemo(() => {
    if (typeof itemHeight === 'number') {
      return items.length * itemHeight;
    }
    
    let total = 0;
    for (let i = 0; i < items.length; i++) {
      total += getItemSize(i);
    }
    return total;
  }, [items.length, getItemSize, itemHeight]);

  return {
    scrollTop,
    scrollLeft,
    setScrollTop,
    setScrollLeft,
    visibleRange,
    scrollToIndex,
    totalHeight
  };
}

export default VirtualScrolling;