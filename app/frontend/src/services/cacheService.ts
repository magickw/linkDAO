interface CacheItem<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number; // Time to live in milliseconds
  cleanupInterval: number;
}

class IntelligentCache<T = any> {
  private cache = new Map<string, CacheItem<T>>();
  private config: CacheConfig;
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: config.maxSize || 1000,
      defaultTTL: config.defaultTTL || 5 * 60 * 1000, // 5 minutes
      cleanupInterval: config.cleanupInterval || 60 * 1000 // 1 minute
    };

    this.startCleanup();
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const expiresAt = now + (ttl || this.config.defaultTTL);

    // If cache is full, remove least recently used items
    if (this.cache.size >= this.config.maxSize) {
      this.evictLRU();
    }

    this.cache.set(key, {
      data,
      timestamp: now,
      expiresAt,
      accessCount: 0,
      lastAccessed: now
    });
  }

  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }

    const now = Date.now();
    
    // Check if expired
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    item.accessCount++;
    item.lastAccessed = now;

    return item.data;
  }

  has(key: string): boolean {
    const item = this.cache.get(key);
    if (!item) return false;

    const now = Date.now();
    if (now > item.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  // Get cache statistics
  getStats() {
    const now = Date.now();
    let expired = 0;
    let active = 0;

    for (const [, item] of this.cache) {
      if (now > item.expiresAt) {
        expired++;
      } else {
        active++;
      }
    }

    return {
      total: this.cache.size,
      active,
      expired,
      hitRate: this.calculateHitRate()
    };
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, item] of this.cache) {
      if (item.lastAccessed < oldestTime) {
        oldestTime = item.lastAccessed;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, item] of this.cache) {
      if (now > item.expiresAt) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  private calculateHitRate(): number {
    // This would need to be implemented with hit/miss tracking
    return 0;
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.clear();
  }
}

// Specialized caches for different data types
class UserCache extends IntelligentCache<any> {
  constructor() {
    super({
      maxSize: 500,
      defaultTTL: 10 * 60 * 1000, // 10 minutes for user data
      cleanupInterval: 2 * 60 * 1000 // 2 minutes
    });
  }

  setUser(userId: string, userData: any): void {
    this.set(`user:${userId}`, userData);
  }

  getUser(userId: string): any | null {
    return this.get(`user:${userId}`);
  }

  setUserPosts(userId: string, posts: any[]): void {
    this.set(`user:${userId}:posts`, posts, 5 * 60 * 1000); // 5 minutes for posts
  }

  getUserPosts(userId: string): any[] | null {
    return this.get(`user:${userId}:posts`);
  }
}

class CommunityCache extends IntelligentCache<any> {
  constructor() {
    super({
      maxSize: 200,
      defaultTTL: 15 * 60 * 1000, // 15 minutes for community data
      cleanupInterval: 3 * 60 * 1000 // 3 minutes
    });
  }

  setCommunity(communityId: string, communityData: any): void {
    this.set(`community:${communityId}`, communityData);
  }

  getCommunity(communityId: string): any | null {
    return this.get(`community:${communityId}`);
  }

  setCommunityPosts(communityId: string, posts: any[]): void {
    this.set(`community:${communityId}:posts`, posts, 3 * 60 * 1000); // 3 minutes
  }

  getCommunityPosts(communityId: string): any[] | null {
    return this.get(`community:${communityId}:posts`);
  }

  setCommunityMembers(communityId: string, members: any[]): void {
    this.set(`community:${communityId}:members`, members, 10 * 60 * 1000); // 10 minutes
  }

  getCommunityMembers(communityId: string): any[] | null {
    return this.get(`community:${communityId}:members`);
  }
}

class PostCache extends IntelligentCache<any> {
  constructor() {
    super({
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes for posts
      cleanupInterval: 60 * 1000 // 1 minute
    });
  }

  setPost(postId: string, postData: any): void {
    this.set(`post:${postId}`, postData);
  }

  getPost(postId: string): any | null {
    return this.get(`post:${postId}`);
  }

  setPostComments(postId: string, comments: any[]): void {
    this.set(`post:${postId}:comments`, comments, 2 * 60 * 1000); // 2 minutes
  }

  getPostComments(postId: string): any[] | null {
    return this.get(`post:${postId}:comments`);
  }

  setFeed(feedType: string, posts: any[]): void {
    this.set(`feed:${feedType}`, posts, 3 * 60 * 1000); // 3 minutes for feeds
  }

  getFeed(feedType: string): any[] | null {
    return this.get(`feed:${feedType}`);
  }
}

// Cache manager to coordinate all caches
class CacheManager {
  private static instance: CacheManager;
  
  public userCache: UserCache;
  public communityCache: CommunityCache;
  public postCache: PostCache;

  private constructor() {
    this.userCache = new UserCache();
    this.communityCache = new CommunityCache();
    this.postCache = new PostCache();
  }

  static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  // Clear all caches
  clearAll(): void {
    this.userCache.clear();
    this.communityCache.clear();
    this.postCache.clear();
  }

  // Get overall cache statistics
  getOverallStats() {
    return {
      user: this.userCache.getStats(),
      community: this.communityCache.getStats(),
      post: this.postCache.getStats()
    };
  }

  // Invalidate related caches when data changes
  invalidateUserData(userId: string): void {
    this.userCache.delete(`user:${userId}`);
    this.userCache.delete(`user:${userId}:posts`);
    // Also invalidate feeds that might contain this user's posts
    this.postCache.delete('feed:following');
    this.postCache.delete('feed:trending');
  }

  invalidateCommunityData(communityId: string): void {
    this.communityCache.delete(`community:${communityId}`);
    this.communityCache.delete(`community:${communityId}:posts`);
    this.communityCache.delete(`community:${communityId}:members`);
  }

  invalidatePostData(postId: string): void {
    this.postCache.delete(`post:${postId}`);
    this.postCache.delete(`post:${postId}:comments`);
    // Invalidate feeds that might contain this post
    this.postCache.delete('feed:following');
    this.postCache.delete('feed:trending');
  }

  destroy(): void {
    this.userCache.destroy();
    this.communityCache.destroy();
    this.postCache.destroy();
  }
}

export const cacheManager = CacheManager.getInstance();
export { UserCache, CommunityCache, PostCache, IntelligentCache };
export default CacheManager;