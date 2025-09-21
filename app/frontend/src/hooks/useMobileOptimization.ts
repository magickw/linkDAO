import { useState, useEffect, useCallback, useMemo } from 'react';
import { PanInfo } from 'framer-motion';

interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface SwipeHandlerOptions {
  onSwipeLeft?: (info: PanInfo) => void;
  onSwipeRight?: (info: PanInfo) => void;
  onSwipeUp?: (info: PanInfo) => void;
  onSwipeDown?: (info: PanInfo) => void;
  threshold?: number;
}

interface MobileOptimizationHook {
  isMobile: boolean;
  isTouch: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  screenSize: 'sm' | 'md' | 'lg' | 'xl';
  orientation: 'portrait' | 'landscape';
  safeAreaInsets: SafeAreaInsets;
  isKeyboardVisible: boolean;
  triggerHapticFeedback: (type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => void;
  createSwipeHandler: (options: SwipeHandlerOptions) => any;
  touchTargetClasses: string;
  mobileOptimizedClasses: string;
  getOptimalImageSize: (containerWidth: number) => { width: number; height: number };
  isReducedMotion: boolean;
  prefersHighContrast: boolean;
  devicePixelRatio: number;
}

export const useMobileOptimization = (): MobileOptimizationHook => {
  const [isMobile, setIsMobile] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const [screenSize, setScreenSize] = useState<'sm' | 'md' | 'lg' | 'xl'>('md');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [safeAreaInsets, setSafeAreaInsets] = useState<SafeAreaInsets>({
    top: 0,
    bottom: 0,
    left: 0,
    right: 0
  });
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isReducedMotion, setIsReducedMotion] = useState(false);
  const [prefersHighContrast, setPrefersHighContrast] = useState(false);

