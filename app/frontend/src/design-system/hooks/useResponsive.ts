/**
 * useResponsive Hook - Mobile-first responsive design utilities
 * Provides breakpoint detection and responsive state management
 */

import { useState, useEffect } from 'react';
import { designTokens, BreakpointVariant } from '../tokens';

interface ResponsiveState {
  /** Current breakpoint */
  breakpoint: BreakpointVariant;
  /** Screen width in pixels */
  width: number;
  /** Screen height in pixels */
  height: number;
  /** Is mobile device */
  isMobile: boolean;
  /** Is tablet device */
  isTablet: boolean;
  /** Is desktop device */
  isDesktop: boolean;
  /** Is touch device */
  isTouch: boolean;
  /** Device orientation */
  orientation: 'portrait' | 'landscape';
}

export const useResponsive = (): ResponsiveState => {
  const [state, setState] = useState<ResponsiveState>(() => {
    // Default state for SSR
    if (typeof window === 'undefined') {
      return {
        breakpoint: 'lg' as BreakpointVariant,
        width: 1024,
        height: 768,
        isMobile: false,
        isTablet: false,
        isDesktop: true,
        isTouch: false,
        orientation: 'landscape',
      };
    }

    return getResponsiveState();
  });

  function getResponsiveState(): ResponsiveState {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    // Determine breakpoint
    let breakpoint: BreakpointVariant = 'xs';
    if (width >= parseInt(designTokens.breakpoints['2xl'])) {
      breakpoint = '2xl';
    } else if (width >= parseInt(designTokens.breakpoints.xl)) {
      breakpoint = 'xl';
    } else if (width >= parseInt(designTokens.breakpoints.lg)) {
      breakpoint = 'lg';
    } else if (width >= parseInt(designTokens.breakpoints.md)) {
      breakpoint = 'md';
    } else if (width >= parseInt(designTokens.breakpoints.sm)) {
      breakpoint = 'sm';
    }

    // Device type detection
    const isMobile = width < parseInt(designTokens.breakpoints.md);
    const isTablet = width >= parseInt(designTokens.breakpoints.md) && width < parseInt(designTokens.breakpoints.lg);
    const isDesktop = width >= parseInt(designTokens.breakpoints.lg);
    
    // Touch detection
    const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    
    // Orientation
    const orientation = height > width ? 'portrait' : 'landscape';

    return {
      breakpoint,
      width,
      height,
      isMobile,
      isTablet,
      isDesktop,
      isTouch,
      orientation,
    };
  }

  useEffect(() => {
    const handleResize = () => {
      setState(getResponsiveState());
    };

    const handleOrientationChange = () => {
      // Delay to ensure dimensions are updated
      setTimeout(() => {
        setState(getResponsiveState());
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);

    // Initial state update
    setState(getResponsiveState());

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, []);

  return state;
};

// Utility hook for specific breakpoint checks
export const useBreakpoint = (breakpoint: BreakpointVariant): boolean => {
  const { width } = useResponsive();
  const breakpointValue = parseInt(designTokens.breakpoints[breakpoint]);
  
  return width >= breakpointValue;
};

// Utility hook for media queries
export const useMediaQuery = (query: string): boolean => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const mediaQuery = window.matchMedia(query);
    setMatches(mediaQuery.matches);

    const handleChange = (event: MediaQueryListEvent) => {
      setMatches(event.matches);
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [query]);

  return matches;
};

// Predefined media query hooks
export const useIsMobile = (): boolean => {
  return useMediaQuery(`(max-width: ${designTokens.breakpoints.md})`);
};

export const useIsTablet = (): boolean => {
  return useMediaQuery(
    `(min-width: ${designTokens.breakpoints.md}) and (max-width: ${designTokens.breakpoints.lg})`
  );
};

export const useIsDesktop = (): boolean => {
  return useMediaQuery(`(min-width: ${designTokens.breakpoints.lg})`);
};

export const useIsTouch = (): boolean => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  return isTouch;
};

// Responsive value hook - returns different values based on breakpoint
export const useResponsiveValue = <T>(values: {
  xs?: T;
  sm?: T;
  md?: T;
  lg?: T;
  xl?: T;
  '2xl'?: T;
}): T | undefined => {
  const { breakpoint } = useResponsive();
  
  // Find the appropriate value for current breakpoint
  const breakpointOrder: BreakpointVariant[] = ['xs', 'sm', 'md', 'lg', 'xl', '2xl'];
  const currentIndex = breakpointOrder.indexOf(breakpoint);
  
  // Look for the closest defined value, starting from current breakpoint and going down
  for (let i = currentIndex; i >= 0; i--) {
    const bp = breakpointOrder[i];
    if (values[bp] !== undefined) {
      return values[bp];
    }
  }
  
  return undefined;
};

// Grid columns hook - returns responsive column count
export const useResponsiveColumns = (config: {
  xs?: number;
  sm?: number;
  md?: number;
  lg?: number;
  xl?: number;
  '2xl'?: number;
}): number => {
  const columns = useResponsiveValue(config);
  return columns || 1;
};

// Spacing hook - returns responsive spacing values
export const useResponsiveSpacing = (config: {
  xs?: string;
  sm?: string;
  md?: string;
  lg?: string;
  xl?: string;
  '2xl'?: string;
}): string => {
  const spacing = useResponsiveValue(config);
  return spacing || designTokens.spacing.md;
};