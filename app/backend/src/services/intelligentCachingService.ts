import { Injectable, Logger } from '@nestjs/common';
import { Redis, Cluster } from 'ioredis';
import { EventEmitter } from 'events';
import { createHash } from 'crypto';

interface CacheEntry {
  key: string;
  value: any;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: number;
}

interface CacheStrategy {
  name: string;
  algorithm: 'lru' | 'lfu' | 'arc' | 'adaptive';
  maxSize: number;
  ttl: number;
  evictionPolicy: 'size' | 'time' | 'access';
}

interface PredictiveModel {
  features: string[];
  weights: number[];
  threshold: number;
  accuracy: number;
}

interface GeographicRegion {
  name: string;
  weight: number;
  cacheSize: string;
  latency: number;
}

@Injectable()
export class IntelligentCachingService extends EventEmitter {
  private readonly logger = new Logger(IntelligentCachingService.name);
  private readonly redisCluster: Cluster;
  private readonly localCache: Map<string, CacheEntry> = new Map();
  private readonly strategies: Map<string, CacheStrategy> = new Map();
  private readonly predictiveModel: PredictiveModel;
  private readonly regions: Map<string, GeographicRegion> = new Map();
  private readonly metrics: Map<string, number> = new Map();

  constructor() {
    super();
    this.initializeRedisCluster();
    this.initializeStrategies();
    this.initializePredictiveModel();
    this.initializeRegions();
    this.startMetricsCollection();
    this.startCacheOptimization();
  }

  private initializeRedisCluster(): void {
    this.redisCluster = new Cluster([
      { host: process.env.REDIS_NODE_1_HOST, port: parseInt(process.env.REDIS_NODE_1_PORT) },
      { host: process.env.REDIS_NODE_2_HOST, port: parseInt(process.env.REDIS_NODE_2_PORT) },
      { host: process.env.REDIS_NODE_3_HOST, port: parseInt(process.env.REDIS_NODE_3_PORT) },
    ], {
      redisOptions: {
        password: process.env.REDIS_PASSWORD,
      },
      enableOfflineQueue: false,
      maxRetriesPerRequest: 3,
    });

    this.redisCluster.on('error', (error) => {
      this.logger.error(`Redis cluster error: ${error.message}`, error.stack);
    });

    this.redisCluster.on('ready', () => {
      this.logger.log('Redis cluster connected and ready');
    });
  }

  private initializeStrategies(): void {
    const strategies: CacheStrategy[] = [
      {
        name: 'static_assets',
        algorithm: 'lru',
        maxSize: 10 * 1024 * 1024 * 1024, // 10GB
        ttl: 2592000, // 30 days
        evictionPolicy: 'time',
      },
      {
        name: 'api_responses',
        algorithm: 'adaptive',
        maxSize: 2 * 1024 * 1024 * 1024, // 2GB
        ttl: 300, // 5 minutes
        evictionPolicy: 'access',
      },
      {
        name: 'user_data',
        algorithm: 'lfu',
        maxSize: 1 * 1024 * 1024 * 1024, // 1GB
        ttl: 60, // 1 minute
        evictionPolicy: 'size',
      },
      {
        name: 'blockchain_data',
        algorithm: 'arc',
        maxSize: 5 * 1024 * 1024 * 1024, // 5GB
        ttl: 30, // 30 seconds
        evictionPolicy: 'time',
      },
    ];

    strategies.forEach(strategy => {
      this.strategies.set(strategy.name, strategy);
    });
  }

  private initializePredictiveModel(): void {
    // Initialize ML model for cache prediction
    this.predictiveModel = {
      features: [
        'user_behavior_score',
        'content_popularity',
        'time_of_day',
        'geographic_location',
        'device_type',
        'network_speed',
      ],
      weights: [0.25, 0.30, 0.15, 0.15, 0.10, 0.05],
      threshold: 0.7,
      accuracy: 0.85,
    };
  }

  private initializeRegions(): void {
    const regions: GeographicRegion[] = [
      { name: 'us-east', weight: 0.4, cacheSize: '10GB', latency: 50 },
      { name: 'eu-west', weight: 0.3, cacheSize: '8GB', latency: 75 },
      { name: 'ap-southeast', weight: 0.3, cacheSize: '8GB', latency: 100 },
    ];

    regions.forEach(region => {
      this.regions.set(region.name, region);
    });
  }

