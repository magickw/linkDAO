import {
  validateUserProfile,
  validateUpdateUserProfile,
  validateCreateListing,
  validateUpdateListing,
  validatePlaceBid,
  validateMakeOffer,
  validateCreateOrder,
  validateCreateEscrow,
  validateCreateDispute,
  validateReputation,
  validateReview,
  ValidationHelper,
  ValidationError
} from '../models/validation';

describe('Validation Tests', () => {
  describe('User Profile Validation', () => {
    it('should validate a correct user profile', () => {
      const validProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'testuser123',
        ens: 'testuser.eth',
        avatarCid: 'QmTest123',
        bioCid: 'QmBio456'
      };

      expect(() => validateUserProfile(validProfile)).not.toThrow();
    });

    it('should reject invalid Ethereum address', () => {
      const invalidProfile = {
        walletAddress: '0xinvalid',
        handle: 'testuser123'
      };

      expect(() => validateUserProfile(invalidProfile)).toThrow(ValidationError);
    });

    it('should reject handle with invalid characters', () => {
      const invalidProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'test user!'
      };

      expect(() => validateUserProfile(invalidProfile)).toThrow();
    });

    it('should reject handle that is too long', () => {
      const invalidProfile = {
        walletAddress: '0x1234567890123456789012345678901234567890',
        handle: 'a'.repeat(65)
      };

      expect(() => validateUserProfile(invalidProfile)).toThrow();
    });

    it('should validate partial update profile', () => {
      const updateData = {
        handle: 'newhandle'
      };

      expect(() => validateUpdateUserProfile(updateData)).not.toThrow();
    });
  });

  describe('Listing Validation', () => {
    it('should validate a correct fixed price listing', () => {
      const validListing = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '100.50',
        quantity: 5,
        itemType: 'PHYSICAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/metadata.json'
      };

      expect(() => validateCreateListing(validListing)).not.toThrow();
    });

    it('should validate a correct auction listing', () => {
      const validAuction = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '100.00',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'AUCTION' as const,
        metadataURI: 'https://example.com/metadata.json',
        reservePrice: '50.00',
        minIncrement: '5.00',
        duration: 86400
      };

      expect(() => validateCreateListing(validAuction)).not.toThrow();
    });

    it('should validate NFT listing with required fields', () => {
      const validNFT = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '1.0',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/metadata.json',
        nftStandard: 'ERC721' as const,
        tokenId: '123'
      };

      expect(() => validateCreateListing(validNFT)).not.toThrow();
    });

    it('should reject NFT listing without nftStandard', () => {
      const invalidNFT = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '1.0',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/metadata.json'
      };

      expect(() => validateCreateListing(invalidNFT)).toThrow();
    });

    it('should reject auction without reserve price', () => {
      const invalidAuction = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '100.00',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'AUCTION' as const,
        metadataURI: 'https://example.com/metadata.json'
      };

      expect(() => validateCreateListing(invalidAuction)).toThrow();
    });

    it('should reject negative price', () => {
      const invalidListing = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '-10.00',
        quantity: 1,
        itemType: 'PHYSICAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/metadata.json'
      };

      expect(() => validateCreateListing(invalidListing)).toThrow();
    });

    it('should reject zero quantity', () => {
      const invalidListing = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '10.00',
        quantity: 0,
        itemType: 'PHYSICAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/metadata.json'
      };

      expect(() => validateCreateListing(invalidListing)).toThrow();
    });

    it('should reject invalid metadata URI', () => {
      const invalidListing = {
        sellerWalletAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0987654321098765432109876543210987654321',
        price: '10.00',
        quantity: 1,
        itemType: 'PHYSICAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'not-a-url'
      };

      expect(() => validateCreateListing(invalidListing)).toThrow();
    });
  });

  describe('Bid Validation', () => {
    it('should validate a correct bid', () => {
      const validBid = {
        bidderWalletAddress: '0x1234567890123456789012345678901234567890',
        amount: '150.75'
      };

      expect(() => validatePlaceBid(validBid)).not.toThrow();
    });

    it('should reject invalid bidder address', () => {
      const invalidBid = {
        bidderWalletAddress: 'invalid-address',
        amount: '150.75'
      };

      expect(() => validatePlaceBid(invalidBid)).toThrow();
    });

    it('should reject negative bid amount', () => {
      const invalidBid = {
        bidderWalletAddress: '0x1234567890123456789012345678901234567890',
        amount: '-10.00'
      };

      expect(() => validatePlaceBid(invalidBid)).toThrow();
    });
  });

  describe('Order Validation', () => {
    it('should validate a correct order', () => {
      const validOrder = {
        listingId: '123',
        buyerWalletAddress: '0x1234567890123456789012345678901234567890',
        sellerWalletAddress: '0x0987654321098765432109876543210987654321',
        amount: '100.00',
        paymentToken: '0x1111111111111111111111111111111111111111'
      };

      expect(() => validateCreateOrder(validOrder)).not.toThrow();
    });

    it('should reject invalid listing ID', () => {
      const invalidOrder = {
        listingId: 'abc',
        buyerWalletAddress: '0x1234567890123456789012345678901234567890',
        sellerWalletAddress: '0x0987654321098765432109876543210987654321',
        amount: '100.00',
        paymentToken: '0x1111111111111111111111111111111111111111'
      };

      expect(() => validateCreateOrder(invalidOrder)).toThrow();
    });
  });

  describe('Dispute Validation', () => {
    it('should validate a correct dispute', () => {
      const validDispute = {
        escrowId: '456',
        reporterWalletAddress: '0x1234567890123456789012345678901234567890',
        reason: 'Product not as described in the listing',
        evidence: ['https://example.com/evidence1.jpg', 'https://example.com/evidence2.pdf']
      };

      expect(() => validateCreateDispute(validDispute)).not.toThrow();
    });

    it('should reject dispute with short reason', () => {
      const invalidDispute = {
        escrowId: '456',
        reporterWalletAddress: '0x1234567890123456789012345678901234567890',
        reason: 'Bad'
      };

      expect(() => validateCreateDispute(invalidDispute)).toThrow();
    });

    it('should reject dispute with too many evidence items', () => {
      const invalidDispute = {
        escrowId: '456',
        reporterWalletAddress: '0x1234567890123456789012345678901234567890',
        reason: 'Product not as described',
        evidence: Array(15).fill('https://example.com/evidence.jpg')
      };

      expect(() => validateCreateDispute(invalidDispute)).toThrow();
    });
  });

  describe('ValidationHelper', () => {
    describe('validateEthereumAddress', () => {
      it('should validate correct Ethereum addresses', () => {
        expect(ValidationHelper.validateEthereumAddress('0x1234567890123456789012345678901234567890')).toBe(true);
        expect(ValidationHelper.validateEthereumAddress('0xAbCdEf1234567890123456789012345678901234')).toBe(true);
      });

      it('should reject invalid Ethereum addresses', () => {
        expect(ValidationHelper.validateEthereumAddress('0x123')).toBe(false);
        expect(ValidationHelper.validateEthereumAddress('1234567890123456789012345678901234567890')).toBe(false);
        expect(ValidationHelper.validateEthereumAddress('0xGHIJ567890123456789012345678901234567890')).toBe(false);
      });
    });

    describe('validatePrice', () => {
      it('should validate correct prices', () => {
        expect(ValidationHelper.validatePrice('100')).toBe(true);
        expect(ValidationHelper.validatePrice('100.50')).toBe(true);
        expect(ValidationHelper.validatePrice('0.001')).toBe(true);
      });

      it('should reject invalid prices', () => {
        expect(ValidationHelper.validatePrice('-100')).toBe(false);
        expect(ValidationHelper.validatePrice('0')).toBe(false);
        expect(ValidationHelper.validatePrice('abc')).toBe(false);
        expect(ValidationHelper.validatePrice('100.50.25')).toBe(false);
      });
    });

    describe('validateURL', () => {
      it('should validate correct URLs', () => {
        expect(ValidationHelper.validateURL('https://example.com')).toBe(true);
        expect(ValidationHelper.validateURL('http://localhost:3000')).toBe(true);
        expect(ValidationHelper.validateURL('https://ipfs.io/ipfs/QmHash')).toBe(true);
      });

      it('should reject invalid URLs', () => {
        expect(ValidationHelper.validateURL('not-a-url')).toBe(false);
        expect(ValidationHelper.validateURL('')).toBe(false);
      });
    });

    describe('validateTokenId', () => {
      it('should validate correct token IDs', () => {
        expect(ValidationHelper.validateTokenId('123')).toBe(true);
        expect(ValidationHelper.validateTokenId('0x1a2b3c')).toBe(true);
        expect(ValidationHelper.validateTokenId('1a2b3c')).toBe(true);
      });

      it('should reject invalid token IDs', () => {
        expect(ValidationHelper.validateTokenId('xyz')).toBe(false);
        expect(ValidationHelper.validateTokenId('0xGHI')).toBe(false);
        expect(ValidationHelper.validateTokenId('a'.repeat(80))).toBe(false);
      });
    });

    describe('validateQuantity', () => {
      it('should validate correct quantities', () => {
        expect(ValidationHelper.validateQuantity(1)).toBe(true);
        expect(ValidationHelper.validateQuantity(100)).toBe(true);
        expect(ValidationHelper.validateQuantity(1000)).toBe(true);
      });

      it('should reject invalid quantities', () => {
        expect(ValidationHelper.validateQuantity(0)).toBe(false);
        expect(ValidationHelper.validateQuantity(-1)).toBe(false);
        expect(ValidationHelper.validateQuantity(1.5)).toBe(false);
        expect(ValidationHelper.validateQuantity(1000001)).toBe(false);
      });
    });

    describe('sanitizeString', () => {
      it('should sanitize strings correctly', () => {
        expect(ValidationHelper.sanitizeString('  hello world  ')).toBe('hello world');
        expect(ValidationHelper.sanitizeString('<script>alert("xss")</script>')).toBe('scriptalert("xss")/script');
        expect(ValidationHelper.sanitizeString('a'.repeat(1500), 1000)).toBe('a'.repeat(1000));
      });
    });
  });

  describe('ValidationError', () => {
    it('should create validation error with correct properties', () => {
      const error = new ValidationError('Test error', 'testField', 'TEST_CODE');
      
      expect(error.message).toBe('Test error');
      expect(error.field).toBe('testField');
      expect(error.code).toBe('TEST_CODE');
      expect(error.name).toBe('ValidationError');
    });

    it('should use default code when not provided', () => {
      const error = new ValidationError('Test error', 'testField');
      
      expect(error.code).toBe('VALIDATION_ERROR');
    });
  });
});
