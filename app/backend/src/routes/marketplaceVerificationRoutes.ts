import { Router } from 'express';
import { marketplaceVerificationController } from '../controllers/marketplaceVerificationController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { rateLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Apply authentication middleware to all routes
router.use(authMiddleware);

// Apply rate limiting for verification endpoints
const verificationLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many verification requests, please try again later'
});

router.use(verificationLimiter);

/**
 * @route POST /api/marketplace/verification/high-value
 * @desc Verify high-value NFT listing
 * @access Private
 */
router.post('/high-value', marketplaceVerificationController.verifyHighValueListing);

/**
 * @route POST /api/marketplace/verification/counterfeit
 * @desc Detect counterfeit listings using brand keyword analysis
 * @access Private
 */
router.post('/counterfeit', marketplaceVerificationController.detectCounterfeit);

/**
 * @route POST /api/marketplace/verification/ownership
 * @desc Verify proof of ownership signature
 * @access Private
 */
router.post('/ownership', marketplaceVerificationController.verifyProofOfOwnership);

/**
 * @route GET /api/marketplace/verification/seller/:sellerAddress
 * @desc Get seller verification tier based on reputation and KYC
 * @access Private
 */
router.get('/seller/:sellerAddress', marketplaceVerificationController.getSellerVerificationTier);

/**
 * @route POST /api/marketplace/verification/scam
 * @desc Detect scam patterns in marketplace listings
 * @access Private
 */
router.post('/scam', marketplaceVerificationController.detectScamPatterns);

/**
 * @route POST /api/marketplace/verification/complete
 * @desc Comprehensive marketplace listing verification
 * @access Private
 */
router.post('/complete', marketplaceVerificationController.verifyMarketplaceListing);

export default router;