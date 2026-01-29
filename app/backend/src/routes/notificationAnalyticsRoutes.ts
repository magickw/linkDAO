/**
 * Notification Analytics Routes
 * REST API endpoints for notification delivery analytics and metrics
 */

import { Router, Request, Response } from 'express';
import { notificationDeliveryService } from '../services/notificationDeliveryService';
import { smsService } from '../services/smsService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * GET /api/notification-analytics/metrics
 * Get notification delivery metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = notificationDeliveryService.getMetrics();

    res.json({
      success: true,
      type: 'notification_metrics',
      metrics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    safeLogger.error('[NotificationAnalytics] Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notification-analytics/analytics
 * Get detailed notification analytics
 */
router.get('/analytics', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const analytics = notificationDeliveryService.getAnalytics(days);

    res.json({
      success: true,
      type: 'notification_analytics',
      ...analytics,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    safeLogger.error('[NotificationAnalytics] Error fetching analytics:', error);
    res.status(500).json({
      error: 'Failed to fetch analytics',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notification-analytics/sms/status
 * Get SMS service status
 */
router.get('/sms/status', (req: Request, res: Response) => {
  try {
    const status = smsService.getStatus();

    res.json({
      success: true,
      type: 'sms_status',
      ...status,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    safeLogger.error('[NotificationAnalytics] Error fetching SMS status:', error);
    res.status(500).json({
      error: 'Failed to fetch SMS status',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/notification-analytics/delivery-report
 * Generate delivery report
 */
router.get('/delivery-report', (req: Request, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;

    const metrics = notificationDeliveryService.getMetrics();
    const analytics = notificationDeliveryService.getAnalytics(days);

    const report = {
      generatedAt: new Date().toISOString(),
      period: `Last ${days} days`,
      summary: analytics.summary,
      detailedMetrics: metrics,
    };

    res.json({
      success: true,
      type: 'delivery_report',
      ...report,
    });
  } catch (error) {
    safeLogger.error('[NotificationAnalytics] Error generating report:', error);
    res.status(500).json({
      error: 'Failed to generate report',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
