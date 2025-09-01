'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ResponsiveGridProps {
  children: React.ReactNode[];
  minItemWidth?: number;
  maxItemWidth?: number;
  gap?: number;
  className?: string;
  itemClassName?: string;
  animateItems?: boolean;
  virtualScrolling?: boolean;
  itemHeight?: number;
  overscan?: number;
}

interface GridDimensions {
  columns: number;
  itemWidth: number;
  containerWidth: number;
}

const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  minItemWidth = 280,
  maxItemWidth = 400,
  gap = 16,
  className = '',
  itemClassName = '',
  animateItems = true,
  virtualScrolling = false,
  itemHeight = 400,
  overscan = 5
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState<GridDimensions>({
    columns: 1,
    itemWidth: minItemWidth,
    containerWidth: 0
  });
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: children.length });
  const [scrollTop, setScrollTop] = useState(0);

  // Calculate grid dimensions based on container width
  const calculateDimensions = useCallback((containerWidth: number): GridDimensions => {
    if (containerWidth === 0) {
      return { columns: 1, itemWidth: minItemWidth, containerWidth: 0 };
    }

    // Calculate how many columns can fit
    let columns = Math.floor((containerWidth + gap) / (minItemWidth + gap));
    columns = Math.max(1, columns);

    // Calculate actual item width
    const availableWidth = containerWidth - (gap * (columns - 1));
    let itemWidth = availableWidth / columns;

    // Ensure item width doesn't exceed maximum
    if (itemWidth > maxItemWidth) {
      itemWidth = maxItemWidth;
      // Recalculate columns with max width constraint
      columns = Math.floor((containerWidth + gap) / (maxItemWidth + gap));
      columns = Math.max(1, columns);
    }

    return { columns, itemWidth, containerWidth };
  }, [minItemWidth, maxItemWidth, gap]);

  // Handle resize observer
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width } = entry.contentRect;
        setDimensions(calculateDimensions(width));
      }
    });

    resizeObserver.observe(container);
    
    // Initial calculation
    setDimensions(calculateDimensions(container.offsetWidth));

    return () => {
      resizeObserver.disconnect();
    };
  }, [calculateDimensions]);

  // Virtual scrolling calculations
  useEffect(() => {
    if (!virtualScrolling || !containerRef.current) return;

    const handleScroll = () => {
      const container = containerRef.current;
      if (!container) return;

      const scrollTop = container.scrollTop;
      const containerHeight = container.clientHeight;
      
      const rowHeight = itemHeight + gap;
      const totalRows = Math.ceil(children.length / dimensions.columns);
      
      const startRow = Math.floor(scrollTop / rowHeight);
      const endRow = Math.min(
        totalRows - 1,
        Math.ceil((scrollTop + containerHeight) / rowHeight)
      );
      
      const start = Math.max(0, (startRow - overscan) * dimensions.columns);
      const end = Math.min(children.length, (endRow + overscan + 1) * dimensions.columns);
      
      setVisibleRange({ start, end });
      setScrollTop(scrollTop);
    };

    const container = containerRef.current;
    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial calculation

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [virtualScrolling, dimensions.columns, itemHeight, gap, overscan, children.length]);

  // Get responsive breakpoint class
  const getBreakpointClass = () => {
    const { columns } = dimensions;
    
    if (columns === 1) return 'grid-mobile';
    if (columns === 2) return 'grid-tablet';
    if (columns === 3) return 'grid-desktop';
    if (columns >= 4) return 'grid-wide';
    
    return 'grid-default';
  };

  // Render grid items
  const renderItems = () => {
    const itemsToRender = virtualScrolling 
      ? children.slice(visibleRange.start, visibleRange.end)
      : children;

    const startIndex = virtualScrolling ? visibleRange.start : 0;

    return itemsToRender.map((child, index) => {
      const actualIndex = startIndex + index;
      const row = Math.floor(actualIndex / dimensions.columns);
      const col = actualIndex % dimensions.columns;

      const style: React.CSSProperties = {
        width: dimensions.itemWidth,
        ...(virtualScrolling && {
          position: 'absolute',
          top: row * (itemHeight + gap),
          left: col * (dimensions.itemWidth + gap),
          height: itemHeight
        })
      };

      const itemElement = (
        <div
          key={actualIndex}
          className={`${itemClassName} ${getBreakpointClass()}`}
          style={style}
        >
          {child}
        </div>
      );

      if (animateItems && !virtualScrolling) {
        return (
          <motion.div
            key={actualIndex}
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            transition={{
              duration: 0.3,
              delay: (actualIndex % dimensions.columns) * 0.1,
              ease: 'easeOut'
            }}
            className={itemClassName}
            style={{ width: dimensions.itemWidth }}
          >
            {child}
          </motion.div>
        );
      }

      return itemElement;
    });
  };

  // Calculate total height for virtual scrolling
  const getTotalHeight = () => {
    if (!virtualScrolling) return 'auto';
    
    const totalRows = Math.ceil(children.length / dimensions.columns);
    return totalRows * (itemHeight + gap) - gap;
  };

  const gridStyle: React.CSSProperties = {
    display: virtualScrolling ? 'block' : 'grid',
    gridTemplateColumns: virtualScrolling ? undefined : `repeat(${dimensions.columns}, 1fr)`,
    gap: virtualScrolling ? undefined : gap,
    position: 'relative',
    height: getTotalHeight()
  };

  return (
    <div
      ref={containerRef}
      className={`
        responsive-grid
        ${virtualScrolling ? 'overflow-auto' : ''}
        ${className}
      `}
      style={gridStyle}
    >
      {animateItems && !virtualScrolling ? (
        <AnimatePresence mode="popLayout">
          {renderItems()}
        </AnimatePresence>
      ) : (
        renderItems()
      )}
      
      {/* Debug info in development */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed bottom-4 right-4 bg-black/80 text-white p-2 rounded text-xs font-mono z-50">
          <div>Columns: {dimensions.columns}</div>
          <div>Item Width: {Math.round(dimensions.itemWidth)}px</div>
          <div>Container: {Math.round(dimensions.containerWidth)}px</div>
          {virtualScrolling && (
            <>
              <div>Visible: {visibleRange.start}-{visibleRange.end}</div>
              <div>Total: {children.length}</div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

// Hook for responsive grid utilities
export const useResponsiveGrid = (
  containerRef: React.RefObject<HTMLElement>,
  minItemWidth: number = 280,
  maxItemWidth: number = 400,
  gap: number = 16
) => {
  const [gridInfo, setGridInfo] = useState({
    columns: 1,
    itemWidth: minItemWidth,
    containerWidth: 0,
    breakpoint: 'mobile' as 'mobile' | 'tablet' | 'desktop' | 'wide'
  });

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const updateGridInfo = () => {
      const containerWidth = container.offsetWidth;
      
      let columns = Math.floor((containerWidth + gap) / (minItemWidth + gap));
      columns = Math.max(1, columns);

      const availableWidth = containerWidth - (gap * (columns - 1));
      let itemWidth = availableWidth / columns;

      if (itemWidth > maxItemWidth) {
        itemWidth = maxItemWidth;
        columns = Math.floor((containerWidth + gap) / (maxItemWidth + gap));
        columns = Math.max(1, columns);
      }

      let breakpoint: 'mobile' | 'tablet' | 'desktop' | 'wide' = 'mobile';
      if (columns >= 4) breakpoint = 'wide';
      else if (columns === 3) breakpoint = 'desktop';
      else if (columns === 2) breakpoint = 'tablet';

      setGridInfo({ columns, itemWidth, containerWidth, breakpoint });
    };

    const resizeObserver = new ResizeObserver(updateGridInfo);
    resizeObserver.observe(container);
    updateGridInfo();

    return () => resizeObserver.disconnect();
  }, [containerRef, minItemWidth, maxItemWidth, gap]);

  return gridInfo;
};

export default ResponsiveGrid;