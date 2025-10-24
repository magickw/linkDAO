/**
 * Enhanced Marketplace Service with Comprehensive Error Handling
 * Implements automatic retry mechanisms with exponential backoff
 * Updated to use real backend API endpoints
 */

import { Product, ProductFilters, SearchFilters, SellerInfo } from './marketplaceService';

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
  private baseURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3002';
  
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
    const status = (error as any).status;
    
    // Don't retry client errors (4xx) except 429 (rate limit)
    if (status >= 400 && status < 500 && status !== 429) {
      return false;
    }
    
    // Server errors (5xx) are retryable
    if (status >= 500) {
      return true;
    }
    
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
          throw this.enhanceError(lastError, this.isRetryableError(lastError));
        }

        // Calculate delay and wait
        const delayMs = this.calculateDelay(attempt, finalConfig.baseDelay, finalConfig.maxDelay);
        console.log(`Retrying marketplace operation (attempt ${attempt + 1}/${finalConfig.maxRetries}) after ${delayMs}ms`);
        await this.delay(delayMs);
      }
    }

    throw this.enhanceError(lastError!, this.isRetryableError(lastError!));
  }

  private enhanceError(error: Error, retryable: boolean): Error {
    const enhancedError = new Error(this.getUserFriendlyMessage(error));
    (enhancedError as any).originalError = error;
    (enhancedError as any).retryable = retryable;
    (enhancedError as any).suggestedActions = this.getSuggestedActions(error);
    (enhancedError as any).status = (error as any).status; // Preserve status code
    return enhancedError;
  }

  private getUserFriendlyMessage(error: Error): string {
    const message = error.message.toLowerCase();
    const status = (error as any).status;

    if (message.includes('404') || message.includes('not found') || status === 404) {
      return 'The requested item could not be found. It may have been removed or sold.';
    }

    if (message.includes('network') || message.includes('fetch')) {
      return 'Unable to connect to the marketplace. Please check your internet connection.';
    }

    if (message.includes('timeout')) {
      return 'The request is taking longer than expected. Please try again.';
    }

    if (message.includes('500') || message.includes('502') || message.includes('503') || 
        status === 500 || status === 502 || status === 503) {
      return 'The marketplace service is temporarily unavailable. Please try again in a few moments.';
    }

    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests') || status === 429) {
      return 'Too many requests. Please wait a moment before trying again.';
    }

    if (message.includes('unauthorized') || message.includes('401') || status === 401) {
      return 'Please connect your wallet to access this content.';
    }

    if (message.includes('forbidden') || message.includes('403') || status === 403) {
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

    if (message.includes('429') || message.includes('rate limit') || message.includes('too many requests')) {
      actions.push('Please wait a moment before trying again');
      actions.push('Try again in a few minutes');
    }

    if (actions.length === 0) {
      actions.push('Try refreshing the page');
      actions.push('Return to the marketplace homepage');
    }

    return actions;
  }

  // Helper method to create HTTP errors with status codes
  private createHttpError(response: Response): Error {
    const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
    (error as any).status = response.status;
    return error;
  }

  // Enhanced API methods with retry logic

  async getListingById(id: string): Promise<ApiResponse<Product>> {
    try {
      const product = await this.retryWithExponentialBackoff(
        async () => {
          const response = await fetch(`${this.baseURL}/api/marketplace/listings/${id}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw this.createHttpError(response);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch listing');
          }

          return this.transformListingToProduct(result.data);
        }
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

  async getProducts(filters?: ProductFilters): Promise<ApiResponse<{ products: Product[]; pagination: any }>> {
    try {
      const result = await this.retryWithExponentialBackoff(
        async () => {
          const queryParams = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                queryParams.append(key, value.toString());
              }
            });
          }

          const response = await fetch(`${this.baseURL}/api/marketplace/listings?${queryParams}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch listings');
          }

          return {
            products: result.data.listings.map((listing: any) => this.transformListingToProduct(listing)),
            pagination: result.data.pagination
          };
        }
      );

      return {
        success: true,
        data: result
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
        async () => {
          const response = await fetch(`${this.baseURL}/api/marketplace/sellers/${sellerId}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            if (response.status === 404) {
              return null;
            }
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch seller');
          }

          return this.transformSellerData(result.data);
        }
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
      const products = await this.retryWithExponentialBackoff(
        async () => {
          const queryParams = new URLSearchParams();
          queryParams.append('search', query);
          
          if (filters) {
            Object.entries(filters).forEach(([key, value]) => {
              if (value !== undefined && value !== null) {
                queryParams.append(key, value.toString());
              }
            });
          }

          const response = await fetch(`${this.baseURL}/api/marketplace/search?${queryParams}`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to search products');
          }

          return result.data.listings.map((listing: any) => this.transformListingToProduct(listing));
        }
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
        async () => {
          const response = await fetch(`${this.baseURL}/api/marketplace/listings?featured=true&limit=10`, {
            headers: {
              'Content-Type': 'application/json',
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error?.message || 'Failed to fetch featured products');
          }

          return result.data.listings.map((listing: any) => this.transformListingToProduct(listing));
        }
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
        fetch(`${this.baseURL}/api/health`).then(response => response.ok),
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
      const response = await fetch(`${this.baseURL}/api/marketplace/categories`);
      results.categories = response.ok;
    } catch (error) {
      console.warn('Failed to preload categories:', error);
    }

    try {
      // Preload featured products
      const featuredResponse = await this.getFeaturedProducts();
      results.featuredProducts = featuredResponse.success;
    } catch (error) {
      console.warn('Failed to preload featured products:', error);
    }

    return results;
  }

  // Data transformation methods
  private transformListingToProduct(listing: any): Product {
    return {
      id: listing.id,
      sellerId: listing.seller?.id || listing.sellerId,
      title: listing.title,
      description: listing.description,
      priceAmount: listing.price?.amount || listing.cryptoPrice || 0,
      priceCurrency: listing.price?.currency || listing.cryptoCurrency || 'ETH',
      categoryId: listing.category || '',
      images: listing.images || [],
      metadata: {
        specifications: listing.specifications || {},
        condition: listing.condition,
        brand: listing.brand,
        model: listing.model,
      },
      inventory: listing.inventory || 0,
      status: listing.status || 'active',
      tags: listing.tags || [],
      shipping: listing.shipping ? {
        free: listing.shipping.freeShipping || false,
        cost: listing.shipping.cost || '0',
        estimatedDays: listing.shipping.estimatedDays || '3-5',
        regions: listing.shipping.regions || [],
        expedited: listing.shipping.expedited || false,
      } : undefined,
      nft: listing.isNFT ? {
        contractAddress: listing.nftContractAddress || '',
        tokenId: listing.nftTokenId || '',
        standard: 'ERC721',
        blockchain: 'ethereum',
      } : undefined,
      views: listing.views || 0,
      favorites: listing.favorites || 0,
      listingStatus: listing.status || 'active',
      publishedAt: listing.publishedAt,
      createdAt: listing.createdAt,
      updatedAt: listing.updatedAt,
      seller: listing.seller ? this.transformSellerData(listing.seller) : undefined,
      trust: {
        verified: listing.seller?.verified || false,
        escrowProtected: listing.trust?.escrowProtected || false,
        onChainCertified: listing.trust?.onChainCertified || false,
        safetyScore: listing.trust?.safetyScore || 0,
      },
    };
  }

  private transformSellerData(seller: any): SellerInfo {
    return {
      id: seller.id,
      walletAddress: seller.walletAddress || seller.id,
      displayName: seller.displayName || seller.name,
      storeName: seller.storeName,
      rating: seller.rating || seller.averageRating || 0,
      reputation: seller.reputation || 0,
      verified: seller.verified || false,
      daoApproved: seller.daoApproved || false,
      profileImageUrl: seller.profileImageUrl || seller.avatar,
      isOnline: seller.isOnline || true,
    };
  }
}

// Export singleton instance
export const enhancedMarketplaceService = new EnhancedMarketplaceService();

export default enhancedMarketplaceService;