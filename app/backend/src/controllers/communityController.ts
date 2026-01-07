import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { communityService } from '../services/communityService';
import { apiResponse, createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { Community } from '../types/community';
import { openaiService } from '../services/ai/openaiService';
import { aiModerationService } from '../services/aiModerationService';
import { db } from '../db';
import { userReputation } from '../db/schema';
import { eq } from 'drizzle-orm';

// Extend Request type to include user property
interface AuthenticatedRequest extends Request {
  user?: {
    address?: string;
    walletAddress?: string;
    userId?: string;
    kycStatus?: string;
    permissions?: string[];
    id?: string;
    isAdmin?: boolean;
    [key: string]: any;
  };
}

export class CommunityController {
  // List communities with filtering
  async listCommunities(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        sort = 'popular',
        tags = []
      } = req.query;

      const communities = await communityService.listCommunities({
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        search: search as string,
        sort: sort as string,
        tags: Array.isArray(tags) ? tags as string[] : []
      });

      res.json(createSuccessResponse(communities, {}));
    } catch (error) {
      safeLogger.error('Error listing communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve communities'));
    }
  }

  // Get trending communities
  async getTrendingCommunities(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        timeRange = 'week'
      } = req.query;

      const trendingCommunities = await communityService.getTrendingCommunities({
        page: Number(page),
        limit: Number(limit),
        timeRange: timeRange as string
      });

      res.json(createSuccessResponse(trendingCommunities, {}));
    } catch (error) {
      safeLogger.error('Error getting trending communities:', error);

      // Return fallback empty response instead of error
      res.json(createSuccessResponse({
        communities: [],
        pagination: {
          page: Number(req.query.page || 1),
          limit: Number(req.query.limit || 10),
          total: 0
        }
      }, {}));
    }
  }

  // Get community details - handles both ID and slug
  async getCommunityDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      // Check if the parameter is a numeric ID or a slug
      // Check if the parameter is a UUID
      // The schema uses UUIDs for IDs, so we check for UUID format
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let community;
      if (isUuid) {
        // It's a UUID, so it must be an ID
        community = await communityService.getCommunityDetails(id, userAddress);
      } else {
        // It's not a UUID, so treat it as a slug
        community = await communityService.getCommunityBySlug(id, userAddress);
      }

      // Handle service errors gracefully
      if (!community) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found or unavailable', 404));
        return;
      }

      res.json(createSuccessResponse(community, {}));
    } catch (error) {
      safeLogger.error('Error getting community details:', error);

      // Handle service unavailable errors specifically
      if (error.message === 'Service temporarily unavailable') {
        res.status(503).json(createErrorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable. Please try again later.', {
          retryable: true,
          retryAfter: 30
        }));
        return;
      }

      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community details'));
    }
  }

  // Get community by slug
  async getCommunityBySlug(req: Request, res: Response): Promise<void> {
    try {
      const { slug } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      const community = await communityService.getCommunityBySlug(slug, userAddress);

      // Handle service errors gracefully
      if (!community) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found or unavailable', 404));
        return;
      }

      res.json(createSuccessResponse(community, {}));
    } catch (error) {
      safeLogger.error('Error getting community by slug:', error);

      // Handle service unavailable errors specifically
      if (error.message === 'Service temporarily unavailable') {
        res.status(503).json(createErrorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable. Please try again later.', {
          retryable: true,
          retryAfter: 30
        }));
        return;
      }

      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community details'));
    }
  }

  // Create new community
  async createCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const {
        name,
        slug,
        displayName,
        description,
        category,
        tags = [],
        isPublic = true,
        iconUrl,
        bannerUrl,
        rules = [],
        governanceEnabled = false,
        stakingRequired = false,
        minimumStake = 0
      } = req.body;

      const community = await communityService.createCommunity({
        creatorAddress: userAddress,
        name,
        slug,
        displayName,
        description,
        category,
        tags,
        isPublic,
        iconUrl,
        bannerUrl,
        rules,
        governanceEnabled,
        stakingRequired,
        minimumStake
      });

      res.status(201).json(createSuccessResponse(community, {}));
    } catch (error) {
      safeLogger.error('Error creating community:', error);

      // Enhanced error handling with retry guidance
      const isServiceUnavailable = error.message?.includes('database') ||
        error.message?.includes('connection') ||
        error.message?.includes('timeout') ||
        error.code === 'ECONNREFUSED';

      const isRateLimited = error.message?.includes('rate limit') ||
        error.status === 429;

      if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse('CONFLICT', 'Community name already exists', {
          retryable: false,
          suggestion: 'Please choose a different community name'
        }));
      } else if (error.message.includes('Database schema error')) {
        res.status(500).json(createErrorResponse('DATABASE_SCHEMA_ERROR', error.message, {
          retryable: false,
          errorCode: 'DATABASE_SCHEMA_ERROR',
          details: 'The database schema is out of sync. Please contact support.'
        }));
      } else if (isServiceUnavailable) {
        res.status(503).json(createErrorResponse('SERVICE_UNAVAILABLE', 'Service temporarily unavailable. Please try again in a moment.', {
          retryable: true,
          retryAfter: 30,
          errorCode: 'SERVICE_UNAVAILABLE'
        }));
      } else if (isRateLimited) {
        res.status(429).json(createErrorResponse('RATE_LIMITED', 'Too many requests. Please wait before trying again.', {
          retryable: true,
          retryAfter: 60,
          errorCode: 'RATE_LIMITED'
        }));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create community', {
          retryable: true,
          errorCode: 'INTERNAL_ERROR',
          details: error.message || 'Unknown error'
        }));
      }
    }
  }

  // Update community
  async updateCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const updateData = req.body;

      const updatedCommunity = await communityService.updateCommunity({
        communityId: id,
        userAddress,
        updateData
      });

      if (!updatedCommunity) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found or unauthorized', 404));
        return;
      }

      res.json(createSuccessResponse(updatedCommunity, {}));
    } catch (error) {
      safeLogger.error('Error updating community:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to update community'));
    }
  }

  // Join community
  async joinCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await communityService.joinCommunity({
        communityId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to join community', 400));
        return;
      }

      res.json(createSuccessResponse(result.data, {}));
    } catch (error) {
      safeLogger.error('Error joining community:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to join community'));
    }
  }

  // Leave community
  async leaveCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await communityService.leaveCommunity({
        communityId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to leave community', 400));
        return;
      }

      res.json(createSuccessResponse(null, {}));
    } catch (error) {
      safeLogger.error('Error leaving community:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to leave community'));
    }
  }

  // Get community posts
  async getCommunityPosts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        sort = 'newest',
        timeRange = 'all'
      } = req.query;

      // Map 'new' to 'newest' for backward compatibility
      const normalizedSort = sort === 'new' ? 'newest' : sort;

      const posts = await communityService.getCommunityPosts({
        communityId: id,
        page: Number(page),
        limit: Number(limit),
        sort: normalizedSort as string,
        timeRange: timeRange as string
      });

      res.json(createSuccessResponse(posts, {}));
    } catch (error) {
      safeLogger.error('Error getting community posts:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community posts'));
    }
  }

  // Get aggregated feed from followed communities
  async getFollowedCommunitiesFeed(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const {
        page = 1,
        limit = 20,
        sort = 'new',
        timeRange = 'all'
      } = req.query;

      const result = await communityService.getFollowedCommunitiesPosts({
        userAddress,
        page: Number(page),
        limit: Number(limit),
        sort: sort as string,
        timeRange: timeRange as string
      });

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error getting followed communities feed:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community feed'));
    }
  }

  // Delete community post (auth required)
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id, postId } = req.params;

      const result = await communityService.deletePost(id, postId, userAddress);

      if (!result.success) {
        // Handle specific error cases if needed, otherwise default to 400
        const statusCode = result.message?.includes('not found') ? 404 : 403;
        res.status(statusCode).json(createErrorResponse(statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN', result.message || 'Failed to delete post', statusCode));
        return;
      }

      res.json(createSuccessResponse(null, {}));
    } catch (error) {
      safeLogger.error('Error deleting community post:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to delete post'));
    }
  }

  // Update community post (auth required)
  async updateCommunityPost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id, postId } = req.params;
      const { title, content, mediaUrls, tags } = req.body;

      // Validate inputs
      if (!content && !title && !mediaUrls && !tags) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'No update data provided', 400));
        return;
      }

      const result = await communityService.updatePost(id, postId, userAddress, {
        title,
        content,
        mediaUrls,
        tags
      });

      if (!result.success) {
        // Handle specific error cases
        const statusCode = result.message?.includes('not found') ? 404 : 403;
        res.status(statusCode).json(createErrorResponse(statusCode === 404 ? 'NOT_FOUND' : 'FORBIDDEN', result.message || 'Failed to update post', statusCode));
        return;
      }

      res.json(createSuccessResponse(result.data, {}));
    } catch (error) {
      safeLogger.error('Error updating community post:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to update post'));
    }
  }

  // Create post in community
  async createCommunityPost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { title, content, mediaUrls = [], tags = [], pollData } = req.body;

      // Perform AI moderation before creating post
      try {
        const moderationResult = await aiModerationService.moderateContent({
          type: 'post',
          content: title ? `${title}\n\n${content}` : content,
          authorAddress: userAddress,
          communityId: id,
          context: {
            communityRules: await this.getCommunityRules(id),
            userReputation: await this.getUserReputation(userAddress)
          }
        });

        // If content is not approved, return moderation result
        if (!moderationResult.isApproved) {
          res.status(403).json(createErrorResponse('CONTENT_REJECTED',
            `Content not approved: ${moderationResult.reasoning}`, {
            moderationResult,
            suggestedActions: await aiModerationService.getSuggestedActions({
              type: 'post',
              content: title ? `${title}\n\n${content}` : content,
              authorAddress: userAddress,
              communityId: id
            }, moderationResult)
          }));
          return;
        }

        // Log successful moderation
        safeLogger.info('Content approved by AI moderation', {
          communityId: id,
          authorAddress: userAddress,
          riskScore: moderationResult.riskScore,
          categories: moderationResult.categories.map(c => c.category)
        });

      } catch (moderationError) {
        safeLogger.warn('AI moderation failed, proceeding with post creation:', moderationError);
        // Continue with post creation if moderation fails
      }

      const post = await communityService.createCommunityPost({
        communityId: id,
        authorAddress: userAddress,
        title,
        content,
        mediaUrls,
        tags,
        pollData
      });

      if (!post.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', post.message || 'Failed to create post', 400));
        return;
      }

      res.status(201).json(createSuccessResponse(post.data, {}));
    } catch (error) {
      safeLogger.error('Error creating community post:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create post'));
    }
  }

  // AI-assisted post creation
  async createAIAssistedPost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const {
        title,
        content,
        mediaUrls = [],
        tags = [],
        postType,
        aiAction,
        communityContext
      } = req.body;

      // Validate required fields
      if (!content) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Content is required', 400));
        return;
      }

      // If this is an AI assistance request (not actual post creation)
      if (aiAction) {
        // Handle AI assistance requests
        const aiResult = await this.handleAIPostAssistance({
          aiAction,
          title,
          content,
          communityId: id,
          userAddress,
          communityContext
        });

        if (!aiResult.success) {
          res.status(400).json(createErrorResponse('BAD_REQUEST', aiResult.message || 'Failed to process AI request', 400));
          return;
        }

        res.json(createSuccessResponse(aiResult.data, {}));
        return;
      }

      // Regular post creation
      const post = await communityService.createCommunityPost({
        communityId: id,
        authorAddress: userAddress,
        content,
        mediaUrls,
        tags,
        pollData: undefined // Not supported in this endpoint
      });

      if (!post.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', post.message || 'Failed to create post', 400));
        return;
      }

      res.status(201).json(createSuccessResponse(post.data, {}));
    } catch (error) {
      safeLogger.error('Error creating AI-assisted post:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create post'));
    }
  }

  // Handle AI post assistance requests
  private async handleAIPostAssistance(data: {
    aiAction: string;
    title?: string;
    content?: string;
    communityId: string;
    userAddress: string;
    communityContext?: any;
  }): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // Get community details for context
      const community: any | null = await communityService.getCommunityDetails(data.communityId, data.userAddress);
      if (!community) {
        return { success: false, message: 'Community not found' };
      }

      // Prepare context for AI
      const context = {
        communityName: community.name,
        communityDescription: community.description,
        communityCategory: community.category,
        userAddress: data.userAddress,
        action: data.aiAction,
        title: data.title,
        content: data.content,
        ...data.communityContext
      };

      // Call AI service based on action
      let aiResponse: any;

      switch (data.aiAction) {
        case 'generate_title':
          if (!data.content) {
            return { success: false, message: 'Content is required to generate title' };
          }
          aiResponse = await openaiService.generateInsight({
            type: 'content_trends',
            context: {
              action: 'generate_title',
              content: data.content,
              communityName: community.name,
              communityDescription: community.description
            }
          });
          break;

        case 'generate_content':
          if (!data.title) {
            return { success: false, message: 'Title is required to generate content' };
          }
          aiResponse = await openaiService.generateInsight({
            type: 'content_trends',
            context: {
              action: 'generate_content',
              title: data.title,
              communityName: community.name,
              communityDescription: community.description
            }
          });
          break;

        case 'generate_tags':
          if (!data.content) {
            return { success: false, message: 'Content is required to generate tags' };
          }
          aiResponse = await openaiService.generateInsight({
            type: 'content_trends',
            context: {
              action: 'generate_tags',
              content: data.content,
              communityName: community.name,
              communityDescription: community.description
            }
          });
          break;

        case 'improve_content':
          if (!data.content) {
            return { success: false, message: 'Content is required to improve' };
          }
          aiResponse = await openaiService.generateInsight({
            type: 'content_trends',
            context: {
              action: 'improve_content',
              content: data.content,
              communityName: community.name,
              communityDescription: community.description
            }
          });
          break;

        default:
          return { success: false, message: 'Invalid AI action' };
      }

      return {
        success: true,
        data: {
          action: data.aiAction,
          result: aiResponse
        }
      };
    } catch (error) {
      safeLogger.error('Error handling AI post assistance:', error);
      return { success: false, message: 'Failed to process AI request' };
    }
  }

  // Call AI insights service
  private async callAIInsightsService(
    type: string,
    context: any
  ): Promise<any> {
    try {
      // Ensure type is one of the allowed values
      const validTypes = ['user_behavior', 'content_trends', 'seller_performance', 'platform_health'];
      if (!validTypes.includes(type)) {
        throw new Error(`Invalid insight type: ${type}`);
      }

      return await openaiService.generateInsight({
        type: type as 'user_behavior' | 'content_trends' | 'seller_performance' | 'platform_health',
        context
      });
    } catch (error) {
      safeLogger.error('Error calling AI insights service:', error);
      throw error;
    }
  }

  // Get community members
  async getCommunityMembers(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        role
      } = req.query;

      const members = await communityService.getCommunityMembers({
        communityId: id,
        page: Number(page),
        limit: Number(limit),
        role: role as string
      });

      res.json(createSuccessResponse(members, {}));
    } catch (error) {
      safeLogger.error('Error getting community members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community members'));
    }
  }

  // Get community statistics
  async getCommunityStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await communityService.getCommunityStats(id);

      if (!stats) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found'));
        return;
      }

      res.json(createSuccessResponse(stats, {}));
    } catch (error) {
      safeLogger.error('Error getting community stats:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community statistics'));
    }
  }

  // Moderate content
  async moderateContent(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { action, targetId, reason } = req.body;

      const result = await communityService.moderateContent({
        communityId: id,
        moderatorAddress: userAddress,
        action,
        targetId,
        reason
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', (result as any).message || 'Failed to moderate content'));
        return;
      }

      res.json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error moderating content:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to moderate content'));
    }
  }

  // Get governance proposals
  async getGovernanceProposals(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 10,
        status
      } = req.query;

      const proposals = await communityService.getGovernanceProposals({
        communityId: id,
        page: Number(page),
        limit: Number(limit),
        status: status as string
      });

      res.json(createSuccessResponse(proposals, {}));
    } catch (error) {
      safeLogger.error('Error getting governance proposals:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve governance proposals'));
    }
  }

  // Create governance proposal
  async createGovernanceProposal(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const {
        title,
        description,
        type,
        votingDuration = 7,
        requiredStake = 0
      } = req.body;

      const proposal = await communityService.createGovernanceProposal({
        communityId: id,
        proposerAddress: userAddress,
        title,
        description,
        type,
        votingDuration,
        requiredStake
      });

      if (!proposal.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', proposal.message || 'Failed to create governance proposal', 400));
        return;
      }

      res.status(201).json(createSuccessResponse((proposal as any).data || proposal, {}));
    } catch (error) {
      safeLogger.error('Error creating governance proposal:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create governance proposal'));
    }
  }

  // Vote on governance proposal
  async voteOnProposal(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id, proposalId } = req.params;
      const { vote, stakeAmount = 0 } = req.body;

      // Validate vote type
      if (!['yes', 'no', 'abstain'].includes(vote)) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Invalid vote type. Must be yes, no, or abstain', 400));
        return;
      }

      // Validate stake amount
      if (typeof stakeAmount !== 'number' || stakeAmount < 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Invalid stake amount', 400));
        return;
      }

      const result = await communityService.voteOnProposal({
        communityId: id,
        proposalId,
        voterAddress: userAddress,
        vote,
        stakeAmount
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to cast vote', 400));
        return;
      }

      res.json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error voting on proposal:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to cast vote'));
    }
  }

  // Execute governance proposal
  async executeProposal(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { proposalId } = req.params;

      const result = await communityService.executeProposal(proposalId, userAddress);

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to execute proposal', 400));
        return;
      }

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error executing proposal:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to execute proposal'));
    }
  }

  // Get moderation queue
  async getModerationQueue(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        type = 'all'
      } = req.query;

      const queue = await communityService.getModerationQueue(id, {
        page: Number(page),
        limit: Number(limit),
        type: type as 'posts' | 'reports' | 'all'
      });

      res.json(createSuccessResponse(queue, {}));
    } catch (error) {
      safeLogger.error('Error getting moderation queue:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve moderation queue'));
    }
  }

  // Flag content
  async flagContent(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { targetType, targetId, reason, category } = req.body;

      const result = await communityService.flagContent({
        communityId: id,
        reporterAddress: userAddress,
        targetType,
        targetId,
        reason,
        category
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to flag content', 400));
        return;
      }

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error flagging content:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to flag content'));
    }
  }

  // Search communities
  async searchCommunities(req: Request, res: Response): Promise<void> {
    try {
      const {
        q,
        page = 1,
        limit = 10,
        category,
        sort = 'relevance'
      } = req.query;

      // Validate search query
      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Search query must be at least 2 characters long', 400));
        return;
      }

      const searchResults = await communityService.searchCommunities({
        query: q.trim(),
        page: Number(page),
        limit: Number(limit),
        category: category as string,
        sort: sort as string
      });

      res.json(createSuccessResponse(searchResults, {}));
    } catch (error) {
      safeLogger.error('Error searching communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to search communities'));
    }
  }

  // Create delegation
  async createDelegation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { delegatorAddress, delegateAddress, expiryDate, metadata } = req.body;

      // Only allow users to create delegations where they are the delegator
      if (delegatorAddress !== userAddress) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Can only create delegations for yourself'));
        return;
      }

      // Validate addresses
      if (!delegatorAddress || !delegateAddress) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Both delegator and delegate addresses are required', 400));
        return;
      }

      // Prevent self-delegation
      if (delegatorAddress === delegateAddress) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Cannot delegate to yourself', 400));
        return;
      }

      // Validate expiry date if provided
      let expiryDateObj: Date | undefined;
      if (expiryDate) {
        expiryDateObj = new Date(expiryDate);
        if (expiryDateObj <= new Date()) {
          res.status(400).json(createErrorResponse('BAD_REQUEST', 'Expiry date must be in the future', 400));
          return;
        }
      }

      const result = await communityService.createDelegation({
        communityId: id,
        delegatorAddress,
        delegateAddress,
        expiryDate: expiryDateObj,
        metadata
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create delegation', 400));
        return;
      }

      res.status(201).json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error creating delegation:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create delegation'));
    }
  }

  // Revoke delegation
  async revokeDelegation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { delegatorAddress } = req.body;

      // Only allow users to revoke delegations where they are the delegator
      if (delegatorAddress !== userAddress) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Can only revoke delegations for yourself'));
        return;
      }

      if (!delegatorAddress) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Delegator address is required', 400));
        return;
      }

      const result = await communityService.revokeDelegation({
        communityId: id,
        delegatorAddress
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to revoke delegation', 400));
        return;
      }

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error revoking delegation:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to revoke delegation'));
    }
  }

  // Get delegations as delegate
  async getDelegationsAsDelegate(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { delegateAddress, page = 1, limit = 10 } = req.query;

      // Only allow users to get delegations where they are the delegate
      if (delegateAddress !== userAddress) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Can only get delegations where you are the delegate'));
        return;
      }

      if (!delegateAddress) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Delegate address is required', 400));
        return;
      }

      const delegations = await communityService.getDelegationsAsDelegate({
        communityId: id,
        delegateAddress: delegateAddress as string,
        page: Number(page),
        limit: Number(limit)
      });

      res.json(createSuccessResponse(delegations, {}));
    } catch (error) {
      safeLogger.error('Error getting delegations:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get delegations'));
    }
  }

  // Create proxy vote
  async createProxyVote(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { proposalId, proxyAddress, voterAddress, vote, reason } = req.body;

      // Only allow users to create proxy votes where they are the proxy
      if (proxyAddress !== userAddress) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Can only create proxy votes for yourself'));
        return;
      }

      // Validate inputs
      if (!proposalId || !voterAddress || !vote) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'proposalId, voterAddress, and vote are required', 400));
        return;
      }

      if (!['yes', 'no', 'abstain'].includes(vote)) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Invalid vote type. Must be yes, no, or abstain', 400));
        return;
      }

      const result = await communityService.createProxyVote({
        proposalId,
        proxyAddress,
        voterAddress,
        vote,
        reason
      });

      if (!result.success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create proxy vote', 400));
        return;
      }

      res.status(201).json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error creating proxy vote:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create proxy vote'));
    }
  }

  // Create multi-signature approval
  async createMultiSigApproval(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { proposalId, approverAddress, signature, metadata } = req.body;

      // Only allow users to create approvals where they are the approver
      if (approverAddress !== userAddress) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Can only create approvals for yourself'));
        return;
      }

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create multi-signature approval', 400));
      //   return;
      // }

      // res.status(201).json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error creating multi-signature approval:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create multi-signature approval'));
    }
  }

  // Get multi-signature approvals
  async getMultiSigApprovals(req: Request, res: Response): Promise<void> {
    try {
      const { proposalId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // res.json(createSuccessResponse(approvals, {}));
    } catch (error) {
      safeLogger.error('Error getting multi-signature approvals:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get multi-signature approvals'));
    }
  }

  // Create automated execution
  async createAutomatedExecution(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { proposalId, executionType, executionTime, recurrencePattern, dependencyProposalId, metadata } = req.body;

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create automated execution', 400));
      //   return;
      // }

      // res.status(201).json(createSuccessResponse((result as any).data || result, {}));
    } catch (error) {
      safeLogger.error('Error creating automated execution:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create automated execution'));
    }
  }

  // Get automated executions
  async getAutomatedExecutions(req: Request, res: Response): Promise<void> {
    try {
      const { proposalId } = req.params;
      const { page = 1, limit = 10 } = req.query;

      // Method not implemented yet
      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;
    } catch (error) {
      safeLogger.error('Error getting automated executions:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get automated executions'));
    }
  }

  // Get user's community memberships
  async getUserCommunityMemberships(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const memberships = await communityService.getUserCommunityMemberships(userAddress);

      res.json(createSuccessResponse(memberships, {}));
    } catch (error) {
      safeLogger.error('Error getting user community memberships:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve user community memberships'));
    }
  }

  // Check if user has access to token-gated content
  async checkContentAccess(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { contentId } = req.params;

      const hasAccess = await communityService.checkContentAccess(contentId, userAddress);

      res.json(createSuccessResponse({ hasAccess }, {}));
    } catch (error) {
      safeLogger.error('Error checking content access:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to check content access'));
    }
  }

  // Grant access to token-gated content
  async grantContentAccess(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { contentId } = req.params;
      const { accessLevel } = req.body;

      const success = await communityService.grantContentAccess(contentId, userAddress, accessLevel);

      if (!success) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Failed to grant content access', 400));
        return;
      }

      res.json(createSuccessResponse({ success: true }, {}));
    } catch (error) {
      safeLogger.error('Error granting content access:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to grant content access'));
    }
  }

  // Create token-gated content
  async createTokenGatedContent(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { communityId } = req.params;
      const data = req.body;

      // Add communityId to the data
      const contentData = {
        ...data,
        communityId
      };

      const content = await communityService.createTokenGatedContent(contentData);

      res.status(201).json(createSuccessResponse(content, {}));
    } catch (error) {
      safeLogger.error('Error creating token-gated content:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create token-gated content'));
    }
  }

  // Get token-gated content by post ID
  async getTokenGatedContentByPost(req: Request, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const content = await communityService.getTokenGatedContentByPost(postId);

      if (!content) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Token-gated content not found'));
        return;
      }

      res.json(createSuccessResponse(content, {}));
    } catch (error) {
      safeLogger.error('Error getting token-gated content:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get token-gated content'));
    }
  }

  // Create subscription tier
  async createSubscriptionTier(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { communityId } = req.params;
      const data = req.body;

      // Add communityId to the data
      const tierData = {
        ...data,
        communityId
      };

      const tier = await communityService.createSubscriptionTier(tierData);

      res.status(201).json(createSuccessResponse(tier, {}));
    } catch (error) {
      safeLogger.error('Error creating subscription tier:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create subscription tier'));
    }
  }

  // Get subscription tiers for a community
  async getSubscriptionTiers(req: Request, res: Response): Promise<void> {
    try {
      const { communityId } = req.params;

      const tiers = await communityService.getSubscriptionTiers(communityId);

      res.json(createSuccessResponse(tiers, {}));
    } catch (error) {
      safeLogger.error('Error getting subscription tiers:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get subscription tiers'));
    }
  }

  // Subscribe user to a tier
  async subscribeUser(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { communityId } = req.params;
      const { tierId, paymentTxHash, metadata } = req.body;

      const subscription = await communityService.subscribeUser({
        userAddress,
        communityId,
        tierId,
        paymentTxHash,
        metadata
      });

      res.status(201).json(createSuccessResponse(subscription, {}));
    } catch (error) {
      safeLogger.error('Error subscribing user:', error);
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('NOT_FOUND', error.message));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to subscribe user'));
      }
    }
  }

  // Get user subscriptions
  async getUserSubscriptions(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { communityId } = req.params;
      const subscriptions = await communityService.getUserSubscriptions(userAddress, communityId);

      res.json(createSuccessResponse(subscriptions, {}));
    } catch (error) {
      safeLogger.error('Error getting user subscriptions:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get user subscriptions'));
    }
  }

  // Search authors within communities
  async searchAuthors(req: Request, res: Response): Promise<void> {
    try {
      const { q } = req.query;

      if (!q || typeof q !== 'string' || q.trim().length < 2) {
        res.json(createSuccessResponse([], {}));
        return;
      }

      const authors = await communityService.searchAuthors(q.trim());
      res.json(createSuccessResponse(authors, {}));
    } catch (error) {
      safeLogger.error('Error searching authors:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to search authors'));
    }
  }

  // Get communities created by user
  async getMyCommunities(req: Request, res: Response): Promise<void> {
    try {
      const user = (req as AuthenticatedRequest).user;
      const userAddress = user?.address || user?.walletAddress;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const {
        page = 1,
        limit = 20
      } = req.query;

      const myCommunities = await communityService.getMyCommunities(
        userAddress,
        Number(page),
        Number(limit)
      );

      res.json(createSuccessResponse(myCommunities, {}));
    } catch (error) {
      safeLogger.error('Error getting my communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve my communities'));
    }
  }

  // Get communities created by the authenticated user
  async getUserCreatedCommunities(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address || req.user?.walletAddress;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'User not authenticated'));
        return;
      }

      const {
        page = 1,
        limit = 100
      } = req.query;

      const createdCommunities = await communityService.getCommunitiesCreatedByUser(
        userAddress,
        Number(page),
        Number(limit)
      );

      res.json(createSuccessResponse(createdCommunities, {}));
    } catch (error) {
      safeLogger.error('Error getting user created communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve created communities'));
    }
  }



  // Update moderation feedback (auth required)
  async updateModerationFeedback(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { contentId, moderationResult, feedback } = req.body;

      // In a real implementation, this would store the feedback in the database
      // For now, just log the feedback
      safeLogger.info('Moderation feedback received', {
        contentId,
        feedback,
        userAddress
      });

      res.json(createSuccessResponse({ message: 'Feedback recorded successfully' }, {}));
    } catch (error) {
      safeLogger.error('Error updating moderation feedback:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to update moderation feedback'));
    }
  }

  // Bulk Member Management Methods

  // Bulk add members to community
  async bulkAddMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, defaultRole = 'member', defaultReputation = 50, sendWelcomeMessage = true, skipExisting = false } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      // Validate addresses format (basic check)
      for (const address of memberAddresses) {
        if (!address || typeof address !== 'string' || address.length < 10) {
          res.status(400).json(createErrorResponse('BAD_REQUEST', 'Invalid wallet address format', 400));
          return;
        }
      }

      // Check if user has admin/moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can bulk add members', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.addMembersToCommunity(id, memberAddresses, {
        defaultRole,
        defaultReputation,
        sendWelcomeMessage,
        skipExisting
      });

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk adding members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk add members'));
    }
  }

  // Bulk remove members from community
  async bulkRemoveMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, reason } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      // Check if user has admin/moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can bulk remove members', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.removeMembersFromCommunity(id, memberAddresses, reason);

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk removing members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk remove members'));
    }
  }

  // Bulk update member roles
  async bulkUpdateMemberRoles(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, newRole, reason } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      if (!newRole || !['member', 'moderator', 'admin'].includes(newRole)) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Valid role is required (member, moderator, or admin)', 400));
        return;
      }

      // Check if user has admin permissions (role changes require admin)
      const hasPermission = await communityService.checkAdminPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins can bulk update member roles', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.updateMemberRoles(id, memberAddresses, newRole, reason);

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk updating member roles:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk update member roles'));
    }
  }

  // Bulk update member reputation
  async bulkUpdateMemberReputation(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, reputationChange, reason } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      if (typeof reputationChange !== 'number') {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Reputation change must be a number', 400));
        return;
      }

      // Check if user has moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can bulk update reputation', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.updateMemberReputation(id, memberAddresses, reputationChange, reason);

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk updating member reputation:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk update member reputation'));
    }
  }

  // Bulk ban members
  async bulkBanMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, reason, banDuration } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      if (!reason || reason.trim().length < 10) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Ban reason must be at least 10 characters', 400));
        return;
      }

      // Check if user has moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can bulk ban members', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.banMembers(id, memberAddresses, reason, banDuration);

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk banning members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk ban members'));
    }
  }

  // Bulk unban members
  async bulkUnbanMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { memberAddresses, reason } = req.body;

      if (!Array.isArray(memberAddresses) || memberAddresses.length === 0) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Member addresses array is required', 400));
        return;
      }

      // Check if user has moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can bulk unban members', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.unbanMembers(id, memberAddresses);

      res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error bulk unbanning members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to bulk unban members'));
    }
  }

  // Export members to CSV
  async exportMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { format = 'csv', includeInactive = false, fields = ['address', 'role', 'reputation', 'joinedAt', 'isActive'] } = req.query;

      // Check if user has admin/moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can export members', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const exportData = await bulkMemberManagementService.exportMembers(id, {
        format: format as 'csv' | 'json' | 'xlsx',
        includeInactive: includeInactive === 'true',
        fields: fields as Array<'address' | 'role' | 'reputation' | 'joinedAt' | 'lastActivityAt' | 'isActive'>
      });

      if (format === 'csv') {
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="community-${id}-members.csv"`);
        res.send(exportData);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename="community-${id}-members.json"`);
        res.json(exportData);
      } else {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Unsupported export format', 400));
      }
    } catch (error) {
      safeLogger.error('Error exporting members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to export members'));
    }
  }

  // Import members from CSV
  async importMembers(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { defaultRole = 'member', defaultReputation = 50, sendWelcomeMessage = true, skipExisting = false } = req.body;

      // Check if user has admin/moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can import members', 403));
        return;
      }

      // Check if file was uploaded
      if (!req.file) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'CSV file is required', 400));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const result = await bulkMemberManagementService.importMembersFromCSV(id, req.file.buffer.toString('utf-8'), {
        addresses: [], // Will be parsed from CSV
        defaultRole,
        defaultReputation,
        sendWelcomeMessage,
        skipExisting
      }); res.json(createSuccessResponse(result, {}));
    } catch (error) {
      safeLogger.error('Error importing members:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to import members'));
    }
  }

  // Get member statistics
  async getMemberStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;

      // Check if user has admin/moderator permissions
      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view member statistics', 403));
        return;
      }

      const { bulkMemberManagementService } = await import('../services/bulkMemberManagementService');
      const statistics = await bulkMemberManagementService.getMemberStatistics(id);

      res.json(createSuccessResponse(statistics, {}));
    } catch (error) {
      safeLogger.error('Error getting member statistics:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get member statistics'));
    }
  }

  // Push Notification Methods

  // Register device subscription
  async registerDeviceSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { subscription } = req.body;
      const userAgent = req.headers['user-agent'];

      if (!subscription) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Subscription data is required', 400));
        return;
      }

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const success = await pushNotificationService.registerDeviceSubscription(userAddress, subscription, userAgent);

      if (success) {
        res.json(createSuccessResponse({ message: 'Device subscription registered successfully' }, {}));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to register device subscription'));
      }
    } catch (error) {
      safeLogger.error('Error registering device subscription:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to register device subscription'));
    }
  }

  // Unregister device subscription
  async unregisterDeviceSubscription(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { endpoint } = req.body;

      if (!endpoint) {
        res.status(400).json(createErrorResponse('BAD_REQUEST', 'Endpoint is required', 400));
        return;
      }

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const success = await pushNotificationService.unregisterDeviceSubscription(userAddress, endpoint);

      if (success) {
        res.json(createSuccessResponse({ message: 'Device subscription unregistered successfully' }, {}));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to unregister device subscription'));
      }
    } catch (error) {
      safeLogger.error('Error unregistering device subscription:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to unregister device subscription'));
    }
  }

  // Get user notification preferences
  async getNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const preferences = await pushNotificationService.getUserNotificationPreferences(userAddress);

      res.json(createSuccessResponse(preferences, {}));
    } catch (error) {
      safeLogger.error('Error getting notification preferences:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get notification preferences'));
    }
  }

  // Update user notification preferences
  async updateNotificationPreferences(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const preferences = req.body;

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const success = await pushNotificationService.updateUserNotificationPreferences(userAddress, preferences);

      if (success) {
        res.json(createSuccessResponse({ message: 'Notification preferences updated successfully' }, {}));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to update notification preferences'));
      }
    } catch (error) {
      safeLogger.error('Error updating notification preferences:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to update notification preferences'));
    }
  }

  // Send test notification
  async sendTestNotification(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { title = 'Test Notification', message = 'This is a test notification from LinkDAO' } = req.body;

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const result = await pushNotificationService.sendPushNotification({
        userId: userAddress,
        type: 'system_update',
        title,
        message,
        data: {
          test: true,
          timestamp: new Date().toISOString()
        },
        priority: 'normal'
      });

      res.json(createSuccessResponse({
        message: 'Test notification sent',
        success: result.success,
        failed: result.failed
      }, {}));
    } catch (error) {
      safeLogger.error('Error sending test notification:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to send test notification'));
    }
  }

  // Get user notification statistics
  async getNotificationStatistics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { days = 30 } = req.query;

      const { pushNotificationService } = await import('../services/pushNotificationService');
      const stats = await pushNotificationService.getUserNotificationStats(userAddress, Number(days));

      res.json(createSuccessResponse(stats, {}));
    } catch (error) {
      safeLogger.error('Error getting notification statistics:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get notification statistics'));
    }
  }

  // Get VAPID public key
  async getVapidPublicKey(req: Request, res: Response): Promise<void> {
    try {
      const { pushNotificationService } = await import('../services/pushNotificationService');
      const publicKey = pushNotificationService.getVapidPublicKey();

      if (!publicKey) {
        res.status(503).json(createErrorResponse('SERVICE_UNAVAILABLE', 'Push notifications not configured'));
        return;
      }

      res.json(createSuccessResponse({ publicKey }, {}));
    } catch (error) {
      safeLogger.error('Error getting VAPID public key:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get VAPID public key'));
    }
  }

  // Community Health Dashboard Methods

  // Get community health metrics
  async getCommunityHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      // Check if user has permission to view health metrics
      if (userAddress) {
        const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
        if (!hasPermission) {
          res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view health metrics', 403));
          return;
        }
      }

      const { communityHealthService } = await import('../services/communityHealthService');
      const metrics = await communityHealthService.calculateHealthMetrics(id);

      res.json(createSuccessResponse(metrics, {}));
    } catch (error) {
      safeLogger.error('Error getting community health metrics:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get community health metrics'));
    }
  }

  // Get community health alerts
  async getCommunityHealthAlerts(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      // Check if user has permission to view health alerts
      if (userAddress) {
        const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
        if (!hasPermission) {
          res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view health alerts', 403));
          return;
        }
      }

      const { communityHealthService } = await import('../services/communityHealthService');
      const alerts = await communityHealthService.generateHealthAlerts(id);

      res.json(createSuccessResponse(alerts, {}));
    } catch (error) {
      safeLogger.error('Error getting community health alerts:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get community health alerts'));
    }
  }

  // Get historical health metrics
  async getHistoricalHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { days = 30 } = req.query;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      // Check if user has permission to view historical metrics
      if (userAddress) {
        const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
        if (!hasPermission) {
          res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view historical metrics', 403));
          return;
        }
      }

      const { communityHealthService } = await import('../services/communityHealthService');
      const historical = await communityHealthService.getHistoricalMetrics(id, Number(days));

      res.json(createSuccessResponse(historical, {}));
    } catch (error) {
      safeLogger.error('Error getting historical health metrics:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get historical health metrics'));
    }
  }

  // Get community benchmark comparison
  async getCommunityBenchmarkComparison(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      // Check if user has permission to view benchmark comparison
      if (userAddress) {
        const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
        if (!hasPermission) {
          res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view benchmark comparison', 403));
          return;
        }
      }

      const { communityHealthService } = await import('../services/communityHealthService');
      const comparison = await communityHealthService.compareWithBenchmarks(id);

      res.json(createSuccessResponse(comparison, {}));
    } catch (error) {
      safeLogger.error('Error getting community benchmark comparison:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get community benchmark comparison'));
    }
  }

  // Get health metrics for all user communities (for admin dashboard)
  async getAllCommunitiesHealthMetrics(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      // Get user's communities where they are admin/moderator
      const memberships = await communityService.getUserCommunityMemberships(userAddress);
      const adminCommunities = memberships.filter(m => m.role === 'admin' || m.role === 'moderator');

      if (adminCommunities.length === 0) {
        res.json(createSuccessResponse([], {}));
        return;
      }

      const { communityHealthService } = await import('../services/communityHealthService');
      const metricsPromises = adminCommunities.map(membership =>
        communityHealthService.calculateHealthMetrics(membership.communityId)
      );

      const allMetrics = await Promise.all(metricsPromises);

      res.json(createSuccessResponse(allMetrics, {}));
    } catch (error) {
      safeLogger.error('Error getting all communities health metrics:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get all communities health metrics'));
    }
  }

  async getModerationStats(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = (req as AuthenticatedRequest).user?.address;
      if (!userAddress) {
        res.status(401).json(createErrorResponse('UNAUTHORIZED', 'Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { timeRange = '7d' } = req.query;

      const hasPermission = await communityService.checkModeratorPermission(id, userAddress);
      if (!hasPermission) {
        res.status(403).json(createErrorResponse('FORBIDDEN', 'Only admins or moderators can view moderation stats', 403));
        return;
      }

      const { communityAIModerationService } = await import('../services/communityAIModerationService');
      // Map route timeRange values to service timeRange values
      const serviceTimeRange = timeRange === 'day' ? '7d' : timeRange === 'week' ? '30d' : timeRange === 'month' ? '90d' : '7d';
      const stats = await communityAIModerationService.getModerationStats(id, serviceTimeRange);
      res.json(createSuccessResponse(stats, {}));
    } catch (error) {
      safeLogger.error('Error getting moderation stats:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to get moderation stats'));
    }
  }

  /**
   * Get community rules
   */
  private async getCommunityRules(communityId: string): Promise<any[]> {
    // TODO: Implement community rules table
    // For now, return empty array
    return [];
  }

  /**
   * Get user reputation
   */
  private async getUserReputation(userAddress: string): Promise<number> {
    try {
      const reputation = await db.select()
        .from(userReputation)
        .where(eq(userReputation.walletAddress, userAddress))
        .limit(1);

      return Number(reputation[0]?.reputationScore) || 0;
    } catch (error) {
      safeLogger.error('Error getting user reputation:', error);
      return 0;
    }
  }
}

export const communityController = new CommunityController();
