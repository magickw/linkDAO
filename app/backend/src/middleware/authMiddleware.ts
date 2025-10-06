import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  user?: {
    address: string;
    walletAddress: string;
    userId?: string;
    kycStatus?: string;
    permissions?: string[];
    id?: string;
    isAdmin?: boolean;
  };
}

export const authMiddleware = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
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
    req.user = {
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