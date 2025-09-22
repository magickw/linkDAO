/**
 * Intelligent Cache Integration Service
 * Orchestrates all caching services for optimal performance
 */

import { IntelligentCacheManager } from './intelligentCacheService';
import { ImageOptimizationService } from './imageOptimizationService';
import { ServiceWorkerCacheService } from './serviceWorkerCacheService';
import { 
  communityIconsCache, 
  previewContentCache, 
  userProfileCache,
  cacheInvalidationService 
} from './communityCache';

interface CacheIntegrationConfig {
  enablePredictivePreloading: boolean;
  enableImageOptimization: boolean;
  enableServiceWorkerCache: boolean;
  maxMemoryUsage: number; // in bytes
  preloadingStrategy: 'aggressive' | 'conservative' | 'adaptive';
  networkAwarePreloading: boolean;
}

interface CachePerformanceMetrics {
  totalCacheHits: number;
  totalCacheMisses: number;
  averageResponseTime: number;
  memoryUsage: number;
  networkSavings: number;
  preloadSuccessRate: number;
  imageOptimizationSavings: number;
}

/**
 * Main cache integration service
 */
export class IntelligentCacheIntegration {
  private intelligentCache: IntelligentCacheManager;
  private imageOptimization: ImageOptimizationService;
  private serviceWorkerCache: ServiceWorkerCacheService;
  private config: CacheIntegrationConfig;
  private performanceMetrics: CachePerformanceMetrics;
  private isInitialized = false;

  constructor(config: Partial<CacheIntegrationConfig> = {}) {
    this.config = {
      enablePredictivePreloading: true,
      enableImageOptimization: true,
      enableServiceWorkerCache: true,
      maxMemoryUsage: 100 * 1024 * 1024, // 100MB
      preloadingStrategy: 'adaptive',
      networkAwarePreloading: true,
      ...config
    };

    this.performanceMetrics = {
      totalCacheHits: 0,
      totalCacheMisses: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      networkSavings: 0,
      preloadSuccessRate: 0,
      imageOptimizationSavings: 0
    };

    this.intelligentCache = new IntelligentCacheManager();
    this.imageOptimization = new ImageOptimizationService();
    this.serviceWorkerCache = new ServiceWorkerCacheService();

    this.initialize();
  }

  /**
   * Initialize all caching services
   */
  private async initialize(): Promise<void> {
    try {
      // Setup network listeners
      this.serviceWorkerCache.setupNetworkListeners();

      // Setup cache invalidation listeners
      this.setupCacheInvalidationListeners();

      // Setup performance monitoring
      this.setupPerformanceMonitoring();

      // Preload critical resources
      await this.preloadCriticalResources();

      this.isInitialized = true;
      console.log('Intelligent cache integration initialized');
    } catch (error) {
      console.warn('Failed to initialize cache integration:', error);
    }
  }

  /**
   * Setup cache invalidation listeners
   */
  private setupCacheInvalidationListeners(): void {
    // Listen for real-time updates
    window.addEventListener('websocket-message', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { type, data } = customEvent.detail;
      
      // Handle cache invalidation based on real-time updates
      cacheInvalidationService.handleRealTimeUpdate({ type, data });
    });

