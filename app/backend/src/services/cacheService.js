/**
 * Redis Cache Service for Product Metadata and Performance Optimization
 * Handles caching of product listings, user data, and frequently accessed content
 */

const Redis = require('ioredis');

class CacheService {
  constructor() {
    this.redis = null;
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    
    this.init();
  }

  async init() {
    try {
      // Redis configuration
      const redisConfig = {
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT) || 6379,
        password: process.env.REDIS_PASSWORD,
        db: parseInt(process.env.REDIS_DB) || 0,
        retryDelayOnFailover: 100,
        maxRetriesPerRequest: 3,
        lazyConnect: true,
        keepAlive: 30000,
        connectTimeout: 10000,
        commandTimeout: 5000,
      };

      // Add Redis URL if provided (for cloud services)
      if (process.env.REDIS_URL) {
        this.redis = new Redis(process.env.REDIS_URL, {
          maxRetriesPerRequest: 3,
          retryDelayOnFailover: 100,
        });
      } else {
        this.redis = new Redis(redisConfig);
      }

      // Connection event handlers
      this.redis.on('connect', () => {
        console.log('✅ Redis connected successfully');
        this.isConnected = true;
      });

      this.redis.on('error', (error) => {
        console.error('❌ Redis connection error:', error.message);
        this.isConnected = false;
      });

      this.redis.on('close', () => {
        console.log('🔌 Redis connection closed');
        this.isConnected = false;
      });

      this.redis.on('reconnecting', () => {
        console.log('🔄 Redis reconnecting...');
      });

      // Test connection
      await this.redis.ping();
      
    } catch (error) {
      console.error('Failed to initialize Redis:', error.message);
      console.log('📝 Running without Redis cache (using memory fallback)');
      this.redis = null;
      this.isConnected = false;
    }
  }

  /**
   * Generic cache operations
   */
  async get(key) {
    if (!this.isConnected || !this.redis) {
      return this.memoryCache.get(key);
    }

    try {
      const value = await this.redis.get(this.prefixKey(key));
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error(`Cache get error for key ${key}:`, error.message);
      return null;
    }
  }

  async set(key, value, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.redis) {
      return this.memoryCache.set(key, value, ttl);
    }

    try {
      const serialized = JSON.stringify(value);
      if (ttl > 0) {
        await this.redis.setex(this.prefixKey(key), ttl, serialized);
      } else {
        await this.redis.set(this.prefixKey(key), serialized);
      }
      return true;
    } catch (error) {
      console.error(`Cache set error for key ${key}:`, error.message);
      return false;
    }
  }

  async del(key) {
    if (!this.isConnected || !this.redis) {
      return this.memoryCache.delete(key);
    }

    try {
      await this.redis.del(this.prefixKey(key));
      return true;
    } catch (error) {
      console.error(`Cache delete error for key ${key}:`, error.message);
      return false;
    }
  }

  async exists(key) {
    if (!this.isConnected || !this.redis) {
      return this.memoryCache.has(key);
    }

    try {
      const result = await this.redis.exists(this.prefixKey(key));
      return result === 1;
    } catch (error) {
      console.error(`Cache exists error for key ${key}:`, error.message);
      return false;
    }
  }

  /**
   * Product-specific cache operations
   */
  async getProductListings(filters = {}) {
    const cacheKey = `products:listings:${this.hashFilters(filters)}`;
    return await this.get(cacheKey);
  }

  async setProductListings(listings, filters = {}, ttl = 1800) { // 30 minutes
    const cacheKey = `products:listings:${this.hashFilters(filters)}`;
    return await this.set(cacheKey, listings, ttl);
  }

  async getProduct(productId) {
    const cacheKey = `product:${productId}`;
    return await this.get(cacheKey);
  }

  async setProduct(productId, productData, ttl = 3600) { // 1 hour
    const cacheKey = `product:${productId}`;
    return await this.set(cacheKey, productData, ttl);
  }

  async invalidateProduct(productId) {
    const cacheKey = `product:${productId}`;
    await this.del(cacheKey);
    
    // Also invalidate related listings
    await this.invalidateProductListings();
  }

  async invalidateProductListings() {
    if (!this.isConnected || !this.redis) {
      return this.memoryCache.clear();
    }

    try {
      const keys = await this.redis.keys(this.prefixKey('products:listings:*'));
      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } catch (error) {
      console.error('Error invalidating product listings:', error.message);
    }
  }

  /**
   * User-specific cache operations
   */
  async getUserProfile(walletAddress) {
    const cacheKey = `user:profile:${walletAddress.toLowerCase()}`;
    return await this.get(cacheKey);
  }

  async setUserProfile(walletAddress, profileData, ttl = 7200) { // 2 hours
    const cacheKey = `user:profile:${walletAddress.toLowerCase()}`;
    return await this.set(cacheKey, profileData, ttl);
  }

  async getUserListings(walletAddress) {
    const cacheKey = `user:listings:${walletAddress.toLowerCase()}`;
    return await this.get(cacheKey);
  }

  async setUserListings(walletAddress, listings, ttl = 1800) { // 30 minutes
    const cacheKey = `user:listings:${walletAddress.toLowerCase()}`;
    return await this.set(cacheKey, listings, ttl);
  }

  /**
   * Analytics and metrics cache
   */
  async getAnalytics(type, period = '24h') {
    const cacheKey = `analytics:${type}:${period}`;
    return await this.get(cacheKey);
  }

  async setAnalytics(type, period, data, ttl = 900) { // 15 minutes
    const cacheKey = `analytics:${type}:${period}`;
    return await this.set(cacheKey, data, ttl);
  }

  /**
   * Search cache operations
   */
  async getSearchResults(query, filters = {}) {
    const cacheKey = `search:${this.hashQuery(query, filters)}`;
    return await this.get(cacheKey);
  }

  async setSearchResults(query, filters, results, ttl = 1800) { // 30 minutes
    const cacheKey = `search:${this.hashQuery(query, filters)}`;
    return await this.set(cacheKey, results, ttl);
  }

  /**
   * Rate limiting cache
   */
  async checkRateLimit(identifier, limit = 100, window = 3600) {
    const cacheKey = `ratelimit:${identifier}`;
    
    if (!this.isConnected || !this.redis) {
      // Simple memory-based rate limiting
      const current = this.memoryCache.get(cacheKey) || 0;
      if (current >= limit) {
        return { allowed: false, remaining: 0, resetTime: Date.now() + window * 1000 };
      }
      this.memoryCache.set(cacheKey, current + 1, window);
      return { allowed: true, remaining: limit - current - 1, resetTime: Date.now() + window * 1000 };
    }

    try {
      const multi = this.redis.multi();
      multi.incr(this.prefixKey(cacheKey));
      multi.expire(this.prefixKey(cacheKey), window);
      const results = await multi.exec();
      
      const current = results[0][1];
      const remaining = Math.max(0, limit - current);
      const allowed = current <= limit;
      
      return {
        allowed,
        remaining,
        resetTime: Date.now() + window * 1000,
      };
    } catch (error) {
      console.error('Rate limit check error:', error.message);
      return { allowed: true, remaining: limit, resetTime: Date.now() + window * 1000 };
    }
  }

  /**
   * Session cache operations
   */
  async getSession(sessionId) {
    const cacheKey = `session:${sessionId}`;
    return await this.get(cacheKey);
  }

  async setSession(sessionId, sessionData, ttl = 86400) { // 24 hours
    const cacheKey = `session:${sessionId}`;
    return await this.set(cacheKey, sessionData, ttl);
  }

  async deleteSession(sessionId) {
    const cacheKey = `session:${sessionId}`;
    return await this.del(cacheKey);
  }

  /**
   * Batch operations
   */
  async mget(keys) {
    if (!this.isConnected || !this.redis) {
      return keys.map(key => this.memoryCache.get(key));
    }

    try {
      const prefixedKeys = keys.map(key => this.prefixKey(key));
      const values = await this.redis.mget(...prefixedKeys);
      return values.map(value => value ? JSON.parse(value) : null);
    } catch (error) {
      console.error('Batch get error:', error.message);
      return keys.map(() => null);
    }
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    if (!this.isConnected || !this.redis) {
      keyValuePairs.forEach(([key, value]) => {
        this.memoryCache.set(key, value, ttl);
      });
      return true;
    }

    try {
      const multi = this.redis.multi();
      
      keyValuePairs.forEach(([key, value]) => {
        const serialized = JSON.stringify(value);
        if (ttl > 0) {
          multi.setex(this.prefixKey(key), ttl, serialized);
        } else {
          multi.set(this.prefixKey(key), serialized);
        }
      });
      
      await multi.exec();
      return true;
    } catch (error) {
      console.error('Batch set error:', error.message);
      return false;
    }
  }

  /**
   * Cache warming operations
   */
  async warmCache() {
    console.log('🔥 Warming cache with popular data...');
    
    try {
      // Warm popular products
      // This would typically fetch from database and cache
      const popularProducts = []; // Fetch from DB
      await this.setProductListings(popularProducts, { popular: true }, 7200);
      
      // Warm category data
      const categories = []; // Fetch from DB
      await this.set('categories:all', categories, 14400); // 4 hours
      
      console.log('✅ Cache warming completed');
    } catch (error) {
      console.error('Cache warming error:', error.message);
    }
  }

  /**
   * Cache statistics
   */
  async getStats() {
    if (!this.isConnected || !this.redis) {
      return {
        connected: false,
        memoryUsage: this.memoryCache.size,
        keys: this.memoryCache.size,
      };
    }

    try {
      const info = await this.redis.info('memory');
      const keyspace = await this.redis.info('keyspace');
      
      return {
        connected: true,
        memoryUsage: this.parseRedisInfo(info, 'used_memory_human'),
        keys: this.parseRedisKeyspace(keyspace),
        uptime: this.parseRedisInfo(info, 'uptime_in_seconds'),
      };
    } catch (error) {
      console.error('Error getting cache stats:', error.message);
      return { connected: false, error: error.message };
    }
  }

  /**
   * Utility methods
   */
  prefixKey(key) {
    const prefix = process.env.REDIS_KEY_PREFIX || 'linkdao:marketplace:';
    return `${prefix}${key}`;
  }

  hashFilters(filters) {
    const crypto = require('crypto');
    const filterString = JSON.stringify(filters, Object.keys(filters).sort());
    return crypto.createHash('md5').update(filterString).digest('hex');
  }

  hashQuery(query, filters) {
    const crypto = require('crypto');
    const queryString = JSON.stringify({ query, filters }, Object.keys({ query, filters }).sort());
    return crypto.createHash('md5').update(queryString).digest('hex');
  }

  parseRedisInfo(info, key) {
    const lines = info.split('\r\n');
    const line = lines.find(l => l.startsWith(key));
    return line ? line.split(':')[1] : 'N/A';
  }

  parseRedisKeyspace(keyspace) {
    const lines = keyspace.split('\r\n');
    const dbLine = lines.find(l => l.startsWith('db0:'));
    if (dbLine) {
      const match = dbLine.match(/keys=(\d+)/);
      return match ? parseInt(match[1]) : 0;
    }
    return 0;
  }

  /**
   * Memory cache fallback (when Redis is not available)
   */
  memoryCache = new Map();
  memoryCacheTTL = new Map();

  // Memory cache cleanup interval
  startMemoryCacheCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.memoryCacheTTL.entries()) {
        if (expiry < now) {
          this.memoryCache.delete(key);
          this.memoryCacheTTL.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Graceful shutdown
   */
  async close() {
    if (this.redis) {
      await this.redis.quit();
      console.log('🔌 Redis connection closed gracefully');
    }
  }
}

// Memory cache methods for fallback
CacheService.prototype.memoryCache = {
  data: new Map(),
  ttl: new Map(),
  
  get(key) {
    const now = Date.now();
    const expiry = this.ttl.get(key);
    
    if (expiry && expiry < now) {
      this.data.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return this.data.get(key) || null;
  },
  
  set(key, value, ttlSeconds) {
    this.data.set(key, value);
    if (ttlSeconds > 0) {
      this.ttl.set(key, Date.now() + ttlSeconds * 1000);
    }
    return true;
  },
  
  delete(key) {
    this.data.delete(key);
    this.ttl.delete(key);
    return true;
  },
  
  has(key) {
    return this.get(key) !== null;
  },
  
  clear() {
    this.data.clear();
    this.ttl.clear();
  },
  
  get size() {
    return this.data.size;
  }
};

module.exports = CacheService;