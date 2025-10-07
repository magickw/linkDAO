import { db } from '../db';
import { posts, reactions, tips, users, postTags } from '../db/schema';
import { eq, desc, and, inArray, sql, gt } from 'drizzle-orm';

interface FeedOptions {
  userAddress: string;
  page: number;
  limit: number;
  sort: string;
  communities: string[];
  timeRange: string;
}

interface CreatePostData {
  authorAddress: string;
  content: string;
  communityId?: string;
  mediaUrls: string[];
  tags: string[];
  pollData?: any;
}

interface UpdatePostData {
  postId: string;
  userAddress: string;
  content?: string;
  tags?: string[];
}

interface ReactionData {
  postId: string;
  userAddress: string;
  type: string;
  tokenAmount: number;
}

interface TipData {
  postId: string;
  fromAddress: string;
  amount: number;
  tokenType: string;
  message?: string;
}

interface ShareData {
  postId: string;
  userAddress: string;
  targetType: string;
  targetId?: string;
  message?: string;
}

interface CommentData {
  postId: string;
  userAddress: string;
  content: string;
  parentCommentId?: string;
}

export class FeedService {
  // Get enhanced personalized feed
  async getEnhancedFeed(options: FeedOptions) {
    const { userAddress, page, limit, sort, communities: filterCommunities, timeRange } = options;
    const offset = (page - 1) * limit;

    // Build time range filter
    const timeFilter = this.buildTimeFilter(timeRange);
    
    // Build community filter
    let communityFilter = sql`1=1`;
    if (filterCommunities.length > 0) {
      communityFilter = inArray(posts.dao, filterCommunities);
    }

    // Build sort order
    const sortOrder = this.buildSortOrder(sort);

    try {
      // Get posts with engagement metrics using proper subqueries
      const feedPosts = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          dao: posts.dao,
          contentCid: posts.contentCid,
          mediaCids: posts.mediaCids,
          tags: posts.tags,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          timeFilter,
          communityFilter
        ))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Get engagement metrics for each post
      const postsWithMetrics = await Promise.all(
        feedPosts.map(async (post) => {
          const [reactionCount, tipCount, tipTotal] = await Promise.all([
            db.select({ count: sql<number>`COUNT(*)` })
              .from(reactions)
              .where(eq(reactions.postId, post.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(tips)
              .where(eq(tips.postId, post.id)),
            db.select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
              .from(tips)
              .where(eq(tips.postId, post.id))
          ]);

          return {
            ...post,
            reactionCount: reactionCount[0]?.count || 0,
            tipCount: tipCount[0]?.count || 0,
            totalTipAmount: tipTotal[0]?.total || 0,
            engagementScore: this.calculateEngagementScore(
              reactionCount[0]?.count || 0,
              tipCount[0]?.count || 0,
              0 // comments - not implemented yet
            )
          };
        })
      );

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          timeFilter,
          communityFilter
        ));