    // Listen for user actions that should invalidate cache
    window.addEventListener('user-action', (event: Event) => {
      const customEvent = event as CustomEvent;
      const { action, target } = customEvent.detail;
      
      this.handleUserActionCacheInvalidation(action, target);
    });
  }

  /**
   * Setup performance monitoring
   */
  private setupPerformanceMonitoring(): void {
    setInterval(() => {
      this.updatePerformanceMetrics();
    }, 30000); // Update every 30 seconds

    // Monitor memory usage
    if ('memory' in performance) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 60000); // Check every minute
    }
  }

  /**
   * Preload critical resources for community enhancements
   */
  private async preloadCriticalResources(): Promise<void> {
    const criticalResources = [
      '/api/communities/popular',
      '/api/users/current/communities',
      '/api/governance/active-proposals',
      '/static/icons/default-community.svg',
      '/static/icons/default-avatar.svg'
    ];

    if (this.config.enableServiceWorkerCache) {
      await this.serviceWorkerCache.preloadCriticalResources(criticalResources);
    }
  }

  /**
   * Analyze user behavior and trigger predictive preloading
   */
  analyzeUserBehavior(userId: string, action: string, target: string): void {
    if (!this.config.enablePredictivePreloading || !this.isInitialized) {
      return;
    }

    // Track user behavior for predictive preloading
    this.intelligentCache.analyzeUserBehavior(userId, action, target);

    // Trigger specific preloading based on action
    this.triggerContextualPreloading(action, target);
  }

  /**
   * Trigger contextual preloading based on user action
   */
  private async triggerContextualPreloading(action: string, target: string): Promise<void> {
    switch (action) {
      case 'visit_community':
        await this.preloadCommunityContext(target);
        break;
      case 'view_post':
        await this.preloadPostContext(target);
        break;
      case 'open_profile':
        await this.preloadUserContext(target);
        break;
      case 'start_governance_voting':
        await this.preloadGovernanceContext();
        break;
    }
  }

  /**
   * Preload community context
   */
  private async preloadCommunityContext(communityId: string): Promise<void> {
    try {
      // Preload community data
      if (this.config.enableServiceWorkerCache) {
        await this.serviceWorkerCache.cacheCommunityData(communityId, {});
      }

      // Preload community icon with optimization
      if (this.config.enableImageOptimization) {
        const iconUrl = `/api/communities/${communityId}/icon`;
        await this.imageOptimization.preloadImage(iconUrl, {
          width: 64,
          height: 64,
          format: 'auto',
          priority: 'high'
        });
      }

      // Preload related communities
      const relatedCommunities = await this.getRelatedCommunities(communityId);
      await this.preloadRelatedCommunityIcons(relatedCommunities);

    } catch (error) {
      console.warn('Failed to preload community context:', error);
    }
  }

  /**
   * Preload post context
   */
  private async preloadPostContext(postId: string): Promise<void> {
    try {
      // Preload post comments
      const commentsUrl = `/api/posts/${postId}/comments`;
      
      // Preload related posts
      const relatedUrl = `/api/posts/${postId}/related`;
      
      // Preload author profile
      const post = await this.getCachedPost(postId);
      if (post?.authorId) {
        await this.preloadUserContext(post.authorId);
      }

      // Preload any preview content in the post
      if (post?.previewUrls) {
        await this.preloadPreviewContent(post.previewUrls);
      }

    } catch (error) {
      console.warn('Failed to preload post context:', error);
    }
  }

  /**
   * Preload user context
   */
  private async preloadUserContext(userId: string): Promise<void> {
    try {
      // Preload user profile
      if (this.config.enableServiceWorkerCache) {
        await this.serviceWorkerCache.preloadUserProfile(userId);
      }

      // Preload user avatar with optimization
      if (this.config.enableImageOptimization) {
        const avatarUrl = `/api/users/${userId}/avatar`;
        await this.imageOptimization.preloadImage(avatarUrl, {
          width: 48,
          height: 48,
          format: 'auto',
          priority: 'medium'
        });
      }

      // Preload mutual connections
      const currentUserId = await this.getCurrentUserId();
      if (currentUserId && currentUserId !== userId) {
        await userProfileCache.getMutualConnections(userId, currentUserId);
      }

    } catch (error) {
      console.warn('Failed to preload user context:', error);
    }
  }

  /**
   * Preload governance context
   */
  private async preloadGovernanceContext(): Promise<void> {
    try {
      // Preload active proposals
      const proposalsUrl = '/api/governance/active-proposals';
      
      // Preload user voting power
      const votingPowerUrl = '/api/governance/voting-power';
      
      // Preload proposal previews
      const proposals = await this.getCachedProposals();
      if (proposals) {
        for (const proposal of proposals) {
          if (proposal.previewUrl) {
            await previewContentCache.getPreview(proposal.previewUrl, 'proposal');
          }
        }
      }

    } catch (error) {
      console.warn('Failed to preload governance context:', error);
    }
  }

  /**
   * Optimize and cache community icon
   */
  async optimizeCommunityIcon(communityId: string, iconUrl: string): Promise<string> {
    if (!this.config.enableImageOptimization) {
      return iconUrl;
    }

    try {
      const optimizedUrl = await this.imageOptimization.optimizeCommunityIcon(iconUrl, {
        width: 64,
        height: 64,
        format: 'auto',
        quality: 0.8,
        placeholder: 'blur'
      });

      // Cache the optimized icon
      await communityIconsCache.preloadIcons([communityId]);

      return optimizedUrl;
    } catch (error) {
      console.warn('Failed to optimize community icon:', error);
      return iconUrl;
    }
  }

  /**
   * Setup lazy loading for community icons
   */
  setupCommunityIconLazyLoading(
    img: HTMLImageElement, 
    communityId: string, 
    iconUrl: string
  ): void {
    if (!this.config.enableImageOptimization) {
      img.src = iconUrl;
      return;
    }

    this.imageOptimization.setupLazyLoading(img, iconUrl, {
      width: 64,
      height: 64,
      format: 'auto',
      lazy: true,
      placeholder: 'blur',
      priority: 'medium'
    });
  }

  /**
   * Batch preload community icons
   */
  async batchPreloadCommunityIcons(communities: Array<{ id: string; iconUrl: string }>): Promise<void> {
    if (!this.config.enableImageOptimization) {
      return;
    }

    const images = communities.map(community => ({
      src: community.iconUrl,
      options: {
        width: 64,
        height: 64,
        format: 'auto' as const,
        priority: 'low' as const
      }
    }));

    await this.imageOptimization.batchPreloadImages(images);
  }

  /**
   * Cache preview content with intelligent strategy
   */
  async cachePreviewContent(url: string, type: 'nft' | 'proposal' | 'defi' | 'link'): Promise<any> {
    try {
      const preview = await previewContentCache.getPreview(url, type);
      
      if (preview && this.config.enableServiceWorkerCache) {
        await this.serviceWorkerCache.cachePreviewContent(url, type, preview);
      }
      
      return preview;
    } catch (error) {
      console.warn('Failed to cache preview content:', error);
      return null;
    }
  }

  /**
   * Queue offline action
   */
  async queueOfflineAction(type: string, data: any): Promise<void> {
    if (!this.config.enableServiceWorkerCache) {
      throw new Error('Service worker cache is disabled');
    }

    await this.serviceWorkerCache.queueOfflineAction({
      type: type as any,
      data
    });
  }

  /**
   * Handle user action cache invalidation
   */
  private handleUserActionCacheInvalidation(action: string, target: string): void {
    switch (action) {
      case 'post_created':
      case 'post_updated':
        cacheInvalidationService.invalidateUser(target);
        break;
      case 'community_joined':
      case 'community_left':
        cacheInvalidationService.invalidateCommunity(target);
        break;
      case 'profile_updated':
        cacheInvalidationService.invalidateUser(target);
        break;
    }
  }

  /**
   * Update performance metrics
   */
  private updatePerformanceMetrics(): void {
    // Get metrics from intelligent cache
    const intelligentMetrics = this.intelligentCache.getCacheMetrics();
    
    // Get metrics from image optimization
    const imageStats = this.imageOptimization.getCacheStats();
    
    // Get metrics from community caches
    const cacheStats = cacheInvalidationService.getAllStats();

    // Update combined metrics
    this.performanceMetrics = {
      totalCacheHits: intelligentMetrics.networkSavings,
      totalCacheMisses: 0, // Would need to track this
      averageResponseTime: intelligentMetrics.averageResponseTime,
      memoryUsage: intelligentMetrics.memoryUsage + imageStats.totalSize,
      networkSavings: intelligentMetrics.networkSavings,
      preloadSuccessRate: 0, // Would need to track this
      imageOptimizationSavings: imageStats.totalSize
    };
  }

  /**
   * Check memory usage and cleanup if needed
   */
  private checkMemoryUsage(): void {
    if (this.performanceMetrics.memoryUsage > this.config.maxMemoryUsage) {
      console.log('Memory usage high, triggering cleanup');
      this.performMemoryCleanup();
    }
  }

  /**
   * Perform memory cleanup
   */
  private performMemoryCleanup(): void {
    // Clear least recently used items from caches
    // This would integrate with the LRU eviction in individual caches
    
    // Clear image optimization cache
    this.imageOptimization.clearCache();
    
    // Clear preview cache
    previewContentCache.cleanup();
    
    // Clear user profile cache
    userProfileCache.cleanup();
  }

  /**
   * Helper methods for getting cached data
   */
  private async getRelatedCommunities(communityId: string): Promise<string[]> {
    // This would fetch related communities from API or cache
    return [];
  }

  private async getCachedPost(postId: string): Promise<any> {
    // This would get post from cache
    return null;
  }

  private async getCurrentUserId(): Promise<string | null> {
    // This would get current user ID
    return null;
  }

  private async getCachedProposals(): Promise<any[]> {
    // This would get proposals from cache
    return [];
  }

  private async preloadRelatedCommunityIcons(communityIds: string[]): Promise<void> {
    // This would preload icons for related communities
  }

  private async preloadPreviewContent(urls: string[]): Promise<void> {
    // This would preload preview content for URLs
  }

  /**
   * Get current performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  /**
   * Get cache statistics
   */
  async getCacheStatistics(): Promise<{
    intelligent: any;
    images: any;
    serviceWorker: any;
    community: any;
  }> {
    return {
      intelligent: this.intelligentCache.getCacheMetrics(),
      images: this.imageOptimization.getCacheStats(),
      serviceWorker: await this.serviceWorkerCache.getCacheStats(),
      community: cacheInvalidationService.getAllStats()
    };
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    this.intelligentCache.reset();
    this.imageOptimization.clearCache();
    await this.serviceWorkerCache.clearAllCaches();
    
    // Clear community caches
    communityIconsCache.invalidateIcon('*');
    previewContentCache.cleanup();
    userProfileCache.cleanup();
  }

  /**
   * Update cache configuration
   */
  updateConfiguration(newConfig: Partial<CacheIntegrationConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Check if system is ready
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Destroy all services and cleanup
   */
  destroy(): void {
    this.intelligentCache.destroy();
    this.imageOptimization.destroy();
    this.serviceWorkerCache.destroy();
  }
}

// Export singleton instance
export const intelligentCacheIntegration = new IntelligentCacheIntegration();
export default IntelligentCacheIntegration;