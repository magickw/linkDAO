import { Request, Response } from 'express';
import { AuthenticationService } from '../services/authenticationService';
import { AuthenticatedRequest } from '../middleware/authenticationMiddleware';
import {
  AuthenticationRequest,
  RefreshTokenRequest,
  NonceRequest,
  AuthenticationResponse,
  NonceResponse,
  SessionStatusResponse,
  LogoutResponse,
} from '../types/authentication';
import { body, validationResult } from 'express-validator';

export class AuthenticationController {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  /**
   * Generate nonce for wallet authentication
   * POST /api/auth/nonce
   */
  generateNonce = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { walletAddress }: NonceRequest = req.body;

      if (!walletAddress || !/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WALLET_ADDRESS',
            message: 'Valid wallet address is required',
          },
        });
      }

      const nonceInfo = await this.authService.generateNonce(walletAddress);

      const response: NonceResponse = {
        nonce: nonceInfo.nonce,
        message: nonceInfo.message,
        expiresAt: nonceInfo.expiresAt.toISOString(),
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error generating nonce:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'NONCE_GENERATION_FAILED',
          message: 'Failed to generate authentication nonce',
          details: error.message,
        },
      });
    }
  };

  /**
   * Authenticate wallet with signature
   * POST /api/auth/wallet
   */
  authenticateWallet = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { walletAddress, signature, nonce }: AuthenticationRequest = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      // Validate required fields
      if (!walletAddress || !signature || !nonce) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REQUIRED_FIELDS',
            message: 'Wallet address, signature, and nonce are required',
          },
        });
      }

      // Validate wallet address format
      if (!/^0x[a-fA-F0-9]{40}$/.test(walletAddress)) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_WALLET_ADDRESS',
            message: 'Invalid wallet address format',
          },
        });
      }

      const authResult = await this.authService.authenticateWallet(
        walletAddress,
        signature,
        nonce,
        userAgent,
        ipAddress
      );

      if (!authResult.success) {
        const statusCode = this.getStatusCodeForAuthError(authResult.error?.code);
        return res.status(statusCode).json({
          success: false,
          error: authResult.error,
        });
      }

      const response: AuthenticationResponse = {
        success: true,
        sessionToken: authResult.sessionToken,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt?.toISOString(),
        walletAddress: walletAddress.toLowerCase(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error authenticating wallet:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'AUTHENTICATION_ERROR',
          message: 'Authentication service error',
          details: error.message,
        },
      });
    }
  };

  /**
   * Refresh authentication session
   * POST /api/auth/refresh
   */
  refreshSession = async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid request data',
            details: errors.array(),
          },
        });
      }

      const { refreshToken }: RefreshTokenRequest = req.body;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_REFRESH_TOKEN',
            message: 'Refresh token is required',
          },
        });
      }

      const authResult = await this.authService.refreshSession(refreshToken, userAgent, ipAddress);

      if (!authResult.success) {
        const statusCode = this.getStatusCodeForAuthError(authResult.error?.code);
        return res.status(statusCode).json({
          success: false,
          error: authResult.error,
        });
      }

      const response: AuthenticationResponse = {
        success: true,
        sessionToken: authResult.sessionToken,
        refreshToken: authResult.refreshToken,
        expiresAt: authResult.expiresAt?.toISOString(),
      };

      res.json(response);
    } catch (error) {
      console.error('Error refreshing session:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'REFRESH_ERROR',
          message: 'Session refresh failed',
          details: error.message,
        },
      });
    }
  };

  /**
   * Check authentication status
   * GET /api/auth/status
   */
  getAuthStatus = async (req: AuthenticatedRequest, res: Response) => {
    try {
      if (!req.user) {
        const response: SessionStatusResponse = {
          authenticated: false,
        };
        return res.json({
          success: true,
          data: response,
        });
      }

      const response: SessionStatusResponse = {
        authenticated: true,
        walletAddress: req.user.walletAddress,
        sessionId: req.user.sessionId,
      };

      res.json({
        success: true,
        data: response,
      });
    } catch (error) {
      console.error('Error getting auth status:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATUS_CHECK_ERROR',
          message: 'Failed to check authentication status',
          details: error.message,
        },
      });
    }
  };

  /**
   * Logout and invalidate session
   * POST /api/auth/logout
   */
  logout = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      const userAgent = req.get('User-Agent');
      const ipAddress = req.ip || req.connection.remoteAddress;

      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        await this.authService.logout(token, ipAddress, userAgent);
      }

      const response: LogoutResponse = {
        success: true,
        message: 'Successfully logged out',
      };

      res.json(response);
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'LOGOUT_ERROR',
          message: 'Logout failed',
          details: error.message,
        },
      });
    }
  };

  /**
   * Get authentication statistics (admin endpoint)
   * GET /api/auth/stats
   */
  getAuthStats = async (req: AuthenticatedRequest, res: Response) => {
    try {
      const walletAddress = req.query.walletAddress as string;
      const stats = await this.authService.getAuthStats(walletAddress);

      res.json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error('Error getting auth stats:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'STATS_ERROR',
          message: 'Failed to get authentication statistics',
          details: error.message,
        },
      });
    }
  };

  /**
   * Health check for authentication service
   * GET /api/auth/health
   */
  healthCheck = async (req: Request, res: Response) => {
    try {
      // Perform basic health checks
      const isHealthy = true; // Add actual health checks here

      res.json({
        success: true,
        data: {
          status: isHealthy ? 'healthy' : 'unhealthy',
          timestamp: new Date().toISOString(),
          service: 'authentication',
        },
      });
    } catch (error) {
      console.error('Auth health check error:', error);
      res.status(500).json({
        success: false,
        error: {
          code: 'HEALTH_CHECK_ERROR',
          message: 'Authentication service health check failed',
          details: error.message,
        },
      });
    }
  };

  /**
   * Get appropriate HTTP status code for auth error
   */
  private getStatusCodeForAuthError(errorCode?: string): number {
    switch (errorCode) {
      case 'INVALID_NONCE':
      case 'INVALID_SIGNATURE':
      case 'MISSING_REQUIRED_FIELDS':
      case 'INVALID_WALLET_ADDRESS':
        return 400;
      case 'WALLET_NOT_CONNECTED':
      case 'INVALID_TOKEN':
      case 'INVALID_REFRESH_TOKEN':
        return 401;
      case 'RATE_LIMIT_EXCEEDED':
        return 429;
      default:
        return 500;
    }
  }
}

/**
 * Validation rules for authentication endpoints
 */
export const authValidationRules = {
  generateNonce: [
    body('walletAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Valid Ethereum wallet address is required'),
  ],

  authenticateWallet: [
    body('walletAddress')
      .isString()
      .matches(/^0x[a-fA-F0-9]{40}$/)
      .withMessage('Valid Ethereum wallet address is required'),
    body('signature')
      .isString()
      .isLength({ min: 130, max: 132 })
      .withMessage('Valid signature is required'),
    body('nonce')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Nonce is required'),
  ],

  refreshSession: [
    body('refreshToken')
      .isString()
      .isLength({ min: 1 })
      .withMessage('Refresh token is required'),
  ],
};