/**
 * Intelligent Cache Service
 * Provides intelligent caching for payment method prioritization data
 * with appropriate TTL, fallback mechanisms, and performance optimization
 */

import { 
  GasEstimate, 
  ExchangeRate, 
  UserPreferences,
  NetworkConditions,
  PaymentMethodType 
} from '../types/paymentPrioritization';

// Cache configuration constants
const CACHE_CONFIG = {
  GAS_ESTIMATES: {
    TTL: 5 * 60 * 1000, // 5 minutes (increased from 30 seconds)
    MAX_ENTRIES: 100,
    STALE_WHILE_REVALIDATE: 10 * 60 * 1000 // 10 minutes
  },
  EXCHANGE_RATES: {
    TTL: 10 * 60 * 1000, // 10 minutes (increased from 1 minute)
    MAX_ENTRIES: 200,
    STALE_WHILE_REVALIDATE: 30 * 60 * 1000 // 30 minutes
  },
  USER_PREFERENCES: {
    TTL: 10 * 60 * 1000, // 10 minutes (increased from 5 minutes)
    MAX_ENTRIES: 1000,
    STALE_WHILE_REVALIDATE: 20 * 60 * 1000 // 20 minutes
  },
  NETWORK_CONDITIONS: {
    TTL: 2 * 60 * 1000, // 2 minutes (increased from 15 seconds)
    MAX_ENTRIES: 50,
    STALE_WHILE_REVALIDATE: 5 * 60 * 1000 // 5 minutes
  },
  PRIORITIZATION_RESULTS: {
    TTL: 2 * 60 * 1000, // 2 minutes (increased from 45 seconds)
    MAX_ENTRIES: 500,
    STALE_WHILE_REVALIDATE: 5 * 60 * 1000 // 5 minutes
  }
};

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  isStale?: boolean;
}

interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  size: number;
  hitRate: number;
}

interface CacheMetrics {
  totalSize: number;
  cacheStats: Record<string, CacheStats>;
  memoryUsage: number;
  oldestEntry: number;
  newestEntry: number;
}

export class IntelligentCacheService {
  private caches = new Map<string, Map<string, CacheEntry<any>>>();
  private stats = new Map<string, CacheStats>();
  private cleanupIntervals = new Map<string, NodeJS.Timeout>();

  constructor() {
    this.initializeCaches();
    this.startPeriodicCleanup();
  }

  /**
   * Cache gas fee estimates with intelligent TTL
   */
  async cacheGasEstimate(
    key: string,
    estimate: GasEstimate,
    customTTL?: number
  ): Promise<void> {
    const ttl = customTTL || this.calculateDynamicTTL('gas', estimate.confidence);
    await this.set('gas_estimates', key, estimate, ttl);
  }

  /**
   * Get cached gas estimate
   */
  async getCachedGasEstimate(key: string): Promise<GasEstimate | null> {
    return this.get('gas_estimates', key);
  }

  /**
   * Cache exchange rates with fallback mechanisms
   */
  async cacheExchangeRate(
    fromCurrency: string,
    toCurrency: string,
    rate: ExchangeRate,
    customTTL?: number
  ): Promise<void> {
    const key = `${fromCurrency}_${toCurrency}`;
    const ttl = customTTL || this.calculateDynamicTTL('exchange', rate.confidence);
    await this.set('exchange_rates', key, rate, ttl);
  }

  /**
   * Get cached exchange rate
   */
  async getCachedExchangeRate(
    fromCurrency: string,
    toCurrency: string
  ): Promise<ExchangeRate | null> {
    const key = `${fromCurrency}_${toCurrency}`;
    return this.get('exchange_rates', key);
  }

  /**
   * Cache user preferences for faster access
   */
  async cacheUserPreferences(
    userId: string,
    preferences: UserPreferences,
    customTTL?: number
  ): Promise<void> {
    const ttl = customTTL || CACHE_CONFIG.USER_PREFERENCES.TTL;
    await this.set('user_preferences', userId, preferences, ttl);
  }

