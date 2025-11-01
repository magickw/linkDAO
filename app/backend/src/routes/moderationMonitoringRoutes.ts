import { Router } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { moderationMetricsService } from '../services/moderationMetricsService';
import { moderationDashboardService } from '../services/moderationDashboardService';
import { moderationAlertingService } from '../services/moderationAlertingService';
import { canaryDeploymentService } from '../services/canaryDeploymentService';
import { moderationLoggingService } from '../services/moderationLoggingService';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

// Apply authentication to all monitoring routes
router.use(authMiddleware);

/**
 * Get system metrics overview
 */
router.get('/metrics', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // 1 hour default
    const metrics = await moderationMetricsService.getSystemMetrics(timeWindow);
    
    res.json({
      success: true,
      data: metrics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Failed to get system metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve system metrics'
    });
  }
});

/**
 * Get dashboard data
 */
router.get('/dashboard', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 86400000; // 24 hours default
    const dashboardData = await moderationDashboardService.getDashboardData(timeWindow);
    
    res.json({
      success: true,
      data: dashboardData,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Failed to get dashboard data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve dashboard data'
    });
  }
});

/**
 * Get detailed analytics
 */
router.get('/analytics', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 86400000; // 24 hours default
    const analytics = await moderationDashboardService.getDetailedAnalytics(timeWindow);
    
    res.json({
      success: true,
      data: analytics,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Failed to get detailed analytics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve detailed analytics'
    });
  }
});

/**
 * Get performance metrics
 */
router.get('/performance', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 3600000; // 1 hour default
    const performance = await moderationLoggingService.getPerformanceMetrics(timeWindow);
    
    res.json({
      success: true,
      data: performance,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Failed to get performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve performance metrics'
    });
  }
});

/**
 * Get accuracy metrics
 */
router.get('/accuracy', async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 86400000; // 24 hours default
    const accuracy = await moderationLoggingService.getAccuracyMetrics(timeWindow);
    
    res.json({
      success: true,
      data: accuracy,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    safeLogger.error('Failed to get accuracy metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve accuracy metrics'
    });
  }
});

/**
 * Get structured logs
 */
router.get('/logs', async (req, res) => {
  try {
    const startTime = new Date(req.query.startTime as string || Date.now() - 3600000);
    const endTime = new Date(req.query.endTime as string || Date.now());
    const eventType = req.query.eventType as string;
    const limit = parseInt(req.query.limit as string) || 1000;
    
    const logs = await moderationLoggingService.getStructuredLogs(
      startTime,
      endTime,
      eventType,
      limit
    );
    
    res.json({
      success: true,
      data: logs,
      count: logs.length,
      filters: { startTime, endTime, eventType, limit }
    });
  } catch (error) {
    safeLogger.error('Failed to get structured logs:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve structured logs'
    });
  }
});

// Alert Management Routes

/**
 * Get alert rules
 */
router.get('/alerts/rules', async (req, res) => {
  try {
    const rules = moderationAlertingService.getAlertRules();
    
    res.json({
      success: true,
      data: rules
    });
  } catch (error) {
    safeLogger.error('Failed to get alert rules:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert rules'
    });
  }
});

/**
 * Create or update alert rule
 */
router.post('/alerts/rules', csrfProtection,  async (req, res) => {
  try {
    const rule = req.body;
    
    // Validate required fields
    if (!rule.id || !rule.name || !rule.metric || !rule.threshold) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: id, name, metric, threshold'
      });
    }
    
    moderationAlertingService.setAlertRule(rule);
    
    res.json({
      success: true,
      message: 'Alert rule saved successfully'
    });
  } catch (error) {
    safeLogger.error('Failed to save alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to save alert rule'
    });
  }
});

/**
 * Delete alert rule
 */
router.delete('/alerts/rules/:ruleId', csrfProtection,  async (req, res) => {
  try {
    const { ruleId } = req.params;
    moderationAlertingService.removeAlertRule(ruleId);
    
    res.json({
      success: true,
      message: 'Alert rule deleted successfully'
    });
  } catch (error) {
    safeLogger.error('Failed to delete alert rule:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete alert rule'
    });
  }
});

/**
 * Get active alerts
 */
router.get('/alerts/active', async (req, res) => {
  try {
    const alerts = moderationAlertingService.getActiveAlerts();
    
    res.json({
      success: true,
      data: alerts
    });
  } catch (error) {
    safeLogger.error('Failed to get active alerts:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active alerts'
    });
  }
});

/**
 * Get alert history
 */
router.get('/alerts/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    const history = moderationAlertingService.getAlertHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    safeLogger.error('Failed to get alert history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve alert history'
    });
  }
});

/**
 * Acknowledge alert
 */
router.post('/alerts/:alertId/acknowledge', csrfProtection,  async (req, res) => {
  try {
    const { alertId } = req.params;
    const { acknowledgedBy } = req.body;
    
    const success = moderationAlertingService.acknowledgeAlert(alertId, acknowledgedBy);
    
    if (success) {
      res.json({
        success: true,
        message: 'Alert acknowledged successfully'
      });
    } else {
      res.status(404).json({
        success: false,
        error: 'Alert not found'
      });
    }
  } catch (error) {
    safeLogger.error('Failed to acknowledge alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to acknowledge alert'
    });
  }
});

