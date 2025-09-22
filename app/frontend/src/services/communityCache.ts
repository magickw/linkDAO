/**
 * Community Enhancement Caching Layer
 * Implements intelligent caching with LRU eviction strategy
 */

import { 
  EnhancedCommunityData, 
  UserProfile, 
  CacheConfig 
} from '../types/communityEnhancements';

// Cache entry interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  ttl: number;
}

// Cache statistics interface
interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

/**
 * Generic LRU Cache implementation
 */
class LRUCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private accessOrder = new Map<string, number>();
  private accessCounter = 0;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    size: 0,
    hitRate: 0
  };

  constructor(
    private maxSize: number,
    private defaultTTL: number = 5 * 60 * 1000 // 5 minutes
  ) {}

  /**
   * Get item from cache
   */
  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if entry has expired
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.misses++;
      this.stats.size--;
      this.updateHitRate();
      return null;
    }

    // Update access information
    entry.lastAccessed = Date.now();
    entry.accessCount++;
    this.accessOrder.set(key, ++this.accessCounter);
    
    this.stats.hits++;
    this.updateHitRate();
    return entry.data;
  }

  /**
   * Set item in cache
   */
  set(key: string, data: T, customTTL?: number): void {
    const ttl = customTTL || this.defaultTTL;
    const now = Date.now();

    // If key already exists, update it
    if (this.cache.has(key)) {
      const entry = this.cache.get(key)!;
      entry.data = data;
      entry.timestamp = now;
      entry.lastAccessed = now;
      entry.ttl = ttl;
      entry.accessCount++;
      this.accessOrder.set(key, ++this.accessCounter);
      return;
    }

    // Check if we need to evict
    if (this.cache.size >= this.maxSize) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      accessCount: 1,
      lastAccessed: now,
      ttl
    };

    this.cache.set(key, entry);
    this.accessOrder.set(key, ++this.accessCounter);
    this.stats.size++;
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.cache.delete(key);
      this.accessOrder.delete(key);
      this.stats.size--;
      return false;
    }
    
    return true;
  }

  /**
   * Delete item from cache
   */
  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.accessOrder.delete(key);
      this.stats.size--;
    }
    return deleted;
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.accessOrder.clear();
    this.stats.size = 0;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return { ...this.stats };
  }

  /**
   * Get all keys (for debugging)
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  /**
   * Cleanup expired entries
   */
  cleanup(): number {
    let cleaned = 0;
    const now = Date.now();

    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.cache.delete(key);
        this.accessOrder.delete(key);
        cleaned++;
      }
    }

    this.stats.size -= cleaned;
    return cleaned;
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestAccess = Infinity;

    for (const [key, accessTime] of this.accessOrder.entries()) {
      if (accessTime < oldestAccess) {
        oldestAccess = accessTime;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
      this.accessOrder.delete(oldestKey);
      this.stats.evictions++;
      this.stats.size--;
    }
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }
}

/**
 * Community Icons Cache Service
 */
export class CommunityIconsCache {
  private cache: LRUCache<string>;
  private preloadQueue = new Set<string>();
  private preloadInProgress = new Set<string>();

  constructor(config: CacheConfig = { maxSize: 200, ttl: 30 * 60 * 1000, strategy: 'lru' }) {
    this.cache = new LRUCache<string>(config.maxSize, config.ttl);
    
    // Start cleanup interval
    setInterval(() => this.cache.cleanup(), 60 * 1000); // Cleanup every minute
  }

  /**
   * Get community icon with intelligent preloading
   */
  async getIcon(communityId: string): Promise<string | null> {
    // Check cache first
    const cached = this.cache.get(communityId);
    if (cached) {
      return cached;
    }

    // If not in cache, fetch it
    try {
      const iconUrl = await this.fetchIcon(communityId);
      if (iconUrl) {
        this.cache.set(communityId, iconUrl);
        return iconUrl;
      }
    } catch (error) {
      console.warn(`Failed to fetch icon for community ${communityId}:`, error);
    }

    return null;
  }

