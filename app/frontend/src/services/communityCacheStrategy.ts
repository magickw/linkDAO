/**
 * Community Caching Strategy Implementation
 * Implements Stale-While-Revalidate with bundled preloading and community-specific invalidation
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';

interface CommunityCacheConfig {
  cacheName: string;
  maxEntries: number;
  maxAgeSeconds: number;
  bundledPreload: {
    enabled: boolean;
    maxCommunities: number;
    includeAssets: string[];
    sizeLimit: number; // bytes
  };
}

interface CommunityAsset {
  type: 'icon' | 'banner' | 'avatar';
  url: string;
  size: number;
  priority: number;
}

interface CommunityData {
  id: string;
  name: string;
  description: string;
  memberCount: number;
  iconUrl?: string;
  bannerUrl?: string;
  topPosts?: any[];
  relatedCommunities?: string[];
  tags: string[];
}

interface PreloadBatch {
  communityIds: string[];
  assets: CommunityAsset[];
  totalSize: number;
}

export class CommunityCacheStrategy {
  private readonly config: CommunityCacheConfig = {
    cacheName: 'communities-cache-v1',
    maxEntries: 100,
    maxAgeSeconds: 600, // 10 minutes
    bundledPreload: {
      enabled: true,
      maxCommunities: 5,
      includeAssets: ['icons', 'banners', 'topPosts'],
      sizeLimit: 5 * 1024 * 1024 // 5MB
    }
  };

  private preloadQueue: Map<string, Promise<void>> = new Map();
  private assetSizeCache: Map<string, number> = new Map();

  /**
   * Fetch community data with Stale-While-Revalidate strategy
   */
  async fetchCommunityData(
    endpoint: string,
    options: {
      communityId?: string;
      includeAssets?: boolean;
      userId?: string;
    } = {}
  ): Promise<Response> {
    const url = this.buildCommunityUrl(endpoint, options);
    const cacheKey = this.generateCommunityCacheKey(url, options);

    try {
      // Use Stale-While-Revalidate strategy
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        url,
        'StaleWhileRevalidate',
        {
          maxAge: this.config.maxAgeSeconds * 1000,
          tags: ['community', ...(options.communityId ? [`community-${options.communityId}`] : [])],
          userScope: options.userId
        }
      );

      // Handle community response for bundled preloading
      if (response.ok) {
        const communityData = await response.clone().json();
        await this.handleCommunityResponse(communityData, options);
      }

      return response;
    } catch (error) {
      console.error('Community fetch failed:', error);
      throw error;
    }
  }

  /**
   * Implement bundled preloading for community assets
   */
  async bundledPreload(communityIds: string[]): Promise<void> {
    if (!this.config.bundledPreload.enabled) {
      return;
    }

    try {
      // Create preload batches within size limits
      const batches = await this.createPreloadBatches(communityIds);
      
      // Process batches sequentially to avoid overwhelming the network
      for (const batch of batches) {
        await this.processBatch(batch);
      }
      
      console.log(`Bundled preload completed for ${communityIds.length} communities`);
      
    } catch (error) {
      console.error('Bundled preload failed:', error);
    }
  }

  /**
   * Batch preload related community icons with size limits
   */
  async batchPreloadRelatedIcons(
    relatedCommunityIds: string[],
    sizeLimit: number = this.config.bundledPreload.sizeLimit
  ): Promise<void> {
    try {
      const iconUrls: string[] = [];
      let totalSize = 0;

      // Collect icon URLs and estimate sizes
      for (const communityId of relatedCommunityIds) {
        const iconUrl = await this.getCommunityIconUrl(communityId);
        if (iconUrl) {
          const estimatedSize = await this.estimateAssetSize(iconUrl);
          
          if (totalSize + estimatedSize <= sizeLimit) {
            iconUrls.push(iconUrl);
            totalSize += estimatedSize;
          } else {
            break; // Size limit reached
          }
        }
      }

      // Preload collected icons
      if (iconUrls.length > 0) {
        await this.preloadAssets(iconUrls.map(url => ({
          type: 'icon' as const,
          url,
          size: this.assetSizeCache.get(url) || 0,
          priority: 1
        })));
      }

      console.log(`Preloaded ${iconUrls.length} community icons (${totalSize} bytes)`);
      
    } catch (error) {
      console.error('Related icons preload failed:', error);
    }
  }

  /**
   * Community-specific cache invalidation logic
   */
  async invalidateCommunity(communityId: string): Promise<void> {
    try {
      const tags = [
        `community-${communityId}`,
        `community-posts-${communityId}`,
        `community-members-${communityId}`,
        `community-assets-${communityId}`
      ];

      // Invalidate all related cache entries
      const invalidationPromises = tags.map(tag => 
        serviceWorkerCacheService.invalidateByTag(tag)
      );
      
      await Promise.all(invalidationPromises);
      
      console.log(`Community cache invalidated for: ${communityId}`);
      
    } catch (error) {
      console.error('Community cache invalidation failed:', error);
    }
  }

  /**
   * Invalidate multiple communities
   */
  async invalidateCommunities(communityIds: string[]): Promise<void> {
    try {
      const invalidationPromises = communityIds.map(id => 
        this.invalidateCommunity(id)
      );
      
      await Promise.all(invalidationPromises);
      
    } catch (error) {
      console.error('Multiple community invalidation failed:', error);
    }
  }

  /**
   * Preload community page assets (icons, banners, top posts)
   */
  async preloadCommunityPage(communityId: string): Promise<void> {
    const preloadKey = `community-page-${communityId}`;
    
    // Avoid duplicate preloading
    if (this.preloadQueue.has(preloadKey)) {
      return this.preloadQueue.get(preloadKey);
    }

    const preloadPromise = this.executePagePreload(communityId);
    this.preloadQueue.set(preloadKey, preloadPromise);
    
    try {
      await preloadPromise;
    } finally {
      this.preloadQueue.delete(preloadKey);
    }
  }

  /**
   * Execute community page preload
   */
  private async executePagePreload(communityId: string): Promise<void> {
    try {
      // Fetch community data first
      const communityData = await this.getCommunityData(communityId);
      if (!communityData) return;

      const assetsToPreload: CommunityAsset[] = [];

      // Add community assets
      if (communityData.iconUrl) {
        assetsToPreload.push({
          type: 'icon',
          url: communityData.iconUrl,
          size: await this.estimateAssetSize(communityData.iconUrl),
          priority: 1
        });
      }

      if (communityData.bannerUrl) {
        assetsToPreload.push({
          type: 'banner',
          url: communityData.bannerUrl,
          size: await this.estimateAssetSize(communityData.bannerUrl),
          priority: 2
        });
      }

      // Preload top posts data
      if (this.config.bundledPreload.includeAssets.includes('topPosts')) {
        await this.preloadTopPosts(communityId);
      }

      // Preload related community icons
      if (communityData.relatedCommunities) {
        await this.batchPreloadRelatedIcons(
          communityData.relatedCommunities,
          1024 * 1024 // 1MB limit for related icons
        );
      }

      // Preload collected assets
      if (assetsToPreload.length > 0) {
        await this.preloadAssets(assetsToPreload);
      }

      console.log(`Community page preload completed for: ${communityId}`);
      
    } catch (error) {
      console.error(`Community page preload failed for ${communityId}:`, error);
    }
  }

  /**
   * Handle community response and trigger preloading
   */
  private async handleCommunityResponse(communityData: any, options: any): Promise<void> {
    try {
      if (communityData.id) {
        // Trigger bundled preload for related communities
        if (communityData.relatedCommunities && communityData.relatedCommunities.length > 0) {
          // Don't await - run in background
          this.bundledPreload(communityData.relatedCommunities.slice(0, 3));
        }

        // Preload community assets if not already cached
        if (options.includeAssets !== false) {
          this.preloadCommunityAssets(communityData);
        }
      }
    } catch (error) {
      console.error('Failed to handle community response:', error);
    }
  }

  /**
   * Preload community assets
   */
  private async preloadCommunityAssets(communityData: CommunityData): Promise<void> {
    try {
      const assets: CommunityAsset[] = [];

      if (communityData.iconUrl) {
        assets.push({
          type: 'icon',
          url: communityData.iconUrl,
          size: await this.estimateAssetSize(communityData.iconUrl),
          priority: 1
        });
      }

      if (communityData.bannerUrl) {
        assets.push({
          type: 'banner',
          url: communityData.bannerUrl,
          size: await this.estimateAssetSize(communityData.bannerUrl),
          priority: 2
        });
      }

      if (assets.length > 0) {
        await this.preloadAssets(assets);
      }
    } catch (error) {
      console.error('Community assets preload failed:', error);
    }
  }

  /**
   * Create preload batches within size limits
   */
  private async createPreloadBatches(communityIds: string[]): Promise<PreloadBatch[]> {
    const batches: PreloadBatch[] = [];
    let currentBatch: PreloadBatch = {
      communityIds: [],
      assets: [],
      totalSize: 0
    };

    for (const communityId of communityIds.slice(0, this.config.bundledPreload.maxCommunities)) {
      const communityAssets = await this.getCommunityAssets(communityId);
      const batchSize = communityAssets.reduce((sum, asset) => sum + asset.size, 0);

      if (currentBatch.totalSize + batchSize > this.config.bundledPreload.sizeLimit) {
        // Start new batch
        if (currentBatch.communityIds.length > 0) {
          batches.push(currentBatch);
        }
        currentBatch = {
          communityIds: [communityId],
          assets: communityAssets,
          totalSize: batchSize
        };
      } else {
        // Add to current batch
        currentBatch.communityIds.push(communityId);
        currentBatch.assets.push(...communityAssets);
        currentBatch.totalSize += batchSize;
      }
    }

    // Add final batch
    if (currentBatch.communityIds.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Process a preload batch
   */
  private async processBatch(batch: PreloadBatch): Promise<void> {
    try {
      // Sort assets by priority
      const sortedAssets = batch.assets.sort((a, b) => a.priority - b.priority);
      
      // Preload assets
      await this.preloadAssets(sortedAssets);
      
      console.log(`Processed batch: ${batch.communityIds.length} communities, ${batch.totalSize} bytes`);
      
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }

  /**
   * Preload assets with caching
   */
  private async preloadAssets(assets: CommunityAsset[]): Promise<void> {
    try {
      const preloadPromises = assets.map(async (asset) => {
        try {
          await serviceWorkerCacheService.fetchWithStrategy(
            asset.url,
            'CacheFirst',
            {
              tags: ['community-asset', `asset-${asset.type}`],
              maxAge: 86400 * 1000 // 24 hours for assets
            }
          );
        } catch (error) {
          console.warn(`Failed to preload asset: ${asset.url}`, error);
        }
      });

      await Promise.all(preloadPromises);
      
    } catch (error) {
      console.error('Asset preload failed:', error);
    }
  }

  /**
   * Get community assets for preloading
   */
  private async getCommunityAssets(communityId: string): Promise<CommunityAsset[]> {
    try {
      const communityData = await this.getCommunityData(communityId);
      if (!communityData) return [];

      const assets: CommunityAsset[] = [];

      if (communityData.iconUrl) {
        assets.push({
          type: 'icon',
          url: communityData.iconUrl,
          size: await this.estimateAssetSize(communityData.iconUrl),
          priority: 1
        });
      }

      if (communityData.bannerUrl) {
        assets.push({
          type: 'banner',
          url: communityData.bannerUrl,
          size: await this.estimateAssetSize(communityData.bannerUrl),
          priority: 2
        });
      }

      return assets;
    } catch (error) {
      console.error(`Failed to get assets for community ${communityId}:`, error);
      return [];
    }
  }

  /**
   * Get community data from cache or API
   */
  private async getCommunityData(communityId: string): Promise<CommunityData | null> {
    try {
      const response = await this.fetchCommunityData(`/api/communities/${communityId}`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch (error) {
      console.error(`Failed to get community data for ${communityId}:`, error);
      return null;
    }
  }

  /**
   * Get community icon URL
   */
  private async getCommunityIconUrl(communityId: string): Promise<string | null> {
    try {
      const communityData = await this.getCommunityData(communityId);
      return communityData?.iconUrl || null;
    } catch (error) {
      console.error(`Failed to get icon URL for community ${communityId}:`, error);
      return null;
    }
  }

  /**
   * Preload top posts for a community
   */
  private async preloadTopPosts(communityId: string): Promise<void> {
    try {
      const topPostsUrl = `/api/communities/${communityId}/posts?sort=top&limit=5`;
      
      await serviceWorkerCacheService.fetchWithStrategy(
        topPostsUrl,
        'StaleWhileRevalidate',
        {
          tags: [`community-posts-${communityId}`, 'top-posts'],
          maxAge: this.config.maxAgeSeconds * 1000
        }
      );
      
    } catch (error) {
      console.error(`Failed to preload top posts for community ${communityId}:`, error);
    }
  }

  /**
   * Estimate asset size
   */
  private async estimateAssetSize(url: string): Promise<number> {
    // Check cache first
    if (this.assetSizeCache.has(url)) {
      return this.assetSizeCache.get(url)!;
    }

    try {
      // Make HEAD request to get content-length
      const response = await fetch(url, { method: 'HEAD' });
      const contentLength = response.headers.get('content-length');
      
      let size = 0;
      if (contentLength) {
        size = parseInt(contentLength, 10);
      } else {
        // Fallback estimation based on file type
        if (url.includes('.svg')) size = 2048; // 2KB
        else if (url.includes('.png') || url.includes('.jpg')) size = 51200; // 50KB
        else size = 10240; // 10KB default
      }

      this.assetSizeCache.set(url, size);
      return size;
      
    } catch (error) {
      // Fallback size estimation
      const fallbackSize = 25600; // 25KB
      this.assetSizeCache.set(url, fallbackSize);
      return fallbackSize;
    }
  }

  /**
   * Build community URL with parameters
   */
  private buildCommunityUrl(endpoint: string, options: any): string {
    const url = new URL(endpoint, window.location.origin);
    
    if (options.includeAssets) {
      url.searchParams.set('includeAssets', 'true');
    }
    
    return url.toString();
  }

  /**
   * Generate cache key for community data
   */
  private generateCommunityCacheKey(url: string, options: any): string {
    const baseKey = url;
    const userScope = options.userId || '';
    return userScope ? `${userScope}:${baseKey}` : baseKey;
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    this.preloadQueue.clear();
    this.assetSizeCache.clear();
  }
}

// Export singleton instance
export const communityCacheStrategy = new CommunityCacheStrategy();

export default CommunityCacheStrategy;