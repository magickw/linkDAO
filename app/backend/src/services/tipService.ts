import { ethers } from 'ethers';
import { safeLogger } from '../utils/safeLogger';
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "../db/schema";
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
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

export class TipService {
  /**
   * Record a new tip in the database
   */
  async recordTip(
    postId: string,
    fromUserId: string,
    toUserId: string,
    amount: string,
    token: string = 'LDAO',
    message?: string,
    txHash?: string,
    networkName?: string,
    chainId?: number
  ) {
    try {
      // Check if it's a regular post or a status
      const postResult = await db.select().from(schema.posts).where(eq(schema.posts.id, postId)).limit(1);

      if (postResult.length > 0) {
        const result = await db.insert(schema.tips).values({
          postId,
          fromUserId,
          toUserId,
          amount,
          token,
          message,
          txHash,
          networkName,
          chainId
        }).returning();
        return result[0];
      }

      const statusResult = await db.select().from(schema.statuses).where(eq(schema.statuses.id, postId)).limit(1);
      if (statusResult.length > 0) {
        const result = await db.insert(schema.statusTips).values({
          statusId: postId,
          fromUserId,
          toUserId,
          amount,
          token,
          message,
          txHash,
          networkName,
          chainId
        }).returning();
        // Normalize result to match tip shape (statusId -> postId)
        return { ...result[0], postId: result[0].statusId };
      }

      // Default fallback
      const result = await db.insert(schema.tips).values({
        postId,
        fromUserId,
        toUserId,
        amount,
        token,
        message,
        txHash,
        networkName,
        chainId
      }).returning();

      return result[0];
    } catch (error) {
      safeLogger.error('Error recording tip:', error);
      throw error;
    }
  }

