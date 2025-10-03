import { MarketplaceListingsService } from '../../services/marketplaceListingsService';
import { db } from '../../db';
import { marketplaceListings } from '../../db/schema';
import { eq, desc, asc, and, gte, lte, count, sql } from 'drizzle-orm';

// Mock the database connection
jest.mock('../../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

// Mock the schema
jest.mock('../../db/schema', () => ({
  marketplaceListings: {
    id: 'id',
    sellerAddress: 'seller_address',
    title: 'title',
    description: 'description',
    price: 'price',
    currency: 'currency',
    images: 'images',
    category: 'category',
    isActive: 'is_active',
    createdAt: 'created_at',
    updatedAt: 'updated_at',
  },
}));

describe('MarketplaceListingsService', () => {
  let service: MarketplaceListingsService;
  let mockDb: jest.Mocked<typeof db>;

  beforeEach(() => {
    service = new MarketplaceListingsService();
    mockDb = db as jest.Mocked<typeof db>;
    jest.clearAllMocks();
  });

  describe('getListings', () => {
    const mockListingData = {
      id: 'listing-123',
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'Test Product',
      description: 'Test product description',
      price: '100.50',
      currency: 'ETH',
      images: ['image1.jpg', 'image2.jpg'],
      category: 'electronics',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should return paginated listings with default parameters', async () => {
      // Mock count query
      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 5 }]),
      };

      // Mock listings query
      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingData]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect) // First call for count
        .mockReturnValueOnce(mockListingsSelect); // Second call for listings

      const result = await service.getListings();

      expect(result).toEqual({
        listings: [{
          id: 'listing-123',
          sellerAddress: '0x1234567890123456789012345678901234567890',
          title: 'Test Product',
          description: 'Test product description',
          price: '100.50',
          currency: 'ETH',
          images: ['image1.jpg', 'image2.jpg'],
          category: 'electronics',
          isActive: true,
          createdAt: mockListingData.createdAt,
          updatedAt: mockListingData.updatedAt,
        }],
        total: 5,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrevious: false,
      });

      expect(mockListingsSelect.limit).toHaveBeenCalledWith(20);
      expect(mockListingsSelect.offset).toHaveBeenCalledWith(0);
    });

    it('should apply filters correctly', async () => {
      const filters = {
        limit: 10,
        offset: 5,
        sortBy: 'price' as const,
        sortOrder: 'asc' as const,
        category: 'electronics',
        priceRange: { min: '50', max: '200' },
        sellerAddress: '0x1234567890123456789012345678901234567890',
        isActive: true,
      };

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 3 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingData]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.getListings(filters);

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
      expect(result.total).toBe(3);
      expect(mockListingsSelect.limit).toHaveBeenCalledWith(10);
      expect(mockListingsSelect.offset).toHaveBeenCalledWith(5);
    });

    it('should handle pagination correctly', async () => {
      const filters = { limit: 10, offset: 15 };

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 30 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingData]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.getListings(filters);

      expect(result.hasNext).toBe(true); // 15 + 10 < 30
      expect(result.hasPrevious).toBe(true); // 15 > 0
    });

    it('should handle empty results', async () => {
      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.getListings();

      expect(result.listings).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.hasNext).toBe(false);
      expect(result.hasPrevious).toBe(false);
    });

    it('should handle database errors', async () => {
      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Database connection failed')),
      };

      mockDb.select.mockReturnValue(mockCountSelect);

      await expect(service.getListings()).rejects.toThrow('Failed to retrieve marketplace listings');
    });

    it('should handle null/undefined optional fields', async () => {
      const mockListingDataWithNulls = {
        ...mockListingData,
        description: null,
        images: null,
        category: null,
        currency: null,
      };

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingDataWithNulls]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.getListings();

      expect(result.listings[0]).toEqual({
        id: 'listing-123',
        sellerAddress: '0x1234567890123456789012345678901234567890',
        title: 'Test Product',
        description: undefined,
        price: '100.50',
        currency: 'ETH',
        images: undefined,
        category: undefined,
        isActive: true,
        createdAt: mockListingData.createdAt,
        updatedAt: mockListingData.updatedAt,
      });
    });
  });

  describe('getListingById', () => {
    const listingId = 'listing-123';
    const mockListingData = {
      id: listingId,
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'Test Product',
      description: 'Test product description',
      price: '100.50',
      currency: 'ETH',
      images: ['image1.jpg'],
      category: 'electronics',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should return listing when found', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([mockListingData]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getListingById(listingId);

      expect(result).toEqual({
        id: listingId,
        sellerAddress: '0x1234567890123456789012345678901234567890',
        title: 'Test Product',
        description: 'Test product description',
        price: '100.50',
        currency: 'ETH',
        images: ['image1.jpg'],
        category: 'electronics',
        isActive: true,
        createdAt: mockListingData.createdAt,
        updatedAt: mockListingData.updatedAt,
      });

      expect(mockSelect.where).toHaveBeenCalled();
      expect(mockSelect.limit).toHaveBeenCalledWith(1);
    });

    it('should return null when listing not found', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getListingById('non-existent-id');

      expect(result).toBeNull();
    });

    it('should handle database errors', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(service.getListingById(listingId)).rejects.toThrow('Failed to retrieve marketplace listing');
    });
  });

  describe('createListing', () => {
    const sellerAddress = '0x1234567890123456789012345678901234567890';
    const createRequest = {
      title: 'New Product',
      description: 'New product description',
      price: '150.00',
      currency: 'ETH',
      images: ['new-image.jpg'],
      category: 'books',
    };

    it('should create listing successfully', async () => {
      const mockCreatedListing = {
        id: 'new-listing-123',
        sellerAddress,
        ...createRequest,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedListing]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createListing(sellerAddress, createRequest);

      expect(result.id).toBe('new-listing-123');
      expect(result.title).toBe('New Product');
      expect(result.sellerAddress).toBe(sellerAddress);
      expect(result.isActive).toBe(true);

      expect(mockDb.insert).toHaveBeenCalledWith(marketplaceListings);
      expect(mockInsert.values).toHaveBeenCalledWith({
        sellerAddress,
        title: createRequest.title,
        description: createRequest.description,
        price: createRequest.price,
        currency: 'ETH',
        images: createRequest.images,
        category: createRequest.category,
        isActive: true,
      });
    });

    it('should create listing with minimal required data', async () => {
      const minimalRequest = {
        title: 'Minimal Product',
        price: '50.00',
      };

      const mockCreatedListing = {
        id: 'minimal-listing-123',
        sellerAddress,
        title: 'Minimal Product',
        description: undefined,
        price: '50.00',
        currency: 'ETH',
        images: [],
        category: undefined,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedListing]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createListing(sellerAddress, minimalRequest);

      expect(result.title).toBe('Minimal Product');
      expect(result.currency).toBe('ETH');
      expect(result.images).toEqual([]);
    });

    it('should handle database insertion errors', async () => {
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Insertion failed')),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(service.createListing(sellerAddress, createRequest)).rejects.toThrow('Failed to create marketplace listing');
    });

    it('should handle empty insertion result', async () => {
      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([]), // Empty result
      };
      mockDb.insert.mockReturnValue(mockInsert);

      await expect(service.createListing(sellerAddress, createRequest)).rejects.toThrow('Failed to create marketplace listing');
    });
  });

  describe('updateListing', () => {
    const listingId = 'listing-123';
    const sellerAddress = '0x1234567890123456789012345678901234567890';
    const updateRequest = {
      title: 'Updated Product',
      description: 'Updated description',
      price: '200.00',
    };

    it('should update listing successfully', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress,
        title: 'Old Product',
        description: 'Old description',
        price: '100.00',
        currency: 'ETH',
        images: ['old-image.jpg'],
        category: 'electronics',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2023-01-01'),
      };

      const updatedListing = {
        ...existingListing,
        ...updateRequest,
        updatedAt: new Date(),
      };

      // Mock getListingById
      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([updatedListing]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.updateListing(listingId, sellerAddress, updateRequest);

      expect(result?.title).toBe('Updated Product');
      expect(result?.description).toBe('Updated description');
      expect(result?.price).toBe('200.00');

      expect(mockDb.update).toHaveBeenCalledWith(marketplaceListings);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        ...updateRequest,
        updatedAt: expect.any(Date),
      });
    });

    it('should return null when listing does not exist', async () => {
      jest.spyOn(service, 'getListingById').mockResolvedValue(null);

      const result = await service.updateListing(listingId, sellerAddress, updateRequest);

      expect(result).toBeNull();
    });

    it('should throw error when seller does not own listing', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress: '0xDifferentAddress',
        title: 'Product',
        price: '100.00',
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      await expect(
        service.updateListing(listingId, sellerAddress, updateRequest)
      ).rejects.toThrow('Unauthorized: Cannot update listing that does not belong to you');
    });

    it('should handle database update errors', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress,
        title: 'Product',
        price: '100.00',
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockRejectedValue(new Error('Update failed')),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      await expect(
        service.updateListing(listingId, sellerAddress, updateRequest)
      ).rejects.toThrow('Failed to update marketplace listing');
    });

    it('should filter out undefined values from update', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress,
        title: 'Product',
        price: '100.00',
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updateWithUndefined = {
        title: 'Updated Product',
        description: undefined,
        price: '200.00',
        category: undefined,
      };

      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...existingListing, ...updateWithUndefined }]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      await service.updateListing(listingId, sellerAddress, updateWithUndefined);

      // Should not include undefined values in the set call
      expect(mockUpdate.set).toHaveBeenCalledWith({
        title: 'Updated Product',
        price: '200.00',
        updatedAt: expect.any(Date),
      });
    });
  });

  describe('deleteListing', () => {
    const listingId = 'listing-123';
    const sellerAddress = '0x1234567890123456789012345678901234567890';

    it('should delete listing successfully (soft delete)', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress,
        title: 'Product',
        price: '100.00',
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      const mockUpdate = {
        set: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([{ ...existingListing, isActive: false }]),
      };
      mockDb.update.mockReturnValue(mockUpdate);

      const result = await service.deleteListing(listingId, sellerAddress);

      expect(result).toBe(true);
      expect(mockUpdate.set).toHaveBeenCalledWith({
        isActive: false,
        updatedAt: expect.any(Date),
      });
    });

    it('should return false when listing does not exist', async () => {
      jest.spyOn(service, 'getListingById').mockResolvedValue(null);

      const result = await service.deleteListing(listingId, sellerAddress);

      expect(result).toBe(false);
    });

    it('should throw error when seller does not own listing', async () => {
      const existingListing = {
        id: listingId,
        sellerAddress: '0xDifferentAddress',
        title: 'Product',
        price: '100.00',
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      jest.spyOn(service, 'getListingById').mockResolvedValue(existingListing);

      await expect(
        service.deleteListing(listingId, sellerAddress)
      ).rejects.toThrow('Unauthorized: Cannot delete listing that does not belong to you');
    });
  });

  describe('searchListings', () => {
    const searchTerm = 'electronics';
    const mockListingData = {
      id: 'listing-123',
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'Electronics Product',
      description: 'Great electronics item',
      price: '100.50',
      currency: 'ETH',
      images: ['image1.jpg'],
      category: 'electronics',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should search listings by title and description', async () => {
      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingData]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.searchListings(searchTerm);

      expect(result.listings).toHaveLength(1);
      expect(result.listings[0].title).toBe('Electronics Product');
      expect(result.total).toBe(1);
    });

    it('should combine search with other filters', async () => {
      const filters = {
        category: 'electronics',
        priceRange: { min: '50', max: '200' },
      };

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 1 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([mockListingData]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.searchListings(searchTerm, filters);

      expect(result.listings).toHaveLength(1);
    });

    it('should handle search errors', async () => {
      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockRejectedValue(new Error('Search failed')),
      };

      mockDb.select.mockReturnValue(mockCountSelect);

      await expect(service.searchListings(searchTerm)).rejects.toThrow('Failed to search marketplace listings');
    });
  });

  describe('getCategories', () => {
    it('should return categories with counts', async () => {
      const mockCategoriesData = [
        { category: 'electronics', count: 15 },
        { category: 'books', count: 8 },
        { category: 'clothing', count: 12 },
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockCategoriesData),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getCategories();

      expect(result).toEqual([
        { category: 'electronics', count: 15 },
        { category: 'books', count: 8 },
        { category: 'clothing', count: 12 },
      ]);

      expect(mockSelect.groupBy).toHaveBeenCalled();
      expect(mockSelect.orderBy).toHaveBeenCalled();
    });

    it('should handle empty categories', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue([]),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getCategories();

      expect(result).toEqual([]);
    });

    it('should handle database errors', async () => {
      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockRejectedValue(new Error('Database error')),
      };
      mockDb.select.mockReturnValue(mockSelect);

      await expect(service.getCategories()).rejects.toThrow('Failed to retrieve categories');
    });

    it('should handle null category values', async () => {
      const mockCategoriesData = [
        { category: null, count: 5 },
        { category: 'electronics', count: 10 },
      ];

      const mockSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockResolvedValue(mockCategoriesData),
      };
      mockDb.select.mockReturnValue(mockSelect);

      const result = await service.getCategories();

      expect(result).toEqual([
        { category: '', count: 5 },
        { category: 'electronics', count: 10 },
      ]);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very large price values', async () => {
      const createRequest = {
        title: 'Expensive Product',
        price: '999999999.99',
      };

      const mockCreatedListing = {
        id: 'expensive-listing',
        sellerAddress: '0x1234567890123456789012345678901234567890',
        ...createRequest,
        currency: 'ETH',
        images: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedListing]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createListing('0x1234567890123456789012345678901234567890', createRequest);

      expect(result.price).toBe('999999999.99');
    });

    it('should handle special characters in search terms', async () => {
      const specialSearchTerm = 'test@#$%^&*()';

      const mockCountSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockResolvedValue([{ count: 0 }]),
      };

      const mockListingsSelect = {
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockResolvedValue([]),
      };

      mockDb.select
        .mockReturnValueOnce(mockCountSelect)
        .mockReturnValueOnce(mockListingsSelect);

      const result = await service.searchListings(specialSearchTerm);

      expect(result.listings).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('should handle very long listing titles and descriptions', async () => {
      const longTitle = 'A'.repeat(1000);
      const longDescription = 'B'.repeat(5000);

      const createRequest = {
        title: longTitle,
        description: longDescription,
        price: '100.00',
      };

      const mockCreatedListing = {
        id: 'long-listing',
        sellerAddress: '0x1234567890123456789012345678901234567890',
        ...createRequest,
        currency: 'ETH',
        images: [],
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedListing]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createListing('0x1234567890123456789012345678901234567890', createRequest);

      expect(result.title).toBe(longTitle);
      expect(result.description).toBe(longDescription);
    });

    it('should handle large image arrays', async () => {
      const manyImages = Array(100).fill(0).map((_, i) => `image${i}.jpg`);

      const createRequest = {
        title: 'Product with many images',
        price: '100.00',
        images: manyImages,
      };

      const mockCreatedListing = {
        id: 'many-images-listing',
        sellerAddress: '0x1234567890123456789012345678901234567890',
        ...createRequest,
        currency: 'ETH',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockInsert = {
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([mockCreatedListing]),
      };
      mockDb.insert.mockReturnValue(mockInsert);

      const result = await service.createListing('0x1234567890123456789012345678901234567890', createRequest);

      expect(result.images).toHaveLength(100);
    });
  });
});