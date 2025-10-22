/**
 * Unified Marketplace Service
 * Consolidates all marketplace functionality into a single, comprehensive service
 * Replaces: marketplaceService.ts, enhancedMarketplaceService.ts, realMarketplaceService.ts
 */

// Core interfaces
export interface Product {
  id: string;
  sellerId: string;
  title: string;
  description: string;
  priceAmount: number;
  priceCurrency: string;
  categoryId: string;
  images: string[];
  metadata: ProductMetadata;
  inventory: number;
  status: 'active' | 'inactive' | 'sold_out' | 'suspended' | 'draft';
  tags: string[];
  shipping?: ShippingInfo;
  nft?: NFTInfo;
  views: number;
  favorites: number;
  listingStatus: string;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
  seller?: SellerInfo;
  category?: CategoryInfo;
  trust?: TrustIndicators;
}

export interface ProductMetadata {
  specifications?: Record<string, string>;
  condition?: string;
  brand?: string;
  model?: string;
  year?: string;
  dimensions?: string;
  weight?: string;
  materials?: string[];
  colors?: string[];
  sizes?: string[];
}

export interface ShippingInfo {
  free: boolean;
  cost: string;
  estimatedDays: string;
  regions: string[];
  expedited: boolean;
  weight?: string;
  dimensions?: string;
}

export interface NFTInfo {
  contractAddress: string;
  tokenId: string;
  standard: 'ERC721' | 'ERC1155';
  blockchain: string;
  royalties?: number;
}

export interface SellerInfo {
  id: string;
  walletAddress: string;
  displayName?: string;
  storeName?: string;
  rating: number;
  reputation: number;
  verified: boolean;
  daoApproved: boolean;
  profileImageUrl?: string;
  isOnline: boolean;
}

export interface CategoryInfo {
  id: string;
  name: string;
  slug: string;
  description?: string;
  imageUrl?: string;
}

export interface TrustIndicators {
  verified: boolean;
  escrowProtected: boolean;
  onChainCertified: boolean;
  safetyScore: number;
}

export interface Auction {
  id: string;
  productId: string;
  title: string;
  description: string;
  currentBid: number;
  minimumBid: number;
  reservePrice?: number;
  bidCount: number;
  endTime: string;
  seller: SellerInfo;
  images: string[];
  currency: string;
  status: 'active' | 'ended' | 'cancelled';
  highestBidder?: string;
  trust: TrustIndicators;
}

export interface ProductFilters {
  category?: string;
  minPrice?: number;
  maxPrice?: number;
  currency?: string;
  condition?: string;
  location?: string;
  shipping?: 'free' | 'paid' | 'any';
  seller?: string;
  tags?: string[];
  status?: string;
  listingType?: 'FIXED_PRICE' | 'AUCTION';
  sortBy?: 'price_asc' | 'price_desc' | 'newest' | 'oldest' | 'popular' | 'ending_soon';
  limit?: number;
  offset?: number;
  page?: number;
}

export interface SearchFilters extends ProductFilters {
  query: string;
  searchIn?: ('title' | 'description' | 'tags')[];
}

