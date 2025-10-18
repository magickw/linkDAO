/**
 * Marketplace Resource Preloader
 * Implements resource preloading for faster page transitions
 */

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/router';
import { enhancedMarketplaceService } from '@/services/enhancedMarketplaceService';

interface PreloadConfig {
  preloadCategories: boolean;
  preloadFeaturedProducts: boolean;
  preloadOnHover: boolean;
  preloadDelay: number;
}

const defaultConfig: PreloadConfig = {
  preloadCategories: true,
  preloadFeaturedProducts: true,
  preloadOnHover: true,
  preloadDelay: 100 // ms
};

export const MarketplacePreloader: React.FC<{
  config?: Partial<PreloadConfig>;
}> = ({ config = {} }) => {
  const router = useRouter();
  const finalConfig = { ...defaultConfig, ...config };

  // Preload critical marketplace data
  const preloadCriticalData = useCallback(async () => {
    try {
      const promises = [];

      if (finalConfig.preloadCategories) {
        promises.push(enhancedMarketplaceService.preloadCriticalData());
      }

      await Promise.allSettled(promises);
    } catch (error) {
      console.warn('Failed to preload critical marketplace data:', error);
    }
  }, [finalConfig]);

  // Preload product details on hover
  const preloadProductDetails = useCallback((productId: string) => {
    if (!finalConfig.preloadOnHover) return;

    const timeoutId = setTimeout(async () => {
      try {
        await enhancedMarketplaceService.getListingById(productId);
      } catch (error) {
        // Silently fail - this is just preloading
        console.debug('Preload failed for product:', productId);
      }
    }, finalConfig.preloadDelay);

    return () => clearTimeout(timeoutId);
  }, [finalConfig]);

  // Preload seller store on hover
  const preloadSellerStore = useCallback((sellerId: string) => {
    if (!finalConfig.preloadOnHover) return;

    const timeoutId = setTimeout(async () => {
      try {
        await enhancedMarketplaceService.getSellerById(sellerId);
      } catch (error) {
        // Silently fail - this is just preloading
        console.debug('Preload failed for seller:', sellerId);
      }
    }, finalConfig.preloadDelay);

    return () => clearTimeout(timeoutId);
  }, [finalConfig]);

  // Set up hover preloading listeners
  useEffect(() => {
    if (!finalConfig.preloadOnHover) return;

    const handleMouseEnter = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      const link = target.closest('a[href]') as HTMLAnchorElement;
      
      if (!link) return;

      const href = link.getAttribute('href');
      if (!href) return;

      // Preload product details
      const productMatch = href.match(/\/marketplace\/listing\/([^/?]+)/);
      if (productMatch) {
        const cleanup = preloadProductDetails(productMatch[1]);
        const handleMouseLeave = () => {
          cleanup?.();
          link.removeEventListener('mouseleave', handleMouseLeave);
        };
        link.addEventListener('mouseleave', handleMouseLeave, { once: true });
        return;
      }

      // Preload seller store
      const sellerMatch = href.match(/\/marketplace\/seller\/store\/([^/?]+)/);
      if (sellerMatch) {
        const cleanup = preloadSellerStore(sellerMatch[1]);
        const handleMouseLeave = () => {
          cleanup?.();
          link.removeEventListener('mouseleave', handleMouseLeave);
        };
        link.addEventListener('mouseleave', handleMouseLeave, { once: true });
        return;
      }
    };

    document.addEventListener('mouseenter', handleMouseEnter, true);

    return () => {
      document.removeEventListener('mouseenter', handleMouseEnter, true);
    };
  }, [finalConfig.preloadOnHover, preloadProductDetails, preloadSellerStore]);

  // Preload critical data on mount
  useEffect(() => {
    preloadCriticalData();
  }, [preloadCriticalData]);

  // Preload route data when router is ready
  useEffect(() => {
    if (!router.isReady) return;

    const currentPath = router.asPath;

    // Preload related data based on current route
    if (currentPath.includes('/marketplace')) {
      preloadCriticalData();
    }
  }, [router.isReady, router.asPath, preloadCriticalData]);

  return null; // This component doesn't render anything
};

// Hook for manual preloading
export const useMarketplacePreloader = () => {
  const preloadProduct = useCallback(async (productId: string) => {
    try {
      await enhancedMarketplaceService.getListingById(productId);
    } catch (error) {
      console.debug('Manual preload failed for product:', productId);
    }
  }, []);

  const preloadSeller = useCallback(async (sellerId: string) => {
    try {
      await enhancedMarketplaceService.getSellerById(sellerId);
    } catch (error) {
      console.debug('Manual preload failed for seller:', sellerId);
    }
  }, []);

  const preloadProducts = useCallback(async (filters?: any) => {
    try {
      await enhancedMarketplaceService.getProducts(filters);
    } catch (error) {
      console.debug('Manual preload failed for products');
    }
  }, []);

  return {
    preloadProduct,
    preloadSeller,
    preloadProducts
  };
};

export default MarketplacePreloader;