  // Device detection
  const isIOS = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPad|iPhone|iPod/.test(navigator.userAgent);
  }, []);

  const isAndroid = useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /Android/.test(navigator.userAgent);
  }, []);

  const devicePixelRatio = useMemo(() => {
    if (typeof window === 'undefined') return 1;
    return window.devicePixelRatio || 1;
  }, []);

  // Initialize device detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkDevice = () => {
      const userAgent = navigator.userAgent;
      const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      
      setIsMobile(isMobileDevice);
      setIsTouch(isTouchDevice);
    };

    checkDevice();
  }, []);

  // Screen size detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateScreenSize = () => {
      const width = window.innerWidth;
      if (width < 640) setScreenSize('sm');
      else if (width < 768) setScreenSize('md');
      else if (width < 1024) setScreenSize('lg');
      else setScreenSize('xl');
    };

    const updateOrientation = () => {
      setOrientation(window.innerHeight > window.innerWidth ? 'portrait' : 'landscape');
    };

    updateScreenSize();
    updateOrientation();

    window.addEventListener('resize', updateScreenSize);
    window.addEventListener('orientationchange', updateOrientation);

    return () => {
      window.removeEventListener('resize', updateScreenSize);
      window.removeEventListener('orientationchange', updateOrientation);
    };
  }, []);

  // Safe area insets detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const updateSafeAreaInsets = () => {
      const computedStyle = getComputedStyle(document.documentElement);
      
      setSafeAreaInsets({
        top: parseInt(computedStyle.getPropertyValue('--sat') || computedStyle.getPropertyValue('env(safe-area-inset-top)') || '0'),
        bottom: parseInt(computedStyle.getPropertyValue('--sab') || computedStyle.getPropertyValue('env(safe-area-inset-bottom)') || '0'),
        left: parseInt(computedStyle.getPropertyValue('--sal') || computedStyle.getPropertyValue('env(safe-area-inset-left)') || '0'),
        right: parseInt(computedStyle.getPropertyValue('--sar') || computedStyle.getPropertyValue('env(safe-area-inset-right)') || '0')
      });
    };

    updateSafeAreaInsets();

    // Fallback for iOS devices
    if (isIOS) {
      // Estimate safe areas for iOS devices
      const isIPhoneX = window.screen.height === 812 && window.screen.width === 375;
      const isIPhoneXR = window.screen.height === 896 && window.screen.width === 414;
      const isIPhoneXMax = window.screen.height === 896 && window.screen.width === 414;
      
      if (isIPhoneX || isIPhoneXR || isIPhoneXMax) {
        setSafeAreaInsets(prev => ({
          ...prev,
          top: Math.max(prev.top, 44),
          bottom: Math.max(prev.bottom, 34)
        }));
      }
    }

    window.addEventListener('resize', updateSafeAreaInsets);
    return () => window.removeEventListener('resize', updateSafeAreaInsets);
  }, [isIOS]);

  // Keyboard visibility detection
  useEffect(() => {
    if (typeof window === 'undefined' || !isMobile) return;

    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleViewportChange = () => {
      const currentHeight = window.visualViewport?.height || window.innerHeight;
      const heightDifference = initialViewportHeight - currentHeight;
      
      // Keyboard is considered visible if viewport height decreased by more than 150px
      setIsKeyboardVisible(heightDifference > 150);
    };

    if (window.visualViewport) {
      window.visualViewport.addEventListener('resize', handleViewportChange);
      return () => window.visualViewport?.removeEventListener('resize', handleViewportChange);
    } else {
      window.addEventListener('resize', handleViewportChange);
      return () => window.removeEventListener('resize', handleViewportChange);
    }
  }, [isMobile]);

  // Accessibility preferences
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const checkAccessibilityPreferences = () => {
      setIsReducedMotion(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
      setPrefersHighContrast(window.matchMedia('(prefers-contrast: high)').matches);
    };

    checkAccessibilityPreferences();

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const highContrastQuery = window.matchMedia('(prefers-contrast: high)');

    reducedMotionQuery.addEventListener('change', checkAccessibilityPreferences);
    highContrastQuery.addEventListener('change', checkAccessibilityPreferences);

    return () => {
      reducedMotionQuery.removeEventListener('change', checkAccessibilityPreferences);
      highContrastQuery.removeEventListener('change', checkAccessibilityPreferences);
    };
  }, []);

  // Haptic feedback
  const triggerHapticFeedback = useCallback((type: 'light' | 'medium' | 'heavy' | 'success' | 'warning' | 'error') => {
    if (typeof window === 'undefined' || !('vibrate' in navigator)) return;

    const patterns = {
      light: [10],
      medium: [20],
      heavy: [30],
      success: [10, 50, 10],
      warning: [20, 100, 20],
      error: [50, 100, 50]
    };

    try {
      navigator.vibrate(patterns[type]);
    } catch (error) {
      // Vibration not supported or failed
    }
  }, []);

  // Swipe handler creator
  const createSwipeHandler = useCallback((options: SwipeHandlerOptions) => {
    const { onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, threshold = 50 } = options;

    return {
      onPan: (event: any, info: PanInfo) => {
        const { offset, velocity } = info;
        const absOffsetX = Math.abs(offset.x);
        const absOffsetY = Math.abs(offset.y);

        // Determine if this is a horizontal or vertical swipe
        if (absOffsetX > absOffsetY) {
          // Horizontal swipe
          if (offset.x > threshold && onSwipeRight) {
            onSwipeRight(info);
          } else if (offset.x < -threshold && onSwipeLeft) {
            onSwipeLeft(info);
          }
        } else {
          // Vertical swipe
          if (offset.y > threshold && onSwipeDown) {
            onSwipeDown(info);
          } else if (offset.y < -threshold && onSwipeUp) {
            onSwipeUp(info);
          }
        }
      }
    };
  }, []);

  // Optimal image size calculator
  const getOptimalImageSize = useCallback((containerWidth: number) => {
    const pixelRatio = devicePixelRatio;
    const optimalWidth = Math.min(containerWidth * pixelRatio, 1200); // Cap at 1200px
    const optimalHeight = Math.round(optimalWidth * 0.75); // 4:3 aspect ratio

    return {
      width: optimalWidth,
      height: optimalHeight
    };
  }, [devicePixelRatio]);

  // CSS classes
  const touchTargetClasses = useMemo(() => {
    return isMobile ? 'min-h-[44px] min-w-[44px] touch-manipulation' : '';
  }, [isMobile]);

  const mobileOptimizedClasses = useMemo(() => {
    const classes = [];
    
    if (isMobile) {
      classes.push('mobile-optimized');
    }
    
    if (isTouch) {
      classes.push('touch-device');
    }
    
    if (isReducedMotion) {
      classes.push('reduce-motion');
    }
    
    if (prefersHighContrast) {
      classes.push('high-contrast');
    }

    classes.push(`screen-${screenSize}`);
    classes.push(`orientation-${orientation}`);
    
    return classes.join(' ');
  }, [isMobile, isTouch, isReducedMotion, prefersHighContrast, screenSize, orientation]);

  return {
    isMobile,
    isTouch,
    isIOS,
    isAndroid,
    screenSize,
    orientation,
    safeAreaInsets,
    isKeyboardVisible,
    triggerHapticFeedback,
    createSwipeHandler,
    touchTargetClasses,
    mobileOptimizedClasses,
    getOptimalImageSize,
    isReducedMotion,
    prefersHighContrast,
    devicePixelRatio
  };
};