export interface ProductPage {
  products: Product[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Legacy interface for backward compatibility
export interface MockProduct {
  id: string;
  title: string;
  description: string;
  price: string;
  currency: string;
  cryptoPrice: string;
  cryptoSymbol: string;
  category: string;
  listingType: 'FIXED_PRICE' | 'AUCTION';
  seller: {
    id: string;
    name: string;
    rating: number;
    reputation: number;
    verified: boolean;
    daoApproved: boolean;
    walletAddress: string;
  };
  trust: {
    verified: boolean;
    escrowProtected: boolean;
    onChainCertified: boolean;
    safetyScore: number;
  };
  images: string[];
  inventory: number;
  isNFT: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  views: number;
  favorites: number;
  auctionEndTime?: string;
  highestBid?: string;
  bidCount?: number;
  specifications?: Record<string, string>;
  shipping?: {
    free: boolean;
    cost: string;
    estimatedDays: string;
    regions: string[];
    expedited: boolean;
  };
}

// Blockchain marketplace interfaces
export interface CreateListingInput {
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  duration?: number;
  metadataURI: string;
  nftStandard?: 'ERC721' | 'ERC1155';
  tokenId?: string;
}

export interface MarketplaceListing {
  id: string;
  sellerWalletAddress: string;
  tokenAddress: string;
  price: string;
  quantity: number;
  itemType: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType: 'FIXED_PRICE' | 'AUCTION';
  status: 'ACTIVE' | 'SOLD' | 'CANCELLED' | 'EXPIRED';
  startTime: string;
  endTime?: string;
  highestBid?: string;
  highestBidderWalletAddress?: string;
  metadataURI: string;
  isEscrowed: boolean;
  nftStandard?: 'ERC721' | 'ERC1155';
  tokenId?: string;
  createdAt: string;
  updatedAt: string;
}

export class UnifiedMarketplaceService {
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:10000';

  private createTimeoutSignal(timeoutMs: number): AbortSignal {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeoutMs);
    return controller.signal;
  }

  // ============================================================================
  // CORE PRODUCT MANAGEMENT
  // ============================================================================

  async getProducts(filters?: ProductFilters): Promise<ProductPage> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            if (Array.isArray(value)) {
              params.append(key, value.join(','));
            } else {
              params.append(key, value.toString());
            }
          }
        });
      }

      // Try marketplace/listings endpoint first
      const response = await fetch(`${this.baseUrl}/marketplace/listings?${params.toString()}`, {
        signal: this.createTimeoutSignal(10000)
      });

      if (!response.ok) {
        console.warn('Marketplace API unavailable, using mock data');
        return this.getMockProducts(filters);
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.warn('Error fetching products, using mock data:', error);
      return this.getMockProducts(filters);
    }
  }

  private getMockProducts(filters?: ProductFilters): ProductPage {
    // Return empty products for now - can be populated with mock data if needed
    return {
      products: [],
      total: 0,
      page: filters?.page || 1,
      limit: filters?.limit || 20,
      hasMore: false
    };
  }

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/products/${id}`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch product');
      }

      const result = await response.json();
      if (result.success) {
        return result.data;
      } else {
        throw new Error(result.message || 'Failed to fetch product');
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      return null;
    }
  }

  async getListingById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/listings/${id}`, {
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) return null;
        if (response.status >= 500) {
          throw new Error(`Server error: ${response.status}. Please try again later.`);
        }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error(`Failed to fetch listing: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      if (result.success && result.listing) {
        // Transform the listing data to match the Product interface
        const listing = result.listing;
        return {
          id: listing.id,
          sellerId: listing.sellerId,
          title: listing.title,
          description: listing.description,
          priceAmount: listing.priceAmount || 0,
          priceCurrency: listing.priceCurrency || 'USD',
          categoryId: listing.categoryId || '',
          images: listing.images || [],
          metadata: listing.metadata || {},
          inventory: listing.inventory || 0,
          status: listing.status || 'active',
          tags: listing.tags || [],
          shipping: listing.shipping,
          nft: listing.nft,
          views: listing.views || 0,
          favorites: listing.favorites || 0,
          listingStatus: listing.listingStatus || 'active',
          publishedAt: listing.publishedAt,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          seller: listing.seller,
          category: listing.category,
          trust: listing.trust
        } as Product;
      } else {
        throw new Error(result.message || 'Failed to fetch listing');
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error. Please check your connection and try again.');
      }
      if (error instanceof Error && error.name === 'AbortError') {
        throw new Error('Request timed out. Please try again.');
      }
      console.error('Error fetching listing:', error);
      throw error;
    }
  }

  async getProductsByCategory(category: string, limit: number = 20): Promise<Product[]> {
    try {
      const filters: ProductFilters = {
        category,
        limit,
        status: 'active'
      };
      
      const result = await this.getProducts(filters);
      return result.products;
    } catch (error) {
      console.error('Error fetching products by category:', error);
      return [];
    }
  }

  async getFeaturedProducts(limit: number = 10): Promise<Product[]> {
    try {
      const filters: ProductFilters = {
        limit,
        status: 'active',
        sortBy: 'popular'
      };
      
      const result = await this.getProducts(filters);
      return result.products.filter(product => 
        product.seller?.daoApproved && 
        product.trust?.safetyScore && 
        product.trust.safetyScore > 90
      );
    } catch (error) {
      console.error('Error fetching featured products:', error);
      return [];
    }
  }

  // ============================================================================
  // SEARCH AND FILTERING
  // ============================================================================

  async searchProducts(query: string, filters?: SearchFilters): Promise<Product[]> {
    try {
      const searchFilters: SearchFilters = {
        query,
        ...filters,
        status: 'active'
      };

      const params = new URLSearchParams();
      Object.entries(searchFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            params.append(key, value.join(','));
          } else {
            params.append(key, value.toString());
          }
        }
      });

      const response = await fetch(`${this.baseUrl}/api/products/search?${params.toString()}`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to search products');
      }

      const result = await response.json();
      if (result.success) {
        return result.data.products || [];
      } else {
        throw new Error(result.message || 'Failed to search products');
      }
    } catch (error) {
      console.error('Error searching products:', error);
      return [];
    }
  }

  async getSearchSuggestions(query: string, limit: number = 10): Promise<string[]> {
    try {
      const params = new URLSearchParams({
        query,
        limit: limit.toString()
      });

      const response = await fetch(`${this.baseUrl}/api/products/search-suggestions?${params.toString()}`, {
        signal: this.createTimeoutSignal(5000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to get search suggestions');
      }

      const result = await response.json();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.message || 'Failed to get search suggestions');
      }
    } catch (error) {
      console.error('Error getting search suggestions:', error);
      return [];
    }
  }

  // ============================================================================
  // AUCTION MANAGEMENT
  // ============================================================================

  async getActiveAuctions(limit: number = 10): Promise<Auction[]> {
    try {
      const filters: ProductFilters = {
        listingType: 'AUCTION',
        status: 'active',
        limit,
        sortBy: 'ending_soon'
      };

      const response = await fetch(`${this.baseUrl}/api/auctions/active?${new URLSearchParams(filters as any).toString()}`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch active auctions');
      }

      const result = await response.json();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.message || 'Failed to fetch active auctions');
      }
    } catch (error) {
      console.error('Error fetching active auctions:', error);
      return [];
    }
  }

  async placeBid(auctionId: string, bidAmount: number, bidderAddress: string): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: bidAmount,
          bidderAddress
        }),
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        throw new Error('Failed to place bid');
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Error placing bid:', error);
      return false;
    }
  }

  async subscribeToAuctionUpdates(auctionId: string, callback: (update: {
    type: 'bid' | 'end' | 'extend';
    data: any;
  }) => void): Promise<() => void> {
    try {
      const eventSource = new EventSource(`${this.baseUrl}/api/auctions/${auctionId}/stream`);
      
      eventSource.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);
          callback(update);
        } catch (error) {
          console.error('Error parsing auction update:', error);
        }
      };

      eventSource.onerror = (error) => {
        console.error('Auction stream error:', error);
      };

      return () => {
        eventSource.close();
      };
    } catch (error) {
      console.error('Error subscribing to auction updates:', error);
      return () => {};
    }
  }

  // ============================================================================
  // BLOCKCHAIN MARKETPLACE OPERATIONS
  // ============================================================================

  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/seller/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
        signal: this.createTimeoutSignal(10000)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }

      return response.json();
    } catch (error) {
      console.error('Error creating listing:', error);
      throw error;
    }
  }

  async getMarketplaceListings(filters?: any): Promise<MarketplaceListing[]> {
    try {
      const params = new URLSearchParams();
      if (filters) {
        Object.entries(filters).forEach(([key, value]) => {
          if (value !== undefined && value !== null) {
            params.append(key, value.toString());
          }
        });
      }

      const response = await fetch(`${this.baseUrl}/marketplace/listings?${params.toString()}`, {
        signal: this.createTimeoutSignal(10000)
      });
      
      if (!response.ok) {
        console.warn('Marketplace listings request was not ok:', response.status, response.statusText);
        return [];
      }

      const result = await response.json().catch(() => ({ success: false }));
      if (result && result.success) {
        return result.data || [];
      } else {
        console.warn('Marketplace listings response indicated failure:', result?.message);
        return [];
      }
    } catch (error) {
      console.error('Error fetching marketplace listings:', error);
      return [];
    }
  }

  // ============================================================================
  // LEGACY COMPATIBILITY METHODS
  // ============================================================================

  private convertToMockProduct(product: Product): MockProduct {
    return {
      id: product.id,
      title: product.title,
      description: product.description,
      price: product.priceAmount.toString(),
      currency: product.priceCurrency,
      cryptoPrice: this.convertToCrypto(product.priceAmount, product.priceCurrency),
      cryptoSymbol: 'ETH',
      category: product.category?.slug || 'general',
      listingType: 'FIXED_PRICE',
      seller: {
        id: product.seller?.id || product.sellerId,
        name: product.seller?.displayName || product.seller?.storeName || 'Unknown Seller',
        rating: product.seller?.rating || 0,
        reputation: product.seller?.reputation || 0,
        verified: product.seller?.verified || false,
        daoApproved: product.seller?.daoApproved || false,
        walletAddress: product.seller?.walletAddress || '',
      },
      trust: {
        verified: product.trust?.verified || false,
        escrowProtected: product.trust?.escrowProtected || false,
        onChainCertified: product.trust?.onChainCertified || false,
        safetyScore: product.trust?.safetyScore || 0,
      },
      images: product.images || [],
      inventory: product.inventory,
      isNFT: !!product.nft,
      tags: product.tags || [],
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      views: product.views,
      favorites: product.favorites,
      specifications: product.metadata?.specifications,
      shipping: product.shipping ? {
        free: product.shipping.free,
        cost: product.shipping.cost,
        estimatedDays: product.shipping.estimatedDays,
        regions: product.shipping.regions,
        expedited: product.shipping.expedited,
      } : undefined,
    };
  }

  private convertToCrypto(amount: number, currency: string): string {
    const ethPrice = 2400; // Placeholder ETH price in USD
    if (currency === 'USD') {
      return (amount / ethPrice).toFixed(4);
    }
    return amount.toString();
  }

  // Legacy methods for backward compatibility
  async getAllProducts(): Promise<MockProduct[]> {
    const result = await this.getProducts({ status: 'active', limit: 100 });
    return result.products.map(product => this.convertToMockProduct(product));
  }

  async getProductsByListingType(listingType: 'FIXED_PRICE' | 'AUCTION'): Promise<MockProduct[]> {
    if (listingType === 'AUCTION') {
      const auctions = await this.getActiveAuctions(50);
      return auctions.map(auction => this.convertAuctionToMockProduct(auction));
    } else {
      const result = await this.getProducts({
        listingType: 'FIXED_PRICE',
        status: 'active',
        limit: 50
      });
      return result.products.map(product => this.convertToMockProduct(product));
    }
  }

  private convertAuctionToMockProduct(auction: Auction): MockProduct {
    const mockProduct = this.convertToMockProduct({
      id: auction.id,
      sellerId: auction.seller.id,
      title: auction.title,
      description: auction.description,
      priceAmount: auction.currentBid,
      priceCurrency: auction.currency,
      categoryId: '',
      images: auction.images,
      metadata: {},
      inventory: 1,
      status: 'active',
      tags: [],
      views: 0,
      favorites: 0,
      listingStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seller: auction.seller,
      trust: auction.trust,
    } as Product);

    mockProduct.listingType = 'AUCTION';
    mockProduct.auctionEndTime = auction.endTime;
    mockProduct.highestBid = auction.currentBid.toString();
    mockProduct.bidCount = auction.bidCount;
    mockProduct.price = auction.minimumBid.toString();

    return mockProduct;
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        // Don't retry on certain errors
        if (error instanceof Error) {
          if (error.message.includes('not found') || 
              error.message.includes('404') ||
              error.message.includes('unauthorized') ||
              error.message.includes('forbidden')) {
            throw error;
          }
        }
        
        if (attempt === maxRetries) {
          throw lastError;
        }
        
        // Exponential backoff with jitter
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError!;
  }

  async getListingByIdWithRetry(id: string): Promise<Product | null> {
    return this.retryWithBackoff(() => this.getListingById(id));
  }

  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/api/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getCategories(): Promise<CategoryInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/marketplace/categories`, {
        signal: this.createTimeoutSignal(10000)
      });

      if (!response.ok) {
        console.warn('Categories API unavailable, using mock data');
        return this.getMockCategories();
      }

      const result = await response.json();
      if (result.success) {
        return result.data || [];
      } else {
        throw new Error(result.message || 'Failed to fetch categories');
      }
    } catch (error) {
      console.warn('Error fetching categories, using mock data:', error);
      return this.getMockCategories();
    }
  }

  private getMockCategories(): CategoryInfo[] {
    // Return empty categories for now - can be populated with mock data if needed
    return [];
  }

  // ============================================================================
  // SELLER MANAGEMENT (for breadcrumbs)
  // ============================================================================

  async getSellerById(sellerId: string): Promise<SellerInfo | null> {
    try {
      // Try to use the seller service if available
      const { sellerService } = await import('@/services/sellerService');
      const sellerProfile = await sellerService.getSellerProfile(sellerId);
      
      if (sellerProfile) {
        return {
          id: sellerProfile.walletAddress,
          walletAddress: sellerProfile.walletAddress,
          displayName: sellerProfile.displayName || sellerProfile.storeName,
          storeName: sellerProfile.storeName,
          rating: 4.5, // Default rating
          reputation: sellerProfile.daoReputation?.governanceParticipation || 0,
          verified: false, // Default value since not available in SellerProfile
          daoApproved: false, // Default value since not available in SellerProfile
          profileImageUrl: sellerProfile.profileImageCdn,
          isOnline: true // Default value
        };
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching seller by ID:', error);
      return null;
    }
  }
}

// Export singleton instance
export const marketplaceService = new UnifiedMarketplaceService();

// Export legacy functions for backward compatibility
export const getProductsByCategory = (category: string): Promise<MockProduct[]> => 
  marketplaceService.getProductsByListingType('FIXED_PRICE');

export const getProductsByListingType = (listingType: 'FIXED_PRICE' | 'AUCTION'): Promise<MockProduct[]> => 
  marketplaceService.getProductsByListingType(listingType);

export const getFeaturedProducts = (): Promise<MockProduct[]> => 
  marketplaceService.getAllProducts();

export const getProductById = (id: string): Promise<MockProduct | undefined> => 
  marketplaceService.getProductById(id).then(p => p ? marketplaceService['convertToMockProduct'](p) : undefined);

export const searchProducts = (query: string): Promise<MockProduct[]> => 
  marketplaceService.searchProducts(query).then(products => 
    products.map(p => marketplaceService['convertToMockProduct'](p))
  );

export default marketplaceService;