/**
 * Resend Webhook Routes
 * Handles incoming webhook events from Resend email service
 */

import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { notificationDeliveryService } from '../services/notificationDeliveryService';
import { safeLogger } from '../utils/safeLogger';

const router = Router();

/**
 * Verify Resend webhook signature
 */
function verifyResendSignature(request: Request): boolean {
  const signature = request.headers['x-resend-signature'] as string;
  const webhookSecret = process.env.RESEND_WEBHOOK_SECRET || '';

  if (!signature || !webhookSecret) {
    safeLogger.warn('[ResendWebhook] Missing signature or webhook secret');
    return false;
  }

  try {
    // Resend uses HMAC-SHA256
    const body = JSON.stringify(request.body);
    const hash = crypto.createHmac('sha256', webhookSecret).update(body).digest('hex');

    // Compare signatures
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(`sha256=${hash}`)
    );

    return isValid;
  } catch (error) {
    safeLogger.error('[ResendWebhook] Signature verification error:', error);
    return false;
  }
}

/**
 * POST /webhooks/resend
 * Handle Resend webhook events
 */
router.post('/resend', async (req: Request, res: Response) => {
  try {
    // Verify webhook signature
    if (!verifyResendSignature(req)) {
      safeLogger.warn('[ResendWebhook] Invalid signature');
      return res.status(401).json({
        error: 'Invalid signature',
      });
    }

    const { type, data } = req.body;

    // Handle the webhook event
    const handled = await notificationDeliveryService.handleResendWebhook({
      type,
      data,
    });

    if (!handled) {
      safeLogger.warn('[ResendWebhook] Failed to handle event');
      return res.status(400).json({
        error: 'Failed to handle event',
      });
    }

    res.json({
      success: true,
      message: 'Event processed successfully',
    });
  } catch (error) {
    safeLogger.error('[ResendWebhook] Error processing webhook:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /webhooks/test
 * Test webhook endpoint (for development)
 */
router.post('/test', async (req: Request, res: Response) => {
  try {
    const { type, recipient } = req.body;

    if (!type || !recipient) {
      return res.status(400).json({
        error: 'Missing required fields: type, recipient',
      });
    }

    // Simulate webhook event
    const handled = await notificationDeliveryService.handleResendWebhook({
      type,
      data: {
        email_id: `test-${Date.now()}`,
        from: 'noreply@linkdao.io',
        to: recipient,
        created_at: new Date().toISOString(),
        subject: 'Test Email',
      },
    });

    res.json({
      success: handled,
      message: handled ? 'Test event processed' : 'Failed to process test event',
    });
  } catch (error) {
    safeLogger.error('[ResendWebhook] Error in test endpoint:', error);
    res.status(500).json({
      error: 'Internal server error',
    });
  }
});

/**
 * GET /webhooks/metrics
 * Get delivery metrics
 */
router.get('/metrics', (req: Request, res: Response) => {
  try {
    const metrics = notificationDeliveryService.getMetrics();
    const analytics = notificationDeliveryService.getAnalytics();

    res.json({
      metrics,
      analytics,
    });
  } catch (error) {
    safeLogger.error('[ResendWebhook] Error fetching metrics:', error);
    res.status(500).json({
      error: 'Failed to fetch metrics',
    });
  }
});

export default router;
