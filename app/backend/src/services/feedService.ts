import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { posts, quickPosts, reactions, quickPostReactions, tips, quickPostTips, users, postTags, quickPostTags, views, quickPostViews, bookmarks, quickPostBookmarks, shares, quickPostShares, follows } from '../db/schema';
import { eq, desc, and, or, inArray, sql, gt, isNull } from 'drizzle-orm';
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
  content: string; // This is now the CID, not the actual content
  communityId?: string;
  mediaUrls: string[];
  tags: string[];
}

interface UpdatePostData {
  postId: string;
  userAddress: string;
  content?: string; // This is now the CID, not the actual content
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

    // Declare user variable in outer scope so it's accessible to later queries
    let user: any[] = [];
    
    // Build following filter if feedSource is 'following'
    let followingFilter = sql`1=1`;
    let quickPostFollowingFilter = sql`1=1`; // Separate filter for quick posts
    if (feedSource === 'following' && userAddress) {
      // Get the user ID from address
      const normalizedAddress = userAddress.toLowerCase();
      
      console.log('🔍 [BACKEND FEED] Building following filter for user:', normalizedAddress);
      
      user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);
      
      console.log('🔍 [BACKEND FEED] User lookup result:', user);
      
      if (user.length > 0) {
        const userId = user[0].id;
        console.log('✅ [BACKEND FEED] Found user ID:', userId);
        
        // Get list of users the current user is following
        const followingList = await db.select({ followingId: follows.followingId })
          .from(follows)
          .where(eq(follows.followerId, userId));
        
        console.log('🔍 [BACKEND FEED] Following list query result:', followingList);
        
        const followingIds = followingList.map(f => f.followingId);
        
        console.log('📋 [BACKEND FEED] User is following:', followingIds.length, 'users');
        
        // Always include the user's own posts in the following feed
        // Add the user's own ID to ensure they see their own posts
        if (!followingIds.includes(userId)) {
          followingIds.push(userId);
          console.log('📋 [BACKEND FEED] Added user\'s own ID to following list');
        }
        
        console.log('📋 [BACKEND FEED] Including user\'s own posts, total IDs:', followingIds.length);
        console.log('📋 [BACKEND FEED] Following IDs:', followingIds);
        
        // Ensure we always include the user's own posts, even if followingIds is empty
        if (followingIds.length === 0) {
          // If user follows no one (except themselves), just show their own posts
          followingFilter = eq(posts.authorId, userId);
          quickPostFollowingFilter = eq(quickPosts.authorId, userId);
        } else {
          // Filter posts to show from followed users AND the user's own posts
          followingFilter = inArray(posts.authorId, followingIds);
          quickPostFollowingFilter = inArray(quickPosts.authorId, followingIds);
        }
        
        console.log('📋 [BACKEND FEED] Following filter applied');
      } else {
        console.log('⚠️ [BACKEND FEED] User not found in database, creating user and showing all posts...');
        // User not found in users table, create them so future operations work
        await db.insert(users)
          .values({
            walletAddress: normalizedAddress,
            createdAt: new Date()
          })
          .onConflictDoNothing();
        
        // For new users, default to showing all posts until they follow someone
        // This ensures they see the platform content while onboarding
        followingFilter = sql`1=1`;
        quickPostFollowingFilter = sql`1=1`;
        console.log('📋 [BACKEND FEED] New user - showing all posts until they follow someone');
      }
    } else if (feedSource === 'all' && userAddress) {
      // For 'all' feedSource, show all posts (no additional filtering needed)
      // The followingFilter is already set to sql`1=1` which shows all posts
      // We don't need to add user-specific filtering for 'all' feed
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select({ id: users.id })
        .from(users)
        .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
        .limit(1);

      if (user.length === 0) {
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

      console.log('🔍 [BACKEND FEED] Executing regular posts query with filters:', {
        timeFilter: timeFilter.toString(),
        communityFilter: communityFilter.toString(),
        followingFilter: followingFilter.toString(),
        moderationFilter: moderationFilter.toString()
      });

      // For following feed, make sure to include user's own posts 
      let finalFollowingFilter = followingFilter;
      if (feedSource === 'following' && userAddress && user && user.length > 0) {
        // When feedSource is 'following', always include user's own posts
        // Use OR to ensure user sees their own posts regardless of following status
        finalFollowingFilter = or(
          followingFilter,  // Posts from followed users (including self if added to followingIds)
          eq(posts.authorId, user[0].id)  // User's own posts
        );
      }

      // Get regular posts with engagement metrics
      const regularPosts = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          dao: posts.dao,
          title: posts.title,
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
          riskScore: posts.riskScore,
          isQuickPost: sql`false` // Mark as regular post
        })
        .from(posts)
        .leftJoin(users, eq(posts.authorId, users.id))
        .where(and(
          timeFilter,
          communityFilter,
          finalFollowingFilter,
          moderationFilter, // Add moderation filter
          isNull(posts.parentId) // Only show top-level posts, not comments
        ));

      console.log('📊 [BACKEND FEED] Regular posts query result:', {
        count: regularPosts.length,
        samplePost: regularPosts[0] ? {
          id: regularPosts[0].id,
          authorId: regularPosts[0].authorId,
          walletAddress: regularPosts[0].walletAddress,
          contentCid: regularPosts[0].contentCid
        } : null
      });

      // Get quick posts with engagement metrics
      console.log('🔍 [BACKEND FEED] Executing quick posts query with filters:', {
        timeFilter: timeFilter.toString(),
        quickPostFollowingFilter: quickPostFollowingFilter.toString()
      });

      // For following feed, make sure to include user's own quick posts 
      let finalQuickPostFollowingFilter = quickPostFollowingFilter;
      if (feedSource === 'following' && userAddress && user && user.length > 0) {
        // When feedSource is 'following', always include user's own quick posts
        // Use OR to ensure user sees their own quick posts regardless of following status
        finalQuickPostFollowingFilter = or(
          quickPostFollowingFilter,  // Quick posts from followed users (including self if added to followingIds)
          eq(quickPosts.authorId, user[0].id)  // User's own quick posts
        );
      }

      const quickPostsResults = await db
        .select({
          id: quickPosts.id,
          authorId: quickPosts.authorId,
          dao: sql<string>`NULL` as unknown as string, // Quick posts don't have DAO
          contentCid: quickPosts.contentCid,
          mediaCids: quickPosts.mediaCids,
          tags: quickPosts.tags,
          createdAt: quickPosts.createdAt,
          stakedValue: quickPosts.stakedValue,
          walletAddress: users.walletAddress,
          handle: users.handle,
          profileCid: users.profileCid,
          // Moderation fields
          moderationStatus: quickPosts.moderationStatus,
          moderationWarning: quickPosts.moderationWarning,
          riskScore: quickPosts.riskScore,
          isQuickPost: sql`true` // Mark as quick post
        })
        .from(quickPosts)
        .leftJoin(users, eq(quickPosts.authorId, users.id))
        .where(and(
          timeFilter,
          finalQuickPostFollowingFilter, // Use the correct filter for quick posts
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`, // Quick post moderation filter
          isNull(quickPosts.parentId) // Only show top-level posts, not comments
        ));

      console.log('📊 [BACKEND FEED] Quick posts query result:', {
        count: quickPostsResults.length,
        samplePost: quickPostsResults[0] ? {
          id: quickPostsResults[0].id,
          authorId: quickPostsResults[0].authorId,
          walletAddress: quickPostsResults[0].walletAddress,
          contentCid: quickPostsResults[0].contentCid
        } : null
      });

      // Combine regular posts and quick posts
      let allPosts = [...regularPosts, ...quickPostsResults];

      console.log('📊 [BACKEND FEED] Combined posts before sorting:', {
        totalPosts: allPosts.length,
        regularPosts: regularPosts.length,
        quickPosts: quickPostsResults.length,
        uniqueAuthors: [...new Set(allPosts.map(p => p.authorId))].length
      });

      // Apply sorting to the combined results
      allPosts.sort((a, b) => {
        if (sort === 'new' || sort === 'hot') {
          // Sort by creation date (newest first)
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        } else if (sort === 'top') {
          // Sort by engagement/staked value
          return (b.stakedValue || 0) - (a.stakedValue || 0);
        } else {
          // Default to newest
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
      });

      // Apply pagination after sorting
      const paginatedPosts = allPosts.slice(offset, offset + limit);

      console.log('📊 [BACKEND FEED] Posts after pagination:', {
        page: page,
        limit: limit,
        offset: offset,
        totalBeforePagination: allPosts.length,
        returnedPosts: paginatedPosts.length
      });

      // Get engagement metrics for each post
      const postsWithMetrics = await Promise.all(
        paginatedPosts.map(async (post) => {
          // Determine which reactions/tips tables to use based on post type
          let reactionCount, tipCount, tipTotal, commentCount, viewCount;
          
          if (post.isQuickPost) {
            // For quick posts, use quick post tables
            [reactionCount, tipCount, tipTotal, commentCount, viewCount] = await Promise.all([
              db.select({ count: sql<number>`COUNT(*)` })
                .from(quickPostReactions)
                .where(eq(quickPostReactions.quickPostId, post.id)),
              db.select({ count: sql<number>`COUNT(*)` })
                .from(quickPostTips)
                .where(eq(quickPostTips.quickPostId, post.id)),
              db.select({ total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)` })
                .from(quickPostTips)
                .where(eq(quickPostTips.quickPostId, post.id)),
              db.select({ count: sql<number>`COUNT(*)` })
                .from(quickPosts)
                .where(eq(quickPosts.parentId, post.id)),
              db.select({ count: sql<number>`COUNT(*)` })
                .from(quickPostViews)
                .where(eq(quickPostViews.quickPostId, post.id))
            ]);
          } else {
            // For regular posts, use regular post tables
            [reactionCount, tipCount, tipTotal, commentCount, viewCount] = await Promise.all([
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
          }

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
      const totalRegularCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          timeFilter,
          communityFilter,
          finalFollowingFilter,
          moderationFilter, // Include moderation filter in count
          isNull(posts.parentId) // Only count top-level posts
        ));

      const totalQuickCount = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(quickPosts)
        .where(and(
          timeFilter,
          finalQuickPostFollowingFilter, // Use the correct filter for quick posts
          sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`, // Quick post moderation filter
          isNull(quickPosts.parentId) // Only count top-level posts
        ));

      const totalCount = (totalRegularCount[0]?.count || 0) + (totalQuickCount[0]?.count || 0);

      console.log('📊 [BACKEND FEED] Returning posts:', {
        postsCount: postsWithMetrics.length,
        regularPostsCount: regularPosts.length,
        quickPostsCount: quickPostsResults.length,
        totalInDB: totalCount,
        page,
        limit
      });

      return {
        posts: postsWithMetrics,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
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
            // Apply pagination to cached data
            const paginatedPosts = cachedTrending.slice(offset, offset + limit);
            return {
              posts: paginatedPosts,
              pagination: {
                page,
                limit,
                total: cachedTrending.length,
                totalPages: Math.ceil(cachedTrending.length / limit)
              }
            };
          }
        } catch (cacheError) {
          safeLogger.warn('Error reading from trending cache:', cacheError);
        }
      }

      // If not cached or not first page, query database
      const trendingPosts = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          title: posts.title,
          contentCid: posts.contentCid,
          mediaCids: posts.mediaCids,
          tags: posts.tags,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          reputationScore: posts.reputationScore,
          dao: posts.dao,
          trendingScore: sql<number>`(
            COALESCE(CAST(${posts.stakedValue} AS DECIMAL), 0) * 0.4 +
            COALESCE(${posts.reputationScore}, 0) * 0.3 +
            EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 * 0.3
          )`
        })
        .from(posts)
        .where(and(
          timeFilter,
          sql`${posts.moderationStatus} IS NULL OR ${posts.moderationStatus} != 'blocked'`
        ))
        .orderBy(sql`(
          COALESCE(CAST(${posts.stakedValue} AS DECIMAL), 0) * 0.4 +
          COALESCE(${posts.reputationScore}, 0) * 0.3 +
          EXTRACT(EPOCH FROM (NOW() - ${posts.createdAt})) / 3600 * 0.3
        ) DESC`)
        .limit(limit)
        .offset(offset);

      // Enrich with user data
      const enrichedPosts = await Promise.all(
        trendingPosts.map(async (post) => {
          const user = await db
            .select({ walletAddress: users.walletAddress, handle: users.handle })
            .from(users)
            .where(eq(users.id, post.authorId))
            .limit(1);

          return {
            ...post,
            walletAddress: user[0]?.walletAddress || '',
            handle: user[0]?.handle || ''
          };
        })
      );

      // Update cache for first page
      if (page === 1) {
        try {
          await trendingCacheService.updateTrendingScores(timeRange, enrichedPosts);
        } catch (cacheError) {
          safeLogger.warn('Error updating trending cache:', cacheError);
        }
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(posts)
        .where(and(
          timeFilter,
          sql`${posts.moderationStatus} IS NULL OR ${posts.moderationStatus} != 'blocked'`
        ));

      const totalCount = totalCountResult[0]?.count || 0;

      return {
        posts: enrichedPosts,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting trending posts:', error);
      throw new Error('Failed to retrieve trending posts');
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

      // Create the post - content is now the CID
      const newPost = await db
        .insert(posts)
        .values({
          authorId: userId,
          contentCid: content, // This is now the CID, not the actual content
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

      // Prepare update data
      const updateData: any = {};
      if (content !== undefined) {
        updateData.contentCid = content; // This is now the CID, not the actual content
      }
      if (tags !== undefined) {
        updateData.tags = JSON.stringify(tags);
      }
      updateData.updatedAt = new Date();

      // Update the post
      const updatedPost = await db
        .update(posts)
        .set(updateData)
        .where(and(
          eq(posts.id, postIdInt),
          eq(posts.authorId, user[0].id)
        ))
        .returning();

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await db.delete(postTags).where(eq(postTags.postId, postIdInt));
        
        // Insert new tags
        if (tags && tags.length > 0) {
          const tagInserts = tags.map(tag => ({
            postId: postIdInt,
            tag: tag.toLowerCase(),
            createdAt: new Date()
          }));
          await db.insert(postTags).values(tagInserts);
        }
      }

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
      // Get user ID - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Check if reaction already exists
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
        targetType,
        targetId,
        message,
        createdAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Error sharing post:', error);
      throw new Error('Failed to share post');
    }
  }

  // Get post comments
  async getPostComments(data: { postId: string; page: number; limit: number; sort: string }) {
    const { postId, page, limit, sort } = data;
    const offset = (page - 1) * limit;

    try {
      const postIdInt = parseInt(postId);

      // Build sort order
      let orderByClause;
      if (sort === 'oldest') {
        orderByClause = asc(comments.createdAt);
      } else if (sort === 'popular') {
        orderByClause = desc(comments.upvotes);
      } else {
        orderByClause = desc(comments.createdAt); // Default to newest
      }

      const commentsResult = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          authorId: comments.authorId,
          content: comments.content,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          parentCommentId: comments.parentCommentId,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(and(
          eq(comments.postId, postIdInt),
          sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(and(
          eq(comments.postId, postIdInt),
          sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
        ));

      const totalCount = totalCountResult[0]?.count || 0;

      return {
        comments: commentsResult,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting post comments:', error);
      throw new Error('Failed to retrieve comments');
    }
  }

  // Add comment to post
  async addComment(data: CommentData) {
    const { postId, userAddress, content, parentCommentId } = data;

    try {
      // Get user ID - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      const comment = await db
        .insert(comments)
        .values({
          postId: parseInt(postId),
          authorId: user[0].id,
          content,
          parentCommentId,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Update post engagement score
      await this.updateEngagementScore(postId);

      return comment[0];
    } catch (error) {
      safeLogger.error('Error adding comment:', error);
      throw new Error('Failed to add comment');
    }
  }

  // Get community engagement metrics
  async getCommunityEngagementMetrics(communityId: string, timeRange: string) {
    try {
      const timeFilter = this.buildTimeFilter(timeRange);

      // Get community posts with engagement metrics
      const communityPosts = await db
        .select({
          id: posts.id,
          authorId: posts.authorId,
          stakedValue: posts.stakedValue,
          createdAt: posts.createdAt,
          tags: posts.tags
        })
        .from(posts)
        .where(and(
          eq(posts.dao, communityId),
          timeFilter,
          sql`${posts.moderationStatus} IS NULL OR ${posts.moderationStatus} != 'blocked'`
        ));

      // Calculate metrics
      const totalPosts = communityPosts.length;
      const totalEngagement = communityPosts.reduce((sum, post) => sum + parseFloat(post.stakedValue || '0'), 0);
      
      // Get top contributors
      const contributorMap = new Map<string, { postCount: number; engagement: number }>();
      communityPosts.forEach(post => {
        const current = contributorMap.get(post.authorId) || { postCount: 0, engagement: 0 };
        contributorMap.set(post.authorId, {
          postCount: current.postCount + 1,
          engagement: current.engagement + parseFloat(post.stakedValue || '0')
        });
      });

      const topContributors = Array.from(contributorMap.entries())
        .map(([authorId, metrics]) => ({
          authorId,
          ...metrics
        }))
        .sort((a, b) => b.engagement - a.engagement)
        .slice(0, 10);

      // Get trending tags
      const tagCounts = new Map<string, number>();
      communityPosts.forEach(post => {
        if (post.tags) {
          try {
            const tags = JSON.parse(post.tags);
            tags.forEach((tag: string) => {
              tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
            });
          } catch (e) {
            // Ignore parsing errors
          }
        }
      });

      const trendingTags = Array.from(tagCounts.entries())
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        communityId,
        totalPosts,
        totalEngagement,
        topContributors,
        trendingTags,
        engagementGrowth: this.calculateEngagementGrowth(communityPosts, timeRange)
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
    limit: number
  ) {
    try {
      let leaderboardQuery;
      
      switch (metric) {
        case 'posts':
          leaderboardQuery = db
            .select({
              userId: posts.authorId,
              count: sql<number>`COUNT(*)`,
              totalValue: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`
            })
            .from(posts)
            .where(eq(posts.dao, communityId))
            .groupBy(posts.authorId)
            .orderBy(desc(sql`COUNT(*)`))
            .limit(limit);
          break;
          
        case 'engagement':
          leaderboardQuery = db
            .select({
              userId: posts.authorId,
              count: sql<number>`COUNT(*)`,
              totalValue: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`
            })
            .from(posts)
            .where(eq(posts.dao, communityId))
            .groupBy(posts.authorId)
            .orderBy(desc(sql`SUM(CAST(${posts.stakedValue} AS DECIMAL))`))
            .limit(limit);
          break;
          
        // Add cases for tips_received and tips_given if needed
        default:
          leaderboardQuery = db
            .select({
              userId: posts.authorId,
              count: sql<number>`COUNT(*)`,
              totalValue: sql<number>`SUM(CAST(${posts.stakedValue} AS DECIMAL))`
            })
            .from(posts)
            .where(eq(posts.dao, communityId))
            .groupBy(posts.authorId)
            .orderBy(desc(sql`COUNT(*)`))
            .limit(limit);
      }

      const leaderboard = await leaderboardQuery;

      // Enrich with user data
      const enrichedLeaderboard = await Promise.all(
        leaderboard.map(async (entry) => {
          const user = await db
            .select({ walletAddress: users.walletAddress, handle: users.handle })
            .from(users)
            .where(eq(users.id, entry.userId))
            .limit(1);

          return {
            userId: entry.userId,
            walletAddress: user[0]?.walletAddress || '',
            handle: user[0]?.handle || '',
            count: entry.count,
            totalValue: entry.totalValue || 0
          };
        })
      );

      return enrichedLeaderboard;
    } catch (error) {
      safeLogger.error('Error getting community leaderboard:', error);
      throw new Error('Failed to retrieve community leaderboard');
    }
  }

  // Get liked by data for post
  async getLikedByData(postId: string) {
    try {
      const postIdInt = parseInt(postId);

      // Get reactions for the post
      const reactionsData = await db
        .select({
          userId: reactions.userId,
          type: reactions.type,
          amount: reactions.amount,
          createdAt: reactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.id))
        .where(eq(reactions.postId, postIdInt))
        .orderBy(desc(reactions.createdAt));

      // Get tips for the post
      const tipsData = await db
        .select({
          fromUserId: tips.fromUserId,
          toUserId: tips.toUserId,
          token: tips.token,
          amount: tips.amount,
          message: tips.message,
          createdAt: tips.createdAt,
          fromWalletAddress: users.walletAddress,
          fromHandle: users.handle
        })
        .from(tips)
        .leftJoin(users, eq(tips.fromUserId, users.id))
        .where(eq(tips.postId, postIdInt))
        .orderBy(desc(tips.createdAt));

      // Get users that follow the post author
      const post = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postIdInt)).limit(1);
      if (post.length === 0) {
        return { reactions: [], tips: [], followedUsers: [], totalUsers: 0 };
      }

      const followedUsers = await db
        .select({
          followerId: follows.followerId,
          followingId: follows.followingId,
          createdAt: follows.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(follows)
        .leftJoin(users, eq(follows.followerId, users.id))
        .where(eq(follows.followingId, post[0].authorId));

      return {
        reactions: reactionsData,
        tips: tipsData,
        followedUsers: followedUsers.map(user => ({
          userId: user.followerId,
          walletAddress: user.walletAddress || '',
          handle: user.handle || '',
          followedAt: user.createdAt
        })),
        totalUsers: followedUsers.length
      };
    } catch (error) {
      safeLogger.error('Error getting liked by data:', error);
      throw new Error('Failed to retrieve liked by data');
    }
  }

  // Get trending hashtags
  async getTrendingHashtags(options: { limit: number; timeRange: string }) {
    const { limit, timeRange } = options;
    
    try {
      const timeFilter = this.buildTimeFilter(timeRange);
      
      const trendingHashtags = await db
        .select({
          tag: postTags.tag,
          postCount: sql<number>`COUNT(DISTINCT ${postTags.postId})`,
          totalEngagement: sql<number>`COALESCE(SUM(CAST(${posts.stakedValue} AS DECIMAL)), 0)`,
          recentActivity: sql<number>`COUNT(CASE WHEN ${posts.createdAt} > NOW() - INTERVAL '24 hours' THEN 1 END)`
        })
        .from(postTags)
        .leftJoin(posts, eq(postTags.postId, posts.id))
        .where(timeFilter)
        .groupBy(postTags.tag)
        .orderBy(
          sql`(COUNT(DISTINCT ${postTags.postId}) * 0.3 + 
               COALESCE(SUM(CAST(${posts.stakedValue} AS DECIMAL)), 0) * 0.5 + 
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

  // Get comment replies
  async getCommentReplies(commentId: string, options: { page: number; limit: number; sort: string }) {
    const { page, limit, sort } = options;
    const offset = (page - 1) * limit;

    try {
      // Build sort order
      let orderByClause;
      if (sort === 'oldest') {
        orderByClause = asc(comments.createdAt);
      } else if (sort === 'popular') {
        orderByClause = desc(comments.upvotes);
      } else {
        orderByClause = desc(comments.createdAt); // Default to newest
      }

      const replies = await db
        .select({
          id: comments.id,
          postId: comments.postId,
          quickPostId: comments.quickPostId,
          authorId: comments.authorId,
          content: comments.content,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          parentCommentId: comments.parentCommentId,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(and(
          eq(comments.parentCommentId, commentId),
          sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
        ))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(and(
          eq(comments.parentCommentId, commentId),
          sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
        ));

      const totalCount = totalCountResult[0]?.count || 0;

      return {
        replies,
        pagination: {
          page,
          limit,
          total: totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      };
    } catch (error) {
      safeLogger.error('Error getting comment replies:', error);
      throw new Error('Failed to retrieve comment replies');
    }
  }

  // Get post reactions
  async getPostReactions(postId: string) {
    try {
      const postIdInt = parseInt(postId);

      // Get all reactions for the post
      const reactionsData = await db
        .select({
          id: reactions.id,
          postId: reactions.postId,
          userId: reactions.userId,
          type: reactions.type,
          amount: reactions.amount,
          createdAt: reactions.createdAt,
          walletAddress: users.walletAddress,
          handle: users.handle
        })
        .from(reactions)
        .leftJoin(users, eq(reactions.userId, users.id))
        .where(eq(reactions.postId, postIdInt))
        .orderBy(desc(reactions.createdAt));

      // Group reactions by type
      const reactionsByType = reactionsData.reduce((acc, reaction) => {
        const existing = acc.find(r => r.type === reaction.type);
        if (existing) {
          existing.count += 1;
          existing.totalAmount += parseFloat(reaction.amount || '0');
          existing.users.push({
            userId: reaction.userId,
            walletAddress: reaction.walletAddress || '',
            handle: reaction.handle || '',
            amount: parseFloat(reaction.amount || '0'),
            timestamp: reaction.createdAt
          });
        } else {
          acc.push({
            type: reaction.type,
            count: 1,
            totalAmount: parseFloat(reaction.amount || '0'),
            users: [{
              userId: reaction.userId,
              walletAddress: reaction.walletAddress || '',
              handle: reaction.handle || '',
              amount: parseFloat(reaction.amount || '0'),
              timestamp: reaction.createdAt
            }]
          });
        }
        return acc;
      }, [] as Array<{ type: string; count: number; totalAmount: number; users: Array<any> }>);

      // Get recent reactions (last 10)
      const recentReactions = reactionsData.slice(0, 10);

      return {
        postId,
        totalReactions: reactionsData.length,
        reactionsByType,
        recentReactions
      };
    } catch (error) {
      safeLogger.error('Error getting post reactions:', error);
      throw new Error('Failed to retrieve post reactions');
    }
  }

  // Add post share
  async addPostShare(data: { postId: string; userAddress: string; platform: string; message?: string }) {
    const { postId, userAddress, platform, message } = data;

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

      // In a real implementation, you might want to store share data in a database
      // For now, we'll just return a mock share object
      
      // Update engagement score
      await this.updateEngagementScore(postId);

      return {
        id: `share_${Date.now()}`,
        postId: postIdInt,
        userId: user[0].id,
        platform,
        message,
        createdAt: new Date()
      };
    } catch (error) {
      safeLogger.error('Error adding post share:', error);
      throw new Error('Failed to add post share');
    }
  }

  // Toggle bookmark
  async toggleBookmark(data: { postId: string; userAddress: string }) {
    const { postId, userAddress } = data;

    try {
      const postIdInt = parseInt(postId);
      
      // Get user - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Check if bookmark already exists
      const existingBookmark = await db
        .select()
        .from(bookmarks)
        .where(and(
          eq(bookmarks.postId, postIdInt),
          eq(bookmarks.userId, user[0].id)
        ))
        .limit(1);

      let result;

      if (existingBookmark.length > 0) {
        // Remove bookmark
        await db.delete(bookmarks).where(and(
          eq(bookmarks.postId, postIdInt),
          eq(bookmarks.userId, user[0].id)
        ));
        result = { bookmarked: false };
      } else {
        // Add bookmark
        await db.insert(bookmarks).values({
          postId: postIdInt,
          userId: user[0].id,
          createdAt: new Date()
        });
        result = { bookmarked: true };
      }

      return result;
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      throw new Error('Failed to toggle bookmark');
    }
  }

  // Helper methods
  private buildTimeFilter(timeRange: string) {
    let timeFilter;
    switch (timeRange) {
      case 'hour':
        timeFilter = sql`${posts.createdAt} > NOW() - INTERVAL '1 hour'`;
        break;
      case 'day':
        timeFilter = sql`${posts.createdAt} > NOW() - INTERVAL '1 day'`;
        break;
      case 'week':
        timeFilter = sql`${posts.createdAt} > NOW() - INTERVAL '1 week'`;
        break;
      case 'month':
        timeFilter = sql`${posts.createdAt} > NOW() - INTERVAL '1 month'`;
        break;
      case 'year':
        timeFilter = sql`${posts.createdAt} > NOW() - INTERVAL '1 year'`;
        break;
      default:
        timeFilter = sql`1=1`; // No time filter
    }
    return timeFilter;
  }

  private buildSortOrder(sort: string) {
    let sortOrder;
    switch (sort) {
      case 'top':
        sortOrder = desc(posts.stakedValue);
        break;
      case 'hot':
        sortOrder = desc(posts.createdAt); // Simplified hot sort
        break;
      default:
        sortOrder = desc(posts.createdAt); // Default to newest
    }
    return sortOrder;
  }

  private calculateEngagementScore(reactions: number, tips: number, comments: number): number {
    // Simple weighted scoring algorithm
    return (reactions * 1) + (tips * 2) + (comments * 3);
  }

  private calculateEngagementRate(reactions: number, tips: number, shares: number): number {
    // Simple engagement rate calculation
    return reactions + tips + shares;
  }

  private calculateViralityScore(shares: number, reactions: number, ageInHours: number): number {
    // Simple virality score calculation
    const totalInteractions = shares + reactions;
    return totalInteractions / Math.max(ageInHours, 1);
  }

  private calculateContentQualityScore(tipAmount: number, reactionCount: number, viewCount: number): number {
    // Simple quality score calculation
    return (tipAmount * 0.5) + (reactionCount * 0.3) + (viewCount * 0.2);
  }

  private calculatePopularityRank(engagementRate: number, viralityScore: number, qualityScore: number): number {
    // Simple popularity rank calculation
    return (engagementRate * 0.4) + (viralityScore * 0.3) + (qualityScore * 0.3);
  }

  private calculateEngagementGrowth(posts: any[], timeRange: string): number {
    // Simple engagement growth calculation
    if (posts.length === 0) return 0;
    
    // Calculate average engagement per time unit
    const totalEngagement = posts.reduce((sum, post) => sum + parseFloat(post.stakedValue || '0'), 0);
    return totalEngagement / posts.length;
  }

  private async updateEngagementScore(postId: string) {
    try {
      // This would update the post's engagement score in the database
      // Implementation depends on your specific requirements
      safeLogger.info('Updating engagement score for post:', postId);
    } catch (error) {
      safeLogger.error('Error updating engagement score:', error);
    }
  }
}