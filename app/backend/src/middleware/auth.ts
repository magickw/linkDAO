import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { validateJWTSecret } from '../utils/securityUtils';
import { ApiResponse } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    userId?: string;
    kycStatus?: string;
    permissions?: string[];
    id?: string; // Add id property for compatibility
    isAdmin?: boolean; // Add isAdmin property
  };
}

export const authenticateToken = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  console.log('[Auth] Authentication attempt:', {
    path: req.path,
    method: req.method,
    hasAuthHeader: !!authHeader,
    hasToken: !!token,
    tokenPreview: token ? `${token.substring(0, 10)}...` : 'none'
  });

  if (!token) {
    console.log('[Auth] No token provided');
    ApiResponse.unauthorized(res, 'Access token required. Please log in.');
    return;
  }

  try {
    validateJWTSecret(process.env.JWT_SECRET);
  } catch (error) {
    console.error('[Auth] JWT secret validation failed:', error);
    ApiResponse.serverError(res, 'Server configuration error');
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      console.log('[Auth] Token verification failed:', {
        error: err.message,
        name: err.name
      });
      
      if (err.name === 'TokenExpiredError') {
        ApiResponse.unauthorized(res, 'Token expired. Please log in again.');
      } else if (err.name === 'JsonWebTokenError') {
        ApiResponse.unauthorized(res, 'Invalid token. Please log in again.');
      } else {
        ApiResponse.forbidden(res, 'Authentication failed');
      }
      return;
    }
    
    console.log('[Auth] Token verified successfully:', {
      userId: user.userId || user.walletAddress,
      walletAddress: user.walletAddress
    });
    
    // Add id property for backward compatibility
    req.user = {
      ...user,
      id: user.userId || user.walletAddress
    };
    next();
  });
};