/**
 * Navigation Loading States Component
 * Provides proper loading states during navigation with smooth transitions
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSkeleton } from '../../design-system/components/LoadingSkeleton';

interface NavigationLoadingStatesProps {
  showProgressBar?: boolean;
  showSkeletons?: boolean;
  minLoadingTime?: number;
  children: React.ReactNode;
}

interface LoadingState {
  isLoading: boolean;
  progress: number;
  route: string;
  startTime: number;
}

export const NavigationLoadingStates: React.FC<NavigationLoadingStatesProps> = ({
  showProgressBar = true,
  showSkeletons = true,
  minLoadingTime = 300,
  children
}) => {
  const router = useRouter();
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
    progress: 0,
    route: '',
    startTime: 0
  });

  // Handle route change start
  const handleRouteChangeStart = useCallback((url: string) => {
    // Don't show loading states for hash changes or same-page navigation
    if (url.startsWith('#') || url === router.asPath.split('#')[0]) {
      return;
    }

    setLoadingState({
      isLoading: true,
      progress: 0,
      route: url,
      startTime: Date.now()
    });

    // Simulate progress
    let progress = 0;
    const progressInterval = setInterval(() => {
      progress += Math.random() * 30;
      if (progress > 90) {
        progress = 90;
        clearInterval(progressInterval);
      }
      
      setLoadingState(prev => ({
        ...prev,
        progress
      }));
    }, 100);

    return () => clearInterval(progressInterval);
  }, [router.asPath]);

  // Handle route change complete
  const handleRouteChangeComplete = useCallback(() => {
    setLoadingState(prev => {
      const elapsed = Date.now() - prev.startTime;
      const remainingTime = Math.max(0, minLoadingTime - elapsed);

      // Ensure minimum loading time for smooth UX
      setTimeout(() => {
        setLoadingState(current => ({
          ...current,
          isLoading: false,
          progress: 100
        }));
      }, remainingTime);

      return {
        ...prev,
        progress: 100
      };
    });
  }, [minLoadingTime]);

  // Handle route change error
  const handleRouteChangeError = useCallback(() => {
    setLoadingState(prev => ({
      ...prev,
      isLoading: false,
      progress: 0
    }));
  }, []);

  // Setup router event listeners
  useEffect(() => {
    router.events.on('routeChangeStart', handleRouteChangeStart);
    router.events.on('routeChangeComplete', handleRouteChangeComplete);
    router.events.on('routeChangeError', handleRouteChangeError);

    return () => {
      router.events.off('routeChangeStart', handleRouteChangeStart);
      router.events.off('routeChangeComplete', handleRouteChangeComplete);
      router.events.off('routeChangeError', handleRouteChangeError);
    };
  }, [router.events, handleRouteChangeStart, handleRouteChangeComplete, handleRouteChangeError]);

  return (
    <>
      {/* Progress Bar */}
      <AnimatePresence>
        {showProgressBar && loadingState.isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-50"
          >
            <div className="h-1 bg-gray-200 dark:bg-gray-700">
              <motion.div
                className="h-full bg-gradient-to-r from-blue-500 to-purple-500"
                initial={{ width: 0 }}
                animate={{ width: `${loadingState.progress}%` }}
                transition={{ duration: 0.3, ease: 'easeOut' as any }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading Overlay for Marketplace Routes */}
      <AnimatePresence>
        {showSkeletons && loadingState.isLoading && loadingState.route.includes('/marketplace') && (
          <NavigationSkeletonOverlay route={loadingState.route} />
        )}
      </AnimatePresence>

      {/* Main Content */}
      <motion.div
        animate={{
          opacity: loadingState.isLoading ? 0.7 : 1,
          filter: loadingState.isLoading ? 'blur(1px)' : 'blur(0px)'
        }}
        transition={{ duration: 0.2 }}
      >
        {children}
      </motion.div>
    </>
  );
};

// Skeleton overlay for different marketplace routes
const NavigationSkeletonOverlay: React.FC<{ route: string }> = ({ route }) => {
  const getSkeletonContent = () => {
    if (route.includes('/marketplace/listing/')) {
      return <ProductDetailSkeleton />;
    } else if (route.includes('/marketplace/seller/store/')) {
      return <SellerStoreSkeleton />;
    } else if (route.includes('/marketplace')) {
      return <MarketplaceBrowseSkeleton />;
    }
    return <GenericSkeleton />;
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {getSkeletonContent()}
      </div>
    </motion.div>
  );
};

