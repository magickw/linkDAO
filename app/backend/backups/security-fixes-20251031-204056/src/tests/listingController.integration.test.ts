import request from 'supertest';
import express from 'express';
import { ListingController } from '../controllers/listingController';
import { ProductListingService } from '../services/listingService';
import { ValidationError } from '../models/validation';
import listingRoutes from '../routes/listingRoutes';
import { errorHandler } from '../middleware/errorHandler';

// Mock the ListingService
jest.mock('../services/listingService');

describe('ListingController Integration Tests', () => {
  let app: express.Application;
  let mockListingService: jest.Mocked<ListingService>;

  beforeEach(() => {
    // Create Express app
    app = express();
    app.use(express.json());
    app.use('/api/listings', listingRoutes);
    app.use(errorHandler);

    // Get mocked service instance
    mockListingService = ListingService.prototype as jest.Mocked<ListingService>;

    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('POST /api/listings', () => {
    const validListingData = {
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'This is a comprehensive test product description that meets all requirements',
      price: {
        amount: '99.99',
        currency: 'USD'
      },
      categoryId: 'category-123',
      images: ['ipfs-hash-1', 'ipfs-hash-2'],
      metadata: {
        condition: 'new',
        brand: 'Test Brand'
      },
      inventory: 10,
      tags: ['electronics', 'gadget']
    };

    it('should create listing successfully with valid data', async () => {
      const mockCreatedListing = {
        id: 'listing-123',
        ...validListingData,
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
        status: 'active',
        views: 0,
        favorites: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockListingService.createListing = jest.fn().mockResolvedValue(mockCreatedListing);

      const response = await request(app)
        .post('/api/listings')
        .send(validListingData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.listing).toEqual(mockCreatedListing);
      expect(response.body.message).toBe('Listing created successfully');
      expect(mockListingService.createListing).toHaveBeenCalledWith(validListingData);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        ...validListingData,
        title: undefined
      };

      const response = await request(app)
        .post('/api/listings')
        .send(invalidData)
        .expect(400);

      expect(response.body.error).toBe('Missing required fields');
      expect(response.body.required).toContain('title');
    });

    it('should handle validation errors', async () => {
      mockListingService.createListing = jest.fn().mockRejectedValue(
        new ValidationError('Invalid listing data', 'title')
      );

      const response = await request(app)
        .post('/api/listings')
        .send(validListingData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toBe('Invalid listing data');
      expect(response.body.field).toBe('title');
    });

    it('should handle internal server errors', async () => {
      mockListingService.createListing = jest.fn().mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .post('/api/listings')
        .send(validListingData)
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to create listing');
    });
  });

  describe('GET /api/listings/:id', () => {
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
      status: 'active' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return listing by ID', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const response = await request(app)
        .get('/api/listings/listing-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.listing).toEqual(mockListing);
      expect(mockListingService.getListingById).toHaveBeenCalledWith('listing-123');
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/listings/non-existent')
        .expect(404);

      expect(response.body.error).toBe('Listing not found');
      expect(response.body.message).toBe('No listing found with ID: non-existent');
    });
  });

  describe('PUT /api/listings/:id', () => {
    const updateData = {
      title: 'Updated Product Title',
      listingStatus: 'published'
    };

    const mockUpdatedListing = {
      id: 'listing-123',
      sellerId: 'seller-123',
      title: 'Updated Product Title',
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
      status: 'active' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should update listing successfully', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockUpdatedListing);

      const response = await request(app)
        .put('/api/listings/listing-123')
        .send(updateData)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.listing).toEqual(mockUpdatedListing);
      expect(response.body.message).toBe('Listing updated successfully');
      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', updateData);
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .put('/api/listings/non-existent')
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBe('Listing not found');
    });

    it('should handle validation errors', async () => {
      mockListingService.updateListing = jest.fn().mockRejectedValue(
        new ValidationError('Invalid status transition', 'listingStatus')
      );

      const response = await request(app)
        .put('/api/listings/listing-123')
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBe('Validation failed');
      expect(response.body.message).toBe('Invalid status transition');
      expect(response.body.field).toBe('listingStatus');
    });
  });

  describe('GET /api/listings/marketplace', () => {
    const mockMarketplaceResult = {
      products: [
        {
          id: 'listing-1',
          sellerId: 'seller-1',
          title: 'Product 1',
          description: 'Description 1',
          price: { amount: '99.99', currency: 'USD' },
          category: { 
            id: 'category-1', 
            name: 'Electronics', 
            slug: 'electronics', 
            path: ['Electronics'], 
            isActive: true, 
            sortOrder: 0, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
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

    it('should return marketplace listings', async () => {
      mockListingService.getMarketplaceListings = jest.fn().mockResolvedValue(mockMarketplaceResult);

      const response = await request(app)
        .get('/api/listings/marketplace')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toEqual(mockMarketplaceResult.products);
      expect(response.body.total).toBe(1);
      expect(mockListingService.getMarketplaceListings).toHaveBeenCalled();
    });

    it('should handle query parameters', async () => {
      mockListingService.getMarketplaceListings = jest.fn().mockResolvedValue(mockMarketplaceResult);

      const response = await request(app)
        .get('/api/listings/marketplace')
        .query({
          query: 'electronics',
          categoryId: 'category-123',
          priceMin: '10.00',
          priceMax: '100.00',
          page: '1',
          limit: '10',
          sortBy: 'price',
          sortOrder: 'asc'
        })
        .expect(200);

      expect(mockListingService.getMarketplaceListings).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'electronics',
          categoryId: 'category-123',
          priceMin: '10.00',
          priceMax: '100.00'
        }),
        { field: 'price', direction: 'asc' },
        { page: 1, limit: 10 }
      );
    });

    it('should limit maximum items per page', async () => {
      mockListingService.getMarketplaceListings = jest.fn().mockResolvedValue(mockMarketplaceResult);

      await request(app)
        .get('/api/listings/marketplace')
        .query({ limit: '200' }) // Exceeds maximum
        .expect(200);

      expect(mockListingService.getMarketplaceListings).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(Object),
        expect.objectContaining({ limit: 100 }) // Should be capped at 100
      );
    });
  });

  describe('GET /api/listings/search', () => {
    const mockSearchResult = {
      products: [],
      total: 0,
      page: 1,
      limit: 20,
      totalPages: 0,
      filters: { query: 'test' },
      sort: { field: 'createdAt' as const, direction: 'desc' as const }
    };

    it('should search listings with query parameter', async () => {
      mockListingService.searchListingsEnhanced = jest.fn().mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/listings/search')
        .query({ q: 'test query' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockListingService.searchListingsEnhanced).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test query' }),
        expect.any(Object),
        expect.any(Object)
      );
    });

    it('should handle both q and query parameters', async () => {
      mockListingService.searchListingsEnhanced = jest.fn().mockResolvedValue(mockSearchResult);

      const response = await request(app)
        .get('/api/listings/search')
        .query({ query: 'test query' })
        .expect(200);

      expect(mockListingService.searchListingsEnhanced).toHaveBeenCalledWith(
        expect.objectContaining({ query: 'test query' }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('POST /api/listings/:id/publish', () => {
    const mockPublishedListing = {
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
      status: 'published' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should publish listing successfully', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockPublishedListing);

      const response = await request(app)
        .post('/api/listings/listing-123/publish')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.listing).toEqual(mockPublishedListing);
      expect(response.body.message).toBe('Listing published successfully');
      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', {
        listingStatus: 'published'
      });
    });

    it('should return 404 for non-existent listing', async () => {
      mockListingService.updateListing = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .post('/api/listings/non-existent/publish')
        .expect(404);

      expect(response.body.error).toBe('Listing not found');
    });
  });

  describe('POST /api/listings/:id/unpublish', () => {
    const mockUnpublishedListing = {
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
      mockListingService.updateListing = jest.fn().mockResolvedValue(mockUnpublishedListing);

      const response = await request(app)
        .post('/api/listings/listing-123/unpublish')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.listing).toEqual(mockUnpublishedListing);
      expect(response.body.message).toBe('Listing unpublished successfully');
      expect(mockListingService.updateListing).toHaveBeenCalledWith('listing-123', {
        listingStatus: 'inactive'
      });
    });
  });

  describe('GET /api/listings/seller/:sellerId', () => {
    const mockSellerListings = {
      products: [
        {
          id: 'listing-1',
          sellerId: 'seller-123',
          title: 'Seller Product 1',
          description: 'Description 1',
          price: { amount: '99.99', currency: 'USD' },
          category: { 
            id: 'category-1', 
            name: 'Electronics', 
            slug: 'electronics', 
            path: ['Electronics'], 
            isActive: true, 
            sortOrder: 0, 
            createdAt: new Date(), 
            updatedAt: new Date() 
          },
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
      filters: { sellerId: 'seller-123' },
      sort: { field: 'createdAt' as const, direction: 'desc' as const }
    };

    it('should return listings by seller', async () => {
      mockListingService.searchListingsEnhanced = jest.fn().mockResolvedValue(mockSellerListings);

      const response = await request(app)
        .get('/api/listings/seller/seller-123')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.products).toEqual(mockSellerListings.products);
      expect(mockListingService.searchListingsEnhanced).toHaveBeenCalledWith(
        expect.objectContaining({ sellerId: 'seller-123' }),
        expect.any(Object),
        expect.any(Object)
      );
    });
  });

  describe('GET /api/listings/:id/stats', () => {
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
      status: 'active' as const,
      tags: ['electronics'],
      views: 25,
      favorites: 5,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    it('should return listing statistics', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(mockListing);

      const response = await request(app)
        .get('/api/listings/listing-123/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.stats).toEqual({
        views: 25,
        favorites: 5,
        status: 'active',
        createdAt: mockListing.createdAt,
        updatedAt: mockListing.updatedAt,
        inventory: 10,
        price: { amount: '99.99', currency: 'USD' }
      });
    });

    it('should return 404 for non-existent listing stats', async () => {
      mockListingService.getListingById = jest.fn().mockResolvedValue(null);

      const response = await request(app)
        .get('/api/listings/non-existent/stats')
        .expect(404);

      expect(response.body.error).toBe('Listing not found');
    });
  });

  describe('POST /api/listings/validate', () => {
    const validationInput = {
      sellerId: 'seller-123',
      title: 'Test Product',
      description: 'Test description',
      price: { amount: '99.99', currency: 'USD' },
      categoryId: 'category-123',
      images: ['ipfs-hash-1'],
      metadata: { condition: 'new' },
      inventory: 10,
      tags: ['electronics']
    };

    const mockValidationResult = {
      isValid: true,
      errors: [],
      warnings: ['Consider adding more images'],
      completeness: 85
    };

    it('should validate listing data', async () => {
      // Mock the private method access
      const validateSpy = jest.spyOn(ListingService.prototype as any, 'validateListingInput')
        .mockResolvedValue(mockValidationResult);

      const response = await request(app)
        .post('/api/listings/validate')
        .send(validationInput)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.validation).toEqual(mockValidationResult);
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      mockListingService.getMarketplaceListings = jest.fn().mockRejectedValue(
        new Error('Service unavailable')
      );

      const response = await request(app)
        .get('/api/listings/marketplace')
        .expect(500);

      expect(response.body.error).toBe('Internal server error');
      expect(response.body.message).toBe('Failed to fetch marketplace listings');
    });

    it('should handle malformed JSON', async () => {
      const response = await request(app)
        .post('/api/listings')
        .send('invalid json')
        .set('Content-Type', 'application/json')
        .expect(400);

      // Express will handle malformed JSON with a 400 error
    });
  });
});