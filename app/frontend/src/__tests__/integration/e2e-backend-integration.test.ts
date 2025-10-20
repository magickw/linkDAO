/**
 * End-to-End Backend Integration Test
 * Tests the complete workflow from frontend to backend
 */

import { enhancedMarketplaceService } from '../../services/enhancedMarketplaceService';
import { cartService } from '../../services/cartService';

// Mock environment variables
process.env.NEXT_PUBLIC_API_URL = 'http://localhost:3001/api';

describe('End-to-End Backend Integration', () => {
  beforeEach(() => {
    // Reset fetch mock
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Complete User Journey', () => {
    it('should handle complete marketplace browsing workflow', async () => {
      // Mock successful API responses
      const mockListingsResponse = {
        success: true,
        data: {
          listings: [
            {
              id: '1',
              title: 'Test Product',
              description: 'A test product',
              price: { amount: 100, currency: 'USD' },
              seller: { id: 'seller1', name: 'Test Seller', verified: true },
              images: ['image1.jpg'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ],
          pagination: { page: 1, limit: 20, total: 1, totalPages: 1 }
        }
      };

      const mockProductResponse = {
        success: true,
        data: {
          id: '1',
          title: 'Test Product',
          description: 'A test product',
          price: { amount: 100, currency: 'USD' },
          seller: { id: 'seller1', name: 'Test Seller', verified: true },
          images: ['image1.jpg'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockListingsResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockProductResponse,
        });

      // 1. Browse products
      const productsResult = await enhancedMarketplaceService.getProducts({ limit: 20 });
      expect(productsResult.success).toBe(true);
      expect(productsResult.data?.products).toHaveLength(1);

      // 2. View specific product
      const productResult = await enhancedMarketplaceService.getListingById('1');
      expect(productResult.success).toBe(true);
      expect(productResult.data?.id).toBe('1');

      // Verify API calls were made correctly
      expect(global.fetch).toHaveBeenCalledTimes(2);
      expect(global.fetch).toHaveBeenNthCalledWith(1,
        'http://localhost:3001/api/marketplace/listings?limit=20',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
      expect(global.fetch).toHaveBeenNthCalledWith(2,
        'http://localhost:3001/api/marketplace/listings/1',
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });

    it('should handle authenticated cart operations', async () => {
      // Mock cart API responses
      const mockCartResponse = {
        success: true,
        data: { items: [] }
      };

      const mockAddItemResponse = {
        success: true,
        data: { message: 'Item added successfully' }
      };

      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockCartResponse,
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAddItemResponse,
        });

      // Set authentication
      cartService.setAuthStatus(true, 'test-token');

      // Add item to cart
      const mockProduct = {
        id: '1',
        title: 'Test Product',
        description: 'Test Description',
        image: 'test.jpg',
        price: {
          crypto: '0.1',
          cryptoSymbol: 'ETH',
          fiat: '100',
          fiatSymbol: 'USD',
        },
        seller: {
          id: 'seller1',
          name: 'Test Seller',
          avatar: '',
          verified: true,
          daoApproved: true,
          escrowSupported: true,
        },
        category: 'electronics',
        isDigital: false,
        isNFT: false,
        inventory: 10,
        shipping: {
          cost: '5',
          freeShipping: false,
          estimatedDays: '3-5',
          regions: ['US'],
        },
        trust: {
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 95,
        },
      };

      await cartService.addItem(mockProduct, 1);

      // Verify cart API calls
      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/cart',
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      expect(global.fetch).toHaveBeenCalledWith(
        'http://localhost:3001/api/cart/items',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            productId: '1',
            quantity: 1,
          }),
        })
      );
    });

    it('should handle search functionality', async () => {
      const mockSearchResponse = {
        success: true,
        data: {
          listings: [
            {
              id: '1',
              title: 'Electronics Product',
              description: 'An electronic device',
              price: { amount: 200, currency: 'USD' },
              seller: { id: 'seller1', name: 'Electronics Seller' },
              images: ['electronics.jpg'],
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          ]
        }
      };

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResponse,
      });

      const searchResult = await enhancedMarketplaceService.searchProducts('electronics', {
        category: 'electronics',
        minPrice: 50,
        maxPrice: 500,
      });

      expect(searchResult.success).toBe(true);
      expect(searchResult.data).toHaveLength(1);
      expect(searchResult.data?.[0].title).toContain('Electronics');

      // Verify search API call
      const searchUrl = (global.fetch as jest.Mock).mock.calls[0][0];
      expect(searchUrl).toContain('/marketplace/search');
      expect(searchUrl).toContain('search=electronics');
      expect(searchUrl).toContain('category=electronics');
      expect(searchUrl).toContain('minPrice=50');
      expect(searchUrl).toContain('maxPrice=500');
    });

    it('should handle error recovery gracefully', async () => {
      // Mock network error followed by success
      (global.fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: {
              id: '1',
              title: 'Recovered Product',
              seller: { id: 'seller1' },
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }
          }),
        });

      const result = await enhancedMarketplaceService.getListingById('1');

      expect(result.success).toBe(true);
      expect(result.data?.title).toBe('Recovered Product');
      expect(global.fetch).toHaveBeenCalledTimes(3); // 2 retries + 1 success
    });

    it('should provide meaningful error messages for different failure scenarios', async () => {
      // Test 404 error
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const notFoundResult = await enhancedMarketplaceService.getListingById('nonexistent');
      expect(notFoundResult.success).toBe(false);
      expect(notFoundResult.error?.code).toBe('NOT_FOUND');
      expect(notFoundResult.error?.retryable).toBe(false);

      // Test 500 error - mock multiple times for retries
      (global.fetch as jest.Mock)
        .mockResolvedValue({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
        });

      const serverErrorResult = await enhancedMarketplaceService.getListingById('1');
      expect(serverErrorResult.success).toBe(false);
      expect(serverErrorResult.error?.message).toContain('temporarily unavailable');
      expect(serverErrorResult.error?.retryable).toBe(true);
    }, 15000);
  });

  describe('Service Health and Monitoring', () => {
    it('should check backend health', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const isHealthy = await enhancedMarketplaceService.healthCheck();
      expect(isHealthy).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith('http://localhost:3001/api/health');
    });

    it('should handle health check failures', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Connection refused'));

      const isHealthy = await enhancedMarketplaceService.healthCheck();
      expect(isHealthy).toBe(false);
    });

    it('should preload critical data', async () => {
      (global.fetch as jest.Mock)
        .mockResolvedValueOnce({ ok: true }) // categories
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { listings: [] }
          })
        }); // featured products

      const preloadResult = await enhancedMarketplaceService.preloadCriticalData();
      expect(preloadResult.categories).toBe(true);
      expect(preloadResult.featuredProducts).toBe(true);
    });
  });
});