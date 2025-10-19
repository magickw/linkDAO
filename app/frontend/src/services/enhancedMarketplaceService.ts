/**
 * Enhanced Marketplace Service with Comprehensive Error Handling
 * Implements automatic retry mechanisms with exponential backoff
 */

import { marketplaceService, Product, ProductFilters, SearchFilters, SellerInfo } from './marketplaceService';

export interface RetryConfig {
  maxRetries: number;
  baseDelay: number;
  maxDelay: number;
  retryableErrors: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
    suggestedActions?: string[];
  };
}

export class EnhancedMarketplaceService {
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    baseDelay: 1000,
    maxDelay: 10000,
    retryableErrors: [
      'network',
      'timeout',
      'fetch',
      '500',
      '502',
      '503',
      '504',
      'ECONNRESET',
      'ETIMEDOUT'
    ]
  };

  private isRetryableError(error: Error): boolean {
    const errorMessage = error.message.toLowerCase();
    return this.defaultRetryConfig.retryableErrors.some(retryableError =>
      errorMessage.includes(retryableError.toLowerCase())
    );
  }

  private async delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private calculateDelay(attempt: number, baseDelay: number, maxDelay: number): number {
    const exponentialDelay = baseDelay * Math.pow(2, attempt);
    const jitter = Math.random() * 0.1 * exponentialDelay; // Add 10% jitter
    return Math.min(exponentialDelay + jitter, maxDelay);
  }

  private async retryWithExponentialBackoff<T>(
    operation: () => Promise<T>,
    config: Partial<RetryConfig> = {}
  ): Promise<T> {
    const finalConfig = { ...this.defaultRetryConfig, ...config };
    let lastError: Error;

    for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        // Don't retry on non-retryable errors
        if (!this.isRetryableError(lastError)) {
          throw this.enhanceError(lastError, false);
        }

        // Don't retry on the last attempt
        if (attempt === finalConfig.maxRetries) {
          throw this.enhanceError(lastError, false);
        }

        // Calculate delay and wait
        const delayMs = this.calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
        console.log(`Retrying marketplace operation (attempt ${attempt + 1}/${finalConfig.maxRetries}) after ${delayMs}ms`);
        await this.delay(delayMs);
      }
    }

    throw this.enhanceError(lastError!, false);
  }

  private enhanceError(error: Error, retryable: boolean): Error {
    const enhancedError = new Error(this.getUserFriendlyMessage(error));
    (enhancedError as any).originalError = error;
    (enhancedError as any).retryable = retryable;
    (enhancedError as any).suggestedActions = this.getSuggestedActions(error);
    return enhancedError;
  }

  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();

    if (message.includes('404') || message.includes('not found')) {
      return 'The requested item could not be found. It may have been removed or sold.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to the marketplace. Please check your internet connection.';
    }

    if (message.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again.';
    }

    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'The marketplace service is temporarily unavailable. Please try again in a few moments.';
    }

    if (message.includes('429') || message.includes('rate limit')) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return 'Please connect your wallet to access this content.';
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return 'You don\'t have permission to access this content.';
    }

    return 'An unexpected error occurred while loading marketplace content.';
  }

  private getSuggestedActions(error: Error): string[] {
    const message = error.message.toLowerCase();
    const actions: string[] = [];

    if (message.includes('network') || message.includes('fetch')) {
      actions.push('Check your internet connection');
      actions.push('Try refreshing the page');
      actions.push('Disable any VPN or proxy');
    }

    if (message.includes('timeout')) {
      actions.push('Try again in a few moments');
      actions.push('Check your internet speed');
    }

    if (message.includes('404') || message.includes('not found')) {
      actions.push('Return to the marketplace homepage');
      actions.push('Search for similar items');
      actions.push('Contact the seller if you have their information');
    }

    if (message.includes('500') || message.includes('502') || message.includes('503')) {
      actions.push('Wait a few minutes and try again');
      actions.push('Check our status page for updates');
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      actions.push('Connect your wallet');
      actions.push('Refresh the page after connecting');
    }

    if (actions.length === 0) {
      actions.push('Try refreshing the page');
      actions.push('Return to the marketplace homepage');
    }

    return actions;
  }

  // Enhanced API methods with retry logic

  async getListingById(id: string): Promise<ApiResponse<Product>> {
    try {
      const product = await this.retryWithExponentialBackoff(
        () => marketplaceService.getListingById(id)
      );

      if (!product) {
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Product not found',
            retryable: false,
            suggestedActions: [
              'Return to marketplace',
              'Search for similar products',
              'Check if the product URL is correct'
            ]
          }
        };
      }

      return {
        success: true,
        data: product
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: this.getUserFriendlyMessage(error as Error),
          retryable: this.isRetryableError(error as Error),
          suggestedActions: this.getSuggestedActions(error as Error)
        }
      };
    }
  }

  async getProducts(filters?: ProductFilters): Promise<ApiResponse<Product[]>> {
    try {
      const result = await this.retryWithExponentialBackoff(
        () => marketplaceService.getProducts(filters)
      );

      return {
        success: true,
        data: result.products
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: this.getUserFriendlyMessage(error as Error),
          retryable: this.isRetryableError(error as Error),
          suggestedActions: this.getSuggestedActions(error as Error)
        }
      };
    }
  }

  async getSellerById(sellerId: string): Promise<ApiResponse<SellerInfo>> {
    try {
      const seller = await this.retryWithExponentialBackoff(
        () => marketplaceService.getSellerById(sellerId)
      );

      if (!seller) {
        return {
          success: false,
          error: {
            code: 'SELLER_NOT_FOUND',
            message: 'Seller not found',
            retryable: false,
            suggestedActions: [
              'Return to marketplace',
              'Browse other sellers',
              'Check if the seller URL is correct'
            ]
          }
        };
      }

      return {
        success: true,
        data: seller
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: this.getUserFriendlyMessage(error as Error),
          retryable: this.isRetryableError(error as Error),
          suggestedActions: this.getSuggestedActions(error as Error)
        }
      };
    }
  }

  async searchProducts(query: string, filters?: ProductFilters): Promise<ApiResponse<Product[]>> {
    try {
      const searchFilters: SearchFilters = {
        query,
        ...filters
      };
      
      const products = await this.retryWithExponentialBackoff(
        () => marketplaceService.searchProducts(query, searchFilters)
      );

      return {
        success: true,
        data: products
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'SEARCH_ERROR',
          message: this.getUserFriendlyMessage(error as Error),
          retryable: this.isRetryableError(error as Error),
          suggestedActions: this.getSuggestedActions(error as Error)
        }
      };
    }
  }

  async getFeaturedProducts(): Promise<ApiResponse<Product[]>> {
    try {
      const products = await this.retryWithExponentialBackoff(
        () => marketplaceService.getFeaturedProducts()
      );

      return {
        success: true,
        data: products
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'FETCH_ERROR',
          message: this.getUserFriendlyMessage(error as Error),
          retryable: this.isRetryableError(error as Error),
          suggestedActions: this.getSuggestedActions(error as Error)
        }
      };
    }
  }

  // Health check with timeout
  async healthCheck(): Promise<boolean> {
    try {
      const isHealthy = await Promise.race([
        marketplaceService.healthCheck(),
        new Promise<boolean>((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);
      return isHealthy;
    } catch (error) {
      console.error('Marketplace health check failed:', error);
      return false;
    }
  }

  // Preload critical data with error handling
  async preloadCriticalData(): Promise<{
    categories: boolean;
    featuredProducts: boolean;
  }> {
    const results = {
      categories: false,
      featuredProducts: false
    };

    try {
      // Preload categories
      await marketplaceService.getCategories();
      results.categories = true;
    } catch (error) {
      console.warn('Failed to preload categories:', error);
    }

    try {
      // Preload featured products
      await marketplaceService.getFeaturedProducts();
      results.featuredProducts = true;
    } catch (error) {
      console.warn('Failed to preload featured products:', error);
    }

    return results;
  }
}

// Export singleton instance
export const enhancedMarketplaceService = new EnhancedMarketplaceService();

export default enhancedMarketplaceService;