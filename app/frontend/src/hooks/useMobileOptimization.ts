import { useState, useEffect } from 'react';

export interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'small' | 'medium' | 'large';
  touchSupported: boolean;
  devicePixelRatio: number;
}

export interface MobileOptimizationHook extends MobileOptimizationState {
  // Responsive breakpoints
  isMobileSmall: boolean;
  isMobileMedium: boolean;
  isMobileLarge: boolean;
  
  // Utility functions
  getOptimalImageSize: () => { width: number; height: number };
  shouldUseCompactLayout: () => boolean;
  getOptimalFontSize: (baseSize: number) => number;
}

export const useMobileOptimization = (): MobileOptimizationHook => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isTablet: false,
    orientation: 'portrait',
    screenSize: 'large',
    touchSupported: false,
    devicePixelRatio: 1,
  });

  useEffect(() => {
    const updateMobileState = () => {
      const width = window.innerWidth;
      const height = window.innerHeight;
      const isMobile = width < 768;
      const isTablet = width >= 768 && width < 1024;
      const orientation = height > width ? 'portrait' : 'landscape';
      const touchSupported = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const devicePixelRatio = window.devicePixelRatio || 1;

      let screenSize: 'small' | 'medium' | 'large' = 'large';
      if (width < 480) {
        screenSize = 'small';
      } else if (width < 768) {
        screenSize = 'medium';
      }

      setState({
        isMobile,
        isTablet,
        orientation,
        screenSize,
        touchSupported,
        devicePixelRatio,
      });
    };

    // Initial check
    updateMobileState();

    // Event listeners
    window.addEventListener('resize', updateMobileState);
    window.addEventListener('orientationchange', updateMobileState);

    // Cleanup
    return () => {
      window.removeEventListener('resize', updateMobileState);
      window.removeEventListener('orientationchange', updateMobileState);
    };
  }, []);

  // Derived values
  const isMobileSmall = state.screenSize === 'small';
  const isMobileMedium = state.screenSize === 'medium';
  const isMobileLarge = state.isMobile && state.screenSize === 'large';

  // Utility functions
  const getOptimalImageSize = () => {
    const baseWidth = state.isMobile ? 300 : 400;
    const baseHeight = state.isMobile ? 200 : 300;
    
    return {
      width: Math.floor(baseWidth * state.devicePixelRatio),
      height: Math.floor(baseHeight * state.devicePixelRatio),
    };
  };

  const shouldUseCompactLayout = () => {
    return state.isMobile || (state.isTablet && state.orientation === 'portrait');
  };

  const getOptimalFontSize = (baseSize: number) => {
    if (state.screenSize === 'small') {
      return Math.max(baseSize * 0.9, 14); // Minimum 14px for readability
    }
    if (state.screenSize === 'medium') {
      return baseSize * 0.95;
    }
    return baseSize;
  };

  return {
    ...state,
    isMobileSmall,
    isMobileMedium,
    isMobileLarge,
    getOptimalImageSize,
    shouldUseCompactLayout,
    getOptimalFontSize,
  };
};

export default useMobileOptimization;