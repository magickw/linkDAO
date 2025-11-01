import { ProductListingService, CreateListingInput, UpdateListingInput } from '../services/listingService';
import { ProductService } from '../services/productService';
import ImageStorageService from '../services/imageStorageService';
import { DatabaseService } from '../services/databaseService';
import { RedisService } from '../services/redisService';
import { ValidationError } from '../models/validation';

// Mock dependencies
jest.mock('../services/productService');
jest.mock('../services/imageStorageService');
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('ListingService', () => {
  let listingService: ProductListingService;
  let mockProductService: jest.Mocked<ProductService>;
  let mockImageStorageService: jest.Mocked<typeof ImageStorageService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRedisService: jest.Mocked<RedisService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    listingService = new ProductListingService();

    // Get mocked instances
    mockProductService = ProductService.prototype as jest.Mocked<ProductService>;
    mockImageStorageService = ImageStorageService as jest.Mocked<typeof ImageStorageService>;
    mockDatabaseService = DatabaseService.prototype as jest.Mocked<DatabaseService>;
    mockRedisService = RedisService.prototype as jest.Mocked<RedisService>;

    // Setup default mocks
    mockDatabaseService.getDatabase = jest.fn().mockReturnValue({
      transaction: jest.fn().mockImplementation((callback) => callback({
        update: jest.fn().mockReturnValue({
          set: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([])
          })
        })
      }))
    });

    mockRedisService.cacheProductListing = jest.fn().mockResolvedValue(undefined);
    mockRedisService.getCachedProductListing = jest.fn().mockResolvedValue(null);
    mockRedisService.invalidateProductListing = jest.fn().mockResolvedValue(undefined);
    mockRedisService.set = jest.fn().mockResolvedValue(undefined);
    mockRedisService.get = jest.fn().mockResolvedValue(null);
    mockRedisService.del = jest.fn().mockResolvedValue(undefined);
  });

  describe('createListing', () => {
    const validListingInput: CreateListingInput = {
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'This is a test product with detailed description that meets minimum requirements',
      price: {
        amount: '99.99',
        currency: 'USD'
      },
      categoryId: 'category-123',
      images: ['ipfs-hash-1', 'ipfs-hash-2'],
      metadata: {
        condition: 'new',
        brand: 'Test Brand',
        weight: 500
      },
      inventory: 10,
      tags: ['electronics', 'gadget'],
      listingStatus: 'draft'
    };

    it('should create a listing successfully with valid input', async () => {
      // Mock successful product creation
      const mockProduct = {
        id: 'product-123',
        ...validListingInput,
        category: { id: 'category-123', name: 'Electronics', slug: 'electronics', path: ['Electronics'], isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
        status: 'active',
        views: 0,
        favorites: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProductService.createProduct = jest.fn().mockResolvedValue(mockProduct);

      const result = await listingService.createListing(validListingInput);

      expect(result).toEqual(mockProduct);
      expect(mockProductService.createProduct).toHaveBeenCalledWith(validListingInput);
      expect(mockRedisService.cacheProductListing).toHaveBeenCalledWith('product-123', mockProduct, 900);
    });

    it('should throw ValidationError for missing required fields', async () => {
      const invalidInput = {
        ...validListingInput,
        title: '' // Empty title
      };

      await expect(listingService.createListing(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for invalid price', async () => {
      const invalidInput = {
        ...validListingInput,
        price: {
          amount: '0',
          currency: 'USD'
        }
      };

      await expect(listingService.createListing(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError for negative inventory', async () => {
      const invalidInput = {
        ...validListingInput,
        inventory: -1
      };

      await expect(listingService.createListing(invalidInput)).rejects.toThrow(ValidationError);
    });

    it('should handle database transaction failure', async () => {
      mockProductService.createProduct = jest.fn().mockRejectedValue(new Error('Database error'));

      await expect(listingService.createListing(validListingInput)).rejects.toThrow(ValidationError);
    });
  });

  describe('updateListing', () => {
    const mockExistingListing = {
      id: 'product-123',
      sellerId: 'seller-123',
      title: 'Existing Product',
      description: 'Existing description',
      price: { amount: '50.00', currency: 'USD' },
      category: { id: 'category-123', name: 'Electronics', slug: 'electronics', path: ['Electronics'], isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      images: ['ipfs-hash-1'],
      metadata: { condition: 'new' as const },
      inventory: 5,
      status: 'active' as const,
      tags: ['electronics'],
      views: 10,
      favorites: 2,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const updateInput: UpdateListingInput = {
      title: 'Updated Product Title',
      listingStatus: 'published'
    };

    it('should update listing successfully', async () => {
      const updatedListing = {
        ...mockExistingListing,
        ...updateInput
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(mockExistingListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue(updatedListing);

      const result = await listingService.updateListing('product-123', updateInput);

      expect(result).toEqual(updatedListing);
      expect(mockProductService.updateProduct).toHaveBeenCalledWith('product-123', updateInput);
      expect(mockRedisService.invalidateProductListing).toHaveBeenCalledWith('product-123');
    });

    it('should return null for non-existent listing', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(null);

      const result = await listingService.updateListing('non-existent', updateInput);

      expect(result).toBeNull();
    });

    it('should validate status transitions', async () => {
      const invalidStatusUpdate = {
        listingStatus: 'published' as const
      };

      // Mock a suspended listing trying to go directly to published
      const suspendedListing = {
        ...mockExistingListing,
        status: 'suspended' as const
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(suspendedListing);

      await expect(listingService.updateListing('product-123', invalidStatusUpdate)).rejects.toThrow(ValidationError);
    });

    it('should validate primary image index', async () => {
      const invalidImageIndex = {
        primaryImageIndex: 10 // Out of range
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(mockExistingListing);

      await expect(listingService.updateListing('product-123', invalidImageIndex)).rejects.toThrow(ValidationError);
    });
  });

  describe('getListingById', () => {
    const mockListing = {
      id: 'product-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test description',
      price: { amount: '99.99', currency: 'USD' },
      category: { id: 'category-123', name: 'Electronics', slug: 'electronics', path: ['Electronics'], isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
      images: ['ipfs-hash-1'],
      metadata: { condition: 'new' as const },
      inventory: 10,
      status: 'active' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return cached listing if available', async () => {
      mockRedisService.getCachedProductListing = jest.fn().mockResolvedValue(mockListing);

      const result = await listingService.getListingById('product-123');

      expect(result).toEqual(mockListing);
      expect(mockRedisService.getCachedProductListing).toHaveBeenCalledWith('product-123');
      expect(mockProductService.getProductById).not.toHaveBeenCalled();
    });

    it('should fetch from database and cache if not in cache', async () => {
      mockRedisService.getCachedProductListing = jest.fn().mockResolvedValue(null);
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockListing);

      const result = await listingService.getListingById('product-123');

      expect(result).toEqual(mockListing);
      expect(mockProductService.getProductById).toHaveBeenCalledWith('product-123');
      expect(mockRedisService.cacheProductListing).toHaveBeenCalledWith('product-123', mockListing, 900);
    });

    it('should return null for non-existent listing', async () => {
      mockRedisService.getCachedProductListing = jest.fn().mockResolvedValue(null);
      mockProductService.getProductById = jest.fn().mockResolvedValue(null);

      const result = await listingService.getListingById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getMarketplaceListings', () => {
    const mockSearchResult = {
      products: [
        {
          id: 'product-1',
          sellerId: 'seller-1',
          title: 'Product 1',
          description: 'Description 1',
          price: { amount: '99.99', currency: 'USD' },
          category: { id: 'category-1', name: 'Electronics', slug: 'electronics', path: ['Electronics'], isActive: true, sortOrder: 0, createdAt: new Date(), updatedAt: new Date() },
          images: ['ipfs-1'],
          metadata: { condition: 'new' as const },
          inventory: 10,
          status: 'active' as const,
          tags: ['electronics'],
          views: 0,
          favorites: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ],
      total: 1,
      page: 1,
      limit: 20,
      totalPages: 1,
      filters: {},
      sort: { field: 'publishedAt' as const, direction: 'desc' as const }
    };

    it('should return marketplace listings with published status filter', async () => {
      // Mock the searchListingsEnhanced method
      const searchSpy = jest.spyOn(listingService, 'searchListingsEnhanced').mockResolvedValue(mockSearchResult);

      const result = await listingService.getMarketplaceListings();

      expect(result).toEqual(mockSearchResult);
      expect(searchSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          status: ['active'],
          listingStatus: 'published'
        }),
        { field: 'publishedAt', direction: 'desc' },
        { page: 1, limit: 20 }
      );
    });

    it('should use cache for popular queries', async () => {
      const cacheKey = expect.any(String);
      mockRedisService.get = jest.fn().mockResolvedValue(mockSearchResult);

      const result = await listingService.getMarketplaceListings();

      expect(result).toEqual(mockSearchResult);
      expect(mockRedisService.get).toHaveBeenCalled();
    });
  });

  describe('searchListingsEnhanced', () => {
    it('should build correct database query with filters', async () => {
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      };

      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const filters = {
        query: 'test',
        categoryId: 'category-123',
        priceMin: '10.00',
        priceMax: '100.00'
      };

      await listingService.searchListingsEnhanced(filters);

      expect(mockDb.select).toHaveBeenCalled();
      expect(mockDb.where).toHaveBeenCalled();
      expect(mockDb.orderBy).toHaveBeenCalled();
    });

    it('should handle empty search results', async () => {
      const mockDb = {
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([])
      };

      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }])
      });

      mockDatabaseService.getDatabase = jest.fn().mockReturnValue(mockDb);

      const result = await listingService.searchListingsEnhanced();

      expect(result.products).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.totalPages).toBe(0);
    });
  });

  describe('validation', () => {
    it('should validate listing input comprehensively', async () => {
      const validInput: CreateListingInput = {
        sellerId: 'seller-123',
        title: 'Valid Product Title',
        description: 'This is a comprehensive description that meets all requirements for a good listing',
        price: { amount: '99.99', currency: 'USD' },
        categoryId: 'category-123',
        images: ['ipfs-1', 'ipfs-2', 'ipfs-3'],
        metadata: { condition: 'new' },
        inventory: 10,
        tags: ['electronics', 'gadget'],
        shipping: {
          weight: 500,
          dimensions: { length: 10, width: 10, height: 5 },
          freeShipping: false,
          shippingMethods: ['standard'],
          handlingTime: 1,
          shipsFrom: { country: 'US' }
        },
        seoTitle: 'SEO Optimized Title',
        seoDescription: 'SEO description',
        seoKeywords: ['keyword1', 'keyword2']
      };

      // Access private method for testing
      const validation = await (listingService as any).validateListingInput(validInput);

      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
      expect(validation.completeness).toBeGreaterThan(90);
    });

    it('should identify validation errors and warnings', async () => {
      const invalidInput: CreateListingInput = {
        sellerId: '',
        title: 'Short',
        description: 'Too short',
        price: { amount: '0', currency: 'USD' },
        categoryId: '',
        images: [],
        metadata: { condition: 'new' },
        inventory: -1,
        tags: []
      };

      const validation = await (listingService as any).validateListingInput(invalidInput);

      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
      expect(validation.warnings.length).toBeGreaterThan(0);
      expect(validation.completeness).toBeLessThan(50);
    });
  });

  describe('status transitions', () => {
    it('should return valid status transitions', () => {
      const transitions = (listingService as any).getValidStatusTransitions('draft');
      expect(transitions).toContain('active');
      expect(transitions).toContain('published');
      expect(transitions).toContain('inactive');
    });

    it('should restrict invalid transitions', () => {
      const transitions = (listingService as any).getValidStatusTransitions('suspended');
      expect(transitions).not.toContain('published');
      expect(transitions).toContain('inactive');
    });
  });

  describe('search vector generation', () => {
    it('should generate search vector from listing content', () => {
      const input = {
        title: 'Amazing Product',
        description: 'This is an amazing product with great features',
        tags: ['electronics', 'gadget'],
        seoKeywords: ['amazing', 'product']
      };

      const searchVector = (listingService as any).generateSearchVector(input);

      expect(searchVector).toContain('amazing product');
      expect(searchVector).toContain('electronics');
      expect(searchVector).toContain('gadget');
      expect(typeof searchVector).toBe('string');
    });

    it('should handle empty or undefined values', () => {
      const input = {
        title: 'Title',
        description: 'Description',
        tags: undefined,
        seoKeywords: []
      };

      const searchVector = (listingService as any).generateSearchVector(input);

      expect(searchVector).toBe('title description');
    });
  });

  describe('cache management', () => {
    it('should generate consistent cache keys', () => {
      const key1 = (listingService as any).generateCacheKey('test', { a: 1 }, { b: 2 }, { c: 3 });
      const key2 = (listingService as any).generateCacheKey('test', { a: 1 }, { b: 2 }, { c: 3 });

      expect(key1).toBe(key2);
      expect(key1).toMatch(/^test:/);
    });

    it('should sanitize cache keys', () => {
      const key = (listingService as any).generateCacheKey('test', { 'special@chars!': 'value' }, {}, {});

      expect(key).not.toContain('@');
      expect(key).not.toContain('!');
    });
  });
});
