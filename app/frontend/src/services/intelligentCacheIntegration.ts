import { QueryClient } from '@tanstack/react-query';
import { IntelligentSellerCache, createIntelligentSellerCache } from './intelligentSellerCache';
import { CachePerformanceMonitor, createCachePerformanceMonitor } from './cachePerformanceMonitor';
import { CacheOptimizationService, createCacheOptimizationService } from './cacheOptimizationService';
import { SellerCacheManager, createSellerCacheManager } from './sellerCacheManager';

// Integration configuration
export interface IntelligentCacheConfig {
  maxCacheSize?: number;
  performanceThresholds?: {
    minHitRate?: number;
    maxResponseTime?: number;
    maxMemoryUsage?: number;
    maxEvictionRate?: number;
  };
  monitoring?: {
    enabled?: boolean;
    intervalMs?: number;
  };
  optimization?: {
    enabled?: boolean;
    intervalMs?: number;
  };
  warming?: {
    enabled?: boolean;
    strategies?: string[];
  };
}

// Cache system status
export interface CacheSystemStatus {
  intelligent: {
    enabled: boolean;
    size: number;
    hitRate: number;
    memoryUsage: number;
  };
  performance: {
    monitoring: boolean;
    alertCount: number;
    lastCheck: number;
  };
  optimization: {
    enabled: boolean;
    lastRun: number;
    strategiesApplied: number;
  };
  legacy: {
    enabled: boolean;
    size: number;
  };
}

/**
 * Integrated intelligent caching system for seller data
 * Combines intelligent cache, performance monitoring, and optimization
 */
export class IntelligentCacheIntegration {
  private queryClient: QueryClient;
  private config: IntelligentCacheConfig;
  
  // Core components
  private intelligentCache!: IntelligentSellerCache;
  private performanceMonitor!: CachePerformanceMonitor;
  private optimizationService!: CacheOptimizationService;
  private legacyCacheManager!: SellerCacheManager;
  
  // State
  private isInitialized = false;
  private migrationInProgress = false;

  constructor(queryClient: QueryClient, config: IntelligentCacheConfig = {}) {
    this.queryClient = queryClient;
    this.config = {
      maxCacheSize: 1000,
      performanceThresholds: {
        minHitRate: 70,
        maxResponseTime: 100,
        maxMemoryUsage: 50 * 1024 * 1024,
        maxEvictionRate: 10
      },
      monitoring: {
        enabled: true,
        intervalMs: 5 * 60 * 1000 // 5 minutes
      },
      optimization: {
        enabled: true,
        intervalMs: 15 * 60 * 1000 // 15 minutes
      },
      warming: {
        enabled: true,
        strategies: ['seller-profile', 'seller-dashboard']
      },
      ...config
    };

    this.initializeComponents();
  }

  /**
   * Initialize all cache components
   */
  private initializeComponents(): void {
    try {
      // Initialize intelligent cache
      this.intelligentCache = createIntelligentSellerCache(
        this.queryClient, 
        this.config.maxCacheSize
      );

      // Initialize performance monitor
      this.performanceMonitor = createCachePerformanceMonitor(
        this.intelligentCache,
        this.config.performanceThresholds
      );

      // Initialize optimization service
      this.optimizationService = createCacheOptimizationService(
        this.intelligentCache,
        this.performanceMonitor
      );

      // Initialize legacy cache manager for backward compatibility
      this.legacyCacheManager = createSellerCacheManager(this.queryClient);

      this.isInitialized = true;
      console.log('[IntelligentCacheIntegration] All components initialized successfully');

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Failed to initialize components:', error);
      throw error;
    }
  }

  /**
   * Start the intelligent caching system
   */
  async start(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('Cache system not initialized');
    }

