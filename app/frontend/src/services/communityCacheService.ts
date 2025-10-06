/**
 * Community Cache Service
 * Implements community-specific cache strategies with intelligent preloading
 */

import { Community } from '../models/Community';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  tags: string[];
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  strategy: 'lru' | 'lfu' | 'ttl';
}

interface PredictiveLoadingConfig {
  enabled: boolean;
  threshold: number; // User engagement threshold for preloading
  maxPredictions: number;
}

export class CommunityCacheService {
  private cache = new Map<string, CacheEntry<any>>();
  private config: CacheConfig;
  private predictiveConfig: PredictiveLoadingConfig;
  private userBehaviorData = new Map<string, any>();

  constructor(config?: Partial<CacheConfig & PredictiveLoadingConfig>) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      strategy: 'lru',
      ...config
    };

    this.predictiveConfig = {
      enabled: true,
      threshold: 0.7,
      maxPredictions: 10,
      ...config
    };

    // Start cleanup interval
    this.startCleanupInterval();
  }

  /**
   * Get item from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();

    return entry.data;
  }

  /**
   * Set item in cache
   */
  set<T>(key: string, data: T, options?: {
    ttl?: number;
    tags?: string[];
  }): void {
    const ttl = options?.ttl || this.config.defaultTTL;
    const tags = options?.tags || [];

    // Ensure cache size limit
    if (this.cache.size >= this.config.maxSize) {
      this.evictItems();
    }

    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      tags,
      accessCount: 1,
      lastAccessed: Date.now()
    };

    this.cache.set(key, entry);
  }

  /**
   * Invalidate cache entries by tags
   */
  invalidateByTags(tags: string[]): void {
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const entries = Array.from(this.cache.values());
    const now = Date.now();
    
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      hitRate: this.calculateHitRate(),
      averageAge: entries.reduce((sum, entry) => sum + (now - entry.timestamp), 0) / entries.length,
      mostAccessed: this.getMostAccessedKeys(5),
      memoryUsage: this.estimateMemoryUsage()
    };
  }

  /**
   * Preload community data based on user behavior
   */
  async preloadCommunityData(userId: string, currentCommunityId: string): Promise<void> {
    if (!this.predictiveConfig.enabled) return;

    const predictions = await this.predictNextCommunities(userId, currentCommunityId);
    
    for (const prediction of predictions) {
      await this.preloadCommunity(prediction.communityId, prediction.priority);
    }
  }

  /**
   * Cache community with optimized strategy
   */
  cacheCommunity(community: Community, options?: {
    priority?: 'high' | 'medium' | 'low';
    preloadRelated?: boolean;
  }): void {
    const priority = options?.priority || 'medium';
    const ttl = this.getTTLByPriority(priority);
    
    // Cache main community data
    this.set(`community:${community.id}`, community, {
      ttl,
      tags: ['community', `community:${community.id}`, `category:${community.category}`]
    });

    // Cache community stats
    this.set(`community:${community.id}:stats`, {
      memberCount: community.memberCount,
      // Add other stats as needed
    }, {
      ttl: ttl / 2, // Stats expire faster
      tags: ['community-stats', `community:${community.id}`]
    });

    // Preload related communities if requested
    if (options?.preloadRelated) {
      this.preloadRelatedCommunities(community);
    }
  }

  /**
   * Cache community posts with intelligent pagination
   */
  cacheCommunityPosts(communityId: string, posts: any[], page: number, sort: string): void {
    const key = `community:${communityId}:posts:${sort}:page:${page}`;
    
    this.set(key, posts, {
      ttl: 2 * 60 * 1000, // 2 minutes for posts
      tags: ['community-posts', `community:${communityId}`, `posts:${sort}`]
    });

    // Cache individual posts for faster access
    posts.forEach(post => {
      this.set(`post:${post.id}`, post, {
        ttl: 5 * 60 * 1000,
        tags: ['post', `community:${communityId}`, `post:${post.id}`]
      });
    });
  }

  /**
   * Cache community members with role-based TTL
   */
  cacheCommunityMembers(communityId: string, members: any[], filters: any): void {
    const key = `community:${communityId}:members:${JSON.stringify(filters)}`;
    
    this.set(key, members, {
      ttl: 10 * 60 * 1000, // 10 minutes for members
      tags: ['community-members', `community:${communityId}`]
    });
  }

  /**
   * Optimize image caching for community assets
   */
  cacheImageMetadata(imageUrl: string, metadata: {
    optimizedUrl?: string;
    dimensions?: { width: number; height: number };
    format?: string;
    size?: number;
  }): void {
    this.set(`image:${imageUrl}`, metadata, {
      ttl: 60 * 60 * 1000, // 1 hour for image metadata
      tags: ['image-metadata']
    });
  }

  /**
   * Track user behavior for predictive loading
   */
  trackUserBehavior(userId: string, action: string, context: any): void {
    const userKey = `user:${userId}:behavior`;
    const existing = this.userBehaviorData.get(userKey) || {
      actions: [],
      patterns: {},
      lastUpdated: Date.now()
    };

    existing.actions.push({
      action,
      context,
      timestamp: Date.now()
    });

    // Keep only recent actions (last 100)
    if (existing.actions.length > 100) {
      existing.actions = existing.actions.slice(-100);
    }

    // Update patterns
    this.updateUserPatterns(existing, action, context);
    
    existing.lastUpdated = Date.now();
    this.userBehaviorData.set(userKey, existing);
  }

  /**
   * Warm cache with frequently accessed data
   */
  async warmCache(communityIds: string[]): Promise<void> {
    const promises = communityIds.map(async (communityId) => {
      try {
        // Load community data
        const response = await fetch(`/api/communities/${communityId}`);
        if (response.ok) {
          const community = await response.json();
          this.cacheCommunity(community, { priority: 'high' });
        }

        // Load recent posts
        const postsResponse = await fetch(`/api/communities/${communityId}/posts?limit=20`);
        if (postsResponse.ok) {
          const postsData = await postsResponse.json();
          this.cacheCommunityPosts(communityId, postsData.posts, 1, 'hot');
        }
      } catch (error) {
        console.warn(`Failed to warm cache for community ${communityId}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  /**
   * Private methods
   */

  private evictItems(): void {
    const entries = Array.from(this.cache.entries());
    
    switch (this.config.strategy) {
      case 'lru':
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
        break;
      case 'lfu':
        entries.sort((a, b) => a[1].accessCount - b[1].accessCount);
        break;
      case 'ttl':
        entries.sort((a, b) => (a[1].timestamp + a[1].ttl) - (b[1].timestamp + b[1].ttl));
        break;
    }

    // Remove oldest 10% of entries
    const toRemove = Math.ceil(entries.length * 0.1);
    for (let i = 0; i < toRemove; i++) {
      this.cache.delete(entries[i][0]);
    }
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      const keysToDelete: string[] = [];

      for (const [key, entry] of this.cache.entries()) {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      }

      keysToDelete.forEach(key => this.cache.delete(key));
    }, 60 * 1000); // Cleanup every minute
  }

  private calculateHitRate(): number {
    // This would need to be tracked separately in a real implementation
    return 0.85; // Mock hit rate
  }

  private getMostAccessedKeys(limit: number): string[] {
    const entries = Array.from(this.cache.entries());
    entries.sort((a, b) => b[1].accessCount - a[1].accessCount);
    return entries.slice(0, limit).map(([key]) => key);
  }

  private estimateMemoryUsage(): number {
    // Rough estimation - in a real implementation, this would be more accurate
    return this.cache.size * 1024; // Assume 1KB per entry on average
  }

  private getTTLByPriority(priority: string): number {
    switch (priority) {
      case 'high': return 15 * 60 * 1000; // 15 minutes
      case 'medium': return 5 * 60 * 1000; // 5 minutes
      case 'low': return 2 * 60 * 1000; // 2 minutes
      default: return this.config.defaultTTL;
    }
  }

  private async predictNextCommunities(userId: string, currentCommunityId: string): Promise<Array<{
    communityId: string;
    priority: 'high' | 'medium' | 'low';
    confidence: number;
  }>> {
    const userKey = `user:${userId}:behavior`;
    const behaviorData = this.userBehaviorData.get(userKey);
    
    if (!behaviorData) return [];

    // Simple prediction based on recent community visits
    const recentCommunities = behaviorData.actions
      .filter((action: any) => action.action === 'visit_community')
      .slice(-20)
      .map((action: any) => action.context.communityId);

    const predictions = [];
    const communityFrequency = new Map<string, number>();

    // Count frequency of community visits
    recentCommunities.forEach((communityId: string) => {
      if (communityId !== currentCommunityId) {
        communityFrequency.set(communityId, (communityFrequency.get(communityId) || 0) + 1);
      }
    });

    // Convert to predictions
    for (const [communityId, frequency] of communityFrequency.entries()) {
      const confidence = Math.min(frequency / recentCommunities.length, 1);
      
      if (confidence >= this.predictiveConfig.threshold) {
        predictions.push({
          communityId,
          priority: confidence > 0.8 ? 'high' : confidence > 0.6 ? 'medium' : 'low',
          confidence
        });
      }
    }

    return predictions
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, this.predictiveConfig.maxPredictions);
  }

  private async preloadCommunity(communityId: string, priority: 'high' | 'medium' | 'low'): Promise<void> {
    // Check if already cached
    if (this.get(`community:${communityId}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/communities/${communityId}`);
      if (response.ok) {
        const community = await response.json();
        this.cacheCommunity(community, { priority });
      }
    } catch (error) {
      console.warn(`Failed to preload community ${communityId}:`, error);
    }
  }

  private async preloadRelatedCommunities(community: Community): Promise<void> {
    try {
      // Find communities with similar tags or category
      const response = await fetch(`/api/communities/related/${community.id}?limit=5`);
      if (response.ok) {
        const relatedCommunities = await response.json();
        
        relatedCommunities.forEach((relatedCommunity: Community) => {
          this.cacheCommunity(relatedCommunity, { priority: 'low' });
        });
      }
    } catch (error) {
      console.warn('Failed to preload related communities:', error);
    }
  }

  private updateUserPatterns(behaviorData: any, action: string, context: any): void {
    if (!behaviorData.patterns[action]) {
      behaviorData.patterns[action] = {
        count: 0,
        contexts: new Map()
      };
    }

    behaviorData.patterns[action].count++;
    
    // Track context patterns
    const contextKey = JSON.stringify(context);
    const contextCount = behaviorData.patterns[action].contexts.get(contextKey) || 0;
    behaviorData.patterns[action].contexts.set(contextKey, contextCount + 1);
  }
}

// Export singleton instance
export const communityCacheService = new CommunityCacheService();