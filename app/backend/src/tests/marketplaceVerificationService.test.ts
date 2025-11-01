import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { MarketplaceVerificationService, ProofOfOwnership } from '../services/marketplaceVerificationService';
import { ethers } from 'ethers';

// Mock the database
vi.mock('../db/index.js', () => ({
  db: {
    select: vi.fn().mockReturnThis(),
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
  }
}));

describe('MarketplaceVerificationService', () => {
  let service: MarketplaceVerificationService;
  let mockDb: any;

  beforeEach(() => {
    service = new MarketplaceVerificationService();
    mockDb = (await import('../db/index.js')).db;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('verifyHighValueListing', () => {
    it('should return basic verification for low-value listings', async () => {
      const result = await service.verifyHighValueListing(
        'listing-1',
        '0x123',
        100, // $100 USD
        0.05 // 0.05 ETH
      );

      expect(result.verified).toBe(true);
      expect(result.tier).toBe('basic');
      expect(result.score).toBe(100);
      expect(result.requirements).toHaveLength(0);
    });

    it('should require enhanced verification for high-value listings', async () => {
      // Mock database responses
      mockDb.limit.mockResolvedValueOnce([{ score: 500 }]); // reputation
      mockDb.limit.mockResolvedValueOnce([{ kycVerified: false }]); // KYC status

      const result = await service.verifyHighValueListing(
        'listing-1',
        '0x123',
        15000, // $15k USD (high value)
        8 // 8 ETH (high value)
      );

      expect(result.verified).toBe(false);
      expect(result.requirements).toContain('KYC verification required for high-value listings');
      expect(result.requirements).toContain('Proof of ownership signature required');
    });

    it('should give enterprise tier for high reputation + KYC + ownership proof', async () => {
      // Mock database responses
      mockDb.limit.mockResolvedValueOnce([{ score: 900 }]); // high reputation
      mockDb.limit.mockResolvedValueOnce([{ kycVerified: true }]); // KYC verified

      // Mock ownership proof validation
      vi.spyOn(service as any, 'validateOwnershipProof').mockResolvedValue(true);

      const result = await service.verifyHighValueListing(
        'listing-1',
        '0x123',
        15000,
        8
      );

      expect(result.verified).toBe(true);
      expect(result.tier).toBe('enterprise');
      expect(result.score).toBeGreaterThanOrEqual(85);
    });
  });

  describe('detectCounterfeit', () => {
    it('should not flag listings without brand keywords', async () => {
      const result = await service.detectCounterfeit(
        'My Original Art',
        'This is my original digital artwork',
        {}
      );

      expect(result.isCounterfeit).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.brandMatches).toHaveLength(0);
    });

    it('should flag potential counterfeits with brand keywords and suspicious patterns', async () => {
      const result = await service.detectCounterfeit(
        'Nike Air Jordan Replica',
        'Unofficial Nike inspired sneaker design, similar to authentic Air Jordans but much cheaper at $50',
        {}
      );

      expect(result.isCounterfeit).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(60);
      expect(result.brandMatches).toContain('nike');
    });

    it('should have lower confidence for official branded items', async () => {
      const result = await service.detectCounterfeit(
        'Official Nike Air Jordan NFT',
        'Authentic Nike Air Jordan digital collectible, officially licensed and verified',
        {}
      );

      expect(result.isCounterfeit).toBe(false);
      expect(result.brandMatches).toContain('nike');
      expect(result.confidence).toBeLessThan(60);
    });
  });

  describe('verifyProofOfOwnership', () => {
    it('should verify valid ownership proof', async () => {
      // Create a test wallet and sign a message
      const wallet = ethers.Wallet.createRandom();
      const timestamp = Date.now();
      const message = `I own NFT 123 from contract 0xabc at ${timestamp}`;
      const signature = await wallet.signMessage(message);

      const proof: ProofOfOwnership = {
        signature,
        message,
        walletAddress: wallet.address,
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp
      };

      const result = await service.verifyProofOfOwnership(proof);
      expect(result).toBe(true);
    });

    it('should reject proof with invalid signature', async () => {
      const wallet = ethers.Wallet.createRandom();
      const timestamp = Date.now();
      const message = `I own NFT 123 from contract 0xabc at ${timestamp}`;

      const proof: ProofOfOwnership = {
        signature: '0xinvalidsignature',
        message,
        walletAddress: wallet.address,
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp
      };

      const result = await service.verifyProofOfOwnership(proof);
      expect(result).toBe(false);
    });

    it('should reject expired proof (older than 1 hour)', async () => {
      const wallet = ethers.Wallet.createRandom();
      const timestamp = Date.now() - (2 * 60 * 60 * 1000); // 2 hours ago
      const message = `I own NFT 123 from contract 0xabc at ${timestamp}`;
      const signature = await wallet.signMessage(message);

      const proof: ProofOfOwnership = {
        signature,
        message,
        walletAddress: wallet.address,
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp
      };

      const result = await service.verifyProofOfOwnership(proof);
      expect(result).toBe(false);
    });

    it('should reject proof with mismatched message', async () => {
      const wallet = ethers.Wallet.createRandom();
      const timestamp = Date.now();
      const correctMessage = `I own NFT 123 from contract 0xabc at ${timestamp}`;
      const wrongMessage = `I own NFT 456 from contract 0xdef at ${timestamp}`;
      const signature = await wallet.signMessage(correctMessage);

      const proof: ProofOfOwnership = {
        signature,
        message: wrongMessage,
        walletAddress: wallet.address,
        tokenId: '456',
        contractAddress: '0xdef',
        timestamp
      };

      const result = await service.verifyProofOfOwnership(proof);
      expect(result).toBe(false);
    });
  });

  describe('getSellerVerificationTier', () => {
    it('should return basic tier for new sellers', async () => {
      // Mock database responses for new seller
      mockDb.limit.mockResolvedValueOnce([{ score: 50 }]); // low reputation
      mockDb.limit.mockResolvedValueOnce([{ kycVerified: false }]); // no KYC

      // Mock transaction history
      vi.spyOn(service as any, 'getTransactionHistory').mockResolvedValue({
        successfulSales: 1,
        disputeRate: 0,
        totalVolume: 100
      });

      const result = await service.getSellerVerificationTier('0x123');

      expect(result.tier).toBe('basic');
      expect(result.verified).toBe(false);
      expect(result.requirements).toContain('Complete KYC verification');
    });

    it('should return premium tier for established sellers with KYC', async () => {
      // Mock database responses for established seller
      mockDb.limit.mockResolvedValueOnce([{ score: 750 }]); // high reputation
      mockDb.limit.mockResolvedValueOnce([{ kycVerified: true }]); // KYC verified

      // Mock transaction history
      vi.spyOn(service as any, 'getTransactionHistory').mockResolvedValue({
        successfulSales: 25,
        disputeRate: 0.02,
        totalVolume: 50000
      });

      const result = await service.getSellerVerificationTier('0x123');

      expect(result.tier).toBe('premium');
      expect(result.verified).toBe(true);
      expect(result.score).toBeGreaterThanOrEqual(70);
    });

    it('should penalize sellers with high dispute rates', async () => {
      // Mock database responses
      mockDb.limit.mockResolvedValueOnce([{ score: 600 }]); // decent reputation
      mockDb.limit.mockResolvedValueOnce([{ kycVerified: true }]); // KYC verified

      // Mock transaction history with high dispute rate
      vi.spyOn(service as any, 'getTransactionHistory').mockResolvedValue({
        successfulSales: 20,
        disputeRate: 0.25, // 25% dispute rate
        totalVolume: 30000
      });

      const result = await service.getSellerVerificationTier('0x123');

      expect(result.warnings).toContain('High dispute rate detected');
      expect(result.score).toBeLessThan(70); // Should be penalized
    });
  });

  describe('detectScamPatterns', () => {
    it('should not flag legitimate listings', () => {
      const result = service.detectScamPatterns(
        'Rare Digital Art Collection',
        'Beautiful hand-crafted digital artwork by established artist',
        1.5, // reasonable price
        500 // decent reputation
      );

      expect(result.isScam).toBe(false);
      expect(result.confidence).toBeLessThan(70);
      expect(result.patterns).toHaveLength(0);
    });

    it('should flag obvious scam patterns', () => {
      const result = service.detectScamPatterns(
        'FREE NFT AIRDROP - LIMITED TIME OFFER!',
        'Click here to claim your free NFT! Guaranteed profit! Send 1 ETH get 2 ETH back!',
        0.0001, // suspiciously low price
        10 // very low reputation
      );

      expect(result.isScam).toBe(true);
      expect(result.confidence).toBeGreaterThanOrEqual(70);
      expect(result.patterns.length).toBeGreaterThan(0);
    });

    it('should flag new sellers with high-value items', () => {
      const result = service.detectScamPatterns(
        'Rare Bored Ape',
        'Authentic Bored Ape Yacht Club NFT for sale',
        50, // very high price
        25 // very low reputation (new seller)
      );

      expect(result.patterns).toContain('New seller with high-value listing');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should flag urgency manipulation tactics', () => {
      const result = service.detectScamPatterns(
        'ACT FAST - Only 3 left!',
        'Hurry! This offer expires soon! Last chance to buy!',
        2,
        200
      );

      expect(result.patterns).toContain('Urgency manipulation');
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should flag suspicious shortened links', () => {
      const result = service.detectScamPatterns(
        'Check out my collection',
        'Visit bit.ly/scamlink for more details about this amazing NFT',
        1,
        300
      );

      expect(result.patterns).toContain('Suspicious shortened links');
      expect(result.confidence).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Mock database error
      mockDb.limit.mockRejectedValue(new Error('Database connection failed'));

      const result = await service.verifyHighValueListing(
        'listing-1',
        '0x123',
        15000,
        8
      );

      // Should still return a result, not throw
      expect(result).toBeDefined();
      expect(result.verified).toBe(false);
    });

    it('should handle invalid Ethereum addresses in ownership proof', async () => {
      const proof: ProofOfOwnership = {
        signature: '0xinvalid',
        message: 'test message',
        walletAddress: 'invalid-address',
        tokenId: '123',
        contractAddress: '0xabc',
        timestamp: Date.now()
      };

      const result = await service.verifyProofOfOwnership(proof);
      expect(result).toBe(false);
    });

    it('should handle empty or null inputs', async () => {
      const result = await service.detectCounterfeit('', '', null);
      
      expect(result.isCounterfeit).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.brandMatches).toHaveLength(0);
    });

    it('should handle extreme price values', () => {
      const result = service.detectScamPatterns(
        'Test NFT',
        'Test description',
        Number.MAX_SAFE_INTEGER,
        0
      );

      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
      expect(result.confidence).toBeLessThanOrEqual(95);
    });
  });
});
