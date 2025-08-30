import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { MarketplaceModerationService } from '../services/marketplaceModerationService';
import { MarketplaceListing } from '../models/Marketplace';

// Mock dependencies
jest.mock('../services/databaseService');
jest.mock('../services/reputationService');
jest.mock('../services/kycService');

describe('MarketplaceModerationService', () => {
  let service: MarketplaceModerationService;
  let mockListing: MarketplaceListing;

  beforeEach(() => {
    service = new MarketplaceModerationService();
    
    mockListing = {
      id: '1',
      sellerWalletAddress: '0x1234567890123456789012345678901234567890',
      tokenAddress: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcdef',
      price: '1000',
      quantity: 1,
      itemType: 'NFT',
      listingType: 'FIXED_PRICE',
      status: 'ACTIVE',
      startTime: new Date().toISOString(),
      metadataURI: 'Test NFT Listing',
      isEscrowed: false,
      nftStandard: 'ERC721',
      tokenId: '123',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  });

  describe('verifyHighValueNFTListing', () => {
    it('should require enhanced verification for high-value listings', async () => {
      const highValueListing = { ...mockListing, price: '5000' };
      
      const result = await service.verifyHighValueNFTListing(highValueListing);
      
      expect(result.verificationLevel).toBe('enhanced');
      expect(result.listingId).toBe(highValueListing.id);
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should require premium verification for very high-value listings', async () => {
      const veryHighValueListing = { ...mockListing, price: '15000' };
      
      const result = await service.verifyHighValueNFTListing(veryHighValueListing);
      
      expect(result.verificationLevel).toBe('premium');
      expect(result.riskScore).toBeGreaterThan(0);
    });

    it('should increase risk score when proof of ownership is missing for high-value NFTs', async () => {
      const highValueListing = { ...mockListing, price: '5000' };
      
      const result = await service.verifyHighValueNFTListing(highValueListing);
      
      expect(result.riskScore).toBeGreaterThan(0.5);
    });

    it('should validate proof of ownership when provided', async () => {
      const highValueListing = { ...mockListing, price: '5000' };
      const proofOfOwnership = {
        signature: '0x' + 'a'.repeat(130),
        message: `I own NFT ${mockListing.tokenId} at contract ${mockListing.tokenAddress} - ${Date.now()}`,
        walletAddress: mockListing.sellerWalletAddress,
        timestamp: Date.now(),
      };
      
      const result = await service.verifyHighValueNFTListing(highValueListing, proofOfOwnership);
      
      expect(result.proofOfOwnership).toEqual(proofOfOwnership);
      expect(result.verificationLevel).toBe('enhanced');
    });

    it('should use basic verification for low-value listings', async () => {
      const lowValueListing = { ...mockListing, price: '100' };
      
      const result = await service.verifyHighValueNFTListing(lowValueListing);
      
      expect(result.verificationLevel).toBe('basic');
      expect(result.riskScore).toBeLessThan(0.5);
    });
  });

  describe('detectCounterfeit', () => {
    it('should detect brand keywords in listing titles', async () => {
      const brandListing = { ...mockListing, metadataURI: 'Authentic Nike Air Jordan Sneakers' };
      
      const result = await service.detectCounterfeit(brandListing);
      
      expect(result.brandKeywords).toContain('nike');
      expect(result.brandKeywords.length).toBeGreaterThan(0);
    });

    it('should detect suspicious counterfeit terms', async () => {
      const suspiciousListing = { 
        ...mockListing, 
        metadataURI: 'Replica Gucci Bag - AAA Quality Mirror Copy' 
      };
      
      const result = await service.detectCounterfeit(suspiciousListing);
      
      expect(result.suspiciousTerms).toContain('replica');
      expect(result.suspiciousTerms).toContain('aaa quality');
      expect(result.suspiciousTerms).toContain('mirror');
      expect(result.brandKeywords).toContain('gucci');
    });

    it('should perform price analysis for brand items', async () => {
      const brandListing = { 
        ...mockListing, 
        metadataURI: 'Rolex Submariner Watch',
        price: '100' // Suspiciously low for a Rolex
      };
      
      const result = await service.detectCounterfeit(brandListing);
      
      expect(result.priceAnalysis).toBeDefined();
      expect(result.priceAnalysis?.isSuspicious).toBe(true);
      expect(result.priceAnalysis?.priceDeviation).toBeGreaterThan(0.5);
    });

    it('should not flag legitimate listings', async () => {
      const legitimateListing = { 
        ...mockListing, 
        metadataURI: 'Original Digital Art NFT Collection' 
      };
      
      const result = await service.detectCounterfeit(legitimateListing);
      
      expect(result.brandKeywords).toHaveLength(0);
      expect(result.suspiciousTerms).toHaveLength(0);
      expect(result.priceAnalysis).toBeUndefined();
    });
  });

  describe('detectScamPatterns', () => {
    it('should detect phishing patterns', async () => {
      const phishingListing = { 
        ...mockListing, 
        metadataURI: 'Free NFT Airdrop - Click here to claim your exclusive deal!' 
      };
      
      const result = await service.detectScamPatterns(phishingListing);
      
      const phishingPattern = result.find(p => p.patternType === 'phishing');
      expect(phishingPattern).toBeDefined();
      expect(phishingPattern?.confidence).toBeGreaterThan(0.5);
      expect(phishingPattern?.indicators).toContain('free nft');
      expect(phishingPattern?.indicators).toContain('airdrop');
    });

    it('should detect fake listing patterns', async () => {
      const fakeListing = { 
        ...mockListing, 
        metadataURI: 'Urgent sale! Must sell today! No returns! Cash only!' 
      };
      
      const result = await service.detectScamPatterns(fakeListing);
      
      const fakePattern = result.find(p => p.patternType === 'fake_listing');
      expect(fakePattern).toBeDefined();
      expect(fakePattern?.confidence).toBeGreaterThan(0.5);
      expect(fakePattern?.indicators).toContain('urgent sale');
      expect(fakePattern?.indicators).toContain('must sell today');
      expect(fakePattern?.indicators).toContain('no returns');
      expect(fakePattern?.indicators).toContain('cash only');
    });

    it('should detect price manipulation patterns', async () => {
      const manipulationListing = { 
        ...mockListing, 
        metadataURI: 'This NFT will moon! Diamond hands! Guaranteed profit to the moon!' 
      };
      
      const result = await service.detectScamPatterns(manipulationListing);
      
      const manipulationPattern = result.find(p => p.patternType === 'price_manipulation');
      expect(manipulationPattern).toBeDefined();
      expect(manipulationPattern?.confidence).toBeGreaterThan(0.5);
      expect(manipulationPattern?.indicators).toContain('moon');
      expect(manipulationPattern?.indicators).toContain('diamond hands');
      expect(manipulationPattern?.indicators).toContain('guaranteed profit');
      expect(manipulationPattern?.indicators).toContain('to the moon');
    });

    it('should not flag legitimate listings', async () => {
      const legitimateListing = { 
        ...mockListing, 
        metadataURI: 'Beautiful digital artwork created by talented artist' 
      };
      
      const result = await service.detectScamPatterns(legitimateListing);
      
      expect(result).toHaveLength(0);
    });

    it('should check for stolen NFTs', async () => {
      // Mock the stolen NFT check to return high risk
      const stolenNFTListing = { ...mockListing };
      
      // Override the private method for testing
      const originalMethod = (service as any).checkStolenNFTDatabase;
      (service as any).checkStolenNFTDatabase = jest.fn().mockResolvedValue(0.8);
      
      const result = await service.detectScamPatterns(stolenNFTListing);
      
      const stolenPattern = result.find(p => p.patternType === 'stolen_nft');
      expect(stolenPattern).toBeDefined();
      expect(stolenPattern?.confidence).toBe(0.8);
      
      // Restore original method
      (service as any).checkStolenNFTDatabase = originalMethod;
    });
  });

  describe('validateProofOfOwnership', () => {
    it('should validate recent proof with correct format', async () => {
      const tokenAddress = mockListing.tokenAddress;
      const tokenId = mockListing.tokenId || '';
      const timestamp = Date.now();
      const proof = {
        signature: '0x' + 'a'.repeat(130),
        message: `I own NFT ${tokenId} at contract ${tokenAddress} - ${timestamp}`,
        walletAddress: mockListing.sellerWalletAddress,
        timestamp,
      };
      
      const result = await service.validateProofOfOwnership(tokenAddress, tokenId, proof);
      
      expect(result).toBe(true);
    });

    it('should reject expired proof', async () => {
      const tokenAddress = mockListing.tokenAddress;
      const tokenId = mockListing.tokenId || '';
      const oldTimestamp = Date.now() - 10 * 60 * 1000; // 10 minutes ago
      const proof = {
        signature: '0x' + 'a'.repeat(130),
        message: `I own NFT ${tokenId} at contract ${tokenAddress} - ${oldTimestamp}`,
        walletAddress: mockListing.sellerWalletAddress,
        timestamp: oldTimestamp,
      };
      
      const result = await service.validateProofOfOwnership(tokenAddress, tokenId, proof);
      
      expect(result).toBe(false);
    });

    it('should reject proof with incorrect message format', async () => {
      const tokenAddress = mockListing.tokenAddress;
      const tokenId = mockListing.tokenId || '';
      const timestamp = Date.now();
      const proof = {
        signature: '0x' + 'a'.repeat(130),
        message: 'Invalid message format',
        walletAddress: mockListing.sellerWalletAddress,
        timestamp,
      };
      
      const result = await service.validateProofOfOwnership(tokenAddress, tokenId, proof);
      
      expect(result).toBe(false);
    });
  });

  describe('determineSellerTier', () => {
    it('should return premium tier for high reputation KYC verified sellers', async () => {
      // Mock the dependencies to return high values
      const mockReputationService = service['reputationService'] as any;
      const mockKycService = service['kycService'] as any;
      
      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(95);
      mockKycService.getKYCStatus = jest.fn().mockResolvedValue({ isVerified: true });
      
      // Mock seller history
      (service as any).getSellerHistory = jest.fn().mockResolvedValue({
        totalVolume: 100000,
        successfulTransactions: 50,
        disputeRate: 0.01,
      });
      
      const result = await service.determineSellerTier(mockListing.sellerWalletAddress);
      
      expect(result).toBe('premium');
    });

    it('should return verified tier for KYC verified sellers with good reputation', async () => {
      const mockReputationService = service['reputationService'] as any;
      const mockKycService = service['kycService'] as any;
      
      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(75);
      mockKycService.getKYCStatus = jest.fn().mockResolvedValue({ isVerified: true });
      
      (service as any).getSellerHistory = jest.fn().mockResolvedValue({
        totalVolume: 10000,
        successfulTransactions: 20,
        disputeRate: 0.05,
      });
      
      const result = await service.determineSellerTier(mockListing.sellerWalletAddress);
      
      expect(result).toBe('verified');
    });

    it('should return basic tier for sellers with moderate reputation', async () => {
      const mockReputationService = service['reputationService'] as any;
      const mockKycService = service['kycService'] as any;
      
      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(60);
      mockKycService.getKYCStatus = jest.fn().mockResolvedValue({ isVerified: false });
      
      (service as any).getSellerHistory = jest.fn().mockResolvedValue({
        totalVolume: 1000,
        successfulTransactions: 15,
        disputeRate: 0.1,
      });
      
      const result = await service.determineSellerTier(mockListing.sellerWalletAddress);
      
      expect(result).toBe('basic');
    });

    it('should return unverified tier for new or low reputation sellers', async () => {
      const mockReputationService = service['reputationService'] as any;
      const mockKycService = service['kycService'] as any;
      
      mockReputationService.getUserReputation = jest.fn().mockResolvedValue(30);
      mockKycService.getKYCStatus = jest.fn().mockResolvedValue({ isVerified: false });
      
      (service as any).getSellerHistory = jest.fn().mockResolvedValue({
        totalVolume: 100,
        successfulTransactions: 2,
        disputeRate: 0.2,
      });
      
      const result = await service.determineSellerTier(mockListing.sellerWalletAddress);
      
      expect(result).toBe('unverified');
    });
  });

  describe('moderateMarketplaceListing', () => {
    it('should block high-risk listings', async () => {
      const highRiskListing = { 
        ...mockListing, 
        metadataURI: 'Replica Rolex Watch - Free NFT Airdrop - Click now!',
        price: '50' // Suspiciously low for Rolex
      };
      
      const result = await service.moderateMarketplaceListing(highRiskListing);
      
      expect(result.action).toBe('block');
      expect(result.overallConfidence).toBeGreaterThan(0.7);
      expect(result.primaryCategory).toMatch(/scam|counterfeit|high_risk/);
    });

    it('should flag suspicious listings for review', async () => {
      const suspiciousListing = { 
        ...mockListing, 
        metadataURI: 'Nike shoes - inspired by original design',
        price: '200'
      };
      
      const result = await service.moderateMarketplaceListing(suspiciousListing);
      
      expect(result.action).toMatch(/review|allow/);
      expect(result.vendorResults).toHaveLength(3);
      expect(result.vendorResults.some(v => v.vendor === 'marketplace_verification')).toBe(true);
      expect(result.vendorResults.some(v => v.vendor === 'counterfeit_detection')).toBe(true);
      expect(result.vendorResults.some(v => v.vendor === 'scam_detection')).toBe(true);
    });

    it('should allow legitimate listings', async () => {
      const legitimateListing = { 
        ...mockListing, 
        metadataURI: 'Original digital artwork by established artist',
        price: '500'
      };
      
      const result = await service.moderateMarketplaceListing(legitimateListing);
      
      expect(result.action).toBe('allow');
      expect(result.overallConfidence).toBeLessThan(0.7);
    });

    it('should handle errors gracefully', async () => {
      // Mock an error in verification
      const originalVerify = service.verifyHighValueNFTListing;
      service.verifyHighValueNFTListing = jest.fn().mockRejectedValue(new Error('Test error'));
      
      const result = await service.moderateMarketplaceListing(mockListing);
      
      expect(result.action).toBe('review');
      expect(result.primaryCategory).toBe('moderation_error');
      expect(result.reasoning).toContain('Error occurred during marketplace moderation');
      
      // Restore original method
      service.verifyHighValueNFTListing = originalVerify;
    });

    it('should include all vendor results in decision', async () => {
      const result = await service.moderateMarketplaceListing(mockListing);
      
      expect(result.vendorResults).toHaveLength(3);
      
      const vendors = result.vendorResults.map(v => v.vendor);
      expect(vendors).toContain('marketplace_verification');
      expect(vendors).toContain('counterfeit_detection');
      expect(vendors).toContain('scam_detection');
      
      // Check that each vendor result has required fields
      result.vendorResults.forEach(vendor => {
        expect(vendor).toHaveProperty('confidence');
        expect(vendor).toHaveProperty('categories');
        expect(vendor).toHaveProperty('reasoning');
        expect(vendor).toHaveProperty('cost');
        expect(vendor).toHaveProperty('latency');
      });
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle missing tokenId for NFT listings', async () => {
      const nftWithoutTokenId = { ...mockListing, tokenId: undefined };
      
      const result = await service.moderateMarketplaceListing(nftWithoutTokenId);
      
      expect(result).toBeDefined();
      expect(result.action).toMatch(/allow|review|block/);
    });

    it('should handle non-NFT item types', async () => {
      const physicalItem = { ...mockListing, itemType: 'PHYSICAL' as const };
      
      const result = await service.moderateMarketplaceListing(physicalItem);
      
      expect(result).toBeDefined();
      expect(result.vendorResults).toHaveLength(3);
    });

    it('should handle empty or invalid metadata', async () => {
      const invalidMetadata = { ...mockListing, metadataURI: '' };
      
      const result = await service.moderateMarketplaceListing(invalidMetadata);
      
      expect(result).toBeDefined();
      expect(result.action).toMatch(/allow|review|block/);
    });

    it('should handle very high and very low prices', async () => {
      const veryHighPrice = { ...mockListing, price: '1000000' };
      const veryLowPrice = { ...mockListing, price: '0.01' };
      
      const highPriceResult = await service.moderateMarketplaceListing(veryHighPrice);
      const lowPriceResult = await service.moderateMarketplaceListing(veryLowPrice);
      
      expect(highPriceResult).toBeDefined();
      expect(lowPriceResult).toBeDefined();
      expect(highPriceResult.vendorResults[0].categories).toContain('premium');
    });
  });
});