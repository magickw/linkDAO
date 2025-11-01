/**
 * Seller Middleware
 * Validation and access control for seller-related operations
 */

import { Request, Response, NextFunction } from 'express';
import { safeLogger } from '../utils/safeLogger';
import { SellerError, SellerErrorType } from '../types/sellerError';
import { safeLogger } from '../utils/safeLogger';

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
      return res.status(401).json({
        success: false,
        error: 'Authentication required',
        code: 'AUTH_REQUIRED'
      });
    }

    // If accessing specific seller resources, verify ownership or admin access
    if (walletAddress && walletAddress !== user.walletAddress && user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own seller resources.',
        code: 'ACCESS_DENIED'
      });
    }

    next();
  } catch (error) {
    safeLogger.error('Seller access validation error:', error);
    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'VALIDATION_ERROR'
    });
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
        return res.status(401).json({
          success: false,
          error: 'Authentication required',
          code: 'AUTH_REQUIRED'
        });
      }

      // In a real implementation, you would check the user's seller tier
      // For now, we'll assume all authenticated users have basic access
      next();
    } catch (error) {
      safeLogger.error('Seller tier validation error:', error);
      res.status(500).json({
        success: false,
        error: 'Internal server error',
        code: 'TIER_VALIDATION_ERROR'
      });
    }
  };
};