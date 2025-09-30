import { Request, Response } from 'express';
import { generateToken, verifySignature } from '../middleware/authMiddleware';
import { UserProfileService } from '../services/userProfileService';
import { AppError, UnauthorizedError, ValidationError, NotFoundError } from '../middleware/errorHandler';
import { AuthService } from '../services/authService';
import { KYCService } from '../services/kycService';

const userProfileService = new UserProfileService();
const authService = new AuthService();
const kycService = new KYCService();

export class AuthController {
  /**
   * Web3 wallet authentication with signature verification
   */
  async authenticateWallet(req: Request, res: Response): Promise<Response> {
    try {
      const { address, signature, message, nonce } = req.body;
      
      if (!address || !signature || !message || !nonce) {
        throw new ValidationError('Address, signature, message, and nonce are required');
      }
      
      // Verify the signature
      const isValidSignature = await verifySignature(address, signature, message);
      if (!isValidSignature) {
        throw new UnauthorizedError('Invalid signature');
      }
      
      // Verify nonce
      const isValidNonce = await authService.verifyNonce(address, nonce);
      if (!isValidNonce) {
        throw new UnauthorizedError('Invalid or expired nonce');
      }
      
      // Get or create user profile
      let profile = await userProfileService.getProfileByAddress(address);
      if (!profile) {
        profile = await userProfileService.createProfile({
          walletAddress: address,
          handle: `user_${address.slice(-8)}`,
          ens: ''
        });
      }
      
      // Generate JWT token with enhanced claims
      const token = generateToken(address, {
        userId: profile.id,
        kycStatus: profile.kycStatus || 'none',
        permissions: await authService.getUserPermissions(address)
      });
      
      // Update last login
      await authService.updateLastLogin(address);
      
      return res.json({
        success: true,
        token,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens,
          kycStatus: profile.kycStatus || 'none',
          createdAt: profile.createdAt
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Wallet authentication failed', 500, 'AUTH_ERROR');
    }
  }

  /**
   * Get authentication nonce for wallet signature
   */
  async getNonce(req: Request, res: Response): Promise<Response> {
    try {
      const { address } = req.params;
      
      if (!address) {
        throw new ValidationError('Wallet address is required');
      }
      
      const nonce = await authService.generateNonce(address);
      const message = `Sign this message to authenticate with LinkDAO Marketplace.\n\nNonce: ${nonce}\nTimestamp: ${new Date().toISOString()}`;
      
      return res.json({
        success: true,
        nonce,
        message
      });
    } catch (error: any) {
      throw new AppError('Failed to generate nonce', 500, 'NONCE_ERROR');
    }
  }

  /**
   * Legacy login endpoint - generates a JWT token for the user
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
      const token = generateToken(address, {
        userId: profile.id,
        kycStatus: profile.kycStatus || 'none'
      });
      
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
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Internal server error', 500, 'INTERNAL_ERROR');
    }
  }

  /**
   * Enhanced user registration with profile setup
   */
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { 
        address, 
        handle, 
        ens, 
        email, 
        preferences,
        privacySettings 
      } = req.body;
      
      if (!address || !handle) {
        throw new ValidationError('Wallet address and handle are required');
      }
      
      // Validate handle format
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(handle)) {
        throw new ValidationError('Handle must be 3-20 characters and contain only letters, numbers, and underscores');
      }
      
      // Check if user profile already exists
      const existingProfile = await userProfileService.getProfileByAddress(address);
      if (existingProfile) {
        throw new ValidationError('User profile already exists for this address');
      }
      
      // Check if handle is already taken
      const existingHandle = await userProfileService.getProfileByHandle(handle);
      if (existingHandle) {
        throw new ValidationError('Handle is already taken');
      }
      
      // Create user profile with enhanced data
      const profile = await userProfileService.createProfile({
        walletAddress: address,
        handle,
        ens: ens || '',
        email: email || null,
        preferences: preferences || {
          notifications: {
            email: false,
            push: true,
            inApp: true
          },
          privacy: {
            showEmail: false,
            showTransactions: false,
            allowDirectMessages: true
          },
          trading: {
            autoApproveSmallAmounts: false,
            defaultSlippage: 0.5,
            preferredCurrency: 'USDC'
          }
        },
        privacySettings: privacySettings || {
          profileVisibility: 'public',
          activityVisibility: 'public',
          contactVisibility: 'friends'
        }
      });
      
      // Initialize user session
      await authService.initializeUserSession(address);
      
      // Generate JWT token with enhanced claims
      const token = generateToken(address, {
        userId: profile.id,
        kycStatus: 'none',
        permissions: ['basic_trading', 'profile_management']
      });
      
      return res.status(201).json({
        success: true,
        token,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens,
          email: profile.email,
          kycStatus: 'none',
          preferences: profile.preferences,
          privacySettings: profile.privacySettings,
          createdAt: profile.createdAt
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Registration failed', 500, 'REGISTRATION_ERROR');
    }
  }

  /**
   * Get current user profile with enhanced data
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
      
      // Get additional user data
      const kycStatus = await kycService.getKYCStatus(req.user.walletAddress);
      const sessionInfo = await authService.getSessionInfo(req.user.walletAddress);
      
      return res.json({
        success: true,
        user: {
          id: profile.id,
          address: profile.walletAddress,
          handle: profile.handle,
          ens: profile.ens,
          email: profile.email,
          avatarCid: profile.avatarCid,
          bioCid: profile.bioCid,
          kycStatus: kycStatus.status,
          kycTier: kycStatus.tier,
          preferences: profile.preferences,
          privacySettings: profile.privacySettings,
          sessionInfo: {
            lastLogin: sessionInfo.lastLogin,
            loginCount: sessionInfo.loginCount,
            deviceInfo: sessionInfo.deviceInfo
          },
          createdAt: profile.createdAt,
          updatedAt: profile.updatedAt
        }
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get user profile', 500, 'PROFILE_ERROR');
    }
  }

  /**
   * Update user preferences
   */
  async updatePreferences(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const { preferences } = req.body;
      
      if (!preferences) {
        throw new ValidationError('Preferences are required');
      }
      
      const updatedProfile = await userProfileService.updatePreferences(
        req.user.walletAddress,
        preferences
      );
      
      return res.json({
        success: true,
        preferences: updatedProfile.preferences
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update preferences', 500, 'PREFERENCES_ERROR');
    }
  }

  /**
   * Update privacy settings
   */
  async updatePrivacySettings(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const { privacySettings } = req.body;
      
      if (!privacySettings) {
        throw new ValidationError('Privacy settings are required');
      }
      
      const updatedProfile = await userProfileService.updatePrivacySettings(
        req.user.walletAddress,
        privacySettings
      );
      
      return res.json({
        success: true,
        privacySettings: updatedProfile.privacySettings
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to update privacy settings', 500, 'PRIVACY_SETTINGS_ERROR');
    }
  }

  /**
   * Initiate KYC verification process
   */
  async initiateKYC(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const { tier, documents } = req.body;
      
      if (!tier || !['basic', 'intermediate', 'advanced'].includes(tier)) {
        throw new ValidationError('Valid KYC tier is required (basic, intermediate, advanced)');
      }
      
      const kycResult = await kycService.initiateKYC(req.user.walletAddress, tier, documents);
      
      return res.json({
        success: true,
        kycId: kycResult.id,
        status: kycResult.status,
        requiredDocuments: kycResult.requiredDocuments,
        estimatedProcessingTime: kycResult.estimatedProcessingTime
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to initiate KYC', 500, 'KYC_INITIATE_ERROR');
    }
  }

  /**
   * Get KYC status
   */
  async getKYCStatus(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const kycStatus = await kycService.getKYCStatus(req.user.walletAddress);
      
      return res.json({
        success: true,
        ...kycStatus
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Failed to get KYC status', 500, 'KYC_STATUS_ERROR');
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      await authService.invalidateSession(req.user.walletAddress);
      
      return res.json({
        success: true,
        message: 'Successfully logged out'
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Logout failed', 500, 'LOGOUT_ERROR');
    }
  }

  /**
   * Refresh JWT token
   */
  async refreshToken(req: Request, res: Response): Promise<Response> {
    try {
      if (!req.user) {
        throw new UnauthorizedError('Unauthorized');
      }
      
      const profile = await userProfileService.getProfileByAddress(req.user.walletAddress);
      if (!profile) {
        throw new NotFoundError('User profile not found');
      }
      
      const kycStatus = await kycService.getKYCStatus(req.user.walletAddress);
      const permissions = await authService.getUserPermissions(req.user.walletAddress);
      
      const newToken = generateToken(req.user.walletAddress, {
        userId: profile.id,
        kycStatus: kycStatus.status,
        permissions
      });
      
      return res.json({
        success: true,
        token: newToken
      });
    } catch (error: any) {
      if (error instanceof AppError) {
        throw error;
      }
      throw new AppError('Token refresh failed', 500, 'TOKEN_REFRESH_ERROR');
    }
  }
}