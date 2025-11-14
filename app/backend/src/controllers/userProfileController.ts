/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { UserProfileService } from '../services/userProfileService';
import { CreateUserProfileInput, UpdateUserProfileInput } from '../models/UserProfile';
import { AppError, NotFoundError, ValidationError } from '../middleware/errorHandler';

const userProfileService = new UserProfileService();

export class UserProfileController {
  createProfile = async (req: Request, res: Response): Promise<Response> => {
    // Use the authenticated user's address
    const input: CreateUserProfileInput = {
      ...req.body,
      walletAddress: req.user?.walletAddress || req.body.walletAddress
    };
    
    const profile = await userProfileService.createProfile(input);
    return res.status(201).json({ data: profile });
  }

  getProfileById = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const profile = await userProfileService.getProfileById(id);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return res.json(profile);
  }

  getProfileByAddress = async (req: Request, res: Response): Promise<Response> => {
    const { address } = req.params;
    const profile = await userProfileService.getProfileByAddress(address);
    if (!profile) {
      // Return null instead of 404 to allow frontend to handle gracefully
      return res.json({ data: null });
    }
    return res.json({ data: profile });
  }

  updateProfile = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    const input: UpdateUserProfileInput = req.body;
    
    // Verify the user is updating their own profile
    const existingProfile = await userProfileService.getProfileById(id);
    if (!existingProfile) {
      throw new NotFoundError('Profile not found');
    }
    
    if (req.user?.walletAddress !== existingProfile.walletAddress) {
      throw new AppError('You can only update your own profile', 403);
    }
    
    const profile = await userProfileService.updateProfile(id, input);
    if (!profile) {
      throw new NotFoundError('Profile not found');
    }
    return res.json({ data: profile });
  }

  deleteProfile = async (req: Request, res: Response): Promise<Response> => {
    const { id } = req.params;
    
    // Verify the user is deleting their own profile
    const existingProfile = await userProfileService.getProfileById(id);
    if (!existingProfile) {
      throw new NotFoundError('Profile not found');
    }
    
    if (req.user?.walletAddress !== existingProfile.walletAddress) {
      throw new AppError('You can only delete your own profile', 403);
    }
    
    const deleted = await userProfileService.deleteProfile(id);
    if (!deleted) {
      throw new NotFoundError('Profile not found');
    }
    return res.status(204).send();
  }

  getAllProfiles = async (req: Request, res: Response): Promise<Response> => {
    const profiles = await userProfileService.getAllProfiles();
    return res.json(profiles);
  }
}
