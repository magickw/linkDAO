import express from 'express';
import {
  getMemberBehaviorMetrics,
  getEngagementPatterns,
  getCohortAnalysis,
  getBehavioralInsights,
  getMemberSegment,
  trackBehaviorEvent
} from '../controllers/memberBehaviorController';
import { authenticateToken } from '../middleware/auth';

const router = express.Router();

/**
 * @route   GET /api/member-behavior/metrics
 * @desc    Get member behavior metrics
 * @access  Private
 */
router.get('/metrics', authenticateToken, getMemberBehaviorMetrics);

/**
 * @route   GET /api/member-behavior/patterns
 * @desc    Get engagement patterns
 * @access  Private
 */
router.get('/patterns', authenticateToken, getEngagementPatterns);

/**
 * @route   GET /api/member-behavior/cohort-analysis
 * @desc    Get cohort analysis
 * @access  Public
 */
router.get('/cohort-analysis', getCohortAnalysis);

/**
 * @route   GET /api/member-behavior/insights
 * @desc    Get behavioral insights
 * @access  Public
 */
router.get('/insights', getBehavioralInsights);

/**
 * @route   GET /api/member-behavior/segment
 * @desc    Get member segment
 * @access  Private
 */
router.get('/segment', authenticateToken, getMemberSegment);

/**
 * @route   POST /api/member-behavior/track
 * @desc    Track user behavior event
 * @access  Private
 */
router.post('/track', authenticateToken, trackBehaviorEvent);

export default router;