// Product detail page skeleton
const ProductDetailSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
    {/* Image Gallery Skeleton */}
    <div className="space-y-4">
      <LoadingSkeleton variant="image" height="400px" className="rounded-lg" />
      <div className="grid grid-cols-4 gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="image" height="80px" className="rounded" />
        ))}
      </div>
    </div>

    {/* Product Info Skeleton */}
    <div className="space-y-6">
      <div className="space-y-2">
        <LoadingSkeleton variant="text" width="60%" height="32px" />
        <LoadingSkeleton variant="text" width="40%" height="24px" />
      </div>
      
      <div className="space-y-2">
        <LoadingSkeleton variant="text" width="30%" height="40px" />
        <LoadingSkeleton variant="text" width="50%" height="20px" />
      </div>

      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <LoadingSkeleton key={i} variant="text" width="100%" height="16px" />
        ))}
      </div>

      <div className="flex gap-4">
        <LoadingSkeleton variant="button" width="150px" height="48px" />
        <LoadingSkeleton variant="button" width="150px" height="48px" />
      </div>
    </div>
  </div>
);

// Seller store page skeleton
const SellerStoreSkeleton: React.FC = () => (
  <div className="space-y-8">
    {/* Seller Header Skeleton */}
    <div className="bg-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-4">
        <LoadingSkeleton variant="avatar" width="80px" height="80px" />
        <div className="space-y-2">
          <LoadingSkeleton variant="text" width="200px" height="24px" />
          <LoadingSkeleton variant="text" width="150px" height="16px" />
          <LoadingSkeleton variant="text" width="100px" height="16px" />
        </div>
      </div>
    </div>

    {/* Products Grid Skeleton */}
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
      {Array.from({ length: 8 }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  </div>
);

// Marketplace browse skeleton
const MarketplaceBrowseSkeleton: React.FC = () => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
    {/* Sidebar Skeleton */}
    <aside className="lg:col-span-3 space-y-4">
      <div className="bg-white/10 rounded-2xl p-5 space-y-4">
        <LoadingSkeleton variant="text" width="60%" height="16px" />
        <LoadingSkeleton variant="text" height="40px" />
      </div>
      
      <div className="bg-white/10 rounded-2xl p-5 space-y-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <LoadingSkeleton variant="text" width="80%" height="16px" />
            <LoadingSkeleton variant="text" width="60%" height="14px" />
          </div>
        ))}
      </div>
    </aside>

    {/* Main Content Skeleton */}
    <section className="lg:col-span-9 space-y-6">
      {/* Controls Skeleton */}
      <div className="bg-white/10 rounded-2xl p-4 flex justify-between items-center">
        <div className="flex gap-3">
          <LoadingSkeleton variant="text" width="80px" height="24px" />
          <LoadingSkeleton variant="text" width="100px" height="24px" />
        </div>
        <div className="flex gap-3">
          <LoadingSkeleton variant="button" width="120px" height="32px" />
          <LoadingSkeleton variant="button" width="80px" height="32px" />
        </div>
      </div>

      {/* Products Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {Array.from({ length: 12 }).map((_, i) => (
          <ProductCardSkeleton key={i} />
        ))}
      </div>
    </section>
  </div>
);

// Product card skeleton
const ProductCardSkeleton: React.FC = () => (
  <div className="bg-white/10 rounded-2xl overflow-hidden">
    <LoadingSkeleton variant="image" height="200px" />
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <LoadingSkeleton variant="avatar" width="24px" height="24px" />
        <div className="flex gap-1">
          <LoadingSkeleton variant="text" width="20px" height="20px" />
          <LoadingSkeleton variant="text" width="20px" height="20px" />
        </div>
      </div>
      
      <LoadingSkeleton variant="text" width="100%" height="20px" />
      <LoadingSkeleton variant="text" width="80%" height="16px" />
      
      <div className="space-y-2">
        <LoadingSkeleton variant="text" width="60%" height="24px" />
        <LoadingSkeleton variant="text" width="40%" height="16px" />
      </div>
      
      <div className="flex gap-2">
        <LoadingSkeleton variant="button" width="100%" height="36px" />
        <LoadingSkeleton variant="button" width="100%" height="36px" />
      </div>
    </div>
  </div>
);

// Generic skeleton for unknown routes
const GenericSkeleton: React.FC = () => (
  <div className="space-y-6">
    <LoadingSkeleton variant="text" width="40%" height="32px" />
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <LoadingSkeleton key={i} variant="text" width="100%" height="16px" />
      ))}
    </div>
  </div>
);

// Hook for programmatic loading states
export const useNavigationLoading = () => {
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const startLoading = useCallback(() => {
    setIsLoading(true);
  }, []);

  const stopLoading = useCallback(() => {
    setIsLoading(false);
  }, []);

  const navigateWithLoading = useCallback(async (url: string) => {
    startLoading();
    try {
      await router.push(url);
    } finally {
      stopLoading();
    }
  }, [router, startLoading, stopLoading]);

  return {
    isLoading,
    startLoading,
    stopLoading,
    navigateWithLoading
  };
};

export default NavigationLoadingStates;