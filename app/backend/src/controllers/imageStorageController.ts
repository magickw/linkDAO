import { Request, Response } from 'express';
import multer from 'multer';
import imageStorageService from '../services/imageStorageService';

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 5 // Maximum 5 files per request
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type check (will be validated more thoroughly in service)
    const allowedMimes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/gif',
      'image/svg+xml'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

export class ImageStorageController {
  /**
   * Upload single image
   */
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
        return;
      }

      const { userId } = req.user as { userId: string };
      const { usageType, usageReferenceId, generateThumbnails, optimizeForWeb } = req.body;

      // Validate required fields
      if (!usageType || !['profile', 'cover', 'listing', 'product'].includes(usageType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid or missing usageType. Must be one of: profile, cover, listing, product'
        });
        return;
      }

      // Check for duplicates if requested
      const checkDuplicates = req.body.checkDuplicates === 'true';
      if (checkDuplicates) {
        const duplicate = await imageStorageService.findDuplicateImage(req.file.buffer, userId);
        if (duplicate) {
          res.status(200).json({
            success: true,
            message: 'Duplicate image found',
            data: duplicate,
            isDuplicate: true
          });
          return;
        }
      }

      const options = {
        userId,
        usageType,
        usageReferenceId: usageReferenceId || undefined,
        generateThumbnails: generateThumbnails !== 'false',
        optimizeForWeb: optimizeForWeb !== 'false'
      };

      const result = await imageStorageService.uploadImage(
        req.file.buffer,
        req.file.originalname,
        options
      );

      res.status(201).json({
        success: true,
        message: 'Image uploaded successfully',
        data: result
      });

    } catch (error) {
      console.error('Image upload error:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('validation failed')) {
          res.status(400).json({
            success: false,
            error: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        error: 'Failed to upload image'
      });
    }
  }

  /**
   * Upload multiple images
   */
  async uploadMultipleImages(req: Request, res: Response): Promise<void> {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        res.status(400).json({
          success: false,
          error: 'No image files provided'
        });
        return;
      }

      const { userId } = req.user as { userId: string };
      const { usageType, usageReferenceId, generateThumbnails, optimizeForWeb } = req.body;

      if (!usageType || !['profile', 'cover', 'listing', 'product'].includes(usageType)) {
        res.status(400).json({
          success: false,
          error: 'Invalid or missing usageType'
        });
        return;
      }

      const options = {
        userId,
        usageType,
        usageReferenceId: usageReferenceId || undefined,
        generateThumbnails: generateThumbnails !== 'false',
        optimizeForWeb: optimizeForWeb !== 'false'
      };

      const results = [];
      const errors = [];

      // Process files sequentially to avoid overwhelming the system
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        try {
          const result = await imageStorageService.uploadImage(
            file.buffer,
            file.originalname,
            options
          );
          results.push(result);
        } catch (error) {
          console.error(`Error uploading file ${file.originalname}:`, error);
          errors.push({
            filename: file.originalname,
            error: error instanceof Error ? error.message : 'Upload failed'
          });
        }
      }

      res.status(results.length > 0 ? 201 : 400).json({
        success: results.length > 0,
        message: `Uploaded ${results.length} of ${req.files.length} images`,
        data: {
          successful: results,
          failed: errors
        }
      });

    } catch (error) {
      console.error('Multiple image upload error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to upload images'
      });
    }
  }

  /**
   * Get image by ID
   */
  async getImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      const image = await imageStorageService.getImage(imageId);

      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: image
      });

    } catch (error) {
      console.error('Get image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve image'
      });
    }
  }

  /**
   * Get images by usage type
   */
  async getImagesByUsage(req: Request, res: Response): Promise<void> {
    try {
      const { usageType, usageReferenceId } = req.query;
      const { userId } = req.user as { userId: string };

      if (!usageType || typeof usageType !== 'string') {
        res.status(400).json({
          success: false,
          error: 'Usage type is required'
        });
        return;
      }

      const images = await imageStorageService.getImagesByUsage(
        usageType,
        usageReferenceId as string || '',
        userId
      );

      res.status(200).json({
        success: true,
        data: images
      });

    } catch (error) {
      console.error('Get images by usage error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve images'
      });
    }
  }

  /**
   * Delete image
   */
  async deleteImage(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { userId } = req.user as { userId: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      const success = await imageStorageService.deleteImage(imageId, userId);

      if (!success) {
        res.status(404).json({
          success: false,
          error: 'Image not found or unauthorized'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      console.error('Delete image error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to delete image'
      });
    }
  }

  /**
   * Validate image without uploading
   */
  async validateImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({
          success: false,
          error: 'No image file provided'
        });
        return;
      }

      const validation = await imageStorageService.validateImage(
        req.file.buffer,
        req.file.originalname
      );

      res.status(200).json({
        success: true,
        data: validation
      });

    } catch (error) {
      console.error('Image validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate image'
      });
    }
  }

  /**
   * Get storage statistics
   */
  async getStorageStats(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.user as { userId: string };
      const { global } = req.query;

      // Only allow global stats for admin users
      const targetUserId = global === 'true' && req.user?.isAdmin ? undefined : userId;

      const stats = await imageStorageService.getStorageStats(targetUserId);

      res.status(200).json({
        success: true,
        data: stats
      });

    } catch (error) {
      console.error('Get storage stats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve storage statistics'
      });
    }
  }

  /**
   * Generate thumbnails for existing image
   */
  async generateThumbnails(req: Request, res: Response): Promise<void> {
    try {
      const { imageId } = req.params;
      const { userId } = req.user as { userId: string };

      if (!imageId) {
        res.status(400).json({
          success: false,
          error: 'Image ID is required'
        });
        return;
      }

      // Get the original image
      const image = await imageStorageService.getImage(imageId);
      if (!image) {
        res.status(404).json({
          success: false,
          error: 'Image not found'
        });
        return;
      }

      // For now, return existing thumbnails
      // In a full implementation, you might regenerate them
      res.status(200).json({
        success: true,
        message: 'Thumbnails already available',
        data: {
          thumbnails: image.thumbnails
        }
      });

    } catch (error) {
      console.error('Generate thumbnails error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate thumbnails'
      });
    }
  }

  /**
   * Get middleware for single file upload
   */
  getUploadMiddleware() {
    return upload.single('image');
  }

  /**
   * Get middleware for multiple file upload
   */
  getMultipleUploadMiddleware() {
    return upload.array('images', 5);
  }

  /**
   * Handle multer errors
   */
  handleUploadError(error: any, req: Request, res: Response, next: any): void {
    if (error instanceof multer.MulterError) {
      if (error.code === 'LIMIT_FILE_SIZE') {
        res.status(400).json({
          success: false,
          error: 'File size exceeds 10MB limit'
        });
        return;
      }
      if (error.code === 'LIMIT_FILE_COUNT') {
        res.status(400).json({
          success: false,
          error: 'Too many files. Maximum 5 files allowed'
        });
        return;
      }
    }

    if (error.message.includes('Unsupported file type')) {
      res.status(400).json({
        success: false,
        error: error.message
      });
      return;
    }

    next(error);
  }
}

export default new ImageStorageController();