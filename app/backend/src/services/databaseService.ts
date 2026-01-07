import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import * as schema from "../db/schema";
import { eq, and, or, ilike, desc, lt, gte, lte, sql, inArray } from "drizzle-orm";
import { ValidationHelper, ValidationError } from "../models/validation";
import * as postgres from 'postgres';
import * as dotenv from "dotenv";
import { db as databaseInstance } from '../db/index';

dotenv.config();

export class DatabaseService {
  public db: any; // Changed from private to public for testing
  private isConnected: boolean = false;
  private static initialized: boolean = false;

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // Use the database instance from db/index.ts
      if (databaseInstance) {
        this.db = databaseInstance;
        this.isConnected = true;
        // Only log once on first initialization
        if (!DatabaseService.initialized) {
          safeLogger.info('✅ Database service initialized successfully');
          DatabaseService.initialized = true;
        }
      } else {
        safeLogger.warn('⚠️ Database service running in offline mode - no database connection available');
        this.isConnected = false;
        // Initialize with a mock database object to prevent undefined access
        this.db = {
          execute: () => Promise.resolve({ rows: [] }),
          select: () => ({ from: () => Promise.resolve([]) }),
          insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
          update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
          delete: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) })
        };
      }
    } catch (error) {
      safeLogger.error('❌ Failed to initialize database service:', error);
      this.isConnected = false;
      // Initialize with a mock database object to prevent undefined access
      this.db = {
        execute: () => Promise.resolve({ rows: [] }),
        select: () => ({ from: () => Promise.resolve([]) }),
        insert: () => ({ values: () => ({ returning: () => Promise.resolve([]) }) }),
        update: () => ({ set: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) }) }),
        delete: () => ({ where: () => ({ returning: () => Promise.resolve([]) }) })
      };
    }
  }

  public isDatabaseConnected(): boolean {
    return this.isConnected;
  }

  private checkConnection() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not available. Please configure DATABASE_URL environment variable.');
    }
  }

  private async executeQuery<T>(operation: () => Promise<T>): Promise<T> {
    this.checkConnection();
    return await operation();
  }

  public getDatabase() {
    this.checkConnection();
    return this.db;
  }

  /**
   * Execute raw SQL query
   * @param query SQL query string
   * @param params Query parameters
   * @returns Query result
   */
  public async query(query: string, params: any[] = []) {
    this.checkConnection();
    try {
      // Use the drizzle ORM's execute method for raw SQL queries
      const result = await this.db.execute(sql.raw(query), params);
      return { rows: result };
    } catch (error) {
      safeLogger.error('Database query error:', error);
      throw error;
    }
  }
  // User operations
  async createUser(address: string, handle?: string, profileCid?: string) {
    this.checkConnection();
    try {
      const result = await this.db.insert(schema.users).values({
        walletAddress: address,
        handle: handle || null,
        profileCid: profileCid || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating user:", error);
      throw error;
    }
  }



  // Post operations
  async createPost(authorId: string, contentCid: string, parentId?: string, mediaCids?: string[], tags?: string[], onchainRef?: string, content?: string, title?: string, isRepost: boolean = false, mediaUrls?: string[], location?: any) {
    try {
      const result = await this.db.insert(schema.posts).values({
        authorId,
        contentCid,
        content: content ?? null, // Store content as provided (preserve empty strings)
        title: title ?? null, // Store title as provided (preserve empty strings)
        parentId: parentId || null,
        isRepost,
        mediaCids: mediaCids ? JSON.stringify(mediaCids) : null,
        tags: tags ? JSON.stringify(tags) : null,
        onchainRef: onchainRef || null,
        mediaUrls: mediaUrls ? JSON.stringify(mediaUrls) : null,
        location: location || null,
        isTokenGated: false,
        updatedAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating post:", error);
      throw error;
    }
  }

  async getPostsByAuthor(authorId: string) {
    try {
      return await this.db
        .select({
          id: schema.posts.id,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .where(eq(schema.posts.authorId, authorId))
        .orderBy(desc(schema.posts.createdAt));
    } catch (error) {
      safeLogger.error("Error getting posts by author:", error);
      throw error;
    }
  }

  async getPostById(id: string) {
    try {
      const result = await this.db
        .select({
          id: schema.posts.id,
          shareId: schema.posts.shareId,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          upvotes: schema.posts.upvotes,
          downvotes: schema.posts.downvotes,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .where(eq(schema.posts.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting post by ID:", error);
      throw error;
    }
  }

  async getStatusById(id: string) {
    try {
      const result = await this.db
        .select({
          id: schema.statuses.id,
          shareId: schema.statuses.shareId,
          authorId: schema.statuses.authorId,
          content: schema.statuses.content,
          contentCid: schema.statuses.contentCid,
          parentId: schema.statuses.parentId,
          mediaCids: schema.statuses.mediaCids,
          tags: schema.statuses.tags,
          stakedValue: schema.statuses.stakedValue,
          reputationScore: schema.statuses.reputationScore,
          isTokenGated: schema.statuses.isTokenGated,
          gatedContentPreview: schema.statuses.gatedContentPreview,
          moderationStatus: schema.statuses.moderationStatus,
          moderationWarning: schema.statuses.moderationWarning,
          riskScore: schema.statuses.riskScore,
          upvotes: schema.statuses.upvotes,
          downvotes: schema.statuses.downvotes,
          createdAt: schema.statuses.createdAt,
          updatedAt: schema.statuses.updatedAt,
        })
        .from(schema.statuses)
        .where(eq(schema.statuses.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting status by ID:", error);
      throw error;
    }
  }

  async getUserRepostIds(userId: string): Promise<Set<string>> {
    try {
      const regularReposts = await this.db
        .select({ parentId: schema.posts.parentId })
        .from(schema.posts)
        .where(and(eq(schema.posts.authorId, userId), eq(schema.posts.isRepost, true)));

      const statusReposts = await this.db
        .select({ parentId: schema.statuses.parentId })
        .from(schema.statuses)
        .where(and(eq(schema.statuses.authorId, userId), eq(schema.statuses.isRepost, true)));

      const ids = new Set<string>();
      regularReposts.forEach((r: any) => { if (r.parentId) ids.add(r.parentId.toString()); });
      statusReposts.forEach((r: any) => { if (r.parentId) ids.add(r.parentId.toString()); });

      return ids;
    } catch (error) {
      safeLogger.error("Error getting user repost IDs:", error);
      return new Set();
    }
  }

  async getStatusesByAuthor(authorId: string) {
    try {
      return await this.db
        .select({
          id: schema.statuses.id,
          authorId: schema.statuses.authorId,
          content: schema.statuses.content,
          contentCid: schema.statuses.contentCid,
          parentId: schema.statuses.parentId,
          mediaCids: schema.statuses.mediaCids,
          tags: schema.statuses.tags,
          stakedValue: schema.statuses.stakedValue,
          reputationScore: schema.statuses.reputationScore,
          isTokenGated: schema.statuses.isTokenGated,
          gatedContentPreview: schema.statuses.gatedContentPreview,
          moderationStatus: schema.statuses.moderationStatus,
          moderationWarning: schema.statuses.moderationWarning,
          riskScore: schema.statuses.riskScore,
          upvotes: schema.statuses.upvotes,
          downvotes: schema.statuses.downvotes,
          createdAt: schema.statuses.createdAt,
          updatedAt: schema.statuses.updatedAt,
          onchainRef: schema.statuses.onchainRef,
          isRepost: schema.statuses.isRepost
        })
        .from(schema.statuses)
        .where(eq(schema.statuses.authorId, authorId))
        .orderBy(desc(schema.statuses.createdAt));
    } catch (error) {
      safeLogger.error("Error getting statuses by author:", error);
      throw error;
    }
  }

  async getRepostCounts(postIds: string[]): Promise<Map<string, number>> {
    if (!postIds.length) return new Map();
    try {
      const counts = new Map<string, number>();

      // Count in posts table
      const regularCounts = await this.db
        .select({
          parentId: schema.posts.parentId,
          count: sql`count(*)`.mapWith(Number)
        })
        .from(schema.posts)
        .where(
          and(
            inArray(schema.posts.parentId, postIds),
            eq(schema.posts.isRepost, true)
          )
        )
        .groupBy(schema.posts.parentId);

      // Count in statuses table
      const statusCounts = await this.db
        .select({
          parentId: schema.statuses.parentId,
          count: sql`count(*)`.mapWith(Number)
        })
        .from(schema.statuses)
        .where(
          and(
            inArray(schema.statuses.parentId, postIds),
            eq(schema.statuses.isRepost, true)
          )
        )
        .groupBy(schema.statuses.parentId);

      // Aggregate
      regularCounts.forEach((r: any) => {
        if (r.parentId) counts.set(r.parentId.toString(), (counts.get(r.parentId.toString()) || 0) + r.count);
      });
      statusCounts.forEach((r: any) => {
        if (r.parentId) counts.set(r.parentId.toString(), (counts.get(r.parentId.toString()) || 0) + r.count);
      });

      return counts;
    } catch (error) {
      safeLogger.error("Error getting repost counts:", error);
      return new Map();
    }
  }

  async getPostByShareId(shareId: string) {
    try {
      const result = await this.db
        .select({
          id: schema.posts.id,
          shareId: schema.posts.shareId,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .where(eq(schema.posts.shareId, shareId));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting post by share ID:", error);
      throw error;
    }
  }

  async getStatusByShareId(shareId: string) {
    try {
      const result = await this.db
        .select({
          id: schema.statuses.id,
          shareId: schema.statuses.shareId,
          authorId: schema.statuses.authorId,
          content: schema.statuses.content,
          contentCid: schema.statuses.contentCid,
          parentId: schema.statuses.parentId,
          mediaCids: schema.statuses.mediaCids,
          tags: schema.statuses.tags,
          stakedValue: schema.statuses.stakedValue,
          reputationScore: schema.statuses.reputationScore,
          isTokenGated: schema.statuses.isTokenGated,
          gatedContentPreview: schema.statuses.gatedContentPreview,
          moderationStatus: schema.statuses.moderationStatus,
          moderationWarning: schema.statuses.moderationWarning,
          riskScore: schema.statuses.riskScore,
          upvotes: schema.statuses.upvotes,
          downvotes: schema.statuses.downvotes,
          createdAt: schema.statuses.createdAt,
          updatedAt: schema.statuses.updatedAt,
        })
        .from(schema.statuses)
        .where(eq(schema.statuses.shareId, shareId));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting status by share ID:", error);
      throw error;
    }
  }

  async getPostsByTag(tag: string) {
    try {
      safeLogger.info(`Getting posts by tag: ${tag}`);
      const result = await this.db

        .select({
          id: schema.posts.id,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .orderBy(desc(schema.posts.createdAt));
      safeLogger.info(`Retrieved ${result.length} posts from database`);
      return result;
    } catch (error) {
      safeLogger.error("Error getting all posts:", error);
      throw error;
    }
  }



  async getPostsByCommunity(communityId: string) {
    try {
      const result = await this.db
        .select({
          id: schema.posts.id,
          shareId: schema.posts.shareId,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .where(eq(schema.posts.communityId, communityId))
        .orderBy(desc(schema.posts.createdAt));

      return result;
    } catch (error) {
      safeLogger.error("Error getting posts by community:", error);
      throw error;
    }
  }

  async getAllPosts() {
    try {
      const result = await this.db
        .select({
          id: schema.posts.id,
          authorId: schema.posts.authorId,
          title: schema.posts.title,
          content: schema.posts.content,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          stakedValue: schema.posts.stakedValue,
          reputationScore: schema.posts.reputationScore,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          pollId: schema.posts.pollId,
          isTokenGated: schema.posts.isTokenGated,
          gatedContentPreview: schema.posts.gatedContentPreview,
          moderationStatus: schema.posts.moderationStatus,
          moderationWarning: schema.posts.moderationWarning,
          riskScore: schema.posts.riskScore,
          createdAt: schema.posts.createdAt,
          updatedAt: schema.posts.updatedAt,
        })
        .from(schema.posts)
        .orderBy(desc(schema.posts.createdAt));

      safeLogger.info(`Retrieved ${result.length} posts from database`);
      return result;
    } catch (error) {
      safeLogger.error("Error getting all posts:", error);
      throw error;
    }
  }

  async updatePost(id: string, updates: any) {
    try {
      const result = await this.db
        .update(schema.posts)
        .set({
          ...updates,
          updatedAt: new Date()
        })
        .where(eq(schema.posts.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating post:", error);
      throw error;
    }
  }

  async deletePost(id: string) {
    try {
      // Delete related data first (foreign key constraints)
      await Promise.all([
        this.db.delete(schema.postTags).where(eq(schema.postTags.postId, id)),
        this.db.delete(schema.reactions).where(eq(schema.reactions.postId, id)),
        this.db.delete(schema.tips).where(eq(schema.tips.postId, id))
      ]);

      // Delete the post
      const result = await this.db
        .delete(schema.posts)
        .where(eq(schema.posts.id, id))
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error("Error deleting post:", error);
      throw error;
    }
  }

  // Follow operations
  async followUser(followerId: string, followingId: string) {
    try {
      const result = await this.db.insert(schema.follows).values({
        followerId,
        followingId
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error following user:", error);
      throw error;
    }
  }

  async unfollowUser(followerId: string, followingId: string) {
    try {
      await this.db.delete(schema.follows).where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId)
        )
      );
    } catch (error) {
      safeLogger.error("Error unfollowing user:", error);
      throw error;
    }
  }

  async getFollowers(userId: string) {
    try {
      return await this.db.select().from(schema.follows).where(eq(schema.follows.followingId, userId));
    } catch (error) {
      safeLogger.error("Error getting followers:", error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  async getFollowing(userId: string) {
    try {
      return await this.db.select().from(schema.follows).where(eq(schema.follows.followerId, userId));
    } catch (error) {
      safeLogger.error("Error getting following:", error);
      // Return empty array instead of throwing to prevent crashes
      return [];
    }
  }

  // Payment operations
  async createPayment(from: string, to: string, token: string, amount: string, txHash?: string, memo?: string) {
    try {
      const result = await this.db.insert(schema.payments).values({
        from,
        to,
        token,
        amount,
        txHash: txHash || null,
        memo: memo || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating payment:", error);
      throw error;
    }
  }

  // Proposal operations
  async createProposal(daoId: string, titleCid?: string, bodyCid?: string, startBlock?: string, endBlock?: string) {
    try {
      const result = await this.db.insert(schema.proposals).values({
        daoId,
        titleCid: titleCid || null,
        bodyCid: bodyCid || null,
        startBlock: startBlock || null,
        endBlock: endBlock || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating proposal:", error);
      throw error;
    }
  }

  // Bot operations
  async createBot(name: string, persona: string, scopes: string, model: string) {
    try {
      const result = await this.db.insert(schema.bots).values({
        name,
        persona,
        scopes,
        model
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating bot:", error);
      throw error;
    }
  }

  // Embedding operations
  async createEmbedding(objectType: string, objectId: string, embedding: string[]) {
    try {
      const result = await this.db.insert(schema.embeddings).values({
        objectType,
        objectId,
        // Convert array to JSON string for storage
        embedding: JSON.stringify(embedding)
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating embedding:", error);
      throw error;
    }
  }

  async searchEmbeddings(queryEmbedding: string[], limit: number = 5) {
    try {
      // This is a simplified version. In practice, you'd use the pgvector <-> operator
      // For now, we'll return all embeddings (to be replaced with actual similarity search)
      return await this.db.select().from(schema.embeddings).limit(limit);
    } catch (error) {
      safeLogger.error("Error searching embeddings:", error);
      throw error;
    }
  }

  // Marketplace operations
  // Marketplace operations
  async createListing(sellerId: string, tokenAddress: string, price: string, inventory: string,
    itemType: string, listingType: string, metadataURI: string,
    nftStandard?: string, tokenId?: string, reservePrice?: string, minIncrement?: string,
    title: string = 'Untitled Listing', description: string = '', categoryId: string = 'general',
    images: string[] = [], priceCurrency: string = 'USDC') {
    try {
      // Create a plain object for metadata to store in the JSON column
      const metadataObj = {
        uri: metadataURI,
        tokenAddress,
        listingType,
        nftStandard,
        tokenId,
        reservePrice,
        minIncrement
      };

      // Ensure category exists or use default
      let finalCategoryId = categoryId;
      try {
        const catResult = await this.db.select().from(schema.categories).where(eq(schema.categories.slug, categoryId.toLowerCase())).limit(1);
        if (catResult.length > 0) {
          finalCategoryId = catResult[0].id;
        } else {
          // Get any category or default
          const anyCat = await this.db.select().from(schema.categories).limit(1);
          if (anyCat.length > 0) finalCategoryId = anyCat[0].id;
        }
      } catch (e) {
        // Fallback if category lookup fails
      }

      const result = await this.db.insert(schema.products).values({
        sellerId,
        title,
        description,
        priceAmount: price, // products uses priceAmount
        priceCurrency, // products uses priceCurrency
        categoryId: finalCategoryId,
        images: JSON.stringify(images),
        metadata: JSON.stringify(metadataObj),
        inventory: parseInt(inventory), // products uses inventory
        status: 'active',
        listingStatus: 'active',
        publishedAt: new Date(),
        mainCategory: itemType.toLowerCase(),
        metadataUri: metadataURI,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating listing:", error);
      throw error;
    }
  }

  async getListingById(id: string) {
    try {
      // Handle invalid UUID case
      if (!id || typeof id !== 'string') {
        safeLogger.warn("getListingById called with invalid ID, returning null");
        return null;
      }

      const result = await this.db.select().from(schema.listings).where(eq(schema.listings.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting listing by ID:", error);
      throw error;
    }
  }

  async getListingsBySeller(sellerId: string) {
    try {
      return await this.db.select().from(schema.listings).where(eq(schema.listings.sellerId, sellerId));
    } catch (error) {
      safeLogger.error("Error getting listings by seller:", error);
      throw error;
    }
  }

  async getAllListings() {
    try {
      return await this.db.select().from(schema.listings);
    } catch (error) {
      safeLogger.error("Error getting all listings:", error);
      throw error;
    }
  }

  async getActiveListings() {
    try {
      return await this.db.select().from(schema.listings).where(eq(schema.listings.status, 'active'));
    } catch (error) {
      safeLogger.error("Error getting active listings:", error);
      throw error;
    }
  }

  async updateListing(id: string, updates: Partial<typeof schema.listings.$inferInsert>) {
    try {
      const result = await this.db.update(schema.listings).set(updates).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating listing:", error);
      throw error;
    }
  }

  async cancelListing(id: string) {
    try {
      const result = await this.db.update(schema.listings).set({ status: 'cancelled' }).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error canceling listing:", error);
      throw error;
    }
  }

  async placeBid(listingId: string, bidderId: string, amount: string) {
    try {
      const result = await this.db.insert(schema.bids).values({
        listingId,
        bidderId,
        amount
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error placing bid:", error);
      throw error;
    }
  }

  async getBidsByListing(listingId: string) {
    try {
      return await this.db.select().from(schema.bids).where(eq(schema.bids.listingId, listingId));
    } catch (error) {
      safeLogger.error("Error getting bids by listing:", error);
      throw error;
    }
  }

  async getBidsByBidder(bidderId: string) {
    try {
      return await this.db.select().from(schema.bids).where(eq(schema.bids.bidderId, bidderId));
    } catch (error) {
      safeLogger.error("Error getting bids by bidder:", error);
      throw error;
    }
  }

  async makeOffer(listingId: string, buyerId: string, amount: string) {
    try {
      const result = await this.db.insert(schema.offers).values({
        listingId,
        buyerId,
        amount
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error making offer:", error);
      throw error;
    }
  }

  async getOffersByListing(listingId: string) {
    try {
      return await this.db.select().from(schema.offers).where(eq(schema.offers.listingId, listingId));
    } catch (error) {
      safeLogger.error("Error getting offers by listing:", error);
      throw error;
    }
  }

  async getOffersByBuyer(buyerId: string) {
    try {
      return await this.db.select().from(schema.offers).where(eq(schema.offers.buyerId, buyerId));
    } catch (error) {
      safeLogger.error("Error getting offers by buyer:", error);
      throw error;
    }
  }

  async acceptOffer(offerId: string) {
    try {
      const result = await this.db.update(schema.offers).set({ accepted: true }).where(eq(schema.offers.id, offerId)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error accepting offer:", error);
      throw error;
    }
  }

  async createEscrow(listingId: string, buyerId: string, sellerId: string, amount: string,
    deliveryInfo?: string) {
    try {
      const result = await this.db.insert(schema.escrows).values({
        listingId,
        buyerId,
        sellerId,
        amount,
        deliveryInfo: deliveryInfo || null,
        deliveryConfirmed: false
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating escrow:", error);
      throw error;
    }
  }

  async getEscrowById(id: string) {
    try {
      const result = await this.db.select().from(schema.escrows).where(eq(schema.escrows.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting escrow by ID:", error);
      throw error;
    }
  }

  async getEscrowsByUser(userId: string) {
    try {
      return await this.db.select().from(schema.escrows).where(
        or(eq(schema.escrows.buyerId, userId), eq(schema.escrows.sellerId, userId))
      );
    } catch (error) {
      safeLogger.error("Error getting escrows by user:", error);
      throw error;
    }
  }

  async updateEscrow(id: string, updates: Partial<typeof schema.escrows.$inferInsert>) {
    try {
      const result = await this.db.update(schema.escrows).set(updates).where(eq(schema.escrows.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating escrow:", error);
      throw error;
    }
  }

  async confirmDelivery(escrowId: string, deliveryInfo: string) {
    try {
      const result = await this.db.update(schema.escrows).set({
        deliveryInfo,
        deliveryConfirmed: true
      }).where(eq(schema.escrows.id, escrowId)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error confirming delivery:", error);
      throw error;
    }
  }

  async createOrder(listingId: string, buyerId: string, sellerId: string, amount: string,
    paymentToken: string, escrowId?: string, variantId?: string, orderId?: string) {
    try {
      return await this.db.transaction(async (tx: any) => {
        // 1a. Handle variant inventory if variant is specified
        if (variantId) {
          const variantResult = await tx.execute(sql`
            SELECT inventory, reserved_inventory, is_available
            FROM product_variants
            WHERE id = ${variantId}
            FOR UPDATE
          `);

          if (variantResult.rows.length === 0) {
            throw new Error('Product variant not found');
          }

          const variant = variantResult.rows[0];
          const availableInventory = variant.inventory - variant.reserved_inventory;

          if (!variant.is_available || availableInventory < 1) {
            throw new Error('Selected variant is out of stock');
          }

          // Reserve inventory for this variant
          await tx.execute(sql`
            UPDATE product_variants
            SET reserved_inventory = reserved_inventory + 1
            WHERE id = ${variantId}
          `);
        }

        // 1b. Check and hold inventory with pessimistic locking
        const product = await tx.select().from(schema.products).where(eq(schema.products.id, listingId));

        safeLogger.info('[createOrder] Searching for listing:', {
          listingId,
          listingIdType: typeof listingId,
          productFound: product.length > 0
        });

        if (product.length === 0) {
          // Fallback to listings table check if not found in products (backward compatibility)
          safeLogger.warn('[createOrder] Product not found in products table, checking listings table:', { listingId });
          const listing = await tx.select().from(schema.listings).where(eq(schema.listings.id, listingId));

          safeLogger.info('[createOrder] Listings table search result:', {
            listingId,
            listingFound: listing.length > 0,
            listingData: listing.length > 0 ? { id: listing[0].id, status: listing[0].status, itemType: listing[0].itemType } : null
          });

          if (listing.length === 0) {
            // Debug: Check if it might be a status ID (common mistake)
            try {
              const statusCheck = await tx.select({ id: schema.statuses.id }).from(schema.statuses).where(eq(schema.statuses.id, listingId));
              if (statusCheck.length > 0) {
                safeLogger.error('[createOrder] listingId exists in statuses table but not products. Invalid checkout target.', { listingId });
                throw new Error('Cannot checkout a Status post directly. Use tips or reactions.');
              }
            } catch (ignore) {
              // Ignore UUID errors if listingId isn't a UUID
            }

            safeLogger.error('[createOrder] Product not found in either products or listings table:', {
              listingId,
              listingIdType: typeof listingId,
              buyerId,
              sellerId
            });
            throw new Error('Product not found');
          }

          if (listing[0].inventory < 1) {
            throw new Error('Insufficient inventory');
          }

          // Create inventory hold record for legacy listings
          // TODO: Re-enable when inventory table is added to schema
          /* await tx.insert(schema.inventory).values({
            productId: listingId,
            inventory: 1,
            heldBy: buyerId,
            orderId: null, // Will be updated after order creation
            holdType: 'order_pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minute timeout
            status: 'active',
            metadata: JSON.stringify({
              sellerId,
              amount,
              paymentToken,
              source: 'legacy_listing'
            })
          }); */

          // Decrement legacy listing
          await tx.update(schema.listings)
            .set({
              inventory: sql`${schema.listings.inventory} - 1`
              // inventory: sql`${schema.listings.inventory} + 1`  // TODO: Add field to schema
            })
            .where(eq(schema.listings.id, listingId));
        } else {
          if (product[0].inventory < 1) {
            throw new Error('Insufficient inventory');
          }

          // Create inventory hold record
          await tx.insert(schema.inventoryHolds).values({
            productId: listingId,
            quantity: 1,
            heldBy: buyerId,
            orderId: null, // Will be updated after order creation
            holdType: 'order_pending',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 minute timeout
            status: 'active',
            metadata: JSON.stringify({
              sellerId,
              amount,
              paymentToken,
              source: 'product'
            })
          });

          // Decrement product inventory and increment holds
          await tx.update(schema.products)
            .set({
              inventory: sql`${schema.products.inventory} - 1`,
              inventoryHolds: sql`${schema.products.inventoryHolds} + 1`
            })
            .where(eq(schema.products.id, listingId));
        }

        // 2. Create Order
        const orderValues: any = {
          listingId,
          buyerId,
          sellerId,
          amount,
          paymentToken,
          escrowId: escrowId || null,
          status: 'pending',
          createdAt: new Date(),
          inventoryHoldId: null // Will be updated in the next step
        };

        // Use provided orderId if available, otherwise let DB generate it
        if (orderId) {
          orderValues.id = orderId;
        }

        const result = await tx.insert(schema.orders).values(orderValues).returning();

        // 3. Update inventory hold with order ID
        const createdOrderId = result[0].id;
        await tx.update(schema.inventoryHolds)
          .set({
            orderId: createdOrderId.toString(),
            status: 'order_created'
          })
          .where(eq(schema.inventoryHolds.heldBy, buyerId));

        // 4. Update order with inventory hold ID
        await tx.update(schema.orders)
          .set({ inventoryHoldId: createdOrderId.toString() })
          .where(eq(schema.orders.id, createdOrderId));

        return result[0];
      });
    } catch (error) {
      safeLogger.error("Error creating order:", error);
      throw error;
    }
  }

  /**
   * Release inventory hold when order is completed or cancelled
   */
  async releaseInventoryHold(holdId: string, reason: 'order_completed' | 'order_cancelled' | 'expired'): Promise<void> {
    try {
      await this.db.transaction(async (tx: any) => {
        const hold = await tx.select().from(schema.inventoryHolds).where(eq(schema.inventoryHolds.id, holdId));

        if (hold.length === 0) {
          throw new Error('Inventory hold not found');
        }

        const inventoryHold = hold[0];

        // Update hold status
        await tx.update(schema.inventoryHolds)
          .set({
            status: reason === 'order_completed' ? 'consumed' : 'released',
            releasedAt: new Date(),
            releaseReason: reason
          })
          .where(eq(schema.inventoryHolds.id, holdId));

        // Only return inventory if order was cancelled or expired (not completed)
        if (reason !== 'order_completed') {
          // Check if it's a legacy listing or product
          const product = await tx.select().from(schema.products).where(eq(schema.products.id, inventoryHold.productId));

          if (product.length === 0) {
            // Legacy listing - restore inventory
            /*
            await tx.update(schema.listings)
              .set({
                inventory: sql`${schema.listings.inventory} + 1`
              })
              .where(eq(schema.listings.id, inventoryHold.productId));
            */
            safeLogger.warn('Legacy listing inventory restoration not fully implemented');
          } else {
            // Product - restore inventory
            await tx.update(schema.products)
              .set({
                inventory: sql`${schema.products.inventory} + 1`,
                inventoryHolds: sql`${schema.products.inventoryHolds} - 1`
              })
              .where(eq(schema.products.id, inventoryHold.productId));
          }
        } else {
          // When order is completed, increment sales count for the product
          const product = await tx.select().from(schema.products).where(eq(schema.products.id, inventoryHold.productId));

          if (product.length > 0) {
            // Product - increment sales count
            await tx.update(schema.products)
              .set({
                salesCount: sql`${schema.products.salesCount} + 1`
              })
              .where(eq(schema.products.id, inventoryHold.productId));
          }
        }
      });
    } catch (error) {
      safeLogger.error("Error releasing inventory hold:", error);
      throw error;
    }
  }

  /**
   * Find and release expired inventory holds
   */
  async releaseExpiredInventory(): Promise<number> {
    try {
      const expiredHolds = await this.db
        .select()
        .from(schema.inventoryHolds)
        .where(
          and(
            eq(schema.inventoryHolds.status, 'active'),
            lt(schema.inventoryHolds.expiresAt, new Date())
          )
        );

      let releasedCount = 0;

      for (const hold of expiredHolds) {
        try {
          await this.releaseInventoryHold(hold.id, 'expired');
          releasedCount++;

          // Update associated order if it exists
          if (hold.orderId) {
            await this.updateOrder(hold.orderId, {
              status: 'cancelled',
              metadata: JSON.stringify({
                reason: 'Inventory hold expired',
                expiredAt: new Date()
              })
            });
          }
        } catch (error) {
          safeLogger.error(`Failed to release expired hold ${hold.id}:`, error);
        }
      }

      safeLogger.info(`Released ${releasedCount} expired inventory holds`);
      return releasedCount;
    } catch (error) {
      safeLogger.error("Error releasing expired inventory holds:", error);
      throw error;
    }
  }

  /**
   * Check available inventory for a product
   */
  async checkAvailableInventory(productId: string): Promise<{
    available: string;
    held: string;
    total: string;
  }> {
    try {
      // Check if it's a product or legacy listing
      const product = await this.db.select().from(schema.products).where(eq(schema.products.id, productId));

      if (product.length === 0) {
        // Legacy listing
        const listing = await this.db.select().from(schema.listings).where(eq(schema.listings.id, productId));
        if (listing.length === 0) {
          return { available: '0', held: '0', total: '0' };
        }

        return {
          available: String(Math.max(0, listing[0].inventory)),
          held: String(listing[0].inventory_holds || 0),
          total: String(listing[0].inventory + (listing[0].inventoryHolds || 0))
        };
      } else {
        // Product
        return {
          available: String(Math.max(0, product[0].inventory)),
          held: String(product[0].inventory || 0),
          total: String(product[0].inventory + (product[0].inventory || 0))
        };
      }
    } catch (error) {
      safeLogger.error("Error checking available inventory:", error);
      return { available: '0', held: '0', total: '0' };
    }
  }

  /**
   * Fulfill order and consume inventory hold
   */
  async fulfillOrder(orderId: string): Promise<void> {
    try {
      await this.db.transaction(async (tx: any) => {
        const order = await tx.select().from(schema.orders).where(eq(schema.orders.id, orderId));

        if (order.length === 0) {
          throw new Error('Order not found');
        }

        const orderData = order[0];

        // Update order status
        await tx.update(schema.orders)
          .set({
            status: 'completed',
            completedAt: new Date()
          })
          .where(eq(schema.orders.id, orderId));

        // Increment sales_count for the product/listing
        await tx.execute(sql`
          UPDATE products 
          SET sales_count = COALESCE(sales_count, 0) + 1
          WHERE id = ${orderData.listingId}
        `);

        await tx.execute(sql`
          UPDATE listings 
          SET sales_count = COALESCE(sales_count, 0) + 1
          WHERE id = ${orderData.listingId}
        `);

        // If order has a variant, decrement variant inventory and increment its sales
        if (orderData.variant_id) {
          await tx.execute(sql`
            UPDATE product_variants
            SET 
              reserved_inventory = GREATEST(reserved_inventory - 1, 0),
              inventory = GREATEST(inventory - 1, 0)
            WHERE id = ${orderData.variant_id}
          `);
        }

        // Release inventory hold as consumed
        if (orderData.inventoryHoldId) {
          await this.releaseInventoryHold(orderData.inventoryHoldId, 'order_completed');
        }
      });
    } catch (error) {
      safeLogger.error("Error fulfilling order:", error);
      throw error;
    }
  }

  async getOrderById(id: string) {
    try {
      const result = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting order by ID:", error);
      throw error;
    }
  }

  async getPaymentMethods() {
    try {
      // Return hardcoded payment methods for now
      return [
        { id: 'crypto', name: 'Cryptocurrency', enabled: true },
        { id: 'card', name: 'Credit Card', enabled: true }
      ];
    } catch (error) {
      safeLogger.error("Error getting payment methods:", error);
      throw error;
    }
  }

  // Receipt Operations
  async createReceipt(receiptData: any) {
    try {
      const result = await this.db.insert(schema.orderReceipts).values({
        id: receiptData.id,
        orderId: receiptData.orderId,
        receiptNumber: receiptData.receiptNumber,
        buyerInfo: receiptData.buyerInfo ? JSON.stringify(receiptData.buyerInfo) : null,
        items: receiptData.items ? JSON.stringify(receiptData.items) : null,
        pricing: receiptData.pricing ? JSON.stringify(receiptData.pricing) : null,
        paymentDetails: receiptData.paymentDetails ? JSON.stringify(receiptData.paymentDetails) : null,
        pdfUrl: receiptData.pdfUrl,
        emailSentAt: receiptData.emailSentAt,
        createdAt: receiptData.createdAt
      }).returning();
      return result[0];
    } catch (error) {
      safeLogger.error("Error creating receipt:", error);
      throw error;
    }
  }

  async getReceiptById(id: string) {
    try {
      const result = await this.db
        .select()
        .from(schema.orderReceipts)
        .where(eq(schema.orderReceipts.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting receipt by ID:", error);
      throw error;
    }
  }

  async getReceiptsByOrderId(orderId: string) {
    try {
      return await this.db
        .select()
        .from(schema.orderReceipts)
        .where(eq(schema.orderReceipts.orderId, orderId));
    } catch (error) {
      safeLogger.error("Error getting receipts by order ID:", error);
      throw error;
    }
  }

  async getReceiptsByUser(userAddress: string, limit: number = 50, offset: number = 0) {
    try {
      // Join with orders to filter by user
      // This is a bit complex with current schema because orderReceipts doesn't have userAddress directly
      // But we stored buyerInfo which might have it, or we join with orders
      // For now, let's assume we can join with orders
      return await this.db
        .select({
          receipt: schema.orderReceipts,
          order: schema.orders
        })
        .from(schema.orderReceipts)
        .leftJoin(schema.orders, eq(schema.orderReceipts.orderId, schema.orders.id))
        .where(eq(schema.orders.buyerAddress, userAddress))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      safeLogger.error("Error getting receipts by user:", error);
      throw error;
    }
  }

  async updateReceiptStatus(id: string, status: string, metadata?: any) {
    try {
      // order_receipts doesn't have a status field in the new schema?
      // Wait, let me check schema again. `order_receipts` has: id, order_id, receipt_number, buyer_info, items, pricing, payment_details, pdf_url, email_sent_at, created_at.
      // It does NOT have status. Status is on the Order.
      // So updateReceiptStatus might not be relevant for order_receipts table directly, or we need to add it.
      // The Implementation Plan didn't specify status on order_receipts.
      // But ReceiptService expects it.
      // Let's check schema.ts again.
      // Verify schema before implementing this.
      return false;
    } catch (error) {
      safeLogger.error("Error updating receipt status:", error);
      throw error;
    }
  }

  async getOrdersByUser(userId: string) {
    try {
      return await this.db.select().from(schema.orders).where(
        or(eq(schema.orders.buyerId, userId), eq(schema.orders.sellerId, userId))
      );
    } catch (error) {
      safeLogger.error("Error getting orders by user:", error);
      throw error;
    }
  }

  async updateOrder(id: string, updates: Partial<typeof schema.orders.$inferInsert>) {
    try {
      const result = await this.db.update(schema.orders).set(updates).where(eq(schema.orders.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating order:", error);
      throw error;
    }
  }

  // Cancellation Operations
  async createCancellationRequest(data: {
    orderId: string;
    requesterId: string;
    reason: string;
    description?: string;
    status: string;
  }) {
    try {
      const result = await this.db.insert(schema.orderCancellations).values({
        orderId: data.orderId,
        requesterId: data.requesterId,
        reason: data.reason,
        description: data.description,
        status: data.status,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      return result[0];
    } catch (error) {
      safeLogger.error("Error creating cancellation request:", error);
      throw error;
    }
  }

  async getCancellationByOrderId(orderId: string) {
    try {
      const result = await this.db
        .select()
        .from(schema.orderCancellations)
        .where(eq(schema.orderCancellations.orderId, orderId));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting cancellation by order ID:", error);
      throw error;
    }
  }

  async updateCancellationStatus(id: string, status: string, resolutionNotes?: string, refundAmount?: string) {
    try {
      const result = await this.db
        .update(schema.orderCancellations)
        .set({
          status,
          resolutionNotes,
          refundAmount,
          resolvedAt: status === 'approved' || status === 'rejected' ? new Date() : undefined,
          updatedAt: new Date()
        })
        .where(eq(schema.orderCancellations.id, id))
        .returning();
      return result[0];
    } catch (error) {
      safeLogger.error("Error updating cancellation status:", error);
      throw error;
    }
  }

  async createDispute(escrowId: string, reporterId: string, reason: string, evidence?: string) {
    try {
      const result = await this.db.insert(schema.disputes).values({
        escrowId,
        reporterId,
        reason,
        evidence: evidence || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating dispute:", error);
      throw error;
    }
  }

  async getDisputeById(id: number) {
    try {
      const result = await this.db.select().from(schema.disputes).where(eq(schema.disputes.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting dispute by ID:", error);
      throw error;
    }
  }

  async getDisputesByUser(userId: string) {
    try {
      return await this.db.select().from(schema.disputes).where(eq(schema.disputes.reporterId, userId));
    } catch (error) {
      safeLogger.error("Error getting disputes by user:", error);
      throw error;
    }
  }

  async updateDispute(id: number, updates: Partial<typeof schema.disputes.$inferInsert>) {
    try {
      const result = await this.db.update(schema.disputes).set(updates).where(eq(schema.disputes.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating dispute:", error);
      throw error;
    }
  }

  async createUserReputation(address: string, score: string, daoApproved: boolean) {
    try {
      const result = await this.db.insert(schema.reputations).values({
        walletAddress: address,
        score,
        daoApproved
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating user reputation:", error);
      throw error;
    }
  }

  async getUserReputation(address: string) {
    try {
      const result = await this.db.select().from(schema.reputations).where(eq(schema.reputations.walletAddress, address));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting user reputation:", error);
      throw error;
    }
  }

  async updateUserReputation(address: string, updates: Partial<typeof schema.reputations.$inferInsert>) {
    try {
      const result = await this.db.update(schema.reputations).set(updates).where(eq(schema.reputations.walletAddress, address)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating user reputation:", error);
      throw error;
    }
  }

  async getDAOApprovedVendors() {
    try {
      return await this.db.select().from(schema.reputations).where(eq(schema.reputations.daoApproved, true));
    } catch (error) {
      safeLogger.error("Error getting DAO approved vendors:", error);
      throw error;
    }
  }

  // AI Moderation operations
  async createAIModeration(objectType: string, objectId: string, aiAnalysis?: string) {
    try {
      const result = await this.db.insert(schema.aiModeration).values({
        objectType,
        objectId,
        aiAnalysis: aiAnalysis || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating AI moderation record:", error);
      throw error;
    }
  }

  async getAIModerationByObject(objectType: string, objectId: string) {
    try {
      const result = await this.db.select().from(schema.aiModeration).where(
        and(
          eq(schema.aiModeration.objectType, objectType),
          eq(schema.aiModeration.objectId, objectId)
        )
      );
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting AI moderation record:", error);
      throw error;
    }
  }

  async updateAIModeration(id: string, updates: Partial<typeof schema.aiModeration.$inferInsert>) {
    try {
      const result = await this.db.update(schema.aiModeration).set(updates).where(eq(schema.aiModeration.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating AI moderation record:", error);
      throw error;
    }
  }

  async getPendingAIModeration() {
    try {
      return await this.db.select().from(schema.aiModeration).where(eq(schema.aiModeration.status, 'pending'));
    } catch (error) {
      safeLogger.error("Error getting pending AI moderation records:", error);
      throw error;
    }
  }

  // Search operations
  async searchUsers(query: string, limit: number = 20, offset: number = 0): Promise<any[]> {
    try {
      const result = await this.db.select().from(schema.users).where(
        or(
          ilike(schema.users.handle, `%${query}%`),
          ilike(schema.users.walletAddress, `%${query}%`)
        )
      ).limit(limit).offset(offset);
      return result;
    } catch (error) {
      safeLogger.error("Error searching users:", error);
      throw error;
    }
  }

  async getRecentUsers(limit: number = 10) {
    try {
      const result = await this.db.select().from(schema.users)
        .orderBy(desc(schema.users.createdAt))
        .limit(limit);
      return result;
    } catch (error) {
      safeLogger.error("Error getting recent users:", error);
      throw error;
    }
  }

  // --- Product Category operations ---
  async createCategory(name: string, slug: string, description?: string, parentId?: string, path?: string, imageUrl?: string, sortOrder?: string) {
    try {
      const result = await this.db.insert(schema.categories).values({
        name,
        slug,
        description: description || null,
        parentId: parentId || null,
        path: path || JSON.stringify([name]),
        imageUrl: imageUrl || null,
        sortOrder: sortOrder || 0
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating category:", error);
      throw error;
    }
  }
  async getCategoryById(id: string) {
    try {
      const result = await this.db.select().from(schema.categories).where(eq(schema.categories.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting category by ID:", error);
      throw error;
    }
  }

  async getCategoryBySlug(slug: string) {
    try {
      const result = await this.db.select().from(schema.categories).where(eq(schema.categories.slug, slug));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting category by slug:", error);
      throw error;
    }
  }

  async getAllCategories() {
    try {
      return await this.db.select().from(schema.categories).where(eq(schema.categories.isActive, true));
    } catch (error) {
      safeLogger.error("Error getting all categories:", error);
      throw error;
    }
  }

  async updateCategory(id: string, updates: Partial<typeof schema.categories.$inferInsert>) {
    try {
      const result = await this.db.update(schema.categories).set(updates).where(eq(schema.categories.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating category:", error);
      throw error;
    }
  }

  async deleteCategory(id: string) {
    try {
      const result = await this.db.delete(schema.categories).where(eq(schema.categories.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error deleting category:", error);
      throw error;
    }
  }

  // Product operations
  async createProduct(sellerId: string, title: string, description: string, priceAmount: string, priceCurrency: string,
    categoryId: string, images: string, metadata: string, inventory: string, tags?: string,
    shipping?: string, nft?: string) {
    try {
      const result = await this.db.insert(schema.products).values({
        sellerId,
        title,
        description,
        priceAmount,
        priceCurrency,
        categoryId,
        images,
        metadata,
        inventory,
        tags: tags || null,
        shipping: shipping || null,
        nft: nft || null
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating product:", error);
      throw error;
    }
  }

  async getProductById(id: string) {
    try {
      const result = await this.db.select().from(schema.products).where(eq(schema.products.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting product by ID:", error);
      throw error;
    }
  }

  async getProductsBySeller(sellerId: string) {
    try {
      return await this.db.select().from(schema.products).where(eq(schema.products.sellerId, sellerId));
    } catch (error) {
      safeLogger.error("Error getting products by seller:", error);
      throw error;
    }
  }

  async getAllProducts() {
    try {
      return await this.db.select().from(schema.products);
    } catch (error) {
      safeLogger.error("Error getting all products:", error);
      throw error;
    }
  }

  async getActiveProducts() {
    try {
      return await this.db.select().from(schema.products).where(eq(schema.products.status, 'active'));
    } catch (error) {
      safeLogger.error("Error getting active products:", error);
      throw error;
    }
  }

  async updateProduct(id: string, updates: Partial<typeof schema.products.$inferInsert>) {
    try {
      const result = await this.db.update(schema.products).set(updates).where(eq(schema.products.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating product:", error);
      throw error;
    }
  }

  async deleteProduct(id: string) {
    try {
      const result = await this.db.delete(schema.products).where(eq(schema.products.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error deleting product:", error);
      throw error;
    }
  }

  // Product Tags operations
  async createProductTag(productId: string, tag: string) {
    try {
      const result = await this.db.insert(schema.productTags).values({
        productId,
        tag: tag.toLowerCase().trim()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating product tag:", error);
      throw error;
    }
  }

  async getProductTags(productId: string) {
    try {
      return await this.db.select().from(schema.productTags).where(eq(schema.productTags.productId, productId));
    } catch (error) {
      safeLogger.error("Error getting product tags:", error);
      throw error;
    }
  }

  async deleteProductTags(productId: string) {
    try {
      const result = await this.db.delete(schema.productTags).where(eq(schema.productTags.productId, productId)).returning();
      return result.length;
    } catch (error) {
      safeLogger.error("Error deleting product tags:", error);
      throw error;
    }
  }

  async testConnection() {
    if (!this.isConnected || !this.db) {
      throw new Error('Database not available');
    }
    try {
      // Simple query to test database connection
      await this.db.select().from(schema.users).limit(1);
      return true;
    } catch (error) {
      safeLogger.error("Database connection test failed:", error);
      throw error;
    }
  }
  // Order Management Methods
  async createOrderEvent(orderId: string, eventType: string, description: string, metadata?: string) {
    return this.executeQuery(async () => {
      const [event] = await this.db.insert(schema.orderEvents).values({
        orderId,
        eventType,
        description,
        metadata,
        timestamp: new Date()
      }).returning();
      return event;
    });
  }

  async getOrderEvents(orderId: string) {
    return this.executeQuery(async () => {
      return await this.db.select()
        .from(schema.orderEvents)
        .where(eq(schema.orderEvents.orderId, orderId))
        .orderBy(desc(schema.orderEvents.timestamp));
    });
  }

  async getOrderAnalytics(userId: string, timeframe: 'week' | 'month' | 'year') {
    return this.executeQuery(async () => {
      // Calculate date range based on timeframe
      const now = new Date();
      const startDate = new Date();

      switch (timeframe) {
        case 'week':
          startDate.setDate(now.getDate() - 7);
          break;
        case 'month':
          startDate.setMonth(now.getMonth() - 1);
          break;
        case 'year':
          startDate.setFullYear(now.getFullYear() - 1);
          break;
      }

      // Get orders for the user within the timeframe
      const orders = await this.db.select()
        .from(schema.orders)
        .where(
          and(
            or(
              eq(schema.orders.buyerId, userId),
              eq(schema.orders.sellerId, userId)
            ),
            gte(schema.orders.createdAt, startDate),
            lte(schema.orders.createdAt, now)
          )
        );

      // Calculate base analytics
      const totalOrders = orders.length;
      const totalVolume = orders.reduce((sum: string, order: any) => sum + parseFloat(order.amount || '0'), 0);
      const averageOrderValue = totalOrders > 0 ? totalVolume / totalOrders : 0;
      const completedOrders = orders.filter((order: any) => order.status === 'completed').length;
      const disputedOrders = orders.filter((order: any) => order.status === 'disputed').length;
      const cancelledOrders = orders.filter((order: any) => order.status === 'cancelled').length;
      const processingOrders = orders.filter((order: any) => ['paid', 'processing', 'shipped'].includes(order.status)).length;
      const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0;
      const disputeRate = totalOrders > 0 ? disputedOrders / totalOrders : 0;
      const cancellationRate = totalOrders > 0 ? cancelledOrders / totalOrders : 0;

      // Calculate additional metrics
      const totalRevenue = orders.reduce((sum: string, order: any) => {
        if (['completed', 'delivered'].includes(order.status)) {
          return sum + parseFloat(order.amount || '0');
        }
        return sum;
      }, 0);

      const avgShippingTime = orders.filter((order: any) => order.shippedAt && order.deliveredAt)
        .reduce((sum: string, order: any) => {
          const shippedAt = new Date(order.shippedAt);
          const deliveredAt = new Date(order.deliveredAt);
          return sum + (deliveredAt.getTime() - shippedAt.getTime()) / (1000 * 60 * 60); // in hours
        }, 0) / orders.filter((order: any) => order.shippedAt && order.deliveredAt).length || 0;

      const avgResponseTime = orders.filter((order: any) => order.respondedAt)
        .reduce((sum: string, order: any) => {
          const createdAt = new Date(order.createdAt);
          const respondedAt = new Date(order.respondedAt);
          return sum + (respondedAt.getTime() - createdAt.getTime()) / (1000 * 60); // in minutes
        }, 0) / orders.filter((order: any) => order.respondedAt).length || 0;

      // Calculate monthly trends based on timeframe
      const monthlyTrends = [];
      if (timeframe === 'year') {
        // Calculate monthly trends for the year
        for (let i = 11; i >= 0; i--) {
          const monthStart = new Date();
          monthStart.setMonth(now.getMonth() - i);
          monthStart.setDate(1);
          monthStart.setHours(0, 0, 0, 0);

          const monthEnd = new Date(monthStart);
          monthEnd.setMonth(monthStart.getMonth() + 1);
          monthEnd.setHours(0, 0, 0, -1);

          const monthOrders = orders.filter((order: any) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= monthStart && orderDate <= monthEnd;
          });

          monthlyTrends.push({
            month: monthStart.toLocaleString('default', { month: 'short', year: 'numeric' }),
            orderCount: monthOrders.length,
            volume: monthOrders.reduce((sum: string, order: any) => sum + parseFloat(order.amount || '0'), 0).toString(),
            completionRate: monthOrders.length > 0 ?
              monthOrders.filter((order: any) => order.status === 'completed').length / monthOrders.length : 0
          });
        }
      } else if (timeframe === 'month') {
        // Calculate daily trends for the month
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        for (let i = daysInMonth; i >= 1; i--) {
          const dayStart = new Date(now.getFullYear(), now.getMonth(), i, 0, 0, 0);
          const dayEnd = new Date(now.getFullYear(), now.getMonth(), i, 23, 59, 59);

          const dayOrders = orders.filter((order: any) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= dayStart && orderDate <= dayEnd;
          });

          monthlyTrends.push({
            date: dayStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            orderCount: dayOrders.length,
            volume: dayOrders.reduce((sum: string, order: any) => sum + parseFloat(order.amount || '0'), 0).toString(),
            completionRate: dayOrders.length > 0 ?
              dayOrders.filter((order: any) => order.status === 'completed').length / dayOrders.length : 0
          });
        }
      } else {
        // Calculate daily trends for the week
        for (let i = 6; i >= 0; i--) {
          const dayStart = new Date(now);
          dayStart.setDate(now.getDate() - i);
          dayStart.setHours(0, 0, 0, 0);

          const dayEnd = new Date(dayStart);
          dayEnd.setDate(dayStart.getDate() + 1);
          dayEnd.setHours(0, 0, 0, -1);

          const dayOrders = orders.filter((order: any) => {
            const orderDate = new Date(order.createdAt);
            return orderDate >= dayStart && orderDate <= dayEnd;
          });

          monthlyTrends.push({
            date: dayStart.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric' }),
            orderCount: dayOrders.length,
            volume: dayOrders.reduce((sum: string, order: any) => sum + parseFloat(order.amount || '0'), 0).toString(),
            completionRate: dayOrders.length > 0 ?
              dayOrders.filter((order: any) => order.status === 'completed').length / dayOrders.length : 0
          });
        }
      }

      // Calculate top categories (would require joining with products table)
      // For now, using a placeholder implementation
      const topCategories = [
        { category: 'Electronics', orderCount: 15, volume: '3500' },
        { category: 'Fashion', orderCount: 12, volume: '2800' },
        { category: 'Home & Garden', orderCount: 8, volume: '1900' },
        { category: 'Digital Goods', orderCount: 6, volume: '1500' },
        { category: 'Services', orderCount: 4, volume: '1200' }
      ];

      // Calculate user retention metrics if this is for a seller
      const repeatCustomerRate = orders.length > 0 ?
        orders.filter((order: any) => order.buyerId && orders.some(o => o.buyerId === order.buyerId && o.id !== order.id)).length / orders.length : 0;

      return {
        totalOrders,
        totalVolume: totalVolume.toString(),
        totalRevenue: totalRevenue.toString(),
        averageOrderValue: averageOrderValue.toString(),
        completionRate,
        disputeRate,
        cancellationRate,
        avgShippingTime,
        avgResponseTime,
        repeatCustomerRate,
        processingOrders,
        completedOrders,
        disputedOrders,
        cancelledOrders,
        topCategories,
        monthlyTrends,
        timeRange: {
          start: startDate,
          end: now,
          period: timeframe
        }
      };
    });
  }

  async createTrackingRecord(orderId: string, trackingNumber: string, carrier: string, additionalData?: { shipmentId?: string; labelUrl?: string; trackingData?: any }) {
    return this.executeQuery(async () => {
      const [record] = await this.db.insert(schema.trackingRecords).values({
        orderId: orderId,
        trackingNumber,
        carrier,
        shipmentId: additionalData?.shipmentId,
        labelUrl: additionalData?.labelUrl,
        trackingData: additionalData?.trackingData ? JSON.stringify(additionalData.trackingData) : null,
        createdAt: new Date()
      }).returning();
      return record;
    });
  }

  async updateTrackingInfo(orderId: string, trackingInfo: any) {
    return this.executeQuery(async () => {
      const [updated] = await this.db.update(schema.trackingRecords)
        .set({
          status: trackingInfo.status,
          shipmentId: trackingInfo.shipmentId || undefined,
          labelUrl: trackingInfo.labelUrl || undefined,
          trackingData: trackingInfo.trackingData ? JSON.stringify(trackingInfo.trackingData) : undefined,
          lastUpdated: new Date(),
          events: JSON.stringify(trackingInfo.events)
        })
        .where(eq(schema.trackingRecords.orderId, orderId))
        .returning();
      return updated !== null;
    });
  }

  async getTrackingRecord(orderId: string) {
    return this.executeQuery(async () => {
      const result = await this.db.select()
        .from(schema.trackingRecords)
        .where(eq(schema.trackingRecords.orderId, orderId))
        .limit(1);
      return result[0] || null;
    });
  }

  async getStaleCancellationRequests(hoursOld: number) {
    return this.executeQuery(async () => {
      const cutoff = new Date();
      cutoff.setHours(cutoff.getHours() - hoursOld);

      return await this.db.select()
        .from(schema.orderCancellations)
        .where(
          and(
            eq(schema.orderCancellations.status, 'pending'),
            lte(schema.orderCancellations.requestedAt, cutoff)
          )
        );
    });
  }

  async getTrackingRecords(orderId: string) {
    return this.executeQuery(async () => {
      const result = await this.db.select()
        .from(schema.trackingRecords)
        .where(eq(schema.trackingRecords.orderId, orderId));
      return result;
    });
  }

  async getOrderStatusCounts(userId: string, userType: 'buyer' | 'seller') {
    return this.executeQuery(async () => {
      const result = await this.db.select({
        status: schema.orders.status,
        count: sql<number>`count(*)`
      })
        .from(schema.orders)
        .where(userType === 'buyer'
          ? eq(schema.orders.buyerId, userId)
          : eq(schema.orders.sellerId, userId))
        .groupBy(schema.orders.status);

      const counts: Record<string, number> = {};
      result.forEach(row => {
        counts[row.status] = parseInt(row.count as any);
      });

      return counts;
    });
  }

  async createNotification(notification: any) {
    return this.executeQuery(async () => {
      const [created] = await this.db.insert(schema.notifications).values({
        orderId: notification.orderId,
        userAddress: notification.userAddress,
        type: notification.type,
        message: notification.message,
        metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
        read: notification.read,
        createdAt: new Date()
      }).returning();
      return created;
    });
  }

  async getUserNotifications(userAddress: string, limit: number = 50, offset: number = 0) {
    return this.executeQuery(async () => {
      return await this.db.select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userAddress, userAddress))
        .orderBy(desc(schema.notifications.createdAt))
        .limit(limit)
        .offset(offset);
    });
  }

  async markNotificationAsRead(notificationId: string) {
    return this.executeQuery(async () => {
      const [updated] = await this.db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.id, parseInt(notificationId)))
        .returning();
      return updated !== null;
    });
  }

  async markAllNotificationsAsRead(userAddress: string) {
    return this.executeQuery(async () => {
      const updated = await this.db.update(schema.notifications)
        .set({ read: true })
        .where(eq(schema.notifications.userAddress, userAddress))
        .returning();
      return updated.length > 0;
    });
  }

  async getUnreadNotificationCount(userAddress: string) {
    return this.executeQuery(async () => {
      const result = await this.db.select({ count: sql`count(*)` })
        .from(schema.notifications)
        .where(
          and(
            eq(schema.notifications.userAddress, userAddress),
            eq(schema.notifications.read, false)
          )
        );
      return parseInt(result[0]?.count || '0');
    });
  }

  async updateNotificationPreferences(userAddress: string, preferences: any) {
    return this.executeQuery(async () => {
      const [updated] = await this.db.insert(schema.notificationPreferences)
        .values({
          userAddress,
          preferences: JSON.stringify(preferences),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.notificationPreferences.userAddress,
          set: {
            preferences: JSON.stringify(preferences),
            updatedAt: new Date()
          }
        })
        .returning();

      return updated !== null;
    });
  }

  /**
   * Get user wallet address by UUID
   */
  async getUserAddressById(userId: string): Promise<string | null> {
    try {
      const result = await this.db.select({ walletAddress: schema.users.walletAddress })
        .from(schema.users)
        .where(eq(schema.users.id, userId))
        .limit(1);
      return result[0]?.walletAddress || null;
    } catch (error) {
      safeLogger.error('Error fetching user address by ID:', error);
      return null;
    }
  }

  async getNotificationPreferences(userAddress: string) {
    return this.executeQuery(async () => {
      const [result] = await this.db.select()
        .from(schema.notificationPreferences)
        .where(eq(schema.notificationPreferences.userAddress, userAddress));

      if (result?.preferences) {
        return JSON.parse(result.preferences);
      }

      // Return default preferences
      return {
        email: true,
        push: true,
        inApp: true,
        types: ['ORDER_CREATED', 'ORDER_SHIPPED', 'ORDER_DELIVERED', 'PAYMENT_RECEIVED']
      };
    });
  }

  async getUserPushTokens(userAddress: string) {
    return this.executeQuery(async () => {
      const result = await this.db.select()
        .from(schema.pushTokens)
        .where(eq(schema.pushTokens.userAddress, userAddress));
      return result.map((row: any) => row.token);
    });
  }

  async deleteOldNotifications(cutoffDate: Date) {
    return this.executeQuery(async () => {
      const deleted = await this.db.delete(schema.notifications)
        .where(lt(schema.notifications.createdAt, cutoffDate))
        .returning();
      return deleted.length;
    });
  }

  async getNotificationStats(userAddress: string) {
    return this.executeQuery(async () => {
      const notifications = await this.db.select()
        .from(schema.notifications)
        .where(eq(schema.notifications.userAddress, userAddress));

      const total = notifications.length;
      const unread = notifications.filter((n: any) => !n.read).length;
      const byType = notifications.reduce((acc: any, n: any) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return { total, unread, byType };
    });
  }

  async storeBlockchainEvent(event: any) {
    return this.executeQuery(async () => {
      const [stored] = await this.db.insert(schema.blockchainEvents).values({
        orderId: event.orderId,
        escrowId: event.escrowId,
        eventType: event.eventType,
        transactionHash: event.transactionHash,
        blockNumber: event.blockNumber,
        timestamp: new Date(event.timestamp),
        data: JSON.stringify(event.data)
      }).returning();
      return stored;
    });
  }

  async getLastSyncedBlock() {
    return this.executeQuery(async () => {
      const [result] = await this.db.select()
        .from(schema.syncStatus)
        .where(eq(schema.syncStatus.key, 'lastSyncedBlock'));
      return parseInt(result?.value || '0');
    });
  }

  async updateLastSyncedBlock(blockNumber: string) {
    return this.executeQuery(async () => {
      const [updated] = await this.db.insert(schema.syncStatus)
        .values({
          key: 'lastSyncedBlock',
          value: blockNumber.toString(),
          updatedAt: new Date()
        })
        .onConflictDoUpdate({
          target: schema.syncStatus.key,
          set: {
            value: blockNumber.toString(),
            updatedAt: new Date()
          }
        })
        .returning();
      return updated !== null;
    });
  }

  /**
   * Get all users with reputation data for ranking
   */
  async getAllUsersWithReputation(): Promise<Array<{
    id: string;
    walletAddress: string;
    handle?: string;
    reputationScore: string;
  }>> {
    return this.executeQuery(async () => {
      const users = await this.db
        .select({
          id: schema.users.id,
          walletAddress: schema.users.walletAddress,
          handle: schema.users.handle,
          reputationScore: schema.reputations.score
        })
        .from(schema.users)
        .leftJoin(schema.reputations, eq(schema.users.walletAddress, schema.reputations.walletAddress))
        .where(sql`${schema.reputations.score} IS NOT NULL`)
        .orderBy(desc(schema.reputations.score));

      return users.map((user: any) => ({
        id: user.id,
        walletAddress: user.walletAddress,
        handle: user.handle || undefined,
        reputationScore: user.reputationScore || 0
      }));
    });
  }

  /**
   * Update user visibility boost based on reputation
   */
  async updateUserVisibilityBoost(userId: string, visibilityBoost: string): Promise<void> {
    return this.executeQuery(async () => {
      // This would update a visibility_boost field if it existed
      // For now, we'll just log it as this field doesn't exist in current schema
      safeLogger.info(`Updated visibility boost for user ${userId}: ${visibilityBoost}`);
    });
  }

  async getUserByAddress(address: string) {
    return this.executeQuery(async () => {
      const normalizedAddress = address.toLowerCase();
      const [user] = await this.db.select()
        .from(schema.users)
        .where(sql`LOWER(${schema.users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);
      return user || null;
    });
  }

  async getUserById(id: string) {
    return this.executeQuery(async () => {
      const [user] = await this.db.select()
        .from(schema.users)
        .where(eq(schema.users.id, id))
        .limit(1);
      return user || null;
    });
  }

  // Moderation Cases operations
  async createModerationCase(data: {
    contentId: string;
    contentType: string;
    userId: string;
    status: string;
    riskScore: string;
    confidence: string;
    vendorScores: Record<string, any>;
    evidenceCid: string | null;
  }) {
    try {
      const result = await this.db.insert(schema.moderationCases).values({
        contentId: data.contentId,
        contentType: data.contentType,
        userId: data.userId,
        status: data.status,
        riskScore: data.riskScore.toString(),
        confidence: data.confidence.toString(),
        vendorScores: data.vendorScores,
        evidenceCid: data.evidenceCid,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating moderation case:", error);
      throw error;
    }
  }

  async getModerationCaseByContentId(contentId: string) {
    try {
      const result = await this.db.select().from(schema.moderationCases)
        .where(eq(schema.moderationCases.contentId, contentId));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting moderation case by content ID:", error);
      throw error;
    }
  }

  async updateModerationCase(id: number, updates: Partial<{
    status: string;
    decision: string;
    reasonCode: string;
    confidence: string;
    riskScore: string;
    vendorScores: Record<string, any>;
    evidenceCid: string;
    updatedAt: Date;
  }>) {
    try {
      const updateData: any = { ...updates };

      // Convert numbers to strings for database
      if (updates.confidence !== undefined) {
        updateData.confidence = updates.confidence.toString();
      }
      if (updates.riskScore !== undefined) {
        updateData.riskScore = updates.riskScore.toString();
      }

      const result = await this.db.update(schema.moderationCases)
        .set(updateData)
        .where(eq(schema.moderationCases.id, id))
        .returning();

      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating moderation case:", error);
      throw error;
    }
  }

  async getUserModerationCases(userId: string, options: {
    page: number;
    limit: number;
    status?: string;
  }) {
    try {
      let query = this.db.select().from(schema.moderationCases)
        .where(eq(schema.moderationCases.userId, userId));

      if (options.status) {
        query = query.where(
          and(
            eq(schema.moderationCases.userId, userId),
            eq(schema.moderationCases.status, options.status)
          )
        );
      }

      const result = await query
        .orderBy(desc(schema.moderationCases.createdAt))
        .limit(options.limit)
        .offset((options.page - 1) * options.limit);

      return result;
    } catch (error) {
      safeLogger.error("Error getting user moderation cases:", error);
      throw error;
    }
  }

  async getModerationCasesByStatus(status: string, limit: number = 50) {
    try {
      return await this.db.select().from(schema.moderationCases)
        .where(eq(schema.moderationCases.status, status))
        .orderBy(desc(schema.moderationCases.createdAt))
        .limit(limit);
    } catch (error) {
      safeLogger.error("Error getting moderation cases by status:", error);
      throw error;
    }
  }

  // Content Reports operations
  async createContentReport(data: {
    contentId: string;
    reporterId: string;
    reason: string;
    details?: string;
    weight: string;
  }) {
    try {
      const result = await this.db.insert(schema.contentReports).values({
        contentId: data.contentId,
        reporterId: data.reporterId,
        reason: data.reason,
        details: data.details || null,
        weight: data.weight.toString(),
        status: 'open',
        createdAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating content report:", error);
      throw error;
    }
  }

  async getContentReports(contentId: string) {
    try {
      return await this.db.select().from(schema.contentReports)
        .where(eq(schema.contentReports.contentId, contentId))
        .orderBy(desc(schema.contentReports.createdAt));
    } catch (error) {
      safeLogger.error("Error getting content reports:", error);
      throw error;
    }
  }

  // Moderation Actions operations
  async createModerationAction(data: {
    userId: string;
    contentId: string;
    action: string;
    durationSec?: string;
    appliedBy?: string;
    rationale?: string;
  }) {
    try {
      const result = await this.db.insert(schema.moderationActions).values({
        userId: data.userId,
        contentId: data.contentId,
        action: data.action,
        durationSec: data.durationSec || 0,
        appliedBy: data.appliedBy || null,
        rationale: data.rationale || null,
        createdAt: new Date()
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error("Error creating moderation action:", error);
      throw error;
    }
  }

  async getUserModerationActions(userId: string, limit: number = 50) {
    try {
      return await this.db.select().from(schema.moderationActions)
        .where(eq(schema.moderationActions.userId, userId))
        .orderBy(desc(schema.moderationActions.createdAt))
        .limit(limit);
    } catch (error) {
      safeLogger.error("Error getting user moderation actions:", error);
      throw error;
    }
  }

  // Payment Transaction Methods

  /**
   * Create payment transaction record
   */
  async createPaymentTransaction(transactionData: {
    id: string;
    orderId: string;
    paymentMethod: string;
    transactionHash?: string;
    paymentIntentId?: string;
    escrowId?: string;
    amount: string;
    currency: string;
    status: string;
    processingFee: string;
    platformFee: string;
    totalFees: string;
    receiptUrl?: string;
    receiptData?: string;
    failureReason?: string;
    retryCount: string;
    metadata?: string;
  }): Promise<any> {
    try {
      // Mock implementation - in production, insert into actual database table
      const transaction = {
        id: transactionData.id,
        orderId: transactionData.orderId,
        paymentMethod: transactionData.paymentMethod,
        transactionHash: transactionData.transactionHash,
        paymentIntentId: transactionData.paymentIntentId,
        escrowId: transactionData.escrowId,
        amount: transactionData.amount,
        currency: transactionData.currency,
        status: transactionData.status,
        processingFee: transactionData.processingFee,
        platformFee: transactionData.platformFee,
        totalFees: transactionData.totalFees,
        receiptUrl: transactionData.receiptUrl,
        receiptData: transactionData.receiptData,
        failureReason: transactionData.failureReason,
        retryCount: transactionData.retryCount,
        metadata: transactionData.metadata,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: null
      };

      safeLogger.info(`Created payment transaction ${transactionData.id} for order ${transactionData.orderId}`);
      return transaction;
    } catch (error) {
      safeLogger.error('Error creating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Update payment transaction
   */
  async updatePaymentTransaction(transactionId: string, updates: any): Promise<any> {
    try {
      // Mock implementation - in production, update actual database record
      safeLogger.info(`Updated payment transaction ${transactionId}:`, updates);
      return { success: true, transactionId, updates };
    } catch (error) {
      safeLogger.error('Error updating payment transaction:', error);
      throw error;
    }
  }

  /**
   * Get payment transaction by ID
   */
  async getPaymentTransactionById(transactionId: string): Promise<any> {
    try {
      // Mock implementation - in production, query actual database
      const mockTransaction = {
        id: transactionId,
        orderId: 1,
        paymentMethod: 'crypto',
        transactionHash: '0x123...',
        amount: '100.00',
        currency: 'USDC',
        status: 'completed',
        processingFee: '0.50',
        platformFee: '0.50',
        totalFees: '1.00',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: new Date()
      };

      safeLogger.info(`Retrieved payment transaction ${transactionId}`);
      return mockTransaction;
    } catch (error) {
      safeLogger.error('Error getting payment transaction:', error);
      return null;
    }
  }

  /**
   * Get payment transactions by order ID
   */
  async getPaymentTransactionsByOrderId(orderId: string): Promise<any[]> {
    try {
      // Mock implementation - in production, query actual database
      const mockTransactions = [{
        id: `txn_${orderId}_1`,
        orderId,
        paymentMethod: 'crypto',
        transactionHash: '0x123...',
        amount: '100.00',
        currency: 'USDC',
        status: 'completed',
        processingFee: '0.50',
        platformFee: '0.50',
        totalFees: '1.00',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
        confirmedAt: new Date()
      }];

      safeLogger.info(`Retrieved ${mockTransactions.length} payment transactions for order ${orderId}`);
      return mockTransactions;
    } catch (error) {
      safeLogger.error('Error getting payment transactions by order ID:', error);
      return [];
    }
  }

  /**
   * Create payment receipt record
   */
  async createPaymentReceipt(receiptData: {
    id: string;
    transactionId: string;
    orderId: string;
    receiptNumber: string;
    paymentMethod: string;
    amount: string;
    currency: string;
    fees: string;
    transactionDetails: string;
    receiptUrl: string;
    metadata?: string;
  }): Promise<any> {
    try {
      // Mock implementation - in production, insert into actual database table
      const receipt = {
        id: receiptData.id,
        transactionId: receiptData.transactionId,
        orderId: receiptData.orderId,
        receiptNumber: receiptData.receiptNumber,
        paymentMethod: receiptData.paymentMethod,
        amount: receiptData.amount,
        currency: receiptData.currency,
        fees: receiptData.fees,
        transactionDetails: receiptData.transactionDetails,
        receiptUrl: receiptData.receiptUrl,
        metadata: receiptData.metadata,
        createdAt: new Date()
      };

      safeLogger.info(`Created payment receipt ${receiptData.receiptNumber} for transaction ${receiptData.transactionId}`);
      return receipt;
    } catch (error) {
      safeLogger.error('Error creating payment receipt:', error);
      throw error;
    }
  }

  /**
   * Get payment receipts by order ID
   */
  async getPaymentReceiptsByOrderId(orderId: string): Promise<any[]> {
    try {
      // Mock implementation - in production, query actual database
      const mockReceipts = [{
        id: `receipt_${orderId}_1`,
        transactionId: `txn_${orderId}_1`,
        orderId,
        receiptNumber: `RCP-${Date.now()}-ABC123`,
        paymentMethod: 'crypto',
        amount: '100.00',
        currency: 'USDC',
        fees: '{"processing":"0.50","platform":"0.50","total":"1.00"}',
        transactionDetails: '{"hash":"0x123...","blockNumber":12345}',
        receiptUrl: `http://localhost:3000/receipts/RCP-${Date.now()}-ABC123`,
        createdAt: new Date()
      }];

      safeLogger.info(`Retrieved ${mockReceipts.length} payment receipts for order ${orderId}`);
      return mockReceipts;
    } catch (error) {
      safeLogger.error('Error getting payment receipts by order ID:', error);
      return [];
    }
  }


  /**
   * Create order tracking entry
   */
  async createOrderTracking(trackingData: {
    orderId: string;
    status: string;
    message: string;
    timestamp: Date;
  }): Promise<any> {
    try {
      // Mock implementation - in production, insert into actual database
      const tracking = {
        id: Math.floor(Math.random() * 10000),
        orderId: trackingData.orderId,
        status: trackingData.status,
        message: trackingData.message,
        timestamp: trackingData.timestamp,
        createdAt: new Date()
      };

      safeLogger.info(`Created order tracking for order ${trackingData.orderId}: ${trackingData.status}`);
      return tracking;
    } catch (error) {
      safeLogger.error('Error creating order tracking:', error);
      throw error;
    }
  }



  async createAdminNotification(notification: any) {
    try {
      const [created] = await this.db.insert(schema.admin_notifications).values({
        adminId: notification.adminId,
        type: notification.type,
        title: notification.title,
        message: notification.message,
        actionUrl: notification.actionUrl || null,
        priority: notification.priority,
        category: notification.category,
        metadata: notification.metadata ? JSON.stringify(notification.metadata) : null,
        read: notification.read
      }).returning();

      return created;
    } catch (error) {
      safeLogger.error("Error creating admin notification:", error);
      throw error;
    }
  }

  async getAdminNotifications(adminId: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      return await this.db
        .select()
        .from(schema.admin_notifications)
        .where(eq(schema.admin_notifications.adminId, adminId))
        .orderBy(desc(schema.admin_notifications.createdAt))
        .limit(limit)
        .offset(offset);
    } catch (error) {
      safeLogger.error("Error getting admin notifications:", error);
      throw error;
    }
  }

  async markAdminNotificationAsRead(notificationId: string): Promise<boolean> {
    try {
      const [updated] = await this.db.update(schema.admin_notifications)
        .set({ read: true })
        .where(eq(schema.admin_notifications.id, parseInt(notificationId)))
        .returning();

      return !!updated;
    } catch (error) {
      safeLogger.error("Error marking admin notification as read:", error);
      throw error;
    }
  }

  async markAllAdminNotificationsAsRead(adminId: string): Promise<boolean> {
    try {
      const updated = await this.db.update(schema.admin_notifications)
        .set({ read: true })
        .where(
          and(
            eq(schema.admin_notifications.adminId, adminId),
            eq(schema.admin_notifications.read, false)
          )
        );

      return true;
    } catch (error) {
      safeLogger.error("Error marking all admin notifications as read:", error);
      throw error;
    }
  }

  async getAdminUnreadNotificationCount(adminId: string): Promise<number> {
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.admin_notifications)
        .where(
          and(
            eq(schema.admin_notifications.adminId, adminId),
            eq(schema.admin_notifications.read, false)
          )
        );

      return parseInt(result[0].count.toString()) || 0;
    } catch (error) {
      safeLogger.error("Error getting admin unread notification count:", error);
      return 0;
    }
  }

  async getAdminsWithRole(role: string): Promise<any[]> {
    try {
      // This would need to be implemented based on your admin user structure
      // For now, returning an empty array
      return [];
    } catch (error) {
      safeLogger.error("Error getting admins with role:", error);
      return [];
    }
  }

  async getAdminsWithPermission(permission: string): Promise<any[]> {
    try {
      // This would need to be implemented based on your admin user structure
      // For now, returning an empty array
      return [];
    } catch (error) {
      safeLogger.error("Error getting admins with permission:", error);
      return [];
    }
  }

  async getAdminNotificationPreferences(adminId: string): Promise<any> {
    try {
      const result = await this.db
        .select()
        .from(schema.admin_notification_preferences)
        .where(eq(schema.admin_notification_preferences.adminId, adminId));

      if (result.length > 0) {
        return JSON.parse(result[0].preferences);
      }

      // Return default preferences
      return {
        email: true,
        push: true,
        inApp: true,
        types: ['MODERATION_REQUIRED', 'SYSTEM_ALERT', 'SECURITY_ALERT', 'USER_FLAGGED', 'SELLER_APPLICATION', 'DISPUTE_ESCALATED']
      };
    } catch (error) {
      safeLogger.error("Error getting admin notification preferences:", error);
      // Return default preferences
      return {
        email: true,
        push: true,
        inApp: true,
        types: ['MODERATION_REQUIRED', 'SYSTEM_ALERT', 'SECURITY_ALERT', 'USER_FLAGGED', 'SELLER_APPLICATION', 'DISPUTE_ESCALATED']
      };
    }
  }

  async getAdminPushTokens(adminId: string): Promise<string[]> {
    try {
      const tokens = await this.db
        .select({ token: schema.pushTokens.token })
        .from(schema.pushTokens)
        .where(eq(schema.pushTokens.userAddress, adminId));

      return tokens.map((t) => t.token);
    } catch (error) {
      safeLogger.error("Error getting admin push tokens:", error);
      return [];
    }
  }

  async deleteOldAdminNotifications(cutoffDate: Date): Promise<any> {
    try {
      const deleted = await this.db.delete(schema.admin_notifications)
        .where(lt(schema.admin_notifications.createdAt, cutoffDate));

      return deleted;
    } catch (error) {
      safeLogger.error("Error deleting old admin notifications:", error);
      throw error;
    }
  }

  async getAdminNotificationStats(adminId: string): Promise<any> {
    try {
      // Get total count
      const totalCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.admin_notifications)
        .where(eq(schema.admin_notifications.adminId, adminId));

      const total = parseInt(totalCountResult[0].count.toString()) || 0;

      // Get unread count
      const unreadCountResult = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.admin_notifications)
        .where(
          and(
            eq(schema.admin_notifications.adminId, adminId),
            eq(schema.admin_notifications.read, false)
          )
        );

      const unread = parseInt(unreadCountResult[0].count.toString()) || 0;

      // Get count by type
      const typeResults = await this.db
        .select({
          type: schema.admin_notifications.type,
          count: sql<number>`count(*)`
        })
        .from(schema.admin_notifications)
        .where(eq(schema.admin_notifications.adminId, adminId))
        .groupBy(schema.admin_notifications.type);

      const byType: Record<string, number> = {};
      typeResults.forEach(row => {
        byType[row.type] = parseInt(row.count.toString());
      });

      // Get count by category
      const categoryResults = await this.db
        .select({
          category: schema.admin_notifications.category,
          count: sql<number>`count(*)`
        })
        .from(schema.admin_notifications)
        .where(eq(schema.admin_notifications.adminId, adminId))
        .groupBy(schema.admin_notifications.category);

      const byCategory: Record<string, number> = {};
      categoryResults.forEach(row => {
        byCategory[row.category] = parseInt(row.count.toString());
      });

      return { total, unread, byType, byCategory };
    } catch (error) {
      safeLogger.error("Error getting admin notification stats:", error);
      return { total: 0, unread: 0, byType: {}, byCategory: {} };
    }
  }

  // ============ Seller Notification Methods ============

  /**
   * Get seller notification preferences
   */
  async getSellerNotificationPreferences(sellerId: string): Promise<any | null> {
    this.checkConnection();
    try {
      const results = await this.db
        .select()
        .from(schema.sellerNotificationPreferences)
        .where(eq(schema.sellerNotificationPreferences.userId, sellerId))
        .limit(1);

      if (results.length === 0) {
        return null;
      }

      const row = results[0];
      return {
        sellerId: row.userId,
        pushEnabled: row.pushEnabled ?? true,
        emailEnabled: row.emailEnabled ?? true,
        inAppEnabled: row.inAppEnabled ?? true,
        quietHoursEnabled: !!(row.quietHoursStart && row.quietHoursEnd),
        quietHoursStart: row.quietHoursStart,
        quietHoursEnd: row.quietHoursEnd,
        quietHoursTimezone: 'UTC',
        batchingEnabled: row.batchingEnabled ?? true,
        batchWindowMinutes: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      safeLogger.error("Error getting seller notification preferences:", error);
      return null;
    }
  }

  /**
   * Upsert seller notification preferences
   */
  async upsertSellerNotificationPreferences(preferences: any): Promise<void> {
    this.checkConnection();
    try {
      await this.db
        .insert(schema.sellerNotificationPreferences)
        .values({
          userId: preferences.sellerId,
          pushEnabled: preferences.pushEnabled,
          emailEnabled: preferences.emailEnabled,
          inAppEnabled: preferences.inAppEnabled,
          quietHoursStart: preferences.quietHoursStart,
          quietHoursEnd: preferences.quietHoursEnd,
          batchingEnabled: preferences.batchingEnabled,
        })
        .onConflictDoUpdate({
          target: schema.sellerNotificationPreferences.userId,
          set: {
            pushEnabled: preferences.pushEnabled,
            emailEnabled: preferences.emailEnabled,
            inAppEnabled: preferences.inAppEnabled,
            quietHoursStart: preferences.quietHoursStart,
            quietHoursEnd: preferences.quietHoursEnd,
            batchingEnabled: preferences.batchingEnabled,
          },
        });
    } catch (error) {
      safeLogger.error("Error upserting seller notification preferences:", error);
      throw error;
    }
  }

  /**
   * Upsert a seller notification
   */
  async upsertSellerNotification(notification: any): Promise<void> {
    this.checkConnection();
    try {
      await this.db
        .insert(schema.sellerNotificationQueue)
        .values({
          sellerId: notification.sellerId,
          type: notification.type,
          priority: notification.priority,
          title: notification.title,
          body: notification.body,
          data: notification.data,
          channels: notification.channels,
          status: notification.status,
        })
        .onConflictDoNothing();
    } catch (error) {
      safeLogger.error("Error upserting seller notification:", error);
      // Don't throw - notification storage failure shouldn't block delivery
    }
  }

  /**
   * Get pending notifications for a specific seller
   */
  async getSellerPendingNotifications(sellerId: string, limit: number = 50): Promise<any[]> {
    this.checkConnection();
    try {
      const results = await this.db
        .select()
        .from(schema.sellerNotificationQueue)
        .where(
          and(
            eq(schema.sellerNotificationQueue.sellerId, sellerId),
            eq(schema.sellerNotificationQueue.status, 'pending')
          )
        )
        .orderBy(desc(schema.sellerNotificationQueue.createdAt))
        .limit(limit);

      return results.map(this.mapNotificationRow);
    } catch (error) {
      safeLogger.error("Error getting seller pending notifications:", error);
      return [];
    }
  }

  /**
   * Get all pending seller notifications (for queue processing)
   */
  async getAllPendingSellerNotifications(): Promise<any[]> {
    this.checkConnection();
    try {
      const results = await this.db
        .select()
        .from(schema.sellerNotificationQueue)
        .where(eq(schema.sellerNotificationQueue.status, 'pending'))
        .orderBy(desc(schema.sellerNotificationQueue.createdAt));

      return results.map(this.mapNotificationRow);
    } catch (error) {
      safeLogger.error("Error getting all pending seller notifications:", error);
      return [];
    }
  }

  /**
   * Get notification history for a seller
   */
  async getSellerNotificationHistory(
    sellerId: string,
    limit: number,
    offset: number,
    type?: string,
    startDate?: Date,
    endDate?: Date
  ): Promise<any[]> {
    this.checkConnection();
    try {
      let query = this.db
        .select()
        .from(schema.sellerNotificationQueue)
        .where(eq(schema.sellerNotificationQueue.sellerId, sellerId));

      if (type) {
        query = query.where(eq(schema.sellerNotificationQueue.type, type));
      }

      if (startDate) {
        query = query.where(gte(schema.sellerNotificationQueue.createdAt, startDate));
      }

      if (endDate) {
        query = query.where(lte(schema.sellerNotificationQueue.createdAt, endDate));
      }

      const results = await query
        .orderBy(desc(schema.sellerNotificationQueue.createdAt))
        .limit(limit)
        .offset(offset);

      return results.map(this.mapNotificationRow);
    } catch (error) {
      safeLogger.error("Error getting seller notification history:", error);
      return [];
    }
  }

  /**
   * Get total notification count for a seller
   */
  async getSellerNotificationCount(sellerId: string, type?: string): Promise<number> {
    this.checkConnection();
    try {
      let conditions = [eq(schema.sellerNotificationQueue.sellerId, sellerId)];

      if (type) {
        conditions.push(eq(schema.sellerNotificationQueue.type, type));
      }

      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.sellerNotificationQueue)
        .where(and(...conditions));

      return parseInt(result[0]?.count?.toString() || '0');
    } catch (error) {
      safeLogger.error("Error getting seller notification count:", error);
      return 0;
    }
  }

  /**
   * Get unread notification count for a seller
   */
  async getSellerUnreadNotificationCount(sellerId: string): Promise<number> {
    this.checkConnection();
    try {
      const result = await this.db
        .select({ count: sql<number>`count(*)` })
        .from(schema.sellerNotificationQueue)
        .where(
          and(
            eq(schema.sellerNotificationQueue.sellerId, sellerId),
            eq(schema.sellerNotificationQueue.status, 'sent')
          )
        );

      return parseInt(result[0]?.count?.toString() || '0');
    } catch (error) {
      safeLogger.error("Error getting seller unread notification count:", error);
      return 0;
    }
  }

  /**
   * Mark a seller notification as read
   */
  async markSellerNotificationAsRead(notificationId: string, sellerId: string): Promise<boolean> {
    this.checkConnection();
    try {
      const result = await this.db
        .update(schema.sellerNotificationQueue)
        .set({ status: 'read' })
        .where(
          and(
            eq(schema.sellerNotificationQueue.id, parseInt(notificationId)),
            eq(schema.sellerNotificationQueue.sellerId, sellerId)
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error("Error marking seller notification as read:", error);
      return false;
    }
  }

  /**
   * Mark all seller notifications as read
   */
  async markAllSellerNotificationsAsRead(sellerId: string): Promise<number> {
    this.checkConnection();
    try {
      const result = await this.db
        .update(schema.sellerNotificationQueue)
        .set({ status: 'read' })
        .where(
          and(
            eq(schema.sellerNotificationQueue.sellerId, sellerId),
            eq(schema.sellerNotificationQueue.status, 'sent')
          )
        )
        .returning();

      return result.length;
    } catch (error) {
      safeLogger.error("Error marking all seller notifications as read:", error);
      return 0;
    }
  }

  /**
   * Cancel a pending seller notification
   */
  async cancelSellerNotification(notificationId: string, sellerId: string): Promise<boolean> {
    this.checkConnection();
    try {
      const result = await this.db
        .update(schema.sellerNotificationQueue)
        .set({ status: 'cancelled' })
        .where(
          and(
            eq(schema.sellerNotificationQueue.id, parseInt(notificationId)),
            eq(schema.sellerNotificationQueue.sellerId, sellerId),
            or(
              eq(schema.sellerNotificationQueue.status, 'pending'),
              eq(schema.sellerNotificationQueue.status, 'batched')
            )
          )
        )
        .returning();

      return result.length > 0;
    } catch (error) {
      safeLogger.error("Error cancelling seller notification:", error);
      return false;
    }
  }

  /**
   * Helper to map database row to notification object
   */
  private mapNotificationRow(row: any): any {
    return {
      id: row.id?.toString(),
      sellerId: row.sellerId,
      type: row.type,
      priority: row.priority || 'normal',
      title: row.title,
      body: row.body,
      data: row.data || {},
      channels: row.channels || ['push', 'email', 'in_app'],
      status: row.status || 'pending',
      createdAt: row.createdAt,
      sentAt: row.sentAt,
      batchId: row.batchId,
      error: row.error,
      channelStatus: {},
    };
  }

}

// Singleton instance
export const databaseService = new DatabaseService();
