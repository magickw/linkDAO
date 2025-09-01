/**
 * CDN Service for optimizing content delivery and edge caching
 */

interface CDNConfig {
  baseUrl: string;
  regions: string[];
  defaultQuality: number;
  formats: string[];
  enableWebP: boolean;
  enableAVIF: boolean;
}

interface ImageOptimizationOptions {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'auto' | 'webp' | 'avif' | 'jpg' | 'png';
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
  gravity?: 'center' | 'north' | 'south' | 'east' | 'west';
  blur?: number;
  sharpen?: boolean;
}

interface CacheOptions {
  ttl?: number;
  region?: string;
  tags?: string[];
  vary?: string[];
}

class CDNService {
  private config: CDNConfig;
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  constructor(config: Partial<CDNConfig> = {}) {
    this.config = {
      baseUrl: config.baseUrl || process.env.NEXT_PUBLIC_CDN_URL || '',
      regions: config.regions || ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
      defaultQuality: config.defaultQuality || 80,
      formats: config.formats || ['webp', 'avif', 'jpg', 'png'],
      enableWebP: config.enableWebP ?? true,
      enableAVIF: config.enableAVIF ?? true
    };
  }

  /**
   * Optimize image URL with CDN parameters
   */
  optimizeImage(url: string, options: ImageOptimizationOptions = {}): string {
    if (!url || !this.config.baseUrl) return url;

    // Skip if already a data URL or blob
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }

    const params = new URLSearchParams();

    // Dimensions
    if (options.width) params.set('w', options.width.toString());
    if (options.height) params.set('h', options.height.toString());

    // Quality
    const quality = options.quality || this.config.defaultQuality;
    params.set('q', quality.toString());

    // Format optimization
    const format = this.getBestFormat(options.format);
    if (format !== 'auto') {
      params.set('f', format);
    }

    // Fit and positioning
    if (options.fit) params.set('fit', options.fit);
    if (options.gravity) params.set('g', options.gravity);

    // Effects
    if (options.blur) params.set('blur', options.blur.toString());
    if (options.sharpen) params.set('sharpen', 'true');

    // Construct CDN URL
    const encodedUrl = encodeURIComponent(url);
    const cdnUrl = `${this.config.baseUrl}/image/${encodedUrl}?${params.toString()}`;

