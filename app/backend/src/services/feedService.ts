import { db } from '../db';
import { safeLogger } from '../utils/safeLogger';
import { posts, quickPosts, reactions, quickPostReactions, tips, quickPostTips, users, postTags, quickPostTags, views, quickPostViews, bookmarks, quickPostBookmarks, shares, quickPostShares, follows, comments, communityMembers, communities } from '../db/schema';
import { eq, desc, and, or, inArray, sql, gt, isNull, isNotNull, asc } from 'drizzle-orm';
import { trendingCacheService } from './trendingCacheService';
import { getWebSocketService } from './webSocketService';
import { MetadataService } from './metadataService';
import { generateShareId } from '../utils/shareIdGenerator';

interface FeedOptions {
  userAddress: string;
  page: number;
  limit: number;
  sort: string;
  communities: string[];
  timeRange: string;
  feedSource?: 'following' | 'all'; // New field for following feed
  preferredCategories?: string[]; // User's preferred categories from onboarding
  preferredTags?: string[]; // User's preferred tags from onboarding
  postTypeFilter?: 'quickPosts' | 'posts' | 'all'; // Filter by post table: quickPosts for quick posts, posts for community posts
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
    console.log('[FEED SERVICE] getEnhancedFeed called with options:', JSON.stringify(options));

    // Default to all feed and newest posts if not specified
    const {
      userAddress,
      page,
      limit,
      sort = 'new', // Default to newest
      communities: filterCommunities,
      timeRange = 'all', // Default to all time
      feedSource = 'all', // Default to all feed to ensure users see their own posts
      preferredCategories = [],
      preferredTags = [],
      postTypeFilter = 'all' // Default to both quick posts and community posts
    } = options;

    console.log('[FEED SERVICE] Parsed options:', { userAddress, page, limit, sort, filterCommunities, timeRange, feedSource });

    const offset = (page - 1) * limit;

    // Build time range filters for both tables
    const timeFilter = this.buildTimeFilter(timeRange, posts);
    const quickPostTimeFilter = this.buildTimeFilter(timeRange, quickPosts);

    // Build community filter - check both dao and communityId fields
    let communityFilter = sql`1=1`;
    if (filterCommunities.length > 0) {
      communityFilter = or(
        inArray(posts.dao, filterCommunities),
        inArray(posts.communityId, filterCommunities)
      );
    }

    // Build preference filter for categories and tags
    let preferenceFilter = sql`1=1`;
    if (preferredCategories.length > 0 || preferredTags.length > 0) {
      const categoryConditions = preferredCategories.length > 0
        ? sql`EXISTS (
            SELECT 1 FROM ${communities} 
            WHERE (${communities.id} = ${posts.communityId} OR ${communities.id} = ${posts.dao})
            AND ${communities.category} = ANY(${preferredCategories})
          )`
        : sql`1=1`;

      const tagConditions = preferredTags.length > 0
        ? sql`${posts.tags} && ${preferredTags}` // Check if posts tags array contains any preferred tags
        : sql`1=1`;

      // Combine preference filters - show posts that match either preferred categories OR tags
      if (preferredCategories.length > 0 && preferredTags.length > 0) {
        preferenceFilter = or(categoryConditions, tagConditions);
      } else {
        preferenceFilter = and(categoryConditions, tagConditions);
      }
    }

    // Declare user variable in outer scope so it's accessible to later queries
    let user: any[] = [];

