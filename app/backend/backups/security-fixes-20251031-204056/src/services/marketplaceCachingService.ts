import { Redis, Cluster } from 'ioredis';
import { safeLogger } from '../utils/safeLogger';
import { LRUCache } from 'lru-cache';
import { safeLogger } from '../utils/safeLogger';
import { performance } from 'perf_hooks';
import { safeLogger } from '../utils/safeLogger';
import { CachingStrategiesService } from './cachingStrategiesService';
import { safeLogger } from '../utils/safeLogger';

interface MarketplaceCacheConfig {
  redis: {
    host: string;
    port: number;
    password?: string;
    db: number;
    keyPrefix: string;
  };
  cluster?: {
    nodes: Array<{ host: string; port: number }>;
    options: any;
  };
  memory: {
    maxSize: number;
    ttl: number;
  };
  marketplace: {
    productCacheTTL: number;
    userCacheTTL: number;
    orderCacheTTL: number;
    searchCacheTTL: number;
    imageCacheTTL: number;
  };
}

interface CacheInvalidationRule {
  pattern: string;
  triggers: string[];
  dependencies: string[];
}

interface CacheWarmupJob {
  key: string;
  loader: () => Promise<any>;
  priority: 'high' | 'medium' | 'low';
  ttl: number;
  dependencies?: string[];
}

export class MarketplaceCachingService extends CachingStrategiesService {
  private config: MarketplaceCacheConfig;
  private invalidationRules: Map<string, CacheInvalidationRule> = new Map();
  private warmupQueue: CacheWarmupJob[] = [];
  private isWarmupRunning = false;

  constructor(config: MarketplaceCacheConfig) {
    super(config);
    this.config = config;
    this.setupMarketplaceInvalidationRules();
    this.startWarmupProcessor();
  }

  // Marketplace-specific cache methods

  // Product caching with smart invalidation
  async cacheProduct(productId: string, productData: any): Promise<void> {
    const ttl = this.config.marketplace.productCacheTTL;
    
    await Promise.all([
      this.set(`product:${productId}`, productData, ttl),
      this.set(`product:seller:${productData.sellerId}:${productId}`, productData, ttl),
      this.addToSet(`seller:${productData.sellerId}:products`, productId, ttl)
    ]);

    // Cache product images separately for faster access
    if (productData.images && productData.images.length > 0) {
      await this.set(
        `product:${productId}:images`, 
        productData.images, 
        this.config.marketplace.imageCacheTTL
      );
    }
  }

  async getCachedProduct(productId: string): Promise<any> {
    return this.get(`product:${productId}`);
  }

  async invalidateProductCache(productId: string, sellerId?: string): Promise<void> {
    const keysToInvalidate = [
      `product:${productId}`,
      `product:${productId}:images`,
      `product:${productId}:*`
    ];

    if (sellerId) {
      keysToInvalidate.push(
        `product:seller:${sellerId}:${productId}`,
        `seller:${sellerId}:products`,
        `seller:${sellerId}:stats`
      );
    }

    await this.invalidatePattern(keysToInvalidate.join('|'));
    
    // Trigger dependent cache invalidations
    await this.triggerDependentInvalidations('product', productId);
  }

  // User/Seller caching
  async cacheUserProfile(userId: string, userData: any): Promise<void> {
    const ttl = this.config.marketplace.userCacheTTL;
    
    await Promise.all([
      this.set(`user:${userId}`, userData, ttl),
      this.set(`user:wallet:${userData.walletAddress}`, userData, ttl)
    ]);

    // Cache ENS data separately if available
    if (userData.ensHandle) {
      await this.set(`user:ens:${userData.ensHandle}`, userData, ttl);
    }
  }

  async getCachedUserProfile(identifier: string, type: 'id' | 'wallet' | 'ens' = 'id'): Promise<any> {
    const key = type === 'id' ? `user:${identifier}` :
                type === 'wallet' ? `user:wallet:${identifier}` :
                `user:ens:${identifier}`;
    
    return this.get(key);
  }

