import { Request, Response } from 'express';
import { FollowService } from '../services/followService';
import { AppError, ValidationError } from '../middleware/errorHandler';

const followService = new FollowService();

export class FollowController {
  async follow(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        throw new ValidationError('Both follower and following addresses are required');
      }
      
      if (follower === following) {
        throw new ValidationError('Cannot follow yourself');
      }
      
      const result = await followService.follow(follower, following);
      
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
      
      const result = await followService.unfollow(follower, following);
      
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
      const followers = await followService.getFollowers(address);
      return res.json(followers);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOWERS_ERROR');
    }
  }

  async getFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const following = await followService.getFollowing(address);
      return res.json(following);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOWING_ERROR');
    }
  }

  async isFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.params;
      const isFollowing = await followService.isFollowing(follower, following);
      return res.json({ isFollowing });
    } catch (error: any) {
      throw new AppError(error.message, 500, 'IS_FOLLOWING_ERROR');
    }
  }

  async getFollowCount(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const count = await followService.getFollowCount(address);
      return res.json(count);
    } catch (error: any) {
      throw new AppError(error.message, 500, 'FOLLOW_COUNT_ERROR');
    }
  }
}