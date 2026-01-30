import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { StatusService } from '../services/statusService';
import { MetadataService } from '../services/metadataService';
import { UserProfileService } from '../services/userProfileService';
import { CreatePostInput } from '../models/Post';
import { db } from '../db';
import { posts, users, statuses } from '../db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';
import { databaseService } from '../services/databaseService';
import { enhancedNotificationService } from '../services/enhancedNotificationService';

// Remove in-memory storage
// let posts: any[] = [];
// let nextId = 1;

export class PostController {
  private postService: PostService;
  private statusService: StatusService;
  private metadataService: MetadataService;
  private userProfileService: UserProfileService;

  private get database() {
    return databaseService.getDatabase();
  }

  constructor() {
    this.postService = new PostService();
    this.statusService = new StatusService();
    this.metadataService = new MetadataService();
    this.userProfileService = new UserProfileService();
  }

  async createPost(req: Request, res: Response): Promise<Response> {
    try {
      console.log('POST /api/posts - Creating post');

      const { content, author, type = 'text', visibility = 'public', tags, media, parentId, onchainRef, shareToSocialMedia, communityIds, communityId } = req.body;

      if (!content || content.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Content is required'
        });
      }

      if (!author) {
        return res.status(400).json({
          success: false,
          error: 'Author is required'
        });
      }

      // Prepare input for PostService
      const postInput: CreatePostInput = {
        author,
        content,
        tags,
        media,
        parentId,
        onchainRef,
        shareToSocialMedia,
        communityId,
        communityIds
      };

      // Create post using PostService
      const post = await this.postService.createPost(postInput);

      console.log('Post created:', post.id);

