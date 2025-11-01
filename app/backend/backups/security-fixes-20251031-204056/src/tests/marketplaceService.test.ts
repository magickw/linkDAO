import { MarketplaceService } from '../services/marketplaceService';
import { DatabaseService } from '../services/databaseService';
import { UserProfileService } from '../services/userProfileService';

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;
  let databaseService: DatabaseService;
  let userProfileService: UserProfileService;

  beforeEach(() => {
    marketplaceService = new MarketplaceService();
    databaseService = new DatabaseService();
    userProfileService = new UserProfileService();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('createListing', () => {
    it('should create a fixed-price listing', async () => {
      const mockUser = {
        id: 'user1',
        walletAddress: '0x123',
        handle: 'testuser',
        ens: '',
        avatarCid: '',
        bioCid: '',
        profileCid: 'profile_cid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockListing = {
        id: 1,
        sellerId: 'user1',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        status: 'active',
        startTime: new Date(),
        endTime: null,
        highestBid: null,
        highestBidder: null,
        metadataURI: 'ipfs://test',
        isEscrowed: false,
        nftStandard: null,
        tokenId: null,
        reservePrice: null,
        minIncrement: null,
        reserveMet: null,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      jest.spyOn(userProfileService, 'getProfileByAddress').mockResolvedValue(mockUser);
      jest.spyOn(databaseService, 'createListing').mockResolvedValue(mockListing);
      
      const input = {
        sellerWalletAddress: '0x123',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'ipfs://test'
      };
      
      const result = await marketplaceService.createListing(input);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('sellerWalletAddress', '0x123');
      expect(result).toHaveProperty('price', '1000000000000000000');
      expect(result).toHaveProperty('itemType', 'DIGITAL');
      expect(result).toHaveProperty('listingType', 'FIXED_PRICE');
      expect(databaseService.createListing).toHaveBeenCalledWith(
        'user1',
        '0x0000000000000000000000000000000000000000',
        '1000000000000000000',
        1,
        'DIGITAL',
        'FIXED_PRICE',
        'ipfs://test',
        undefined,
        undefined,
        undefined,
        undefined
      );
    });

    it('should create an auction listing with reserve price', async () => {
      const mockUser = {
        id: 'user1',
        walletAddress: '0x123',
        handle: 'testuser',
        ens: '',
        avatarCid: '',
        bioCid: '',
        profileCid: 'profile_cid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockListing = {
        id: 1,
        sellerId: 'user1',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'AUCTION' as const,
        status: 'active',
        startTime: new Date(),
        endTime: null,
        highestBid: null,
        highestBidder: null,
        metadataURI: 'ipfs://test',
        isEscrowed: false,
        nftStandard: 'ERC721',
        tokenId: '123',
        reservePrice: '2000000000000000000',
        minIncrement: '100000000000000000',
        reserveMet: false,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      jest.spyOn(userProfileService, 'getProfileByAddress').mockResolvedValue(mockUser);
      jest.spyOn(databaseService, 'createListing').mockResolvedValue(mockListing);
      
      const input = {
        sellerWalletAddress: '0x123',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'AUCTION' as const,
        duration: 86400,
        metadataURI: 'ipfs://test',
        nftStandard: 'ERC721' as const,
        tokenId: '123',
        reservePrice: '2000000000000000000',
        minIncrement: '100000000000000000'
      };
      
      const result = await marketplaceService.createListing(input);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('sellerWalletAddress', '0x123');
      expect(result).toHaveProperty('listingType', 'AUCTION');
      expect(result).toHaveProperty('reservePrice', '2000000000000000000');
      expect(result).toHaveProperty('minIncrement', '100000000000000000');
      expect(databaseService.createListing).toHaveBeenCalledWith(
        'user1',
        '0x0000000000000000000000000000000000000000',
        '1000000000000000000',
        1,
        'NFT',
        'AUCTION',
        'ipfs://test',
        'ERC721',
        '123',
        '2000000000000000000',
        '100000000000000000'
      );
    });
  });

  describe('placeBid', () => {
    it('should place a bid on an auction listing', async () => {
      const mockUser = {
        id: 'user1',
        walletAddress: '0x123',
        handle: 'bidder',
        ens: '',
        avatarCid: '',
        bioCid: '',
        profileCid: 'profile_cid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockBid = {
        id: 1,
        listingId: 1,
        bidderId: 'user1',
        amount: '1500000000000000000',
        timestamp: new Date()
      };
      
      jest.spyOn(userProfileService, 'getProfileByAddress').mockResolvedValue(mockUser);
      jest.spyOn(databaseService, 'placeBid').mockResolvedValue(mockBid);
      
      const input = {
        bidderWalletAddress: '0x123',
        amount: '1500000000000000000'
      };
      
      const result = await marketplaceService.placeBid('1', input);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('listingId', '1');
      expect(result).toHaveProperty('bidderWalletAddress', '0x123');
      expect(result).toHaveProperty('amount', '1500000000000000000');
      expect(databaseService.placeBid).toHaveBeenCalledWith(1, 'user1', '1500000000000000000');
    });
  });

  describe('makeOffer', () => {
    it('should make an offer on a listing', async () => {
      const mockUser = {
        id: 'user1',
        walletAddress: '0x123',
        handle: 'buyer',
        ens: '',
        avatarCid: '',
        bioCid: '',
        profileCid: 'profile_cid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockOffer = {
        id: 1,
        listingId: 1,
        buyerId: 'user1',
        amount: '900000000000000000',
        createdAt: new Date(),
        accepted: false
      };
      
      jest.spyOn(userProfileService, 'getProfileByAddress').mockResolvedValue(mockUser);
      jest.spyOn(databaseService, 'makeOffer').mockResolvedValue(mockOffer);
      
      const input = {
        buyerWalletAddress: '0x123',
        amount: '900000000000000000'
      };
      
      const result = await marketplaceService.makeOffer('1', input);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('listingId', '1');
      expect(result).toHaveProperty('buyerWalletAddress', '0x123');
      expect(result).toHaveProperty('amount', '900000000000000000');
      expect(databaseService.makeOffer).toHaveBeenCalledWith(1, 'user1', '900000000000000000');
    });
  });

  describe('createDispute', () => {
    it('should create a dispute with evidence', async () => {
      const mockUser = {
        id: 'user1',
        walletAddress: '0x123',
        handle: 'disputer',
        ens: '',
        avatarCid: '',
        bioCid: '',
        profileCid: 'profile_cid',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      const mockDispute = {
        id: 1,
        escrowId: 1,
        reporterId: 'user1',
        reason: 'Item not received',
        status: 'open' as const,
        createdAt: new Date(),
        resolvedAt: null,
        resolution: null,
        evidence: '["ipfs://evidence1", "ipfs://evidence2"]'
      };
      
      jest.spyOn(userProfileService, 'getProfileByAddress').mockResolvedValue(mockUser);
      jest.spyOn(databaseService, 'createDispute').mockResolvedValue(mockDispute);
      
      const evidence = ['ipfs://evidence1', 'ipfs://evidence2'];
      const result = await marketplaceService.createDispute('1', '0x123', 'Item not received', evidence);
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('escrowId', '1');
      expect(result).toHaveProperty('reporterWalletAddress', '0x123');
      expect(result).toHaveProperty('reason', 'Item not received');
      expect(result).toHaveProperty('evidence', evidence);
      expect(databaseService.createDispute).toHaveBeenCalledWith(
        1,
        'user1',
        'Item not received',
        '["ipfs://evidence1","ipfs://evidence2"]'
      );
    });
  });

  describe('createAIModeration', () => {
    it('should create an AI moderation record', async () => {
      const mockAIModeration = {
        id: 1,
        objectType: 'listing',
        objectId: 1,
        status: 'pending' as const,
        aiAnalysis: '{"riskScore": 20}',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      jest.spyOn(databaseService, 'createAIModeration').mockResolvedValue(mockAIModeration);
      
      const result = await marketplaceService.createAIModeration('listing', '1', '{"riskScore": 20}');
      
      expect(result).toHaveProperty('id', '1');
      expect(result).toHaveProperty('objectType', 'listing');
      expect(result).toHaveProperty('objectId', '1');
      expect(result).toHaveProperty('status', 'PENDING');
      expect(result).toHaveProperty('aiAnalysis', '{"riskScore": 20}');
      expect(databaseService.createAIModeration).toHaveBeenCalledWith('listing', 1, '{"riskScore": 20}');
    });
  });

  describe('getPendingAIModeration', () => {
    it('should get pending AI moderation records', async () => {
      const mockAIModerations = [
        {
          id: 1,
          objectType: 'listing',
          objectId: 1,
          status: 'pending' as const,
          aiAnalysis: '{"riskScore": 20}',
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: 2,
          objectType: 'dispute',
          objectId: 1,
          status: 'pending' as const,
          aiAnalysis: '{"confidence": 85}',
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];
      
      jest.spyOn(databaseService, 'getPendingAIModeration').mockResolvedValue(mockAIModerations);
      
      const result = await marketplaceService.getPendingAIModeration();
      
      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('objectType', 'listing');
      expect(result[0]).toHaveProperty('status', 'PENDING');
      expect(result[1]).toHaveProperty('id', '2');
      expect(result[1]).toHaveProperty('objectType', 'dispute');
      expect(result[1]).toHaveProperty('status', 'PENDING');
      expect(databaseService.getPendingAIModeration).toHaveBeenCalled();
    });
  });
});