    // Build following filter if feedSource is 'following'
    let followingFilter = sql`1=1`;
    let quickPostFollowingFilter = sql`1=1`; // Separate filter for quick posts
    if (feedSource === 'following' && userAddress) {
      // FIXED: Use transaction to prevent connection leaks
      const normalizedAddress = userAddress.toLowerCase();

      console.log('🔍 [BACKEND FEED] Building following filter for user:', normalizedAddress);

      // Single transaction for user lookup and following list
      const [userData, followingList] = await db.transaction(async (tx) => {
        const userResult = await tx.select({ id: users.id })
          .from(users)
          .where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`)
          .limit(1);

        let followingResult = [];
        if (userResult.length > 0) {
          followingResult = await tx.select({ followingId: follows.followingId })
            .from(follows)
            .where(eq(follows.followerId, userResult[0].id));
        }

        return [userResult, followingResult];
      });

      user = userData;
      console.log('🔍 [BACKEND FEED] User lookup result:', user);

      if (user.length > 0) {
        const userId = user[0].id;
        console.log('✅ [BACKEND FEED] Found user ID:', userId);

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

        // Always include user's own posts in the filter
        // If user follows no one (only themselves in the list), show ALL posts 
        // This ensures new users have content to engage with
        if (followingIds.length === 1 && followingIds[0] === userId) {
          console.log('📋 [BACKEND FEED] User follows nobody - showing all posts for better onboarding experience');
          followingFilter = sql`1=1`;
          quickPostFollowingFilter = sql`1=1`;
        } else {
          // Filter posts to show from followed users AND ensure user's own posts are included
          followingFilter = or(
            inArray(posts.authorId, followingIds),
            eq(posts.authorId, userId)  // Always include user's own posts
          );
          quickPostFollowingFilter = or(
            inArray(quickPosts.authorId, followingIds),
            eq(quickPosts.authorId, userId)  // Always include user's own quick posts
          );
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

      console.log('🔍 [DEBUG] About to execute posts query...');
      console.log('🔍 [DEBUG] followingFilter type:', typeof followingFilter);
      console.log('🔍 [DEBUG] finalFollowingFilter will be:', feedSource === 'following' && userAddress && user && user.length > 0 ? 'OR with user posts' : 'standard filter');

      // Use the following filter as-is since it already includes user's own posts
      const finalFollowingFilter = followingFilter;

      console.log('🔍 [DEBUG] Executing posts query NOW...');

      // Initialize arrays for different post types
      let regularPosts: any[] = [];
      let quickPostsResults: any[] = [];

      // Only fetch regular posts (community posts) if postTypeFilter is 'posts' or 'all'
      if (postTypeFilter === 'posts' || postTypeFilter === 'all') {
        regularPosts = await db
          .select({
            id: posts.id,
            authorId: posts.authorId,
            dao: posts.dao,
            title: posts.title,
            content: sql<string>`COALESCE(${posts.content}, '')`, // Ensure content is always a string
            contentCid: posts.contentCid,
            shareId: posts.shareId, // Include shareId for share URLs
            mediaCids: posts.mediaCids,
            tags: posts.tags,
            communityId: posts.communityId, // Add communityId field
            createdAt: posts.createdAt,
            stakedValue: posts.stakedValue,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
            // Moderation fields
            moderationStatus: posts.moderationStatus,
            moderationWarning: posts.moderationWarning,
            riskScore: posts.riskScore,
            isQuickPost: sql`false`, // Mark as regular post
            isRepost: posts.isRepost,
            parentId: posts.parentId
          })
          .from(posts)
          .leftJoin(users, eq(posts.authorId, users.id))
          .where(and(
            timeFilter,
            communityFilter,
            preferenceFilter, // Add preference filter
            finalFollowingFilter,
            moderationFilter, // Add moderation filter
            or(isNull(posts.parentId), eq(posts.isRepost, true)), // Show top-level posts OR reposts
            // Always include all posts (both community and non-community) when no specific communities are filtered
            // When specific communities are filtered, only show posts from those communities
            filterCommunities.length > 0 ? sql`1=1` : sql`1=1`
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
      }

      // Only fetch quick posts if postTypeFilter is 'quickPosts' or 'all'
      if (postTypeFilter === 'quickPosts' || postTypeFilter === 'all') {
        console.log('🔍 [BACKEND FEED] Executing quick posts query with filters:', {
          timeFilter: timeFilter.toString(),
          quickPostFollowingFilter: quickPostFollowingFilter.toString()
        });

        // Use the quick post following filter as-is since it already includes user's own quick posts
        const finalQuickPostFollowingFilter = quickPostFollowingFilter;

        quickPostsResults = await db
          .select({
            id: quickPosts.id,
            authorId: quickPosts.authorId,
            dao: sql<string>`NULL`, // Quick posts don't have DAO
            content: sql<string>`COALESCE(${quickPosts.content}, '')`, // Ensure content is always a string
            contentCid: quickPosts.contentCid,
            shareId: quickPosts.shareId, // Include shareId for share URLs
            mediaCids: quickPosts.mediaCids,
            tags: quickPosts.tags,
            createdAt: quickPosts.createdAt,
            stakedValue: quickPosts.stakedValue,
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
            // Moderation fields
            moderationStatus: quickPosts.moderationStatus,
            moderationWarning: quickPosts.moderationWarning,
            riskScore: quickPosts.riskScore,
            isQuickPost: sql`true`, // Mark as quick post
            isRepost: quickPosts.isRepost,
            parentId: quickPosts.parentId
          })
          .from(quickPosts)
          .leftJoin(users, eq(quickPosts.authorId, users.id))
          .where(and(
            quickPostTimeFilter, // Use quickPostTimeFilter instead of timeFilter
            finalQuickPostFollowingFilter, // Use the correct filter for quick posts
            sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`, // Quick post moderation filter
            or(isNull(quickPosts.parentId), eq(quickPosts.isRepost, true)) // Show top-level quick posts OR reposts
          ))

        console.log('📊 [BACKEND FEED] Quick posts query result:', {
          count: quickPostsResults.length,
          repostsCount: quickPostsResults.filter(p => p.isRepost).length,
          samplePost: quickPostsResults[0] ? {
            id: quickPostsResults[0].id,
            authorId: quickPostsResults[0].authorId,
            walletAddress: quickPostsResults[0].walletAddress,
            contentCid: quickPostsResults[0].contentCid,
            isRepost: quickPostsResults[0].isRepost,
            parentId: quickPostsResults[0].parentId
          } : null,
          sampleRepost: quickPostsResults.find(p => p.isRepost) ? {
            id: quickPostsResults.find(p => p.isRepost)!.id,
            isRepost: quickPostsResults.find(p => p.isRepost)!.isRepost,
            parentId: quickPostsResults.find(p => p.isRepost)!.parentId,
            content: quickPostsResults.find(p => p.isRepost)!.content
          } : null
        });
      }

      // Combine posts based on postTypeFilter
      let allPosts = postTypeFilter === 'quickPosts' ? quickPostsResults :
        postTypeFilter === 'posts' ? regularPosts :
          [...regularPosts, ...quickPostsResults];

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
          return parseFloat(b.stakedValue || '0') - parseFloat(a.stakedValue || '0');
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

      // PERFORMANCE OPTIMIZATION: Batch fetch engagement metrics to avoid N+1 queries
      // Instead of 5 queries per post, we do 10 total queries (5 for regular, 5 for quick posts)

      // 1. Separate posts by type AND collect originalPost IDs for canonical engagement
      const regularPostIds = paginatedPosts.filter(p => typeof p.id === 'string').map(p => p.id);
      const quickPostIds = paginatedPosts.filter(p => typeof p.id === 'string').map(p => p.id as string);

      // CANONICAL ENGAGEMENT: Collect originalPost IDs from reposts
      // This ensures we fetch engagement stats for quoted posts in the same bulk query
      const originalPostIdsFromReposts = paginatedPosts
        .filter(p => p.isRepost && p.parentId)
        .map(p => p.parentId as string);

      // Add originalPost IDs to the appropriate arrays (they could be either regular or quick posts)
      // We'll add them to both arrays and let the queries filter appropriately
      const allRegularPostIds = [...new Set([...regularPostIds, ...originalPostIdsFromReposts])];
      const allQuickPostIds = [...new Set([...quickPostIds, ...originalPostIdsFromReposts])];

      console.log('🔍 [BACKEND FEED] Batching engagement queries for:', {
        regularPosts: regularPostIds.length,
        quickPosts: quickPostIds.length,
        originalPostsFromReposts: originalPostIdsFromReposts.length,
        totalRegularWithOriginals: allRegularPostIds.length,
        totalQuickWithOriginals: allQuickPostIds.length,
        total: paginatedPosts.length
      });

