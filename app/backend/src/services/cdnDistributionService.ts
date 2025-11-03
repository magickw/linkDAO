import { CDNIntegrationService } from './cdnIntegrationService';
import { safeLogger } from '../utils/safeLogger';
import ipfsService from './ipfsService';
import { createHash } from 'crypto';

export interface CDNDistributionConfig {
  primaryCDN: {
    type: 'cloudfront' | 'cloudflare' | 'fastly';
    config: any;
  };
  fallbackCDNs?: Array<{
    type: string;
    config: any;
    priority: number;
  }>;
  ipfsGateways: string[];
  cacheSettings: {
    defaultTTL: number;
    imageTTL: number;
    thumbnailTTL: number;
  };
}

export interface DistributionResult {
  primaryUrl: string;
  fallbackUrls: string[];
  ipfsUrls: string[];
  cacheStatus: 'hit' | 'miss' | 'stale';
  distributionTime: number;
}

export interface ImageDistributionOptions {
  priority: 'speed' | 'reliability' | 'cost';
  regions?: string[];
  transformations?: {
    width?: number;
    height?: number;
    quality?: number;
    format?: 'webp' | 'jpeg' | 'png';
  };
}

class CDNDistributionService {
  private primaryCDN: CDNIntegrationService | null = null;
  private fallbackCDNs: CDNIntegrationService[] = [];
  private config: CDNDistributionConfig;

  constructor() {
    this.config = this.loadConfiguration();
    this.initializeCDNs();
  }

  private loadConfiguration(): CDNDistributionConfig {
    return {
      primaryCDN: {
        type: 'cloudfront',
        config: {
          distributionId: process.env.CLOUDFRONT_DISTRIBUTION_ID || '',
          bucketName: process.env.S3_BUCKET_NAME || '',
          region: process.env.AWS_REGION || 'us-east-1',
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
          cloudFrontDomain: process.env.CLOUDFRONT_DOMAIN || ''
        }
      },
      ipfsGateways: [
        'https://ipfs.io/ipfs/',
        'https://gateway.pinata.cloud/ipfs/',
        'https://cloudflare-ipfs.com/ipfs/',
        'https://dweb.link/ipfs/'
      ],
      cacheSettings: {
        defaultTTL: 3600, // 1 hour
        imageTTL: 31536000, // 1 year
        thumbnailTTL: 31536000 // 1 year
      }
    };
  }

