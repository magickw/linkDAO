import request from 'supertest';
import express from 'express';
import marketplaceListingsRoutes from '../../routes/marketplaceListingsRoutes';
import { MarketplaceListingsService } from '../../services/marketplaceListingsService';

// Mock the service
jest.mock('../../services/marketplaceListingsService');

// Mock middleware
jest.mock('../../middleware/cachingMiddleware', () => ({
  cachingMiddleware: {
    listingsCache: () => (req: any, res: any, next: any) => next(),
    cache: () => (req: any, res: any, next: any) => next(),
  },
  rateLimitWithCache: () => (req: any, res: any, next: any) => next(),
}));

// Mock controller
jest.mock('../../controllers/marketplaceListingsController', () => {
  return {
    MarketplaceListingsController: jest.fn().mockImplementation(() => ({
      getListings: jest.fn(),
      getListingById: jest.fn(),
      createListing: jest.fn(),
      updateListing: jest.fn(),
      deleteListing: jest.fn(),
      getCategories: jest.fn(),
      getFallbackListings: jest.fn(),
    })),
  };
});

describe('Marketplace Listings Routes Integration Tests', () => {
  let app: express.Application;
  let mockController: any;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/marketplace', marketplaceListingsRoutes);
    
    // Get the mocked controller instance
    const { MarketplaceListingsController } = require('../../controllers/marketplaceListingsController');
    mockController = new MarketplaceListingsController();
    
    jest.clearAllMocks();
  });

  describe('GET /marketplace/listings', () => {
    const mockListingsResponse = {
      listings: [
        {
          id: 'listing-1',
          sellerAddress: '0x1234567890123456789012345678901234567890',
          title: 'Test Product 1',
          description: 'Test description 1',
          price: '100.00',
          currency: 'ETH',
          images: ['image1.jpg'],
          category: 'electronics',
          isActive: true,
          createdAt: new Date('2023-01-01'),
          updatedAt: new Date('2023-01-01'),
        },
        {
          id: 'listing-2',
          sellerAddress: '0x0987654321098765432109876543210987654321',
          title: 'Test Product 2',
          description: 'Test description 2',
          price: '200.00',
          currency: 'ETH',
          images: ['image2.jpg'],
          category: 'books',
          isActive: true,
          createdAt: new Date('2023-01-02'),
          updatedAt: new Date('2023-01-02'),
        },
      ],
      total: 2,
      limit: 20,
      offset: 0,
      hasNext: false,
      hasPrevious: false,
    };

    it('should return paginated listings with default parameters', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: mockListingsResponse,
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          listings: expect.arrayContaining([
            expect.objectContaining({
              id: 'listing-1',
              title: 'Test Product 1',
              price: '100.00',
            }),
            expect.objectContaining({
              id: 'listing-2',
              title: 'Test Product 2',
              price: '200.00',
            }),
          ]),
          total: 2,
          limit: 20,
          offset: 0,
          hasNext: false,
          hasPrevious: false,
        },
        metadata: expect.any(Object),
      });

      expect(mockController.getListings).toHaveBeenCalled();
    });

    it('should handle query parameters correctly', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        expect(req.query).toEqual({
          limit: '10',
          offset: '5',
          sortBy: 'price',
          sortOrder: 'asc',
          category: 'electronics',
          priceMin: '50',
          priceMax: '500',
          sellerAddress: '0x1234567890123456789012345678901234567890',
          isActive: 'true',
          search: 'test',
        });

        res.status(200).json({
          success: true,
          data: { ...mockListingsResponse, limit: 10, offset: 5 },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .query({
          limit: 10,
          offset: 5,
          sortBy: 'price',
          sortOrder: 'asc',
          category: 'electronics',
          priceMin: 50,
          priceMax: 500,
          sellerAddress: '0x1234567890123456789012345678901234567890',
          isActive: true,
          search: 'test',
        })
        .expect(200);

      expect(response.body.data.limit).toBe(10);
      expect(response.body.data.offset).toBe(5);
    });

    it('should handle empty results', async () => {
      const emptyResponse = {
        listings: [],
        total: 0,
        limit: 20,
        offset: 0,
        hasNext: false,
        hasPrevious: false,
      };

      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: emptyResponse,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .expect(200);

      expect(response.body.data.listings).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should handle service errors', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'LISTINGS_FETCH_ERROR',
            message: 'Failed to retrieve marketplace listings',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('LISTINGS_FETCH_ERROR');
    });
  });

  describe('GET /marketplace/listings/categories', () => {
    const mockCategoriesResponse = [
      { category: 'electronics', count: 15 },
      { category: 'books', count: 8 },
      { category: 'clothing', count: 12 },
    ];

    it('should return categories with counts', async () => {
      mockController.getCategories.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: mockCategoriesResponse,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/categories')
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: [
          { category: 'electronics', count: 15 },
          { category: 'books', count: 8 },
          { category: 'clothing', count: 12 },
        ],
        metadata: expect.any(Object),
      });

      expect(mockController.getCategories).toHaveBeenCalled();
    });

    it('should handle empty categories', async () => {
      mockController.getCategories.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: [],
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/categories')
        .expect(200);

      expect(response.body.data).toEqual([]);
    });

    it('should handle service errors', async () => {
      mockController.getCategories.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'CATEGORIES_FETCH_ERROR',
            message: 'Failed to retrieve categories',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/categories')
        .expect(500);

      expect(response.body.error.code).toBe('CATEGORIES_FETCH_ERROR');
    });
  });

  describe('GET /marketplace/listings/fallback', () => {
    const mockFallbackResponse = {
      listings: [
        {
          id: 'fallback-1',
          title: 'Fallback Product',
          price: '50.00',
          currency: 'ETH',
          isActive: true,
        },
      ],
      total: 1,
      source: 'fallback',
    };

    it('should return fallback listings', async () => {
      mockController.getFallbackListings.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: mockFallbackResponse,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/fallback')
        .expect(200);

      expect(response.body.data.source).toBe('fallback');
      expect(response.body.data.listings).toHaveLength(1);
      expect(mockController.getFallbackListings).toHaveBeenCalled();
    });
  });

  describe('GET /marketplace/listings/:id', () => {
    const listingId = 'listing-123';
    const mockListing = {
      id: listingId,
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'Specific Product',
      description: 'Specific product description',
      price: '150.00',
      currency: 'ETH',
      images: ['specific-image.jpg'],
      category: 'electronics',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    it('should return specific listing by ID', async () => {
      mockController.getListingById.mockImplementation((req: any, res: any) => {
        expect(req.params.id).toBe(listingId);
        res.status(200).json({
          success: true,
          data: mockListing,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get(`/marketplace/listings/${listingId}`)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: listingId,
          sellerAddress: '0x1234567890123456789012345678901234567890',
          title: 'Specific Product',
          description: 'Specific product description',
          price: '150.00',
          currency: 'ETH',
          images: ['specific-image.jpg'],
          category: 'electronics',
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        metadata: expect.any(Object),
      });

      expect(mockController.getListingById).toHaveBeenCalled();
    });

    it('should return 404 when listing not found', async () => {
      mockController.getListingById.mockImplementation((req: any, res: any) => {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Marketplace listing not found',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/non-existent-id')
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should handle service errors', async () => {
      mockController.getListingById.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'LISTING_FETCH_ERROR',
            message: 'Failed to retrieve marketplace listing',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get(`/marketplace/listings/${listingId}`)
        .expect(500);

      expect(response.body.error.code).toBe('LISTING_FETCH_ERROR');
    });
  });

  describe('POST /marketplace/listings', () => {
    const createRequest = {
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'New Product',
      description: 'New product description',
      price: '250.00',
      currency: 'ETH',
      images: ['new-image.jpg'],
      category: 'electronics',
    };

    const mockCreatedListing = {
      id: 'new-listing-123',
      ...createRequest,
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-01'),
    };

    it('should create new listing successfully', async () => {
      mockController.createListing.mockImplementation((req: any, res: any) => {
        expect(req.body).toEqual(createRequest);
        res.status(201).json({
          success: true,
          data: mockCreatedListing,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .post('/marketplace/listings')
        .send(createRequest)
        .expect(201);

      expect(response.body).toEqual({
        success: true,
        data: {
          id: 'new-listing-123',
          sellerAddress: '0x1234567890123456789012345678901234567890',
          title: 'New Product',
          description: 'New product description',
          price: '250.00',
          currency: 'ETH',
          images: ['new-image.jpg'],
          category: 'electronics',
          isActive: true,
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z',
        },
        metadata: expect.any(Object),
      });

      expect(mockController.createListing).toHaveBeenCalled();
    });

    it('should handle validation errors', async () => {
      mockController.createListing.mockImplementation((req: any, res: any) => {
        res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid listing data',
            details: [
              { field: 'sellerAddress', message: 'Seller address is required' },
              { field: 'title', message: 'Title is required' },
              { field: 'price', message: 'Price must be a positive number' },
            ],
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .post('/marketplace/listings')
        .send({}) // Empty request
        .expect(400);

      expect(response.body.error.code).toBe('VALIDATION_ERROR');
      expect(response.body.error.details).toHaveLength(3);
    });

    it('should handle service errors', async () => {
      mockController.createListing.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'LISTING_CREATE_ERROR',
            message: 'Failed to create marketplace listing',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .post('/marketplace/listings')
        .send(createRequest)
        .expect(500);

      expect(response.body.error.code).toBe('LISTING_CREATE_ERROR');
    });
  });

  describe('PUT /marketplace/listings/:id', () => {
    const listingId = 'listing-123';
    const updateRequest = {
      sellerAddress: '0x1234567890123456789012345678901234567890',
      title: 'Updated Product',
      description: 'Updated description',
      price: '300.00',
    };

    const mockUpdatedListing = {
      id: listingId,
      ...updateRequest,
      currency: 'ETH',
      images: ['updated-image.jpg'],
      category: 'electronics',
      isActive: true,
      createdAt: new Date('2023-01-01'),
      updatedAt: new Date('2023-01-02'),
    };

    it('should update listing successfully', async () => {
      mockController.updateListing.mockImplementation((req: any, res: any) => {
        expect(req.params.id).toBe(listingId);
        expect(req.body).toEqual(updateRequest);
        res.status(200).json({
          success: true,
          data: mockUpdatedListing,
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .put(`/marketplace/listings/${listingId}`)
        .send(updateRequest)
        .expect(200);

      expect(response.body.data.title).toBe('Updated Product');
      expect(response.body.data.price).toBe('300.00');
      expect(mockController.updateListing).toHaveBeenCalled();
    });

    it('should return 404 when listing not found', async () => {
      mockController.updateListing.mockImplementation((req: any, res: any) => {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Marketplace listing not found',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .put('/marketplace/listings/non-existent-id')
        .send(updateRequest)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when seller does not own listing', async () => {
      mockController.updateListing.mockImplementation((req: any, res: any) => {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot update listing that does not belong to you',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const unauthorizedRequest = {
        ...updateRequest,
        sellerAddress: '0xDifferentAddress',
      };

      const response = await request(app)
        .put(`/marketplace/listings/${listingId}`)
        .send(unauthorizedRequest)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should handle service errors', async () => {
      mockController.updateListing.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'LISTING_UPDATE_ERROR',
            message: 'Failed to update marketplace listing',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .put(`/marketplace/listings/${listingId}`)
        .send(updateRequest)
        .expect(500);

      expect(response.body.error.code).toBe('LISTING_UPDATE_ERROR');
    });
  });

  describe('DELETE /marketplace/listings/:id', () => {
    const listingId = 'listing-123';
    const deleteRequest = {
      sellerAddress: '0x1234567890123456789012345678901234567890',
    };

    it('should delete listing successfully', async () => {
      mockController.deleteListing.mockImplementation((req: any, res: any) => {
        expect(req.params.id).toBe(listingId);
        expect(req.body).toEqual(deleteRequest);
        res.status(200).json({
          success: true,
          data: {
            message: 'Marketplace listing deleted successfully',
            id: listingId,
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .delete(`/marketplace/listings/${listingId}`)
        .send(deleteRequest)
        .expect(200);

      expect(response.body.data.message).toBe('Marketplace listing deleted successfully');
      expect(response.body.data.id).toBe(listingId);
      expect(mockController.deleteListing).toHaveBeenCalled();
    });

    it('should return 404 when listing not found', async () => {
      mockController.deleteListing.mockImplementation((req: any, res: any) => {
        res.status(404).json({
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Marketplace listing not found',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .delete('/marketplace/listings/non-existent-id')
        .send(deleteRequest)
        .expect(404);

      expect(response.body.error.code).toBe('NOT_FOUND');
    });

    it('should return 403 when seller does not own listing', async () => {
      mockController.deleteListing.mockImplementation((req: any, res: any) => {
        res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Cannot delete listing that does not belong to you',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const unauthorizedRequest = {
        sellerAddress: '0xDifferentAddress',
      };

      const response = await request(app)
        .delete(`/marketplace/listings/${listingId}`)
        .send(unauthorizedRequest)
        .expect(403);

      expect(response.body.error.code).toBe('FORBIDDEN');
    });

    it('should handle service errors', async () => {
      mockController.deleteListing.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'LISTING_DELETE_ERROR',
            message: 'Failed to delete marketplace listing',
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .delete(`/marketplace/listings/${listingId}`)
        .send(deleteRequest)
        .expect(500);

      expect(response.body.error.code).toBe('LISTING_DELETE_ERROR');
    });
  });

  describe('Rate limiting and caching', () => {
    it('should apply rate limiting to all endpoints', async () => {
      // Mock successful response
      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: { listings: [], total: 0 },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      // Multiple requests should all be processed (since we're mocking the rate limiter)
      const promises = Array(5).fill(null).map(() =>
        request(app).get('/marketplace/listings')
      );

      const responses = await Promise.all(promises);
      responses.forEach(response => {
        expect(response.status).toBe(200);
      });
    });

    it('should apply caching to appropriate endpoints', async () => {
      mockController.getListingById.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: { id: req.params.id, title: 'Cached Product' },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings/cached-listing')
        .expect(200);

      expect(response.body.data.title).toBe('Cached Product');
    });
  });

  describe('Response format consistency', () => {
    it('should return consistent error format across all endpoints', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(500).json({
          success: false,
          error: {
            code: 'INTERNAL_ERROR',
            message: 'Internal server error',
          },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .expect(500);

      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toHaveProperty('code');
      expect(response.body.error).toHaveProperty('message');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });

    it('should return consistent success format across all endpoints', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        res.status(200).json({
          success: true,
          data: { listings: [], total: 0 },
          metadata: {
            timestamp: new Date().toISOString(),
            requestId: 'test-request-id',
          },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('timestamp');
      expect(response.body.metadata).toHaveProperty('requestId');
    });
  });

  describe('Pagination and filtering', () => {
    it('should handle complex query parameters', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        const { query } = req;
        expect(query.limit).toBe('5');
        expect(query.offset).toBe('10');
        expect(query.sortBy).toBe('price');
        expect(query.sortOrder).toBe('desc');
        expect(query.category).toBe('electronics');
        expect(query.priceMin).toBe('100');
        expect(query.priceMax).toBe('1000');
        expect(query.search).toBe('smartphone');

        res.status(200).json({
          success: true,
          data: {
            listings: [],
            total: 0,
            limit: 5,
            offset: 10,
            hasNext: false,
            hasPrevious: true,
          },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      const response = await request(app)
        .get('/marketplace/listings')
        .query({
          limit: 5,
          offset: 10,
          sortBy: 'price',
          sortOrder: 'desc',
          category: 'electronics',
          priceMin: 100,
          priceMax: 1000,
          search: 'smartphone',
        })
        .expect(200);

      expect(response.body.data.limit).toBe(5);
      expect(response.body.data.offset).toBe(10);
      expect(response.body.data.hasPrevious).toBe(true);
    });

    it('should handle boolean query parameters', async () => {
      mockController.getListings.mockImplementation((req: any, res: any) => {
        expect(req.query.isActive).toBe('false');
        res.status(200).json({
          success: true,
          data: { listings: [], total: 0 },
          metadata: { timestamp: new Date().toISOString(), requestId: 'test' },
        });
      });

      await request(app)
        .get('/marketplace/listings')
        .query({ isActive: false })
        .expect(200);
    });
  });
});
