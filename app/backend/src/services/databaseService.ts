import { drizzle } from "drizzle-orm/postgres-js";
import { safeLogger } from '../utils/safeLogger';
import * as schema from "../db/schema";
import { eq, and, or, ilike, desc, lt, sql } from "drizzle-orm";
import { ValidationHelper, ValidationError } from "../models/validation";
import postgres from 'postgres';
import dotenv from "dotenv";
import { db as databaseInstance } from '../db/index';

dotenv.config();

export class DatabaseService {
  public db: any; // Changed from private to public for testing
  private isConnected: boolean = false;

  constructor() {
    this.initializeDatabase();
  }

  private initializeDatabase() {
    try {
      // Use the database instance from db/index.ts
      if (databaseInstance) {
        this.db = databaseInstance;
        this.isConnected = true;
        safeLogger.info('✅ Database service initialized successfully');
      } else {
        safeLogger.warn('⚠️ Database service running in offline mode - no database connection available');
        this.isConnected = false;
      }
    } catch (error) {
      safeLogger.error('❌ Failed to initialize database service:', error);
      this.isConnected = false;
    }
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
  async createPost(authorId: string, contentCid: string, parentId?: number) {
    try {
      const result = await this.db.insert(schema.posts).values({
        authorId,
        contentCid,
        parentId: parentId || null
      }).returning();
      
      return result[0];
    } catch (error) {
      safeLogger.error("Error creating post:", error);
      throw error;
    }
  }

  async getPostsByAuthor(authorId: string) {
    try {
      return await this.db.select().from(schema.posts).where(eq(schema.posts.authorId, authorId));
    } catch (error) {
      safeLogger.error("Error getting posts by author:", error);
      throw error;
    }
  }

  async getAllPosts() {
    try {
      return await this.db.select().from(schema.posts);
    } catch (error) {
      safeLogger.error("Error getting all posts:", error);
      throw error;
    }
  }

  async getPostById(id: number) {
    try {
      const result = await this.db.select().from(schema.posts).where(eq(schema.posts.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting post by ID:", error);
      throw error;
    }
  }

  async getPostsByTag(tag: string) {
    try {
      // Join with postTags table to find posts with specific tag
      const result = await this.db
        .select({
          id: schema.posts.id,
          authorId: schema.posts.authorId,
          contentCid: schema.posts.contentCid,
          parentId: schema.posts.parentId,
          mediaCids: schema.posts.mediaCids,
          tags: schema.posts.tags,
          createdAt: schema.posts.createdAt,
          dao: schema.posts.dao,
          communityId: schema.posts.communityId,
          stakedValue: schema.posts.stakedValue
        })
        .from(schema.posts)
        .innerJoin(schema.postTags, eq(schema.posts.id, schema.postTags.postId))
        .where(eq(schema.postTags.tag, tag.toLowerCase()))
        .orderBy(desc(schema.posts.createdAt));
      
      return result;
    } catch (error) {
      safeLogger.error("Error getting posts by tag:", error);
      throw error;
    }
  }

  async updatePost(id: number, updates: any) {
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

  async deletePost(id: number) {
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
      throw error;
    }
  }

  async getFollowing(userId: string) {
    try {
      return await this.db.select().from(schema.follows).where(eq(schema.follows.followerId, userId));
    } catch (error) {
      safeLogger.error("Error getting following:", error);
      throw error;
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
  async createProposal(daoId: string, titleCid?: string, bodyCid?: string, startBlock?: number, endBlock?: number) {
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
  async createEmbedding(objectType: string, objectId: number, embedding: number[]) {
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

  async searchEmbeddings(queryEmbedding: number[], limit: number = 5) {
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
  async createListing(sellerId: string, tokenAddress: string, price: string, quantity: number, 
                     itemType: string, listingType: string, metadataURI: string, 
                     nftStandard?: string, tokenId?: string, reservePrice?: string, minIncrement?: string) {
    try {
      const result = await this.db.insert(schema.listings).values({
        sellerId,
        tokenAddress,
        price,
        quantity,
        itemType,
        listingType,
        metadataURI,
        nftStandard: nftStandard || null,
        tokenId: tokenId || null,
        reservePrice: reservePrice || null,
        minIncrement: minIncrement || null
      }).returning();
      
      return result[0];
    } catch (error) {
      safeLogger.error("Error creating listing:", error);
      throw error;
    }
  }

  async getListingById(id: number) {
    try {
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

  async updateListing(id: number, updates: Partial<typeof schema.listings.$inferInsert>) {
    try {
      const result = await this.db.update(schema.listings).set(updates).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating listing:", error);
      throw error;
    }
  }

  async cancelListing(id: number) {
    try {
      const result = await this.db.update(schema.listings).set({ status: 'cancelled' }).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error canceling listing:", error);
      throw error;
    }
  }

  async placeBid(listingId: number, bidderId: string, amount: string) {
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

  async getBidsByListing(listingId: number) {
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

  async makeOffer(listingId: number, buyerId: string, amount: string) {
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

  async getOffersByListing(listingId: number) {
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

  async acceptOffer(offerId: number) {
    try {
      const result = await this.db.update(schema.offers).set({ accepted: true }).where(eq(schema.offers.id, offerId)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error accepting offer:", error);
      throw error;
    }
  }

  async createEscrow(listingId: number, buyerId: string, sellerId: string, amount: string, 
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

  async getEscrowById(id: number) {
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

  async updateEscrow(id: number, updates: Partial<typeof schema.escrows.$inferInsert>) {
    try {
      const result = await this.db.update(schema.escrows).set(updates).where(eq(schema.escrows.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating escrow:", error);
      throw error;
    }
  }

  async confirmDelivery(escrowId: number, deliveryInfo: string) {
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

  async createOrder(listingId: number, buyerId: string, sellerId: string, amount: string, 
                    paymentToken: string, escrowId?: number) {
    try {
      const result = await this.db.insert(schema.orders).values({
        listingId,
        buyerId,
        sellerId,
        amount,
        paymentToken,
        escrowId: escrowId || null
      }).returning();
      
      return result[0];
    } catch (error) {
      safeLogger.error("Error creating order:", error);
      throw error;
    }
  }

  async getOrderById(id: number) {
    try {
      const result = await this.db.select().from(schema.orders).where(eq(schema.orders.id, id));
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error getting order by ID:", error);
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

  async updateOrder(id: number, updates: Partial<typeof schema.orders.$inferInsert>) {
    try {
      const result = await this.db.update(schema.orders).set(updates).where(eq(schema.orders.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      safeLogger.error("Error updating order:", error);
      throw error;
    }
  }

  async createDispute(escrowId: number, reporterId: string, reason: string, evidence?: string) {
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

  async createUserReputation(address: string, score: number, daoApproved: boolean) {
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
  async createAIModeration(objectType: string, objectId: number, aiAnalysis?: string) {
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

  async getAIModerationByObject(objectType: string, objectId: number) {
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

  async updateAIModeration(id: number, updates: Partial<typeof schema.aiModeration.$inferInsert>) {
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
  async searchUsers(query: string, limit: number = 20, offset: number = 0) {
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
  async createCategory(name: string, slug: string, description?: string, parentId?: string, path?: string, imageUrl?: string, sortOrder?: number) {
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
                     categoryId: string, images: string, metadata: string, inventory: number, tags?: string, 
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
  async createOrderEvent(orderId: number, eventType: string, description: string, metadata?: string) {
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

  async getOrderEvents(orderId: number) {
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
            // Add date filter when createdAt is available
          )
        );

      // Calculate analytics
      const totalOrders = orders.length;
      const totalVolume = orders.reduce((sum: number, order: any) => sum + parseFloat(order.amount || '0'), 0);
      const averageOrderValue = totalOrders > 0 ? totalVolume / totalOrders : 0;
      const completedOrders = orders.filter((order: any) => order.status === 'completed').length;
      const disputedOrders = orders.filter((order: any) => order.status === 'disputed').length;
      const completionRate = totalOrders > 0 ? completedOrders / totalOrders : 0;
      const disputeRate = totalOrders > 0 ? disputedOrders / totalOrders : 0;

      return {
        totalOrders,
        totalVolume: totalVolume.toString(),
        averageOrderValue: averageOrderValue.toString(),
        completionRate,
        disputeRate,
        topCategories: [], // TODO: Implement category analytics
        monthlyTrends: [] // TODO: Implement trend analytics
      };
    });
  }

  async createTrackingRecord(orderId: string, trackingNumber: string, carrier: string) {
    return this.executeQuery(async () => {
      const [record] = await this.db.insert(schema.trackingRecords).values({
        orderId: parseInt(orderId),
        trackingNumber,
        carrier,
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
          lastUpdated: new Date(),
          events: JSON.stringify(trackingInfo.events)
        })
        .where(eq(schema.trackingRecords.orderId, parseInt(orderId)))
        .returning();
      return updated !== null;
    });
  }

  async getTrackingRecord(orderId: number) {
    return this.executeQuery(async () => {
      const result = await this.db.select()
        .from(schema.trackingRecords)
        .where(eq(schema.trackingRecords.orderId, orderId))
        .limit(1);
      return result[0] || null;
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

  async updateLastSyncedBlock(blockNumber: number) {
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
    reputationScore: number;
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
  async updateUserVisibilityBoost(userId: string, visibilityBoost: number): Promise<void> {
    return this.executeQuery(async () => {
      // This would update a visibility_boost field if it existed
      // For now, we'll just log it as this field doesn't exist in current schema
      safeLogger.info(`Updated visibility boost for user ${userId}: ${visibilityBoost}`);
    });
  }

  async getUserByAddress(address: string) {
    return this.executeQuery(async () => {
      const [user] = await this.db.select()
        .from(schema.users)
        .where(eq(schema.users.walletAddress, address))
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
    riskScore: number;
    confidence: number;
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
    confidence: number;
    riskScore: number;
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
    weight: number;
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
    durationSec?: number;
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
    orderId: number;
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
    retryCount: number;
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
  async getPaymentTransactionsByOrderId(orderId: number): Promise<any[]> {
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
    orderId: number;
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
  async getPaymentReceiptsByOrderId(orderId: number): Promise<any[]> {
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
    orderId: number;
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

  /**
   * Create receipt record
   */
  async createReceipt(receiptData: {
    id: string;
    type: string;
    orderId?: string;
    transactionId?: string;
    buyerAddress: string;
    amount: string;
    currency: string;
    paymentMethod: string;
    transactionHash?: string;
    status: string;
    items?: string;
    fees?: string;
    sellerAddress?: string;
    sellerName?: string;
    receiptNumber: string;
    downloadUrl: string;
    createdAt: Date;
    completedAt?: Date;
    metadata?: string;
  }): Promise<any> {
    try {
      // In a real implementation with a database, this would insert into the receipts table
      // For now, we'll store in memory for demonstration
      const receipt = {
        id: receiptData.id,
        type: receiptData.type,
        orderId: receiptData.orderId,
        transactionId: receiptData.transactionId,
        buyerAddress: receiptData.buyerAddress,
        amount: receiptData.amount,
        currency: receiptData.currency,
        paymentMethod: receiptData.paymentMethod,
        transactionHash: receiptData.transactionHash,
        status: receiptData.status,
        items: receiptData.items,
        fees: receiptData.fees,
        sellerAddress: receiptData.sellerAddress,
        sellerName: receiptData.sellerName,
        receiptNumber: receiptData.receiptNumber,
        downloadUrl: receiptData.downloadUrl,
        createdAt: receiptData.createdAt,
        completedAt: receiptData.completedAt,
        metadata: receiptData.metadata
      };
      
      // Store in a mock database (in real implementation, this would be an actual DB insert)
      if (!(global as any).mockReceipts) {
        (global as any).mockReceipts = [];
      }
      (global as any).mockReceipts.push(receipt);
      
      safeLogger.info(`Created receipt ${receiptData.receiptNumber} of type ${receiptData.type}`);
      return receipt;
    } catch (error) {
      safeLogger.error('Error creating receipt:', error);
      throw error;
    }
  }

  /**
   * Get receipt by ID
   */
  async getReceiptById(receiptId: string): Promise<any | null> {
    try {
      // In a real implementation, this would query the database
      const mockReceipts = (global as any).mockReceipts || [];
      const receipt = mockReceipts.find((r: any) => r.id === receiptId);
      
      if (receipt) {
        safeLogger.info(`Retrieved receipt ${receiptId}`);
        return receipt;
      }
      
      safeLogger.info(`Receipt ${receiptId} not found`);
      return null;
    } catch (error) {
      safeLogger.error('Error getting receipt by ID:', error);
      return null;
    }
  }

  /**
   * Get receipts by user address
   */
  async getReceiptsByUser(userAddress: string, limit: number = 50, offset: number = 0): Promise<any[]> {
    try {
      // In a real implementation, this would query the database
      const mockReceipts = (global as any).mockReceipts || [];
      const userReceipts = mockReceipts
        .filter((r: any) => r.buyerAddress === userAddress)
        .slice(offset, offset + limit);
      
      safeLogger.info(`Retrieved ${userReceipts.length} receipts for user ${userAddress}`);
      return userReceipts;
    } catch (error) {
      safeLogger.error('Error getting receipts by user:', error);
      return [];
    }
  }

  /**
   * Get receipts by order ID
   */
  async getReceiptsByOrderId(orderId: string): Promise<any[]> {
    try {
      // In a real implementation, this would query the database
      const mockReceipts = (global as any).mockReceipts || [];
      const orderReceipts = mockReceipts.filter((r: any) => r.orderId === orderId);
      
      safeLogger.info(`Retrieved ${orderReceipts.length} receipts for order ${orderId}`);
      return orderReceipts;
    } catch (error) {
      safeLogger.error('Error getting receipts by order ID:', error);
      return [];
    }
  }

  /**
   * Update receipt status
   */
  async updateReceiptStatus(receiptId: string, status: string, metadata?: any): Promise<boolean> {
    try {
      // In a real implementation, this would update the database record
      const mockReceipts = (global as any).mockReceipts || [];
      const receiptIndex = mockReceipts.findIndex((r: any) => r.id === receiptId);
      
      if (receiptIndex !== -1) {
        mockReceipts[receiptIndex].status = status;
        if (metadata) {
          mockReceipts[receiptIndex].metadata = {
            ...mockReceipts[receiptIndex].metadata,
            ...metadata
          };
        }
        safeLogger.info(`Updated receipt ${receiptId} status to ${status}`);
        return true;
      }
      
      safeLogger.warn(`Receipt ${receiptId} not found for status update`);
      return false;
    } catch (error) {
      safeLogger.error('Error updating receipt status:', error);
      return false;
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

  async getAdminNotifications(adminId: string, limit: number = 50, offset: number = 0) {
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

  async markAdminNotificationAsRead(notificationId: string) {
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

  async markAllAdminNotificationsAsRead(adminId: string) {
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

  async getAdminUnreadNotificationCount(adminId: string) {
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

  async getAdminsWithRole(role: string) {
    try {
      // This would need to be implemented based on your admin user structure
      // For now, returning an empty array
      return [];
    } catch (error) {
      safeLogger.error("Error getting admins with role:", error);
      return [];
    }
  }

  async getAdminsWithPermission(permission: string) {
    try {
      // This would need to be implemented based on your admin user structure
      // For now, returning an empty array
      return [];
    } catch (error) {
      safeLogger.error("Error getting admins with permission:", error);
      return [];
    }
  }

  async getAdminNotificationPreferences(adminId: string) {
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

  async getAdminPushTokens(adminId: string) {
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

  async deleteOldAdminNotifications(cutoffDate: Date) {
    try {
      const deleted = await this.db.delete(schema.admin_notifications)
        .where(lt(schema.admin_notifications.createdAt, cutoffDate));
      
      return deleted;
    } catch (error) {
      safeLogger.error("Error deleting old admin notifications:", error);
      throw error;
    }
  }

  async getAdminNotificationStats(adminId: string) {
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

}

// Singleton instance
export const databaseService = new DatabaseService();
