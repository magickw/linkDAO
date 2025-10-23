import { QueryClient, QueryKey } from '@tanstack/react-query';
import { SellerProfile, SellerListing, SellerDashboardStats } from '../types/seller';

// Cache entry with usage tracking
export interface IntelligentCacheEntry<T = any> {
  data: T;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  dependencies: string[];
  priority: CachePriority;
  size: number;
  ttl: number;
}

// Cache priority levels
export enum CachePriority {
  LOW = 1,
  MEDIUM = 2,
  HIGH = 3,
  CRITICAL = 4
}

// Usage pattern tracking
export interface UsagePattern {
  key: string;
  accessFrequency: number;
  averageAccessInterval: number;
  peakUsageTimes: number[];
  userSegments: string[];
  lastAnalyzed: number;
}

// Cache performance metrics
export interface CachePerformanceMetrics {
  hitRate: number;
  missRate: number;
  averageResponseTime: number;
  memoryUsage: number;
  evictionCount: number;
  totalRequests: number;
  totalHits: number;
  totalMisses: number;
  lastUpdated: number;
}

// Cache warming strategy
export interface CacheWarmingStrategy {
  dataTypes: string[];
  priority: CachePriority;
  schedule: 'immediate' | 'lazy' | 'scheduled';
  conditions: WarmingCondition[];
  batchSize: number;
}

// Warming conditions
export interface WarmingCondition {
  type: 'time' | 'usage' | 'dependency' | 'user_action';
  value: any;
  operator: 'gt' | 'lt' | 'eq' | 'contains';
}

// Dependency tracking
export interface CacheDependencyNode {
  key: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  lastUpdated: number;
  updateCount: number;
}

/**
 * Intelligent caching system with dependency tracking, usage pattern analysis,
 * and performance optimization for seller data
 */
export class IntelligentSellerCache {
  private queryClient: QueryClient;
  private cache = new Map<string, IntelligentCacheEntry>();
  private dependencyGraph = new Map<string, CacheDependencyNode>();
  private usagePatterns = new Map<string, UsagePattern>();
  private performanceMetrics: CachePerformanceMetrics;
  private warmingStrategies = new Map<string, CacheWarmingStrategy>();
  private maxCacheSize: number;
  private cleanupInterval: NodeJS.Timeout | null = null;
  private analysisInterval: NodeJS.Timeout | null = null;

  constructor(queryClient: QueryClient, maxCacheSize: number = 1000) {
    this.queryClient = queryClient;
    this.maxCacheSize = maxCacheSize;
    this.performanceMetrics = this.initializeMetrics();
    this.setupDefaultWarmingStrategies();
    this.startPerformanceMonitoring();
  }

  /**
   * Initialize performance metrics
   */
  private initializeMetrics(): CachePerformanceMetrics {
    return {
      hitRate: 0,
      missRate: 0,
      averageResponseTime: 0,
      memoryUsage: 0,
      evictionCount: 0,
      totalRequests: 0,
      totalHits: 0,
      totalMisses: 0,
      lastUpdated: Date.now()
    };
  }

  /**
   * Setup default cache warming strategies
   */
  private setupDefaultWarmingStrategies(): void {
    // High-priority seller profile warming
    this.warmingStrategies.set('seller-profile', {
      dataTypes: ['profile', 'tier'],
      priority: CachePriority.HIGH,
      schedule: 'immediate',
      conditions: [
        { type: 'user_action', value: 'login', operator: 'eq' },
        { type: 'usage', value: 5, operator: 'gt' }
      ],
      batchSize: 10
    });

    // Medium-priority dashboard warming
    this.warmingStrategies.set('seller-dashboard', {
      dataTypes: ['dashboard', 'analytics', 'notifications'],
      priority: CachePriority.MEDIUM,
      schedule: 'lazy',
      conditions: [
        { type: 'time', value: 300000, operator: 'gt' }, // 5 minutes
        { type: 'dependency', value: 'profile', operator: 'contains' }
      ],
      batchSize: 5
    });

    // Low-priority listings warming
    this.warmingStrategies.set('seller-listings', {
      dataTypes: ['listings', 'store'],
      priority: CachePriority.LOW,
      schedule: 'scheduled',
      conditions: [
        { type: 'usage', value: 3, operator: 'gt' },
        { type: 'time', value: 600000, operator: 'gt' } // 10 minutes
      ],
      batchSize: 3
    });
  }

