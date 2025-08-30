import { MarketplaceModerationService, MarketplaceListingInput } from '../services/marketplaceModerationService';

describe('Marketplace Moderation Integration Tests', () => {
  let service: MarketplaceModerationService;

  beforeEach(() => {
    service = new MarketplaceModerationService();
  });

  describe('End-to-End Moderation Scenarios', () => {
    it('should handle legitimate high-value NFT listing', async () => {
      const legitimateNFTListing: MarketplaceListingInput = {
        id: 'nft_listing_001',
        type: 'listing',
        userId: 'verified_user_001',
        userReputation: 85,
        walletAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A',
        metadata: { source: 'opensea', verified: true },
        listingData: {
          title: 'Rare CryptoPunk #1234',
          description: 'Authentic CryptoPunk from original collection, verified ownership with signature',
          price: '50',
          currency: 'ETH',
          category: 'nft',
          images: ['https://cryptopunks.app/cryptopunks/cryptopunk1234.png'],
          nftContract: '0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB',
          tokenId: '1234',
          isHighValue: true,
          sellerAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b5Da5A'
        },
        text: 'Rare CryptoPunk #1234 Authentic CryptoPunk from original collection, verified ownership with signature'
      };

      const result = await service.moderateMarketplaceListing(legitimateNFTListing);

      expect(result.overallDecision).toBe('allow');
      expect(result.nftVerification).toBeDefined();
      expect(result.nftVerification?.status).toBe('verified');
      expect(result.sellerVerification.tier).toBeOneOf(['gold', 'platinum']);
      expect(result.counterfeitDetection.isCounterfeit).toBe(false);
      expect(result.scamDetection.isScam).toBe(false);
      expect(result.riskScore).toBeLessThan(0.5);
    });

    it('should block obvious scam listing', async () => {
      const scamListing: MarketplaceListingInput = {
        id: 'scam_listing_001',
        type: 'listing',
        userId: 'suspicious_user_001',
        userReputation: 15,
        walletAddress: '0x0000000000000000000000000000000000000001',
        metadata: {},
        listingData: {
          title: 'FREE BORED APE GIVEAWAY - CLAIM NOW!!!',
          description: 'Connect your wallet and provide your 12 word seed phrase to claim your free Bored Ape NFT! Limited time offer, only 24 hours left!',
          price: '0',
          currency: 'ETH',
          category: 'nft',
          images: ['https://suspicious-site.com/fake-bayc.jpg'],
          isHighValue: false,
          sellerAddress: '0x0000000000000000000000000000000000000001'
        },
        text: 'FREE BORED APE GIVEAWAY - CLAIM NOW!!! Connect your wallet and provide your 12 word seed phrase to claim your free Bored Ape NFT! Limited time offer, only 24 hours left!'
      };

      const result = await service.moderateMarketplaceListing(scamListing);

      expect(result.overallDecision).toBe('block');
      expect(result.scamDetection.isScam).toBe(true);
      expect(result.scamDetection.detectedPatterns).toContain('fake_giveaway');
      expect(result.scamDetection.detectedPatterns).toContain('seed_phrase');
      expect(result.scamDetection.detectedPatterns).toContain('fake_urgency');
      expect(result.sellerVerification.riskLevel).toBe('critical');
      expect(result.requiredActions).toContain('listing_blocked');
      expect(result.riskScore).toBeGreaterThan(0.8);
    });

    it('should flag counterfeit luxury goods', async () => {
      const counterfeitListing: MarketplaceListingInput = {
        id: 'counterfeit_listing_001',
        type: 'listing',
        userId: 'new_seller_001',
        userReputation: 30,
        walletAddress: '0x1111111111111111111111111111111111111111',
        metadata: {},
        listingData: {
          title: 'Replica Louis Vuitton Handbag - AAA Quality',
          description: 'High quality replica Louis Vuitton handbag, looks exactly like the original. Not authentic but great quality copy.',
          price: '150',
          currency: 'USD',
          category: 'fashion',
          images: ['https://replica-site.com/lv-bag.jpg'],
          brandKeywords: ['louis vuitton', 'lv'],
          isHighValue: false,
          sellerAddress: '0x1111111111111111111111111111111111111111'
        },
        text: 'Replica Louis Vuitton Handbag - AAA Quality High quality replica Louis Vuitton handbag, looks exactly like the original. Not authentic but great quality copy.'
      };

      const result = await service.moderateMarketplaceListing(counterfeitListing);

      expect(result.overallDecision).toBe('block');
      expect(result.counterfeitDetection.isCounterfeit).toBe(true);
      expect(result.counterfeitDetection.matchedBrands).toContain('louis vuitton');
      expect(result.counterfeitDetection.confidence).toBeGreaterThan(0.7);
      expect(result.sellerVerification.tier).toBe('new');
      expect(result.requiredActions).toContain('listing_blocked');
    });

    it('should require review for new seller with high-value item', async () => {
      const newSellerHighValue: MarketplaceListingInput = {
        id: 'new_seller_high_value_001',
        type: 'listing',
        userId: 'new_user_001',
        userReputation: 0,
        walletAddress: '0x2222222222222222222222222222222222222222',
        metadata: {},
        listingData: {
          title: 'Rolex Submariner Watch',
          description: 'Authentic Rolex Submariner in excellent condition, comes with original box and papers',
          price: '8500',
          currency: 'USD',
          category: 'luxury',
          images: ['https://example.com/rolex-submariner.jpg'],
          isHighValue: true,
          sellerAddress: '0x2222222222222222222222222222222222222222'
        },
        text: 'Rolex Submariner Watch Authentic Rolex Submariner in excellent condition, comes with original box and papers'
      };

      const result = await service.moderateMarketplaceListing(newSellerHighValue);

      expect(result.overallDecision).toBe('review');
      expect(result.sellerVerification.tier).toBe('new');
      expect(result.sellerVerification.riskLevel).toBe('critical');
      expect(result.requiredActions).toContain('human_review_required');
      expect(result.requiredActions).toContain('identity_verification');
      expect(result.requiredActions).toContain('enhanced_kyc');
      expect(result.riskScore).toBeGreaterThan(0.6);
    });

    it('should allow legitimate listing from trusted seller', async () => {
      const trustedSellerListing: MarketplaceListingInput = {
        id: 'trusted_seller_001',
        type: 'listing',
        userId: 'trusted_user_001',
        userReputation: 95,
        walletAddress: '0x3333333333333333333333333333333333333333',
        metadata: { verified_business: true },
        listingData: {
          title: 'Apple iPhone 15 Pro - Brand New',
          description: 'Brand new Apple iPhone 15 Pro, factory sealed, comes with full warranty',
          price: '999',
          currency: 'USD',
          category: 'electronics',
          images: ['https://apple.com/iphone15pro.jpg'],
          isHighValue: false,
          sellerAddress: '0x3333333333333333333333333333333333333333'
        },
        text: 'Apple iPhone 15 Pro - Brand New Brand new Apple iPhone 15 Pro, factory sealed, comes with full warranty'
      };

      const result = await service.moderateMarketplaceListing(trustedSellerListing);

      expect(result.overallDecision).toBe('allow');
      expect(result.sellerVerification.tier).toBe('platinum');
      expect(result.sellerVerification.riskLevel).toBe('low');
      expect(result.counterfeitDetection.isCounterfeit).toBe(false);
      expect(result.scamDetection.isScam).toBe(false);
      expect(result.requiredActions).toHaveLength(0);
      expect(result.riskScore).toBeLessThan(0.3);
    });

    it('should detect suspicious pricing patterns', async () => {
      const suspiciousPricing: MarketplaceListingInput = {
        id: 'suspicious_pricing_001',
        type: 'listing',
        userId: 'user_001',
        userReputation: 50,
        walletAddress: '0x4444444444444444444444444444444444444444',
        metadata: {},
        listingData: {
          title: 'Rare Bored Ape Yacht Club NFT #1',
          description: 'Authentic BAYC NFT, very rare traits, quick sale needed',
          price: '0.01',
          currency: 'ETH',
          category: 'nft',
          images: ['https://example.com/bayc1.jpg'],
          isHighValue: true,
          sellerAddress: '0x4444444444444444444444444444444444444444'
        },
        text: 'Rare Bored Ape Yacht Club NFT #1 Authentic BAYC NFT, very rare traits, quick sale needed'
      };

      const result = await service.moderateMarketplaceListing(suspiciousPricing);

      expect(result.scamDetection.detectedPatterns).toContain('suspicious_pricing');
      expect(result.scamDetection.riskFactors).toContain('unrealistic_low_price');
      expect(result.overallDecision).toBeOneOf(['review', 'block']);
      expect(result.riskScore).toBeGreaterThan(0.5);
    });

    it('should handle mixed risk factors appropriately', async () => {
      const mixedRiskListing: MarketplaceListingInput = {
        id: 'mixed_risk_001',
        type: 'listing',
        userId: 'medium_user_001',
        userReputation: 60,
        walletAddress: '0x5555555555555555555555555555555555555555',
        metadata: {},
        listingData: {
          title: 'Nike Air Jordan Inspired Sneakers',
          description: 'High quality sneakers inspired by Nike Air Jordan design, great for basketball',
          price: '80',
          currency: 'USD',
          category: 'footwear',
          images: ['https://example.com/inspired-jordans.jpg'],
          brandKeywords: ['nike', 'jordan'],
          isHighValue: false,
          sellerAddress: '0x5555555555555555555555555555555555555555'
        },
        text: 'Nike Air Jordan Inspired Sneakers High quality sneakers inspired by Nike Air Jordan design, great for basketball'
      };

      const result = await service.moderateMarketplaceListing(mixedRiskListing);

      // Should detect potential trademark issues but not be as severe as outright counterfeits
      expect(result.counterfeitDetection.matchedBrands).toContain('nike');
      expect(result.overallDecision).toBeOneOf(['allow', 'review']);
      expect(result.riskScore).toBeGreaterThan(0.3);
      expect(result.riskScore).toBeLessThan(0.8);
    });
  });

  describe('Performance and Error Handling', () => {
    it('should complete moderation within reasonable time', async () => {
      const startTime = Date.now();
      
      const listing: MarketplaceListingInput = {
        id: 'performance_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x6666666666666666666666666666666666666666',
        metadata: {},
        listingData: {
          title: 'Test Product',
          description: 'Test product for performance testing',
          price: '100',
          currency: 'USD',
          category: 'test',
          images: ['https://example.com/test.jpg'],
          isHighValue: false,
          sellerAddress: '0x6666666666666666666666666666666666666666'
        },
        text: 'Test Product Test product for performance testing'
      };

      const result = await service.moderateMarketplaceListing(listing);
      const endTime = Date.now();
      const processingTime = endTime - startTime;

      expect(result).toBeDefined();
      expect(result.listingId).toBe('performance_test_001');
      expect(processingTime).toBeLessThan(10000); // Should complete within 10 seconds
    });

    it('should handle malformed input gracefully', async () => {
      const malformedListing: MarketplaceListingInput = {
        id: 'malformed_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x7777777777777777777777777777777777777777',
        metadata: {},
        listingData: {
          title: '', // Empty title
          description: 'A'.repeat(10000), // Very long description
          price: 'invalid_price',
          currency: '',
          category: 'test',
          images: ['not_a_url', 'https://example.com/valid.jpg'],
          isHighValue: false,
          sellerAddress: '0x7777777777777777777777777777777777777777'
        },
        text: 'A'.repeat(10000)
      };

      const result = await service.moderateMarketplaceListing(malformedListing);

      expect(result).toBeDefined();
      expect(result.overallDecision).toBe('review'); // Should default to review for safety
      expect(result.riskScore).toBeGreaterThan(0.5);
    });
  });

  // Helper function to extend Jest matchers
  beforeAll(() => {
    expect.extend({
      toBeOneOf(received: any, expected: any[]) {
        const pass = expected.includes(received);
        if (pass) {
          return {
            message: () => `expected ${received} not to be one of ${expected}`,
            pass: true,
          };
        } else {
          return {
            message: () => `expected ${received} to be one of ${expected}`,
            pass: false,
          };
        }
      },
    });
  });
});

// Extend Jest matchers type
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}