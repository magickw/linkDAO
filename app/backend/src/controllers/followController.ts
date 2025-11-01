import { Request, Response } from 'express';
import { FollowService } from '../services/followService';
import { AppError, ValidationError } from '../middleware/errorHandler';
import { sanitizeWalletAddress } from '../utils/inputSanitization';

const followService = new FollowService();

export class FollowController {
  async follow(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        throw new ValidationError('Both follower and following addresses are required');
      }
      
      // Validate and sanitize wallet addresses
      const sanitizedFollower = sanitizeWalletAddress(follower);
      const sanitizedFollowing = sanitizeWalletAddress(following);
      
      if (sanitizedFollower === sanitizedFollowing) {
        throw new ValidationError('Cannot follow yourself');
      }
      
      const result = await followService.follow(sanitizedFollower, sanitizedFollowing);
      
      if (result) {
        return res.status(201).json({ message: 'Successfully followed' });
      } else {
        throw new ValidationError('Already following this user');
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'FOLLOW_ERROR');
    }
  }

  async unfollow(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        throw new ValidationError('Both follower and following addresses are required');
      }
      
      // Validate and sanitize wallet addresses
      const sanitizedFollower = sanitizeWalletAddress(follower);
      const sanitizedFollowing = sanitizeWalletAddress(following);
      
      const result = await followService.unfollow(sanitizedFollower, sanitizedFollowing);
      
      if (result) {
        return res.json({ message: 'Successfully unfollowed' });
      } else {
        throw new ValidationError('Not following this user');
      }
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError(error.message, 500, 'UNFOLLOW_ERROR');
    }
  }

  async getFollowers(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const followers = await followService.getFollowers(sanitizedAddress);
      return res.json(followers);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOWERS_ERROR');
    }
  }

  async getFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const following = await followService.getFollowing(sanitizedAddress);
      return res.json(following);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOWING_ERROR');
    }
  }

  async isFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.params;
      const sanitizedFollower = sanitizeWalletAddress(follower);
      const sanitizedFollowing = sanitizeWalletAddress(following);
      const isFollowing = await followService.isFollowing(sanitizedFollower, sanitizedFollowing);
      return res.json({ isFollowing });
    } catch (error: any) {
      throw new AppError(error.message, 500, 'IS_FOLLOWING_ERROR');
    }
  }

  async getFollowCount(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const sanitizedAddress = sanitizeWalletAddress(address);
      const count = await followService.getFollowCount(sanitizedAddress);
      return res.json(count);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOW_COUNT_ERROR');
    }
  }
}
