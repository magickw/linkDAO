import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { CreatePostInput, UpdatePostInput } from '../models/Post';
import { APIError, NotFoundError } from '../middleware/errorHandler';

const postService = new PostService();

export class PostController {
  async createPost(req: Request, res: Response): Promise<Response> {
    try {
      const input: CreatePostInput = req.body;
      const post = await postService.createPost(input);
      return res.status(201).json(post);
    } catch (error: any) {
      throw new APIError(400, error.message);
    }
  }

  async getPostById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const post = await postService.getPostById(id);
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      return res.json(post);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { author } = req.params;
      const posts = await postService.getPostsByAuthor(author);
      return res.json(posts);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      const posts = await postService.getPostsByTag(tag);
      return res.json(posts);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async updatePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const input: UpdatePostInput = req.body;
      const post = await postService.updatePost(id, input);
      if (!post) {
        throw new NotFoundError('Post not found');
      }
      return res.json(post);
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async deletePost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const deleted = await postService.deletePost(id);
      if (!deleted) {
        throw new NotFoundError('Post not found');
      }
      return res.status(204).send();
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, error.message);
    }
  }

  async getAllPosts(req: Request, res: Response): Promise<Response> {
    try {
      const posts = await postService.getAllPosts();
      return res.json(posts);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }

  async getFeed(req: Request, res: Response): Promise<Response> {
    try {
      // In a real implementation, we would get the user from authentication
      const forUser = req.query.forUser as string | undefined;
      const posts = await postService.getFeed(forUser);
      return res.json(posts);
    } catch (error: any) {
      throw new APIError(500, error.message);
    }
  }
}