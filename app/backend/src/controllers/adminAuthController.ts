/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { sanitizeWalletAddress, sanitizeString, sanitizeNumber } from '../utils/inputSanitization';
import { safeLogger } from '../utils/safeLogger';
import { validationResult } from 'express-validator';
import { AdminAuthService } from '../services/adminAuthService';
import { successResponse, errorResponse, validationErrorResponse } from '../utils/apiResponse';
import { AuthenticatedRequest } from '../middleware/authMiddleware';
import { checkLoginAttempts, recordFailedLogin, resetLoginAttempts } from '../utils/securityUtils';

interface AdminLoginRequest {
  email: string;
  password: string;
}

class AdminAuthController {
  /**
   * Admin login with credentials
   * POST /api/auth/admin/login
   */
  async adminLogin(req: Request, res: Response) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return validationErrorResponse(res, errors.array());
      }

      const { email, password }: AdminLoginRequest = req.body;
      const ipAddress = req.ip || req.socket.remoteAddress;
      const userAgent = req.get('user-agent');

      // Check login attempts
      const attemptCheck = checkLoginAttempts(email);
      if (!attemptCheck.allowed) {
        return errorResponse(res, 'ACCOUNT_LOCKED', attemptCheck.message || 'Account locked', 429);
      }

      const result = await AdminAuthService.loginWithCredentials(
        email,
        password,
        ipAddress,
        userAgent
      );

      if (!result.success) {
        recordFailedLogin(email);
        return errorResponse(res, 'LOGIN_FAILED', result.message || 'Login failed', 401);
      }

      resetLoginAttempts(email);

      successResponse(
        res,
        {
          token: result.token,
          user: result.user,
          expiresIn: '24h',
        },
        200
      );
    } catch (error) {
      safeLogger.error('Admin login error:', error);
      // Provide more detailed error message for debugging
      const errorMessage = error instanceof Error ? error.message : 'Authentication failed';
      errorResponse(res, 'AUTHENTICATION_ERROR', `Admin authentication failed: ${errorMessage}`, 500);
    }
  }

  /**
   * Admin logout
   * POST /api/auth/admin/logout
   */
  async adminLogout(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.get('authorization')?.replace('Bearer ', '');

      if (token) {
        await AdminAuthService.revokeSession(token);

        if (req.user) {
          await AdminAuthService.logAction(
            req.user.userId,
            'ADMIN_LOGOUT',
            'auth',
            req.user.userId,
            {},
            req.ip,
            req.get('user-agent')
          );
        }
      }

      successResponse(res, { message: 'Logged out successfully' }, 200);
    } catch (error) {
      safeLogger.error('Admin logout error:', error);
      errorResponse(res, 'LOGOUT_ERROR', 'Logout failed', 500);
    }
  }

  /**
   * Get admin session info
   * GET /api/auth/admin/session
   */
  async getSessionInfo(req: AuthenticatedRequest, res: Response) {
    try {
      if (!req.user) {
        return errorResponse(res, 'UNAUTHORIZED', 'Authentication required', 401);
      }

      const token = req.get('authorization')?.replace('Bearer ', '');
      if (!token) {
        return errorResponse(res, 'NO_TOKEN', 'No token provided', 401);
      }

      const sessionData = await AdminAuthService.validateSession(token);
      
      if (!sessionData) {
        return errorResponse(res, 'INVALID_SESSION', 'Session expired or invalid', 401);
      }

      successResponse(
        res,
        {
          userId: sessionData.userId,
          type: sessionData.type,
          expiresIn: '24h',
          isValid: true,
        },
        200
      );
    } catch (error) {
      safeLogger.error('Get session info error:', error);
      errorResponse(res, 'SESSION_ERROR', 'Failed to get session info', 500);
    }
  }
}

export const adminAuthController = new AdminAuthController();
