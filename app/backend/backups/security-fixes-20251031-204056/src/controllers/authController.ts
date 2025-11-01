import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { validationResult } from 'express-validator';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import jwt from 'jsonwebtoken';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { ethers } from 'ethers';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { drizzle } from 'drizzle-orm/postgres-js';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import postgres from 'postgres';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { eq } from 'drizzle-orm';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { users } from '../db/schema';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';

// Initialize database connection
const connectionString = process.env.DATABASE_URL!;
const sql = postgres(connectionString, { ssl: 'require' });
const db = drizzle(sql);

interface WalletConnectRequest {
  walletAddress: string;
  signature: string;
  message: string;
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
      // Validate request
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      const { walletAddress, signature, message }: WalletConnectRequest = req.body;

      // Verify signature
      try {
        const recoveredAddress = ethers.verifyMessage(message, signature);
        
        if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
          return errorResponse(res, 'INVALID_SIGNATURE', 'Signature verification failed', 401);
        }
      } catch (error) {
        safeLogger.error('Signature verification error:', error);
        return errorResponse(res, 'SIGNATURE_ERROR', 'Invalid signature format', 400);
      }

      // Find or create user
      let user = await db
        .select()
        .from(users)
        .where(eq(users.walletAddress, walletAddress.toLowerCase()))
        .limit(1);

      if (user.length === 0) {
        // Create new user
        const newUser = await db
          .insert(users)
          .values({
            walletAddress: walletAddress.toLowerCase(),
            createdAt: new Date()
          })
          .returning();
        
        user = newUser;
      }

      const userData = user[0];

      // Generate JWT token
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

      // Return success response
      successResponse(res, {
        token,
        user: {
          id: userData.id,
          walletAddress: userData.walletAddress,
          handle: userData.handle,
          profileCid: userData.profileCid
        },
        expiresIn: '24h'
      }, 200);

    } catch (error) {
      safeLogger.error('Wallet connect error:', error);
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
        message: 'Profile updated successfully'
      });

    } catch (error) {
      safeLogger.error('Update profile error:', error);
      errorResponse(res, 'UPDATE_ERROR', 'Failed to update profile', 500);
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