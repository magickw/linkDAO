import { Response } from 'express';
import crypto from 'crypto';
import { StatusService } from '../services/statusService';
import { MetadataService } from '../services/metadataService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { socialMediaIntegrationService, SocialPostResult } from '../services/socialMediaIntegrationService';
import { SocialPlatform, isSupportedPlatform } from '../services/oauth';

export class StatusController {
  private statusService: StatusService;

  constructor() {
    try {
      this.statusService = new StatusService();
    } catch (error) {
      console.error('Failed to initialize StatusService:', error);
      throw new Error(`StatusController initialization failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      console.log('POST /api/statuses - Creating status');

      const { content, authorId, parentId, isRepost, media, tags, onchainRef, isTokenGated, gatedContentPreview, shareToSocialMedia } = req.body;
      console.log('🔍 [DEBUG-CREATE] Status body:', JSON.stringify({ content, parentId, isRepost }));

      if ((!content || content.trim() === '') && !isRepost) {
        return res.status(400).json(apiResponse.error('Content is required', 400));
      }

      // Extract authenticated user's ID from JWT token instead of trusting request body
      const authenticatedUser = (req as any).user;
      if (!authenticatedUser || !authenticatedUser.id) {
        return res.status(401).json(apiResponse.error('User not authenticated', 401));
      }

      // Try to upload content to IPFS immediately
      let contentCid: string;
      try {
        const metadataService = new MetadataService();
        contentCid = await metadataService.uploadToIPFS(content);
        console.log('Content uploaded to IPFS with CID:', contentCid);
      } catch (uploadError) {
        safeLogger.warn('IPFS upload failed, using content-based CID as fallback:', uploadError);
        // Use a deterministic hash-based CID instead of mock prefix
        const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 46);
        contentCid = `Qm${hash}`;
      }

      // Prepare input for StatusService
      const statusInput = {
        authorId: authenticatedUser.id,
        contentCid,
        content,  // Store the actual content in the database
        parentId,
        isRepost,
        mediaCids: media ? JSON.stringify(media) : undefined,
        tags: tags ? JSON.stringify(tags) : undefined,
        onchainRef,
        isTokenGated,
        gatedContentPreview
      };

      // Create status using StatusService
      const status = await this.statusService.createStatus(statusInput);

      console.log('Status created:', status.id);

      // Handle social media sharing if requested
      let socialMediaResults: SocialPostResult[] = [];
      if (shareToSocialMedia && typeof shareToSocialMedia === 'object') {
        // Extract platforms that are set to true
        const platformsToShare: SocialPlatform[] = [];

        for (const [platform, shouldShare] of Object.entries(shareToSocialMedia)) {
          if (shouldShare === true && isSupportedPlatform(platform)) {
            platformsToShare.push(platform as SocialPlatform);
          }
        }

        if (platformsToShare.length > 0) {
          try {
            // Post to connected platforms asynchronously (don't block response)
            socialMediaResults = await socialMediaIntegrationService.postToConnectedPlatforms(
              status.id,
              authenticatedUser.id,
              platformsToShare,
              content,
              media // Pass media URLs if available
            );

            console.log('Social media posting results:', socialMediaResults);
          } catch (socialError) {
            // Log error but don't fail the status creation
            safeLogger.error('Error posting to social media:', socialError);
          }
        }
      }

      return res.status(201).json(apiResponse.success({
        ...status,
        socialMediaResults: socialMediaResults.length > 0 ? socialMediaResults : undefined,
      }, 'Status created successfully'));
    } catch (error: any) {
      console.error('Error creating status:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to create status', 500));
    }
  }

  async getStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;

      const status = await this.statusService.getStatus(id);

      if (!status) {
        return res.status(404).json(apiResponse.error('Status not found', 404));
      }

      return res.json(apiResponse.success(status, 'Status retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting status:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve status', 500));
    }
  }

  async getStatusByShareId(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { shareId } = req.params;

      const status = await this.statusService.getStatusByShareId(shareId);

      if (!status) {
        return res.status(404).json(apiResponse.error('Status not found', 404));
      }

      return res.json(apiResponse.success(status, 'Status retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting status by share ID:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve status', 500));
    }
  }

  async viewStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;
      const ipAddress = req.ip || req.socket.remoteAddress;

      const views = await this.statusService.incrementView(id, userId, ipAddress);

      return res.json(apiResponse.success({ views }, 'View recorded successfully'));
    } catch (error: any) {
      console.error('Error incrementing status view:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to record view', 500));
    }
  }

  async updateStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
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
          safeLogger.warn('Error uploading content to IPFS, using content-based CID as fallback:', uploadError);
          // Use a deterministic hash-based CID instead of mock prefix
          const hash = crypto.createHash('sha256').update(content).digest('hex').substring(0, 46);
          contentCid = `Qm${hash}`;
        }
      }

      const updateData = {
        contentCid,
        content,  // Pass the actual content as fallback if provided
        tags: tags ? JSON.stringify(tags) : undefined
      };

      const status = await this.statusService.updateStatus(id, updateData);

      if (!status) {
        return res.status(404).json(apiResponse.error('Status not found', 404));
      }

      return res.json(apiResponse.success(status, 'Status updated successfully'));
    } catch (error: any) {
      console.error('Error updating status:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to update status', 500));
    }
  }

  async deleteStatus(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const userId = req.user?.id;

      const deleted = await this.statusService.deleteStatus(id, userId);

      if (!deleted) {
        // Idempotent delete: if it's already gone, consider it a success
        return res.json(apiResponse.success(null, 'Status already deleted'));
      }

      return res.json(apiResponse.success(null, 'Status deleted successfully'));
    } catch (error: any) {
      console.error('Error deleting status:', error);

      // Handle authorization errors
      if (error.message?.includes('Unauthorized')) {
        return res.status(403).json(apiResponse.error(error.message, 403));
      }

      return res.status(500).json(apiResponse.error(error.message || 'Failed to delete status', 500));
    }
  }

  async getStatusesByAuthor(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { authorId } = req.params;
      const { page = 1, limit = 20 } = req.query;

      const statuses = await this.statusService.getStatusesByAuthor(
        authorId,
        parseInt(page as string),
        parseInt(limit as string)
      );

      return res.json(apiResponse.success(statuses, 'Statuses retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting statuses by author:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve statuses', 500));
    }
  }

  async addStatusReaction(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { userId, type, amount } = req.body;

      const reaction = await this.statusService.addReaction(id, userId, type, amount);

      return res.status(201).json(apiResponse.success(reaction, 'Reaction added successfully'));
    } catch (error: any) {
      console.error('Error adding status reaction:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to add reaction', 500));
    }
  }

  async addStatusTip(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { id } = req.params;
      const { fromUserId, toUserId, token, amount, message } = req.body;

      const tip = await this.statusService.addTip(id, fromUserId, toUserId, token, amount, message);

      return res.status(201).json(apiResponse.success(tip, 'Tip added successfully'));
    } catch (error: any) {
      console.error('Error adding status tip:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to add tip', 500));
    }
  }

  // Additional methods to match route expectations
  async getAllStatuses(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 20, sort = 'new' } = req.query;

      // Use the feed method as a fallback for all posts
      const statuses = await this.statusService.getStatusFeed({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as 'new' | 'hot' | 'top',
        timeRange: 'all'
      });

      return res.json(apiResponse.success(statuses, 'Statuses retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting all statuses:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve statuses', 500));
    }
  }

  async getStatusFeed(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { page = 1, limit = 20, sort = 'new', timeRange = 'day' } = req.query;

      const statuses = await this.statusService.getStatusFeed({
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        sort: sort as 'new' | 'hot' | 'top',
        timeRange: timeRange as 'hour' | 'day' | 'week' | 'month' | 'year' | 'all'
      });

      return res.json(apiResponse.success(statuses, 'Status feed retrieved successfully'));
    } catch (error: any) {
      console.error('Error getting status feed:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve status feed', 500));
    }
  }

  async getStatusesByTag(req: AuthenticatedRequest, res: Response): Promise<Response> {
    try {
      const { tag } = req.params;
      const { page = 1, limit = 20 } = req.query;

      // For now, return empty array since tag filtering is not implemented
      // This is a placeholder until proper tag filtering is added to the service
      const statuses = {
        posts: [],
        total: 0,
        page: parseInt(page as string),
        limit: parseInt(limit as string),
        totalPages: 0
      };

      return res.json(apiResponse.success(statuses, `Statuses with tag ${tag} retrieved successfully (placeholder)`));
    } catch (error: any) {
      console.error('Error getting statuses by tag:', error);
      return res.status(500).json(apiResponse.error(error.message || 'Failed to retrieve statuses by tag', 500));
    }
  }

  async getCsrfToken(req: AuthenticatedRequest, res: Response): Promise<Response> {
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