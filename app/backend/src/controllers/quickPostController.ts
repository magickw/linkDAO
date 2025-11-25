import { Request, Response } from 'express';
import crypto from 'crypto';
import { QuickPostService } from '../services/quickPostService';
import { MetadataService } from '../services/metadataService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

export class QuickPostController {
  private quickPostService: QuickPostService;

  constructor() {
    try {
      this.quickPostService = new QuickPostService();
    } catch (error) {
      console.error('Failed to initialize QuickPostService:', error);
      throw new Error(`QuickPostController initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

      // Generate a temporary CID immediately for quick response
      const tempCid = `temp_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;

      // Prepare input for QuickPostService with temp CID
      const quickPostInput = {
        authorId,
        contentCid: tempCid,
        content,  // Store the actual content in the database
        parentId,
        mediaCids: media ? JSON.stringify(media) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
        onchainRef,
        isTokenGated,
        gatedContentPreview
      };

      // Create quick post using QuickPostService (fast response)
      const quickPost = await this.quickPostService.createQuickPost(quickPostInput);

      console.log('Quick post created:', quickPost.id);

      // Upload content to IPFS in the background (non-blocking)
      // This allows the user to get immediate feedback
      setImmediate(async () => {
        try {
          const metadataService = new MetadataService();
          const contentCid = await metadataService.uploadToIPFS(content);
          console.log(`Background IPFS upload completed for post ${quickPost.id}: ${contentCid}`);

          // Update the post with the real IPFS CID
          await this.quickPostService.updateQuickPost(quickPost.id, { contentCid });
          console.log(`Updated post ${quickPost.id} with IPFS CID: ${contentCid}`);
        } catch (uploadError) {
          safeLogger.warn(`Background IPFS upload failed for post ${quickPost.id}:`, uploadError);
          // Content is still stored in the database, so the post is still accessible
        }
      });

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
          safeLogger.warn('Error uploading content to IPFS, using content as fallback:', uploadError);
          // Fallback: Use a mock CID for development/testing when IPFS fails
          contentCid = `mock_content_${Date.now()}_${Buffer.from(content).toString('base64').substring(0, 10)}`;
        }
      }

      const updateData = {
        contentCid,
        content,  // Pass the actual content as fallback if provided
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

  // Additional methods to match route expectations
  async getAllQuickPosts(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 20, sort = 'new' } = req.query;

      // Use the feed method as a fallback for all posts
      const quickPosts = await this.quickPostService.getQuickPostFeed({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as 'new' | 'hot' | 'top',
        timeRange: 'all'
      });

      return res.json(apiResponse.success(quickPosts, 'Quick posts retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting all quick posts:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve quick posts', 500));
    }
  }

  async getQuickPostFeed(req: Request, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 20, sort = 'new', timeRange = 'day' } = req.query;

      const quickPosts = await this.quickPostService.getQuickPostFeed({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as 'new' | 'hot' | 'top',
        timeRange: timeRange as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
      });

      return res.json(apiResponse.success(quickPosts, 'Quick post feed retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting quick post feed:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve quick post feed', 500));
    }
  }

  async getQuickPostsByTag(req: Request, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // For now, return empty array since tag filtering is not implemented
      // This is a placeholder until proper tag filtering is added to the service
      const quickPosts = {
        posts: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: 0
      };

      return res.json(apiResponse.success(quickPosts, `Quick posts with tag ${tag} retrieved successfully (placeholder)`));
    } catch (error: any) {
      console.error('Error getting quick posts by tag:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve quick posts by tag', 500));
    }
  }

  async getCsrfToken(req: Request, res: Response): Promise<Response> {
    try {
      // In a real implementation, this would generate a CSRF token using csurf or similar
      // For now, we'll return a simple token based on the session ID or a random string
      const csrfToken = crypto.randomUUID();

      return res.json(apiResponse.success({ csrfToken }, 'CSRF token generated successfully'));
    } catch (error: any) {
      console.error('Error generating CSRF token:', error);
      return res.status(500).json(apiResponse.error('Failed to generate CSRF token', 500));
    }
  }
}