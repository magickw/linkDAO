import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { posts, reactions, tips, users, postTags, views, bookmarks, shares, follows } from '../db/schema';
import { eq, desc, and, inArray, sql, gt, isNull } from 'drizzle-orm';
import { trendingCacheService } from './trendingCacheService';
import { getWebSocketService } from './webSocketService';

interface FeedOptions {
  userAddress: string;
  page: number;
  limit: number;
  sort: string;
  communities: string[];
  timeRange: string;
  feedSource?: 'following' | 'all'; // New field for following feed
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
    // Default to all feed and newest posts if not specified
    const { 
      userAddress, 
      page, 
      limit, 
      sort = 'new', // Default to newest
      communities: filterCommunities, 
      timeRange = 'all', // Default to all time
      feedSource = 'all' // Default to all feed to ensure users see their own posts
    } = options;
    
    const offset = (page - 1) * limit;

    // Build time range filter
    const timeFilter = this.buildTimeFilter(timeRange);

    // Build community filter
    let communityFilter = sql`1=1`;
    if (filterCommunities.length > 0) {
      communityFilter = inArray(posts.dao, filterCommunities);
    }

    // Build following filter if feedSource is 'following'
    let followingFilter = sql`1=1`;
    if (feedSource === 'following' && userAddress) {
      // Get the user ID from address
      const normalizedAddress = userAddress.toLowerCase();

      console.log('🔍 [BACKEND FEED] Building following filter for user:', normalizedAddress);

      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);

