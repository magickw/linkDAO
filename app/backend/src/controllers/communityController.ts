import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { communityService } from '../services/communityService';
import { apiResponse, createSuccessResponse, createErrorResponse } from '../utils/apiResponse';
import { openaiService } from '../services/ai/openaiService';

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
      let community;
      if (/^\d+$/.test(id)) {
        // It's a numeric ID
        community = await communityService.getCommunityDetails(id, userAddress);
      } else {
        // It's a slug
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
          errorCode: 'INTERNAL_ERROR'
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

      const posts = await communityService.getCommunityPosts({
        communityId: id,
        page: Number(page),
        limit: Number(limit),
        sort: sort as string,
        timeRange: timeRange as string
      });

      res.json(createSuccessResponse(posts, {}));
    } catch (error) {
      safeLogger.error('Error getting community posts:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve community posts'));
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
      const { content, mediaUrls = [], tags = [], pollData } = req.body;

      const post = await communityService.createCommunityPost({
        communityId: id,
        authorAddress: userAddress,
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
      const community = await communityService.getCommunityDetails(data.communityId, data.userAddress);
      
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
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found', 404));
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
        res.status(400).json(createErrorResponse('BAD_REQUEST', (result as any).message || 'Failed to moderate content', 400));
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

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to cast vote', 400));
      //   return;
      // }

      // res.json(createSuccessResponse((result as any).data || result, {}));
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
        category
      } = req.query;

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // res.json(createSuccessResponse(searchResults, {}));
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

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create delegation', 400));
      //   return;
      // }

      // res.status(201).json(createSuccessResponse((result as any).data || result, {}));
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

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to revoke delegation', 400));
      //   return;
      // }

      // res.json(createSuccessResponse(result, {}));
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

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // res.json(createSuccessResponse(delegations, {}));
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

      res.status(501).json(createErrorResponse('NOT_IMPLEMENTED', 'Method not implemented yet'));
      return;

      // if (!result.success) {
      //   res.status(400).json(createErrorResponse('BAD_REQUEST', result.message || 'Failed to create proxy vote', 400));
      //   return;
      // }

      // res.status(201).json(createSuccessResponse((result as any).data || result, {}));
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

      const content = await communityService.getTokenGatedContentByPost(Number(postId));

      if (!content) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Token-gated content not found', 404));
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
        userId: userAddress,
        communityId,
        tierId,
        paymentTxHash,
        metadata
      });

      res.status(201).json(createSuccessResponse(subscription, {}));
    } catch (error) {
      safeLogger.error('Error subscribing user:', error);
      if (error.message.includes('not found')) {
        res.status(404).json(createErrorResponse('NOT_FOUND', error.message, 404));
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
      const userAddress = (req as AuthenticatedRequest).user?.address;
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
}

export const communityController = new CommunityController();
