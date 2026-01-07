/**
 * Token Reaction Service
 * Backend service for handling token-based reactions with staking mechanism
 */

import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { reactions, statusReactions, posts, statuses, users, reactionPurchases } from '../db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';

export type ReactionType = '🔥' | '🚀' | '💎';

export interface TokenReactionConfig {
  emoji: ReactionType;
  name: string;
  tokenCost: number;
  multiplier: number;
  description: string;
}

export const REACTION_TYPES: Record<ReactionType, TokenReactionConfig> = {
  '🔥': {
    emoji: '🔥',
    name: 'Fire',
    tokenCost: 1,
    multiplier: 1.5,
    description: 'Show this content is hot and trending'
  },
  '🚀': {
    emoji: '🚀',
    name: 'Rocket',
    tokenCost: 2,
    multiplier: 2.0,
    description: 'Boost this content to the moon'
  },
  '💎': {
    emoji: '💎',
    name: 'Diamond',
    tokenCost: 5,
    multiplier: 3.0,
    description: 'Mark this as diamond hands quality'
  }
};

export interface TokenReaction {
  id: number;
  postId: string; // Changed to string to accommodate both integer IDs and UUIDs
  userId: string;
  type: ReactionType;
  amount: number;
  rewardsEarned: number;
  createdAt: Date;
  user?: {
    id: string;
    walletAddress: string;
    handle?: string;
  };
}

export interface ReactionSummary {
  type: ReactionType;
  totalAmount: number;
  totalCount: number;
  userAmount: number;
  topContributors: Array<{
    userId: string;
    walletAddress: string;
    handle?: string;
    amount: number;
  }>;
}

export interface CreateReactionRequest {
  postId: string;
  userId: string;
  type: ReactionType;
  amount: number;
}

export interface CreateReactionResponse {
  success: boolean;
  reaction: {
    id: number;
    postId: string;
    userId: string;
    type: ReactionType;
    amount: number;
    rewardsEarned: number;
    createdAt: Date;
  };
  authorEarnings: number;
  treasuryFee: number;
  rewardsEarned: number;
  newSummary?: ReactionSummary;
  milestoneReached?: boolean;
}

export interface PurchaseReactionRequest {
  postId: string;
  userId: string;
  userAddress: string;
  reactionType: string;
  txHash: string;
}

export interface PurchaseReactionResponse {
  success: boolean;
  reaction: {
    id: number;
    postId: string;
    userId: string;
    reactionType: string;
    purchasedAt: Date;
  };
  authorEarnings: number;
  treasuryFee: number;
}

class TokenReactionService {
  /**
   * Purchase a reaction (simplified system)
   */
  async purchaseReaction(request: PurchaseReactionRequest): Promise<PurchaseReactionResponse> {
    const { postId, userId, userAddress, reactionType, txHash } = request;

    const PRICES = { hot: 1, diamond: 2, bullish: 1, love: 1, laugh: 1, wow: 2 };
    const price = PRICES[reactionType as keyof typeof PRICES] || 1;
    const authorEarnings = Math.floor(price * 0.7);
    const treasuryFee = price - authorEarnings;

    // Get post author
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);
    let postAuthor: string;