  /**
   * Get cached user preferences
   */
  async getCachedUserPreferences(userId: string): Promise<UserPreferences | null> {
    return this.get('user_preferences', userId);
  }

  /**
   * Cache network conditions
   */
  async cacheNetworkConditions(
    chainId: number,
    conditions: NetworkConditions,
    customTTL?: number
  ): Promise<void> {
    const key = `chain_${chainId}`;
    const ttl = customTTL || this.calculateNetworkConditionsTTL(conditions);
    await this.set('network_conditions', key, conditions, ttl);
  }

  /**
   * Get cached network conditions
   */
  async getCachedNetworkConditions(chainId: number): Promise<NetworkConditions | null> {
    const key = `chain_${chainId}`;
    return this.get('network_conditions', key);
  }

  /**
   * Cache prioritization results
   */
  async cachePrioritizationResult(
    contextKey: string,
    result: any,
    customTTL?: number
  ): Promise<void> {
    const ttl = customTTL || CACHE_CONFIG.PRIORITIZATION_RESULTS.TTL;
    await this.set('prioritization_results', contextKey, result, ttl);
  }

  /**
   * Get cached prioritization result
   */
  async getCachedPrioritizationResult(contextKey: string): Promise<any | null> {
    return this.get('prioritization_results', contextKey);
  }

  /**
   * Batch cache operations for better performance
   */
  async batchSet<T>(
    cacheType: string,
    entries: Array<{ key: string; value: T; ttl?: number }>
  ): Promise<void> {
    const cache = this.getOrCreateCache(cacheType);
    const config = this.getCacheConfig(cacheType);
    const now = Date.now();

    for (const entry of entries) {
      const ttl = entry.ttl || config.TTL;
      cache.set(entry.key, {
        data: entry.value,
        timestamp: now,
        ttl,
        accessCount: 0,
        lastAccessed: now
      });
    }

    this.enforceMaxSize(cacheType);
    this.updateStats(cacheType, 'set', entries.length);
  }

  /**
   * Batch get operations
   */
  async batchGet<T>(
    cacheType: string,
    keys: string[]
  ): Promise<Record<string, T | null>> {
    const results: Record<string, T | null> = {};
    
    for (const key of keys) {
      results[key] = await this.get(cacheType, key);
    }

    return results;
  }

  /**
   * Preload common cache entries
   */
  async preloadCommonEntries(): Promise<void> {
    // Preload common exchange rate pairs
    const commonPairs = [
      ['ETH', 'USD'],
      ['USDC', 'USD'],
      ['USDT', 'USD'],
      ['MATIC', 'USD']
    ];

    // This would typically fetch from APIs and cache
    console.log('Preloading common cache entries...');
    
    // Preload gas estimates for common chains
    const commonChains = [1, 137, 42161, 11155111]; // Mainnet, Polygon, Arbitrum, Sepolia
    
    // Implementation would fetch and cache these entries
    // For now, we'll just log the intent
    console.log(`Preloading data for ${commonPairs.length} currency pairs and ${commonChains.length} chains`);
  }

  /**
   * Invalidate cache entries by pattern
   */
  async invalidateByPattern(cacheType: string, pattern: RegExp): Promise<number> {
    const cache = this.getOrCreateCache(cacheType);
    let invalidatedCount = 0;

    for (const [key, entry] of cache.entries()) {
      if (pattern.test(key)) {
        cache.delete(key);
        invalidatedCount++;
      }
    }

    this.updateStats(cacheType, 'eviction', invalidatedCount);
    return invalidatedCount;
  }

  /**
   * Get cache metrics and statistics
   */
  getCacheMetrics(): CacheMetrics {
    let totalSize = 0;
    let oldestEntry = Date.now();
    let newestEntry = 0;
    const cacheStats: Record<string, CacheStats> = {};

    for (const [cacheType, cache] of this.caches.entries()) {
      totalSize += cache.size;
      
      for (const [key, entry] of cache.entries()) {
        if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
        if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
      }

      cacheStats[cacheType] = this.stats.get(cacheType) || {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: cache.size,
        hitRate: 0
      };
    }

    return {
      totalSize,
      cacheStats,
      memoryUsage: this.estimateMemoryUsage(),
      oldestEntry,
      newestEntry
    };
  }

