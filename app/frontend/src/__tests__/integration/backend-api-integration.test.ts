/**
 * Backend API Integration Tests
 * Tests end-to-end integration between frontend services and backend API
 */

import { enhancedMarketplaceService } from '../../services/enhancedMarketplaceService';
import { cartService } from '../../services/cartService';

// Mock fetch for testing
global.fetch = jest.fn();

describe('Backend API Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (fetch as jest.Mock).mockClear();
  });

  describe('Enhanced Marketplace Service', () => {
    it('should fetch listing by ID with proper error handling', async () => {
      const mockListing = {
        success: true,
        data: {
          id: '1',
          title: 'Test Product',
          description: 'Test Description',
          price: { amount: 100, currency: 'USD' },
          seller: { id: 'seller1', name: 'Test Seller' },
          images: ['image1.jpg'],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockListing,
      });

      const result = await enhancedMarketplaceService.getListingById('1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketplace/listings/1'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.id).toBe('1');
    });

    it('should handle 404 errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      });

      const result = await enhancedMarketplaceService.getListingById('nonexistent');

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe('NOT_FOUND');
      expect(result.error?.retryable).toBe(false);
    });

    it('should retry on network errors', async () => {
      (fetch as jest.Mock)
        .mockRejectedValueOnce(new Error('Network error'))
        .mockRejectedValueOnce(new Error('Network error'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            data: { id: '1', title: 'Test Product' }
          }),
        });

      const result = await enhancedMarketplaceService.getListingById('1');

      expect(fetch).toHaveBeenCalledTimes(3);
      expect(result.success).toBe(true);
    });

    it('should search products with filters', async () => {
      const mockSearchResult = {
        success: true,
        data: {
          listings: [
            { id: '1', title: 'Product 1' },
            { id: '2', title: 'Product 2' },
          ]
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSearchResult,
      });

      const result = await enhancedMarketplaceService.searchProducts('test', {
        category: 'electronics',
        minPrice: 10,
        maxPrice: 100,
      });

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketplace/search'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );

      const url = (fetch as jest.Mock).mock.calls[0][0];
      expect(url).toContain('search=test');
      expect(url).toContain('category=electronics');
      expect(url).toContain('minPrice=10');
      expect(url).toContain('maxPrice=100');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
    });

    it('should fetch seller information', async () => {
      const mockSeller = {
        success: true,
        data: {
          id: 'seller1',
          displayName: 'Test Seller',
          walletAddress: '0x123...',
          verified: true,
          rating: 4.5,
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockSeller,
      });

      const result = await enhancedMarketplaceService.getSellerById('seller1');

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/marketplace/sellers/seller1'),
        expect.objectContaining({
          headers: { 'Content-Type': 'application/json' },
        })
      );

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe('seller1');
      expect(result.data?.verified).toBe(true);
    });
  });

  describe('Cart Service Backend Integration', () => {
    beforeEach(() => {
      // Mock localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(),
          setItem: jest.fn(),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      });
    });

    it('should sync cart with backend when authenticated', async () => {
      const mockBackendCart = {
        success: true,
        data: {
          items: [
            {
              productId: '1',
              quantity: 2,
              addedAt: new Date().toISOString(),
              product: {
                title: 'Test Product',
                cryptoPrice: '0.1',
                cryptoCurrency: 'ETH',
                fiatPrice: '100',
                fiatCurrency: 'USD',
                images: ['test.jpg'],
                seller: {
                  id: 'seller1',
                  displayName: 'Test Seller',
                  verified: true,
                },
                category: 'electronics',
                isDigital: false,
                isNFT: false,
                inventory: 10,
                shipping: {
                  cost: '5',
                  free: false,
                  estimatedDays: '3-5',
                  regions: ['US'],
                },
                trust: {
                  escrowProtected: true,
                  onChainCertified: true,
                  safetyScore: 95,
                },
              }
            }
          ]
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBackendCart,
      });

      cartService.setAuthStatus(true, 'test-token');
      const cartState = await cartService.getCartState();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
          }),
        })
      );

      expect(cartState.items).toHaveLength(1);
      expect(cartState.items[0].id).toBe('1');
      expect(cartState.items[0].quantity).toBe(2);
    });

    it('should add item to backend cart when authenticated', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      cartService.setAuthStatus(true, 'test-token');

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

      await cartService.addItem(mockProduct, 2);

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/cart/items'),
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Authorization': 'Bearer test-token',
            'Content-Type': 'application/json',
          }),
          body: JSON.stringify({
            productId: '1',
            quantity: 2,
          }),
        })
      );
    });

    it('should handle backend errors gracefully', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      });

      cartService.setAuthStatus(true, 'test-token');

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

      // Should not throw error, but handle gracefully
      await expect(cartService.addItem(mockProduct, 1)).resolves.not.toThrow();
    });

    it('should fall back to localStorage when backend is unavailable', async () => {
      const mockLocalStorage = {
        items: [{ id: '1', title: 'Local Product', quantity: 1 }],
        totals: { itemCount: 1 },
        lastUpdated: new Date().toISOString(),
      };

      (window.localStorage.getItem as jest.Mock).mockReturnValue(
        JSON.stringify(mockLocalStorage)
      );

      (fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

      cartService.setAuthStatus(true, 'test-token');
      const cartState = await cartService.getCartState();

      expect(cartState.items).toHaveLength(1);
      expect(cartState.items[0].id).toBe('1');
    });
  });

  describe('Error Handling and Retry Logic', () => {
    it('should provide user-friendly error messages', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
      });

      const result = await enhancedMarketplaceService.getListingById('1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('rate limit');
      expect(result.error?.suggestedActions).toContain('wait a moment');
    });

    it('should handle network timeouts', async () => {
      (fetch as jest.Mock).mockRejectedValue(new Error('timeout'));

      const result = await enhancedMarketplaceService.getListingById('1');

      expect(result.success).toBe(false);
      expect(result.error?.message).toContain('taking longer than expected');
      expect(result.error?.retryable).toBe(true);
    }, 10000);

    it('should not retry on client errors', async () => {
      (fetch as jest.Mock).mockResolvedValue({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
      });

      const result = await enhancedMarketplaceService.getListingById('invalid-id');

      expect(fetch).toHaveBeenCalledTimes(1); // No retries
      expect(result.success).toBe(false);
    });
  });

  describe('Health Check', () => {
    it('should check backend health', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
      });

      const isHealthy = await enhancedMarketplaceService.healthCheck();

      expect(fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health')
      );
      expect(isHealthy).toBe(true);
    });

    it('should handle health check timeout', async () => {
      (fetch as jest.Mock).mockImplementation(() => 
        new Promise(resolve => setTimeout(resolve, 6000))
      );

      const isHealthy = await enhancedMarketplaceService.healthCheck();

      expect(isHealthy).toBe(false);
    }, 10000);
  });
});