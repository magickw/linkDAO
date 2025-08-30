import { Router } from 'express';
import { MarketplaceModerationController } from '../controllers/marketplaceModerationController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new MarketplaceModerationController();

// Marketplace listing verification and moderation
router.post('/verify', asyncHandler(controller.verifyListing.bind(controller)));
router.post('/moderate', asyncHandler(controller.moderateListing.bind(controller)));

// Counterfeit and scam detection
router.get('/counterfeit/:listingId', asyncHandler(controller.detectCounterfeit.bind(controller)));
router.get('/scam-patterns/:listingId', asyncHandler(controller.detectScamPatterns.bind(controller)));

// Seller verification management
router.get('/seller-tier/:walletAddress', asyncHandler(controller.getSellerTier.bind(controller)));
router.put('/seller-tier', asyncHandler(controller.updateSellerTier.bind(controller)));

// Appeals system
router.post('/appeal', asyncHandler(controller.submitAppeal.bind(controller)));

// Moderation history and statistics
router.get('/history/:listingId', asyncHandler(controller.getModerationHistory.bind(controller)));
router.get('/stats', asyncHandler(controller.getModerationStats.bind(controller)));

export default router;