      // 2. Batch fetch all metrics with GROUP BY (11 queries total instead of 5*N)
      const [
        regularReactionsData,
        quickReactionsData,
        regularTipsCountData,
        quickTipsCountData,
        regularTipsTotalData,
        quickTipsTotalData,
        regularCommentsData,
        quickCommentsData,
        regularViewsData,
        quickViewsData,
        userRepostsData,
        originalPostsData,
        originalQuickPostsData
      ] = await Promise.all([
        // Regular post reactions
        allRegularPostIds.length > 0
          ? db.select({
            postId: reactions.postId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(reactions)
            .where(inArray(reactions.postId, allRegularPostIds))
            .groupBy(reactions.postId)
          : Promise.resolve([]),

        // Quick post reactions
        allQuickPostIds.length > 0
          ? db.select({
            postId: quickPostReactions.quickPostId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(quickPostReactions)
            .where(inArray(quickPostReactions.quickPostId, allQuickPostIds))
            .groupBy(quickPostReactions.quickPostId)
          : Promise.resolve([]),

        // Regular post tips count
        allRegularPostIds.length > 0
          ? db.select({
            postId: tips.postId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(tips)
            .where(inArray(tips.postId, allRegularPostIds))
            .groupBy(tips.postId)
          : Promise.resolve([]),

        // Quick post tips count
        allQuickPostIds.length > 0
          ? db.select({
            postId: quickPostTips.quickPostId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(quickPostTips)
            .where(inArray(quickPostTips.quickPostId, allQuickPostIds))
            .groupBy(quickPostTips.quickPostId)
          : Promise.resolve([]),

        // Regular post tips total
        regularPostIds.length > 0
          ? db.select({
            postId: tips.postId,
            total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
          })
            .from(tips)
            .where(inArray(tips.postId, allRegularPostIds))
            .groupBy(tips.postId)
          : Promise.resolve([]),

        // Quick post tips total
        quickPostIds.length > 0
          ? db.select({
            postId: quickPostTips.quickPostId,
            total: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
          })
            .from(quickPostTips)
            .where(inArray(quickPostTips.quickPostId, allQuickPostIds))
            .groupBy(quickPostTips.quickPostId)
          : Promise.resolve([]),

        // Regular post comments
        allRegularPostIds.length > 0
          ? db.select({
            postId: comments.postId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(comments)
            .where(and(
              inArray(comments.postId, allRegularPostIds),
              sql`(${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked')`
            ))
            .groupBy(comments.postId)
          : Promise.resolve([]),

        // Quick post comments
        allQuickPostIds.length > 0
          ? db.select({
            postId: comments.quickPostId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(comments)
            .where(and(
              inArray(comments.quickPostId, allQuickPostIds),
              sql`(${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked')`
            ))
            .groupBy(comments.quickPostId)
          : Promise.resolve([]),

        // Regular post views
        regularPostIds.length > 0
          ? db.select({
            postId: views.postId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(views)
            .where(inArray(views.postId, allRegularPostIds))
            .groupBy(views.postId)
          : Promise.resolve([]),

        // Quick post views
        quickPostIds.length > 0
          ? db.select({
            postId: quickPostViews.quickPostId,
            count: sql<number>`COUNT(*)::int`
          })
            .from(quickPostViews)
            .where(inArray(quickPostViews.quickPostId, allQuickPostIds))
            .groupBy(quickPostViews.quickPostId)
          : Promise.resolve([]),

        // User Reposts Check
        userAddress && (regularPostIds.length > 0 || quickPostIds.length > 0)
          ? db.select({
            parentId: quickPosts.parentId
          })
            .from(quickPosts)
            .where(and(
              eq(quickPosts.authorId, sql`(SELECT id FROM users WHERE LOWER(wallet_address) = LOWER(${userAddress}) LIMIT 1)`),
              isNotNull(quickPosts.parentId),
              eq(quickPosts.isRepost, true),
              or(
                regularPostIds.length > 0 ? inArray(quickPosts.parentId, regularPostIds) : sql`1=0`,
                quickPostIds.length > 0 ? inArray(quickPosts.parentId, quickPostIds) : sql`1=0`
              )
            ))
          : Promise.resolve([]),

        // 12. Fetch original regular posts
        paginatedPosts.filter(p => p.parentId && p.isRepost).length > 0
          ? db.select({
            id: posts.id,
            authorId: posts.authorId,
            content: posts.content,
            contentCid: posts.contentCid,
            title: posts.title,
            mediaCids: posts.mediaCids,
            tags: posts.tags,
            createdAt: posts.createdAt,
            upvotes: posts.upvotes,
            downvotes: posts.downvotes,

            shareId: posts.shareId, // Include shareId
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
            isQuickPost: sql`false`
          })
            .from(posts)
            .leftJoin(users, eq(posts.authorId, users.id))
            .where(inArray(posts.id, paginatedPosts.filter(p => p.parentId && p.isRepost).map(p => p.parentId as string)))
          : Promise.resolve([]),

        // 13. Fetch original quick posts
        paginatedPosts.filter(p => p.parentId && p.isRepost).length > 0
          ? db.select({
            id: quickPosts.id,
            authorId: quickPosts.authorId,
            content: quickPosts.content,
            contentCid: quickPosts.contentCid,
            mediaCids: quickPosts.mediaCids,
            tags: quickPosts.tags,
            createdAt: quickPosts.createdAt,
            upvotes: quickPosts.upvotes,
            downvotes: quickPosts.downvotes,

            shareId: quickPosts.shareId, // Include shareId
            walletAddress: users.walletAddress,
            handle: users.handle,
            displayName: users.displayName,
            profileCid: users.profileCid,
            avatarCid: users.avatarCid,
            isQuickPost: sql`true`
          })
            .from(quickPosts)
            .leftJoin(users, eq(quickPosts.authorId, users.id))
            .where(inArray(quickPosts.id, paginatedPosts.filter(p => p.parentId && p.isRepost).map(p => p.parentId as string)))
          : Promise.resolve([])
      ]);

      // 3. Build lookup maps for O(1) access
      const reactionMap = new Map<number | string, number>();
      const tipCountMap = new Map<number | string, number>();
      const tipTotalMap = new Map<number | string, number>();
      const commentMap = new Map<number | string, number>();
      const viewMap = new Map<number | string, number>();
      const repostedSet = new Set<string>();

      // Populate maps with regular post data
      regularReactionsData.forEach(r => reactionMap.set(r.postId, Number(r.count)));
      regularTipsCountData.forEach(t => tipCountMap.set(t.postId, Number(t.count)));
      regularTipsTotalData.forEach(t => tipTotalMap.set(t.postId, Number(t.total)));
      regularCommentsData.forEach(c => commentMap.set(c.postId, Number(c.count)));
      regularViewsData.forEach(v => viewMap.set(v.postId, Number(v.count)));

      // Populate maps with quick post data
      quickReactionsData.forEach(r => reactionMap.set(r.postId, Number(r.count)));
      quickTipsCountData.forEach(t => tipCountMap.set(t.postId, Number(t.count)));
      quickTipsTotalData.forEach(t => tipTotalMap.set(t.postId, Number(t.total)));
      quickCommentsData.forEach(c => commentMap.set(c.postId, Number(c.count)));
      quickViewsData.forEach(v => viewMap.set(v.postId, Number(v.count)));

      // Populate reposted set
      (userRepostsData as any[]).forEach(r => {
        if (r.parentId) repostedSet.add(r.parentId);
      });

      // Populate original posts map
      const originalPostsMap = new Map<string, any>();
      (originalPostsData as any[]).forEach(p => originalPostsMap.set(p.id, p));
      (originalQuickPostsData as any[]).forEach(p => originalPostsMap.set(p.id, p));

      console.log('📊 [BACKEND FEED] Engagement metrics fetched:', {
        reactions: reactionMap.size,
        tips: tipCountMap.size,
        comments: commentMap.size,
        views: viewMap.size
      });

      // 4. Attach metrics to posts using map lookups (O(1) per post)
      const postsWithMetrics = await Promise.all(paginatedPosts.map(async post => {
        // Lazily generate shareId if missing
        let shareId = post.shareId;
        if (!shareId) {
          shareId = generateShareId();
          // Determine table based on post type
          const table = post.isQuickPost ? quickPosts : posts;
          await db.update(table).set({ shareId }).where(eq(table.id, post.id));
        }

        const reactionCount = Number(reactionMap.get(post.id) || 0);
        const tipCount = Number(tipCountMap.get(post.id) || 0);
        const totalTipAmount = Number(tipTotalMap.get(post.id) || 0);
        const commentCount = Number(commentMap.get(post.id) || 0);
        const viewCount = Number(viewMap.get(post.id) || 0);

        const isRepostedByMe = repostedSet.has(post.id);
        const rawOriginalPost = post.isRepost && post.parentId ? originalPostsMap.get(post.parentId) : null;
        let originalPost = null;

        if (rawOriginalPost) {
          // CANONICAL ENGAGEMENT: Reuse engagement stats from maps (already fetched in bulk)
          // This ensures one post = one engagement state, shared across all contexts
          const originalCommentCount = Number(commentMap.get(rawOriginalPost.id) || 0);
          const originalReactionCount = Number(reactionMap.get(rawOriginalPost.id) || 0);
          const originalViewCount = Number(viewMap.get(rawOriginalPost.id) || 0);

          console.log('🔍 [BACKEND FEED] Original post engagement lookup:', {
            originalPostId: rawOriginalPost.id,
            isQuickPost: rawOriginalPost.isQuickPost,
            commentMapSize: commentMap.size,
            reactionMapSize: reactionMap.size,
            viewMapSize: viewMap.size,
            commentCount: originalCommentCount,
            reactionCount: originalReactionCount,
            viewCount: originalViewCount,
            commentMapKeys: Array.from(commentMap.keys()),
            reactionMapKeys: Array.from(reactionMap.keys())
          });

          // Count reposts of the original post (shares)
          // Note: This counts how many times THIS post has been reposted
          // Check both posts and quickPosts tables for reposts
          let originalShareCount = 0;

          if (rawOriginalPost.isQuickPost) {
            // Original is a quick post, check quickPosts for reposts
            const [quickPostReposts] = await db
              .select({ count: sql<number>`count(*)` })
              .from(quickPosts)
              .where(and(
                eq(quickPosts.parentId, rawOriginalPost.id),
                eq(quickPosts.isRepost, true)
              ));
            originalShareCount = Number(quickPostReposts?.count) || 0;
          } else {
            // Original is a regular post, check posts for reposts
            const [postReposts] = await db
              .select({ count: sql<number>`count(*)` })
              .from(posts)
              .where(and(
                eq(posts.parentId, rawOriginalPost.id),
                eq(posts.isRepost, true)
              ));
            originalShareCount = Number(postReposts?.count) || 0;
          }

          console.log('🔍 [BACKEND FEED] Original post repost count:', {
            originalPostId: rawOriginalPost.id,
            isQuickPost: rawOriginalPost.isQuickPost,
            shareCount: originalShareCount
          });

          // Transform raw DB result into expected frontend structure
          originalPost = {
            ...rawOriginalPost,
            // Parse JSON fields
            mediaCids: typeof rawOriginalPost.mediaCids === 'string' ? JSON.parse(rawOriginalPost.mediaCids || '[]') : (rawOriginalPost.mediaCids || []),
            tags: typeof rawOriginalPost.tags === 'string' ? JSON.parse(rawOriginalPost.tags || '[]') : (rawOriginalPost.tags || []),
            // Construct authorProfile
            authorProfile: {
              handle: rawOriginalPost.handle || 'anonymous',
              avatar: rawOriginalPost.avatarCid ? `https://gateway.pinata.cloud/ipfs/${rawOriginalPost.avatarCid}` : undefined,
              walletAddress: rawOriginalPost.walletAddress,
              displayName: rawOriginalPost.displayName,
              // Default reputation fields (could be fetched if needed)
              reputationScore: 0,
              reputationTier: 'Beginner',
              votingPower: 0,
              xpBadges: [],
              totalContributions: 0,
              memberSince: rawOriginalPost.createdAt
            },
            // Defaults for missing metrics on the original post (to avoid crashes)
            reactions: [],
            previews: [],
            hashtags: [],
            mentions: [],
            // Use canonical engagement counts from maps (O(1) lookup)
            comments: originalCommentCount,
            shares: Number(originalShareCount) || 0,
            views: originalViewCount,
            reactionCount: originalReactionCount,
            // Use actual upvotes/downvotes from database
            upvotes: Number(rawOriginalPost.upvotes) || 0,
            downvotes: Number(rawOriginalPost.downvotes) || 0
          };

          // Lazily generate shareId for original post if missing
          if (!originalPost.shareId) {
            const newShareId = generateShareId();
            // Determine table based on rawOriginalPost flag, defaulting to posts if undefined
            const table = rawOriginalPost.isQuickPost ? quickPosts : posts;
            await db.update(table).set({ shareId: newShareId }).where(eq(table.id, rawOriginalPost.id));
            originalPost.shareId = newShareId;
          }
        }

        const score = this.calculateEngagementScore(
          reactionCount,
          tipCount,
          commentCount
        );

        return {
          ...post,
          shareId, // Ensure we return the generated one
          reactionCount,
          tipCount,
          totalTipAmount,
          commentCount,
          viewCount,
          isRepostedByMe,
          originalPost,
          engagementScore: score
        };
      }));

      // Get total count for pagination based on postTypeFilter
      let totalCount = 0;

      if (postTypeFilter === 'posts' || postTypeFilter === 'all') {
        const totalRegularCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(posts)
          .where(and(
            timeFilter,
            communityFilter,
            finalFollowingFilter,
            moderationFilter, // Include moderation filter in count
            or(isNull(posts.parentId), eq(posts.isRepost, true)), // Count top-level posts OR reposts
            // Always include all posts (both community and non-community) when no specific communities are filtered
            filterCommunities.length > 0 ? sql`1=1` : sql`1=1`
          ));
        totalCount += (totalRegularCount[0]?.count || 0);
      }

      if (postTypeFilter === 'quickPosts' || postTypeFilter === 'all') {
        // Use the quick post following filter as-is since it already includes user's own quick posts
        const finalQuickPostFollowingFilter = quickPostFollowingFilter;

        const totalQuickCount = await db
          .select({ count: sql<number>`COUNT(*)` })
          .from(quickPosts)
          .where(and(
            quickPostTimeFilter,
            finalQuickPostFollowingFilter, // Use the correct filter for quick posts
            sql`${quickPosts.moderationStatus} IS NULL OR ${quickPosts.moderationStatus} != 'blocked'`, // Quick post moderation filter
            or(isNull(quickPosts.parentId), eq(quickPosts.isRepost, true)) // Count top-level posts OR reposts
          ));
        totalCount += (totalQuickCount[0]?.count || 0);
      }

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
      console.error('[FEED ERROR] Full error details:', error);
      if (error instanceof Error) {
        console.error('[FEED ERROR] Error message:', error.message);
        console.error('[FEED ERROR] Error stack:', error.stack);
      }
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
          await trendingCacheService.setTrendingScores(timeRange, enrichedPosts);
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

      // Upload content to IPFS to get CID
      let contentCid: string;
      try {
        const metadataService = new MetadataService();
        contentCid = await metadataService.uploadToIPFS(content);
        safeLogger.info('Content uploaded to IPFS with CID:', contentCid);
      } catch (uploadError) {
        safeLogger.error('Error uploading content to IPFS:', uploadError);
        // Generate fallback CID if upload fails
        const crypto = require('crypto');
        const hash = crypto.createHash('sha256').update(content).digest('hex');
        contentCid = `Qm${hash.substring(0, 44)}`;
        safeLogger.warn(`IPFS upload failed, using fallback CID: ${contentCid}`);
      }

      // PERMISSION CHECK: If posting to a community, verify user is a member or creator
      if (communityId) {
        safeLogger.info(`Checking community membership for user ${userId} in community ${communityId}`);

        // Check if user is a member of the community
        const membershipCheck = await db
          .select({
            role: communityMembers.role,
            isActive: communityMembers.isActive
          })
          .from(communityMembers)
          .where(and(
            eq(communityMembers.communityId, communityId),
            eq(communityMembers.userAddress, normalizedAddress)
          ))
          .limit(1);

        // Also check if user is the community creator
        const communityCheck = await db
          .select({
            creatorAddress: communities.creatorAddress,
            isPublic: communities.isPublic
          })
          .from(communities)
          .where(eq(communities.id, communityId))
          .limit(1);

        if (communityCheck.length === 0) {
          safeLogger.error(`Community not found: ${communityId}`);
          throw new Error('Community not found');
        }

        const community = communityCheck[0];
        const isCreator = community.creatorAddress?.toLowerCase() === normalizedAddress;
        const isMember = membershipCheck.length > 0 && membershipCheck[0].isActive;

        safeLogger.info(`Permission check results:`, {
          userId,
          communityId,
          isCreator,
          isMember,
          membershipExists: membershipCheck.length > 0,
          membershipActive: membershipCheck[0]?.isActive,
          memberRole: membershipCheck[0]?.role
        });

        // Allow posting if user is creator OR an active member
        if (!isCreator && !isMember) {
          safeLogger.warn(`User ${userId} (${normalizedAddress}) attempted to post in community ${communityId} without membership`);
          throw new Error('You must be a member of this community to post');
        }

        safeLogger.info(`✅ Permission granted for user ${userId} to post in community ${communityId} (isCreator: ${isCreator}, isMember: ${isMember})`);
      }

      // Create the post - store both content and CID
      const newPost = await db
        .insert(posts)
        .values({
          authorId: userId,
          content: content, // Store actual content as fallback
          contentCid: contentCid, // Store CID (may be fallback)
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
          tag: tag.toLowerCase(),
          postId: newPost[0].id,
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
          eq(posts.id, postId),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return null;
      }

      // Prepare update data
      const updateData: any = {};
      if (content !== undefined) {
        // Upload to IPFS and store both content and CID
        let contentCid: string;
        try {
          const metadataService = new MetadataService();
          contentCid = await metadataService.uploadToIPFS(content);
          safeLogger.info('Content uploaded to IPFS with CID:', contentCid);
        } catch (uploadError) {
          safeLogger.error('Error uploading content to IPFS:', uploadError);
          // Generate fallback CID if upload fails
          const crypto = require('crypto');
          const hash = crypto.createHash('sha256').update(content).digest('hex');
          contentCid = `Qm${hash.substring(0, 44)}`;
          safeLogger.warn(`IPFS upload failed, using fallback CID: ${contentCid}`);
        }
        updateData.content = content; // Store actual content as fallback
        updateData.contentCid = contentCid; // Store CID (may be fallback)
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
          eq(posts.id, postId),
          eq(posts.authorId, user[0].id)
        ))
        .returning();

      // Update tags if provided
      if (tags !== undefined) {
        // Delete existing tags
        await db.delete(postTags).where(eq(postTags.postId, postId));

        // Insert new tags
        if (tags && tags.length > 0) {
          const tagInserts = tags.map(tag => ({
            tag: tag.toLowerCase(),
            postId: postId,
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
          eq(posts.id, postId),
          eq(posts.authorId, user[0].id)
        ))
        .limit(1);

      if (existingPost.length === 0) {
        return false;
      }

      // Delete the post
      await db.delete(posts).where(eq(posts.id, postId));

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

      // Check if post exists in posts table (regular post) or quickPosts table
      // Both tables now use UUID, so we need to check which table contains the post
      let postExists = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      let isQuickPost = false;

      if (postExists.length === 0) {
        // Check if it's a quick post
        const quickPostExists = await db.select().from(quickPosts).where(eq(quickPosts.id, postId)).limit(1);
        if (quickPostExists.length === 0) {
          throw new Error('Post not found');
        }
        isQuickPost = true;
      }

      let reaction;

      if (isQuickPost) {
        // Handle quick post reaction
        const existingReaction = await db
          .select()
          .from(quickPostReactions)
          .where(and(
            eq(quickPostReactions.quickPostId, postId),
            eq(quickPostReactions.userId, user[0].id)
          ))
          .limit(1);

        if (existingReaction.length > 0) {
          // Update existing reaction
          reaction = await db
            .update(quickPostReactions)
            .set({
              type,
              amount: tokenAmount.toString()
            })
            .where(and(
              eq(quickPostReactions.quickPostId, postId),
              eq(quickPostReactions.userId, user[0].id)
            ))
            .returning();
        } else {
          // Create new reaction
          reaction = await db
            .insert(quickPostReactions)
            .values({
              quickPostId: postId,
              userId: user[0].id,
              type,
              amount: tokenAmount.toString(),
              createdAt: new Date()
            })
            .returning();
        }
      } else {
        // Handle regular post reaction
        const existingReaction = await db
          .select()
          .from(reactions)
          .where(and(
            eq(reactions.postId, postId),
            eq(reactions.userId, user[0].id)
          ))
          .limit(1);

        if (existingReaction.length > 0) {
          // Update existing reaction
          reaction = await db
            .update(reactions)
            .set({
              type,
              amount: tokenAmount.toString()
            })
            .where(and(
              eq(reactions.postId, postId),
              eq(reactions.userId, user[0].id)
            ))
            .returning();
        } else {
          // Create new reaction
          reaction = await db
            .insert(reactions)
            .values({
              postId: postId,
              userId: user[0].id,
              type,
              amount: tokenAmount.toString(),
              createdAt: new Date()
            })
            .returning();
        }
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
      // FIXED: Use transaction to prevent connection leaks
      const normalizedAddress = fromAddress.toLowerCase();

      const [fromUser, post] = await db.transaction(async (tx) => {
        const userResult = await tx.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
        if (userResult.length === 0) {
          throw new Error('From user not found');
        }

        const postResult = await tx.select().from(posts).where(eq(posts.id, postId)).limit(1);
        if (postResult.length === 0) {
          throw new Error('Post not found');
        }

        return [userResult, postResult];
      });

      const tip = await db
        .insert(tips)
        .values({
          postId: postId,
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

  // Get post by ID
  async getPostById(postId: string) {
    try {
      // Check if postId is an integer (regular post) or UUID (quick post)
      const isIntegerId = /^\d+$/.test(postId);

      if (isIntegerId) {
        // Regular post

        const post = await db
          .select({
            id: posts.id,
            authorId: posts.authorId,
            content: posts.content,
            createdAt: posts.createdAt,
            updatedAt: posts.updatedAt,
            dao: posts.dao,
            mediaUrls: posts.mediaUrls,
            tags: posts.tags,
            stakedValue: posts.stakedValue
          })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1);

        if (post.length === 0) {
          return null;
        }

        // Get author details
        const author = await db
          .select({
            id: users.id,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(eq(users.id, post[0].authorId))
          .limit(1);

        return {
          ...post[0],
          author: author.length > 0 ? {
            id: author[0].id,
            address: author[0].walletAddress
          } : null
        };
      } else {
        // Quick post
        const post = await db
          .select({
            id: quickPosts.id,
            authorId: quickPosts.authorId,
            content: quickPosts.content,
            createdAt: quickPosts.createdAt,
            updatedAt: quickPosts.updatedAt,
            mediaCids: quickPosts.mediaCids,
            tags: quickPosts.tags
          })
          .from(quickPosts)
          .where(eq(quickPosts.id, postId))
          .limit(1);

        if (post.length === 0) {
          return null;
        }

        // Get author details
        const author = await db
          .select({
            id: users.id,
            walletAddress: users.walletAddress
          })
          .from(users)
          .where(eq(users.id, post[0].authorId))
          .limit(1);

        return {
          ...post[0],
          author: author.length > 0 ? {
            id: author[0].id,
            address: author[0].walletAddress
          } : null
        };
      }
    } catch (error) {
      safeLogger.error('Error getting post by ID:', error);
      throw new Error('Failed to retrieve post');
    }
  }

  // Get engagement data for post
  async getEngagementData(postId: string) {
    try {


      // Get post basic info
      const post = await db
        .select({
          id: posts.id,
          stakedValue: posts.stakedValue,
          createdAt: posts.createdAt
        })
        .from(posts)
        .where(eq(posts.id, postId))
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
          .where(eq(reactions.postId, postId)),

        db.select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`COALESCE(SUM(CAST(amount AS DECIMAL)), 0)`
        })
          .from(tips)
          .where(eq(tips.postId, postId)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
          .from(comments)
          .where(and(
            eq(comments.postId, postId),
            sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
          )),

        db.select({
          count: sql<number>`COUNT(*)`
        })
          .from(views)
          .where(eq(views.postId, postId)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
          .from(bookmarks)
          .where(eq(bookmarks.postId, postId)),

        db.select({
          count: sql<number>`COUNT(*)`
        })
          .from(shares)
          .where(eq(shares.postId, postId))
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
          Number(reactionData[0]?.count || 0),
          Number(tipData[0]?.count || 0),
          Number(commentData[0]?.count || 0)
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


      // Verify post exists
      const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
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
        postId: postId,
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
      // Check if postId is an integer (regular post) or UUID (quick post)
      const isIntegerId = /^\d+$/.test(postId);

      const conditions = [
        isNull(comments.parentCommentId),
        sql`${comments.moderationStatus} IS NULL OR ${comments.moderationStatus} != 'blocked'`
      ];

      if (isIntegerId) {
        conditions.push(eq(comments.postId, postId));
      } else {
        conditions.push(eq(comments.quickPostId, postId));
      }

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
          quickPostId: comments.quickPostId,
          authorId: comments.authorId,
          content: comments.content,
          upvotes: comments.upvotes,
          downvotes: comments.downvotes,
          createdAt: comments.createdAt,
          updatedAt: comments.updatedAt,
          parentCommentId: comments.parentCommentId,
          walletAddress: users.walletAddress,
          handle: users.handle,
          displayName: users.displayName,
          avatarCid: users.avatarCid
        })
        .from(comments)
        .leftJoin(users, eq(comments.authorId, users.id))
        .where(and(...conditions))
        .orderBy(orderByClause)
        .limit(limit)
        .offset(offset);

      // Get total count for pagination
      const totalCountResult = await db
        .select({ count: sql<number>`COUNT(*)` })
        .from(comments)
        .where(and(...conditions));

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
      safeLogger.info('Adding comment:', { postId, userAddress, contentLength: content?.length });

      // Get user ID - use case-insensitive matching
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        safeLogger.error('User not found for address:', normalizedAddress);
        throw new Error('User not found');
      }

      // Check if postId is an integer (regular post), UUID (quick post), or shareId (community post)
      const isIntegerId = /^\d+$/.test(postId);
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(postId);
      safeLogger.info('Post ID type check:', { postId, isIntegerId, isUUID });

      // Validate parentCommentId if provided
      if (parentCommentId) {
        const parentComment = await db.select().from(comments).where(eq(comments.id, parentCommentId)).limit(1);
        if (parentComment.length === 0) {
          safeLogger.error('Parent comment not found for ID:', parentCommentId);
          throw new Error('Parent comment not found');
        }
      }

      const commentValues: any = {
        authorId: user[0].id,
        content,
        parentCommentId: parentCommentId || null, // Explicitly set to null for top-level comments
        createdAt: new Date(),
        updatedAt: new Date()
      };

      let postFound = false;

      if (isIntegerId) {
        // Verify post exists by integer ID
        const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
        if (post.length === 0) {
          safeLogger.error('Post not found for ID:', postId);
          throw new Error('Post not found');
        }
        commentValues.postId = postId;
        commentValues.quickPostId = null;
        postFound = true;
      } else if (isUUID) {
        // Check if it's a quick post ID or a shareId
        // First try quick posts
        const quickPost = await db.select().from(quickPosts).where(eq(quickPosts.id, postId)).limit(1);
        if (quickPost.length > 0) {
          commentValues.quickPostId = postId;
          commentValues.postId = null;
          postFound = true;
        } else {
          // Try finding by shareId in posts table
          const post = await db.select().from(posts).where(eq(posts.shareId, postId)).limit(1);
          if (post.length > 0) {
            commentValues.postId = post[0].id;
            commentValues.quickPostId = null;
            postFound = true;
          }
        }

        if (!postFound) {
          safeLogger.error('Post not found for UUID ID:', postId);
          throw new Error('Post not found');
        }
      } else {
        // Try to find by shareId for any other format
        const post = await db.select().from(posts).where(eq(posts.shareId, postId)).limit(1);
        if (post.length > 0) {
          commentValues.postId = post[0].id;
          commentValues.quickPostId = null;
          postFound = true;
        } else {
          safeLogger.error('Post not found for shareId:', postId);
          throw new Error('Post not found');
        }
      }

      safeLogger.info('Inserting comment with values:', commentValues);

      // Handle potential database schema issues
      let comment;
      try {
        comment = await db
          .insert(comments)
          .values(commentValues)
          .returning();
      } catch (dbError) {
        safeLogger.error('Database error inserting comment:', dbError);

        // If it's a column error, try with minimal required fields
        if (dbError.message && dbError.message.includes('column')) {
          safeLogger.warn('Attempting insert with minimal fields due to schema mismatch');
          const minimalCommentValues = {
            authorId: commentValues.authorId,
            content: commentValues.content,
          };

          // Add postId or quickPostId if they exist
          if ('postId' in commentValues && commentValues.postId !== null) {
            (minimalCommentValues as any).postId = commentValues.postId;
          }
          if ('quickPostId' in commentValues && commentValues.quickPostId !== null) {
            (minimalCommentValues as any).quickPostId = commentValues.quickPostId;
          }

          comment = await db
            .insert(comments)
            .values(minimalCommentValues)
            .returning();
        } else {
          throw dbError;
        }
      }

      safeLogger.info('Comment inserted successfully:', comment[0]?.id);

      // Update post engagement score
      await this.updateEngagementScore(postId);

      // Return enriched comment with author info
      return {
        ...comment[0],
        walletAddress: user[0].walletAddress,
        handle: user[0].handle,
        displayName: user[0].displayName,
        avatarCid: user[0].avatarCid
      };
    } catch (error: any) {
      safeLogger.error('Error adding comment:', error);
      throw new Error(`Failed to add comment: ${error.message}`);
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
        .where(eq(reactions.postId, postId))
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
        .where(eq(tips.postId, postId))
        .orderBy(desc(tips.createdAt));

      // Get users that follow the post author
      const post = await db.select({ authorId: posts.authorId }).from(posts).where(eq(posts.id, postId)).limit(1);
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


      // Get comprehensive engagement data
      const [postData, reactionData, tipData, shareData] = await Promise.all([
        db.select({
          id: posts.id,
          createdAt: posts.createdAt,
          stakedValue: posts.stakedValue,
          tags: posts.tags
        })
          .from(posts)
          .where(eq(posts.id, postId))
          .limit(1),

        db.select({
          type: reactions.type,
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(amount AS DECIMAL))`
        })
          .from(reactions)
          .where(eq(reactions.postId, postId))
          .groupBy(reactions.type),

        db.select({
          count: sql<number>`COUNT(*)`,
          totalAmount: sql<number>`SUM(CAST(amount AS DECIMAL))`,
          avgAmount: sql<number>`AVG(CAST(amount AS DECIMAL))`
        })
          .from(tips)
          .where(eq(tips.postId, postId)),

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
      const qualityScore = this.calculateQualityScore(
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
          handle: users.handle,
          displayName: users.displayName,
          avatarCid: users.avatarCid
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
        .where(eq(reactions.postId, postId))
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


      // Verify post exists
      const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
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
        postId: postId,
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
      // Get user
      const normalizedAddress = userAddress.toLowerCase();
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${normalizedAddress})`).limit(1);
      if (user.length === 0) {
        throw new Error('User not found');
      }

      // Check if postId is an integer (regular post) or UUID (quick post)
      const isIntegerId = /^\d+$/.test(postId);

      let result;

      if (isIntegerId) {
        // Regular post bookmark logic


        // Check if bookmark already exists
        const existingBookmark = await db
          .select()
          .from(bookmarks)
          .where(and(
            eq(bookmarks.postId, postId),
            eq(bookmarks.userId, user[0].id)
          ))
          .limit(1);

        if (existingBookmark.length > 0) {
          // Remove bookmark
          await db.delete(bookmarks).where(and(
            eq(bookmarks.postId, postId),
            eq(bookmarks.userId, user[0].id)
          ));
          result = { bookmarked: false };
        } else {
          // Add bookmark
          await db.insert(bookmarks).values({
            postId: postId,
            userId: user[0].id,
            createdAt: new Date()
          });
          result = { bookmarked: true };
        }
      } else {
        // Quick post bookmark logic
        // Check if bookmark already exists
        const existingBookmark = await db
          .select()
          .from(quickPostBookmarks)
          .where(and(
            eq(quickPostBookmarks.quickPostId, postId),
            eq(quickPostBookmarks.userId, user[0].id)
          ))
          .limit(1);

        if (existingBookmark.length > 0) {
          // Remove bookmark
          await db.delete(quickPostBookmarks).where(and(
            eq(quickPostBookmarks.quickPostId, postId),
            eq(quickPostBookmarks.userId, user[0].id)
          ));
          result = { bookmarked: false };
        } else {
          // Add bookmark
          await db.insert(quickPostBookmarks).values({
            quickPostId: postId,
            userId: user[0].id,
            createdAt: new Date()
          });
          result = { bookmarked: true };
        }
      }

      return result;
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      throw new Error('Failed to toggle bookmark');
    }
  }

  // Helper methods
  private buildTimeFilter(timeRange: string, table: any = posts) {
    let timeFilter;
    switch (timeRange) {
      case 'hour':
        timeFilter = sql`${table.createdAt} > NOW() - INTERVAL '1 hour'`;
        break;
      case 'day':
        timeFilter = sql`${table.createdAt} > NOW() - INTERVAL '1 day'`;
        break;
      case 'week':
        timeFilter = sql`${table.createdAt} > NOW() - INTERVAL '1 week'`;
        break;
      case 'month':
        timeFilter = sql`${table.createdAt} > NOW() - INTERVAL '1 month'`;
        break;
      case 'year':
        timeFilter = sql`${table.createdAt} > NOW() - INTERVAL '1 year'`;
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

  private calculateViralityScore(shares: number, comments: number, timeSinceCreation: number): number {
    // Simple virality score calculation
    return (shares * 0.5) + (comments * 0.3) + (timeSinceCreation * 0.2);
  }

  private calculateQualityScore(tipAmount: number, reactionCount: number, viewCount: number): number {
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

  // Upvote post
  async upvotePost(data: { postId: string; userAddress: string }) {
    try {
      const { postId, userAddress } = data;

      // Check if postId is an integer (regular post) or UUID (quick post)
      const isIntegerId = /^\d+$/.test(postId);

      if (isIntegerId) {
        // It's a regular post
        const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

        if (post.length === 0) {
          throw new Error('Post not found');
        }

        // Get current post data and increment upvotes
        const [updatedPost] = await db.update(posts)
          .set({ upvotes: sql`${posts.upvotes} + 1` })
          .where(eq(posts.id, postId))
          .returning();

        return {
          success: true,
          message: 'Post upvoted successfully',
          upvotes: updatedPost.upvotes,
          downvotes: updatedPost.downvotes
        };
      } else {
        // It's a quick post
        const quickPost = await db.select().from(quickPosts).where(eq(quickPosts.id, postId)).limit(1);

        if (quickPost.length === 0) {
          throw new Error('Post not found');
        }

        // Get current quick post data and increment upvotes
        const [updatedQuickPost] = await db.update(quickPosts)
          .set({ upvotes: sql`${quickPosts.upvotes} + 1` })
          .where(eq(quickPosts.id, postId))
          .returning();

        return {
          success: true,
          message: 'Quick post upvoted successfully',
          upvotes: updatedQuickPost.upvotes,
          downvotes: updatedQuickPost.downvotes
        };
      }
    } catch (error) {
      safeLogger.error('Error upvoting post:', error);
      throw error;
    }
  }

  // Downvote post
  async downvotePost(data: { postId: string; userAddress: string }) {
    try {
      const { postId, userAddress } = data;

      // Check if postId is an integer (regular post) or UUID (quick post)
      const isIntegerId = /^\d+$/.test(postId);

      if (isIntegerId) {
        // It's a regular post
        const post = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);

        if (post.length === 0) {
          throw new Error('Post not found');
        }

        // Get current post data and increment downvotes
        const [updatedPost] = await db.update(posts)
          .set({ downvotes: sql`${posts.downvotes} + 1` })
          .where(eq(posts.id, postId))
          .returning();

        return {
          success: true,
          message: 'Post downvoted successfully',
          upvotes: updatedPost.upvotes,
          downvotes: updatedPost.downvotes
        };
      } else {
        // It's a quick post
        const quickPost = await db.select().from(quickPosts).where(eq(quickPosts.id, postId)).limit(1);

        if (quickPost.length === 0) {
          throw new Error('Post not found');
        }

        // Get current quick post data and increment downvotes
        const [updatedQuickPost] = await db.update(quickPosts)
          .set({ downvotes: sql`${quickPosts.downvotes} + 1` })
          .where(eq(quickPosts.id, postId))
          .returning();

        return {
          success: true,
          message: 'Quick post downvoted successfully',
          upvotes: updatedQuickPost.upvotes,
          downvotes: updatedQuickPost.downvotes
        };
      }
    } catch (error) {
      safeLogger.error('Error downvoting post:', error);
      throw error;
    }
  }

  // Get reaction summaries for a post
  async getReactionSummaries(postId: string) {
    try {
      // Check if post exists in posts table (regular post) or quickPosts table
      // Both tables now use UUID, so we need to check which table contains the post
      let postExists = await db.select().from(posts).where(eq(posts.id, postId)).limit(1);
      let isQuickPost = false;

      if (postExists.length === 0) {
        // Check if it's a quick post
        const quickPostExists = await db.select().from(quickPosts).where(eq(quickPosts.id, postId)).limit(1);
        if (quickPostExists.length === 0) {
          return [];
        }
        isQuickPost = true;
      }

      let summaries;

      if (isQuickPost) {
        // Handle quick post reactions
        summaries = await db
          .select({
            type: quickPostReactions.type,
            totalAmount: sql<number>`SUM(CAST(${quickPostReactions.amount} AS INTEGER))`.mapWith(Number),
            totalCount: sql<number>`COUNT(*)`.mapWith(Number),
            userAmount: sql<number>`SUM(CASE WHEN ${quickPostReactions.userId} IN (SELECT id FROM ${users} WHERE LOWER(${users.walletAddress}) = LOWER(${sql.placeholder('userAddress')})) THEN CAST(${quickPostReactions.amount} AS INTEGER) ELSE 0 END)`.mapWith(Number),
            topContributors: sql<any>`ARRAY_AGG(DISTINCT ${users.walletAddress} ORDER BY CAST(${quickPostReactions.amount} AS INTEGER) DESC LIMIT 5)`
          })
          .from(quickPostReactions)
          .leftJoin(users, eq(quickPostReactions.userId, users.id))
          .where(eq(quickPostReactions.quickPostId, postId))
          .groupBy(quickPostReactions.type);
      } else {
        // Handle regular post reactions
        summaries = await db
          .select({
            type: reactions.type,
            totalAmount: sql<number>`SUM(CAST(${reactions.amount} AS INTEGER))`.mapWith(Number),
            totalCount: sql<number>`COUNT(*)`.mapWith(Number),
            userAmount: sql<number>`SUM(CASE WHEN ${reactions.userId} IN (SELECT id FROM ${users} WHERE LOWER(${users.walletAddress}) = LOWER(${sql.placeholder('userAddress')})) THEN CAST(${reactions.amount} AS INTEGER) ELSE 0 END)`.mapWith(Number),
            topContributors: sql<any>`ARRAY_AGG(DISTINCT ${users.walletAddress} ORDER BY CAST(${reactions.amount} AS INTEGER) DESC LIMIT 5)`
          })
          .from(reactions)
          .leftJoin(users, eq(reactions.userId, users.id))
          .where(eq(reactions.postId, postId))
          .groupBy(reactions.type);
      }

      return summaries || [];
    } catch (error) {
      safeLogger.error('Error getting reaction summaries:', error);
      return [];
    }
  }
}

// Export singleton instance
export const feedService = new FeedService();