  /**
   * Get tips for a specific post
   */
  async getTipsForPost(postId: string) {
    try {
      // Try posts table
      const regularTips = await db.select({
        id: schema.tips.id,
        amount: schema.tips.amount,
        token: schema.tips.token,
        message: schema.tips.message,
        timestamp: schema.tips.createdAt,
        txHash: schema.tips.txHash,
        tipperWallet: schema.users.walletAddress,
        tipperName: schema.users.displayName,
        tipperHandle: schema.users.handle,
        fromUserId: schema.tips.fromUserId
      })
        .from(schema.tips)
        .leftJoin(schema.users, eq(schema.tips.fromUserId, schema.users.id))
        .where(eq(schema.tips.postId, postId));

      // Try status_tips table
      const statusTipsData = await db.select({
        id: schema.statusTips.id,
        amount: schema.statusTips.amount,
        token: schema.statusTips.token,
        message: schema.statusTips.message,
        timestamp: schema.statusTips.createdAt,
        txHash: schema.statusTips.txHash,
        tipperWallet: schema.users.walletAddress,
        tipperName: schema.users.displayName,
        tipperHandle: schema.users.handle,
        fromUserId: schema.statusTips.fromUserId
      })
        .from(schema.statusTips)
        .leftJoin(schema.users, eq(schema.statusTips.fromUserId, schema.users.id))
        .where(eq(schema.statusTips.statusId, postId));

      const allTips = [...regularTips, ...statusTipsData];
      allTips.sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());

      return allTips;
    } catch (error) {
      safeLogger.error('Error getting tips for post:', error);
      throw error;
    }
  }

  /**
   * Get total tips received by a user
   */
  async getTotalTipsReceived(userId: string) {
    try {
      const regularResult = await db.select({ total: schema.tips.amount })
        .from(schema.tips)
        .where(eq(schema.tips.toUserId, userId));

      const statusResult = await db.select({ total: schema.statusTips.amount })
        .from(schema.statusTips)
        .where(eq(schema.statusTips.toUserId, userId));

      const all = [...regularResult, ...statusResult];

      // Sum up all the tips
      return all.reduce((sum, tip) => {
        return sum + parseFloat(tip.total);
      }, 0);
    } catch (error) {
      safeLogger.error('Error getting total tips received:', error);
      throw error;
    }
  }

  /**
   * Get total tips sent by a user
   */
  async getTotalTipsSent(userId: string) {
    try {
      const regularResult = await db.select({ total: schema.tips.amount })
        .from(schema.tips)
        .where(eq(schema.tips.fromUserId, userId));

      const statusResult = await db.select({ total: schema.statusTips.amount })
        .from(schema.statusTips)
        .where(eq(schema.statusTips.fromUserId, userId));

      const all = [...regularResult, ...statusResult];

      // Sum up all the tips
      return all.reduce((sum, tip) => {
        return sum + parseFloat(tip.total);
      }, 0);
    } catch (error) {
      safeLogger.error('Error getting total tips sent:', error);
      throw error;
    }
  }

  /**
   * Get tips received by a user
   */
  async getReceivedTips(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const regular = await db.select()
        .from(schema.tips)
        .where(eq(schema.tips.toUserId, userId));

      const statuses = await db.select()
        .from(schema.statusTips)
        .where(eq(schema.statusTips.toUserId, userId));

      // Map statusTips to match tips shape for union
      const mappedStatuses = statuses.map(s => ({
        ...s,
        postId: s.statusId
      }));

      const all = [...regular, ...mappedStatuses];
      all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return all.slice(offset, offset + limit);
    } catch (error) {
      safeLogger.error('Error getting received tips:', error);
      throw error;
    }
  }

  /**
   * Get tips sent by a user
   */
  async getSentTips(userId: string, limit: number = 50, offset: number = 0) {
    try {
      const regular = await db.select()
        .from(schema.tips)
        .where(eq(schema.tips.fromUserId, userId));

      const statuses = await db.select()
        .from(schema.statusTips)
        .where(eq(schema.statusTips.fromUserId, userId));

      // Map statusTips to match tips shape for union
      const mappedStatuses = statuses.map(s => ({
        ...s,
        postId: s.statusId
      }));

      const all = [...regular, ...mappedStatuses];
      all.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

      return all.slice(offset, offset + limit);
    } catch (error) {
      safeLogger.error('Error getting sent tips:', error);
      throw error;
    }
  }

  /**
   * Get user's claimable rewards
   */
  /*
  async getClaimableRewards(userId: string) {
    try {
      const result = await db.select()
        .from(creatorRewards)
        .where(and(
          eq(creatorRewards.userId, userId),
          eq(creatorRewards.earned, '0')
        ));
      
      // Sum up all unclaimed rewards
      return result.reduce((sum, reward) => {
        return sum + parseFloat(reward.earned);
      }, 0);
    } catch (error) {
      safeLogger.error('Error getting claimable rewards:', error);
      throw error;
    }
  }
  */

  /**
   * Claim user rewards
   */
  /*
  async claimRewards(userId: string) {
    try {
      // Mark rewards as claimed by setting claimedAt timestamp
      const result = await db.update(creatorRewards)
        .set({ claimedAt: new Date() })
        .where(and(
          eq(creatorRewards.userId, userId),
          eq(creatorRewards.earned, '0')
        ))
        .returning();
      
      return result;
    } catch (error) {
      safeLogger.error('Error claiming rewards:', error);
      throw error;
    }
  }
  */

  /**
   * Get tips within a date range for reward calculation
   */
  async getTipsInDateRange(startDate: Date, endDate: Date) {
    try {
      return await db.select()
        .from(schema.tips)
        .where(and(
          gte(schema.tips.createdAt, startDate),
          lte(schema.tips.createdAt, endDate)
        ));
    } catch (error) {
      safeLogger.error('Error getting tips in date range:', error);
      throw error;
    }
  }

  /**
   * Create a new reward epoch
   */
  /*
  async createRewardEpoch(epoch: number, fundedAmount: string, startAt: Date, endAt: Date) {
    try {
      const result = await db.insert(rewardEpochs).values({
        epoch,
        fundedAmount,
        startAt,
        endAt
      }).returning();
      
      return result[0];
    } catch (error) {
      safeLogger.error('Error creating reward epoch:', error);
      throw error;
    }
  }
  */

  /**
   * Credit rewards to a creator
   */
  /*
  async creditCreatorRewards(epoch: number, userId: string, earned: string) {
    try {
      const result = await db.insert(creatorRewards).values({
        epoch,
        userId,
        earned
      }).returning();
      
      return result[0];
    } catch (error) {
      safeLogger.error('Error crediting creator rewards:', error);
      throw error;
    }
  }
  */
  /**
   * Get user by wallet address
   */
  async getUserByWalletAddress(walletAddress: string) {
    try {
      const result = await db.select()
        .from(schema.users)
        .where(sql`lower(${schema.users.walletAddress}) = lower(${walletAddress})`)
        .limit(1);

      return result[0];
    } catch (error) {
      safeLogger.error('Error getting user by wallet address:', error);
      throw error;
    }
  }
}
