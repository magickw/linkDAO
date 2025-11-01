import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import request from 'supertest';
import { app } from '../app';

describe('Search Integration Tests - Enhanced Features', () => {
  beforeAll(async () => {
    // Setup test database and seed data if needed
  });

  afterAll(async () => {
    // Cleanup test data
  });

  describe('Advanced Search API', () => {
    it('should handle complex search queries with multiple filters', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          query: 'gaming laptop',
          priceMin: '500',
          priceMax: '2000',
          currency: 'USD',
          sellerReputation: 'high',
          minRating: '4.0',
          inStock: 'true',
          freeShipping: 'true',
          fastShipping: 'true',
          recentlyAdded: 'false',
          trending: 'true',
          country: 'US',
          state: 'CA',
          sortField: 'relevance',
          sortDirection: 'desc',
          page: '1',
          limit: '20',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total');
      expect(response.body).toHaveProperty('page', 1);
      expect(response.body).toHaveProperty('limit', 20);
      expect(response.body).toHaveProperty('filters');
      expect(response.body.filters).toHaveProperty('query', 'gaming laptop');
      expect(response.body.filters).toHaveProperty('sellerReputation', 'high');
    });

    it('should handle location-based search', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          country: 'US',
          state: 'CA',
          city: 'San Francisco',
          radius: '50',
          lat: '37.7749',
          lng: '-122.4194',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body.filters.location).toHaveProperty('country', 'US');
      expect(response.body.filters.location).toHaveProperty('state', 'CA');
      expect(response.body.filters.location).toHaveProperty('city', 'San Francisco');
    });

    it('should handle seller reputation filters', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          sellerReputation: 'verified',
          hasReviews: 'true',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body.filters).toHaveProperty('sellerReputation', 'verified');
      expect(response.body.filters).toHaveProperty('hasReviews', true);
    });

    it('should handle trending and recent filters', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          trending: 'true',
          recentlyAdded: 'true',
          onSale: 'true',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body.filters).toHaveProperty('trending', true);
      expect(response.body.filters).toHaveProperty('recentlyAdded', true);
      expect(response.body.filters).toHaveProperty('onSale', true);
    });
  });

  describe('Enhanced Recommendations API', () => {
    it('should get personalized recommendations for user', async () => {
      const response = await request(app)
        .get('/api/products/recommendations')
        .query({
          userId: 'test-user-123',
          limit: '15',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
      
      if (response.body.recommendations.length > 0) {
        const recommendation = response.body.recommendations[0];
        expect(recommendation).toHaveProperty('product');
        expect(recommendation).toHaveProperty('score');
        expect(recommendation).toHaveProperty('reason');
        expect(recommendation).toHaveProperty('type');
      }
    });

    it('should get content-based recommendations for product', async () => {
      const response = await request(app)
        .get('/api/products/recommendations')
        .query({
          productId: 'test-product-123',
          limit: '10',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('should get category-based recommendations', async () => {
      const response = await request(app)
        .get('/api/products/recommendations')
        .query({
          categoryId: 'electronics-laptops',
          limit: '8',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('recommendations');
      expect(Array.isArray(response.body.recommendations)).toBe(true);
    });

    it('should reject invalid recommendation limits', async () => {
      const response = await request(app)
        .get('/api/products/recommendations')
        .query({
          userId: 'test-user-123',
          limit: '100', // Exceeds maximum
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('Enhanced Product Comparison API', () => {
    it('should compare multiple products with detailed analysis', async () => {
      const response = await request(app)
        .get('/api/products/compare')
        .query({
          productIds: 'product1,product2,product3',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('comparisonMatrix');
      expect(response.body).toHaveProperty('summary');
      
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.comparisonMatrix).toBeTypeOf('object');
      expect(response.body.summary).toHaveProperty('bestPrice');
      expect(response.body.summary).toHaveProperty('bestRated');
      expect(response.body.summary).toHaveProperty('mostPopular');
      expect(response.body.summary).toHaveProperty('bestValue');
    });

    it('should provide detailed comparison attributes', async () => {
      const response = await request(app)
        .get('/api/products/compare')
        .query({
          productIds: 'product1,product2',
        });

      expect(response.status).toBe(200);
      
      if (response.body.products.length > 0) {
        const productId = response.body.products[0].id;
        const productComparison = response.body.comparisonMatrix[productId];
        
        expect(productComparison).toHaveProperty('price');
        expect(productComparison).toHaveProperty('condition');
        expect(productComparison).toHaveProperty('inventory');
        expect(productComparison).toHaveProperty('freeShipping');
        
        // Check comparison structure
        expect(productComparison.price).toHaveProperty('value');
        expect(productComparison.price).toHaveProperty('advantage');
        expect(productComparison.price).toHaveProperty('score');
      }
    });
  });

  describe('Enhanced Search Analytics API', () => {
    it('should return comprehensive search analytics', async () => {
      const response = await request(app)
        .get('/api/search/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSearches');
      expect(response.body).toHaveProperty('uniqueQueries');
      expect(response.body).toHaveProperty('averageResultCount');
      expect(response.body).toHaveProperty('topQueries');
      expect(response.body).toHaveProperty('performanceMetrics');
      expect(response.body).toHaveProperty('categoryBreakdown');
      expect(response.body).toHaveProperty('timeDistribution');
      expect(response.body).toHaveProperty('filterUsage');
      
      expect(Array.isArray(response.body.topQueries)).toBe(true);
      expect(Array.isArray(response.body.categoryBreakdown)).toBe(true);
      expect(Array.isArray(response.body.timeDistribution)).toBe(true);
      expect(response.body.filterUsage).toBeTypeOf('object');
    });

    it('should validate date range parameters', async () => {
      const response = await request(app)
        .get('/api/search/analytics')
        .query({
          startDate: '2024-01-31',
          endDate: '2024-01-01', // End before start
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
    });

    it('should handle analytics with filters', async () => {
      const filters = JSON.stringify({
        category: 'electronics',
        priceRange: '100-1000',
      });

      const response = await request(app)
        .get('/api/search/analytics')
        .query({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
          filters,
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('totalSearches');
    });
  });

  describe('Search Performance Optimization API', () => {
    it('should optimize search performance', async () => {
      const response = await request(app)
        .post('/api/search/optimize');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('results');
      
      expect(response.body.results).toHaveProperty('cacheWarmedUp');
      expect(response.body.results).toHaveProperty('slowQueriesOptimized');
      expect(response.body.results).toHaveProperty('indexesAnalyzed');
      expect(response.body.results).toHaveProperty('recommendationsPrecomputed');
    });
  });

  describe('Enhanced Search Suggestions API', () => {
    it('should provide intelligent search suggestions', async () => {
      const response = await request(app)
        .get('/api/products/suggestions')
        .query({
          query: 'gam',
          limit: '8',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('suggestions');
      expect(response.body).toHaveProperty('count');
      expect(Array.isArray(response.body.suggestions)).toBe(true);
    });

    it('should prioritize exact matches in suggestions', async () => {
      const response = await request(app)
        .get('/api/products/suggestions')
        .query({
          query: 'laptop',
          limit: '5',
        });

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.suggestions)).toBe(true);
      
      // Check that suggestions contain the query term
      if (response.body.suggestions.length > 0) {
        const hasRelevantSuggestions = response.body.suggestions.some((suggestion: string) =>
          suggestion.toLowerCase().includes('laptop')
        );
        expect(hasRelevantSuggestions).toBe(true);
      }
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle invalid search parameters gracefully', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          priceMin: 'invalid',
          priceMax: 'invalid',
          minRating: 'invalid',
          maxRating: 'invalid',
        });

      expect(response.status).toBe(200); // Should not fail, just ignore invalid params
      expect(response.body).toHaveProperty('products');
    });

    it('should handle empty search results', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          query: 'nonexistentproductxyz123',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('total', 0);
      expect(Array.isArray(response.body.products)).toBe(true);
      expect(response.body.products).toHaveLength(0);
    });

    it('should handle large pagination requests', async () => {
      const response = await request(app)
        .get('/api/products/search/advanced')
        .query({
          page: '1000',
          limit: '100',
        });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('products');
      expect(response.body).toHaveProperty('page', 1000);
    });
  });

  describe('Performance and Caching', () => {
    it('should cache search results for repeated queries', async () => {
      const queryParams = {
        query: 'test product',
        categoryId: 'electronics',
        page: '1',
        limit: '10',
      };

      // First request
      const response1 = await request(app)
        .get('/api/products/search/advanced')
        .query(queryParams);

      expect(response1.status).toBe(200);

      // Second request (should be cached)
      const response2 = await request(app)
        .get('/api/products/search/advanced')
        .query(queryParams);

      expect(response2.status).toBe(200);
      expect(response2.body).toEqual(response1.body);
    });

    it('should handle concurrent search requests', async () => {
      const queryParams = {
        query: 'concurrent test',
        page: '1',
        limit: '5',
      };

      // Make multiple concurrent requests
      const promises = Array.from({ length: 5 }, () =>
        request(app)
          .get('/api/products/search/advanced')
          .query(queryParams)
      );

      const responses = await Promise.all(promises);

      // All requests should succeed
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('products');
      });
    });
  });
});
