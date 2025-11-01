/**
 * Seller Image Upload Routes
 * Standardized API endpoints for seller image management
 * 
 * Requirements: 5.1, 5.3, 5.4
 */

import { Router } from 'express';
import { csrfProtection } from '../middleware/csrfProtection';
import multer from 'multer';
import { csrfProtection } from '../middleware/csrfProtection';
import { sellerImageController } from '../controllers/sellerImageController';
import { csrfProtection } from '../middleware/csrfProtection';
import { authMiddleware } from '../middleware/authMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';
import { validateSellerAccess } from '../middleware/sellerMiddleware';
import { csrfProtection } from '../middleware/csrfProtection';

const router = Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
    files: 10, // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    // Allow only image files
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not allowed`));
    }
  },
});

/**
 * POST /api/marketplace/seller/images/upload
 * Upload single or multiple images
 */
router.post(
  '/upload',
  authMiddleware,
  upload.single('image'),
  sellerImageController.uploadImage
);

/**
 * POST /api/marketplace/seller/images/upload-multiple
 * Upload multiple images in batch
 */
router.post(
  '/upload-multiple',
  authMiddleware,
  upload.array('images', 10),
  sellerImageController.uploadMultipleImages
);

/**
 * GET /api/marketplace/seller/images/:imageId
 * Get image information and URLs
 */
router.get(
  '/:imageId',
  sellerImageController.getImageInfo
);

/**
 * DELETE /api/marketplace/seller/images/:imageId
 * Delete image from storage
 */
router.delete(
  '/:imageId',
  authMiddleware,
  validateSellerAccess,
  sellerImageController.deleteImage
);

/**
 * GET /api/marketplace/seller/:walletAddress/images
 * Get all images for a seller
 */
router.get(
  '/:walletAddress/images',
  authMiddleware,
  validateSellerAccess,
  sellerImageController.getSellerImages
);

/**
 * PUT /api/marketplace/seller/images/:imageId/metadata
 * Update image metadata
 */
router.put(
  '/:imageId/metadata',
  authMiddleware,
  validateSellerAccess,
  sellerImageController.updateImageMetadata
);

export { router as sellerImageRoutes };