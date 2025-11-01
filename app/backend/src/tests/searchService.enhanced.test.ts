import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { SearchService, AdvancedSearchFilters } from '../services/searchService';
import { DatabaseService } from '../services/databaseService';
import { RedisService } from '../services/redisService';
import { Product, ProductSortOptions, PaginationOptions } from '../models/Product';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('SearchService - Enhanced Features', () => {
  let searchService: SearchService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockRedisService: jest.Mocked<RedisService>;

  const mockProduct: Product = {
    id: '1',
    sellerId: 'seller1',
    title: 'Gaming Laptop Pro',
    description: 'High-performance gaming laptop with RTX graphics',
    price: { amount: '1299.99', currency: 'USD' },
    category: {
      id: 'electronics-laptops',
      name: 'Laptops',
      slug: 'laptops',
      path: ['Electronics', 'Computers', 'Laptops'],
      isActive: true,
      sortOrder: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    images: ['image1.jpg'],
    metadata: {
      condition: 'new',
      brand: 'GamingBrand',
      model: 'Pro-X1',
      weight: 2500,
      dimensions: { length: 35, width: 25, height: 2 },
    },
    inventory: 10,
    status: 'active',
    tags: ['laptop', 'gaming', 'high-performance', 'rtx'],
    shipping: {
      weight: 2500,
      dimensions: { length: 35, width: 25, height: 2 },
      freeShipping: true,
      shippingMethods: ['standard', 'express'],
      handlingTime: 1,
      shipsFrom: { country: 'US', state: 'CA', city: 'San Francisco' },
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
      set: jest.fn(),
      del: jest.fn(),
    } as any;

    (DatabaseService as jest.MockedClass<typeof DatabaseService>).mockImplementation(() => mockDatabaseService);
    (RedisService as jest.MockedClass<typeof RedisService>).mockImplementation(() => mockRedisService);

    searchService = new SearchService();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Enhanced Search Filters', () => {
    it('should handle multi-term search queries', async () => {
      const filters: AdvancedSearchFilters = {
        query: 'gaming laptop rtx',
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 1 }]),
          }),
        }),
      });

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
                        title: 'Gaming Laptop Pro',
                        description: 'High-performance gaming laptop with RTX graphics',
                        // ... other product fields
                      },
                      category: {
                        id: 'electronics-laptops',
                        name: 'Laptops',
                        // ... other category fields
                      },
                    },
                  ]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result).toBeDefined();
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should handle seller reputation filters', async () => {
      const filters: AdvancedSearchFilters = {
        sellerReputation: 'high',
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result).toBeDefined();
      expect(result.products).toHaveLength(0);
    });

    it('should handle location-based filters', async () => {
      const filters: AdvancedSearchFilters = {
        location: {
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
        },
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result).toBeDefined();
    });

    it('should handle rating filters', async () => {
      const filters: AdvancedSearchFilters = {
        minRating: 4.0,
        maxRating: 5.0,
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
                }),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.advancedSearch(filters);

      expect(result).toBeDefined();
    });

    it('should handle trending filter', async () => {
      const filters: AdvancedSearchFilters = {
        trending: true,
      };

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ count: 0 }]),
          }),
        }),
      });

      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue([]),
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

  describe('Enhanced Analytics', () => {
    it('should return detailed search analytics', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      mockRedisService.get.mockResolvedValue(null);

      const analytics = await searchService.getSearchAnalytics(startDate, endDate);

      expect(analytics).toBeDefined();
      expect(analytics.totalSearches).toBeTypeOf('number');
      expect(analytics.uniqueQueries).toBeTypeOf('number');
      expect(analytics.averageResultCount).toBeTypeOf('number');
      expect(Array.isArray(analytics.topQueries)).toBe(true);
      expect(analytics.performanceMetrics).toBeDefined();
      expect(Array.isArray(analytics.categoryBreakdown)).toBe(true);
      expect(Array.isArray(analytics.timeDistribution)).toBe(true);
      expect(analytics.filterUsage).toBeTypeOf('object');
      expect(mockRedisService.set).toHaveBeenCalled();
    });

    it('should return cached analytics when available', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');
      const cachedAnalytics = {
        totalSearches: 1000,
        uniqueQueries: 750,
        averageResultCount: 25,
        topQueries: [],
        performanceMetrics: { averageResponseTime: 200, cacheHitRate: 0.8 },
        categoryBreakdown: [],
        timeDistribution: [],
        filterUsage: {},
      };

      mockRedisService.get.mockResolvedValue(JSON.stringify(cachedAnalytics));

      const analytics = await searchService.getSearchAnalytics(startDate, endDate);

      expect(analytics).toEqual(cachedAnalytics);
    });
  });

  describe('Performance Optimization', () => {
    it('should optimize search performance', async () => {
      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      const result = await searchService.optimizeSearchPerformance();

      expect(result).toBeDefined();
      expect(result.cacheWarmedUp).toBe(true);
      expect(result.slowQueriesOptimized).toBeTypeOf('number');
      expect(result.indexesAnalyzed).toBe(true);
      expect(result.recommendationsPrecomputed).toBe(true);
    });

    it('should handle optimization errors gracefully', async () => {
      mockRedisService.get.mockRejectedValue(new Error('Redis error'));

      const result = await searchService.optimizeSearchPerformance();

      expect(result).toBeDefined();
      expect(result.cacheWarmedUp).toBe(false);
    });
  });

  describe('Enhanced Recommendations', () => {
    it('should get collaborative filtering recommendations', async () => {
      const userId = 'user123';
      const limit = 10;

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue([
                  {
                    products: {
                      id: '1',
                      title: 'Recommended Product',
                      // ... other product fields
                    },
                    categories: {
                      id: 'cat1',
                      name: 'Electronics',
                      // ... other category fields
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
    });

    it('should handle recommendation errors gracefully', async () => {
      const userId = 'user123';

      mockRedisService.get.mockResolvedValue(null);
      mockDatabaseService.getDatabase.mockImplementation(() => {
        throw new Error('Database error');
      });

      const recommendations = await searchService.getRecommendations(userId);

      expect(recommendations).toBeDefined();
      expect(Array.isArray(recommendations)).toBe(true);
    });
  });

  describe('Enhanced Product Comparison', () => {
    it('should provide detailed comparison matrix', async () => {
      const productIds = ['1', '2'];

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          leftJoin: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([
              {
                product: {
                  id: '1',
                  title: 'Product 1',
                  priceAmount: '100.00',
                  priceCurrency: 'USD',
                  metadata: JSON.stringify({ condition: 'new', brand: 'Brand A' }),
                  inventory: 10,
                  views: 100,
                  favorites: 10,
                  shipping: JSON.stringify({ freeShipping: true, handlingTime: 1 }),
                  // ... other fields
                },
                category: {
                  id: 'cat1',
                  name: 'Electronics',
                  // ... other fields
                },
              },
              {
                product: {
                  id: '2',
                  title: 'Product 2',
                  priceAmount: '150.00',
                  priceCurrency: 'USD',
                  metadata: JSON.stringify({ condition: 'new', brand: 'Brand B' }),
                  inventory: 5,
                  views: 80,
                  favorites: 8,
                  shipping: JSON.stringify({ freeShipping: false, handlingTime: 2 }),
                  // ... other fields
                },
                category: {
                  id: 'cat1',
                  name: 'Electronics',
                  // ... other fields
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
      expect(comparison.summary.bestPrice).toBeDefined();
      expect(comparison.summary.bestRated).toBeDefined();
      expect(comparison.summary.mostPopular).toBeDefined();
      expect(comparison.summary.bestValue).toBeDefined();
    });
  });

  describe('Search Suggestions Enhancement', () => {
    it('should provide intelligent search suggestions', async () => {
      const query = 'gam';
      const limit = 10;

      mockRedisService.get.mockResolvedValue(null);

      const mockDb = mockDatabaseService.getDatabase();
      
      // Mock title suggestions
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { title: 'Gaming Laptop' },
              { title: 'Gaming Mouse' },
            ]),
          }),
        }),
      });

      // Mock category suggestions
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([
              { name: 'Gaming' },
            ]),
          }),
        }),
      });

      // Mock tag suggestions
      mockDb.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([
                { tag: 'gaming' },
              ]),
            }),
          }),
        }),
      });

      const suggestions = await searchService.getSearchSuggestions(query, limit);

      expect(suggestions).toBeDefined();
      expect(Array.isArray(suggestions)).toBe(true);
      expect(suggestions.length).toBeGreaterThan(0);
    });
  });
});
