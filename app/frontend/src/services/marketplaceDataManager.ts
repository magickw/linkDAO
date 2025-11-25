/**
 * Centralized Marketplace Data Manager
 * Ensures cross-component data consistency with cache invalidation and real-time updates
 */

import { marketplaceService, type Product, type SellerInfo } from './marketplaceService';

// Dynamically import sellerService to avoid circular dependencies
const getSellerService = async () => {
  try {
    const { sellerService } = await import('./sellerService');
    return sellerService;
  } catch (error) {
    console.warn('Seller service not available:', error);
    return null;
  }
};

// Data consistency interfaces
export interface MarketplaceEntity {
  id: string;
  lastUpdated: Date;
  version: number;
}

export interface ProductEntity extends MarketplaceEntity {
  data: Product;
  sellerId: string;
  categoryId: string;
}

export interface SellerEntity extends MarketplaceEntity {
  data: SellerInfo;
  walletAddress: string;
}

export interface PriceData {
  productId: string;
  amount: number;
  currency: string;
  usdEquivalent?: string;
  eurEquivalent?: string;
  gbpEquivalent?: string;
  lastUpdated: Date;
}

// Cache configuration
interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of items to cache
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  ttl: 5 * 60 * 1000, // 5 minutes
  maxSize: 1000
};

// Event types for data consistency
export type DataChangeEvent = 
  | { type: 'product_updated'; productId: string; data: Product }
  | { type: 'product_deleted'; productId: string }
  | { type: 'seller_updated'; sellerId: string; data: SellerInfo }
  | { type: 'price_updated'; productId: string; priceData: PriceData }
  | { type: 'cache_invalidated'; entityType: 'product' | 'seller' | 'all' };

// Subscription callback type
export type DataChangeCallback = (event: DataChangeEvent) => void;

