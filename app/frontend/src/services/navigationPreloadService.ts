/**
 * Navigation Preload Service
 * Implements resource preloading for faster page transitions in marketplace navigation
 */

import { marketplaceService } from './marketplaceService';

interface PreloadConfig {
  enabled: boolean;
  hoverDelay: number;
  maxConcurrentPreloads: number;
  cacheTimeout: number;
  preloadImages: boolean;
  preloadData: boolean;
}

interface PreloadCache {
  [key: string]: {
    data: any;
    timestamp: number;
    expiry: number;
  };
}

class NavigationPreloadService {
  private config: PreloadConfig = {
    enabled: true,
    hoverDelay: 150, // ms
    maxConcurrentPreloads: 3,
    cacheTimeout: 5 * 60 * 1000, // 5 minutes
    preloadImages: true,
    preloadData: true
  };

  private cache: PreloadCache = {};
  private activePreloads = new Set<string>();
  private preloadQueue: Array<() => Promise<void>> = [];
  private isProcessingQueue = false;

  /**
   * Initialize preload service with hover listeners
   */
  initialize(): void {
    if (!this.config.enabled) return;

    this.setupHoverListeners();
    this.setupIntersectionObserver();
    this.preloadCriticalResources();
  }

  /**
   * Setup hover listeners for link preloading
   */
  private setupHoverListeners(): void {
    let hoverTimeout: NodeJS.Timeout;

    document.addEventListener('mouseenter', (event) => {
      // Check if event target is a valid Element before using .closest()
      if (!(event.target instanceof Element)) return;

      const target = event.target as HTMLElement;
      const link = target.closest('a[href], [data-preload]') as HTMLElement;

      if (!link) return;

      const href = link.getAttribute('href') || link.getAttribute('data-preload');
      if (!href) return;

      // Clear any existing timeout
      clearTimeout(hoverTimeout);

      // Set new timeout for preloading
      hoverTimeout = setTimeout(() => {
        this.preloadRoute(href);
      }, this.config.hoverDelay);

      // Clear timeout on mouse leave
      const handleMouseLeave = () => {
        clearTimeout(hoverTimeout);
        link.removeEventListener('mouseleave', handleMouseLeave);
      };
      link.addEventListener('mouseleave', handleMouseLeave, { once: true });
    }, true);
  }

