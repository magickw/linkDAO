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

      // DEBUG: Perform raw DB checks to diagnose why resolution failed
      // This will help us identify if it's a data missing issue or a resolver logic issue
      let debugInfo: any = {
        inStatuses: false,
        inPosts: false,
        shareId
      };

      try {
        const { db } = await import('../db');
        const { statuses, posts } = await import('../db/schema');
        const { eq } = await import('drizzle-orm');

        const statusCheck = await db.select({ id: statuses.id }).from(statuses).where(eq(statuses.shareId, shareId)).limit(1);
        if (statusCheck.length > 0) debugInfo.inStatuses = true;

        const postCheck = await db.select({ id: posts.id }).from(posts).where(eq(posts.shareId, shareId)).limit(1);
        if (postCheck.length > 0) debugInfo.inPosts = true;
      } catch (err) {
        debugInfo.error = 'Failed to run debug checks';
      }

      return res.status(404).json({
        success: false,
        error: 'Content not found',
        debug: debugInfo
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