  /**
   * Preload icons for a list of communities
   */
  async preloadIcons(communityIds: string[]): Promise<void> {
    const toPreload = communityIds.filter(id => 
      !this.cache.has(id) && 
      !this.preloadInProgress.has(id)
    );

    const preloadPromises = toPreload.map(async (communityId) => {
      this.preloadInProgress.add(communityId);
      try {
        const iconUrl = await this.fetchIcon(communityId);
        if (iconUrl) {
          this.cache.set(communityId, iconUrl, 60 * 60 * 1000); // Cache for 1 hour
        }
      } catch (error) {
        console.warn(`Failed to preload icon for community ${communityId}:`, error);
      } finally {
        this.preloadInProgress.delete(communityId);
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Invalidate specific community icon
   */
  invalidateIcon(communityId: string): void {
    this.cache.delete(communityId);
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  private async fetchIcon(communityId: string): Promise<string | null> {
    // This would typically make an API call
    // For now, return a placeholder or fetch from API
    try {
      const response = await fetch(`/api/communities/${communityId}/icon`);
      if (response.ok) {
        const data = await response.json();
        return data.iconUrl;
      }
    } catch (error) {
      console.error('Error fetching community icon:', error);
    }
    return null;
  }
}

/**
 * Preview Content Cache Service
 */
export class PreviewContentCache {
  private cache: LRUCache<any>;
  private pendingRequests = new Map<string, Promise<any>>();

  constructor(config: CacheConfig = { maxSize: 500, ttl: 15 * 60 * 1000, strategy: 'lru' }) {
    this.cache = new LRUCache<any>(config.maxSize, config.ttl);
    
    // Start cleanup interval
    setInterval(() => this.cache.cleanup(), 2 * 60 * 1000); // Cleanup every 2 minutes
  }

  /**
   * Get preview content with deduplication
   */
  async getPreview(url: string, type: 'nft' | 'proposal' | 'defi' | 'link'): Promise<any | null> {
    const cacheKey = `${type}:${url}`;
    
    // Check cache first
    const cached = this.cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    // Check if request is already in progress
    if (this.pendingRequests.has(cacheKey)) {
      return await this.pendingRequests.get(cacheKey);
    }

    // Create new request
    const requestPromise = this.fetchPreview(url, type);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const preview = await requestPromise;
      if (preview) {
        // Cache with different TTLs based on content type
        const ttl = this.getTTLForType(type);
        this.cache.set(cacheKey, preview, ttl);
      }
      return preview;
    } catch (error) {
      console.warn(`Failed to fetch ${type} preview for ${url}:`, error);
      return null;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  /**
   * Batch preload previews
   */
  async preloadPreviews(items: Array<{ url: string; type: 'nft' | 'proposal' | 'defi' | 'link' }>): Promise<void> {
    const preloadPromises = items.map(async ({ url, type }) => {
      const cacheKey = `${type}:${url}`;
      if (!this.cache.has(cacheKey) && !this.pendingRequests.has(cacheKey)) {
        try {
          await this.getPreview(url, type);
        } catch (error) {
          // Ignore preload errors
        }
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Invalidate preview cache for specific URL
   */
  invalidatePreview(url: string, type?: string): void {
    if (type) {
      this.cache.delete(`${type}:${url}`);
    } else {
      // Invalidate all types for this URL
      const types = ['nft', 'proposal', 'defi', 'link'];
      types.forEach(t => this.cache.delete(`${t}:${url}`));
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return this.cache.getStats();
  }

  private async fetchPreview(url: string, type: string): Promise<any | null> {
    try {
      const response = await fetch(`/api/previews/${type}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      });
      
      if (response.ok) {
        return await response.json();
      }
    } catch (error) {
      console.error(`Error fetching ${type} preview:`, error);
    }
    return null;
  }

  private getTTLForType(type: string): number {
    const ttlMap = {
      'nft': 30 * 60 * 1000,      // 30 minutes
      'proposal': 5 * 60 * 1000,   // 5 minutes (more dynamic)
      'defi': 2 * 60 * 1000,       // 2 minutes (very dynamic)
      'link': 60 * 60 * 1000       // 1 hour (static)
    };
    return ttlMap[type as keyof typeof ttlMap] || 15 * 60 * 1000;
  }
}

/**
 * User Profile Cache Service
 */
export class UserProfileCache {
  private cache: LRUCache<UserProfile>;
  private mutualConnectionsCache: LRUCache<number>;

  constructor(config: CacheConfig = { maxSize: 1000, ttl: 10 * 60 * 1000, strategy: 'lru' }) {
    this.cache = new LRUCache<UserProfile>(config.maxSize, config.ttl);
    this.mutualConnectionsCache = new LRUCache<number>(config.maxSize, config.ttl);
    
    // Start cleanup interval
    setInterval(() => {
      this.cache.cleanup();
      this.mutualConnectionsCache.cleanup();
    }, 60 * 1000);
  }

  /**
   * Get user profile with mutual connections
   */
  async getProfile(userId: string, currentUserId?: string): Promise<UserProfile | null> {
    // Check cache first
    const cached = this.cache.get(userId);
    if (cached) {
      // Update mutual connections if needed
      if (currentUserId && cached.mutualConnections === 0) {
        const mutualCount = await this.getMutualConnections(userId, currentUserId);
        cached.mutualConnections = mutualCount;
        this.cache.set(userId, cached); // Update cache
      }
      return cached;
    }

    // Fetch from API
    try {
      const profile = await this.fetchProfile(userId);
      if (profile && currentUserId) {
        profile.mutualConnections = await this.getMutualConnections(userId, currentUserId);
      }
      
      if (profile) {
        this.cache.set(userId, profile);
      }
      
      return profile;
    } catch (error) {
      console.warn(`Failed to fetch profile for user ${userId}:`, error);
      return null;
    }
  }

  /**
   * Get mutual connections count
   */
  async getMutualConnections(userId: string, currentUserId: string): Promise<number> {
    const cacheKey = `${currentUserId}:${userId}`;
    
    const cached = this.mutualConnectionsCache.get(cacheKey);
    if (cached !== null) {
      return cached;
    }

    try {
      const response = await fetch(`/api/users/${userId}/mutual-connections?currentUser=${currentUserId}`);
      if (response.ok) {
        const data = await response.json();
        const count = data.count || 0;
        this.mutualConnectionsCache.set(cacheKey, count);
        return count;
      }
    } catch (error) {
      console.warn(`Failed to fetch mutual connections:`, error);
    }

    return 0;
  }

  /**
   * Batch preload profiles
   */
  async preloadProfiles(userIds: string[], currentUserId?: string): Promise<void> {
    const toPreload = userIds.filter(id => !this.cache.has(id));
    
    const preloadPromises = toPreload.map(async (userId) => {
      try {
        await this.getProfile(userId, currentUserId);
      } catch (error) {
        // Ignore preload errors
      }
    });

    await Promise.allSettled(preloadPromises);
  }

  /**
   * Invalidate user profile
   */
  invalidateProfile(userId: string): void {
    this.cache.delete(userId);
    
    // Also invalidate mutual connections cache entries
    const keys = this.mutualConnectionsCache.keys();
    keys.forEach(key => {
      if (key.includes(userId)) {
        this.mutualConnectionsCache.delete(key);
      }
    });
  }

  /**
   * Update profile in cache
   */
  updateProfile(userId: string, updates: Partial<UserProfile>): void {
    const cached = this.cache.get(userId);
    if (cached) {
      const updated = { ...cached, ...updates };
      this.cache.set(userId, updated);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): { profiles: CacheStats; mutualConnections: CacheStats } {
    return {
      profiles: this.cache.getStats(),
      mutualConnections: this.mutualConnectionsCache.getStats()
    };
  }

  private async fetchProfile(userId: string): Promise<UserProfile | null> {
    try {
      const response = await fetch(`/api/users/${userId}/profile`);
      if (response.ok) {
        const data = await response.json();
        return {
          id: data.id,
          username: data.username,
          ensName: data.ens_name,
          avatar: data.avatar_url,
          reputation: data.reputation || 0,
          badges: data.badges || [],
          walletAddress: data.wallet_address || '',
          mutualConnections: 0, // Will be populated separately
          isFollowing: data.is_following || false
        };
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
    return null;
  }
}

/**
 * Cache Invalidation Service
 */
export class CacheInvalidationService {
  constructor(
    private iconCache: CommunityIconsCache,
    private previewCache: PreviewContentCache,
    private profileCache: UserProfileCache
  ) {}

  /**
   * Invalidate all caches for a community
   */
  invalidateCommunity(communityId: string): void {
    this.iconCache.invalidateIcon(communityId);
    // Could also invalidate related previews if needed
  }

  /**
   * Invalidate user-related caches
   */
  invalidateUser(userId: string): void {
    this.profileCache.invalidateProfile(userId);
  }

  /**
   * Invalidate preview caches for specific content
   */
  invalidatePreview(url: string, type?: string): void {
    this.previewCache.invalidatePreview(url, type);
  }

  /**
   * Handle real-time updates
   */
  handleRealTimeUpdate(event: { type: string; data: any }): void {
    switch (event.type) {
      case 'community_updated':
        this.invalidateCommunity(event.data.communityId);
        break;
      case 'user_updated':
        this.invalidateUser(event.data.userId);
        break;
      case 'proposal_updated':
        if (event.data.url) {
          this.invalidatePreview(event.data.url, 'proposal');
        }
        break;
      case 'nft_updated':
        if (event.data.url) {
          this.invalidatePreview(event.data.url, 'nft');
        }
        break;
    }
  }

  /**
   * Get combined cache statistics
   */
  getAllStats(): {
    icons: CacheStats;
    previews: CacheStats;
    profiles: { profiles: CacheStats; mutualConnections: CacheStats };
  } {
    return {
      icons: this.iconCache.getStats(),
      previews: this.previewCache.getStats(),
      profiles: this.profileCache.getStats()
    };
  }
}

// Export singleton instances
export const communityIconsCache = new CommunityIconsCache();
export const previewContentCache = new PreviewContentCache();
export const userProfileCache = new UserProfileCache();
export const cacheInvalidationService = new CacheInvalidationService(
  communityIconsCache,
  previewContentCache,
  userProfileCache
);