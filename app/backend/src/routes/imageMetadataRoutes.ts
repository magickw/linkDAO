import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import multer from 'multer';
import imageMetadataController from '../controllers/imageMetadataController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Configure multer for file uploads (for hash generation and EXIF extraction)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Apply authentication to all routes
router.use(authenticateToken);

// Get image metadata by ID
router.get(
  '/:imageId',
  imageMetadataController.getImageMetadata.bind(imageMetadataController)
);

// Update image metadata
router.put(
  '/:imageId',
  imageMetadataController.updateImageMetadata.bind(imageMetadataController)
);

// Track image access
router.post(
  '/:imageId/access',
  imageMetadataController.trackImageAccess.bind(imageMetadataController)
);

// Get image analytics
router.get(
  '/:imageId/analytics',
  imageMetadataController.getImageAnalytics.bind(imageMetadataController)
);

// Get comprehensive image report
router.get(
  '/:imageId/report',
  imageMetadataController.getImageReport.bind(imageMetadataController)
);

// Check backup status
router.get(
  '/:imageId/backup-status',
  imageMetadataController.checkBackupStatus.bind(imageMetadataController)
);

// Get images by usage type
router.get(
  '/usage/:usageType',
  imageMetadataController.getImagesByUsageType.bind(imageMetadataController)
);

// Get storage usage statistics
router.get(
  '/stats/usage',
  imageMetadataController.getStorageUsageStats.bind(imageMetadataController)
);

// Find duplicate images by content hash
router.get(
  '/duplicates/:contentHash',
  imageMetadataController.findDuplicateImages.bind(imageMetadataController)
);

// Cleanup orphaned images (admin only)
router.post(
  '/cleanup/orphaned',
  imageMetadataController.cleanupOrphanedImages.bind(imageMetadataController)
);

// Generate content hash for file
router.post(
  '/hash/generate',
  upload.single('file'),
  imageMetadataController.generateContentHash.bind(imageMetadataController)
);

// Extract EXIF data from image
router.post(
  '/exif/extract',
  upload.single('image'),
  imageMetadataController.extractExifData.bind(imageMetadataController)
);

export default router;
