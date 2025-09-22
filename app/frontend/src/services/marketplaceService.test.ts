import { MarketplaceService, CreateListingInput } from './marketplaceService';

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