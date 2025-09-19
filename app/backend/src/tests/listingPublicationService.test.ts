import { ListingPublicationService } from '../services/listingPublicationService';
import { ProductListingService } from '../services/listingService';
import { RedisService } from '../services/redisService';
import { DatabaseService } from '../services/databaseService';

// Mock dependencies
jest.mock('../services/listingService');
jest.mock('../services/redisService');
jest.mock('../services/databaseService');

describe('ListingPublicationService', () => {
  let listingPublicationService: ListingPublicationService;
  let mockListingService: jest.Mocked<ProductListingService>;
  let mockRedisService: jest.Mocked<RedisService>;
  let mockDatabaseService: jest.Mocked<DatabaseService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    listingPublicationService = new ListingPublicationService();

    // Get mocked instances
    mockListingService = ProductListingService.prototype as jest.Mocked<ProductListingService>;
    mockRedisService = RedisService.prototype as jest.Mocked<RedisService>;
    mockDatabaseService = DatabaseService.prototype as jest.Mocked<DatabaseService>;

    // Setup default mocks
    mockDatabaseService.getDatabase = jest.fn().mockReturnValue({
      update: jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([])
        })
      })
    });

    mockRedisService.set = jest.fn().mockResolvedValue(undefined);
    mockRedisService.get = jest.fn().mockResolvedValue(null);
    mockRedisService.del = jest.fn().mockResolvedValue(undefined);
    mockRedisService.invalidateProductListing = jest.fn().mockResolvedValue(undefined);
  });

  describe('publishListing', () => {
    const mockListing = {
      id: 'listing-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test description',
      price: { amount: '99.99', currency: 'USD' },
      category: { 
        id: 'category-123', 
        name: 'Electronics', 
        slug: 'electronics', 
        path: ['Electronics'], 
        isActive: true, 
        sortOrder: 0, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      images: ['ipfs-hash-1'],
      metadata: { condition: 'new' as const, brand: 'Test Brand' },
      inventory: 10,
      status: 'active' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should publish listing successfully', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const result = await listingPublicationService.publishListing('listing-123');

      expect(result.status).toBe('published');
      expect(result.listingId).toBe('listing-123');
      expect(result.searchIndexed).toBe(true);
      expect(result.cacheUpdated).toBe(true);
      expect(result.errors).toEqual([]);
      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', {
        listingStatus: 'published'
      });
    });

    it('should handle listing not found', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(null);

      const result = await listingPublicationService.publishListing('non-existent');

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Listing not found');
    });

    it('should handle publication errors', async () => {
      mockListingService.updateListing = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await listingPublicationService.publishListing('listing-123');

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Database error');
    });

    it('should update search index during publication', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      await listingPublicationService.publishListing('listing-123');

      // Verify database update was called
      expect(mockDatabaseService.getDatabase).toHaveBeenCalled();
      
      // Verify Redis cache operations
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should update marketplace cache during publication', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockRedisService.get = jest.fn().mockResolvedValue([]);

      await listingPublicationService.publishListing('listing-123');

      // Verify cache updates
      expect(mockRedisService.get).toHaveBeenCalledWith('marketplace:active_listings');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'marketplace:active_listings',
        expect.arrayContaining([mockListing]),
        300
      );
    });
  });

  describe('unpublishListing', () => {
    const mockListing = {
      id: 'listing-123',
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test description',
      price: { amount: '99.99', currency: 'USD' },
      category: { 
        id: 'category-123', 
        name: 'Electronics', 
        slug: 'electronics', 
        path: ['Electronics'], 
        isActive: true, 
        sortOrder: 0, 
        createdAt: new Date(), 
        updatedAt: new Date() 
      },
      images: ['ipfs-hash-1'],
      metadata: { condition: 'new' as const },
      inventory: 10,
      status: 'inactive' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should unpublish listing successfully', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const result = await listingPublicationService.unpublishListing('listing-123');

      expect(result.status).toBe('published'); // 'published' means workflow completed
      expect(result.listingId).toBe('listing-123');
      expect(result.searchIndexed).toBe(true);
      expect(result.cacheUpdated).toBe(true);
      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', {
        listingStatus: 'inactive'
      });
    });

    it('should remove from search index during unpublication', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      await listingPublicationService.unpublishListing('listing-123');

      // Verify Redis cache deletions
      expect(mockRedisService.del).toHaveBeenCalledWith('search_index:listing-123');
    });

    it('should remove from marketplace cache during unpublication', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);
      mockRedisService.get = jest.fn().mockResolvedValue([mockListing]);

      await listingPublicationService.unpublishListing('listing-123');

      // Verify cache removal
      expect(mockRedisService.get).toHaveBeenCalledWith('marketplace:active_listings');
      expect(mockRedisService.set).toHaveBeenCalledWith(
        'marketplace:active_listings',
        [],
        300
      );
    });
  });

  describe('getPublicationStatus', () => {
    it('should return publication status for existing listing', async () => {
      const mockListing = {
        id: 'listing-123',
        status: 'active' as const,
        createdAt: new Date()
      };

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const result = await listingPublicationService.getPublicationStatus('listing-123');

      expect(result).toEqual({
        listingId: 'listing-123',
        status: 'published',
        publishedAt: mockListing.createdAt,
        searchIndexed: true,
        cacheUpdated: true
      });
    });

    it('should return null for non-existent listing', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(null);

      const result = await listingPublicationService.getPublicationStatus('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('batchPublishListings', () => {
    it('should publish multiple listings in batches', async () => {
      const listingIds = ['listing-1', 'listing-2', 'listing-3'];
      const mockListing = {
        id: 'listing-1',
        sellerId: 'seller-123',
        category: { id: 'category-123' }
      };

      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const results = await listingPublicationService.batchPublishListings(listingIds);

      expect(results).toHaveLength(3);
      expect(results.every(r => r.status === 'published')).toBe(true);
      expect(mockListingService.updateListing).toHaveBeenCalledTimes(3);
    });

    it('should handle mixed success and failure in batch', async () => {
      const listingIds = ['listing-1', 'listing-2'];
      const mockListing = { id: 'listing-1', sellerId: 'seller-123', category: { id: 'category-123' } };

      mockListingService.updateListing = jest.fn()
        .mockResolvedValueOnce(mockListing)
        .mockResolvedValueOnce(null); // Second listing not found

      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const results = await listingPublicationService.batchPublishListings(listingIds);

      expect(results).toHaveLength(2);
      expect(results[0].status).toBe('published');
      expect(results[1].status).toBe('failed');
    });
  });

  describe('batchUnpublishListings', () => {
    it('should unpublish multiple listings in batches', async () => {
      const listingIds = ['listing-1', 'listing-2'];
      const mockListing = {
        id: 'listing-1',
        sellerId: 'seller-123',
        category: { id: 'category-123' }
      };

      mockListingService.updateListing = jest.fn().mockResolvedValue(mockListing);
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const results = await listingPublicationService.batchUnpublishListings(listingIds);

      expect(results).toHaveLength(2);
      expect(results.every(r => r.status === 'published')).toBe(true); // 'published' means completed
      expect(mockListingService.updateListing).toHaveBeenCalledTimes(2);
    });
  });

  describe('search vector generation', () => {
    it('should generate search vector from listing content', () => {
      const mockListing = {
        title: 'Amazing Product',
        description: 'This is an amazing product',
        category: { name: 'Electronics' },
        tags: ['gadget', 'tech'],
        metadata: { brand: 'TestBrand', model: 'Model123' }
      };

      const generateSearchVector = (listingPublicationService as any).generateSearchVector;
      const searchVector = generateSearchVector(mockListing);

      expect(searchVector).toContain('amazing product');
      expect(searchVector).toContain('electronics');
      expect(searchVector).toContain('gadget');
      expect(searchVector).toContain('testbrand');
      expect(searchVector).toContain('model123');
    });

    it('should handle missing optional fields', () => {
      const mockListing = {
        title: 'Simple Product',
        description: 'Simple description',
        category: { name: 'Category' },
        tags: [],
        metadata: {}
      };

      const generateSearchVector = (listingPublicationService as any).generateSearchVector;
      const searchVector = generateSearchVector(mockListing);

      expect(searchVector).toBe('simple product simple description category');
    });
  });

  describe('keyword extraction', () => {
    it('should extract keywords from listing content', () => {
      const mockListing = {
        title: 'Amazing Electronic Gadget',
        tags: ['tech', 'gadget'],
        category: { name: 'Electronics' },
        metadata: { brand: 'TestBrand', model: 'Model123' }
      };

      const extractKeywords = (listingPublicationService as any).extractKeywords;
      const keywords = extractKeywords(mockListing);

      expect(keywords).toContain('amazing');
      expect(keywords).toContain('electronic');
      expect(keywords).toContain('gadget');
      expect(keywords).toContain('tech');
      expect(keywords).toContain('electronics');
      expect(keywords).toContain('testbrand');
      expect(keywords).toContain('model123');
    });

    it('should filter out short words', () => {
      const mockListing = {
        title: 'A Big TV Set',
        tags: [],
        category: { name: 'TV' },
        metadata: {}
      };

      const extractKeywords = (listingPublicationService as any).extractKeywords;
      const keywords = extractKeywords(mockListing);

      expect(keywords).not.toContain('a'); // Too short
      expect(keywords).toContain('big');
      expect(keywords).toContain('set');
      expect(keywords).toContain('tv');
    });
  });

  describe('cache invalidation', () => {
    it('should invalidate category-specific caches', async () => {
      const invalidateCategorySearchCache = (listingPublicationService as any).invalidateCategorySearchCache;
      
      await invalidateCategorySearchCache('category-123');

      expect(mockRedisService.del).toHaveBeenCalledWith('search:category:category-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('marketplace:category:category-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('search:popular_categories');
    });

    it('should invalidate seller-specific caches', async () => {
      const invalidateSellerSearchCache = (listingPublicationService as any).invalidateSellerSearchCache;
      
      await invalidateSellerSearchCache('seller-123');

      expect(mockRedisService.del).toHaveBeenCalledWith('search:seller:seller-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('marketplace:seller:seller-123');
      expect(mockRedisService.del).toHaveBeenCalledWith('search:popular_sellers');
    });
  });

  describe('error handling', () => {
    it('should handle Redis errors gracefully', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue({
        id: 'listing-123',
        sellerId: 'seller-123',
        category: { id: 'category-123' }
      });
      mockRedisService.set = jest.fn().mockRejectedValue(new Error('Redis error'));

      const result = await listingPublicationService.publishListing('listing-123');

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Redis error');
    });

    it('should handle database errors gracefully', async () => {
      mockListingService.updateListing = jest.fn().mockRejectedValue(new Error('Database error'));

      const result = await listingPublicationService.publishListing('listing-123');

      expect(result.status).toBe('failed');
      expect(result.errors).toContain('Database error');
    });
  });
});