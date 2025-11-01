import { logger } from '../utils/logger';

// Fallback data interfaces
interface FallbackData<T = any> {
  data: T;
  timestamp: Date;
  source: 'cache' | 'static' | 'mock' | 'previous';
  expiresAt?: Date;
  metadata?: any;
}

interface FallbackConfig {
  enableStaticFallbacks: boolean;
  enableMockData: boolean;
  enableCachedData: boolean;
  maxCacheAge: number; // milliseconds
  logFallbackUsage: boolean;
}

// Default fallback data for common marketplace endpoints
const DEFAULT_FALLBACK_DATA = {
  sellerProfile: {
    walletAddress: '',
    displayName: 'Unknown Seller',
    ensHandle: null,
    storeDescription: 'This seller profile is temporarily unavailable.',
    coverImageUrl: null,
    isVerified: false,
    createdAt: new Date(),
    updatedAt: new Date()
  },
  
  marketplaceListings: {
    listings: [],
    pagination: {
      page: 1,
      limit: 20,
      total: 0,
      totalPages: 0,
      hasNext: false,
      hasPrev: false
    }
  },
  
  reputation: {
    walletAddress: '',
    score: 0,
    totalTransactions: 0,
    positiveReviews: 0,
    negativeReviews: 0,
    lastUpdated: new Date()
  },
  
  authStatus: {
    authenticated: false,
    walletAddress: null,
    sessionValid: false,
    expiresAt: null
  },
  
  healthCheck: {
    status: 'degraded',
    services: {
      database: 'unknown',
      cache: 'unknown',
      external: 'unknown'
    },
    timestamp: new Date()
  }
};

class FallbackService {
  private config: FallbackConfig;
  private fallbackCache: Map<string, FallbackData> = new Map();
  private staticFallbacks: Map<string, any> = new Map();

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = {
      enableStaticFallbacks: true,
      enableMockData: false, // Only enable in development
      enableCachedData: true,
      maxCacheAge: 300000, // 5 minutes
      logFallbackUsage: true,
      ...config
    };

