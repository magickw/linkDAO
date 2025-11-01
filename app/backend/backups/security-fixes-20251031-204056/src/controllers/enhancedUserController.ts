import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { EnhancedUserService, UserRecommendationFilters, UserSearchFilters } from '../services/enhancedUserService';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

export class EnhancedUserController {
  private userService: EnhancedUserService;

  constructor() {
    this.userService = new EnhancedUserService();
  }

  /**
   * Get user profile by ID
   */
  async getUserProfile(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const profile = await this.userService.getUserProfile(userId);

      if (!profile) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error in getUserProfile:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user profile by wallet address
   */
  async getUserProfileByAddress(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;

      if (!address) {
        res.status(400).json({ error: 'Wallet address is required' });
        return;
      }

      const profile = await this.userService.getUserProfileByAddress(address);

      if (!profile) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error in getUserProfileByAddress:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get user profile by handle
   */
  async getUserProfileByHandle(req: Request, res: Response): Promise<void> {
    try {
      const { handle } = req.params;

      if (!handle) {
        res.status(400).json({ error: 'Handle is required' });
        return;
      }

      const profile = await this.userService.getUserProfileByHandle(handle);

      if (!profile) {
        res.status(404).json({ error: 'User not found' });
        return;
      }

      res.json({ success: true, data: profile });
    } catch (error) {
      safeLogger.error('Error in getUserProfileByHandle:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get suggested users for a user
   */
  async getSuggestedUsers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const {
        minReputationScore,
        maxResults,
        excludeFollowed,
        communityId,
      } = req.query;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const filters: UserRecommendationFilters = {
        minReputationScore: minReputationScore ? parseInt(minReputationScore as string) : undefined,
        maxResults: maxResults ? parseInt(maxResults as string) : undefined,
        excludeFollowed: excludeFollowed === 'true',
        communityId: communityId as string,
      };

      const suggestions = await this.userService.getSuggestedUsers(userId, filters);

      res.json({ success: true, data: suggestions });
    } catch (error) {
      safeLogger.error('Error in getSuggestedUsers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Search users
   */
  async searchUsers(req: Request, res: Response): Promise<void> {
    try {
      const {
        query,
        minFollowers,
        minReputationScore,
        maxResults,
        sortBy,
      } = req.query;

      if (!query) {
        res.status(400).json({ error: 'Search query is required' });
        return;
      }

      const filters: UserSearchFilters = {
        query: query as string,
        minFollowers: minFollowers ? parseInt(minFollowers as string) : undefined,
        minReputationScore: minReputationScore ? parseInt(minReputationScore as string) : undefined,
        maxResults: maxResults ? parseInt(maxResults as string) : undefined,
        sortBy: sortBy as 'relevance' | 'followers' | 'reputation' | 'recent',
      };

      const results = await this.userService.searchUsers(filters);

      res.json({ success: true, data: results });
    } catch (error) {
      safeLogger.error('Error in searchUsers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Follow a user
   */
  async followUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, targetUserId } = req.params;

      if (!userId || !targetUserId) {
        res.status(400).json({ error: 'Both user IDs are required' });
        return;
      }

      const success = await this.userService.followUser(userId, targetUserId);

      if (!success) {
        res.status(400).json({ error: 'Unable to follow user (already following or same user)' });
        return;
      }

      res.json({ success: true, message: 'User followed successfully' });
    } catch (error) {
      safeLogger.error('Error in followUser:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Unfollow a user
   */
  async unfollowUser(req: Request, res: Response): Promise<void> {
    try {
      const { userId, targetUserId } = req.params;

      if (!userId || !targetUserId) {
        res.status(400).json({ error: 'Both user IDs are required' });
        return;
      }

      const success = await this.userService.unfollowUser(userId, targetUserId);

      if (!success) {
        res.status(400).json({ error: 'Unable to unfollow user' });
        return;
      }

      res.json({ success: true, message: 'User unfollowed successfully' });
    } catch (error) {
      safeLogger.error('Error in unfollowUser:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get followers of a user
   */
  async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit } = req.query;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const followers = await this.userService.getFollowers(
        userId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ success: true, data: followers });
    } catch (error) {
      safeLogger.error('Error in getFollowers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get users that a user is following
   */
  async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { limit } = req.query;

      if (!userId) {
        res.status(400).json({ error: 'User ID is required' });
        return;
      }

      const following = await this.userService.getFollowing(
        userId,
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ success: true, data: following });
    } catch (error) {
      safeLogger.error('Error in getFollowing:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Check if user A is following user B
   */
  async checkFollowStatus(req: Request, res: Response): Promise<void> {
    try {
      const { userId, targetUserId } = req.params;

      if (!userId || !targetUserId) {
        res.status(400).json({ error: 'Both user IDs are required' });
        return;
      }

      const isFollowing = await this.userService.isFollowing(userId, targetUserId);

      res.json({ success: true, data: { isFollowing } });
    } catch (error) {
      safeLogger.error('Error in checkFollowStatus:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }

  /**
   * Get trending users
   */
  async getTrendingUsers(req: Request, res: Response): Promise<void> {
    try {
      const { limit } = req.query;

      const trendingUsers = await this.userService.getTrendingUsers(
        limit ? parseInt(limit as string) : undefined
      );

      res.json({ success: true, data: trendingUsers });
    } catch (error) {
      safeLogger.error('Error in getTrendingUsers:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}