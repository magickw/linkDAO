/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import memberBehaviorAnalyticsService from '../services/memberBehaviorAnalyticsService';
import { AuthenticatedRequest } from '../middleware/auth';

/**
 * Get member behavior metrics
 */
export const getMemberBehaviorMetrics = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    // Parse time range from query parameters
    const { start, end } = req.query;
    const timeRange = {
      start: start ? new Date(start as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
      end: end ? new Date(end as string) : new Date()
    };
    
    const metrics = await memberBehaviorAnalyticsService.getMemberBehaviorMetrics(userId, timeRange);
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    safeLogger.error('Error getting member behavior metrics:', error);
    res.status(500).json({ error: 'Failed to retrieve member behavior metrics' });
  }
};

/**
 * Get engagement patterns
 */
export const getEngagementPatterns = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const patterns = await memberBehaviorAnalyticsService.getEngagementPatterns(userId);
    
    res.json({
      success: true,
      data: patterns
    });
  } catch (error) {
    safeLogger.error('Error getting engagement patterns:', error);
    res.status(500).json({ error: 'Failed to retrieve engagement patterns' });
  }
};

/**
 * Get cohort analysis
 */
export const getCohortAnalysis = async (req: Request, res: Response): Promise<void> => {
  try {
    const { months } = req.query;
    const cohortMonths = months ? parseInt(months as string) : 6;
    
    const analysis = await memberBehaviorAnalyticsService.getCohortAnalysis(cohortMonths);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    safeLogger.error('Error getting cohort analysis:', error);
    res.status(500).json({ error: 'Failed to retrieve cohort analysis' });
  }
};

/**
 * Get behavioral insights
 */
export const getBehavioralInsights = async (req: Request, res: Response): Promise<void> => {
  try {
    const { limit } = req.query;
    const insightsLimit = limit ? parseInt(limit as string) : 10;
    
    const insights = await memberBehaviorAnalyticsService.generateBehavioralInsights(insightsLimit);
    
    res.json({
      success: true,
      data: insights
    });
  } catch (error) {
    safeLogger.error('Error getting behavioral insights:', error);
    res.status(500).json({ error: 'Failed to retrieve behavioral insights' });
  }
};

/**
 * Get member segment
 */
export const getMemberSegment = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const segment = await memberBehaviorAnalyticsService.getMemberSegment(userId);
    
    res.json({
      success: true,
      data: segment
    });
  } catch (error) {
    safeLogger.error('Error getting member segment:', error);
    res.status(500).json({ error: 'Failed to determine member segment' });
  }
};

/**
 * Track user behavior event
 */
export const trackBehaviorEvent = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user?.id;
    
    if (!userId) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    
    const { eventType, eventData, pageUrl, userAgent, ipAddress } = req.body;
    
    if (!eventType) {
      res.status(400).json({ error: 'Event type is required' });
      return;
    }
    
    // In a real implementation, this would insert into the user_analytics table
    // For now, we'll just log the event
    safeLogger.info('Tracking behavior event:', {
      userId,
      eventType,
      eventData,
      pageUrl,
      userAgent,
      ipAddress
    });
    
    res.json({
      success: true,
      message: 'Behavior event tracked successfully'
    });
  } catch (error) {
    safeLogger.error('Error tracking behavior event:', error);
    res.status(500).json({ error: 'Failed to track behavior event' });
  }
};
