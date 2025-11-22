import { Router, Request, Response } from 'express';
import { newsletterService } from '../services/newsletterService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';

const router = Router();

/**
 * POST /api/newsletter/subscribe
 * Subscribe an email to the newsletter
 */
router.post('/subscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(apiResponse.error('Email is required', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(apiResponse.error('Invalid email format', 400));
    }

    const result = await newsletterService.subscribeEmail(email);

    if (result.success) {
      return res.status(200).json(apiResponse.success(null, result.message));
    } else {
      return res.status(400).json(apiResponse.error(result.message, 400));
    }
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error subscribing email:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * POST /api/newsletter/unsubscribe
 * Unsubscribe an email from the newsletter
 */
router.post('/unsubscribe', async (req: Request, res: Response) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json(apiResponse.error('Email is required', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(apiResponse.error('Invalid email format', 400));
    }

    const result = await newsletterService.unsubscribeEmail(email);

    if (result.success) {
      return res.status(200).json(apiResponse.success(null, result.message));
    } else {
      return res.status(400).json(apiResponse.error(result.message, 400));
    }
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error unsubscribing email:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/newsletter/status
 * Get subscription status for an email
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json(apiResponse.error('Email is required', 400));
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json(apiResponse.error('Invalid email format', 400));
    }

    const result = await newsletterService.getSubscriptionStatus(email);

    return res.status(200).json(apiResponse.success(result, 'Subscription status retrieved successfully'));
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error getting subscription status:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/newsletter/stats
 * Get newsletter statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const subscriberCount = await newsletterService.getSubscriberCount();
    const recentSubscribers = await newsletterService.getRecentSubscribers(5);

    const stats = {
      subscriberCount,
      recentSubscribers
    };

    return res.status(200).json(apiResponse.success(stats, 'Newsletter stats retrieved successfully'));
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error getting newsletter stats:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

export default router;
