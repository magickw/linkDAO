/**
 * Token Reaction Service
 * Backend service for handling token-based reactions with staking mechanism
 */

import { db } from '../db';
import { reactions, posts, users } from '../db/schema';
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
  postId: number;
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
  postId: number;
  userId: string;
  type: ReactionType;
  amount: number;
}

export interface CreateReactionResponse {
  success: boolean;
  reaction: TokenReaction;
  newSummary: ReactionSummary;
  rewardsEarned: number;
  milestoneReached?: {
    threshold: number;
    reward: number;
    description: string;
  };
}

class TokenReactionService {
  /**
   * Create a new token reaction
   */
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

    // Verify post exists
    const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
    if (post.length === 0) {
      throw new Error('Post not found');
    }

    // Calculate rewards
    const baseReward = amount * 0.1; // 10% base reward
    const rewardsEarned = baseReward * config.multiplier;

    try {
      // Create the reaction
      const [newReaction] = await db.insert(reactions).values({
        postId,
        userId,
        type,
        amount: amount.toString(),
        rewardsEarned: rewardsEarned.toString(),
      }).returning();

      // Get user info
      const [user] = await db.select({
        id: users.id,
        walletAddress: users.walletAddress,
        handle: users.handle,
      }).from(users).where(eq(users.id, userId)).limit(1);

      const reaction: TokenReaction = {
        id: newReaction.id,
        postId: newReaction.postId!,
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
      const milestoneReached = this.checkMilestone(newSummary.totalAmount, type);

      return {
        success: true,
        reaction,
        newSummary,
        rewardsEarned,
        milestoneReached,
      };
    } catch (error) {
      console.error('Error creating reaction:', error);
      throw new Error('Failed to create reaction');
    }
  }

  /**
   * Get reaction summary for a specific type
   */
  async getReactionSummary(postId: number, type: ReactionType, userId?: string): Promise<ReactionSummary> {
    try {
      // Get total amount and count
      const [totals] = await db
        .select({
          totalAmount: sql<string>`SUM(${reactions.amount})`,
          totalCount: sql<number>`COUNT(${reactions.id})`,
        })
        .from(reactions)
        .where(and(eq(reactions.postId, postId), eq(reactions.type, type)));

      // Get user amount if userId provided
      let userAmount = 0;
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
      const topContributors = await db
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
      console.error('Error getting reaction summary:', error);
      throw new Error('Failed to get reaction summary');
    }
  }

  /**
   * Get all reaction summaries for a post
   */
  async getReactionSummaries(postId: number, userId?: string): Promise<ReactionSummary[]> {
    const summaries: ReactionSummary[] = [];
    
    for (const type of Object.keys(REACTION_TYPES) as ReactionType[]) {
      const summary = await this.getReactionSummary(postId, type, userId);
      if (summary.totalAmount > 0 || summary.userAmount > 0) {
        summaries.push(summary);
      }
    }

    return summaries.sort((a, b) => b.totalAmount - a.totalAmount);
  }

  /**
   * Get reactions for a post with pagination
   */
  async getReactions(
    postId: number,
    reactionType?: ReactionType,
    limit: number = 20,
    offset: number = 0
  ): Promise<{ reactions: TokenReaction[]; hasMore: boolean }> {
    try {
      const whereConditions = [eq(reactions.postId, postId)];
      if (reactionType) {
        whereConditions.push(eq(reactions.type, reactionType));
      }

      const reactionData = await db
        .select({
          id: reactions.id,
          postId: reactions.postId,
          userId: reactions.userId,
          type: reactions.type,
          amount: reactions.amount,
          rewardsEarned: reactions.rewardsEarned,
          createdAt: reactions.createdAt,
          userWalletAddress: users.walletAddress,
          userHandle: users.handle,
        })
        .from(reactions)
        .innerJoin(users, eq(reactions.userId, users.id))
        .where(and(...whereConditions))
        .orderBy(desc(reactions.createdAt))
        .limit(limit + 1)
        .offset(offset);

      const hasMore = reactionData.length > limit;
      const reactionsToReturn = hasMore ? reactionData.slice(0, -1) : reactionData;

      const formattedReactions: TokenReaction[] = reactionsToReturn.map(r => ({
        id: r.id,
        postId: r.postId!,
        userId: r.userId!,
        type: r.type as ReactionType,
        amount: parseFloat(r.amount),
        rewardsEarned: parseFloat(r.rewardsEarned),
        createdAt: r.createdAt!,
        user: {
          id: r.userId!,
          walletAddress: r.userWalletAddress,
          handle: r.userHandle || undefined,
        },
      }));

      return {
        reactions: formattedReactions,
        hasMore,
      };
    } catch (error) {
      console.error('Error getting reactions:', error);
      throw new Error('Failed to get reactions');
    }
  }

  /**
   * Get user's reactions for a post
   */
  async getUserReactions(postId: number, userId: string): Promise<TokenReaction[]> {
    try {
      const userReactions = await db
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

      return userReactions.map(r => ({
        id: r.id,
        postId: r.postId!,
        userId: r.userId!,
        type: r.type as ReactionType,
        amount: parseFloat(r.amount),
        rewardsEarned: parseFloat(r.rewardsEarned),
        createdAt: r.createdAt!,
      }));
    } catch (error) {
      console.error('Error getting user reactions:', error);
      throw new Error('Failed to get user reactions');
    }
  }

  /**
   * Remove a reaction (unstake tokens)
   */
  async removeReaction(reactionId: number, userId: string): Promise<{ success: boolean; refundAmount: number }> {
    try {
      // Get the reaction to verify ownership and get refund amount
      const [reaction] = await db
        .select()
        .from(reactions)
        .where(and(eq(reactions.id, reactionId), eq(reactions.userId, userId)))
        .limit(1);

      if (!reaction) {
        throw new Error('Reaction not found or not owned by user');
      }

      const refundAmount = parseFloat(reaction.amount);

      // Delete the reaction
      await db.delete(reactions).where(eq(reactions.id, reactionId));

      return {
        success: true,
        refundAmount,
      };
    } catch (error) {
      console.error('Error removing reaction:', error);
      throw new Error('Failed to remove reaction');
    }
  }

  /**
   * Get reaction analytics for a post
   */
  async getReactionAnalytics(postId: number) {
    try {
      const allReactions = await db
        .select()
        .from(reactions)
        .where(eq(reactions.postId, postId));

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
      console.error('Error getting reaction analytics:', error);
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