  async cacheSellerStats(sellerId: string, stats: any): Promise<void> {
    await this.set(
      `seller:${sellerId}:stats`, 
      stats, 
      this.config.marketplace.userCacheTTL
    );
  }

  async getCachedSellerStats(sellerId: string): Promise<any> {
    return this.get(`seller:${sellerId}:stats`);
  }

  // Order caching
  async cacheOrder(orderId: string, orderData: any): Promise<void> {
    const ttl = this.config.marketplace.orderCacheTTL;
    
    await Promise.all([
      this.set(`order:${orderId}`, orderData, ttl),
      this.addToSet(`user:${orderData.buyerId}:orders`, orderId, ttl),
      this.addToSet(`user:${orderData.sellerId}:orders`, orderId, ttl)
    ]);
  }

  async getCachedOrder(orderId: string): Promise<any> {
    return this.get(`order:${orderId}`);
  }

  async getCachedUserOrders(userId: string): Promise<string[]> {
    return this.getSet(`user:${userId}:orders`);
  }

  async invalidateOrderCache(orderId: string, buyerId?: string, sellerId?: string): Promise<void> {
    const keysToInvalidate = [`order:${orderId}`];

    if (buyerId) {
      keysToInvalidate.push(`user:${buyerId}:orders`);
    }

    if (sellerId) {
      keysToInvalidate.push(`user:${sellerId}:orders`);
    }

    await Promise.all(keysToInvalidate.map(key => this.delete(key)));
  }

  // Search result caching
  async cacheSearchResults(
    query: string, 
    filters: any, 
    results: any[], 
    pagination: { page: number; limit: number }
  ): Promise<void> {
    const searchKey = this.generateSearchKey(query, filters, pagination);
    await this.set(searchKey, results, this.config.marketplace.searchCacheTTL);
    
    // Cache individual products from search results
    const productCachePromises = results.map(product => 
      this.cacheProduct(product.id, product)
    );
    
    await Promise.allSettled(productCachePromises);
  }

  async getCachedSearchResults(
    query: string, 
    filters: any, 
    pagination: { page: number; limit: number }
  ): Promise<any[] | null> {
    const searchKey = this.generateSearchKey(query, filters, pagination);
    return this.get(searchKey);
  }

