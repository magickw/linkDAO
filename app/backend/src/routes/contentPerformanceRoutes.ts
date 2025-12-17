import express from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import {
  getPostPerformance,
  getPostsPerformance,
  getTrendingContent,
  getContentQuality,
  getContentSharingAnalytics,
  getUserContentPerformance,
  trackContentView
} from '../controllers/contentPerformanceController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

// Rate limiting for content performance endpoints
const contentPerformanceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxRequests: 200, // 200 requests per minute
  message: {
    success: false,
    error: {
      code: 'CONTENT_PERFORMANCE_RATE_LIMIT_EXCEEDED',
      message: 'Too many content performance requests, please try again later',
    }
  }
});

const router = express.Router();

/**
 * @route   GET /api/content-performance/posts/:postId
 * @desc    Get performance metrics for a specific post
 * @access  Public
 */
router.get('/posts/:postId', contentPerformanceRateLimit, getPostPerformance);

/**
 * @route   POST /api/content-performance/posts/batch
 * @desc    Get performance metrics for multiple posts
 * @access  Public
 */
router.post('/posts/batch', contentPerformanceRateLimit, csrfProtection,  getPostsPerformance);

/**
 * @route   GET /api/content-performance/trending
 * @desc    Get trending content
 * @access  Public
 */
router.get('/trending', contentPerformanceRateLimit, getTrendingContent);

/**
 * @route   GET /api/content-performance/quality/:postId
 * @desc    Get content quality metrics
 * @access  Public
 */
router.get('/quality/:postId', contentPerformanceRateLimit, getContentQuality);

/**
 * @route   GET /api/content-performance/sharing/:postId
 * @desc    Get content sharing analytics
 * @access  Public
 */
router.get('/sharing/:postId', contentPerformanceRateLimit, getContentSharingAnalytics);

/**
 * @route   GET /api/content-performance/user
 * @desc    Get user content performance summary
 * @access  Private
 */
router.get('/user', contentPerformanceRateLimit, authenticateToken, getUserContentPerformance);

/**
 * @route   POST /api/content-performance/track-view
 * @desc    Track content view event
 * @access  Private
 */
router.post('/track-view', contentPerformanceRateLimit, csrfProtection,  authenticateToken, trackContentView);

export default router;
