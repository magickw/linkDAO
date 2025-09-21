import React from 'react';
import { useBreakpoints } from '@/hooks/useMediaQuery';

interface ResponsiveGridProps {
  children: React.ReactNode;
  className?: string;
  columns?: {
    mobile?: number;
    tablet?: number;
    desktop?: number;
    largeDesktop?: number;
  };
  gap?: string;
  minItemWidth?: string;
}

/**
 * Responsive grid component that adapts to different screen sizes
 */
export default function ResponsiveGrid({
  children,
  className = '',
  columns = {
    mobile: 1,
    tablet: 2,
    desktop: 3,
    largeDesktop: 4
  },
  gap = '1rem',
  minItemWidth = '250px'
}: ResponsiveGridProps) {
  const { isMobile, isTablet, isDesktop, isLargeDesktop } = useBreakpoints();

  const getGridColumns = () => {
    if (isMobile) return columns.mobile || 1;
    if (isTablet) return columns.tablet || 2;
    if (isLargeDesktop) return columns.largeDesktop || 4;
    if (isDesktop) return columns.desktop || 3;
    return columns.desktop || 3;
  };

  const gridColumns = getGridColumns();

  return (
    <div
      className={`responsive-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${gridColumns}, minmax(${minItemWidth}, 1fr))`,
        gap,
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Auto-fit responsive grid that automatically adjusts columns based on content
 */
export function AutoFitGrid({
  children,
  className = '',
  minItemWidth = '250px',
  gap = '1rem'
}: Omit<ResponsiveGridProps, 'columns'>) {
  return (
    <div
      className={`auto-fit-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fit, minmax(${minItemWidth}, 1fr))`,
        gap,
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}

/**
 * Auto-fill responsive grid that creates as many columns as possible
 */
export function AutoFillGrid({
  children,
  className = '',
  minItemWidth = '250px',
  gap = '1rem'
}: Omit<ResponsiveGridProps, 'columns'>) {
  return (
    <div
      className={`auto-fill-grid ${className}`}
      style={{
        display: 'grid',
        gridTemplateColumns: `repeat(auto-fill, minmax(${minItemWidth}, 1fr))`,
        gap,
        width: '100%'
      }}
    >
      {children}
    </div>
  );
}