  private generateSearchKey(query: string, filters: any, pagination: { page: number; limit: number }): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    const queryHash = Buffer.from(query).toString('base64');
    return `search:${queryHash}:${filterHash}:${pagination.page}:${pagination.limit}`;
  }

  // Image caching
  async cacheImageMetadata(imageId: string, metadata: any): Promise<void> {
    await this.set(
      `image:${imageId}:metadata`, 
      metadata, 
      this.config.marketplace.imageCacheTTL
    );
  }

  async getCachedImageMetadata(imageId: string): Promise<any> {
    return this.get(`image:${imageId}:metadata`);
  }

  // Analytics caching
  async cacheAnalyticsData(metric: string, timeframe: string, data: any): Promise<void> {
    const key = `analytics:${metric}:${timeframe}`;
    const ttl = this.getAnalyticsCacheTTL(timeframe);
    await this.set(key, data, ttl);
  }

  async getCachedAnalyticsData(metric: string, timeframe: string): Promise<any> {
    const key = `analytics:${metric}:${timeframe}`;
    return this.get(key);
  }

  private getAnalyticsCacheTTL(timeframe: string): number {
    const ttlMap: Record<string, number> = {
      'realtime': 30,      // 30 seconds
      'hourly': 300,       // 5 minutes
      'daily': 1800,       // 30 minutes
      'weekly': 3600,      // 1 hour
      'monthly': 7200      // 2 hours
    };
    
    return ttlMap[timeframe] || 300;
  }

  // Set operations for collections
  private async addToSet(key: string, value: string, ttl: number): Promise<void> {
    try {
      await this.redis.sadd(key, value);
      await this.redis.expire(key, ttl);
    } catch (error) {
      safeLogger.error('Error adding to set:', error);
    }
  }

  private async getSet(key: string): Promise<string[]> {
    try {
      return await this.redis.smembers(key);
    } catch (error) {
      safeLogger.error('Error getting set:', error);
      return [];
    }
  }

  // Cache invalidation rules setup
  private setupMarketplaceInvalidationRules(): void {
    // Product invalidation rules
    this.invalidationRules.set('product_update', {
      pattern: 'product:*',
      triggers: ['product.updated', 'product.status_changed'],
      dependencies: ['search:*', 'seller:*:stats', 'analytics:*']
    });

    // User invalidation rules
    this.invalidationRules.set('user_update', {
      pattern: 'user:*',
      triggers: ['user.updated', 'user.ens_verified'],
      dependencies: ['seller:*:stats', 'product:seller:*']
    });

    // Order invalidation rules
    this.invalidationRules.set('order_update', {
      pattern: 'order:*',
      triggers: ['order.status_changed', 'order.completed'],
      dependencies: ['user:*:orders', 'seller:*:stats', 'analytics:*']
    });

    // Search invalidation rules
    this.invalidationRules.set('search_invalidation', {
      pattern: 'search:*',
      triggers: ['product.created', 'product.updated', 'product.deleted'],
      dependencies: []
    });
  }

  private async triggerDependentInvalidations(entityType: string, entityId: string): Promise<void> {
    const rule = this.invalidationRules.get(`${entityType}_update`);
    if (!rule) return;

    const invalidationPromises = rule.dependencies.map(pattern => {
      const expandedPattern = pattern.replace('*', entityId);
      return this.invalidatePattern(expandedPattern);
    });

    await Promise.allSettled(invalidationPromises);
  }

  // Cache warming system
  async scheduleWarmup(job: CacheWarmupJob): Promise<void> {
    this.warmupQueue.push(job);
    this.warmupQueue.sort((a, b) => {
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      return priorityOrder[b.priority] - priorityOrder[a.priority];
    });
  }

  private startWarmupProcessor(): void {
    setInterval(async () => {
      if (this.isWarmupRunning || this.warmupQueue.length === 0) return;
      
      this.isWarmupRunning = true;
      
      try {
        const job = this.warmupQueue.shift();
        if (job) {
          await this.processWarmupJob(job);
        }
      } catch (error) {
        safeLogger.error('Warmup job failed:', error);
      } finally {
        this.isWarmupRunning = false;
      }
    }, 1000); // Process one job per second
  }

  private async processWarmupJob(job: CacheWarmupJob): Promise<void> {
    try {
      const data = await job.loader();
      await this.set(job.key, data, job.ttl);
      
      safeLogger.info(`Cache warmed up: ${job.key} (priority: ${job.priority})`);
    } catch (error) {
      safeLogger.error(`Failed to warm up cache for ${job.key}:`, error);
    }
  }

  // Marketplace-specific warmup strategies
  async warmupPopularProducts(limit: number = 100): Promise<void> {
    // This would typically query the database for popular products
    // For now, we'll create placeholder warmup jobs
    
    for (let i = 1; i <= limit; i++) {
      await this.scheduleWarmup({
        key: `product:popular:${i}`,
        loader: async () => {
          // Load popular product data
          return { id: i, title: `Popular Product ${i}` };
        },
        priority: 'high',
        ttl: this.config.marketplace.productCacheTTL
      });
    }
  }

  async warmupSellerProfiles(sellerIds: string[]): Promise<void> {
    for (const sellerId of sellerIds) {
      await this.scheduleWarmup({
        key: `seller:${sellerId}:stats`,
        loader: async () => {
          // Load seller statistics
          return { sellerId, totalSales: 0, rating: 0 };
        },
        priority: 'medium',
        ttl: this.config.marketplace.userCacheTTL
      });
    }
  }

  // Performance monitoring
  async getCachePerformanceMetrics(): Promise<{
    hitRate: number;
    missRate: number;
    avgResponseTime: number;
    memoryUsage: number;
    redisInfo: any;
  }> {
    const stats = this.getStats();
    const redisInfo = await this.getRedisInfo();
    
    return {
      hitRate: stats.hitRate,
      missRate: 1 - stats.hitRate,
      avgResponseTime: 0, // Would need to track this
      memoryUsage: stats.memoryUsage,
      redisInfo
    };
  }

  // Cache health check
  async healthCheck(): Promise<{
    redis: boolean;
    memory: boolean;
    performance: boolean;
  }> {
    try {
      // Test Redis connectivity
      await this.redis.ping();
      const redisHealthy = true;
      
      // Test memory cache
      const testKey = 'health_check_test';
      const testValue = { timestamp: Date.now() };
      await this.set(testKey, testValue, 10);
      const retrieved = await this.get(testKey);
      const memoryHealthy = retrieved !== null;
      
      // Check performance metrics
      const stats = this.getStats();
      const performanceHealthy = stats.hitRate > 0.5; // At least 50% hit rate
      
      await this.delete(testKey);
      
      return {
        redis: redisHealthy,
        memory: memoryHealthy,
        performance: performanceHealthy
      };
    } catch (error) {
      safeLogger.error('Cache health check failed:', error);
      return {
        redis: false,
        memory: false,
        performance: false
      };
    }
  }

  // Cleanup and maintenance
  async performMaintenance(): Promise<void> {
    safeLogger.info('Starting cache maintenance...');
    
    try {
      // Clean up expired keys
      await this.cleanupExpiredKeys();
      
      // Optimize memory usage
      await this.optimizeMemoryUsage();
      
      // Update cache statistics
      await this.updateCacheStatistics();
      
      safeLogger.info('Cache maintenance completed');
    } catch (error) {
      safeLogger.error('Cache maintenance failed:', error);
    }
  }

  private async cleanupExpiredKeys(): Promise<void> {
    try {
      // This would typically scan for expired keys and remove them
      // Redis handles this automatically, but we can force cleanup
      const keys = await this.redis.keys(`${this.config.redis.keyPrefix}*`);
      const expiredKeys: string[] = [];
      
      for (const key of keys.slice(0, 1000)) { // Limit to prevent blocking
        const ttl = await this.redis.ttl(key);
        if (ttl === -1) { // No expiration set
          expiredKeys.push(key);
        }
      }
      
      if (expiredKeys.length > 0) {
        await this.redis.del(...expiredKeys);
        safeLogger.info(`Cleaned up ${expiredKeys.length} expired keys`);
      }
    } catch (error) {
      safeLogger.error('Cleanup failed:', error);
    }
  }

  private async optimizeMemoryUsage(): Promise<void> {
    // Clear least recently used items from memory cache if needed
    const stats = this.getStats();
    if (stats.memoryUsage > 0.8) { // If using more than 80% of memory
      this.memoryCache.clear();
      safeLogger.info('Memory cache cleared due to high usage');
    }
  }

  private async updateCacheStatistics(): Promise<void> {
    const stats = this.getStats();
    await this.set('cache:stats', stats, 300); // Cache stats for 5 minutes
  }
}