  /**
   * Clear specific cache type
   */
  clearCache(cacheType: string): void {
    const cache = this.caches.get(cacheType);
    if (cache) {
      cache.clear();
      this.resetStats(cacheType);
    }
  }

  /**
   * Clear all caches
   */
  clearAllCaches(): void {
    for (const cacheType of this.caches.keys()) {
      this.clearCache(cacheType);
    }
  }

  /**
   * Optimize cache performance
   */
  async optimizeCache(): Promise<void> {
    // Remove expired entries
    await this.cleanupExpiredEntries();
    
    // Optimize frequently accessed entries
    this.optimizeFrequentlyAccessed();
    
    // Compact memory usage
    this.compactCaches();
  }

  // Private methods

  private initializeCaches(): void {
    const cacheTypes = [
      'gas_estimates',
      'exchange_rates', 
      'user_preferences',
      'network_conditions',
      'prioritization_results'
    ];

    for (const type of cacheTypes) {
      this.caches.set(type, new Map());
      this.stats.set(type, {
        hits: 0,
        misses: 0,
        evictions: 0,
        size: 0,
        hitRate: 0
      });
    }
  }

  private async set<T>(
    cacheType: string,
    key: string,
    value: T,
    ttl: number
  ): Promise<void> {
    const cache = this.getOrCreateCache(cacheType);
    const now = Date.now();

    cache.set(key, {
      data: value,
      timestamp: now,
      ttl,
      accessCount: 0,
      lastAccessed: now
    });

    this.enforceMaxSize(cacheType);
    this.updateStats(cacheType, 'set');
  }

  private async get<T>(cacheType: string, key: string): Promise<T | null> {
    const cache = this.getOrCreateCache(cacheType);
    const entry = cache.get(key);

    if (!entry) {
      this.updateStats(cacheType, 'miss');
      return null;
    }

    const now = Date.now();
    const age = now - entry.timestamp;

    // Check if entry is expired
    if (age > entry.ttl) {
      // Check if we can serve stale data while revalidating
      const config = this.getCacheConfig(cacheType);
      if (age < config.STALE_WHILE_REVALIDATE) {
        entry.isStale = true;
        entry.accessCount++;
        entry.lastAccessed = now;
        this.updateStats(cacheType, 'hit');
        return entry.data;
      } else {
        cache.delete(key);
        this.updateStats(cacheType, 'miss');
        return null;
      }
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;
    this.updateStats(cacheType, 'hit');
    
    return entry.data;
  }

  private getOrCreateCache(cacheType: string): Map<string, CacheEntry<any>> {
    let cache = this.caches.get(cacheType);
    if (!cache) {
      cache = new Map();
      this.caches.set(cacheType, cache);
    }
    return cache;
  }

  private getCacheConfig(cacheType: string): any {
    switch (cacheType) {
      case 'gas_estimates':
        return CACHE_CONFIG.GAS_ESTIMATES;
      case 'exchange_rates':
        return CACHE_CONFIG.EXCHANGE_RATES;
      case 'user_preferences':
        return CACHE_CONFIG.USER_PREFERENCES;
      case 'network_conditions':
        return CACHE_CONFIG.NETWORK_CONDITIONS;
      case 'prioritization_results':
        return CACHE_CONFIG.PRIORITIZATION_RESULTS;
      default:
        return { TTL: 60000, MAX_ENTRIES: 100, STALE_WHILE_REVALIDATE: 120000 };
    }
  }

  private calculateDynamicTTL(dataType: string, confidence: number): number {
    const baseTTL = dataType === 'gas' 
      ? CACHE_CONFIG.GAS_ESTIMATES.TTL 
      : CACHE_CONFIG.EXCHANGE_RATES.TTL;

    // Higher confidence data can be cached longer
    const confidenceMultiplier = Math.max(0.5, Math.min(2, confidence * 2));
    return Math.round(baseTTL * confidenceMultiplier);
  }

  private calculateNetworkConditionsTTL(conditions: NetworkConditions): number {
    // Cache longer for less congested networks
    const baseTTL = CACHE_CONFIG.NETWORK_CONDITIONS.TTL;
    
    switch (conditions.networkCongestion) {
      case 'low':
        return baseTTL * 2; // Cache longer for stable conditions
      case 'high':
        return baseTTL * 0.5; // Cache shorter for volatile conditions
      default:
        return baseTTL;
    }
  }

  private enforceMaxSize(cacheType: string): void {
    const cache = this.getOrCreateCache(cacheType);
    const config = this.getCacheConfig(cacheType);

    if (cache.size > config.MAX_ENTRIES) {
      // Use LRU eviction strategy
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);
      
      const toEvict = entries.slice(0, cache.size - config.MAX_ENTRIES);
      for (const [key] of toEvict) {
        cache.delete(key);
      }

      this.updateStats(cacheType, 'eviction', toEvict.length);
    }
  }

