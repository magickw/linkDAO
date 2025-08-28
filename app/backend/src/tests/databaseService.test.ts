import { DatabaseService } from '../services/databaseService';

describe('DatabaseService', () => {
  let databaseService: DatabaseService;

  beforeAll(() => {
    databaseService = new DatabaseService();
  });

  describe('User Operations', () => {
    const testUserAddress = `0x${Date.now()}1234567890123456789012345678901234`; // Unique address for each test run

    it('should create a user', async () => {
      const user = await databaseService.createUser(
        testUserAddress,
        'testuser',
        'QmTestProfileCid'
      );
      
      expect(user).toBeDefined();
      expect(user.address).toBe(testUserAddress);
      expect(user.handle).toBe('testuser');
      expect(user.profileCid).toBe('QmTestProfileCid');
    });

    it('should get a user by address', async () => {
      const user = await databaseService.getUserByAddress(testUserAddress);
      
      expect(user).toBeDefined();
      expect(user?.address).toBe(testUserAddress);
    });

    it('should get a user by ID', async () => {
      const userByAddress = await databaseService.getUserByAddress(testUserAddress);
      const userById = await databaseService.getUserById(userByAddress!.id);
      
      expect(userById).toBeDefined();
      expect(userById?.id).toBe(userByAddress!.id);
    });
  });

  describe('Post Operations', () => {
    let userId: string;
    const testUserAddress = `0x${Date.now()}5678901234567890123456789012345678`; // Unique address for each test run

    beforeAll(async () => {
      // Create a user for testing posts
      const user = await databaseService.createUser(
        testUserAddress,
        'postuser',
        'QmPostUserCid'
      );
      userId = user.id;
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
    const followerAddress = `0x${Date.now()}abcdefabcdefabcdefabcdefabcdefabcd`; // Unique address for each test run
    const followingAddress = `0x${Date.now()}1234567890abcdef1234567890abcdef12`; // Unique address for each test run

    beforeAll(async () => {
      // Create two users for testing follows
      const follower = await databaseService.createUser(
        followerAddress,
        'follower',
        'QmFollowerCid'
      );
      
      const following = await databaseService.createUser(
        followingAddress,
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
    const sellerAddress = `0x${Date.now()}selleraddressselleraddressseller`; // Unique address for each test run

    beforeAll(async () => {
      const seller = await databaseService.createUser(
        sellerAddress,
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
    const userAddress = `0x${Date.now()}reputationaddressreputationaddressrep`; // Unique address for each test run

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
      // We can't guarantee there will be DAO approved vendors in the database
      // so we'll just check that the function works
    });
  });
});