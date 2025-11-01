import { Request, Response, NextFunction, RequestHandler } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedUser {
  address: string;
  walletAddress: string;
  userId?: string;
  kycStatus?: string;
  permissions?: string[];
  id: string; // required to match globally-augmented Request.user
  isAdmin?: boolean;
  [key: string]: any; // keep compatibility with broader user shape
}

export interface AuthenticatedRequest extends Request {
  user?: AuthenticatedUser;
}

export const authMiddleware: RequestHandler = (req: Request, res: Response, next: NextFunction): void => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Access token required'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'fallback-secret') as any;

    // Normalize user object to match expected interface
    const areq = req as AuthenticatedRequest;
    areq.user = {
      address: decoded.walletAddress || decoded.address,
      walletAddress: decoded.walletAddress || decoded.address,
      userId: decoded.userId || decoded.id,
      id: decoded.userId || decoded.id || decoded.walletAddress || decoded.address,
      kycStatus: decoded.kycStatus,
      permissions: decoded.permissions || [],
      isAdmin: decoded.isAdmin || false
    };

    next();
  } catch (error) {
    res.status(403).json({
      success: false,
      error: 'Invalid token'
    });
    return;
  }
};
