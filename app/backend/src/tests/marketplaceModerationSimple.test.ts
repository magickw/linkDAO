import { MarketplaceModerationService, MarketplaceListingInput } from '../services/marketplaceModerationService';

describe('Marketplace Moderation Simple Tests', () => {
  let service: MarketplaceModerationService;

  beforeEach(() => {
    service = new MarketplaceModerationService();
  });

  describe('Scam Pattern Detection', () => {
    it('should detect seed phrase scam patterns', async () => {
      const scamListing: MarketplaceListingInput = {
        id: 'scam_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: 'FREE NFT GIVEAWAY',
          description: 'Connect your wallet and provide your 12 word seed phrase to claim',
          price: '0',
          currency: 'ETH',
          category: 'nft',
          images: ['https://example.com/fake.jpg'],
          isHighValue: false,
          sellerAddress: '0x1234567890123456789012345678901234567890'
        },
        text: 'FREE NFT GIVEAWAY Connect your wallet and provide your 12 word seed phrase to claim'
      };

      const result = await service.moderateMarketplaceListing(scamListing);

      expect(result).toBeDefined();
      expect(result.listingId).toBe('scam_test_001');
      expect(result.scamDetection.isScam).toBe(true);
      expect(result.scamDetection.detectedPatterns).toContain('fake_giveaway');
      expect(result.overallDecision).toBe('block');
    });

    it('should detect counterfeit brand patterns', async () => {
      const counterfeitListing: MarketplaceListingInput = {
        id: 'counterfeit_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: 'Replica Gucci Handbag',
          description: 'High quality replica Gucci bag, not authentic',
          price: '150',
          currency: 'USD',
          category: 'fashion',
          images: ['https://example.com/replica.jpg'],
          isHighValue: false,
          sellerAddress: '0x1234567890123456789012345678901234567890'
        },
        text: 'Replica Gucci Handbag High quality replica Gucci bag, not authentic'
      };

      const result = await service.moderateMarketplaceListing(counterfeitListing);

      expect(result).toBeDefined();
      expect(result.listingId).toBe('counterfeit_test_001');
      expect(result.counterfeitDetection.isCounterfeit).toBe(true);
      expect(result.counterfeitDetection.matchedBrands).toContain('gucci');
      expect(result.overallDecision).toBe('block');
    });

    it('should allow legitimate listings', async () => {
      const legitimateListing: MarketplaceListingInput = {
        id: 'legitimate_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 80,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: 'Handmade Wooden Table',
          description: 'Beautiful handcrafted wooden dining table, excellent condition',
          price: '300',
          currency: 'USD',
          category: 'furniture',
          images: ['https://example.com/table.jpg'],
          isHighValue: false,
          sellerAddress: '0x1234567890123456789012345678901234567890'
        },
        text: 'Handmade Wooden Table Beautiful handcrafted wooden dining table, excellent condition'
      };

      const result = await service.moderateMarketplaceListing(legitimateListing);

      expect(result).toBeDefined();
      expect(result.listingId).toBe('legitimate_test_001');
      expect(result.scamDetection.isScam).toBe(false);
      expect(result.counterfeitDetection.isCounterfeit).toBe(false);
      expect(result.overallDecision).toBe('allow');
    });

    it('should detect suspicious pricing patterns', async () => {
      const suspiciousPricingListing: MarketplaceListingInput = {
        id: 'suspicious_pricing_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: 'Rare CryptoPunk NFT',
          description: 'Authentic rare CryptoPunk NFT, quick sale needed',
          price: '0.001',
          currency: 'ETH',
          category: 'nft',
          images: ['https://example.com/cryptopunk.jpg'],
          isHighValue: true,
          sellerAddress: '0x1234567890123456789012345678901234567890'
        },
        text: 'Rare CryptoPunk NFT Authentic rare CryptoPunk NFT, quick sale needed'
      };

      const result = await service.moderateMarketplaceListing(suspiciousPricingListing);

      expect(result).toBeDefined();
      expect(result.listingId).toBe('suspicious_pricing_001');
      expect(result.scamDetection.detectedPatterns).toContain('suspicious_pricing');
      expect(result.scamDetection.riskFactors).toContain('unrealistic_low_price');
      expect(['review', 'block']).toContain(result.overallDecision);
    });

    it('should handle error cases gracefully', async () => {
      const malformedListing: MarketplaceListingInput = {
        id: 'error_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: '',
          description: 'A'.repeat(10000), // Very long description
          price: 'invalid_price',
          currency: '',
          category: 'test',
          images: [],
          isHighValue: false,
          sellerAddress: '0x1234567890123456789012345678901234567890'
        },
        text: 'A'.repeat(10000)
      };

      const result = await service.moderateMarketplaceListing(malformedListing);

      expect(result).toBeDefined();
      expect(result.listingId).toBe('error_test_001');
      expect(result.overallDecision).toBe('review'); // Should default to review for safety
    });
  });

  describe('Performance Tests', () => {
    it('should complete moderation within reasonable time', async () => {
      const startTime = Date.now();
      
      const listing: MarketplaceListingInput = {
        id: 'performance_test_001',
        type: 'listing',
        userId: 'test_user',
        userReputation: 50,
        walletAddress: '0x1234567890123456789012345678901234567890',
        metadata: {},
        listingData: {
          title: 'Test Product',
          description: 'Test product for performance testing',
          price: '100',
          currency: 'USD',
          category: 'test',
          images: ['https://example.com/test.jpg'],
          isHighValue: false,
          sellerAddress: '0x1234567890123456789012345678901234567890'
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
  });
});