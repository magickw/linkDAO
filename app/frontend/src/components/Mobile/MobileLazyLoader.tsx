import React, { Suspense, lazy, ComponentType, useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataSaving } from './MobileDataSavingMode';
import { useMobileOptimization } from '@/hooks/useMobileOptimization';

interface LazyComponentProps {
  fallback?: React.ComponentType;
  errorBoundary?: React.ComponentType<{ error: Error; retry: () => void }>;
  preload?: boolean;
  priority?: 'high' | 'medium' | 'low';
  timeout?: number;
  retryAttempts?: number;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

interface LazyLoadState {
  isLoading: boolean;
  hasError: boolean;
  error: Error | null;
  retryCount: number;
}

// Default loading component
const DefaultLoadingComponent: React.FC = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
  </div>
);

// Default error boundary component
const DefaultErrorBoundary: React.FC<{ error: Error; retry: () => void }> = ({ error, retry }) => (
  <div className="flex flex-col items-center justify-center p-8 text-center">
    <div className="text-red-500 mb-4">
      <svg className="w-12 h-12 mx-auto" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
      </svg>
    </div>
    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
      Failed to load component
    </h3>
    <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">
      {error.message}
    </p>
    <button
      onClick={retry}
      className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
    >
      Try Again
    </button>
  </div>
);

// Skeleton loading components for different content types
export const SkeletonLoaders = {
  PostCard: () => (
    <div className="animate-pulse p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <div className="flex-1">
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-1" />
          <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/6" />
        </div>
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
      </div>
      <div className="h-32 bg-gray-300 dark:bg-gray-600 rounded mb-3" />
      <div className="flex space-x-4">
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
        <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-16" />
      </div>
    </div>
  ),

  CommentThread: () => (
    <div className="animate-pulse space-y-3">
      {[...Array(3)].map((_, i) => (
        <div key={i} className="flex space-x-3" style={{ marginLeft: `${i * 20}px` }}>
          <div className="w-6 h-6 bg-gray-300 dark:bg-gray-600 rounded-full flex-shrink-0" />
          <div className="flex-1">
            <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-1/4 mb-2" />
            <div className="space-y-1">
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-full" />
              <div className="h-3 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
            </div>
          </div>
        </div>
      ))}
    </div>
  ),

  UserProfile: () => (
    <div className="animate-pulse">
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-20 h-20 bg-gray-300 dark:bg-gray-600 rounded-full" />
        <div className="flex-1">
          <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-2" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2 mb-2" />
          <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4" />
        </div>
      </div>
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="text-center">
            <div className="h-8 bg-gray-300 dark:bg-gray-600 rounded w-full mb-1" />
            <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  ),

  Feed: () => (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <SkeletonLoaders.PostCard key={i} />
      ))}
    </div>
  ),

  Modal: () => (
    <div className="animate-pulse p-6">
      <div className="h-6 bg-gray-300 dark:bg-gray-600 rounded w-1/3 mb-4" />
      <div className="space-y-3 mb-6">
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-full" />
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4" />
        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2" />
      </div>
      <div className="flex space-x-3">
        <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20" />
        <div className="h-10 bg-gray-300 dark:bg-gray-600 rounded w-20" />
      </div>
    </div>
  )
};

