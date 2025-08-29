import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request type to include user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
      };
    }
  }
}

export const authenticateToken = (req: Request, res: Response, next: NextFunction): any => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'linkdao_secret_key';
    const decoded = jwt.verify(token, secret) as { address: string };
    
    req.user = {
      walletAddress: decoded.address
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const generateToken = (address: string): string => {
  const secret = process.env.JWT_SECRET || 'linkdao_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  return jwt.sign({ address }, secret, { expiresIn: '24h' });
};