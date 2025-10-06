import { db } from '../db';
import { posts, reactions, tips, users } from '../db/schema';
import { eq, desc, asc, and, or, inArray, sql, gt, lt } from 'drizzle-orm';

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
      // Get posts with engagement metrics
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
          reactionCount: sql<number>`COALESCE(reaction_counts.count, 0)`,
          tipCount: sql<number>`COALESCE(tip_counts.count, 0)`,
          walletAddress: users.walletAddress
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(
          sql`(
            SELECT post_id, COUNT(*) as count 
            FROM reactions 
            GROUP BY post_id
          ) as reaction_counts`,
          sql`reaction_counts.post_id = ${posts.id}`
        )
        .leftJoin(
          sql`(
            SELECT post_id, COUNT(*) as count 
            FROM tips 
            GROUP BY post_id
          ) as tip_counts`,
          sql`tip_counts.post_id = ${posts.id}`
        )
        .where(and(
          timeFilter,
          communityFilter
        ))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          timeFilter,
          communityFilter
        ));

      return {
        posts: feedPosts,
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
          walletAddress: users.walletAddress
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          timeFilter,
          gt(posts.stakedValue, 0)
        ))
        .orderBy(desc(posts.stakedValue), desc(posts.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        posts: trendingPosts,
        pagination: {
          page,
          limit,
          total: trendingPosts.length
        }
      };
    } catch (error) {
      console.error('Error getting trending posts:', error);
      throw new Error('Failed to retrieve trending posts');
    }
  }

  // Create new post
  async createPost(data: CreatePostData) {
    const { authorAddress, content, communityId, mediaUrls, tags, pollData } = data;

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

      const newPost = await db
        .insert(posts)
        .values({
          authorId: userId,
          contentCid: content, // In real implementation, this would be uploaded to IPFS
          dao: communityId,
          mediaCids: JSON.stringify(mediaUrls),
          tags: JSON.stringify(tags),
          createdAt: new Date(),
          stakedValue: '0'
        })
        .returning();

      // Community post count would be handled by a separate communities table if it existed

      return newPost[0];
    } catch (error) {
      console.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  // Update post
  async updatePost(data: UpdatePostData) {
    const { postId, userAddress, content, tags } = data;

    try {
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
          eq(posts.id, postId),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return null;
      }

      const updateData: any = {};

      if (content !== undefined) {
        updateData.contentCid = content; // In real implementation, upload to IPFS first
      }

      if (tags !== undefined) {
        updateData.tags = JSON.stringify(tags);
      }

      const updatedPost = await db
        .update(posts)
        .set(updateData)
        .where(eq(posts.id, postId))
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
          eq(posts.id, postId),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return false;
      }

      // Hard delete (or could implement soft delete by adding a deletedAt field)
      await db
        .delete(posts)
        .where(eq(posts.id, postId));

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
      
      const engagementData = await db
        .select({
          postId: posts.id,
          reactionCount: sql<number>`COALESCE(reaction_counts.count, 0)`,
          commentCount: sql<number>`0`, // Comments table doesn't exist yet
          tipCount: sql<number>`COALESCE(tip_counts.count, 0)`,
          totalTipAmount: sql<number>`COALESCE(tip_amounts.total, 0)`,
          stakedValue: posts.stakedValue
        })
        .from(posts)
        .leftJoin(
          sql`(
            SELECT post_id, COUNT(*) as count 
            FROM reactions 
            WHERE post_id = ${postIdInt}
            GROUP BY post_id
          ) as reaction_counts`,
          sql`reaction_counts.post_id = ${posts.id}`
        )
        .leftJoin(
          sql`(
            SELECT post_id, COUNT(*) as count, SUM(CAST(amount AS DECIMAL)) as total
            FROM tips 
            WHERE post_id = ${postIdInt}
            GROUP BY post_id
          ) as tip_counts`,
          sql`tip_counts.post_id = ${posts.id}`
        )
        .leftJoin(
          sql`(
            SELECT post_id, SUM(CAST(amount AS DECIMAL)) as total
            FROM tips 
            WHERE post_id = ${postIdInt}
            GROUP BY post_id
          ) as tip_amounts`,
          sql`tip_amounts.post_id = ${posts.id}`
        )
        .where(eq(posts.id, postIdInt))
        .limit(1);

      return engagementData[0] || null;
    } catch (error) {
      console.error('Error getting engagement data:', error);
      throw new Error('Failed to retrieve engagement data');
    }
  }

  // Share post
  async sharePost(data: ShareData) {
    const { postId, userAddress, targetType, targetId, message } = data;

    try {
      // For now, just return share data without updating a shares count
      // This would need a shares table or field to be properly implemented
      
      // Update engagement score
      await this.updateEngagementScore(postId);

      return {
        postId,
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

  // Get post comments (simplified - comments table doesn't exist yet)
  async getPostComments(options: { postId: string; page: number; limit: number; sort: string }) {
    // For now, return empty comments since comments table doesn't exist
    // This would need to be implemented when comments table is added
    return {
      comments: [],
      pagination: {
        page: options.page,
        limit: options.limit,
        total: 0
      }
    };
  }

  // Add comment to post (simplified - comments table doesn't exist yet)
  async addComment(data: CommentData) {
    // For now, return a mock comment since comments table doesn't exist
    // This would need to be implemented when comments table is added
    const mockComment = {
      id: 'mock-comment-id',
      postId: data.postId,
      userAddress: data.userAddress,
      content: data.content,
      parentCommentId: data.parentCommentId,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    // Update engagement score
    await this.updateEngagementScore(data.postId);

    return mockComment;
  }

  // Helper method to build time filter
  private buildTimeFilter(timeRange: string) {
    const now = new Date();
    let timeFilter;

    switch (timeRange) {
      case 'hour':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 60 * 60 * 1000));
        break;
      case 'day':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 24 * 60 * 60 * 1000));
        break;
      case 'week':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000));
        break;
      case 'month':
        timeFilter = gt(posts.createdAt, new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000));
        break;
      default:
        timeFilter = sql`1=1`;
    }

    return timeFilter;
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

  // Helper method to update engagement score
  private async updateEngagementScore(postId: string) {
    try {
      const postIdInt = parseInt(postId);
      
      // Calculate engagement score based on reactions and tips (comments table doesn't exist yet)
      const result = await db
        .select({
          reactionCount: sql<number>`COALESCE(COUNT(DISTINCT r.id), 0)`,
          tipCount: sql<number>`COALESCE(COUNT(DISTINCT t.id), 0)`,
          stakedValue: posts.stakedValue
        })
        .from(posts)
        .leftJoin(reactions, eq(reactions.postId, posts.id))
        .leftJoin(tips, eq(tips.postId, posts.id))
        .where(eq(posts.id, postIdInt))
        .groupBy(posts.id, posts.stakedValue);

      if (result.length > 0) {
        const { reactionCount, tipCount } = result[0];
        
        // Simple engagement score calculation (without comments and shares for now)
        const engagementScore = (reactionCount * 1) + (tipCount * 5);

        // Update the staked value as a proxy for engagement score
        await db
          .update(posts)
          .set({ 
            stakedValue: engagementScore.toString()
          })
          .where(eq(posts.id, postIdInt));
      }
    } catch (error) {
      console.error('Error updating engagement score:', error);
    }
  }
}

export const feedService = new FeedService();