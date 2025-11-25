import { Router, Request, Response } from 'express';
import { newsletterService } from '../services/newsletterService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';
import { validateAdminRole } from '../middleware/adminAuthMiddleware';

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

// ============================================
// Admin Routes (require admin authentication)
// ============================================

/**
 * GET /api/admin/newsletter/subscribers
 * Get all newsletter subscribers (Admin only)
 */
router.get('/admin/subscribers', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const subscribers = await newsletterService.getAllSubscribers();
    return res.status(200).json(apiResponse.success(subscribers, 'Subscribers retrieved successfully'));
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error getting all subscribers:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/campaigns
 * Get all newsletter campaigns (Admin only)
 */
router.get('/admin/campaigns', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const campaigns = await newsletterService.getAllCampaigns();
    return res.status(200).json(apiResponse.success(campaigns, 'Campaigns retrieved successfully'));
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error getting campaigns:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/stats
 * Get detailed newsletter statistics (Admin only)
 */
router.get('/admin/stats', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const stats = await newsletterService.getNewsletterStats();
    return res.status(200).json(apiResponse.success(stats, 'Stats retrieved successfully'));
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error getting newsletter stats:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * POST /api/admin/newsletter/send
 * Send newsletter to all active subscribers (Admin only)
 */
router.post('/admin/send', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const { subject, content, htmlContent } = req.body;

    if (!subject || !content) {
      return res.status(400).json(apiResponse.error('Subject and content are required', 400));
    }

    const result = await newsletterService.sendNewsletter(subject, content, htmlContent);

    if (result.success) {
      return res.status(200).json(apiResponse.success({ campaignId: result.campaignId }, result.message));
    } else {
      return res.status(400).json(apiResponse.error(result.message, 400));
    }
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error sending newsletter:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * POST /api/admin/newsletter/schedule
 * Schedule newsletter for later (Admin only)
 */
router.post('/admin/schedule', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const { subject, content, htmlContent, scheduledAt } = req.body;

    if (!subject || !content || !scheduledAt) {
      return res.status(400).json(apiResponse.error('Subject, content, and scheduledAt are required', 400));
    }

    const scheduledDate = new Date(scheduledAt);
    if (isNaN(scheduledDate.getTime())) {
      return res.status(400).json(apiResponse.error('Invalid scheduledAt date', 400));
    }

    const result = await newsletterService.scheduleNewsletter(subject, content, scheduledDate, htmlContent);

    if (result.success) {
      return res.status(200).json(apiResponse.success({ campaignId: result.campaignId }, result.message));
    } else {
      return res.status(400).json(apiResponse.error(result.message, 400));
    }
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error scheduling newsletter:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * DELETE /api/admin/newsletter/campaigns/:campaignId
 * Delete a campaign (Admin only)
 */
router.delete('/admin/campaigns/:campaignId', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const { campaignId } = req.params;

    if (!campaignId) {
      return res.status(400).json(apiResponse.error('Campaign ID is required', 400));
    }

    const result = await newsletterService.deleteCampaign(campaignId);

    if (result.success) {
      return res.status(200).json(apiResponse.success(null, result.message));
    } else {
      return res.status(404).json(apiResponse.error(result.message, 404));
    }
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error deleting campaign:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/export
 * Export subscribers to CSV (Admin only)
 */
router.get('/admin/export', validateAdminRole, async (req: Request, res: Response) => {
  try {
    const csv = await newsletterService.exportSubscribers();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
    return res.send(csv);
  } catch (error) {
    safeLogger.error('[NewsletterRoutes] Error exporting subscribers:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

export default router;