    this.initializeStaticFallbacks();
  }

  private initializeStaticFallbacks(): void {
    // Initialize static fallback data
    for (const [key, data] of Object.entries(DEFAULT_FALLBACK_DATA)) {
      this.staticFallbacks.set(key, data);
    }

    logger.info('Fallback service initialized', {
      config: this.config,
      staticFallbacksCount: this.staticFallbacks.size
    });
  }

  // Store successful response data for future fallback use
  storeFallbackData<T>(key: string, data: T, expiresIn?: number): void {
    if (!this.config.enableCachedData) {
      return;
    }

    const fallbackData: FallbackData<T> = {
      data,
      timestamp: new Date(),
      source: 'cache',
      expiresAt: expiresIn ? new Date(Date.now() + expiresIn) : undefined
    };

    this.fallbackCache.set(key, fallbackData);

    if (this.config.logFallbackUsage) {
      logger.debug(`Stored fallback data for key: ${key}`, {
        key,
        expiresAt: fallbackData.expiresAt,
        dataSize: JSON.stringify(data).length
      });
    }
  }

  // Get fallback data when primary service fails
  getFallbackData<T>(key: string, options?: {
    preferCached?: boolean;
    includeExpired?: boolean;
    customFallback?: T;
  }): FallbackData<T> | null {
    const opts = {
      preferCached: true,
      includeExpired: false,
      ...options
    };

    // Try cached data first if preferred and available
    if (opts.preferCached && this.config.enableCachedData) {
      const cached = this.getCachedFallback<T>(key, opts.includeExpired);
      if (cached) {
        if (this.config.logFallbackUsage) {
          logger.info(`Using cached fallback data for key: ${key}`, {
            key,
            source: cached.source,
            age: Date.now() - cached.timestamp.getTime(),
            expired: cached.expiresAt ? cached.expiresAt < new Date() : false
          });
        }
        return cached;
      }
    }

    // Try custom fallback
    if (opts.customFallback) {
      const fallbackData: FallbackData<T> = {
        data: opts.customFallback,
        timestamp: new Date(),
        source: 'static'
      };

      if (this.config.logFallbackUsage) {
        logger.info(`Using custom fallback data for key: ${key}`, { key });
      }

      return fallbackData;
    }

    // Try static fallback
    if (this.config.enableStaticFallbacks) {
      const staticData = this.getStaticFallback<T>(key);
      if (staticData) {
        if (this.config.logFallbackUsage) {
          logger.info(`Using static fallback data for key: ${key}`, { key });
        }
        return staticData;
      }
    }

    // Try mock data in development
    if (this.config.enableMockData && process.env.NODE_ENV === 'development') {
      const mockData = this.generateMockData<T>(key);
      if (mockData) {
        if (this.config.logFallbackUsage) {
          logger.info(`Using mock fallback data for key: ${key}`, { key });
        }
        return mockData;
      }
    }

    // No fallback available
    if (this.config.logFallbackUsage) {
      logger.warn(`No fallback data available for key: ${key}`, { key });
    }

    return null;
  }

  private getCachedFallback<T>(key: string, includeExpired: boolean): FallbackData<T> | null {
    const cached = this.fallbackCache.get(key);
    
    if (!cached) {
      return null;
    }

    // Check if expired
    if (!includeExpired && cached.expiresAt && cached.expiresAt < new Date()) {
      this.fallbackCache.delete(key);
      return null;
    }

    // Check max age
    const age = Date.now() - cached.timestamp.getTime();
    if (age > this.config.maxCacheAge) {
      this.fallbackCache.delete(key);
      return null;
    }

    return cached as FallbackData<T>;
  }

  private getStaticFallback<T>(key: string): FallbackData<T> | null {
    const staticData = this.staticFallbacks.get(key);
    
    if (!staticData) {
      return null;
    }

    return {
      data: staticData,
      timestamp: new Date(),
      source: 'static'
    };
  }

  private generateMockData<T>(key: string): FallbackData<T> | null {
    // Generate mock data based on key patterns
    let mockData: any = null;

    if (key.includes('seller') || key.includes('profile')) {
      mockData = {
        ...DEFAULT_FALLBACK_DATA.sellerProfile,
        walletAddress: '0x' + Math.random().toString(16).substring(2, 42),
        displayName: `Mock Seller ${Math.floor(Math.random() * 1000)}`,
        storeDescription: 'This is mock data for development purposes.'
      };
    } else if (key.includes('listings')) {
      mockData = {
        listings: Array.from({ length: 5 }, (_, i) => ({
          id: `mock-listing-${i}`,
          title: `Mock Product ${i + 1}`,
          description: 'This is a mock product for development.',
          price: Math.floor(Math.random() * 1000) / 100,
          currency: 'ETH',
          images: [],
          seller: '0x' + Math.random().toString(16).substring(2, 42)
        })),
        pagination: {
          page: 1,
          limit: 20,
          total: 5,
          totalPages: 1,
          hasNext: false,
          hasPrev: false
        }
      };
    } else if (key.includes('reputation')) {
      mockData = {
        ...DEFAULT_FALLBACK_DATA.reputation,
        walletAddress: '0x' + Math.random().toString(16).substring(2, 42),
        score: Math.floor(Math.random() * 5 * 100) / 100,
        totalTransactions: Math.floor(Math.random() * 100),
        positiveReviews: Math.floor(Math.random() * 50),
        negativeReviews: Math.floor(Math.random() * 10)
      };
    }

    if (!mockData) {
      return null;
    }

    return {
      data: mockData,
      timestamp: new Date(),
      source: 'mock',
      metadata: { generated: true, environment: 'development' }
    };
  }

  // Execute operation with automatic fallback
  async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    options?: {
      storeFallback?: boolean;
      fallbackTtl?: number;
      customFallback?: T;
      onFallback?: (fallbackData: FallbackData<T>) => void;
    }
  ): Promise<{ data: T; usedFallback: boolean; fallbackSource?: string }> {
    const opts = {
      storeFallback: true,
      fallbackTtl: this.config.maxCacheAge,
      ...options
    };

    try {
      const result = await operation();
      
      // Store successful result for future fallback use
      if (opts.storeFallback) {
        this.storeFallbackData(fallbackKey, result, opts.fallbackTtl);
      }

      return {
        data: result,
        usedFallback: false
      };
    } catch (error) {
      logger.warn(`Primary operation failed, attempting fallback for key: ${fallbackKey}`, {
        fallbackKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });

      // Try to get fallback data
      const fallbackData = this.getFallbackData<T>(fallbackKey, {
        customFallback: opts.customFallback
      });

      if (fallbackData) {
        // Call onFallback callback if provided
        if (opts.onFallback) {
          opts.onFallback(fallbackData);
        }

        return {
          data: fallbackData.data,
          usedFallback: true,
          fallbackSource: fallbackData.source
        };
      }

      // No fallback available, re-throw original error
      throw error;
    }
  }

  // Add custom static fallback
  addStaticFallback(key: string, data: any): void {
    this.staticFallbacks.set(key, data);
    
    if (this.config.logFallbackUsage) {
      logger.info(`Added static fallback for key: ${key}`, { key });
    }
  }

  // Remove fallback data
  removeFallback(key: string): boolean {
    const hadCached = this.fallbackCache.delete(key);
    const hadStatic = this.staticFallbacks.delete(key);
    
    return hadCached || hadStatic;
  }

  // Clear expired cached fallbacks
  clearExpiredCache(): number {
    let cleared = 0;
    const now = new Date();
    
    for (const [key, fallback] of this.fallbackCache.entries()) {
      const age = Date.now() - fallback.timestamp.getTime();
      const expired = fallback.expiresAt && fallback.expiresAt < now;
      const tooOld = age > this.config.maxCacheAge;
      
      if (expired || tooOld) {
        this.fallbackCache.delete(key);
        cleared++;
      }
    }

    if (cleared > 0 && this.config.logFallbackUsage) {
      logger.info(`Cleared ${cleared} expired fallback cache entries`);
    }

    return cleared;
  }

  // Get fallback statistics
  getStats(): {
    cachedFallbacks: number;
    staticFallbacks: number;
    config: FallbackConfig;
    cacheDetails: Array<{
      key: string;
      age: number;
      expired: boolean;
      source: string;
    }>;
  } {
    const now = Date.now();
    const cacheDetails = Array.from(this.fallbackCache.entries()).map(([key, fallback]) => ({
      key,
      age: now - fallback.timestamp.getTime(),
      expired: fallback.expiresAt ? fallback.expiresAt < new Date() : false,
      source: fallback.source
    }));

    return {
      cachedFallbacks: this.fallbackCache.size,
      staticFallbacks: this.staticFallbacks.size,
      config: this.config,
      cacheDetails
    };
  }

  // Update configuration
  updateConfig(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    logger.info('Fallback service configuration updated', {
      config: this.config
    });
  }
}

// Export singleton instance
export const fallbackService = new FallbackService();

// Export types and classes
export type { FallbackData, FallbackConfig };
export { FallbackService };
