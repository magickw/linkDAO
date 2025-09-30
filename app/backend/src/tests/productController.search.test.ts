import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { Request, Response } from 'express';
import { ProductController } from '../controllers/productController';
import { SearchService } from '../services/searchService';
import { AppError, ValidationError } from '../middleware/errorHandler';

// Mock dependencies
jest.mock('../services/searchService');
jest.mock('../services/productService');

describe('ProductController - Search Features', () => {
  let productController: ProductController;
  let mockSearchService: vi.Mocked<SearchService>;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSearchService = {
      advancedSearch: vi.fn(),
      getRecommendations: vi.fn(),
      compareProducts: vi.fn(),
      getSearchSuggestions: vi.fn(),
      getSearchAnalytics: vi.fn(),
    } as any;

    vi.mocked(SearchService).mockImplementation(() => mockSearchService);

    productController = new ProductController();

    mockRequest = {
      query: {},
      params: {},
      body: {},
    };

    mockResponse = {
      json: vi.fn().mockReturnThis(),
      status: vi.fn().mockReturnThis(),
      send: vi.fn().mockReturnThis(),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('advancedSearch', () => {
    it('should perform advanced search with all filters', async () => {
      const mockSearchResult = {
        products: [
          {
            id: '1',
            title: 'Test Product',
            description: 'Test Description',
            price: { amount: '99.99', currency: 'USD' },
          },
        ],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        filters: {},
        sort: { field: 'relevance', direction: 'desc' },
      };

      mockRequest.query = {
        query: 'laptop',
        categoryId: 'cat1',
        priceMin: '100',
        priceMax: '2000',
        currency: 'USD',
        condition: 'new',
        tags: 'gaming,portable',
        inStock: 'true',
        freeShipping: 'true',
        minRating: '4.0',
        sellerReputation: 'high',
        recentlyAdded: 'true',
        trending: 'true',
        fastShipping: 'true',
        country: 'US',
        state: 'CA',
        city: 'San Francisco',
        radius: '50',
        lat: '37.7749',
        lng: '-122.4194',
        sortField: 'relevance',
        sortDirection: 'desc',
        page: '1',
        limit: '20',
      };

      mockSearchService.advancedSearch.mockResolvedValue(mockSearchResult);

      await productController.advancedSearch(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.advancedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: 'laptop',
          categoryId: 'cat1',
          priceMin: '100',
          priceMax: '2000',
          currency: 'USD',
          condition: 'new',
          tags: ['gaming', 'portable'],
          inStock: true,
          freeShipping: true,
          minRating: 4.0,
          sellerReputation: 'high',
          recentlyAdded: true,
          trending: true,
          fastShipping: true,
          location: {
            country: 'US',
            state: 'CA',
            city: 'San Francisco',
            radius: 50,
            coordinates: {
              lat: 37.7749,
              lng: -122.4194,
            },
          },
        }),
        { field: 'relevance', direction: 'desc' },
        { page: 1, limit: 20 }
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockSearchResult);
    });

    it('should handle search with minimal filters', async () => {
      const mockSearchResult = {
        products: [],
        total: 0,
        page: 1,
        limit: 20,
        totalPages: 0,
        filters: {},
        sort: { field: 'relevance', direction: 'desc' },
      };

      mockRequest.query = {};

      mockSearchService.advancedSearch.mockResolvedValue(mockSearchResult);

      await productController.advancedSearch(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.advancedSearch).toHaveBeenCalledWith(
        expect.objectContaining({
          query: undefined,
          categoryId: undefined,
          location: undefined,
        }),
        { field: 'relevance', direction: 'desc' },
        { page: 1, limit: 20 }
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockSearchResult);
    });

    it('should handle search service errors', async () => {
      mockRequest.query = { query: 'test' };

      mockSearchService.advancedSearch.mockRejectedValue(new Error('Search failed'));

      await expect(
        productController.advancedSearch(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations with all parameters', async () => {
      const mockRecommendations = [
        {
          product: {
            id: '1',
            title: 'Recommended Product',
            price: { amount: '99.99', currency: 'USD' },
          },
          score: 0.8,
          reason: 'Similar to your interests',
          type: 'collaborative' as const,
        },
      ];

      mockRequest.query = {
        userId: 'user123',
        productId: 'product456',
        categoryId: 'cat789',
        limit: '15',
      };

      mockSearchService.getRecommendations.mockResolvedValue(mockRecommendations);

      await productController.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.getRecommendations).toHaveBeenCalledWith(
        'user123',
        'product456',
        'cat789',
        15
      );

      expect(mockResponse.json).toHaveBeenCalledWith({
        recommendations: mockRecommendations,
        count: 1,
      });
    });

    it('should use default limit when not provided', async () => {
      mockRequest.query = { userId: 'user123' };

      mockSearchService.getRecommendations.mockResolvedValue([]);

      await productController.getRecommendations(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.getRecommendations).toHaveBeenCalledWith(
        'user123',
        undefined,
        undefined,
        10
      );
    });

    it('should reject limit exceeding maximum', async () => {
      mockRequest.query = { limit: '100' };

      await expect(
        productController.getRecommendations(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle recommendation service errors', async () => {
      mockRequest.query = { userId: 'user123' };

      mockSearchService.getRecommendations.mockRejectedValue(new Error('Recommendation failed'));

      await expect(
        productController.getRecommendations(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('compareProducts', () => {
    it('should compare products successfully', async () => {
      const mockComparison = {
        products: [
          { id: '1', title: 'Product 1', price: { amount: '100', currency: 'USD' } },
          { id: '2', title: 'Product 2', price: { amount: '150', currency: 'USD' } },
        ],
        comparisonMatrix: {
          '1': { price: { value: '100 USD', advantage: 'better', score: 100 } },
          '2': { price: { value: '150 USD', advantage: 'worse', score: 67 } },
        },
        summary: {
          bestPrice: '1',
          bestRated: '1',
          mostPopular: '2',
          bestValue: '1',
        },
      };

      mockRequest.query = {
        productIds: '1,2,3',
      };

      mockSearchService.compareProducts.mockResolvedValue(mockComparison);

      await productController.compareProducts(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.compareProducts).toHaveBeenCalledWith(['1', '2', '3']);
      expect(mockResponse.json).toHaveBeenCalledWith(mockComparison);
    });

    it('should reject missing product IDs', async () => {
      mockRequest.query = {};

      await expect(
        productController.compareProducts(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid number of products', async () => {
      mockRequest.query = { productIds: '1' };

      await expect(
        productController.compareProducts(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);

      mockRequest.query = { productIds: '1,2,3,4,5,6' };

      await expect(
        productController.compareProducts(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle comparison service errors', async () => {
      mockRequest.query = { productIds: '1,2' };

      mockSearchService.compareProducts.mockRejectedValue(new Error('Comparison failed'));

      await expect(
        productController.compareProducts(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSearchSuggestions', () => {
    it('should get search suggestions successfully', async () => {
      const mockSuggestions = ['laptop', 'gaming laptop', 'laptop computer'];

      mockRequest.query = {
        query: 'lap',
        limit: '5',
      };

      mockSearchService.getSearchSuggestions.mockResolvedValue(mockSuggestions);

      await productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('lap', 5);
      expect(mockResponse.json).toHaveBeenCalledWith({
        suggestions: mockSuggestions,
        count: 3,
      });
    });

    it('should use default limit when not provided', async () => {
      mockRequest.query = { query: 'test' };

      mockSearchService.getSearchSuggestions.mockResolvedValue([]);

      await productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.getSearchSuggestions).toHaveBeenCalledWith('test', 10);
    });

    it('should reject short queries', async () => {
      mockRequest.query = { query: 'a' };

      await expect(
        productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject missing query', async () => {
      mockRequest.query = {};

      await expect(
        productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject limit exceeding maximum', async () => {
      mockRequest.query = { query: 'test', limit: '50' };

      await expect(
        productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle suggestion service errors', async () => {
      mockRequest.query = { query: 'test' };

      mockSearchService.getSearchSuggestions.mockRejectedValue(new Error('Suggestions failed'));

      await expect(
        productController.getSearchSuggestions(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });

  describe('getSearchAnalytics', () => {
    it('should get search analytics successfully', async () => {
      const mockAnalytics = {
        totalSearches: 1000,
        uniqueQueries: 750,
        averageResultCount: 25,
        topQueries: [
          { query: 'laptop', count: 150, ctr: 0.15 },
          { query: 'smartphone', count: 120, ctr: 0.18 },
        ],
        performanceMetrics: {
          averageResponseTime: 250,
          cacheHitRate: 0.85,
        },
      };

      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        filters: JSON.stringify({ category: 'electronics' }),
      };

      mockSearchService.getSearchAnalytics.mockResolvedValue(mockAnalytics);

      await productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response);

      expect(mockSearchService.getSearchAnalytics).toHaveBeenCalledWith(
        new Date('2024-01-01'),
        new Date('2024-01-31'),
        { category: 'electronics' }
      );

      expect(mockResponse.json).toHaveBeenCalledWith(mockAnalytics);
    });

    it('should reject missing dates', async () => {
      mockRequest.query = { startDate: '2024-01-01' };

      await expect(
        productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);

      mockRequest.query = { endDate: '2024-01-31' };

      await expect(
        productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject invalid date formats', async () => {
      mockRequest.query = {
        startDate: 'invalid-date',
        endDate: '2024-01-31',
      };

      await expect(
        productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should reject end date before start date', async () => {
      mockRequest.query = {
        startDate: '2024-01-31',
        endDate: '2024-01-01',
      };

      await expect(
        productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(ValidationError);
    });

    it('should handle analytics service errors', async () => {
      mockRequest.query = {
        startDate: '2024-01-01',
        endDate: '2024-01-31',
      };

      mockSearchService.getSearchAnalytics.mockRejectedValue(new Error('Analytics failed'));

      await expect(
        productController.getSearchAnalytics(mockRequest as Request, mockResponse as Response)
      ).rejects.toThrow(AppError);
    });
  });
});