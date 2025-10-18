/**
 * Lazy Loading System for Community Enhancements
 * Component lazy loading for non-critical features
 */

import React, { Suspense, lazy, useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// Loading skeleton components
const LoadingSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse ${className}`}>
    <div className="bg-gray-200 rounded h-4 w-3/4 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-1/2 mb-2"></div>
    <div className="bg-gray-200 rounded h-4 w-5/6"></div>
  </div>
);

const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
    <div className="flex items-center space-x-3 mb-3">
      <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
      <div className="flex-1">
        <div className="bg-gray-200 rounded h-4 w-1/3 mb-1"></div>
        <div className="bg-gray-200 rounded h-3 w-1/4"></div>
      </div>
    </div>
    <div className="space-y-2 mb-3">
      <div className="bg-gray-200 rounded h-4 w-full"></div>
      <div className="bg-gray-200 rounded h-4 w-4/5"></div>
      <div className="bg-gray-200 rounded h-4 w-3/5"></div>
    </div>
    <div className="flex items-center space-x-4 pt-3 border-t border-gray-100">
      <div className="bg-gray-200 rounded h-6 w-12"></div>
      <div className="bg-gray-200 rounded h-6 w-12"></div>
      <div className="bg-gray-200 rounded h-6 w-12"></div>
    </div>
  </div>
);

const WidgetSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`animate-pulse bg-white rounded-lg shadow-sm border border-gray-200 p-4 ${className}`}>
    <div className="bg-gray-200 rounded h-5 w-2/3 mb-3"></div>
    <div className="space-y-2">
      <div className="bg-gray-200 rounded h-3 w-full"></div>
      <div className="bg-gray-200 rounded h-3 w-4/5"></div>
      <div className="bg-gray-200 rounded h-3 w-3/5"></div>
    </div>
  </div>
);

// Lazy loaded components
const LazyGovernanceWidget = lazy(() => 
  import('../EnhancedRightSidebar/ExpandedGovernanceWidget').then(module => ({
    default: module.ExpandedGovernanceWidget
  }))
);

const LazyWalletActivityFeed = lazy(() => 
  import('../EnhancedRightSidebar/WalletActivityFeed').then(module => ({
    default: module.WalletActivityFeed
  }))
);

const LazySuggestedCommunitiesWidget = lazy(() => 
  import('../EnhancedRightSidebar/SuggestedCommunitiesWidget').then(module => ({
    default: module.SuggestedCommunitiesWidget
  }))
);

const LazyInlinePreviewSystem = lazy(() => 
  import('../EnhancedCentralFeed/InlinePreviewSystem/NFTPreviewCard').then(module => ({
    default: module.NFTPreviewCard
  }))
);

const LazyMiniProfileCard = lazy(() => 
  import('../SharedComponents/MiniProfileCard').then(module => ({
    default: module.MiniProfileCard
  }))
);

// Intersection Observer Hook for lazy loading
function useIntersectionObserver(
  elementRef: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [elementRef, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Lazy Component Wrapper
interface LazyComponentWrapperProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  loadOnMount?: boolean;
  loadOnIntersect?: boolean;
  className?: string;
  minHeight?: number;
  delay?: number;
}

export const LazyComponentWrapper: React.FC<LazyComponentWrapperProps> = ({
  children,
  fallback = <LoadingSkeleton />,
  loadOnMount = false,
  loadOnIntersect = true,
  className = '',
  minHeight = 100,
  delay = 0
}) => {
  const [shouldLoad, setShouldLoad] = useState(loadOnMount);
  const [isLoaded, setIsLoaded] = useState(false);
  const elementRef = useRef<HTMLDivElement>(null);
  const { hasIntersected } = useIntersectionObserver(elementRef);

  useEffect(() => {
    if (loadOnIntersect && hasIntersected && !shouldLoad) {
      if (delay > 0) {
        setTimeout(() => setShouldLoad(true), delay);
      } else {
        setShouldLoad(true);
      }
    }
  }, [hasIntersected, loadOnIntersect, shouldLoad, delay]);

  const handleLoad = useCallback(() => {
    setIsLoaded(true);
  }, []);

  return (
    <div 
      ref={elementRef}
      className={className}
      style={{ minHeight: `${minHeight}px` }}
    >
      <AnimatePresence mode="wait">
        {shouldLoad ? (
          <motion.div
            key="content"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onAnimationComplete={handleLoad}
          >
            <Suspense fallback={fallback}>
              {children}
            </Suspense>
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            {fallback}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Lazy Governance Widget
interface LazyGovernanceWidgetProps {
  activeProposals: any[];
  userVotingPower: number;
  onVoteClick: (proposalId: string) => void;
  showProgressBars?: boolean;
  className?: string;
}

export const LazyGovernanceWidgetWrapper: React.FC<LazyGovernanceWidgetProps> = (props) => (
  <LazyComponentWrapper
    fallback={<WidgetSkeleton className="h-64" />}
    loadOnIntersect={true}
    delay={100}
    className={props.className}
  >
    <LazyGovernanceWidget {...props} />
  </LazyComponentWrapper>
);

// Lazy Wallet Activity Feed
interface LazyWalletActivityFeedProps {
  activities: any[];
  maxItems?: number;
  showRealTimeUpdates?: boolean;
  onActivityClick?: (activity: any) => void;
  className?: string;
}

export const LazyWalletActivityFeedWrapper: React.FC<LazyWalletActivityFeedProps> = (props) => (
  <LazyComponentWrapper
    fallback={<WidgetSkeleton className="h-48" />}
    loadOnIntersect={true}
    delay={200}
    className={props.className}
  >
    <LazyWalletActivityFeed {...props} />
  </LazyComponentWrapper>
);

// Lazy Suggested Communities Widget
interface LazySuggestedCommunitiesWidgetProps {
  suggestions: any[];
  onJoinCommunity: (communityId: string) => void;
  onPreviewCommunity: (communityId: string) => void;
  className?: string;
}

export const LazySuggestedCommunitiesWidgetWrapper: React.FC<LazySuggestedCommunitiesWidgetProps> = (props) => (
  <LazyComponentWrapper
    fallback={<WidgetSkeleton className="h-56" />}
    loadOnIntersect={true}
    delay={300}
    className={props.className}
  >
    <LazySuggestedCommunitiesWidget {...props} />
  </LazyComponentWrapper>
);

// Lazy Mini Profile Card
interface LazyMiniProfileCardProps {
  userId: string;
  trigger: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  showWalletInfo?: boolean;
  showMutualConnections?: boolean;
  className?: string;
}

export const LazyMiniProfileCardWrapper: React.FC<LazyMiniProfileCardProps> = (props) => (
  <LazyComponentWrapper
    fallback={<div className="w-64 h-48 bg-gray-100 rounded-lg animate-pulse" />}
    loadOnMount={false}
    loadOnIntersect={false}
    className={props.className}
  >
    <LazyMiniProfileCard {...props} />
  </LazyComponentWrapper>
);

// Progressive Loading Manager
interface ProgressiveLoadingManagerProps {
  children: React.ReactNode[];
  loadingInterval?: number;
  className?: string;
}

export const ProgressiveLoadingManager: React.FC<ProgressiveLoadingManagerProps> = ({
  children,
  loadingInterval = 200,
  className = ''
}) => {
  const [loadedCount, setLoadedCount] = useState(1);

  useEffect(() => {
    if (loadedCount < children.length) {
      const timer = setTimeout(() => {
        setLoadedCount(prev => prev + 1);
      }, loadingInterval);

      return () => clearTimeout(timer);
    }
  }, [loadedCount, children.length, loadingInterval]);

  return (
    <div className={className}>
      <AnimatePresence>
        {children.slice(0, loadedCount).map((child, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ 
              duration: 0.3,
              delay: index * 0.1
            }}
          >
            {child}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

// Lazy Route Component
interface LazyRouteProps {
  component: React.LazyExoticComponent<React.ComponentType<any>>;
  fallback?: React.ReactNode;
  props?: any;
}

export const LazyRoute: React.FC<LazyRouteProps> = ({
  component: Component,
  fallback = <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>,
  props = {}
}) => (
  <Suspense fallback={fallback}>
    <Component {...props} />
  </Suspense>
);

// Code Splitting Hook
export function useCodeSplitting<T>(
  importFn: () => Promise<{ default: T }>,
  dependencies: any[] = []
) {
  const [component, setComponent] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const loadComponent = useCallback(async () => {
    if (component || isLoading) return component;

    setIsLoading(true);
    setError(null);

    try {
      const module = await importFn();
      setComponent(module.default);
      return module.default;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to load component');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [component, isLoading, importFn]);

  // Auto-load on dependency change
  useEffect(() => {
    if (dependencies.length > 0) {
      loadComponent();
    }
  }, dependencies);

  return {
    component,
    isLoading,
    error,
    loadComponent
  };
}

// Preload Hook for critical components
export function usePreloadComponents(
  components: Array<() => Promise<any>>,
  preloadDelay = 2000
) {
  const [preloadedComponents, setPreloadedComponents] = useState<Set<number>>(new Set());

  useEffect(() => {
    const timer = setTimeout(() => {
      components.forEach(async (importFn, index) => {
        if (!preloadedComponents.has(index)) {
          try {
            await importFn();
            setPreloadedComponents(prev => new Set(prev).add(index));
          } catch (error) {
            console.warn(`Failed to preload component ${index}:`, error);
          }
        }
      });
    }, preloadDelay);

    return () => clearTimeout(timer);
  }, [components, preloadDelay, preloadedComponents]);

  return {
    preloadedCount: preloadedComponents.size,
    totalComponents: components.length,
    isAllPreloaded: preloadedComponents.size === components.length
  };
}

// Bundle Size Monitor
export function useBundleMonitor() {
  const [bundleInfo, setBundleInfo] = useState({
    loadedChunks: 0,
    totalSize: 0,
    loadTime: 0
  });

  useEffect(() => {
    const startTime = performance.now();
    
    // Monitor script tags for chunk loading
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            if (element.tagName === 'SCRIPT' && element.getAttribute('src')?.includes('chunk')) {
              setBundleInfo(prev => ({
                ...prev,
                loadedChunks: prev.loadedChunks + 1,
                loadTime: performance.now() - startTime
              }));
            }
          }
        });
      });
    });

    observer.observe(document.head, {
      childList: true,
      subtree: true
    });

    return () => observer.disconnect();
  }, []);

  return bundleInfo;
}

// Performance-aware lazy loading
export function usePerformanceLazyLoading(threshold = 16) {
  const [canLoad, setCanLoad] = useState(true);
  const frameTimeRef = useRef<number[]>([]);

  useEffect(() => {
    let animationId: number;
    let lastTime = performance.now();

    const measurePerformance = (currentTime: number) => {
      const frameTime = currentTime - lastTime;
      frameTimeRef.current.push(frameTime);

      // Keep only last 10 frame times
      if (frameTimeRef.current.length > 10) {
        frameTimeRef.current.shift();
      }

      // Calculate average frame time
      const avgFrameTime = frameTimeRef.current.reduce((sum, time) => sum + time, 0) / frameTimeRef.current.length;
      
      // Disable lazy loading if performance is poor
      setCanLoad(avgFrameTime < threshold);

      lastTime = currentTime;
      animationId = requestAnimationFrame(measurePerformance);
    };

    animationId = requestAnimationFrame(measurePerformance);

    return () => cancelAnimationFrame(animationId);
  }, [threshold]);

  return canLoad;
}

export default {
  LazyComponentWrapper,
  LazyGovernanceWidgetWrapper,
  LazyWalletActivityFeedWrapper,
  LazySuggestedCommunitiesWidgetWrapper,
  LazyMiniProfileCardWrapper,
  ProgressiveLoadingManager,
  LazyRoute,
  useCodeSplitting,
  usePreloadComponents,
  useBundleMonitor,
  usePerformanceLazyLoading,
  LoadingSkeleton,
  CardSkeleton,
  WidgetSkeleton
};