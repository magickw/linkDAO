import { Router } from 'express';
import multer from 'multer';
import { sellerController } from '../controllers/sellerController';

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

// Seller Profile Routes
router.get('/profile/:walletAddress', sellerController.getProfile.bind(sellerController));
router.post('/profile', sellerController.createProfile.bind(sellerController));
router.put('/profile/:walletAddress', sellerController.updateProfile.bind(sellerController));

// Enhanced profile update with image support
router.put(
  '/profile/:walletAddress/enhanced',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  sellerController.updateProfileEnhanced.bind(sellerController)
);

// Profile validation and completeness
router.get('/profile/:walletAddress/completeness', sellerController.getProfileCompleteness.bind(sellerController));
router.post('/profile/validate', sellerController.validateProfile.bind(sellerController));

// Seller statistics
router.get('/stats/:walletAddress', sellerController.getSellerStats.bind(sellerController));

// ENS validation routes
router.post('/ens/validate', sellerController.validateENS.bind(sellerController));
router.post('/ens/verify-ownership', sellerController.verifyENSOwnership.bind(sellerController));

// Profile synchronization routes
router.post('/profile/:walletAddress/sync', sellerController.forceSyncProfile.bind(sellerController));
router.get('/profile/:walletAddress/sync/validate', sellerController.validateProfileSync.bind(sellerController));
router.get('/profile/:walletAddress/history', sellerController.getProfileHistory.bind(sellerController));

export default router;