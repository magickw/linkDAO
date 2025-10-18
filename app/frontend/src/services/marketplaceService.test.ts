import { MarketplaceService, CreateListingInput, UnifiedMarketplaceService } from './marketplaceService';

// Mock fetch
global.fetch = jest.fn();

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;
  const mockApiUrl = 'http://localhost:10000/api';

  beforeEach(() => {
    marketplaceService = new MarketplaceService();
    (fetch as jest.Mock).mockClear();
  });

  describe('createListing', () => {
    it('should create a new listing', async () => {
      const mockListing = {
        id: '1',
        sellerAddress: '0x123',
        tokenAddress: '0x000',
        price: '1.0',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        status: 'ACTIVE' as const,
        startTime: '2023-01-01T00:00:00Z',
        metadataURI: 'Test Item',
        isEscrowed: false,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockListing,
      });

      const input: CreateListingInput = {
        sellerAddress: '0x123',
        tokenAddress: '0x000',
        price: '1.0',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'Test Item',
      };

      const result = await marketplaceService.createListing(input);

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/marketplace/listings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(input),
      });
      expect(result).toEqual(mockListing);
    });

    it('should handle API errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 400,
        json: async () => ({ message: 'Invalid input' }),
      });

      const input: CreateListingInput = {
        sellerAddress: '0x123',
        tokenAddress: '0x000',
        price: '1.0',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'Test Item',
      };

      await expect(marketplaceService.createListing(input)).rejects.toThrow('Invalid input');
    });
  });

  describe('getActiveListings', () => {
    it('should fetch active listings', async () => {
      const mockListings = [
        {
          id: '1',
          sellerAddress: '0x123',
          tokenAddress: '0x000',
          price: '1.0',
          quantity: 1,
          itemType: 'DIGITAL' as const,
          listingType: 'FIXED_PRICE' as const,
          status: 'ACTIVE' as const,
          startTime: '2023-01-01T00:00:00Z',
          metadataURI: 'Test Item',
          isEscrowed: false,
          createdAt: '2023-01-01T00:00:00Z',
          updatedAt: '2023-01-01T00:00:00Z',
        },
      ];

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockListings,
      });

      const result = await marketplaceService.getActiveListings();

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/marketplace/listings`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockListings);
    });
  });

  describe('placeBid', () => {
    it('should place a bid on a listing', async () => {
      const mockBid = {
        id: '1',
        listingId: '1',
        bidderAddress: '0x456',
        amount: '2.0',
        timestamp: '2023-01-01T00:00:00Z',
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockBid,
      });

      const result = await marketplaceService.placeBid('1', {
        bidderAddress: '0x456',
        amount: '2.0',
      });

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/marketplace/bids/listing/1`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bidderAddress: '0x456',
          amount: '2.0',
        }),
      });
      expect(result).toEqual(mockBid);
    });
  });

  describe('getUserReputation', () => {
    it('should fetch user reputation', async () => {
      const mockReputation = {
        address: '0x123',
        score: 100,
        daoApproved: true,
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockReputation,
      });

      const result = await marketplaceService.getUserReputation('0x123');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/marketplace/reputation/0x123`, {
        headers: {
          'Content-Type': 'application/json',
        },
      });
      expect(result).toEqual(mockReputation);
    });
  });
});

describe('UnifiedMarketplaceService', () => {
  let unifiedMarketplaceService: UnifiedMarketplaceService;
  const mockApiUrl = 'http://localhost:10000';

  beforeEach(() => {
    unifiedMarketplaceService = new UnifiedMarketplaceService();
    (fetch as jest.Mock).mockClear();
  });

  describe('getListingById', () => {
    it('should fetch a listing by ID successfully', async () => {
      const mockListing = {
        id: 'test-listing-1',
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'A test product description',
        priceAmount: 100,
        priceCurrency: 'USD',
        categoryId: 'electronics',
        images: ['https://example.com/image1.jpg'],
        metadata: { brand: 'TestBrand' },
        inventory: 5,
        status: 'active',
        tags: ['electronics', 'gadget'],
        views: 10,
        favorites: 2,
        listingStatus: 'active',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        seller: {
          id: 'seller-123',
          displayName: 'Test Seller',
          verified: true,
          reputation: 4.5,
          daoApproved: true
        },
        category: {
          id: 'electronics',
          name: 'Electronics',
          slug: 'electronics'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 95
        }
      };

      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          listing: mockListing
        }),
      });

      const result = await unifiedMarketplaceService.getListingById('test-listing-1');

      expect(fetch).toHaveBeenCalledWith(`${mockApiUrl}/api/listings/test-listing-1`, {
        signal: expect.any(AbortSignal),
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      expect(result).toEqual({
        id: 'test-listing-1',
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'A test product description',
        priceAmount: 100,
        priceCurrency: 'USD',
        categoryId: 'electronics',
        images: ['https://example.com/image1.jpg'],
        metadata: { brand: 'TestBrand' },
        inventory: 5,
        status: 'active',
        tags: ['electronics', 'gadget'],
        shipping: undefined,
        nft: undefined,
        views: 10,
        favorites: 2,
        listingStatus: 'active',
        publishedAt: undefined,
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z',
        seller: {
          id: 'seller-123',
          displayName: 'Test Seller',
          verified: true,
          reputation: 4.5,
          daoApproved: true
        },
        category: {
          id: 'electronics',
          name: 'Electronics',
          slug: 'electronics'
        },
        trust: {
          verified: true,
          escrowProtected: true,
          onChainCertified: true,
          safetyScore: 95
        }
      });
    });

    it('should return null for 404 errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await unifiedMarketplaceService.getListingById('non-existent');

      expect(result).toBeNull();
    });

    it('should throw error for server errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error'
      });

      await expect(unifiedMarketplaceService.getListingById('test-listing-1'))
        .rejects.toThrow('Server error: 500. Please try again later.');
    });

    it('should handle network errors', async () => {
      (fetch as jest.Mock).mockRejectedValueOnce(new TypeError('Failed to fetch'));

      await expect(unifiedMarketplaceService.getListingById('test-listing-1'))
        .rejects.toThrow('Network error. Please check your connection and try again.');
    });

    it('should handle timeout errors', async () => {
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';
      (fetch as jest.Mock).mockRejectedValueOnce(abortError);

      await expect(unifiedMarketplaceService.getListingById('test-listing-1'))
        .rejects.toThrow('Request timed out. Please try again.');
    });
  });

  describe('getListingByIdWithRetry', () => {
    it('should retry on server errors and eventually succeed', async () => {
      const mockListing = {
        id: 'test-listing-1',
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'A test product description',
        priceAmount: 100,
        priceCurrency: 'USD',
        categoryId: 'electronics',
        images: [],
        metadata: {},
        inventory: 5,
        status: 'active',
        tags: [],
        views: 0,
        favorites: 0,
        listingStatus: 'active',
        createdAt: '2023-01-01T00:00:00Z',
        updatedAt: '2023-01-01T00:00:00Z'
      };

      // First call fails with server error
      (fetch as jest.Mock)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error'
        })
        // Second call succeeds
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({
            success: true,
            listing: mockListing
          }),
        });

      const result = await unifiedMarketplaceService.getListingByIdWithRetry('test-listing-1');

      expect(fetch).toHaveBeenCalledTimes(2);
      expect(result).toBeDefined();
      expect(result?.id).toBe('test-listing-1');
    });

    it('should not retry on 404 errors', async () => {
      (fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await unifiedMarketplaceService.getListingByIdWithRetry('non-existent');

      expect(fetch).toHaveBeenCalledTimes(1);
      expect(result).toBeNull();
    });
  });
});