import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { CreatePostInput } from '../models/Post';

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
      
      return res.status(204).send();
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete post'
      });
    }
  }
}