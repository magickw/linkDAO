import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { validateJWTSecret } from '../utils/securityUtils';

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
    res.status(401).json({ error: 'Access token required' });
    return;
  }

  try {
    validateJWTSecret(process.env.JWT_SECRET);
  } catch (error) {
    res.status(500).json({ error: 'Server configuration error' });
    return;
  }

  jwt.verify(token, process.env.JWT_SECRET!, (err: any, user: any) => {
    if (err) {
      res.status(403).json({ error: 'Invalid token' });
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