/**
 * Seller Image Controller
 * Handles image upload, processing, and management for seller system
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
 */

import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sellerImageService } from '../services/sellerImageService';
import { SellerError, SellerErrorType } from '../types/sellerError';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    id: string;
  };
}

export interface ImageUploadRequest extends AuthenticatedRequest {
  file?: Express.Multer.File;
  files?: Express.Multer.File[];
  body: {
    context: 'profile' | 'cover' | 'listing';
    userId?: string;
    metadata?: string;
  };
}

class SellerImageController {
  /**
   * Upload single image
   * POST /api/marketplace/seller/images/upload
   */
  async uploadImage(req: ImageUploadRequest, res: Response) {
    try {
      const { file, body, user } = req;
      const { context, metadata } = body;

      if (!file) {
        return res.status(400).json({
          success: false,
          error: 'No image file provided',
          code: 'NO_FILE'
        });
      }

      if (!context || !['profile', 'cover', 'listing'].includes(context)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid context. Must be profile, cover, or listing',
          code: 'INVALID_CONTEXT'
        });
      }

      const userId = user?.walletAddress || body.userId || 'anonymous';
      const parsedMetadata = metadata ? JSON.parse(metadata) : {};

      const result = await sellerImageService.uploadImage({
        buffer: file.buffer,
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        context,
        userId,
        metadata: parsedMetadata,
      });

      res.status(201).json({
        success: true,
        data: result,
        message: 'Image uploaded successfully'
      });

    } catch (error) {
      safeLogger.error('Image upload error:', error);
      
      if (error instanceof SellerError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
          type: error.type
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error during image upload',
        code: 'UPLOAD_ERROR'
      });
    }
  }

  /**
   * Upload multiple images
   * POST /api/marketplace/seller/images/upload-multiple
   */
  async uploadMultipleImages(req: ImageUploadRequest, res: Response) {
    try {
      const { files, body, user } = req;
      const { context } = body;

      if (!files || files.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'No image files provided',
          code: 'NO_FILES'
        });
      }

      if (!context || !['profile', 'cover', 'listing'].includes(context)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid context. Must be profile, cover, or listing',
          code: 'INVALID_CONTEXT'
        });
      }

      const userId = user?.walletAddress || body.userId || 'anonymous';

      const uploadPromises = files.map(file => 
        sellerImageService.uploadImage({
          buffer: file.buffer,
          originalName: file.originalname,
          mimeType: file.mimetype,
          size: file.size,
          context,
          userId,
          metadata: {},
        })
      );

      const results = await Promise.allSettled(uploadPromises);
      
      const successful = results
        .filter((result): result is PromiseFulfilledResult<any> => result.status === 'fulfilled')
        .map(result => result.value);

      const failed = results
        .filter((result): result is PromiseRejectedResult => result.status === 'rejected')
        .map(result => ({
          error: result.reason.message,
          code: result.reason.code || 'UPLOAD_ERROR'
        }));

      res.status(201).json({
        success: true,
        data: {
          successful,
          failed,
          totalUploaded: successful.length,
          totalFailed: failed.length
        },
        message: `${successful.length} of ${files.length} images uploaded successfully`
      });

    } catch (error) {
      safeLogger.error('Multiple image upload error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error during batch upload',
        code: 'BATCH_UPLOAD_ERROR'
      });
    }
  }

  /**
   * Get image information
   * GET /api/marketplace/seller/images/:imageId
   */
  async getImageInfo(req: Request, res: Response) {
    try {
      const { imageId } = req.params;

      if (!imageId) {
        return res.status(400).json({
          success: false,
          error: 'Image ID is required',
          code: 'MISSING_IMAGE_ID'
        });
      }

      const imageInfo = await sellerImageService.getImageInfo(imageId);

      if (!imageInfo) {
        return res.status(404).json({
          success: false,
          error: 'Image not found',
          code: 'IMAGE_NOT_FOUND'
        });
      }

      res.json({
        success: true,
        data: imageInfo
      });

    } catch (error) {
      safeLogger.error('Get image info error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'GET_IMAGE_ERROR'
      });
    }
  }

  /**
   * Delete image
   * DELETE /api/marketplace/seller/images/:imageId
   */
  async deleteImage(req: AuthenticatedRequest, res: Response) {
    try {
      const { imageId } = req.params;
      const { context } = req.body;
      const userId = req.user?.walletAddress;

      if (!imageId) {
        return res.status(400).json({
          success: false,
          error: 'Image ID is required',
          code: 'MISSING_IMAGE_ID'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      const success = await sellerImageService.deleteImage(imageId, userId, context);

      if (!success) {
        return res.status(404).json({
          success: false,
          error: 'Image not found or access denied',
          code: 'DELETE_FAILED'
        });
      }

      res.json({
        success: true,
        message: 'Image deleted successfully'
      });

    } catch (error) {
      safeLogger.error('Delete image error:', error);
      
      if (error instanceof SellerError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
          type: error.type
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'DELETE_ERROR'
      });
    }
  }

  /**
   * Get all images for a seller
   * GET /api/marketplace/seller/:walletAddress/images
   */
  async getSellerImages(req: AuthenticatedRequest, res: Response) {
    try {
      const { walletAddress } = req.params;
      const { context, limit = 50, offset = 0 } = req.query;

      if (!walletAddress) {
        return res.status(400).json({
          success: false,
          error: 'Wallet address is required',
          code: 'MISSING_WALLET_ADDRESS'
        });
      }

      const images = await sellerImageService.getSellerImages(
        walletAddress,
        context as string,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        success: true,
        data: images,
        pagination: {
          limit: parseInt(limit as string),
          offset: parseInt(offset as string),
          total: images.length
        }
      });

    } catch (error) {
      safeLogger.error('Get seller images error:', error);
      
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'GET_SELLER_IMAGES_ERROR'
      });
    }
  }

  /**
   * Update image metadata
   * PUT /api/marketplace/seller/images/:imageId/metadata
   */
  async updateImageMetadata(req: AuthenticatedRequest, res: Response) {
    try {
      const { imageId } = req.params;
      const { metadata } = req.body;
      const userId = req.user?.walletAddress;

      if (!imageId) {
        return res.status(400).json({
          success: false,
          error: 'Image ID is required',
          code: 'MISSING_IMAGE_ID'
        });
      }

      if (!userId) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      if (!metadata) {
        return res.status(400).json({
          success: false,
          error: 'Metadata is required',
          code: 'MISSING_METADATA'
        });
      }

      const updatedImage = await sellerImageService.updateImageMetadata(
        imageId,
        userId,
        metadata
      );

      if (!updatedImage) {
        return res.status(404).json({
          success: false,
          error: 'Image not found or access denied',
          code: 'UPDATE_FAILED'
        });
      }

      res.json({
        success: true,
        data: updatedImage,
        message: 'Image metadata updated successfully'
      });

    } catch (error) {
      safeLogger.error('Update image metadata error:', error);
      
      if (error instanceof SellerError) {
        return res.status(400).json({
          success: false,
          error: error.message,
          code: error.code,
          type: error.type
        });
      }

      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'UPDATE_METADATA_ERROR'
      });
    }
  }
}

export const sellerImageController = new SellerImageController();