    if (isUUID) {
      const [post] = await db.select({ author: statuses.authorId }).from(statuses).where(eq(statuses.id, postId)).limit(1);
      if (!post) throw new Error('Post not found');
      postAuthor = post.author;
    } else {
      const [post] = await db.select({ author: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
      if (!post) throw new Error('Post not found');
      postAuthor = post.author;
    }

    // Store reaction purchase in new dedicated table
    const [insertedPurchase] = await db.insert(reactionPurchases).values({
      postId,
      userId,
      userAddress,
      reactionType,
      price: price.toString(),
      authorEarnings: authorEarnings.toString(),
      treasuryFee: treasuryFee.toString(),
      postAuthor,
      txHash,
      purchasedAt: new Date()
    }).returning();

    // Also update the existing reaction tables for backward compatibility
    if (isUUID) {
      await db.insert(statusReactions).values({
        statusId: postId,
        userId,
        type: reactionType,
        amount: '1', // Count as 1 purchase
        rewardsEarned: '0'
      }).onConflictDoNothing();
    } else {
      await db.insert(reactions).values({
        postId,
        userId,
        type: reactionType,
        amount: '1',
        rewardsEarned: '0'
      }).onConflictDoNothing();
    }

    return {
      success: true,
      reaction: {
        id: insertedPurchase.id,
        postId,
        userId,
        reactionType,
        purchasedAt: insertedPurchase.purchasedAt!
      },
      authorEarnings,
      treasuryFee
    };
  }
  async createReaction(request: CreateReactionRequest): Promise<CreateReactionResponse> {
    const { postId, userId, type, amount } = request;

    // Validate reaction type
    if (!REACTION_TYPES[type]) {
      throw new Error(`Invalid reaction type: ${type}`);
    }

    const config = REACTION_TYPES[type];

    // Validate minimum amount
    if (amount < config.tokenCost) {
      throw new Error(`Minimum amount for ${type} reaction is ${config.tokenCost} tokens`);
    }

    // Determine if postId is UUID or integer
    const isUUID = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

    // Verify post exists - check appropriate table
    let postExists = false;
    if (isUUID) {
      // Query statuses table for UUID
      const status = await db.select().from(statuses).where(eq(statuses.id, postId)).limit(1);
      if (status.length > 0) {
        postExists = true;
      }
    } else {
      // Query posts table for UUID
      const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      if (post.length > 0) {
        postExists = true;
      }
    }

    if (!postExists) {
      throw new Error('Post not found');
    }

    // Calculate rewards
    const baseReward = amount * 0.1; // 10% base reward
    const rewardsEarned = baseReward * config.multiplier;

    try {
      let newReaction: any;

      if (isUUID) {
        // Insert into statusReactions table for UUID posts
        const [insertedReaction] = await db.insert(statusReactions).values({
          statusId: postId,
          userId,
          type,
          amount: amount.toString(),
          rewardsEarned: rewardsEarned.toString(),
        }).returning();

        newReaction = insertedReaction;
        // For UUID-based reactions, postId is the statusId
        newReaction.postId = insertedReaction.statusId;
      } else {
        // Insert into reactions table for posts
        const [insertedReaction] = await db.insert(reactions).values({
          postId,
          userId,
          type,
          amount: amount.toString(),
          rewardsEarned: rewardsEarned.toString(),
        }).returning();

        newReaction = insertedReaction;
      }

      // Get user info
      const [user] = await db.select({
        id: users.id,
        walletAddress: users.walletAddress,
        handle: users.handle,
      }).from(users).where(eq(users.id, userId)).limit(1);

      const reaction: TokenReaction = {
        id: newReaction.id,
        postId: newReaction.postId!, // This will be either postId or statusId depending on the table
        userId: newReaction.userId!,
        type: newReaction.type as ReactionType,
        amount: parseFloat(newReaction.amount),
        rewardsEarned: parseFloat(newReaction.rewardsEarned),
        createdAt: newReaction.createdAt!,
        user: user ? {
          id: user.id,
          walletAddress: user.walletAddress,
          handle: user.handle || undefined,
        } : undefined,
      };

      // Get updated summary
      const newSummary = await this.getReactionSummary(postId, type, userId);

      // Check for milestones
      const milestoneReached = this.checkMilestone(newSummary.totalAmount, type) !== null;

      return {
        success: true,
        reaction,
        newSummary,
        rewardsEarned,
        milestoneReached,
        authorEarnings: 0,
        treasuryFee: 0,
      };
    } catch (error) {
      safeLogger.error('Error creating reaction:', error);
      throw new Error('Failed to create reaction');
    }
  }

  /**
   * Get reaction summary for a specific type
   */
  async getReactionSummary(postId: string, type: ReactionType, userId?: string): Promise<ReactionSummary> {
    try {
      // Determine if postId is UUID or integer
      const isUUID = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

      let totals: any, userAmount = 0, topContributors: any;

      if (isUUID) {
        // Query from statusReactions table for UUID posts
        // Get total amount and count
        [totals] = await db
          .select({
            totalAmount: sql<string>`SUM(${statusReactions.amount})`,
            totalCount: sql<number>`COUNT(${statusReactions.id})`,
          })
          .from(statusReactions)
          .where(and(eq(statusReactions.statusId, postId), eq(statusReactions.type, type)));

        // Get user amount if userId provided
        if (userId) {
          const [userReaction] = await db
            .select({ amount: sql<string>`SUM(${statusReactions.amount})` })
            .from(statusReactions)
            .where(and(
              eq(statusReactions.statusId, postId),
              eq(statusReactions.type, type),
              eq(statusReactions.userId, userId)
            ));
          userAmount = parseFloat(userReaction?.amount || '0');
        }

        // Get top contributors
        topContributors = await db
          .select({
            userId: statusReactions.userId,
            walletAddress: users.walletAddress,
            handle: users.handle,
            amount: sql<string>`SUM(${statusReactions.amount})`,
          })
          .from(statusReactions)
          .innerJoin(users, eq(statusReactions.userId, users.id))
          .where(and(eq(statusReactions.statusId, postId), eq(statusReactions.type, type)))
          .groupBy(statusReactions.userId, users.walletAddress, users.handle)
          .orderBy(desc(sql<string>`SUM(${statusReactions.amount})`))
          .limit(5);
      } else {
        // postId is a UUID string
        if (!postId) {
          safeLogger.warn(`Invalid post ID format: ${postId}`);
          return {
            type,
            totalAmount: 0,
            totalCount: 0,
            userAmount: 0,
            topContributors: [],
          };
        }

        // Query from reactions table for integer posts
        // Get total amount and count
        [totals] = await db
          .select({
            totalAmount: sql<string>`SUM(${reactions.amount})`,
            totalCount: sql<number>`COUNT(${reactions.id})`,
          })
          .from(reactions)
          .where(and(eq(reactions.postId, postId), eq(reactions.type, type)));

        // Get user amount if userId provided
        if (userId) {
          const [userReaction] = await db
            .select({ amount: sql<string>`SUM(${reactions.amount})` })
            .from(reactions)
            .where(and(
              eq(reactions.postId, postId),
              eq(reactions.type, type),
              eq(reactions.userId, userId)
            ));
          userAmount = parseFloat(userReaction?.amount || '0');
        }

        // Get top contributors
        topContributors = await db
          .select({
            userId: reactions.userId,
            walletAddress: users.walletAddress,
            handle: users.handle,
            amount: sql<string>`SUM(${reactions.amount})`,
          })
          .from(reactions)
          .innerJoin(users, eq(reactions.userId, users.id))
          .where(and(eq(reactions.postId, postId), eq(reactions.type, type)))
          .groupBy(reactions.userId, users.walletAddress, users.handle)
          .orderBy(desc(sql<string>`SUM(${reactions.amount})`))
          .limit(5);
      }

      return {
        type,
        totalAmount: parseFloat(totals?.totalAmount || '0'),
        totalCount: totals?.totalCount || 0,
        userAmount,
        topContributors: topContributors.map(c => ({
          userId: c.userId!,
          walletAddress: c.walletAddress,
          handle: c.handle || undefined,
          amount: parseFloat(c.amount || '0'),
        })),
      };
    } catch (error) {
      safeLogger.error('Error getting reaction summary:', error);
      throw new Error('Failed to get reaction summary');
    }
  }

  /**
   * Get all reaction summaries for a post
   */
  async getReactionSummaries(postId: string, userId?: string): Promise<ReactionSummary[]> {
    const summaries: ReactionSummary[] = [];

    for (const type of Object.keys(REACTION_TYPES) as ReactionType[]) {
      const summary = await this.getReactionSummary(postId, type, userId);
      // Always include all reaction types, even if they have no reactions
      // This ensures the frontend shows all possible reaction buttons
      summaries.push(summary);
    }

    return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Get reactions for a post with pagination
   */
  async getReactions(
    postId: string,
    reactionType?: ReactionType,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reactions: TokenReaction[]; hasMore: boolean }> {
    try {
      // Determine if postId is UUID or integer
      const isUUID = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

      let reactionData: any[];

      if (isUUID) {
        // Query statusReactions table for UUID posts
        const whereConditions = [eq(statusReactions.statusId, postId)];
        if (reactionType) {
          whereConditions.push(eq(statusReactions.type, reactionType));
        }

        reactionData = await db
          .select({
            id: statusReactions.id,
            postId: statusReactions.statusId,  // Map statusId to postId field
            userId: statusReactions.userId,
            type: statusReactions.type,
            amount: statusReactions.amount,
            rewardsEarned: statusReactions.rewardsEarned,
            createdAt: statusReactions.createdAt,
          })
          .from(statusReactions)
          .where(and(...whereConditions))
          .orderBy(desc(statusReactions.createdAt))
          .limit(limit + 1) // Get one more to check if there are more results
          .offset(offset);
      } else {
        // Query reactions table for integer posts
        const whereConditions = [eq(reactions.postId, postId)];
        if (reactionType) {
          whereConditions.push(eq(reactions.type, reactionType));
        }

        reactionData = await db
          .select({
            id: reactions.id,
            postId: reactions.postId,
            userId: reactions.userId,
            type: reactions.type,
            amount: reactions.amount,
            rewardsEarned: reactions.rewardsEarned,
            createdAt: reactions.createdAt,
          })
          .from(reactions)
          .where(and(...whereConditions))
          .orderBy(desc(reactions.createdAt))
          .limit(limit + 1) // Get one more to check if there are more results
          .offset(offset);
      }

      const hasMore = reactionData.length > limit;
      const reactionsToReturn = hasMore ? reactionData.slice(0, limit) : reactionData;

      return {
        reactions: reactionsToReturn.map(r => ({
          id: r.id,
          postId: r.postId!,
          userId: r.userId!,
          type: r.type as ReactionType,
          amount: parseFloat(r.amount),
          rewardsEarned: parseFloat(r.rewardsEarned),
          createdAt: r.createdAt!,
        })),
        hasMore,
      };
    } catch (error) {
      safeLogger.error('Error getting reactions:', error);
      throw new Error('Failed to get reactions');
    }
  }

  /**
   * Get user's reactions for a post
   */
  async getUserReactions(postId: string, userId: string): Promise<TokenReaction[]> {
    try {
      // Determine if postId is UUID or integer
      const isUUID = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

      let userReactions: any[];

      if (isUUID) {
        // Query statusReactions table for UUID posts
        userReactions = await db
          .select({
            id: statusReactions.id,
            postId: statusReactions.statusId,  // Map statusId to postId field
            userId: statusReactions.userId,
            type: statusReactions.type,
            amount: statusReactions.amount,
            rewardsEarned: statusReactions.rewardsEarned,
            createdAt: statusReactions.createdAt,
          })
          .from(statusReactions)
          .where(and(eq(statusReactions.statusId, postId), eq(statusReactions.userId, userId)))
          .orderBy(desc(statusReactions.createdAt));
      } else {
        // Query reactions table for integer posts
        userReactions = await db
          .select({
            id: reactions.id,
            postId: reactions.postId,
            userId: reactions.userId,
            type: reactions.type,
            amount: reactions.amount,
            rewardsEarned: reactions.rewardsEarned,
            createdAt: reactions.createdAt,
          })
          .from(reactions)
          .where(and(eq(reactions.postId, postId), eq(reactions.userId, userId)))
          .orderBy(desc(reactions.createdAt));
      }

      return userReactions.map(r => ({
        id: r.id,
        postId: (r as any).postId || (r as any).statusId, // Handle both postId and statusId
        userId: r.userId!,
        type: r.type as ReactionType,
        amount: parseFloat(r.amount),
        rewardsEarned: parseFloat(r.rewardsEarned),
        createdAt: r.createdAt!,
      }));
    } catch (error) {
      safeLogger.error('Error getting user reactions:', error);
      throw new Error('Failed to get user reactions');
    }
  }

  /**
   * Remove a reaction (unstake tokens)
   */
  async removeReaction(reactionId: number, userId: string): Promise<{ success: boolean; refundAmount: number }> {
    try {
      // First, get the reaction to determine which table it's from and verify ownership
      // Check in reactions table first (for integer posts)
      let reaction = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.id, reactionId), eq(reactions.userId, userId)))
        .limit(1);

      if (reaction.length > 0) {
        // This is a reaction from the reactions table (integer post IDs)
        const refundAmount = parseFloat(reaction[0].amount);

        // Delete the reaction
        await db.delete(reactions).where(eq(reactions.id, reactionId));

        return {
          success: true,
          refundAmount,
        };
      } else {
        // Check in statusReactions table (for UUID posts)
        const statusReaction = await db
          .select()
          .from(statusReactions)
          .where(and(eq(statusReactions.id, reactionId), eq(statusReactions.userId, userId)))
          .limit(1);

        if (statusReaction.length > 0) {
          // This is a reaction from the statusReactions table (UUID post IDs)
          const refundAmount = parseFloat(statusReaction[0].amount);

          // Delete the reaction
          await db.delete(statusReactions).where(eq(statusReactions.id, reactionId));

          return {
            success: true,
            refundAmount,
          };
        } else {
          throw new Error('Reaction not found or not owned by user');
        }
      }
    } catch (error) {
      safeLogger.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }

