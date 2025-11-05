import { safeLogger } from '../utils/safeLogger';
import { serviceHealthMonitor } from './serviceHealthMonitor';

interface FallbackResponse {
  success: boolean;
  data: any;
  message: string;
  fallback: boolean;
  timestamp: string;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
}

export class ErrorRecoveryService {
  private fallbackData: Map<string, any> = new Map();
  private retryQueues: Map<string, Array<() => Promise<any>>> = new Map();
  private defaultRetryConfig: RetryConfig = {
    maxAttempts: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    backoffMultiplier: 2
  };

  constructor() {
    this.initializeFallbackData();
  }

  private initializeFallbackData() {
    // Initialize fallback data for common endpoints
    this.fallbackData.set('trending_communities', {
      communities: [],
      pagination: { page: 1, limit: 10, total: 0 }
    });

    this.fallbackData.set('enhanced_feed', {
      posts: [],
      pagination: { page: 1, limit: 20, total: 0 }
    });

    this.fallbackData.set('user_profile', {
      id: 'unknown',
      walletAddress: '',
      handle: '',
      ens: '',
      avatarCid: '',
      bioCid: ''
    });

    this.fallbackData.set('marketplace_listings', {
      listings: [],
      pagination: { page: 1, limit: 24, total: 0 }
    });

    this.fallbackData.set('kyc_status', {
      status: 'none',
      tier: 'none',
      submittedAt: null,
      reviewedAt: null,
      expiresAt: null
    });
  }

  /**
   * Execute a function with automatic retry and fallback
   */
  public async executeWithFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string,
    retryConfig?: Partial<RetryConfig>
  ): Promise<T | FallbackResponse> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
      try {
        const result = await operation();
        return result;
      } catch (error) {
        safeLogger.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts}):`, {
          error: error.message,
          fallbackKey,
          attempt
        });

        // If this is the last attempt, return fallback
        if (attempt === config.maxAttempts) {
          return this.getFallbackResponse(fallbackKey, error.message);
        }

        // Wait before retry with exponential backoff
        const delay = Math.min(
          config.baseDelay * Math.pow(config.backoffMultiplier, attempt - 1),
          config.maxDelay
        );
        
        await this.sleep(delay);
      }
    }

    // This should never be reached, but just in case
    return this.getFallbackResponse(fallbackKey, 'Max retry attempts exceeded');
  }

  /**
   * Get fallback response for a given key
   */
  public getFallbackResponse(key: string, errorMessage?: string): FallbackResponse {
    const fallbackData = this.fallbackData.get(key) || {};
    
    return {
      success: true,
      data: fallbackData,
      message: `Service temporarily unavailable. ${errorMessage ? `Error: ${errorMessage}` : 'Please try again later.'}`,
      fallback: true,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Enhanced feed service with fallback
   */
  public async getEnhancedFeedWithFallback(params: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const { feedService } = await import('./feedService');
        return await feedService.getEnhancedFeed(params);
      },
      'enhanced_feed'
    );
  }

  /**
   * Trending communities with fallback
   */
  public async getTrendingCommunitiesWithFallback(params: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const { communityService } = await import('./communityService');
        return await communityService.getTrendingCommunities(params);
      },
      'trending_communities'
    );
  }

  /**
   * User profile with fallback
   */
  public async getUserProfileWithFallback(address: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        const { db } = await import('../db/index');
        const { users } = await import('../db/schema');
        const { eq } = await import('drizzle-orm');
        
        const result = await db.select().from(users).where(eq(users.walletAddress, address)).limit(1);
        
        if (result.length === 0) {
          throw new Error('User not found');
        }
        
        return result[0];
      },
      'user_profile'
    );
  }

  /**
   * Marketplace listings with fallback
   */
  public async getMarketplaceListingsWithFallback(params: any): Promise<any> {
    return this.executeWithFallback(
      async () => {
        // Simulate marketplace service call
        throw new Error('Marketplace service unavailable');
      },
      'marketplace_listings'
    );
  }

  /**
   * KYC status with fallback
   */
  public async getKYCStatusWithFallback(userAddress: string): Promise<any> {
    return this.executeWithFallback(
      async () => {
        // In a real implementation, this would check KYC service
        // For now, return default status
        return this.fallbackData.get('kyc_status');
      },
      'kyc_status'
    );
  }

  /**
   * External API call with circuit breaker and fallback
   */
  public async callExternalAPIWithFallback(
    apiName: string,
    apiCall: () => Promise<any>,
    fallbackData?: any
  ): Promise<any> {
    // Check if service is healthy
    if (!serviceHealthMonitor.isServiceHealthy(apiName)) {
      safeLogger.warn(`Service ${apiName} is unhealthy, using fallback`);
      return {
        success: true,
        data: fallbackData || {},
        message: `${apiName} service is temporarily unavailable`,
        fallback: true,
        timestamp: new Date().toISOString()
      };
    }

    return this.executeWithFallback(
      apiCall,
      apiName,
      { maxAttempts: 2, baseDelay: 500 } // Faster retry for external APIs
    );
  }

  /**
   * Database operation with fallback
   */
  public async executeDatabaseOperationWithFallback<T>(
    operation: () => Promise<T>,
    fallbackKey: string
  ): Promise<T | FallbackResponse> {
    // Check database health
    if (!serviceHealthMonitor.isServiceHealthy('database')) {
      safeLogger.warn('Database is unhealthy, using fallback');
      return this.getFallbackResponse(fallbackKey, 'Database temporarily unavailable');
    }

    return this.executeWithFallback(
      operation,
      fallbackKey,
      { maxAttempts: 2, baseDelay: 1000 }
    );
  }

  /**
   * WebSocket operation with fallback
   */
  public async executeWebSocketOperationWithFallback(
    operation: () => Promise<any>,
    fallbackMessage: string = 'Real-time features temporarily unavailable'
  ): Promise<any> {
    try {
      return await operation();
    } catch (error) {
      safeLogger.warn('WebSocket operation failed:', error.message);
      return {
        success: false,
        message: fallbackMessage,
        fallback: true,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Graceful service degradation
   */
  public async handleServiceDegradation(serviceName: string): Promise<void> {
    const health = serviceHealthMonitor.getServiceHealth(serviceName);
    
    if (!health) return;

    switch (health.status) {
      case 'degraded':
        safeLogger.warn(`Service ${serviceName} is degraded, implementing fallbacks`);
        // Implement specific degradation strategies
        break;
        
      case 'unhealthy':
        safeLogger.error(`Service ${serviceName} is unhealthy, switching to full fallback mode`);
        // Switch to full fallback mode
        break;
    }
  }

  /**
   * Update fallback data
   */
  public updateFallbackData(key: string, data: any): void {
    this.fallbackData.set(key, data);
    safeLogger.debug(`Updated fallback data for ${key}`);
  }

  /**
   * Get service status for health checks
   */
  public getServiceStatus(): {
    fallbackDataKeys: string[];
    retryQueues: string[];
    overallHealth: any;
  } {
    return {
      fallbackDataKeys: Array.from(this.fallbackData.keys()),
      retryQueues: Array.from(this.retryQueues.keys()),
      overallHealth: serviceHealthMonitor.getOverallHealth()
    };
  }

  /**
   * Sleep utility for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Cleanup resources
   */
  public shutdown(): void {
    this.fallbackData.clear();
    this.retryQueues.clear();
  }
}

// Export singleton instance
export const errorRecoveryService = new ErrorRecoveryService();
export default errorRecoveryService;