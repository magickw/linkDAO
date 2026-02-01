import { Request, Response, NextFunction, RequestHandler } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '../utils/apiResponse';
import { AuthenticatedUser } from '../types/authentication';

const authService = new AuthService();

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export { AuthenticatedUser };

export const authMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  console.log('[Auth] === AUTH MIDDLEWARE ENTERED ===');
  console.log('[Auth] Path:', req.path);
  console.log('[Auth] Method:', req.method);

  const authHeader = req.headers['authorization'];
  console.log('[Auth] Auth header present:', !!authHeader);
  console.log('[Auth] Auth header preview:', authHeader ? authHeader.substring(0, 50) + '...' : 'NONE');

  const token = authHeader && authHeader.split(' ')[1];
  console.log('[Auth] Token extracted:', !!token);

  if (!token) {
    console.log('[Auth] ❌ NO TOKEN FOUND - returning 401');
    return ApiResponse.unauthorized(res, 'Access token required');
  }

  try {
    console.log('[Auth] 🔍 Verifying token...');
    const verifyStart = Date.now();
    const user = await authService.verifyToken(token);
    console.log('[Auth] ✅ Token verified in', Date.now() - verifyStart, 'ms, user:', !!user);

    if (!user) {
      console.log('[Auth] ❌ User not found from token');
      return ApiResponse.unauthorized(res, 'Invalid token');
    }

    console.log('[Auth] ✅ User authenticated:', { userId: user.userId, walletAddress: user.walletAddress });
    const areq = req as AuthenticatedRequest;
    areq.user = user;
    console.log('[Auth] ✅ Calling next()');
    next();
  } catch (error) {
    console.error('[Auth] ❌ Exception during token verification:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[Auth] Error message:', errorMessage);
    const isExpired = errorMessage.includes('expired') || errorMessage.includes('jwt expired');
    const isInvalid = errorMessage.includes('invalid') || errorMessage.includes('malformed');

    if (isExpired) {
      console.log('[Auth] ❌ Token expired - returning 401');
      return ApiResponse.unauthorized(res, 'Token has expired');
    }
    if (isInvalid) {
      console.log('[Auth] ❌ Token invalid - returning 401');
      return ApiResponse.unauthorized(res, 'Token is malformed or invalid');
    }
    console.log('[Auth] ❌ Token validation failed - returning 401');
    return ApiResponse.unauthorized(res, 'Token validation failed');
  }
};

/**
 * Optional authentication middleware
 * Attempts to authenticate but doesn't fail if no token is present
 * Sets req.user if valid token is found, otherwise continues without it
 */
export const optionalAuthMiddleware: RequestHandler = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    // No token - that's fine for optional auth
    return next();
  }

  try {
    const user = await authService.verifyToken(token);

    if (user) {
      const areq = req as AuthenticatedRequest;
      areq.user = user;
    }
    // Continue whether we found a user or not
    next();
  } catch (error) {
    // Token validation failed, but that's okay for optional auth
    // Just continue without setting user
    next();
  }
};