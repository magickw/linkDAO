import { Request, Response } from 'express';
import { QuickPostService } from '../services/quickPostService';
import { CreateQuickPostInput } from '../models/QuickPost';

export class QuickPostController {
  private quickPostService: QuickPostService;

  constructor() {
    this.quickPostService = new QuickPostService();
  }

  async createQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      console.log('POST /api/quick-posts - Creating quick post');
      
      const { contentCid, authorId, parentId, mediaCids, tags, onchainRef, isTokenGated, gatedContentPreview } = req.body;
      
      if (!contentCid || contentCid.trim() === '') {
        return res.status(400).json({
          success: false,
          error: 'Content CID is required'
        });
      }
      
      if (!authorId) {
        return res.status(400).json({
          success: false,
          error: 'Author ID is required'
        });
      }
      
      // Prepare input for QuickPostService
      const quickPostInput: CreateQuickPostInput = {
        authorId,
        contentCid,
        parentId,
        mediaCids,
        tags,
        onchainRef,
        isTokenGated,
        gatedContentPreview
      };
      
      // Create quick post using QuickPostService
      const quickPost = await this.quickPostService.createQuickPost(quickPostInput);
      
      console.log('Quick post created:', quickPost.id);
      
      return res.status(201).json({
        success: true,
        data: quickPost
      });
    } catch (error: any) {
      console.error('Error creating quick post:', error);
      return res.status(500).json({
        success: false,
        error: error.message || 'Failed to create quick post'
      });
    }
  }

  async getAllQuickPosts(req: Request, res: Response): Promise<Response> {
    try {
      const quickPosts = await this.quickPostService.getAllQuickPosts();
      
      return res.json({
        success: true,
        data: quickPosts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve quick posts'
      });
    }
  }

  async getQuickPostById(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const quickPost = await this.quickPostService.getQuickPostById(id);
      
      if (!quickPost) {
        return res.status(404).json({
          success: false,
          error: 'Quick post not found'
        });
      }
      
      return res.json({
        success: true,
        data: quickPost
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve quick post'
      });
    }
  }

  async getQuickPostFeed(req: Request, res: Response): Promise<Response> {
    try {
      const { forUser } = req.query;
      
      const quickPosts = await this.quickPostService.getQuickPostFeed(forUser ? String(forUser) : undefined);
      
      return res.json({
        success: true,
        data: quickPosts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve quick post feed'
      });
    }
  }

  async getQuickPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { authorId } = req.params;
      const quickPosts = await this.quickPostService.getQuickPostsByAuthor(authorId);
      
      return res.json({
        success: true,
        data: quickPosts
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve quick posts by author'
      });
    }
  }

  async getQuickPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      // For now, return empty array - tags for quick posts would need to be implemented
      return res.json({
        success: true,
        data: []
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to retrieve quick posts by tag'
      });
    }
  }

  async updateQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const updateData = req.body;
      
      const updatedQuickPost = await this.quickPostService.updateQuickPost(id, updateData);
      
      return res.json({
        success: true,
        data: updatedQuickPost
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to update quick post'
      });
    }
  }

  async deleteQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      await this.quickPostService.deleteQuickPost(id);
      
      return res.json({
        success: true,
        message: 'Quick post deleted successfully'
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        error: 'Failed to delete quick post'
      });
    }
  }
}