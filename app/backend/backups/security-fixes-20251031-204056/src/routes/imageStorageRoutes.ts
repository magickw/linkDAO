import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import imageStorageController from '../controllers/imageStorageController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authenticateToken } from '../middleware/auth';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Apply authentication to all routes
router.use(authenticateToken);

// Single image upload
router.post(
  '/upload',
  imageStorageController.getUploadMiddleware(),
  imageStorageController.handleUploadError,
  imageStorageController.uploadImage.bind(imageStorageController)
);

// Multiple image upload
router.post(
  '/upload/multiple',
  imageStorageController.getMultipleUploadMiddleware(),
  imageStorageController.handleUploadError,
  imageStorageController.uploadMultipleImages.bind(imageStorageController)
);

// Validate image without uploading
router.post(
  '/validate',
  imageStorageController.getUploadMiddleware(),
  imageStorageController.handleUploadError,
  imageStorageController.validateImage.bind(imageStorageController)
);

// Get image by ID
router.get(
  '/:imageId',
  imageStorageController.getImage.bind(imageStorageController)
);

// Get images by usage type
router.get(
  '/',
  imageStorageController.getImagesByUsage.bind(imageStorageController)
);

// Delete image
router.delete(
  '/:imageId',
  imageStorageController.deleteImage.bind(imageStorageController)
);

// Generate thumbnails for existing image
router.post(
  '/:imageId/thumbnails',
  imageStorageController.generateThumbnails.bind(imageStorageController)
);

// Get storage statistics
router.get(
  '/stats/usage',
  imageStorageController.getStorageStats.bind(imageStorageController)
);

export default router;