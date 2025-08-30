import { Router } from 'express';
import { MarketplaceModerationController } from '../controllers/marketplaceModerationController';
import { authMiddleware } from '../middleware/auth';
import { rateLimiter } from '../middleware/rateLimiter';

const router = Router();
const controller = new MarketplaceModerationController();

// Rate limiting configurations
const standardLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 requests per window
  message: 'Too many requests, please try again later'
});

const bulkLimiter = rateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 bulk requests per hour
  message: 'Too many bulk requests, please try again later'
});

const verificationLimiter = rateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 verification requests per 5 minutes
  message: 'Too many verification requests, please try again later'
});

/**
 * @route POST /api/marketplace-moderation/moderate
 * @desc Moderate a complete marketplace listing
 * @access Private
 */
router.post('/moderate', 
  standardLimiter,
  authMiddleware,
  controller.moderateListing.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/verify-nft
 * @desc Verify NFT ownership for high-value listings
 * @access Private
 */
router.post('/verify-nft',
  verificationLimiter,
  authMiddleware,
  controller.verifyNFTOwnership.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/check-counterfeit
 * @desc Check for counterfeit products
 * @access Private
 */
router.post('/check-counterfeit',
  standardLimiter,
  authMiddleware,
  controller.checkCounterfeit.bind(controller)
);

/**
 * @route POST /api/marketplace-moderation/detect-scam
 * @desc Detect scam patterns in listings
 * @access Private
 */
router.post('/detect-scam',
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
router.post('/bulk-moderate',
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