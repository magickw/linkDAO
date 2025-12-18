import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import multer from 'multer';
import { sellerController } from '../controllers/sellerController';
import { sellerProfileService } from '../services/sellerProfileService';
import { successResponse, errorResponse } from '../utils/apiResponse';
const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// NOTE: Seller Profile routes are now handled by sellerProfileRoutes
// This avoids conflicts and ensures proper onboarding flow support

// GET profile - Primary endpoint for fetching seller profile

// Seller dashboard route
router.get('/seller/dashboard/:walletAddress', authMiddleware, sellerController.getDashboard.bind(sellerController));

// PUT profile - Update seller profile
router.put(
  '/seller/:walletAddress',
  authMiddleware,
  sellerController.updateProfile.bind(sellerController)
);
// Enhanced profile update with image support
router.put(
  '/seller/:walletAddress/enhanced',
  authMiddleware,
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  sellerController.updateProfileEnhanced.bind(sellerController)
);// Profile validation and completeness
router.get('/seller/:walletAddress/completeness', authMiddleware, sellerController.getProfileCompleteness.bind(sellerController));
router.post('/seller/profile/validate', authMiddleware, csrfProtection, sellerController.validateProfile.bind(sellerController));// Seller statistics
router.get('/seller/stats/:walletAddress', authMiddleware, sellerController.getSellerStats.bind(sellerController));

// ENS validation routes
router.post('/seller/ens/validate', authMiddleware, csrfProtection, sellerController.validateENS.bind(sellerController));
router.post('/seller/ens/verify-ownership', authMiddleware, csrfProtection, sellerController.verifyENSOwnership.bind(sellerController));

// Profile synchronization routes
router.post('/seller/:walletAddress/sync', authMiddleware, csrfProtection, sellerController.forceSyncProfile.bind(sellerController));
router.get('/seller/:walletAddress/sync/validate', authMiddleware, sellerController.validateProfileSync.bind(sellerController));
router.get('/seller/:walletAddress/history', authMiddleware, sellerController.getProfileHistory.bind(sellerController));export default router;