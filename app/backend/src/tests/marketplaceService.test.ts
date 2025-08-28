import { MarketplaceService } from '../services/marketplaceService';

describe('MarketplaceService', () => {
  let marketplaceService: MarketplaceService;

  beforeEach(() => {
    marketplaceService = new MarketplaceService();
  });

  describe('createListing', () => {
    it('should create a fixed price listing', async () => {
      const input = {
        sellerAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000', // 1 ETH in wei
        quantity: 5,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'ipfs://test-metadata'
      };

      const listing = await marketplaceService.createListing(input);
      
      expect(listing).toBeDefined();
      expect(listing.sellerAddress).toBe(input.sellerAddress);
      expect(listing.price).toBe(input.price);
      expect(listing.quantity).toBe(input.quantity);
      expect(listing.itemType).toBe(input.itemType);
      expect(listing.listingType).toBe(input.listingType);
      expect(listing.metadataURI).toBe(input.metadataURI);
      expect(listing.status).toBe('ACTIVE');
    });

    it('should create an auction listing with end time', async () => {
      const input = {
        sellerAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000', // 1 ETH in wei
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'AUCTION' as const,
        duration: 86400, // 1 day
        metadataURI: 'ipfs://test-metadata'
      };

      const listing = await marketplaceService.createListing(input);
      
      expect(listing).toBeDefined();
      expect(listing.sellerAddress).toBe(input.sellerAddress);
      expect(listing.listingType).toBe(input.listingType);
      expect(listing.endTime).toBeDefined();
    });
  });

  describe('getListingById', () => {
    it('should return a listing by ID', async () => {
      const input = {
        sellerAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 5,
        itemType: 'DIGITAL' as const,
        listingType: 'FIXED_PRICE' as const,
        metadataURI: 'ipfs://test-metadata'
      };

      const createdListing = await marketplaceService.createListing(input);
      const retrievedListing = await marketplaceService.getListingById(createdListing.id);
      
      expect(retrievedListing).toEqual(createdListing);
    });

    it('should return null for non-existent listing', async () => {
      const listing = await marketplaceService.getListingById('999');
      expect(listing).toBeNull();
    });
  });

  describe('placeBid', () => {
    it('should place a bid on an auction listing', async () => {
      // Create an auction listing
      const listingInput = {
        sellerAddress: '0x1234567890123456789012345678901234567890',
        tokenAddress: '0x0000000000000000000000000000000000000000',
        price: '1000000000000000000',
        quantity: 1,
        itemType: 'NFT' as const,
        listingType: 'AUCTION' as const,
        duration: 86400,
        metadataURI: 'ipfs://test-metadata'
      };

      const listing = await marketplaceService.createListing(listingInput);
      
      // Place a bid
      const bidInput = {
        bidderAddress: '0xabcdef1234567890abcdef1234567890abcdef12',
        amount: '1500000000000000000' // 1.5 ETH
      };

      const bid = await marketplaceService.placeBid(listing.id, bidInput);
      
      expect(bid).toBeDefined();
      expect(bid?.bidderAddress).toBe(bidInput.bidderAddress);
      expect(bid?.amount).toBe(bidInput.amount);
      
      // Check that listing was updated with highest bid
      const updatedListing = await marketplaceService.getListingById(listing.id);
      expect(updatedListing?.highestBid).toBe(bidInput.amount);
      expect(updatedListing?.highestBidder).toBe(bidInput.bidderAddress);
    });
  });

  describe('reputation system', () => {
    it('should update user reputation', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const score = 150;
      const daoApproved = true;
      
      const reputation = await marketplaceService.updateUserReputation(userAddress, score, daoApproved);
      
      expect(reputation.address).toBe(userAddress);
      expect(reputation.score).toBe(score);
      expect(reputation.daoApproved).toBe(daoApproved);
    });

    it('should retrieve user reputation', async () => {
      const userAddress = '0x1234567890123456789012345678901234567890';
      const score = 150;
      const daoApproved = true;
      
      // Update reputation first
      await marketplaceService.updateUserReputation(userAddress, score, daoApproved);
      
      // Retrieve reputation
      const reputation = await marketplaceService.getUserReputation(userAddress);
      
      expect(reputation).toBeDefined();
      expect(reputation?.address).toBe(userAddress);
      expect(reputation?.score).toBe(score);
      expect(reputation?.daoApproved).toBe(daoApproved);
    });

    it('should return default reputation for unknown user', async () => {
      const userAddress = '0xabcdef1234567890abcdef1234567890abcdef12';
      const reputation = await marketplaceService.getUserReputation(userAddress);
      expect(reputation).toBeNull();
    });
  });
});