      return res.status(201).json({
        success: true,
        data: post
      });
    } catch (error: any) {
      console.error('Error creating post:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create post'
      });
    }
  }

  async getAllPosts(req: Request, res: Response): Promise<Response> {
    try {
      const posts = await this.postService.getAllPosts();

      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      });
    }
  }

  async getPostById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = (req as any).user?.id;
      const post = await this.postService.getPostById(id, userId);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      return res.json({
        success: true,
        data: post
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve post'
      });
    }
  }

  async getPostByShareId(req: Request, res: Response): Promise<Response> {
    try {
      const { shareId } = req.params;
      const post = await this.postService.getPostByShareId(shareId);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      return res.json({
        success: true,
        data: post
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve post'
      });
    }
  }

  async viewPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      // Optional: get userId from auth middleware if available, or IP from request
      const userId = (req as any).user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const views = await this.postService.incrementView(id, userId, ipAddress);

      return res.json({
        success: true,
        data: { views }
      });
    } catch (error: any) {
      console.error('Error incrementing post view:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to record view'
      });
    }
  }

  async getFeed(req: Request, res: Response): Promise<Response> {
    try {
      const { forUser } = req.query;

      if (!forUser || typeof forUser !== 'string') {
        return res.status(400).json({
          success: false,
          error: 'forUser parameter is required'
        });
      }

      const posts = await this.postService.getFeed(forUser);

      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      console.error('Error getting feed:', error);
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve feed'
      });
    }
  }

  async getPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { author } = req.params;
      const posts = await this.postService.getPostsByAuthor(author);

      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      });
    }
  }

  async getPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      const posts = await this.postService.getPostsByTag(tag);

      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      });
    }
  }

  async getPostsByCommunity(req: Request, res: Response): Promise<Response> {
    try {
      const { communityId } = req.params;
      const posts = await this.postService.getPostsByCommunity(communityId);

      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve posts'
      });
    }
  }

  async updatePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { content, tags, media } = req.body;

      const updateInput = {
        content,
        tags,
        media
      };

      const post = await this.postService.updatePost(id, updateInput);

      if (!post) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      return res.json({
        success: true,
        data: post
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update post'
      });
    }
  }

  async repostPost(req: Request, res: Response): Promise<Response> {
    const repostStartTime = Date.now();
    console.log('🚀 [REPOST] === START repostPost method ===');

    try {
      console.log('📋 [REPOST] POST /api/posts/repost - Creating repost - v3 fix (enhanced logging)');

      const { originalPostId, message, author, media, location, gifUrl, replyRestriction } = req.body;
      console.log('📥 [REPOST] Request body received:', {
        originalPostId,
        author,
        hasMessage: !!message,
        hasMedia: media?.length > 0,
        hasLocation: !!location,
        hasGif: !!gifUrl,
        replyRestriction
      });

      if (!originalPostId) {
        console.log('⚠️ [REPOST] Missing originalPostId');
        return res.status(400).json({
          success: false,
          error: 'Original post ID is required'
        });
      }

      if (!author) {
        console.log('⚠️ [REPOST] Missing author');
        return res.status(400).json({
          success: false,
          error: 'Author is required'
        });
      }

      // UUID Validation for originalPostId
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(originalPostId)) {
        console.log('⚠️ [REPOST] Invalid UUID format for originalPostId:', originalPostId);
        return res.status(400).json({
          success: false,
          error: 'Invalid post ID format. Must be a valid UUID.'
        });
      }
      console.log('✅ [REPOST] UUID validation passed');

      // Resolve author to User UUID
      let user;
      console.log('👤 [REPOST] Resolving user profile for author:', author);
      const userResolveStart = Date.now();
      try {
        user = await this.userProfileService.getProfileByAddress(author);
        console.log(`⏱️ [REPOST] getProfileByAddress took ${Date.now() - userResolveStart}ms`);
        if (!user) {
          console.log('🔄 [REPOST] Creating new user profile for author:', author);
          // Create user if they don't exist
          const uniqueHandle = `user_${author.substring(0, 8)}_${Date.now()}`;
          const createUserStart = Date.now();
          user = await this.userProfileService.createProfile({
            walletAddress: author,
            handle: uniqueHandle,
            ens: '',
            avatarCid: '',
            bioCid: ''
          });
          console.log(`⏱️ [REPOST] createProfile took ${Date.now() - createUserStart}ms`);
        }
      } catch (userError: any) {
        console.error('❌ [REPOST] Error resolving user profile:', userError);
        console.error('❌ [REPOST] User error details:', {
          message: userError?.message,
          code: userError?.code,
          stack: userError?.stack?.substring(0, 500)
        });
        return res.status(500).json({
          success: false,
          error: `Failed to resolve user profile: ${userError?.message || JSON.stringify(userError)}`
        });
      }
      console.log('✅ [REPOST] User resolved:', { userId: user?.id, handle: user?.handle });

      // Log initial request
      console.log('📝 [REPOST] Request validated:', { originalPostId, author, userId: user.id });

      // Check if original post is a Status
      console.log('🔍 [REPOST] Checking if post exists in statuses table...');
      let originalStatus;
      const statusCheckStart = Date.now();
      try {
        originalStatus = await this.statusService.getStatus(originalPostId);
        console.log(`⏱️ [REPOST] getStatus took ${Date.now() - statusCheckStart}ms, found:`, !!originalStatus);
      } catch (statusError: any) {
        console.error('❌ [REPOST] Error checking status table:', statusError);
        console.error('❌ [REPOST] Status error details:', {
          message: statusError?.message,
          code: statusError?.code,
          detail: statusError?.detail,
          stack: statusError?.stack?.substring(0, 500)
        });
        // If it fails here, it might be because originalPostId is not a valid UUID in the DB's eyes
        return res.status(500).json({
          success: false,
          error: `Database error checking status: ${statusError?.message || JSON.stringify(statusError)}`
        });
      }

      // FLATTEN REPOSTS: If the target is itself a repost, find the original source
      let targetPostId = originalPostId;
      if (originalStatus && originalStatus.isRepost && originalStatus.parentId) {
        console.log('🔄 [REPOST] Target is already a repost. Flattening chain to point to original:', originalStatus.parentId);
        targetPostId = originalStatus.parentId;
      }
      console.log('🎯 [REPOST] Target post ID determined:', targetPostId);

      // DUPLICATE CHECK: Check if user has already reposted this specific content
      console.log('🔍 [REPOST] Checking for existing repost by user:', { userId: user.id, targetPostId });
      const duplicateCheckStart = Date.now();
      try {
        const existingRepost = await this.database.select()
          .from(statuses) // We only care about statuses table for feed reposts
          .where(and(
            eq(statuses.authorId, user.id),
            eq(statuses.parentId, targetPostId),
            eq(statuses.isRepost, true)
          ))
          .limit(1);

        console.log(`⏱️ [REPOST] Duplicate check took ${Date.now() - duplicateCheckStart}ms, results:`, existingRepost?.length || 0);

        if (existingRepost && existingRepost.length > 0) {
          console.log('⚠️ [REPOST] Duplicate prevented. User has already reposted:', targetPostId);
          return res.status(400).json({
            success: false,
            error: 'You have already reposted this.'
          });
        }
      } catch (dbError: any) {
        console.error('❌ [REPOST] Error checking for existing repost:', dbError);
        console.error('❌ [REPOST] DB Error details:', {
          message: dbError?.message,
          code: dbError?.code,
          detail: dbError?.detail,
          stack: dbError?.stack?.substring(0, 500)
        });
        // Continue anyway - if duplicate check fails, we can still create the repost
        // but log the warning for debugging
        console.warn('⚠️ [REPOST] Duplicate check failed, but proceeding with repost creation');
      }

      if (!originalStatus) {
        console.log('🔍 [REPOST] Post not found in statuses table, checking posts table:', originalPostId);
        // If not found in Statuses, check if it's a Community Post (to give specific error)
        let originalCommunityPost;
        try {
          originalCommunityPost = await this.postService.getPostById(originalPostId);
        } catch (postError: any) {
          console.error('❌ [REPOST] Error checking posts table:', postError);
          console.error('❌ [REPOST] Post error details:', {
            message: postError?.message,
            code: postError?.code,
            stack: postError?.stack?.substring(0, 500)
          });
          return res.status(500).json({
            success: false,
            error: `Database error checking community posts: ${postError?.message || JSON.stringify(postError)}`
          });
        }

        if (originalCommunityPost) {
          console.log('⚠️ [REPOST] Blocked community post reposting attempt:', originalPostId);
          return res.status(400).json({
            success: false,
            error: 'Community posts cannot be reposted. Only Statuses can be reposted.'
          });
        }

        console.log('❌ [REPOST] Original post not found in any table:', originalPostId);
        return res.status(404).json({
          success: false,
          error: 'Original post not found'
        });
      }
      console.log('✅ [REPOST] Original status validated, preparing repost content');

      // Create repost using StatusService (store in statuses table)
      // This ensures it shows up in Home Feed / User Profile correctly, and NOT in Community Feed

      // Calculate content CID
      const repostContent = message || '';
      let contentCid = 'pending_ipfs_upload';

      console.log('📤 [REPOST] Uploading repost content to IPFS...');
      const ipfsStart = Date.now();
      try {
        contentCid = await this.metadataService.uploadToIPFS(repostContent);
        console.log(`⏱️ [REPOST] IPFS upload took ${Date.now() - ipfsStart}ms, CID:`, contentCid);
      } catch (ipfsError) {
        console.warn('⚠️ [REPOST] Failed to upload repost content to IPFS, using fallback CID:', ipfsError);
        // Fallback to a deterministic but fake CID if upload fails to allow post creation
        contentCid = `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      console.log('🔨 [REPOST] Creating status entry with contentCid:', contentCid);
      const createStart = Date.now();
      try {
        const newRepost = await this.statusService.createStatus({
          authorId: user.id, // Use the resolved UUID, not the wallet address
          content: repostContent,
          contentCid: contentCid,
          parentId: targetPostId, // Use the flattened target ID
          tags: originalStatus.tags || undefined,
          isRepost: true,
          mediaUrls: media && media.length > 0 ? media : undefined,
          location: location || undefined
        });

        console.log(`⏱️ [REPOST] createStatus took ${Date.now() - createStart}ms, repost ID:`, newRepost.id);
        console.log('✅ [REPOST] Repost created successfully:', newRepost.id);

        // Send notification to the original post author
        try {
          if (originalStatus.authorId !== user.id) { // Don't notify if reposting own content
            const originalAuthor = await db
              .select({ walletAddress: users.walletAddress })
              .from(users)
              .where(eq(users.id, originalStatus.authorId))
              .limit(1);

            if (originalAuthor[0]) {
              await enhancedNotificationService.createSocialNotification({
                userId: originalAuthor[0].walletAddress,
                type: 'repost',
                priority: 'normal',
                title: 'Your post was reposted',
                message: `${user.displayName || user.handle || 'Someone'} reposted your content${message ? `: ${message.substring(0, 100)}` : ''}`,
                actionUrl: `/status/${newRepost.id}`,
                actorId: author,
                actorHandle: user.displayName || user.handle || author.substring(0, 10),
                actorAvatar: user.avatarUrl || undefined,
                postId: targetPostId,
                metadata: {
                  repostId: newRepost.id,
                  originalPostId: targetPostId
                }
              });
              console.log('[REPOST] Notification sent to original author');
            }
          }
        } catch (notifyError) {
          console.error('[REPOST] Failed to send notification:', notifyError);
          // Don't fail the repost if notification fails
        }

        console.log(`⏱️ [REPOST] === TOTAL TIME: ${Date.now() - repostStartTime}ms ===`);

        return res.status(201).json({
          success: true,
          data: {
            ...newRepost,
            originalPost: originalStatus,
            isRepost: true
          }
        });
      } catch (createError: any) {
        console.error('❌ [REPOST] Error creating status entry:', createError);
        console.error('❌ [REPOST] Error details:', {
          message: createError?.message,
          code: createError?.code,
          detail: createError?.detail,
          constructor: createError?.constructor?.name,
          stack: createError?.stack?.substring(0, 500)
        });
        return res.status(500).json({
          success: false,
          error: `Failed to create repost entry: ${createError?.message || JSON.stringify(createError)}`
        });
      }
    } catch (error: any) {
      console.error('❌ [REPOST] Global catch - Unexpected error creating repost:', error);
      console.error('❌ [REPOST] Global error details:', {
        message: error?.message,
        code: error?.code,
        detail: error?.detail,
        constructor: error?.constructor?.name,
        stack: error?.stack?.substring(0, 500)
      });
      console.log(`⏱️ [REPOST] === FAILED AFTER: ${Date.now() - repostStartTime}ms ===`);
      return res.status(500).json({
        success: false,
        error: error?.message || JSON.stringify(error) || 'Failed to create repost'
      });
    }
  }

  async sharePost(req: Request, res: Response): Promise<Response> {
    const shareStartTime = Date.now();
    console.log('🚀 [SHARE] === START sharePost method ===');
    
    try {
      const { id } = req.params; // Original post ID
      const { targetCommunityId, author } = req.body;

      console.log('📋 [SHARE] POST /api/posts/:id/share - Sharing post to community');
      console.log('📥 [SHARE] Request details:', { 
        originalPostId: id, 
        targetCommunityId, 
        author 
      });

      if (!id) {
        console.log('⚠️ [SHARE] Missing original post ID');
        return res.status(400).json({
          success: false,
          error: 'Original post ID is required'
        });
      }

      if (!targetCommunityId) {
        console.log('⚠️ [SHARE] Missing targetCommunityId');
        return res.status(400).json({
          success: false,
          error: 'Target community ID is required'
        });
      }

      if (!author) {
        console.log('⚠️ [SHARE] Missing author');
        return res.status(400).json({
          success: false,
          error: 'Author address is required'
        });
      }

      console.log(`🔄 [SHARE] Calling postService.sharePostToCommunity...`);
      const serviceStart = Date.now();
      
      const post = await this.postService.sharePostToCommunity(id, targetCommunityId, author);
      
      console.log(`✅ [SHARE] Post shared successfully. New Post ID: ${post.id}`);
      console.log(`⏱️ [SHARE] Service call took ${Date.now() - serviceStart}ms`);
      console.log(`⏱️ [SHARE] === TOTAL TIME: ${Date.now() - shareStartTime}ms ===`);

      return res.status(201).json({
        success: true,
        data: post
      });
    } catch (error: any) {
      console.error('❌ [SHARE] Error sharing post:', error);
      console.error('❌ [SHARE] Error details:', {
        message: error?.message,
        code: error?.code,
        stack: error?.stack?.substring(0, 500),
        raw: JSON.stringify(error)
      });
      console.log(`⏱️ [SHARE] === FAILED AFTER: ${Date.now() - shareStartTime}ms ===`);
      
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to share post'
      });
    }
  }

  async deletePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      // Try deleting from standard posts first
      let deleted = await this.postService.deletePost(id);

      // If not found in standard posts, try deleting from statuses
      if (!deleted) {
        deleted = await this.statusService.deleteStatus(id, ''); // Note: userAddress needed? Logic likely requires ID only for admin or uses context
      }

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Post not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete post'
      });
    }
  }

  async unrepostPost(req: Request, res: Response): Promise<Response> {
    try {
      const { originalPostId, author } = req.body;

      if (!originalPostId || !author) {
        return res.status(400).json({
          success: false,
          error: 'Original post ID and author are required'
        });
      }

      // Find the user's repost for this original post
      const user = await db.select().from(users).where(sql`LOWER(${users.walletAddress}) = LOWER(${author})`).limit(1);
      if (user.length === 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      // FLATTEN REPOSTS: Check if the target is itself a repost, find the original source
      // This mirrors the logic in repostPost ensures we delete the correct row
      let targetPostId = originalPostId;
      const targetStatus = await this.statusService.getStatus(originalPostId);
      if (targetStatus && targetStatus.isRepost && targetStatus.parentId) {
        console.log('🔄 [UNREPOST] Target is a repost. Flattening chain to point to original:', targetStatus.parentId);
        targetPostId = targetStatus.parentId;
      }

      // Direct DB deletion logic for both tables to be safe (handle legacy and new)


      // 1. Try deleting from statuses
      const deletedStatus = await db.delete(statuses)
        .where(and(
          eq(statuses.parentId, targetPostId),
          eq(statuses.authorId, user[0].id),
          eq(statuses.isRepost, true)
        ))
        .returning();

      // 2. Try deleting from posts (legacy)
      const deletedRegular = await db.delete(posts)
        .where(and(
          eq(posts.parentId, targetPostId),
          eq(posts.authorId, user[0].id),
          eq(posts.isRepost, true)
        ))
        .returning();

      if (deletedStatus.length === 0 && deletedRegular.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Repost not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Repost removed'
      });
    } catch (error: any) {
      console.error('Error unreposting:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to remove repost'
      });
    }
  }
}