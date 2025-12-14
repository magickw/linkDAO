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

  if (!token) {
    ApiResponse.unauthorized(res, 'Access token required');
    return;
  }

  try {
    validateJWTSecret(process.env.JWT_SECRET);
  } catch (error) {
    ApiResponse.serverError(res, 'Server configuration error');
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      ApiResponse.forbidden(res, 'Invalid token');
      return;
    }
    
    // Add id property for backward compatibility
    req.user = {
      ...user,
      id: user.userId || user.walletAddress
    };
    next();
  });
};