class MarketplaceDataManager {
  private productCache = new Map<string, ProductEntity>();
  private sellerCache = new Map<string, SellerEntity>();
  private priceCache = new Map<string, PriceData>();
  private subscribers = new Set<DataChangeCallback>();
  private cacheConfig: CacheConfig;
  private cleanupInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cacheConfig = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.startCleanupInterval();
  }

  // ============================================================================
  // SUBSCRIPTION MANAGEMENT
  // ============================================================================

  subscribe(callback: DataChangeCallback): () => void {
    this.subscribers.add(callback);
    return () => {
      this.subscribers.delete(callback);
    };
  }

  private notifySubscribers(event: DataChangeEvent): void {
    this.subscribers.forEach(callback => {
      try {
        callback(event);
      } catch (error) {
        console.error('Error in data change callback:', error);
      }
    });
  }

  // ============================================================================
  // PRODUCT DATA MANAGEMENT
  // ============================================================================

  async getProduct(productId: string, forceRefresh = false): Promise<Product | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.productCache.get(productId);
      if (cached && this.isValidCacheEntry(cached)) {
        return cached.data;
      }
    }

    try {
      // Fetch from service
      const product = await marketplaceService.getListingById(productId);
      if (product) {
        this.setProductCache(productId, product);
        return product;
      }
      return null;
    } catch (error) {
      console.error('Error fetching product:', error);
      // Return cached data if available, even if expired
      const cached = this.productCache.get(productId);
      return cached ? cached.data : null;
    }
  }

  async getProducts(filters?: any, forceRefresh = false): Promise<Product[]> {
    try {
      const result = await marketplaceService.getProducts(filters);
      
      // Update cache with fresh data
      result.products.forEach(product => {
        this.setProductCache(product.id, product);
      });

      return result.products;
    } catch (error) {
      console.error('Error fetching products:', error);
      return [];
    }
  }

  private setProductCache(productId: string, product: Product): void {
    const entity: ProductEntity = {
      id: productId,
      data: product,
      sellerId: product.sellerId,
      categoryId: product.categoryId,
      lastUpdated: new Date(),
      version: (this.productCache.get(productId)?.version || 0) + 1
    };

    this.productCache.set(productId, entity);
    this.enforceMaxCacheSize(this.productCache);

    // Notify subscribers
    this.notifySubscribers({
      type: 'product_updated',
      productId,
      data: product
    });
  }

  updateProduct(productId: string, updates: Partial<Product>): void {
    const cached = this.productCache.get(productId);
    if (cached) {
      const updatedProduct = { ...cached.data, ...updates };
      this.setProductCache(productId, updatedProduct);
    }
  }

  invalidateProduct(productId: string): void {
    this.productCache.delete(productId);
    this.priceCache.delete(productId);
    
    this.notifySubscribers({
      type: 'product_deleted',
      productId
    });
  }

  // ============================================================================
  // SELLER DATA MANAGEMENT
  // ============================================================================

  async getSeller(sellerId: string, forceRefresh = false): Promise<SellerInfo | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.sellerCache.get(sellerId);
      if (cached && this.isValidCacheEntry(cached)) {
        return cached.data;
      }
    }

    try {
      // Try marketplace service first
      let seller = await marketplaceService.getSellerById(sellerId);
      
      // Fallback to seller service if not found
      if (!seller) {
        const sellerService = await getSellerService();
        if (sellerService) {
          const sellerProfile = await sellerService.getSellerProfile(sellerId);
          if (sellerProfile) {
            seller = {
              id: sellerProfile.walletAddress,
              walletAddress: sellerProfile.walletAddress,
              displayName: sellerProfile.storeName,
              storeName: sellerProfile.storeName,
              rating: 4.5, // Default rating
              reputation: sellerProfile.daoReputation?.governanceParticipation || 0,
              verified: false,
              daoApproved: false,
              profileImageUrl: sellerProfile.profileImageCdn,
              isOnline: true
            };
          }
        }
      }

      if (seller) {
        this.setSellerCache(sellerId, seller);
        return seller;
      }
      return null;
    } catch (error) {
      console.error('Error fetching seller:', error);
      // Return cached data if available, even if expired
      const cached = this.sellerCache.get(sellerId);
      return cached ? cached.data : null;
    }
  }

  private setSellerCache(sellerId: string, seller: SellerInfo): void {
    const entity: SellerEntity = {
      id: sellerId,
      data: seller,
      walletAddress: seller.walletAddress,
      lastUpdated: new Date(),
      version: (this.sellerCache.get(sellerId)?.version || 0) + 1
    };

    this.sellerCache.set(sellerId, entity);
    this.enforceMaxCacheSize(this.sellerCache);

    // Notify subscribers
    this.notifySubscribers({
      type: 'seller_updated',
      sellerId,
      data: seller
    });
  }

  updateSeller(sellerId: string, updates: Partial<SellerInfo>): void {
    const cached = this.sellerCache.get(sellerId);
    if (cached) {
      const updatedSeller = { ...cached.data, ...updates };
      this.setSellerCache(sellerId, updatedSeller);
    }
  }

  invalidateSeller(sellerId: string): void {
    this.sellerCache.delete(sellerId);
    
    this.notifySubscribers({
      type: 'seller_updated',
      sellerId,
      data: {} as SellerInfo
    });
  }

  // ============================================================================
  // PRICE DATA MANAGEMENT
  // ============================================================================

  async getPrice(productId: string, forceRefresh = false): Promise<PriceData | null> {
    // Check cache first
    if (!forceRefresh) {
      const cached = this.priceCache.get(productId);
      if (cached && this.isPriceDataValid(cached)) {
        return cached;
      }
    }

    try {
      const product = await this.getProduct(productId);
      if (product) {
        const priceData: PriceData = {
          productId,
          amount: product.priceAmount,
          currency: product.priceCurrency,
          usdEquivalent: await this.convertToUSD(product.priceAmount, product.priceCurrency),
          eurEquivalent: await this.convertToEUR(product.priceAmount, product.priceCurrency),
          gbpEquivalent: await this.convertToGBP(product.priceAmount, product.priceCurrency),
          lastUpdated: new Date()
        };

        this.priceCache.set(productId, priceData);
        
        this.notifySubscribers({
          type: 'price_updated',
          productId,
          priceData
        });

        return priceData;
      }
      return null;
    } catch (error) {
      console.error('Error fetching price data:', error);
      const cached = this.priceCache.get(productId);
      return cached || null;
    }
  }

  private async convertToUSD(amount: number, currency: string): Promise<string> {
    if (currency === 'USD') return amount.toString();
    
    try {
      // Use exchange rate service or API
      const rate = await this.getExchangeRate(currency, 'USD');
      return (amount * rate).toFixed(2);
    } catch (error) {
      console.error('Error converting to USD:', error);
      return amount.toString();
    }
  }

  private async convertToEUR(amount: number, currency: string): Promise<string> {
    if (currency === 'EUR') return amount.toString();
    
    try {
      const rate = await this.getExchangeRate(currency, 'EUR');
      return (amount * rate).toFixed(2);
    } catch (error) {
      console.error('Error converting to EUR:', error);
      return amount.toString();
    }
  }

  private async convertToGBP(amount: number, currency: string): Promise<string> {
    if (currency === 'GBP') return amount.toString();
    
    try {
      const rate = await this.getExchangeRate(currency, 'GBP');
      return (amount * rate).toFixed(2);
    } catch (error) {
      console.error('Error converting to GBP:', error);
      return amount.toString();
    }
  }

  private async getExchangeRate(fromCurrency: string, toCurrency: string): Promise<number> {
    // Mock exchange rate - in production, use a real exchange rate API
    const rates: Record<string, Record<string, number>> = {
      'ETH': { 'USD': 2400, 'EUR': 2200, 'GBP': 1900 },
      'BTC': { 'USD': 45000, 'EUR': 41000, 'GBP': 35000 },
      'USD': { 'EUR': 0.92, 'GBP': 0.79, 'ETH': 1/2400, 'BTC': 1/45000 },
      'EUR': { 'USD': 1.09, 'GBP': 0.86, 'ETH': 1/2200, 'BTC': 1/41000 },
      'GBP': { 'USD': 1.27, 'EUR': 1.16, 'ETH': 1/1900, 'BTC': 1/35000 }
    };

    return rates[fromCurrency]?.[toCurrency] || 1;
  }

  // ============================================================================
  // CACHE MANAGEMENT
  // ============================================================================

  private getTimestamp(date: Date | string | number): number {
    if (date instanceof Date) return date.getTime();
    if (typeof date === 'number') return date;
    if (typeof date === 'string') {
      const parsed = new Date(date);
      return isNaN(parsed.getTime()) ? Date.now() : parsed.getTime();
    }
    return Date.now();
  }

  private isValidCacheEntry(entity: MarketplaceEntity): boolean {
    const age = Date.now() - this.getTimestamp(entity.lastUpdated);
    return age < this.cacheConfig.ttl;
  }

  private isPriceDataValid(priceData: PriceData): boolean {
    const age = Date.now() - this.getTimestamp(priceData.lastUpdated);
    // Price data expires faster (1 minute)
    return age < 60 * 1000;
  }

  private enforceMaxCacheSize<T extends MarketplaceEntity>(cache: Map<string, T>): void {
    if (cache.size > this.cacheConfig.maxSize) {
      // Remove oldest entries
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => this.getTimestamp(a[1].lastUpdated) - this.getTimestamp(b[1].lastUpdated));

      const toRemove = entries.slice(0, cache.size - this.cacheConfig.maxSize);
      toRemove.forEach(([key]) => cache.delete(key));
    }
  }

  private startCleanupInterval(): void {
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredEntries();
    }, this.cacheConfig.ttl);
  }

  private cleanupExpiredEntries(): void {
    // Clean product cache
    for (const [key, entity] of this.productCache.entries()) {
      if (!this.isValidCacheEntry(entity)) {
        this.productCache.delete(key);
      }
    }

    // Clean seller cache
    for (const [key, entity] of this.sellerCache.entries()) {
      if (!this.isValidCacheEntry(entity)) {
        this.sellerCache.delete(key);
      }
    }

    // Clean price cache
    for (const [key, priceData] of this.priceCache.entries()) {
      if (!this.isPriceDataValid(priceData)) {
        this.priceCache.delete(key);
      }
    }
  }

  // ============================================================================
  // BULK OPERATIONS
  // ============================================================================

  invalidateAll(): void {
    this.productCache.clear();
    this.sellerCache.clear();
    this.priceCache.clear();

    this.notifySubscribers({
      type: 'cache_invalidated',
      entityType: 'all'
    });
  }

  invalidateProductsByCategory(categoryId: string): void {
    for (const [key, entity] of this.productCache.entries()) {
      if (entity.categoryId === categoryId) {
        this.productCache.delete(key);
      }
    }

    this.notifySubscribers({
      type: 'cache_invalidated',
      entityType: 'product'
    });
  }

  invalidateProductsBySeller(sellerId: string): void {
    for (const [key, entity] of this.productCache.entries()) {
      if (entity.sellerId === sellerId) {
        this.productCache.delete(key);
      }
    }

    this.notifySubscribers({
      type: 'cache_invalidated',
      entityType: 'product'
    });
  }

  // ============================================================================
  // CONSISTENCY VALIDATION
  // ============================================================================

  validateProductConsistency(productId: string): boolean {
    const product = this.productCache.get(productId);
    if (!product) return true; // No cached data to validate

    // Validate seller ID consistency
    if (product.sellerId && !this.sellerCache.has(product.sellerId)) {
      console.warn(`Product ${productId} references non-cached seller ${product.sellerId}`);
      return false;
    }

    // Validate price data consistency
    const priceData = this.priceCache.get(productId);
    if (priceData) {
      if (priceData.amount !== product.data.priceAmount || 
          priceData.currency !== product.data.priceCurrency) {
        console.warn(`Price data inconsistency for product ${productId}`);
        return false;
      }
    }

    return true;
  }

  validateSellerConsistency(sellerId: string): boolean {
    const seller = this.sellerCache.get(sellerId);
    if (!seller) return true; // No cached data to validate

    // Validate wallet address consistency
    if (seller.id !== seller.walletAddress) {
      console.warn(`Seller ID/wallet address mismatch for seller ${sellerId}`);
      return false;
    }

    return true;
  }

  // ============================================================================
  // STATISTICS AND MONITORING
  // ============================================================================

  getCacheStats() {
    return {
      products: {
        size: this.productCache.size,
        maxSize: this.cacheConfig.maxSize,
        hitRate: this.calculateHitRate('product')
      },
      sellers: {
        size: this.sellerCache.size,
        maxSize: this.cacheConfig.maxSize,
        hitRate: this.calculateHitRate('seller')
      },
      prices: {
        size: this.priceCache.size,
        maxSize: this.cacheConfig.maxSize,
        hitRate: this.calculateHitRate('price')
      },
      config: this.cacheConfig
    };
  }

  private calculateHitRate(type: 'product' | 'seller' | 'price'): number {
    // Simplified hit rate calculation
    // In production, you'd track hits/misses over time
    return 0.85; // Mock 85% hit rate
  }

  // ============================================================================
  // CLEANUP
  // ============================================================================

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    
    this.productCache.clear();
    this.sellerCache.clear();
    this.priceCache.clear();
    this.subscribers.clear();
  }
}

// Export singleton instance
export const marketplaceDataManager = new MarketplaceDataManager();

// Export for testing with custom config
export { MarketplaceDataManager };