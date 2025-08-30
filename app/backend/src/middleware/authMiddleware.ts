import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { ethers } from 'ethers';
import { RedisService } from '../services/redisService';

const redisService = new RedisService();

// Extend the Request type to include enhanced user property
declare global {
  namespace Express {
    interface Request {
      user?: {
        walletAddress: string;
        userId?: string;
        kycStatus?: string;
        permissions?: string[];
      };
    }
  }
}

interface JWTPayload {
  address: string;
  userId?: string;
  kycStatus?: string;
  permissions?: string[];
  iat?: number;
  exp?: number;
}

export const authenticateToken = async (req: Request, res: Response, next: NextFunction): Promise<any> => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  try {
    const secret = process.env.JWT_SECRET || 'linkdao_secret_key';
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    // Check if token is blacklisted
    const isBlacklisted = await redisService.get(`blacklist:${token}`);
    if (isBlacklisted) {
      return res.status(401).json({ error: 'Token has been invalidated' });
    }
    
    req.user = {
      walletAddress: decoded.address,
      userId: decoded.userId,
      kycStatus: decoded.kycStatus,
      permissions: decoded.permissions || []
    };
    
    next();
  } catch (error) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};

export const requireKYC = (minTier: 'basic' | 'intermediate' | 'advanced' = 'basic') => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const kycTiers = { none: 0, basic: 1, intermediate: 2, advanced: 3 };
    const userTier = kycTiers[req.user.kycStatus as keyof typeof kycTiers] || 0;
    const requiredTier = kycTiers[minTier];

    if (userTier < requiredTier) {
      return res.status(403).json({ 
        error: `KYC verification required. Minimum tier: ${minTier}`,
        currentTier: req.user.kycStatus,
        requiredTier: minTier
      });
    }

    next();
  };
};

export const requirePermission = (permission: string) => {
  return (req: Request, res: Response, next: NextFunction): any => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!req.user.permissions?.includes(permission)) {
      return res.status(403).json({ 
        error: `Permission required: ${permission}`,
        userPermissions: req.user.permissions
      });
    }

    next();
  };
};

export const generateToken = (address: string, additionalClaims?: Partial<JWTPayload>): string => {
  const secret = process.env.JWT_SECRET || 'linkdao_secret_key';
  const expiresIn = process.env.JWT_EXPIRES_IN || '24h';
  
  const payload: JWTPayload = {
    address,
    ...additionalClaims
  };
  
  return jwt.sign(payload, secret, { expiresIn });
};

export const verifySignature = async (address: string, signature: string, message: string): Promise<boolean> => {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === address.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
};

export const blacklistToken = async (token: string): Promise<void> => {
  try {
    const decoded = jwt.decode(token) as JWTPayload;
    if (decoded && decoded.exp) {
      const ttl = decoded.exp - Math.floor(Date.now() / 1000);
      if (ttl > 0) {
        await redisService.set(`blacklist:${token}`, 'true', ttl);
      }
    }
  } catch (error) {
    console.error('Failed to blacklist token:', error);
  }
};