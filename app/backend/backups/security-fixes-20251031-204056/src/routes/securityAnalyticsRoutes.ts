/**
 * Security Analytics Routes
 * 
 * API endpoints for security metrics, risk assessment, trend analysis,
 * and optimization recommendations.
 */

import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticatedRequest } from '../middleware/auth';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { securityAnalyticsService } from '../services/securityAnalyticsService';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';
import { adminAuthMiddleware } from '../middleware/adminAuthMiddleware';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * Get security analytics dashboard
 */
router.get('/dashboard', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const dashboard = await securityAnalyticsService.getSecurityDashboard();

    res.json({
      success: true,
      data: dashboard,
    });
  } catch (error) {
    safeLogger.error('Error getting security analytics dashboard:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security analytics dashboard',
    });
  }
});

/**
 * Get current security metrics
 */
router.get('/metrics', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const metrics = await securityAnalyticsService.getCurrentMetrics();

    res.json({
      success: true,
      data: metrics,
    });
  } catch (error) {
    safeLogger.error('Error getting security metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security metrics',
    });
  }
});

/**
 * Get risk assessment
 */
router.get('/risk-assessment', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    let riskAssessment = securityAnalyticsService.getCurrentRiskAssessment();
    
    if (!riskAssessment) {
      // Perform new risk assessment if none exists
      riskAssessment = await securityAnalyticsService.performRiskAssessment();
    }

    res.json({
      success: true,
      data: riskAssessment,
    });
  } catch (error) {
    safeLogger.error('Error getting risk assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get risk assessment',
    });
  }
});/**

 * Trigger new risk assessment
 */
router.post('/risk-assessment', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const riskAssessment = await securityAnalyticsService.performRiskAssessment();

    res.json({
      success: true,
      data: riskAssessment,
      message: 'Risk assessment completed successfully',
    });
  } catch (error) {
    safeLogger.error('Error performing risk assessment:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to perform risk assessment',
    });
  }
});

/**
 * Get security trends
 */
router.get('/trends', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { metric, timeframe = '30d' } = req.query;

    let trends = securityAnalyticsService.getTrends();

    // Filter by specific metric if requested
    if (metric) {
      trends = trends.filter(t => t.metric === metric);
    }

    // Filter by timeframe if needed
    if (timeframe !== '30d') {
      // This would filter trends based on timeframe
      // For now, return all trends
    }

    res.json({
      success: true,
      data: trends,
    });
  } catch (error) {
    safeLogger.error('Error getting security trends:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security trends',
    });
  }
});

/**
 * Get security recommendations
 */
router.get('/recommendations', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      priority,
      category,
      status,
      limit = 50,
    } = req.query;

    let recommendations = securityAnalyticsService.getRecommendations(parseInt(limit as string) * 2);

    // Apply filters
    if (priority) {
      recommendations = recommendations.filter(r => r.priority === priority);
    }
    if (category) {
      recommendations = recommendations.filter(r => r.category === category);
    }
    if (status) {
      recommendations = recommendations.filter(r => r.status === status);
    }

    // Limit results
    const limitedRecommendations = recommendations.slice(0, parseInt(limit as string));

    res.json({
      success: true,
      data: {
        recommendations: limitedRecommendations,
        total: recommendations.length,
      },
    });
  } catch (error) {
    safeLogger.error('Error getting security recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security recommendations',
    });
  }
});

/**
 * Update recommendation status
 */
router.patch('/recommendations/:recommendationId/status', csrfProtection,  adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { recommendationId } = req.params;
    const { status } = req.body;

    const validStatuses = ['pending', 'in_progress', 'completed', 'rejected'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      });
    }

    securityAnalyticsService.updateRecommendationStatus(recommendationId, status);

    res.json({
      success: true,
      message: 'Recommendation status updated successfully',
    });
  } catch (error) {
    safeLogger.error('Error updating recommendation status:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update recommendation status',
    });
  }
});

/**
 * Get security forecast
 */
router.get('/forecast', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const { timeframe = '30d' } = req.query;

    const forecast = await securityAnalyticsService.generateSecurityForecast(timeframe as string);

    res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    safeLogger.error('Error getting security forecast:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security forecast',
    });
  }
});

/**
 * Get optimization recommendations
 */
router.get('/optimization', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const recommendations = await securityAnalyticsService.getOptimizationRecommendations();

    res.json({
      success: true,
      data: recommendations,
    });
  } catch (error) {
    safeLogger.error('Error getting optimization recommendations:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get optimization recommendations',
    });
  }
});

/**
 * Get security statistics
 */
router.get('/statistics', adminAuthMiddleware, async (req: AuthenticatedRequest, res) => {
  try {
    const {
      timeRange = '24h',
      includeBreakdown = true,
    } = req.query;

    const metrics = await securityAnalyticsService.getCurrentMetrics();
    const riskAssessment = securityAnalyticsService.getCurrentRiskAssessment();

    const statistics = {
      overview: {
        riskScore: metrics.overallRiskScore,
        threatLevel: metrics.threatLevel,
        securityEvents: metrics.securityEvents.total,
        activeThreats: metrics.threatDetections.active,
        complianceScore: metrics.compliance.overallScore,
        lastUpdated: metrics.timestamp,
      },
      breakdown: includeBreakdown ? {
        eventsByType: metrics.securityEvents.byType,
        eventsBySeverity: metrics.securityEvents.bySeverity,
        threatsByStatus: {
          active: metrics.threatDetections.active,
          resolved: metrics.threatDetections.resolved,
          falsePositives: metrics.threatDetections.falsePositives,
        },
        vulnerabilities: metrics.vulnerabilities,
        performance: metrics.performance,
      } : undefined,
      riskFactors: riskAssessment?.riskFactors.map(f => ({
        name: f.name,
        category: f.category,
        riskScore: f.riskScore,
        mitigated: f.mitigated,
      })) || [],
    };

    res.json({
      success: true,
      data: statistics,
    });
  } catch (error) {
    safeLogger.error('Error getting security statistics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to get security statistics',
    });
  }
});

export default router;