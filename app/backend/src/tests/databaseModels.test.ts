import { db } from '../db';
import * as schema from '../db/schema';
import { eq } from 'drizzle-orm';
import { ValidationHelper } from '../models/validation';

describe('Database Models Tests', () => {
  // Test data
  const testUser = {
    walletAddress: '0x1234567890123456789012345678901234567890',
    handle: 'testuser123',
    profileCid: 'QmTestProfile123'
  };

  const testListing = {
    tokenAddress: '0x0987654321098765432109876543210987654321',
    price: '100.50',
    quantity: 5,
    itemType: 'PHYSICAL' as const,
    listingType: 'FIXED_PRICE' as const,
    metadataURI: 'https://example.com/metadata.json',
    isEscrowed: false
  };

  describe('User Model', () => {
    let createdUserId: string;

    it('should create a user with valid data', async () => {
      const result = await db.insert(schema.users).values(testUser).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].walletAddress).toBe(testUser.walletAddress);
      expect(result[0].handle).toBe(testUser.handle);
      expect(result[0].profileCid).toBe(testUser.profileCid);
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();

      createdUserId = result[0].id;
    });

    it('should enforce unique address constraint', async () => {
      await expect(
        db.insert(schema.users).values(testUser)
      ).rejects.toThrow();
    });

    it('should enforce unique handle constraint', async () => {
      const duplicateHandleUser = {
        walletAddress: '0x9999999999999999999999999999999999999999',
        handle: testUser.handle
      };

      await expect(
        db.insert(schema.users).values(duplicateHandleUser)
      ).rejects.toThrow();
    });

    it('should retrieve user by wallet address', async () => {
      const result = await db.select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, testUser.walletAddress));

      expect(result).toHaveLength(1);
      expect(result[0].walletAddress).toBe(testUser.walletAddress);
    });

    it('should retrieve user by ID', async () => {
      const result = await db.select()
        .from(schema.users)
        .where(eq(schema.users.id, createdUserId));

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(createdUserId);
    });

    it('should update user profile', async () => {
      const newHandle = 'updatedhandle';
      
      const result = await db.update(schema.users)
        .set({ handle: newHandle })
        .where(eq(schema.users.id, createdUserId))
        .returning();

      expect(result[0].handle).toBe(newHandle);
    });

    afterAll(async () => {
      // Cleanup
      if (createdUserId) {
        await db.delete(schema.users).where(eq(schema.users.id, createdUserId));
      }
    });
  });

  describe('Listing Model', () => {
    let createdUserId: string;
    let createdListingId: number;

    beforeAll(async () => {
      // Create a test user first
      const userResult = await db.insert(schema.users).values({
        walletAddress: '0x1111111111111111111111111111111111111111',
        handle: 'listinguser'
      }).returning();
      createdUserId = userResult[0].id;
    });

    it('should create a listing with valid data', async () => {
      const listingData = {
        ...testListing,
        sellerId: createdUserId
      };

      const result = await db.insert(schema.listings).values(listingData).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].sellerId).toBe(createdUserId);
      expect(result[0].tokenAddress).toBe(testListing.tokenAddress);
      expect(result[0].price).toBe(testListing.price);
      expect(result[0].quantity).toBe(testListing.quantity);
      expect(result[0].itemType).toBe(testListing.itemType);
      expect(result[0].listingType).toBe(testListing.listingType);
      expect(result[0].status).toBe('active'); // Default status
      expect(result[0].id).toBeDefined();
      expect(result[0].createdAt).toBeDefined();

      createdListingId = result[0].id;
    });

    it('should create NFT listing with required fields', async () => {
      const nftListing = {
        sellerId: createdUserId,
        tokenAddress: '0x2222222222222222222222222222222222222222',
        price: '1.0',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'https://example.com/nft-metadata.json',
        nftStandard: 'ERC721' as const,
        tokenId: '123',
        isEscrowed: false
      };

      const result = await db.insert(schema.listings).values(nftListing).returning();
      
      expect(result[0].nftStandard).toBe('ERC721');
      expect(result[0].tokenId).toBe('123');
      expect(result[0].itemType).toBe('NFT');

      // Cleanup
      await db.delete(schema.listings).where(eq(schema.listings.id, result[0].id));
    });

    it('should create auction listing with reserve price', async () => {
      const auctionListing = {
        sellerId: createdUserId,
        tokenAddress: '0x3333333333333333333333333333333333333333',
        price: '100.0',
        quantity: 1,
        itemType: 'DIGITAL' as const,
        listingType: 'AUCTION' as const,
        metadataURI: 'https://example.com/auction-metadata.json',
        reservePrice: '50.0',
        minIncrement: '5.0',
        endTime: new Date(Date.now() + 86400000), // 24 hours from now
        isEscrowed: false
      };

      const result = await db.insert(schema.listings).values(auctionListing).returning();
      
      expect(result[0].listingType).toBe('AUCTION');
      expect(result[0].reservePrice).toBe('50.0');
      expect(result[0].minIncrement).toBe('5.0');
      expect(result[0].endTime).toBeDefined();

      // Cleanup
      await db.delete(schema.listings).where(eq(schema.listings.id, result[0].id));
    });

    it('should retrieve listings by seller', async () => {
      const result = await db.select()
        .from(schema.listings)
        .where(eq(schema.listings.sellerId, createdUserId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].sellerId).toBe(createdUserId);
    });

    it('should update listing price and quantity', async () => {
      const newPrice = '150.75';
      const newQuantity = 10;

      const result = await db.update(schema.listings)
        .set({ 
          price: newPrice, 
          quantity: newQuantity,
          updatedAt: new Date()
        })
        .where(eq(schema.listings.id, createdListingId))
        .returning();

      expect(result[0].price).toBe(newPrice);
      expect(result[0].quantity).toBe(newQuantity);
    });

    it('should update listing status', async () => {
      const result = await db.update(schema.listings)
        .set({ status: 'sold' })
        .where(eq(schema.listings.id, createdListingId))
        .returning();

      expect(result[0].status).toBe('sold');
    });

    afterAll(async () => {
      // Cleanup
      if (createdListingId) {
        await db.delete(schema.listings).where(eq(schema.listings.id, createdListingId));
      }
      if (createdUserId) {
        await db.delete(schema.users).where(eq(schema.users.id, createdUserId));
      }
    });
  });

  describe('Bid Model', () => {
    let createdUserId: string;
    let createdListingId: number;
    let createdBidId: number;

    beforeAll(async () => {
      // Create test user and listing
      const userResult = await db.insert(schema.users).values({
        walletAddress: '0x4444444444444444444444444444444444444444',
        handle: 'biduser'
      }).returning();
      createdUserId = userResult[0].id;

      const listingResult = await db.insert(schema.listings).values({
        sellerId: createdUserId,
        tokenAddress: '0x5555555555555555555555555555555555555555',
        price: '100.0',
        quantity: 1,
        itemType: 'DIGITAL',
        listingType: 'AUCTION',
        metadataURI: 'https://example.com/bid-test.json',
        isEscrowed: false
      }).returning();
      createdListingId = listingResult[0].id;
    });

    it('should create a bid with valid data', async () => {
      const bidData = {
        listingId: createdListingId,
        bidderId: createdUserId,
        amount: '120.50'
      };

      const result = await db.insert(schema.bids).values(bidData).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].listingId).toBe(createdListingId);
      expect(result[0].bidderId).toBe(createdUserId);
      expect(result[0].amount).toBe('120.50');
      expect(result[0].timestamp).toBeDefined();

      createdBidId = result[0].id;
    });

    it('should retrieve bids by listing', async () => {
      const result = await db.select()
        .from(schema.bids)
        .where(eq(schema.bids.listingId, createdListingId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].listingId).toBe(createdListingId);
    });

    it('should retrieve bids by bidder', async () => {
      const result = await db.select()
        .from(schema.bids)
        .where(eq(schema.bids.bidderId, createdUserId));

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].bidderId).toBe(createdUserId);
    });

    afterAll(async () => {
      // Cleanup
      if (createdBidId) {
        await db.delete(schema.bids).where(eq(schema.bids.id, createdBidId));
      }
      if (createdListingId) {
        await db.delete(schema.listings).where(eq(schema.listings.id, createdListingId));
      }
      if (createdUserId) {
        await db.delete(schema.users).where(eq(schema.users.id, createdUserId));
      }
    });
  });

  describe('Order and Escrow Models', () => {
    let buyerId: string;
    let sellerId: string;
    let listingId: number;
    let escrowId: number;
    let orderId: number;

    beforeAll(async () => {
      // Create test users
      const buyerResult = await db.insert(schema.users).values({
        walletAddress: '0x6666666666666666666666666666666666666666',
        handle: 'buyer'
      }).returning();
      buyerId = buyerResult[0].id;

      const sellerResult = await db.insert(schema.users).values({
        walletAddress: '0x7777777777777777777777777777777777777777',
        handle: 'seller'
      }).returning();
      sellerId = sellerResult[0].id;

      // Create test listing
      const listingResult = await db.insert(schema.listings).values({
        sellerId: sellerId,
        tokenAddress: '0x8888888888888888888888888888888888888888',
        price: '200.0',
        quantity: 1,
        itemType: 'PHYSICAL',
        listingType: 'FIXED_PRICE',
        metadataURI: 'https://example.com/order-test.json',
        isEscrowed: false
      }).returning();
      listingId = listingResult[0].id;
    });

    it('should create an escrow with valid data', async () => {
      const escrowData = {
        listingId: listingId,
        buyerId: buyerId,
        sellerId: sellerId,
        amount: '200.0',
        buyerApproved: false,
        sellerApproved: false,
        disputeOpened: false,
        deliveryConfirmed: false
      };

      const result = await db.insert(schema.escrows).values(escrowData).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].listingId).toBe(listingId);
      expect(result[0].buyerId).toBe(buyerId);
      expect(result[0].sellerId).toBe(sellerId);
      expect(result[0].amount).toBe('200.0');
      expect(result[0].buyerApproved).toBe(false);
      expect(result[0].sellerApproved).toBe(false);

      escrowId = result[0].id;
    });

    it('should create an order with escrow reference', async () => {
      const orderData = {
        listingId: listingId,
        buyerId: buyerId,
        sellerId: sellerId,
        escrowId: escrowId,
        amount: '200.0',
        paymentToken: '0x9999999999999999999999999999999999999999',
        status: 'pending'
      };

      const result = await db.insert(schema.orders).values(orderData).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].escrowId).toBe(escrowId);
      expect(result[0].status).toBe('pending');

      orderId = result[0].id;
    });

    it('should update escrow approval status', async () => {
      const result = await db.update(schema.escrows)
        .set({ buyerApproved: true })
        .where(eq(schema.escrows.id, escrowId))
        .returning();

      expect(result[0].buyerApproved).toBe(true);
    });

    it('should confirm delivery', async () => {
      const deliveryInfo = 'Package delivered to front door';
      
      const result = await db.update(schema.escrows)
        .set({ 
          deliveryConfirmed: true,
          deliveryInfo: deliveryInfo
        })
        .where(eq(schema.escrows.id, escrowId))
        .returning();

      expect(result[0].deliveryConfirmed).toBe(true);
      expect(result[0].deliveryInfo).toBe(deliveryInfo);
    });

    it('should update order status', async () => {
      const result = await db.update(schema.orders)
        .set({ status: 'completed' })
        .where(eq(schema.orders.id, orderId))
        .returning();

      expect(result[0].status).toBe('completed');
    });

    afterAll(async () => {
      // Cleanup in reverse order of dependencies
      if (orderId) {
        await db.delete(schema.orders).where(eq(schema.orders.id, orderId));
      }
      if (escrowId) {
        await db.delete(schema.escrows).where(eq(schema.escrows.id, escrowId));
      }
      if (listingId) {
        await db.delete(schema.listings).where(eq(schema.listings.id, listingId));
      }
      if (buyerId) {
        await db.delete(schema.users).where(eq(schema.users.id, buyerId));
      }
      if (sellerId) {
        await db.delete(schema.users).where(eq(schema.users.id, sellerId));
      }
    });
  });

  describe('Reputation Model', () => {
    const testWalletAddress = '0xAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';

    it('should create reputation record', async () => {
      const reputationData = {
        walletAddress: testWalletAddress,
        score: 85,
        daoApproved: false
      };

      const result = await db.insert(schema.reputations).values(reputationData).returning();
      
      expect(result).toHaveLength(1);
      expect(result[0].walletAddress).toBe(testWalletAddress);
      expect(result[0].score).toBe(85);
      expect(result[0].daoApproved).toBe(false);
    });

    it('should update reputation score', async () => {
      const newScore = 95;
      
      const result = await db.update(schema.reputations)
        .set({ score: newScore, daoApproved: true })
        .where(eq(schema.reputations.walletAddress, testWalletAddress))
        .returning();

      expect(result[0].score).toBe(newScore);
      expect(result[0].daoApproved).toBe(true);
    });

    it('should retrieve reputation by address', async () => {
      const result = await db.select()
        .from(schema.reputations)
        .where(eq(schema.reputations.walletAddress, testWalletAddress));

      expect(result).toHaveLength(1);
      expect(result[0].walletAddress).toBe(testWalletAddress);
    });

    afterAll(async () => {
      // Cleanup
      await db.delete(schema.reputations).where(eq(schema.reputations.walletAddress, testWalletAddress));
    });
  });

  describe('Data Validation Integration', () => {
    it('should validate Ethereum addresses in database', async () => {
      const validAddress = '0xBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBB';
      const invalidAddress = '0xinvalid';

      expect(ValidationHelper.validateEthereumAddress(validAddress)).toBe(true);
      expect(ValidationHelper.validateEthereumAddress(invalidAddress)).toBe(false);

      // Valid address should work
      const result = await db.insert(schema.users).values({
        walletAddress: validAddress,
        handle: 'validuser'
      }).returning();

      expect(result[0].walletAddress).toBe(validAddress);

      // Cleanup
      await db.delete(schema.users).where(eq(schema.users.id, result[0].id));
    });

    it('should validate price formats', () => {
      expect(ValidationHelper.validatePrice('100.50')).toBe(true);
      expect(ValidationHelper.validatePrice('0.001')).toBe(true);
      expect(ValidationHelper.validatePrice('-10')).toBe(false);
      expect(ValidationHelper.validatePrice('abc')).toBe(false);
    });

    it('should validate quantities', () => {
      expect(ValidationHelper.validateQuantity(1)).toBe(true);
      expect(ValidationHelper.validateQuantity(100)).toBe(true);
      expect(ValidationHelper.validateQuantity(0)).toBe(false);
      expect(ValidationHelper.validateQuantity(-1)).toBe(false);
      expect(ValidationHelper.validateQuantity(1.5)).toBe(false);
    });

    it('should validate token IDs', () => {
      expect(ValidationHelper.validateTokenId('123')).toBe(true);
      expect(ValidationHelper.validateTokenId('0x1a2b3c')).toBe(true);
      expect(ValidationHelper.validateTokenId('xyz')).toBe(false);
    });
  });
});