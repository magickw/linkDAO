import { MarketplaceListingsService } from '../services/marketplaceListingsService';
import { MarketplaceListingFilters } from '../types/marketplaceListing';

// Mock the database connection
jest.mock('../db', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn()
  }
}));

describe('MarketplaceListingsService', () => {
  let service: MarketplaceListingsService;

  beforeEach(() => {
    service = new MarketplaceListingsService();
    jest.clearAllMocks();
  });

  describe('getListings', () => {
    it('should return paginated listings with default filters', async () => {
      // Mock database responses
      const mockDb = require('../db').db;
      
      // Mock count query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([{ count: 5 }])
      });

      // Mock listings query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sellerAddress: '0x1234567890123456789012345678901234567890',
            title: 'Test Product',
            description: 'Test Description',
            price: '100.00',
            currency: 'ETH',
            images: ['image1.jpg', 'image2.jpg'],
            category: 'Electronics',
            isActive: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ])
      });

      const result = await service.getListings();

      expect(result).toEqual({
        listings: expect.arrayContaining([
          expect.objectContaining({
            id: '123e4567-e89b-12d3-a456-426614174000',
            sellerAddress: '0x1234567890123456789012345678901234567890',
            title: 'Test Product',
            price: '100.00'
          })
        ]),
        total: 5,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrevious: false
      });
    });

    it('should handle filters correctly', async () => {
      const filters: MarketplaceListingFilters = {
        limit: 10,
        offset: 5,
        sortBy: 'price',
        sortOrder: 'asc',
        category: 'Electronics',
        priceRange: { min: '50', max: '200' },
        sellerAddress: '0x1234567890123456789012345678901234567890'
      };

      // Mock database responses
      const mockDb = require('../db').db;
      
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([{ count: 2 }])
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      });

      const result = await service.getListings(filters);

      expect(result.limit).toBe(10);
      expect(result.offset).toBe(5);
      expect(result.total).toBe(2);
    });
  });

  describe('getListingById', () => {
    it('should return a listing when found', async () => {
      const mockDb = require('../db').db;
      
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sellerAddress: '0x1234567890123456789012345678901234567890',
            title: 'Test Product',
            description: 'Test Description',
            price: '100.00',
            currency: 'ETH',
            images: ['image1.jpg'],
            category: 'Electronics',
            isActive: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ])
      });

      const result = await service.getListingById('123e4567-e89b-12d3-a456-426614174000');

      expect(result).toEqual(
        expect.objectContaining({
          id: '123e4567-e89b-12d3-a456-426614174000',
          title: 'Test Product'
        })
      );
    });

    it('should return null when listing not found', async () => {
      const mockDb = require('../db').db;
      
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        then: jest.fn().mockResolvedValue([])
      });

      const result = await service.getListingById('nonexistent-id');

      expect(result).toBeNull();
    });
  });

  describe('createListing', () => {
    it('should create a new listing successfully', async () => {
      const mockDb = require('../db').db;
      
      mockDb.insert.mockReturnValueOnce({
        values: jest.fn().mockReturnThis(),
        returning: jest.fn().mockResolvedValue([
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            sellerAddress: '0x1234567890123456789012345678901234567890',
            title: 'New Product',
            description: 'New Description',
            price: '150.00',
            currency: 'ETH',
            images: [],
            category: 'Books',
            isActive: true,
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-01')
          }
        ])
      });

      const listingData = {
        title: 'New Product',
        description: 'New Description',
        price: '150.00',
        category: 'Books'
      };

      const result = await service.createListing('0x1234567890123456789012345678901234567890', listingData);

      expect(result).toEqual(
        expect.objectContaining({
          title: 'New Product',
          price: '150.00',
          category: 'Books'
        })
      );
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const mockDb = require('../db').db;
      
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        then: jest.fn().mockRejectedValue(new Error('Database connection failed'))
      });

      await expect(service.getListings()).rejects.toThrow('Failed to retrieve marketplace listings');
    });
  });
});