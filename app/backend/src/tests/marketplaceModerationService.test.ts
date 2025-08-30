import { MarketplaceModerationService, MarketplaceListingInput } from '../services/marketplaceModerationService';
import { DatabaseService } from '../services/databaseService';
import { ReputationService } from '../services/reputationService';
import { AIModerationOrchestrator } from '../services/aiModerationOrchestrator';
import EvidenceStorageService from '../services/evidenceStorageService';
import { UserProfileService } from '../services/userProfileService';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/reputationService');
jest.mock('../services/aiModerationOrchestrator');
jest.mock('../services/evidenceStorageService', () => ({
  __esModule: true,
  default: {
    storeEvidenceBundle: jest.fn()
  }
}));
jest.mock('../services/userProfileService');

describe('MarketplaceModerationService', () => {
  let service: MarketplaceModerationService;
  let mockDatabaseService: jest.Mocked<DatabaseService>;
  let mockReputationService: jest.Mocked<ReputationService>;
  let mockAIOrchestrator: jest.Mocked<AIModerationOrchestrator>;
  let mockEvidenceStorage: jest.Mocked<typeof EvidenceStorageService>;
  let mockUserProfileService: jest.Mocked<UserProfileService>;

  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks();
    
    // Create service instance
    service = new MarketplaceModerationService();
    
    // Get mock instances
    mockDatabaseService = DatabaseService.prototype as jest.Mocked<DatabaseService>;
    mockReputationService = ReputationService.prototype as jest.Mocked<ReputationService>;
    mockAIOrchestrator = AIModerationOrchestrator.prototype as jest.Mocked<AIModerationOrchestrator>;
    mockEvidenceStorage = EvidenceStorageService as jest.Mocked<typeof EvidenceStorageService>;
    mockUserProfileService = UserProfileService.prototype as jest.Mocked<UserProfileService>;
  });

  describe('moderateMarketplaceListing', () => {
    const mockListingInput: MarketplaceListingInput = {
      id: 'listing_123',
      type: 'listing',
      userId: 'user_456',
      userReputation: 75,
      walletAddress: '0x1234567890123456789012345678901234567890',
      metadata: {},
      listingData: {
        title: 'Authentic Nike Sneakers',
        description: 'Brand new Nike Air Jordan sneakers in excellent condition',
        price: '150',
        currency: 'USD',
        category: 'footwear',
        images: ['https://example.com/image1.jpg'],
        isHighValue: false,
        sellerAddress: '0x1234567890123456789012345678901234567890'
      },
      text: 'Authentic Nike Sneakers Brand new Nike Air Jordan sneakers in excellent condition',
      media: [{
        url: 'https://example.com/image1.jpg',
        type: 'image',
        mimeType: 'image/jpeg',
        size: 1024
      }]
    };

    beforeEach(() => {
      // Setup default mock responses
      mockAIOrchestrator.scanContent.mockResolvedValue({
        overallConfidence: 0.2,
        primaryCategory: 'safe',
        action: 'allow',
        vendorResults: [],
        evidenceHash: 'hash123',
        riskScore: 0.2
      });

      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 75,
        moderationScore: 75,
        reportingScore: 75,
        juryScore: 75,
        violationCount: 0,
        helpfulReportsCount: 5,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        reputationTier: 'silver'
      });

      mockUserProfileService.getProfileByAddress.mockResolvedValue({
        id: 'user_456',
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser',
        ens: '',
        avatarCid: '',
        bioCid: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        kycStatus: 'verified'
      });

      mockEvidenceStorage.storeEvidenceBundle.mockResolvedValue({
        id: 1,
        caseId: 1,
        contentHash: 'hash123',
        screenshots: [],
        modelOutputs: {},
        decisionRationale: 'test',
        policyVersion: '1.0',
        timestamp: new Date(),
        ipfsHash: 'evidence_cid_123',
        bundleSize: 1024,
        verificationHash: 'verify123'
      });
    });

    it('should allow safe listings from verified sellers', async () => {
      const result = await service.moderateMarketplaceListing(mockListingInput);

      expect(result.overallDecision).toBe('allow');
      expect(result.listingId).toBe('listing_123');
      expect(result.sellerVerification.tier).toBeDefined();
      expect(result.counterfeitDetection.isCounterfeit).toBe(false);
      expect(result.scamDetection.isScam).toBe(false);
      expect(result.riskScore).toBeLessThan(0.5);
    });

    it('should block listings with high scam confidence', async () => {
      const scamInput = {
        ...mockListingInput,
        listingData: {
          ...mockListingInput.listingData,
          title: 'FREE NFT GIVEAWAY - CLAIM NOW',
          description: 'Connect your wallet to claim free NFT. Limited time offer!'
        },
        text: 'FREE NFT GIVEAWAY - CLAIM NOW Connect your wallet to claim free NFT. Limited time offer!'
      };

      const result = await service.moderateMarketplaceListing(scamInput);

      expect(result.scamDetection.isScam).toBe(true);
      expect(result.scamDetection.confidence).toBeGreaterThan(0.6);
      expect(result.scamDetection.detectedPatterns).toContain('fake_giveaway');
      expect(result.overallDecision).toBe('block');
    });

    it('should detect counterfeit products with brand keywords', async () => {
      const counterfeitInput = {
        ...mockListingInput,
        listingData: {
          ...mockListingInput.listingData,
          title: 'Replica Gucci Handbag',
          description: 'High quality replica Gucci bag, looks exactly like the original'
        },
        text: 'Replica Gucci Handbag High quality replica Gucci bag, looks exactly like the original'
      };

      const result = await service.moderateMarketplaceListing(counterfeitInput);

      expect(result.counterfeitDetection.isCounterfeit).toBe(true);
      expect(result.counterfeitDetection.matchedBrands).toContain('gucci');
      expect(result.counterfeitDetection.confidence).toBeGreaterThan(0.7);
      expect(result.overallDecision).toBe('block');
    });

    it('should require review for new sellers with high-value items', async () => {
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 10,
        moderationScore: 10,
        reportingScore: 10,
        juryScore: 10,
        violationCount: 2,
        helpfulReportsCount: 0,
        falseReportsCount: 1,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        reputationTier: 'new'
      });

      const highValueInput = {
        ...mockListingInput,
        listingData: {
          ...mockListingInput.listingData,
          price: '5000',
          isHighValue: true
        }
      };

      const result = await service.moderateMarketplaceListing(highValueInput);

      expect(result.sellerVerification.tier).toBe('new');
      expect(result.sellerVerification.riskLevel).toBe('critical');
      expect(result.overallDecision).toBe('review');
      expect(result.requiredActions).toContain('human_review_required');
    });

    it('should verify NFT ownership for high-value NFT listings', async () => {
      const nftInput = {
        ...mockListingInput,
        listingData: {
          ...mockListingInput.listingData,
          price: '2000',
          isHighValue: true,
          nftContract: '0xBC4CA0EdA7647A8aB7C2061c2E118A18a936f13D',
          tokenId: '1234'
        }
      };

      const result = await service.moderateMarketplaceListing(nftInput);

      expect(result.nftVerification).toBeDefined();
      expect(result.nftVerification?.status).toBeDefined();
      expect(result.nftVerification?.ownershipVerified).toBeDefined();
    });

    it('should handle errors gracefully and return safe fallback', async () => {
      mockAIOrchestrator.scanContent.mockRejectedValue(new Error('AI service unavailable'));

      const result = await service.moderateMarketplaceListing(mockListingInput);

      expect(result.overallDecision).toBe('review');
      expect(result.confidence).toBe(0);
      expect(result.requiredActions).toContain('manual_review_required');
      expect(result.riskScore).toBe(0.8);
    });

    it('should detect suspicious pricing patterns', async () => {
      const suspiciousPricingInput = {
        ...mockListingInput,
        listingData: {
          ...mockListingInput.listingData,
          title: 'Rare CryptoPunk NFT',
          description: 'Authentic rare CryptoPunk NFT',
          price: '0.001' // Unrealistically low for rare NFT
        },
        text: 'Rare CryptoPunk NFT Authentic rare CryptoPunk NFT'
      };

      const result = await service.moderateMarketplaceListing(suspiciousPricingInput);

      expect(result.scamDetection.detectedPatterns).toContain('suspicious_pricing');
      expect(result.scamDetection.riskFactors).toContain('unrealistic_low_price');
    });

    it('should apply reputation-based risk adjustments', async () => {
      // Test with high reputation user
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 95,
        moderationScore: 95,
        reportingScore: 95,
        juryScore: 95,
        violationCount: 0,
        helpfulReportsCount: 20,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 10,
        juryAccuracyRate: 0.95,
        reputationTier: 'platinum'
      });

      const result1 = await service.moderateMarketplaceListing(mockListingInput);

      // Test with low reputation user
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 20,
        moderationScore: 20,
        reportingScore: 20,
        juryScore: 20,
        violationCount: 5,
        helpfulReportsCount: 0,
        falseReportsCount: 3,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        reputationTier: 'bronze'
      });

      const result2 = await service.moderateMarketplaceListing(mockListingInput);

      expect(result1.sellerVerification.riskLevel).toBe('low');
      expect(result2.sellerVerification.riskLevel).toBe('high');
      expect(result2.riskScore).toBeGreaterThan(result1.riskScore);
    });

    it('should store evidence for all moderation decisions', async () => {
      await service.moderateMarketplaceListing(mockListingInput);

      expect(mockEvidenceStorage.storeEvidenceBundle).toHaveBeenCalledWith(
        expect.objectContaining({
          contentId: expect.any(String),
          contentType: 'listing',
          modelOutputs: expect.any(Object)
        })
      );
    });
  });

  describe('scam pattern detection', () => {
    it('should detect seed phrase requests', async () => {
      const input = {
        ...createMockInput(),
        text: 'Please provide your 12 word recovery phrase to verify ownership'
      };

      const result = await service.moderateMarketplaceListing(input);

      expect(result.scamDetection.detectedPatterns).toContain('seed_phrase');
      expect(result.scamDetection.isScam).toBe(true);
    });

    it('should detect fake urgency tactics', async () => {
      const input = {
        ...createMockInput(),
        text: 'Limited time offer! Only 3 left! Act fast before they are gone!'
      };

      const result = await service.moderateMarketplaceListing(input);

      expect(result.scamDetection.detectedPatterns).toContain('fake_urgency');
      expect(result.scamDetection.riskFactors).toContain('urgency_tactics');
    });

    it('should detect impersonation attempts', async () => {
      const input = {
        ...createMockInput(),
        text: 'Official verified authentic original Nike product from authorized dealer'
      };

      const result = await service.moderateMarketplaceListing(input);

      expect(result.scamDetection.detectedPatterns).toContain('impersonation');
      expect(result.scamDetection.riskFactors).toContain('false_authenticity_claims');
    });
  });

  describe('counterfeit detection', () => {
    it('should detect luxury brand counterfeits', async () => {
      const input = {
        ...createMockInput(),
        listingData: {
          ...createMockInput().listingData,
          title: 'Louis Vuitton inspired handbag',
          description: 'High quality replica Louis Vuitton style bag'
        }
      };

      const result = await service.moderateMarketplaceListing(input);

      expect(result.counterfeitDetection.matchedBrands).toContain('louis vuitton');
      expect(result.counterfeitDetection.isCounterfeit).toBe(true);
    });

    it('should detect tech brand counterfeits', async () => {
      const input = {
        ...createMockInput(),
        listingData: {
          ...createMockInput().listingData,
          title: 'Apple iPhone copy',
          description: 'Looks exactly like real iPhone but unauthorized'
        }
      };

      const result = await service.moderateMarketplaceListing(input);

      expect(result.counterfeitDetection.matchedBrands).toContain('apple');
      expect(result.counterfeitDetection.suspiciousKeywords).toContain('unauthorized_usage');
    });
  });

  describe('seller verification', () => {
    it('should assign correct seller tiers based on reputation and history', async () => {
      // Test platinum tier
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 95,
        moderationScore: 95,
        reportingScore: 95,
        juryScore: 95,
        violationCount: 0,
        helpfulReportsCount: 50,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 20,
        juryAccuracyRate: 0.95,
        reputationTier: 'platinum'
      });

      const result1 = await service.moderateMarketplaceListing(createMockInput());
      expect(result1.sellerVerification.tier).toBe('platinum');

      // Test new seller tier
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 30,
        moderationScore: 30,
        reportingScore: 30,
        juryScore: 30,
        violationCount: 1,
        helpfulReportsCount: 1,
        falseReportsCount: 0,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        reputationTier: 'bronze'
      });

      const result2 = await service.moderateMarketplaceListing(createMockInput());
      expect(result2.sellerVerification.tier).toBe('new');
    });

    it('should generate appropriate verification requirements', async () => {
      mockReputationService.getUserReputation.mockResolvedValue({
        userId: 'user_456',
        overallScore: 20,
        moderationScore: 20,
        reportingScore: 20,
        juryScore: 20,
        violationCount: 3,
        helpfulReportsCount: 0,
        falseReportsCount: 2,
        successfulAppealsCount: 0,
        juryDecisionsCount: 0,
        juryAccuracyRate: 0,
        reputationTier: 'new'
      });

      const result = await service.moderateMarketplaceListing(createMockInput());

      expect(result.sellerVerification.verificationRequirements).toContain('identity_verification');
      expect(result.sellerVerification.verificationRequirements).toContain('enhanced_kyc');
    });
  });

  // Helper function to create mock input
  function createMockInput(): MarketplaceListingInput {
    return {
      id: 'test_listing',
      type: 'listing',
      userId: 'test_user',
      userReputation: 50,
      walletAddress: '0x1234567890123456789012345678901234567890',
      metadata: {},
      listingData: {
        title: 'Test Product',
        description: 'Test product description',
        price: '100',
        currency: 'USD',
        category: 'general',
        images: ['https://example.com/image.jpg'],
        isHighValue: false,
        sellerAddress: '0x1234567890123456789012345678901234567890'
      },
      text: 'Test Product Test product description'
    };
  }
});