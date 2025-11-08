/// <reference path="../types/express.d.ts" />
import { Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { feedService } from '../services/feedService';
import { apiResponse } from '../utils/apiResponse';
import { MetadataService } from '../services/metadataService';

export class FeedController {
  // Get enhanced personalized feed (optional authentication)
  async getEnhancedFeed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address; // Optional - can be undefined for anonymous users

      const {
        page = 1,
        limit = 20,
        sort = 'hot',
        communities = [],
        timeRange = 'day',
        feedSource = 'all' // New parameter for following feed
      } = req.query;

      // If user is not authenticated and requests 'following' feed, return empty result
      if (!userAddress && feedSource === 'following') {
        res.json(apiResponse.success({
          posts: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          },
          message: 'Please log in to see posts from accounts you follow'
        }, 'Authentication required for following feed'));
        return;
      }

      try {
        const feedData = await feedService.getEnhancedFeed({
          userAddress: userAddress || null, // Pass null for anonymous users
          page: Number(page),
          limit: Number(limit),
          sort: sort as string,
          communities: Array.isArray(communities) ? communities as string[] : [],
          timeRange: timeRange as string,
          feedSource: feedSource as 'following' | 'all'
        });

        res.json(apiResponse.success(feedData, 'Feed retrieved successfully'));
      } catch (serviceError) {
        safeLogger.error('Feed service error:', serviceError);
        
        // Return fallback empty feed instead of error
        res.json(apiResponse.success({
          posts: [],
          pagination: {
            page: Number(page),
            limit: Number(limit),
            total: 0,
            totalPages: 0
          },
          message: 'Feed temporarily unavailable. Please try again later.'
        }, 'Feed service temporarily unavailable'));
      }
    } catch (error) {
      safeLogger.error('Error getting enhanced feed:', error);
      
      // Return fallback response instead of error
      res.json(apiResponse.success({
        posts: [],
        pagination: {
          page: 1,
          limit: 20,
          total: 0,
          totalPages: 0
        },
        message: 'Feed temporarily unavailable. Please try again later.'
      }, 'Feed temporarily unavailable'));
    }
  }

  // Get trending posts
  async getTrendingPosts(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error getting trending posts:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve trending posts'));
    }
  }

  // Create new post
  async createPost(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error creating post:', error);
      res.status(500).json(apiResponse.error('Failed to create post'));
    }
  }

  // Update post
  async updatePost(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error updating post:', error);
      res.status(500).json(apiResponse.error('Failed to update post'));
    }
  }

  // Delete post
  async deletePost(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error deleting post:', error);
      res.status(500).json(apiResponse.error('Failed to delete post'));
    }
  }

  // Add reaction to post
  async addReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error adding reaction:', error);
      res.status(500).json(apiResponse.error('Failed to add reaction'));
    }
  }

  // Send tip to post author
  async sendTip(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error sending tip:', error);
      res.status(500).json(apiResponse.error('Failed to send tip'));
    }
  }

  // Get detailed engagement data
  async getEngagementData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const engagementData = await feedService.getEngagementData(id);

      if (!engagementData) {
        res.status(404).json(apiResponse.error('Post not found', 404));
        return;
      }

      res.json(apiResponse.success(engagementData, 'Engagement data retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting engagement data:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve engagement data'));
    }
  }

  // Share post
  async sharePost(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error sharing post:', error);
      res.status(500).json(apiResponse.error('Failed to share post'));
    }
  }

  // Get post comments
  async getPostComments(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error getting post comments:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve comments'));
    }
  }

  // Add comment to post
  async addComment(req: AuthenticatedRequest, res: Response): Promise<void> {
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
      safeLogger.error('Error adding comment:', error);
      res.status(500).json(apiResponse.error('Failed to add comment'));
    }
  }

  // Get community engagement metrics
  async getCommunityEngagementMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { communityId } = req.params;
      const { timeRange = 'week' } = req.query;

      const metrics = await feedService.getCommunityEngagementMetrics(
        communityId,
        timeRange as string
      );

      res.json(apiResponse.success(metrics, 'Community engagement metrics retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting community engagement metrics:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community engagement metrics'));
    }
  }

  // Get community leaderboard
  async getCommunityLeaderboard(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { communityId } = req.params;
      const { metric, limit = 10 } = req.query;

      const leaderboard = await feedService.getCommunityLeaderboard(
        communityId,
        metric as 'posts' | 'engagement' | 'tips_received' | 'tips_given',
        Number(limit)
      );

      res.json(apiResponse.success(leaderboard, 'Community leaderboard retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting community leaderboard:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve community leaderboard'));
    }
  }

  // Get liked by data for post
  async getLikedByData(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const likedByData = await feedService.getLikedByData(postId);

      res.json(apiResponse.success(likedByData, 'Liked by data retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting liked by data:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve liked by data'));
    }
  }

  // Get trending hashtags
  async getTrendingHashtags(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        limit = 10,
        timeRange = 'day'
      } = req.query;

      const trendingHashtags = await feedService.getTrendingHashtags({
        limit: Number(limit),
        timeRange: timeRange as string
      });

      res.json(apiResponse.success(trendingHashtags, 'Trending hashtags retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting trending hashtags:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve trending hashtags'));
    }
  }

  // Get content popularity metrics
  async getContentPopularityMetrics(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const popularityMetrics = await feedService.getContentPopularityMetrics(postId);

      if (!popularityMetrics) {
        res.status(404).json(apiResponse.error('Post not found', 404));
        return;
      }

      res.json(apiResponse.success(popularityMetrics, 'Content popularity metrics retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting content popularity metrics:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve content popularity metrics'));
    }
  }

  // Get comment replies
  async getCommentReplies(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { commentId } = req.params;
      const {
        page = 1,
        limit = 10,
        sort = 'newest'
      } = req.query;

      const replies = await feedService.getCommentReplies(commentId, {
        page: Number(page),
        limit: Number(limit),
        sort: sort as string
      });

      res.json(apiResponse.success(replies, 'Comment replies retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting comment replies:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve comment replies'));
    }
  }

  // Get post reactions
  async getPostReactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { postId } = req.params;

      const reactions = await feedService.getPostReactions(postId);

      res.json(apiResponse.success(reactions, 'Post reactions retrieved successfully'));
    } catch (error) {
      safeLogger.error('Error getting post reactions:', error);
      res.status(500).json(apiResponse.error('Failed to retrieve post reactions'));
    }
  }

  // Share post
  async sharePostEnhanced(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { postId } = req.params;
      const { platform, message } = req.body;

      const shareResult = await feedService.addPostShare({
        postId,
        userAddress,
        platform,
        message
      });

      res.json(apiResponse.success(shareResult, 'Post shared successfully'));
    } catch (error) {
      safeLogger.error('Error sharing post:', error);
      res.status(500).json(apiResponse.error('Failed to share post'));
    }
  }

  // Toggle bookmark
  async toggleBookmark(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const userAddress = req.user?.address;
      if (!userAddress) {
        res.status(401).json(apiResponse.error('Authentication required', 401));
        return;
      }

      const { postId } = req.params;

      const bookmarkResult = await feedService.toggleBookmark({
        postId,
        userAddress
      });

      res.json(apiResponse.success(bookmarkResult, 'Bookmark toggled successfully'));
    } catch (error) {
      safeLogger.error('Error toggling bookmark:', error);
      res.status(500).json(apiResponse.error('Failed to toggle bookmark'));
    }
  }

  // Get content from IPFS by CID
  async getContentFromIPFS(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { cid } = req.params;

      // Validate CID format (basic validation)
      if (!cid || cid.length < 46 || cid.length > 64) {
        res.status(400).json(apiResponse.error('Invalid CID format', 400));
        return;
      }

      try {
        // Create metadata service instance
        const metadataService = new MetadataService();
        const content = await metadataService.getFromIPFS(cid);
        
        res.json(apiResponse.success({ content, cid }, 'Content retrieved successfully'));
      } catch (ipfsError) {
        safeLogger.error('Error retrieving content from IPFS:', ipfsError);
        res.status(500).json(apiResponse.error('Failed to retrieve content from IPFS'));
      }
    } catch (error) {
      safeLogger.error('Error in getContentFromIPFS:', error);
      res.status(500).json(apiResponse.error('Internal server error'));
    }
  }
}

export const feedController = new FeedController();