// Cache key generators specific to marketplace
export class MarketplaceCacheKeys {
  static product(id: string): string {
    return `product:${id}`;
  }

  static productImages(id: string): string {
    return `product:${id}:images`;
  }

  static productsBySeller(sellerId: string): string {
    return `seller:${sellerId}:products`;
  }

  static userProfile(userId: string): string {
    return `user:${userId}`;
  }

  static userByWallet(walletAddress: string): string {
    return `user:wallet:${walletAddress}`;
  }

  static userByENS(ensHandle: string): string {
    return `user:ens:${ensHandle}`;
  }

  static sellerStats(sellerId: string): string {
    return `seller:${sellerId}:stats`;
  }

  static order(orderId: string): string {
    return `order:${orderId}`;
  }

  static userOrders(userId: string): string {
    return `user:${userId}:orders`;
  }

  static searchResults(query: string, filters: any, page: number, limit: number): string {
    const filterHash = Buffer.from(JSON.stringify(filters)).toString('base64');
    const queryHash = Buffer.from(query).toString('base64');
    return `search:${queryHash}:${filterHash}:${page}:${limit}`;
  }

  static imageMetadata(imageId: string): string {
    return `image:${imageId}:metadata`;
  }

  static analytics(metric: string, timeframe: string): string {
    return `analytics:${metric}:${timeframe}`;
  }
}