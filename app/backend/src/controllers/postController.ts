import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { CreatePostInput } from '../models/Post';
import { db } from '../db';
import { posts, users } from '../db/schema';
import { eq, and, sql, isNotNull } from 'drizzle-orm';

// Remove in-memory storage
// let posts: any[] = [];
// let nextId = 1;

export class PostController {
  private postService: PostService;

  constructor() {
    this.postService = new PostService();
  }

  async createPost(req: Request, res: Response): Promise<Response> {
    try {
      console.log('POST /api/posts - Creating post');

      const { content, author, type = 'text', visibility = 'public', tags, media, parentId, onchainRef } = req.body;

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
        onchainRef
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
      const post = await this.postService.getPostById(id);

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
      console.log('POST /api/posts/repost - Creating repost');

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

      // Get the original post
      const originalPost = await this.postService.getPostById(originalPostId);

      if (!originalPost) {
        return res.status(404).json({
          success: false,
          error: 'Original post not found'
        });
      }

      // Create repost content - combine message with reference to original
      let repostContent = message ? `${message}\n\n` : '';
      repostContent += `Reposted from @${originalPost.author} (${originalPostId})`;

      // Create the repost as a new post with reference to original
      const postInput: CreatePostInput = {
        author,
        content: message || '', // User's custom message is the main content
        tags: originalPost.tags || [],
        media: media || [], // User's own added media
        parentId: originalPostId, // Link to original post
        onchainRef: originalPost.onchainRef,
        isRepost: true
      };

      const repost = await this.postService.createPost(postInput);

      console.log('Repost created:', repost.id);

      return res.status(201).json({
        success: true,
        data: {
          ...repost,
          originalPost: originalPost,
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

  async deletePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deleted = await this.postService.deletePost(id);

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

      // Find and delete the repost (post with parentId = originalPostId and authorId = user.id)
      const deleted = await db.delete(posts)
        .where(and(
          eq(posts.parentId, originalPostId),
          eq(posts.authorId, user[0].id),
          eq(posts.isRepost, true)
        ))
        .returning();

      if (deleted.length === 0) {
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