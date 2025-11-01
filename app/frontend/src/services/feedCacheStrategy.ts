/**
 * Feed Caching Strategy Implementation
 * Implements NetworkFirst strategy with predictive preloading and tag-based invalidation
 */

import { serviceWorkerCacheService } from './serviceWorkerCacheService';

interface FeedCacheConfig {
  cacheName: string;
  networkTimeoutSeconds: number;
  maxEntries: number;
  maxAgeSeconds: number;
  preloadConfig: {
    enabled: boolean;
    triggerDistance: number; // screens
    maxPreloadItems: number;
  };
}

interface FeedItem {
  id: string;
  content: string;
  mediaUrls?: string[];
  thumbnailUrls?: string[];
  author: string;
  timestamp: number;
  tags: string[];
}

interface PreloadContext {
  currentPage: number;
  scrollPosition: number;
  viewportHeight: number;
  totalHeight: number;
}

export class FeedCacheStrategy {
  private readonly config: FeedCacheConfig = {
    cacheName: 'feed-cache-v1',
    networkTimeoutSeconds: 3,
    maxEntries: 200,
    maxAgeSeconds: 300, // 5 minutes
    preloadConfig: {
      enabled: true,
      triggerDistance: 2, // screens
      maxPreloadItems: 10
    }
  };

  private broadcastChannel: BroadcastChannel | null = null;
  private preloadQueue: Set<string> = new Set();
  private isPreloading = false;

  constructor() {
    this.initializeBroadcastChannel();
  }

  /**
   * Initialize BroadcastChannel for content update notifications
   */
  private initializeBroadcastChannel(): void {
    if ('BroadcastChannel' in window) {
      this.broadcastChannel = new BroadcastChannel('feed-updates');
      this.broadcastChannel.addEventListener('message', this.handleBroadcastMessage.bind(this));
    }
  }

  /**
   * Fetch feed data with NetworkFirst strategy and background refresh
   */
  async fetchFeedData(
    endpoint: string,
    options: {
      page?: number;
      limit?: number;
      tags?: string[];
      userId?: string;
    } = {}
  ): Promise<Response> {
    const url = this.buildFeedUrl(endpoint, options);
    const cacheKey = this.generateFeedCacheKey(url, options);

    try {
      // Use NetworkFirst strategy with background refresh
      const response = await serviceWorkerCacheService.fetchWithStrategy(
        url,
        'NetworkFirst',
        {
          networkTimeoutSeconds: this.config.networkTimeoutSeconds,
          maxAge: this.config.maxAgeSeconds * 1000,
          tags: ['feed', ...(options.tags || [])],
          userScope: options.userId
        }
      );

      // Parse response to extract feed items for preloading
      if (response.ok) {
        const feedData = await response.clone().json();
        await this.handleFeedResponse(feedData, options);
      }

      return response;
    } catch (error) {
      console.error('Feed fetch failed:', error);
      throw error;
    }
  }

  /**
   * Implement predictive preloading for next page URLs and media thumbnails
   */
  async predictivePreload(context: PreloadContext): Promise<void> {
    if (!this.config.preloadConfig.enabled || this.isPreloading) {
      return;
    }

    const shouldPreload = this.shouldTriggerPreload(context);
    if (!shouldPreload) {
      return;
    }

    this.isPreloading = true;

    try {
      // Preload next page
      await this.preloadNextPage(context.currentPage + 1);
      
      // Preload media thumbnails for upcoming content
      await this.preloadMediaThumbnails();
      
    } catch (error) {
      console.error('Predictive preload failed:', error);
    } finally {
      this.isPreloading = false;
    }
  }

