import { Request, Response } from 'express';
import { FollowService } from '../services/followService';

const followService = new FollowService();

export class FollowController {
  async follow(req: Request, res: Response) {
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
        res.status(201).json({ message: 'Successfully followed' });
      } else {
        res.status(400).json({ error: 'Already following this user' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async unfollow(req: Request, res: Response) {
    try {
      const { follower, following } = req.body;
      
      if (!follower || !following) {
        return res.status(400).json({ error: 'Both follower and following addresses are required' });
      }
      
      const result = await followService.unfollow(follower, following);
      
      if (result) {
        res.json({ message: 'Successfully unfollowed' });
      } else {
        res.status(400).json({ error: 'Not following this user' });
      }
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFollowers(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const followers = await followService.getFollowers(address);
      res.json(followers);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFollowing(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const following = await followService.getFollowing(address);
      res.json(following);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async isFollowing(req: Request, res: Response) {
    try {
      const { follower, following } = req.params;
      const isFollowing = await followService.isFollowing(follower, following);
      res.json({ isFollowing });
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }

  async getFollowCount(req: Request, res: Response) {
    try {
      const { address } = req.params;
      const count = await followService.getFollowCount(address);
      res.json(count);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  }
}