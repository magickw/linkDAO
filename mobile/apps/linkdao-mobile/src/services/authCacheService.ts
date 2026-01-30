/**
 * Authentication Cache Service
 * Provides caching for authentication signatures to reduce repeated signing requests
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { utils } from 'ethers';

interface CachedAuth {
  address: string;
  signature: string;
  message: string;
  timestamp: number;
  expiresAt: number;
}

interface AuthCacheConfig {
  ttl: number; // Time to live in milliseconds
  maxEntries: number;
  cleanupInterval: number; // Interval for cleaning expired entries
}

class AuthCacheService {
  private static instance: AuthCacheService;
  private readonly CACHE_KEY = 'auth_signature_cache';
  private readonly CONFIG_KEY = 'auth_cache_config';
  private cleanupTimer: NodeJS.Timeout | null = null;
  
  private defaultConfig: AuthCacheConfig = {
    ttl: 30 * 60 * 1000, // 30 minutes
    maxEntries: 50,
    cleanupInterval: 10 * 60 * 1000 // 10 minutes
  };

  private constructor() {
    this.startCleanupInterval();
  }

  static getInstance(): AuthCacheService {
    if (!AuthCacheService.instance) {
      AuthCacheService.instance = new AuthCacheService();
    }
    return AuthCacheService.instance;
  }

  /**
   * Cache an authentication signature
   */
  async cacheSignature(address: string, signature: string, message: string): Promise<void> {
    try {
      const cache = await this.getCache();
      const timestamp = Date.now();
      const expiresAt = timestamp + this.defaultConfig.ttl;
      
      // Create cache entry
      const cacheEntry: CachedAuth = {
        address: address.toLowerCase(),
        signature,
        message,
        timestamp,
        expiresAt
      };

      // Add to cache (overwrite if exists)
      cache[address.toLowerCase()] = cacheEntry;
      
      // Enforce size limit
      await this.enforceSizeLimit(cache);
      
      // Save to storage
      await this.saveCache(cache);
      
      console.log(`✅ Cached authentication for ${address}`);
    } catch (error) {
      console.error('❌ Failed to cache authentication:', error);
    }
  }

  /**
   * Get cached authentication for an address
   */
  async getCachedSignature(address: string): Promise<CachedAuth | null> {
    try {
      const cache = await this.getCache();
      const normalizedAddress = address.toLowerCase();
      const cachedEntry = cache[normalizedAddress];
      
      if (!cachedEntry) {
        return null;
      }

      // Check if expired
      if (Date.now() > cachedEntry.expiresAt) {
        console.log(`⏰ Cached authentication expired for ${address}`);
        await this.removeCachedSignature(address);
        return null;
      }

      console.log(`✅ Found cached authentication for ${address}`);
      return cachedEntry;
    } catch (error) {
      console.error('❌ Failed to get cached authentication:', error);
      return null;
    }
  }

  /**
   * Remove cached authentication for an address
   */
  async removeCachedSignature(address: string): Promise<void> {
    try {
      const cache = await this.getCache();
      const normalizedAddress = address.toLowerCase();
      
      if (cache[normalizedAddress]) {
        delete cache[normalizedAddress];
        await this.saveCache(cache);
        console.log(`🗑️ Removed cached authentication for ${address}`);
      }
    } catch (error) {
      console.error('❌ Failed to remove cached authentication:', error);
    }
  }

  /**
   * Check if authentication is cached and valid for an address
   */
  async isAuthCached(address: string): Promise<boolean> {
    const cached = await this.getCachedSignature(address);
    return cached !== null;
  }

  /**
   * Clear all cached authentications
   */
  async clearCache(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.CACHE_KEY);
      console.log('🧹 Cleared all authentication cache');
    } catch (error) {
      console.error('❌ Failed to clear authentication cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{
    totalEntries: number;
    expiredEntries: number;
    validEntries: number;
    oldestEntry?: Date;
    newestEntry?: Date;
  }> {
    try {
      const cache = await this.getCache();
      const now = Date.now();
      const entries = Object.values(cache);
      
      const expiredEntries = entries.filter(entry => now > entry.expiresAt).length;
      const validEntries = entries.length - expiredEntries;
      
      const timestamps = entries.map(entry => entry.timestamp);
      const oldestTimestamp = timestamps.length > 0 ? Math.min(...timestamps) : undefined;
      const newestTimestamp = timestamps.length > 0 ? Math.max(...timestamps) : undefined;
      
      return {
        totalEntries: entries.length,
        expiredEntries,
        validEntries,
        oldestEntry: oldestTimestamp ? new Date(oldestTimestamp) : undefined,
        newestEntry: newestTimestamp ? new Date(newestTimestamp) : undefined
      };
    } catch (error) {
      console.error('❌ Failed to get cache stats:', error);
      return {
        totalEntries: 0,
        expiredEntries: 0,
        validEntries: 0
      };
    }
  }

  /**
   * Update cache configuration
   */
  async updateConfig(config: Partial<AuthCacheConfig>): Promise<void> {
    try {
      const currentConfig = await this.getConfig();
      const newConfig = { ...currentConfig, ...config };
      
      await AsyncStorage.setItem(this.CONFIG_KEY, JSON.stringify(newConfig));
      this.defaultConfig = newConfig;
      
      console.log('⚙️ Updated authentication cache configuration:', newConfig);
    } catch (error) {
      console.error('❌ Failed to update cache configuration:', error);
    }
  }

  /**
   * Get current cache configuration
   */
  async getConfig(): Promise<AuthCacheConfig> {
    try {
      const configStr = await AsyncStorage.getItem(this.CONFIG_KEY);
      if (configStr) {
        return JSON.parse(configStr);
      }
    } catch (error) {
      console.error('❌ Failed to get cache configuration:', error);
    }
    
    return this.defaultConfig;
  }

  /**
   * Private methods
   */
  private async getCache(): Promise<Record<string, CachedAuth>> {
    try {
      const cacheStr = await AsyncStorage.getItem(this.CACHE_KEY);
      return cacheStr ? JSON.parse(cacheStr) : {};
    } catch (error) {
      console.error('❌ Failed to load cache:', error);
      return {};
    }
  }

  private async saveCache(cache: Record<string, CachedAuth>): Promise<void> {
    try {
      await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cache));
    } catch (error) {
      console.error('❌ Failed to save cache:', error);
    }
  }

  private async enforceSizeLimit(cache: Record<string, CachedAuth>): Promise<void> {
    const entries = Object.entries(cache);
    
    if (entries.length <= this.defaultConfig.maxEntries) {
      return;
    }

    // Remove oldest entries
    const sortedEntries = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
    const entriesToRemove = sortedEntries.slice(0, entries.length - this.defaultConfig.maxEntries);
    
    for (const [address] of entriesToRemove) {
      delete cache[address];
    }
    
    console.log(`🧹 Removed ${entriesToRemove.length} old cache entries to enforce size limit`);
  }

  private startCleanupInterval(): void {
    this.cleanupTimer = setInterval(async () => {
      try {
        const cache = await this.getCache();
        const now = Date.now();
        let cleanedCount = 0;
        
        for (const [address, entry] of Object.entries(cache)) {
          if (now > entry.expiresAt) {
            delete cache[address];
            cleanedCount++;
          }
        }
        
        if (cleanedCount > 0) {
          await this.saveCache(cache);
          console.log(`🧹 Cleaned ${cleanedCount} expired cache entries`);
        }
      } catch (error) {
        console.error('❌ Cache cleanup failed:', error);
      }
    }, this.defaultConfig.cleanupInterval);
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
  }
}

// Export singleton instance
export const authCacheService = AuthCacheService.getInstance();
export default authCacheService;