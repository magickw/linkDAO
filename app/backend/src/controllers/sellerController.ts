import { Request, Response } from 'express';
import { sellerService, SellerProfileData } from '../services/sellerService';
import { ensService } from '../services/ensService';
import { profileSyncService } from '../services/profileSyncService';

export class SellerController {
  // Get seller profile
  async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      const profile = await sellerService.getSellerProfile(walletAddress);
      
      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Seller profile not found',
        });
        return;
      }

      res.json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error('Error fetching seller profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Create seller profile
  async createProfile(req: Request, res: Response): Promise<void> {
    try {
      const profileData: SellerProfileData = req.body;
      
      if (!profileData.walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      // Validate profile data
      const validation = sellerService.validateProfile(profileData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Profile validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }

      const profile = await sellerService.createSellerProfile(profileData);
      
      res.status(201).json({
        success: true,
        data: profile,
        message: 'Seller profile created successfully',
      });
    } catch (error) {
      console.error('Error creating seller profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create seller profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update seller profile (basic)
  async updateProfile(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const updates: Partial<SellerProfileData> = req.body;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      // Validate updates
      const validation = sellerService.validateProfile(updates);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Profile validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }

      const profile = await sellerService.updateSellerProfile(walletAddress, updates);
      const completeness = sellerService.calculateProfileCompleteness(profile);
      
      res.json({
        success: true,
        data: {
          profile,
          profileCompleteness: completeness,
        },
        message: 'Seller profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating seller profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update seller profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Update seller profile with images (enhanced)
  async updateProfileEnhanced(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const updates: Partial<SellerProfileData> = req.body;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      // Parse JSON fields if they exist
      if (typeof updates.socialLinks === 'string') {
        try {
          updates.socialLinks = JSON.parse(updates.socialLinks);
        } catch (e) {
          console.warn('Failed to parse socialLinks JSON:', e);
        }
      }

      // Get uploaded files
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
      const profileImage = files?.profileImage?.[0];
      const coverImage = files?.coverImage?.[0];

      // Validate updates
      const validation = sellerService.validateProfile(updates);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: 'Profile validation failed',
          errors: validation.errors,
          warnings: validation.warnings,
        });
        return;
      }

      const result = await sellerService.updateSellerProfileWithImages(
        walletAddress,
        updates,
        profileImage,
        coverImage
      );

      const completeness = sellerService.calculateProfileCompleteness(result.profile);
      
      // Validate ENS if provided
      let ensValidation;
      if (updates.ensHandle) {
        ensValidation = await ensService.validateENSHandle(updates.ensHandle);
      }

      res.json({
        success: true,
        data: {
          profile: result.profile,
          validationResults: validation,
          completenessUpdate: completeness,
          ensValidation,
          imageUploadResults: result.imageUploadResults,
        },
        message: 'Seller profile updated successfully',
      });
    } catch (error) {
      console.error('Error updating seller profile with images:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to update seller profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get profile completeness
  async getProfileCompleteness(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      const profile = await sellerService.getSellerProfile(walletAddress);
      
      if (!profile) {
        res.status(404).json({
          success: false,
          message: 'Seller profile not found',
        });
        return;
      }

      const completeness = sellerService.calculateProfileCompleteness(profile);
      
      res.json({
        success: true,
        data: completeness,
      });
    } catch (error) {
      console.error('Error calculating profile completeness:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to calculate profile completeness',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Validate profile
  async validateProfile(req: Request, res: Response): Promise<void> {
    try {
      const profileData: Partial<SellerProfileData> = req.body;
      
      const validation = sellerService.validateProfile(profileData);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('Error validating profile:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Get seller statistics
  async getSellerStats(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      const stats = await sellerService.getSellerStats(walletAddress);
      
      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error fetching seller stats:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch seller stats',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ENS validation endpoint
  async validateENS(req: Request, res: Response): Promise<void> {
    try {
      const { ensHandle } = req.body;
      
      if (!ensHandle) {
        res.status(400).json({
          success: false,
          message: 'ENS handle is required',
        });
        return;
      }

      const validation = await ensService.validateENSHandle(ensHandle);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('Error validating ENS handle:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate ENS handle',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // ENS ownership verification endpoint
  async verifyENSOwnership(req: Request, res: Response): Promise<void> {
    try {
      const { ensHandle, walletAddress } = req.body;
      
      if (!ensHandle || !walletAddress) {
        res.status(400).json({
          success: false,
          message: 'ENS handle and wallet address are required',
        });
        return;
      }

      const isOwned = await ensService.verifyENSOwnership(ensHandle, walletAddress);
      
      res.json({
        success: true,
        data: {
          isOwned,
          ensHandle,
          walletAddress,
        },
      });
    } catch (error) {
      console.error('Error verifying ENS ownership:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to verify ENS ownership',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  // Profile synchronization endpoints
  async forceSyncProfile(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      await profileSyncService.forceSyncProfile(walletAddress);
      
      res.json({
        success: true,
        message: 'Profile synchronization completed',
      });
    } catch (error) {
      console.error('Error forcing profile sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to synchronize profile',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async validateProfileSync(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      const validation = await profileSyncService.validateSync(walletAddress);
      
      res.json({
        success: true,
        data: validation,
      });
    } catch (error) {
      console.error('Error validating profile sync:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to validate profile synchronization',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  async getProfileHistory(req: Request, res: Response): Promise<void> {
    try {
      const { walletAddress } = req.params;
      const { limit } = req.query;
      
      if (!walletAddress) {
        res.status(400).json({
          success: false,
          message: 'Wallet address is required',
        });
        return;
      }

      const history = await profileSyncService.getProfileHistory(
        walletAddress,
        limit ? parseInt(limit as string) : undefined
      );
      
      res.json({
        success: true,
        data: history,
      });
    } catch (error) {
      console.error('Error fetching profile history:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch profile history',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
}

export const sellerController = new SellerController();