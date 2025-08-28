import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { eq, and, or } from "drizzle-orm";
import dotenv from "dotenv";

dotenv.config();

// Create a postgres client with connection pooling
const client = postgres(process.env.DATABASE_URL || "", { 
  prepare: false,
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10
});

// Create Drizzle ORM instance
const db = drizzle(client, { schema });

export class DatabaseService {
  // User operations
  async createUser(address: string, handle?: string, profileCid?: string) {
    try {
      const result = await db.insert(schema.users).values({
        address,
        handle: handle || null,
        profileCid: profileCid || null
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async getUserByAddress(address: string) {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.address, address));
      return result[0] || null;
    } catch (error) {
      console.error("Error getting user by address:", error);
      throw error;
    }
  }

  async getUserById(id: string) {
    try {
      const result = await db.select().from(schema.users).where(eq(schema.users.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error getting user by ID:", error);
      throw error;
    }
  }

  // Post operations
  async createPost(authorId: string, contentCid: string, parentId?: number) {
    try {
      const result = await db.insert(schema.posts).values({
        authorId,
        contentCid,
        parentId: parentId || null
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating post:", error);
      throw error;
    }
  }

  async getPostsByAuthor(authorId: string) {
    try {
      return await db.select().from(schema.posts).where(eq(schema.posts.authorId, authorId));
    } catch (error) {
      console.error("Error getting posts by author:", error);
      throw error;
    }
  }

  async getAllPosts() {
    try {
      return await db.select().from(schema.posts);
    } catch (error) {
      console.error("Error getting all posts:", error);
      throw error;
    }
  }

  // Follow operations
  async followUser(followerId: string, followingId: string) {
    try {
      const result = await db.insert(schema.follows).values({
        followerId,
        followingId
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error following user:", error);
      throw error;
    }
  }

  async unfollowUser(followerId: string, followingId: string) {
    try {
      await db.delete(schema.follows).where(
        and(
          eq(schema.follows.followerId, followerId),
          eq(schema.follows.followingId, followingId)
        )
      );
    } catch (error) {
      console.error("Error unfollowing user:", error);
      throw error;
    }
  }

  async getFollowers(userId: string) {
    try {
      return await db.select().from(schema.follows).where(eq(schema.follows.followingId, userId));
    } catch (error) {
      console.error("Error getting followers:", error);
      throw error;
    }
  }

  async getFollowing(userId: string) {
    try {
      return await db.select().from(schema.follows).where(eq(schema.follows.followerId, userId));
    } catch (error) {
      console.error("Error getting following:", error);
      throw error;
    }
  }

  // Payment operations
  async createPayment(from: string, to: string, token: string, amount: string, txHash?: string, memo?: string) {
    try {
      const result = await db.insert(schema.payments).values({
        from,
        to,
        token,
        amount,
        txHash: txHash || null,
        memo: memo || null
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating payment:", error);
      throw error;
    }
  }

  // Proposal operations
  async createProposal(daoId: string, titleCid?: string, bodyCid?: string, startBlock?: number, endBlock?: number) {
    try {
      const result = await db.insert(schema.proposals).values({
        daoId,
        titleCid: titleCid || null,
        bodyCid: bodyCid || null,
        startBlock: startBlock || null,
        endBlock: endBlock || null
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating proposal:", error);
      throw error;
    }
  }

  // Bot operations
  async createBot(name: string, persona: string, scopes: string, model: string) {
    try {
      const result = await db.insert(schema.bots).values({
        name,
        persona,
        scopes,
        model
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating bot:", error);
      throw error;
    }
  }

  // Embedding operations
  async createEmbedding(objectType: string, objectId: number, embedding: number[]) {
    try {
      const result = await db.insert(schema.embeddings).values({
        objectType,
        objectId,
        // Convert array to JSON string for storage
        embedding: JSON.stringify(embedding)
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating embedding:", error);
      throw error;
    }
  }

  async searchEmbeddings(queryEmbedding: number[], limit: number = 5) {
    try {
      // This is a simplified version. In practice, you'd use the pgvector <-> operator
      // For now, we'll return all embeddings (to be replaced with actual similarity search)
      return await db.select().from(schema.embeddings).limit(limit);
    } catch (error) {
      console.error("Error searching embeddings:", error);
      throw error;
    }
  }

  // Marketplace operations
  async createListing(sellerId: string, tokenAddress: string, price: string, quantity: number, 
                     itemType: string, listingType: string, metadataURI: string) {
    try {
      const result = await db.insert(schema.listings).values({
        sellerId,
        tokenAddress,
        price,
        quantity,
        itemType,
        listingType,
        metadataURI
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating listing:", error);
      throw error;
    }
  }

  async getListingById(id: number) {
    try {
      const result = await db.select().from(schema.listings).where(eq(schema.listings.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error getting listing by ID:", error);
      throw error;
    }
  }

  async getListingsBySeller(sellerId: string) {
    try {
      return await db.select().from(schema.listings).where(eq(schema.listings.sellerId, sellerId));
    } catch (error) {
      console.error("Error getting listings by seller:", error);
      throw error;
    }
  }

  async getAllListings() {
    try {
      return await db.select().from(schema.listings);
    } catch (error) {
      console.error("Error getting all listings:", error);
      throw error;
    }
  }

  async getActiveListings() {
    try {
      return await db.select().from(schema.listings).where(eq(schema.listings.status, 'active'));
    } catch (error) {
      console.error("Error getting active listings:", error);
      throw error;
    }
  }

  async updateListing(id: number, updates: Partial<typeof schema.listings.$inferInsert>) {
    try {
      const result = await db.update(schema.listings).set(updates).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error updating listing:", error);
      throw error;
    }
  }

  async cancelListing(id: number) {
    try {
      const result = await db.update(schema.listings).set({ status: 'cancelled' }).where(eq(schema.listings.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error canceling listing:", error);
      throw error;
    }
  }

  async placeBid(listingId: number, bidderId: string, amount: string) {
    try {
      const result = await db.insert(schema.bids).values({
        listingId,
        bidderId,
        amount
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error placing bid:", error);
      throw error;
    }
  }

  async getBidsByListing(listingId: number) {
    try {
      return await db.select().from(schema.bids).where(eq(schema.bids.listingId, listingId));
    } catch (error) {
      console.error("Error getting bids by listing:", error);
      throw error;
    }
  }

  async getBidsByBidder(bidderId: string) {
    try {
      return await db.select().from(schema.bids).where(eq(schema.bids.bidderId, bidderId));
    } catch (error) {
      console.error("Error getting bids by bidder:", error);
      throw error;
    }
  }

  async createEscrow(listingId: number, buyerId: string, sellerId: string, amount: string) {
    try {
      const result = await db.insert(schema.escrows).values({
        listingId,
        buyerId,
        sellerId,
        amount
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating escrow:", error);
      throw error;
    }
  }

  async getEscrowById(id: number) {
    try {
      const result = await db.select().from(schema.escrows).where(eq(schema.escrows.id, id));
      return result[0] || null;
    } catch (error) {
      console.error("Error getting escrow by ID:", error);
      throw error;
    }
  }

  async getEscrowsByUser(userId: string) {
    try {
      return await db.select().from(schema.escrows).where(
        or(eq(schema.escrows.buyerId, userId), eq(schema.escrows.sellerId, userId))
      );
    } catch (error) {
      console.error("Error getting escrows by user:", error);
      throw error;
    }
  }

  async updateEscrow(id: number, updates: Partial<typeof schema.escrows.$inferInsert>) {
    try {
      const result = await db.update(schema.escrows).set(updates).where(eq(schema.escrows.id, id)).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error updating escrow:", error);
      throw error;
    }
  }

  async createUserReputation(address: string, score: number, daoApproved: boolean) {
    try {
      const result = await db.insert(schema.reputations).values({
        address,
        score,
        daoApproved
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error("Error creating user reputation:", error);
      throw error;
    }
  }

  async getUserReputation(address: string) {
    try {
      const result = await db.select().from(schema.reputations).where(eq(schema.reputations.address, address));
      return result[0] || null;
    } catch (error) {
      console.error("Error getting user reputation:", error);
      throw error;
    }
  }

  async updateUserReputation(address: string, updates: Partial<typeof schema.reputations.$inferInsert>) {
    try {
      const result = await db.update(schema.reputations).set(updates).where(eq(schema.reputations.address, address)).returning();
      return result[0] || null;
    } catch (error) {
      console.error("Error updating user reputation:", error);
      throw error;
    }
  }

  async getDAOApprovedVendors() {
    try {
      return await db.select().from(schema.reputations).where(eq(schema.reputations.daoApproved, true));
    } catch (error) {
      console.error("Error getting DAO approved vendors:", error);
      throw error;
    }
  }
}