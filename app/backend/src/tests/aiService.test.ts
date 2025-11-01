import { AIService } from '../services/aiService';
import { MarketplaceService } from '../services/marketplaceService';
import { DatabaseService } from '../services/databaseService';

// Mock the OpenAI client
jest.mock('openai', () => {
  return {
    default: jest.fn().mockImplementation(() => {
      return {
        chat: {
          completions: {
            create: jest.fn().mockResolvedValue({
              choices: [{
                message: {
                  content: 'This is a mock AI response'
                }
              }]
            })
          }
        }
      };
    })
  };
});

describe('AIService', () => {
  let aiService: AIService;
  let marketplaceService: MarketplaceService;
  let databaseService: DatabaseService;

  beforeEach(() => {
    aiService = new AIService();
    marketplaceService = new MarketplaceService();
    databaseService = new DatabaseService();
    
    // Clear all mocks before each test
    jest.clearAllMocks();
  });

  describe('analyzeListing', () => {
    it('should analyze a listing and return results', async () => {
      // Mock marketplace service methods
      const mockListing = {
        id: '1',
        sellerWalletAddress: '0x123',
        tokenAddress: '0x456',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        status: 'ACTIVE' as const,
        startTime: new Date().toISOString(),
        endTime: undefined,
        highestBid: undefined,
        highestBidderWalletAddress: undefined,
        metadataURI: 'Test item',
        isEscrowed: false,
        nftStandard: undefined,
        tokenId: undefined,
        reservePrice: undefined,
        minIncrement: undefined,
        reserveMet: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockReputation = {
        walletAddress: '0x123',
        score: 80,
        daoApproved: true
      };
      
      const mockAIModeration = {
        id: '1',
        objectType: 'listing',
        objectId: '1',
        status: 'APPROVED' as const,
        aiAnalysis: '{"analysis":"Mock analysis","riskScore":20,"status":"APPROVED"}',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      jest.spyOn(marketplaceService, 'getListingById').mockResolvedValue(mockListing);
      jest.spyOn(marketplaceService, 'getUserReputation').mockResolvedValue(mockReputation);
      jest.spyOn(marketplaceService, 'createAIModeration').mockResolvedValue(mockAIModeration);
      
      const result = await aiService.analyzeListing('1');
      
      expect(result).toHaveProperty('listingId', '1');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('analysis');
      expect(marketplaceService.getListingById).toHaveBeenCalledWith('1');
    });

    it('should throw an error if listing is not found', async () => {
      jest.spyOn(marketplaceService, 'getListingById').mockResolvedValue(null);
      
      await expect(aiService.analyzeListing('999')).rejects.toThrow('Listing not found');
    });
  });

  describe('assistDisputeResolution', () => {
    it('should assist with dispute resolution and return results', async () => {
      // Mock marketplace service methods
      const mockDispute = {
        id: '1',
        escrowId: '1',
        reporterWalletAddress: '0x123',
        reason: 'Item not received',
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        resolvedAt: undefined,
        resolution: undefined,
        evidence: ['evidence1', 'evidence2']
      };
      
      const mockEscrow = {
        id: '1',
        listingId: '1',
        buyerWalletAddress: '0x123',
        sellerWalletAddress: '0x456',
        amount: '1000000000000000000',
        buyerApproved: false,
        sellerApproved: false,
        disputeOpened: true,
        resolverWalletAddress: undefined,
        createdAt: new Date().toISOString(),
        resolvedAt: undefined,
        deliveryInfo: 'Shipped via UPS',
        deliveryConfirmed: false
      };
      
      const mockBuyerReputation = {
        walletAddress: '0x123',
        score: 90,
        daoApproved: true
      };
      
      const mockSellerReputation = {
        walletAddress: '0x456',
        score: 70,
        daoApproved: false
      };
      
      const mockAIModeration = {
        id: '1',
        objectType: 'dispute',
        objectId: '1',
        status: 'PENDING' as const,
        aiAnalysis: 'Mock analysis',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      jest.spyOn(marketplaceService, 'getDisputeById').mockResolvedValue(mockDispute);
      jest.spyOn(marketplaceService, 'getEscrowById').mockResolvedValue(mockEscrow);
      jest.spyOn(marketplaceService, 'getUserReputation')
        .mockResolvedValueOnce(mockBuyerReputation)
        .mockResolvedValueOnce(mockSellerReputation);
      jest.spyOn(marketplaceService, 'createAIModeration').mockResolvedValue(mockAIModeration);
      
      const result = await aiService.assistDisputeResolution('1');
      
      expect(result).toHaveProperty('disputeId', '1');
      expect(result).toHaveProperty('analysis');
      expect(marketplaceService.getDisputeById).toHaveBeenCalledWith('1');
    });

    it('should throw an error if dispute is not found', async () => {
      jest.spyOn(marketplaceService, 'getDisputeById').mockResolvedValue(null);
      
      await expect(aiService.assistDisputeResolution('999')).rejects.toThrow('Dispute not found');
    });
  });

  describe('detectFraud', () => {
    it('should detect fraud risk for a user and return results', async () => {
      // Mock marketplace service methods
      const mockReputation = {
        walletAddress: '0x123',
        score: 50,
        daoApproved: false
      };
      
      const mockOrders = [
        {
          id: '1',
          listingId: '1',
          buyerWalletAddress: '0x123',
          sellerWalletAddress: '0x456',
          escrowId: undefined,
          amount: '1000000000000000000',
          paymentToken: '0x0000000000000000000000000000000000000000',
          status: 'COMPLETED' as const,
          createdAt: new Date().toISOString()
        }
      ];
      
      const mockDisputes = [
        {
          id: '1',
          escrowId: '1',
          reporterWalletAddress: '0x123',
          reason: 'Item not received',
          status: 'RESOLVED' as const,
          createdAt: new Date().toISOString(),
          resolvedAt: undefined,
          resolution: undefined,
          evidence: undefined
        }
      ];
      
      jest.spyOn(marketplaceService, 'getUserReputation').mockResolvedValue(mockReputation);
      jest.spyOn(marketplaceService, 'getOrdersByUser').mockResolvedValue(mockOrders);
      jest.spyOn(marketplaceService, 'getDisputesByUser').mockResolvedValue(mockDisputes);
      
      const result = await aiService.detectFraud('0x123');
      
      expect(result).toHaveProperty('userAddress', '0x123');
      expect(result).toHaveProperty('riskScore');
      expect(result).toHaveProperty('analysis');
      expect(marketplaceService.getUserReputation).toHaveBeenCalledWith('0x123');
    });
  });

  describe('suggestPrice', () => {
    it('should suggest a price for an item and return results', async () => {
      const result = await aiService.suggestPrice('DIGITAL', 'Test digital item');
      
      expect(result).toHaveProperty('itemType', 'DIGITAL');
      expect(result).toHaveProperty('metadataURI', 'Test digital item');
      expect(result).toHaveProperty('suggestion');
    });
  });

  describe('processPendingModeration', () => {
    it('should process pending moderation records', async () => {
      // Mock marketplace service methods
      const mockPendingRecords = [
        {
          id: '1',
          objectType: 'listing',
          objectId: '1',
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: '2',
          objectType: 'dispute',
          objectId: '1',
          status: 'PENDING' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
      
      const mockListing = {
        id: '1',
        sellerWalletAddress: '0x123',
        tokenAddress: '0x456',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        status: 'ACTIVE' as const,
        startTime: new Date().toISOString(),
        endTime: undefined,
        highestBid: undefined,
        highestBidderWalletAddress: undefined,
        metadataURI: 'Test item',
        isEscrowed: false,
        nftStandard: undefined,
        tokenId: undefined,
        reservePrice: undefined,
        minIncrement: undefined,
        reserveMet: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const mockDispute = {
        id: '1',
        escrowId: '1',
        reporterWalletAddress: '0x123',
        reason: 'Item not received',
        status: 'OPEN' as const,
        createdAt: new Date().toISOString(),
        resolvedAt: undefined,
        resolution: undefined,
        evidence: undefined
      };
      
      jest.spyOn(marketplaceService, 'getPendingAIModeration').mockResolvedValue(mockPendingRecords);
      jest.spyOn(marketplaceService, 'getListingById').mockResolvedValue(mockListing);
      jest.spyOn(marketplaceService, 'getDisputeById').mockResolvedValue(mockDispute);
      jest.spyOn(marketplaceService, 'createAIModeration').mockResolvedValue(null);
      
      await aiService.processPendingModeration();
      
      expect(marketplaceService.getPendingAIModeration).toHaveBeenCalled();
    });
  });
});