  /**
   * Get data from cache with intelligent tracking
   */
  async get<T>(key: string, walletAddress: string): Promise<T | null> {
    const startTime = Date.now();
    const cacheKey = this.generateCacheKey(key, walletAddress);
    const entry = this.cache.get(cacheKey);

    this.performanceMetrics.totalRequests++;

    if (entry && this.isEntryValid(entry)) {
      // Cache hit
      entry.accessCount++;
      entry.lastAccessed = Date.now();
      this.performanceMetrics.totalHits++;
      this.updateUsagePattern(cacheKey, true);
      
      const responseTime = Date.now() - startTime;
      this.updateAverageResponseTime(responseTime);
      
      return entry.data as T;
    }

    // Cache miss
    this.performanceMetrics.totalMisses++;
    this.updateUsagePattern(cacheKey, false);
    
    // Try to fetch from React Query cache
    const queryKey = this.generateQueryKey(key, walletAddress);
    const queryData = this.queryClient.getQueryData<T>(queryKey);
    
    if (queryData) {
      // Store in intelligent cache
      await this.set(cacheKey, queryData, {
        dependencies: this.getDependencies(key),
        priority: this.calculatePriority(key, walletAddress),
        ttl: this.calculateTTL(key, walletAddress)
      });
      
      // Update metrics for the hit from React Query
      this.performanceMetrics.totalHits++;
      this.performanceMetrics.totalMisses--; // Correct the miss count
      
      return queryData;
    }

    return null;
  }

  /**
   * Set data in cache with intelligent metadata
   */
  async set<T>(
    key: string, 
    data: T, 
    options: {
      dependencies?: string[];
      priority?: CachePriority;
      ttl?: number;
    } = {}
  ): Promise<void> {
    // Extract data type from key for TTL calculation
    const dataType = key.includes(':') ? key.split(':')[1] : key;
    
    const entry: IntelligentCacheEntry<T> = {
      data,
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      dependencies: options.dependencies || [],
      priority: options.priority || CachePriority.MEDIUM,
      size: this.calculateDataSize(data),
      ttl: options.ttl || this.getDefaultTTL(dataType)
    };

    // Check if cache is full and evict if necessary
    if (this.cache.size >= this.maxCacheSize) {
      await this.evictLeastUseful();
    }

    this.cache.set(key, entry);
    this.updateDependencyGraph(key, entry.dependencies);
    this.updateMemoryUsage();
  }

  /**
   * Invalidate cache entries based on dependencies
   */
  async invalidate(key: string): Promise<void> {
    const dependencyNode = this.dependencyGraph.get(key);
    if (!dependencyNode) return;

    // Invalidate this entry
    this.cache.delete(key);

    // Invalidate all dependents
    const invalidationPromises = Array.from(dependencyNode.dependents).map(async (dependent) => {
      this.cache.delete(dependent);
      await this.invalidate(dependent);
    });

    await Promise.all(invalidationPromises);
    this.updateMemoryUsage();
  }