  /**
   * Invalidate feed cache entries by tags
   */
  async invalidateByTag(tag: string): Promise<void> {
    try {
      await serviceWorkerCacheService.invalidateByTag(tag);
      
      // Notify other tabs about the invalidation
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'CACHE_INVALIDATED',
          tag,
          timestamp: Date.now()
        });
      }
      
      console.log(`Feed cache invalidated for tag: ${tag}`);
    } catch (error) {
      console.error('Feed cache invalidation failed:', error);
    }
  }

  /**
   * Invalidate specific feed items
   */
  async invalidateFeedItems(itemIds: string[]): Promise<void> {
    try {
      const invalidationPromises = itemIds.map(id => 
        this.invalidateByTag(`feed-item-${id}`)
      );
      
      await Promise.all(invalidationPromises);
      
      // Notify about content updates
      if (this.broadcastChannel) {
        this.broadcastChannel.postMessage({
          type: 'FEED_ITEMS_UPDATED',
          itemIds,
          timestamp: Date.now()
        });
      }
      
    } catch (error) {
      console.error('Feed item invalidation failed:', error);
    }
  }

  /**
   * Handle new content notifications via BroadcastChannel
   */
  private handleBroadcastMessage(event: MessageEvent): void {
    const { type, data } = event.data;
    
    switch (type) {
      case 'NEW_FEED_CONTENT':
        this.handleNewContent(data);
        break;
      case 'FEED_ITEM_DELETED':
        this.handleContentDeletion(data);
        break;
      case 'FEED_ITEM_UPDATED':
        this.handleContentUpdate(data);
        break;
    }
  }

  /**
   * Handle new content availability
   */
  private async handleNewContent(data: { items: FeedItem[] }): Promise<void> {
    try {
      // Invalidate relevant cache entries
      await this.invalidateByTag('feed-latest');
      
      // Preload new content media
      for (const item of data.items) {
        if (item.thumbnailUrls) {
          await this.preloadMediaUrls(item.thumbnailUrls);
        }
      }
      
      // Notify UI components about new content
      this.notifyUIComponents('NEW_CONTENT_AVAILABLE', {
        count: data.items.length,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to handle new content:', error);
    }
  }

  /**
   * Handle content deletion
   */
  private async handleContentDeletion(data: { itemId: string }): Promise<void> {
    try {
      await this.invalidateByTag(`feed-item-${data.itemId}`);
      
      this.notifyUIComponents('CONTENT_DELETED', {
        itemId: data.itemId,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to handle content deletion:', error);
    }
  }

  /**
   * Handle content updates
   */
  private async handleContentUpdate(data: { itemId: string; changes: any }): Promise<void> {
    try {
      await this.invalidateByTag(`feed-item-${data.itemId}`);
      
      this.notifyUIComponents('CONTENT_UPDATED', {
        itemId: data.itemId,
        changes: data.changes,
        timestamp: Date.now()
      });
      
    } catch (error) {
      console.error('Failed to handle content update:', error);
    }
  }

  /**
   * Build feed URL with parameters
   */
  private buildFeedUrl(endpoint: string, options: any): string {
    const url = new URL(endpoint, window.location.origin);
    
    if (options.page) url.searchParams.set('page', options.page.toString());
    if (options.limit) url.searchParams.set('limit', options.limit.toString());
    if (options.tags) url.searchParams.set('tags', options.tags.join(','));
    
    return url.toString();
  }

  /**
   * Generate cache key for feed data
   */
  private generateFeedCacheKey(url: string, options: any): string {
    const baseKey = url;
    const userScope = options.userId || '';
    return userScope ? `${userScope}:${baseKey}` : baseKey;
  }

  /**
   * Handle feed response and extract preload opportunities
   */
  private async handleFeedResponse(feedData: any, options: any): Promise<void> {
    try {
      if (feedData.items && Array.isArray(feedData.items)) {
        // Extract media URLs for preloading
        const mediaUrls: string[] = [];
        const thumbnailUrls: string[] = [];
        
        for (const item of feedData.items) {
          if (item.mediaUrls) {
            mediaUrls.push(...item.mediaUrls);
          }
          if (item.thumbnailUrls) {
            thumbnailUrls.push(...item.thumbnailUrls);
          }
        }
        
        // Preload thumbnails immediately
        if (thumbnailUrls.length > 0) {
          await this.preloadMediaUrls(thumbnailUrls.slice(0, 5)); // Limit initial preload
        }
      }
    } catch (error) {
      console.error('Failed to handle feed response:', error);
    }
  }

  /**
   * Determine if preloading should be triggered
   */
  private shouldTriggerPreload(context: PreloadContext): boolean {
    const scrollPercentage = context.scrollPosition / (context.totalHeight - context.viewportHeight);
    const triggerPoint = 1 - (this.config.preloadConfig.triggerDistance * context.viewportHeight / context.totalHeight);
    
    return scrollPercentage >= triggerPoint;
  }

  /**
   * Preload next page of feed content
   */
  private async preloadNextPage(nextPage: number): Promise<void> {
    try {
      const nextPageUrl = this.buildFeedUrl('/api/feed', { page: nextPage });
      
      if (this.preloadQueue.has(nextPageUrl)) {
        return; // Already preloading or preloaded
      }
      
      this.preloadQueue.add(nextPageUrl);
      
      // Fetch and cache next page
      await serviceWorkerCacheService.fetchWithStrategy(
        nextPageUrl,
        'NetworkFirst',
        {
          networkTimeoutSeconds: this.config.networkTimeoutSeconds,
          tags: ['feed', 'preload'],
          maxAge: this.config.maxAgeSeconds * 1000
        }
      );
      
      console.log(`Preloaded feed page ${nextPage}`);
      
    } catch (error) {
      console.error(`Failed to preload page ${nextPage}:`, error);
    }
  }

  /**
   * Preload media thumbnails
   */
  private async preloadMediaThumbnails(): Promise<void> {
    try {
      // Get upcoming media URLs from cache metadata
      const upcomingUrls = await this.getUpcomingMediaUrls();
      
      if (upcomingUrls.length > 0) {
        await this.preloadMediaUrls(
          upcomingUrls.slice(0, this.config.preloadConfig.maxPreloadItems)
        );
      }
      
    } catch (error) {
      console.error('Failed to preload media thumbnails:', error);
    }
  }

  /**
   * Preload specific media URLs
   */
  private async preloadMediaUrls(urls: string[]): Promise<void> {
    try {
      const preloadPromises = urls.map(async (url) => {
        if (this.preloadQueue.has(url)) {
          return; // Already preloading
        }
        
        this.preloadQueue.add(url);
        
        try {
          await serviceWorkerCacheService.fetchWithStrategy(
            url,
            'CacheFirst',
            {
              tags: ['media', 'preload'],
              maxAge: 86400 * 1000 // 24 hours for media
            }
          );
        } catch (error) {
          console.warn(`Failed to preload media: ${url}`, error);
        }
      });
      
      await Promise.all(preloadPromises);
      
    } catch (error) {
      console.error('Media preload failed:', error);
    }
  }

  /**
   * Get upcoming media URLs from cached feed data
   */
  private async getUpcomingMediaUrls(): Promise<string[]> {
    // This would typically analyze cached feed data to extract media URLs
    // For now, return empty array as placeholder
    return [];
  }

  /**
   * Notify UI components about cache events
   */
  private notifyUIComponents(type: string, data: any): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.postMessage({
        type: `UI_${type}`,
        data,
        timestamp: Date.now()
      });
    }
    
    // Also dispatch custom event for components that don't use BroadcastChannel
    window.dispatchEvent(new CustomEvent('feedCacheUpdate', {
      detail: { type, data }
    }));
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.broadcastChannel) {
      this.broadcastChannel.close();
      this.broadcastChannel = null;
    }
    
    this.preloadQueue.clear();
  }
}

// Export singleton instance
export const feedCacheStrategy = new FeedCacheStrategy();

export default FeedCacheStrategy;