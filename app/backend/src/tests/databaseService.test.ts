import { DatabaseService } from '../services/databaseService';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeAll(() => {
    databaseService = new DatabaseService();
  });

  describe('User Operations', () => {
    it('should create a user', async () => {
      const user = await databaseService.createUser(
        '0x1234567890123456789012345678901234567890',
        'testuser',
        'QmTestProfileCid'
      );
      
      expect(user).toBeDefined();
      expect(user.address).toBe('0x1234567890123456789012345678901234567890');
      expect(user.handle).toBe('testuser');
      expect(user.profileCid).toBe('QmTestProfileCid');
    });

    it('should get a user by address', async () => {
      const user = await databaseService.getUserByAddress('0x1234567890123456789012345678901234567890');
      
      expect(user).toBeDefined();
      expect(user?.address).toBe('0x1234567890123456789012345678901234567890');
    });

    it('should get a user by ID', async () => {
      const userByAddress = await databaseService.getUserByAddress('0x1234567890123456789012345678901234567890');
      const userById = await databaseService.getUserById(userByAddress!.id);
      
      expect(userById).toBeDefined();
      expect(userById?.id).toBe(userByAddress!.id);
    });
  });

  describe('Post Operations', () => {
    let userId: string;

    beforeAll(async () => {
      const user = await databaseService.getUserByAddress('0x1234567890123456789012345678901234567890');
      userId = user!.id;
    });

    it('should create a post', async () => {
      const post = await databaseService.createPost(
        userId,
        'QmTestContentCid'
      );
      
      expect(post).toBeDefined();
      expect(post.authorId).toBe(userId);
      expect(post.contentCid).toBe('QmTestContentCid');
    });

    it('should get posts by author', async () => {
      const posts = await databaseService.getPostsByAuthor(userId);
      
      expect(posts).toBeDefined();
      expect(posts.length).toBeGreaterThan(0);
      expect(posts[0].authorId).toBe(userId);
    });
  });

  describe('Follow Operations', () => {
    let followerId: string;
    let followingId: string;

    beforeAll(async () => {
      // Create two users for testing follows
      const follower = await databaseService.createUser(
        '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd',
        'follower',
        'QmFollowerCid'
      );
      
      const following = await databaseService.createUser(
        '0x1234567890abcdef1234567890abcdef12345678',
        'following',
        'QmFollowingCid'
      );
      
      followerId = follower.id;
      followingId = following.id;
    });

    it('should follow a user', async () => {
      const follow = await databaseService.followUser(followerId, followingId);
      
      expect(follow).toBeDefined();
      expect(follow.followerId).toBe(followerId);
      expect(follow.followingId).toBe(followingId);
    });

    it('should get followers', async () => {
      const followers = await databaseService.getFollowers(followingId);
      
      expect(followers).toBeDefined();
      expect(followers.length).toBeGreaterThan(0);
      expect(followers[0].followingId).toBe(followingId);
    });

    it('should get following', async () => {
      const following = await databaseService.getFollowing(followerId);
      
      expect(following).toBeDefined();
      expect(following.length).toBeGreaterThan(0);
      expect(following[0].followerId).toBe(followerId);
    });

    it('should unfollow a user', async () => {
      await databaseService.unfollowUser(followerId, followingId);
      const following = await databaseService.getFollowing(followerId);
      
      expect(following).toBeDefined();
      expect(following.length).toBe(0);
    });
  });

  describe('Marketplace Operations', () => {
    let sellerId: string;

    beforeAll(async () => {
      const seller = await databaseService.createUser(
        '0xselleraddressselleraddressselleraddress',
        'seller',
        'QmSellerCid'
      );
      sellerId = seller.id;
    });

    it('should create a listing', async () => {
      const listing = await databaseService.createListing(
        sellerId,
        '0xtokenaddress',
        '1000000000000000000', // 1 ETH in wei
        1,
        'DIGITAL',
        'FIXED_PRICE',
        'QmMetadataUri'
      );
      
      expect(listing).toBeDefined();
      expect(listing.sellerId).toBe(sellerId);
      expect(listing.tokenAddress).toBe('0xtokenaddress');
      expect(listing.price).toBe('1000000000000000000');
      expect(listing.quantity).toBe(1);
      expect(listing.itemType).toBe('DIGITAL');
      expect(listing.listingType).toBe('FIXED_PRICE');
      expect(listing.metadataURI).toBe('QmMetadataUri');
    });

    it('should get listings by seller', async () => {
      const listings = await databaseService.getListingsBySeller(sellerId);
      
      expect(listings).toBeDefined();
      expect(listings.length).toBeGreaterThan(0);
      expect(listings[0].sellerId).toBe(sellerId);
    });

    it('should get all listings', async () => {
      const listings = await databaseService.getAllListings();
      
      expect(listings).toBeDefined();
      expect(listings.length).toBeGreaterThan(0);
    });

    it('should get active listings', async () => {
      const listings = await databaseService.getActiveListings();
      
      expect(listings).toBeDefined();
      // All listings should be active by default
      expect(listings.length).toBeGreaterThan(0);
    });

    it('should update a listing', async () => {
      const listings = await databaseService.getListingsBySeller(sellerId);
      const listingId = listings[0].id;
      
      const updatedListing = await databaseService.updateListing(listingId, {
        price: '2000000000000000000', // 2 ETH in wei
        quantity: 2
      });
      
      expect(updatedListing).toBeDefined();
      expect(updatedListing?.price).toBe('2000000000000000000');
      expect(updatedListing?.quantity).toBe(2);
    });

    it('should cancel a listing', async () => {
      const listings = await databaseService.getListingsBySeller(sellerId);
      const listingId = listings[0].id;
      
      const cancelledListing = await databaseService.cancelListing(listingId);
      
      expect(cancelledListing).toBeDefined();
      expect(cancelledListing?.status).toBe('cancelled');
    });
  });

  describe('Reputation Operations', () => {
    const userAddress = '0xreputationaddressreputationaddressrep';

    it('should create user reputation', async () => {
      const reputation = await databaseService.createUserReputation(
        userAddress,
        100,
        true
      );
      
      expect(reputation).toBeDefined();
      expect(reputation.address).toBe(userAddress);
      expect(reputation.score).toBe(100);
      expect(reputation.daoApproved).toBe(true);
    });

    it('should get user reputation', async () => {
      const reputation = await databaseService.getUserReputation(userAddress);
      
      expect(reputation).toBeDefined();
      expect(reputation?.address).toBe(userAddress);
      expect(reputation?.score).toBe(100);
      expect(reputation?.daoApproved).toBe(true);
    });

    it('should get DAO approved vendors', async () => {
      const vendors = await databaseService.getDAOApprovedVendors();
      
      expect(vendors).toBeDefined();
      expect(vendors.length).toBeGreaterThan(0);
      expect(vendors[0].daoApproved).toBe(true);
    });
  });
});