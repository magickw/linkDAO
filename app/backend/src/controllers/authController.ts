/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { eq, and, lt, gte } from 'drizzle-orm';
import { users, authSessions, walletNonces } from '../db/schema';
import { twoFactorAuth } from '../db/schema/securitySchema';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { referralService } from '../services/referralService';
import { securityMonitoringService } from '../services/securityMonitoringService';
import { SiweMessage } from 'siwe';
import { contractWalletService } from '../services/contractWalletService';

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

      // Parse and validate SIWE message
      let siweMessage: SiweMessage;
      try {
        siweMessage = new SiweMessage(message);
        
        // Verify the signature using contract wallet service (supports both EOA and EIP-1271)
        const isValid = await contractWalletService.verifySignature(
          walletAddress,
          message,
          signature
        );

        if (!isValid) {
          safeLogger.warn('Signature verification failed', { walletAddress });
          await securityMonitoringService.logEvent({
            type: 'login_failure',
            walletAddress: walletAddress,
            ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { reason: 'signature_verification_failed' },
            timestamp: new Date()
          });
          return errorResponse(res, 'INVALID_SIGNATURE', 'Signature verification failed', 401);
        }

        // Verify the address matches
        if (siweMessage.address.toLowerCase() !== walletAddress.toLowerCase()) {
          safeLogger.warn('SIWE address mismatch', { 
            messageAddress: siweMessage.address, 
            providedAddress: walletAddress 
          });
          return errorResponse(res, 'ADDRESS_MISMATCH', 'Wallet address mismatch', 401);
        }
        
        // Verify expiration
        if (new Date(siweMessage.expirationTime || '') < new Date()) {
          safeLogger.warn('SIWE message expired', { 
            expirationTime: siweMessage.expirationTime 
          });
          return errorResponse(res, 'MESSAGE_EXPIRED', 'Message has expired, please request a new nonce', 400);
        }

        // Extract nonce from SIWE message
        const nonce = siweMessage.nonce;

        // Validate nonce from database
        const existingNonces = await db
          .select()
          .from(walletNonces)
          .where(
            and(
              eq(walletNonces.nonce, nonce),
              eq(walletNonces.walletAddress, walletAddress.toLowerCase()),
              eq(walletNonces.used, false),
              gte(walletNonces.expiresAt, new Date())
            )
          )
          .limit(1);

        if (existingNonces.length === 0) {
          safeLogger.warn('Invalid or expired SIWE nonce', { walletAddress, nonce });
          await securityMonitoringService.logEvent({
            type: 'login_failure',
            walletAddress: walletAddress,
            ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { reason: 'invalid_nonce', nonce },
            timestamp: new Date()
          });
          return errorResponse(res, 'INVALID_NONCE', 'Invalid or expired nonce, please request a new one', 400);
        }

        // Mark nonce as used
        await db
          .update(walletNonces)
          .set({ used: true })
          .where(eq(walletNonces.id, existingNonces[0].id));

      } catch (siweError: any) {
        safeLogger.error('SIWE validation error:', siweError);
        await securityMonitoringService.logEvent({
          type: 'login_failure',
          walletAddress: walletAddress,
          ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
          details: { reason: 'siwe_validation_error', error: siweError.message },
          timestamp: new Date()
        });
        return errorResponse(res, 'SIWE_VALIDATION_ERROR', 'Failed to validate SIWE message', 401);
      }

      // For development/testing: skip signature verification for known dev addresses
      const devMockAddresses = ['0x742d35Cc6634C0532925a3b844Bc5e8f5a7a3f9D'];
      const isDevMockAddress = devMockAddresses.some(addr => addr.toLowerCase() === walletAddress.toLowerCase());

      console.log('🔍 Checking dev address:', {
        walletAddress,
        isDevMockAddress,
        devMockAddresses,
        comparison: walletAddress?.toLowerCase()
      });

      if (!isDevMockAddress) {
        console.log('⚠️ Not a dev address, verifying signature');
        // Verify signature
        try {
          const recoveredAddress = ethers.verifyMessage(message, signature);

          if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
            safeLogger.warn('Signature verification failed: address mismatch', { recovered: recoveredAddress, expected: walletAddress });
            
            // Log failed login attempt
            await securityMonitoringService.logEvent({
              type: 'login_failure',
              walletAddress: walletAddress,
              ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
              userAgent: req.headers['user-agent'],
              details: { reason: 'signature_mismatch' },
              timestamp: new Date()
            });
            
            return errorResponse(res, 'INVALID_SIGNATURE', 'Signature verification failed', 401);
          }
        } catch (error) {
          safeLogger.error('Signature verification error:', error);
          
          // Log failed login attempt
          await securityMonitoringService.logEvent({
            type: 'login_failure',
            walletAddress: walletAddress,
            ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            details: { reason: 'signature_error', error: error.message },
            timestamp: new Date()
          });
          
          return errorResponse(res, 'SIGNATURE_ERROR', 'Invalid signature format', 400);
        }
      } else {
        // Dev mode: skip verification
        console.log('✅ DEV MODE: Skipping signature verification for', walletAddress);
        safeLogger.info('Dev mode: skipping signature verification for', { walletAddress });
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
          const newUserData: any = {
            walletAddress: walletAddress.toLowerCase(),
            handle: defaultHandle,
            displayName: defaultHandle,
            role: 'user', // Default role
            ldaoBalance: '0', // Initialize balance
            createdAt: new Date(),
            updatedAt: new Date()
          };

          // Only add isVerified if the column exists (optional for backward compatibility)
          // This prevents errors when migrations haven't run yet
          try {
            // Try to add isVerified - if column doesn't exist, it will be ignored
            newUserData.isVerified = false;
          } catch (e) {
            // Column doesn't exist yet, skip it
          }

          const newUser = await db
            .insert(users)
            .values(newUserData)
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

      // Check if user has 2FA enabled
      // Note: This is wrapped in try-catch because the two_factor_auth table may not exist yet
      let userHas2FA = false;
      try {
        // Only check 2FA if the table exists (graceful degradation)
        if (twoFactorAuth) {
          const authRecords = await db
            .select()
            .from(twoFactorAuth)
            .where(eq(twoFactorAuth.userId, userData.id));

          // Check if ANY 2FA method is enabled
          userHas2FA = authRecords.some(record => record.isEnabled === true);
          safeLogger.info('2FA status checked', { userId: userData.id, has2FA: userHas2FA, methods: authRecords.length });
        }
      } catch (twoFactorError: any) {
        // Silently skip 2FA check if table doesn't exist or other DB error
        safeLogger.info('2FA check skipped', {
          reason: twoFactorError?.message || 'Unknown error',
          code: twoFactorError?.code
        });
        // Continue without 2FA check if there's an error
      }

      // If user has 2FA enabled, return a response requiring 2FA verification
      if (userHas2FA) {
        safeLogger.info('2FA required for login', { userId: userData.id, walletAddress });
        return successResponse(res, {
          requires2FA: true,
          userId: userData.id,
          walletAddress: userData.walletAddress,
          message: 'Two-factor authentication is required. Please enter your verification code.'
        }, 200);
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
          // Check concurrent session limits
          const activeSessions = await db
            .select()
            .from(authSessions)
            .where(
              and(
                eq(authSessions.walletAddress, userData.walletAddress.toLowerCase()),
                eq(authSessions.isActive, true),
                gte(authSessions.expiresAt, new Date())
              )
            );

          const maxSessions = userData.maxSessions || 5; // Default to 5 if not set
          
          if (activeSessions.length >= maxSessions) {
            // Deactivate oldest session
            const oldestSession = activeSessions
              .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
            
            if (oldestSession) {
              await db
                .update(authSessions)
                .set({ isActive: false })
                .where(eq(authSessions.id, oldestSession.id));
              
              safeLogger.info('Deactivated oldest session due to max session limit', {
                walletAddress: userData.walletAddress,
                sessionId: oldestSession.id
              });
              
              await securityMonitoringService.logEvent({
                type: 'session_revoked',
                walletAddress: userData.walletAddress,
                details: { reason: 'max_sessions_reached', maxSessions },
                timestamp: new Date()
              });
            }
          }

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

          // Log security event
          await securityMonitoringService.logEvent({
            type: 'session_created',
            walletAddress: userData.walletAddress,
            ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
            userAgent: req.headers['user-agent'],
            timestamp: new Date()
          });
        } catch (sessionError) {
          safeLogger.error('Failed to create session record:', sessionError);
        }

        // Log successful login security event
        await securityMonitoringService.logEvent({
          type: 'login_success',
          walletAddress: userData.walletAddress,
          ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });

        // Return success response
        successResponse(res, {
          token,
          refreshToken, // Add refresh token to response
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
   * Verify 2FA token and complete login
   * POST /api/auth/wallet-connect/verify-2fa
   */
  async verify2FAAndCompleteLogin(req: Request, res: Response) {
    try {
      const { userId, walletAddress, token } = req.body;

      if (!userId || !walletAddress || !token) {
        return errorResponse(res, 'INVALID_REQUEST', 'userId, walletAddress, and token are required', 400);
      }

      safeLogger.info('Verifying 2FA for login', { userId, walletAddress });

      // Import speakeasy for TOTP verification
      const speakeasy = require('speakeasy');

      // Get user's 2FA record
      const [authRecord] = await db
        .select()
        .from(twoFactorAuth)
        .where(eq(twoFactorAuth.userId, userId))
        .limit(1);

      if (!authRecord || !authRecord.isEnabled) {
        safeLogger.warn('2FA not enabled for user', { userId });
        return errorResponse(res, '2FA_NOT_ENABLED', '2FA is not enabled for this account', 400);
      }

      // Decrypt the secret
      const crypto = require('crypto');
      const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key-32-bytes';
      const IV_LENGTH = 16;

      const decrypt = (text: string) => {
        try {
          const iv = Buffer.from(text.slice(0, IV_LENGTH * 2), 'hex');
          const encrypted = Buffer.from(text.slice(IV_LENGTH * 2), 'hex');
          const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY.slice(0, 32)), iv);
          let decrypted = decipher.update(encrypted);
          decrypted = Buffer.concat([decrypted, decipher.final()]);
          return decrypted.toString();
        } catch (error) {
          safeLogger.error('Decryption error:', error);
          return null;
        }
      };

      const decryptedSecret = decrypt(authRecord.secret);

      if (!decryptedSecret) {
        safeLogger.error('Failed to decrypt 2FA secret', { userId });
        return errorResponse(res, 'DECRYPTION_ERROR', 'Failed to verify 2FA token', 500);
      }

      // Verify the TOTP token
      const verified = speakeasy.totp.verify({
        secret: decryptedSecret,
        encoding: 'base32',
        token,
        window: 2
      });

      if (!verified) {
        safeLogger.warn('Invalid 2FA token', { userId, walletAddress });
        return errorResponse(res, 'INVALID_2FA_TOKEN', 'Invalid verification code', 400);
      }

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        return errorResponse(res, 'USER_NOT_FOUND', 'User not found', 404);
      }

      // Update lastLogin timestamp
      try {
        await db
          .update(users)
          .set({
            lastLogin: new Date(),
            updatedAt: new Date()
          })
          .where(eq(users.id, userId));
      } catch (updateError) {
        safeLogger.warn('Failed to update lastLogin timestamp:', updateError);
      }

      // Generate JWT token
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret || jwtSecret.length < 32) {
        throw new Error('JWT_SECRET not configured properly');
      }

      const authToken = jwt.sign(
        {
          userId: user.id,
          walletAddress: user.walletAddress,
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      // Generate refresh token
      const refreshToken = jwt.sign(
        {
          userId: user.id,
          walletAddress: user.walletAddress,
          type: 'refresh',
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Create session record
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
      try {
        await db.insert(authSessions).values({
          walletAddress: user.walletAddress.toLowerCase(),
          sessionToken: authToken,
          refreshToken: refreshToken,
          expiresAt: expiresAt,
          refreshExpiresAt: refreshExpiresAt,
          isActive: true,
          lastUsedAt: new Date(),
          createdAt: new Date()
        });
        safeLogger.info('Session created after 2FA verification', { walletAddress: user.walletAddress });
      } catch (sessionError) {
        safeLogger.error('Failed to create session record:', sessionError);
      }

      // Log successful 2FA login
      const { securityService } = require('../services/securityService');
      if (securityService && securityService.logActivity) {
        try {
          await securityService.logActivity(userId, 'login', 'User logged in with 2FA', { ipAddress: req.ip, deviceInfo: req.headers['user-agent'] });
        } catch (logError) {
          safeLogger.error('Failed to log 2FA login activity:', logError);
        }
      }

      // Return success response with tokens
      successResponse(res, {
        token: authToken,
        refreshToken,
        user: {
          id: user.id,
          walletAddress: user.walletAddress,
          handle: user.handle,
          profileCid: user.profileCid,
          role: user.role,
          email: user.email,
          permissions: user.permissions
        },
        expiresIn: '24h'
      }, 200);

    } catch (error) {
      safeLogger.error('2FA verification error:', error);
      errorResponse(res, '2FA_VERIFICATION_ERROR', 'Failed to verify 2FA token', 500);
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
   * Refresh authentication token
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return errorResponse(res, 'MISSING_REFRESH_TOKEN', 'Refresh token is required', 400);
      }

      // Verify token signature
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret) {
        throw new Error('JWT_SECRET not configured');
      }

      let decoded: any;
      try {
        decoded = jwt.verify(refreshToken, jwtSecret);
      } catch (jwtError) {
        return errorResponse(res, 'INVALID_REFRESH_TOKEN', 'Invalid or expired refresh token', 401);
      }

      // Check database for active session
      const sessionRecord = await db
        .select()
        .from(authSessions)
        .where(eq(authSessions.refreshToken, refreshToken))
        .limit(1);

      if (sessionRecord.length === 0 || !sessionRecord[0].isActive) {
        return errorResponse(res, 'INVALID_SESSION', 'Session invalid or expired', 401);
      }

      // Check if expired in DB (double check)
      if (new Date() > sessionRecord[0].refreshExpiresAt) {
        return errorResponse(res, 'SESSION_EXPIRED', 'Refresh token expired', 401);
      }

      const session = sessionRecord[0];
      const walletAddress = session.walletAddress;

      // Generate new tokens
      const newSessionToken = jwt.sign(
        {
          userId: decoded.userId,
          walletAddress: walletAddress,
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '24h' }
      );

      const newRefreshToken = jwt.sign(
        {
          userId: decoded.userId,
          walletAddress: walletAddress,
          type: 'refresh',
          timestamp: Date.now()
        },
        jwtSecret,
        { expiresIn: '7d' }
      );

      // Update session in DB with token rotation
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
      const refreshExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

      // Token rotation: invalidate old refresh token
      await db
        .update(authSessions)
        .set({
          sessionToken: newSessionToken,
          refreshToken: newRefreshToken, // New refresh token
          expiresAt: expiresAt,
          refreshExpiresAt: refreshExpiresAt,
          lastUsedAt: new Date(),
          updatedAt: new Date()
        })
        .where(eq(authSessions.id, session.id));

      safeLogger.info('Session refreshed successfully', { walletAddress });

      successResponse(res, {
        token: newSessionToken,
        refreshToken: newRefreshToken,
        expiresIn: '24h'
      });

    } catch (error) {
      safeLogger.error('Refresh token error:', error);
      errorResponse(res, 'REFRESH_ERROR', 'Failed to refresh token', 500);
    }
  }

  /**
   * Logout user
   * POST /api/auth/logout
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      // Get the session token from the Authorization header
      const authHeader = req.headers.authorization;
      const sessionToken = authHeader && authHeader.split(' ')[1];

      if (sessionToken) {
        // Mark session as inactive in database
        await db.update(authSessions)
          .set({ 
            isActive: false,
            updatedAt: new Date()
          })
          .where(eq(authSessions.sessionToken, sessionToken));

        safeLogger.info(`Session revoked for user: ${req.user.walletAddress}`);

        // Log session revocation security event
        await securityMonitoringService.logEvent({
          type: 'session_revoked',
          walletAddress: req.user.walletAddress,
          ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
          userAgent: req.headers['user-agent'],
          timestamp: new Date()
        });
      }

      successResponse(res, {
        message: 'Successfully logged out'
      });

    } catch (error) {
      safeLogger.error('Logout error:', error);
      errorResponse(res, 'LOGOUT_ERROR', 'Failed to logout', 500);
    }
  }

  /**
   * Logout from all devices
   * POST /api/auth/logout-all
   */
  async logoutAll(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      // Mark all active sessions as inactive for this user
      const result = await db.update(authSessions)
        .set({ 
          isActive: false,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(authSessions.walletAddress, req.user.walletAddress),
            eq(authSessions.isActive, true)
          )
        )
        .returning();

      const revokedCount = result.length || 0;

      safeLogger.info(`All sessions revoked for user: ${req.user.walletAddress}`, {
        revokedCount
      });

      // Log bulk session revocation security event
      await securityMonitoringService.logEvent({
        type: 'all_sessions_revoked',
        walletAddress: req.user.walletAddress,
        ipAddress: (req as any).ip || (req as any).socket?.remoteAddress,
        userAgent: req.headers['user-agent'],
        details: { revokedCount },
        timestamp: new Date()
      });

      successResponse(res, {
        message: 'Successfully logged out from all devices',
        revokedCount
      });

    } catch (error) {
      safeLogger.error('Logout all error:', error);
      errorResponse(res, 'LOGOUT_ALL_ERROR', 'Failed to logout from all devices', 500);
    }
  }

  /**
   * Get security summary for authenticated user
   * GET /api/auth/security/summary
   */
  async getSecuritySummary(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const securitySummary = await securityMonitoringService.getSecuritySummary(
        req.user.walletAddress
      );

      successResponse(res, securitySummary);
    } catch (error) {
      safeLogger.error('Get security summary error:', error);
      errorResponse(res, 'SECURITY_SUMMARY_ERROR', 'Failed to get security summary', 500);
    }
  }
}

export const authController = new AuthController();
