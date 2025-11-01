/**
 * Marketplace Caching Strategy Implementation
 * Implements mixed strategies for inventory/pricing sensitivity with responsive image optimization
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';

interface MarketplaceCacheConfig {
  listings: {
    strategy: 'NetworkFirst';
    cacheName: string;
    networkTimeoutSeconds: number;
    maxAgeSeconds: number;
  };
  images: {
    strategy: 'CacheFirst';
    cacheName: string;
    maxAgeSeconds: number;
    maxEntries: number;
  };
  pricing: {
    strategy: 'NetworkFirst';
    cacheName: string;
    maxAgeSeconds: number;
    etagValidation: boolean;
  };
  inventory: {
    strategy: 'NetworkFirst';
    cacheName: string;
    maxAgeSeconds: number;
    realTimeUpdates: boolean;
  };
}

interface ProductListing {
  id: string;
  title: string;
  price: number;
  currency: string;
  inventory: number;
  images: ProductImage[];
  seller: string;
  category: string;
  tags: string[];
  lastUpdated: number;
}

interface ProductImage {
  url: string;
  alt: string;
  width: number;
  height: number;
  size: number;
  format: string;
  responsive?: ResponsiveImageSet;
}

interface ResponsiveImageSet {
  small: string;   // 300px
  medium: string;  // 600px
  large: string;   // 1200px
  webp?: {
    small: string;
    medium: string;
    large: string;
  };
}

interface PricingData {
  productId: string;
  price: number;
  currency: string;
  discount?: number;
  etag: string;
  lastModified: string;
  validUntil: number;
}

interface InventoryData {
  productId: string;
  available: number;
  reserved: number;
  lastUpdated: number;
  etag: string;
}

export class MarketplaceCacheStrategy {
  private readonly config: MarketplaceCacheConfig = {
    listings: {
      strategy: 'NetworkFirst',
      cacheName: 'marketplace-listings-v1',
      networkTimeoutSeconds: 2,
      maxAgeSeconds: 120 // 2 minutes
    },
    images: {
      strategy: 'CacheFirst',
      cacheName: 'marketplace-images-v1',
      maxAgeSeconds: 86400, // 24 hours
      maxEntries: 500
    },
    pricing: {
      strategy: 'NetworkFirst',
      cacheName: 'marketplace-pricing-v1',
      maxAgeSeconds: 300, // 5 minutes
      etagValidation: true
    },
    inventory: {
      strategy: 'NetworkFirst',
      cacheName: 'marketplace-inventory-v1',
      maxAgeSeconds: 60, // 1 minute
      realTimeUpdates: true
    }
  };

  private criticalImageQueue: Set<string> = new Set();
  private responsiveImageCache: Map<string, ResponsiveImageSet> = new Map();
  private etagCache: Map<string, string> = new Map();

  /**
   * Fetch product listings with NetworkFirst strategy for inventory/pricing sensitivity
   */
  async fetchProductListings(
    endpoint: string,
    options: {
      category?: string;
      page?: number;
      limit?: number;
      sortBy?: string;
      userId?: string;
    } = {}
  ): Promise<Response> {
    const url = this.buildMarketplaceUrl(endpoint, options);
    
    try {
      // Use NetworkFirst with short timeout for fresh inventory/pricing data
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        url,
        'NetworkFirst',
        {
          networkTimeoutSeconds: this.config.listings.networkTimeoutSeconds,
          maxAge: this.config.listings.maxAgeSeconds * 1000,
          tags: ['marketplace', 'listings', ...(options.category ? [`category-${options.category}`] : [])],
          userScope: options.userId
        }
      );

      // Handle listings response for image preloading
      if (response.ok) {
        const listingsData = await response.clone().json();
        await this.handleListingsResponse(listingsData, options);
      }

      return response;
    } catch (error) {
      console.error('Product listings fetch failed:', error);
      throw error;
    }
  }

  /**
   * Fetch pricing data with ETag validation for freshness
   */
  async fetchPricingData(
    productId: string,
    options: { userId?: string } = {}
  ): Promise<PricingData | null> {
    const url = `/api/marketplace/products/${productId}/pricing`;
    const cacheKey = this.generateCacheKey(url, options);

    try {
      // Check for cached ETag
      const cachedEtag = this.etagCache.get(cacheKey);
      const headers: HeadersInit = {};
      
      if (cachedEtag && this.config.pricing.etagValidation) {
        headers['If-None-Match'] = cachedEtag;
      }

      const response = await fetch(url, { headers });

      if (response.status === 304) {
        // Not modified, return cached data
        return await this.getCachedPricingData(cacheKey);
      }

      if (response.ok) {
        const pricingData: PricingData = await response.json();
        
        // Cache the pricing data with ETag
        const etag = response.headers.get('etag');
        if (etag) {
          this.etagCache.set(cacheKey, etag);
          pricingData.etag = etag;
        }

        const lastModified = response.headers.get('last-modified');
        if (lastModified) {
          pricingData.lastModified = lastModified;
        }

        // Cache with short TTL
        await this.cachePricingData(cacheKey, pricingData);
        
        return pricingData;
      }

      return null;
    } catch (error) {
      console.error('Pricing data fetch failed:', error);
      // Return cached data as fallback
      return await this.getCachedPricingData(cacheKey);
    }
  }

  /**
   * Fetch inventory data with real-time updates
   */
  async fetchInventoryData(
    productId: string,
    options: { userId?: string } = {}
  ): Promise<InventoryData | null> {
    const url = `/api/marketplace/products/${productId}/inventory`;
    
    try {
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        url,
        'NetworkFirst',
        {
          networkTimeoutSeconds: 1, // Very short timeout for inventory
          maxAge: this.config.inventory.maxAgeSeconds * 1000,
          tags: ['marketplace', 'inventory', `product-${productId}`],
          userScope: options.userId
        }
      );

      if (response.ok) {
        const inventoryData: InventoryData = await response.json();
        
        // Set up real-time updates if enabled
        if (this.config.inventory.realTimeUpdates) {
          this.setupInventoryUpdates(productId);
        }
        
        return inventoryData;
      }

      return null;
    } catch (error) {
      console.error('Inventory data fetch failed:', error);
      return null;
    }
  }

  /**
   * Fetch product images with CacheFirst and short expiration
   */
  async fetchProductImage(
    imageUrl: string,
    options: {
      responsive?: boolean;
      critical?: boolean;
      format?: 'webp' | 'jpeg' | 'png';
    } = {}
  ): Promise<Response> {
    try {
      // Determine optimal image URL
      const optimizedUrl = await this.getOptimizedImageUrl(imageUrl, options);
      
      // Use CacheFirst for images with longer expiration
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        optimizedUrl,
        'CacheFirst',
        {
          maxAge: this.config.images.maxAgeSeconds * 1000,
          tags: ['marketplace', 'images', ...(options.critical ? ['critical'] : [])],
          maxEntries: this.config.images.maxEntries
        }
      );

      return response;
    } catch (error) {
      console.error('Product image fetch failed:', error);
      throw error;
    }
  }

  /**
   * Implement responsive image optimization
   */
  async optimizeResponsiveImages(images: ProductImage[]): Promise<ProductImage[]> {
    try {
      const optimizedImages = await Promise.all(
        images.map(async (image) => {
          const responsiveSet = await this.generateResponsiveImageSet(image);
          return {
            ...image,
            responsive: responsiveSet
          };
        })
      );

      return optimizedImages;
    } catch (error) {
      console.error('Responsive image optimization failed:', error);
      return images;
    }
  }

  /**
   * Implement critical image preloading
   */
  async preloadCriticalImages(productIds: string[]): Promise<void> {
    try {
      const criticalImages: string[] = [];
      
      // Collect critical images (first image of each product)
      for (const productId of productIds) {
        const productData = await this.getProductData(productId);
        if (productData && productData.images.length > 0) {
          const firstImage = productData.images[0];
          const optimizedUrl = await this.getOptimizedImageUrl(firstImage.url, {
            critical: true,
            responsive: true
          });
          
          if (!this.criticalImageQueue.has(optimizedUrl)) {
            criticalImages.push(optimizedUrl);
            this.criticalImageQueue.add(optimizedUrl);
          }
        }
      }

      // Preload critical images
      if (criticalImages.length > 0) {
        await this.preloadImages(criticalImages, { priority: 'high' });
      }

      console.log(`Preloaded ${criticalImages.length} critical images`);
      
    } catch (error) {
      console.error('Critical image preload failed:', error);
    }
  }

  /**
   * Invalidate marketplace cache by product or category
   */
  async invalidateMarketplaceCache(
    type: 'product' | 'category' | 'pricing' | 'inventory',
    identifier: string
  ): Promise<void> {
    try {
      const tags: string[] = [];
      
      switch (type) {
        case 'product':
          tags.push(`product-${identifier}`, `pricing-${identifier}`, `inventory-${identifier}`);
          break;
        case 'category':
          tags.push(`category-${identifier}`);
          break;
        case 'pricing':
          tags.push(`pricing-${identifier}`);
          break;
        case 'inventory':
          tags.push(`inventory-${identifier}`);
          break;
      }

      const invalidationPromises = tags.map(tag => 
        serviceWorkerCacheService.invalidateByTag(tag)
      );
      
      await Promise.all(invalidationPromises);
      
      // Clear ETag cache for pricing
      if (type === 'pricing' || type === 'product') {
        this.clearEtagCache(identifier);
      }
      
      console.log(`Marketplace cache invalidated for ${type}: ${identifier}`);
      
    } catch (error) {
      console.error('Marketplace cache invalidation failed:', error);
    }
  }

  /**
   * Handle listings response and trigger image preloading
   */
  private async handleListingsResponse(listingsData: any, options: any): Promise<void> {
    try {
      if (listingsData.products && Array.isArray(listingsData.products)) {
        const productIds = listingsData.products.map((p: any) => p.id);
        
        // Preload critical images for visible products
        await this.preloadCriticalImages(productIds.slice(0, 6)); // First 6 products
        
        // Optimize responsive images
        for (const product of listingsData.products) {
          if (product.images) {
            product.images = await this.optimizeResponsiveImages(product.images);
          }
        }
      }
    } catch (error) {
      console.error('Failed to handle listings response:', error);
    }
  }

  /**
   * Generate responsive image set
   */
  private async generateResponsiveImageSet(image: ProductImage): Promise<ResponsiveImageSet> {
    const cacheKey = `responsive-${image.url}`;
    
    // Check cache first
    if (this.responsiveImageCache.has(cacheKey)) {
      return this.responsiveImageCache.get(cacheKey)!;
    }

    try {
      const responsiveSet: ResponsiveImageSet = {
        small: this.generateResponsiveUrl(image.url, 300),
        medium: this.generateResponsiveUrl(image.url, 600),
        large: this.generateResponsiveUrl(image.url, 1200)
      };

      // Add WebP variants if supported
      if (this.supportsWebP()) {
        responsiveSet.webp = {
          small: this.generateResponsiveUrl(image.url, 300, 'webp'),
          medium: this.generateResponsiveUrl(image.url, 600, 'webp'),
          large: this.generateResponsiveUrl(image.url, 1200, 'webp')
        };
      }

      this.responsiveImageCache.set(cacheKey, responsiveSet);
      return responsiveSet;
      
    } catch (error) {
      console.error('Failed to generate responsive image set:', error);
      return {
        small: image.url,
        medium: image.url,
        large: image.url
      };
    }
  }

  /**
   * Generate responsive image URL
   */
  private generateResponsiveUrl(originalUrl: string, width: number, format?: string): string {
    try {
      const url = new URL(originalUrl);
      url.searchParams.set('w', width.toString());
      url.searchParams.set('q', '85'); // Quality
      
      if (format) {
        url.searchParams.set('f', format);
      }
      
      return url.toString();
    } catch (error) {
      return originalUrl;
    }
  }

  /**
   * Get optimized image URL based on options
   */
  private async getOptimizedImageUrl(
    imageUrl: string,
    options: {
      responsive?: boolean;
      critical?: boolean;
      format?: string;
    }
  ): Promise<string> {
    try {
      let optimizedUrl = imageUrl;
      
      // Apply responsive optimization
      if (options.responsive) {
        const viewportWidth = window.innerWidth;
        let targetWidth = 600; // Default
        
        if (viewportWidth <= 480) targetWidth = 300;
        else if (viewportWidth <= 768) targetWidth = 600;
        else targetWidth = 1200;
        
        optimizedUrl = this.generateResponsiveUrl(imageUrl, targetWidth, options.format);
      }
      
      // Apply format optimization
      if (options.format && this.supportsFormat(options.format)) {
        const url = new URL(optimizedUrl);
        url.searchParams.set('f', options.format);
        optimizedUrl = url.toString();
      }
      
      return optimizedUrl;
    } catch (error) {
      return imageUrl;
    }
  }

  /**
   * Preload images with priority
   */
  private async preloadImages(
    imageUrls: string[],
    options: { priority?: 'high' | 'low' } = {}
  ): Promise<void> {
    try {
      const preloadPromises = imageUrls.map(async (url) => {
        try {
          await serviceWorkerCacheService.fetchWithStrategy(
            url,
            'CacheFirst',
            {
              tags: ['marketplace', 'images', 'preload'],
              maxAge: this.config.images.maxAgeSeconds * 1000
            }
          );
        } catch (error) {
          console.warn(`Failed to preload image: ${url}`, error);
        }
      });

      await Promise.all(preloadPromises);
      
    } catch (error) {
      console.error('Image preload failed:', error);
    }
  }

  /**
   * Cache pricing data
   */
  private async cachePricingData(cacheKey: string, pricingData: PricingData): Promise<void> {
    try {
      await serviceWorkerCacheService.putWithMetadata(
        cacheKey,
        new Response(JSON.stringify(pricingData), {
          headers: { 'Content-Type': 'application/json' }
        }),
        {
          tags: ['marketplace', 'pricing', `product-${pricingData.productId}`],
          ttl: this.config.pricing.maxAgeSeconds * 1000
        }
      );
    } catch (error) {
      console.error('Failed to cache pricing data:', error);
    }
  }

  /**
   * Get cached pricing data
   */
  private async getCachedPricingData(cacheKey: string): Promise<PricingData | null> {
    try {
      const cachedResponse = await serviceWorkerCacheService.fetchWithStrategy(
        cacheKey,
        'CacheFirst'
      );
      
      if (cachedResponse.ok) {
        return await cachedResponse.json();
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get cached pricing data:', error);
      return null;
    }
  }

  /**
   * Setup real-time inventory updates
   */
  private setupInventoryUpdates(productId: string): void {
    // This would typically set up WebSocket or Server-Sent Events
    // For now, we'll use a simple polling mechanism
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'SETUP_INVENTORY_UPDATES',
        productId,
        interval: 30000 // 30 seconds
      });
    }
  }

  /**
   * Get product data
   */
  private async getProductData(productId: string): Promise<ProductListing | null> {
    try {
      const response = await this.fetchProductListings(`/api/marketplace/products/${productId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error(`Failed to get product data for ${productId}:`, error);
      return null;
    }
  }

  /**
   * Clear ETag cache
   */
  private clearEtagCache(identifier: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.etagCache) {
      if (key.includes(identifier)) {
        keysToDelete.push(key);
      }
    }
    
    keysToDelete.forEach(key => this.etagCache.delete(key));
  }

  /**
   * Check WebP support
   */
  private supportsWebP(): boolean {
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  /**
   * Check format support
   */
  private supportsFormat(format: string): boolean {
    switch (format) {
      case 'webp':
        return this.supportsWebP();
      case 'avif':
        // Check AVIF support
        const canvas = document.createElement('canvas');
        canvas.width = 1;
        canvas.height = 1;
        return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
      default:
        return true;
    }
  }

  /**
   * Build marketplace URL with parameters
   */
  private buildMarketplaceUrl(endpoint: string, options: any): string {
    const url = new URL(endpoint, window.location.origin);
    
    if (options.category) url.searchParams.set('category', options.category);
    if (options.page) url.searchParams.set('page', options.page.toString());
    if (options.limit) url.searchParams.set('limit', options.limit.toString());
    if (options.sortBy) url.searchParams.set('sortBy', options.sortBy);
    
    return url.toString();
  }

  /**
   * Generate cache key
   */
  private generateCacheKey(url: string, options: any): string {
    const baseKey = url;
    const userScope = options.userId || '';
    return userScope ? `${userScope}:${baseKey}` : baseKey;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.criticalImageQueue.clear();
    this.responsiveImageCache.clear();
    this.etagCache.clear();
  }
}

// Export singleton instance
export const marketplaceCacheStrategy = new MarketplaceCacheStrategy();

export default MarketplaceCacheStrategy;