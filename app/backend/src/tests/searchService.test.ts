import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchService, AdvancedSearchFilters } from '../services/searchService';
import { DatabaseService } from '../services/databaseService';
import { RedisService } from '../services/redisService';
import { Product, ProductSortOptions, PaginationOptions } from '../models/Product';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('SearchService', () => {
  let searchService: SearchService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockProduct: Product = {
    id: '1',
    sellerId: 'seller1',
    title: 'Test Laptop',
    description: 'High-performance gaming laptop',
    price: { amount: '1299.99', currency: 'USD' },
    category: {
      id: 'cat1',
      name: 'Electronics',
      slug: 'electronics',
      path: ['Electronics', 'Computers'],
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    images: ['image1.jpg'],
    metadata: {
      condition: 'new',
      brand: 'TestBrand',
      weight: 2500,
      dimensions: { length: 35, width: 25, height: 2 },
    },
    inventory: 10,
    status: 'active',
    tags: ['laptop', 'gaming', 'high-performance'],
    shipping: {
      weight: 2500,
      dimensions: { length: 35, width: 25, height: 2 },
      freeShipping: true,
      shippingMethods: ['standard', 'express'],
      handlingTime: 1,
      shipsFrom: { country: 'US', state: 'CA' },
    },
    views: 150,
    favorites: 25,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    
    mockDatabaseService = {
      getDatabase: jest.fn().mockReturnValue({
        select: jest.fn().mockReturnThis(),
        from: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        offset: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
      }),
    } as any;

    mockRedisService = {
      get: jest.fn(),
      setex: jest.fn(),
      del: jest.fn(),
    } as any;

    // Mock the constructor dependencies
    (DatabaseService as jest.MockedClass<typeof DatabaseService>).mockImplementation(() => mockDatabaseService);
    (RedisService as jest.MockedClass<typeof RedisService>).mockImplementation(() => mockRedisService);

    searchService = new SearchService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('advancedSearch', () => {
    it('should perform basic text search', async () => {
      const filters: AdvancedSearchFilters = {
        query: 'laptop',
      };

      const sort: ProductSortOptions = {
        field: 'relevance',
        direction: 'desc',
      };

      const pagination: PaginationOptions = {
        page: 1,
        limit: 20,
      };

      // Mock cache miss
      mockRedisService.get.mockResolvedValue(null);

      // Mock database responses
      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      });

      // Mock the main query
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([
                    {
                      product: {
                        id: '1',
                        sellerId: 'seller1',
                        title: 'Test Laptop',
                        description: 'High-performance gaming laptop',
                        priceAmount: '1299.99',
                        priceCurrency: 'USD',
                        categoryId: 'cat1',
                        images: JSON.stringify(['image1.jpg']),
                        metadata: JSON.stringify(mockProduct.metadata),
                        inventory: 10,
                        status: 'active',
                        tags: JSON.stringify(['laptop', 'gaming']),
                        shipping: JSON.stringify(mockProduct.shipping),
                        views: 150,
                        favorites: 25,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                      category: {
                        id: 'cat1',
                        name: 'Electronics',
                        slug: 'electronics',
                        path: JSON.stringify(['Electronics', 'Computers']),
                        isActive: true,
                        sortOrder: 0,
                        createdAt: new Date(),
                        updatedAt: new Date(),
                      },
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters, sort, pagination);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(1);
      expect(result.products[0].title).toBe('Test Laptop');
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it('should return cached results when available', async () => {
      const filters: AdvancedSearchFilters = { query: 'laptop' };
      const cachedResult = {
        products: [mockProduct],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
        filters,
        sort: { field: 'relevance', direction: 'desc' },
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedResult));

      const result = await searchService.advancedSearch(filters);

      expect(result).toEqual(cachedResult);
      expect(mockDatabaseService.getDatabase).not.toHaveBeenCalled();
    });

    it('should handle price range filters', async () => {
      const filters: AdvancedSearchFilters = {
        priceMin: '1000',
        priceMax: '2000',
        currency: 'USD',
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result.products).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should handle location-based filters', async () => {
      const filters: AdvancedSearchFilters = {
        location: {
          country: 'US',
          state: 'CA',
          radius: 50,
          coordinates: { lat: 37.7749, lng: -122.4194 },
        },
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result).toBeDefined();
      expect(mockRedisService.setex).toHaveBeenCalled();
    });
  });

  describe('getRecommendations', () => {
    it('should get recommendations for a user', async () => {
      const userId = 'user123';
      const limit = 10;

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      
      // Mock trending products query
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    products: {
                      id: '1',
                      sellerId: 'seller1',
                      title: 'Trending Product',
                      description: 'Popular item',
                      priceAmount: '99.99',
                      priceCurrency: 'USD',
                      categoryId: 'cat1',
                      images: JSON.stringify(['image1.jpg']),
                      metadata: JSON.stringify({ condition: 'new' }),
                      inventory: 5,
                      status: 'active',
                      tags: JSON.stringify(['trending']),
                      views: 1000,
                      favorites: 200,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                    categories: {
                      id: 'cat1',
                      name: 'Electronics',
                      slug: 'electronics',
                      path: JSON.stringify(['Electronics']),
                      isActive: true,
                      sortOrder: 0,
                      createdAt: new Date(),
                      updatedAt: new Date(),
                    },
                  },
                ]),
              }),
            }),
          }),
        }),
      });

      const recommendations = await searchService.getRecommendations(userId, undefined, undefined, limit);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it('should return cached recommendations when available', async () => {
      const userId = 'user123';
      const cachedRecommendations = [
        {
          product: mockProduct,
          score: 0.8,
          reason: 'Similar to your previous purchases',
          type: 'collaborative' as const,
        },
      ];

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedRecommendations));

      const recommendations = await searchService.getRecommendations(userId);

      expect(recommendations).toEqual(cachedRecommendations);
      expect(mockDatabaseService.getDatabase).not.toHaveBeenCalled();
    });
  });

  describe('compareProducts', () => {
    it('should compare multiple products', async () => {
      const productIds = ['1', '2'];

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              {
                product: {
                  id: '1',
                  sellerId: 'seller1',
                  title: 'Product 1',
                  description: 'First product',
                  priceAmount: '100.00',
                  priceCurrency: 'USD',
                  categoryId: 'cat1',
                  images: JSON.stringify(['image1.jpg']),
                  metadata: JSON.stringify({ condition: 'new', brand: 'Brand A' }),
                  inventory: 10,
                  status: 'active',
                  tags: JSON.stringify(['tag1']),
                  shipping: JSON.stringify({ freeShipping: true, handlingTime: 1 }),
                  views: 100,
                  favorites: 10,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                category: {
                  id: 'cat1',
                  name: 'Electronics',
                  slug: 'electronics',
                  path: JSON.stringify(['Electronics']),
                  isActive: true,
                  sortOrder: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
              {
                product: {
                  id: '2',
                  sellerId: 'seller2',
                  title: 'Product 2',
                  description: 'Second product',
                  priceAmount: '150.00',
                  priceCurrency: 'USD',
                  categoryId: 'cat1',
                  images: JSON.stringify(['image2.jpg']),
                  metadata: JSON.stringify({ condition: 'new', brand: 'Brand B' }),
                  inventory: 5,
                  status: 'active',
                  tags: JSON.stringify(['tag2']),
                  shipping: JSON.stringify({ freeShipping: false, handlingTime: 2 }),
                  views: 80,
                  favorites: 8,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
                category: {
                  id: 'cat1',
                  name: 'Electronics',
                  slug: 'electronics',
                  path: JSON.stringify(['Electronics']),
                  isActive: true,
                  sortOrder: 0,
                  createdAt: new Date(),
                  updatedAt: new Date(),
                },
              },
            ]),
          }),
        }),
      });

      const comparison = await searchService.compareProducts(productIds);

      expect(comparison).toBeDefined();
      expect(comparison.products).toHaveLength(2);
      expect(comparison.comparisonMatrix).toBeDefined();
      expect(comparison.summary).toBeDefined();
      expect(comparison.summary.bestPrice).toBe('1'); // Product 1 has lower price
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it('should throw error for invalid number of products', async () => {
      await expect(searchService.compareProducts(['1'])).rejects.toThrow(
        'Can compare between 2 and 5 products'
      );

      await expect(
        searchService.compareProducts(['1', '2', '3', '4', '5', '6'])
      ).rejects.toThrow('Can compare between 2 and 5 products');
    });

    it('should return cached comparison when available', async () => {
      const productIds = ['1', '2'];
      const cachedComparison = {
        products: [mockProduct],
        comparisonMatrix: {},
        summary: {
          bestPrice: '1',
          bestRated: '1',
          mostPopular: '1',
          bestValue: '1',
        },
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedComparison));

      const comparison = await searchService.compareProducts(productIds);

      expect(comparison).toEqual(cachedComparison);
      expect(mockDatabaseService.getDatabase).not.toHaveBeenCalled();
    });
  });

  describe('getSearchSuggestions', () => {
    it('should return search suggestions', async () => {
      const query = 'lap';
      const limit = 10;

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      
      // Mock title suggestions
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { title: 'Laptop Computer' },
              { title: 'Gaming Laptop' },
            ]),
          }),
        }),
      });

      // Mock category suggestions
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              { name: 'Laptops' },
            ]),
          }),
        }),
      });

      // Mock tag suggestions
      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            groupBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { tag: 'laptop' },
              ]),
            }),
          }),
        }),
      });

      const suggestions = await searchService.getSearchSuggestions(query, limit);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
      expect(mockRedisService.setex).toHaveBeenCalled();
    });

    it('should return cached suggestions when available', async () => {
      const query = 'lap';
      const cachedSuggestions = ['Laptop', 'Gaming Laptop', 'Laptops'];

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedSuggestions));

      const suggestions = await searchService.getSearchSuggestions(query);

      expect(suggestions).toEqual(cachedSuggestions);
      expect(mockDatabaseService.getDatabase).not.toHaveBeenCalled();
    });
  });

  describe('getSearchAnalytics', () => {
    it('should return search analytics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const analytics = await searchService.getSearchAnalytics(startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.totalSearches).toBeTypeOf('number');
      expect(analytics.uniqueQueries).toBeTypeOf('number');
      expect(analytics.averageResultCount).toBeTypeOf('number');
      expect(Array.isArray(analytics.topQueries)).toBe(true);
      expect(analytics.performanceMetrics).toBeDefined();
      expect(analytics.performanceMetrics.averageResponseTime).toBeTypeOf('number');
      expect(analytics.performanceMetrics.cacheHitRate).toBeTypeOf('number');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const filters: AdvancedSearchFilters = { query: 'test' };

      mockRedisService.get.mockResolvedValue(null);
      mockDatabaseService.getDatabase.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(searchService.advancedSearch(filters)).rejects.toThrow(
        'Database connection failed'
      );
    });

    it('should handle Redis errors gracefully', async () => {
      const filters: AdvancedSearchFilters = { query: 'test' };

      mockRedisService.get.mockRejectedValue(new Error('Redis connection failed'));

      // Should still work without cache
      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: vi.fn().mockReturnValue({
          leftJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockReturnValue({
                limit: vi.fn().mockReturnValue({
                  offset: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);
      expect(result).toBeDefined();
    });
  });
});
