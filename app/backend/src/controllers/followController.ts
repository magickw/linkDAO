import { Request, Response } from 'express';
import { FollowService } from '../services/followService';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { sanitizeWalletAddress } from '../utils/inputSanitization';

const followService = new FollowService();

export class FollowController {
  async follow(req: Request, res: Response): Promise<void> {
    try {
      const { follower, following } = req.body;

      console.log('[FollowController] follow request:', { follower, following });

      if (!follower || !following) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Both follower and following addresses are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate and sanitize wallet addresses
      let sanitizedFollower, sanitizedFollowing;
      try {
        sanitizedFollower = sanitizeWalletAddress(follower);
        sanitizedFollowing = sanitizeWalletAddress(following);
      } catch (validationError: any) {
        console.warn('[FollowController] Follow validation failed:', validationError.message);
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: validationError.message || 'Invalid wallet address format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      if (sanitizedFollower === sanitizedFollowing) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Cannot follow yourself',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await followService.follow(sanitizedFollower, sanitizedFollowing);

      if (result) {
        res.status(201).json({ message: 'Successfully followed' });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Already following this user',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error in follow:', error);
      res.status(500).json({
        error: 'FOLLOW_ERROR',
        message: error.message || 'Failed to follow user',
        timestamp: new Date().toISOString()
      });
    }
  }

  async unfollow(req: Request, res: Response): Promise<void> {
    try {
      const { follower, following } = req.body;

      console.log('[FollowController] unfollow request:', { follower, following });

      if (!follower || !following) {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Both follower and following addresses are required',
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Validate and sanitize wallet addresses
      let sanitizedFollower, sanitizedFollowing;
      try {
        sanitizedFollower = sanitizeWalletAddress(follower);
        sanitizedFollowing = sanitizeWalletAddress(following);
      } catch (validationError: any) {
        console.warn('[FollowController] Unfollow validation failed:', validationError.message);
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: validationError.message || 'Invalid wallet address format',
          timestamp: new Date().toISOString()
        });
        return;
      }

      const result = await followService.unfollow(sanitizedFollower, sanitizedFollowing);

      if (result) {
        res.json({ message: 'Successfully unffollowed' });
      } else {
        res.status(400).json({
          error: 'VALIDATION_ERROR',
          message: 'Not following this user',
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('Error in unfollow:', error);
      res.status(500).json({
        error: 'UNFOLLOW_ERROR',
        message: error.message || 'Failed to unfollow user',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getFollowers(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const followers = await followService.getFollowers(sanitizedAddress);
      res.json(followers);
    } catch (error: any) {
      console.error('Error in getFollowers:', error);
      res.status(500).json({
        error: 'FOLLOWERS_ERROR',
        message: error.message || 'Failed to get followers',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const following = await followService.getFollowing(sanitizedAddress);
      res.json(following);
    } catch (error: any) {
      console.error('Error in getFollowing:', error);
      res.status(500).json({
        error: 'FOLLOWING_ERROR',
        message: error.message || 'Failed to get following',
        timestamp: new Date().toISOString()
      });
    }
  }

  async isFollowing(req: Request, res: Response): Promise<void> {
    try {
      const { follower, following } = req.params;
      const sanitizedFollower = sanitizeWalletAddress(follower);
      const sanitizedFollowing = sanitizeWalletAddress(following);
      const isFollowing = await followService.isFollowing(sanitizedFollower, sanitizedFollowing);
      res.json({ isFollowing });
    } catch (error: any) {
      console.error('Error in isFollowing:', error);
      res.status(500).json({
        error: 'IS_FOLLOWING_ERROR',
        message: error.message || 'Failed to check following status',
        timestamp: new Date().toISOString()
      });
    }
  }

  async getFollowCount(req: Request, res: Response): Promise<void> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const count = await followService.getFollowCount(sanitizedAddress);
      res.json(count);
    } catch (error: any) {
      console.error('Error in getFollowCount:', error);
      res.status(500).json({
        error: 'FOLLOW_COUNT_ERROR',
        message: error.message || 'Failed to get follow count',
        timestamp: new Date().toISOString()
      });
    }
  }
}
