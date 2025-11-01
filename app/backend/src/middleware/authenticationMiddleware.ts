import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { AuthenticationService } from '../services/authenticationService';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    sessionId: string;
  };
}

export class AuthenticationMiddleware {
  private authService: AuthenticationService;

  constructor(authService: AuthenticationService) {
    this.authService = authService;
  }

  /**
   * Middleware to require authentication
   */
  requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'MISSING_TOKEN',
            message: 'Authentication token is required',
          },
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix
      const sessionInfo = await this.authService.validateSession(token);

      if (!sessionInfo) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'INVALID_TOKEN',
            message: 'Invalid or expired authentication token',
          },
        });
      }

      // Add user info to request
      req.user = {
        walletAddress: sessionInfo.walletAddress,
        sessionId: sessionInfo.id,
      };

      next();
    } catch (error) {
      safeLogger.error('Authentication middleware error:', error);
      return res.status(500).json({
        success: false,
        error: {
          code: 'AUTH_ERROR',
          message: 'Authentication service error',
        },
      });
    }
  };

  /**
   * Middleware for optional authentication (doesn't fail if no token)
   */
  optionalAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const authHeader = req.headers.authorization;
      
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const sessionInfo = await this.authService.validateSession(token);

        if (sessionInfo) {
          req.user = {
            walletAddress: sessionInfo.walletAddress,
            sessionId: sessionInfo.id,
          };
        }
      }

      next();
    } catch (error) {
      safeLogger.error('Optional authentication middleware error:', error);
      // Don't fail the request for optional auth
      next();
    }
  };

  /**
   * Middleware to check if user owns a specific wallet address
   */
  requireWalletOwnership = (walletAddressParam: string = 'walletAddress') => {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          error: {
            code: 'AUTHENTICATION_REQUIRED',
            message: 'Authentication is required for this action',
          },
        });
      }

      const requestedWalletAddress = req.params[walletAddressParam] || req.body[walletAddressParam];
      
      if (!requestedWalletAddress) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'MISSING_WALLET_ADDRESS',
            message: 'Wallet address is required',
          },
        });
      }

      if (req.user.walletAddress.toLowerCase() !== requestedWalletAddress.toLowerCase()) {
        return res.status(403).json({
          success: false,
          error: {
            code: 'WALLET_ACCESS_DENIED',
            message: 'You can only access your own wallet data',
          },
        });
      }

      next();
    };
  };

  /**
   * Rate limiting for authentication endpoints
   */
  authRateLimit = (maxAttempts: number = 5, windowMinutes: number = 15) => {
    const attempts = new Map<string, { count: number; resetTime: number }>();

    return (req: Request, res: Response, next: NextFunction) => {
      const clientId = req.ip || 'unknown';
      const now = Date.now();
      const windowMs = windowMinutes * 60 * 1000;

      const clientAttempts = attempts.get(clientId);
      
      if (!clientAttempts || now > clientAttempts.resetTime) {
        attempts.set(clientId, { count: 1, resetTime: now + windowMs });
        return next();
      }

      if (clientAttempts.count >= maxAttempts) {
        return res.status(429).json({
          success: false,
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many authentication attempts. Please try again in ${windowMinutes} minutes.`,
          },
        });
      }

      clientAttempts.count++;
      next();
    };
  };
}

/**
 * Helper function to extract wallet address from request
 */
export function getWalletAddressFromRequest(req: AuthenticatedRequest): string | null {
  return req.user?.walletAddress || null;
}

/**
 * Helper function to check if request is authenticated
 */
export function isAuthenticated(req: AuthenticatedRequest): boolean {
  return !!req.user?.walletAddress;
}
