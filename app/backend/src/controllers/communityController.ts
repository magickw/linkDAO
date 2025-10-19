import { Request, Response } from 'express';
import { communityService } from '../services/communityService';
import { apiResponse, createSuccessResponse, createErrorResponse } from '../utils/apiResponse';

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
      console.error('Error listing communities:', error);
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
      console.error('Error getting trending communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to retrieve trending communities'));
    }
  }

  // Get community details
  async getCommunityDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = (req as AuthenticatedRequest).user?.address;

      const community = await communityService.getCommunityDetails(id, userAddress);

      if (!community) {
        res.status(404).json(createErrorResponse('NOT_FOUND', 'Community not found', 404));
        return;
      }

      res.json(createSuccessResponse(community, {}));
    } catch (error) {
      console.error('Error getting community details:', error);
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
      console.error('Error creating community:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(createErrorResponse('CONFLICT', 'Community name already exists', 409));
      } else {
        res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create community'));
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
      console.error('Error updating community:', error);
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
      console.error('Error joining community:', error);
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
      console.error('Error leaving community:', error);
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
      console.error('Error getting community posts:', error);
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
      console.error('Error creating community post:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to create post'));
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
      console.error('Error getting community members:', error);
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
      console.error('Error getting community stats:', error);
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

      res.json(createSuccessResponse(result.data, {}));
    } catch (error) {
      console.error('Error moderating content:', error);
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
      console.error('Error getting governance proposals:', error);
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
      console.error('Error creating governance proposal:', error);
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
      console.error('Error voting on proposal:', error);
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
      console.error('Error executing proposal:', error);
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
      console.error('Error getting moderation queue:', error);
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
      console.error('Error flagging content:', error);
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

      const searchResults = await communityService.searchCommunities({
        query: q as string,
        page: Number(page),
        limit: Number(limit),
        category: category as string
      });

      res.json(createSuccessResponse(searchResults, {}));
    } catch (error) {
      console.error('Error searching communities:', error);
      res.status(500).json(createErrorResponse('INTERNAL_ERROR', 'Failed to search communities'));
    }
  }
}

export const communityController = new CommunityController();