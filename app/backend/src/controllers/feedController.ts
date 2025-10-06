import { Request, Response } from 'express';
import { feedService } from '../services/feedService';
import { apiResponse } from '../utils/apiResponse';

export class FeedController {
  // Get enhanced personalized feed
  async getEnhancedFeed(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const {
        page = 1,
        limit = 20,
        sort = 'hot',
        communities = [],
        timeRange = 'day'
      } = req.query;

      const feedData = await feedService.getEnhancedFeed({
        userAddress,
        page: Number(page),
        limit: Number(limit),
        sort: sort as string,
        communities: Array.isArray(communities) ? communities as string[] : [],
        timeRange: timeRange as string
      });

      res.json(apiResponse.success(feedData, 'Feed retrieved successfully'));
    } catch (error) {
      console.error('Error getting enhanced feed:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve feed'));
    }
  }

  // Get trending posts
  async getTrendingPosts(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 20,
        timeRange = 'day'
      } = req.query;

      const trendingPosts = await feedService.getTrendingPosts({
        page: Number(page),
        limit: Number(limit),
        timeRange: timeRange as string
      });

      res.json(apiResponse.success(trendingPosts, 'Trending posts retrieved successfully'));
    } catch (error) {
      console.error('Error getting trending posts:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve trending posts'));
    }
  }

  // Create new post
  async createPost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const {
        content,
        communityId,
        mediaUrls = [],
        tags = [],
        pollData
      } = req.body;

      const post = await feedService.createPost({
        authorAddress: userAddress,
        content,
        communityId,
        mediaUrls,
        tags,
        pollData
      });

      res.status(201).json(apiResponse.success(post, 'Post created successfully'));
    } catch (error) {
      console.error('Error creating post:', error);
      res.status(500).json(apiResponse.error('Failed to create post'));
    }
  }

  // Update post
  async updatePost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { content, tags } = req.body;

      const updatedPost = await feedService.updatePost({
        postId: id,
        userAddress,
        content,
        tags
      });

      if (!updatedPost) {
        res.status(404).json(apiResponse.error('Post not found or unauthorized', 404));
        return;
      }

      res.json(apiResponse.success(updatedPost, 'Post updated successfully'));
    } catch (error) {
      console.error('Error updating post:', error);
      res.status(500).json(apiResponse.error('Failed to update post'));
    }
  }

  // Delete post
  async deletePost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;

      const deleted = await feedService.deletePost({
        postId: id,
        userAddress
      });

      if (!deleted) {
        res.status(404).json(apiResponse.error('Post not found or unauthorized', 404));
        return;
      }

      res.json(apiResponse.success(null, 'Post deleted successfully'));
    } catch (error) {
      console.error('Error deleting post:', error);
      res.status(500).json(apiResponse.error('Failed to delete post'));
    }
  }

  // Add reaction to post
  async addReaction(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { type, tokenAmount = 0 } = req.body;

      const reaction = await feedService.addReaction({
        postId: id,
        userAddress,
        type,
        tokenAmount
      });

      res.json(apiResponse.success(reaction, 'Reaction added successfully'));
    } catch (error) {
      console.error('Error adding reaction:', error);
      res.status(500).json(apiResponse.error('Failed to add reaction'));
    }
  }

  // Send tip to post author
  async sendTip(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { amount, tokenType, message } = req.body;

      const tip = await feedService.sendTip({
        postId: id,
        fromAddress: userAddress,
        amount,
        tokenType,
        message
      });

      res.json(apiResponse.success(tip, 'Tip sent successfully'));
    } catch (error) {
      console.error('Error sending tip:', error);
      res.status(500).json(apiResponse.error('Failed to send tip'));
    }
  }

  // Get detailed engagement data
  async getEngagementData(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const engagementData = await feedService.getEngagementData(id);

      if (!engagementData) {
        res.status(404).json(apiResponse.error('Post not found', 404));
        return;
      }

      res.json(apiResponse.success(engagementData, 'Engagement data retrieved successfully'));
    } catch (error) {
      console.error('Error getting engagement data:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve engagement data'));
    }
  }

  // Share post
  async sharePost(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { targetType, targetId, message } = req.body;

      const shareResult = await feedService.sharePost({
        postId: id,
        userAddress,
        targetType,
        targetId,
        message
      });

      res.json(apiResponse.success(shareResult, 'Post shared successfully'));
    } catch (error) {
      console.error('Error sharing post:', error);
      res.status(500).json(apiResponse.error('Failed to share post'));
    }
  }

  // Get post comments
  async getPostComments(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const {
        page = 1,
        limit = 20,
        sort = 'newest'
      } = req.query;

      const comments = await feedService.getPostComments({
        postId: id,
        page: Number(page),
        limit: Number(limit),
        sort: sort as string
      });

      res.json(apiResponse.success(comments, 'Comments retrieved successfully'));
    } catch (error) {
      console.error('Error getting post comments:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve comments'));
    }
  }

  // Add comment to post
  async addComment(req: Request, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { id } = req.params;
      const { content, parentCommentId } = req.body;

      const comment = await feedService.addComment({
        postId: id,
        userAddress,
        content,
        parentCommentId
      });

      res.status(201).json(apiResponse.success(comment, 'Comment added successfully'));
    } catch (error) {
      console.error('Error adding comment:', error);
      res.status(500).json(apiResponse.error('Failed to add comment'));
    }
  }
}

export const feedController = new FeedController();