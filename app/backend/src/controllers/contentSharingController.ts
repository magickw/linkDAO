/**
 * Content Sharing Controller
 * Handles content sharing between feed, communities, and messages
 * Implements requirements 4.2, 4.5, 4.6 from the interconnected social platform spec
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { contentSharingService } from '../services/contentSharingService';
import { messagingService } from '../services/messagingService';
import { communityService } from '../services/communityService';
import { feedService } from '../services/feedService';
import { logger } from '../utils/logger';

interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
  };
}

class ContentSharingController {
  /**
   * Generate shareable content object from various content types
   */
  async generateShareableContent(req: Request, res: Response): Promise<void> {
    try {
      const { contentType, contentId } = req.params;

      const shareableContent = await contentSharingService.generateShareableContent(
        contentId,
        contentType as any
      );

      res.json({
        success: true,
        data: shareableContent
      });
    } catch (error) {
      logger.error('Error generating shareable content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate shareable content'
      });
    }
  }

  /**
   * Generate content preview for message sharing
   */
  async generateContentPreview(req: Request, res: Response): Promise<void> {
    try {
      const { content } = req.body;

      const preview = await contentSharingService.generateContentPreview(content);

      res.json({
        success: true,
        data: preview
      });
    } catch (error) {
      logger.error('Error generating content preview:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate content preview'
      });
    }
  }

  /**
   * Share content to direct message
   */
  async shareToDirectMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { content, options } = req.body;
      const userAddress = req.user!.address;

      // Validate that user can share this content
      const canShare = await contentSharingService.validateSharingPermissions(
        content.id,
        content.type,
        userAddress
      );

      if (!canShare) {
        res.status(403).json({
          success: false,
          error: 'You do not have permission to share this content'
        });
        return;
      }

      const message = await contentSharingService.shareToDirectMessage(
        content,
        options,
        userAddress
      );

      res.json({
        success: true,
        data: message
      });
    } catch (error) {
      logger.error('Error sharing content to message:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to share content to message'
      });
    }
  }

  /**
   * Create community invitation message
   */
  async createCommunityInvitation(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { communityId, recipientAddress, customMessage } = req.body;
      const inviterAddress = req.user!.address;

      // Validate that user is a member of the community
      // Using getCommunityMembers to check membership
      const membersResult = await communityService.getCommunityMembers({
        communityId,
        page: 1,
        limit: 1000 // Get all members to check if user is in the list
      });
      
      const isMember = membersResult.members.some((member: any) => member.userAddress === inviterAddress);
      
      if (!isMember) {
        res.status(403).json({
          success: false,
          error: 'You must be a member of the community to send invitations'
        });
        return;
      }

      const invitation = await contentSharingService.createCommunityInvitation(
        communityId,
        recipientAddress,
        inviterAddress,
        customMessage
      );

      res.json({
        success: true,
        data: invitation
      });
    } catch (error) {
      logger.error('Error creating community invitation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create community invitation'
      });
    }
  }

  /**
   * Cross-post content to communities
   */
  async crossPostToCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { originalPostId, targetCommunityIds, attribution, customMessage } = req.body;
      const userAddress = req.user!.address;

      // Validate that user can cross-post to target communities
      const membershipChecks = await Promise.all(
        targetCommunityIds.map(async (communityId: string) => {
          // Using getCommunityMembers to check membership
          const membersResult = await communityService.getCommunityMembers({
            communityId,
            page: 1,
            limit: 1000 // Get all members to check if user is in the list
          });
          
          return membersResult.members.some((member: any) => member.userAddress === userAddress);
        })
      );

      const validCommunities = targetCommunityIds.filter(
        (_: string, index: number) => membershipChecks[index]
      );

      if (validCommunities.length === 0) {
        res.status(403).json({
          success: false,
          error: 'You are not a member of any of the target communities'
        });
        return;
      }

      const result = await contentSharingService.crossPostToCommunities(
        originalPostId,
        {
          targetCommunityIds: validCommunities,
          attribution,
          customMessage
        },
        userAddress
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error cross-posting content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to cross-post content'
      });
    }
  }

  /**
   * Get sharing analytics for content
   */
  async getSharingAnalytics(req: Request, res: Response): Promise<void> {
    try {
      const { contentType, contentId } = req.params;
      const { timeRange = 'all' } = req.query;

      const analytics = await contentSharingService.getSharingAnalytics(
        contentId,
        contentType,
        timeRange as string
      );

      res.json({
        success: true,
        data: analytics
      });
    } catch (error) {
      logger.error('Error getting sharing analytics:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sharing analytics'
      });
    }
  }

  /**
   * Track sharing event for analytics
   */
  async trackSharingEvent(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { contentId, contentType, shareType, metadata } = req.body;
      const userAddress = req.user!.address;

      await contentSharingService.trackSharingEvent(
        contentId,
        contentType,
        shareType,
        userAddress,
        metadata
      );

      res.json({
        success: true,
        message: 'Sharing event tracked successfully'
      });
    } catch (error) {
      logger.error('Error tracking sharing event:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to track sharing event'
      });
    }
  }

  /**
   * Get user's sharing history
   */
  async getUserSharingHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userAddress = req.user!.address;
      const {
        page = 1,
        limit = 20,
        contentType,
        shareType
      } = req.query;

      const history = await contentSharingService.getUserSharingHistory(
        userAddress,
        {
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          contentType: contentType as string,
          shareType: shareType as string
        }
      );

      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      logger.error('Error getting user sharing history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get sharing history'
      });
    }
  }

  /**
   * Get trending shared content
   */
  async getTrendingSharedContent(req: Request, res: Response): Promise<void> {
    try {
      const {
        timeRange = '24h',
        contentType,
        limit = 20
      } = req.query;

      const trendingContent = await contentSharingService.getTrendingSharedContent({
        timeRange: timeRange as string,
        contentType: contentType as string,
        limit: parseInt(limit as string)
      });

      res.json({
        success: true,
        data: trendingContent
      });
    } catch (error) {
      logger.error('Error getting trending shared content:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get trending shared content'
      });
    }
  }
}

export const contentSharingController = new ContentSharingController();