/**
 * Test alert
 */
router.post('/alerts/test/:ruleId', csrfProtection,  async (req, res) => {
  try {
    const { ruleId } = req.params;
    await moderationAlertingService.testAlert(ruleId);
    
    res.json({
      success: true,
      message: 'Test alert sent successfully'
    });
  } catch (error) {
    safeLogger.error('Failed to send test alert:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to send test alert'
    });
  }
});

// Canary Deployment Routes

/**
 * Get policy versions
 */
router.get('/policies', async (req, res) => {
  try {
    const policies = canaryDeploymentService.getPolicyVersions();
    
    res.json({
      success: true,
      data: policies
    });
  } catch (error) {
    safeLogger.error('Failed to get policy versions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve policy versions'
    });
  }
});

/**
 * Create policy version
 */
router.post('/policies', csrfProtection,  async (req, res) => {
  try {
    const { name, description, config } = req.body;
    const createdBy = req.user?.id || 'unknown';
    
    if (!name || !description || !config) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: name, description, config'
      });
    }
    
    const policyVersion = await canaryDeploymentService.createPolicyVersion(
      name,
      description,
      config,
      createdBy
    );
    
    res.json({
      success: true,
      data: policyVersion
    });
  } catch (error) {
    safeLogger.error('Failed to create policy version:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create policy version'
    });
  }
});

/**
 * Start canary deployment
 */
router.post('/deployments', csrfProtection,  async (req, res) => {
  try {
    const { policyVersionId, trafficPercentage, targetMetrics } = req.body;
    const createdBy = req.user?.id || 'unknown';
    
    if (!policyVersionId || !trafficPercentage || !targetMetrics) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: policyVersionId, trafficPercentage, targetMetrics'
      });
    }
    
    const deployment = await canaryDeploymentService.startCanaryDeployment(
      policyVersionId,
      trafficPercentage,
      targetMetrics,
      createdBy
    );
    
    res.json({
      success: true,
      data: deployment
    });
  } catch (error) {
    safeLogger.error('Failed to start canary deployment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to start canary deployment'
    });
  }
});

/**
 * Get active deployments
 */
router.get('/deployments/active', async (req, res) => {
  try {
    const deployments = canaryDeploymentService.getActiveDeployments();
    
    res.json({
      success: true,
      data: deployments
    });
  } catch (error) {
    safeLogger.error('Failed to get active deployments:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve active deployments'
    });
  }
});

/**
 * Get deployment history
 */
router.get('/deployments/history', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const history = canaryDeploymentService.getDeploymentHistory(limit);
    
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    safeLogger.error('Failed to get deployment history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deployment history'
    });
  }
});

/**
 * Get deployment metrics
 */
router.get('/deployments/:deploymentId/metrics', async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const metrics = await canaryDeploymentService.getDeploymentMetrics(deploymentId);
    
    if (!metrics) {
      return res.status(404).json({
        success: false,
        error: 'Deployment not found or not active'
      });
    }
    
    res.json({
      success: true,
      data: metrics
    });
  } catch (error) {
    safeLogger.error('Failed to get deployment metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to retrieve deployment metrics'
    });
  }
});

/**
 * Rollback deployment
 */
router.post('/deployments/:deploymentId/rollback', csrfProtection,  async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const { reason } = req.body;
    const rolledBackBy = req.user?.id || 'unknown';
    
    if (!reason) {
      return res.status(400).json({
        success: false,
        error: 'Rollback reason is required'
      });
    }
    
    await canaryDeploymentService.rollbackDeployment(deploymentId, reason, rolledBackBy);
    
    res.json({
      success: true,
      message: 'Deployment rolled back successfully'
    });
  } catch (error) {
    safeLogger.error('Failed to rollback deployment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to rollback deployment'
    });
  }
});

/**
 * Promote deployment to production
 */
router.post('/deployments/:deploymentId/promote', csrfProtection,  async (req, res) => {
  try {
    const { deploymentId } = req.params;
    const promotedBy = req.user?.id || 'unknown';
    
    await canaryDeploymentService.promoteToProduction(deploymentId, promotedBy);
    
    res.json({
      success: true,
      message: 'Deployment promoted to production successfully'
    });
  } catch (error) {
    safeLogger.error('Failed to promote deployment:', error);
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to promote deployment'
    });
  }
});

/**
 * Health check endpoint
 */
router.get('/health', async (req, res) => {
  try {
    const health = await moderationMetricsService.getSystemMetrics(300000); // 5 minutes
    
    const status = health.health.errorRate < 0.05 && health.health.queueDepth < 1000 
      ? 'healthy' 
      : 'degraded';
    
    res.json({
      success: true,
      status,
      timestamp: new Date().toISOString(),
      metrics: {
        errorRate: health.health.errorRate,
        queueDepth: health.health.queueDepth,
        uptime: health.health.uptime
      }
    });
  } catch (error) {
    safeLogger.error('Health check failed:', error);
    res.status(500).json({
      success: false,
      status: 'unhealthy',
      error: 'Health check failed'
    });
  }
});

export default router;