// Enhanced lazy loading wrapper
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
): React.FC<React.ComponentProps<T> & { lazyProps?: LazyComponentProps }> {
  const LazyComponent = lazy(importFn);

  return function LazyWrapper(props) {
    const { lazyProps = {}, ...componentProps } = props;
    const mergedOptions = { ...options, ...lazyProps };
    
    const {
      fallback: FallbackComponent = DefaultLoadingComponent,
      errorBoundary: ErrorBoundaryComponent = DefaultErrorBoundary,
      preload = false,
      priority = 'medium',
      timeout = 10000,
      retryAttempts = 3,
      onLoad,
      onError
    } = mergedOptions;

    const { shouldPreload, isLowBandwidth } = useDataSaving();
    const { isMobile } = useMobileOptimization();
    
    const [state, setState] = useState<LazyLoadState>({
      isLoading: true,
      hasError: false,
      error: null,
      retryCount: 0
    });

    const timeoutRef = useRef<NodeJS.Timeout>();
    const mountedRef = useRef(true);

    // Preload logic
    useEffect(() => {
      if (preload && shouldPreload('data') && priority === 'high') {
        importFn().catch(() => {
          // Preload failed, but don't show error yet
        });
      }
    }, [preload, shouldPreload, priority]);

    // Timeout handling
    useEffect(() => {
      if (state.isLoading && timeout > 0) {
        timeoutRef.current = setTimeout(() => {
          if (mountedRef.current) {
            const timeoutError = new Error(`Component loading timed out after ${timeout}ms`);
            setState(prev => ({
              ...prev,
              hasError: true,
              error: timeoutError,
              isLoading: false
            }));
            onError?.(timeoutError);
          }
        }, timeout);
      }

      return () => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      };
    }, [state.isLoading, timeout, onError]);

    // Cleanup on unmount
    useEffect(() => {
      return () => {
        mountedRef.current = false;
      };
    }, []);

    const handleRetry = () => {
      if (state.retryCount < retryAttempts) {
        setState(prev => ({
          ...prev,
          isLoading: true,
          hasError: false,
          error: null,
          retryCount: prev.retryCount + 1
        }));
      }
    };

    const handleLoad = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setState(prev => ({ ...prev, isLoading: false }));
      onLoad?.();
    };

    const handleError = (error: Error) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setState(prev => ({
        ...prev,
        hasError: true,
        error,
        isLoading: false
      }));
      onError?.(error);
    };

    if (state.hasError) {
      return (
        <ErrorBoundaryComponent 
          error={state.error!} 
          retry={state.retryCount < retryAttempts ? handleRetry : () => {}} 
        />
      );
    }

    return (
      <Suspense
        fallback={
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FallbackComponent />
          </motion.div>
        }
      >
        <LazyComponent 
          {...(componentProps as any)}
        />
      </Suspense>
    );
  };
}

// Bundle splitting utilities
export const MobileBundleSplitter = {
  // Split by route
  createRouteComponent: (importFn: () => Promise<any>) => 
    createLazyComponent(importFn, {
      fallback: SkeletonLoaders.Feed,
      priority: 'high',
      preload: true
    }),

  // Split by feature
  createFeatureComponent: (importFn: () => Promise<any>) =>
    createLazyComponent(importFn, {
      fallback: DefaultLoadingComponent,
      priority: 'medium'
    }),

  // Split by modal/dialog
  createModalComponent: (importFn: () => Promise<any>) =>
    createLazyComponent(importFn, {
      fallback: SkeletonLoaders.Modal,
      priority: 'low',
      timeout: 5000
    }),

  // Split by heavy components
  createHeavyComponent: (importFn: () => Promise<any>) =>
    createLazyComponent(importFn, {
      fallback: DefaultLoadingComponent,
      priority: 'low',
      preload: false,
      timeout: 15000
    })
};

// Intersection Observer based lazy loader
interface IntersectionLazyLoaderProps {
  children: React.ReactNode;
  fallback?: React.ComponentType;
  rootMargin?: string;
  threshold?: number;
  triggerOnce?: boolean;
  className?: string;
}

export const IntersectionLazyLoader: React.FC<IntersectionLazyLoaderProps> = ({
  children,
  fallback: FallbackComponent = DefaultLoadingComponent,
  rootMargin = '100px',
  threshold = 0.1,
  triggerOnce = true,
  className = ''
}) => {
  const [isInView, setIsInView] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          if (triggerOnce) {
            observer.disconnect();
          }
        } else if (!triggerOnce) {
          setIsInView(false);
        }
      },
      {
        rootMargin,
        threshold
      }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, [rootMargin, threshold, triggerOnce]);

  return (
    <div ref={ref} className={className}>
      <AnimatePresence mode="wait">
        {isInView ? (
          <motion.div
            key="content"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        ) : (
          <motion.div
            key="fallback"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <FallbackComponent />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// Hook for managing lazy loading state
export const useLazyLoading = () => {
  const { shouldPreload, isLowBandwidth } = useDataSaving();
  const { isMobile } = useMobileOptimization();
  
  const [loadedComponents, setLoadedComponents] = useState<Set<string>>(new Set());
  
  const markAsLoaded = (componentId: string) => {
    setLoadedComponents(prev => new Set([...prev, componentId]));
  };
  
  const isLoaded = (componentId: string) => {
    return loadedComponents.has(componentId);
  };
  
  const shouldLazyLoad = (priority: 'high' | 'medium' | 'low') => {
    if (!isMobile) return false;
    if (priority === 'high') return false;
    if (isLowBandwidth && priority === 'medium') return true;
    return true;
  };
  
  return {
    markAsLoaded,
    isLoaded,
    shouldLazyLoad,
    loadedCount: loadedComponents.size,
    clearLoaded: () => setLoadedComponents(new Set())
  };
};

export default createLazyComponent;