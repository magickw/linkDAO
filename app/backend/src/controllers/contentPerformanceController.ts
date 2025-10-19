import { Request, Response } from 'express';
import contentPerformanceService from '../services/contentPerformanceService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get performance metrics for a specific post
 */
export const getPostPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    
    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }
    
    const metrics = await contentPerformanceService.getPostPerformanceMetrics(postId);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting post performance:', error);
    res.status(500).json({ error: 'Failed to retrieve post performance metrics' });
  }
};

/**
 * Get performance metrics for multiple posts
 */
export const getPostsPerformance = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postIds } = req.body;
    
    if (!postIds || !Array.isArray(postIds)) {
      res.status(400).json({ error: 'Post IDs array is required' });
      return;
    }
    
    // Parse time range from query parameters
    const { start, end } = req.query;
    const timeRange = start && end ? {
      start: new Date(start as string),
      end: new Date(end as string)
    } : undefined;
    
    const metrics = await contentPerformanceService.getPostsPerformanceMetrics(postIds, timeRange);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error getting posts performance:', error);
    res.status(500).json({ error: 'Failed to retrieve posts performance metrics' });
  }
};

/**
 * Get trending content
 */
export const getTrendingContent = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 20;
    
    // Parse time range from query parameters
    const { start, end } = req.query;
    const timeRange = start && end ? {
      start: new Date(start as string),
      end: new Date(end as string)
    } : {
      start: new Date(Date.now() - 24 * 60 * 60 * 1000),
      end: new Date()
    };
    
    const trendingContent = await contentPerformanceService.getTrendingContent(limitNum, timeRange);
    
    res.json({
      success: true,
      data: trendingContent
    });
  } catch (error) {
    console.error('Error getting trending content:', error);
    res.status(500).json({ error: 'Failed to retrieve trending content' });
  }
};

/**
 * Get content quality metrics
 */
export const getContentQuality = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    
    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }
    
    const qualityMetrics = await contentPerformanceService.getContentQualityMetrics(postId);
    
    res.json({
      success: true,
      data: qualityMetrics
    });
  } catch (error) {
    console.error('Error getting content quality:', error);
    res.status(500).json({ error: 'Failed to retrieve content quality metrics' });
  }
};

/**
 * Get content sharing analytics
 */
export const getContentSharingAnalytics = async (req: Request, res: Response): Promise<void> => {
  try {
    const { postId } = req.params;
    
    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }
    
    const sharingAnalytics = await contentPerformanceService.getContentSharingAnalytics(postId);
    
    res.json({
      success: true,
      data: sharingAnalytics
    });
  } catch (error) {
    console.error('Error getting content sharing analytics:', error);
    res.status(500).json({ error: 'Failed to retrieve content sharing analytics' });
  }
};

/**
 * Get user content performance summary
 */
export const getUserContentPerformance = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const performanceSummary = await contentPerformanceService.getUserContentPerformanceSummary(userId);
    
    res.json({
      success: true,
      data: performanceSummary
    });
  } catch (error) {
    console.error('Error getting user content performance:', error);
    res.status(500).json({ error: 'Failed to retrieve user content performance summary' });
  }
};

/**
 * Track content view event
 */
export const trackContentView = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    const { postId } = req.body;
    
    if (!postId) {
      res.status(400).json({ error: 'Post ID is required' });
      return;
    }
    
    // In a real implementation, this would insert into the views table
    // For now, we'll just log the event
    console.log('Tracking content view:', {
      userId,
      postId
    });
    
    res.json({
      success: true,
      message: 'Content view tracked successfully'
    });
  } catch (error) {
    console.error('Error tracking content view:', error);
    res.status(500).json({ error: 'Failed to track content view' });
  }
};