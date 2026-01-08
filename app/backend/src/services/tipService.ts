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
    txHash?: string
  ) {
    try {
      const result = await db.insert(schema.tips).values({
        postId,
        fromUserId,
        toUserId,
        amount,
        token,
        message,
        txHash
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
      const tips = await db.select({
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
        .where(eq(schema.tips.postId, postId))
        .orderBy(desc(schema.tips.createdAt));

      return tips;
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
      const result = await db.select({ total: schema.tips.amount })
        .from(schema.tips)
        .where(eq(schema.tips.toUserId, userId));

      // Sum up all the tips
      return result.reduce((sum, tip) => {
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
      const result = await db.select({ total: schema.tips.amount })
        .from(schema.tips)
        .where(eq(schema.tips.fromUserId, userId));

      // Sum up all the tips
      return result.reduce((sum, tip) => {
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
      return await db.select()
        .from(schema.tips)
        .where(eq(schema.tips.toUserId, userId))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.tips.createdAt));
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
      return await db.select()
        .from(schema.tips)
        .where(eq(schema.tips.fromUserId, userId))
        .limit(limit)
        .offset(offset)
        .orderBy(desc(schema.tips.createdAt));
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