  async set(
    key: string,
    value: any,
    options: {
      ttl?: number;
      strategy?: string;
      tags?: string[];
      priority?: number;
      region?: string;
    } = {}
  ): Promise<void> {
    try {
      const strategy = this.strategies.get(options.strategy || 'api_responses');
      const ttl = options.ttl || strategy.ttl;
      const tags = options.tags || [];
      const priority = options.priority || this.calculatePriority(key, value, tags);
      const region = options.region || this.selectOptimalRegion(key);

      // Serialize value
      const serializedValue = JSON.stringify(value);
      const size = Buffer.byteLength(serializedValue, 'utf8');

      // Create cache entry
      const entry: CacheEntry = {
        key,
        value,
        ttl,
        accessCount: 0,
        lastAccessed: Date.now(),
        size,
        tags,
        priority,
      };

      // Store in local cache for frequently accessed items
      if (priority > 0.8) {
        this.localCache.set(key, entry);
      }

      // Store in Redis cluster
      const pipeline = this.redisCluster.pipeline();
      pipeline.setex(key, ttl, serializedValue);
      pipeline.hset(`meta:${key}`, {
        size,
        priority,
        tags: JSON.stringify(tags),
        region,
        created: Date.now(),
      });
      
      await pipeline.exec();

      // Update metrics
      this.updateMetrics('cache_sets', 1);
      this.updateMetrics('cache_size', size);

      // Emit cache event
      this.emit('cache:set', { key, size, ttl, priority, region });

      this.logger.debug(`Cache set: ${key} (${size} bytes, TTL: ${ttl}s, Priority: ${priority})`);
    } catch (error) {
      this.logger.error(`Cache set failed for key ${key}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async get(key: string, options: { region?: string } = {}): Promise<any> {
    try {
      const startTime = Date.now();

      // Check local cache first
      const localEntry = this.localCache.get(key);
      if (localEntry) {
        localEntry.accessCount++;
        localEntry.lastAccessed = Date.now();
        this.updateMetrics('cache_hits_local', 1);
        this.emit('cache:hit', { key, source: 'local', responseTime: Date.now() - startTime });
        return localEntry.value;
      }

      // Check Redis cluster
      const value = await this.redisCluster.get(key);
      if (value) {
        const parsedValue = JSON.parse(value);
        
        // Update access metadata
        await this.redisCluster.hincrby(`meta:${key}`, 'accessCount', 1);
        await this.redisCluster.hset(`meta:${key}`, 'lastAccessed', Date.now());

        // Promote to local cache if frequently accessed
        const metadata = await this.redisCluster.hgetall(`meta:${key}`);
        const accessCount = parseInt(metadata.accessCount || '0');
        const priority = parseFloat(metadata.priority || '0');
        
        if (accessCount > 10 || priority > 0.8) {
          this.localCache.set(key, {
            key,
            value: parsedValue,
            ttl: 0, // Will be managed by Redis TTL
            accessCount,
            lastAccessed: Date.now(),
            size: parseInt(metadata.size || '0'),
            tags: JSON.parse(metadata.tags || '[]'),
            priority,
          });
        }

        this.updateMetrics('cache_hits_redis', 1);
        this.emit('cache:hit', { key, source: 'redis', responseTime: Date.now() - startTime });
        return parsedValue;
      }

      // Cache miss
      this.updateMetrics('cache_misses', 1);
      this.emit('cache:miss', { key, responseTime: Date.now() - startTime });
      return null;
    } catch (error) {
      this.logger.error(`Cache get failed for key ${key}: ${error.message}`, error.stack);
      this.updateMetrics('cache_errors', 1);
      return null;
    }
  }

  async invalidate(pattern: string): Promise<number> {
    try {
      // Invalidate from local cache
      let localInvalidated = 0;
      for (const [key] of this.localCache) {
        if (this.matchesPattern(key, pattern)) {
          this.localCache.delete(key);
          localInvalidated++;
        }
      }

      // Invalidate from Redis cluster
      const keys = await this.redisCluster.keys(pattern);
      if (keys.length > 0) {
        const pipeline = this.redisCluster.pipeline();
        keys.forEach(key => {
          pipeline.del(key);
          pipeline.del(`meta:${key}`);
        });
        await pipeline.exec();
      }

      const totalInvalidated = localInvalidated + keys.length;
      this.updateMetrics('cache_invalidations', totalInvalidated);
      this.emit('cache:invalidate', { pattern, count: totalInvalidated });

      this.logger.log(`Cache invalidated: ${totalInvalidated} entries for pattern ${pattern}`);
      return totalInvalidated;
    } catch (error) {
      this.logger.error(`Cache invalidation failed for pattern ${pattern}: ${error.message}`, error.stack);
      throw error;
    }
  }

  async invalidateByTags(tags: string[]): Promise<number> {
    try {
      let invalidated = 0;

      // Find keys with matching tags
      const allKeys = await this.redisCluster.keys('meta:*');
      const keysToInvalidate: string[] = [];

      for (const metaKey of allKeys) {
        const metadata = await this.redisCluster.hgetall(metaKey);
        const entryTags = JSON.parse(metadata.tags || '[]');
        
        if (tags.some(tag => entryTags.includes(tag))) {
          const originalKey = metaKey.replace('meta:', '');
          keysToInvalidate.push(originalKey);
        }
      }

      // Invalidate found keys
      if (keysToInvalidate.length > 0) {
        invalidated = await this.invalidate(`{${keysToInvalidate.join(',')}}`);
      }

      this.logger.log(`Cache invalidated by tags: ${invalidated} entries for tags [${tags.join(', ')}]`);
      return invalidated;
    } catch (error) {
      this.logger.error(`Cache invalidation by tags failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  private calculatePriority(key: string, value: any, tags: string[]): number {
    // Calculate cache priority using predictive model
    const features = this.extractFeatures(key, value, tags);
    let score = 0;

    for (let i = 0; i < features.length; i++) {
      score += features[i] * this.predictiveModel.weights[i];
    }

    return Math.min(Math.max(score, 0), 1); // Normalize to 0-1
  }

  private extractFeatures(key: string, value: any, tags: string[]): number[] {
    // Extract features for ML model
    const now = new Date();
    const hour = now.getHours();
    
    return [
      this.getUserBehaviorScore(key), // user_behavior_score
      this.getContentPopularity(key, tags), // content_popularity
      this.getTimeOfDayScore(hour), // time_of_day
      this.getGeographicScore(), // geographic_location
      this.getDeviceTypeScore(), // device_type
      this.getNetworkSpeedScore(), // network_speed
    ];
  }

  private getUserBehaviorScore(key: string): number {
    // Analyze user behavior patterns
    // This would integrate with user analytics
    return Math.random(); // Placeholder
  }

  private getContentPopularity(key: string, tags: string[]): number {
    // Calculate content popularity based on access patterns
    const popularTags = ['trending', 'featured', 'popular'];
    const hasPopularTag = tags.some(tag => popularTags.includes(tag));
    return hasPopularTag ? 0.8 : 0.3;
  }

  private getTimeOfDayScore(hour: number): number {
    // Peak hours: 8-10 AM and 6-10 PM
    if ((hour >= 8 && hour <= 10) || (hour >= 18 && hour <= 22)) {
      return 0.9;
    }
    return 0.4;
  }

  private getGeographicScore(): number {
    // This would be based on user's geographic location
    return 0.5; // Placeholder
  }

  private getDeviceTypeScore(): number {
    // Mobile devices might have different caching needs
    return 0.6; // Placeholder
  }

  private getNetworkSpeedScore(): number {
    // Slower networks benefit more from caching
    return 0.7; // Placeholder
  }

  private selectOptimalRegion(key: string): string {
    // Select region based on key characteristics and load
    const keyHash = createHash('md5').update(key).digest('hex');
    const hashValue = parseInt(keyHash.substring(0, 8), 16);
    
    const regions = Array.from(this.regions.entries());
    const totalWeight = regions.reduce((sum, [, region]) => sum + region.weight, 0);
    
    let cumulativeWeight = 0;
    const target = (hashValue % 1000) / 1000 * totalWeight;
    
    for (const [name, region] of regions) {
      cumulativeWeight += region.weight;
      if (target <= cumulativeWeight) {
        return name;
      }
    }
    
    return regions[0][0]; // Fallback
  }

  private matchesPattern(key: string, pattern: string): boolean {
    // Simple pattern matching - could be enhanced with regex
    return pattern.includes('*') 
      ? key.startsWith(pattern.replace('*', ''))
      : key === pattern;
  }

  private updateMetrics(metric: string, value: number): void {
    const current = this.metrics.get(metric) || 0;
    this.metrics.set(metric, current + value);
  }

  private startMetricsCollection(): void {
    setInterval(async () => {
      try {
        const hitRate = this.calculateHitRate();
        const memoryUsage = await this.getMemoryUsage();
        
        // Store metrics in Redis for monitoring
        await this.redisCluster.hset('cache:metrics', {
          hit_rate: hitRate,
          memory_usage: memoryUsage,
          local_cache_size: this.localCache.size,
          timestamp: Date.now(),
        });

        // Emit metrics event
        this.emit('metrics:update', {
          hitRate,
          memoryUsage,
          localCacheSize: this.localCache.size,
        });
      } catch (error) {
        this.logger.error(`Metrics collection failed: ${error.message}`, error.stack);
      }
    }, 60000); // Every minute
  }

  private startCacheOptimization(): void {
    setInterval(async () => {
      try {
        await this.optimizeLocalCache();
        await this.rebalanceRegions();
        await this.updatePredictiveModel();
      } catch (error) {
        this.logger.error(`Cache optimization failed: ${error.message}`, error.stack);
      }
    }, 900000); // Every 15 minutes
  }

  private async optimizeLocalCache(): Promise<void> {
    const maxLocalCacheSize = 1000; // Maximum entries in local cache
    
    if (this.localCache.size > maxLocalCacheSize) {
      // Sort by priority and last accessed time
      const entries = Array.from(this.localCache.entries())
        .sort(([, a], [, b]) => {
          const scoreA = a.priority * 0.7 + (Date.now() - a.lastAccessed) * 0.3;
          const scoreB = b.priority * 0.7 + (Date.now() - b.lastAccessed) * 0.3;
          return scoreB - scoreA;
        });

      // Remove least valuable entries
      const toRemove = entries.slice(maxLocalCacheSize);
      toRemove.forEach(([key]) => {
        this.localCache.delete(key);
      });

      this.logger.log(`Local cache optimized: removed ${toRemove.length} entries`);
    }
  }

  private async rebalanceRegions(): Promise<void> {
    // Analyze regional load and rebalance if necessary
    const regionMetrics = new Map<string, { load: number; latency: number }>();
    
    for (const [name, region] of this.regions) {
      // This would integrate with actual monitoring data
      regionMetrics.set(name, {
        load: Math.random(), // Placeholder
        latency: region.latency + Math.random() * 20,
      });
    }

    // Adjust weights based on performance
    for (const [name, metrics] of regionMetrics) {
      const region = this.regions.get(name);
      if (region) {
        // Reduce weight for overloaded regions
        if (metrics.load > 0.8) {
          region.weight *= 0.9;
        } else if (metrics.load < 0.3) {
          region.weight *= 1.1;
        }
        
        // Normalize weights
        region.weight = Math.min(Math.max(region.weight, 0.1), 1.0);
      }
    }
  }

  private async updatePredictiveModel(): Promise<void> {
    // Update ML model based on recent cache performance
    // This would integrate with actual ML training pipeline
    const recentMetrics = await this.getRecentMetrics();
    
    if (recentMetrics.accuracy < this.predictiveModel.accuracy * 0.9) {
      // Retrain model if accuracy drops significantly
      this.logger.log('Predictive model accuracy dropped, scheduling retraining');
      this.emit('model:retrain', { currentAccuracy: recentMetrics.accuracy });
    }
  }

  private calculateHitRate(): number {
    const hits = (this.metrics.get('cache_hits_local') || 0) + 
                 (this.metrics.get('cache_hits_redis') || 0);
    const misses = this.metrics.get('cache_misses') || 0;
    const total = hits + misses;
    
    return total > 0 ? hits / total : 0;
  }

  private async getMemoryUsage(): Promise<number> {
    try {
      const info = await this.redisCluster.info('memory');
      const match = info.match(/used_memory:(\d+)/);
      return match ? parseInt(match[1]) : 0;
    } catch (error) {
      return 0;
    }
  }

  private async getRecentMetrics(): Promise<{ accuracy: number }> {
    // Placeholder for actual metrics analysis
    return { accuracy: 0.85 };
  }

  async getMetrics(): Promise<{
    hitRate: number;
    memoryUsage: number;
    localCacheSize: number;
    totalSets: number;
    totalGets: number;
    totalInvalidations: number;
  }> {
    return {
      hitRate: this.calculateHitRate(),
      memoryUsage: await this.getMemoryUsage(),
      localCacheSize: this.localCache.size,
      totalSets: this.metrics.get('cache_sets') || 0,
      totalGets: (this.metrics.get('cache_hits_local') || 0) + 
                 (this.metrics.get('cache_hits_redis') || 0) + 
                 (this.metrics.get('cache_misses') || 0),
      totalInvalidations: this.metrics.get('cache_invalidations') || 0,
    };
  }
}
