/**
 * Seller Middleware
 * Validation and access control for seller-related operations
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { SellerError, SellerErrorType } from '../types/sellerError';
import { ApiResponse } from '../utils/apiResponse';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    id: string;
    role?: string;
  };
}

/**
 * Validate seller access - ensures user can access seller resources
 */
export const validateSellerAccess = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { user } = req;
    const { walletAddress } = req.params;

    if (!user) {
      return ApiResponse.unauthorized(res, 'Authentication required');
    }

    // If accessing specific seller resources, verify ownership or admin access
    if (walletAddress && walletAddress !== user.walletAddress && user.role !== 'admin') {
      return ApiResponse.forbidden(res, 'Access denied. You can only access your own seller resources.');
    }

    next();
  } catch (error) {
    safeLogger.error('Seller access validation error:', error);
    ApiResponse.serverError(res, 'Internal server error');
  }
};

/**
 * Validate seller tier permissions
 */
export const validateSellerTier = (requiredTier: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { user } = req;

      if (!user) {
        return ApiResponse.unauthorized(res, 'Authentication required');
      }

      // In a real implementation, you would check the user's seller tier
      // For now, we'll assume all authenticated users have basic access
      next();
    } catch (error) {
      safeLogger.error('Seller tier validation error:', error);
      ApiResponse.serverError(res, 'Internal server error');
    }
  };
};