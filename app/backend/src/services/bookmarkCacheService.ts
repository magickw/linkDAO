import { databaseService } from './databaseService';
import { safeLogger } from '../utils/safeLogger';
import { bookmarks } from '../db/schema';
import { eq } from 'drizzle-orm';

/**
 * Bookmark Cache Service
 * 
 * Provides caching layer for bookmark operations to reduce database load
 * and improve response times.
 */
class BookmarkCacheService {
  private cache: Map<string, { data: any; timestamp: number }>;
  private readonly CACHE_TTL = 300000; // 5 minutes
  private readonly USER_BOOKMARKS_CACHE_PREFIX = 'user_bookmarks:';
  private readonly BOOKMARK_COUNT_CACHE_PREFIX = 'bookmark_count:';
  private readonly IS_BOOKMARKED_CACHE_PREFIX = 'is_bookmarked:';

  constructor() {
    this.cache = new Map();
  }

  /**
   * Get cached user bookmarks
   */
  getUserBookmarks(userId: string, page: number, limit: number): any | null {
    const cacheKey = `${this.USER_BOOKMARKS_CACHE_PREFIX}${userId}:${page}:${limit}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Cache user bookmarks
   */
  setUserBookmarks(userId: string, page: number, limit: number, data: any): void {
    const cacheKey = `${this.USER_BOOKMARKS_CACHE_PREFIX}${userId}:${page}:${limit}`;
    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached bookmark count
   */
  getBookmarkCount(postId: string): number | null {
    const cacheKey = `${this.BOOKMARK_COUNT_CACHE_PREFIX}${postId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Cache bookmark count
   */
  setBookmarkCount(postId: string, count: number): void {
    const cacheKey = `${this.BOOKMARK_COUNT_CACHE_PREFIX}${postId}`;
    this.cache.set(cacheKey, {
      data: count,
      timestamp: Date.now()
    });
  }

  /**
   * Get cached bookmark status
   */
  getIsBookmarked(userId: string, postId: string): boolean | null {
    const cacheKey = `${this.IS_BOOKMARKED_CACHE_PREFIX}${userId}:${postId}`;
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    
    return null;
  }

  /**
   * Cache bookmark status
   */
  setIsBookmarked(userId: string, postId: string, isBookmarked: boolean): void {
    const cacheKey = `${this.IS_BOOKMARKED_CACHE_PREFIX}${userId}:${postId}`;
    this.cache.set(cacheKey, {
      data: isBookmarked,
      timestamp: Date.now()
    });
  }

  /**
   * Invalidate user's bookmark cache (call after toggle, add, or remove)
   */
  invalidateUserBookmarks(userId: string): void {
    // Invalidate all cached pages for this user
    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith(this.USER_BOOKMARKS_CACHE_PREFIX) && key.includes(userId)) {
        this.cache.delete(key);
      }
    }
  }

  /**
   * Invalidate bookmark count cache (call after toggle, add, or remove)
   */
  invalidateBookmarkCount(postId: string): void {
    this.cache.delete(`${this.BOOKMARK_COUNT_CACHE_PREFIX}${postId}`);
  }

  /**
   * Invalidate bookmark status cache (call after toggle, add, or remove)
   */
  invalidateIsBookmarked(userId: string, postId: string): void {
    this.cache.delete(`${this.IS_BOOKMARKED_CACHE_PREFIX}${userId}:${postId}`);
  }

  /**
   * Clear all cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys())
    };
  }

  /**
   * Clean up expired entries
   */
  cleanupExpiredEntries(): void {
    const now = Date.now();
    for (const [key, value] of this.cache.entries()) {
      if (now - value.timestamp >= this.CACHE_TTL) {
        this.cache.delete(key);
      }
    }
  }
}

export const bookmarkCacheService = new BookmarkCacheService();

// Auto-cleanup expired entries every 10 minutes
setInterval(() => {
  bookmarkCacheService.cleanupExpiredEntries();
}, 10 * 60 * 1000);