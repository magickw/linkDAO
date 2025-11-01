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

const router = express.Router();

/**
 * @route   GET /api/content-performance/posts/:postId
 * @desc    Get performance metrics for a specific post
 * @access  Public
 */
router.get('/posts/:postId', getPostPerformance);

/**
 * @route   POST /api/content-performance/posts/batch
 * @desc    Get performance metrics for multiple posts
 * @access  Public
 */
router.post('/posts/batch', csrfProtection,  getPostsPerformance);

/**
 * @route   GET /api/content-performance/trending
 * @desc    Get trending content
 * @access  Public
 */
router.get('/trending', getTrendingContent);

/**
 * @route   GET /api/content-performance/quality/:postId
 * @desc    Get content quality metrics
 * @access  Public
 */
router.get('/quality/:postId', getContentQuality);

/**
 * @route   GET /api/content-performance/sharing/:postId
 * @desc    Get content sharing analytics
 * @access  Public
 */
router.get('/sharing/:postId', getContentSharingAnalytics);

/**
 * @route   GET /api/content-performance/user
 * @desc    Get user content performance summary
 * @access  Private
 */
router.get('/user', authenticateToken, getUserContentPerformance);

/**
 * @route   POST /api/content-performance/track-view
 * @desc    Track content view event
 * @access  Private
 */
router.post('/track-view', csrfProtection,  authenticateToken, trackContentView);

export default router;
