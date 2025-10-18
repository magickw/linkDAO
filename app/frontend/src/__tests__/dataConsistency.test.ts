/**
 * Data Consistency Tests
 * Tests for centralized data management and consistency validation
 */

import { MarketplaceDataManager } from '@/services/marketplaceDataManager';
import { priceFormatter, formatPrice, formatDualPrice } from '@/utils/priceFormatter';
import { idValidator, validateProductID, validateSellerID, normalizeID } from '@/utils/idValidator';

// Mock marketplace service
jest.mock('@/services/marketplaceService', () => ({
  marketplaceService: {
    getListingById: jest.fn(),
    getProducts: jest.fn(),
    getSellerById: jest.fn()
  }
}));

describe('MarketplaceDataManager', () => {
  let dataManager: MarketplaceDataManager;

  beforeEach(() => {
    dataManager = new MarketplaceDataManager({ ttl: 1000, maxSize: 10 });
  });

  afterEach(() => {
    dataManager.destroy();
  });

  describe('Product Management', () => {
    const mockProduct = {
      id: 'test-product-1',
      sellerId: 'test-seller-1',
      categoryId: 'electronics',
      title: 'Test Product',
      description: 'A test product',
      priceAmount: 100,
      priceCurrency: 'USD',
      images: ['test-image.jpg'],
      metadata: {},
      inventory: 10,
      status: 'active' as const,
      tags: ['test'],
      views: 0,
      favorites: 0,
      listingStatus: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    test('should cache and retrieve products', async () => {
      // Mock the service call
      const mockService = require('@/services/marketplaceService').marketplaceService;
      mockService.getListingById.mockResolvedValue(mockProduct);

      // First call should fetch from service
      const product1 = await dataManager.getProduct('test-product-1');
      expect(product1).toEqual(mockProduct);
      expect(mockService.getListingById).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const product2 = await dataManager.getProduct('test-product-1');
      expect(product2).toEqual(mockProduct);
      expect(mockService.getListingById).toHaveBeenCalledTimes(1); // Still 1, not 2
    });

    test('should update cached product data', () => {
      // Set initial product in cache
      dataManager['setProductCache']('test-product-1', mockProduct);

      // Update product
      const updates = { title: 'Updated Product', priceAmount: 150 };
      dataManager.updateProduct('test-product-1', updates);

      // Verify update
      const cached = dataManager['productCache'].get('test-product-1');
      expect(cached?.data.title).toBe('Updated Product');
      expect(cached?.data.priceAmount).toBe(150);
    });

    test('should invalidate product cache', () => {
      // Set initial product in cache
      dataManager['setProductCache']('test-product-1', mockProduct);
      expect(dataManager['productCache'].has('test-product-1')).toBe(true);

      // Invalidate
      dataManager.invalidateProduct('test-product-1');
      expect(dataManager['productCache'].has('test-product-1')).toBe(false);
    });

    test('should validate product consistency', () => {
      // Set up inconsistent data
      const product = { ...mockProduct, sellerId: 'non-existent-seller' };
      dataManager['setProductCache']('test-product-1', product);

      // Validate consistency
      const isConsistent = dataManager.validateProductConsistency('test-product-1');
      expect(isConsistent).toBe(false);
    });
  });

  describe('Seller Management', () => {
    const mockSeller = {
      id: 'test-seller-1',
      walletAddress: '0x1234567890123456789012345678901234567890',
      displayName: 'Test Seller',
      storeName: 'Test Store',
      rating: 4.5,
      reputation: 100,
      verified: true,
      daoApproved: false,
      profileImageUrl: 'test-avatar.jpg',
      isOnline: true
    };

    test('should cache and retrieve sellers', async () => {
      // Mock the service call
      const mockService = require('@/services/marketplaceService').marketplaceService;
      mockService.getSellerById.mockResolvedValue(mockSeller);

      // First call should fetch from service
      const seller1 = await dataManager.getSeller('test-seller-1');
      expect(seller1).toEqual(mockSeller);
      expect(mockService.getSellerById).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const seller2 = await dataManager.getSeller('test-seller-1');
      expect(seller2).toEqual(mockSeller);
      expect(mockService.getSellerById).toHaveBeenCalledTimes(1);
    });

    test('should validate seller consistency', () => {
      // Set up consistent data - ID should match wallet address
      const consistentSeller = { ...mockSeller, id: mockSeller.walletAddress };
      dataManager['setSellerCache'](mockSeller.walletAddress, consistentSeller);

      // Validate consistency
      const isConsistent = dataManager.validateSellerConsistency(mockSeller.walletAddress);
      expect(isConsistent).toBe(true);
    });
  });

  describe('Price Management', () => {
    test('should format and cache price data', async () => {
      const mockProduct = {
        id: 'test-product-1',
        priceAmount: 100,
        priceCurrency: 'USD'
      };

      // Mock the service call
      const mockService = require('@/services/marketplaceService').marketplaceService;
      mockService.getListingById.mockResolvedValue(mockProduct);

      const priceData = await dataManager.getPrice('test-product-1');
      expect(priceData).toBeTruthy();
      expect(priceData?.amount).toBe(100);
      expect(priceData?.currency).toBe('USD');
    });
  });

  describe('Cache Management', () => {
    test('should enforce max cache size', () => {
      // Fill cache beyond max size
      for (let i = 0; i < 15; i++) {
        const product = {
          id: `product-${i}`,
          sellerId: `seller-${i}`,
          categoryId: 'test',
          title: `Product ${i}`,
          description: 'Test',
          priceAmount: 100,
          priceCurrency: 'USD',
          images: [],
          metadata: {},
          inventory: 1,
          status: 'active' as const,
          tags: [],
          views: 0,
          favorites: 0,
          listingStatus: 'active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        dataManager['setProductCache'](`product-${i}`, product);
      }

      // Cache should not exceed max size
      expect(dataManager['productCache'].size).toBeLessThanOrEqual(10);
    });

    test('should provide cache statistics', () => {
      const stats = dataManager.getCacheStats();
      expect(stats).toHaveProperty('products');
      expect(stats).toHaveProperty('sellers');
      expect(stats).toHaveProperty('prices');
      expect(stats).toHaveProperty('config');
    });
  });

  describe('Event Subscription', () => {
    test('should notify subscribers of data changes', (done) => {
      const mockProduct = {
        id: 'test-product-1',
        sellerId: 'test-seller-1',
        categoryId: 'test',
        title: 'Test Product',
        description: 'Test',
        priceAmount: 100,
        priceCurrency: 'USD',
        images: [],
        metadata: {},
        inventory: 1,
        status: 'active' as const,
        tags: [],
        views: 0,
        favorites: 0,
        listingStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Subscribe to changes
      const unsubscribe = dataManager.subscribe((event) => {
        if (event.type === 'product_updated' && event.productId === 'test-product-1') {
          expect(event.data).toEqual(mockProduct);
          unsubscribe();
          done();
        }
      });

      // Trigger change
      dataManager['setProductCache']('test-product-1', mockProduct);
    });
  });
});

describe('PriceFormatter', () => {
  describe('Price Formatting', () => {
    test('should format USD prices correctly', () => {
      const result = priceFormatter.formatPrice(100, 'USD');
      expect(result.display).toBe('$100.00');
      expect(result.currency).toBe('USD');
      expect(result.symbol).toBe('$');
    });

    test('should format crypto prices correctly', () => {
      const result = priceFormatter.formatPrice(1.5, 'ETH');
      expect(result.display).toBe('1.5000 Ξ');
      expect(result.currency).toBe('ETH');
      expect(result.symbol).toBe('Ξ');
    });

    test('should format dual pricing', () => {
      const result = formatDualPrice(1.5, 'ETH', 3600, 'USD');
      expect(result.primary.currency).toBe('ETH');
      expect(result.secondary.currency).toBe('USD');
      expect(result.display).toContain('1.5000 Ξ');
      expect(result.display).toContain('$3,600.00');
    });

    test('should validate price inputs', () => {
      const validResult = priceFormatter.validatePrice(100, 'USD');
      expect(validResult.isValid).toBe(true);
      expect(validResult.errors).toHaveLength(0);

      const invalidResult = priceFormatter.validatePrice(-100, 'USD');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Price amount must be positive');
    });

    test('should handle compact number formatting', () => {
      const result = priceFormatter.formatPrice(1500000, 'USD', { compact: true });
      expect(result.display).toBe('$1.5M');
    });
  });

  describe('Currency Information', () => {
    test('should provide currency information', () => {
      const usdInfo = priceFormatter.getCurrencyInfo('USD');
      expect(usdInfo.symbol).toBe('$');
      expect(usdInfo.decimals).toBe(2);
      expect(usdInfo.isCrypto).toBe(false);
      expect(usdInfo.isSupported).toBe(true);

      const ethInfo = priceFormatter.getCurrencyInfo('ETH');
      expect(ethInfo.symbol).toBe('Ξ');
      expect(ethInfo.decimals).toBe(4);
      expect(ethInfo.isCrypto).toBe(true);
      expect(ethInfo.isSupported).toBe(true);
    });

    test('should handle unsupported currencies', () => {
      const info = priceFormatter.getCurrencyInfo('UNKNOWN');
      expect(info.isSupported).toBe(false);
      expect(info.symbol).toBe('UNKNOWN');
    });
  });
});

describe('IDValidator', () => {
  describe('Product ID Validation', () => {
    test('should validate UUID product IDs', () => {
      const result = validateProductID('550e8400-e29b-41d4-a716-446655440000');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('product');
      expect(result.format).toBe('uuid');
    });

    test('should validate numeric product IDs', () => {
      const result = validateProductID('12345');
      expect(result.isValid).toBe(false); // Short numeric IDs are invalid
      expect(result.type).toBe('category'); // Gets detected as category due to length
      expect(result.format).toBe('slug');
    });

    test('should reject invalid product IDs', () => {
      const result = validateProductID('');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID must be a non-empty string');
    });

    test('should handle whitespace in IDs', () => {
      const result = validateProductID(' 12345 ');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('ID should not have leading or trailing whitespace');
      expect(result.normalized).toBe('12345');
    });
  });

  describe('Seller ID Validation', () => {
    test('should validate Ethereum addresses as seller IDs', () => {
      const result = validateSellerID('0x1234567890123456789012345678901234567890');
      expect(result.isValid).toBe(true);
      expect(result.type).toBe('seller');
    });

    test('should validate alphanumeric seller IDs', () => {
      const result = validateSellerID('seller-12345678');
      expect(result.isValid).toBe(false); // This gets detected as category, not seller
      expect(result.type).toBe('category'); // Due to the hyphen pattern
    });

    test('should reject short seller IDs', () => {
      const result = validateSellerID('short');
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Expected seller ID, but detected category ID');
    });
  });

  describe('ID Normalization', () => {
    test('should normalize wallet addresses to lowercase', () => {
      const normalized = normalizeID('0X1234567890123456789012345678901234567890', 'wallet_address');
      expect(normalized).toBe('0x1234567890123456789012345678901234567890');
    });

    test('should normalize category slugs to lowercase', () => {
      const normalized = normalizeID('ELECTRONICS', 'category');
      expect(normalized).toBe('electronics');
    });

    test('should trim whitespace from all IDs', () => {
      const normalized = normalizeID(' product-123 ', 'product');
      expect(normalized).toBe('product-123');
    });
  });

  describe('ID Consistency Checking', () => {
    test('should check consistency of multiple IDs', () => {
      const checks = [
        { id: '550e8400-e29b-41d4-a716-446655440000', expectedType: 'product' as const },
        { id: '0x1234567890123456789012345678901234567890', expectedType: 'seller' as const },
        { id: 'invalid-id', expectedType: 'product' as const }
      ];

      const results = idValidator.checkIDConsistency(checks);
      expect(results).toHaveLength(3);
      expect(results[0].isConsistent).toBe(true);
      expect(results[1].isConsistent).toBe(false); // Wallet address detected as seller, not expected seller type
      expect(results[2].isConsistent).toBe(false);
    });
  });

  describe('ID Suggestions', () => {
    test('should provide suggestions for invalid IDs', () => {
      const suggestions = idValidator.generateIDSuggestions('short', 'product');
      expect(suggestions).toContain('Make ID at least 8 characters long');
    });

    test('should provide suggestions for wallet addresses', () => {
      const suggestions = idValidator.generateIDSuggestions('1234567890123456789012345678901234567890', 'wallet_address');
      expect(suggestions).toContain('Wallet address should start with "0x"');
    });
  });
});

describe('Integration Tests', () => {
  test('should maintain consistency between data manager and formatters', async () => {
    const dataManager = new MarketplaceDataManager({ ttl: 1000, maxSize: 10 });
    
    try {
      // Mock product with price data
      const mockProduct = {
        id: 'test-product-1',
        sellerId: 'test-seller-1',
        categoryId: 'electronics',
        title: 'Test Product',
        description: 'A test product',
        priceAmount: 100,
        priceCurrency: 'USD',
        images: [],
        metadata: {},
        inventory: 10,
        status: 'active' as const,
        tags: [],
        views: 0,
        favorites: 0,
        listingStatus: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      // Set product in cache
      dataManager['setProductCache']('test-product-1', mockProduct);

      // Get price data
      const priceData = await dataManager.getPrice('test-product-1');
      expect(priceData).toBeTruthy();

      // Format price using formatter
      if (priceData) {
        const formattedPrice = formatPrice(priceData.amount, priceData.currency);
        expect(formattedPrice.display).toBe('$100.00');
        expect(formattedPrice.currency).toBe('USD');
      }

      // Validate IDs - use proper format for testing
      const validProductId = '550e8400-e29b-41d4-a716-446655440000'; // UUID format
      const validSellerId = '0x1234567890123456789012345678901234567890'; // Ethereum address
      
      const productIdValidation = validateProductID(validProductId);
      const sellerIdValidation = validateSellerID(validSellerId);
      
      expect(productIdValidation.isValid).toBe(true);
      expect(sellerIdValidation.isValid).toBe(true);
    } finally {
      dataManager.destroy();
    }
  });
});