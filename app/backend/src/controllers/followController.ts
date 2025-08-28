import { Request, Response } from 'express';
import { FollowService } from '../services/followService';

const followService = new FollowService();

export class FollowController {
  async follow(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        return res.status(400).json({ error: 'Both follower and following addresses are required' });
      }
      
      if (follower === following) {
        return res.status(400).json({ error: 'Cannot follow yourself' });
      }
      
      const result = await followService.follow(follower, following);
      
      if (result) {
        return res.status(201).json({ message: 'Successfully followed' });
      } else {
        return res.status(400).json({ error: 'Already following this user' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async unfollow(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        return res.status(400).json({ error: 'Both follower and following addresses are required' });
      }
      
      const result = await followService.unfollow(follower, following);
      
      if (result) {
        return res.json({ message: 'Successfully unfollowed' });
      } else {
        return res.status(400).json({ error: 'Not following this user' });
      }
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getFollowers(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const followers = await followService.getFollowers(address);
      return res.json(followers);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const following = await followService.getFollowing(address);
      return res.json(following);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async isFollowing(req: Request, res: Response): Promise<Response> {
    try {
      const { follower, following } = req.params;
      const isFollowing = await followService.isFollowing(follower, following);
      return res.json({ isFollowing });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  async getFollowCount(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      const count = await followService.getFollowCount(address);
      return res.json(count);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}