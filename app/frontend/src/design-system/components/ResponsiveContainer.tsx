/**
 * ResponsiveContainer Component - Responsive container with breakpoints and adaptive layouts
 * Provides responsive behavior for different screen sizes
 */

import React from 'react';
import { designTokens } from '../tokens';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  maxWidth?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsivePadding?: {
    xs?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    sm?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    md?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    lg?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    xl?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  };
  centerContent?: boolean;
  fluid?: boolean;
}

const getPaddingClass = (padding: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl') => {
  switch (padding) {
    case 'none': return 'p-0';
    case 'xs': return 'p-1';
    case 'sm': return 'p-2';
    case 'md': return 'p-4';
    case 'lg': return 'p-6';
    case 'xl': return 'p-8';
    default: return 'p-4';
  }
};

const getMaxWidthClass = (maxWidth: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full') => {
  switch (maxWidth) {
    case 'xs': return 'max-w-xs';
    case 'sm': return 'max-w-sm';
    case 'md': return 'max-w-md';
    case 'lg': return 'max-w-lg';
    case 'xl': return 'max-w-xl';
    case '2xl': return 'max-w-2xl';
    case 'full': return 'max-w-full';
    default: return 'max-w-7xl';
  }
};

export const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  maxWidth = 'xl',
  padding = 'md',
  responsivePadding,
  centerContent = false,
  fluid = false,
}) => {
  // Base classes
  const baseClasses = [
    'mx-auto',
    centerContent ? 'flex flex-col items-center justify-center' : '',
    fluid ? '' : getMaxWidthClass(maxWidth),
    getPaddingClass(padding),
    className
  ].filter(Boolean).join(' ');

  // Responsive padding classes
  const responsivePaddingClasses = responsivePadding 
    ? Object.entries(responsivePadding)
        .map(([breakpoint, pad]) => `md:${getPaddingClass(pad)}`)
        .join(' ')
    : '';

  return (
    <div className={`${baseClasses} ${responsivePaddingClasses}`}>
      {children}
    </div>
  );
};

// Hook for responsive behavior
export const useResponsive = () => {
  const [isMobile, setIsMobile] = React.useState(false);
  const [isTablet, setIsTablet] = React.useState(false);
  const [isDesktop, setIsDesktop] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      setIsMobile(width < parseInt(designTokens.breakpoints.md));
      setIsTablet(width >= parseInt(designTokens.breakpoints.md) && width < parseInt(designTokens.breakpoints.lg));
      setIsDesktop(width >= parseInt(designTokens.breakpoints.lg));
    };

    // Initial check
    checkScreenSize();

    // Add event listener
    window.addEventListener('resize', checkScreenSize);

    // Cleanup
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return { isMobile, isTablet, isDesktop };
};

// Responsive Grid Component
interface ResponsiveGridProps {
  children: React.ReactNode;
  columns?: {
    xs?: number;
    sm?: number;
    md?: number;
    lg?: number;
    xl?: number;
  };
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const ResponsiveGrid: React.FC<ResponsiveGridProps> = ({
  children,
  columns = { xs: 1, sm: 2, md: 3, lg: 4, xl: 5 },
  gap = 'md',
  className = '',
}) => {
  const gapClass = `gap-${gap === 'xs' ? 1 : gap === 'sm' ? 2 : gap === 'md' ? 4 : gap === 'lg' ? 6 : 8}`;

  return (
    <div 
      className={`
        grid 
        grid-cols-${columns.xs || 1} 
        sm:grid-cols-${columns.sm || 2} 
        md:grid-cols-${columns.md || 3} 
        lg:grid-cols-${columns.lg || 4} 
        xl:grid-cols-${columns.xl || 5}
        ${gapClass}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

// Responsive Flex Component
interface ResponsiveFlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  gap?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  responsive?: {
    sm?: {
      direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
      wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
      justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
      align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    };
    md?: {
      direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
      wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
      justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
      align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    };
    lg?: {
      direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
      wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
      justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
      align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
    };
  };
}

export const ResponsiveFlex: React.FC<ResponsiveFlexProps> = ({
  children,
  direction = 'row',
  wrap = 'nowrap',
  justify = 'start',
  align = 'stretch',
  gap = 'md',
  className = '',
  responsive = {},
}) => {
  const gapClass = `gap-${gap === 'xs' ? 1 : gap === 'sm' ? 2 : gap === 'md' ? 4 : gap === 'lg' ? 6 : 8}`;
  
  const directionClass = `flex-${direction}`;
  const wrapClass = `flex-${wrap}`;
  const justifyClass = `justify-${justify}`;
  const alignClass = `items-${align}`;

  // Responsive classes
  const responsiveClasses = Object.entries(responsive)
    .map(([breakpoint, props]) => {
      const classes = [];
      if (props.direction) classes.push(`sm:flex-${props.direction}`);
      if (props.wrap) classes.push(`sm:flex-${props.wrap}`);
      if (props.justify) classes.push(`sm:justify-${props.justify}`);
      if (props.align) classes.push(`sm:items-${props.align}`);
      return classes.join(' ');
    })
    .join(' ');

  return (
    <div 
      className={`
        flex 
        ${directionClass}
        ${wrapClass}
        ${justifyClass}
        ${alignClass}
        ${gapClass}
        ${responsiveClasses}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export default ResponsiveContainer;