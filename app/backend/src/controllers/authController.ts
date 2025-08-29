import { Request, Response } from 'express';
import { generateToken } from '../middleware/authMiddleware';
import { UserProfileService } from '../services/userProfileService';
import { APIError, UnauthorizedError, ValidationError, NotFoundError } from '../middleware/errorHandler';

const userProfileService = new UserProfileService();

export class AuthController {
  /**
   * Login endpoint - generates a JWT token for the user
   */
  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.body;
      
      if (!address) {
        throw new ValidationError('Wallet address is required');
      }
      
      // Check if user profile exists
      const profile = await userProfileService.getProfileByAddress(address);
      
      if (!profile) {
        throw new NotFoundError('User profile not found. Please register first.');
      }
      
      // Generate JWT token
      const token = generateToken(address);
      
      return res.json({
        success: true,
        token,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens
        }
      });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, 'Internal server error');
    }
  }

  /**
   * Register endpoint - creates a user profile and generates a JWT token
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { address, handle, ens } = req.body;
      
      if (!address || !handle) {
        throw new ValidationError('Wallet address and handle are required');
      }
      
      // Check if user profile already exists
      const existingProfile = await userProfileService.getProfileByAddress(address);
      
      if (existingProfile) {
        throw new ValidationError('User profile already exists for this address');
      }
      
      // Create user profile
      const profile = await userProfileService.createProfile({
        walletAddress: address,
        handle,
        ens: ens || ''
      });
      
      // Generate JWT token
      const token = generateToken(address);
      
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens
        }
      });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, 'Internal server error');
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const profile = await userProfileService.getProfileByAddress(req.user.walletAddress);
      
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }
      
      return res.json({
        success: true,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens,
          avatarCid: profile.avatarCid,
          bioCid: profile.bioCid,
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error: any) {
      if (error instanceof APIError) {
        throw error;
      }
      throw new APIError(500, 'Internal server error');
    }
  }
}