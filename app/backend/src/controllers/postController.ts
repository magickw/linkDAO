import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { PostService } from '../services/postService';
import { FallbackPostService } from '../services/fallbackPostService';
import { CreatePostInput, UpdatePostInput } from '../models/Post';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { databaseService } from '../services/databaseService';

const postService = new PostService();
const fallbackPostService = new FallbackPostService();

export class PostController {
  private async getActivePostService() {
    // TEMPORARY: Force fallback service for testing
    safeLogger.info('Using fallback service for testing');
    return fallbackPostService;
    
    // Original logic (commented out for testing)
    /*
    try {
      // Quick health check - check if database is connected
      if (!databaseService.isDatabaseConnected()) {
        throw new Error('Database not connected');
      }
      
      // Try a simple database operation instead of getAllPosts which might fail for other reasons
      await databaseService.query('SELECT 1 as test');
      return postService;
    } catch (error) {
      safeLogger.warn('Main post service unavailable, using fallback service:', error.message);
      return fallbackPostService;
    }
    */
  }

  async createPost(req: Request, res: Response): Promise<Response> {
    try {
      safeLogger.info('POST /api/posts - Request received:', { body: req.body });
      
      const input: CreatePostInput = req.body;
      
      if (!input.author || !input.content) {
        safeLogger.warn('POST /api/posts - Missing required fields:', { author: !!input.author, content: !!input.content });
        return res.status(400).json({ 
          success: false,
          error: 'Author and content are required',
          retryable: false
        });
      }
      
      safeLogger.info('POST /api/posts - Getting active service...');
      const activeService = await this.getActivePostService();
      
      safeLogger.info('POST /api/posts - Creating post with service:', activeService.constructor.name);
      const post = await activeService.createPost(input);
      
      safeLogger.info('POST /api/posts - Post created successfully:', { id: post.id });
      return res.status(201).json({
        success: true,
        data: post
      });
    } catch (error: any) {
      safeLogger.error('Error in createPost controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      
      // Enhanced error handling with retry guidance
      const isServiceUnavailable = error.message?.includes('database') || 
                                  error.message?.includes('connection') ||
                                  error.message?.includes('timeout') ||
                                  error.code === 'ECONNREFUSED';
      
      const isRateLimited = error.message?.includes('rate limit') ||
                           error.status === 429;
      
      if (isServiceUnavailable) {
        return res.status(503).json({ 
          success: false,
          error: 'Service temporarily unavailable. Please try again in a moment.',
          retryable: true,
          retryAfter: 30, // seconds
          errorCode: 'SERVICE_UNAVAILABLE'
        });
      }
      
      if (isRateLimited) {
        return res.status(429).json({ 
          success: false,
          error: 'Too many requests. Please wait before trying again.',
          retryable: true,
          retryAfter: 60, // seconds
          errorCode: 'RATE_LIMITED'
        });
      }
      
      return res.status(500).json({ 
        success: false,
        error: 'Failed to create post. Please try again.',
        retryable: true,
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }

  async getPostById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Post ID is required' 
        });
      }
      
      const activeService = await this.getActivePostService();
      const post = await activeService.getPostById(id);
      
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
      safeLogger.error('Error in getPostById controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve post' 
      });
    }
  }

  async getPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { author } = req.params;
      
      if (!author || author.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Author address is required' 
        });
      }
      
      const activeService = await this.getActivePostService();
      const posts = await activeService.getPostsByAuthor(author);
      
      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      safeLogger.error('Error in getPostsByAuthor controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve posts' 
      });
    }
  }

  async getPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      
      if (!tag || tag.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Tag is required' 
        });
      }
      
      const activeService = await this.getActivePostService();
      const posts = await activeService.getPostsByTag(tag);
      
      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      safeLogger.error('Error in getPostsByTag controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve posts' 
      });
    }
  }

  async updatePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdatePostInput = req.body;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Post ID is required' 
        });
      }
      
      const activeService = await this.getActivePostService();
      const post = await activeService.updatePost(id, input);
      
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
      safeLogger.error('Error in updatePost controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to update post' 
      });
    }
  }

  async deletePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ 
          success: false,
          error: 'Post ID is required' 
        });
      }
      
      const activeService = await this.getActivePostService();
      const deleted = await activeService.deletePost(id);
      
      if (!deleted) {
        return res.status(404).json({ 
          success: false,
          error: 'Post not found' 
        });
      }
      
      return res.status(204).send();
    } catch (error: any) {
      safeLogger.error('Error in deletePost controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to delete post' 
      });
    }
  }

  async getAllPosts(req: Request, res: Response): Promise<Response> {
    try {
      safeLogger.info('GET /api/posts - Request received');
      
      const activeService = await this.getActivePostService();
      safeLogger.info('GET /api/posts - Using service:', activeService.constructor.name);
      
      const posts = await activeService.getAllPosts();
      safeLogger.info('GET /api/posts - Retrieved posts:', posts.length);
      
      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      safeLogger.error('Error in getAllPosts controller:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve posts' 
      });
    }
  }

  async getFeed(req: Request, res: Response): Promise<Response> {
    try {
      const forUser = req.query.forUser as string | undefined;
      
      const activeService = await this.getActivePostService();
      const posts = await activeService.getFeed(forUser);
      
      return res.json({
        success: true,
        data: posts
      });
    } catch (error: any) {
      safeLogger.error('Error in getFeed controller:', error);
      return res.status(500).json({ 
        success: false,
        error: 'Failed to retrieve feed' 
      });
    }
  }
}