      return {
        posts: postsWithMetrics,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting enhanced feed:', error);
      throw new Error('Failed to retrieve feed');
    }
  }

  // Get trending posts
  async getTrendingPosts(options: { page: number; limit: number; timeRange: string }) {
    const { page, limit, timeRange } = options;
    const offset = (page - 1) * limit;
    const timeFilter = this.buildTimeFilter(timeRange);

    try {
      // Get posts with high engagement within time range
      const trendingPosts = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          dao: posts.dao,
          contentCid: posts.contentCid,
          mediaCids: posts.mediaCids,
          tags: posts.tags,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(timeFilter)
        .orderBy(desc(posts.stakedValue), desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

      // Calculate trending score based on engagement metrics
      const postsWithTrendingScore = await Promise.all(
        trendingPosts.map(async (post) => {
          const [reactionCount, tipCount] = await Promise.all([
            db.select({ count: sql<number>`COUNT(*)` })
              .from(reactions)
              .where(eq(reactions.postId, post.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(tips)
              .where(eq(tips.postId, post.id))
          ]);

          const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
          const trendingScore = this.calculateTrendingScore(
            reactionCount[0]?.count || 0,
            tipCount[0]?.count || 0,
            ageInHours
          );

          return {
            ...post,
            reactionCount: reactionCount[0]?.count || 0,
            tipCount: tipCount[0]?.count || 0,
            trendingScore
          };
        })
      );

      // Sort by trending score
      postsWithTrendingScore.sort((a, b) => b.trendingScore - a.trendingScore);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(timeFilter);

      return {
        posts: postsWithTrendingScore,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      console.error('Error getting trending posts:', error);
      throw new Error('Failed to retrieve trending posts');
    }
  }

  // Create new post
  async createPost(data: CreatePostData) {
    const { authorAddress, content, communityId, mediaUrls, tags } = data;

    try {
      // First get or create user
      let user = await db.select().from(users).where(eq(users.walletAddress, authorAddress)).limit(1);
      let userId: string;
      
      if (user.length === 0) {
        const newUser = await db.insert(users).values({
          walletAddress: authorAddress,
          createdAt: new Date()
        }).returning();
        userId = newUser[0].id;
      } else {
        userId = user[0].id;
      }

      // Create the post
      const newPost = await db
        .insert(posts)
        .values({
          authorId: userId,
          contentCid: content, // In production, upload to IPFS first
          dao: communityId,
          mediaCids: JSON.stringify(mediaUrls),
          tags: JSON.stringify(tags),
          createdAt: new Date(),
          stakedValue: '0'
        })
        .returning();

      // Insert tags into post_tags table for efficient querying
      if (tags && tags.length > 0) {
        const tagInserts = tags.map(tag => ({
          postId: newPost[0].id,
          tag: tag.toLowerCase(),
          createdAt: new Date()
        }));

        await db.insert(postTags).values(tagInserts);
      }

      return {
        ...newPost[0],
        walletAddress: authorAddress,
        reactionCount: 0,
        tipCount: 0,
        totalTipAmount: 0
      };
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  // Update post
  async updatePost(data: UpdatePostData) {
    const { postId, userAddress, content, tags } = data;

    try {
      const postIdInt = parseInt(postId);
      
      // Get user ID
      const user = await db.select().from(users).where(eq(users.walletAddress, userAddress)).limit(1);
      if (user.length === 0) {
        return null;
      }

      // Check if user owns the post
      const existingPost = await db
        .select()
        .from(posts)
        .where(and(
          eq(posts.id, postIdInt),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return null;
      }

      const updateData: any = {};

      if (content !== undefined) {
        updateData.contentCid = content; // In production, upload to IPFS first
      }

      if (tags !== undefined) {
        updateData.tags = JSON.stringify(tags);
        
        // Update post tags table
        await db.delete(postTags).where(eq(postTags.postId, postIdInt));
        
        if (tags.length > 0) {
          const tagInserts = tags.map(tag => ({
            postId: postIdInt,
            tag: tag.toLowerCase(),
            createdAt: new Date()
          }));
          await db.insert(postTags).values(tagInserts);
        }
      }

      const updatedPost = await db
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, postIdInt))
        .returning();

      return updatedPost[0];
    } catch (error) {
      console.error('Error updating post:', error);
      throw new Error('Failed to update post');
    }
  }

  // Delete post
  async deletePost(data: { postId: string; userAddress: string }) {
    const { postId, userAddress } = data;

    try {
      const postIdInt = parseInt(postId);
      
      // Get user ID
      const user = await db.select().from(users).where(eq(users.walletAddress, userAddress)).limit(1);
      if (user.length === 0) {
        return false;
      }

      // Check if user owns the post
      const existingPost = await db
        .select()
        .from(posts)
        .where(and(
          eq(posts.id, postIdInt),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return false;
      }

      // Delete related data first (foreign key constraints)
      await Promise.all([
        db.delete(postTags).where(eq(postTags.postId, postIdInt)),
        db.delete(reactions).where(eq(reactions.postId, postIdInt)),
        db.delete(tips).where(eq(tips.postId, postIdInt))
      ]);

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postIdInt));

      return true;
    } catch (error) {
      console.error('Error deleting post:', error);
      throw new Error('Failed to delete post');
    }
  }

  // Add reaction to post
  async addReaction(data: ReactionData) {
    const { postId, userAddress, type, tokenAmount } = data;

    try {
      // Get user ID first
      const user = await db.select().from(users).where(eq(users.walletAddress, userAddress)).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Check if user already reacted
      const existingReaction = await db
        .select()
        .from(reactions)
        .where(and(
          eq(reactions.postId, parseInt(postId)),
          eq(reactions.userId, user[0].id)
        ))
        .limit(1);

      let reaction;

      if (existingReaction.length > 0) {
        // Update existing reaction
        reaction = await db
          .update(reactions)
          .set({
            type,
            amount: tokenAmount.toString()
          })
          .where(and(
            eq(reactions.postId, parseInt(postId)),
            eq(reactions.userId, user[0].id)
          ))
          .returning();
      } else {
        // Create new reaction
        reaction = await db
          .insert(reactions)
          .values({
            postId: parseInt(postId),
            userId: user[0].id,
            type,
            amount: tokenAmount.toString(),
            createdAt: new Date()
          })
          .returning();
      }

      // Update post engagement score
      await this.updateEngagementScore(postId);

      return reaction[0];
    } catch (error) {
      console.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  // Send tip to post author
  async sendTip(data: TipData) {
    const { postId, fromAddress, amount, tokenType, message } = data;

    try {
      // Get from user ID
      const fromUser = await db.select().from(users).where(eq(users.walletAddress, fromAddress)).limit(1);
      if (fromUser.length === 0) {
        throw new Error('From user not found');
      }

      // Get post to find the author
      const post = await db.select().from(posts).where(eq(posts.id, parseInt(postId))).limit(1);
      if (post.length === 0) {
        throw new Error('Post not found');
      }

      const tip = await db
        .insert(tips)
        .values({
          postId: parseInt(postId),
          fromUserId: fromUser[0].id,
          toUserId: post[0].authorId,
          token: tokenType,
          amount: amount.toString(),
          message,
          createdAt: new Date()
        })
        .returning();

      // Update post engagement score
      await this.updateEngagementScore(postId);

      return tip[0];
    } catch (error) {
      console.error('Error sending tip:', error);
      throw new Error('Failed to send tip');
    }
  }

  // Get engagement data for post
  async getEngagementData(postId: string) {
    try {
      const postIdInt = parseInt(postId);
      
      // Get post basic info
      const post = await db
        .select({
          id: posts.id,
          stakedValue: posts.stakedValue,
          createdAt: posts.createdAt
        })
        .from(posts)
        .where(eq(posts.id, postIdInt))
        .limit(1);

      if (post.length === 0) {
        return null;
      }

      // Get engagement metrics
      const [reactionData, tipData] = await Promise.all([
        db.select({ 
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
        })
        .from(reactions)
        .where(eq(reactions.postId, postIdInt)),
        
        db.select({ 
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
        })
        .from(tips)
        .where(eq(tips.postId, postIdInt))
      ]);

      return {
        postId: post[0].id,
        reactionCount: reactionData[0]?.count || 0,
        commentCount: 0, // Comments not implemented yet
        tipCount: tipData[0]?.count || 0,
        totalTipAmount: tipData[0]?.totalAmount || 0,
        totalReactionAmount: reactionData[0]?.totalAmount || 0,
        stakedValue: post[0].stakedValue,
        engagementScore: this.calculateEngagementScore(
          reactionData[0]?.count || 0,
          tipData[0]?.count || 0,
          0 // comments
        )
      };
    } catch (error) {
      console.error('Error getting engagement data:', error);
      throw new Error('Failed to retrieve engagement data');
    }
  }

  // Share post
  async sharePost(data: ShareData) {
    const { postId, userAddress, targetType, targetId, message } = data;

    try {
      const postIdInt = parseInt(postId);
      
      // Verify post exists
      const post = await db.select().from(posts).where(eq(posts.id, postIdInt)).limit(1);
      if (post.length === 0) {
        throw new Error('Post not found');
      }

      // Get user
      const user = await db.select().from(users).where(eq(users.walletAddress, userAddress)).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Update engagement score
      await this.updateEngagementScore(postId);

      // Return share data (in production, this might create a share record)
      return {
        id: `share_${Date.now()}`,
        postId: postIdInt,
        userId: user[0].id,
        userAddress,
        targetType,
        targetId,
        message,
        sharedAt: new Date()
      };
    } catch (error) {
      console.error('Error sharing post:', error);
      throw new Error('Failed to share post');
    }
  }

  // Get post comments (placeholder - comments table doesn't exist yet)
  async getPostComments(options: { postId: string; page: number; limit: number; sort: string }) {
    // TODO: Implement when comments table is added to schema
    return {
      comments: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0,
        totalPages: 0
      }
    };
  }

  // Add comment to post (placeholder - comments table doesn't exist yet)
  async addComment(data: CommentData) {
    // TODO: Implement when comments table is added to schema
    // For now, just update engagement score
    await this.updateEngagementScore(data.postId);

    return {
      id: `comment_${Date.now()}`,
      postId: parseInt(data.postId),
      userAddress: data.userAddress,
      content: data.content,
      parentCommentId: data.parentCommentId ? parseInt(data.parentCommentId) : null,
      createdAt: new Date(),
      updatedAt: new Date(),
      replyCount: 0,
      likeCount: 0
    };
  }

  // Helper method to build time filter
  private buildTimeFilter(timeRange: string) {
    const now = new Date();

    switch (timeRange) {
      case 'hour':
        return gt(posts.createdAt, new Date(now.getTime() - 60 * 60 * 1000));
      case 'day':
        return gt(posts.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000));
      case 'week':
        return gt(posts.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
      case 'month':
        return gt(posts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
      default:
        return sql`1=1`;
    }
  }

  // Helper method to build sort order
  private buildSortOrder(sort: string) {
    switch (sort) {
      case 'new':
        return desc(posts.createdAt);
      case 'top':
        return desc(posts.stakedValue);
      case 'following':
        // This would need additional logic to filter by followed users
        return desc(posts.createdAt);
      case 'hot':
      default:
        return desc(posts.stakedValue);
    }
  }

  // Helper method to calculate engagement score
  private calculateEngagementScore(reactionCount: number, tipCount: number, commentCount: number): number {
    // Weighted engagement score calculation
    return (reactionCount * 1) + (tipCount * 5) + (commentCount * 2);
  }

  // Helper method to calculate trending score (considers recency)
  private calculateTrendingScore(reactionCount: number, tipCount: number, ageInHours: number): number {
    const engagementScore = this.calculateEngagementScore(reactionCount, tipCount, 0);
    // Decay factor based on age (newer posts get higher scores)
    const decayFactor = Math.exp(-ageInHours / 24); // Decay over 24 hours
    return engagementScore * decayFactor;
  }

  // Helper method to update engagement score
  private async updateEngagementScore(postId: string) {
    try {
      const postIdInt = parseInt(postId);
      
      // Get current engagement metrics
      const [reactionData, tipData] = await Promise.all([
        db.select({ count: sql<number>`COUNT(*)` })
          .from(reactions)
          .where(eq(reactions.postId, postIdInt)),
        db.select({ count: sql<number>`COUNT(*)` })
          .from(tips)
          .where(eq(tips.postId, postIdInt))
      ]);

      const reactionCount = reactionData[0]?.count || 0;
      const tipCount = tipData[0]?.count || 0;
      
      // Calculate new engagement score
      const engagementScore = this.calculateEngagementScore(reactionCount, tipCount, 0);

      // Update the staked value as engagement score
      await db
        .update(posts)
        .set({ 
          stakedValue: engagementScore.toString()
        })
        .where(eq(posts.id, postIdInt));
    } catch (error) {
      console.error('Error updating engagement score:', error);
    }
  }
}

export const feedService = new FeedService();