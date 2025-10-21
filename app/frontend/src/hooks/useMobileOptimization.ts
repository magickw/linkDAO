import { useState, useEffect } from 'react';

export interface MobileOptimizationState {
  isMobile: boolean;
  isTablet: boolean;
  orientation: 'portrait' | 'landscape';
  screenSize: 'small' | 'medium' | 'large';
  touchSupported: boolean;
  devicePixelRatio: number;
  isKeyboardVisible: boolean;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SwipeHandlerOptions {
  onSwipeLeft?: (info: any) => void;
  onSwipeRight?: (info: any) => void;
  onSwipeUp?: (info: any) => void;
  onSwipeDown?: (info: any) => void;
  threshold?: number;
}

export interface MobileOptimizationHook extends MobileOptimizationState {
  // Responsive breakpoints
  isMobileSmall: boolean;
  isMobileMedium: boolean;
  isMobileLarge: boolean;
  
  // Utility functions
  getOptimalImageSize: (containerWidth?: number) => { width: number; height: number };
  shouldUseCompactLayout: () => boolean;
  getOptimalFontSize: (baseSize: number) => number;
  
  // Haptic feedback
  triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  
  // Touch target enhancement
  touchTargetClasses: string;
  
  // Safe area insets for mobile devices
  safeAreaInsets: SafeAreaInsets;
  
  // Mobile optimized CSS classes
  mobileOptimizedClasses: string;
  
  // Swipe handler creator
  createSwipeHandler: (options: SwipeHandlerOptions) => any;
  
  // Touch detection
  isTouch: boolean;
}

export const useMobileOptimization = (): MobileOptimizationHook => {
  const [state, setState] = useState<MobileOptimizationState>({
    isMobile: false,
    isTablet: false,
    orientation: 'portrait',
    screenSize: 'large',
    touchSupported: false,
    devicePixelRatio: 1,
    isKeyboardVisible: false,
  });

  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
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

      setState(prev => ({
        ...prev,
        isMobile,
        isTablet,
        orientation,
        screenSize,
        touchSupported,
        devicePixelRatio,
      }));
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

  // Keyboard visibility detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateKeyboardVisibility = () => {
      const viewport = window.visualViewport;
      if (!viewport) return;

      const keyboardHeight = window.innerHeight - viewport.height;
      const isKeyboardVisible = keyboardHeight > 150; // Threshold for keyboard detection

      setState(prev => ({
        ...prev,
        isKeyboardVisible,
      }));
    };

    // Use visual viewport if available
    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', updateKeyboardVisibility);
      updateKeyboardVisibility(); // Initial check
      
      return () => {
        window.visualViewport?.removeEventListener('resize', updateKeyboardVisibility);
      };
    }

    // Fallback for older browsers
    const handleFocusIn = () => {
      setTimeout(() => {
        const activeElement = document.activeElement;
        if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
          setState(prev => ({ ...prev, isKeyboardVisible: true }));
        }
      }, 300);
    };

    const handleFocusOut = () => {
      setTimeout(() => {
        setState(prev => ({ ...prev, isKeyboardVisible: false }));
      }, 300);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
    };
  }, []);

  // Update safe area insets
  useEffect(() => {
    const updateSafeAreaInsets = () => {
      if (typeof window === 'undefined' || !window.CSS || !window.CSS.supports) return;

      try {
        const top = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-top)')) || 0;
        const bottom = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-bottom)')) || 0;
        const left = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-left)')) || 0;
        const right = parseInt(getComputedStyle(document.documentElement).getPropertyValue('env(safe-area-inset-right)')) || 0;

        setSafeAreaInsets({ top, bottom, left, right });
      } catch (e) {
        // Fallback to default values
        setSafeAreaInsets({ top: 0, bottom: 0, left: 0, right: 0 });
      }
    };

    updateSafeAreaInsets();

    // Listen for orientation changes which might affect safe areas
    window.addEventListener('orientationchange', updateSafeAreaInsets);
    
    return () => {
      window.removeEventListener('orientationchange', updateSafeAreaInsets);
    };
  }, []);

  // Derived values
  const isMobileSmall = state.screenSize === 'small';
  const isMobileMedium = state.screenSize === 'medium';
  const isMobileLarge = state.isMobile && state.screenSize === 'large';

  // Utility functions
  const getOptimalImageSize = (containerWidth?: number) => {
    // Use provided container width or default based on device type
    const baseWidth = containerWidth 
      ? Math.min(containerWidth, state.isMobile ? 300 : 400)
      : (state.isMobile ? 300 : 400);
      
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

  // Haptic feedback function
  const triggerHapticFeedback = (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (!('vibrate' in navigator)) {
      return;
    }

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [20, 10, 20],
      warning: [100, 50, 100],
      error: [150, 50, 150]
    };

    navigator.vibrate(patterns[type]);
  };

  // Touch target classes for WCAG compliance
  const touchTargetClasses = 'min-w-[44px] min-h-[44px] flex items-center justify-center';
  
  // Mobile optimized classes
  const mobileOptimizedClasses = 'touch-manipulation select-none';
  
  // Swipe handler creator
  const createSwipeHandler = (options: SwipeHandlerOptions) => {
    // This is a simplified implementation that would need to be expanded
    // with actual swipe detection logic in a real implementation
    const { threshold = 100, ...handlers } = options;
    
    return {
      // Placeholder for swipe handler implementation
      // In a real implementation, this would set up event listeners
      // and detect swipe gestures based on the provided handlers and threshold
    };
  };

  return {
    ...state,
    isMobileSmall,
    isMobileMedium,
    isMobileLarge,
    getOptimalImageSize,
    shouldUseCompactLayout,
    getOptimalFontSize,
    triggerHapticFeedback,
    touchTargetClasses,
    safeAreaInsets,
    mobileOptimizedClasses,
    createSwipeHandler,
    isTouch: state.touchSupported,
  };
};

export default useMobileOptimization;