  /**
   * Warm cache based on usage patterns and strategies
   */
  async warmCache(walletAddress: string, strategy?: string): Promise<void> {
    const strategies = strategy 
      ? [this.warmingStrategies.get(strategy)].filter(Boolean)
      : Array.from(this.warmingStrategies.values());

    for (const warmingStrategy of strategies) {
      if (!warmingStrategy || !this.shouldWarmCache(warmingStrategy, walletAddress)) {
        continue;
      }

      const warmingPromises = warmingStrategy.dataTypes.map(async (dataType) => {
        const cacheKey = this.generateCacheKey(dataType, walletAddress);
        const existing = this.cache.get(cacheKey);

        // Skip if already cached and valid
        if (existing && this.isEntryValid(existing)) {
          return;
        }

        try {
          // Fetch data for warming
          const data = await this.fetchSellerData(dataType, walletAddress);

          if (data) {
            await this.set(cacheKey, data, {
              priority: warmingStrategy.priority,
              dependencies: this.getDependencies(dataType)
            });
          }
        } catch (error) {
          console.warn(`[IntelligentSellerCache] Failed to warm cache for ${dataType}:`, error);
        }
      });

      // Process in batches
      const batches = this.chunkArray(warmingPromises, warmingStrategy.batchSize);
      for (const batch of batches) {
        await Promise.all(batch);
        // Small delay between batches to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  }

  /**
   * Analyze usage patterns and optimize cache
   */
  analyzeUsagePatterns(): void {
    const now = Date.now();
    
    this.usagePatterns.forEach((pattern, key) => {
      // Calculate access frequency (accesses per hour)
      const timeSinceLastAnalysis = now - pattern.lastAnalyzed;
      const hoursElapsed = timeSinceLastAnalysis / (1000 * 60 * 60);
      
      if (hoursElapsed > 0) {
        pattern.accessFrequency = pattern.accessFrequency / hoursElapsed;
      }

      // Update cache priorities based on usage
      const entry = this.cache.get(key);
      if (entry) {
        entry.priority = this.calculatePriorityFromUsage(pattern);
      }

      pattern.lastAnalyzed = now;
    });

    // Optimize cache based on patterns
    this.optimizeCacheBasedOnPatterns();
  }

  /**
   * Get cache performance metrics
   */
  getPerformanceMetrics(): CachePerformanceMetrics {
    const totalRequests = this.performanceMetrics.totalRequests;
    
    if (totalRequests > 0) {
      this.performanceMetrics.hitRate = (this.performanceMetrics.totalHits / totalRequests) * 100;
      this.performanceMetrics.missRate = (this.performanceMetrics.totalMisses / totalRequests) * 100;
    }

    this.performanceMetrics.lastUpdated = Date.now();
    return { ...this.performanceMetrics };
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    size: number;
    maxSize: number;
    memoryUsage: number;
    hitRate: number;
    topUsedEntries: Array<{ key: string; accessCount: number; lastAccessed: number }>;
    dependencyCount: number;
    usagePatternCount: number;
  } {
    const entries = Array.from(this.cache.entries());
    const topUsed = entries
      .sort(([, a], [, b]) => b.accessCount - a.accessCount)
      .slice(0, 10)
      .map(([key, entry]) => ({
        key,
        accessCount: entry.accessCount,
        lastAccessed: entry.lastAccessed
      }));

    return {
      size: this.cache.size,
      maxSize: this.maxCacheSize,
      memoryUsage: this.performanceMetrics.memoryUsage,
      hitRate: this.performanceMetrics.hitRate,
      topUsedEntries: topUsed,
      dependencyCount: this.dependencyGraph.size,
      usagePatternCount: this.usagePatterns.size
    };
  }

  /**
   * Clear cache and reset metrics
   */
  clear(): void {
    this.cache.clear();
    this.dependencyGraph.clear();
    this.usagePatterns.clear();
    this.performanceMetrics = this.initializeMetrics();
  }

  /**
   * Start performance monitoring
   */
  private startPerformanceMonitoring(): void {
    // Cleanup old entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, 5 * 60 * 1000);

    // Analyze usage patterns every 15 minutes
    this.analysisInterval = setInterval(() => {
      this.analyzeUsagePatterns();
    }, 15 * 60 * 1000);
  }

  /**
   * Stop performance monitoring
   */
  stopPerformanceMonitoring(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    if (this.analysisInterval) {
      clearInterval(this.analysisInterval);
      this.analysisInterval = null;
    }
  }

  // Private helper methods

  private generateCacheKey(type: string, walletAddress: string): string {
    return `seller:${type}:${walletAddress}`;
  }

  private generateQueryKey(type: string, walletAddress: string): QueryKey {
    return ['seller', type, walletAddress];
  }

  private isEntryValid(entry: IntelligentCacheEntry): boolean {
    return Date.now() - entry.timestamp < entry.ttl;
  }

  private calculateDataSize(data: any): number {
    return JSON.stringify(data).length * 2; // Rough estimate in bytes
  }

  private getDefaultTTL(key: string): number {
    const ttlMap: Record<string, number> = {
      profile: 10 * 60 * 1000, // 10 minutes
      dashboard: 5 * 60 * 1000, // 5 minutes
      listings: 15 * 60 * 1000, // 15 minutes
      analytics: 30 * 60 * 1000, // 30 minutes
      notifications: 2 * 60 * 1000, // 2 minutes
      tier: 60 * 60 * 1000 // 1 hour
    };

    return ttlMap[key] || 5 * 60 * 1000; // Default 5 minutes
  }

  private getDependencies(key: string): string[] {
    const dependencyMap: Record<string, string[]> = {
      dashboard: ['profile', 'listings', 'orders'],
      store: ['profile', 'listings'],
      analytics: ['profile', 'listings', 'orders'],
      notifications: ['profile'],
      tier: ['profile']
    };

    return dependencyMap[key] || [];
  }

  private calculatePriority(key: string, walletAddress: string): CachePriority {
    const pattern = this.usagePatterns.get(this.generateCacheKey(key, walletAddress));
    
    if (!pattern) return CachePriority.MEDIUM;

    if (pattern.accessFrequency > 10) return CachePriority.CRITICAL;
    if (pattern.accessFrequency > 5) return CachePriority.HIGH;
    if (pattern.accessFrequency > 2) return CachePriority.MEDIUM;
    return CachePriority.LOW;
  }

  private calculateTTL(key: string, walletAddress: string): number {
    const pattern = this.usagePatterns.get(this.generateCacheKey(key, walletAddress));
    const baseTTL = this.getDefaultTTL(key);

    if (!pattern) return baseTTL;

    // Adjust TTL based on usage frequency
    if (pattern.accessFrequency > 10) return baseTTL * 2; // Cache longer for frequently accessed data
    if (pattern.accessFrequency < 1) return baseTTL * 0.5; // Cache shorter for rarely accessed data
    
    return baseTTL;
  }

  private async evictLeastUseful(): Promise<void> {
    const entries = Array.from(this.cache.entries());
    
    // Sort by usefulness score (combination of priority, access count, and recency)
    entries.sort(([, a], [, b]) => {
      const scoreA = this.calculateUsefulnessScore(a);
      const scoreB = this.calculateUsefulnessScore(b);
      return scoreA - scoreB;
    });

    // Evict the least useful 10% of entries
    const evictionCount = Math.max(1, Math.floor(entries.length * 0.1));
    
    for (let i = 0; i < evictionCount; i++) {
      const [key] = entries[i];
      this.cache.delete(key);
      this.performanceMetrics.evictionCount++;
    }

    this.updateMemoryUsage();
  }

  private calculateUsefulnessScore(entry: IntelligentCacheEntry): number {
    const now = Date.now();
    const age = now - entry.timestamp;
    const timeSinceAccess = now - entry.lastAccessed;
    
    // Lower score = less useful (will be evicted first)
    return (
      entry.priority * 1000 + // Priority weight
      entry.accessCount * 100 + // Access frequency weight
      Math.max(0, 10000 - age / 1000) + // Recency weight (newer is better)
      Math.max(0, 5000 - timeSinceAccess / 1000) // Recent access weight
    );
  }

  private updateDependencyGraph(key: string, dependencies: string[]): void {
    // Create or update the node
    if (!this.dependencyGraph.has(key)) {
      this.dependencyGraph.set(key, {
        key,
        dependencies: new Set(),
        dependents: new Set(),
        lastUpdated: Date.now(),
        updateCount: 0
      });
    }

    const node = this.dependencyGraph.get(key)!;
    node.dependencies = new Set(dependencies);
    node.lastUpdated = Date.now();
    node.updateCount++;

    // Update reverse dependencies
    dependencies.forEach(dep => {
      if (!this.dependencyGraph.has(dep)) {
        this.dependencyGraph.set(dep, {
          key: dep,
          dependencies: new Set(),
          dependents: new Set(),
          lastUpdated: Date.now(),
          updateCount: 0
        });
      }
      this.dependencyGraph.get(dep)!.dependents.add(key);
    });
  }

  private updateUsagePattern(key: string, hit: boolean): void {
    if (!this.usagePatterns.has(key)) {
      this.usagePatterns.set(key, {
        key,
        accessFrequency: 0,
        averageAccessInterval: 0,
        peakUsageTimes: [],
        userSegments: [],
        lastAnalyzed: Date.now()
      });
    }

    const pattern = this.usagePatterns.get(key)!;
    pattern.accessFrequency++;
    
    // Track peak usage times (hour of day)
    const hour = new Date().getHours();
    if (!pattern.peakUsageTimes.includes(hour)) {
      pattern.peakUsageTimes.push(hour);
    }
  }

  private updateAverageResponseTime(responseTime: number): void {
    const totalTime = this.performanceMetrics.averageResponseTime * (this.performanceMetrics.totalRequests - 1);
    this.performanceMetrics.averageResponseTime = (totalTime + responseTime) / this.performanceMetrics.totalRequests;
  }

  private updateMemoryUsage(): void {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    this.performanceMetrics.memoryUsage = totalSize;
  }

  private shouldWarmCache(strategy: CacheWarmingStrategy, walletAddress: string): boolean {
    return strategy.conditions.every(condition => {
      switch (condition.type) {
        case 'time':
          return this.evaluateTimeCondition(condition, walletAddress);
        case 'usage':
          return this.evaluateUsageCondition(condition, walletAddress);
        case 'dependency':
          return this.evaluateDependencyCondition(condition, walletAddress);
        case 'user_action':
          return this.evaluateUserActionCondition(condition, walletAddress);
        default:
          return true;
      }
    });
  }

  private evaluateTimeCondition(condition: WarmingCondition, walletAddress: string): boolean {
    // Implementation would depend on specific time-based logic
    return true;
  }

  private evaluateUsageCondition(condition: WarmingCondition, walletAddress: string): boolean {
    const pattern = this.usagePatterns.get(this.generateCacheKey('profile', walletAddress));
    if (!pattern) return false;

    switch (condition.operator) {
      case 'gt':
        return pattern.accessFrequency > condition.value;
      case 'lt':
        return pattern.accessFrequency < condition.value;
      case 'eq':
        return pattern.accessFrequency === condition.value;
      default:
        return false;
    }
  }

  private evaluateDependencyCondition(condition: WarmingCondition, walletAddress: string): boolean {
    const key = this.generateCacheKey(condition.value, walletAddress);
    return this.cache.has(key);
  }

  private evaluateUserActionCondition(condition: WarmingCondition, walletAddress: string): boolean {
    // This would be implemented based on user action tracking
    return true;
  }

  private calculatePriorityFromUsage(pattern: UsagePattern): CachePriority {
    if (pattern.accessFrequency > 20) return CachePriority.CRITICAL;
    if (pattern.accessFrequency > 10) return CachePriority.HIGH;
    if (pattern.accessFrequency > 3) return CachePriority.MEDIUM;
    return CachePriority.LOW;
  }

  private optimizeCacheBasedOnPatterns(): void {
    // Adjust TTLs based on usage patterns
    this.cache.forEach((entry, key) => {
      const pattern = this.usagePatterns.get(key);
      if (pattern) {
        entry.ttl = this.calculateTTL(key.split(':')[1], key.split(':')[2]);
      }
    });
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => {
      this.cache.delete(key);
    });

    if (expiredKeys.length > 0) {
      this.updateMemoryUsage();
    }
  }

  private chunkArray<T>(array: T[], chunkSize: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  private async fetchSellerData(dataType: string, walletAddress: string): Promise<any> {
    try {
      // Make real API call to backend
      const response = await fetch(`/api/seller/${walletAddress}/${dataType}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        if (response.status === 404) {
          return null; // Seller data not found
        }
        throw new Error(`Failed to fetch seller ${dataType}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error(`Error fetching seller ${dataType}:`, error);
      // Return null instead of mock data on error
      return null;
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stopPerformanceMonitoring();
    this.clear();
  }
}

// Export singleton factory
let intelligentSellerCacheInstance: IntelligentSellerCache | null = null;

export const createIntelligentSellerCache = (queryClient: QueryClient, maxCacheSize?: number): IntelligentSellerCache => {
  if (!intelligentSellerCacheInstance) {
    intelligentSellerCacheInstance = new IntelligentSellerCache(queryClient, maxCacheSize);
  }
  return intelligentSellerCacheInstance;
};

export const getIntelligentSellerCache = (): IntelligentSellerCache | null => {
  return intelligentSellerCacheInstance;
};