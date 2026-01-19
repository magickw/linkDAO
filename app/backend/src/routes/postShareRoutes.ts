/**
 * Post Share Routes
 * Handles short share URLs for posts (e.g., /p/:shareId)
 * Redirects to canonical user-scoped URLs
 */

import express, { Request, Response } from 'express';
import { unifiedShareResolver } from '../services/unifiedShareResolver';
import { isValidShareId } from '../utils/shareIdGenerator';

const router = express.Router();

/**
 */

/**
 * GET /p/:shareId
 * Short share URL that redirects to canonical post URL
 */
router.get('/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;

    // Validate share ID format
    if (!isValidShareId(shareId)) {
      console.warn(`[PostShareRoutes] Invalid Share ID format: ${shareId}`);
      return res.status(404).json({
        success: false,
        error: 'Invalid Share ID format'
      });
    }

    // Resolve share ID using unified resolver
    const resolution = await unifiedShareResolver.resolve(shareId);

    if (!resolution) {
      console.warn(`[PostShareRoutes] Content not found for Share ID: ${shareId}`);
      return res.status(404).json({
        success: false,
        error: 'Content not found'
      });
    }

    // Check permissions (always returns false for restricted content)
    const hasPermission = await unifiedShareResolver.checkPermission(
      shareId,
      (req as any).user?.id
    );

    if (!hasPermission) {
      return res.status(404).json({
        success: false,
        error: 'Access denied'
      });
    }

    // Log analytics
    await unifiedShareResolver.logResolution(
      shareId,
      req.get('referrer'),
      req.get('user-agent')
    );

    // Return resolution data
    return res.json({
      success: true,
      data: {
        type: resolution.type,
        post: resolution.data,
        canonicalUrl: resolution.canonicalUrl,
        shareUrl: resolution.shareUrl,
        owner: resolution.owner,
      }
    });

  } catch (error: any) {
    console.error('[PostShareRoutes] Error resolving share ID:', error);
    return res.status(500).json({
      success: false,
      error: `Server error: ${error.message}`
    });
  }
});

export default router;
