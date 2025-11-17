import { Request, Response } from 'express';
import { QuickPostService } from '../services/quickPostService';
import { MetadataService } from '../services/metadataService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

export class QuickPostController {
  private quickPostService: QuickPostService;

  constructor() {
    this.quickPostService = new QuickPostService();
  }

  async createQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      console.log('POST /api/quick-posts - Creating quick post');
      
      const { content, authorId, parentId, media, tags, onchainRef, isTokenGated, gatedContentPreview } = req.body;
      
      if (!content || content.trim() === '') {
        return res.status(400).json(apiResponse.error('Content is required', 400));
      }
      
      if (!authorId) {
        return res.status(400).json(apiResponse.error('Author ID is required', 400));
      }
      
      // Upload content to IPFS to get CID
      let contentCid: string;
      try {
        const metadataService = new MetadataService();
        contentCid = await metadataService.uploadToIPFS(content);
        console.log('Content uploaded to IPFS with CID:', contentCid);
      } catch (uploadError) {
        safeLogger.error('Error uploading content to IPFS:', uploadError);
        return res.status(500).json(apiResponse.error('Failed to upload content to IPFS', 500));
      }
      
      // Prepare input for QuickPostService
      const quickPostInput = {
        authorId,
        contentCid,
        parentId,
        mediaCids: media ? JSON.stringify(media) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
        onchainRef,
        isTokenGated,
        gatedContentPreview
      };
      
      // Create quick post using QuickPostService
      const quickPost = await this.quickPostService.createQuickPost(quickPostInput);
      
      console.log('Quick post created:', quickPost.id);
      
      return res.status(201).json(apiResponse.success(quickPost, 'Quick post created successfully'));
    } catch (error: any) {
      console.error('Error creating quick post:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to create quick post', 500));
    }
  }

  async getQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const quickPost = await this.quickPostService.getQuickPost(id);
      
      if (!quickPost) {
        return res.status(404).json(apiResponse.error('Quick post not found', 404));
      }
      
      return res.json(apiResponse.success(quickPost, 'Quick post retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting quick post:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve quick post', 500));
    }
  }

  async updateQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { content, tags } = req.body;
      
      // Upload content to IPFS to get CID if content is provided
      let contentCid: string | undefined;
      if (content) {
        try {
          const metadataService = new MetadataService();
          contentCid = await metadataService.uploadToIPFS(content);
          console.log('Content uploaded to IPFS with CID:', contentCid);
        } catch (uploadError) {
          safeLogger.error('Error uploading content to IPFS:', uploadError);
          return res.status(500).json(apiResponse.error('Failed to upload content to IPFS', 500));
        }
      }
      
      const updateData = {
        contentCid,
        tags: tags ? JSON.stringify(tags) : undefined
      };
      
      const quickPost = await this.quickPostService.updateQuickPost(id, updateData);
      
      if (!quickPost) {
        return res.status(404).json(apiResponse.error('Quick post not found', 404));
      }
      
      return res.json(apiResponse.success(quickPost, 'Quick post updated successfully'));
    } catch (error: any) {
      console.error('Error updating quick post:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to update quick post', 500));
    }
  }

  async deleteQuickPost(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      
      const deleted = await this.quickPostService.deleteQuickPost(id);
      
      if (!deleted) {
        return res.status(404).json(apiResponse.error('Quick post not found', 404));
      }
      
      return res.json(apiResponse.success(null, 'Quick post deleted successfully'));
    } catch (error: any) {
      console.error('Error deleting quick post:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to delete quick post', 500));
    }
  }

  async getQuickPostsByAuthor(req: Request, res: Response): Promise<Response> {
    try {
      const { authorId } = req.params;
      const { page = 1, limit = 20 } = req.query;
      
      const quickPosts = await this.quickPostService.getQuickPostsByAuthor(
        authorId,
        parseInt(page as string),
        parseInt(limit as string)
      );
      
      return res.json(apiResponse.success(quickPosts, 'Quick posts retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting quick posts by author:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve quick posts', 500));
    }
  }

  async addQuickPostReaction(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { userId, type, amount } = req.body;
      
      const reaction = await this.quickPostService.addReaction(id, userId, type, amount);
      
      return res.status(201).json(apiResponse.success(reaction, 'Reaction added successfully'));
    } catch (error: any) {
      console.error('Error adding quick post reaction:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to add reaction', 500));
    }
  }

  async addQuickPostTip(req: Request, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { fromUserId, toUserId, token, amount, message } = req.body;
      
      const tip = await this.quickPostService.addTip(id, fromUserId, toUserId, token, amount, message);
      
      return res.status(201).json(apiResponse.success(tip, 'Tip added successfully'));
    } catch (error: any) {
      console.error('Error adding quick post tip:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to add tip', 500));
    }
  }
}