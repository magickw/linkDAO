import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { StatusService } from '../services/statusService';
import { MetadataService } from '../services/metadataService';
import { UserProfileService } from '../services/userProfileService';
import { CreatePostInput } from '../models/Post';
import { db } from '../db';
import { posts, users, statuses } from '../db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

// Remove in-memory storage
// let posts: any[] = [];
// let nextId = 1;

export class PostController {
  private postService: PostService;
  private statusService: StatusService;
  private metadataService: MetadataService;
  private userProfileService: UserProfileService;

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
    try {
      console.log('POST /api/posts/repost - Creating repost - v2 fix (UUID resolution)');

      const { originalPostId, message, author, media } = req.body;

      if (!originalPostId) {
        return res.status(400).json({
          success: false,
          error: 'Original post ID is required'
        });
      }

      if (!author) {
        return res.status(400).json({
          success: false,
          error: 'Author is required'
        });
      }

      // Resolve author to User UUID
      let user = await this.userProfileService.getProfileByAddress(author);
      if (!user) {
        // Create user if they don't exist
        const uniqueHandle = `user_${author.substring(0, 8)}_${Date.now()}`;
        user = await this.userProfileService.createProfile({
          walletAddress: author,
          handle: uniqueHandle,
          ens: '',
          avatarCid: '',
          bioCid: ''
        });
      }

      // Log initial request
      console.log('📝 [REPOST] Request:', { originalPostId, author });

      // Check if original post is a Status
      const originalStatus = await this.statusService.getStatus(originalPostId);

      // FLATTEN REPOSTS: If the target is itself a repost, find the original source
      let targetPostId = originalPostId;
      if (originalStatus && originalStatus.isRepost && originalStatus.parentId) {
        console.log('🔄 [REPOST] Target is already a repost. Flattening chain to point to original:', originalStatus.parentId);
        targetPostId = originalStatus.parentId;
      }

      // DUPLICATE CHECK: Check if user has already reposted this specific content
      const existingRepost = await db.select()
        .from(statuses) // We only care about statuses table for feed reposts
        .where(and(
          eq(statuses.authorId, user.id),
          eq(statuses.parentId, targetPostId),
          eq(statuses.isRepost, true)
        ))
        .limit(1);

      if (existingRepost.length > 0) {
        console.log('⚠️ [REPOST] Duplicate prevented. User has already reposted:', targetPostId);
        return res.status(400).json({
          success: false,
          error: 'You have already reposted this.'
        });
      }

      if (!originalStatus) {
        // If not found in Statuses, check if it's a Community Post (to give specific error)
        const originalCommunityPost = await this.postService.getPostById(originalPostId);

        if (originalCommunityPost) {
          return res.status(400).json({
            success: false,
            error: 'Community posts cannot be reposted. Only Statuses can be reposted.'
          });
        }

        return res.status(404).json({
          success: false,
          error: 'Original post not found'
        });
      }

      // Create repost using StatusService (store in statuses table)
      // This ensures it shows up in Home Feed / User Profile correctly, and NOT in Community Feed

      // Calculate content CID
      const repostContent = message || '';
      let contentCid = 'pending_ipfs_upload';

      try {
        contentCid = await this.metadataService.uploadToIPFS(repostContent);
      } catch (ipfsError) {
        console.warn('Failed to upload repost content to IPFS, using fallback CID:', ipfsError);
        // Fallback to a deterministic but fake CID if upload fails to allow post creation
        contentCid = `fallback-${Date.now()}-${Math.random().toString(36).substring(7)}`;
      }

      const newRepost = await this.statusService.createStatus({
        authorId: user.id, // Use the resolved UUID, not the wallet address
        content: repostContent,
        contentCid: contentCid,
        parentId: targetPostId, // Use the flattened target ID
        tags: originalStatus.tags || undefined,
        isRepost: true
      });

      console.log('Repost created:', newRepost.id);

      return res.status(201).json({
        success: true,
        data: {
          ...newRepost,
          originalPost: originalStatus,
          isRepost: true
        }
      });
    } catch (error: any) {
      console.error('Error creating repost:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create repost'
      });
    }
  }

  async sharePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params; // Original post ID
      const { targetCommunityId, author } = req.body;

      if (!targetCommunityId) {
        return res.status(400).json({
          success: false,
          error: 'Target community ID is required'
        });
      }

      if (!author) {
        return res.status(400).json({
          success: false,
          error: 'Author address is required'
        });
      }

      const post = await this.postService.sharePostToCommunity(id, targetCommunityId, author);

      return res.status(201).json({
        success: true,
        data: post
      });
    } catch (error: any) {
      console.error('Error sharing post:', error);
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