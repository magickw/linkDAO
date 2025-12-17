/**
 * Unified Marketplace Service
 * Consolidates all marketplace functionality with enhanced error handling and offline support
 */

// import { ApiCacheManager } from '../utils/apiCacheManager';
import { fetchWithRetry } from '../utils/apiUtils';
import { API_BASE_URL } from '../config/api';



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
  // Primary and fallback API base URLs
  private primaryBaseUrl = this.getPrimaryBaseUrl();
  private fallbackBaseUrl = this.getFallbackBaseUrl();
  private currentBaseUrl = this.primaryBaseUrl; // Start with primary

  // Add baseUrl property for consistency
  private get baseUrl(): string {
    return this.currentBaseUrl;
  }

  private getPrimaryBaseUrl(): string {
    // Use the API_BASE_URL from config which respects environment variables
    // In production, use the secure HTTPS endpoint
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://api.linkdao.io';
    }
    return API_BASE_URL;
  }

  private getFallbackBaseUrl(): string {
    // Only use localhost fallback in development mode
    if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      return 'http://localhost:10000';
    }
    // In production, don't fallback to localhost due to CSP restrictions
    return this.primaryBaseUrl;
  }

  constructor() {
    // Log the base URLs during initialization for debugging
    console.log('[MarketplaceService] Initialized with primary baseUrl:', this.primaryBaseUrl);
    console.log('[MarketplaceService] Fallback baseUrl:', this.fallbackBaseUrl);
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

    // Add cache-busting parameter to prevent service worker caching issues
    const cacheBuster = `_=${Date.now()}`;
    const paramsString = params.toString();
    const separator = paramsString ? '&' : '';
    const endpoint = `/api/marketplace/listings?${paramsString}${separator}${cacheBuster}`;
    
    const response = await this.makeApiRequest(endpoint);
    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return result.data;
    } else {
      throw new Error(result.message || 'Failed to fetch products');
    }
  }

  

  async getProductById(id: string): Promise<Product | null> {
    try {
      const response = await this.makeApiRequest(`/api/marketplace/listings/${id}`, {
        headers: {
          'Content-Type': 'application/json',
        }
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
      // Use the makeApiRequest method for consistency
      const response = await this.makeApiRequest(`/api/marketplace/listings/${id}/view`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      return response.ok;
    } catch (error) {
      console.warn('Failed to increment views:', error);
      return false;
    }
  }

  async getListingById(id: string): Promise<Product | null> {
    try {
      const response = await this.makeApiRequest(`/api/marketplace/listings/${id}`, {
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
          category: listing.category || this.createCategoryObject(listing.categoryId),
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
  private createCategoryObject(categoryId?: string): CategoryInfo {
    if (!categoryId) {
      return {
        id: 'unknown',
        name: 'General',
        slug: 'general'
      };
    }

    // Map common category IDs to readable names
    const categoryMap: Record<string, string> = {
      '71ca3e53-1e18-4482-b214-ef7f228afd87': 'Digital Assets',
      '1710bad2-ebd0-4a0d-b707-4b729bfa12eb': 'Electronics',
      '2cb41c1b-7318-4bd1-8352-948f6ef64b00': 'Fashion',
      '5d517645-201a-4bb1-bf5c-8f92d0c30405': 'Home & Garden',
      '8b31a8cc-d37e-4b65-b545-98b1f71a7350': 'Books & Media',
      '042019d5-5793-4a55-a99c-edfe60fa2b32': 'Sports & Outdoors',
      // Add more mappings as needed
      'art': 'Art & Collectibles',
      'music': 'Music & Audio',
      'gaming': 'Gaming & Virtual Worlds',
      'photography': 'Photography',
      'domain': 'Domain Names',
      'utility': 'Utility & Access',
      'memes': 'Memes & Fun',
      'nft': 'NFTs & Digital Art',
      'metaverse': 'Metaverse Assets',
      'virtual-land': 'Virtual Land',
      'digital-fashion': 'Digital Fashion',
      'trading-cards': 'Trading Cards',
      'tickets': 'Tickets & Events',
      'electronics': 'Electronics',
      'fashion': 'Fashion & Wearables',
      'home': 'Home & Garden',
      'books': 'Books & Media',
      'sports': 'Sports & Recreation',
      'toys': 'Toys & Games',
      'automotive': 'Automotive',
      'health': 'Health & Beauty',
      'jewelry': 'Jewelry & Accessories',
      'collectibles': 'Collectibles',
      'vintage': 'Vintage & Antiques',
      'crafts': 'Handmade Crafts',
      'pet-supplies': 'Pet Supplies',
      'food': 'Food & Beverages',
      'office': 'Office Supplies',
      'tools': 'Tools & Hardware',
      'baby': 'Baby Products',
      'outdoor': 'Outdoor & Camping',
      'fitness': 'Fitness & Exercise',
      'services': 'Services',
      'education': 'Education & Courses',
      'consulting': 'Consulting',
      'software': 'Software & Apps',
      'design': 'Design Services',
      'writing': 'Writing & Content',
      'marketing': 'Marketing & Promotion',
      'legal': 'Legal Services',
      'wellness': 'Wellness & Health',
      'travel': 'Travel & Experiences',
      'subscription': 'Subscriptions',
      'real-estate': 'Real Estate',
      'rental': 'Rentals',
      'timeshare': 'Timeshares',
      'business': 'Business & Industrial',
      'equipment': 'Equipment & Machinery',
      'wholesale': 'Wholesale & Bulk',
      'manufacturing': 'Manufacturing',
      'other': 'Other'
    };

    const name = categoryMap[categoryId] || 
                 (categoryId.includes('-') ? 'Category' : categoryId) || 
                 'General';

    return {
      id: categoryId,
      name: name,
      slug: name.toLowerCase().replace(/\s+/g, '-')
    };
  }

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

      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const paramsString = params.toString();
      const separator = paramsString ? '&' : '';
      const endpoint = `/api/marketplace/search?${paramsString}${separator}${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);

      if (!response.ok) {
        throw new Error('Failed to search products');
      } const result = await response.json();
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

      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const paramsString = params.toString();
      const separator = paramsString ? '&' : '';
      const endpoint = `/api/marketplace/search-suggestions?${paramsString}${separator}${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);

      if (!response.ok) {
        throw new Error('Failed to get search suggestions');
      } const result = await response.json();
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

      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });

      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const paramsString = params.toString();
      const separator = paramsString ? '&' : '';
      const endpoint = `/api/marketplace/auctions/active?${paramsString}${separator}${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);
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
      const response = await this.makeApiRequest(`/api/marketplace/auctions/${auctionId}/bid`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: bidAmount,
          bidderAddress
        })
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
      // Use the current base URL for EventSource
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

  async updateListing(id: string, input: Partial<CreateListingInput>): Promise<MarketplaceListing> {
    console.log('[MarketplaceService] updateListing called with:', id, input);
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

      const response = await fetch(`${this.baseUrl}/api/marketplace/seller/listings/${id}`, {
        method: 'PUT',
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
      console.error('Error updating listing:', error);
      throw error;
    }
  }

  private async makeApiRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    const timestamp = Date.now();
    const separator = endpoint.includes('?') ? '&' : '?';
    const endpointWithTimestamp = `${endpoint}${separator}_t=${timestamp}`;

    // Try the primary URL first
    try {
      const response = await this.attemptApiRequest(`${this.primaryBaseUrl}${endpointWithTimestamp}`, options);
      if (response.ok) {
        this.currentBaseUrl = this.primaryBaseUrl;
        return response;
      }
      
      // If we get a non-OK response, log it and continue to fallback
      console.warn(`[MarketplaceService] Primary request failed with status: ${response.status}`);
    } catch (error) {
      console.warn('[MarketplaceService] Primary request failed:', error);
    }

    // If primary fails and we're in development, try fallback
    if (this.primaryBaseUrl !== this.fallbackBaseUrl &&
      typeof window !== 'undefined' && window.location.hostname === 'localhost') {
      console.log(`[MarketplaceService] Trying fallback API: ${this.fallbackBaseUrl}${endpoint}`);
      try {
        const response = await this.attemptApiRequest(`${this.fallbackBaseUrl}${endpoint}`, options);
        if (response.ok) {
          this.currentBaseUrl = this.fallbackBaseUrl;
          console.log('[MarketplaceService] Switched to fallback API temporarily');
          return response;
        }
      } catch (error) {
        console.warn('[MarketplaceService] Fallback request also failed:', error);
      }
    }

    // If all attempts fail, throw an error
    throw new Error('All API attempts failed');
  }

  private async attemptApiRequest(url: string, options: RequestInit = {}): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout for faster feedback

    try {
      // Check if we're trying to connect to localhost in production
      if (url.startsWith('http://localhost') &&
        typeof window !== 'undefined' &&
        window.location.hostname !== 'localhost') {
        throw new Error('Cannot connect to localhost in production due to CSP restrictions');
      }

      // Use global fetch wrapper which handles token refresh automatically
      const { globalFetch } = await import('./globalFetchWrapper');
      const response = await globalFetch(url, {
        ...options,
        maxRetries: 2
      });

      // Convert to a Response object for compatibility
      if (response.success) {
        const responseData = response.data;
        const responseText = typeof responseData === 'string' 
          ? responseData 
          : JSON.stringify(responseData);
        
        return new Response(responseText, {
          status: response.status,
          headers: response.headers
        });
      } else {
        // Create an error response
        const error: any = new Error(response.error || 'Request failed');
        error.response = {
          status: response.status,
          headers: response.headers
        };
        error.status = response.status;
        throw error;
      }
    } catch (error) {
      clearTimeout(timeoutId);

      // Handle different types of errors
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          console.error('[MarketplaceService] Request timeout');
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          console.error('[MarketplaceService] Network error - could not connect to API');
          console.error('[MarketplaceService] This might be due to CORS policy, network connectivity, or the server being down');
        } else if (url.startsWith('http://localhost') && error.message.includes('CSP')) {
          console.warn('[MarketplaceService] Localhost connection blocked by CSP in production');
        } else {
          console.error('[MarketplaceService] Request error:', error.message);
        }
      }

      throw error;
    }
  }
  async getMarketplaceListings(filters?: any): Promise<MarketplaceListing[]> {
    const params = new URLSearchParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    // Add cache-busting parameter to prevent service worker caching issues
    const cacheBuster = `_=${Date.now()}`;
    const paramsString = params.toString();
    const separator = paramsString ? '&' : '';
    const endpoint = `/api/marketplace/listings?${paramsString}${separator}${cacheBuster}`;
    
    console.log('[MarketplaceService] Fetching listings from primary URL:', `${this.primaryBaseUrl}${endpoint}`);
    
    const response = await this.makeApiRequest(endpoint, { method: 'GET' });

    if (!response.ok) {
      throw new Error(`API request failed with status: ${response.status}`);
    }

    const result = await response.json();
    console.log('[MarketplaceService] Raw API result:', result);

    if (!result.success) {
      throw new Error(result.message || 'API returned failure');
    }

    const data = result.data;
    console.log('[MarketplaceService] Extracted data:', data);

    // Handle different response formats
    if (Array.isArray(data)) {
      console.log('[MarketplaceService] Data is array, returning directly:', data.length, 'items');
      return data;
    } else if (data && Array.isArray(data.listings)) {
      console.log('[MarketplaceService] Data has listings array, returning:', data.listings.length, 'items');
      return data.listings;
    } else if (data && data.data && Array.isArray(data.data.listings)) {
      console.log('[MarketplaceService] Data has nested listings array, returning:', data.data.listings.length, 'items');
      return data.data.listings;
    } else {
      throw new Error('Invalid response format: no listings array found');
    }
  }

  /**
   * Check marketplace service health
   */
  async checkHealth(): Promise<{ healthy: boolean; message?: string }> {
    try {
      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const endpoint = `/api/marketplace/health?${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);

      if (!response.ok) {
        return { healthy: false, message: 'Marketplace service unavailable' };
      }

      const result = await response.json();
      return {
        healthy: result.success && result.status === 'healthy',
        message: result.message || 'Service status checked'
      };
    } catch (error) {
      console.error('[MarketplaceService] Health check failed:', error);
      return { healthy: false, message: 'Health check failed' };
    }
  }

  /**
   * Get marketplace statistics
   */
  async getStats(): Promise<any> {
    try {
      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const endpoint = `/api/marketplace/stats?${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);

      if (!response.ok) {
        console.warn('[MarketplaceService] Stats request failed:', response.status);
        return {
          totalListings: 0,
          totalCategories: 0,
          categories: [],
          message: 'Marketplace service temporarily unavailable'
        };
      }

      const result = await response.json();
      return result.data || {
        totalListings: 0,
        totalCategories: 0,
        categories: []
      };
    } catch (error) {
      console.error('[MarketplaceService] Stats fetch failed:', error);
      return {
        totalListings: 0,
        totalCategories: 0,
        categories: [],
        message: 'Failed to fetch marketplace statistics'
      };
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
      // Add cache-busting parameter to prevent service worker caching issues
      const cacheBuster = `_=${Date.now()}`;
      const endpoint = `/api/marketplace/health?${cacheBuster}`;
      const response = await this.makeApiRequest(endpoint);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  } async getCategories(): Promise<CategoryInfo[]> {
    // Add cache-busting parameter to prevent service worker caching issues
    const cacheBuster = `_=${Date.now()}`;
    const endpoint = `/api/marketplace/listings/categories?${cacheBuster}`;
    const response = await this.makeApiRequest(endpoint);

    if (!response.ok) {
      throw new Error(`Categories API request failed with status: ${response.status}`);
    }

    const result = await response.json();
    if (result.success) {
      return result.data || [];
    } else {
      throw new Error(result.message || 'Failed to fetch categories');
    }
  }

  

  // ============================================================================
  // SELLER MANAGEMENT (for breadcrumbs)
  // ============================================================================

  async getSellerById(sellerId: string): Promise<SellerInfo | null> {
    try {
      // Don't fetch profile if sellerId is 'unknown'
      if (!sellerId || sellerId === 'unknown') {
        return null;
      }

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
      const response = await this.makeApiRequest(`/escrow/${escrowId}/approve`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress })
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
      const response = await this.makeApiRequest(`/escrow/${escrowId}/dispute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userAddress, reason })
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
      const response = await this.makeApiRequest(`/listings/${listingId}/offers`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ buyerAddress, offerAmount })
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
      const response = await this.makeApiRequest(`/offers/${offerId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerAddress })
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
      const response = await this.makeApiRequest(`/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orderData)
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
      const response = await this.makeApiRequest(`/orders/${orderId}/escrow`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(escrowData)
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
      const response = await this.makeApiRequest(`/orders/${orderId}/tracking`);

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
      const response = await this.makeApiRequest(`/orders/${orderId}/tracking`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(trackingData)
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
      const response = await this.makeApiRequest(`/listings?${params}`);

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
      const response = await this.makeApiRequest(`/listings/${listingId}/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sellerAddress })
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
      const response = await this.makeApiRequest(`/listings/bulk-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates })
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