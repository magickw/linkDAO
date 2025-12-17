import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import { digitalAssetController, uploadMiddleware } from '../controllers/digitalAssetController';
import { authenticateToken } from '../middleware/auth';
import rateLimit from 'express-rate-limit';

const router = Router();

// Rate limiting for different endpoints
const createAssetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxRequests: 10, // Limit each IP to 10 asset creations per windowMs
  message: 'Too many asset creation attempts, please try again later'
});

const accessAssetLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  maxRequests: 100, // Limit each IP to 100 asset access attempts per minute
  message: 'Too many asset access attempts, please try again later'
});

const dmcaLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  maxRequests: 5, // Limit each IP to 5 DMCA requests per hour
  message: 'Too many DMCA requests, please try again later'
});

// Asset Management Routes

/**
 * @route POST /api/digital-assets
 * @desc Create a new digital asset
 * @access Private
 */
router.post(
  '/',
  createAssetLimiter,
  authenticateToken,
  uploadMiddleware,
  digitalAssetController.createAsset.bind(digitalAssetController)
);

/**
 * @route POST /api/digital-assets/:assetId/licenses
 * @desc Create a license for a digital asset
 * @access Private
 */
router.post(
  '/:assetId/licenses',
  authenticateToken,
  digitalAssetController.createLicense.bind(digitalAssetController)
);

/**
 * @route POST /api/digital-assets/purchase-license
 * @desc Purchase a license for a digital asset
 * @access Private
 */
router.post(
  '/purchase-license',
  authenticateToken,
  digitalAssetController.purchaseLicense.bind(digitalAssetController)
);

/**
 * @route POST /api/digital-assets/access
 * @desc Access digital asset content with license key
 * @access Private
 */
router.post(
  '/access',
  accessAssetLimiter,
  authenticateToken,
  digitalAssetController.accessAsset.bind(digitalAssetController)
);

// DMCA and Copyright Protection Routes

/**
 * @route POST /api/digital-assets/dmca-request
 * @desc Submit DMCA takedown request
 * @access Public (with rate limiting)
 */
router.post(
  '/dmca-request',
  dmcaLimiter,
  digitalAssetController.submitDMCARequest.bind(digitalAssetController)
);

// Analytics Routes

/**
 * @route GET /api/digital-assets/analytics
 * @desc Get analytics for digital assets
 * @access Private
 */
router.get(
  '/analytics',
  authenticateToken,
  digitalAssetController.getAnalytics.bind(digitalAssetController)
);

/**
 * @route GET /api/digital-assets/analytics/time-series
 * @desc Get time series data for charts
 * @access Private
 */
router.get(
  '/analytics/time-series',
  authenticateToken,
  digitalAssetController.getTimeSeriesData.bind(digitalAssetController)
);

/**
 * @route GET /api/digital-assets/analytics/real-time
 * @desc Get real-time statistics
 * @access Private
 */
router.get(
  '/analytics/real-time',
  authenticateToken,
  digitalAssetController.getRealTimeStats.bind(digitalAssetController)
);

/**
 * @route GET /api/digital-assets/analytics/geographic
 * @desc Get geographic distribution of users
 * @access Private
 */
router.get(
  '/analytics/geographic',
  authenticateToken,
  digitalAssetController.getGeographicDistribution.bind(digitalAssetController)
);

/**
 * @route GET /api/digital-assets/analytics/revenue
 * @desc Get revenue analytics
 * @access Private
 */
router.get(
  '/analytics/revenue',
  authenticateToken,
  digitalAssetController.getRevenueAnalytics.bind(digitalAssetController)
);

// Watermark Management Routes

/**
 * @route POST /api/digital-assets/watermark-templates
 * @desc Create watermark template
 * @access Private
 */
router.post(
  '/watermark-templates',
  authenticateToken,
  digitalAssetController.createWatermarkTemplate.bind(digitalAssetController)
);

/**
 * @route GET /api/digital-assets/watermark-templates
 * @desc Get watermark templates
 * @access Private
 */
router.get(
  '/watermark-templates',
  authenticateToken,
  digitalAssetController.getWatermarkTemplates.bind(digitalAssetController)
);

export default router;