    return cdnUrl;
  }

  /**
   * Get responsive image URLs for different screen sizes
   */
  getResponsiveImages(url: string, options: ImageOptimizationOptions = {}): {
    src: string;
    srcSet: string;
    sizes: string;
  } {
    const breakpoints = [320, 640, 768, 1024, 1280, 1536];
    const srcSet = breakpoints
      .map(width => {
        const optimizedUrl = this.optimizeImage(url, { ...options, width });
        return `${optimizedUrl} ${width}w`;
      })
      .join(', ');

    const sizes = '(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw';

    return {
      src: this.optimizeImage(url, options),
      srcSet,
      sizes
    };
  }

  /**
   * Preload critical images
   */
  preloadImages(urls: string[], options: ImageOptimizationOptions = {}): void {
    urls.forEach(url => {
      const optimizedUrl = this.optimizeImage(url, options);
      
      // Create link element for preloading
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = optimizedUrl;
      
      // Add responsive preloading
      const responsive = this.getResponsiveImages(url, options);
      link.setAttribute('imagesrcset', responsive.srcSet);
      link.setAttribute('imagesizes', responsive.sizes);
      
      document.head.appendChild(link);
    });
  }

  /**
   * Cache static assets with edge caching
   */
  async cacheAsset(url: string, options: CacheOptions = {}): Promise<string> {
    const cacheKey = this.generateCacheKey(url, options);
    
    // Check local cache first
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }

    try {
      // Construct CDN URL with caching parameters
      const params = new URLSearchParams();
      
      if (options.ttl) params.set('ttl', options.ttl.toString());
      if (options.region) params.set('region', options.region);
      if (options.tags) params.set('tags', options.tags.join(','));
      if (options.vary) params.set('vary', options.vary.join(','));

      const encodedUrl = encodeURIComponent(url);
      const cdnUrl = `${this.config.baseUrl}/cache/${encodedUrl}?${params.toString()}`;

      // Store in local cache
      const ttl = options.ttl || 5 * 60 * 1000; // 5 minutes default
      this.cache.set(cacheKey, {
        data: cdnUrl,
        timestamp: Date.now(),
        ttl
      });

      return cdnUrl;
    } catch (error) {
      console.warn('CDN caching failed, returning original URL:', error);
      return url;
    }
  }

  /**
   * Purge cache for specific URLs or tags
   */
  async purgeCache(urls?: string[], tags?: string[]): Promise<boolean> {
    try {
      const params = new URLSearchParams();
      
      if (urls) {
        params.set('urls', urls.join(','));
      }
      
      if (tags) {
        params.set('tags', tags.join(','));
      }

      const response = await fetch(`${this.config.baseUrl}/purge?${params.toString()}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Clear local cache for matching items
        if (urls) {
          urls.forEach(url => {
            const keys = Array.from(this.cache.keys()).filter(key => key.includes(url));
            keys.forEach(key => this.cache.delete(key));
          });
        }
        
        if (tags) {
          // Clear all cache (simplified - in real implementation, you'd track tags)
          this.cache.clear();
        }

        return true;
      }

      return false;
    } catch (error) {
      console.error('Cache purge failed:', error);
      return false;
    }
  }

  /**
   * Get optimal CDN region based on user location
   */
  async getOptimalRegion(): Promise<string> {
    try {
      // Try to get user's location from various sources
      const region = await this.detectUserRegion();
      
      // Find closest CDN region
      const regionMapping: Record<string, string> = {
        'US': 'us-east-1',
        'CA': 'us-east-1',
        'GB': 'eu-west-1',
        'DE': 'eu-west-1',
        'FR': 'eu-west-1',
        'JP': 'ap-southeast-1',
        'SG': 'ap-southeast-1',
        'AU': 'ap-southeast-1'
      };

      return regionMapping[region] || this.config.regions[0];
    } catch (error) {
      console.warn('Region detection failed, using default:', error);
      return this.config.regions[0];
    }
  }

  /**
   * Generate video streaming URLs
   */
  getVideoStreamingUrl(url: string, options: {
    quality?: '360p' | '480p' | '720p' | '1080p' | 'auto';
    format?: 'mp4' | 'webm' | 'hls';
    startTime?: number;
    endTime?: number;
  } = {}): string {
    if (!this.config.baseUrl) return url;

    const params = new URLSearchParams();
    
    if (options.quality) params.set('q', options.quality);
    if (options.format) params.set('f', options.format);
    if (options.startTime) params.set('t', options.startTime.toString());
    if (options.endTime) params.set('e', options.endTime.toString());

    const encodedUrl = encodeURIComponent(url);
    return `${this.config.baseUrl}/video/${encodedUrl}?${params.toString()}`;
  }

  /**
   * Get adaptive bitrate streaming manifest
   */
  getAdaptiveStreamingManifest(url: string): {
    hls: string;
    dash: string;
  } {
    const encodedUrl = encodeURIComponent(url);
    
    return {
      hls: `${this.config.baseUrl}/stream/hls/${encodedUrl}/playlist.m3u8`,
      dash: `${this.config.baseUrl}/stream/dash/${encodedUrl}/manifest.mpd`
    };
  }

  /**
   * Optimize font loading
   */
  optimizeFontUrl(url: string, options: {
    display?: 'auto' | 'block' | 'swap' | 'fallback' | 'optional';
    subset?: string;
    format?: 'woff2' | 'woff' | 'ttf';
  } = {}): string {
    if (!this.config.baseUrl) return url;

    const params = new URLSearchParams();
    
    if (options.display) params.set('display', options.display);
    if (options.subset) params.set('subset', options.subset);
    if (options.format) params.set('format', options.format);

    const encodedUrl = encodeURIComponent(url);
    return `${this.config.baseUrl}/font/${encodedUrl}?${params.toString()}`;
  }

  /**
   * Get performance metrics for CDN usage
   */
  getPerformanceMetrics(): {
    cacheHitRate: number;
    averageLoadTime: number;
    bandwidthSaved: number;
    totalRequests: number;
  } {
    // This would be implemented with actual metrics collection
    return {
      cacheHitRate: 0.85,
      averageLoadTime: 150,
      bandwidthSaved: 0.6,
      totalRequests: this.cache.size
    };
  }

  /**
   * Private helper methods
   */
  private getBestFormat(requestedFormat?: string): string {
    if (requestedFormat && requestedFormat !== 'auto') {
      return requestedFormat;
    }

    // Feature detection for modern formats
    if (this.config.enableAVIF && this.supportsAVIF()) {
      return 'avif';
    }
    
    if (this.config.enableWebP && this.supportsWebP()) {
      return 'webp';
    }

    return 'jpg';
  }

  private supportsWebP(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    return canvas.toDataURL('image/webp').indexOf('data:image/webp') === 0;
  }

  private supportsAVIF(): boolean {
    if (typeof window === 'undefined') return false;
    
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    
    try {
      return canvas.toDataURL('image/avif').indexOf('data:image/avif') === 0;
    } catch {
      return false;
    }
  }

  private async detectUserRegion(): Promise<string> {
    try {
      // Try multiple methods to detect region
      
      // Method 1: Timezone
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (timezone.includes('America')) return 'US';
      if (timezone.includes('Europe')) return 'GB';
      if (timezone.includes('Asia')) return 'SG';
      
      // Method 2: Language
      const language = navigator.language;
      if (language.startsWith('en-US')) return 'US';
      if (language.startsWith('en-GB')) return 'GB';
      if (language.startsWith('de')) return 'DE';
      if (language.startsWith('fr')) return 'FR';
      if (language.startsWith('ja')) return 'JP';
      
      // Method 3: IP-based (would require external service)
      // const response = await fetch('https://ipapi.co/country/');
      // const country = await response.text();
      // return country;
      
      return 'US'; // Default
    } catch (error) {
      return 'US'; // Default fallback
    }
  }

  private generateCacheKey(url: string, options: CacheOptions): string {
    const optionsStr = JSON.stringify(options);
    return `${url}:${optionsStr}`;
  }

  /**
   * Cleanup expired cache entries
   */
  private cleanupCache(): void {
    const now = Date.now();
    
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp > value.ttl) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Initialize CDN service
   */
  init(): void {
    // Start cache cleanup interval
    setInterval(() => {
      this.cleanupCache();
    }, 60000); // Clean up every minute

    // Preload critical resources
    this.preloadCriticalResources();
  }

  private preloadCriticalResources(): void {
    // Preload common UI assets
    const criticalAssets = [
      '/images/logo.svg',
      '/images/placeholder.jpg',
      '/fonts/inter-var.woff2'
    ];

    criticalAssets.forEach(asset => {
      this.cacheAsset(asset, { ttl: 24 * 60 * 60 * 1000 }); // 24 hours
    });
  }
}

// Edge caching utilities
export class EdgeCache {
  private static instance: EdgeCache;
  private cache = new Map<string, any>();

  static getInstance(): EdgeCache {
    if (!EdgeCache.instance) {
      EdgeCache.instance = new EdgeCache();
    }
    return EdgeCache.instance;
  }

  async get(key: string): Promise<any> {
    // Try service worker cache first
    if ('caches' in window) {
      try {
        const cache = await caches.open('edge-cache-v1');
        const response = await cache.match(key);
        
        if (response) {
          return await response.json();
        }
      } catch (error) {
        console.warn('Service worker cache failed:', error);
      }
    }

    // Fallback to memory cache
    return this.cache.get(key);
  }

  async set(key: string, data: any, ttl: number = 300000): Promise<void> {
    // Store in service worker cache
    if ('caches' in window) {
      try {
        const cache = await caches.open('edge-cache-v1');
        const response = new Response(JSON.stringify(data), {
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': `max-age=${Math.floor(ttl / 1000)}`
          }
        });
        
        await cache.put(key, response);
      } catch (error) {
        console.warn('Service worker cache failed:', error);
      }
    }

    // Store in memory cache as fallback
    this.cache.set(key, data);
    
    // Set expiration
    setTimeout(() => {
      this.cache.delete(key);
    }, ttl);
  }

  async delete(key: string): Promise<void> {
    // Remove from service worker cache
    if ('caches' in window) {
      try {
        const cache = await caches.open('edge-cache-v1');
        await cache.delete(key);
      } catch (error) {
        console.warn('Service worker cache deletion failed:', error);
      }
    }

    // Remove from memory cache
    this.cache.delete(key);
  }

  async clear(): Promise<void> {
    // Clear service worker cache
    if ('caches' in window) {
      try {
        await caches.delete('edge-cache-v1');
      } catch (error) {
        console.warn('Service worker cache clear failed:', error);
      }
    }

    // Clear memory cache
    this.cache.clear();
  }
}

// Create singleton instance
export const cdnService = new CDNService();
export const edgeCache = EdgeCache.getInstance();

// Initialize on import
if (typeof window !== 'undefined') {
  cdnService.init();
}

export default CDNService;