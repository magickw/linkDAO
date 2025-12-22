/**
 * Community Post Share Routes
 * Handles short share URLs for community posts (e.g., /cp/:shareId)
 * Similar to Facebook's group post sharing
 */

import express, { Request, Response } from 'express';
import { unifiedShareResolver } from '../services/unifiedShareResolver';
import { isValidShareId } from '../utils/shareIdGenerator';

const router = express.Router();

/**
 * GET /cp/:shareId
 * Short share URL that redirects to canonical community post URL
 */
router.get('/:shareId', async (req: Request, res: Response) => {
  try {
    const { shareId } = req.params;
    console.log(`[CommunityPostShareRoutes] Received request for shareId: ${shareId}`);

    // Validate share ID format
    if (!isValidShareId(shareId)) {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    // Resolve share ID using unified resolver
    const resolution = await unifiedShareResolver.resolve(shareId);
    
    if (!resolution) {
      return res.status(404).json({
        success: false,
        error: 'Not found'
      });
    }

    // Check permissions (temporarily allow all community posts for now)
    const hasPermission = await unifiedShareResolver.checkPermission(
      shareId, 
      (req as any).user?.id
    );
    
    // TEMPORARY FIX: Allow community posts to be viewed
    const isCommunityPost = resolution.type === 'community_post';
    
    if (!hasPermission && !isCommunityPost) {
      return res.status(404).json({
        success: false,
        error: 'Not found'
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

  } catch (error) {
    console.error('[CommunityPostShareRoutes] Error resolving share ID:', error);
    return res.status(404).json({
      success: false,
      error: 'Not found'
    });
  }
});

export default router;