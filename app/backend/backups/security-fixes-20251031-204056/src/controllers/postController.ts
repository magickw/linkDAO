import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { PostService } from '../services/postService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { CreatePostInput, UpdatePostInput } from '../models/Post';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AppError, NotFoundError } from '../middleware/errorHandler';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

const postService = new PostService();

export class PostController {
  async createPost(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreatePostInput = req.body;
      
      if (!input.author || !input.content) {
        return res.status(400).json({ error: 'Author and content are required' });
      }
      
      const post = await postService.createPost(input);
      return res.status(201).json(post);
    } catch (error: any) {
      safeLogger.error('Error in createPost controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPostById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      // Validate ID parameter
      if (!id || id.trim() === '') {
        return res.status(400).json({ error: 'Post ID is required' });
      }
      
      const post = await postService.getPostById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.json(post);
    } catch (error: any) {
      safeLogger.error('Error in getPostById controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { author } = req.params;
      
      if (!author || author.trim() === '') {
        return res.status(400).json({ error: 'Author address is required' });
      }
      
      const posts = await postService.getPostsByAuthor(author);
      return res.json(posts);
    } catch (error: any) {
      safeLogger.error('Error in getPostsByAuthor controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      
      if (!tag || tag.trim() === '') {
        return res.status(400).json({ error: 'Tag is required' });
      }
      
      const posts = await postService.getPostsByTag(tag);
      return res.json(posts);
    } catch (error: any) {
      safeLogger.error('Error in getPostsByTag controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async updatePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdatePostInput = req.body;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ error: 'Post ID is required' });
      }
      
      const post = await postService.updatePost(id, input);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.json(post);
    } catch (error: any) {
      safeLogger.error('Error in updatePost controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async deletePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      if (!id || id.trim() === '') {
        return res.status(400).json({ error: 'Post ID is required' });
      }
      
      const deleted = await postService.deletePost(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Post not found' });
      }
      return res.status(204).send();
    } catch (error: any) {
      safeLogger.error('Error in deletePost controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getAllPosts(req: Request, res: Response): Promise<Response> {
    try {
      const posts = await postService.getAllPosts();
      return res.json(posts);
    } catch (error: any) {
      safeLogger.error('Error in getAllPosts controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }

  async getFeed(req: Request, res: Response): Promise<Response> {
    try {
      // In a real implementation, we would get the user from authentication
      const forUser = req.query.forUser as string | undefined;
      
      if (!forUser || forUser.trim() === '') {
        return res.status(400).json({ error: 'User address is required' });
      }
      
      const posts = await postService.getFeed(forUser);
      return res.json(posts);
    } catch (error: any) {
      safeLogger.error('Error in getFeed controller:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
}