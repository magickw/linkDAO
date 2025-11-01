/**
 * Simple Cache Service - Fallback without Redis dependency
 * Uses only in-memory caching for deployment environments without Redis
 */

class SimpleCacheService {
  constructor() {
    this.cache = new Map();
    this.ttl = new Map();
    this.isConnected = false;
    this.defaultTTL = 3600; // 1 hour default TTL
    
    // Start cleanup interval
    this.startCleanup();
    
    console.log('📝 Simple Cache Service initialized (memory-only mode)');
  }

  /**
   * Generic cache operations
   */
  async get(key) {
    const now = Date.now();
    const expiry = this.ttl.get(key);
    
    if (expiry && expiry < now) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    
    return this.cache.get(key) || null;
  }

  async set(key, value, ttl = this.defaultTTL) {
    this.cache.set(key, value);
    if (ttl > 0) {
      this.ttl.set(key, Date.now() + ttl * 1000);
    }
    return true;
  }

  async del(key) {
    this.cache.delete(key);
    this.ttl.delete(key);
    return true;
  }

  async exists(key) {
    return this.get(key) !== null;
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
    // Clear all product listing cache keys
    for (const key of this.cache.keys()) {
      if (key.startsWith('products:listings:')) {
        this.cache.delete(key);
        this.ttl.delete(key);
      }
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
    
    const current = (await this.get(cacheKey)) || 0;
    if (current >= limit) {
      return { allowed: false, remaining: 0, resetTime: Date.now() + window * 1000 };
    }
    
    await this.set(cacheKey, current + 1, window);
    return { allowed: true, remaining: limit - current - 1, resetTime: Date.now() + window * 1000 };
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
    return Promise.all(keys.map(key => this.get(key)));
  }

  async mset(keyValuePairs, ttl = this.defaultTTL) {
    keyValuePairs.forEach(([key, value]) => {
      this.set(key, value, ttl);
    });
    return true;
  }

  /**
   * Cache warming operations
   */
  async warmCache() {
    console.log('🔥 Warming cache with popular data...');
    
    try {
      // Warm popular products (mock data)
      const popularProducts = [];
      await this.setProductListings(popularProducts, { popular: true }, 7200);
      
      // Warm category data (mock data)
      const categories = [];
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
    return {
      connected: false,
      type: 'memory',
      memoryUsage: this.cache.size,
      keys: this.cache.size,
      uptime: process.uptime(),
    };
  }

  /**
   * Utility methods
   */
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

  /**
   * Memory cache cleanup
   */
  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [key, expiry] of this.ttl.entries()) {
        if (expiry < now) {
          this.cache.delete(key);
          this.ttl.delete(key);
        }
      }
    }, 60000); // Clean up every minute
  }

  /**
   * Graceful shutdown
   */
  async close() {
    this.cache.clear();
    this.ttl.clear();
    console.log('🔌 Simple cache service closed gracefully');
  }
}

module.exports = SimpleCacheService;