      if (user.length > 0) {
        const userId = user[0].id;
        console.log('✅ [BACKEND FEED] Found user ID:', userId);

        // Get list of users the current user is following
        const followingList = await db.select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, userId));

        const followingIds = followingList.map(f => f.followingId);

        console.log('📋 [BACKEND FEED] User is following:', followingIds.length, 'users');

        // Always include the user's own posts in the following feed
        followingIds.push(userId);

        console.log('📋 [BACKEND FEED] Including user\'s own posts, total IDs:', followingIds.length);

        // Filter posts to show from followed users AND the user's own posts
        if (followingIds.length > 0) {
          followingFilter = inArray(posts.authorId, followingIds);
        } else {
          // If not following anyone, show only user's own posts
          followingFilter = eq(posts.authorId, userId);
        }
      } else {
        console.log('⚠️ [BACKEND FEED] User not found in database, creating user...');
        // User doesn't exist in database, but let's still try to show their posts
        // Get or create user first
        let userRecord = (await db.insert(users)
          .values({
            walletAddress: normalizedAddress,
            createdAt: new Date()
          })
          .onConflictDoNothing()
          .returning())[0];
        
        // If onConflictDoNothing prevented insertion, we need to fetch the existing user
        if (!userRecord) {
          userRecord = (await db.select().from(users)
            .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
            .limit(1))[0];
        }
        
        // If user was created or already exists, show their posts
        if (userRecord) {
          followingFilter = eq(posts.authorId, userRecord.id);
        } else {
          // Fallback - user doesn't exist, return empty result
          followingFilter = sql`1=0`;
        }
      }
    } else if (feedSource === 'all' && userAddress) {
      // For 'all' feedSource but when user is authenticated, ensure they see their own posts
      // This helps with user engagement - they can see what they just posted
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);

      if (user.length > 0) {
        const userId = user[0].id;
        // Modify the followingFilter to include user's own posts in addition to all posts
        // This ensures the user sees their own content even in 'all' feed
        followingFilter = sql`(${followingFilter}) OR ${posts.authorId} = ${userId}`;
      } else {
        // If user doesn't exist in DB, create them so their future posts can be found
        await db.insert(users)
          .values({
            walletAddress: normalizedAddress,
            createdAt: new Date()
          })
          .onConflictDoNothing();
      }
    }
    // For 'all' feedSource with no user, no additional filtering is needed - show all posts

    // Build sort order - default to newest posts
    const sortOrder = this.buildSortOrder(sort);

    try {
      // Build moderation filter - exclude blocked content
      const moderationFilter = sql`(${posts.moderationStatus} IS NULL OR ${posts.moderationStatus} != 'blocked')`;

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
          profileCid: users.profileCid,
          // Moderation fields
          moderationStatus: posts.moderationStatus,
          moderationWarning: posts.moderationWarning,
          riskScore: posts.riskScore
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          timeFilter,
          communityFilter,
          followingFilter,
          moderationFilter, // Add moderation filter
          isNull(posts.parentId) // Only show top-level posts, not comments
        ))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Get engagement metrics for each post
      const postsWithMetrics = await Promise.all(
        feedPosts.map(async (post) => {
          const [reactionCount, tipCount, tipTotal, commentCount, viewCount] = await Promise.all([
            db.select({ count: sql<number>`COUNT(*)` })
              .from(reactions)
              .where(eq(reactions.postId, post.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(tips)
              .where(eq(tips.postId, post.id)),
            db.select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
              .from(tips)
              .where(eq(tips.postId, post.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(posts)
              .where(eq(posts.parentId, post.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(views)
              .where(eq(views.postId, post.id))
          ]);

          return {
            ...post,
            reactionCount: reactionCount[0]?.count || 0,
            tipCount: tipCount[0]?.count || 0,
            totalTipAmount: tipTotal[0]?.total || 0,
            commentCount: commentCount[0]?.count || 0,
            viewCount: viewCount[0]?.count || 0,
            engagementScore: this.calculateEngagementScore(
              reactionCount[0]?.count || 0,
              tipCount[0]?.count || 0,
              commentCount[0]?.count || 0
            )
          };
        })
      );

      // Get total count for pagination (excluding blocked content)
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          timeFilter,
          communityFilter,
          followingFilter,
          moderationFilter, // Include moderation filter in count
          isNull(posts.parentId) // Only count top-level posts
        ));

      console.log('📊 [BACKEND FEED] Returning posts:', {
        postsCount: postsWithMetrics.length,
        totalInDB: totalCount[0]?.count || 0,
        page,
        limit
      });

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
      safeLogger.error('Error getting enhanced feed:', error);
      throw new Error('Failed to retrieve feed');
    }
  }

  // Get trending posts with enhanced algorithm
  async getTrendingPosts(options: { page: number; limit: number; timeRange: string }) {
    const { page, limit, timeRange } = options;
    const offset = (page - 1) * limit;
    
    try {
      const timeFilter = this.buildTimeFilter(timeRange);

      // Check cache first (only for first page)
      if (page === 1) {
        try {
          const cachedTrending = await trendingCacheService.getTrendingScores(timeRange);
          if (cachedTrending) {
            safeLogger.info(`Cache hit for trending ${timeRange}`);
            return {
              posts: cachedTrending.slice(0, limit),
              pagination: {
                page,
                limit,
                total: cachedTrending.length,
                totalPages: Math.ceil(cachedTrending.length / limit),
                cached: true
              }
            };
          }
        } catch (cacheError) {
          safeLogger.warn('Cache retrieval failed, continuing with database query:', cacheError);
        }
      }

      // Cache miss - calculate trending scores
      safeLogger.info(`Cache miss for trending ${timeRange} - calculating...`);
      // Get posts with engagement metrics using a single optimized query
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
          profileCid: users.profileCid,
          reactionCount: sql<number>`COALESCE(reaction_counts.count, 0)`,
          tipCount: sql<number>`COALESCE(tip_counts.count, 0)`,
          totalTipAmount: sql<number>`COALESCE(tip_counts.total, 0)`,
          commentCount: sql<number>`COALESCE(comment_counts.count, 0)`,
          viewCount: sql<number>`COALESCE(view_counts.count, 0)`
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .leftJoin(
          db.select({
            post_id: reactions.postId,
            count: sql<number>`COUNT(*)`.as('count')
          })
          .from(reactions)
          .groupBy(reactions.postId)
          .as('reaction_counts'),
          eq(posts.id, sql.raw(`reaction_counts.post_id`))
        )
        .leftJoin(
          db.select({
            post_id: tips.postId,
            count: sql<number>`COUNT(*)`.as('count'),
            total: sql<number>`SUM(CAST(amount AS DECIMAL))`.as('total')
          })
          .from(tips)
          .groupBy(tips.postId)
          .as('tip_counts'),
          eq(posts.id, sql.raw(`tip_counts.post_id`))
        )
        .leftJoin(
          db.select({
            post_id: sql`parent_id`.as('post_id'),
            count: sql<number>`COUNT(*)`.as('count')
          })
          .from(posts)
          .where(sql`parent_id IS NOT NULL`)
          .groupBy(sql`parent_id`)
          .as('comment_counts'),
          eq(posts.id, sql.raw(`comment_counts.post_id`))
        )
        .leftJoin(
          // Placeholder for view counts - would need a views table
          db.select({
            post_id: sql`0`.as('post_id'),
            count: sql<number>`0`
          })
          .from(posts)
          .where(sql`false`)
          .as('view_counts'),
          eq(posts.id, sql.raw(`view_counts.post_id`))
        )
        .where(and(
          timeFilter,
          isNull(posts.parentId) // Exclude comments (only show top-level posts)
        ))
        .limit(limit)
        .offset(offset);

      // Calculate advanced trending scores
      const postsWithAdvancedScoring = trendingPosts.map((post) => {
        const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
        
        // Enhanced trending algorithm considering multiple factors
        const engagementVelocity = this.calculateEngagementVelocity(
          post.reactionCount,
          post.tipCount,
          ageInHours
        );
        
        const contentQualityScore = this.calculateContentQualityScore(
          post.totalTipAmount,
          post.reactionCount,
          post.viewCount || 0
        );
        
        const recencyBoost = this.calculateRecencyBoost(ageInHours, timeRange);
        
        const trendingScore = (engagementVelocity * 0.4) + 
                             (contentQualityScore * 0.4) + 
                             (recencyBoost * 0.2);

        return {
          ...post,
          trendingScore,
          engagementVelocity,
          contentQualityScore,
          recencyBoost
        };
      });

      // Sort by trending score
      postsWithAdvancedScoring.sort((a, b) => b.trendingScore - a.trendingScore);

      // Cache the results (store top 100 for pagination)
      if (page === 1) {
        const topPosts = postsWithAdvancedScoring.slice(0, 100);
        await trendingCacheService.setTrendingScores(timeRange, topPosts);
        safeLogger.info(`Cached trending ${timeRange} (${topPosts.length} posts)`);
      }

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(timeFilter, isNull(posts.parentId)));

      return {
        posts: postsWithAdvancedScoring,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit),
          cached: false
        }
      };
    } catch (error) {
      safeLogger.error('Error getting trending posts:', error);
      
      // Return empty result instead of throwing to prevent 500 errors
      return {
        posts: [],
        pagination: {
          page,
          limit,
          total: 0,
          totalPages: 0,
          cached: false
        }
      };
    }
  }

  // Get trending hashtags
  async getTrendingHashtags(options: { limit: number; timeRange: string }) {
    const { limit, timeRange } = options;
    const timeFilter = this.buildTimeFilter(timeRange);

    try {
      const trendingHashtags = await db
        .select({
          tag: postTags.tag,
          postCount: sql<number>`COUNT(DISTINCT ${postTags.postId})`,
          totalEngagement: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`,
          recentActivity: sql<number>`COUNT(CASE WHEN ${posts.createdAt} > NOW() - INTERVAL '24 hours' THEN 1 END)`
        })
        .from(postTags)
        .leftJoin(posts, eq(postTags.postId, posts.id))
        .where(timeFilter)
        .groupBy(postTags.tag)
        .orderBy(
          sql`(COUNT(DISTINCT ${postTags.postId}) * 0.3 + 
               SUM(CAST(${posts.stakedValue} AS DECIMAL)) * 0.5 + 
               COUNT(CASE WHEN ${posts.createdAt} > NOW() - INTERVAL '24 hours' THEN 1 END) * 0.2) DESC`
        )
        .limit(limit);

      return trendingHashtags.map(hashtag => ({
        tag: hashtag.tag,
        postCount: hashtag.postCount,
        totalEngagement: hashtag.totalEngagement || 0,
        recentActivity: hashtag.recentActivity || 0,
        trendingScore: (hashtag.postCount * 0.3) + 
                      ((hashtag.totalEngagement || 0) * 0.5) + 
                      ((hashtag.recentActivity || 0) * 0.2)
      }));
    } catch (error) {
      safeLogger.error('Error getting trending hashtags:', error);
      throw new Error('Failed to retrieve trending hashtags');
    }
  }

  // Get content popularity metrics
  async getContentPopularityMetrics(postId: string) {
    try {
      const postIdInt = parseInt(postId);
      
      // Get comprehensive engagement data
      const [postData, reactionData, tipData, shareData] = await Promise.all([
        db.select({
          id: posts.id,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          tags: posts.tags
        })
        .from(posts)
        .where(eq(posts.id, postIdInt))
        .limit(1),

        db.select({
          type: reactions.type,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(amount AS DECIMAL))`
        })
        .from(reactions)
        .where(eq(reactions.postId, postIdInt))
        .groupBy(reactions.type),

        db.select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(amount AS DECIMAL))`,
          avgAmount: sql<number>`AVG(CAST(amount AS DECIMAL))`
        })
        .from(tips)
        .where(eq(tips.postId, postIdInt)),

        // Placeholder for shares - would need a shares table
        Promise.resolve([{ count: 0 }])
      ]);

      if (postData.length === 0) {
        return null;
      }

      const post = postData[0];
      const ageInHours = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
      
      // Calculate various popularity metrics
      const totalReactions = reactionData.reduce((sum, r) => sum + r.count, 0);
      const totalTips = tipData[0]?.count || 0;
      const totalShares = shareData[0]?.count || 0;
      
      const engagementRate = this.calculateEngagementRate(totalReactions, totalTips, totalShares);
      const viralityScore = this.calculateViralityScore(totalShares, totalReactions, ageInHours);
      const qualityScore = this.calculateContentQualityScore(
        tipData[0]?.totalAmount || 0,
        totalReactions,
        0 // views placeholder
      );

      return {
        postId: post.id,
        ageInHours,
        totalReactions,
        totalTips,
        totalShares,
        engagementRate,
        viralityScore,
        qualityScore,
        popularityRank: this.calculatePopularityRank(engagementRate, viralityScore, qualityScore),
        reactionBreakdown: reactionData,
        tipMetrics: tipData[0] || { count: 0, totalAmount: 0, avgAmount: 0 }
      };
    } catch (error) {
      safeLogger.error('Error getting content popularity metrics:', error);
      throw new Error('Failed to retrieve content popularity metrics');
    }
  }

  // Create new post
  async createPost(data: CreatePostData) {
    const { authorAddress, content, communityId, mediaUrls, tags } = data;

    try {
      // First get or create user - use case-insensitive matching for consistency
      const normalizedAddress = authorAddress.toLowerCase();
      let user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      let userId: string;
      
      if (user.length === 0) {
        // Store wallet address in lowercase for consistency
        const newUser = await db.insert(users).values({
          walletAddress: normalizedAddress,
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

      const postResponse = {
        ...newPost[0],
        walletAddress: authorAddress,
        reactionCount: 0,
        tipCount: 0,
        totalTipAmount: 0,
        commentCount: 0
      };

      // Broadcast new post via WebSocket for real-time updates
      const wsService = getWebSocketService();
      if (wsService) {
        wsService.sendFeedUpdate({
          postId: newPost[0].id.toString(),
          authorAddress,
          communityId,
          contentType: 'post',
          post: postResponse // Include the full post data
        });
      }

      return postResponse;
    } catch (error) {
      safeLogger.error('Error creating post:', error);
      throw new Error('Failed to create post');
    }
  }

  // Update post
  async updatePost(data: UpdatePostData) {
    const { postId, userAddress, content, tags } = data;

    try {
      const postIdInt = parseInt(postId);

      // Get user ID - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
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
      safeLogger.error('Error updating post:', error);
      throw new Error('Failed to update post');
    }
  }

  // Delete post
  async deletePost(data: { postId: string; userAddress: string }) {
    const { postId, userAddress } = data;

    try {
      const postIdInt = parseInt(postId);

      // Get user ID - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
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
      safeLogger.error('Error deleting post:', error);
      throw new Error('Failed to delete post');
    }
  }

  // Add reaction to post
  async addReaction(data: ReactionData) {
    const { postId, userAddress, type, tokenAmount } = data;

    try {
      // Get user ID first - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
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
      safeLogger.error('Error adding reaction:', error);
      throw new Error('Failed to add reaction');
    }
  }

  // Send tip to post author
  async sendTip(data: TipData) {
    const { postId, fromAddress, amount, tokenType, message } = data;

    try {
      // Get from user ID - use case-insensitive matching
      const normalizedAddress = fromAddress.toLowerCase();
      const fromUser = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
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
      safeLogger.error('Error sending tip:', error);
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
      const [reactionData, tipData, commentData, viewData, bookmarkData, shareData] = await Promise.all([
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
        .where(eq(tips.postId, postIdInt)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(posts)
        .where(eq(posts.parentId, postIdInt)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(views)
        .where(eq(views.postId, postIdInt)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(bookmarks)
        .where(eq(bookmarks.postId, postIdInt)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
        .from(shares)
        .where(eq(shares.postId, postIdInt))
      ]);

      return {
        postId: post[0].id,
        reactionCount: reactionData[0]?.count || 0,
        commentCount: commentData[0]?.count || 0,
        tipCount: tipData[0]?.count || 0,
        viewCount: viewData[0]?.count || 0,
        bookmarkCount: bookmarkData[0]?.count || 0,
        shareCount: shareData[0]?.count || 0,
        totalTipAmount: tipData[0]?.totalAmount || 0,
        totalReactionAmount: reactionData[0]?.totalAmount || 0,
        stakedValue: post[0].stakedValue,
        engagementScore: this.calculateEngagementScore(
          reactionData[0]?.count || 0,
          tipData[0]?.count || 0,
          commentData[0]?.count || 0
        )
      };
    } catch (error) {
      safeLogger.error('Error getting engagement data:', error);
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

      // Get user - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
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
      safeLogger.error('Error sharing post:', error);
      throw new Error('Failed to share post');
    }
  }

  // Get post comments using posts table as threaded comments
  async getPostComments(options: { postId: string; page: number; limit: number; sort: string }) {
    const { postId, page, limit, sort } = options;
    const offset = (page - 1) * limit;

    try {
      // Use posts table with parentId to create threaded comments
      const parentPostId = parseInt(postId);
      
      // Build sort order for comments
      let sortOrder;
      switch (sort) {
        case 'oldest':
          sortOrder = posts.createdAt;
          break;
        case 'top':
          sortOrder = desc(posts.stakedValue);
          break;
        case 'newest':
        default:
          sortOrder = desc(posts.createdAt);
          break;
      }

      // Get comments (posts with parentId)
      const comments = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          contentCid: posts.contentCid,
          parentId: posts.parentId,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.parentId, parentPostId))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Get engagement data for each comment
      const commentsWithEngagement = await Promise.all(
        comments.map(async (comment) => {
          const [reactionCount, tipCount, replyCount] = await Promise.all([
            db.select({ count: sql<number>`COUNT(*)` })
              .from(reactions)
              .where(eq(reactions.postId, comment.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(tips)
              .where(eq(tips.postId, comment.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(posts)
              .where(eq(posts.parentId, comment.id))
          ]);

          return {
            id: comment.id,
            postId: parentPostId,
            authorId: comment.authorId,
            userAddress: comment.walletAddress,
            username: comment.handle,
            avatar: comment.profileCid,
            content: comment.contentCid,
            parentCommentId: comment.parentId,
            createdAt: comment.createdAt,
            updatedAt: comment.createdAt,
            replyCount: replyCount[0]?.count || 0,
            likeCount: reactionCount[0]?.count || 0,
            tipCount: tipCount[0]?.count || 0,
            engagementScore: parseFloat(comment.stakedValue || '0')
          };
        })
      );

      // Get total count for pagination
      const totalCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(eq(posts.parentId, parentPostId));

      return {
        comments: commentsWithEngagement,
        pagination: {
          page,
          limit,
          total: totalCount[0]?.count || 0,
          totalPages: Math.ceil((totalCount[0]?.count || 0) / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting post comments:', error);
      throw new Error('Failed to retrieve post comments');
    }
  }

  // Add comment to post using posts table
  async addComment(data: CommentData) {
    const { postId, userAddress, content, parentCommentId } = data;

    try {
      // Get or create user - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      let user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      let userId: string;

      if (user.length === 0) {
        // Store wallet address in lowercase for consistency
        const newUser = await db.insert(users).values({
          walletAddress: normalizedAddress,
          createdAt: new Date()
        }).returning();
        userId = newUser[0].id;
      } else {
        userId = user[0].id;
      }

      // Verify parent post exists
      const parentPost = await db.select().from(posts).where(eq(posts.id, parseInt(postId))).limit(1);
      if (parentPost.length === 0) {
        throw new Error('Parent post not found');
      }

      // Create comment as a post with parentId
      const commentPost = await db
        .insert(posts)
        .values({
          authorId: userId,
          contentCid: content, // In production, upload to IPFS first
          parentId: parentCommentId ? parseInt(parentCommentId) : parseInt(postId),
          dao: parentPost[0].dao, // Inherit community from parent
          communityId: parentPost[0].communityId,
          createdAt: new Date(),
          stakedValue: '0'
        })
        .returning();

      // Update engagement score for parent post
      await this.updateEngagementScore(postId);

      return {
        id: commentPost[0].id,
        postId: parseInt(postId),
        authorId: userId,
        userAddress,
        username: user[0]?.handle || userAddress.slice(0, 8),
        avatar: user[0]?.profileCid || '',
        content,
        parentCommentId: parentCommentId ? parseInt(parentCommentId) : parseInt(postId),
        createdAt: commentPost[0].createdAt,
        updatedAt: commentPost[0].createdAt,
        replyCount: 0,
        likeCount: 0,
        tipCount: 0,
        engagementScore: 0
      };
    } catch (error) {
      safeLogger.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  // Get comment replies (nested comments)
  async getCommentReplies(commentId: string, options: { page: number; limit: number; sort: string }) {
    const { page, limit, sort } = options;
    const offset = (page - 1) * limit;

    try {
      const commentIdInt = parseInt(commentId);
      
      // Build sort order
      let sortOrder;
      switch (sort) {
        case 'oldest':
          sortOrder = posts.createdAt;
          break;
        case 'top':
          sortOrder = desc(posts.stakedValue);
          break;
        case 'newest':
        default:
          sortOrder = desc(posts.createdAt);
          break;
      }

      // Get replies to this comment
      const replies = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          contentCid: posts.contentCid,
          parentId: posts.parentId,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(eq(posts.parentId, commentIdInt))
        .orderBy(sortOrder)
        .limit(limit)
        .offset(offset);

      // Transform replies with engagement data
      const repliesWithEngagement = await Promise.all(
        replies.map(async (reply) => {
          const [reactionCount, tipCount] = await Promise.all([
            db.select({ count: sql<number>`COUNT(*)` })
              .from(reactions)
              .where(eq(reactions.postId, reply.id)),
            db.select({ count: sql<number>`COUNT(*)` })
              .from(tips)
              .where(eq(tips.postId, reply.id))
          ]);

          return {
            id: reply.id,
            authorId: reply.authorId,
            userAddress: reply.walletAddress,
            username: reply.handle,
            avatar: reply.profileCid,
            content: reply.contentCid,
            parentCommentId: reply.parentId,
            createdAt: reply.createdAt,
            updatedAt: reply.createdAt,
            replyCount: 0, // Don't nest deeper for now
            likeCount: reactionCount[0]?.count || 0,
            tipCount: tipCount[0]?.count || 0,
            engagementScore: parseFloat(reply.stakedValue || '0')
          };
        })
      );

      return {
        replies: repliesWithEngagement,
        pagination: {
          page,
          limit,
          total: replies.length,
          totalPages: Math.ceil(replies.length / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting comment replies:', error);
      throw new Error('Failed to retrieve comment replies');
    }
  }

  // Enhanced reaction system with better aggregation
  async getPostReactions(postId: string) {
    try {
      const postIdInt = parseInt(postId);

      // Get detailed reaction data
      const reactionData = await db
        .select({
          type: reactions.type,
          userId: reactions.userId,
          amount: reactions.amount,
          createdAt: reactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.id))
        .where(eq(reactions.postId, postIdInt))
        .orderBy(desc(reactions.createdAt));

      // Group reactions by type
      const reactionsByType = new Map();
      
      reactionData.forEach(reaction => {
        const type = reaction.type;
        if (!reactionsByType.has(type)) {
          reactionsByType.set(type, {
            type,
            count: 0,
            totalAmount: 0,
            users: []
          });
        }
        
        const group = reactionsByType.get(type);
        group.count++;
        group.totalAmount += parseFloat(reaction.amount || '0');
        group.users.push({
          userId: reaction.userId,
          address: reaction.walletAddress,
          username: reaction.handle || reaction.walletAddress?.slice(0, 8),
          avatar: reaction.profileCid || '',
          amount: parseFloat(reaction.amount || '0'),
          timestamp: reaction.createdAt
        });
      });

      return {
        postId: postIdInt,
        totalReactions: reactionData.length,
        reactionsByType: Array.from(reactionsByType.values()),
        recentReactions: reactionData.slice(0, 10) // Last 10 reactions
      };
    } catch (error) {
      safeLogger.error('Error getting post reactions:', error);
      throw new Error('Failed to retrieve post reactions');
    }
  }

  // Add post sharing functionality
  async addPostShare(data: { postId: string; userAddress: string; platform: string; message?: string }) {
    const { postId, userAddress, platform, message } = data;

    try {
      // Get user - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Verify post exists
      const post = await db.select().from(posts).where(eq(posts.id, parseInt(postId))).limit(1);
      if (post.length === 0) {
        throw new Error('Post not found');
      }

      // Update engagement score
      await this.updateEngagementScore(postId);

      // Return share record (in production, this might be stored in a shares table)
      return {
        id: `share_${Date.now()}`,
        postId: parseInt(postId),
        userId: user[0].id,
        userAddress,
        platform,
        message,
        sharedAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Error adding post share:', error);
      throw new Error('Failed to share post');
    }
  }

  // Add post bookmarking functionality
  async toggleBookmark(data: { postId: string; userAddress: string }) {
    const { postId, userAddress } = data;

    try {
      // Get user - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // For now, return bookmark status (in production, this would use a bookmarks table)
      return {
        postId: parseInt(postId),
        userId: user[0].id,
        isBookmarked: true, // Toggle logic would be implemented with actual bookmarks table
        bookmarkedAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      throw new Error('Failed to toggle bookmark');
    }
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

  // Helper method to build sort order - default to newest posts
  private buildSortOrder(sort: string) {
    switch (sort) {
      case 'new':
        return desc(posts.createdAt); // Newest first
      case 'top':
        return desc(posts.stakedValue);
      case 'following':
        // This would need additional logic to filter by followed users
        return desc(posts.createdAt); // Newest first for following feed
      case 'hot':
      default:
        return desc(posts.createdAt); // Default to newest instead of stakedValue
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

  // Calculate engagement velocity (engagement per hour)
  private calculateEngagementVelocity(reactionCount: number, tipCount: number, ageInHours: number): number {
    if (ageInHours <= 0) return 0;
    const totalEngagement = (reactionCount * 1) + (tipCount * 5);
    return totalEngagement / Math.max(ageInHours, 0.1); // Avoid division by zero
  }

  // Calculate content quality score based on tip amounts and engagement depth
  private calculateContentQualityScore(totalTipAmount: number, reactionCount: number, viewCount: number): number {
    const tipQuality = totalTipAmount > 0 ? Math.log(totalTipAmount + 1) * 10 : 0;
    const engagementDepth = viewCount > 0 ? (reactionCount / Math.max(viewCount, 1)) * 100 : reactionCount;
    return (tipQuality * 0.6) + (engagementDepth * 0.4);
  }

  // Calculate recency boost based on time range
  private calculateRecencyBoost(ageInHours: number, timeRange: string): number {
    let maxAge: number;
    
    switch (timeRange) {
      case 'hour':
        maxAge = 1;
        break;
      case 'day':
        maxAge = 24;
        break;
      case 'week':
        maxAge = 168;
        break;
      default:
        maxAge = 24;
    }

    // Linear decay from 100 to 0 over the time range
    return Math.max(0, 100 * (1 - (ageInHours / maxAge)));
  }

  // Calculate engagement rate
  private calculateEngagementRate(reactions: number, tips: number, shares: number): number {
    // Weighted engagement rate
    return (reactions * 1) + (tips * 3) + (shares * 2);
  }

  // Calculate virality score
  private calculateViralityScore(shares: number, reactions: number, ageInHours: number): number {
    const shareVelocity = shares / Math.max(ageInHours, 0.1);
    const reactionMultiplier = Math.log(reactions + 1);
    return shareVelocity * reactionMultiplier;
  }

  // Calculate overall popularity rank
  private calculatePopularityRank(engagementRate: number, viralityScore: number, qualityScore: number): number {
    return (engagementRate * 0.4) + (viralityScore * 0.3) + (qualityScore * 0.3);
  }

  // Get community engagement metrics
  async getCommunityEngagementMetrics(communityId: string, timeRange: string = 'week') {
    try {
      const timeFilter = this.buildTimeFilter(timeRange);

      // Get total posts in community within time range
      const totalPostsResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          eq(posts.dao, communityId),
          timeFilter
        ));

      // Get total engagement (reactions + tips)
      const engagementResult = await db
        .select({
          reactionCount: sql<number>`COUNT(DISTINCT ${reactions.id})`,
          tipCount: sql<number>`COUNT(DISTINCT ${tips.id})`
        })
        .from(posts)
        .leftJoin(reactions, eq(posts.id, reactions.postId))
        .leftJoin(tips, eq(posts.id, tips.postId))
        .where(and(
          eq(posts.dao, communityId),
          timeFilter
        ));

      // Get top contributors
      const topContributors = await db
        .select({
          userId: posts.authorId,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid,
          postCount: sql<number>`COUNT(${posts.id})`,
          engagementScore: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          eq(posts.dao, communityId),
          timeFilter
        ))
        .groupBy(posts.authorId, users.walletAddress, users.handle, users.profileCid)
        .orderBy(sql`SUM(CAST(${posts.stakedValue} AS DECIMAL)) DESC`)
        .limit(5);

      // Get trending tags
      const trendingTags = await db
        .select({
          tag: postTags.tag,
          count: sql<number>`COUNT(*)`
        })
        .from(postTags)
        .leftJoin(posts, eq(postTags.postId, posts.id))
        .where(and(
          eq(posts.dao, communityId),
          timeFilter
        ))
        .groupBy(postTags.tag)
        .orderBy(sql`COUNT(*) DESC`)
        .limit(10);

      return {
        communityId,
        totalPosts: totalPostsResult[0]?.count || 0,
        totalEngagement: (engagementResult[0]?.reactionCount || 0) + (engagementResult[0]?.tipCount || 0),
        topContributors: topContributors.map(contributor => ({
          id: contributor.userId,
          address: contributor.walletAddress,
          username: contributor.handle,
          displayName: contributor.handle,
          avatar: contributor.profileCid || '',
          verified: false,
          reputation: contributor.engagementScore || 0
        })),
        trendingTags: trendingTags.map(tag => tag.tag),
        engagementGrowth: 0 // TODO: Calculate growth percentage
      };
    } catch (error) {
      safeLogger.error('Error getting community engagement metrics:', error);
      throw new Error('Failed to retrieve community engagement metrics');
    }
  }

  // Get community leaderboard
  async getCommunityLeaderboard(
    communityId: string,
    metric: 'posts' | 'engagement' | 'tips_received' | 'tips_given',
    limit: number = 10
  ) {
    try {
      let query;

      switch (metric) {
        case 'posts':
          query = db
            .select({
              userId: posts.authorId,
              walletAddress: users.walletAddress,
              handle: users.handle,
              profileCid: users.profileCid,
              score: sql<number>`COUNT(${posts.id})`
            })
            .from(posts)
            .leftJoin(users, eq(posts.authorId, users.id))
            .where(eq(posts.dao, communityId))
            .groupBy(posts.authorId, users.walletAddress, users.handle, users.profileCid)
            .orderBy(sql`COUNT(${posts.id}) DESC`);
          break;

        case 'engagement':
          query = db
            .select({
              userId: posts.authorId,
              walletAddress: users.walletAddress,
              handle: users.handle,
              profileCid: users.profileCid,
              score: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`
            })
            .from(posts)
            .leftJoin(users, eq(posts.authorId, users.id))
            .where(eq(posts.dao, communityId))
            .groupBy(posts.authorId, users.walletAddress, users.handle, users.profileCid)
            .orderBy(sql`SUM(CAST(${posts.stakedValue} AS DECIMAL)) DESC`);
          break;

        case 'tips_received':
          query = db
            .select({
              userId: tips.toUserId,
              walletAddress: users.walletAddress,
              handle: users.handle,
              profileCid: users.profileCid,
              score: sql<number>`SUM(CAST(${tips.amount} AS DECIMAL))`
            })
            .from(tips)
            .leftJoin(posts, eq(tips.postId, posts.id))
            .leftJoin(users, eq(tips.toUserId, users.id))
            .where(eq(posts.dao, communityId))
            .groupBy(tips.toUserId, users.walletAddress, users.handle, users.profileCid)
            .orderBy(sql`SUM(CAST(${tips.amount} AS DECIMAL)) DESC`);
          break;

        case 'tips_given':
          query = db
            .select({
              userId: tips.fromUserId,
              walletAddress: users.walletAddress,
              handle: users.handle,
              profileCid: users.profileCid,
              score: sql<number>`SUM(CAST(${tips.amount} AS DECIMAL))`
            })
            .from(tips)
            .leftJoin(posts, eq(tips.postId, posts.id))
            .leftJoin(users, eq(tips.fromUserId, users.id))
            .where(eq(posts.dao, communityId))
            .groupBy(tips.fromUserId, users.walletAddress, users.handle, users.profileCid)
            .orderBy(sql`SUM(CAST(${tips.amount} AS DECIMAL)) DESC`);
          break;

        default:
          throw new Error('Invalid metric');
      }

      const results = await query.limit(limit);

      return results.map((result, index) => ({
        rank: index + 1,
        user: {
          id: result.userId,
          address: result.walletAddress,
          username: result.handle,
          displayName: result.handle,
          avatar: result.profileCid || '',
          verified: false,
          reputation: result.score || 0
        },
        score: result.score || 0,
        change: 0, // TODO: Calculate position change
        metric
      }));
    } catch (error) {
      safeLogger.error('Error getting community leaderboard:', error);
      throw new Error('Failed to retrieve community leaderboard');
    }
  }

  // Get liked by data for post
  async getLikedByData(postId: string) {
    try {
      const postIdInt = parseInt(postId);

      // Get reactions with user data
      const reactionsData = await db
        .select({
          userId: reactions.userId,
          type: reactions.type,
          amount: reactions.amount,
          createdAt: reactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.id))
        .where(eq(reactions.postId, postIdInt))
        .orderBy(desc(reactions.createdAt));

      // Get tips with user data
      const tipsData = await db
        .select({
          fromUserId: tips.fromUserId,
          amount: tips.amount,
          token: tips.token,
          message: tips.message,
          createdAt: tips.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid
        })
        .from(tips)
        .leftJoin(users, eq(tips.fromUserId, users.id))
        .where(eq(tips.postId, postIdInt))
        .orderBy(desc(tips.createdAt));

      return {
        reactions: reactionsData.map(reaction => ({
          address: reaction.walletAddress,
          username: reaction.handle || reaction.walletAddress?.slice(0, 8) || '',
          avatar: reaction.profileCid || '',
          amount: parseFloat(reaction.amount || '0'),
          timestamp: new Date(reaction.createdAt)
        })),
        tips: tipsData.map(tip => ({
          from: tip.handle || tip.walletAddress?.slice(0, 8) || '',
          address: tip.walletAddress || '',
          username: tip.handle,
          avatar: tip.profileCid || '',
          amount: parseFloat(tip.amount || '0'),
          tokenType: tip.token || 'LDAO',
          message: tip.message,
          timestamp: new Date(tip.createdAt)
        })),
        followedUsers: [], // TODO: Implement when following system is added
        totalUsers: reactionsData.length + tipsData.length
      };
    } catch (error) {
      safeLogger.error('Error getting liked by data:', error);
      throw new Error('Failed to retrieve liked by data');
    }
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
      safeLogger.error('Error updating engagement score:', error);
    }
  }
}

export const feedService = new FeedService();
