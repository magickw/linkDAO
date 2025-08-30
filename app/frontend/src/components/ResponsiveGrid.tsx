import React, { ReactNode, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useResponsive, useResponsiveColumns, useResponsiveSpacing } from '@/design-system/hooks/useResponsive';

interface ResponsiveGridProps {
  children: ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  gap?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
    '2xl'?: string;
  };
  className?: string;
  itemClassName?: string;
  animate?: boolean;
  staggerChildren?: number;
  minItemWidth?: string;
  maxItemWidth?: string;
  aspectRatio?: string;
  autoFit?: boolean;
}

export default function ResponsiveGrid({
  children,
  columns = {
    xs: 1,
    sm: 2,
    md: 3,
    lg: 4,
    xl: 5,
    '2xl': 6
  },
  gap = {
    xs: '1rem',
    sm: '1rem',
    md: '1.5rem',
    lg: '1.5rem',
    xl: '2rem',
    '2xl': '2rem'
  },
  className = '',
  itemClassName = '',
  animate = true,
  staggerChildren = 0.1,
  minItemWidth,
  maxItemWidth,
  aspectRatio,
  autoFit = false
}: ResponsiveGridProps) {
  const { breakpoint, isMobile, isTablet, isDesktop } = useResponsive();
  const columnCount = useResponsiveColumns(columns);
  const gridGap = useResponsiveSpacing(gap);

  // Convert children to array for easier manipulation
  const childrenArray = React.Children.toArray(children);

  // Calculate grid template columns
  const gridTemplateColumns = useMemo(() => {
    if (autoFit && minItemWidth) {
      return `repeat(auto-fit, minmax(${minItemWidth}, ${maxItemWidth || '1fr'}))`;
    }
    return `repeat(${columnCount}, 1fr)`;
  }, [columnCount, autoFit, minItemWidth, maxItemWidth]);

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: animate ? staggerChildren : 0,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { 
      opacity: 0, 
      y: 20,
      scale: 0.9
    },
    visible: { 
      opacity: 1, 
      y: 0,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 24
      }
    }
  };

  // Responsive grid styles
  const gridStyles = {
    display: 'grid',
    gridTemplateColumns,
    gap: gridGap,
    width: '100%',
    ...(aspectRatio && {
      '& > *': {
        aspectRatio
      }
    })
  };

  // Render grid items with animation
  const renderGridItems = () => {
    return childrenArray.map((child, index) => {
      if (animate) {
        return (
          <motion.div
            key={index}
            variants={itemVariants}
            className={itemClassName}
            style={aspectRatio ? { aspectRatio } : undefined}
          >
            {child}
          </motion.div>
        );
      }

      return (
        <div 
          key={index} 
          className={itemClassName}
          style={aspectRatio ? { aspectRatio } : undefined}
        >
          {child}
        </div>
      );
    });
  };

  if (animate) {
    return (
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className={className}
        style={gridStyles}
      >
        {renderGridItems()}
      </motion.div>
    );
  }

  return (
    <div
      className={className}
      style={gridStyles}
    >
      {renderGridItems()}
    </div>
  );
}

// Specialized grid components for common use cases

interface ProductGridProps extends Omit<ResponsiveGridProps, 'columns' | 'aspectRatio'> {
  variant?: 'compact' | 'standard' | 'detailed';
}

export function ProductGrid({ 
  variant = 'standard', 
  ...props 
}: ProductGridProps) {
  const columns = useMemo(() => {
    switch (variant) {
      case 'compact':
        return {
          xs: 2,
          sm: 3,
          md: 4,
          lg: 5,
          xl: 6,
          '2xl': 7
        };
      case 'detailed':
        return {
          xs: 1,
          sm: 1,
          md: 2,
          lg: 3,
          xl: 3,
          '2xl': 4
        };
      default: // standard
        return {
          xs: 1,
          sm: 2,
          md: 3,
          lg: 4,
          xl: 5,
          '2xl': 6
        };
    }
  }, [variant]);

  const aspectRatio = variant === 'compact' ? '1' : '3/4';

  return (
    <ResponsiveGrid
      columns={columns}
      aspectRatio={aspectRatio}
      {...props}
    />
  );
}

interface CategoryGridProps extends Omit<ResponsiveGridProps, 'columns' | 'aspectRatio'> {
  size?: 'small' | 'medium' | 'large';
}

export function CategoryGrid({ 
  size = 'medium', 
  ...props 
}: CategoryGridProps) {
  const columns = useMemo(() => {
    switch (size) {
      case 'small':
        return {
          xs: 3,
          sm: 4,
          md: 6,
          lg: 8,
          xl: 10,
          '2xl': 12
        };
      case 'large':
        return {
          xs: 2,
          sm: 2,
          md: 3,
          lg: 4,
          xl: 5,
          '2xl': 6
        };
      default: // medium
        return {
          xs: 2,
          sm: 3,
          md: 4,
          lg: 6,
          xl: 8,
          '2xl': 10
        };
    }
  }, [size]);

  return (
    <ResponsiveGrid
      columns={columns}
      aspectRatio="1"
      {...props}
    />
  );
}

interface MasonryGridProps extends Omit<ResponsiveGridProps, 'columns'> {
  columnWidth?: string;
}

export function MasonryGrid({ 
  columnWidth = '300px',
  ...props 
}: MasonryGridProps) {
  return (
    <ResponsiveGrid
      autoFit={true}
      minItemWidth={columnWidth}
      {...props}
    />
  );
}

// Hook for responsive grid calculations
export function useResponsiveGrid(
  columns: ResponsiveGridProps['columns'] = {},
  gap: ResponsiveGridProps['gap'] = {}
) {
  const { breakpoint, width } = useResponsive();
  const columnCount = useResponsiveColumns(columns);
  const gridGap = useResponsiveSpacing(gap);

  const itemWidth = useMemo(() => {
    const gapValue = parseFloat(gridGap) || 16;
    const totalGap = gapValue * (columnCount - 1);
    return `calc((100% - ${totalGap}px) / ${columnCount})`;
  }, [columnCount, gridGap]);

  return {
    columnCount,
    gridGap,
    itemWidth,
    breakpoint,
    containerWidth: width
  };
}

// Utility component for grid item with responsive behavior
interface GridItemProps {
  children: ReactNode;
  span?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
    '2xl'?: number;
  };
  className?: string;
}

export function GridItem({ 
  children, 
  span = {}, 
  className = '' 
}: GridItemProps) {
  const { breakpoint } = useResponsive();
  
  const getSpanValue = () => {
    const breakpointOrder: (keyof typeof span)[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
    const currentIndex = breakpointOrder.indexOf(breakpoint);
    
    // Find the appropriate span value for current breakpoint
    for (let i = currentIndex; i >= 0; i--) {
      const bp = breakpointOrder[i];
      if (span[bp] !== undefined) {
        return span[bp];
      }
    }
    
    return 1;
  };

  const spanValue = getSpanValue();
  
  return (
    <div 
      className={className}
      style={{ 
        gridColumn: spanValue ? `span ${spanValue}` : undefined 
      }}
    >
      {children}
    </div>
  );
}