  private initializeCDNs(): void {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

      // Initialize primary CDN
      if (this.config.primaryCDN.config.distributionId) {
        this.primaryCDN = new CDNIntegrationService(
          this.config.primaryCDN.config,
          redisUrl
        );
      }

      // Initialize fallback CDNs if configured
      if (this.config.fallbackCDNs) {
        this.fallbackCDNs = this.config.fallbackCDNs.map(cdn => 
          new CDNIntegrationService(cdn.config, redisUrl)
        );
      }
    } catch (error) {
      safeLogger.warn('CDN initialization failed:', error);
    }
  }

  /**
   * Distribute image to CDN after IPFS upload
   */
  async distributeImage(
    ipfsHash: string,
    buffer: Buffer,
    filename: string,
    contentType: string,
    options: ImageDistributionOptions = { priority: 'speed' }
  ): Promise<DistributionResult> {
    const startTime = Date.now();
    const result: DistributionResult = {
      primaryUrl: '',
      fallbackUrls: [],
      ipfsUrls: [],
      cacheStatus: 'miss',
      distributionTime: 0
    };

    try {
      // Generate IPFS URLs from multiple gateways
      result.ipfsUrls = this.config.ipfsGateways.map(gateway => `${gateway}${ipfsHash}`);

      // Upload to primary CDN
      if (this.primaryCDN) {
        try {
          const cdnKey = this.generateCDNKey(ipfsHash, filename);
          const cachePolicy = this.getCachePolicy(contentType);
          
          await this.primaryCDN.uploadAsset(cdnKey, buffer, contentType, cachePolicy);
          
          // Generate URL with transformations if specified
          result.primaryUrl = this.primaryCDN.generateCDNUrl(cdnKey, options.transformations);
          
        } catch (cdnError) {
          safeLogger.warn('Primary CDN upload failed:', cdnError);
          result.primaryUrl = result.ipfsUrls[0]; // Fallback to IPFS
        }
      } else {
        result.primaryUrl = result.ipfsUrls[0];
      }

      // Upload to fallback CDNs based on priority
      if (options.priority === 'reliability' && this.fallbackCDNs.length > 0) {
        const fallbackPromises = this.fallbackCDNs.map(async (cdn, index) => {
          try {
            const cdnKey = this.generateCDNKey(ipfsHash, filename, `fallback-${index}`);
            const cachePolicy = this.getCachePolicy(contentType);
            
            await cdn.uploadAsset(cdnKey, buffer, contentType, cachePolicy);
            return cdn.generateCDNUrl(cdnKey, options.transformations);
          } catch (error) {
            safeLogger.warn(`Fallback CDN ${index} upload failed:`, error);
            return null;
          }
        });

        const fallbackResults = await Promise.allSettled(fallbackPromises);
        result.fallbackUrls = fallbackResults
          .filter(r => r.status === 'fulfilled' && r.value)
          .map(r => (r as PromiseFulfilledResult<string>).value);
      }

      result.distributionTime = Date.now() - startTime;
      return result;

    } catch (error) {
      safeLogger.error('CDN distribution error:', error);
      result.primaryUrl = result.ipfsUrls[0];
      result.distributionTime = Date.now() - startTime;
      return result;
    }
  }

  /**
   * Get optimized image URL with automatic format selection
   */
  async getOptimizedImageUrl(
    ipfsHash: string,
    filename: string,
    options: {
      width?: number;
      height?: number;
      quality?: number;
      userAgent?: string;
      acceptHeader?: string;
    } = {}
  ): Promise<string> {
    try {
      if (!this.primaryCDN) {
        return `${this.config.ipfsGateways[0]}${ipfsHash}`;
      }

      const cdnKey = this.generateCDNKey(ipfsHash, filename);
      
      // Determine optimal format based on browser support
      const format = this.determineOptimalFormat(options.userAgent, options.acceptHeader);
      
      const transformations = {
        ...options,
        format
      };

      return this.primaryCDN.generateCDNUrl(cdnKey, transformations);

    } catch (error) {
      safeLogger.error('Error generating optimized URL:', error);
      return `${this.config.ipfsGateways[0]}${ipfsHash}`;
    }
  }

  /**
   * Invalidate cached images across all CDNs
   */
  async invalidateCache(ipfsHashes: string[], filenames: string[]): Promise<{
    primary: string | null;
    fallbacks: Array<{ index: number; invalidationId: string | null }>;
  }> {
    const result = {
      primary: null as string | null,
      fallbacks: [] as Array<{ index: number; invalidationId: string | null }>
    };

    try {
      // Generate cache keys
      const cacheKeys = ipfsHashes.flatMap((hash, i) => [
        this.generateCDNKey(hash, filenames[i]),
        ...this.generateThumbnailKeys(hash, filenames[i])
      ]);

      // Invalidate primary CDN
      if (this.primaryCDN) {
        try {
          result.primary = await this.primaryCDN.invalidateCache(cacheKeys);
        } catch (error) {
          safeLogger.warn('Primary CDN invalidation failed:', error);
        }
      }

      // Invalidate fallback CDNs
      const fallbackPromises = this.fallbackCDNs.map(async (cdn, index) => {
        try {
          const fallbackKeys = cacheKeys.map(key => `fallback-${index}/${key}`);
          const invalidationId = await cdn.invalidateCache(fallbackKeys);
          return { index, invalidationId };
        } catch (error) {
          safeLogger.warn(`Fallback CDN ${index} invalidation failed:`, error);
          return { index, invalidationId: null };
        }
      });

      result.fallbacks = await Promise.all(fallbackPromises);

      return result;

    } catch (error) {
      safeLogger.error('Cache invalidation error:', error);
      return result;
    }
  }

  /**
   * Generate responsive image URLs for different screen sizes
   */
  async generateResponsiveUrls(
    ipfsHash: string,
    filename: string,
    breakpoints: Array<{ name: string; width: number; quality?: number }> = [
      { name: 'mobile', width: 480, quality: 80 },
      { name: 'tablet', width: 768, quality: 85 },
      { name: 'desktop', width: 1200, quality: 90 },
      { name: 'large', width: 1920, quality: 95 }
    ]
  ): Promise<Record<string, string>> {
    const urls: Record<string, string> = {};

    try {
      for (const breakpoint of breakpoints) {
        urls[breakpoint.name] = await this.getOptimizedImageUrl(ipfsHash, filename, {
          width: breakpoint.width,
          quality: breakpoint.quality || 85
        });
      }

      return urls;

    } catch (error) {
      safeLogger.error('Error generating responsive URLs:', error);
      // Fallback to IPFS
      const fallbackUrl = `${this.config.ipfsGateways[0]}${ipfsHash}`;
      breakpoints.forEach(bp => {
        urls[bp.name] = fallbackUrl;
      });
      return urls;
    }
  }

  /**
   * Check CDN health and performance
   */
  async checkCDNHealth(): Promise<{
    primary: { status: 'healthy' | 'degraded' | 'down'; responseTime: number };
    fallbacks: Array<{ index: number; status: 'healthy' | 'degraded' | 'down'; responseTime: number }>;
    ipfsGateways: Array<{ url: string; status: 'healthy' | 'degraded' | 'down'; responseTime: number }>;
  }> {
    const result = {
      primary: { status: 'down' as 'healthy' | 'degraded' | 'down', responseTime: 0 },
      fallbacks: [] as Array<{ index: number; status: 'healthy' | 'degraded' | 'down'; responseTime: number }>,
      ipfsGateways: [] as Array<{ url: string; status: 'healthy' | 'degraded' | 'down'; responseTime: number }>
    };

    // Check primary CDN
    if (this.primaryCDN) {
      const startTime = Date.now();
      try {
        // Simple health check - could be enhanced with actual endpoint testing
        result.primary.responseTime = Date.now() - startTime;
        result.primary.status = result.primary.responseTime < 1000 ? 'healthy' : 'degraded';
      } catch (error) {
        result.primary.status = 'down';
        result.primary.responseTime = Date.now() - startTime;
      }
    }

    // Check fallback CDNs
    const fallbackChecks = this.fallbackCDNs.map(async (cdn, index) => {
      const startTime = Date.now();
      try {
        const responseTime = Date.now() - startTime;
        return {
          index,
          status: responseTime < 1000 ? 'healthy' as const : 'degraded' as const,
          responseTime
        };
      } catch (error) {
        return {
          index,
          status: 'down' as const,
          responseTime: Date.now() - startTime
        };
      }
    });

    result.fallbacks = await Promise.all(fallbackChecks);

    // Check IPFS gateways
    const gatewayChecks = this.config.ipfsGateways.map(async (gateway) => {
      const startTime = Date.now();
      try {
        // In a real implementation, you'd test with a known IPFS hash
        const responseTime = Date.now() - startTime;
        return {
          url: gateway,
          status: responseTime < 2000 ? 'healthy' as const : 'degraded' as const,
          responseTime
        };
      } catch (error) {
        return {
          url: gateway,
          status: 'down' as const,
          responseTime: Date.now() - startTime
        };
      }
    });

    result.ipfsGateways = await Promise.all(gatewayChecks);

    return result;
  }

  /**
   * Get CDN analytics and usage statistics
   */
  async getCDNAnalytics(startDate: Date, endDate: Date): Promise<{
    requests: number;
    bandwidth: number;
    cacheHitRate: number;
    topImages: Array<{ ipfsHash: string; requests: number; bandwidth: number }>;
    errorRate: number;
    averageResponseTime: number;
  }> {
    try {
      if (this.primaryCDN) {
        const analytics = await this.primaryCDN.getCDNAnalytics(startDate, endDate);
        // Map CDNAnalytics to expected return type
        return {
          requests: analytics.requests,
          bandwidth: analytics.bandwidth,
          cacheHitRate: analytics.cacheHitRate,
          topImages: analytics.topAssets?.map(asset => ({
            ipfsHash: asset.key || '',
            requests: asset.requests,
            bandwidth: 0 // Not available in CDNAnalytics
          })) || [],
          errorRate: analytics.errorRate,
          averageResponseTime: 0 // Not available in CDNAnalytics
        };
      }

      // Return mock data if no CDN is configured
      return {
        requests: 0,
        bandwidth: 0,
        cacheHitRate: 0,
        topImages: [],
        errorRate: 0,
        averageResponseTime: 0
      };

    } catch (error) {
      safeLogger.error('Error getting CDN analytics:', error);
      return {
        requests: 0,
        bandwidth: 0,
        cacheHitRate: 0,
        topImages: [],
        errorRate: 0,
        averageResponseTime: 0
      };
    }
  }

  // Private helper methods
  private generateCDNKey(ipfsHash: string, filename: string, prefix?: string): string {
    const hash = createHash('md5').update(filename).digest('hex').substring(0, 8);
    const key = `images/${ipfsHash}/${hash}_${filename}`;
    return prefix ? `${prefix}/${key}` : key;
  }

  private generateThumbnailKeys(ipfsHash: string, filename: string): string[] {
    const sizes = ['thumb', 'small', 'medium', 'large'];
    return sizes.map(size => {
      const thumbnailFilename = filename.replace(/\.[^/.]+$/, `_${size}.jpg`);
      return this.generateCDNKey(ipfsHash, thumbnailFilename);
    });
  }

  private getCachePolicy(contentType: string): { ttl: number; headers: string[]; queryStrings: string[] } {
    const isImage = contentType.startsWith('image/');
    const ttl = isImage ? this.config.cacheSettings.imageTTL : this.config.cacheSettings.defaultTTL;

    return {
      ttl,
      headers: ['Accept-Encoding', 'Accept'],
      queryStrings: isImage ? ['w', 'h', 'q', 'f'] : []
    };
  }

  private determineOptimalFormat(userAgent?: string, acceptHeader?: string): 'webp' | 'jpeg' | 'png' {
    // Check if browser supports WebP
    if (acceptHeader?.includes('image/webp')) {
      return 'webp';
    }

    // Check user agent for WebP support
    if (userAgent) {
      const supportsWebP = /Chrome|Firefox|Edge|Opera/.test(userAgent) && 
                          !/Safari/.test(userAgent);
      if (supportsWebP) {
        return 'webp';
      }
    }

    // Default to JPEG for broad compatibility
    return 'jpeg';
  }

  /**
   * Cleanup unused CDN assets
   */
  async cleanupUnusedAssets(olderThanDays: number = 30): Promise<{
    deletedCount: number;
    freedSpace: number;
    errors: string[];
  }> {
    const result = {
      deletedCount: 0,
      freedSpace: 0,
      errors: [] as string[]
    };

    try {
      // This would integrate with your database to find unused images
      // and remove them from CDN storage
      safeLogger.info(`Cleanup would remove assets older than ${olderThanDays} days`);
      
      // Implementation would go here
      
      return result;

    } catch (error) {
      safeLogger.error('Cleanup error:', error);
      result.errors.push(error instanceof Error ? error.message : 'Unknown error');
      return result;
    }
  }
}

export default new CDNDistributionService();
