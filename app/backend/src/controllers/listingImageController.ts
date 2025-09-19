import { Request, Response } from 'express';
import { ListingImageService, ListingImageUpload } from '../services/listingImageService';
import { ValidationError } from '../models/validation';
import multer from 'multer';

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
    files: 10 // Max 10 files per request
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only images are allowed.'));
    }
  }
});

export class ListingImageController {
  private listingImageService: ListingImageService;

  constructor() {
    this.listingImageService = new ListingImageService();
  }

  /**
   * Upload multiple images for a listing
   * POST /api/listings/:id/images
   * Requirements: 2.1, 3.1, 3.4
   */
  async uploadImages(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({
          error: 'No images provided',
          message: 'At least one image file is required'
        });
      }

      // Convert multer files to ListingImageUpload format
      const images: ListingImageUpload[] = req.files.map((file: any) => ({
        file: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size
      }));

      const results = await this.listingImageService.uploadListingImages(listingId, images);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return res.status(successful.length > 0 ? 201 : 400).json({
        success: successful.length > 0,
        message: `Uploaded ${successful.length} images successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        results: {
          successful: successful.length,
          failed: failed.length,
          total: results.length,
          uploads: results
        }
      });
    } catch (error: any) {
      console.error('Error uploading listing images:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to upload images'
      });
    }
  }

  /**
   * Get all images for a listing
   * GET /api/listings/:id/images
   * Requirements: 2.1, 3.1, 3.4
   */
  async getListingImages(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      
      const gallery = await this.listingImageService.getListingImages(listingId);
      
      return res.json({
        success: true,
        gallery
      });
    } catch (error: any) {
      console.error('Error fetching listing images:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch listing images'
      });
    }
  }

  /**
   * Set primary image for listing
   * PUT /api/listings/:id/images/primary
   * Requirements: 2.1, 3.1, 3.4
   */
  async setPrimaryImage(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      const { imageIndex } = req.body;
      
      if (typeof imageIndex !== 'number' || imageIndex < 0) {
        return res.status(400).json({
          error: 'Invalid image index',
          message: 'imageIndex must be a non-negative number'
        });
      }

      await this.listingImageService.setPrimaryImage(listingId, imageIndex);
      
      // Get updated gallery
      const gallery = await this.listingImageService.getListingImages(listingId);
      
      return res.json({
        success: true,
        message: 'Primary image updated successfully',
        gallery
      });
    } catch (error: any) {
      console.error('Error setting primary image:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to set primary image'
      });
    }
  }

  /**
   * Reorder images in listing gallery
   * PUT /api/listings/:id/images/reorder
   * Requirements: 2.1, 3.1, 3.4
   */
  async reorderImages(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      const { imageOrders } = req.body;
      
      if (!Array.isArray(imageOrders) || imageOrders.length === 0) {
        return res.status(400).json({
          error: 'Invalid image orders',
          message: 'imageOrders must be a non-empty array'
        });
      }

      // Validate each order update
      for (const order of imageOrders) {
        if (!order.imageId || typeof order.newOrder !== 'number') {
          return res.status(400).json({
            error: 'Invalid order format',
            message: 'Each order must have imageId and newOrder'
          });
        }
      }

      await this.listingImageService.reorderImages(listingId, imageOrders);
      
      // Get updated gallery
      const gallery = await this.listingImageService.getListingImages(listingId);
      
      return res.json({
        success: true,
        message: 'Images reordered successfully',
        gallery
      });
    } catch (error: any) {
      console.error('Error reordering images:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to reorder images'
      });
    }
  }

  /**
   * Delete image from listing
   * DELETE /api/listings/:id/images/:imageId
   * Requirements: 2.1, 3.1, 3.4
   */
  async deleteImage(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId, imageId } = req.params;
      
      await this.listingImageService.deleteListingImage(listingId, imageId);
      
      // Get updated gallery
      const gallery = await this.listingImageService.getListingImages(listingId);
      
      return res.json({
        success: true,
        message: 'Image deleted successfully',
        gallery
      });
    } catch (error: any) {
      console.error('Error deleting image:', error);
      
      if (error instanceof ValidationError) {
        return res.status(400).json({
          error: 'Validation failed',
          message: error.message,
          field: error.field
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to delete image'
      });
    }
  }

  /**
   * Get image display URLs for different sizes
   * GET /api/listings/:id/images/:imageId/urls
   * Requirements: 2.1, 3.4
   */
  async getImageUrls(req: Request, res: Response): Promise<Response> {
    try {
      const { imageId } = req.params;
      
      const urls = await this.listingImageService.getImageDisplayUrls(imageId);
      
      return res.json({
        success: true,
        urls
      });
    } catch (error: any) {
      console.error('Error fetching image URLs:', error);
      
      if (error instanceof ValidationError) {
        return res.status(404).json({
          error: 'Image not found',
          message: error.message
        });
      }
      
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch image URLs'
      });
    }
  }

  /**
   * Get optimized image URLs for specific context
   * GET /api/listings/:id/images/optimized
   * Requirements: 2.1, 3.4
   */
  async getOptimizedImages(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      const { context } = req.query;
      
      const validContexts = ['thumbnail', 'card', 'detail', 'gallery'];
      if (!context || !validContexts.includes(context as string)) {
        return res.status(400).json({
          error: 'Invalid context',
          message: `Context must be one of: ${validContexts.join(', ')}`
        });
      }

      const urls = await this.listingImageService.getOptimizedImageUrls(
        listingId,
        context as 'thumbnail' | 'card' | 'detail' | 'gallery'
      );
      
      return res.json({
        success: true,
        context,
        urls
      });
    } catch (error: any) {
      console.error('Error fetching optimized images:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch optimized images'
      });
    }
  }

  /**
   * Get image gallery data for display
   * GET /api/listings/:id/images/gallery
   * Requirements: 3.1, 3.4
   */
  async getImageGalleryData(req: Request, res: Response): Promise<Response> {
    try {
      const { id: listingId } = req.params;
      
      const galleryData = await this.listingImageService.generateImageGalleryData(listingId);
      
      return res.json({
        success: true,
        galleryData
      });
    } catch (error: any) {
      console.error('Error fetching gallery data:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to fetch gallery data'
      });
    }
  }

  /**
   * Batch process images for multiple listings
   * POST /api/listings/images/batch
   * Requirements: 2.1, 3.1
   */
  async batchProcessImages(req: Request, res: Response): Promise<Response> {
    try {
      const { operations } = req.body;
      
      if (!Array.isArray(operations) || operations.length === 0) {
        return res.status(400).json({
          error: 'Invalid operations',
          message: 'operations must be a non-empty array'
        });
      }

      if (operations.length > 50) {
        return res.status(400).json({
          error: 'Too many operations',
          message: 'Maximum 50 operations allowed per batch'
        });
      }

      // Validate each operation
      for (const operation of operations) {
        if (!operation.listingId || !operation.action) {
          return res.status(400).json({
            error: 'Invalid operation format',
            message: 'Each operation must have listingId and action'
          });
        }

        const validActions = ['upload', 'delete', 'reorder', 'setPrimary'];
        if (!validActions.includes(operation.action)) {
          return res.status(400).json({
            error: 'Invalid action',
            message: `Action must be one of: ${validActions.join(', ')}`
          });
        }
      }

      const results = await this.listingImageService.batchProcessListingImages(operations);
      
      const successful = results.filter(r => r.success);
      const failed = results.filter(r => !r.success);

      return res.json({
        success: successful.length > 0,
        message: `Processed ${successful.length} operations successfully${failed.length > 0 ? `, ${failed.length} failed` : ''}`,
        results: {
          successful: successful.length,
          failed: failed.length,
          total: results.length,
          operations: results
        }
      });
    } catch (error: any) {
      console.error('Error batch processing images:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Failed to batch process images'
      });
    }
  }

  /**
   * Get multer middleware for image uploads
   */
  getUploadMiddleware() {
    return upload.array('images', 10); // Max 10 images
  }
}