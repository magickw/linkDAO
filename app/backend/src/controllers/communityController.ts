import { Request, Response } from 'express';
import { communityService } from '../services/communityService';
import { apiResponse } from '../utils/apiResponse';

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

      res.json(apiResponse.success(communities, 'Communities retrieved successfully'));
    } catch (error) {
      console.error('Error listing communities:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve communities'));
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

      res.json(apiResponse.success(trendingCommunities, 'Trending communities retrieved successfully'));
    } catch (error) {
      console.error('Error getting trending communities:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve trending communities'));
    }
  }

  // Get community details
  async getCommunityDetails(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const userAddress = req.user?.address;

      const community = await communityService.getCommunityDetails(id, userAddress);

      if (!community) {
        res.status(404).json(apiResponse.error('Community not found', 404));
        return;
      }

      res.json(apiResponse.success(community, 'Community details retrieved successfully'));
    } catch (error) {
      console.error('Error getting community details:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community details'));
    }
  }

  // Create new community
  async createCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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

      res.status(201).json(apiResponse.success(community, 'Community created successfully'));
    } catch (error) {
      console.error('Error creating community:', error);
      if (error.message.includes('already exists')) {
        res.status(409).json(apiResponse.error('Community name already exists', 409));
      } else {
        res.status(500).json(apiResponse.error('Failed to create community'));
      }
    }
  }

  // Update community
  async updateCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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
        res.status(404).json(apiResponse.error('Community not found or unauthorized', 404));
        return;
      }

      res.json(apiResponse.success(updatedCommunity, 'Community updated successfully'));
    } catch (error) {
      console.error('Error updating community:', error);
      res.status(500).json(apiResponse.error('Failed to update community'));
    }
  }

  // Join community
  async joinCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await communityService.joinCommunity({
        communityId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error(result.message, 400));
        return;
      }

      res.json(apiResponse.success(result.data, 'Successfully joined community'));
    } catch (error) {
      console.error('Error joining community:', error);
      res.status(500).json(apiResponse.error('Failed to join community'));
    }
  }

  // Leave community
  async leaveCommunity(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const result = await communityService.leaveCommunity({
        communityId: id,
        userAddress
      });

      if (!result.success) {
        res.status(400).json(apiResponse.error(result.message, 400));
        return;
      }

      res.json(apiResponse.success(null, 'Successfully left community'));
    } catch (error) {
      console.error('Error leaving community:', error);
      res.status(500).json(apiResponse.error('Failed to leave community'));
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

      res.json(apiResponse.success(posts, 'Community posts retrieved successfully'));
    } catch (error) {
      console.error('Error getting community posts:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community posts'));
    }
  }

  // Create post in community
  async createCommunityPost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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
        res.status(400).json(apiResponse.error(post.message, 400));
        return;
      }

      res.status(201).json(apiResponse.success(post.data, 'Post created successfully'));
    } catch (error) {
      console.error('Error creating community post:', error);
      res.status(500).json(apiResponse.error('Failed to create post'));
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

      res.json(apiResponse.success(members, 'Community members retrieved successfully'));
    } catch (error) {
      console.error('Error getting community members:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community members'));
    }
  }

  // Get community statistics
  async getCommunityStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const stats = await communityService.getCommunityStats(id);

      if (!stats) {
        res.status(404).json(apiResponse.error('Community not found', 404));
        return;
      }

      res.json(apiResponse.success(stats, 'Community statistics retrieved successfully'));
    } catch (error) {
      console.error('Error getting community stats:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community statistics'));
    }
  }

  // Moderate content
  async moderateContent(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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
        res.status(400).json(apiResponse.error(result.message, 400));
        return;
      }

      res.json(apiResponse.success(result.data, 'Moderation action completed successfully'));
    } catch (error) {
      console.error('Error moderating content:', error);
      res.status(500).json(apiResponse.error('Failed to moderate content'));
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

      res.json(apiResponse.success(proposals, 'Governance proposals retrieved successfully'));
    } catch (error) {
      console.error('Error getting governance proposals:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve governance proposals'));
    }
  }

  // Create governance proposal
  async createGovernanceProposal(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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
        res.status(400).json(apiResponse.error(proposal.message, 400));
        return;
      }

      res.status(201).json(apiResponse.success(proposal.data, 'Governance proposal created successfully'));
    } catch (error) {
      console.error('Error creating governance proposal:', error);
      res.status(500).json(apiResponse.error('Failed to create governance proposal'));
    }
  }

  // Vote on governance proposal
  async voteOnProposal(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
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
        res.status(400).json(apiResponse.error(result.message, 400));
        return;
      }

      res.json(apiResponse.success(result.data, 'Vote cast successfully'));
    } catch (error) {
      console.error('Error voting on proposal:', error);
      res.status(500).json(apiResponse.error('Failed to cast vote'));
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

      res.json(apiResponse.success(searchResults, 'Community search completed successfully'));
    } catch (error) {
      console.error('Error searching communities:', error);
      res.status(500).json(apiResponse.error('Failed to search communities'));
    }
  }
}

export const communityController = new CommunityController();