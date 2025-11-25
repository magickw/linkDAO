import { Router, Request, Response } from 'express';
import { newsletterService } from '../services/newsletterService';
import { safeLogger } from '../utils/safeLogger';
import { apiResponse } from '../utils/apiResponse';
import { validateAdminRole, requirePermission } from '../middleware/adminAuthMiddleware';

const router = Router();

/**
 * GET /api/admin/newsletter/subscribers
 * Get all newsletter subscribers (Admin only)
 */
router.get('/subscribers', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
  try {
    const subscribers = await newsletterService.getAllSubscribers();
    return res.status(200).json(apiResponse.success(subscribers, 'Subscribers retrieved successfully'));
  } catch (error) {
    safeLogger.error('[AdminNewsletterRoutes] Error getting all subscribers:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/campaigns
 * Get all newsletter campaigns (Admin only)
 */
router.get('/campaigns', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
  try {
    const campaigns = await newsletterService.getAllCampaigns();
    return res.status(200).json(apiResponse.success(campaigns, 'Campaigns retrieved successfully'));
  } catch (error) {
    safeLogger.error('[AdminNewsletterRoutes] Error getting campaigns:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/stats
 * Get detailed newsletter statistics (Admin only)
 */
router.get('/stats', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
  try {
    const stats = await newsletterService.getNewsletterStats();
    return res.status(200).json(apiResponse.success(stats, 'Stats retrieved successfully'));
  } catch (error) {
    safeLogger.error('[AdminNewsletterRoutes] Error getting newsletter stats:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * POST /api/admin/newsletter/send
 * Send newsletter to all active subscribers (Admin only)
 */
router.post('/send', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
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
    safeLogger.error('[AdminNewsletterRoutes] Error sending newsletter:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * POST /api/admin/newsletter/schedule
 * Schedule newsletter for later (Admin only)
 */
router.post('/schedule', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
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
    safeLogger.error('[AdminNewsletterRoutes] Error scheduling newsletter:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * DELETE /api/admin/newsletter/campaigns/:campaignId
 * Delete a campaign (Admin only)
 */
router.delete('/campaigns/:campaignId', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
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
    safeLogger.error('[AdminNewsletterRoutes] Error deleting campaign:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

/**
 * GET /api/admin/newsletter/export
 * Export subscribers to CSV (Admin only)
 */
router.get('/export', validateAdminRole, requirePermission('system.settings'), async (req: Request, res: Response) => {
  try {
    const csv = await newsletterService.exportSubscribers();
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=newsletter-subscribers.csv');
    return res.send(csv);
  } catch (error) {
    safeLogger.error('[AdminNewsletterRoutes] Error exporting subscribers:', error);
    return res.status(500).json(apiResponse.error('Internal server error', 500));
  }
});

export default router;