  /**
   * Get reaction analytics for a post
   */
  async getReactionAnalytics(postId: string) {
    try {
      // Determine if postId is UUID or integer
      const isUUID = typeof postId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(postId);

      let allReactions: any[];

      if (isUUID) {
        // Query statusReactions table for UUID posts
        allReactions = await db
          .select()
          .from(statusReactions)
          .where(eq(statusReactions.statusId, postId));
      } else {
        // Query reactions table for integer posts
        allReactions = await db
          .select()
          .from(reactions)
          .where(eq(reactions.postId, postId));
      }

      const totalReactions = allReactions.length;
      const totalTokensStaked = allReactions.reduce((sum, r) => sum + parseFloat(r.amount), 0);
      const totalRewardsDistributed = allReactions.reduce((sum, r) => sum + parseFloat(r.rewardsEarned), 0);

      // Breakdown by reaction type
      const reactionBreakdown: Record<string, any> = {};
      for (const type of Object.keys(REACTION_TYPES)) {
        const typeReactions = allReactions.filter(r => r.type === type);
        reactionBreakdown[type] = {
          count: typeReactions.length,
          totalAmount: typeReactions.reduce((sum, r) => sum + parseFloat(r.amount), 0),
          averageAmount: typeReactions.length > 0
            ? typeReactions.reduce((sum, r) => sum + parseFloat(r.amount), 0) / typeReactions.length
            : 0,
        };
      }

      return {
        postId,
        totalReactions,
        totalTokensStaked,
        totalRewardsDistributed,
        reactionBreakdown,
      };
    } catch (error) {
      safeLogger.error('Error getting reaction analytics:', error);
      throw new Error('Failed to get reaction analytics');
    }
  }

  /**
   * Check if a milestone has been reached
   */
  private checkMilestone(totalAmount: number, type: ReactionType) {
    const config = REACTION_TYPES[type];
    const milestones = [10, 25, 50, 100, 250, 500, 1000];

    for (const milestone of milestones) {
      const threshold = milestone * config.tokenCost;
      if (totalAmount >= threshold && totalAmount - config.tokenCost < threshold) {
        return {
          threshold,
          reward: milestone * config.multiplier * 0.1,
          description: `${threshold} ${config.name} tokens staked`,
        };
      }
    }

    return null;
  }

  /**
   * Validate reaction input
   */
  validateReactionInput(type: ReactionType, amount: number): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!REACTION_TYPES[type]) {
      errors.push('Invalid reaction type');
    }

    if (amount <= 0) {
      errors.push('Amount must be greater than 0');
    }

    if (type && amount < REACTION_TYPES[type].tokenCost) {
      errors.push(`Minimum amount for ${REACTION_TYPES[type].name} is ${REACTION_TYPES[type].tokenCost} tokens`);
    }

    if (amount > 10000) {
      errors.push('Maximum amount is 10,000 tokens per reaction');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

export const tokenReactionService = new TokenReactionService();
export default tokenReactionService;
