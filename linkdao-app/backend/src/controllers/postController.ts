import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { CreatePostInput, UpdatePostInput } from '../models/Post';

const postService = new PostService();

export class PostController {
  async createPost(req: Request, res: Response) {
    try {
      const input: CreatePostInput = req.body;
      const post = await postService.createPost(input);
      res.status(201).json(post);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  async getPostById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const post = await postService.getPostById(id);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPostsByAuthor(req: Request, res: Response) {
    try {
      const { author } = req.params;
      const posts = await postService.getPostsByAuthor(author);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getPostsByTag(req: Request, res: Response) {
    try {
      const { tag } = req.params;
      const posts = await postService.getPostsByTag(tag);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async updatePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const input: UpdatePostInput = req.body;
      const post = await postService.updatePost(id, input);
      if (!post) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.json(post);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async deletePost(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const deleted = await postService.deletePost(id);
      if (!deleted) {
        return res.status(404).json({ error: 'Post not found' });
      }
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getAllPosts(req: Request, res: Response) {
    try {
      const posts = await postService.getAllPosts();
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFeed(req: Request, res: Response) {
    try {
      // In a real implementation, we would get the user from authentication
      const forUser = req.query.forUser as string | undefined;
      const posts = await postService.getFeed(forUser);
      res.json(posts);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}