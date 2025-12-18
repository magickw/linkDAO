/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq } from 'drizzle-orm';
import { users, authSessions } from '../db/schema';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { referralService } from '../services/referralService';

// Initialize database connection
import { db } from '../db'; // Use the shared database connection instead of creating a new one

interface WalletConnectRequest {
  walletAddress: string;
  signature: string;
  message: string;
  referralCode?: string;
}

interface ProfileUpdateRequest {
  displayName?: string;
  bio?: string;
  profileImageUrl?: string;
  ensName?: string;
}

class AuthController {
  /**
   * Authenticate user with wallet signature
   * POST /api/auth/wallet-connect
   */
  async walletConnect(req: Request, res: Response) {
    try {
      safeLogger.info('Starting walletConnect authentication');

      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        safeLogger.warn('Validation failed for walletConnect', { errors: errors.array() });
        return validationErrorResponse(res, errors.array());
      }

      const { walletAddress, signature, message, referralCode }: WalletConnectRequest & { referralCode?: string } = req.body;
      safeLogger.info('Processing wallet connect for address', { walletAddress });

      // Verify signature
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);

        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          safeLogger.warn('Signature verification failed: address mismatch', { recovered: recoveredAddress, expected: walletAddress });
          return errorResponse(res, 'INVALID_SIGNATURE', 'Signature verification failed', 401);
        }
      } catch (error) {
        safeLogger.error('Signature verification error:', error);
        return errorResponse(res, 'SIGNATURE_ERROR', 'Invalid signature format', 400);
      }

      // Find or create user
      let user;
      let isNewUser = false;

      try {
        safeLogger.info('Looking up user in database', { walletAddress });
        const existingUsers = await db
          .select()
          .from(users)
          .where(eq(users.walletAddress, walletAddress.toLowerCase()))
          .limit(1);

        if (existingUsers.length === 0) {
          safeLogger.info('User not found, creating new user', { walletAddress });
          isNewUser = true;

          // Generate a default handle from wallet address
          const shortAddress = walletAddress.slice(0, 8);
          const defaultHandle = `user_${shortAddress}`;

          // Create new user with comprehensive initial data
          const newUser = await db
            .insert(users)
            .values({
              walletAddress: walletAddress.toLowerCase(),
              handle: defaultHandle,
              displayName: defaultHandle,
              role: 'user', // Default role
              ldaoBalance: '0', // Initialize balance
              createdAt: new Date(),
              updatedAt: new Date()
            })
            .returning();

          user = newUser;

          safeLogger.info('New user created successfully', {
            walletAddress,
            handle: defaultHandle,
            userId: newUser[0]?.id
          });
        } else {
          user = existingUsers;

          // Update lastLogin timestamp for existing users
          try {
            await db
              .update(users)
              .set({
                lastLogin: new Date(),
                updatedAt: new Date()
              })
              .where(eq(users.id, existingUsers[0].id));

            safeLogger.info('Updated lastLogin for existing user', { walletAddress });
          } catch (updateError) {
            safeLogger.warn('Failed to update lastLogin timestamp', { error: updateError });
            // Continue even if update fails
          }
        }
      } catch (dbError) {
        safeLogger.error('Database error during user lookup/creation:', dbError);
        return errorResponse(res, 'DATABASE_ERROR', 'Failed to access user database', 500);
      }

      // Force admin role for specific address
      try {
        const ADMIN_ADDRESS = process.env.ADMIN_ADDRESS || '0xEe034b53D4cCb101b2a4faec27708be507197350';
        if (walletAddress.toLowerCase() === ADMIN_ADDRESS.toLowerCase()) {
          const currentUser = user[0];
          if (currentUser.role !== 'admin') {
            safeLogger.info('Promoting user to admin', { walletAddress });
            const updatedUser = await db
              .update(users)
              .set({ role: 'admin' })
              .where(eq(users.id, currentUser.id))
              .returning();
            user = updatedUser;
          }
        }
      } catch (adminError) {
        safeLogger.error('Error promoting admin user:', adminError);
        // Continue even if admin promotion fails
      }

      const userData = user[0];

      // Check if user has admin role for admin login attempts
      const isAdminUser = ['admin', 'super_admin', 'moderator'].includes(userData.role || '');
      safeLogger.info('Wallet authentication attempt', {
        walletAddress,
        hasAdminRole: isAdminUser,
        userRole: userData.role
      });

      // Handle referral code if provided and user is new
      if (isNewUser && referralCode) {
        try {
          safeLogger.info('Processing referral code', { referralCode, userId: userData.id });
          // Validate referral code
          const referralValidation = await referralService.validateReferralCode(referralCode);

          if (referralValidation.valid && referralValidation.referrerId) {
            // Create referral relationship
            await referralService.createReferral({
              referrerId: referralValidation.referrerId,
              refereeId: userData.id,
              tier: 1, // Default tier
              bonusPercentage: 10 // Default bonus percentage
            });
            safeLogger.info('Referral processed successfully');
          }
        } catch (error) {
          safeLogger.error('Error processing referral during signup:', error);
          // Don't fail signup if referral processing fails
        }
      }

      // Generate JWT token
      try {
        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret || jwtSecret.length < 32) {
          throw new Error('JWT_SECRET not configured properly');
        }

        const token = jwt.sign(
          {
            userId: userData.id,
            walletAddress: userData.walletAddress,
            timestamp: Date.now()
          },
          jwtSecret,
          { expiresIn: '24h' }
        );

        // Generate refresh token
        const refreshToken = jwt.sign(
          {
            userId: userData.id,
            walletAddress: userData.walletAddress,
            type: 'refresh',
            timestamp: Date.now()
          },
          jwtSecret,
          { expiresIn: '7d' }
        );

        // Create session record in auth_sessions table
        const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours from now
        const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
        try {
          await db.insert(authSessions).values({
            walletAddress: userData.walletAddress.toLowerCase(),
            sessionToken: token,
            refreshToken: refreshToken,
            expiresAt: expiresAt,
            refreshExpiresAt: refreshExpiresAt,
            isActive: true,
            lastUsedAt: new Date(),
            createdAt: new Date()
          });
          safeLogger.info('Session created in auth_sessions table', { walletAddress: userData.walletAddress });
        } catch (sessionError) {
          safeLogger.error('Failed to create session record:', sessionError);
        }

        // Return success response
        successResponse(res, {
          token,
          user: {
            id: userData.id,
            walletAddress: userData.walletAddress,
            handle: userData.handle,
            profileCid: userData.profileCid,
            role: userData.role, // Include role in response
            email: userData.email, // Include email in response
            permissions: userData.permissions // Include permissions in response
          },
          expiresIn: '24h',
          isNewUser
        }, 200);
      } catch (jwtError) {
        safeLogger.error('JWT generation error:', jwtError);
        return errorResponse(res, 'TOKEN_ERROR', 'Failed to generate session token', 500);
      }

    } catch (error) {
      safeLogger.error('Wallet connect unhandled error:', error);
      errorResponse(res, 'AUTHENTICATION_ERROR', 'Authentication failed', 500);
    }
  }

  /**
   * Get authenticated user profile
   * GET /api/auth/profile
   */
  async getProfile(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      // Get user from database
      const user = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, req.user.walletAddress))
        .limit(1);

      if (user.length === 0) {
        return errorResponse(res, 'USER_NOT_FOUND', 'User not found', 404);
      }

      const userData = user[0];

      successResponse(res, {
        id: userData.id,
        walletAddress: userData.walletAddress,
        handle: userData.handle,
        profileCid: userData.profileCid,
        role: userData.role, // Include role in the response
        email: userData.email, // Include email in the response
        permissions: userData.permissions, // Include permissions in the response
        billingAddress: {
          firstName: userData.billingFirstName,
          lastName: userData.billingLastName,
          company: userData.billingCompany,
          address1: userData.billingAddress1,
          address2: userData.billingAddress2,
          city: userData.billingCity,
          state: userData.billingState,
          zipCode: userData.billingZipCode,
          country: userData.billingCountry,
          phone: userData.billingPhone
        },
        shippingAddress: {
          firstName: userData.shippingFirstName,
          lastName: userData.shippingLastName,
          company: userData.shippingCompany,
          address1: userData.shippingAddress1,
          address2: userData.shippingAddress2,
          city: userData.shippingCity,
          state: userData.shippingState,
          zipCode: userData.shippingZipCode,
          country: userData.shippingCountry,
          phone: userData.shippingPhone,
          sameAsBilling: userData.shippingSameAsBilling
        },
        createdAt: userData.createdAt
      });

    } catch (error) {
      safeLogger.error('Get profile error:', error);
      errorResponse(res, 'PROFILE_ERROR', 'Failed to get profile', 500);
    }
  }

  /**
   * Update authenticated user profile
   * PUT /api/auth/profile
   */
  async updateProfile(req: AuthenticatedRequest, res: Response) {
    try {
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const updateData: ProfileUpdateRequest = req.body;

      // Update user profile
      const updatedUser = await db
        .update(users)
        .set({
          handle: updateData.displayName,
          profileCid: updateData.profileImageUrl,
          // Add other fields as needed
        })
        .where(eq(users.walletAddress, req.user.walletAddress))
        .returning();

      if (updatedUser.length === 0) {
        return errorResponse(res, 'USER_NOT_FOUND', 'User not found', 404);
      }

      const userData = updatedUser[0];

      successResponse(res, {
        id: userData.id,
        walletAddress: userData.walletAddress,
        handle: userData.handle,
        profileCid: userData.profileCid,
        role: userData.role, // Include role in the response
        email: userData.email, // Include email in the response
        permissions: userData.permissions, // Include permissions in the response
        message: 'Profile updated successfully'
      });

    } catch (error) {
      safeLogger.error('Update profile error:', error);
      errorResponse(res, 'UPDATE_ERROR', 'Failed to update profile', 500);
    }
  }

  /**
   * Get KYC status for authenticated user
   * GET /api/auth/kyc/status
   */
  async getKYCStatus(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      // For now, return a default KYC status since the full KYC system is not implemented
      // In a real implementation, this would check the user's actual KYC status
      const kycStatus = {
        status: 'none',
        tier: 'none',
        submittedAt: null,
        reviewedAt: null,
        expiresAt: null,
        rejectionReason: null,
        requiredDocuments: [],
        completedDocuments: []
      };

      successResponse(res, kycStatus);

    } catch (error) {
      safeLogger.error('Get KYC status error:', error);
      errorResponse(res, 'KYC_STATUS_ERROR', 'Failed to get KYC status', 500);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      // In a JWT-based system, logout is typically handled client-side
      // by removing the token. Here we just confirm the logout.

      successResponse(res, {
        message: 'Successfully logged out'
      });

    } catch (error) {
      safeLogger.error('Logout error:', error);
      errorResponse(res, 'LOGOUT_ERROR', 'Failed to logout', 500);
    }
  }
}

export const authController = new AuthController();