  private updateStats(
    cacheType: string, 
    operation: 'hit' | 'miss' | 'set' | 'eviction',
    count: number = 1
  ): void {
    const stats = this.stats.get(cacheType);
    if (!stats) return;

    switch (operation) {
      case 'hit':
        stats.hits += count;
        break;
      case 'miss':
        stats.misses += count;
        break;
      case 'eviction':
        stats.evictions += count;
        break;
    }

    const cache = this.caches.get(cacheType);
    if (cache) {
      stats.size = cache.size;
      stats.hitRate = stats.hits / (stats.hits + stats.misses) || 0;
    }
  }

  private resetStats(cacheType: string): void {
    this.stats.set(cacheType, {
      hits: 0,
      misses: 0,
      evictions: 0,
      size: 0,
      hitRate: 0
    });
  }

  private startPeriodicCleanup(): void {
    // Clean up expired entries every 5 minutes
    const cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);

    // Store interval for cleanup
    this.cleanupIntervals.set('main', cleanupInterval);
  }

  private async cleanupExpiredEntries(): Promise<void> {
    const now = Date.now();

    for (const [cacheType, cache] of this.caches.entries()) {
      const config = this.getCacheConfig(cacheType);
      let cleanedCount = 0;

      for (const [key, entry] of cache.entries()) {
        const age = now - entry.timestamp;
        if (age > config.STALE_WHILE_REVALIDATE) {
          cache.delete(key);
          cleanedCount++;
        }
      }

      if (cleanedCount > 0) {
        this.updateStats(cacheType, 'eviction', cleanedCount);
      }
    }
  }

  private optimizeFrequentlyAccessed(): void {
    // Move frequently accessed items to front (for Map iteration order)
    for (const [cacheType, cache] of this.caches.entries()) {
      const entries = Array.from(cache.entries());
      
      // Sort by access count (descending)
      entries.sort((a, b) => b[1].accessCount - a[1].accessCount);
      
      // Recreate cache with optimized order
      cache.clear();
      for (const [key, entry] of entries) {
        cache.set(key, entry);
      }
    }
  }

  private compactCaches(): void {
    // Force garbage collection of unused cache entries
    for (const [cacheType, cache] of this.caches.entries()) {
      const newCache = new Map(cache);
      this.caches.set(cacheType, newCache);
    }
  }

  private estimateMemoryUsage(): number {
    let totalSize = 0;
    
    for (const cache of this.caches.values()) {
      for (const entry of cache.values()) {
        // Rough estimation of memory usage
        totalSize += JSON.stringify(entry.data).length * 2; // UTF-16 encoding
        totalSize += 64; // Overhead for entry metadata
      }
    }

    return totalSize;
  }

  /**
   * Destroy cache service and cleanup resources
   */
  destroy(): void {
    // Clear all cleanup intervals
    for (const interval of this.cleanupIntervals.values()) {
      clearInterval(interval);
    }
    this.cleanupIntervals.clear();

    // Clear all caches
    this.clearAllCaches();
  }
}

// Export singleton instance
export const intelligentCacheService = new IntelligentCacheService();

export default IntelligentCacheService;