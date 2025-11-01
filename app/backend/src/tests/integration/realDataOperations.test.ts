/**
 * Real Data Operations Integration Tests
 * Tests database operations with real data instead of mocks
 */

import { describe, beforeAll, afterAll, beforeEach, afterEach, it, expect } from '@jest/globals';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from '../../db/schema';
import {
  DatabaseSeeder,
  CommunityFixtures,
  ProductFixtures,
  UserFixtures,
  GovernanceFixtures,
  FeedFixtures
} from '../fixtures';

describe('Real Data Operations Integration Tests', () => {
  let db: any;
  let sql: any;
  let seeder: DatabaseSeeder;

  beforeAll(async () => {
    // Use test database
    const testDbUrl = process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!testDbUrl) {
      throw new Error('TEST_DATABASE_URL is required for integration tests');
    }

    sql = postgres(testDbUrl);
    db = drizzle(sql, { schema });
    seeder = new DatabaseSeeder(testDbUrl);
  });

  afterAll(async () => {
    await seeder.close();
    await sql.end();
  });

  beforeEach(async () => {
    // Clean database before each test
    await seeder.cleanDatabase();
  });

  describe('Community Data Operations', () => {
    it('should create and retrieve communities from database', async () => {
      // Create test communities
      const communityFixtures = CommunityFixtures.createCommunities({ count: 5 });
      
      // Insert into database
      const communities = communityFixtures.map(fixture => ({
        id: fixture.id,
        name: fixture.name,
        displayName: fixture.displayName,
        description: fixture.description,
        rules: JSON.stringify(fixture.rules),
        memberCount: fixture.memberCount,
        createdAt: fixture.createdAt,
        updatedAt: fixture.updatedAt,
        avatar: fixture.avatar,
        banner: fixture.banner,
        category: fixture.category,
        tags: JSON.stringify(fixture.tags),
        isPublic: fixture.isPublic,
        moderators: JSON.stringify(fixture.moderators),
        treasuryAddress: fixture.treasuryAddress,
        governanceToken: fixture.governanceToken,
        settings: JSON.stringify(fixture.settings),
      }));

      const insertedCommunities = await db.insert(schema.communities).values(communities).returning();
      
      // Verify insertion
      expect(insertedCommunities).toHaveLength(5);
      expect(insertedCommunities[0]).toHaveProperty('id');
      expect(insertedCommunities[0]).toHaveProperty('name');

      // Test retrieval
      const retrievedCommunities = await db.select().from(schema.communities);
      expect(retrievedCommunities).toHaveLength(5);

      // Test filtering by category
      const categoryFilter = communityFixtures[0].category;
      const filteredCommunities = await db
        .select()
        .from(schema.communities)
        .where(schema.communities.category.eq(categoryFilter));
      
      expect(filteredCommunities.length).toBeGreaterThan(0);
      filteredCommunities.forEach(community => {
        expect(community.category).toBe(categoryFilter);
      });
    });

    it('should handle community membership operations', async () => {
      // Create users and communities
      const userFixtures = UserFixtures.createUsers({ count: 3 });
      const communityFixtures = CommunityFixtures.createCommunities({ count: 2 });

      // Insert users
      const users = await db.insert(schema.users).values(
        userFixtures.map(fixture => ({
          id: fixture.id,
          walletAddress: fixture.walletAddress,
          username: fixture.username,
          displayName: fixture.displayName,
          reputation: fixture.reputation,
          joinedAt: fixture.joinedAt,
          lastActiveAt: fixture.lastActiveAt,
          isVerified: fixture.isVerified,
          preferences: JSON.stringify(fixture.preferences),
          stats: JSON.stringify(fixture.stats),
          socialLinks: JSON.stringify(fixture.socialLinks),
        }))
      ).returning();

      // Insert communities
      const communities = await db.insert(schema.communities).values(
        communityFixtures.map(fixture => ({
          id: fixture.id,
          name: fixture.name,
          displayName: fixture.displayName,
          description: fixture.description,
          rules: JSON.stringify(fixture.rules),
          memberCount: fixture.memberCount,
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          category: fixture.category,
          tags: JSON.stringify(fixture.tags),
          isPublic: fixture.isPublic,
          moderators: JSON.stringify(fixture.moderators),
          settings: JSON.stringify(fixture.settings),
        }))
      ).returning();

      // Create memberships
      const membershipFixtures = CommunityFixtures.createMemberships({
        count: 4,
        overrides: {
          userId: users[0].id,
          communityId: communities[0].id
        }
      });

      const memberships = await db.insert(schema.communityMemberships).values(
        membershipFixtures.map(fixture => ({
          id: fixture.id,
          userId: fixture.userId,
          communityId: fixture.communityId,
          role: fixture.role,
          joinedAt: fixture.joinedAt,
          reputation: fixture.reputation,
          contributions: fixture.contributions,
          isActive: fixture.isActive,
          lastActivityAt: fixture.lastActivityAt,
        }))
      ).returning();

      expect(memberships).toHaveLength(4);

      // Test membership queries
      const userMemberships = await db
        .select()
        .from(schema.communityMemberships)
        .where(schema.communityMemberships.userId.eq(users[0].id));

      expect(userMemberships).toHaveLength(4);
    });

    it('should handle community statistics calculations', async () => {
      // Seed minimal data
      await seeder.seedMinimal();

      // Test community statistics
      const communities = await db.select().from(schema.communities);
      expect(communities.length).toBeGreaterThan(0);

      for (const community of communities) {
        // Count actual members
        const memberCount = await db
          .select({ count: schema.communityMemberships.id })
          .from(schema.communityMemberships)
          .where(schema.communityMemberships.communityId.eq(community.id));

        expect(memberCount).toBeDefined();

        // Count posts in community
        const postCount = await db
          .select({ count: schema.posts.id })
          .from(schema.posts)
          .where(schema.posts.communityId.eq(community.id));

        expect(postCount).toBeDefined();
      }
    });
  });

  describe('Product/Marketplace Data Operations', () => {
    it('should create and retrieve products from database', async () => {
      const productFixtures = ProductFixtures.createProducts({ count: 10 });
      
      const products = await db.insert(schema.products).values(
        productFixtures.map(fixture => ({
          id: fixture.id,
          title: fixture.title,
          description: fixture.description,
          price: fixture.price,
          currency: fixture.currency,
          cryptoPrice: fixture.cryptoPrice,
          cryptoSymbol: fixture.cryptoSymbol,
          category: fixture.category,
          listingType: fixture.listingType,
          sellerId: fixture.seller.id,
          sellerData: JSON.stringify(fixture.seller),
          trust: JSON.stringify(fixture.trust),
          images: JSON.stringify(fixture.images),
          inventory: fixture.inventory,
          isNFT: fixture.isNFT,
          tags: JSON.stringify(fixture.tags),
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          views: fixture.views,
          favorites: fixture.favorites,
          auctionEndTime: fixture.auctionEndTime,
          highestBid: fixture.highestBid,
          bidCount: fixture.bidCount,
          specifications: JSON.stringify(fixture.specifications),
          shipping: JSON.stringify(fixture.shipping),
        }))
      ).returning();

      expect(products).toHaveLength(10);

      // Test product search
      const searchTerm = productFixtures[0].title.split(' ')[0];
      const searchResults = await db
        .select()
        .from(schema.products)
        .where(schema.products.title.ilike(`%${searchTerm}%`));

      expect(searchResults.length).toBeGreaterThan(0);

      // Test category filtering
      const categoryProducts = await db
        .select()
        .from(schema.products)
        .where(schema.products.category.eq(productFixtures[0].category));

      expect(categoryProducts.length).toBeGreaterThan(0);
    });

    it('should handle auction operations', async () => {
      const auctionFixtures = ProductFixtures.createAuctions({ count: 5 });
      
      const auctions = await db.insert(schema.products).values(
        auctionFixtures.map(fixture => ({
          id: fixture.id,
          title: fixture.title,
          description: fixture.description,
          price: fixture.price,
          currency: fixture.currency,
          cryptoPrice: fixture.cryptoPrice,
          cryptoSymbol: fixture.cryptoSymbol,
          category: fixture.category,
          listingType: 'AUCTION',
          sellerId: fixture.seller.id,
          sellerData: JSON.stringify(fixture.seller),
          trust: JSON.stringify(fixture.trust),
          images: JSON.stringify(fixture.images),
          inventory: fixture.inventory,
          isNFT: fixture.isNFT,
          tags: JSON.stringify(fixture.tags),
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          views: fixture.views,
          favorites: fixture.favorites,
          auctionEndTime: fixture.auctionEndTime,
          highestBid: fixture.currentBid,
          bidCount: fixture.bidCount,
          specifications: JSON.stringify(fixture.specifications),
          shipping: JSON.stringify(fixture.shipping),
        }))
      ).returning();

      expect(auctions).toHaveLength(5);

      // Test active auctions query
      const now = new Date();
      const activeAuctions = await db
        .select()
        .from(schema.products)
        .where(
          schema.products.listingType.eq('AUCTION')
          .and(schema.products.auctionEndTime.gt(now))
        );

      expect(activeAuctions.length).toBeGreaterThan(0);
    });

    it('should handle seller operations', async () => {
      const sellerFixtures = ProductFixtures.createSellers({ count: 3 });
      const productFixtures = ProductFixtures.createProducts({ count: 6 });

      // Insert products with seller references
      const products = await db.insert(schema.products).values(
        productFixtures.map((fixture, index) => ({
          id: fixture.id,
          title: fixture.title,
          description: fixture.description,
          price: fixture.price,
          currency: fixture.currency,
          cryptoPrice: fixture.cryptoPrice,
          cryptoSymbol: fixture.cryptoSymbol,
          category: fixture.category,
          listingType: fixture.listingType,
          sellerId: sellerFixtures[index % sellerFixtures.length].id,
          sellerData: JSON.stringify(sellerFixtures[index % sellerFixtures.length]),
          trust: JSON.stringify(fixture.trust),
          images: JSON.stringify(fixture.images),
          inventory: fixture.inventory,
          isNFT: fixture.isNFT,
          tags: JSON.stringify(fixture.tags),
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          views: fixture.views,
          favorites: fixture.favorites,
          specifications: JSON.stringify(fixture.specifications),
          shipping: JSON.stringify(fixture.shipping),
        }))
      ).returning();

      // Test seller product queries
      const sellerId = sellerFixtures[0].id;
      const sellerProducts = await db
        .select()
        .from(schema.products)
        .where(schema.products.sellerId.eq(sellerId));

      expect(sellerProducts.length).toBeGreaterThan(0);
    });
  });

  describe('User Data Operations', () => {
    it('should create and retrieve users from database', async () => {
      const userFixtures = UserFixtures.createUsers({ count: 8 });
      
      const users = await db.insert(schema.users).values(
        userFixtures.map(fixture => ({
          id: fixture.id,
          walletAddress: fixture.walletAddress,
          username: fixture.username,
          displayName: fixture.displayName,
          bio: fixture.bio,
          avatar: fixture.avatar,
          banner: fixture.banner,
          email: fixture.email,
          isVerified: fixture.isVerified,
          reputation: fixture.reputation,
          joinedAt: fixture.joinedAt,
          lastActiveAt: fixture.lastActiveAt,
          preferences: JSON.stringify(fixture.preferences),
          stats: JSON.stringify(fixture.stats),
          socialLinks: JSON.stringify(fixture.socialLinks),
        }))
      ).returning();

      expect(users).toHaveLength(8);

      // Test user search by username
      const username = userFixtures[0].username;
      if (username) {
        const foundUsers = await db
          .select()
          .from(schema.users)
          .where(schema.users.username.eq(username));

        expect(foundUsers).toHaveLength(1);
        expect(foundUsers[0].username).toBe(username);
      }

      // Test verified users query
      const verifiedUsers = await db
        .select()
        .from(schema.users)
        .where(schema.users.isVerified.eq(true));

      expect(verifiedUsers.length).toBeGreaterThan(0);
    });

    it('should handle follow relationships', async () => {
      const userFixtures = UserFixtures.createUsers({ count: 5 });
      
      // Insert users
      const users = await db.insert(schema.users).values(
        userFixtures.map(fixture => ({
          id: fixture.id,
          walletAddress: fixture.walletAddress,
          username: fixture.username,
          displayName: fixture.displayName,
          reputation: fixture.reputation,
          joinedAt: fixture.joinedAt,
          lastActiveAt: fixture.lastActiveAt,
          isVerified: fixture.isVerified,
          preferences: JSON.stringify(fixture.preferences),
          stats: JSON.stringify(fixture.stats),
          socialLinks: JSON.stringify(fixture.socialLinks),
        }))
      ).returning();

      // Create follow relationships
      const relationshipFixtures = UserFixtures.createFollowRelationships({
        count: 8,
        overrides: {
          followerId: users[0].id,
          followeeId: users[1].id
        }
      });

      const relationships = await db.insert(schema.followRelationships).values(
        relationshipFixtures.map(fixture => ({
          id: fixture.id,
          followerId: fixture.followerId,
          followeeId: fixture.followeeId,
          createdAt: fixture.createdAt,
          isActive: fixture.isActive,
        }))
      ).returning();

      expect(relationships).toHaveLength(8);

      // Test follower queries
      const followers = await db
        .select()
        .from(schema.followRelationships)
        .where(schema.followRelationships.followeeId.eq(users[1].id));

      expect(followers.length).toBeGreaterThan(0);

      // Test following queries
      const following = await db
        .select()
        .from(schema.followRelationships)
        .where(schema.followRelationships.followerId.eq(users[0].id));

      expect(following.length).toBeGreaterThan(0);
    });

    it('should handle user reputation calculations', async () => {
      await seeder.seedMinimal();

      const users = await db.select().from(schema.users);
      expect(users.length).toBeGreaterThan(0);

      // Test reputation-based queries
      const highReputationUsers = await db
        .select()
        .from(schema.users)
        .where(schema.users.reputation.gte(500));

      expect(highReputationUsers).toBeDefined();

      // Test user activity queries
      const recentlyActiveUsers = await db
        .select()
        .from(schema.users)
        .where(schema.users.lastActiveAt.gte(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)));

      expect(recentlyActiveUsers).toBeDefined();
    });
  });

  describe('Governance Data Operations', () => {
    it('should create and retrieve proposals from database', async () => {
      const proposalFixtures = GovernanceFixtures.createProposals({ count: 6 });
      
      const proposals = await db.insert(schema.proposals).values(
        proposalFixtures.map(fixture => ({
          id: fixture.id,
          title: fixture.title,
          description: fixture.description,
          proposer: fixture.proposer,
          communityId: fixture.communityId,
          daoId: fixture.daoId,
          type: fixture.type,
          status: fixture.status,
          createdAt: fixture.createdAt,
          startTime: fixture.startTime,
          endTime: fixture.endTime,
          executionTime: fixture.executionTime,
          votingPower: JSON.stringify(fixture.votingPower),
          votes: JSON.stringify(fixture.votes),
          quorum: JSON.stringify(fixture.quorum),
          actions: JSON.stringify(fixture.actions),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      expect(proposals).toHaveLength(6);

      // Test active proposals query
      const activeProposals = await db
        .select()
        .from(schema.proposals)
        .where(schema.proposals.status.eq('active'));

      expect(activeProposals).toBeDefined();

      // Test proposal type filtering
      const fundingProposals = await db
        .select()
        .from(schema.proposals)
        .where(schema.proposals.type.eq('funding'));

      expect(fundingProposals).toBeDefined();
    });

    it('should handle DAO operations', async () => {
      const daoFixtures = GovernanceFixtures.createDAOs({ count: 3 });
      
      const daos = await db.insert(schema.daos).values(
        daoFixtures.map(fixture => ({
          id: fixture.id,
          name: fixture.name,
          description: fixture.description,
          governanceToken: fixture.governanceToken,
          treasuryAddress: fixture.treasuryAddress,
          memberCount: fixture.memberCount,
          totalProposals: fixture.totalProposals,
          activeProposals: fixture.activeProposals,
          treasuryValue: fixture.treasuryValue,
          createdAt: fixture.createdAt,
          settings: JSON.stringify(fixture.settings),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      expect(daos).toHaveLength(3);

      // Test DAO statistics
      const daoStats = await db
        .select()
        .from(schema.daos)
        .where(schema.daos.memberCount.gte(100));

      expect(daoStats).toBeDefined();
    });

    it('should handle voting operations', async () => {
      // Create proposals first
      const proposalFixtures = GovernanceFixtures.createProposals({ count: 2 });
      
      const proposals = await db.insert(schema.proposals).values(
        proposalFixtures.map(fixture => ({
          id: fixture.id,
          title: fixture.title,
          description: fixture.description,
          proposer: fixture.proposer,
          daoId: fixture.daoId,
          type: fixture.type,
          status: fixture.status,
          createdAt: fixture.createdAt,
          startTime: fixture.startTime,
          endTime: fixture.endTime,
          votingPower: JSON.stringify(fixture.votingPower),
          votes: JSON.stringify(fixture.votes),
          quorum: JSON.stringify(fixture.quorum),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      // Create votes
      const voteFixtures = GovernanceFixtures.createVotes({
        count: 10,
        overrides: { proposalId: proposals[0].id }
      });

      const votes = await db.insert(schema.votes).values(
        voteFixtures.map(fixture => ({
          id: fixture.id,
          proposalId: fixture.proposalId,
          voter: fixture.voter,
          choice: fixture.choice,
          votingPower: fixture.votingPower,
          reason: fixture.reason,
          timestamp: fixture.timestamp,
          txHash: fixture.txHash,
        }))
      ).returning();

      expect(votes).toHaveLength(10);

      // Test vote aggregation
      const proposalVotes = await db
        .select()
        .from(schema.votes)
        .where(schema.votes.proposalId.eq(proposals[0].id));

      expect(proposalVotes).toHaveLength(10);

      // Test vote choice filtering
      const forVotes = await db
        .select()
        .from(schema.votes)
        .where(
          schema.votes.proposalId.eq(proposals[0].id)
          .and(schema.votes.choice.eq('for'))
        );

      expect(forVotes).toBeDefined();
    });
  });

  describe('Feed Data Operations', () => {
    it('should create and retrieve posts from database', async () => {
      const postFixtures = FeedFixtures.createPosts({ count: 12 });
      
      const posts = await db.insert(schema.posts).values(
        postFixtures.map(fixture => ({
          id: fixture.id,
          author: fixture.author,
          content: fixture.content,
          contentCid: fixture.contentCid,
          mediaCids: JSON.stringify(fixture.mediaCids),
          type: fixture.type,
          communityId: fixture.communityId,
          parentId: fixture.parentId,
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          onchainRef: fixture.onchainRef,
          engagement: JSON.stringify(fixture.engagement),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      expect(posts).toHaveLength(12);

      // Test post type filtering
      const textPosts = await db
        .select()
        .from(schema.posts)
        .where(schema.posts.type.eq('text'));

      expect(textPosts).toBeDefined();

      // Test recent posts query
      const recentPosts = await db
        .select()
        .from(schema.posts)
        .where(schema.posts.createdAt.gte(new Date(Date.now() - 24 * 60 * 60 * 1000)))
        .orderBy(schema.posts.createdAt.desc());

      expect(recentPosts).toBeDefined();
    });

    it('should handle post reactions', async () => {
      // Create posts first
      const postFixtures = FeedFixtures.createPosts({ count: 3 });
      
      const posts = await db.insert(schema.posts).values(
        postFixtures.map(fixture => ({
          id: fixture.id,
          author: fixture.author,
          content: fixture.content,
          contentCid: fixture.contentCid,
          mediaCids: JSON.stringify(fixture.mediaCids),
          type: fixture.type,
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          onchainRef: fixture.onchainRef,
          engagement: JSON.stringify(fixture.engagement),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      // Create reactions
      const reactionFixtures = FeedFixtures.createReactions({
        count: 15,
        overrides: { postId: posts[0].id }
      });

      const reactions = await db.insert(schema.postReactions).values(
        reactionFixtures.map(fixture => ({
          id: fixture.id,
          postId: fixture.postId,
          userId: fixture.userId,
          type: fixture.type,
          createdAt: fixture.createdAt,
          txHash: fixture.txHash,
        }))
      ).returning();

      expect(reactions).toHaveLength(15);

      // Test reaction aggregation
      const postReactions = await db
        .select()
        .from(schema.postReactions)
        .where(schema.postReactions.postId.eq(posts[0].id));

      expect(postReactions).toHaveLength(15);

      // Test reaction type filtering
      const likes = await db
        .select()
        .from(schema.postReactions)
        .where(
          schema.postReactions.postId.eq(posts[0].id)
          .and(schema.postReactions.type.eq('like'))
        );

      expect(likes).toBeDefined();
    });

    it('should handle comment operations', async () => {
      // Create posts first
      const postFixtures = FeedFixtures.createPosts({ count: 2 });
      
      const posts = await db.insert(schema.posts).values(
        postFixtures.map(fixture => ({
          id: fixture.id,
          author: fixture.author,
          content: fixture.content,
          contentCid: fixture.contentCid,
          mediaCids: JSON.stringify(fixture.mediaCids),
          type: fixture.type,
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          onchainRef: fixture.onchainRef,
          engagement: JSON.stringify(fixture.engagement),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      // Create comments
      const commentFixtures = FeedFixtures.createComments({
        count: 8,
        overrides: { postId: posts[0].id }
      });

      const comments = await db.insert(schema.comments).values(
        commentFixtures.map(fixture => ({
          id: fixture.id,
          postId: fixture.postId,
          author: fixture.author,
          content: fixture.content,
          contentCid: fixture.contentCid,
          parentCommentId: fixture.parentCommentId,
          createdAt: fixture.createdAt,
          updatedAt: fixture.updatedAt,
          depth: fixture.depth,
          engagement: JSON.stringify(fixture.engagement),
          metadata: JSON.stringify(fixture.metadata),
        }))
      ).returning();

      expect(comments).toHaveLength(8);

      // Test comment threading
      const postComments = await db
        .select()
        .from(schema.comments)
        .where(schema.comments.postId.eq(posts[0].id))
        .orderBy(schema.comments.createdAt.asc());

      expect(postComments).toHaveLength(8);

      // Test top-level comments
      const topLevelComments = await db
        .select()
        .from(schema.comments)
        .where(
          schema.comments.postId.eq(posts[0].id)
          .and(schema.comments.parentCommentId.isNull())
        );

      expect(topLevelComments).toBeDefined();
    });
  });

  describe('Error Handling Scenarios', () => {
    it('should handle database connection errors gracefully', async () => {
      // Test with invalid connection
      const invalidSeeder = new DatabaseSeeder('postgresql://invalid:invalid@localhost:5432/invalid');
      
      await expect(invalidSeeder.seed({ userCount: 1 })).rejects.toThrow();
      await invalidSeeder.close();
    });

    it('should handle constraint violations', async () => {
      // Try to insert duplicate IDs
      const userFixture = UserFixtures.createUser();
      
      const userData = {
        id: userFixture.id,
        walletAddress: userFixture.walletAddress,
        username: userFixture.username,
        displayName: userFixture.displayName,
        reputation: userFixture.reputation,
        joinedAt: userFixture.joinedAt,
        lastActiveAt: userFixture.lastActiveAt,
        isVerified: userFixture.isVerified,
        preferences: JSON.stringify(userFixture.preferences),
        stats: JSON.stringify(userFixture.stats),
        socialLinks: JSON.stringify(userFixture.socialLinks),
      };

      // First insert should succeed
      await db.insert(schema.users).values(userData);

      // Second insert with same ID should fail
      await expect(db.insert(schema.users).values(userData)).rejects.toThrow();
    });

    it('should handle invalid data types', async () => {
      // Try to insert invalid data
      const invalidUserData = {
        id: 'valid-id',
        walletAddress: 'invalid-address', // Should be valid wallet format
        username: null, // Should be string or undefined
        reputation: 'not-a-number', // Should be number
        joinedAt: 'not-a-date', // Should be Date
        lastActiveAt: new Date(),
        isVerified: false,
        preferences: '{}',
        stats: '{}',
        socialLinks: '{}',
      };

      await expect(db.insert(schema.users).values(invalidUserData)).rejects.toThrow();
    });

    it('should handle transaction rollbacks', async () => {
      // Start a transaction that should fail
      await expect(
        db.transaction(async (tx) => {
          // Insert valid user
          const userFixture = UserFixtures.createUser();
          await tx.insert(schema.users).values({
            id: userFixture.id,
            walletAddress: userFixture.walletAddress,
            username: userFixture.username,
            displayName: userFixture.displayName,
            reputation: userFixture.reputation,
            joinedAt: userFixture.joinedAt,
            lastActiveAt: userFixture.lastActiveAt,
            isVerified: userFixture.isVerified,
            preferences: JSON.stringify(userFixture.preferences),
            stats: JSON.stringify(userFixture.stats),
            socialLinks: JSON.stringify(userFixture.socialLinks),
          });

          // Insert invalid data to cause rollback
          await tx.insert(schema.users).values({
            id: 'invalid',
            walletAddress: null, // This should cause an error
            reputation: 0,
            joinedAt: new Date(),
            lastActiveAt: new Date(),
            isVerified: false,
            preferences: '{}',
            stats: '{}',
            socialLinks: '{}',
          });
        })
      ).rejects.toThrow();

      // Verify no users were inserted due to rollback
      const users = await db.select().from(schema.users);
      expect(users).toHaveLength(0);
    });
  });

  describe('Performance Tests', () => {
    it('should handle bulk operations efficiently', async () => {
      const startTime = Date.now();
      
      // Insert 1000 users
      const userFixtures = UserFixtures.createUsers({ count: 1000 });
      
      await db.insert(schema.users).values(
        userFixtures.map(fixture => ({
          id: fixture.id,
          walletAddress: fixture.walletAddress,
          username: fixture.username,
          displayName: fixture.displayName,
          reputation: fixture.reputation,
          joinedAt: fixture.joinedAt,
          lastActiveAt: fixture.lastActiveAt,
          isVerified: fixture.isVerified,
          preferences: JSON.stringify(fixture.preferences),
          stats: JSON.stringify(fixture.stats),
          socialLinks: JSON.stringify(fixture.socialLinks),
        }))
      );

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time (adjust threshold as needed)
      expect(duration).toBeLessThan(10000); // 10 seconds
      
      // Verify all users were inserted
      const users = await db.select().from(schema.users);
      expect(users).toHaveLength(1000);
    });

    it('should handle complex queries efficiently', async () => {
      // Seed comprehensive data
      await seeder.seedComprehensive();

      const startTime = Date.now();

      // Complex query with joins and filtering
      const complexQuery = await db
        .select({
          userId: schema.users.id,
          username: schema.users.username,
          reputation: schema.users.reputation,
          communityCount: schema.communityMemberships.id,
          postCount: schema.posts.id,
        })
        .from(schema.users)
        .leftJoin(schema.communityMemberships, schema.users.id.eq(schema.communityMemberships.userId))
        .leftJoin(schema.posts, schema.users.id.eq(schema.posts.author))
        .where(schema.users.reputation.gte(500))
        .limit(50);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds
      expect(complexQuery).toBeDefined();
    });
  });
});