    try {
      // Start performance monitoring
      if (this.config.monitoring?.enabled) {
        this.performanceMonitor.startMonitoring(this.config.monitoring.intervalMs);
      }

      // Start optimization
      if (this.config.optimization?.enabled) {
        this.optimizationService.startOptimization(this.config.optimization.intervalMs);
      }

      // Migrate from legacy cache if needed
      await this.migrateLegacyCache();

      // Warm cache with initial data
      if (this.config.warming?.enabled) {
        await this.performInitialCacheWarming();
      }

      console.log('[IntelligentCacheIntegration] Intelligent caching system started');

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Failed to start cache system:', error);
      throw error;
    }
  }

  /**
   * Stop the intelligent caching system
   */
  stop(): void {
    try {
      this.performanceMonitor.stopMonitoring();
      this.optimizationService.stopOptimization();
      this.intelligentCache.stopPerformanceMonitoring();

      console.log('[IntelligentCacheIntegration] Intelligent caching system stopped');

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Error stopping cache system:', error);
    }
  }

  /**
   * Get seller data with intelligent caching
   */
  async getSellerData<T>(
    dataType: string, 
    walletAddress: string, 
    fallbackFn?: () => Promise<T>
  ): Promise<T | null> {
    try {
      // Try intelligent cache first
      const cachedData = await this.intelligentCache.get<T>(dataType, walletAddress);
      
      if (cachedData) {
        return cachedData;
      }

      // Fallback to legacy cache
      const legacyData = this.queryClient.getQueryData<T>(['seller', dataType, walletAddress]);
      
      if (legacyData) {
        // Store in intelligent cache for future use
        await this.intelligentCache.set(`${dataType}:${walletAddress}`, legacyData);
        return legacyData;
      }

      // Use fallback function if provided
      if (fallbackFn) {
        const freshData = await fallbackFn();
        if (freshData) {
          await this.intelligentCache.set(`${dataType}:${walletAddress}`, freshData);
        }
        return freshData;
      }

      return null;

    } catch (error) {
      console.error(`[IntelligentCacheIntegration] Error getting seller data for ${dataType}:`, error);
      return null;
    }
  }

  /**
   * Set seller data in intelligent cache
   */
  async setSellerData<T>(
    dataType: string, 
    walletAddress: string, 
    data: T,
    options?: {
      priority?: any;
      ttl?: number;
      dependencies?: string[];
    }
  ): Promise<void> {
    try {
      const cacheKey = `${dataType}:${walletAddress}`;
      await this.intelligentCache.set(cacheKey, data, options);

      // Also update legacy cache for backward compatibility
      const queryKey = ['seller', dataType, walletAddress];
      this.queryClient.setQueryData(queryKey, data);

    } catch (error) {
      console.error(`[IntelligentCacheIntegration] Error setting seller data for ${dataType}:`, error);
    }
  }

  /**
   * Invalidate seller cache
   */
  async invalidateSellerCache(walletAddress: string, dataTypes?: string[]): Promise<void> {
    try {
      // Invalidate in intelligent cache
      if (dataTypes) {
        for (const dataType of dataTypes) {
          const cacheKey = `${dataType}:${walletAddress}`;
          await this.intelligentCache.invalidate(cacheKey);
        }
      } else {
        // Invalidate all data for wallet
        const allDataTypes = ['profile', 'dashboard', 'listings', 'orders', 'notifications', 'store', 'analytics'];
        for (const dataType of allDataTypes) {
          const cacheKey = `${dataType}:${walletAddress}`;
          await this.intelligentCache.invalidate(cacheKey);
        }
      }

      // Also invalidate legacy cache
      await this.legacyCacheManager.invalidateSellerCache(walletAddress);

    } catch (error) {
      console.error(`[IntelligentCacheIntegration] Error invalidating cache for ${walletAddress}:`, error);
    }
  }

  /**
   * Warm cache for specific wallet
   */
  async warmCacheForWallet(walletAddress: string, strategies?: string[]): Promise<void> {
    try {
      const strategiesToUse = strategies || this.config.warming?.strategies || ['seller-profile'];
      
      for (const strategy of strategiesToUse) {
        await this.intelligentCache.warmCache(walletAddress, strategy);
      }

      console.log(`[IntelligentCacheIntegration] Cache warmed for wallet: ${walletAddress}`);

    } catch (error) {
      console.error(`[IntelligentCacheIntegration] Error warming cache for ${walletAddress}:`, error);
    }
  }

  /**
   * Get system status
   */
  getSystemStatus(): CacheSystemStatus {
    const intelligentStats = this.intelligentCache.getCacheStats();
    const performanceMetrics = this.performanceMonitor.getCurrentMetrics();
    const activeAlerts = this.performanceMonitor.getActiveAlerts();
    const optimizationHistory = this.optimizationService.getOptimizationHistory(1);
    const legacyStats = this.legacyCacheManager.getCacheStats();

    return {
      intelligent: {
        enabled: this.isInitialized,
        size: intelligentStats.size,
        hitRate: performanceMetrics.hitRate,
        memoryUsage: intelligentStats.memoryUsage
      },
      performance: {
        monitoring: this.config.monitoring?.enabled || false,
        alertCount: activeAlerts.length,
        lastCheck: performanceMetrics.lastUpdated
      },
      optimization: {
        enabled: this.config.optimization?.enabled || false,
        lastRun: optimizationHistory[0]?.timestamp || 0,
        strategiesApplied: optimizationHistory[0]?.actionsApplied.length || 0
      },
      legacy: {
        enabled: true,
        size: legacyStats.totalEntries
      }
    };
  }

  /**
   * Get comprehensive cache report
   */
  getCacheReport(): {
    status: CacheSystemStatus;
    performance: any;
    optimization: any;
    usageAnalysis: any;
    recommendations: any[];
  } {
    const status = this.getSystemStatus();
    const performanceReport = this.performanceMonitor.generatePerformanceReport();
    const optimizationHistory = this.optimizationService.getOptimizationHistory(10);
    const usageAnalysis = this.optimizationService.analyzeUsagePatterns();
    const recommendations = this.optimizationService.getOptimizationRecommendations();

    return {
      status,
      performance: performanceReport,
      optimization: {
        history: optimizationHistory,
        strategies: Array.from(this.optimizationService.getStrategies().keys())
      },
      usageAnalysis,
      recommendations
    };
  }

  /**
   * Run manual optimization
   */
  async runOptimization(): Promise<any[]> {
    try {
      const results = await this.optimizationService.runOptimization();
      console.log(`[IntelligentCacheIntegration] Manual optimization completed. Applied ${results.length} strategies`);
      return results;
    } catch (error) {
      console.error('[IntelligentCacheIntegration] Error running manual optimization:', error);
      throw error;
    }
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<IntelligentCacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Restart services with new config if needed
    if (this.isInitialized) {
      this.stop();
      this.start();
    }
  }

  /**
   * Clear all caches
   */
  async clearAllCaches(): Promise<void> {
    try {
      this.intelligentCache.clear();
      await this.legacyCacheManager.clearSellerCache('*'); // Clear all
      this.queryClient.clear();

      console.log('[IntelligentCacheIntegration] All caches cleared');

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Error clearing caches:', error);
    }
  }

  // Private methods

  private async migrateLegacyCache(): Promise<void> {
    if (this.migrationInProgress) {
      return;
    }

    this.migrationInProgress = true;

    try {
      console.log('[IntelligentCacheIntegration] Starting legacy cache migration');

      // Get all queries from React Query cache
      const queries = this.queryClient.getQueryCache().getAll();
      const sellerQueries = queries.filter(query => 
        Array.isArray(query.queryKey) && 
        query.queryKey[0] === 'seller' &&
        query.state.data
      );

      let migratedCount = 0;

      for (const query of sellerQueries) {
        try {
          const [, dataType, walletAddress] = query.queryKey as string[];
          if (dataType && walletAddress && query.state.data) {
            const cacheKey = `${dataType}:${walletAddress}`;
            await this.intelligentCache.set(cacheKey, query.state.data);
            migratedCount++;
          }
        } catch (error) {
          console.warn('[IntelligentCacheIntegration] Failed to migrate query:', query.queryKey, error);
        }
      }

      console.log(`[IntelligentCacheIntegration] Legacy cache migration completed. Migrated ${migratedCount} entries`);

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Error during legacy cache migration:', error);
    } finally {
      this.migrationInProgress = false;
    }
  }

  private async performInitialCacheWarming(): Promise<void> {
    try {
      console.log('[IntelligentCacheIntegration] Starting initial cache warming');

      // This would typically warm cache for active users
      // For now, we'll just log the warming process
      const strategies = this.config.warming?.strategies || [];
      
      for (const strategy of strategies) {
        console.log(`[IntelligentCacheIntegration] Warming cache with strategy: ${strategy}`);
        // In a real implementation, this would warm cache for active users
      }

      console.log('[IntelligentCacheIntegration] Initial cache warming completed');

    } catch (error) {
      console.error('[IntelligentCacheIntegration] Error during initial cache warming:', error);
    }
  }

  /**
   * Cleanup resources
   */
  cleanup(): void {
    this.stop();
    this.intelligentCache.cleanup();
    this.performanceMonitor.cleanup();
    this.optimizationService.cleanup();
    this.legacyCacheManager.cleanup();
  }
}

// Export singleton factory
let intelligentCacheIntegrationInstance: IntelligentCacheIntegration | null = null;

export const createIntelligentCacheIntegration = (
  queryClient: QueryClient,
  config?: IntelligentCacheConfig
): IntelligentCacheIntegration => {
  if (!intelligentCacheIntegrationInstance) {
    intelligentCacheIntegrationInstance = new IntelligentCacheIntegration(queryClient, config);
  }
  return intelligentCacheIntegrationInstance;
};

export const getIntelligentCacheIntegration = (): IntelligentCacheIntegration | null => {
  return intelligentCacheIntegrationInstance;
};