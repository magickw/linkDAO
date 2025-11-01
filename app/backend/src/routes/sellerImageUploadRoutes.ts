import { Router, Request, Response } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { csrfProtection } from '../middleware/csrfProtection';
import { imageUploadService } from '../services/imageUploadService';
import { uploadFields, handleMulterError } from '../middleware/uploadMiddleware';
import { db } from '../db';
import { sellers } from '../db/schema';
import { eq } from 'drizzle-orm';
import { successResponse, errorResponse, notFoundResponse, validationErrorResponse } from '../utils/apiResponse';

const router = Router();

/**
 * PUT /api/marketplace/seller/:walletAddress/enhanced
 * Update seller profile with image uploads
 */
router.put(
  '/seller/:walletAddress/enhanced',
  uploadFields, // Multer middleware for handling file uploads
  handleMulterError, // Error handler for multer errors
  async (req: Request, res: Response) => {
    try {
      const { walletAddress } = req.params;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const profileData = req.body;

      // Validate wallet address format
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ], 'Invalid wallet address');
      }

      // Check if seller exists
      const seller = await db.query.sellers.findFirst({
        where: eq(sellers.walletAddress, walletAddress),
      });

      if (!seller) {
        return notFoundResponse(res, 'Seller profile not found');
      }

      // Prepare update data
      const updateData: any = {
        updatedAt: new Date(),
      };

      // Handle profile image upload
      if (files && files.profileImage && files.profileImage.length > 0) {
        const profileImageFile = files.profileImage[0];

        try {
          const uploadResult = await imageUploadService.uploadImage(profileImageFile, {
            ownerId: walletAddress,
            usageType: 'profile',
            usageReferenceId: walletAddress,
            generateThumbnails: true,
          });

          updateData.profileImageIpfs = uploadResult.ipfsHash;
          updateData.profileImageCdn = uploadResult.cdnUrl;
        } catch (uploadError) {
          safeLogger.error('Profile image upload failed:', uploadError);
          return errorResponse(
            res,
            'IMAGE_UPLOAD_ERROR',
            'Failed to upload profile image',
            500,
            { error: uploadError instanceof Error ? uploadError.message : 'Unknown error' }
          );
        }
      }

      // Handle cover image upload
      if (files && files.coverImage && files.coverImage.length > 0) {
        const coverImageFile = files.coverImage[0];

        try {
          const uploadResult = await imageUploadService.uploadImage(coverImageFile, {
            ownerId: walletAddress,
            usageType: 'cover',
            usageReferenceId: walletAddress,
            generateThumbnails: true,
          });

          updateData.coverImageIpfs = uploadResult.ipfsHash;
          updateData.coverImageCdn = uploadResult.cdnUrl;
        } catch (uploadError) {
          safeLogger.error('Cover image upload failed:', uploadError);
          return errorResponse(
            res,
            'IMAGE_UPLOAD_ERROR',
            'Failed to upload cover image',
            500,
            { error: uploadError instanceof Error ? uploadError.message : 'Unknown error' }
          );
        }
      }

      // Handle other profile fields from form data
      if (profileData.displayName !== undefined) {
        updateData.displayName = profileData.displayName;
      }
      if (profileData.storeName !== undefined) {
        updateData.storeName = profileData.storeName;
      }
      if (profileData.bio !== undefined) {
        updateData.bio = profileData.bio;
      }
      if (profileData.description !== undefined) {
        updateData.description = profileData.description;
      }
      if (profileData.sellerStory !== undefined) {
        updateData.sellerStory = profileData.sellerStory;
      }
      if (profileData.location !== undefined) {
        updateData.location = profileData.location;
      }
      if (profileData.websiteUrl !== undefined) {
        updateData.websiteUrl = profileData.websiteUrl;
      }
      if (profileData.twitterHandle !== undefined) {
        updateData.twitterHandle = profileData.twitterHandle;
      }
      if (profileData.discordHandle !== undefined) {
        updateData.discordHandle = profileData.discordHandle;
      }
      if (profileData.telegramHandle !== undefined) {
        updateData.telegramHandle = profileData.telegramHandle;
      }

      // Handle social links (if provided as JSON string)
      if (profileData.socialLinks) {
        try {
          const socialLinks = typeof profileData.socialLinks === 'string'
            ? JSON.parse(profileData.socialLinks)
            : profileData.socialLinks;
          updateData.socialLinks = JSON.stringify(socialLinks);
        } catch (error) {
          safeLogger.error('Invalid social links JSON:', error);
        }
      }

      // Update seller profile
      await db
        .update(sellers)
        .set(updateData)
        .where(eq(sellers.walletAddress, walletAddress));

      // Fetch updated profile
      const updatedSeller = await db.query.sellers.findFirst({
        where: eq(sellers.walletAddress, walletAddress),
      });

      return successResponse(res, {
        message: 'Profile updated successfully',
        profile: {
          walletAddress: updatedSeller?.walletAddress,
          displayName: updatedSeller?.displayName,
          storeName: updatedSeller?.storeName,
          bio: updatedSeller?.bio,
          description: updatedSeller?.description,
          profileImageCdn: updatedSeller?.profileImageCdn,
          profileImageIpfs: updatedSeller?.profileImageIpfs,
          coverImageCdn: updatedSeller?.coverImageCdn,
          coverImageIpfs: updatedSeller?.coverImageIpfs,
          location: updatedSeller?.location,
          socialLinks: updatedSeller?.socialLinks ? JSON.parse(updatedSeller.socialLinks) : null,
          websiteUrl: updatedSeller?.websiteUrl,
          twitterHandle: updatedSeller?.twitterHandle,
          discordHandle: updatedSeller?.discordHandle,
          telegramHandle: updatedSeller?.telegramHandle,
          tier: updatedSeller?.tier,
          isVerified: updatedSeller?.isVerified,
          updatedAt: updatedSeller?.updatedAt,
        },
      }, 200);
    } catch (error) {
      safeLogger.error('Error updating enhanced seller profile:', error);

      return errorResponse(
        res,
        'PROFILE_UPDATE_ERROR',
        'Failed to update seller profile',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

/**
 * POST /api/marketplace/seller/image/upload
 * Generic endpoint for uploading images (for listings, products, etc.)
 */
router.post(
  '/seller/image/upload',
  uploadFields,
  handleMulterError,
  async (req: Request, res: Response) => {
    try {
      const { walletAddress, usageType, usageReferenceId } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Validate required fields
      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return validationErrorResponse(res, [
          { field: 'walletAddress', message: 'Invalid wallet address format' }
        ]);
      }

      if (!usageType) {
        return validationErrorResponse(res, [
          { field: 'usageType', message: 'Usage type is required' }
        ]);
      }

      const validUsageTypes = ['profile', 'cover', 'listing', 'product'];
      if (!validUsageTypes.includes(usageType)) {
        return validationErrorResponse(res, [
          { field: 'usageType', message: `Usage type must be one of: ${validUsageTypes.join(', ')}` }
        ]);
      }

      // Check if any files were uploaded
      if (!files || Object.keys(files).length === 0) {
        return validationErrorResponse(res, [
          { field: 'files', message: 'No files uploaded' }
        ]);
      }

      const uploadResults = [];

      // Upload all files
      for (const fieldName in files) {
        const fileArray = files[fieldName];
        for (const file of fileArray) {
          try {
            const result = await imageUploadService.uploadImage(file, {
              ownerId: walletAddress,
              usageType: usageType as any,
              usageReferenceId,
              generateThumbnails: true,
            });
            uploadResults.push(result);
          } catch (uploadError) {
            safeLogger.error('Image upload failed:', uploadError);
            // Continue with other files even if one fails
          }
        }
      }

      if (uploadResults.length === 0) {
        return errorResponse(
          res,
          'IMAGE_UPLOAD_ERROR',
          'Failed to upload any images',
          500
        );
      }

      return successResponse(res, {
        message: 'Images uploaded successfully',
        uploads: uploadResults,
        count: uploadResults.length,
      }, 201);
    } catch (error) {
      safeLogger.error('Error in image upload:', error);

      return errorResponse(
        res,
        'IMAGE_UPLOAD_ERROR',
        'Failed to upload images',
        500,
        { error: error instanceof Error ? error.message : 'Unknown error' }
      );
    }
  }
);

export default router;
