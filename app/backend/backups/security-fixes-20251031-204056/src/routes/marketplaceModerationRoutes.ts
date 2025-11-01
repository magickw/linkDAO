import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { MarketplaceModerationController } from '../controllers/marketplaceModerationController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { apiLimiter } from '../middleware/rateLimiter';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();
const controller = new MarketplaceModerationController();

// Rate limiting configurations
const standardLimiter = apiLimiter;

const bulkLimiter = apiLimiter;

const verificationLimiter = apiLimiter;

/**
 * @route POST /api/marketplace-moderation/moderate
 * @desc Moderate a complete marketplace listing
 * @access Private
 */
router.post('/moderate', csrfProtection,  
  standardLimiter,
  authMiddleware,
  controller.moderateListing.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/verify-nft
 * @desc Verify NFT ownership for high-value listings
 * @access Private
 */
router.post('/verify-nft', csrfProtection, 
  verificationLimiter,
  authMiddleware,
  controller.verifyNFTOwnership.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/check-counterfeit
 * @desc Check for counterfeit products
 * @access Private
 */
router.post('/check-counterfeit', csrfProtection, 
  standardLimiter,
  authMiddleware,
  controller.checkCounterfeit.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/detect-scam
 * @desc Detect scam patterns in listings
 * @access Private
 */
router.post('/detect-scam', csrfProtection, 
  standardLimiter,
  authMiddleware,
  controller.detectScam.bind(controller)
);

/**
 * @route GET /api/marketplace-moderation/seller/:sellerAddress
 * @desc Get seller verification status and tier
 * @access Private
 */
router.get('/seller/:sellerAddress',
  verificationLimiter,
  authMiddleware,
  controller.getSellerVerification.bind(controller)
);

/**
 * @route GET /api/marketplace-moderation/status/:listingId
 * @desc Get moderation status for a listing
 * @access Private
 */
router.get('/status/:listingId',
  standardLimiter,
  authMiddleware,
  controller.getModerationStatus.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/bulk-moderate
 * @desc Bulk moderate multiple listings
 * @access Private
 */
router.post('/bulk-moderate', csrfProtection, 
  bulkLimiter,
  authMiddleware,
  controller.bulkModerate.bind(controller)
);

/**
 * @route GET /api/marketplace-moderation/stats
 * @desc Get marketplace moderation statistics
 * @access Private
 */
router.get('/stats',
  standardLimiter,
  authMiddleware,
  controller.getModerationStats.bind(controller)
);

export default router;