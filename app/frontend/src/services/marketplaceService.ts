/**
 * Unified Marketplace Service
 * Consolidates all marketplace functionality with enhanced error handling and offline support
 */

// import { ApiCacheManager } from '../utils/apiCacheManager';
import { fetchWithRetry } from '../utils/apiUtils';
import { API_BASE_URL } from '../config/api';

// Fallback data for offline/error scenarios
const MOCK_PRODUCTS: Product[] = [
  {
    id: '550e8400-e29b-41d4-a716-446655440001',
    sellerId: '0xc4f4cb013c4121d2dbd5b063eefe074f0ebc03f3',
    title: 'Premium Digital Art Collection',
    description: 'A curated collection of digital artworks',
    priceAmount: 299.99,
    priceCurrency: 'USDC',
    categoryId: 'cat_001',
    images: ['https://placeholder.com/art1.jpg'],
    metadata: {},
    inventory: 1,
    status: 'active',
    tags: ['art', 'digital', 'premium'],
    views: 100,
    favorites: 50,
    listingStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440002',
    sellerId: '0x72f58fe0e30a3f2fa96720d7ad85b4a8ef767d05',
    title: 'Blockchain Development Course',
    description: 'Comprehensive course on blockchain development',
    priceAmount: 49.99,
    priceCurrency: 'USDC',
    categoryId: 'cat_002',
    images: ['https://placeholder.com/course1.jpg'],
    metadata: {},
    inventory: 5,
    status: 'active',
    tags: ['education', 'blockchain', 'course'],
    views: 250,
    favorites: 75,
    listingStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: '550e8400-e29b-41d4-a716-446655440003',
    sellerId: '0xc4f4cb013c4121d2dbd5b063eefe074f0ebc03f3',
    title: 'Web3 Design Template Pack',
    description: 'Professional design templates for Web3 projects',
    priceAmount: 149.99,
    priceCurrency: 'USDC',
    categoryId: 'cat_003',
    images: ['https://placeholder.com/template1.jpg'],
    metadata: {},
    inventory: 3,
    status: 'active',
    tags: ['design', 'web3', 'templates'],
    views: 180,
    favorites: 60,
    listingStatus: 'active',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

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
  // For blockchain marketplace
  sellerWalletAddress?: string;
  tokenAddress?: string;
  price: string;
  quantity?: number;
  itemType?: 'PHYSICAL' | 'DIGITAL' | 'NFT' | 'SERVICE';
  listingType?: 'FIXED_PRICE' | 'AUCTION';
  duration?: number;
  metadataURI?: string;
  nftStandard?: 'ERC721' | 'ERC1155';
  tokenId?: string;

  // For seller listing service
  walletAddress?: string;
  title?: string;
  description?: string;
  categoryId?: string;
  currency?: string;
  inventory?: number;
  tags?: string[];
  images?: string[]; // Array of IPFS URLs for product images
  metadata?: any;
  shipping?: any;
  nft?: any;
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
  // Auction-specific fields
  reservePrice?: string;
  minIncrement?: string;
  reserveMet?: boolean;
  // Enhanced data for UI display (optional, added by frontend transformation)
  enhancedData?: {
    title: string;
    description: string;
    images: string[];
    price: {
      crypto: string;
      cryptoSymbol: string;
      fiat: string;
      fiatSymbol: string;
    };
    seller: {
      id: string;
      name: string;
      rating: number;
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
    category: string;
    tags: string[];
    views: number;
    favorites: number;
    condition: string;
    escrowEnabled: boolean;
  };
}

// Interfaces for missing service methods
export interface Offer {
  id: string;
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  offerAmount: string;
  currency: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'EXPIRED';
  createdAt: string;
  expiresAt: string;
}

export interface CreateOrderRequest {
  listingId: string;
  buyerAddress: string;
  sellerAddress: string;
  price: string;
  tokenAddress: string;
  quantity: number;
  deliveryInfo?: DeliveryInfo;
}

export interface DeliveryInfo {
  fullName: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
  phone: string;
}

export interface TrackingInfo {
  orderId: string;
  trackingNumber: string;
  carrier: string;
  status: string;
  estimatedDelivery?: string;
  updates: TrackingUpdate[];
}

export interface TrackingUpdate {
  timestamp: string;
  status: string;
  location: string;
  description: string;
}

export class UnifiedMarketplaceService {
  // Use the correct backend API base URL from environment variables
  private baseUrl = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:10000';

  constructor() {
    // Log the baseUrl during initialization for debugging
    console.log('[MarketplaceService] Initialized with baseUrl:', this.baseUrl);
  }

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
      const response = await fetch(`${this.baseUrl}/api/marketplace/listings?${params.toString()}`, {
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
      const response = await fetch(`${this.baseUrl}/api/marketplace/listings/${id}`, {
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

  async incrementProductViews(id: string): Promise<boolean> {
    try {
      // Use fire-and-forget approach or check success
      const response = await fetch(`${this.baseUrl}/api/products/${id}/view`, {
        method: 'POST',
        signal: this.createTimeoutSignal(5000)
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to increment views:', error);
      return false;
    }
  }

  async getListingById(id: string): Promise<Product | null> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/listings/${id}`, {
        signal: this.createTimeoutSignal(15000), // Increase timeout to 15 seconds
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        if (response.status === 404) return null;
        if (response.status >= 500) {
          console.warn(`Server error: ${response.status}. Using fallback data.`);
          return this.createFallbackProduct(id);
        }
        if (response.status === 429) {
          throw new Error('Too many requests. Please wait a moment and try again.');
        }
        throw new Error(`Failed to fetch listing: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('[MarketplaceService] getListingById raw result:', result);

      // Handle both { success: true, data: {...} } and { success: true, listing: {...} } formats
      const listing = result.data || result.listing;

      if (result.success && listing) {
        console.log('[MarketplaceService] Processing listing:', listing);

        // Get price - handle both `price` and `priceAmount` field names
        const priceValue = listing.price ?? listing.priceAmount ?? 0;
        const priceNum = typeof priceValue === 'string' ? parseFloat(priceValue) : priceValue;

        // Get currency - handle both `currency` and `priceCurrency` field names
        const currency = listing.currency || listing.priceCurrency || 'USD';

        // Get images - handle both array and JSON string formats
        let imageUrls: string[] = [];
        if (listing.images) {
          if (Array.isArray(listing.images)) {
            imageUrls = listing.images;
          } else if (typeof listing.images === 'string') {
            try {
              imageUrls = JSON.parse(listing.images);
            } catch {
              imageUrls = [];
            }
          }
        }

        // Transform the listing data to match the Product interface
        return {
          id: listing.id,
          sellerId: listing.sellerId,
          title: listing.title || 'Unnamed Item',
          description: listing.description || '',
          priceAmount: priceNum,
          priceCurrency: currency,
          categoryId: listing.categoryId || listing.category?.id || '',
          images: imageUrls,
          metadata: listing.metadata || {},
          inventory: listing.inventory ?? listing.quantity ?? 0,
          status: listing.status || 'active',
          tags: Array.isArray(listing.tags) ? listing.tags : [],
          shipping: listing.shipping,
          nft: listing.nft,
          views: listing.views || 0,
          favorites: listing.favorites || 0,
          listingStatus: listing.listingStatus || listing.status || 'active',
          publishedAt: listing.publishedAt,
          createdAt: listing.createdAt,
          updatedAt: listing.updatedAt,
          seller: listing.seller || {
            id: listing.sellerId,
            walletAddress: listing.sellerId,
            rating: 4.5,
            reputation: 0,
            verified: true,
            daoApproved: false,
            isOnline: true
          },
          category: listing.category || {
            id: listing.categoryId || 'unknown',
            name: listing.categoryId || 'General',
            slug: listing.categoryId || 'general'
          },
          trust: listing.trust || {
            verified: true,
            escrowProtected: true,
            onChainCertified: false,
            safetyScore: 85
          }
        } as Product;
      } else {
        console.warn('[MarketplaceService] Listing API returned unexpected format:', result);
        return this.createFallbackProduct(id);
      }
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        console.warn('Network error fetching listing, using fallback data:', error.message);
        return this.createFallbackProduct(id);
      }
      if (error instanceof Error && error.name === 'AbortError') {
        console.warn('Request timed out fetching listing, using fallback data.');
        return this.createFallbackProduct(id);
      }
      console.error('Error fetching listing:', error);
      return this.createFallbackProduct(id);
    }
  }

  // Create a fallback product when API calls fail
  private createFallbackProduct(id: string): Product {
    return {
      id: id,
      sellerId: 'unknown',
      title: 'Product Unavailable',
      description: 'This product information is temporarily unavailable. Please try again later.',
      priceAmount: 0,
      priceCurrency: 'USD',
      categoryId: 'unknown',
      images: [],
      metadata: {},
      inventory: 0,
      status: 'inactive',
      tags: [],
      views: 0,
      favorites: 0,
      listingStatus: 'inactive',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      seller: {
        id: 'unknown',
        walletAddress: '',
        rating: 0,
        reputation: 0,
        verified: false,
        daoApproved: false,
        isOnline: false
      },
      category: {
        id: 'unknown',
        name: 'Unknown Category',
        slug: 'unknown'
      },
      trust: {
        verified: false,
        escrowProtected: false,
        onChainCertified: false,
        safetyScore: 0
      }
    };
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

      const response = await fetch(`${this.baseUrl}/api/marketplace/search?${params.toString()}`, {
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

      const response = await fetch(`${this.baseUrl}/api/marketplace/search-suggestions?${params.toString()}`, {
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

      const response = await fetch(`${this.baseUrl}/api/marketplace/auctions/active?${new URLSearchParams(filters as any).toString()}`, {
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
      const response = await fetch(`${this.baseUrl}/api/marketplace/auctions/${auctionId}/bid`, {
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
      const eventSource = new EventSource(`${this.baseUrl}/api/marketplace/auctions/${auctionId}/stream`);

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
      return () => { };
    }
  }

  // ============================================================================
  // BLOCKCHAIN MARKETPLACE OPERATIONS
  // ============================================================================

  async createListing(input: CreateListingInput): Promise<MarketplaceListing> {
    console.log('[MarketplaceService] createListing called with:', input);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // Get authentication data directly from localStorage (consistent with authService)
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('linkdao_access_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('authToken');
        const walletAddress = localStorage.getItem('linkdao_wallet_address') ||
          localStorage.getItem('wallet_address');

        // Add Authorization header with Bearer token (required for CSRF bypass)
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }

        // Add wallet authentication if available
        if (walletAddress) {
          headers['X-Wallet-Address'] = walletAddress;
        }
      }

      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/listings`, {
        method: 'POST',
        headers,
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

      console.log('[MarketplaceService] Fetching listings from:', `${this.baseUrl}/api/marketplace/listings?${params.toString()}`);

      const response = await fetch(`${this.baseUrl}/api/marketplace/listings?${params.toString()}`, {
        signal: this.createTimeoutSignal(10000),
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });

      if (!response.ok) {
        console.warn('[MarketplaceService] Listings request was not ok:', response.status, response.statusText);
        return [];
      }

      const result = await response.json().catch(() => ({ success: false }));
      console.log('[MarketplaceService] Raw API result:', result);

      if (result && result.success) {
        // Handle both array and paginated response formats
        // API returns: { success: true, data: { listings: [...], total, ... } }
        const data = result.data;
        console.log('[MarketplaceService] Extracted data:', data);

        if (Array.isArray(data)) {
          console.log('[MarketplaceService] Data is array, returning directly:', data.length, 'items');
          return data;
        } else if (data && Array.isArray(data.listings)) {
          console.log('[MarketplaceService] Data has listings array, returning:', data.listings.length, 'items');
          return data.listings;
        }
        console.log('[MarketplaceService] No valid listings array found in data');
        return [];
      } else {
        console.warn('[MarketplaceService] Response indicated failure:', result?.message);
        return [];
      }
    } catch (error) {
      console.error('[MarketplaceService] Error fetching listings:', error);
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
    // Since we're using stablecoins (USDC/USDT) which are pegged to USD,
    // we can use the amount directly for crypto conversion
    if (currency === 'USD' || currency === 'USDC' || currency === 'USDT') {
      // For display purposes, we might want to show equivalent ETH value
      const ethPrice = 2400; // Placeholder ETH price in USD
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
      const response = await fetch(`${this.baseUrl}/api/marketplace/health`, {
        signal: this.createTimeoutSignal(10000)
      });

      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  async getCategories(): Promise<CategoryInfo[]> {
    try {
      const response = await fetch(`${this.baseUrl}/api/marketplace/listings/categories`, {
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
          displayName: sellerProfile.storeName,
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

  // ============================================================================
  // ESCROW MANAGEMENT
  // ============================================================================

  async approveEscrow(escrowId: string, userAddress: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/escrow/${escrowId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress }),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to approve escrow' }));
        throw new Error(error.message || 'Failed to approve escrow');
      }
    } catch (error) {
      console.error('Error approving escrow:', error);
      throw error;
    }
  }

  async openDispute(escrowId: string, userAddress: string, reason: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/escrow/${escrowId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, reason }),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to open dispute' }));
        throw new Error(error.message || 'Failed to open dispute');
      }
    } catch (error) {
      console.error('Error opening dispute:', error);
      throw error;
    }
  }

  // ============================================================================
  // OFFER MANAGEMENT
  // ============================================================================

  async makeOffer(listingId: string, buyerAddress: string, offerAmount: string): Promise<Offer> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${listingId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, offerAmount }),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to make offer' }));
        throw new Error(error.message || 'Failed to make offer');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error making offer:', error);
      throw error;
    }
  }

  async respondToOffer(offerId: string, action: 'accept' | 'reject', sellerAddress: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/offers/${offerId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerAddress }),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: `Failed to ${action} offer` }));
        throw new Error(error.message || `Failed to ${action} offer`);
      }
    } catch (error) {
      console.error(`Error ${action}ing offer:`, error);
      throw error;
    }
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  async createOrder(orderData: CreateOrderRequest): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData),
        signal: this.createTimeoutSignal(30000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create order' }));
        throw new Error(error.message || 'Failed to create order');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  async createEscrowForOrder(orderId: string, escrowData: any): Promise<any> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escrowData),
        signal: this.createTimeoutSignal(30000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to create escrow' }));
        throw new Error(error.message || 'Failed to create escrow');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error creating escrow:', error);
      throw error;
    }
  }

  async getTrackingInfo(orderId: string): Promise<TrackingInfo> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/tracking`, {
        signal: this.createTimeoutSignal(10000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to get tracking info' }));
        throw new Error(error.message || 'Failed to get tracking info');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error getting tracking info:', error);
      throw error;
    }
  }

  async updateTrackingInfo(orderId: string, trackingData: Partial<TrackingInfo>): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to update tracking' }));
        throw new Error(error.message || 'Failed to update tracking');
      }
    } catch (error) {
      console.error('Error updating tracking info:', error);
      throw error;
    }
  }

  // ============================================================================
  // SELLER LISTING MANAGEMENT
  // ============================================================================

  async getListingsBySeller(sellerAddress: string): Promise<MarketplaceListing[]> {
    try {
      const params = new URLSearchParams({ sellerWalletAddress: sellerAddress });
      const response = await fetch(`${this.baseUrl}/listings?${params}`, {
        signal: this.createTimeoutSignal(10000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to fetch seller listings' }));
        throw new Error(error.message || 'Failed to fetch seller listings');
      }

      const result = await response.json();
      return result.listings || result.data || [];
    } catch (error) {
      console.error('Error fetching seller listings:', error);
      throw error;
    }
  }

  async cancelListing(listingId: string, sellerAddress: string): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/${listingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerAddress }),
        signal: this.createTimeoutSignal(15000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to cancel listing' }));
        throw new Error(error.message || 'Failed to cancel listing');
      }
    } catch (error) {
      console.error('Error cancelling listing:', error);
      throw error;
    }
  }

  async bulkUpdateListings(updates: Array<{ listingId: string; updates: Partial<MarketplaceListing> }>): Promise<{ success: number; failed: number; errors: string[] }> {
    try {
      const response = await fetch(`${this.baseUrl}/listings/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
        signal: this.createTimeoutSignal(30000)
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Failed to bulk update' }));
        throw new Error(error.message || 'Failed to bulk update');
      }

      const result = await response.json();
      return result.data || result;
    } catch (error) {
      console.error('Error bulk updating listings:', error);
      throw error;
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