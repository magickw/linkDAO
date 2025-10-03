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

// Marketplace Seller Profile Routes
// These routes are mapped to match the frontend expectations at /api/marketplace/seller/...
router.get('/seller/:walletAddress', sellerController.getProfile.bind(sellerController));
router.post('/seller/profile', sellerController.createProfile.bind(sellerController));
router.put('/seller/:walletAddress', sellerController.updateProfile.bind(sellerController));

// Enhanced profile update with image support
router.put(
  '/seller/:walletAddress/enhanced',
  upload.fields([
    { name: 'profileImage', maxCount: 1 },
    { name: 'coverImage', maxCount: 1 }
  ]),
  sellerController.updateProfileEnhanced.bind(sellerController)
);

// Profile validation and completeness
router.get('/seller/:walletAddress/completeness', sellerController.getProfileCompleteness.bind(sellerController));
router.post('/seller/profile/validate', sellerController.validateProfile.bind(sellerController));

// Seller statistics
router.get('/seller/stats/:walletAddress', sellerController.getSellerStats.bind(sellerController));

// ENS validation routes
router.post('/seller/ens/validate', sellerController.validateENS.bind(sellerController));
router.post('/seller/ens/verify-ownership', sellerController.verifyENSOwnership.bind(sellerController));

// Profile synchronization routes
router.post('/seller/:walletAddress/sync', sellerController.forceSyncProfile.bind(sellerController));
router.get('/seller/:walletAddress/sync/validate', sellerController.validateProfileSync.bind(sellerController));
router.get('/seller/:walletAddress/history', sellerController.getProfileHistory.bind(sellerController));

// Onboarding routes
router.get('/seller/onboarding/:walletAddress', (req, res) => {
  const { walletAddress } = req.params;
  
  res.json({
    success: true,
    data: [
      {
        id: 'wallet-connect',
        title: 'Connect Wallet',
        description: 'Connect your Web3 wallet to get started',
        component: 'WalletConnect',
        required: true,
        completed: true
      },
      {
        id: 'profile-setup',
        title: 'Profile Setup',
        description: 'Set up your seller profile and store information',
        component: 'ProfileSetup',
        required: true,
        completed: false
      },
      {
        id: 'verification',
        title: 'Verification',
        description: 'Verify your email and phone for enhanced features',
        component: 'Verification',
        required: false,
        completed: false
      },
      {
        id: 'payout-setup',
        title: 'Payout Setup',
        description: 'Configure your payment preferences',
        component: 'PayoutSetup',
        required: true,
        completed: false
      },
      {
        id: 'first-listing',
        title: 'Create First Listing',
        description: 'Create your first product listing',
        component: 'FirstListing',
        required: true,
        completed: false
      }
    ]
  });
});

router.put('/seller/onboarding/:walletAddress/:stepId', (req, res) => {
  const { walletAddress, stepId } = req.params;
  const data = req.body;
  
  res.json({
    success: true,
    message: `Onboarding step ${stepId} updated successfully`,
    data
  });
});

export default router;