  /**
   * Setup intersection observer for visible links
   */
  private setupIntersectionObserver(): void {
    if (!('IntersectionObserver' in window)) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const element = entry.target as HTMLElement;
            const href = element.getAttribute('href') || element.getAttribute('data-preload');
            
            if (href) {
              // Preload with lower priority for visible links
              setTimeout(() => {
                this.preloadRoute(href, 'low');
              }, 1000);
            }
          }
        });
      },
      {
        rootMargin: '50px',
        threshold: 0.1
      }
    );

    // Observe all marketplace links
    const observeLinks = () => {
      const links = document.querySelectorAll('a[href*="/marketplace"], [data-preload*="/marketplace"]');
      links.forEach(link => observer.observe(link));
    };

    // Initial observation
    observeLinks();

    // Re-observe when DOM changes
    const mutationObserver = new MutationObserver(() => {
      observeLinks();
    });

    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /**
   * Preload critical marketplace resources
   */
  private async preloadCriticalResources(): Promise<void> {
    const criticalRoutes = [
      '/marketplace',
      '/marketplace/cart',
      '/marketplace/checkout'
    ];

    for (const route of criticalRoutes) {
      await this.preloadRoute(route, 'high');
    }
  }

  /**
   * Preload resources for a specific route
   */
  async preloadRoute(href: string, priority: 'high' | 'medium' | 'low' = 'medium'): Promise<void> {
    if (!this.config.enabled || this.activePreloads.has(href)) return;

    // Check cache first
    const cached = this.getCachedData(href);
    if (cached) return;

    // Add to queue based on priority
    const preloadTask = () => this.executePreload(href);

    if (priority === 'high') {
      // Execute immediately for high priority
      await preloadTask();
    } else {
      // Add to queue for medium/low priority
      this.preloadQueue.push(preloadTask);
      this.processQueue();
    }
  }

  /**
   * Execute the actual preload operation
   */
  private async executePreload(href: string): Promise<void> {
    if (this.activePreloads.size >= this.config.maxConcurrentPreloads) {
      return;
    }

    this.activePreloads.add(href);

    try {
      const routeData = this.parseRoute(href);
      
      if (routeData.type === 'product' && routeData.id) {
        await this.preloadProductData(routeData.id);
      } else if (routeData.type === 'seller' && routeData.id) {
        await this.preloadSellerData(routeData.id);
      } else if (routeData.type === 'marketplace') {
        await this.preloadMarketplaceData(routeData.filters);
      }

      // Cache the successful preload
      this.setCachedData(href, { preloaded: true });

    } catch (error) {
      console.debug('Preload failed for:', href, error);
    } finally {
      this.activePreloads.delete(href);
    }
  }

  /**
   * Process the preload queue
   */
  private async processQueue(): Promise<void> {
    if (this.isProcessingQueue || this.preloadQueue.length === 0) return;

    this.isProcessingQueue = true;

    while (this.preloadQueue.length > 0 && this.activePreloads.size < this.config.maxConcurrentPreloads) {
      const task = this.preloadQueue.shift();
      if (task) {
        task().catch(error => {
          console.debug('Queue task failed:', error);
        });
      }
    }

    this.isProcessingQueue = false;

    // Continue processing if there are more items
    if (this.preloadQueue.length > 0) {
      setTimeout(() => this.processQueue(), 100);
    }
  }

  /**
   * Parse route to determine what to preload
   */
  private parseRoute(href: string): { type: string; id?: string; filters?: any } {
    // Product detail page
    const productMatch = href.match(/\/marketplace\/listing\/([^/?]+)/);
    if (productMatch) {
      return { type: 'product', id: productMatch[1] };
    }

    // Seller store page
    const sellerMatch = href.match(/\/marketplace\/seller\/store\/([^/?]+)/);
    if (sellerMatch) {
      return { type: 'seller', id: sellerMatch[1] };
    }

    // Marketplace browse with filters
    const marketplaceMatch = href.match(/\/marketplace/);
    if (marketplaceMatch) {
      const url = new URL(href, window.location.origin);
      const filters = Object.fromEntries(url.searchParams.entries());
      return { type: 'marketplace', filters };
    }

    return { type: 'unknown' };
  }

  /**
   * Preload product data and images
   */
  private async preloadProductData(productId: string): Promise<void> {
    if (!this.config.preloadData) return;

    try {
      // Preload product details
      const product = await marketplaceService.getListingById(productId);
      
      if (product && this.config.preloadImages) {
        // Preload product images
        const imagePromises = (product as any).images?.slice(0, 3).map((imageUrl: string) => 
          this.preloadImage(imageUrl)
        ) || [];
        
        await Promise.allSettled(imagePromises);
      }
    } catch (error) {
      console.debug('Failed to preload product data:', productId, error);
    }
  }

  /**
   * Preload seller data and store images
   */
  private async preloadSellerData(sellerId: string): Promise<void> {
    if (!this.config.preloadData) return;

    try {
      // Preload seller profile
      const seller = await marketplaceService.getSellerById(sellerId);
      
      if (seller && this.config.preloadImages) {
        // Preload seller avatar/cover images
        const imagePromises = [
          seller.profileImageUrl && this.preloadImage(seller.profileImageUrl)
        ].filter(Boolean);
        
        await Promise.allSettled(imagePromises);

        // Preload seller's products (first page)
        await marketplaceService.getProducts({
          seller: seller.id,
          limit: 12
        });
      }
    } catch (error) {
      console.debug('Failed to preload seller data:', sellerId, error);
    }
  }

  /**
   * Preload marketplace data
   */
  private async preloadMarketplaceData(filters: any = {}): Promise<void> {
    if (!this.config.preloadData) return;

    try {
      // Preload marketplace listings
      await marketplaceService.getProducts({
        ...filters,
        limit: 24
      });

      // Preload categories if not filtered
      if (!filters.category) {
        await marketplaceService.getCategories();
      }
    } catch (error) {
      console.debug('Failed to preload marketplace data:', error);
    }
  }

  /**
   * Preload image with caching
   */
  private async preloadImage(imageUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      
      img.onload = () => resolve();
      img.onerror = () => reject(new Error(`Failed to load image: ${imageUrl}`));
      
      // Set a timeout to avoid hanging
      setTimeout(() => reject(new Error('Image load timeout')), 5000);
      
      img.src = imageUrl;
    });
  }

  /**
   * Cache management
   */
  private getCachedData(key: string): any {
    const cached = this.cache[key];
    if (cached && Date.now() < cached.expiry) {
      return cached.data;
    }
    
    if (cached) {
      delete this.cache[key];
    }
    
    return null;
  }

  private setCachedData(key: string, data: any): void {
    this.cache[key] = {
      data,
      timestamp: Date.now(),
      expiry: Date.now() + this.config.cacheTimeout
    };
  }

  /**
   * Clear expired cache entries
   */
  private clearExpiredCache(): void {
    const now = Date.now();
    Object.keys(this.cache).forEach(key => {
      if (this.cache[key].expiry < now) {
        delete this.cache[key];
      }
    });
  }

  /**
   * Public API
   */

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<PreloadConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Manually preload a route
   */
  async manualPreload(href: string): Promise<void> {
    await this.preloadRoute(href, 'high');
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache = {};
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[]; hitRate: number } {
    const keys = Object.keys(this.cache);
    return {
      size: keys.length,
      keys,
      hitRate: 0 // Would need to track hits/misses for accurate rate
    };
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.clearCache();
    this.activePreloads.clear();
    this.preloadQueue.length = 0;
  }
}

// Export singleton instance
export const navigationPreloadService = new NavigationPreloadService();
export default navigationPreloadService;