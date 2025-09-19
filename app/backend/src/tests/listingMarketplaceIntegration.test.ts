import { MarketplaceService } from '../../../frontend/src/services';
import { MarketplaceService } from '../../../frontend/src/services';
import { ProductListingService, CreateListingInput } from '../services/listingService';
import { BlockchainMarketplaceService } from '../services/marketplaceService';
import { ProductService } from '../services/productService';

// Mock dependencies
jest.mock('../services/productService');
jest.mock('../services/marketplaceService');
jest.mock('../services/imageStorageService');
jest.mock('../services/databaseService');
jest.mock('../services/redisService');

describe('ListingService - MarketplaceService Integration', () => {
  let listingService: ProductListingService;
  let mockMarketplaceService: jest.Mocked<BlockchainMarketplaceService>;
  let mockProductService: jest.Mocked<ProductService>;

  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();

    // Create service instance
    listingService = new ProductListingService();

    // Get mocked instances
    mockMarketplaceService = MarketplaceService.prototype as jest.Mocked<MarketplaceService>;
    mockProductService = ProductService.prototype as jest.Mocked<ProductService>;

    // Setup default mocks
    mockProductService.getProductById = jest.fn();
    mockProductService.createProduct = jest.fn();
    mockProductService.updateProduct = jest.fn();
    mockMarketplaceService.createListing = jest.fn();
    mockMarketplaceService.getListingById = jest.fn();
    mockMarketplaceService.updateListing = jest.fn();
    mockMarketplaceService.getBidsByListing = jest.fn();
    mockMarketplaceService.getOffersByListing = jest.fn();
  });

  describe('publishToBlockchain', () => {
    const mockProductListing = {
      id: 'product-123',
      sellerId: '0x1234567890123456789012345678901234567890',
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
      metadata: { condition: 'new' as const, brand: 'Test Brand' },
      inventory: 10,
      status: 'active' as const,
      tags: ['electronics'],
      views: 0,
      favorites: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const mockBlockchainListing = {
      id: 'blockchain-123',
      sellerWalletAddress: '0x1234567890123456789012345678901234567890',
      tokenAddress: '0x0000000000000000000000000000000000000000',
      price: '99.99',
      quantity: 10,
      itemType: 'PHYSICAL' as const,
      listingType: 'FIXED_PRICE' as const,
      status: 'ACTIVE' as const,
      startTime: new Date().toISOString(),
      metadataURI: 'ipfs://QmMetadataproduct-123',
      isEscrowed: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    it('should publish product listing to blockchain successfully', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockMarketplaceService.createListing = jest.fn().mockResolvedValue(mockBlockchainListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue({
        ...mockProductListing,
        metadata: {
          ...mockProductListing.metadata,
          blockchainListingId: 'blockchain-123',
          publishedToBlockchain: true
        }
      });

      const result = await listingService.publishToBlockchain('product-123');

      expect(result).toEqual(mockBlockchainListing);
      expect(mockMarketplaceService.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          sellerWalletAddress: '0x1234567890123456789012345678901234567890',
          price: '99.99',
          quantity: 10,
          itemType: 'PHYSICAL',
          listingType: 'FIXED_PRICE',
          metadataURI: 'ipfs://QmMetadataproduct-123'
        })
      );
    });

    it('should handle custom blockchain options', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockMarketplaceService.createListing = jest.fn().mockResolvedValue(mockBlockchainListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue(mockProductListing);

      const options = {
        tokenAddress: '0xCustomToken',
        itemType: 'NFT' as const,
        listingType: 'AUCTION' as const,
        duration: 7
      };

      await listingService.publishToBlockchain('product-123', options);

      expect(mockMarketplaceService.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenAddress: '0xCustomToken',
          itemType: 'NFT',
          listingType: 'AUCTION',
          duration: 7
        })
      );
    });

    it('should handle NFT listings with metadata', async () => {
      const nftListing = {
        ...mockProductListing,
        nft: {
          contractAddress: '0xNFTContract',
          tokenId: '123',
          standard: 'ERC721' as const,
          metadata: {
            name: 'Test NFT',
            description: 'Test NFT description',
            image: 'ipfs://image-hash'
          }
        }
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(nftListing);
      mockMarketplaceService.createListing = jest.fn().mockResolvedValue(mockBlockchainListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue(nftListing);

      await listingService.publishToBlockchain('product-123', { itemType: 'NFT' });

      expect(mockMarketplaceService.createListing).toHaveBeenCalledWith(
        expect.objectContaining({
          itemType: 'NFT',
          nftStandard: 'ERC721',
          tokenId: '123'
        })
      );
    });

    it('should throw error for non-existent listing', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(null);

      await expect(
        listingService.publishToBlockchain('non-existent')
      ).rejects.toThrow('Listing not found');
    });
  });

  describe('syncWithBlockchain', () => {
    const mockProductListing = {
      id: 'product-123',
      sellerId: '0x1234567890123456789012345678901234567890',
      price: { amount: '99.99', currency: 'USD' },
      inventory: 10,
      status: 'active' as const,
      metadata: { 
        condition: 'new' as const,
        blockchainListingId: 'blockchain-123' 
      }
    };

    const mockBlockchainListing = {
      id: 'blockchain-123',
      sellerWalletAddress: '0x1234567890123456789012345678901234567890',
      price: '89.99', // Different price - needs sync
      quantity: 8, // Different quantity - needs sync
      status: 'ACTIVE' as const
    };

    it('should detect sync requirements and update blockchain', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockMarketplaceService.getListingById = jest.fn().mockResolvedValue(mockBlockchainListing);
      mockMarketplaceService.updateListing = jest.fn().mockResolvedValue({
        ...mockBlockchainListing,
        price: '99.99',
        quantity: 10
      });

      const result = await listingService.syncWithBlockchain('product-123');

      expect(result.synced).toBe(true);
      expect(result.productListing).toEqual(mockProductListing);
      expect(result.blockchainListing).toBeDefined();
      expect(mockMarketplaceService.updateListing).toHaveBeenCalledWith('blockchain-123', {
        price: '99.99',
        quantity: 10
      });
    });

    it('should handle listings without blockchain integration', async () => {
      const listingWithoutBlockchain = {
        ...mockProductListing,
        metadata: { condition: 'new' as const } // No blockchainListingId
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(listingWithoutBlockchain);

      const result = await listingService.syncWithBlockchain('product-123');

      expect(result.productListing).toEqual(listingWithoutBlockchain);
      expect(result.blockchainListing).toBeNull();
      expect(result.synced).toBe(false);
    });

    it('should handle already synced listings', async () => {
      const syncedBlockchainListing = {
        ...mockBlockchainListing,
        price: '99.99', // Same as product
        quantity: 10 // Same as product
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockMarketplaceService.getListingById = jest.fn().mockResolvedValue(syncedBlockchainListing);

      const result = await listingService.syncWithBlockchain('product-123');

      expect(result.synced).toBe(true);
      expect(mockMarketplaceService.updateListing).not.toHaveBeenCalled();
    });
  });

  describe('getBlockchainData', () => {
    const mockProductListing = {
      id: 'product-123',
      metadata: { 
        condition: 'new' as const,
        blockchainListingId: 'blockchain-123' 
      }
    };

    const mockBlockchainListing = {
      id: 'blockchain-123',
      sellerWalletAddress: '0x1234567890123456789012345678901234567890',
      price: '99.99',
      quantity: 10,
      status: 'ACTIVE' as const,
      isEscrowed: false
    };

    const mockBids = [
      {
        id: 'bid-1',
        listingId: 'blockchain-123',
        bidderWalletAddress: '0xBidder1',
        amount: '95.00',
        timestamp: new Date().toISOString()
      }
    ];

    const mockOffers = [
      {
        id: 'offer-1',
        listingId: 'blockchain-123',
        buyerWalletAddress: '0xBuyer1',
        amount: '90.00',
        createdAt: new Date().toISOString(),
        accepted: false
      }
    ];

    it('should return complete blockchain data', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockMarketplaceService.getListingById = jest.fn().mockResolvedValue(mockBlockchainListing);
      mockMarketplaceService.getBidsByListing = jest.fn().mockResolvedValue(mockBids);
      mockMarketplaceService.getOffersByListing = jest.fn().mockResolvedValue(mockOffers);

      const result = await listingService.getBlockchainData('product-123');

      expect(result.listing).toEqual(mockBlockchainListing);
      expect(result.bids).toEqual(mockBids);
      expect(result.offers).toEqual(mockOffers);
      expect(result.escrow).toBeNull();
    });

    it('should handle listings without blockchain integration', async () => {
      const listingWithoutBlockchain = {
        id: 'product-123',
        metadata: { condition: 'new' as const } // No blockchainListingId
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(listingWithoutBlockchain);

      const result = await listingService.getBlockchainData('product-123');

      expect(result.listing).toBeNull();
      expect(result.bids).toEqual([]);
      expect(result.offers).toEqual([]);
      expect(result.escrow).toBeNull();
    });
  });

  describe('handleBlockchainEvent', () => {
    const mockProductListing = {
      id: 'product-123',
      metadata: { condition: 'new' as const, totalBids: 0 }
    };

    it('should handle BID_PLACED event', async () => {
      // Mock finding product by blockchain listing ID
      jest.spyOn(listingService as any, 'findByBlockchainListingId')
        .mockResolvedValue(mockProductListing);
      
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue({
        ...mockProductListing,
        metadata: {
          ...mockProductListing.metadata,
          lastBidAmount: '95.00',
          totalBids: 1
        }
      });

      const bidEvent = {
        type: 'BID_PLACED' as const,
        listingId: 'blockchain-123',
        data: {
          amount: '95.00',
          bidder: '0xBidder1'
        }
      };

      await listingService.handleBlockchainEvent(bidEvent);

      expect(mockProductService.updateProduct).toHaveBeenCalled();
    });

    it('should handle LISTING_SOLD event', async () => {
      jest.spyOn(listingService as any, 'findByBlockchainListingId')
        .mockResolvedValue(mockProductListing);
      
      mockProductService.getProductById = jest.fn().mockResolvedValue(mockProductListing);
      mockProductService.updateProduct = jest.fn().mockResolvedValue({
        ...mockProductListing,
        status: 'sold_out',
        inventory: 0
      });

      const saleEvent = {
        type: 'LISTING_SOLD' as const,
        listingId: 'blockchain-123',
        data: {
          buyer: '0xBuyer1',
          price: '99.99'
        }
      };

      await listingService.handleBlockchainEvent(saleEvent);

      expect(mockProductService.updateProduct).toHaveBeenCalled();
    });

    it('should handle events for non-existent product listings', async () => {
      jest.spyOn(listingService as any, 'findByBlockchainListingId')
        .mockResolvedValue(null);

      const event = {
        type: 'BID_PLACED' as const,
        listingId: 'blockchain-123',
        data: { amount: '95.00', bidder: '0xBidder1' }
      };

      // Should not throw error, just log warning
      await expect(listingService.handleBlockchainEvent(event)).resolves.not.toThrow();
    });
  });

  describe('service composition', () => {
    it('should use ProductService for e-commerce operations', async () => {
      const createInput: CreateListingInput = {
        sellerId: 'seller-123',
        title: 'Test Product',
        description: 'Test description that meets minimum requirements',
        price: { amount: '99.99', currency: 'USD' },
        categoryId: 'category-123',
        images: ['ipfs-hash-1'],
        metadata: { condition: 'new' },
        inventory: 10,
        tags: ['electronics']
      };

      const mockProduct = {
        id: 'product-123',
        ...createInput,
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
        status: 'active' as const,
        views: 0,
        favorites: 0,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockProductService.createProduct = jest.fn().mockResolvedValue(mockProduct);

      // Mock database transaction
      const mockDb = {
        transaction: jest.fn().mockImplementation((callback) => callback({
          update: jest.fn().mockReturnValue({
            set: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([])
            })
          })
        }))
      };
      
      const mockDatabaseService = require('../services/databaseService').DatabaseService;
      mockDatabaseService.prototype.getDatabase = jest.fn().mockReturnValue(mockDb);

      const result = await listingService.createListing(createInput);

      expect(mockProductService.createProduct).toHaveBeenCalledWith(createInput);
      expect(result).toEqual(mockProduct);
    });

    it('should use MarketplaceService for blockchain operations', async () => {
      const mockListing = {
        id: 'product-123',
        sellerId: '0x1234567890123456789012345678901234567890',
        metadata: { condition: 'new' as const }
      };

      mockProductService.getProductById = jest.fn().mockResolvedValue(mockListing);
      mockMarketplaceService.createListing = jest.fn().mockResolvedValue({
        id: 'blockchain-123',
        sellerWalletAddress: '0x1234567890123456789012345678901234567890'
      });

      await listingService.publishToBlockchain('product-123');

      expect(mockMarketplaceService.createListing).toHaveBeenCalled();
    });
  });

  describe('metadata URI generation', () => {
    it('should generate proper metadata URI for blockchain', () => {
      const mockListing = {
        id: 'product-123',
        title: 'Test Product',
        description: 'Test description',
        category: { name: 'Electronics' },
        metadata: { condition: 'new', brand: 'TestBrand' },
        images: ['ipfs-image-1'],
        inventory: 10,
        sellerId: 'seller-123',
        createdAt: new Date()
      };

      const generateMetadataURI = (listingService as any).generateMetadataURI;
      const metadataURI = generateMetadataURI(mockListing);

      expect(metadataURI).toBe('ipfs://QmMetadataproduct-123');
    });
  });

  describe('sync detection', () => {
    it('should detect when sync is required', () => {
      const productListing = {
        price: { amount: '99.99' },
        inventory: 10,
        status: 'active' as const
      };

      const blockchainListing = {
        price: '89.99', // Different price
        quantity: 8, // Different quantity
        status: 'ACTIVE' as const
      };

      const checkSyncRequired = (listingService as any).checkSyncRequired;
      const needsSync = checkSyncRequired(productListing, blockchainListing);

      expect(needsSync).toBe(true);
    });

    it('should detect when listings are in sync', () => {
      const productListing = {
        price: { amount: '99.99' },
        inventory: 10,
        status: 'active' as const
      };

      const blockchainListing = {
        price: '99.99', // Same price
        quantity: 10, // Same quantity
        status: 'ACTIVE' as const
      };

      const checkSyncRequired = (listingService as any).checkSyncRequired;
      const needsSync = checkSyncRequired(productListing, blockchainListing);

      expect(needsSync).toBe(false);
    });
  });

  describe('error handling', () => {
    it('should handle blockchain service errors gracefully', async () => {
      mockProductService.getProductById = jest.fn().mockResolvedValue({
        id: 'product-123',
        sellerId: '0x1234567890123456789012345678901234567890'
      });
      mockMarketplaceService.createListing = jest.fn().mockRejectedValue(
        new Error('Blockchain service unavailable')
      );

      await expect(
        listingService.publishToBlockchain('product-123')
      ).rejects.toThrow('Failed to publish to blockchain');
    });

    it('should handle sync errors gracefully', async () => {
      mockProductService.getProductById = jest.fn().mockRejectedValue(
        new Error('Database error')
      );

      const result = await listingService.syncWithBlockchain('product-123');

      expect(result.productListing).toBeNull();
      expect(result.blockchainListing).toBeNull();
      expect(result.synced).toBe(false);
    });
  });
});