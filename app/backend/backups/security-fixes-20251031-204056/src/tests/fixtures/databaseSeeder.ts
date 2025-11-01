/**
 * Database Seeder for Test Fixtures
 * Provides functionality to seed test database with realistic data
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { safeLogger } from '../utils/safeLogger';
import postgres from 'postgres';
import { safeLogger } from '../utils/safeLogger';
import * as schema from '../../db/schema';
import { safeLogger } from '../utils/safeLogger';
import {
  CommunityFixtures,
  ProductFixtures,
  UserFixtures,
  GovernanceFixtures,
  FeedFixtures,
  TestDataFactory
} from './index';

export interface SeedOptions {
  userCount?: number;
  communityCount?: number;
  productCount?: number;
  postCount?: number;
  proposalCount?: number;
  daoCount?: number;
  clean?: boolean; // Whether to clean existing data first
}

export class DatabaseSeeder {
  private db: any;
  private sql: any;

  constructor(connectionString?: string) {
    const dbUrl = connectionString || process.env.TEST_DATABASE_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('Database connection string is required');
    }
    
    this.sql = postgres(dbUrl);
    this.db = drizzle(this.sql, { schema });
  }

  /**
   * Seed the database with test data
   */
  async seed(options: SeedOptions = {}): Promise<void> {
    const {
      userCount = 50,
      communityCount = 10,
      productCount = 100,
      postCount = 200,
      proposalCount = 25,
      daoCount = 5,
      clean = true
    } = options;

    safeLogger.info('🌱 Starting database seeding...');

    try {
      if (clean) {
        await this.cleanDatabase();
      }

      // Seed in dependency order
      const users = await this.seedUsers(userCount);
      safeLogger.info(`✅ Seeded ${users.length} users`);

      const communities = await this.seedCommunities(communityCount);
      safeLogger.info(`✅ Seeded ${communities.length} communities`);

      const daos = await this.seedDAOs(daoCount);
      safeLogger.info(`✅ Seeded ${daos.length} DAOs`);

      const products = await this.seedProducts(productCount);
      safeLogger.info(`✅ Seeded ${products.length} products`);

      const posts = await this.seedPosts(postCount);
      safeLogger.info(`✅ Seeded ${posts.length} posts`);

      const proposals = await this.seedProposals(proposalCount);
      safeLogger.info(`✅ Seeded ${proposals.length} proposals`);

      // Seed relationships
      await this.seedCommunityMemberships(users, communities);
      await this.seedFollowRelationships(users);
      await this.seedPostReactions(posts, users);
      await this.seedComments(posts, users);

      safeLogger.info('🎉 Database seeding completed successfully!');
    } catch (error) {
      safeLogger.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  /**
   * Clean all test data from database
   */
  async cleanDatabase(): Promise<void> {
    safeLogger.info('🧹 Cleaning existing test data...');
    
    try {
      // Clean in reverse dependency order
      await this.db.delete(schema.votes);
      await this.db.delete(schema.proposals);
      await this.db.delete(schema.comments);
      await this.db.delete(schema.postReactions);
      await this.db.delete(schema.posts);
      await this.db.delete(schema.products);
      await this.db.delete(schema.communityMemberships);
      await this.db.delete(schema.communities);
      await this.db.delete(schema.followRelationships);
      await this.db.delete(schema.users);
      await this.db.delete(schema.daos);
      
      safeLogger.info('✅ Database cleaned');
    } catch (error) {
      safeLogger.error('❌ Database cleaning failed:', error);
      throw error;
    }
  }

  /**
   * Seed users
   */
  private async seedUsers(count: number): Promise<any[]> {
    const userFixtures = UserFixtures.createUsers({ count });
    
    const users = userFixtures.map(fixture => ({
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
    }));

    return await this.db.insert(schema.users).values(users).returning();
  }

  /**
   * Seed communities
   */
  private async seedCommunities(count: number): Promise<any[]> {
    const communityFixtures = CommunityFixtures.createCommunities({ count });
    
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

    return await this.db.insert(schema.communities).values(communities).returning();
  }

  /**
   * Seed DAOs
   */
  private async seedDAOs(count: number): Promise<any[]> {
    const daoFixtures = GovernanceFixtures.createDAOs({ count });
    
    const daos = daoFixtures.map(fixture => ({
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
    }));

    return await this.db.insert(schema.daos).values(daos).returning();
  }

  /**
   * Seed products
   */
  private async seedProducts(count: number): Promise<any[]> {
    const productFixtures = ProductFixtures.createProducts({ count });
    
    const products = productFixtures.map(fixture => ({
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
    }));

    return await this.db.insert(schema.products).values(products).returning();
  }

  /**
   * Seed posts
   */
  private async seedPosts(count: number): Promise<any[]> {
    const postFixtures = FeedFixtures.createPosts({ count });
    
    const posts = postFixtures.map(fixture => ({
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
    }));

    return await this.db.insert(schema.posts).values(posts).returning();
  }

  /**
   * Seed proposals
   */
  private async seedProposals(count: number): Promise<any[]> {
    const proposalFixtures = GovernanceFixtures.createProposals({ count });
    
    const proposals = proposalFixtures.map(fixture => ({
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
    }));

    return await this.db.insert(schema.proposals).values(proposals).returning();
  }

  /**
   * Seed community memberships
   */
  private async seedCommunityMemberships(users: any[], communities: any[]): Promise<void> {
    const memberships = [];
    
    // Each user joins 2-5 random communities
    for (const user of users) {
      const joinCount = TestDataFactory.generateTestData(() => 1, { count: Math.floor(Math.random() * 4) + 2 }).length;
      const joinedCommunities = communities.sort(() => 0.5 - Math.random()).slice(0, joinCount);
      
      for (const community of joinedCommunities) {
        const membership = CommunityFixtures.createMembership({
          userId: user.id,
          communityId: community.id,
        });
        
        memberships.push({
          id: membership.id,
          userId: membership.userId,
          communityId: membership.communityId,
          role: membership.role,
          joinedAt: membership.joinedAt,
          reputation: membership.reputation,
          contributions: membership.contributions,
          isActive: membership.isActive,
          lastActivityAt: membership.lastActivityAt,
        });
      }
    }

    if (memberships.length > 0) {
      await this.db.insert(schema.communityMemberships).values(memberships);
    }
  }

  /**
   * Seed follow relationships
   */
  private async seedFollowRelationships(users: any[]): Promise<void> {
    const relationships = [];
    
    // Each user follows 5-20 random users
    for (const user of users) {
      const followCount = Math.floor(Math.random() * 16) + 5;
      const followedUsers = users
        .filter(u => u.id !== user.id)
        .sort(() => 0.5 - Math.random())
        .slice(0, followCount);
      
      for (const followedUser of followedUsers) {
        const relationship = UserFixtures.createFollowRelationship({
          followerId: user.id,
          followeeId: followedUser.id,
        });
        
        relationships.push({
          id: relationship.id,
          followerId: relationship.followerId,
          followeeId: relationship.followeeId,
          createdAt: relationship.createdAt,
          isActive: relationship.isActive,
        });
      }
    }

    if (relationships.length > 0) {
      await this.db.insert(schema.followRelationships).values(relationships);
    }
  }

  /**
   * Seed post reactions
   */
  private async seedPostReactions(posts: any[], users: any[]): Promise<void> {
    const reactions = [];
    
    for (const post of posts) {
      // 10-30% of users react to each post
      const reactionCount = Math.floor(users.length * (0.1 + Math.random() * 0.2));
      const reactingUsers = users.sort(() => 0.5 - Math.random()).slice(0, reactionCount);
      
      for (const user of reactingUsers) {
        const reaction = FeedFixtures.createReaction({
          postId: post.id,
          userId: user.id,
        });
        
        reactions.push({
          id: reaction.id,
          postId: reaction.postId,
          userId: reaction.userId,
          type: reaction.type,
          createdAt: reaction.createdAt,
          txHash: reaction.txHash,
        });
      }
    }

    if (reactions.length > 0) {
      await this.db.insert(schema.postReactions).values(reactions);
    }
  }

  /**
   * Seed comments
   */
  private async seedComments(posts: any[], users: any[]): Promise<void> {
    const comments = [];
    
    for (const post of posts) {
      // 5-15% of users comment on each post
      const commentCount = Math.floor(users.length * (0.05 + Math.random() * 0.1));
      const commentingUsers = users.sort(() => 0.5 - Math.random()).slice(0, commentCount);
      
      for (const user of commentingUsers) {
        const comment = FeedFixtures.createComment({
          postId: post.id,
          author: user.id,
        });
        
        comments.push({
          id: comment.id,
          postId: comment.postId,
          author: comment.author,
          content: comment.content,
          contentCid: comment.contentCid,
          parentCommentId: comment.parentCommentId,
          createdAt: comment.createdAt,
          updatedAt: comment.updatedAt,
          depth: comment.depth,
          engagement: JSON.stringify(comment.engagement),
          metadata: JSON.stringify(comment.metadata),
        });
      }
    }

    if (comments.length > 0) {
      await this.db.insert(schema.comments).values(comments);
    }
  }

  /**
   * Create a minimal test dataset
   */
  async seedMinimal(): Promise<void> {
    await this.seed({
      userCount: 10,
      communityCount: 3,
      productCount: 20,
      postCount: 30,
      proposalCount: 5,
      daoCount: 2,
      clean: true
    });
  }

  /**
   * Create a comprehensive test dataset
   */
  async seedComprehensive(): Promise<void> {
    await this.seed({
      userCount: 200,
      communityCount: 25,
      productCount: 500,
      postCount: 1000,
      proposalCount: 100,
      daoCount: 15,
      clean: true
    });
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    await this.sql.end();
  }
}

/**
 * CLI interface for seeding
 */
export async function runSeeder(): Promise<void> {
  const seeder = new DatabaseSeeder();
  
  try {
    const seedType = process.argv[2] || 'default';
    
    switch (seedType) {
      case 'minimal':
        await seeder.seedMinimal();
        break;
      case 'comprehensive':
        await seeder.seedComprehensive();
        break;
      case 'clean':
        await seeder.cleanDatabase();
        break;
      default:
        await seeder.seed();
        break;
    }
  } finally {
    await seeder.close();
  }
}

// Run seeder if called directly
if (require.main === module) {
  runSeeder().catch(safeLogger.error);
}